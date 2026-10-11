"""Cerca 5 — auditoria: um JSONL por execução, uma linha por evento (plano §2.4, §3.5)."""

import json
import tempfile
import unittest
from pathlib import Path

from agente_claude.auditoria import Auditoria
from agente_claude.laco import Laco
from agente_claude.orcamento import Orcamento, Tetos
from agente_claude.redacao import Redator
from tests.fakes import Cenario, ModeloFalso, resposta, resposta_parecer, texto, uso

# Cópia LITERAL da tabela do plano §2.4 (independente do módulo, de propósito).
CAMPOS_DO_PLANO = {
    "inicio": {"ts", "execucao_id", "tarefa", "alvo", "sha", "worktree", "orcamento", "modelo_pedido", "esforco", "conta"},
    "modelo": {"turno", "request_id", "modelo_respondeu", "stop_reason", "usage", "custo_acumulado_usd", "duracao_ms", "rate_limit", "blocos"},
    "ferramenta": {"turno", "ferramenta", "args", "argv", "negado", "motivo_negacao", "codigo_saida", "bytes_saida", "truncado", "duracao_ms", "expirou"},
    "evento": {"nome", "detalhe"},
    "fim": {"parcial", "motivo_parcial", "custo", "request_ids", "modelo_respondeu", "duracao_total_ms"},
}


class TestAuditoria(unittest.TestCase):
    def rodar(self, modelo, **kw) -> Cenario:
        cen = Cenario(modelo, **kw).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_uma_linha_por_evento_json_valido(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = Auditoria(Path(tmp), Redator())
            for i in range(3):
                a.registrar({"tipo": "evento", "nome": "reprompt_parecer", "detalhe": i})
            # ANTES de fechar: cada evento já está no disco (queda no meio custa só a cauda)
            linhas = (Path(tmp) / "auditoria.jsonl").read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(linhas), 3)
            self.assertEqual([json.loads(l)["detalhe"] for l in linhas], [0, 1, 2])
            a.fechar()
        cen = self.rodar(ModeloFalso([resposta(uso("git_ls_files", {})), resposta_parecer()]))
        for linha in (cen.pasta / "auditoria.jsonl").read_text(encoding="utf-8").splitlines():
            json.loads(linha)

    def test_seq_monotonico(self):
        cen = self.rodar(ModeloFalso([resposta(uso("git_ls_files", {}), uso("ler_arquivo", {"caminho": ".env"})), resposta_parecer()]))
        seqs = [l["seq"] for l in cen.linhas_auditoria()]
        self.assertEqual(seqs, list(range(1, len(seqs) + 1)))

    def test_ferramenta_negada_tambem_auditada(self):
        cen = self.rodar(ModeloFalso([
            resposta(uso("ler_arquivo", {"caminho": ".env"}), uso("git_log", {"rev": "--exec-path=."})),
            resposta_parecer(),
        ]))
        negadas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["negado"]]
        self.assertEqual({l["ferramenta"] for l in negadas}, {"ler_arquivo", "git_log"})
        self.assertTrue(all(l["argv"] is None and l["motivo_negacao"] for l in negadas))
        self.assertEqual(cen.executor.chamadas, [])

    def test_campos_obrigatorios_por_tipo(self):
        cen = self.rodar(ModeloFalso([
            resposta(uso("git_ls_files", {}), uso("ler_arquivo", {"caminho": "../x"})),
            resposta(texto("pensando"), stop="end_turn"),
            resposta_parecer(),
        ]))
        tipos = set()
        for linha in cen.linhas_auditoria():
            tipos.add(linha["tipo"])
            faltando = CAMPOS_DO_PLANO[linha["tipo"]] - set(linha)
            self.assertFalse(faltando, (linha["tipo"], faltando))
        self.assertEqual(tipos, set(CAMPOS_DO_PLANO))
        with tempfile.TemporaryDirectory() as tmp:
            a = Auditoria(Path(tmp), Redator())
            with self.assertRaises(ValueError):
                a.registrar({"tipo": "modelo", "turno": 1})
            a.fechar()

    def test_resumo_gravado_mesmo_com_excecao_no_laco(self):
        # Nível do laço: o "finally" grava resumo.json antes de a exceção subir.
        with tempfile.TemporaryDirectory() as tmp:
            a = Auditoria(Path(tmp), Redator())
            laco = Laco(
                modelo=ModeloFalso([resposta(texto("t1"), stop="end_turn"), RuntimeError("caiu no 2º turno")]),
                ferramentas=None, orcamento=Orcamento(Tetos()), auditoria=a, redator=Redator(),
                max_tokens_resposta=1000, esforco="medium",
            )
            with self.assertRaises(RuntimeError):
                laco.executar("oi")
            resumo = json.loads((Path(tmp) / "resumo.json").read_text(encoding="utf-8"))
            self.assertTrue(resumo["fim"]["parcial"])
            self.assertEqual(resumo["fim"]["motivo_parcial"], "erro:RuntimeError")
            a.fechar()
        # Nível da tarefa: código 5, parecer parcial e resumo final.
        cen = self.rodar(ModeloFalso([resposta(uso("git_ls_files", {})), RuntimeError("caiu")]))
        self.assertEqual(cen.codigo, 5)
        resumo = json.loads((cen.pasta / "resumo.json").read_text(encoding="utf-8"))
        self.assertTrue(resumo["fim"]["parcial"])
        self.assertTrue(cen.parecer["parcial"])

    def test_modelo_respondeu_e_request_id_na_linha_modelo(self):
        r1 = resposta(uso("git_ls_files", {}), request_id="req_AAA", modelo="claude-opus-5-5")
        cen = self.rodar(ModeloFalso([r1, resposta_parecer()]))
        linha = next(l for l in cen.linhas_auditoria() if l["tipo"] == "modelo")
        self.assertEqual(linha["request_id"], "req_AAA")
        self.assertEqual(linha["modelo_respondeu"], "claude-opus-5-5")
        self.assertIn("req_AAA", cen.parecer["conta"]["request_ids"])

    def test_conteudo_de_arquivo_nao_vai_a_auditoria(self):
        sentinela = "CONTEUDO-SENTINELA-" + "8125"
        cen = self.rodar(
            ModeloFalso([resposta(uso("ler_arquivo", {"caminho": "src/a.ts"})), resposta_parecer()]),
            arquivos={"src/a.ts": f"const s = '{sentinela}';\n"},
        )
        bruto = (cen.pasta / "auditoria.jsonl").read_text(encoding="utf-8")
        self.assertNotIn(sentinela, bruto)
        linha = next(l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["ferramenta"] == "ler_arquivo")
        self.assertGreater(linha["bytes_saida"], 0)
        self.assertNotIn(sentinela, (cen.pasta / "resumo.json").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
