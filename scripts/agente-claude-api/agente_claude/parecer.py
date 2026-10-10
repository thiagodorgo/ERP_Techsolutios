"""Parecer: validação do que o modelo entregou e montagem do parecer final.

- `validar` é um validador mínimo de JSON Schema em stdlib (tipos, `required`,
  `enum`, `anyOf`, `additionalProperties: false`). Ele roda SEMPRE: o `strict`
  da API é uma garantia do servidor, não deste código (e o modelo falso dos testes
  não respeita esquema).
- Na montagem, as chaves de origem S (custo, conta, modelo, comandos_executados,
  execução) vêm do SCRIPT; o `comandos_executados` do modelo vira
  `comandos_declarados_pelo_modelo` (plano §2.3).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from .esquemas import PARECER_SCHEMA

VERSAO_SCHEMA = "agente-claude-api.parecer@2026-10-10.v1"
NIVEL = "menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)"


class ParecerInvalido(Exception):
    def __init__(self, erros: list[str]) -> None:
        super().__init__("; ".join(erros))
        self.erros = erros


def _tipo_ok(valor: object, tipo: str) -> bool:
    if tipo == "object":
        return isinstance(valor, dict)
    if tipo == "array":
        return isinstance(valor, list)
    if tipo == "string":
        return isinstance(valor, str)
    if tipo == "integer":
        return isinstance(valor, int) and not isinstance(valor, bool)
    if tipo == "number":
        return isinstance(valor, (int, float)) and not isinstance(valor, bool)
    if tipo == "boolean":
        return isinstance(valor, bool)
    if tipo == "null":
        return valor is None
    return False


def _validar(valor: object, schema: dict, caminho: str, erros: list[str]) -> None:
    if "anyOf" in schema:
        for opcao in schema["anyOf"]:
            sub: list[str] = []
            _validar(valor, opcao, caminho, sub)
            if not sub:
                return
        erros.append(f"{caminho}: nenhuma opção do anyOf casa")
        return
    tipo = schema.get("type")
    if tipo and not _tipo_ok(valor, tipo):
        erros.append(f"{caminho}: esperado {tipo}")
        return
    if "enum" in schema and valor not in schema["enum"]:
        erros.append(f"{caminho}: fora de {schema['enum']}")
        return
    if tipo == "object":
        props = schema.get("properties", {})
        for nome in schema.get("required", []):
            if nome not in valor:
                erros.append(f"{caminho}.{nome}: obrigatório")
        if schema.get("additionalProperties") is False:
            for nome in valor:
                if nome not in props:
                    erros.append(f"{caminho}.{nome}: campo não permitido")
        for nome, sub in props.items():
            if nome in valor:
                _validar(valor[nome], sub, f"{caminho}.{nome}", erros)
    elif tipo == "array" and "items" in schema:
        for i, item in enumerate(valor):
            _validar(item, schema["items"], f"{caminho}[{i}]", erros)


def validar(entrada: object) -> dict:
    erros: list[str] = []
    _validar(entrada, PARECER_SCHEMA, "parecer", erros)
    if erros:
        raise ParecerInvalido(erros)
    return entrada  # type: ignore[return-value]


def _normalizar_comando(texto: str) -> str:
    return " ".join(str(texto).split())


def conferir_evidencia(comando: str, eventos_ferramenta: list[dict]) -> bool:
    """O comando citado pelo modelo consta da auditoria? (nome da ferramenta + argumentos, ou argv)."""
    alvo = _normalizar_comando(comando)
    if not alvo:
        return False
    for ev in eventos_ferramenta:
        if ev.get("negado"):
            continue
        candidatos = [str(ev.get("ferramenta", ""))]
        if ev.get("argv"):
            candidatos.append(" ".join(str(a) for a in ev["argv"][1:]))
            candidatos.append(" ".join(str(a) for a in ev["argv"]))
        args = ev.get("args")
        if args:
            candidatos.append(f"{ev.get('ferramenta')} {json.dumps(args, sort_keys=True, ensure_ascii=False)}")
            candidatos.extend(str(v) for v in args.values() if isinstance(v, str) and len(v) >= 3)
        for c in candidatos:
            c = _normalizar_comando(c)
            if c and len(c) >= 3 and (c in alvo or alvo in c):
                return True
    return False


def comandos_da_auditoria(eventos_ferramenta: list[dict]) -> list[dict]:
    return [
        {
            "seq": ev.get("seq"),
            "ferramenta": ev.get("ferramenta"),
            "argv": ev.get("argv"),
            "codigo": ev.get("codigo_saida"),
            "bytes": ev.get("bytes_saida"),
            "truncado": ev.get("truncado"),
            "negado": ev.get("negado"),
        }
        for ev in eventos_ferramenta
    ]


def montar(
    *,
    parecer_modelo: dict | None,
    tarefa: str,
    alvo: dict,
    eventos_ferramenta: list[dict],
    modelo: dict,
    conta: dict,
    custo: dict,
    execucao: dict,
    parcial: bool,
    motivo_parcial: str | None,
    ultimo_texto: str | None,
) -> dict:
    base = parecer_modelo or {}
    achados = []
    for achado in base.get("achados", []) or []:
        a = dict(achado)
        evid = dict(a.get("evidencia") or {})
        evid["conferida"] = conferir_evidencia(evid.get("comando", ""), eventos_ferramenta)
        a["evidencia"] = evid
        achados.append(a)
    veredito = base.get("veredito", "inconclusivo")
    resumo = base.get("resumo")
    if parcial:
        veredito = "inconclusivo"
        if not resumo:
            resumo = ultimo_texto or ""
    return {
        "versao_schema": VERSAO_SCHEMA,
        "tarefa": tarefa,
        "alvo": alvo,
        "veredito": veredito,
        "resumo": resumo or "",
        "achados": achados,
        "limitacoes": list(base.get("limitacoes", []) or []),
        "comandos_declarados_pelo_modelo": list(base.get("comandos_executados", []) or []),
        "comandos_executados": comandos_da_auditoria(eventos_ferramenta),
        "modelo": modelo,
        "conta": conta,
        "custo": custo,
        "parcial": parcial,
        "motivo_parcial": motivo_parcial,
        "ultimo_texto_do_modelo": ultimo_texto if parcial else None,
        "execucao": execucao,
    }


def _escrever(destino: Path, texto: str) -> Path:
    temporario = destino.with_suffix(destino.suffix + ".tmp")
    with open(temporario, "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporario, destino)
    return destino


def gravar_json(parecer: dict, pasta: Path, redator) -> Path:
    conteudo = redator.redigir_objeto(parecer)
    return _escrever(Path(pasta) / "parecer.json", json.dumps(conteudo, sort_keys=True, ensure_ascii=False, indent=2) + "\n")


def gravar_md(parecer: dict, pasta: Path, redator) -> Path:
    p = parecer
    linhas = [
        f"# Parecer — {p['tarefa']} {_alvo_curto(p['alvo'])}",
        "",
        f"- **Veredito:** {p['veredito']}" + (" (PARCIAL)" if p["parcial"] else ""),
    ]
    if p["parcial"]:
        linhas.append(f"- **Motivo do parcial:** {p['motivo_parcial']}")
    linhas += [
        f"- **Modelo pedido / respondeu:** {p['modelo'].get('pedido')} / {p['modelo'].get('respondeu')}"
        f" · esforço {p['modelo'].get('esforco')} · nível {p['modelo'].get('nivel')}",
        "",
        "## Resumo",
        "",
        p["resumo"] or "(sem resumo)",
        "",
        "## Achados",
        "",
    ]
    if not p["achados"]:
        linhas.append("(nenhum achado)")
    for i, a in enumerate(p["achados"], 1):
        ev = a.get("evidencia", {})
        linhas += [
            f"### {i}. [{a.get('gravidade')}] [{a.get('escopo')}] {a.get('arquivo')}"
            + (f":{a.get('linha')}" if a.get("linha") is not None else ""),
            "",
            f"- Motivo: {a.get('motivo')}",
            f"- Evidência (conferida na auditoria: {'sim' if ev.get('conferida') else 'não'}): `{ev.get('comando')}`",
            "",
            "```",
            str(ev.get("saida", "")),
            "```",
            "",
        ]
    linhas += ["## Limitações", ""]
    linhas += [f"- {t}" for t in p["limitacoes"]] or ["(nenhuma declarada)"]
    c = p["custo"]
    tokens = c.get("tokens", {})
    linhas += [
        "",
        "## Custo",
        "",
        f"- Turnos: {c.get('turnos')} · chamadas de ferramenta: {c.get('chamadas_ferramenta')} · negadas: {c.get('negadas')}",
        f"- Tokens: entrada {tokens.get('entrada')} · cache escrita {tokens.get('cache_escrita')} · "
        f"cache leitura {tokens.get('cache_leitura')} · saída {tokens.get('saida')} · total {tokens.get('total')}",
        f"- US$ estimado: {c.get('usd_estimado')} (preços por MTok: {c.get('precos_usd_por_mtok')})",
        "",
        "## Conta e cobrança",
        "",
    ]
    for chave in ("origem_chave", "tipo_chave", "cabecalho_workspace_enviado", "base_url", "request_ids", "rate_limit_ultimo", "retry_after_visto"):
        linhas.append(f"- {chave}: {p['conta'].get(chave)}")
    linhas += ["", "## Comandos executados (da auditoria)", ""]
    for cmd in p["comandos_executados"]:
        estado = "NEGADO" if cmd.get("negado") else f"código {cmd.get('codigo')}"
        argv = " ".join(cmd["argv"]) if cmd.get("argv") else "(não executado)"
        linhas.append(f"- #{cmd.get('seq')} {cmd.get('ferramenta')}: {estado} — `{argv}`")
    if not p["comandos_executados"]:
        linhas.append("(nenhum)")
    e = p["execucao"]
    linhas += [
        "",
        "## Execução",
        "",
        f"- id: {e.get('id')} · início {e.get('inicio_utc')} · fim {e.get('fim_utc')}",
        f"- worktree: {e.get('worktree')} · removido: {e.get('worktree_removido')} · npm ci: {e.get('npm_ci')}",
        f"- agente {e.get('versao_agente')} · SDK {e.get('sdk')}",
    ]
    if e.get("comando_limpeza"):
        linhas.append(f"- **worktree ficou no disco; para remover:** `{e['comando_limpeza']}`")
    texto = "\n".join(str(x) for x in linhas) + "\n"
    return _escrever(Path(pasta) / "parecer.md", redator.redigir(texto))


def _alvo_curto(alvo: dict) -> str:
    if alvo.get("pr") is not None:
        return f"#{alvo['pr']} @ {str(alvo.get('sha', ''))[:12]}"
    return f"@ {str(alvo.get('sha', ''))[:12]}"
