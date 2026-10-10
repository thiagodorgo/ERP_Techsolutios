"""Orçamento: tetos de turnos, chamadas de ferramenta, tokens (com cache) e US$.

Custo em `decimal.Decimal`, nunca `float` (plano §3.3, §10). Preços do Opus 5.5
por milhão de tokens: entrada 4, saída 20, leitura de cache 0,20 (brief; skill
README l.497, prompt-caching l.144). Escrita de cache 5,00 = 1,25 × entrada
(prompt-caching l.144) — derivado, declarado.
O teto é atingido com `>=`. Checagem ANTES de cada chamada ao modelo e ANTES de
cada ferramenta; o custo tem previsão (não faz a chamada que estouraria).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

PRECO_ENTRADA = Decimal("4")
PRECO_SAIDA = Decimal("20")
PRECO_CACHE_LEITURA = Decimal("0.20")
PRECO_CACHE_ESCRITA = Decimal("5")
MILHAO = Decimal(1_000_000)


@dataclass
class Tetos:
    turnos: int = 30
    ferramentas: int = 60
    tokens: int = 1_500_000
    custo_usd: Decimal = Decimal("6.00")


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
        self._custo_ultima = Decimal(0)
        self.usage_ausente = 0

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
        self._custo_ultima = self.custo_de(e, ce, cl, s)

    def registrar_ferramenta(self) -> None:
        self.chamadas_ferramenta += 1

    def tokens_total(self) -> int:
        return self.entrada + self.cache_escrita + self.cache_leitura + self.saida

    def custo_usd(self) -> Decimal:
        return self.custo_de(self.entrada, self.cache_escrita, self.cache_leitura, self.saida)

    def custo_usd_texto(self) -> str:
        return formatar_usd(self.custo_usd())

    def motivo_estouro_modelo(self) -> str | None:
        """Antes de chamar o modelo: o primeiro teto atingido (>=), ou a previsão de custo."""
        if self.turnos >= self.tetos.turnos:
            return "turnos"
        if self.tokens_total() >= self.tetos.tokens:
            return "tokens"
        if self.custo_usd() >= self.tetos.custo_usd:
            return "custo"
        if self.custo_usd() + self._custo_ultima > self.tetos.custo_usd:
            return "custo"
        return None

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
