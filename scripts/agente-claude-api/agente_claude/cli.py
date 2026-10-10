"""Linha de comando do agente (plano §2.2).

    python -m agente_claude revisar-pr <N> [opções]
    python -m agente_claude investigar "<pergunta>" [--sha <40 hex>] [opções]
    python -m agente_claude verificar-conta      # MANUAL: 1 chamada mínima à API
    python -m agente_claude versao

A CLI nunca aceita modelo, base_url, chave por argumento nem caminho de repositório
(o repositório é o `git rev-parse --show-toplevel` do diretório atual). Tudo o que
ela imprime passa pelo redator; exceção vira `erro.txt` redigido, nunca traceback cru.
"""

from __future__ import annotations

import argparse
import re
import sys
from decimal import Decimal, InvalidOperation

from . import __version__
from .conta import ContaRecusada
from .modelo import ErroDeModelo
from .redacao import Redator
from .tarefas import Dependencias, Opcoes, investigar, revisar_pr, verificar_conta, versao_sdk
from .worktree import RecusaPrevia

SAIDA_COMPLETO, SAIDA_PARCIAL, SAIDA_RECUSA, SAIDA_API, SAIDA_INTERNO = 0, 2, 3, 4, 5
_NUMERO_RE = re.compile(r"^[1-9][0-9]{0,6}$")
_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


class ArgumentoInvalido(Exception):
    pass


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):  # argparse sairia com 2 (= "parcial" no nosso contrato)
        raise ArgumentoInvalido(message)


def _inteiro_entre(minimo: int, maximo: int):
    def conv(texto: str) -> int:
        try:
            valor = int(texto)
        except ValueError:
            raise argparse.ArgumentTypeError(f"inteiro esperado: {texto!r}")
        if not minimo <= valor <= maximo:
            raise argparse.ArgumentTypeError(f"fora de {minimo}..{maximo}: {valor}")
        return valor

    return conv


def _decimal_positivo(texto: str) -> Decimal:
    try:
        valor = Decimal(texto)
    except InvalidOperation:
        raise argparse.ArgumentTypeError(f"decimal esperado: {texto!r}")
    if not valor.is_finite() or valor <= 0:
        raise argparse.ArgumentTypeError("tem de ser > 0")
    return valor


def _sha(texto: str) -> str:
    if not _SHA_RE.fullmatch(texto):
        raise argparse.ArgumentTypeError("SHA de 40 hex minúsculos")
    return texto


def _numero_pr(texto: str) -> str:
    if not _NUMERO_RE.fullmatch(texto):
        raise argparse.ArgumentTypeError("número de PR: só dígitos, sem zero à esquerda")
    return texto


def _comuns(p: argparse.ArgumentParser) -> None:
    p.add_argument("--sha", type=_sha, default=None)
    p.add_argument("--npm-ci", action="store_true", help="npm ci próprio no worktree (≈ 488 MB enquanto dura)")
    p.add_argument("--esforco", choices=("low", "medium", "high"), default="medium")
    p.add_argument("--max-turnos", type=_inteiro_entre(1, 200), default=30)
    p.add_argument("--max-ferramentas", type=_inteiro_entre(1, 500), default=60)
    p.add_argument("--max-tokens", type=_inteiro_entre(1000, 100_000_000), default=1_500_000)
    p.add_argument("--max-custo-usd", type=_decimal_positivo, default=Decimal("6.00"))
    p.add_argument("--max-tokens-resposta", type=_inteiro_entre(256, 32000), default=8000)
    p.add_argument("--saida", default=None)
    p.add_argument("--worktree-dir", default=None)
    p.add_argument("--timeout-comando", type=_inteiro_entre(1, 3600), default=120)
    p.add_argument("--timeout-verificacao", type=_inteiro_entre(1, 7200), default=900)
    p.add_argument("--manter-worktree", action="store_true")
    p.add_argument("--simular", action="store_true", help="modelo falso embutido: sem rede à API")
    p.add_argument("--simular-turnos", type=_inteiro_entre(0, 50), default=0, help="(teste) turnos de ferramenta antes do parecer simulado")


def construir_parser() -> argparse.ArgumentParser:
    p = _Parser(prog="python -m agente_claude", description="Agente de revisão/investigação só-leitura sobre a API do Claude.")
    sub = p.add_subparsers(dest="comando", required=True, parser_class=_Parser)
    r = sub.add_parser("revisar-pr", help="revisa um PR e entrega um parecer")
    r.add_argument("numero", type=_numero_pr)
    _comuns(r)
    i = sub.add_parser("investigar", help="investiga uma pergunta só lendo")
    i.add_argument("pergunta")
    _comuns(i)
    sub.add_parser("verificar-conta", help="MANUAL: 1 chamada mínima para provar a conta")
    sub.add_parser("versao", help="versão do agente e do SDK")
    return p


def _opcoes(args) -> Opcoes:
    if args.simular_turnos and not args.simular:
        raise ArgumentoInvalido("--simular-turnos só vale com --simular")
    return Opcoes(
        esforco=args.esforco,
        max_turnos=args.max_turnos,
        max_ferramentas=args.max_ferramentas,
        max_tokens=args.max_tokens,
        max_custo_usd=args.max_custo_usd,
        max_tokens_resposta=args.max_tokens_resposta,
        saida=args.saida,
        worktree_dir=args.worktree_dir,
        timeout_comando=float(args.timeout_comando),
        timeout_verificacao=float(args.timeout_verificacao),
        npm_ci=args.npm_ci,
        manter_worktree=args.manter_worktree,
        simular=args.simular,
        simular_turnos=args.simular_turnos,
        sha=args.sha,
    )


def _imprimir(texto: str, redator: Redator, erro: bool = False) -> None:
    fluxo = sys.stderr if erro else sys.stdout
    print(redator.redigir(texto), file=fluxo)


def _saida_utf8() -> None:
    # Num pipe do Windows a codificação padrão é cp1252: um '≈' na ajuda derrubaria a CLI.
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def main(argv: list[str] | None = None, deps: Dependencias | None = None) -> int:
    _saida_utf8()
    deps = deps or Dependencias()
    redator = Redator()
    try:
        try:
            args = construir_parser().parse_args(argv)
            if args.comando in ("revisar-pr", "investigar"):
                opcoes = _opcoes(args)
        except ArgumentoInvalido as e:
            _imprimir(f"argumento inválido: {e}", redator, erro=True)
            return SAIDA_RECUSA
        if args.comando == "versao":
            _imprimir(f"agente_claude {__version__} · {versao_sdk()}", redator)
            return SAIDA_COMPLETO
        if args.comando == "verificar-conta":
            dados, redator = verificar_conta(deps)
            for chave, valor in dados.items():
                _imprimir(f"{chave}: {valor}", redator)
            return SAIDA_COMPLETO
        if args.comando == "revisar-pr":
            codigo, parecer, pasta = revisar_pr(args.numero, opcoes, deps)
        else:
            codigo, parecer, pasta = investigar(args.pergunta, opcoes, deps)
        if parecer is not None:
            estado = "PARCIAL (" + str(parecer.get("motivo_parcial")) + ")" if parecer.get("parcial") else "completo"
            _imprimir(f"parecer {estado}: veredito={parecer.get('veredito')} · custo US$ {parecer['custo'].get('usd_estimado')}", redator)
            _imprimir(f"pasta: {pasta}", redator)
            limpeza = parecer.get("execucao", {}).get("comando_limpeza")
            if limpeza:
                _imprimir(f"o worktree ficou no disco; para remover: {limpeza}", redator, erro=True)
        return codigo
    except (ContaRecusada, RecusaPrevia) as e:
        _imprimir(f"recusado antes de começar: {e}", redator, erro=True)
        return SAIDA_RECUSA
    except ErroDeModelo as e:
        _imprimir(f"erro de API: {e.classe} status={e.status} request_id={e.request_id}", redator, erro=True)
        return SAIDA_API
    except KeyboardInterrupt:
        _imprimir("interrompido (Ctrl+C) antes de a execução começar; nada foi criado.", redator, erro=True)
        return SAIDA_PARCIAL
    except Exception as e:  # noqa: BLE001
        _imprimir(f"erro interno: {type(e).__name__}", redator, erro=True)
        return SAIDA_INTERNO
