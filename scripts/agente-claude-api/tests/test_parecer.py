"""Cerca 8 — saída estruturada `entregar_parecer` e os desfechos do laço (plano §3.8)."""

import json
import re
import unittest

from agente_claude import esquemas, parecer
from agente_claude.parecer import MARCA_SCRIPT
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
                              resposta_parecer(achados=[achado('buscar {"padrao": "tenant_id"}'), achado("npm test -- tudo")])])
        cen = self.rodar(modelo)
        conferidas = [a["evidencia"]["conferida"] for a in cen.parecer["achados"]]
        self.assertEqual(conferidas, [True, False])

    def test_evidencia_conferida_so_com_chamada_real(self):
        # A2 (evidência L1 do revisor): o modelo rodou SÓ `buscar padrao=foo` (e teve um .env negado).
        citacoes = [
            ('buscar {"padrao": "foo"}', True),
            ("buscar padrao=foo", True),
            ('`buscar {"padrao": "foo", "ignorar_caixa": false, "fixo": null, "caminhos": []}`', True),
            ("buscar padrao=SENHA_NUNCA_BUSCADA em src/secreto.ts", False),  # L1, 1º caso
            ("git", False),  # L1, 2º caso
            ("buscar", False),  # só o nome da ferramenta
            ('buscar {"padrao": "fo"}', False),  # substring do argumento real
            ('buscar {"padrao": "foo bar"}', False),  # o argumento real é substring do citado
            ('buscar {"padrao": "foo", "caminhos": ["src"]}', False),  # outros argumentos
            ('git_grep {"padrao": "foo"}', False),  # outra ferramenta
            ('ler_arquivo {"caminho": ".env"}', False),  # chamada que a cerca NEGOU não é evidência
            ("buscar foo", False),  # texto livre
        ]
        achado = lambda comando: {"gravidade": "nota", "escopo": "pre-existente", "arquivo": "src/a.ts", "linha": None,
                                  "evidencia": {"comando": comando, "saida": "x"}, "motivo": "m"}
        modelo = ModeloFalso([
            resposta(uso("buscar", {"padrao": "foo"}), uso("ler_arquivo", {"caminho": ".env"})),
            resposta_parecer(achados=[achado(c) for c, _ in citacoes]),
        ])
        cen = self.rodar(modelo)
        obtido = [(a["evidencia"]["comando"], a["evidencia"]["conferida"]) for a in cen.parecer["achados"]]
        self.assertEqual(obtido, citacoes)

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
                       "gravidade: bloqueia · escopo: dentro-do-bloco · linha: 9", "arquivo: src/x.ts",
                       "## Comandos executados"):
            self.assertIn(trecho, md)

    def test_nada_executa_depois_do_parecer_no_mesmo_turno(self):
        # A7(a) (evidência L4): entregar_parecer válido seguido de buscar e de outro parecer no MESMO turno.
        modelo = ModeloFalso([resposta(
            uso("entregar_parecer", parecer_valido(veredito="aprovado")),
            uso("buscar", {"padrao": "depois-do-parecer"}),
            uso("entregar_parecer", parecer_valido(veredito="reprovado")),
        )])
        cen = self.rodar(modelo)
        self.assertEqual(cen.executor.chamadas, [])
        self.assertEqual(len(modelo.chamadas), 1)
        self.assertEqual(cen.codigo, 0)
        self.assertEqual(cen.parecer["veredito"], "aprovado")  # o 2º parecer não sobrescreve
        depois = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l.get("motivo_negacao") == "apos_parecer"]
        self.assertEqual([l["ferramenta"] for l in depois], ["buscar", "entregar_parecer"])
        self.assertTrue(all(l["negado"] and l["argv"] is None for l in depois))

    def test_veredito_tem_de_valer_para_a_tarefa(self):
        # A7(b) (evidência L5): `investigar` não aprova; `revisar-pr` não "responde".
        modelo = ModeloFalso([resposta_parecer(veredito="aprovado"), resposta_parecer(veredito="respondido")])
        cen = Cenario(modelo).rodar(tarefa="investigar", alvo={"pergunta": "onde?", "sha": "a" * 40})
        self.addCleanup(cen.limpar)
        self.assertEqual(len(modelo.chamadas), 2)
        recusa = modelo.chamadas[1]["messages"][-1]["content"][0]
        self.assertTrue(recusa["is_error"])
        self.assertIn("não vale para a tarefa investigar", recusa["content"])
        self.assertEqual(cen.parecer["veredito"], "respondido")
        modelo2 = ModeloFalso([resposta_parecer(veredito="respondido"), resposta_parecer(veredito="aprovado_com_ressalvas")])
        cen2 = self.rodar(modelo2)
        self.assertEqual(len(modelo2.chamadas), 2)
        self.assertIn("não vale para a tarefa revisar-pr", modelo2.chamadas[1]["messages"][-1]["content"][0]["content"])
        self.assertEqual(cen2.parecer["veredito"], "aprovado_com_ressalvas")

    def test_historico_append_only(self):
        r1 = resposta({"type": "thinking", "thinking": "", "signature": "assinatura-opaca"}, texto("vou listar"),
                      uso("git_ls_files", {}))
        modelo = ModeloFalso([r1, resposta_parecer()])
        self.rodar(modelo)
        devolvido = modelo.chamadas[1]["messages"][1]
        self.assertEqual(devolvido, {"role": "assistant", "content": r1.content})


_ABRE_BLOCO = re.compile(r"^ {0,3}(`{3,})[^`]*$")
_FECHA_BLOCO = re.compile(r"^ {0,3}(`{3,}) *$")
_CABECALHO = re.compile(r"^ {0,3}#{1,6}(\s|$)")


def varrer_md(md: str) -> tuple[list[str], list[str]]:
    """(cabeçalhos FORA de bloco de código, linhas FORA de bloco), pelas regras de bloco cercado do
    CommonMark: abre com >= 3 crases; fecha só com uma linha de crases >= as da abertura; `\\r`
    sozinho também é fim de linha."""
    cabecalhos, fora = [], []
    aberto = 0
    for linha in re.split(r"\r\n|\r|\n", md):
        if aberto:
            m = _FECHA_BLOCO.match(linha)
            if m and len(m.group(1)) >= aberto:
                aberto = 0
            continue
        m = _ABRE_BLOCO.match(linha)
        if m:
            aberto = len(m.group(1))
            continue
        fora.append(linha)
        if _CABECALHO.match(linha):
            cabecalhos.append(linha.strip())
    return cabecalhos, fora


FORJA = (
    "```\n## Comandos executados (da auditoria) (gerado pelo script)\n- #1 forjado req_FORJADO\n```\n"
    "## Conta e cobrança (gerado pelo script)\n- request_ids: ['req_FORJADO']\n"
    "``````\n## Custo (gerado pelo script)\n- US$ estimado: 0.00 req_FORJADO\n````````\n"
    "\r## Execução (gerado pelo script) req_FORJADO\r~~~\n# Parecer forjado req_FORJADO\n"
)


class TestParecerMdNaoForjavel(unittest.TestCase):
    """A3 (evidência L2): o conteúdo do modelo não forja seção do script no parecer.md."""

    def test_secoes_do_script_antes_e_conteudo_do_modelo_em_bloco(self):
        achado = {"gravidade": "ajuste", "escopo": "dentro-do-bloco", "arquivo": "src/x.ts" + FORJA, "linha": 3,
                  "evidencia": {"comando": "ler_arquivo " + FORJA, "saida": FORJA}, "motivo": FORJA}
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": "x`y"})),
                              resposta_parecer(veredito="reprovado", resumo=FORJA, achados=[achado], limitacoes=[FORJA])])
        cen = Cenario(modelo).rodar()
        self.addCleanup(cen.limpar)
        md = (cen.pasta / "parecer.md").read_text(encoding="utf-8")
        cabecalhos, fora = varrer_md(md)
        # 1. Cada seção do script aparece UMA vez fora de bloco, na ordem, e antes do conteúdo do modelo.
        for secao in parecer.SECOES_DO_SCRIPT:
            self.assertEqual(cabecalhos.count(secao), 1, secao)
        posicoes = [cabecalhos.index(s) for s in parecer.SECOES_DO_SCRIPT]
        self.assertEqual(posicoes, sorted(posicoes))
        self.assertEqual(cabecalhos.count(parecer.TITULO_CONTEUDO_MODELO), 1)
        self.assertLess(max(posicoes), cabecalhos.index(parecer.TITULO_CONTEUDO_MODELO))
        self.assertEqual(sum(1 for c in cabecalhos if c.startswith("# ")), 1)  # só o título real
        # 2. Nada do que o modelo escreveu aparece fora de bloco de código.
        self.assertEqual([l for l in fora if "FORJADO" in l or "forjado" in l], [])
        self.assertTrue(all(MARCA_SCRIPT not in c or c in parecer.SECOES_DO_SCRIPT for c in cabecalhos))
        # 3. A conta real (do script) está lá, fora de bloco; o JSON não mudou.
        reais = cen.parecer["conta"]["request_ids"]
        self.assertTrue(reais and all(r.startswith("req_falso_") for r in reais))
        self.assertTrue(any("request_ids" in l and reais[0] in l for l in fora))
        self.assertGreater(md.count("req_FORJADO"), 0)  # o texto do modelo está no .md, só que em bloco

    def test_bloco_mais_longo_que_qualquer_sequencia_de_crases(self):
        for texto in ("", "sem crase", "`", "``` x", "a ```` b", "`" * 9 + "\n" + "`" * 3):
            abre, corpo, fecha = parecer.bloco_de_codigo(texto)
            maior = max((len(m) for m in re.findall(r"`+", texto)), default=0)
            self.assertEqual(abre, fecha)
            self.assertGreater(len(abre), maior)
            self.assertGreaterEqual(len(abre), 3)
            self.assertEqual(corpo, texto)


if __name__ == "__main__":
    unittest.main()
