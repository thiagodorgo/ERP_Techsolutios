"""Validação e publicação confinada de entregas Markdown."""

from __future__ import annotations

import json
import os
from pathlib import Path
from pathlib import PurePosixPath

TIPOS = ("registro", "ata", "corpo-pr", "hipoteses-mandato", "corpo-cadeira", "rascunho-plano")
FALHA_FECHADA = frozenset(("registro", "ata", "corpo-cadeira"))
MAX_TEXTO = 256 * 1024
FONTES = frozenset(("ler_arquivo", "git_show", "git_diff", "buscar", "gh_pr_view", "gh_pr_diff", "gh_pr_checks"))
LINHAS_PADRAO = 400


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


def _caminho_normalizado(valor: object) -> str | None:
    if not isinstance(valor, str) or not valor.strip():
        return None
    texto = valor.strip().replace("\\", "/")
    while texto.startswith("./"):
        texto = texto[2:]
    caminho = PurePosixPath(texto)
    if ":" in texto or caminho.is_absolute() or not caminho.parts or any(p in ("", ".", "..") for p in caminho.parts):
        return None
    return caminho.as_posix()


def _argumentos(evento: dict) -> dict:
    # `args` é a forma persistida; `entrada` mantém compatibilidade com fixtures anteriores.
    valor = evento.get("args", evento.get("entrada", {}))
    return valor if isinstance(valor, dict) else {}


def _evento_executado(evento: dict) -> bool:
    return (
        evento.get("ferramenta") in FONTES
        and not evento.get("negado")
        and not evento.get("erro")
        and not evento.get("expirou")
        and not evento.get("interrompido")
        and evento.get("codigo_saida", evento.get("codigo", 0)) in (0, None)
    )


def _fonte_coberta(fonte: dict, evento: dict) -> bool:
    arquivo = _caminho_normalizado(fonte.get("arquivo"))
    inicio, fim = fonte.get("linha_inicial"), fonte.get("linha_final")
    if arquivo is None or type(inicio) is not int or type(fim) is not int or inicio < 1 or fim < inicio:
        return False
    nome, args = evento.get("ferramenta"), _argumentos(evento)
    if nome == "ler_arquivo":
        lido = _caminho_normalizado(args.get("caminho"))
        if lido != arquivo:
            return False
        linhas_resultado = evento.get("linhas_resultado")
        if isinstance(linhas_resultado, list) and linhas_resultado:
            linhas = {n for n in linhas_resultado if type(n) is int and inicio <= n <= fim}
            return len(linhas) == fim - inicio + 1
        primeira = args.get("linha_inicial", 1)
        max_linhas = args.get("max_linhas", LINHAS_PADRAO)
        if type(primeira) is not int or type(max_linhas) is not int:
            return False
        max_linhas = min(max_linhas, 2000)
        # Auditorias antigas não trazem as linhas devolvidas. Mesmo nelas nunca se atribui à
        # leitura mais que o intervalo solicitado, tenha ela alcançado o EOF ou truncado.
        ultima = primeira + max_linhas - 1
        return inicio >= primeira and fim <= ultima
    if nome == "buscar":
        retornados = evento.get("fontes_resultado")
        if not isinstance(retornados, list):
            return False
        linhas = {
            item.get("linha")
            for item in retornados
            if isinstance(item, dict) and _caminho_normalizado(item.get("arquivo")) == arquivo
            and type(item.get("linha")) is int
        }
        # Escopo da busca não basta. Cada linha declarada precisa ter sido devolvida pelo
        # `git grep -n`; só o caminho, ou um match fora do intervalo, continua fail-closed.
        linhas_no_intervalo = {n for n in linhas if inicio <= n <= fim}
        return len(linhas_no_intervalo) == fim - inicio + 1
    if nome == "git_show":
        objeto = args.get("objeto")
        if not isinstance(objeto, str) or ":" not in objeto:
            return False
        return _caminho_normalizado(objeto.split(":", 1)[1]) == arquivo
    return False


def _fonte_coberta_por_leituras(fonte: dict, eventos: list[dict]) -> bool:
    """Une trechos contíguos do mesmo arquivo (a execução 4 leu 150–194 + 195–234)."""
    arquivo = _caminho_normalizado(fonte.get("arquivo"))
    inicio, fim = fonte.get("linha_inicial"), fonte.get("linha_final")
    if arquivo is None or type(inicio) is not int or type(fim) is not int or inicio < 1 or fim < inicio:
        return False
    intervalos: list[tuple[int, int]] = []
    for evento in eventos:
        if evento.get("ferramenta") != "ler_arquivo":
            continue
        args = _argumentos(evento)
        if _caminho_normalizado(args.get("caminho")) != arquivo:
            continue
        primeira = args.get("linha_inicial", 1)
        max_linhas = args.get("max_linhas", LINHAS_PADRAO)
        if type(primeira) is not int or type(max_linhas) is not int:
            continue
        linhas_resultado = evento.get("linhas_resultado")
        if isinstance(linhas_resultado, list) and linhas_resultado:
            validas = sorted({n for n in linhas_resultado if type(n) is int and n >= 1})
            if not validas:
                continue
            bloco_inicio = bloco_fim = validas[0]
            for numero in validas[1:]:
                if numero == bloco_fim + 1:
                    bloco_fim = numero
                else:
                    intervalos.append((bloco_inicio, bloco_fim))
                    bloco_inicio = bloco_fim = numero
            intervalos.append((bloco_inicio, bloco_fim))
        else:
            intervalos.append((primeira, primeira + min(max_linhas, 2000) - 1))
    cursor = inicio
    for primeira, ultima in sorted(intervalos):
        if primeira > cursor:
            break
        if ultima >= cursor:
            cursor = ultima + 1
        if cursor > fim:
            return True
    return False


def conferir_fontes(fontes: list[dict], eventos: list[dict]) -> list[dict]:
    executadas = [e for e in eventos if _evento_executado(e)]
    saida = []
    for fonte in fontes:
        item = dict(fonte)
        confere = _fonte_coberta_por_leituras(item, executadas) or any(
            _fonte_coberta(item, evento) for evento in executadas
        )
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
