"""Orçamento: tetos de turnos, chamadas de ferramenta, tokens (com cache) e US$.

Custo em `decimal.Decimal`, nunca `float` (plano §3.3, §10). Preços do Opus 5.5
por milhão de tokens: entrada 4, saída 20, leitura de cache 0,20 (brief; skill
README l.497, prompt-caching l.144). Escrita de cache 5,00 = 1,25 × entrada
(prompt-caching l.144) — derivado, declarado.
O teto é atingido com `>=`. Checagem ANTES de cada chamada ao modelo e ANTES de
cada ferramenta.

Previsão da PRÓXIMA chamada (achado A4 da revisão do PR #417): antes de chamar, o laço
estima a entrada da chamada (o prompt medido da última resposta + o que entrou no histórico
depois dela, inclusive os `tool_result` pendentes). No primeiro turno usa o pior caso; depois,
usa média real com margem e último turno com margem. A cerca dura é separada da previsão:
reduz o `max_tokens` da próxima chamada ao saldo que ainda cabe no pior caso. Assim não para
cedo só porque a resposta poderia usar o máximo, nem autoriza ultrapassar o teto:
- tokens de entrada novos = bytes UTF-8 do JSON do que entrou (um token cobre pelo menos um
  byte — [H] hipótese declarada, não medida: medir exigiria `count_tokens`, uma chamada à API);
- todo token de entrada é cobrado pelo maior preço de entrada (escrita de cache, 5/MTok): o
  cache pode ter expirado entre as chamadas;
- a saída é cobrada inteira (`max_tokens`).
Assim o custo final medido nunca passa do teto (o excesso antigo, de até uma chamada inteira,
deixa de existir), mas turnos reais baratos conseguem usar a maior parte do orçamento.
Por turno, o laço também limita quantas ferramentas executa e quantos bytes de resultado
devolve, para a próxima chamada nunca crescer sem limite num turno só.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, ROUND_FLOOR

PRECO_ENTRADA = Decimal("4")
PRECO_SAIDA = Decimal("20")
PRECO_CACHE_LEITURA = Decimal("0.20")
PRECO_CACHE_ESCRITA = Decimal("5")
PRECO_ENTRADA_PIOR_CASO = max(PRECO_ENTRADA, PRECO_CACHE_ESCRITA)
MILHAO = Decimal(1_000_000)
MARGEM_MEDIA = Decimal("1.50")
MARGEM_ULTIMO = Decimal("1.25")
MIN_TOKENS_RESPOSTA = 256
# Folga por chamada para o enquadramento que a API acrescenta (prompt de sistema de ferramentas,
# marcadores de mensagem). O JSON contado já inclui chaves e aspas que nem viram token; a folga é
# para o que não está no JSON.
MARGEM_TOKENS_POR_CHAMADA = 2048
FERRAMENTAS_POR_TURNO = 12
BYTES_RESULTADO_POR_TURNO = 384 * 1024


def bytes_json(obj: object) -> int:
    """Bytes UTF-8 do JSON de `obj` — a unidade da previsão de pior caso (1 token <= 1 byte)."""
    return len(json.dumps(obj, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8", "backslashreplace"))


@dataclass
class Tetos:
    turnos: int = 30
    ferramentas: int = 60
    tokens: int = 1_500_000
    custo_usd: Decimal = Decimal("6.00")
    ferramentas_por_turno: int = FERRAMENTAS_POR_TURNO
    bytes_resultado_por_turno: int = BYTES_RESULTADO_POR_TURNO


def formatar_usd(valor: Decimal) -> str:
    """Decimal -> texto com 2 a 6 casas ('29.20', '0.000123')."""
    q = valor.quantize(Decimal("0.000001"))
    texto = f"{q:f}"
    inteiro, _, frac = texto.partition(".")
    frac = frac.rstrip("0")
    if len(frac) < 2:
        frac = frac.ljust(2, "0")
    return f"{inteiro}.{frac}"


def _contador(usage: object, nome: str) -> int:
    if usage is None:
        return 0
    valor = usage.get(nome) if isinstance(usage, dict) else getattr(usage, nome, None)
    return int(valor or 0)


class Orcamento:
    def __init__(self, tetos: Tetos) -> None:
        self.tetos = tetos
        self.turnos = 0
        self.chamadas_ferramenta = 0
        self.entrada = 0
        self.cache_escrita = 0
        self.cache_leitura = 0
        self.saida = 0
        self.usage_ausente = 0
        # Tamanho MEDIDO do prompt da última chamada (entrada + cache escrita + cache leitura) e a
        # saída dela. `None` = ainda não há medição (1ª chamada, ou resposta sem `usage`).
        self.prompt_ultimo: int | None = None
        self.saida_ultima = 0
        self.custos_turnos: list[Decimal] = []

    @staticmethod
    def custo_de(entrada: int, cache_escrita: int, cache_leitura: int, saida: int) -> Decimal:
        return (
            Decimal(entrada) * PRECO_ENTRADA
            + Decimal(cache_escrita) * PRECO_CACHE_ESCRITA
            + Decimal(cache_leitura) * PRECO_CACHE_LEITURA
            + Decimal(saida) * PRECO_SAIDA
        ) / MILHAO

    def novo_turno(self) -> None:
        self.turnos += 1

    def registrar_resposta(self, usage: object, max_tokens_resposta: int) -> None:
        """Soma os quatro contadores. Sem `usage`, conta o pior caso de saída."""
        if usage is None:
            self.usage_ausente += 1
            e, ce, cl, s = 0, 0, 0, max_tokens_resposta
        else:
            e = _contador(usage, "input_tokens")
            ce = _contador(usage, "cache_creation_input_tokens")
            cl = _contador(usage, "cache_read_input_tokens")
            s = _contador(usage, "output_tokens")
        self.entrada += e
        self.cache_escrita += ce
        self.cache_leitura += cl
        self.saida += s
        self.prompt_ultimo = None if usage is None else e + ce + cl
        self.saida_ultima = s
        self.custos_turnos.append(self.custo_de(e, ce, cl, s))

    def registrar_ferramenta(self) -> None:
        self.chamadas_ferramenta += 1

    def tokens_total(self) -> int:
        return self.entrada + self.cache_escrita + self.cache_leitura + self.saida

    def custo_usd(self) -> Decimal:
        return self.custo_de(self.entrada, self.cache_escrita, self.cache_leitura, self.saida)

    def custo_usd_texto(self) -> str:
        return formatar_usd(self.custo_usd())

    @staticmethod
    def custo_previsto(entrada_prevista: int, max_tokens_resposta: int) -> Decimal:
        """Pior caso de UMA chamada: toda a entrada ao maior preço de entrada + a saída inteira."""
        return (
            Decimal(entrada_prevista) * PRECO_ENTRADA_PIOR_CASO + Decimal(max_tokens_resposta) * PRECO_SAIDA
        ) / MILHAO

    def previsao_honesta(self, entrada_prevista: int, max_tokens_resposta: int) -> Decimal:
        """Previsão operacional do próximo turno, separada da cerca dura.

        No primeiro turno, sem amostra, vale o pior caso. Depois, usa a média real com 50% de
        margem e o último turno com 25%, sempre limitada pelo pior caso da chamada.
        """
        pior = self.custo_previsto(entrada_prevista, max_tokens_resposta)
        if not self.custos_turnos:
            return pior
        media = sum(self.custos_turnos, Decimal("0")) / Decimal(len(self.custos_turnos))
        estimado = max(media * MARGEM_MEDIA, self.custos_turnos[-1] * MARGEM_ULTIMO)
        return min(pior, estimado)

    def max_tokens_seguro(self, entrada_prevista: int, solicitado: int) -> int:
        """Maior saída que cabe mesmo se a entrada for cobrada pelo pior preço.

        A média nunca autoriza furar o teto: antes da chamada, o `max_tokens` enviado à API é
        reduzido ao saldo seguro simultâneo de US$ e tokens.
        """
        saldo_tokens = self.tetos.tokens - self.tokens_total() - entrada_prevista
        saldo_usd = self.tetos.custo_usd - self.custo_usd()
        custo_entrada = Decimal(entrada_prevista) * PRECO_ENTRADA_PIOR_CASO / MILHAO
        if saldo_tokens <= 0 or saldo_usd <= custo_entrada:
            return 0
        por_usd = int(
            ((saldo_usd - custo_entrada) * MILHAO / PRECO_SAIDA).to_integral_value(rounding=ROUND_FLOOR)
        )
        return max(0, min(solicitado, saldo_tokens, por_usd))

    def planejar_chamada(
        self, entrada_prevista: int, max_tokens_resposta: int
    ) -> tuple[str | None, int, Decimal]:
        """Retorna motivo de parada, `max_tokens` seguro e previsão operacional."""
        if self.turnos >= self.tetos.turnos:
            return "turnos", 0, Decimal("0")
        if self.tokens_total() >= self.tetos.tokens:
            return "tokens", 0, Decimal("0")
        if self.custo_usd() >= self.tetos.custo_usd:
            return "custo", 0, Decimal("0")
        previsto = self.previsao_honesta(entrada_prevista, max_tokens_resposta)
        if self.custo_usd() + previsto > self.tetos.custo_usd:
            return "custo", 0, previsto
        seguro = self.max_tokens_seguro(entrada_prevista, max_tokens_resposta)
        if seguro < MIN_TOKENS_RESPOSTA:
            saldo_tokens = self.tetos.tokens - self.tokens_total() - entrada_prevista
            motivo = "tokens" if saldo_tokens < MIN_TOKENS_RESPOSTA else "custo"
            return motivo, seguro, previsto
        return None, seguro, previsto

    def motivo_estouro_modelo(self, entrada_prevista: int = 0, max_tokens_resposta: int = 0) -> str | None:
        """Antes de chamar o modelo: o primeiro teto atingido (>=) ou que a PRÓXIMA chamada pode
        passar (acumulado + previsão > teto). Quem chama passa a entrada prevista (tokens) e o
        `max_tokens` da chamada."""
        return self.planejar_chamada(entrada_prevista, max_tokens_resposta)[0]

    def motivo_estouro_ferramenta(self) -> str | None:
        """Antes de cada ferramenta (inclusive no meio de um turno)."""
        if self.chamadas_ferramenta >= self.tetos.ferramentas:
            return "ferramentas"
        return None

    def como_dict(self) -> dict:
        return {
            "turnos": self.turnos,
            "chamadas_ferramenta": self.chamadas_ferramenta,
            "tokens": {
                "entrada": self.entrada,
                "cache_escrita": self.cache_escrita,
                "cache_leitura": self.cache_leitura,
                "saida": self.saida,
                "total": self.tokens_total(),
            },
            "usd_estimado": self.custo_usd_texto(),
            "precos_usd_por_mtok": {
                "entrada": str(PRECO_ENTRADA),
                "saida": str(PRECO_SAIDA),
                "cache_leitura": str(PRECO_CACHE_LEITURA),
                "cache_escrita": str(PRECO_CACHE_ESCRITA),
            },
            "usage_ausente": self.usage_ausente,
        }
