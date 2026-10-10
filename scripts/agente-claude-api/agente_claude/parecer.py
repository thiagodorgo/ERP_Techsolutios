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
import re
import shlex
import unicodedata
from pathlib import Path

from .esquemas import ESCOPOS, GRAVIDADES, PARECER_SCHEMA, VEREDITOS, VEREDITOS_POR_TAREFA

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


def validar(entrada: object, tarefa: str | None = None) -> dict:
    erros: list[str] = []
    _validar(entrada, PARECER_SCHEMA, "parecer", erros)
    # A7(b): o veredito tem de valer para a TAREFA (plano §2.3): `investigar` responde
    # (respondido | inconclusivo) e não aprova nem reprova; `revisar-pr` não "responde".
    if not erros and tarefa in VEREDITOS_POR_TAREFA:
        permitidos = VEREDITOS_POR_TAREFA[tarefa]
        if entrada["veredito"] not in permitidos:  # type: ignore[index]
            erros.append(
                f"parecer.veredito: '{entrada['veredito']}' não vale para a tarefa {tarefa}; "  # type: ignore[index]
                f"use um de {list(permitidos)}"
            )
    if erros:
        raise ParecerInvalido(erros)
    return entrada  # type: ignore[return-value]


# -- evidência conferida (achado A2) --------------------------------------------------------------
# `evidencia.conferida` só é true quando o comando citado É uma chamada real da auditoria: mesma
# ferramenta E mesmos argumentos normalizados. Nada de casar pelo nome da ferramenta nem por
# substring (a regra antiga dava true para "git" e para um comando nunca executado).

_NOME_FERRAMENTA_RE = re.compile(r"^[a-z][a-z_]{1,40}$")
_CHAVE_RE = re.compile(r"^[a-z][a-z_]{0,40}$")

# N1 (reconferência do PR #417): a citação é texto do MODELO, e um `json.loads` de JSON aninhado em
# milhares de níveis levantava `RecursionError` na montagem do parecer — a execução terminava sem
# `parecer.*`. Por isso, ANTES de qualquer parse: teto de tamanho e teto de profundidade, medidos por
# uma varredura linear e sem recursão. Os argumentos de uma ferramenta deste agente são um objeto
# plano cujos valores são escalares ou listas de escalares: profundidade 2. Uma citação mais funda
# não pode ser uma chamada executada, então recusá-la não perde evidência verdadeira.
MAX_CHARS_CITACAO = 8000  # o maior argumento legítimo: 10 caminhos de 400 + campos de 500
MAX_PROFUNDIDADE_CITACAO = 2
MOTIVO_CONFERIDA = "conferida: a ferramenta e os argumentos batem com a chamada executada #{seq}"
MOTIVO_NAO_TEXTO = "não conferida: a citação não é texto"
MOTIVO_LONGA = f"não conferida: citação com mais de {MAX_CHARS_CITACAO} caracteres"
MOTIVO_FUNDA = f"não conferida: citação aninhada além da profundidade {MAX_PROFUNDIDADE_CITACAO}"
MOTIVO_FORMA = "não conferida: a forma não é `<ferramenta> <JSON>` nem `<ferramenta> chave=valor`"
MOTIVO_SEM_CHAMADA = "não conferida: nenhuma chamada executada tem essa ferramenta e esses argumentos"
MOTIVO_ERRO = "não conferida: erro ao conferir ({classe})"


class _CitacaoRecusada(Exception):
    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


def profundidade_excede(texto: str, maximo: int) -> bool:
    """`[`/`{` abertos fora de string JSON passam de `maximo`? Varredura linear, sem parse e sem
    recursão: é o que deixa o `json.loads` seguinte com profundidade limitada."""
    nivel = 0
    em_string = escapado = False
    for c in texto:
        if em_string:
            if escapado:
                escapado = False
            elif c == "\\":
                escapado = True
            elif c == '"':
                em_string = False
        elif c == '"':
            em_string = True
        elif c in "[{":
            nivel += 1
            if nivel > maximo:
                return True
        elif c in "]}":
            nivel -= 1
    return False


def _json_limitado(texto: str) -> object:
    """`json.loads` só de texto curto e raso; senão `_CitacaoRecusada` (sem chegar a parsear)."""
    if len(texto) > MAX_CHARS_CITACAO:
        raise _CitacaoRecusada(MOTIVO_LONGA)
    if profundidade_excede(texto, MAX_PROFUNDIDADE_CITACAO):
        raise _CitacaoRecusada(MOTIVO_FUNDA)
    return json.loads(texto)


def _escalar(valor: object, dentro_de_lista: bool = False) -> object:
    """Escalar no texto canônico: string fica string; número/booleano vira o seu JSON. Para uma
    mesma chave a cerca só aceita um tipo, então '5' citado e 5 executado são a mesma chamada.
    Lista só de escalares (profundidade 2): lista dentro de lista não é argumento de ferramenta."""
    if isinstance(valor, str):
        return valor
    if isinstance(valor, list):
        if dentro_de_lista:
            raise _CitacaoRecusada(MOTIVO_FUNDA)
        return [_escalar(v, True) for v in valor]
    if isinstance(valor, dict):
        raise _CitacaoRecusada(MOTIVO_FUNDA)
    return json.dumps(valor, sort_keys=True, ensure_ascii=False)


def args_canonicos(args: object) -> str | None:
    """Argumentos normalizados: sem os campos que a cerca trata como ausentes (null, false, "" e
    lista vazia) e com chaves ordenadas. `None` se não for um objeto plano (profundidade <= 2)."""
    if not isinstance(args, dict):
        return None
    limpos = {}
    try:
        for chave, valor in args.items():
            if valor is None or valor is False:
                continue
            if isinstance(valor, (str, list)) and len(valor) == 0:
                continue
            limpos[str(chave)] = _escalar(valor)
    except _CitacaoRecusada:
        return None
    return json.dumps(limpos, sort_keys=True, ensure_ascii=False)


def _ler_citacao(comando: object) -> tuple[str, str]:
    """(ferramenta, args canônicos) de `<ferramenta> <JSON>` ou `<ferramenta> chave=valor ...`;
    senão `_CitacaoRecusada` com o motivo. Tamanho e profundidade são conferidos ANTES do parse."""
    if not isinstance(comando, str):
        raise _CitacaoRecusada(MOTIVO_NAO_TEXTO)
    if len(comando) > MAX_CHARS_CITACAO:
        raise _CitacaoRecusada(MOTIVO_LONGA)
    texto = comando.strip()
    if len(texto) >= 2 and texto[0] == "`" and texto[-1] == "`":
        texto = texto.strip("`").strip()
    partes = texto.split(None, 1)
    if not partes or not _NOME_FERRAMENTA_RE.fullmatch(partes[0]):
        raise _CitacaoRecusada(MOTIVO_FORMA)
    nome = partes[0]
    resto = partes[1].strip() if len(partes) > 1 else ""
    if not resto:
        args: object = {}
    elif resto.startswith("{"):
        try:
            args = _json_limitado(resto)
        except ValueError:
            raise _CitacaoRecusada(MOTIVO_FORMA) from None
    else:
        try:
            pares = shlex.split(resto)
        except ValueError:
            raise _CitacaoRecusada(MOTIVO_FORMA) from None
        args = {}
        for par in pares:
            chave, sep, valor = par.partition("=")
            if not sep or not _CHAVE_RE.fullmatch(chave) or chave in args:
                raise _CitacaoRecusada(MOTIVO_FORMA)
            try:
                args[chave] = _json_limitado(valor)
            except ValueError:
                args[chave] = valor
    canonico = args_canonicos(args)
    if canonico is None:
        raise _CitacaoRecusada(MOTIVO_FORMA)
    return nome, canonico


def citacao(comando: object) -> tuple[str, str] | None:
    """Forma pública e que nunca levanta: (ferramenta, args canônicos) ou `None`."""
    try:
        return _ler_citacao(comando)
    except Exception:  # noqa: BLE001 — texto do modelo nunca derruba o script
        return None


def conferir_evidencia_com_motivo(comando: object, eventos_ferramenta: list[dict]) -> tuple[bool, str]:
    """(conferida, motivo). Nunca levanta: qualquer falha vira `False` com o motivo (N1)."""
    try:
        nome, canonico = _ler_citacao(comando)
        for ev in eventos_ferramenta:
            if ev.get("negado") or ev.get("ferramenta") in (None, "entregar_parecer"):
                continue
            if ev.get("ferramenta") == nome and args_canonicos(ev.get("args")) == canonico:
                return True, MOTIVO_CONFERIDA.format(seq=ev.get("seq"))
        return False, MOTIVO_SEM_CHAMADA
    except _CitacaoRecusada as e:
        return False, e.motivo
    except Exception as e:  # noqa: BLE001 — inclusive RecursionError e MemoryError
        return False, MOTIVO_ERRO.format(classe=type(e).__name__)


def conferir_evidencia(comando: object, eventos_ferramenta: list[dict]) -> bool:
    """True só se (ferramenta, argumentos normalizados) citados = os de uma chamada EXECUTADA."""
    return conferir_evidencia_com_motivo(comando, eventos_ferramenta)[0]


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
        evid["conferida"], evid["motivo_conferencia"] = conferir_evidencia_com_motivo(
            evid.get("comando", ""), eventos_ferramenta
        )
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
    # errors="backslashreplace": texto do modelo com surrogate solto não derruba o artefato (N1).
    with open(temporario, "w", encoding="utf-8", newline="\n", errors="backslashreplace") as f:
        f.write(texto)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporario, destino)
    return destino


def gravar_json(parecer: dict, pasta: Path, redator) -> Path:
    conteudo = redator.redigir_objeto(parecer)
    return _escrever(Path(pasta) / "parecer.json", json.dumps(conteudo, sort_keys=True, ensure_ascii=False, indent=2) + "\n")


# -- parecer.md (achado A3) -----------------------------------------------------------------------
# O `.md` é o que o orquestrador lê. Duas regras o tornam impossível de forjar pelo conteúdo do
# modelo: (1) todas as seções geradas pelo script (veredito, execução, conta e cobrança, custo,
# comandos da auditoria) vêm ANTES de qualquer texto do modelo e se marcam "(gerado pelo
# script)"; (2) todo texto vindo do modelo fica dentro de um bloco de código cujo delimitador é
# mais longo que qualquer sequência de crases do próprio texto — logo o texto não fecha o bloco e
# não vira cabeçalho, nem com "```" nem com "``````".

MARCA_SCRIPT = "(gerado pelo script)"
TITULO_CONTEUDO_MODELO = "## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)"
SECOES_DO_SCRIPT = (
    f"## Veredito {MARCA_SCRIPT}",
    f"## Execução {MARCA_SCRIPT}",
    f"## Conta e cobrança {MARCA_SCRIPT}",
    f"## Custo {MARCA_SCRIPT}",
    f"## Comandos executados (da auditoria) {MARCA_SCRIPT}",
)
_CRASES_RE = re.compile(r"`+")


def bloco_de_codigo(texto: object) -> list[str]:
    """Texto dentro de um bloco cercado por mais crases do que a maior sequência que ele contém."""
    corpo = "" if texto is None else str(texto)
    maior = max((len(m) for m in _CRASES_RE.findall(corpo)), default=0)
    delimitador = "`" * max(3, maior + 1)
    return [delimitador, corpo, delimitador]


def _uma_linha(valor: object) -> str:
    """Valor numa linha só (quebras e controles viram espaço): nada de fora vira linha nova."""
    texto = "" if valor is None else str(valor)
    return "".join(" " if unicodedata.category(c) in ("Cc", "Cf", "Zl", "Zp") else c for c in texto)


def _do_enum(valor: object, opcoes) -> str:
    return valor if isinstance(valor, str) and valor in opcoes else "?"


def gravar_md(parecer: dict, pasta: Path, redator) -> Path:
    p = parecer
    r = redator.redigir  # cada texto do modelo é redigido ANTES de medir as crases do bloco
    veredito = _do_enum(p.get("veredito"), VEREDITOS)
    e = p["execucao"]
    linhas = [
        f"# Parecer — {_uma_linha(p['tarefa'])} {_uma_linha(_alvo_curto(p['alvo']))}",
        "",
        f"> As seções marcadas {MARCA_SCRIPT} vêm da auditoria, da conta e do orçamento; o modelo não as escreve.",
        "> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.",
        "",
        SECOES_DO_SCRIPT[0],
        "",
        f"- **Veredito:** {veredito}" + (" (PARCIAL)" if p["parcial"] else ""),
    ]
    if p["parcial"]:
        linhas.append(f"- **Motivo do parcial:** {_uma_linha(p['motivo_parcial'])}")
    m = p["modelo"]
    linhas += [
        f"- **Modelo pedido / respondeu:** {_uma_linha(m.get('pedido'))} / {_uma_linha(m.get('respondeu'))}"
        f" · esforço {_uma_linha(m.get('esforco'))} · nível {_uma_linha(m.get('nivel'))}",
        f"- **Execução de código do commit alvo:** {'PERMITIDA' if e.get('permitir_execucao_alvo') else 'não permitida'}",
    ]
    if p.get("falhas_de_gravacao"):
        linhas.append(f"- **Falhas na montagem/gravação:** {_uma_linha('; '.join(str(x) for x in p['falhas_de_gravacao']))}")
    if p.get("parecer_do_modelo_sem_montagem") is not None:
        linhas.append("- **O parecer do modelo não pôde ser montado; ele está cru no `parecer.json`.**")
    linhas += [
        "",
        SECOES_DO_SCRIPT[1],
        "",
        f"- id: {_uma_linha(e.get('id'))} · início {_uma_linha(e.get('inicio_utc'))} · fim {_uma_linha(e.get('fim_utc'))}",
        f"- worktree: {_uma_linha(e.get('worktree'))} · removido: {e.get('worktree_removido')} · npm ci: {e.get('npm_ci')}",
        f"- agente {_uma_linha(e.get('versao_agente'))} · SDK {_uma_linha(e.get('sdk'))}",
    ]
    if e.get("comando_limpeza"):
        linhas.append(f"- **worktree ficou no disco; para remover:** {_uma_linha(e['comando_limpeza'])}")
    linhas += ["", SECOES_DO_SCRIPT[2], ""]
    for chave in ("origem_chave", "tipo_chave", "cabecalho_workspace_enviado", "base_url", "request_ids", "rate_limit_ultimo", "retry_after_visto"):
        linhas.append(f"- {chave}: {_uma_linha(p['conta'].get(chave))}")
    c = p["custo"]
    tokens = c.get("tokens", {})
    linhas += [
        "",
        SECOES_DO_SCRIPT[3],
        "",
        f"- Turnos: {c.get('turnos')} · chamadas de ferramenta: {c.get('chamadas_ferramenta')} · negadas: {c.get('negadas')}",
        f"- Tokens: entrada {tokens.get('entrada')} · cache escrita {tokens.get('cache_escrita')} · "
        f"cache leitura {tokens.get('cache_leitura')} · saída {tokens.get('saida')} · total {tokens.get('total')}",
        f"- US$ estimado: {c.get('usd_estimado')} (preços por MTok: {c.get('precos_usd_por_mtok')})",
        "",
        SECOES_DO_SCRIPT[4],
        "",
    ]
    # O argv traz campos do modelo (ex.: o padrão de busca) e o nome de uma ferramenta desconhecida
    # vem do modelo: uma linha por comando, dentro de bloco de código.
    comandos = []
    for cmd in p["comandos_executados"]:
        estado = "NEGADO" if cmd.get("negado") else f"código {cmd.get('codigo')}"
        argv = " ".join(str(a) for a in cmd["argv"]) if cmd.get("argv") else "(sem processo)"
        comandos.append(_uma_linha(r(f"#{cmd.get('seq')} {cmd.get('ferramenta')}: {estado} — {argv}")))
    linhas += bloco_de_codigo("\n".join(comandos) if comandos else "(nenhum)")
    linhas += ["", TITULO_CONTEUDO_MODELO, "", "### Resumo", ""]
    linhas += bloco_de_codigo(r(p["resumo"] or "(sem resumo)"))
    linhas += ["", "### Achados", ""]
    if not p["achados"]:
        linhas.append("(nenhum achado)")
    for i, a in enumerate(p["achados"], 1):
        ev = a.get("evidencia", {}) or {}
        linha = a.get("linha")
        linha_txt = str(linha) if isinstance(linha, int) and not isinstance(linha, bool) else "—"
        linhas += [
            "",
            f"#### Achado {i} — gravidade: {_do_enum(a.get('gravidade'), GRAVIDADES)} · "
            f"escopo: {_do_enum(a.get('escopo'), ESCOPOS)} · linha: {linha_txt} · "
            f"evidência conferida na auditoria: {'sim' if ev.get('conferida') is True else 'não'}",
            "",
            f"- Conferência {MARCA_SCRIPT}: {_uma_linha(ev.get('motivo_conferencia'))}",
            "",
        ]
        corpo = (
            f"arquivo: {r(a.get('arquivo'))}\n"
            f"motivo: {r(a.get('motivo'))}\n"
            f"comando citado: {r(ev.get('comando'))}\n"
            f"saída citada:\n{r(ev.get('saida', ''))}"
        )
        linhas += bloco_de_codigo(corpo)
    linhas += ["", "### Limitações", ""]
    limitacoes = "\n".join(f"- {r(t)}" for t in p["limitacoes"]) or "(nenhuma declarada)"
    linhas += bloco_de_codigo(limitacoes)
    texto = "\n".join(str(x) for x in linhas) + "\n"
    return _escrever(Path(pasta) / "parecer.md", redator.redigir(texto))


def _alvo_curto(alvo: dict) -> str:
    if alvo.get("pr") is not None:
        return f"#{alvo['pr']} @ {str(alvo.get('sha', ''))[:12]}"
    return f"@ {str(alvo.get('sha', ''))[:12]}"
