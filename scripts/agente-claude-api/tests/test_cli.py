"""CLI ponta a ponta com repositório falso (git/gh simulados): contrato §2.2 e ordem do §1."""

import contextlib
import io
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from agente_claude import cli
from agente_claude.modelo import ModeloSimulado
from tests.fakes import CHAVE_FALSA_2, WORKSPACE_FALSO, ExecutorRepoFalso, ModeloFalso, deps_repo_falso, resposta, resposta_parecer, uso

ENV_OK = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO}


class TestCli(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def main(self, argv, deps):
        saida, erro = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(saida), contextlib.redirect_stderr(erro):
            codigo = cli.main(argv, deps)
        return codigo, saida.getvalue(), erro.getvalue()

    def contexto(self, ex):
        p = ex.repo / "contexto.md"
        secoes = ["OBJETIVO", "FONTE", "REGRAS", "JÁ MEDIDO", "HIPÓTESES", "FORA DO ESCOPO", "ACEITE", "ORÇAMENTO"]
        linhas = ["# PACOTE DE CONTEXTO — teste"]
        for s in secoes:
            valor = "NENHUM" if s == "JÁ MEDIDO" else "- teto_execucao_usd: 0.50" if s == "ORÇAMENTO" else f"conteúdo {s}"
            if s == "FONTE": valor = f"SHA: {ex.head}\n- x:1"
            linhas += [f"## {s}", valor]
        p.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        return str(p)

    def test_argumento_invalido_sai_3(self):
        deps = deps_repo_falso(ExecutorRepoFalso(self.base), dict(ENV_OK))
        for argv in (["revisar-pr", "0"], ["revisar-pr", "416 --web"], ["revisar-pr", "416", "--esforco", "max"],
                     ["revisar-pr", "416", "--max-turnos", "0"], ["investigar", "x", "--sha", "abc"],
                     ["revisar-pr", "416", "--max-custo-usd", "-1"], ["revisar-pr", "416", "--modelo", "x"],
                     ["revisar-pr", "416", "--simular-turnos", "2"], []):
            codigo, _, erro = self.main(argv, deps)
            self.assertEqual(codigo, 3, argv)

    def test_tetos_de_custo_padrao_por_tarefa(self):
        casos = {
            ("revisar-pr", "416"): Decimal("3.00"),
            ("investigar", "x"): Decimal("2.00"),
            ("redigir",): Decimal("2.50"),
            ("propor-patch",): Decimal("2.00"),
        }
        for prefixo, esperado in casos.items():
            argv=list(prefixo)
            if prefixo[0]=="redigir":argv += ["--entregavel","registro"]
            argv += ["--contexto","x"]
            with self.subTest(tarefa=prefixo[0]):
                self.assertEqual(cli._opcoes(cli.construir_parser().parse_args(argv)).max_custo_usd,esperado)

    def test_execucao_do_alvo_desligada_por_padrao_na_cli(self):
        # A1: sem a flag, Opcoes.permitir_execucao_alvo é False; `--npm-ci` sozinho é recusado (3).
        args = cli.construir_parser().parse_args(["revisar-pr", "416", "--contexto", "x"])
        self.assertIs(cli._opcoes(args).permitir_execucao_alvo, False)
        args = cli.construir_parser().parse_args(["investigar", "x", "--contexto", "x", "--permitir-execucao-do-alvo"])
        self.assertIs(cli._opcoes(args).permitir_execucao_alvo, True)
        ex = ExecutorRepoFalso(self.base)
        codigo, _, erro = self.main(["revisar-pr", "416", "--npm-ci", "--saida", str(self.base / "s")],
                                    deps_repo_falso(ex, dict(ENV_OK)))
        self.assertEqual(codigo, 3)
        self.assertIn("--permitir-execucao-do-alvo", erro)
        self.assertEqual(ex.chamadas, [])
        args = cli.construir_parser().parse_args(["revisar-pr", "416", "--contexto", "x", "--npm-ci", "--permitir-execucao-do-alvo"])
        opcoes = cli._opcoes(args)
        self.assertTrue(opcoes.npm_ci and opcoes.permitir_execucao_alvo)

    def test_parecer_registra_se_a_execucao_do_alvo_foi_permitida(self):
        for extra, esperado in (([], False), (["--permitir-execucao-do-alvo"], True)):
            base = self.base / ("p" if esperado else "n")
            ex = ExecutorRepoFalso(base)
            deps = deps_repo_falso(ex, dict(ENV_OK), modelo=ModeloFalso([resposta_parecer(veredito="aprovado")]))
            codigo, _, _ = self.main(["revisar-pr", "416", "--contexto", self.contexto(ex), "--saida", "s", "--worktree-dir", str(base / "w"), *extra], deps)
            self.assertEqual(codigo, 0)
            p = json.loads((base / "s" / "parecer.json").read_text(encoding="utf-8"))
            self.assertIs(p["execucao"]["permitir_execucao_alvo"], esperado)
            md = (base / "s" / "parecer.md").read_text(encoding="utf-8")
            self.assertIn("PERMITIDA" if esperado else "não permitida", md)

    def test_versao(self):
        codigo, saida, _ = self.main(["versao"], deps_repo_falso(ExecutorRepoFalso(self.base), {}))
        self.assertEqual(codigo, 0)
        self.assertIn("agente_claude", saida)

    def test_sem_chave_para_antes_do_fetch(self):
        ex = ExecutorRepoFalso(self.base)
        codigo, _, erro = self.main(["revisar-pr", "416", "--simular"], deps_repo_falso(ex, {}))
        self.assertEqual(codigo, 3)
        self.assertIn("ERP_AGENTE_ANTHROPIC_KEY", erro)
        self.assertEqual(ex.chamadas, [])

    def test_revisar_pr_ponta_a_ponta_com_falsos(self):
        ex = ExecutorRepoFalso(self.base)
        modelo = ModeloFalso([resposta(uso("listar_diretorio", {"caminho": "."}), uso("gh_pr_checks", {"numero": "416"})),
                              resposta_parecer(veredito="aprovado")])
        deps = deps_repo_falso(ex, dict(ENV_OK), modelo=modelo)
        saida_dir, wt_dir = self.base / "s", self.base / "w"
        codigo, saida, _ = self.main(["revisar-pr", "416", "--contexto", self.contexto(ex), "--saida", "s", "--worktree-dir", str(wt_dir)], deps)
        self.assertEqual(codigo, 0)
        self.assertIn("parecer completo", saida)
        sub = [c["argv"][1:4] for c in ex.chamadas]
        ordem = [" ".join(s) for s in sub]
        self.assertLess(ordem.index("pr view 416"), ordem.index("fetch --no-tags origin"))
        self.assertLess(ordem.index("fetch --no-tags origin"), ordem.index("worktree add --detach"))
        self.assertLess(ordem.index("worktree add --detach"), ordem.index("worktree remove --force"))
        self.assertFalse(wt_dir.exists())  # worktree removido
        p = json.loads((saida_dir / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["alvo"]["sha"], "b" * 40)
        self.assertEqual(p["veredito"], "aprovado")
        self.assertTrue(p["execucao"]["worktree_removido"])
        self.assertEqual({"parecer.json", "parecer.md", "auditoria.jsonl", "resumo.json"}, {f.name for f in saida_dir.iterdir()})

    def test_simular_ponta_a_ponta(self):
        ex = ExecutorRepoFalso(self.base)
        deps = deps_repo_falso(ex, dict(ENV_OK), modelo=ModeloSimulado(turnos=2, espera_s=0))
        codigo, saida, _ = self.main(["investigar", "onde fica o tenant?", "--contexto", self.contexto(ex), "--simular", "--simular-turnos", "2",
                                      "--saida", "s", "--worktree-dir", str(self.base / "w")], deps)
        self.assertEqual(codigo, 0)
        p = json.loads((self.base / "s" / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["modelo"]["respondeu"], "simulado")
        self.assertFalse(p["modelo"]["fallback_servidor"])
        self.assertEqual(len(p["comandos_executados"]), 2)
        self.assertEqual(p["conta"]["request_ids"], ["simulado-1", "simulado-2", "simulado-3"])

    def test_pasta_de_saida_existente_recusa(self):
        (self.base / "s").mkdir()
        ex = ExecutorRepoFalso(self.base)
        codigo, _, erro = self.main(["revisar-pr", "416", "--contexto", self.contexto(ex), "--simular", "--saida", "s"],
                                    deps_repo_falso(ex, dict(ENV_OK)))
        self.assertEqual(codigo, 3)
        self.assertIn("já existe", erro)

    def test_worktree_dentro_do_repo_ou_existente_recusa(self):
        ex = ExecutorRepoFalso(self.base)
        for wt in (str(ex.repo / "dentro"), str(self.base)):
            codigo, _, _ = self.main(["revisar-pr", "416", "--contexto", self.contexto(ex), "--simular", "--saida", f"sn{len(wt)}",
                                      "--worktree-dir", wt], deps_repo_falso(ex, dict(ENV_OK)))
            self.assertEqual(codigo, 3, wt)
        self.assertFalse(any(" ".join(c["argv"][1:3]) == "worktree add" for c in ex.chamadas))

    def test_disco_insuficiente_recusa(self):
        ex = ExecutorRepoFalso(self.base)
        deps = deps_repo_falso(ex, dict(ENV_OK), livre=1024**3)
        codigo, _, erro = self.main(["revisar-pr", "416", "--contexto", self.contexto(ex), "--simular", "--saida", "s",
                                     "--worktree-dir", str(self.base / "w")], deps)
        self.assertEqual(codigo, 3)
        self.assertIn("disco", erro)

    def test_e1_contexto_recusado_mostra_motivo_e_grava_erro(self):
        ex=ExecutorRepoFalso(self.base);deps=deps_repo_falso(ex,dict(ENV_OK))
        codigo,_,erro=self.main(["redigir","--entregavel","registro","--sha",ex.head,
                                 "--contexto","ausente.md","--simular"],deps)
        self.assertEqual(codigo,3);self.assertIn("ContextoRecusado",erro);self.assertIn("raízes permitidas",erro)
        erros=list(self.base.glob("*-recusa-*/erro.txt"));self.assertEqual(1,len(erros))
        gravado=erros[0].read_text(encoding="utf-8");self.assertIn("ContextoRecusado",gravado);self.assertIn("raízes permitidas",gravado)

    def test_e1_entrega_e_patch_recusados_mostram_motivo_na_tela_e_erro(self):
        casos=[]
        ex1=ExecutorRepoFalso(self.base/"r")
        redacao={"tipo":"registro","texto_markdown":"x","fontes_lidas":[{"arquivo":"nunca.md","linha_inicial":1,"linha_final":2,"evidencia":"x"}],"limitacoes":[]}
        casos.append((ex1,["redigir","--entregavel","registro"],ModeloFalso([resposta(uso("entregar_redacao",redacao))]),"EntregaRecusada","fonte não conferida"))
        ex2=ExecutorRepoFalso(self.base/"p")
        responder_original=ex2._responder
        ex2.por_argv=lambda argv:("check vermelho",1) if "apply" in argv else responder_original(argv)
        diff="diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n@@ -1 +1 @@\n-# repo\n+# repo2\n"
        patch={"base_sha":ex2.head,"diff_unificado":diff,"fontes_lidas":[],"limitacoes":[]}
        casos.append((ex2,["propor-patch"],ModeloFalso([resposta(uso("entregar_patch",patch))]),"PatchRecusado","git apply --check falhou"))
        for n,(ex,prefixo,modelo,classe,motivo) in enumerate(casos):
            deps=deps_repo_falso(ex,dict(ENV_OK),modelo=modelo)
            codigo,_,erro=self.main([*prefixo,"--sha",ex.head,"--contexto",self.contexto(ex),"--saida","s",
                                      "--worktree-dir",str(ex.base/"w")],deps)
            with self.subTest(classe=classe):
                self.assertEqual(codigo,5);self.assertIn(classe,erro);self.assertIn(motivo,erro)
                gravado=(ex.base/"s"/"erro.txt").read_text(encoding="utf-8")
                self.assertIn(classe,gravado);self.assertIn(motivo,gravado)

    def test_e2_contexto_relativo_usa_a_pasta_atual(self):
        ex=ExecutorRepoFalso(self.base/"rel");sub=ex.repo/"sub";sub.mkdir()
        origem=Path(self.contexto(ex));(sub/"pacote.md").write_text(origem.read_text(encoding="utf-8"),encoding="utf-8")
        deps=deps_repo_falso(ex,dict(ENV_OK),modelo=ModeloFalso([resposta(uso("entregar_redacao",{"tipo":"registro","texto_markdown":"ok","fontes_lidas":[],"limitacoes":[]}))]))
        deps.cwd=str(sub)
        codigo,_,erro=self.main(["redigir","--entregavel","registro","--sha",ex.head,"--contexto","pacote.md",
                                  "--saida","s","--worktree-dir",str(ex.base/"w")],deps)
        self.assertEqual(codigo,0,erro)


if __name__ == "__main__":
    unittest.main()
