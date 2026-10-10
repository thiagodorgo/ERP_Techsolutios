"""Conta e credenciais: de onde vem a chave (e de onde NUNCA vem).

- A chave vem de `ERP_AGENTE_ANTHROPIC_KEY` (processo; senão `HKCU\\Environment`),
  NUNCA de `ANTHROPIC_API_KEY`: com esse nome no ambiente do usuário o próprio
  Claude Code passaria a usar a chave e cobraria os créditos da API no lugar do
  plano Max (brief §7).
- Antes de importar o SDK, o processo se higieniza: TODO `ANTHROPIC_*` sai do
  `os.environ`. O plano listou `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` e
  `ANTHROPIC_LOG` (S1, S15, [H8]); a medição do dev achou `ANTHROPIC_CUSTOM_HEADERS`
  sobrescrevendo a chave explícita (SDK `_client.py` l.244-251) — por isso a
  classe inteira sai, não só as instâncias conhecidas. `ANTHROPIC_BASE_URL` é
  validada ANTES de sair.
- Chave de usuário (`sk-ant-usr…`) exige `ERP_AGENTE_ANTHROPIC_WORKSPACE`; sem ele,
  PARA antes de qualquer rede (medido em 2026-10-10: 400 "not scoped to a workspace").
- A chave nunca é impressa, logada nem gravada; `Credenciais.__repr__` a esconde.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

VAR_CHAVE = "ERP_AGENTE_ANTHROPIC_KEY"
VAR_WORKSPACE = "ERP_AGENTE_ANTHROPIC_WORKSPACE"
BASE_URL = "https://api.anthropic.com"
HOST_CANONICO = "api.anthropic.com"
_CHAVE_RE = re.compile(r"^sk-ant-[A-Za-z0-9_-]{8,400}$")
_WORKSPACE_RE = re.compile(r"^[A-Za-z0-9_-]{6,128}$")


class ContaRecusada(Exception):
    """Recusa prévia (código de saída 3). A mensagem nunca contém a chave."""


@dataclass(repr=False)
class Credenciais:
    chave: str
    workspace_id: str | None
    origem_chave: str
    tipo_chave: str
    origem_workspace: str | None = None
    ignoradas: list[str] = field(default_factory=list)
    base_url: str = BASE_URL

    @property
    def cabecalho_workspace(self) -> bool:
        return bool(self.workspace_id)

    def resumo(self) -> dict:
        """Só metadados — nunca o valor da chave."""
        return {
            "origem_chave": self.origem_chave,
            "tipo_chave": self.tipo_chave,
            "cabecalho_workspace": self.cabecalho_workspace,
            "origem_workspace": self.origem_workspace,
            "ignoradas": list(self.ignoradas),
            "base_url": self.base_url,
        }

    def __repr__(self) -> str:
        return (
            f"Credenciais(chave=<oculta>, workspace={'sim' if self.workspace_id else 'não'}, "
            f"origem={self.origem_chave}, tipo={self.tipo_chave})"
        )

    __str__ = __repr__


def ler_registro_usuario(nome: str) -> str | None:
    """Lê `HKCU\\Environment\\<nome>` (REG_SZ ou REG_EXPAND_SZ, sem expandir)."""
    try:
        import winreg  # import tardio: só existe no Windows
    except ImportError:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as chave:
            valor, tipo = winreg.QueryValueEx(chave, nome)
    except OSError:
        return None
    if tipo not in (winreg.REG_SZ, winreg.REG_EXPAND_SZ) or not isinstance(valor, str):
        return None
    return valor


def validar_base_url(environ) -> None:
    valor = environ.get("ANTHROPIC_BASE_URL")
    if valor is None or valor == "":
        return
    try:
        partes = urlparse(valor)
        host = partes.hostname
        porta = partes.port
    except ValueError:
        raise ContaRecusada("ANTHROPIC_BASE_URL inválida; o agente só fala com https://api.anthropic.com")
    caminho_ok = partes.path in ("", "/") and not partes.query and not partes.fragment
    sem_credencial = partes.username is None and partes.password is None
    if partes.scheme != "https" or host != HOST_CANONICO or porta not in (None, 443) or not caminho_ok or not sem_credencial:
        raise ContaRecusada(
            "ANTHROPIC_BASE_URL aponta para outro destino; o agente só fala com https://api.anthropic.com. "
            "Remova a variável ou corrija-a."
        )


def higienizar_ambiente(environ) -> list[str]:
    """Valida `ANTHROPIC_BASE_URL` e remove TODO `ANTHROPIC_*` do ambiente do processo."""
    validar_base_url(environ)
    removidas = sorted(k for k in list(environ.keys()) if str(k).upper().startswith("ANTHROPIC_"))
    for nome in removidas:
        environ.pop(nome, None)
    return removidas


def _ler(nome: str, environ, ler_registro) -> tuple[str | None, str | None]:
    valor = environ.get(nome)
    if valor is not None and valor.strip():
        return valor.strip(), "processo"
    valor = ler_registro(nome)
    if valor is not None and valor.strip():
        return valor.strip(), "registro"
    return None, None


def carregar_credenciais(environ=None, ler_registro=None) -> Credenciais:
    """Carrega a chave e o workspace. Roda ANTES de importar `anthropic` e de qualquer rede."""
    environ = os.environ if environ is None else environ
    ler_registro = ler_registro_usuario if ler_registro is None else ler_registro
    ignoradas = higienizar_ambiente(environ)
    chave, origem = _ler(VAR_CHAVE, environ, ler_registro)
    if chave is None:
        raise ContaRecusada(
            f"{VAR_CHAVE} ausente no processo e em HKCU\\Environment. Grave-a no ambiente do usuário SEM "
            "digitá-la na linha de comando (PowerShell: Read-Host -AsSecureString + "
            "[Environment]::SetEnvironmentVariable(..., 'User'); passo a passo no README do agente, seção "
            "'A chave e o workspace'). Depois abra uma janela nova; nunca no repositório."
        )
    if not _CHAVE_RE.fullmatch(chave):
        prefixo = " (começa com sk-ant)" if chave.startswith("sk-ant") else ""
        raise ContaRecusada(f"{VAR_CHAVE} com formato inesperado{prefixo}.")
    tipo = "usuario" if chave.startswith("sk-ant-usr") else "workspace_ou_api"
    workspace, origem_ws = _ler(VAR_WORKSPACE, environ, ler_registro)
    if workspace is not None and not _WORKSPACE_RE.fullmatch(workspace):
        raise ContaRecusada(f"{VAR_WORKSPACE} com formato inesperado.")
    if tipo == "usuario" and workspace is None:
        raise ContaRecusada(
            "a chave é de usuário (sk-ant-usr…) e a API exige o cabeçalho anthropic-workspace-id "
            "(medido em 2026-10-10: 400 not scoped to a workspace). Grave "
            f"{VAR_WORKSPACE} com o ID do workspace do console da Anthropic, ou use uma chave de workspace."
        )
    return Credenciais(
        chave=chave,
        workspace_id=workspace,
        origem_chave=origem,
        tipo_chave=tipo,
        origem_workspace=origem_ws,
        ignoradas=ignoradas,
    )
