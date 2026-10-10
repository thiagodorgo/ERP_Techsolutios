"""Ferramentas expostas ao modelo. Cada uma = cerca -> execução -> resultado.

Regras que este módulo garante (plano §3.1, §3.2):
- o catálogo é um dicionário EXPLÍCITO (nunca `getattr(self, nome)`): um nome
  como `__import__`, `bash` ou `git_push` não acha nada e volta negado;
- a negação de caminho acontece ANTES de `open()`: conteúdo de caminho negado
  nunca é lido, logo nunca chega ao modelo, à auditoria nem ao redator;
- o texto do resultado é o que o processo/arquivo devolveu; quem redige e
  envelopa é o laço (o resultado nunca vai cru ao modelo).
"""

from __future__ import annotations

import os
import stat
from dataclasses import dataclass, field

from . import executor as _executor
from .cerca import (
    COMPONENTES_NEGADOS,
    CercaNegada,
    ContextoComandos,
    _conferir_campos,
    _inteiro,
    ambiente_gh,
    ambiente_limpo,
    componente_reservado,
    nome_negado,
    validar_argv,
)

TETO_LEITURA = 256 * 1024
LINHAS_PADRAO = 400
LINHAS_TETO = 2000
MAX_ENTRADAS_LISTA = 500
TETO_VARREDURA = 32 * 1024 * 1024
TAMANHO_SONDA_BINARIO = 8192
MOTIVO_HARD_LINK = "arquivo com mais de um link (hard link)"


@dataclass
class ResultadoFerramenta:
    texto: str
    erro: bool
    codigo: int | None = None
    bytes: int = 0
    truncado: bool = False
    duracao_ms: int = 0
    argv: list[str] | None = None
    negado: bool = False
    motivo_negacao: str | None = None
    expirou: bool = False
    interrompido: bool = False


def _negado(motivo: str) -> ResultadoFerramenta:
    return ResultadoFerramenta(texto=f"negado: {motivo}", erro=True, negado=True, motivo_negacao=motivo)


@dataclass
class Ferramentas:
    ctx: ContextoComandos
    executar_processo: object = field(default=_executor.executar)
    abrir: object = field(default=open)
    timeout_comando: float = 120.0
    timeout_verificacao: float = 900.0

    def __post_init__(self) -> None:
        self._catalogo = {
            "ler_arquivo": self._ler_arquivo,
            "listar_diretorio": self._listar_diretorio,
            "buscar": self._comando,
            "git_log": self._comando,
            "git_show": self._comando,
            "git_diff": self._comando,
            "git_ls_files": self._comando,
            "gh_pr_view": self._comando,
            "gh_pr_diff": self._comando,
            "gh_pr_checks": self._comando,
            "verificar": self._comando,
        }

    @property
    def nomes(self) -> tuple[str, ...]:
        return tuple(self._catalogo)

    def executar(self, nome: object, entrada: object) -> ResultadoFerramenta:
        tratador = self._catalogo.get(nome) if isinstance(nome, str) else None
        if tratador is None:
            return _negado("ferramenta desconhecida")
        try:
            return tratador(nome, entrada)
        except CercaNegada as e:
            return _negado(e.motivo)
        except OSError as e:
            return ResultadoFerramenta(texto=f"erro de E/S ({type(e).__name__})", erro=True)

    # -- leitura -------------------------------------------------------------

    def _ler_arquivo(self, _nome: str, entrada: object) -> ResultadoFerramenta:
        campos = _conferir_campos(entrada, ("caminho", "linha_inicial", "max_linhas"))
        caminho = self.ctx.raiz.resolver(campos.get("caminho"))  # nega ANTES de abrir
        linha_inicial = _inteiro("linha_inicial", campos.get("linha_inicial"), 1, 100_000_000, 1)
        max_linhas = min(_inteiro("max_linhas", campos.get("max_linhas"), 1, 100_000_000, LINHAS_PADRAO), LINHAS_TETO)
        try:
            info = os.lstat(caminho)
        except OSError:
            raise CercaNegada("arquivo inexistente")
        if not stat.S_ISREG(info.st_mode):
            raise CercaNegada("não é arquivo regular")
        # A1 (hard link): o `realpath` não enxerga hard link — um arquivo dentro da raiz pode ser
        # o MESMO arquivo que outro fora dela. Um checkout do git nunca cria hard link; só um
        # processo que escreva no worktree o cria. Recusa-se arquivo com mais de um link, antes de
        # abrir (lstat) e de novo no arquivo aberto (fstat: fecha a corrida entre checar e abrir).
        if info.st_nlink > 1:
            raise CercaNegada(MOTIVO_HARD_LINK)
        with self.abrir(caminho, "rb") as f:
            aberto = os.fstat(f.fileno())
            if aberto.st_nlink > 1 or not stat.S_ISREG(aberto.st_mode):
                raise CercaNegada(MOTIVO_HARD_LINK)
            sonda = f.read(TAMANHO_SONDA_BINARIO)
            if b"\x00" in sonda:
                raise CercaNegada("arquivo binário")
            f.seek(0)
            linhas: list[str] = []
            usados = 0
            varrido = 0
            numero = 0
            truncado = False
            while True:
                bruto = f.readline(TETO_LEITURA + 1)
                if not bruto:
                    break
                numero += 1
                varrido += len(bruto)
                if numero < linha_inicial:
                    if varrido > TETO_VARREDURA:
                        truncado = True
                        break
                    continue
                if len(linhas) >= max_linhas or usados + len(bruto) > TETO_LEITURA:
                    truncado = True
                    break
                usados += len(bruto)
                texto = bruto.decode("utf-8", errors="replace").rstrip("\r\n")
                linhas.append(f"{numero:>6}\t{texto}")
        corpo = "\n".join(linhas)
        if truncado:
            corpo += "\n[truncado]"
        return ResultadoFerramenta(texto=corpo, erro=False, codigo=0, bytes=usados, truncado=truncado)

    def _listar_diretorio(self, _nome: str, entrada: object) -> ResultadoFerramenta:
        campos = _conferir_campos(entrada, ("caminho",))
        caminho = self.ctx.raiz.resolver(campos.get("caminho"))
        if not caminho.is_dir():
            raise CercaNegada("não é diretório")
        linhas: list[str] = []
        total = 0
        with os.scandir(caminho) as it:
            entradas = sorted(it, key=lambda e: e.name.lower())
        for e in entradas:
            total += 1
            if len(linhas) >= MAX_ENTRADAS_LISTA:
                continue
            protegido = (
                e.name.lower() in COMPONENTES_NEGADOS or componente_reservado(e.name) or nome_negado(e.name)
            )
            marca = " [negado]" if protegido else ""
            if e.is_symlink() or e.is_junction():
                linhas.append(f"{e.name} <link>{marca}")  # destino NÃO é resolvido
            elif e.is_dir(follow_symlinks=False):
                linhas.append(f"{e.name}/{marca}")
            else:
                linhas.append(f"{e.name}{marca}")
        if total > len(linhas):
            linhas.append(f"[truncado: {total - len(linhas)} entradas omitidas]")
        corpo = "\n".join(linhas)
        return ResultadoFerramenta(
            texto=corpo, erro=False, codigo=0, bytes=len(corpo.encode()), truncado=total > MAX_ENTRADAS_LISTA
        )

    # -- comandos ------------------------------------------------------------

    def _comando(self, nome: str, entrada: object) -> ResultadoFerramenta:
        argv = validar_argv(nome, entrada, self.ctx)
        if nome.startswith("gh_"):
            env = ambiente_gh()
        else:
            env = ambiente_limpo()
        if nome == "verificar":
            timeout, teto = self.timeout_verificacao, _executor.TETO_VERIFICACAO
        else:
            timeout, teto = self.timeout_comando, _executor.TETO_PADRAO
        execucao = self.executar_processo(argv, cwd=self.ctx.raiz.real, env=env, timeout_s=timeout, teto_bytes=teto)
        return ResultadoFerramenta(
            texto=execucao.saida,
            erro=bool(execucao.expirou or execucao.codigo is None),
            codigo=execucao.codigo,
            bytes=execucao.bytes_total,
            truncado=execucao.truncado,
            duracao_ms=execucao.duracao_ms,
            argv=argv,
            expirou=execucao.expirou,
        )


AVISO_LIMITE_TURNO = "\n[truncado: limite de bytes de resultado por turno; peça o resto no próximo turno]"


def envelopar(nome: str, resultado: ResultadoFerramenta, texto_redigido: str, limite_bytes: int | None = None) -> str:
    """Envelope fixo do tool_result. O dado é escapado: não fecha o envelope (§3.9).

    Com `limite_bytes` (achado A4: teto de bytes de resultado por turno), o envelope inteiro cabe
    nesse limite: o corpo JÁ ESCAPADO é cortado (sem partir caractere nem entidade) e ganha aviso.
    """
    atributos = (
        f'ferramenta="{_escapar(str(nome)[:80])}" codigo="{resultado.codigo}" '
        f'truncado="{str(resultado.truncado).lower()}" bytes="{resultado.bytes}"'
    )
    if resultado.expirou:
        atributos += ' expirou="true"'
    if resultado.negado:
        atributos += ' negado="true"'
    abre, fecha = f"<resultado {atributos}>\n", "\n</resultado>"
    corpo = _escapar(texto_redigido)
    if limite_bytes is not None and len((abre + corpo + fecha).encode("utf-8")) > limite_bytes:
        folga = limite_bytes - len((abre + AVISO_LIMITE_TURNO + fecha).encode("utf-8"))
        corpo = _cortar_utf8(corpo, max(0, folga)) + AVISO_LIMITE_TURNO
    return abre + corpo + fecha


def _cortar_utf8(texto: str, n_bytes: int) -> str:
    cortado = texto.encode("utf-8")[:n_bytes].decode("utf-8", errors="ignore")
    amp = cortado.rfind("&")
    if amp != -1 and ";" not in cortado[amp:]:
        cortado = cortado[:amp]  # não deixa entidade (&lt; ...) pela metade
    return cortado


def _escapar(texto: str) -> str:
    return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
