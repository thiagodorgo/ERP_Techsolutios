"""Cerca 3 — orçamento: turnos, ferramentas, tokens (com cache) e US$ (plano §3.3).

A4 (revisão do PR #417): a PRÓXIMA chamada é prevista antes de ser feita, e o custo final medido
nunca passa do teto. O `ModeloPiorCaso` cobra o pior caso coerente com o pedido que recebeu (todo
byte do pedido como token de escrita de cache e a saída inteira), para o teste provar a
propriedade "custo final <= teto" e não um número de exemplo.
"""

import json
import unittest
from decimal import Decimal

from agente_claude.modelo import Resposta, montar_pedido
from agente_claude.orcamento import BYTES_RESULTADO_POR_TURNO, FERRAMENTAS_POR_TURNO, Orcamento, Tetos
from agente_claude.tarefas import Opcoes
from tests.fakes import Cenario, ExecutorFalso, ModeloFalso, resposta, resposta_parecer, usage, uso

SAIDA_64K = "abc def\n" * 8192  # 65 536 bytes por resultado (L3 do revisor: 60 x 64 KB num turno)


def sempre_ferramenta(messages, n):
    return resposta(uso("git_ls_files", {"caminhos": []}))


class ModeloPiorCaso:
    """Usage = pior caso do pedido REAL: bytes do pedido como escrita de cache + `max_tokens` de saída."""

    def __init__(self, blocos_por_turno) -> None:
        self.blocos_por_turno = blocos_por_turno  # callable(n) -> lista de blocos
        self.chamadas: list[dict] = []

    def responder(self, *, system, tools, messages, max_tokens, esforco) -> Resposta:
        pedido = montar_pedido(system, tools, messages, max_tokens, esforco)
        entrada = len(json.dumps(pedido, ensure_ascii=False).encode("utf-8"))
        self.chamadas.append({"entrada": entrada, "messages": messages})
        n = len(self.chamadas)
        blocos = self.blocos_por_turno(n)
        return Resposta(
            content=blocos,
            stop_reason="tool_use" if any(b["type"] == "tool_use" for b in blocos) else "end_turn",
            usage={"input_tokens": 0, "cache_creation_input_tokens": entrada, "cache_read_input_tokens": 0,
                   "output_tokens": max_tokens},
            request_id=f"req_pior_{n}",
            cabecalhos={"request-id": f"req_pior_{n}"},
            modelo_respondeu="claude-opus-5-5",
        )


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
        self.assertIsNone(o.prompt_ultimo)  # sem medição: a próxima previsão conta o pedido inteiro

    def test_previsao_conta_entrada_e_saida_antes_da_chamada(self):
        o = Orcamento(Tetos(custo_usd=Decimal("1")))
        # 150 000 tokens de entrada ao pior preço (5) + 8000 de saída (20) = 0,75 + 0,16 = 0,91
        self.assertEqual(Orcamento.custo_previsto(150_000, 8000), Decimal("0.91"))
        self.assertIsNone(o.motivo_estouro_modelo(150_000, 8000))
        o.registrar_resposta(usage(0, 0, 0, 5000), 8000)  # gastou 0,10
        self.assertEqual(o.motivo_estouro_modelo(150_000, 8000), "custo")  # 0,10 + 0,91 > 1
        t = Orcamento(Tetos(tokens=100_000))
        self.assertIsNone(t.motivo_estouro_modelo(92_000, 8000))  # = teto: cabe
        self.assertEqual(t.motivo_estouro_modelo(92_001, 8000), "tokens")


class TestOrcamentoNoLaco(unittest.TestCase):
    def rodar(self, modelo, executor=None, **opcoes):
        base = dict(max_turnos=30, max_ferramentas=60, max_tokens=1_500_000, max_custo_usd=Decimal("6"))
        base.update(opcoes)
        cen = Cenario(modelo, executor=executor, opcoes=Opcoes(**base)).rodar()
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
        # A 1ª chamada cabe (prompt ~16 mil + 8000 de saída < 60 mil); a 2ª repetiria o prompt de
        # 50 mil medido na 1ª e passaria do teto: não é feita.
        grande = resposta(uso("git_ls_files", {"caminhos": []}), u=usage(50_000, 0, 0, 200))
        modelo = ModeloFalso([grande], padrao=resposta_parecer())
        cen = self.rodar(modelo, max_tokens=60_000)
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:tokens")
        self.assertLessEqual(cen.parecer["custo"]["tokens"]["total"], 60_000)

    def test_teto_menor_que_a_primeira_chamada_nem_chama(self):
        modelo = ModeloFalso(padrao=resposta_parecer())
        cen = self.rodar(modelo, max_custo_usd=Decimal("0.10"))  # só a saída prevista já custa 0,16
        self.assertEqual(modelo.chamadas, [])
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:custo")
        self.assertEqual(cen.parecer["custo"]["usd_estimado"], "0.00")
        evento = [l for l in cen.linhas_auditoria() if l.get("nome") == "orcamento_estourado"][0]
        self.assertTrue(evento["detalhe"]["antes_da_chamada"])
        self.assertGreater(evento["detalhe"]["entrada_prevista_tokens"], 0)

    def test_l3_um_turno_com_60_ferramentas_nao_estoura_o_teto(self):
        # Evidência L3/L3b do revisor: teto US$ 1, um turno com 60 tool_use de 64 KB. Antes: a 2ª
        # chamada era feita e o custo final saía US$ 3,76.
        def turnos(n):
            return [uso("buscar", {"padrao": f"p{i}"}) for i in range(60)] if n == 1 else [
                uso("entregar_parecer", {"veredito": "aprovado", "resumo": "r", "achados": [],
                                         "comandos_executados": [], "limitacoes": []})]

        modelo = ModeloPiorCaso(turnos)
        cen = Cenario(modelo, executor=ExecutorFalso(saida=SAIDA_64K),
                      opcoes=Opcoes(max_turnos=30, max_ferramentas=500, max_tokens=100_000_000,
                                    max_custo_usd=Decimal("1"))).rodar()
        self.addCleanup(cen.limpar)
        custo = Decimal(cen.parecer["custo"]["usd_estimado"])
        self.assertLessEqual(custo, Decimal("1"))
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:custo")
        self.assertLessEqual(len(cen.executor.chamadas), FERRAMENTAS_POR_TURNO)

    def test_custo_final_nunca_passa_do_teto(self):
        # Propriedade, em várias formas de laço (L3b): cada chamada feita custou no máximo o previsto,
        # e o custo final medido <= teto.
        formas = [(3, 20_000, "0.50"), (5, 65_536, "1"), (12, 30_000, "2"), (1, 200, "0.40"), (8, 65_536, "3")]
        for por_turno, tamanho, teto in formas:
            with self.subTest(por_turno=por_turno, tamanho=tamanho, teto=teto):
                modelo = ModeloPiorCaso(lambda n, k=por_turno: [uso("buscar", {"padrao": f"t{n}-{i}"}) for i in range(k)])
                cen = Cenario(modelo, executor=ExecutorFalso(saida="x" * (tamanho - 1) + "\n"),
                              opcoes=Opcoes(max_turnos=50, max_ferramentas=500, max_tokens=100_000_000,
                                            max_custo_usd=Decimal(teto))).rodar()
                self.addCleanup(cen.limpar)
                self.assertLessEqual(Decimal(cen.parecer["custo"]["usd_estimado"]), Decimal(teto))
                self.assertGreaterEqual(len(modelo.chamadas), 1)
                self.assertEqual(cen.parecer["motivo_parcial"], "orcamento:custo")
                for linha in [l for l in cen.linhas_auditoria() if l["tipo"] == "modelo"]:
                    u = linha["usage"]
                    real = Orcamento.custo_de(u["input_tokens"], u["cache_creation_input_tokens"],
                                              u["cache_read_input_tokens"], u["output_tokens"])
                    self.assertLessEqual(real, Decimal(linha["custo_previsto_usd"]), linha["turno"])

    def test_limite_de_ferramentas_por_turno(self):
        usos = [uso("git_ls_files", {"caminhos": []}) for _ in range(FERRAMENTAS_POR_TURNO + 8)]
        modelo = ModeloFalso([resposta(*usos), resposta_parecer()])
        cen = self.rodar(modelo)
        self.assertEqual(len(cen.executor.chamadas), FERRAMENTAS_POR_TURNO)
        resultados = modelo.chamadas[1]["messages"][-1]["content"]
        self.assertEqual(len(resultados), len(usos))
        recusadas = [r for r in resultados if r.get("is_error")]
        self.assertEqual(len(recusadas), 8)
        self.assertTrue(all("ferramentas por turno" in r["content"] for r in recusadas))
        self.assertEqual(cen.codigo, 0)  # não é parada: o modelo pode pedir o resto no turno seguinte

    def test_limite_de_bytes_de_resultado_por_turno(self):
        usos = [uso("buscar", {"padrao": f"p{i}"}) for i in range(10)]
        modelo = ModeloFalso([resposta(*usos), resposta_parecer()])
        cen = self.rodar(modelo, executor=ExecutorFalso(saida=SAIDA_64K), max_custo_usd=Decimal("50"), max_tokens=100_000_000)
        resultados = modelo.chamadas[1]["messages"][-1]["content"]
        devolvidos = [r for r in resultados if not r.get("is_error")]
        total = sum(len(r["content"].encode("utf-8")) for r in devolvidos)
        self.assertLessEqual(total, BYTES_RESULTADO_POR_TURNO)
        self.assertGreater(total, BYTES_RESULTADO_POR_TURNO - 64 * 1024)  # usou o turno, não recusou tudo
        self.assertIn("limite de bytes de resultado por turno", devolvidos[-1]["content"])
        self.assertIn('truncado="true"', devolvidos[-1]["content"])
        recusadas = [r for r in resultados if r.get("is_error")]
        self.assertTrue(recusadas and all("KB de resultado por turno" in r["content"] for r in recusadas))

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
