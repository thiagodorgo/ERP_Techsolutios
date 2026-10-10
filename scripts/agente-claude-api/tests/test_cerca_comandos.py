"""Cerca 2 — comandos por allowlist, `shell=False`, flags por subcomando (plano §3.2)."""

import io
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from agente_claude import executor
from agente_claude.cerca import CercaNegada, ContextoComandos, Raiz, ambiente_limpo, validar_argv
from agente_claude.ferramentas import Ferramentas
from agente_claude.worktree import WorktreeDescartavel
from tests.fakes import EXE, Cenario, ExecutorFalso, ModeloFalso, resposta, resposta_parecer, uso


class BaseComandos(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self._tmp.name) / "wt"
        (self.raiz / "src").mkdir(parents=True)
        (self.raiz / "tests").mkdir()
        (self.raiz / "src" / "app.ts").write_text("x\n", encoding="utf-8")
        for nome in ("auth-jwt.test.ts", "auth-identity-links-db.test.ts", "permission-catalog-db-parity.test.ts"):
            (self.raiz / "tests" / nome).write_text("//\n", encoding="utf-8")
        # Contexto com a execução do alvo LIGADA, para exercitar as regras de `teste` que vêm depois
        # do portão do A1. O portão em si (desligado por padrão) tem a classe TestExecucaoDoAlvo.
        self.ctx = ContextoComandos(
            raiz=Raiz(self.raiz), executaveis=dict(EXE), repo_gh="dono/repo", npm_ci=True, permitir_execucao_alvo=True
        )

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def argv(self, ferramenta, campos, ctx=None):
        return validar_argv(ferramenta, campos, ctx or self.ctx)

    def negado(self, ferramenta, campos, ctx=None) -> str:
        with self.assertRaises(CercaNegada, msg=repr(campos)) as c:
            validar_argv(ferramenta, campos, ctx or self.ctx)
        return c.exception.motivo


class TestBuscar(BaseComandos):
    def test_buscar_padrao_com_hifen_vai_depois_de_e(self):
        for padrao in ("-O vim", "--no-index", "--open-files-in-pager=x", "-e"):
            argv = self.argv("buscar", {"padrao": padrao, "caminhos": ["src"]})
            i = argv.index("-e")
            self.assertEqual(argv[i + 1], padrao)
            self.assertEqual(argv[i + 2], "--")
            self.assertEqual(argv.count(padrao), 1 if padrao != "-e" else 2)

    def test_buscar_metacaractere_vira_argumento_literal(self):
        padrao = "a|b; rm -rf / && $(x) `y` %PATH% ^& >saida <entrada"
        argv = self.argv("buscar", {"padrao": padrao})
        self.assertIn(padrao, argv)
        self.assertEqual(sum(1 for a in argv if "rm" in a), 1)
        self.assertNotIn(">saida", argv)

    def test_buscar_caminho_com_aspas_e_metacaractere_negado(self):
        for caminho in ('src/"a.ts', "a;b", "$(x)", "a|b", "%PATH%", "a&b", "`x`", "a>b"):
            self.assertIn("metacaractere", self.negado("buscar", {"padrao": "x", "caminhos": [caminho]}), caminho)


class TestGit(BaseComandos):
    def test_git_log_output_negado(self):
        self.negado("git_log", {"formato": "--output=x"})
        self.assertIn("campo desconhecido", self.negado("git_log", {"output": "x"}))

    def test_git_log_rev_com_hifen_negado(self):
        for rev in ("--exec-path=.", "-p", "--output=C:/x", "-c", "--git-dir=x"):
            self.negado("git_log", {"rev": rev})

    def test_git_log_rev_faixa_valida(self):
        for rev in ("origin/main..HEAD", "origin/main...HEAD", "HEAD~3", "a6606e41", "v1.2^"):
            argv = self.argv("git_log", {"rev": rev, "max_entradas": 5, "formato": "oneline"})
            self.assertEqual(argv[argv.index("--") - 1], rev)
            self.assertIn("--oneline", argv)
        argv = self.argv("git_log", {"busca_texto": "--output=x"})
        self.assertIn("-S--output=x", argv)  # forma colada: é texto do pickaxe, não flag

    def test_git_diff_no_index_nao_tem_campo(self):
        self.assertIn("campo desconhecido", self.negado("git_diff", {"no_index": True}))
        self.negado("git_diff", {"formato": "--no-index"})
        self.negado("git_diff", {"revs": ["--no-index"]})
        argv = self.argv("git_diff", {"formato": "check", "revs": ["origin/main...HEAD"], "caminhos": ["src"]})
        self.assertNotIn("--no-index", argv)
        self.assertEqual(argv[-3:], ["origin/main...HEAD", "--", "src"])

    def test_git_show_objeto_com_pontopontos_negado(self):
        for objeto in ("HEAD:../x", "HEAD:src/../../x", "HEAD:..\\x", "--output=x", "HEAD:/etc/passwd"):
            self.negado("git_show", {"objeto": objeto})
        self.assertEqual(self.argv("git_show", {"objeto": "HEAD:src/app.ts"})[-2:], ["HEAD:src/app.ts", "--"])

    def test_git_show_objeto_e_sempre_revisao(self):
        # A5: `--` depois do objeto. Sem ele, `git show cfg/.env` caía no DWIM do git como CAMINHO.
        for objeto in ("cfg/.env", "HEAD", "origin/main", "HEAD:src/app.ts"):
            argv = self.argv("git_show", {"objeto": objeto, "formato": "stat"})
            self.assertEqual(argv[-2:], [objeto, "--"], objeto)
            self.assertEqual(argv.count("--"), 1, objeto)

    def test_comandos_com_caminho_usam_pathspec_literal(self):
        # A5: o git usa o caminho LITERAL que a cerca validou (glob não expande depois da cerca).
        for ferramenta, campos in (
            ("buscar", {"padrao": "x", "caminhos": ["src"]}),
            ("git_log", {"caminhos": ["src"]}),
            ("git_diff", {"caminhos": ["src"]}),
            ("git_ls_files", {"caminhos": ["src"]}),
        ):
            argv = self.argv(ferramenta, campos)
            self.assertEqual(argv[1], "--literal-pathspecs", ferramenta)

    def test_diff_externo_e_textconv_desligados(self):
        # A8: o D6 do dev (`--no-ext-diff --no-textconv`) preso por teste em git_diff, git_log e git_show.
        for ferramenta, campos in (
            ("git_diff", {}), ("git_diff", {"formato": "stat", "revs": ["origin/main...HEAD"]}),
            ("git_log", {"formato": "stat"}), ("git_show", {"objeto": "HEAD", "formato": "patch"}),
        ):
            argv = self.argv(ferramenta, campos)
            self.assertIn("--no-ext-diff", argv, ferramenta)
            self.assertIn("--no-textconv", argv, ferramenta)
            self.assertLess(argv.index("--no-textconv"), argv.index("--"), ferramenta)

    def test_git_show_arquivo_protegido_negado(self):
        for objeto in ("HEAD:.env", "HEAD:certs/x.pem", "HEAD:.git/config", "HEAD:node_modules/a/b.js", "HEAD:.env."):
            self.assertIn("protegido", self.negado("git_show", {"objeto": objeto}), objeto)


class TestGh(BaseComandos):
    def test_gh_numero_invalido_negado(self):
        for numero in ("416 --web", "-R x/y", "0", "abc", "012", True, -1, 4160000000, None, "416\n"):
            self.negado("gh_pr_view", {"numero": numero})

    def test_gh_repo_vem_do_script(self):
        for ferramenta in ("gh_pr_view", "gh_pr_diff", "gh_pr_checks"):
            argv = self.argv(ferramenta, {"numero": "416"})
            i = argv.index("416")
            self.assertEqual(argv[i + 1 : i + 3], ["-R", "dono/repo"], ferramenta)
            self.assertIn("campo desconhecido", self.negado(ferramenta, {"numero": "416", "repo": "outro/repo"}))
        sem_repo = ContextoComandos(raiz=self.ctx.raiz, executaveis=dict(EXE), repo_gh=None)
        self.negado("gh_pr_view", {"numero": "416"}, sem_repo)
        for proibida in ("--web", "--watch", "--comments", "--jq"):
            self.assertNotIn(proibida, " ".join(self.argv("gh_pr_checks", {"numero": "416"})))


class TestVerificar(BaseComandos):
    def test_verificar_nome_fora_do_enum_negado(self):
        for nome in ("npm_install", "docker", "npm_check", "curl", "", None, "teste; rm"):
            self.assertIn("lista fechada", self.negado("verificar", {"nome": nome}), repr(nome))

    def test_verificar_teste_db_negado(self):
        for arquivo in ("auth-identity-links-db.test.ts", "permission-catalog-db-parity.test.ts"):
            self.assertIn("-db", self.negado("verificar", {"nome": "teste", "arquivo": arquivo}), arquivo)

    def test_verificar_teste_inexistente_negado(self):
        self.assertIn("inexistente", self.negado("verificar", {"nome": "teste", "arquivo": "nao-existe.test.ts"}))

    def test_verificar_teste_com_caminho_negado(self):
        for arquivo in ("../x.test.ts", "tests/x.test.ts", "a\x00b.test.ts", "..\\x.test.ts", "x.test.ts/../y.test.ts", "-x.test.ts"):
            self.negado("verificar", {"nome": "teste", "arquivo": arquivo})

    def test_verificar_sem_npm_ci_devolve_erro_ao_modelo(self):
        execf = ExecutorFalso()
        ctx = ContextoComandos(
            raiz=self.ctx.raiz, executaveis=dict(EXE), repo_gh="dono/repo", npm_ci=False, permitir_execucao_alvo=True
        )
        res = Ferramentas(ctx, executar_processo=execf).executar("verificar", {"nome": "teste", "arquivo": "auth-jwt.test.ts"})
        self.assertTrue(res.erro and res.negado)
        self.assertIn("--npm-ci", res.motivo_negacao)
        self.assertEqual(execf.chamadas, [])
        ok = Ferramentas(ctx, executar_processo=execf).executar("verificar", {"nome": "diff_check"})
        self.assertFalse(ok.erro)  # diff_check não depende do npm ci

    def test_npm_argv_fixo_sem_campo_do_modelo(self):
        for campos in ({"nome": "teste", "arquivo": "auth-jwt.test.ts"}, {"nome": "diff_check"}, {"nome": "espelho_codex"}):
            argv = self.argv("verificar", campos)
            self.assertNotEqual(argv[0], EXE["npm"])
            self.assertFalse(any(a.lower().endswith(".cmd") for a in argv))
        self.assertEqual(
            self.argv("verificar", {"nome": "teste", "arquivo": "auth-jwt.test.ts"}),
            [EXE["node"], "--test", "--import", "tsx", "tests/auth-jwt.test.ts"],
        )
        execf = ExecutorFalso()
        wt = WorktreeDescartavel("C:/repo", "a" * 40, str(self.raiz), dict(EXE), execf, npm_ci=True, permitir_execucao_alvo=True)
        wt.preparar()
        self.assertEqual([c["argv"] for c in execf.chamadas], [[EXE["npm"], "ci"]])


class TestExecucaoDoAlvo(BaseComandos):
    """A1: nada que execute código do commit alvo roda por padrão (espelho_codex, teste, npm ci)."""

    def ctx_padrao(self, **kw) -> ContextoComandos:
        # SEM passar permitir_execucao_alvo: vale o padrão do código.
        return ContextoComandos(raiz=self.ctx.raiz, executaveis=dict(EXE), repo_gh="dono/repo", **kw)

    def test_padrao_e_desligado(self):
        from agente_claude.tarefas import Opcoes

        self.assertIs(ContextoComandos(raiz=None).permitir_execucao_alvo, False)
        self.assertIs(Opcoes().permitir_execucao_alvo, False)
        self.assertIs(WorktreeDescartavel("C:/r", "a" * 40, "C:/w", dict(EXE)).permitir_execucao_alvo, False)

    def test_desligado_recusa_espelho_e_teste_sem_processo(self):
        execf = ExecutorFalso()
        f = Ferramentas(self.ctx_padrao(npm_ci=True), executar_processo=execf)
        for campos in ({"nome": "espelho_codex", "arquivo": None}, {"nome": "teste", "arquivo": "auth-jwt.test.ts"}):
            res = f.executar("verificar", campos)
            self.assertTrue(res.erro and res.negado, campos)
            self.assertIn("não permitido nesta execução", res.motivo_negacao)
            self.assertIn("--permitir-execucao-do-alvo", res.motivo_negacao)
            self.assertIsNone(res.argv)
        self.assertEqual(execf.chamadas, [])
        ok = f.executar("verificar", {"nome": "diff_check", "arquivo": None})  # só git: segue liberado
        self.assertFalse(ok.erro)
        self.assertEqual(len(execf.chamadas), 1)

    def test_ligado_libera_espelho_e_teste(self):
        ctx = self.ctx_padrao(npm_ci=True, permitir_execucao_alvo=True)
        self.assertEqual(self.argv("verificar", {"nome": "espelho_codex"}, ctx), [EXE["node"], "scripts/sync-agent-agents.mjs", "--check"])
        self.assertEqual(self.argv("verificar", {"nome": "teste", "arquivo": "auth-jwt.test.ts"}, ctx)[-1], "tests/auth-jwt.test.ts")

    def test_recusa_volta_ao_modelo_e_fica_na_auditoria(self):
        modelo = ModeloFalso([resposta(uso("verificar", {"nome": "espelho_codex", "arquivo": None})), resposta_parecer()])
        cen = Cenario(modelo, npm_ci=False).rodar()  # Opcoes padrão: execução do alvo desligada
        try:
            resultado = modelo.chamadas[1]["messages"][-1]["content"][0]
            self.assertTrue(resultado["is_error"])
            self.assertIn("não permitido nesta execução", resultado["content"])
            linhas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["ferramenta"] == "verificar"]
            self.assertEqual(len(linhas), 1)
            self.assertTrue(linhas[0]["negado"])
            self.assertIsNone(linhas[0]["argv"])
            self.assertIn("--permitir-execucao-do-alvo", linhas[0]["motivo_negacao"])
            self.assertEqual(cen.executor.chamadas, [])
            self.assertIs(cen.parecer["execucao"]["permitir_execucao_alvo"], False)
            self.assertIn("NÃO permitidas nesta execução", modelo.chamadas[0]["messages"][0]["content"])
        finally:
            cen.limpar()

    def test_npm_ci_sem_permissao_recusado_antes_de_criar(self):
        from agente_claude.worktree import RecusaPrevia

        execf = ExecutorFalso()
        wt = WorktreeDescartavel("C:/repo", "a" * 40, str(self.raiz / "novo"), dict(EXE), execf, npm_ci=True)
        with self.assertRaises(RecusaPrevia) as c:
            wt.verificar_previo()
        self.assertIn("--permitir-execucao-do-alvo", str(c.exception))
        with self.assertRaises(RecusaPrevia):
            wt.preparar()  # 2ª camada
        self.assertEqual(execf.chamadas, [])


class TestExecutor(BaseComandos):
    def test_executor_sempre_shell_false_e_lista(self):
        capturado = {}

        class PopenFalso:
            def __init__(self, argv, **kw):
                capturado["argv"], capturado["kw"] = argv, kw
                self.stdout = io.BytesIO(b"saida")
                self.pid = 4242

            def wait(self, timeout=None):
                return 0

            def kill(self):
                pass

        ex = executor.executar([EXE["git"], "status"], cwd=str(self.raiz), env={"PATH": "x"}, timeout_s=5, popen=PopenFalso)
        self.assertIs(capturado["kw"]["shell"], False)
        self.assertIsInstance(capturado["argv"], list)
        self.assertEqual(capturado["kw"]["stdin"], subprocess.DEVNULL)
        self.assertEqual(ex.saida, "saida")
        with self.assertRaises(TypeError):
            executor.executar("git status", cwd=".", env={}, timeout_s=1, popen=PopenFalso)
        execf = ExecutorFalso()
        Ferramentas(self.ctx, executar_processo=execf).executar("git_ls_files", {"caminhos": ["src"]})
        self.assertIsInstance(execf.chamadas[0]["argv"], list)

    def test_executavel_absoluto(self):
        for ferramenta, campos in (
            ("buscar", {"padrao": "x"}), ("git_log", {}), ("git_show", {"objeto": "HEAD"}), ("git_diff", {}),
            ("git_ls_files", {}), ("gh_pr_view", {"numero": "1"}), ("gh_pr_diff", {"numero": "1"}),
            ("gh_pr_checks", {"numero": "1"}), ("verificar", {"nome": "diff_check"}),
        ):
            self.assertTrue(os.path.isabs(self.argv(ferramenta, campos)[0]), ferramenta)
        relativo = ContextoComandos(raiz=self.ctx.raiz, executaveis={"git": "git"}, repo_gh="dono/repo")
        self.assertIn("indisponível", self.negado("git_log", {}, relativo))

    def test_taskkill_recebe_ambiente_limpo(self):
        # A10: o taskkill herdava o os.environ do agente (com a chave, se ela veio do processo).
        if os.name != "nt":
            self.skipTest("taskkill só existe no Windows")
        canario = "CANARIO-" + "TASKKILL-" + "9" * 12
        capturado = {}

        def run_falso(argv, **kw):
            capturado["argv"], capturado["kw"] = argv, kw
            return subprocess.CompletedProcess(argv, 0)

        class Proc:
            pid = 4242

            def kill(self):
                pass

        with mock.patch.dict(os.environ, {"ERP_AGENTE_ANTHROPIC_KEY": canario, "FOO_SECRET": canario}), \
                mock.patch.object(executor.subprocess, "run", run_falso):
            executor.matar_arvore(Proc())
        self.assertTrue(capturado["argv"][0].lower().endswith("taskkill.exe"))
        env = capturado["kw"].get("env")
        self.assertIsInstance(env, dict)
        self.assertNotIn("ERP_AGENTE_ANTHROPIC_KEY", env)
        self.assertNotIn(canario, " ".join(env.values()))
        self.assertEqual(env, ambiente_limpo())

    def test_timeout_marca_expirou(self):
        ex = executor.executar(
            [sys.executable, "-c", "import time; time.sleep(8)"],
            cwd=str(self.raiz),
            env=ambiente_limpo(),
            timeout_s=1,
        )
        self.assertTrue(ex.expirou)
        self.assertLess(ex.duracao_ms, 6000)

    def test_truncagem_64kb_com_aviso(self):
        dados = b"A" * 48 * 1024 + b"M" * 100_000 + b"Z" * 16 * 1024

        class PopenFalso:
            def __init__(self, argv, **kw):
                self.stdout = io.BytesIO(dados)
                self.pid = 1

            def wait(self, timeout=None):
                return 0

            def kill(self):
                pass

        ex = executor.executar([EXE["git"], "log"], cwd=".", env={}, timeout_s=5, popen=PopenFalso)
        self.assertTrue(ex.truncado)
        self.assertEqual(ex.bytes_total, len(dados))
        self.assertTrue(ex.saida.startswith("A" * 48 * 1024 + "\n[... 100000 bytes omitidos ...]\n"))
        self.assertTrue(ex.saida.endswith("Z" * 16 * 1024))


class TestGitReal(unittest.TestCase):
    """A5 medido no git REAL, num repositório temporário (sem rede): o DWIM de `git show <caminho>`
    e o glob no pathspec não alcançam mais um `.env` rastreado pelo nome que a cerca nega."""

    def setUp(self) -> None:
        git = shutil.which("git")
        if not git:
            self.skipTest("git ausente no PATH")
        self.git = os.path.abspath(git)
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.raiz = Path(self._tmp.name) / "repo"
        (self.raiz / "cfg").mkdir(parents=True)
        (self.raiz / "cfg" / ".env").write_text("CANARIO_ENV=valor-rastreado\n", encoding="utf-8")
        (self.raiz / "cfg" / "app.txt").write_text("conteudo-livre\n", encoding="utf-8")
        env = ambiente_limpo()
        for args in (
            ["init", "-q"],
            ["add", "-A"],
            ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "--no-verify", "-m", "x"],
        ):
            r = executor.executar([self.git, *args], cwd=str(self.raiz), env=env, timeout_s=60)
            self.assertEqual(r.codigo, 0, r.saida)
        self.f = Ferramentas(ContextoComandos(raiz=Raiz(self.raiz), executaveis={"git": self.git}, repo_gh="dono/repo"))

    def test_git_show_caminho_sem_dois_pontos_nao_le_conteudo(self):
        res = self.f.executar("git_show", {"objeto": "cfg/.env", "formato": None})
        self.assertNotIn("CANARIO", res.texto)
        self.assertNotEqual(res.codigo, 0)
        controle = self.f.executar("git_show", {"objeto": "HEAD:cfg/app.txt", "formato": None})
        self.assertEqual(controle.codigo, 0, controle.texto)
        self.assertIn("conteudo-livre", controle.texto)

    def test_glob_no_caminho_nao_expande(self):
        res = self.f.executar("buscar", {"padrao": "CANARIO", "caminhos": ["cfg/*.env"]})
        self.assertNotIn("CANARIO", res.texto)
        for caminhos in (["cfg/[.]env*"], ["cfg/.e?v"]):
            self.assertNotIn("CANARIO", self.f.executar("buscar", {"padrao": "CANARIO", "caminhos": caminhos}).texto)
        controle = self.f.executar("buscar", {"padrao": "conteudo", "caminhos": ["cfg"]})
        self.assertIn("cfg/app.txt", controle.texto)


class TestCatalogo(unittest.TestCase):
    def test_ferramenta_desconhecida_e_error_e_auditada(self):
        nomes = ["bash", "git_push", "gh_pr_merge", "__import__", "gh_api", "_comando", "executar"]
        modelo = ModeloFalso([resposta(*[uso(n, {"command": "git push"}) for n in nomes]), resposta_parecer()])
        cen = Cenario(modelo).rodar()
        try:
            resultados = modelo.chamadas[1]["messages"][-1]["content"]
            self.assertEqual(len(resultados), len(nomes))
            for r in resultados:
                self.assertTrue(r["is_error"])
                self.assertIn("ferramenta desconhecida", r["content"])
            linhas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["ferramenta"] in nomes]
            self.assertEqual(len(linhas), len(nomes))
            self.assertTrue(all(l["negado"] and l["argv"] is None for l in linhas))
            self.assertEqual(cen.executor.chamadas, [])
        finally:
            cen.limpar()


if __name__ == "__main__":
    unittest.main()
