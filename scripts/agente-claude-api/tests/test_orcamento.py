"""Cerca 3 — orçamento: turnos, ferramentas, tokens (com cache) e US$ (plano §3.3)."""

import unittest
from decimal import Decimal

from agente_claude.orcamento import Orcamento, Tetos
from agente_claude.tarefas import Opcoes
from tests.fakes import Cenario, ModeloFalso, resposta, resposta_parecer, usage, uso


def sempre_ferramenta(messages, n):
    return resposta(uso("git_ls_files", {"caminhos": []}))


class TestOrcamento(unittest.TestCase):
    def test_soma_inclui_cache_escrita_e_leitura(self):
        o = Orcamento(Tetos())
        o.registrar_resposta({"input_tokens": 1, "cache_creation_input_tokens": 20, "cache_read_input_tokens": 300, "output_tokens": 4000}, 8000)
        self.assertEqual(o.tokens_total(), 4321)

    def test_custo_decimal_exato(self):
        o = Orcamento(Tetos())
        o.registrar_resposta(usage(1_000_000, 1_000_000, 1_000_000, 1_000_000), 8000)
        self.assertEqual(o.custo_usd_texto(), "29.20")  # 4 + 5 + 0,20 + 20
        self.assertIsInstance(o.custo_usd(), Decimal)
        o2 = Orcamento(Tetos())
        o2.registrar_resposta(usage(123, 0, 0, 0), 8000)
        self.assertEqual(o2.custo_usd_texto(), "0.000492")

    def test_limite_igual_conta_como_estouro(self):
        o = Orcamento(Tetos(turnos=3))
        for _ in range(3):
            o.novo_turno()
        self.assertEqual(o.motivo_estouro_modelo(), "turnos")
        f = Orcamento(Tetos(ferramentas=2))
        f.registrar_ferramenta()
        f.registrar_ferramenta()
        self.assertEqual(f.motivo_estouro_ferramenta(), "ferramentas")
        t = Orcamento(Tetos(tokens=15))
        t.registrar_resposta(usage(10, 0, 0, 5), 8000)
        self.assertEqual(t.motivo_estouro_modelo(), "tokens")

    def test_usage_ausente_conta_pior_caso(self):
        o = Orcamento(Tetos())
        o.registrar_resposta(None, 8000)
        self.assertEqual(o.saida, 8000)
        self.assertEqual(o.usage_ausente, 1)


class TestOrcamentoNoLaco(unittest.TestCase):
    def rodar(self, modelo, **opcoes):
        base = dict(max_turnos=30, max_ferramentas=60, max_tokens=1_500_000, max_custo_usd=Decimal("6"))
        base.update(opcoes)
        cen = Cenario(modelo, opcoes=Opcoes(**base)).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_estouro_de_turnos_grava_parcial(self):
        modelo = ModeloFalso(padrao=sempre_ferramenta)
        cen = self.rodar(modelo, max_turnos=3)
        self.assertEqual(len(modelo.chamadas), 3)
        self.assertTrue(cen.parecer["parcial"])
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:turnos")
        self.assertEqual(cen.codigo, 2)
        self.assertTrue((cen.pasta / "parecer.json").exists())

    def test_estouro_de_ferramentas_no_meio_do_turno(self):
        usos = [uso("git_ls_files", {"caminhos": []}) for _ in range(5)]
        modelo = ModeloFalso([resposta(*usos)], padrao=resposta_parecer())
        cen = self.rodar(modelo, max_ferramentas=3)
        self.assertEqual(len(cen.executor.chamadas), 3)
        self.assertEqual(len(modelo.chamadas), 1)  # o laço encerra: o modelo não é chamado de novo
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:ferramentas")
        negadas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["negado"]]
        self.assertEqual(len(negadas), 2)

    def test_estouro_de_tokens_para_antes_da_proxima_chamada(self):
        grande = resposta(uso("git_ls_files", {"caminhos": []}), u=usage(900, 0, 0, 200))
        modelo = ModeloFalso([grande], padrao=resposta_parecer())
        cen = self.rodar(modelo, max_tokens=1000)
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:tokens")

    def test_estouro_de_custo_usa_previsao(self):
        # 1ª resposta custa US$ 0,40 (20 000 de saída); teto US$ 0,60: a 2ª chamada estouraria -> não é feita.
        cara = resposta(uso("git_ls_files", {"caminhos": []}), u=usage(0, 0, 0, 20_000))
        modelo = ModeloFalso([cara], padrao=resposta_parecer())
        cen = self.rodar(modelo, max_custo_usd=Decimal("0.60"))
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:custo")
        self.assertEqual(cen.parecer["custo"]["usd_estimado"], "0.40")


if __name__ == "__main__":
    unittest.main()
