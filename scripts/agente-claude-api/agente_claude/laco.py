"""O laço manual de ferramentas (skill: tool-use.md l.182-237; tool-use-concepts l.130, l.155-165).

Por que manual e não o tool runner: é o laço quem impõe a cerca (brief). A cada
passo: STOP e orçamento ANTES de chamar o modelo e ANTES de cada ferramenta;
cerca -> execução -> redação -> envelope -> `tool_result`; uma linha de auditoria
por item. O histórico é append-only: `response.content` volta inteiro e inalterado
(S17: editar blocos `thinking` dá 400 no Opus 5.5).

Desfechos (plano §3.8):
- `entregar_parecer` válido -> fim completo (o modelo não é chamado de novo);
- inválido -> `tool_result` com `is_error` e o modelo tenta de novo (conta turno);
- `end_turn` sem a ferramenta -> UM re-pedido; depois, parcial `sem_entregar_parecer`;
- `refusal` -> parcial, sem executar as ferramentas do turno;
- `max_tokens` com `tool_use` -> não executa; UM re-pedido mais curto; depois, parcial;
- `pause_turn` (só existe com ferramenta de servidor, que este agente não usa) -> parcial;
- `model_context_window_exceeded` (medido no SDK; fora do skill) -> parcial.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from . import esquemas
from .ferramentas import ResultadoFerramenta, envelopar
from .parecer import ParecerInvalido, validar
from .prompts import MENSAGEM_REPROMPT_CURTO, MENSAGEM_REPROMPT_PARECER, PROMPT_SISTEMA


@dataclass
class ResultadoLaco:
    parecer_modelo: dict | None = None
    parcial: bool = False
    motivo_parcial: str | None = None
    ultimo_texto: str | None = None
    request_ids: list[str] = field(default_factory=list)
    modelo_respondeu: str | None = None
    rate_limit_ultimo: dict = field(default_factory=dict)
    retry_after_visto: bool = False
    negadas: int = 0


class Laco:
    def __init__(
        self,
        *,
        modelo,
        ferramentas,
        orcamento,
        auditoria,
        redator,
        max_tokens_resposta: int,
        esforco: str,
        system: str = PROMPT_SISTEMA,
        tools: list[dict] | None = None,
    ) -> None:
        self.modelo = modelo
        self.ferramentas = ferramentas
        self.orcamento = orcamento
        self.auditoria = auditoria
        self.redator = redator
        self.max_tokens_resposta = max_tokens_resposta
        self.esforco = esforco
        self.system = system
        self.tools = tools if tools is not None else esquemas.ferramentas()
        self.resultado = ResultadoLaco()

    # -- auxiliares ------------------------------------------------------------

    def _evento(self, nome: str, detalhe: object = None) -> None:
        self.auditoria.registrar({"tipo": "evento", "nome": nome, "detalhe": detalhe})

    def _parcial(self, motivo: str) -> ResultadoLaco:
        self.resultado.parcial = True
        self.resultado.motivo_parcial = motivo
        return self.resultado

    def _auditar_ferramenta(self, nome, entrada, res: ResultadoFerramenta) -> None:
        self.auditoria.registrar(
            {
                "tipo": "ferramenta",
                "turno": self.orcamento.turnos,
                "ferramenta": nome if isinstance(nome, str) else repr(nome),
                "args": entrada,
                "argv": res.argv,
                "negado": res.negado,
                "motivo_negacao": res.motivo_negacao,
                "codigo_saida": res.codigo,
                "bytes_saida": res.bytes,
                "truncado": res.truncado,
                "duracao_ms": res.duracao_ms,
                "expirou": res.expirou,
                "interrompido": res.interrompido,
                "erro": res.erro,
            }
        )

    @staticmethod
    def _resultado_erro(tool_use_id, texto: str) -> dict:
        return {"type": "tool_result", "tool_use_id": tool_use_id, "content": texto, "is_error": True}

    # -- laço --------------------------------------------------------------------

    def executar(self, mensagem_inicial: str) -> ResultadoLaco:
        messages: list[dict] = [{"role": "user", "content": mensagem_inicial}]
        repediu_parecer = False
        repediu_curto = False
        r = self.resultado
        try:
            while True:
                if self.auditoria.verificar_stop():
                    self._evento("stop_detectado", "antes da chamada ao modelo")
                    return self._parcial("STOP")
                motivo = self.orcamento.motivo_estouro_modelo()
                if motivo:
                    self._evento("orcamento_estourado", motivo)
                    return self._parcial(f"orcamento:{motivo}")

                inicio = time.monotonic()
                resp = self.modelo.responder(
                    system=self.system,
                    tools=self.tools,
                    messages=messages,
                    max_tokens=self.max_tokens_resposta,
                    esforco=self.esforco,
                )
                self.orcamento.novo_turno()
                self.orcamento.registrar_resposta(resp.usage, self.max_tokens_resposta)
                blocos: dict[str, int] = {}
                for b in resp.content:
                    blocos[b.get("type", "?")] = blocos.get(b.get("type", "?"), 0) + 1
                rate_limit = {k: v for k, v in (resp.cabecalhos or {}).items() if k != "request-id"}
                self.auditoria.registrar(
                    {
                        "tipo": "modelo",
                        "turno": self.orcamento.turnos,
                        "request_id": resp.request_id,
                        "modelo_respondeu": resp.modelo_respondeu,
                        "stop_reason": resp.stop_reason,
                        "usage": resp.usage,
                        "custo_acumulado_usd": self.orcamento.custo_usd_texto(),
                        "duracao_ms": int((time.monotonic() - inicio) * 1000),
                        "rate_limit": rate_limit,
                        "blocos": blocos,
                    }
                )
                if resp.request_id:
                    r.request_ids.append(resp.request_id)
                r.modelo_respondeu = resp.modelo_respondeu
                r.rate_limit_ultimo = rate_limit
                r.retry_after_visto = r.retry_after_visto or ("retry-after" in rate_limit)
                textos = [b.get("text") for b in resp.content if b.get("type") == "text" and b.get("text")]
                if textos:
                    r.ultimo_texto = textos[-1]

                messages.append({"role": "assistant", "content": resp.content})  # inteiro, inalterado
                parada = resp.stop_reason
                usos = [b for b in resp.content if b.get("type") == "tool_use"]

                if parada == "refusal":
                    categoria = (resp.stop_details or {}).get("category")
                    self._evento("refusal", {"categoria": categoria})
                    return self._parcial(f"refusal:{categoria}")  # nenhuma ferramenta do turno roda
                if parada == "pause_turn":
                    self._evento("pause_turn_inesperado", None)
                    return self._parcial("pause_turn_inesperado")
                if parada == "model_context_window_exceeded":
                    self._evento("parada_fim_de_contexto", None)
                    return self._parcial("model_context_window_exceeded")
                if parada == "max_tokens" and usos:
                    self._evento("max_tokens_com_tool_use", {"repetido": repediu_curto})
                    if repediu_curto:
                        return self._parcial("max_tokens_com_tool_use")
                    repediu_curto = True
                    conteudo = [
                        self._resultado_erro(u.get("id"), "não executado: entrada cortada por max_tokens") for u in usos
                    ]
                    conteudo.append({"type": "text", "text": MENSAGEM_REPROMPT_CURTO})
                    messages.append({"role": "user", "content": conteudo})
                    continue

                if usos:
                    resultados, motivo_parada = self._rodar_ferramentas(usos)
                    messages.append({"role": "user", "content": resultados})
                    if r.parecer_modelo is not None and motivo_parada is None:
                        return r
                    if motivo_parada:
                        return self._parcial(motivo_parada)
                    continue

                if not repediu_parecer:
                    repediu_parecer = True
                    self._evento("reprompt_parecer", {"stop_reason": parada})
                    messages.append({"role": "user", "content": MENSAGEM_REPROMPT_PARECER})
                    continue
                return self._parcial("sem_entregar_parecer")
        except KeyboardInterrupt:
            self._evento("ctrl_c", "interrompido no laço; o modelo não é chamado de novo")
            return self._parcial("ctrl_c")
        except BaseException as e:
            # "finally" do laço: a auditoria fica com um resumo parcial mesmo se o processo morrer.
            try:
                self.auditoria.gravar_resumo(
                    {
                        "parcial": True,
                        "motivo_parcial": f"erro:{type(e).__name__}",
                        "custo": self.orcamento.como_dict(),
                        "request_ids": list(r.request_ids),
                        "modelo_respondeu": r.modelo_respondeu,
                    }
                )
            except Exception:  # noqa: BLE001 — o erro original é o que importa
                pass
            raise

    def _rodar_ferramentas(self, usos: list[dict]) -> tuple[list[dict], str | None]:
        resultados: list[dict] = []
        motivo_parada: str | None = None
        for uso in usos:
            nome = uso.get("name")
            entrada = uso.get("input")
            ident = uso.get("id")
            if motivo_parada is None and self.auditoria.verificar_stop():
                self._evento("stop_detectado", "entre ferramentas do mesmo turno")
                motivo_parada = "STOP"
            if motivo_parada is not None:
                texto = "parada: STOP" if motivo_parada == "STOP" else "orçamento esgotado"
                res = ResultadoFerramenta(texto=texto, erro=True, negado=True, motivo_negacao=motivo_parada)
                self._auditar_ferramenta(nome, entrada, res)
                resultados.append(self._resultado_erro(ident, texto))
                continue
            if nome == "entregar_parecer":
                try:
                    parecer = validar(entrada)
                except ParecerInvalido as e:
                    res = ResultadoFerramenta(texto="parecer inválido", erro=True, codigo=1)
                    self._auditar_ferramenta(nome, {"erros": e.erros}, res)
                    resultados.append(
                        self._resultado_erro(ident, "parecer inválido; corrija e chame de novo: " + "; ".join(e.erros[:20]))
                    )
                    continue
                self.resultado.parecer_modelo = parecer
                res = ResultadoFerramenta(texto="parecer recebido", erro=False, codigo=0)
                self._auditar_ferramenta(nome, {"veredito": parecer.get("veredito")}, res)
                resultados.append({"type": "tool_result", "tool_use_id": ident, "content": "parecer recebido"})
                continue
            motivo = self.orcamento.motivo_estouro_ferramenta()
            if motivo:
                self._evento("orcamento_estourado", motivo)
                motivo_parada = f"orcamento:{motivo}"
                res = ResultadoFerramenta(texto="orçamento esgotado", erro=True, negado=True, motivo_negacao=motivo_parada)
                self._auditar_ferramenta(nome, entrada, res)
                resultados.append(self._resultado_erro(ident, "orçamento esgotado"))
                continue
            self.orcamento.registrar_ferramenta()
            try:
                res = self.ferramentas.executar(nome, entrada)
            except KeyboardInterrupt:
                res = ResultadoFerramenta(
                    texto="interrompido (Ctrl+C)", erro=True, expirou=True, interrompido=True, motivo_negacao="ctrl_c"
                )
                self._auditar_ferramenta(nome, entrada, res)
                raise
            if res.negado:
                self.resultado.negadas += 1
            texto = self.redator.redigir(res.texto)
            item = {"type": "tool_result", "tool_use_id": ident, "content": envelopar(nome, res, texto)}
            if res.erro:
                item["is_error"] = True
            resultados.append(item)
            self._auditar_ferramenta(nome, entrada, res)
        return resultados, motivo_parada
