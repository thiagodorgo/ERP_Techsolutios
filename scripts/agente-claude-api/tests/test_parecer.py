"""Cerca 8 — saída estruturada `entregar_parecer` e os desfechos do laço (plano §3.8)."""

import json
import unittest

from agente_claude import esquemas
from agente_claude.prompts import MENSAGEM_REPROMPT_PARECER
from tests.fakes import Cenario, ExecutorFalso, ModeloFalso, parecer_valido, resposta, resposta_parecer, texto, uso

PROIBIDAS_NO_STRICT = {"minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
                       "multipleOf", "minItems", "maxItems", "uniqueItems", "pattern"}


def nos_de_schema(no, caminho="$"):
    if isinstance(no, dict):
        yield caminho, no
        for k, v in no.items():
            yield from nos_de_schema(v, f"{caminho}.{k}")
    elif isinstance(no, list):
        for i, v in enumerate(no):
            yield from nos_de_schema(v, f"{caminho}[{i}]")


class TestEsquema(unittest.TestCase):
    def test_schema_strict_e_additional_properties_false_em_todo_objeto(self):
        objetos = 0
        for f in esquemas.ferramentas():
            self.assertIs(f["strict"], True, f["name"])
            self.assertTrue(f["description"])
            for caminho, no in nos_de_schema(f["input_schema"], f["name"]):
                self.assertFalse(PROIBIDAS_NO_STRICT & set(no), caminho)
                if no.get("type") == "object":
                    objetos += 1
                    self.assertIs(no.get("additionalProperties"), False, caminho)
                    self.assertEqual(sorted(no["required"]), sorted(no["properties"]), caminho)
        self.assertGreaterEqual(objetos, 14)

    def test_ordem_das_ferramentas_e_fixa_e_entregar_e_a_ultima(self):
        esperado = ("ler_arquivo", "listar_diretorio", "buscar", "git_log", "git_show", "git_diff", "git_ls_files",
                    "gh_pr_view", "gh_pr_diff", "gh_pr_checks", "verificar", "entregar_parecer")
        self.assertEqual(tuple(f["name"] for f in esquemas.ferramentas()), esperado)
        self.assertEqual(esquemas.serializar(esquemas.ferramentas()), esquemas.serializar(esquemas.ferramentas()))


class TestDesfechos(unittest.TestCase):
    def rodar(self, modelo, **kw) -> Cenario:
        cen = Cenario(modelo, **kw).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_parecer_valido_grava_json_e_md(self):
        cen = self.rodar(ModeloFalso([resposta_parecer(veredito="aprovado_com_ressalvas", limitacoes=["sem CI"])]))
        self.assertEqual(cen.codigo, 0)
        p = json.loads((cen.pasta / "parecer.json").read_text(encoding="utf-8"))
        self.assertEqual(p["versao_schema"], "agente-claude-api.parecer@2026-10-10.v1")
        self.assertEqual(p["veredito"], "aprovado_com_ressalvas")
        self.assertFalse(p["parcial"])
        self.assertIn("aprovado_com_ressalvas", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))

    def test_parecer_invalido_volta_is_error_e_modelo_tenta_de_novo(self):
        achado_ruim = {"gravidade": "grave", "escopo": "dentro-do-bloco", "arquivo": "a", "linha": 1,
                       "evidencia": {"comando": "c", "saida": "s"}, "motivo": "m"}
        achado_linha_texto = dict(achado_ruim, gravidade="ajuste", linha="12")
        modelo = ModeloFalso([
            resposta(uso("entregar_parecer", dict(parecer_valido(), extra="x"))),
            resposta(uso("entregar_parecer", parecer_valido(achados=[achado_ruim]))),
            resposta(uso("entregar_parecer", parecer_valido(achados=[achado_linha_texto]))),
            resposta_parecer(),
        ])
        cen = self.rodar(modelo)
        self.assertEqual(len(modelo.chamadas), 4)
        for n in (1, 2, 3):
            resultado = modelo.chamadas[n]["messages"][-1]["content"][0]
            self.assertTrue(resultado["is_error"])
            self.assertIn("parecer inválido", resultado["content"])
        self.assertEqual(cen.codigo, 0)
        self.assertFalse(cen.parecer["parcial"])

    def test_sem_entregar_parecer_reprompt_uma_vez_depois_parcial(self):
        modelo = ModeloFalso([resposta(texto("acho que está ok"), stop="end_turn"),
                              resposta(texto("de fato está ok"), stop="end_turn")],
                             padrao=resposta_parecer())
        cen = self.rodar(modelo)
        self.assertEqual(len(modelo.chamadas), 2)
        self.assertEqual(modelo.chamadas[1]["messages"][-1], {"role": "user", "content": MENSAGEM_REPROMPT_PARECER})
        self.assertTrue(cen.parecer["parcial"])
        self.assertEqual(cen.parecer["motivo_parcial"], "sem_entregar_parecer")
        self.assertEqual(cen.parecer["veredito"], "inconclusivo")
        self.assertEqual(cen.parecer["resumo"], "de fato está ok")

    def test_comandos_executados_vem_da_auditoria_nao_do_modelo(self):
        modelo = ModeloFalso([resposta(uso("git_ls_files", {"caminhos": []})),
                              resposta_parecer(comandos_executados=["rm -rf /", "git push origin main"])])
        cen = self.rodar(modelo)
        self.assertEqual([c["ferramenta"] for c in cen.parecer["comandos_executados"]], ["git_ls_files"])
        self.assertEqual(cen.parecer["comandos_declarados_pelo_modelo"], ["rm -rf /", "git push origin main"])
        self.assertTrue(all(c["argv"] for c in cen.parecer["comandos_executados"]))

    def test_evidencia_conferida(self):
        achado = lambda comando: {"gravidade": "nota", "escopo": "pre-existente", "arquivo": "src/a.ts", "linha": None,
                                  "evidencia": {"comando": comando, "saida": "x"}, "motivo": "m"}
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": "tenant_id"})),
                              resposta_parecer(achados=[achado("buscar tenant_id"), achado("npm test -- tudo")])])
        cen = self.rodar(modelo)
        conferidas = [a["evidencia"]["conferida"] for a in cen.parecer["achados"]]
        self.assertEqual(conferidas, [True, False])

    def test_refusal_nao_executa_ferramentas(self):
        modelo = ModeloFalso([resposta(uso("git_ls_files", {}), stop="refusal", detalhes={"category": "cyber", "explanation": "x"})],
                             padrao=resposta_parecer())
        cen = self.rodar(modelo)
        self.assertEqual(cen.executor.chamadas, [])
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.parecer["motivo_parcial"], "refusal:cyber")

    def test_max_tokens_com_tool_use_nao_executa(self):
        cortada = lambda: resposta(uso("git_ls_files", {"caminhos": ["sr"]}), stop="max_tokens")
        modelo = ModeloFalso([cortada(), cortada()], padrao=resposta_parecer())
        cen = self.rodar(modelo)
        self.assertEqual(cen.executor.chamadas, [])
        self.assertEqual(len(modelo.chamadas), 2)
        repedido = modelo.chamadas[1]["messages"][-1]["content"]
        self.assertTrue(repedido[0]["is_error"])
        self.assertEqual(repedido[-1]["type"], "text")
        self.assertEqual(cen.parecer["motivo_parcial"], "max_tokens_com_tool_use")

    def test_pause_turn_inesperado_vira_parcial(self):
        cen = self.rodar(ModeloFalso([resposta(texto("..."), stop="pause_turn")], padrao=resposta_parecer()))
        self.assertEqual(cen.parecer["motivo_parcial"], "pause_turn_inesperado")
        self.assertEqual(cen.codigo, 2)

    def test_fim_de_contexto_vira_parcial(self):
        cen = self.rodar(ModeloFalso([resposta(uso("git_ls_files", {}), stop="model_context_window_exceeded")], padrao=resposta_parecer()))
        self.assertEqual(cen.parecer["motivo_parcial"], "model_context_window_exceeded")
        self.assertEqual(cen.executor.chamadas, [])

    def test_tool_choice_nunca_forcado(self):
        modelo = ModeloFalso([resposta(uso("git_ls_files", {})), resposta(texto("x"), stop="end_turn"), resposta_parecer()])
        self.rodar(modelo)
        self.assertEqual(len(modelo.chamadas), 3)
        for pedido in modelo.chamadas:
            self.assertIn(pedido.get("tool_choice", {"type": "auto"}), ({"type": "auto"},))

    def test_md_legivel_tem_veredito_custo_e_conta(self):
        achado = {"gravidade": "bloqueia", "escopo": "dentro-do-bloco", "arquivo": "src/x.ts", "linha": 9,
                  "evidencia": {"comando": "ler_arquivo src/x.ts", "saida": "linha 9"}, "motivo": "quebra permissão"}
        cen = self.rodar(ModeloFalso([resposta_parecer(veredito="reprovado", achados=[achado])]))
        md = (cen.pasta / "parecer.md").read_text(encoding="utf-8")
        for trecho in ("**Veredito:** reprovado", "## Custo", "US$ estimado", "## Conta e cobrança", "request_ids",
                       "[bloqueia] [dentro-do-bloco] src/x.ts:9", "## Comandos executados"):
            self.assertIn(trecho, md)

    def test_historico_append_only(self):
        r1 = resposta({"type": "thinking", "thinking": "", "signature": "assinatura-opaca"}, texto("vou listar"),
                      uso("git_ls_files", {}))
        modelo = ModeloFalso([r1, resposta_parecer()])
        self.rodar(modelo)
        devolvido = modelo.chamadas[1]["messages"][1]
        self.assertEqual(devolvido, {"role": "assistant", "content": r1.content})


if __name__ == "__main__":
    unittest.main()
