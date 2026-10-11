"""Valida proposta de patch sem jamais aplicá-la."""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path, PurePosixPath

from .cerca import nome_negado

MAX_PATCH = 1024 * 1024
SCHEMA = "agente-claude-api.patch@2026-10-11.v1"
_DIFF = re.compile(r"^diff --git a/([^ ]+) b/([^ ]+)$")


class PatchRecusado(ValueError): pass

def validar(entrada: object, sha_esperado: str) -> dict:
    if not isinstance(entrada, dict) or set(entrada) != {"base_sha", "diff_unificado", "fontes_lidas", "limitacoes"}:
        raise PatchRecusado("forma da entrega de patch inválida")
    if entrada.get("base_sha") != sha_esperado:
        raise PatchRecusado("base_sha diverge do alvo")
    if not isinstance(entrada.get("fontes_lidas"), list) or not isinstance(entrada.get("limitacoes"), list):
        raise PatchRecusado("listas do patch inválidas")
    analisar(entrada.get("diff_unificado"))
    return dict(entrada)


def _caminho(valor: str) -> str:
    if valor == "/dev/null": return valor
    if not valor or valor.startswith(("/", "\\")) or "\\" in valor or '"' in valor or ":" in valor:
        raise PatchRecusado("caminho não POSIX relativo")
    p = PurePosixPath(valor)
    if any(x in ("", ".", "..") for x in p.parts): raise PatchRecusado("componente de caminho inválido")
    for parte in p.parts:
        if any(ord(c) < 32 or ord(c) == 127 for c in parte): raise PatchRecusado("controle no caminho")
        if parte.casefold() in (".git", "node_modules") or nome_negado(parte): raise PatchRecusado("caminho protegido")
    return valor


def analisar(diff: str) -> dict:
    bruto = diff.encode("utf-8", errors="strict")
    if len(bruto) > MAX_PATCH or "\x00" in diff: raise PatchRecusado("patch inválido ou acima de 1 MiB")
    proibidos = ("GIT binary patch", "Binary files ", "new file mode 120000", "new file mode 160000",
                 "old mode ", "new mode ", "similarity index ", "rename from ", "rename to ", "copy from ", "copy to ")
    if any(x in diff for x in proibidos): raise PatchRecusado("forma não textual proibida")
    linhas = diff.splitlines(); caminhos=[]; hunks=0; i=0
    while i < len(linhas):
        m = _DIFF.fullmatch(linhas[i])
        if not m: i += 1; continue
        a, b = _caminho(m.group(1)), _caminho(m.group(2)); i += 1
        if i >= len(linhas) or linhas[i] != f"--- a/{a}": raise PatchRecusado("cabeçalho --- incoerente")
        i += 1
        if i >= len(linhas): raise PatchRecusado("cabeçalho +++ ausente")
        plus = linhas[i]
        esperado = f"+++ b/{b}"
        if plus != esperado: raise PatchRecusado("cabeçalho +++ incoerente")
        caminhos.extend((a,b)); i += 1
        local=0
        while i < len(linhas) and not linhas[i].startswith("diff --git "):
            if linhas[i].startswith("@@ "): local += 1
            i += 1
        if not local: raise PatchRecusado("arquivo sem hunk")
        hunks += local
    if not caminhos or not hunks: raise PatchRecusado("diff sem arquivo/hunk")
    return {"caminhos": sorted(set(caminhos)), "hunks": hunks, "bytes": len(bruto), "sha256": hashlib.sha256(bruto).hexdigest()}


def publicar(*, entrega: dict, sha_efetivo: str, contexto_md5: str, pasta_saida: Path, worktree: Path,
             git: str, executar, fontes: list[dict] | None = None) -> dict:
    if entrega.get("base_sha") != sha_efetivo: raise PatchRecusado("base_sha diverge do worktree/contexto")
    diff = entrega.get("diff_unificado")
    if not isinstance(diff, str): raise PatchRecusado("diff ausente")
    meta = analisar(diff); pasta_saida.mkdir(parents=True, exist_ok=True)
    candidato = pasta_saida / ".proposta.patch.tmp"; candidato.write_text(diff, encoding="utf-8", newline="\n")
    antes = executar([git, "-C", str(worktree), "status", "--porcelain=v2"], cwd=str(worktree), env={}, timeout_s=30, teto_bytes=65536)
    argv = [git, "-C", str(worktree), "apply", "--check", "--whitespace=error-all", str(candidato)]
    checagem = executar(argv, cwd=str(worktree), env={}, timeout_s=120, teto_bytes=65536)
    depois = executar([git, "-C", str(worktree), "status", "--porcelain=v2"], cwd=str(worktree), env={}, timeout_s=30, teto_bytes=65536)
    inalterado = antes.codigo == depois.codigo and antes.saida == depois.saida
    manifesto = {"schema": SCHEMA, "base_sha": sha_efetivo, "contexto_md5": contexto_md5, **meta,
                 "git_apply_check": {"argv": argv, "codigo_saida": checagem.codigo},
                 "worktree_inalterado": inalterado, "fontes_lidas": fontes or []}
    if checagem.codigo != 0 or not inalterado:
        candidato.unlink(missing_ok=True); raise PatchRecusado("git apply --check falhou ou worktree mudou")
    os.replace(candidato, pasta_saida / "proposta.patch")
    tmp=pasta_saida/"patch.json.tmp"; tmp.write_text(json.dumps(manifesto,sort_keys=True,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,pasta_saida/"patch.json"); return manifesto
