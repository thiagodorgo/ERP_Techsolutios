"""Validação e publicação confinada de entregas Markdown."""

from __future__ import annotations

import json
import os
from pathlib import Path

TIPOS = ("registro", "ata", "corpo-pr", "hipoteses-mandato", "corpo-cadeira", "rascunho-plano")
FALHA_FECHADA = frozenset(("registro", "ata", "corpo-cadeira"))
MAX_TEXTO = 256 * 1024
FONTES = frozenset(("ler_arquivo", "git_show", "git_diff", "buscar", "gh_pr_view", "gh_pr_diff", "gh_pr_checks"))


class EntregaRecusada(ValueError):
    pass


def validar(entrada: object, tipo_esperado: str) -> dict:
    if not isinstance(entrada, dict) or set(entrada) != {"tipo", "texto_markdown", "fontes_lidas", "limitacoes"}:
        raise EntregaRecusada("forma da redação inválida")
    if entrada.get("tipo") != tipo_esperado:
        raise EntregaRecusada("tipo da entrega diverge da CLI")
    if not isinstance(entrada.get("fontes_lidas"), list) or not isinstance(entrada.get("limitacoes"), list):
        raise EntregaRecusada("listas da redação inválidas")
    return dict(entrada)


def conferir_fontes(fontes: list[dict], eventos: list[dict]) -> list[dict]:
    executadas = {(e.get("ferramenta"), json.dumps(e.get("entrada", {}), sort_keys=True, ensure_ascii=False))
                  for e in eventos if e.get("ferramenta") in FONTES and not e.get("negado")}
    saida = []
    for fonte in fontes:
        item = dict(fonte)
        evidencia = str(item.get("evidencia", ""))
        confere = False
        for nome, entrada in executadas:
            if evidencia == f"{nome} {entrada}" or evidencia == f"{nome} {entrada.replace(': ', '=')}":
                confere = True
                break
        item["conferida"] = confere
        saida.append(item)
    return saida


def publicar(*, entrega: dict, tipo_esperado: str, pasta_saida: Path, sha: str, contexto_md5: str,
             eventos: list[dict], redator) -> dict:
    if tipo_esperado not in TIPOS or entrega.get("tipo") != tipo_esperado:
        raise EntregaRecusada("tipo da entrega diverge da CLI")
    texto = entrega.get("texto_markdown")
    if not isinstance(texto, str) or "\x00" in texto or len(texto.encode("utf-8")) > MAX_TEXTO:
        raise EntregaRecusada("texto Markdown inválido ou acima de 256 KiB")
    fontes = conferir_fontes(entrega.get("fontes_lidas", []), eventos)
    if tipo_esperado in FALHA_FECHADA and any(not f["conferida"] for f in fontes):
        raise EntregaRecusada("fonte não conferida em entrega fail-closed")
    pasta_saida.mkdir(parents=True, exist_ok=True)
    texto = redator.redigir(texto)
    tmp = pasta_saida / "entregavel.md.tmp"
    tmp.write_text(texto, encoding="utf-8", newline="\n")
    os.replace(tmp, pasta_saida / "entregavel.md")
    manifesto = {"schema": "agente-claude-api.redacao@2026-10-11.v1", "tipo": tipo_esperado,
                 "sha": sha, "contexto_md5": contexto_md5, "fontes_lidas": fontes,
                 "limitacoes": redator.redigir_objeto(entrega.get("limitacoes", []))}
    tmp = pasta_saida / "fontes-lidas.json.tmp"
    tmp.write_text(json.dumps(manifesto, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, pasta_saida / "fontes-lidas.json")
    return manifesto
