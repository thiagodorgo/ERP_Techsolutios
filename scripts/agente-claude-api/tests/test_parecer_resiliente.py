"""N1 da reconferência do PR #417: texto do modelo nunca suprime o parecer de uma execução paga.

(1) A conferência de evidência nunca levanta: tamanho e profundidade são limitados ANTES do parse,
    e qualquer falha vira `conferida=false` com o motivo.
(2) A montagem e a gravação têm rede por etapa: se algo falha, o `parecer.json`, a auditoria (com o
    evento `fim`) e o `resumo.json` existem mesmo assim, e o código de saída é 5.
"""

import itertools
import json
import time
import unittest
from unittest import mock

from agente_claude import parecer, tarefas
from agente_claude.parecer import (
    MAX_CHARS_CITACAO,
    MOTIVO_FUNDA,
    MOTIVO_LONGA,
    conferir_evidencia_com_motivo,
    profundidade_excede,
)
from tests.fakes import Cenario, ModeloFalso, resposta, resposta_parecer, uso

N1_EXATO = "buscar " + '{"a":' * 3000 + "1" + "}" * 3000  # a reprodução exata do revisor (18 008 caracteres)
N1_100K = "buscar " + '{"a":' * 100_000 + "1" + "}" * 100_000  # profundidade 100 000
N1_KV = "buscar padrao=" + "[" * 3000 + "]" * 3000  # 6 014 caracteres: só o teto de PROFUNDIDADE a recusa
N1_CURTA_FUNDA = "buscar " + '{"a":' * 1000 + "1" + "}" * 1000  # 6 008 caracteres, profundidade 1000
ARTEFATOS = {"auditoria.jsonl", "parecer.json", "parecer.md", "resumo.json"}


def achado(comando: str, saida: str = "x") -> dict:
    return {"gravidade": "nota", "escopo": "pre-existente", "arquivo": "src/a.ts", "linha": None,
            "evidencia": {"comando": comando, "saida": saida}, "motivo": "m"}


def citacao_longa_rasa() -> str:
    # > 8000 caracteres, rasa, com chaves distintas: só o teto de TAMANHO a recusa.
    chaves = ("".join(p) for p in itertools.product("abcdefghij", repeat=4))
    return "buscar " + " ".join(f"{k}=1" for k in itertools.islice(chaves, 1300))


class TestConferenciaNuncaLevanta(unittest.TestCase):
    def rodar(self, modelo) -> Cenario:
        cen = Cenario(modelo).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_n1_citacao_aninhada_nao_derruba_o_parecer(self):
        citacoes = [
            ('buscar {"padrao": "foo"}', True, "conferida"),  # controle: evidência verdadeira segue valendo
            (N1_EXATO, False, MOTIVO_LONGA),
            (N1_100K, False, MOTIVO_LONGA),
            (N1_KV, False, MOTIVO_FUNDA),
            (N1_CURTA_FUNDA, False, MOTIVO_FUNDA),
            (citacao_longa_rasa(), False, MOTIVO_LONGA),
        ]
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": "foo"})),
                              resposta_parecer(veredito="reprovado", achados=[achado(c) for c, _, _ in citacoes])])
        inicio = time.perf_counter()
        cen = self.rodar(modelo)
        self.assertLess(time.perf_counter() - inicio, 10)
        self.assertEqual(cen.codigo, 0)
        self.assertTrue(ARTEFATOS <= {p.name for p in cen.pasta.iterdir()})
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["veredito"], "reprovado")
        self.assertEqual(p["falhas_de_gravacao"], [])
        obtido = [(a["evidencia"]["conferida"], a["evidencia"]["motivo_conferencia"]) for a in p["achados"]]
        for (conferida, motivo), (_, esperado_ok, esperado_motivo) in zip(obtido, citacoes):
            self.assertIs(conferida, esperado_ok)
            self.assertTrue(motivo.startswith(esperado_motivo), motivo)
        self.assertEqual(cen.linhas_auditoria()[-1]["tipo"], "fim")
        self.assertIn("Conferência (gerado pelo script): não conferida", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))

    def test_qualquer_falha_na_conferencia_vira_false_com_motivo(self):
        eventos = [{"seq": 3, "ferramenta": "buscar", "args": {"padrao": "foo"}, "negado": False}]
        for comando in (None, 123, {"a": 1}, ["buscar"], "", "buscar {", N1_EXATO, N1_100K, N1_KV, N1_CURTA_FUNDA):
            ok, motivo = conferir_evidencia_com_motivo(comando, eventos)
            self.assertIs(ok, False, repr(comando)[:40])
            self.assertTrue(motivo.startswith("não conferida"), motivo)
        with mock.patch.object(parecer, "args_canonicos", side_effect=RecursionError("simulado")):
            ok, motivo = conferir_evidencia_com_motivo('buscar {"padrao": "foo"}', eventos)
        self.assertEqual((ok, motivo), (False, "não conferida: erro ao conferir (RecursionError)"))
        self.assertEqual(conferir_evidencia_com_motivo('buscar {"padrao": "foo"}', eventos)[0], True)

    def test_profundidade_medida_sem_parse_e_sem_recursao(self):
        inicio = time.perf_counter()
        self.assertTrue(profundidade_excede("[" * 1_000_000, 2))
        self.assertLess(time.perf_counter() - inicio, 2)
        self.assertFalse(profundidade_excede('{"caminhos": ["src", "a[b]"], "padrao": "[[[[{{{{"}', 2))
        self.assertFalse(profundidade_excede('{"p": "\\"[[[["}', 2))  # aspas escapadas não fecham a string
        self.assertTrue(profundidade_excede('{"a": [[1]]}', 2))
        self.assertEqual(MAX_CHARS_CITACAO, 8000)


class TestGravacaoAProvaDeFalha(unittest.TestCase):
    def rodar(self, **kw) -> Cenario:
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": "foo"})),
                              resposta_parecer(veredito="reprovado", achados=[achado('buscar {"padrao": "foo"}')])])
        cen = Cenario(modelo, **kw).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def conferir_fim(self, cen: Cenario, codigo: int) -> dict:
        fim = cen.linhas_auditoria()[-1]
        self.assertEqual(fim["tipo"], "fim")
        self.assertEqual(fim["codigo_saida"], codigo)
        resumo = json.loads((cen.pasta / "resumo.json").read_text(encoding="utf-8"))
        self.assertEqual(resumo["fim"]["codigo_saida"], codigo)
        return fim

    def test_md_falha_json_e_auditoria_gravados_e_codigo_5(self):
        with mock.patch.object(tarefas, "gravar_md", side_effect=RuntimeError("md quebrou")):
            cen = self.rodar()
        self.assertEqual(cen.codigo, 5)
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["veredito"], "reprovado")  # o parecer validado do modelo, inteiro
        self.assertTrue(p["achados"][0]["evidencia"]["conferida"])
        self.assertEqual(p["falhas_de_gravacao"], ["parecer.md: RuntimeError"])
        self.assertFalse((cen.pasta / "parecer.md").exists())
        self.assertEqual(self.conferir_fim(cen, 5)["falhas_de_gravacao"], ["parecer.md: RuntimeError"])
        self.assertIn("parecer.md", (cen.pasta / "erro.txt").read_text(encoding="utf-8"))

    def test_montagem_falha_parecer_de_emergencia_com_o_do_modelo_cru(self):
        with mock.patch.object(tarefas, "montar", side_effect=RecursionError("simulado")):
            cen = self.rodar()
        self.assertEqual(cen.codigo, 5)
        self.assertTrue(ARTEFATOS <= {p.name for p in cen.pasta.iterdir()})
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertTrue(p["parcial"])
        self.assertEqual(p["motivo_parcial"], "falha_na_montagem:RecursionError")
        self.assertEqual(p["parecer_do_modelo_sem_montagem"]["veredito"], "reprovado")
        self.assertEqual(p["falhas_de_gravacao"], ["montagem do parecer: RecursionError"])
        self.assertTrue(p["conta"]["request_ids"])  # a prova de cobrança (do script) sobrevive
        self.conferir_fim(cen, 5)
        self.assertIn("não pôde ser montado", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))

    def test_json_falha_uma_vez_grava_o_de_emergencia(self):
        real = tarefas.gravar_json
        chamadas = []

        def falha_na_primeira(p, pasta, redator):
            chamadas.append(p.get("veredito"))
            if len(chamadas) == 1:
                raise OSError("disco")
            return real(p, pasta, redator)

        with mock.patch.object(tarefas, "gravar_json", side_effect=falha_na_primeira):
            cen = self.rodar()
        self.assertEqual(cen.codigo, 5)
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["motivo_parcial"], "falha_na_gravacao_do_parecer_json")
        self.assertEqual(p["falhas_de_gravacao"], ["parecer.json: OSError", "parecer.json: gravado o de emergência"])
        self.assertTrue((cen.pasta / "parecer.md").exists())
        self.conferir_fim(cen, 5)

    def test_json_sempre_falha_ainda_ha_md_auditoria_resumo_e_erro(self):
        with mock.patch.object(tarefas, "gravar_json", side_effect=OSError("disco cheio")):
            cen = self.rodar()
        self.assertEqual(cen.codigo, 5)
        nomes = {p.name for p in cen.pasta.iterdir()}
        self.assertTrue({"parecer.md", "auditoria.jsonl", "resumo.json", "erro.txt"} <= nomes, nomes)
        fim = self.conferir_fim(cen, 5)
        self.assertIn("parecer.json: OSError", fim["falhas_de_gravacao"])
        self.assertIn("parecer.json de emergência: OSError", fim["falhas_de_gravacao"])

    def test_surrogate_solto_do_modelo_nao_derruba_os_artefatos(self):
        # Irmão do N1 medido nos ajustes: "\ud800" no texto do modelo levantava UnicodeEncodeError e a
        # pasta ficava só com auditoria.jsonl e parecer.json.tmp.
        solto = "x\ud800y"
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": solto})),
                              resposta_parecer(resumo=solto, achados=[achado("ler_arquivo " + solto, saida=solto)])])
        cen = Cenario(modelo).rodar()
        self.addCleanup(cen.limpar)
        self.assertEqual(cen.codigo, 0)
        self.assertTrue(ARTEFATOS <= {p.name for p in cen.pasta.iterdir()})
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["resumo"], solto)  # escape JSON válido: volta igual
        self.assertEqual(p["falhas_de_gravacao"], [])
        self.assertIn("\\ud800", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))
        buscas = [l for l in cen.linhas_auditoria() if l.get("ferramenta") == "buscar"]
        self.assertEqual(buscas[0]["args"]["padrao"], solto)


if __name__ == "__main__":
    unittest.main()
