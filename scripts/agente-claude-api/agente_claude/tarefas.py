"""Orquestração das tarefas: conta -> worktree -> auditoria -> laço -> parecer -> remoção.

Códigos de saída (plano §2.2): 0 completo · 2 parcial · 3 recusa prévia ·
4 erro de API · 5 erro interno (inclusive quando o parecer foi produzido mas um artefato
falhou ao ser gravado: `parecer.json.falhas_de_gravacao` e `erro.txt` dizem qual). Em 2, 4
e 5 o parecer, a auditoria e o `resumo.json` SEMPRE existem no disco — a montagem e a
gravação têm rede por etapa (N1 da reconferência); o worktree é removido no `finally`
(a menos de `--manter-worktree` ou de um segundo Ctrl+C durante a limpeza, quando
o parecer diz o comando exato para removê-lo).
"""

from __future__ import annotations

import json
import os
import re
import shutil
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from importlib import metadata
from pathlib import Path

from . import __version__
from . import executor as _executor
from .auditoria import Auditoria
from .cerca import ContextoComandos, ambiente_gh, ambiente_limpo
from .conta import ContaRecusada, Credenciais, carregar_credenciais
from .ferramentas import Ferramentas
from .laco import Laco
from .modelo import MODELO, ErroDeModelo, ModeloAnthropic, ModeloSimulado, fallback_servidor
from .orcamento import Orcamento, Tetos
from .parecer import NIVEL, VERSAO_SCHEMA, gravar_json, gravar_md, montar
from .prompts import mensagem_inicial
from .redacao import Redator
from .worktree import RecusaPrevia, WorktreeDescartavel

PASTA_PACOTE = Path(__file__).resolve().parent.parent
PASTA_SAIDAS = PASTA_PACOTE / "saidas"
_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
_ORIGIN_RE = re.compile(r"github\.com[:/]([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")


@dataclass
class Opcoes:
    esforco: str = "medium"
    max_turnos: int = 30
    max_ferramentas: int = 60
    max_tokens: int = 1_500_000
    max_custo_usd: Decimal = Decimal("6.00")
    max_tokens_resposta: int = 8000
    saida: str | None = None
    worktree_dir: str | None = None
    timeout_comando: float = 120.0
    timeout_verificacao: float = 900.0
    npm_ci: bool = False
    # A1: verificações que executam código do commit alvo (espelho_codex, teste, npm ci) ficam
    # desligadas por padrão; só a flag explícita `--permitir-execucao-do-alvo` as liga.
    permitir_execucao_alvo: bool = False
    manter_worktree: bool = False
    simular: bool = False
    simular_turnos: int = 0
    sha: str | None = None


@dataclass
class Dependencias:
    """Tudo o que toca o mundo, injetável nos testes."""

    executar: object = field(default=_executor.executar)
    environ: object = None
    ler_registro: object = None
    which: object = field(default=shutil.which)
    criar_modelo: object = None
    uso_de_disco: object = field(default=shutil.disk_usage)
    agora: object = None
    cwd: str | None = None

    def __post_init__(self) -> None:
        if self.environ is None:
            self.environ = os.environ
        if self.agora is None:
            self.agora = lambda: datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _carimbo(dt: datetime) -> str:
    return dt.strftime("%Y%m%d-%H%M%SZ")


def versao_sdk() -> str:
    try:
        return f"anthropic {metadata.version('anthropic')}"
    except metadata.PackageNotFoundError:
        return "anthropic (não instalado neste Python)"


def resolver_executaveis(which) -> dict[str, str]:
    exe = {}
    for nome in ("git", "gh", "node", "npm"):
        caminho = which(nome)
        if caminho:
            exe[nome] = os.path.abspath(caminho)
    if "git" not in exe:
        raise RecusaPrevia("git não encontrado no PATH")
    return exe


def _rodar(deps: Dependencias, argv: list[str], cwd: str, env: dict | None = None, timeout: float = 120):
    return deps.executar(argv, cwd=cwd, env=env or ambiente_limpo(), timeout_s=timeout, teto_bytes=256 * 1024)


def repo_raiz(deps: Dependencias, exe: dict) -> str:
    r = _rodar(deps, [exe["git"], "rev-parse", "--show-toplevel"], deps.cwd or os.getcwd())
    if r.codigo != 0 or not r.saida.strip():
        raise RecusaPrevia("o diretório atual não está num repositório git")
    return os.path.normpath(r.saida.strip())


def repo_github(deps: Dependencias, exe: dict, raiz: str) -> str | None:
    r = _rodar(deps, [exe["git"], "remote", "get-url", "origin"], raiz)
    if r.codigo != 0:
        return None
    m = _ORIGIN_RE.search(r.saida.strip())
    return f"{m.group(1)}/{m.group(2)}" if m else None


def _pasta_saida(opcoes: Opcoes, deps: Dependencias, tarefa: str, rotulo: str) -> Path:
    if opcoes.saida:
        pasta = Path(opcoes.saida)
    else:
        pasta = PASTA_SAIDAS / f"{_carimbo(deps.agora())}-{tarefa}-{rotulo}"
    if os.path.lexists(pasta):
        raise RecusaPrevia(f"a pasta de saída já existe: {pasta}")
    return pasta


def _pasta_worktree(opcoes: Opcoes, deps: Dependencias) -> str:
    if opcoes.worktree_dir:
        return os.path.normpath(opcoes.worktree_dir)
    base = deps.environ.get("USERPROFILE") or os.path.expanduser("~")
    return os.path.normpath(os.path.join(base, f"w-ag-{deps.agora().strftime('%Y%m%d-%H%M%S')}"))


def _criar_modelo(deps: Dependencias, credenciais: Credenciais | None, opcoes: Opcoes):
    if deps.criar_modelo is not None:
        return deps.criar_modelo(credenciais, opcoes)
    if opcoes.simular:
        return ModeloSimulado(turnos=opcoes.simular_turnos)
    return ModeloAnthropic(credenciais)


def _gravar_erro(pasta: Path, redator: Redator, texto: str, anexar: bool = False) -> None:
    modo = "a" if anexar else "w"
    with open(pasta / "erro.txt", modo, encoding="utf-8", newline="\n", errors="backslashreplace") as f:
        f.write(redator.redigir(texto))


def executar_tarefa(
    *,
    tarefa: str,
    alvo: dict,
    credenciais: Credenciais,
    opcoes: Opcoes,
    pasta_saida: Path,
    worktree,
    contexto_base: ContextoComandos,
    deps: Dependencias,
    redator: Redator,
) -> tuple[int, dict]:
    pasta_saida.mkdir(parents=True, exist_ok=False)
    inicio_dt = deps.agora()
    t0 = time.monotonic()
    execucao_id = pasta_saida.name
    auditoria = Auditoria(pasta_saida, redator)
    tetos = Tetos(opcoes.max_turnos, opcoes.max_ferramentas, opcoes.max_tokens, opcoes.max_custo_usd)
    orcamento = Orcamento(tetos)
    auditoria.registrar(
        {
            "tipo": "inicio",
            "execucao_id": execucao_id,
            "tarefa": tarefa,
            "alvo": alvo,
            "sha": alvo.get("sha"),
            "worktree": worktree.caminho,
            "orcamento": {
                "turnos": tetos.turnos,
                "ferramentas": tetos.ferramentas,
                "tokens": tetos.tokens,
                "custo_usd": str(tetos.custo_usd),
                "tokens_por_resposta": opcoes.max_tokens_resposta,
            },
            "modelo_pedido": MODELO,
            "esforco": opcoes.esforco,
            "conta": credenciais.resumo(),
            "simulado": opcoes.simular,
            "npm_ci": opcoes.npm_ci,
            "permitir_execucao_alvo": opcoes.permitir_execucao_alvo,
        }
    )
    codigo = 0
    parcial = False
    motivo: str | None = None
    laco: Laco | None = None
    removido = False
    comando_limpeza: str | None = None
    try:
        worktree.criar()
        auditoria.registrar({"tipo": "evento", "nome": "worktree_criado", "detalhe": {"caminho": worktree.caminho, "sha": alvo.get("sha")}})
        for nome, detalhe in worktree.preparar():
            auditoria.registrar({"tipo": "evento", "nome": nome, "detalhe": detalhe})
        contexto = ContextoComandos(
            raiz=worktree.raiz,
            executaveis=contexto_base.executaveis,
            repo_gh=contexto_base.repo_gh,
            npm_ci=opcoes.npm_ci,
            permitir_execucao_alvo=opcoes.permitir_execucao_alvo,
        )
        ferramentas = Ferramentas(
            contexto,
            executar_processo=deps.executar,
            timeout_comando=opcoes.timeout_comando,
            timeout_verificacao=opcoes.timeout_verificacao,
        )
        modelo = _criar_modelo(deps, credenciais, opcoes)
        laco = Laco(
            modelo=modelo,
            ferramentas=ferramentas,
            orcamento=orcamento,
            auditoria=auditoria,
            redator=redator,
            max_tokens_resposta=opcoes.max_tokens_resposta,
            esforco=opcoes.esforco,
            tarefa=tarefa,
        )
        resultado = laco.executar(
            mensagem_inicial(tarefa, alvo, permite_execucao_do_alvo=opcoes.permitir_execucao_alvo)
        )
        parcial = resultado.parcial
        motivo = resultado.motivo_parcial
        codigo = 2 if parcial else 0
    except KeyboardInterrupt:
        auditoria.registrar({"tipo": "evento", "nome": "ctrl_c", "detalhe": "interrompido fora do laço"})
        parcial, motivo, codigo = True, "ctrl_c", 2
    except ErroDeModelo as e:
        auditoria.registrar({"tipo": "evento", "nome": "erro", "detalhe": {"classe": e.classe, "status": e.status, "tipo": e.tipo, "request_id": e.request_id}})
        parcial, motivo, codigo = True, f"erro_api:{e.classe}", 4
        _gravar_erro(pasta_saida, redator, f"{e.classe} status={e.status} tipo={e.tipo} request_id={e.request_id} retry_after={e.retry_after}\n{e.mensagem}\n")
    except Exception as e:  # noqa: BLE001
        auditoria.registrar({"tipo": "evento", "nome": "erro", "detalhe": {"classe": type(e).__name__}})
        parcial, motivo, codigo = True, f"erro_interno:{type(e).__name__}", 5
        _gravar_erro(pasta_saida, redator, traceback.format_exc())
    finally:
        if opcoes.manter_worktree:
            comando_limpeza = worktree.comando_remocao()
        else:
            try:
                removido = worktree.remover()
                if removido:
                    auditoria.registrar({"tipo": "evento", "nome": "worktree_removido", "detalhe": worktree.caminho})
            except KeyboardInterrupt:
                # 2º Ctrl+C: aborta SÓ a limpeza. O parecer (completo ou parcial) não muda; o
                # worktree fica e o parecer/CLI dizem o comando exato para removê-lo.
                comando_limpeza = worktree.comando_remocao()
                auditoria.registrar({"tipo": "evento", "nome": "ctrl_c", "detalhe": "limpeza abortada; worktree ficou"})
            except Exception as e:  # noqa: BLE001
                comando_limpeza = worktree.comando_remocao()
                auditoria.registrar({"tipo": "evento", "nome": "erro", "detalhe": {"remocao": type(e).__name__}})

        r = laco.resultado if laco is not None else None
        fim_dt = deps.agora()
        custo = orcamento.como_dict()
        custo["negadas"] = r.negadas if r else 0
        respondeu = r.modelo_respondeu if r else None
        conta = {
            "origem_chave": credenciais.origem_chave,
            "tipo_chave": credenciais.tipo_chave,
            "cabecalho_workspace_enviado": credenciais.cabecalho_workspace and not opcoes.simular,
            "base_url": credenciais.base_url,
            "request_ids": list(r.request_ids) if r else [],
            "rate_limit_ultimo": dict(r.rate_limit_ultimo) if r else {},
            "retry_after_visto": bool(r.retry_after_visto) if r else False,
        }
        modelo_info = {
            "pedido": MODELO,
            "respondeu": respondeu,
            "esforco": opcoes.esforco,
            "fallback_servidor": fallback_servidor(respondeu),
            "nivel": NIVEL,
        }
        execucao = {
            "id": execucao_id,
            "inicio_utc": _iso(inicio_dt),
            "fim_utc": _iso(fim_dt),
            "worktree": worktree.caminho,
            "worktree_removido": removido,
            "comando_limpeza": comando_limpeza,
            "npm_ci": opcoes.npm_ci,
            "permitir_execucao_alvo": opcoes.permitir_execucao_alvo,
            "pasta_saida": str(pasta_saida),
            "versao_agente": __version__,
            "sdk": versao_sdk(),
            "simulado": opcoes.simular,
        }
        # Montagem e gravação À PROVA DE FALHA (N1 da reconferência): uma execução paga nunca termina
        # sem artefato. Cada etapa tem a sua rede; a falha de uma não impede as outras. Havendo
        # falha, o `parecer.json` diz qual (`falhas_de_gravacao`), o `erro.txt` traz o traceback
        # redigido, o evento `fim` e o `resumo.json` são gravados, e o código de saída vira 5.
        falhas: list[str] = []
        detalhes: list[str] = []

        def _registrar_falha(etapa: str, e: BaseException) -> None:
            falhas.append(f"{etapa}: {type(e).__name__}")
            detalhes.append(f"## {etapa}\n{traceback.format_exc()}")

        dados = {
            "tarefa": tarefa,
            "alvo": alvo,
            "modelo": modelo_info,
            "conta": conta,
            "custo": custo,
            "execucao": execucao,
        }
        eventos = [ev for ev in auditoria.eventos_ferramenta if ev.get("ferramenta") != "entregar_parecer"]
        try:
            parecer = montar(
                parecer_modelo=r.parecer_modelo if r else None,
                eventos_ferramenta=eventos,
                parcial=parcial,
                motivo_parcial=motivo,
                ultimo_texto=r.ultimo_texto if r else None,
                **dados,
            )
        except Exception as e:  # noqa: BLE001
            _registrar_falha("montagem do parecer", e)
            parecer = parecer_de_emergencia(dados, f"falha_na_montagem:{type(e).__name__}", r.parecer_modelo if r else None)
        parecer["falhas_de_gravacao"] = list(falhas)
        json_ok = _gravar_parecer_json(parecer, dados, pasta_saida, redator, _registrar_falha, falhas)
        try:
            gravar_md(parecer, pasta_saida, redator)
        except Exception as e:  # noqa: BLE001
            _registrar_falha("parecer.md", e)
        if falhas:
            if codigo in (0, 2):
                codigo = 5  # o parecer existe, mas um artefato falhou: erro interno (README, "Códigos de saída")
            parecer["falhas_de_gravacao"] = list(falhas)
            if json_ok:  # regrava, agora com a lista completa de falhas (substituição atômica)
                _gravar_parecer_json(parecer, dados, pasta_saida, redator, _registrar_falha, falhas)
            try:
                _gravar_erro(pasta_saida, redator, "falha na gravação do parecer:\n" + "\n".join(detalhes), anexar=True)
            except Exception:  # noqa: BLE001 — sem mais onde gravar; o fim e o resumo ainda tentam
                pass
        fim: dict = {
            "tipo": "fim",
            "parcial": parcial,
            "motivo_parcial": motivo,
            "custo": custo,
            "request_ids": conta["request_ids"],
            "modelo_respondeu": respondeu,
            "duracao_total_ms": int((time.monotonic() - t0) * 1000),
            "codigo_saida": codigo,
            "falhas_de_gravacao": list(falhas),
        }
        try:
            fim = auditoria.registrar(fim)
        except Exception as e:  # noqa: BLE001
            _registrar_falha("evento fim da auditoria", e)
        try:
            auditoria.gravar_resumo(fim)
        except Exception:  # noqa: BLE001
            pass
        finally:
            auditoria.fechar()
    return codigo, parecer


def parecer_de_emergencia(dados: dict, motivo: str, parecer_modelo: dict | None) -> dict:
    """Parecer só com os campos do SCRIPT, montado sem chamar nada que possa falhar. O parecer
    que o modelo entregou (já validado) vai junto, à parte, para não se perder."""
    return {
        "versao_schema": VERSAO_SCHEMA,
        "tarefa": dados["tarefa"],
        "alvo": dados["alvo"],
        "veredito": "inconclusivo",
        "resumo": "",
        "achados": [],
        "limitacoes": [],
        "comandos_declarados_pelo_modelo": [],
        "comandos_executados": [],
        "modelo": dados["modelo"],
        "conta": dados["conta"],
        "custo": dados["custo"],
        "parcial": True,
        "motivo_parcial": motivo,
        "ultimo_texto_do_modelo": None,
        "execucao": dados["execucao"],
        "parecer_do_modelo_sem_montagem": parecer_modelo,
    }


def _gravar_parecer_json(parecer: dict, dados: dict, pasta: Path, redator: Redator, registrar_falha, falhas: list[str]) -> bool:
    """Grava o `parecer.json`; se falhar, grava o de emergência (só campos do script)."""
    try:
        gravar_json(parecer, pasta, redator)
        return True
    except Exception as e:  # noqa: BLE001
        registrar_falha("parecer.json", e)
    try:
        minimo = parecer_de_emergencia(dados, "falha_na_gravacao_do_parecer_json", None)
        minimo["falhas_de_gravacao"] = list(falhas) + ["parecer.json: gravado o de emergência"]
        gravar_json(minimo, pasta, redator)
    except Exception as e:  # noqa: BLE001
        registrar_falha("parecer.json de emergência", e)
    return False


def _preparar_comum(opcoes: Opcoes, deps: Dependencias) -> tuple[Credenciais, Redator, dict, str, str | None]:
    credenciais = carregar_credenciais(deps.environ, deps.ler_registro)  # ANTES de qualquer rede
    redator = Redator([(credenciais.chave, "chave")])
    exe = resolver_executaveis(deps.which)
    raiz = repo_raiz(deps, exe)
    repo = repo_github(deps, exe, raiz)
    return credenciais, redator, exe, raiz, repo


def revisar_pr(numero: str, opcoes: Opcoes, deps: Dependencias) -> tuple[int, dict | None, Path | None]:
    credenciais, redator, exe, raiz, repo = _preparar_comum(opcoes, deps)
    if "gh" not in exe:
        raise RecusaPrevia("gh não encontrado no PATH")
    if not repo:
        raise RecusaPrevia("não foi possível derivar owner/repo do origin")
    pasta_saida = _pasta_saida(opcoes, deps, "revisar-pr", numero)
    worktree = WorktreeDescartavel(
        raiz, "0" * 40, _pasta_worktree(opcoes, deps), exe, deps.executar, deps.uso_de_disco, opcoes.npm_ci,
        permitir_execucao_alvo=opcoes.permitir_execucao_alvo,
    )
    worktree.verificar_previo()
    vista = _rodar(
        deps,
        [exe["gh"], "pr", "view", numero, "-R", repo, "--json", "number,title,state,headRefOid,baseRefName,url"],
        raiz,
        env=ambiente_gh(),
    )
    if vista.codigo != 0:
        raise RecusaPrevia(f"gh pr view {numero} falhou (código {vista.codigo})")
    dados = json.loads(vista.saida)
    head = str(dados.get("headRefOid", ""))
    if not _SHA_RE.fullmatch(head):
        raise RecusaPrevia("headRefOid inválido")
    if opcoes.sha and opcoes.sha != head:
        raise RecusaPrevia("--sha difere do head do PR")
    busca = _rodar(deps, [exe["git"], "fetch", "--no-tags", "origin", f"refs/pull/{numero}/head"], raiz, timeout=300)
    if busca.codigo != 0:
        raise RecusaPrevia(f"git fetch refs/pull/{numero}/head falhou (código {busca.codigo})")
    obtido = _rodar(deps, [exe["git"], "rev-parse", "FETCH_HEAD"], raiz).saida.strip()
    if obtido != head:
        raise RecusaPrevia("FETCH_HEAD difere do headRefOid do PR")
    worktree.sha = head
    alvo = {
        "pr": int(numero),
        "sha": head,
        "base": dados.get("baseRefName"),
        "titulo": dados.get("title"),
        "url": dados.get("url"),
    }
    contexto = ContextoComandos(
        raiz=None, executaveis=exe, repo_gh=repo, npm_ci=opcoes.npm_ci,
        permitir_execucao_alvo=opcoes.permitir_execucao_alvo,
    )
    codigo, parecer = executar_tarefa(
        tarefa="revisar-pr",
        alvo=alvo,
        credenciais=credenciais,
        opcoes=opcoes,
        pasta_saida=pasta_saida,
        worktree=worktree,
        contexto_base=contexto,
        deps=deps,
        redator=redator,
    )
    return codigo, parecer, pasta_saida


def investigar(pergunta: str, opcoes: Opcoes, deps: Dependencias) -> tuple[int, dict | None, Path | None]:
    credenciais, redator, exe, raiz, repo = _preparar_comum(opcoes, deps)
    sha = opcoes.sha
    if sha is None:
        r = _rodar(deps, [exe["git"], "rev-parse", "origin/main"], raiz)
        sha = r.saida.strip()
    if not _SHA_RE.fullmatch(sha or ""):
        raise RecusaPrevia("SHA inválido")
    existe = _rodar(deps, [exe["git"], "cat-file", "-e", f"{sha}^{{commit}}"], raiz)
    if existe.codigo != 0:
        raise RecusaPrevia("o commit não existe localmente")
    pasta_saida = _pasta_saida(opcoes, deps, "investigar", sha[:8])
    worktree = WorktreeDescartavel(
        raiz, sha, _pasta_worktree(opcoes, deps), exe, deps.executar, deps.uso_de_disco, opcoes.npm_ci,
        permitir_execucao_alvo=opcoes.permitir_execucao_alvo,
    )
    worktree.verificar_previo()
    alvo = {"pergunta": pergunta, "sha": sha}
    contexto = ContextoComandos(
        raiz=None, executaveis=exe, repo_gh=repo, npm_ci=opcoes.npm_ci,
        permitir_execucao_alvo=opcoes.permitir_execucao_alvo,
    )
    codigo, parecer = executar_tarefa(
        tarefa="investigar",
        alvo=alvo,
        credenciais=credenciais,
        opcoes=opcoes,
        pasta_saida=pasta_saida,
        worktree=worktree,
        contexto_base=contexto,
        deps=deps,
        redator=redator,
    )
    return codigo, parecer, pasta_saida


SYSTEM_VERIFICACAO = "Verificação de conta do agente ERP (chamada mínima, sem ferramentas)."


def verificar_conta(deps: Dependencias) -> tuple[dict, Redator]:
    """MANUAL, fora da suíte: UMA chamada mínima com max_tokens=0 (plano §4.4)."""
    credenciais = carregar_credenciais(deps.environ, deps.ler_registro)
    redator = Redator([(credenciais.chave, "chave")])
    modelo = ModeloAnthropic(credenciais) if deps.criar_modelo is None else deps.criar_modelo(credenciais, None)
    resp = modelo.contar_minimo(SYSTEM_VERIFICACAO)
    return (
        {
            "request_id": resp.request_id,
            "modelo_respondeu": resp.modelo_respondeu,
            "stop_reason": resp.stop_reason,
            "usage": resp.usage,
            "cabecalhos": resp.cabecalhos,
            "origem_chave": credenciais.origem_chave,
            "tipo_chave": credenciais.tipo_chave,
            "cabecalho_workspace_enviado": credenciais.cabecalho_workspace,
            "ignoradas": credenciais.ignoradas,
        },
        redator,
    )


__all__ = [
    "ContaRecusada",
    "Dependencias",
    "Opcoes",
    "RecusaPrevia",
    "executar_tarefa",
    "investigar",
    "revisar_pr",
    "verificar_conta",
]
