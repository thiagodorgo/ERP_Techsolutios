"""Ambiente dos filhos por allowlist (plano §3.2): nenhum segredo do pai passa."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from agente_claude.cerca import ContextoComandos, Raiz, ambiente_gh, ambiente_limpo
from agente_claude.ferramentas import Ferramentas
from tests.fakes import EXE, ExecutorFalso

CANARIOS = {
    "ERP_AGENTE_ANTHROPIC_KEY": "canario-chave-1",
    "ERP_AGENTE_ANTHROPIC_WORKSPACE": "canario-ws-2",
    "ANTHROPIC_API_KEY": "canario-3",
    "ANTHROPIC_AUTH_TOKEN": "canario-4",
    "DATABASE_URL": "postgresql://u:canario-5@h/db",
    "REDIS_URL": "redis://canario-6",
    "AWS_SECRET_ACCESS_KEY": "canario-7",
    "GH_TOKEN": "canario-8",
    "GITHUB_TOKEN": "canario-9",
    "CLAUDE_CODE_X": "canario-10",
    "FOO_SECRET": "canario-11",
}


class TestAmbienteLimpo(unittest.TestCase):
    def test_ambiente_limpo_nao_vaza_segredo(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "src").mkdir()
            ctx = ContextoComandos(raiz=Raiz(tmp), executaveis=dict(EXE), repo_gh="dono/repo")
            execf = ExecutorFalso()
            with mock.patch.dict(os.environ, CANARIOS):
                f = Ferramentas(ctx, executar_processo=execf)
                f.executar("git_ls_files", {"caminhos": ["src"]})
                f.executar("gh_pr_view", {"numero": "416"})
                f.executar("verificar", {"nome": "diff_check"})
            self.assertEqual(len(execf.chamadas), 3)
            for chamada in execf.chamadas:
                env = chamada["env"]
                nomes = {k.upper() for k in env}
                for nome, valor in CANARIOS.items():
                    self.assertNotIn(nome, nomes)
                    self.assertNotIn(valor, " ".join(env.values()))
                self.assertFalse(any(n.startswith(("ANTHROPIC", "ERP_AGENTE", "CLAUDE_CODE", "AWS_")) for n in nomes))

    def test_ambiente_limpo_tem_persistencia_memory_e_sem_database_url(self):
        origem = {"PATH": "C:\\x", "DATABASE_URL": "postgresql://x", "Path_Extra": "y", "systemroot": "C:\\Windows"}
        env = ambiente_limpo(origem)
        self.assertEqual(env["CORE_SAAS_PERSISTENCE"], "memory")
        self.assertNotIn("DATABASE_URL", env)
        self.assertEqual(env["PATH"], "C:\\x")
        self.assertEqual(env["SYSTEMROOT"], "C:\\Windows")  # nome do Windows é insensível a caixa
        self.assertEqual(env["GIT_TERMINAL_PROMPT"], "0")
        gh = ambiente_gh(origem)
        self.assertEqual(gh["GH_PAGER"], "cat")
        self.assertEqual(gh["GH_PROMPT_DISABLED"], "1")
        self.assertNotIn("DATABASE_URL", gh)


if __name__ == "__main__":
    unittest.main()
