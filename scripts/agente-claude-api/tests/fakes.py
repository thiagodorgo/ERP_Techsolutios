"""Falsos da suíte: modelo, executor, worktree e uma montagem de execução completa.

Nenhum deles fala com a rede nem importa `anthropic`. O `ModeloFalso` NÃO respeita
esquema (de propósito: a validação do script tem de valer sozinha) e pode
"obedecer" a injeções, pedindo o que a cerca deve negar.
"""

from __future__ import annotations

import copy
import itertools
import os
import tempfile
from decimal import Decimal
from pathlib import Path

from agente_claude.cerca import ContextoComandos
from agente_claude.conta import Credenciais
from agente_claude.executor import Execucao
from agente_claude.modelo import Resposta, montar_pedido
from agente_claude.redacao import Redator
from agente_claude.tarefas import Dependencias, Opcoes, executar_tarefa
from agente_claude.cerca import Raiz

# Valores falsos montados por concatenação: nenhum literal que um scanner de
# segredo reconheça entra no repositório (plano §3.4, risco R7).
CHAVE_FALSA = "sk-ant-" + "usr" + "01-" + "Q" * 40
CHAVE_FALSA_2 = "sk-ant-" + "api" + "03-" + "Z" * 40
WORKSPACE_FALSO = "wrkspc_" + "teste01"
EXE = {
    "git": os.path.abspath("C:/falso/git.EXE"),
    "gh": os.path.abspath("C:/falso/gh.EXE"),
    "node": os.path.abspath("C:/falso/node.EXE"),
    "npm": os.path.abspath("C:/falso/npm.CMD"),
}
_ids = itertools.count(1)


def uso(nome: str, entrada: object, ident: str | None = None) -> dict:
    return {"type": "tool_use", "id": ident or f"toolu_{next(_ids):04d}", "name": nome, "input": entrada}


def texto(t: str) -> dict:
    return {"type": "text", "text": t}


def usage(e: int = 10, ce: int = 0, cl: int = 0, s: int = 5) -> dict:
    return {"input_tokens": e, "cache_creation_input_tokens": ce, "cache_read_input_tokens": cl, "output_tokens": s}


def resposta(*blocos, stop: str = "tool_use", u: dict | None = "padrao", modelo: str = "claude-opus-5-5",
             request_id: str | None = None, cabecalhos: dict | None = None, detalhes: dict | None = None) -> Resposta:
    rid = request_id or f"req_falso_{next(_ids):04d}"
    return Resposta(
        content=list(blocos),
        stop_reason=stop,
        stop_details=detalhes,
        usage=usage() if u == "padrao" else u,
        request_id=rid,
        cabecalhos=cabecalhos if cabecalhos is not None else {"request-id": rid},
        modelo_respondeu=modelo,
    )


def parecer_valido(**sobrescrever) -> dict:
    base = {
        "veredito": "aprovado",
        "resumo": "Sem achados bloqueantes.",
        "achados": [],
        "comandos_executados": [],
        "limitacoes": [],
    }
    base.update(sobrescrever)
    return base


def resposta_parecer(**sobrescrever) -> Resposta:
    return resposta(uso("entregar_parecer", parecer_valido(**sobrescrever)))


class ModeloFalso:
    """Devolve respostas de um roteiro. Item = Resposta | Exception | callable(messages, n)."""

    def __init__(self, roteiro=None, padrao=None) -> None:
        self.roteiro = list(roteiro or [])
        self.padrao = padrao
        self.chamadas: list[dict] = []

    def responder(self, *, system, tools, messages, max_tokens, esforco) -> Resposta:
        pedido = montar_pedido(system, tools, messages, max_tokens, esforco)
        self.chamadas.append(copy.deepcopy(pedido))
        n = len(self.chamadas)
        item = self.roteiro[n - 1] if n <= len(self.roteiro) else self.padrao
        if item is None:
            item = resposta(texto("fim sem parecer"), stop="end_turn")
        if callable(item) and not isinstance(item, Resposta):
            item = item(messages, n)
        if isinstance(item, BaseException):
            raise item
        return item


class ExecutorFalso:
    """Registra cada chamada; devolve saída programada. `efeito(argv, self)` roda antes."""

    def __init__(self, saida: str = "ok", codigo: int = 0, efeito=None, por_argv=None) -> None:
        self.saida = saida
        self.codigo = codigo
        self.efeito = efeito
        self.por_argv = por_argv
        self.chamadas: list[dict] = []

    def __call__(self, argv, cwd=None, env=None, timeout_s=None, teto_bytes=None) -> Execucao:
        self.chamadas.append({"argv": list(argv), "cwd": cwd, "env": dict(env or {}), "timeout_s": timeout_s, "teto_bytes": teto_bytes})
        if self.efeito is not None:
            self.efeito(argv, self)
        saida, codigo = self.por_argv(argv) if self.por_argv else (self.saida, self.codigo)
        return Execucao(codigo=codigo, saida=saida, bytes_total=len(saida.encode()), truncado=False, duracao_ms=1, expirou=False)


class WorktreeFalso:
    def __init__(self, caminho: str, falha_remocao: BaseException | None = None) -> None:
        self.caminho = caminho
        self.raiz = None
        self.criado = False
        self.removido = False
        self.falha_remocao = falha_remocao

    def criar(self) -> None:
        self.raiz = Raiz(self.caminho)
        self.criado = True

    def preparar(self):
        return []

    def remover(self) -> bool:
        if self.falha_remocao is not None:
            raise self.falha_remocao
        self.removido = True
        return True

    def comando_remocao(self) -> str:
        return f'git worktree remove --force "{self.caminho}"'


def credenciais(chave: str = CHAVE_FALSA, workspace: str | None = WORKSPACE_FALSO) -> Credenciais:
    tipo = "usuario" if chave.startswith("sk-ant-usr") else "workspace_ou_api"
    return Credenciais(chave=chave, workspace_id=workspace, origem_chave="processo", tipo_chave=tipo)


class Cenario:
    """Uma execução completa (`executar_tarefa`) com falsos, em pastas temporárias."""

    def __init__(self, modelo, executor=None, opcoes: Opcoes | None = None, worktree=None, cred=None,
                 npm_ci: bool = False, arquivos: dict | None = None) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name)
        self.raiz = base / "wt"
        self.raiz.mkdir()
        for rel, conteudo in (arquivos or {}).items():
            destino = self.raiz / rel
            destino.parent.mkdir(parents=True, exist_ok=True)
            if isinstance(conteudo, bytes):
                destino.write_bytes(conteudo)
            else:
                destino.write_text(conteudo, encoding="utf-8")
        self.pasta = base / "saida"
        self.modelo = modelo
        self.executor = executor or ExecutorFalso()
        self.opcoes = opcoes or Opcoes(max_turnos=10, max_ferramentas=20, max_custo_usd=Decimal("5"), npm_ci=npm_ci)
        self.worktree = worktree or WorktreeFalso(str(self.raiz))
        self.cred = cred or credenciais()
        self.redator = Redator([(self.cred.chave, "chave")])
        self.codigo = None
        self.parecer = None

    def rodar(self, tarefa: str = "revisar-pr", alvo: dict | None = None):
        deps = Dependencias(executar=self.executor, environ={}, criar_modelo=lambda c, o: self.modelo)
        ctx = ContextoComandos(raiz=None, executaveis=dict(EXE), repo_gh="dono/repo", npm_ci=self.opcoes.npm_ci)
        self.codigo, self.parecer = executar_tarefa(
            tarefa=tarefa,
            alvo=alvo or {"pr": 416, "sha": "a" * 40, "base": "main", "titulo": "t", "url": "u"},
            credenciais=self.cred,
            opcoes=self.opcoes,
            pasta_saida=self.pasta,
            worktree=self.worktree,
            contexto_base=ctx,
            deps=deps,
            redator=self.redator,
        )
        return self

    def linhas_auditoria(self) -> list[dict]:
        import json

        texto = (self.pasta / "auditoria.jsonl").read_text(encoding="utf-8")
        return [json.loads(linha) for linha in texto.splitlines() if linha.strip()]

    def texto_saida(self) -> str:
        partes = []
        for nome in ("auditoria.jsonl", "parecer.json", "parecer.md", "resumo.json", "erro.txt"):
            p = self.pasta / nome
            if p.exists():
                partes.append(p.read_text(encoding="utf-8"))
        return "\n".join(partes)

    def limpar(self) -> None:
        self._tmp.cleanup()


GB = 1024**3


class ExecutorRepoFalso(ExecutorFalso):
    """Simula git/gh para a CLI ponta a ponta: cria e apaga o diretório do worktree."""

    def __init__(self, base: Path, head: str = "b" * 40, titulo: str = "PR de teste") -> None:
        self.base = Path(base)
        self.repo = self.base / "repo"
        self.repo.mkdir(parents=True, exist_ok=True)
        self.head = head
        self.titulo = titulo
        self.registrados = [str(self.repo)]
        super().__init__(por_argv=self._responder)

    def _responder(self, argv):
        import json
        import shutil as _sh

        a = list(argv[1:])
        if a[:2] == ["rev-parse", "--show-toplevel"]:
            return str(self.repo) + "\n", 0
        if a[:3] == ["remote", "get-url", "origin"]:
            return "https://github.com/dono/repo.git\n", 0
        if a[:3] == ["worktree", "list", "--porcelain"]:
            return "".join(f"worktree {w}\nHEAD {self.head}\n\n" for w in self.registrados), 0
        if a[:2] == ["pr", "view"]:
            dados = {"number": int(a[2]), "title": self.titulo, "state": "OPEN", "headRefOid": self.head,
                     "baseRefName": "main", "url": f"https://github.com/dono/repo/pull/{a[2]}"}
            return json.dumps(dados), 0
        if a[:1] == ["fetch"]:
            return "", 0
        if a[:2] == ["rev-parse", "FETCH_HEAD"] or a[:2] == ["rev-parse", "origin/main"]:
            return self.head + "\n", 0
        if a[:2] == ["cat-file", "-e"]:
            return "", 0
        if a[:3] == ["worktree", "add", "--detach"]:
            os.makedirs(a[3])
            Path(a[3], "README.md").write_text("# repo\n", encoding="utf-8")
            self.registrados.append(a[3])
            return "", 0
        if a[:3] == ["worktree", "remove", "--force"]:
            _sh.rmtree(a[3])
            self.registrados = [w for w in self.registrados if w != a[3]]
            return "", 0
        if a[:2] == ["worktree", "prune"]:
            return "", 0
        return "ok", 0


class _Disco:
    def __init__(self, livre: int) -> None:
        self.free = livre


def deps_repo_falso(executor: ExecutorRepoFalso, environ: dict, modelo=None, livre: int = 100 * GB) -> Dependencias:
    construidos = []

    def criar_modelo(cred, opcoes):
        construidos.append(cred)
        return modelo

    environ = dict(environ)
    environ.setdefault("USERPROFILE", str(executor.base))  # worktree padrão nasce no temporário
    deps = Dependencias(
        executar=executor,
        environ=environ,
        ler_registro=lambda nome: None,
        which=lambda nome: EXE.get(nome),
        criar_modelo=criar_modelo,
        uso_de_disco=lambda caminho: _Disco(livre),
        cwd=str(executor.repo),
    )
    deps.modelos_construidos = construidos
    return deps
