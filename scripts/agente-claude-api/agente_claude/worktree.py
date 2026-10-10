"""Worktree descartável: criado pelo script no SHA alvo, removido por ele no fim.

Regras (brief "autonomia nível 1"; plano §1 passo 2 e §2.1):
- `git worktree add --detach <pasta> <sha>`; nunca o checkout principal, nunca um
  worktree existente; a pasta não pode existir, nem estar dentro do repositório ou
  de qualquer worktree listado; caminho ≤ 60 caracteres (no Windows, caminho longo
  faz o `worktree add` falhar SEM criar o diretório);
- espaço livre mínimo: 2 GB, ou 3 GB com `--npm-ci` (`npm ci` ≈ 446 MB, F8);
- `npm ci` PRÓPRIO, sem junction de `node_modules` (lição de 26/08 no contrato);
- remoção SÓ por `git worktree remove --force` + `git worktree prune`, e só do
  caminho que este objeto criou.
"""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path, PureWindowsPath

from . import executor as _executor
from .cerca import Raiz, ambiente_limpo

MAX_CHARS_PASTA = 60
GB = 1024**3
LIVRE_MINIMO = 2 * GB
LIVRE_MINIMO_NPM = 3 * GB
TIMEOUT_GIT = 300
TIMEOUT_NPM_CI = 1200
# [H3]/[H3b] decididos no B9 (B-AGENTE-API-dev.md): `npm run check` num worktree novo precisa do
# client do Prisma gerado, e `prisma generate` exige DATABASE_URL (prisma.config.ts) — proibido no
# ambiente limpo. Logo NÃO há passo de generate: `npm_check` saiu da lista fechada
# (P-AGENTE-CHECK-SEM-GENERATE) e `node --test` de teste sem -db roda sem ele ([H3c]).


class RecusaPrevia(Exception):
    """Recusa antes de criar qualquer coisa (código de saída 3)."""


def _dentro(filho: str, pai: str) -> bool:
    f = PureWindowsPath(os.path.normcase(os.path.realpath(filho)))
    p = PureWindowsPath(os.path.normcase(os.path.realpath(pai)))
    return f == p or f.is_relative_to(p)


def listar_worktrees(saida_porcelain: str) -> list[str]:
    return [linha[len("worktree ") :].strip() for linha in saida_porcelain.splitlines() if linha.startswith("worktree ")]


@dataclass
class WorktreeDescartavel:
    repo_raiz: str
    sha: str
    pasta: str
    executaveis: dict[str, str]
    executar: object = field(default=_executor.executar)
    uso_de_disco: object = field(default=shutil.disk_usage)
    npm_ci: bool = False

    def __post_init__(self) -> None:
        self.raiz: Raiz | None = None
        self.criado = False

    @property
    def caminho(self) -> str:
        return self.pasta

    def _git(self, *args: str, timeout: float = TIMEOUT_GIT, cwd: str | None = None):
        argv = [self.executaveis["git"], *args]
        return self.executar(argv, cwd=cwd or self.repo_raiz, env=ambiente_limpo(), timeout_s=timeout, teto_bytes=64 * 1024)

    def verificar_previo(self) -> None:
        if len(self.pasta) > MAX_CHARS_PASTA:
            raise RecusaPrevia(f"caminho do worktree com mais de {MAX_CHARS_PASTA} caracteres: {self.pasta}")
        if os.path.lexists(self.pasta):
            raise RecusaPrevia(f"o caminho do worktree já existe: {self.pasta}")
        if _dentro(self.pasta, self.repo_raiz):
            raise RecusaPrevia("o worktree não pode ficar dentro do repositório")
        lista = self._git("worktree", "list", "--porcelain")
        if lista.codigo != 0:
            raise RecusaPrevia("git worktree list falhou")
        for existente in listar_worktrees(lista.saida):
            if _dentro(self.pasta, existente):
                raise RecusaPrevia(f"o worktree não pode ficar dentro de outro worktree ({existente})")
        livre = self.uso_de_disco(os.path.dirname(os.path.abspath(self.pasta)) or ".").free
        minimo = LIVRE_MINIMO_NPM if self.npm_ci else LIVRE_MINIMO
        if livre < minimo:
            raise RecusaPrevia(f"disco insuficiente: {livre // GB} GB livres, mínimo {minimo // GB} GB")

    def criar(self) -> None:
        r = self._git("worktree", "add", "--detach", self.pasta, self.sha)
        if r.codigo != 0 or not os.path.isdir(self.pasta):
            raise RuntimeError(f"git worktree add falhou (código {r.codigo})")
        self.criado = True
        self.raiz = Raiz(self.pasta)

    def preparar(self) -> list[tuple[str, dict]]:
        """`npm ci` próprio, só com `--npm-ci`. Devolve eventos para a auditoria."""
        eventos: list[tuple[str, dict]] = []
        if not self.npm_ci:
            return eventos
        r = self.executar(
            [self.executaveis["npm"], "ci"],
            cwd=self.pasta,
            env=ambiente_limpo(),
            timeout_s=TIMEOUT_NPM_CI,
            teto_bytes=32 * 1024,
        )
        eventos.append(("npm_ci", {"codigo": r.codigo, "expirou": r.expirou, "duracao_ms": r.duracao_ms}))
        if r.codigo != 0:
            raise RuntimeError(f"npm ci falhou (código {r.codigo})")
        return eventos

    def comando_remocao(self) -> str:
        return f'git -C "{self.repo_raiz}" worktree remove --force "{self.pasta}"'

    def remover(self) -> bool:
        if not self.criado:
            return False
        lista = self._git("worktree", "list", "--porcelain")
        alvo = os.path.normcase(os.path.realpath(self.pasta))
        registrados = {os.path.normcase(os.path.realpath(w)) for w in listar_worktrees(lista.saida)}
        if alvo not in registrados:
            raise RuntimeError("o worktree não está registrado; nada foi removido")
        r = self._git("worktree", "remove", "--force", self.pasta, timeout=600)
        if r.codigo != 0:
            raise RuntimeError(f"git worktree remove falhou (código {r.codigo})")
        self._git("worktree", "prune")
        self.criado = False
        return True
