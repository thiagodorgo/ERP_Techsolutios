"""Auditoria: uma linha JSON por evento, `seq` crescente, redigida ANTES de gravar.

Cada evento é gravado com `flush` + `os.fsync` na hora (P1 do contrato: uma queda
custa só a cauda, nunca o que já aconteceu). Toda chamada de ferramenta gera uma
linha, inclusive a negada. Conteúdo de arquivo lido NUNCA entra aqui — só bytes
e truncado (plano §2.4, §3.5).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from .redacao import Redator

# Campos obrigatórios por tipo (plano §2.4).
CAMPOS_OBRIGATORIOS: dict[str, frozenset[str]] = {
    "inicio": frozenset(
        {"ts", "execucao_id", "tarefa", "alvo", "sha", "worktree", "orcamento", "modelo_pedido", "esforco", "conta"}
    ),
    "modelo": frozenset(
        {
            "turno", "request_id", "modelo_respondeu", "stop_reason", "usage",
            "custo_acumulado_usd", "duracao_ms", "rate_limit", "blocos",
        }
    ),
    "ferramenta": frozenset(
        {
            "turno", "ferramenta", "args", "argv", "negado", "motivo_negacao",
            "codigo_saida", "bytes_saida", "truncado", "duracao_ms", "expirou",
        }
    ),
    "evento": frozenset({"nome", "detalhe"}),
    "fim": frozenset({"parcial", "motivo_parcial", "custo", "request_ids", "modelo_respondeu", "duracao_total_ms"}),
}
NOMES_EVENTO = frozenset(
    {
        "stop_detectado", "ctrl_c", "orcamento_estourado", "refusal", "max_tokens_com_tool_use",
        "pause_turn_inesperado", "reprompt_parecer", "worktree_criado", "npm_ci", "prisma_generate",
        "worktree_removido", "parada_fim_de_contexto", "erro",
    }
)


def agora_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


class Auditoria:
    def __init__(self, pasta: str | os.PathLike[str], redator: Redator, relogio=agora_iso) -> None:
        self.pasta = Path(pasta)
        self.arquivo = self.pasta / "auditoria.jsonl"
        self._redator = redator
        self._relogio = relogio
        self._seq = 0
        self._fh = open(self.arquivo, "a", encoding="utf-8", newline="\n")
        self.eventos_ferramenta: list[dict] = []
        self.inicio: dict | None = None
        self.fim: dict | None = None

    def registrar(self, evento: dict) -> dict:
        tipo = evento.get("tipo")
        if tipo not in CAMPOS_OBRIGATORIOS:
            raise ValueError(f"tipo de evento desconhecido: {tipo!r}")
        linha = {"ts": self._relogio(), **evento}
        faltando = CAMPOS_OBRIGATORIOS[tipo] - set(linha)
        if faltando:
            raise ValueError(f"evento {tipo} sem campos: {sorted(faltando)}")
        if tipo == "evento" and linha["nome"] not in NOMES_EVENTO:
            raise ValueError(f"nome de evento desconhecido: {linha['nome']!r}")
        self._seq += 1
        linha["seq"] = self._seq
        linha = self._redator.redigir_objeto(linha)
        self._fh.write(json.dumps(linha, sort_keys=True, ensure_ascii=False, default=str) + "\n")
        self._fh.flush()
        os.fsync(self._fh.fileno())
        if tipo == "ferramenta":
            self.eventos_ferramenta.append(linha)
        elif tipo == "inicio":
            self.inicio = linha
        elif tipo == "fim":
            self.fim = linha
        return linha

    def verificar_stop(self) -> bool:
        """O arquivo STOP existe na pasta da execução? (conteúdo irrelevante, §3.6)."""
        return (self.pasta / "STOP").exists()

    def resumo(self, fim: dict | None = None) -> dict:
        return {"inicio": self.inicio, "fim": fim if fim is not None else self.fim}

    def gravar_resumo(self, fim: dict | None = None) -> Path:
        destino = self.pasta / "resumo.json"
        temporario = self.pasta / "resumo.json.tmp"
        conteudo = self._redator.redigir_objeto(self.resumo(fim))
        with open(temporario, "w", encoding="utf-8", newline="\n") as f:
            json.dump(conteudo, f, sort_keys=True, ensure_ascii=False, indent=2, default=str)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporario, destino)
        return destino

    def fechar(self) -> None:
        if not self._fh.closed:
            self._fh.close()
