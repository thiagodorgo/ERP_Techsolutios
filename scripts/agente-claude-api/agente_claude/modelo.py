"""Adaptador do modelo. O SDK `anthropic` só é importado aqui, e só em runtime.

Fontes (skill claude-api; nada de memória):
- cliente com chave explícita e `base_url` explícita: README l.12-20, l.70-81;
  cabeçalho fixo por `default_headers=` — [H1], medido no SDK 1.13.0 instalado
  (`inspect.signature(anthropic.Anthropic.__init__)`), ver B-AGENTE-API-dev.md;
- Opus 5.5: SEM `thinking` (sempre ligado; `disabled`/`budget_tokens` dão 400) e
  profundidade por `output_config={"effort": ...}`: README l.252-266;
- `tool_choice` forçado dá 400 no Opus 5.5 — não é enviado (fica `auto`):
  tool-use.md l.323-335;
- cache: marcador explícito no fim do `system` + automático de topo:
  prompt-caching l.176; README l.191-236;
- cabeçalhos e request-id por `with_raw_response`: README l.307-328;
- erros tipados do mais específico ao mais geral: error-codes l.205-240.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from .conta import BASE_URL, Credenciais

MODELO = "claude-opus-5-5"
ESFORCOS = ("low", "medium", "high")
TIMEOUT_API_S = 600.0
MAX_RETRIES = 2
_CABECALHOS_PROVA = frozenset(
    {"request-id", "retry-after", "anthropic-workspace-id", "anthropic-organization-id"}
)


@dataclass
class Resposta:
    content: list[dict]
    stop_reason: str | None
    stop_details: dict | None = None
    usage: dict | None = None
    request_id: str | None = None
    cabecalhos: dict = field(default_factory=dict)
    modelo_respondeu: str | None = None


class ErroDeModelo(Exception):
    """Erro de API convertido da cadeia tipada do SDK (código de saída 4)."""

    def __init__(
        self,
        classe: str,
        status: int | None = None,
        tipo: str | None = None,
        request_id: str | None = None,
        retry_after: str | None = None,
        mensagem: str = "",
    ) -> None:
        super().__init__(f"{classe} status={status} tipo={tipo} request_id={request_id}: {mensagem}")
        self.classe = classe
        self.status = status
        self.tipo = tipo
        self.request_id = request_id
        self.retry_after = retry_after
        self.mensagem = mensagem


def montar_pedido(system: str, tools: list[dict], messages: list[dict], max_tokens: int, esforco: str) -> dict:
    """Parâmetros de `messages.create`. Função pura: os testes a exercitam sem o SDK."""
    if esforco not in ESFORCOS:
        raise ValueError(f"esforço fora de {ESFORCOS}")
    return {
        "model": MODELO,
        "max_tokens": max_tokens,
        "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        "tools": tools,
        "messages": messages,
        "output_config": {"effort": esforco},
        "cache_control": {"type": "ephemeral"},
    }


def opcoes_cliente(credenciais: Credenciais) -> dict:
    """Argumentos do construtor `anthropic.Anthropic(...)`. Nunca logado."""
    opcoes = {
        "api_key": credenciais.chave,
        "base_url": BASE_URL,
        "max_retries": MAX_RETRIES,
        "timeout": TIMEOUT_API_S,
    }
    if credenciais.workspace_id:
        opcoes["default_headers"] = {"anthropic-workspace-id": credenciais.workspace_id}
    return opcoes


def filtrar_cabecalhos(headers) -> dict:
    """Cabeçalhos que provam a conta: request-id, rate limit, retry-after, workspace."""
    saida = {}
    try:
        itens = list(headers.items())
    except AttributeError:
        return saida
    for nome, valor in itens:
        n = str(nome).lower()
        if n in _CABECALHOS_PROVA or n.startswith("x-ratelimit-") or "ratelimit" in n:
            saida[n] = str(valor)
    return dict(sorted(saida.items()))


def fallback_servidor(respondeu: str | None) -> bool:
    if not respondeu or respondeu == "simulado":
        return False
    return not respondeu.startswith(MODELO)


def _bloco_para_dict(bloco) -> dict:
    if isinstance(bloco, dict):
        return bloco
    return bloco.to_dict(mode="json")


def resposta_de_mensagem(mensagem, headers, request_id: str | None) -> Resposta:
    usage = None
    if getattr(mensagem, "usage", None) is not None:
        u = mensagem.usage
        usage = {
            k: int(getattr(u, k, 0) or 0)
            for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")
        }
    detalhes = getattr(mensagem, "stop_details", None)
    cabecalhos = filtrar_cabecalhos(headers)
    return Resposta(
        content=[_bloco_para_dict(b) for b in mensagem.content],
        stop_reason=mensagem.stop_reason,
        stop_details=_bloco_para_dict(detalhes) if detalhes is not None else None,
        usage=usage,
        request_id=request_id or cabecalhos.get("request-id"),
        cabecalhos=cabecalhos,
        modelo_respondeu=getattr(mensagem, "model", None),
    )


def converter_erro(erro: BaseException) -> ErroDeModelo | None:
    """Erro tipado do SDK -> `ErroDeModelo`. Outro tipo de erro -> None (é bug nosso)."""
    import anthropic  # tardio

    if isinstance(erro, anthropic.APIStatusError):  # BadRequest, Auth, Permission, NotFound, 422, 429, 5xx
        retry_after = None
        try:
            retry_after = erro.response.headers.get("retry-after")
        except AttributeError:
            pass
        return ErroDeModelo(
            type(erro).__name__,
            status=erro.status_code,
            tipo=erro.type,
            request_id=erro.request_id,
            retry_after=retry_after,
            mensagem=str(getattr(erro, "message", ""))[:500],
        )
    if isinstance(erro, anthropic.APIConnectionError):  # irmã de APIStatusError (S14)
        return ErroDeModelo(type(erro).__name__, mensagem="falha de conexão com a API")
    if isinstance(erro, anthropic.APIError):
        return ErroDeModelo(type(erro).__name__, mensagem=str(erro)[:500])
    return None


class ModeloAnthropic:
    """Adaptador real. `cliente` injetável só para teste (a suíte nunca o constrói)."""

    def __init__(self, credenciais: Credenciais, cliente=None) -> None:
        if cliente is None:
            import anthropic  # tardio: a conta já foi carregada e o ambiente higienizado

            cliente = anthropic.Anthropic(**opcoes_cliente(credenciais))
        self._cliente = cliente

    def responder(self, *, system: str, tools: list[dict], messages: list[dict], max_tokens: int, esforco: str) -> Resposta:
        pedido = montar_pedido(system, tools, messages, max_tokens, esforco)
        try:
            bruto = self._cliente.messages.with_raw_response.create(**pedido)
        except Exception as e:  # noqa: BLE001 — convertido abaixo, ou relançado
            convertido = converter_erro(e)
            if convertido is None:
                raise
            raise convertido from None
        mensagem = bruto.parse()
        return resposta_de_mensagem(mensagem, bruto.headers, getattr(bruto, "request_id", None))

    def contar_minimo(self, system: str) -> Resposta:
        """Chamada mínima de `verificar-conta`: max_tokens=0 só faz o prefill (prompt-caching l.260-298)."""
        try:
            bruto = self._cliente.messages.with_raw_response.create(
                model=MODELO,
                max_tokens=0,
                system=system,
                messages=[{"role": "user", "content": "ping"}],
            )
        except Exception as e:  # noqa: BLE001
            convertido = converter_erro(e)
            if convertido is None:
                raise
            raise convertido from None
        mensagem = bruto.parse()
        return resposta_de_mensagem(mensagem, bruto.headers, getattr(bruto, "request_id", None))


PARECER_SIMULADO = {
    "veredito": "inconclusivo",
    "resumo": "Execução simulada (--simular): nenhuma chamada à API da Anthropic foi feita.",
    "achados": [],
    "comandos_executados": ["simulado: nenhum comando declarado"],
    "limitacoes": ["execução simulada; o parecer não reflete revisão real"],
}


class ModeloSimulado:
    """`--simular`: exercita conta -> worktree -> auditoria -> parecer SEM rede à API."""

    def __init__(self, turnos: int = 0, espera_s: float = 2.0, dormir=time.sleep, parecer: dict | None = None) -> None:
        self.turnos = turnos
        self.espera_s = espera_s
        self._dormir = dormir
        self.chamadas = 0
        self._parecer = dict(parecer or PARECER_SIMULADO)

    def responder(self, *, system: str, tools: list[dict], messages: list[dict], max_tokens: int, esforco: str) -> Resposta:
        montar_pedido(system, tools, messages, max_tokens, esforco)  # mesmo contrato do real
        self.chamadas += 1
        n = self.chamadas
        usage = {"input_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}
        if self.turnos and self.espera_s:
            self._dormir(self.espera_s)
        if n <= self.turnos:
            content = [
                {"type": "text", "text": f"simulação: turno {n}"},
                {"type": "tool_use", "id": f"toolu_sim_{n}", "name": "listar_diretorio", "input": {"caminho": "."}},
            ]
        else:
            content = [
                {"type": "tool_use", "id": f"toolu_sim_{n}", "name": "entregar_parecer", "input": dict(self._parecer)}
            ]
        return Resposta(
            content=content,
            stop_reason="tool_use",
            usage=usage,
            request_id=f"simulado-{n}",
            cabecalhos={},
            modelo_respondeu="simulado",
        )
