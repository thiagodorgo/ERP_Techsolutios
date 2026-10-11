"""Portão de custo diário, decimal e serializado por lock de SO."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .travas import TravaArquivo

SCHEMA = "agente-claude-api.uso@2026-10-11.v1"
PADRAO = Decimal("15.00")


class UsoRecusado(RuntimeError):
    pass


def teto_do_ambiente(env) -> Decimal:
    bruto = env.get("ERP_AGENTE_TETO_DIARIO_USD")
    if bruto is None:
        return PADRAO
    try: valor = Decimal(bruto)
    except InvalidOperation as e: raise UsoRecusado("teto diário inválido") from e
    if not valor.is_finite() or valor <= 0: raise UsoRecusado("teto diário deve ser finito > 0")
    return valor


def _decimal(v, campo="custo") -> Decimal:
    try: d = Decimal(str(v))
    except (InvalidOperation, TypeError) as e: raise UsoRecusado(f"{campo} inválido") from e
    if not d.is_finite() or d < 0: raise UsoRecusado(f"{campo} inválido")
    return d


class ControladorUso:
    def __init__(self, raiz: Path, *, teto: Decimal, agora=None):
        self.raiz, self.teto = Path(raiz), teto
        self.agora = agora or (lambda: datetime.now(timezone.utc))
        self.raiz.mkdir(parents=True, exist_ok=True)

    def _dia(self): return self.agora().astimezone(timezone.utc).strftime("%Y-%m-%d")
    def _livro(self, dia): return self.raiz / f"uso-{dia}.jsonl"
    def _trava(self, dia): return self.raiz / ".locks" / f"uso-{dia}.lock"

    def _estado(self, dia):
        gasto, ativos, ids, seq = Decimal("0"), {}, set(), 0
        for resumo in self.raiz.rglob("resumo.json"):
            try: obj = json.loads(resumo.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as e: raise UsoRecusado(f"resumo inválido: {resumo}") from e
            inicio = ((obj.get("inicio") or {}).get("inicio_utc") or (obj.get("inicio") or {}).get("ts"))
            if isinstance(inicio, str) and inicio[:10] == dia:
                eid = (obj.get("inicio") or {}).get("execucao_id")
                if not eid or eid in ids: raise UsoRecusado("resumo sem ID ou ID duplicado")
                ids.add(eid)
                custo = ((obj.get("fim") or {}).get("custo") or {}).get("usd_estimado")
                gasto += _decimal(custo)
        livro = self._livro(dia)
        if livro.exists():
            for linha in livro.read_text(encoding="utf-8").splitlines():
                try: ev = json.loads(linha)
                except json.JSONDecodeError as e: raise UsoRecusado("livro diário inválido") from e
                seq += 1
                if ev.get("seq") != seq or ev.get("schema") != SCHEMA: raise UsoRecusado("sequência/schema diário inválido")
                eid = ev.get("execucao_id")
                if ev.get("evento") == "reservada": ativos[eid] = _decimal(ev.get("reserva_usd"), "reserva")
                elif ev.get("evento") in ("concluida", "reconciliada"): ativos.pop(eid, None)
                elif ev.get("evento") != "recusada": raise UsoRecusado("evento diário inválido")
        return gasto, ativos, seq

    def _apensar(self, dia, seq, **dados):
        obj = {"schema": SCHEMA, "seq": seq, "ts_utc": self.agora().astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "dia_utc": dia, **dados}
        with open(self._livro(dia), "a", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(obj, sort_keys=True, ensure_ascii=False) + "\n"); f.flush(); os.fsync(f.fileno())

    def reservar(self, execucao_id: str, reserva: Decimal, pasta_saida: Path):
        reserva = _decimal(reserva, "reserva"); dia = self._dia()
        with TravaArquivo(self._trava(dia), 10):
            gasto, ativos, seq = self._estado(dia)
            if execucao_id in ativos: raise UsoRecusado("execução já reservada")
            comprometido = gasto + sum(ativos.values(), Decimal("0")) + reserva
            base = {"execucao_id": execucao_id, "teto_diario_usd": str(self.teto), "reserva_usd": str(reserva),
                    "usd_estimado": None, "pasta_saida": str(pasta_saida)}
            if comprometido > self.teto:
                self._apensar(dia, seq + 1, evento="recusada", motivo="teto diário", **base)
                raise UsoRecusado("teto diário excedido")
            self._apensar(dia, seq + 1, evento="reservada", motivo=None, **base)

    def concluir(self, execucao_id: str, reserva: Decimal, custo: Decimal, pasta_saida: Path):
        dia = self._dia()
        with TravaArquivo(self._trava(dia), 10):
            _, ativos, seq = self._estado(dia)
            if execucao_id not in ativos: raise UsoRecusado("reserva ativa ausente")
            self._apensar(dia, seq + 1, execucao_id=execucao_id, evento="concluida",
                          teto_diario_usd=str(self.teto), reserva_usd=str(reserva), usd_estimado=str(_decimal(custo)),
                          pasta_saida=str(pasta_saida), motivo=None)
