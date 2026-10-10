"""Cerca 4 — segredos: redação por padrão em tudo o que sai (plano §3.4).

Todos os valores falsos são montados por concatenação: nenhum literal que um
scanner de segredo (push protection do GitHub) reconheça entra no repositório.
"""

import os
import unittest
from unittest import mock

from agente_claude.modelo import ErroDeModelo
from agente_claude.redacao import Redator
from tests.fakes import CHAVE_FALSA, CHAVE_FALSA_2, Cenario, ExecutorFalso, ModeloFalso, resposta, resposta_parecer, uso

AWS_ID = "AK" + "IA" + "Q" * 16
AWS_SECRET = "w" * 20 + "X" * 20
GH_TOKEN = "gh" + "p_" + "a" * 36
GH_PAT = "github" + "_pat_" + "b" * 30
GOOGLE = "AI" + "za" + "c" * 35
JWT = "ey" + "J" + "a" * 10 + "." + "b" * 12 + "." + "c" * 14
PEM = "-----BEGIN " + "RSA PRIVATE KEY-----\nMIIEow" + "x" * 30 + "\n-----END " + "RSA PRIVATE KEY-----"


class TestPadroes(unittest.TestCase):
    def setUp(self) -> None:
        self.r = Redator()

    def test_chave_anthropic_exata_e_por_padrao(self):
        exato = Redator([(CHAVE_FALSA, "chave")])
        self.assertEqual(exato.redigir(f"x {CHAVE_FALSA} y"), "x [REDIGIDO:chave] y")
        for chave in (CHAVE_FALSA, CHAVE_FALSA_2, "sk-ant-" + "admin01-" + "k" * 30):
            saida = self.r.redigir(f"Authorization: {chave}")
            self.assertNotIn(chave, saida)
            self.assertIn("[REDIGIDO:anthropic]", saida)

    def test_aws_id_e_secret(self):
        saida = self.r.redigir(f"id={AWS_ID}\naws_secret_access_key = {AWS_SECRET}\nAWS_SECRET_ACCESS_KEY:{AWS_SECRET}")
        self.assertNotIn(AWS_ID, saida)
        self.assertNotIn(AWS_SECRET, saida)
        self.assertIn("aws_secret_access_key = [REDIGIDO:aws]", saida)

    def test_github_tokens(self):
        saida = self.r.redigir(f"{GH_TOKEN} e {GH_PAT}")
        self.assertNotIn(GH_TOKEN, saida)
        self.assertNotIn(GH_PAT, saida)

    def test_google_key(self):
        self.assertNotIn(GOOGLE, self.r.redigir(f"key={GOOGLE}"))

    def test_url_com_senha_preserva_usuario(self):
        url = "postgresql://" + "usuario:" + "senha" + "MuitoSecreta" + "@host:5432/db"
        self.assertEqual(self.r.redigir(url), "postgresql://usuario:[REDIGIDO]@host:5432/db")
        self.assertEqual(self.r.redigir("https://example.com:8443/x"), "https://example.com:8443/x")

    def test_bloco_pem_inteiro(self):
        saida = self.r.redigir(f"antes\n{PEM}\ndepois")
        self.assertEqual(saida, "antes\n[REDIGIDO:chave-privada]\ndepois")

    def test_bloco_pem_truncado_redigido_ate_o_fim(self):
        cortado = PEM.split("-----END")[0]  # saída truncada pode cortar o END
        self.assertEqual(self.r.redigir("x\n" + cortado), "x\n[REDIGIDO:chave-privada]")

    def test_jwt(self):
        self.assertNotIn(JWT, self.r.redigir(f"Bearer {JWT}"))

    def test_atribuicao_generica_redige_so_valor(self):
        self.assertEqual(self.r.redigir("api_key=" + "Z" * 20), "api_key=[REDIGIDO]")
        self.assertEqual(self.r.redigir("senha: '" + "abcdefghij" + "klmnop1234'"), "senha: '[REDIGIDO]'")
        self.assertEqual(self.r.redigir("CLIENT_SECRET=" + "q" * 24), "CLIENT_SECRET=[REDIGIDO]")

    def test_url_com_senha_redigida_com_esquema_colado(self):
        # A6: o esquema limitado a 32 caracteres não pode perder senha quando o esquema vem colado a
        # outro texto (o lookbehind, alternativa medida, perdia estes dois primeiros casos).
        for prefixo in ("conn: -", "1", "x" * 40, "a.b."):
            saida = self.r.redigir(prefixo + "postgresql://" + "u:" + "senha" + "Secreta1@h/db")
            self.assertNotIn("senhaSecreta1", saida, prefixo)
            self.assertIn("u:[REDIGIDO]@h/db", saida, prefixo)

    def test_redacao_linear_em_texto_hostil(self):
        # A6 (medido pelo revisor): "y"*16000 levava 1 s e 256 KB ~4 min (padrão de URL quadrático).
        import time

        for hostil in ("y" * 65_536, "a1" * 32_768, "ab-" * 21_845, "a://" * 16_384, "a://" + "u:" * 32_000):
            inicio = time.perf_counter()
            self.r.redigir(hostil)
            self.assertLess(time.perf_counter() - inicio, 1.0, hostil[:8])

    def test_texto_sem_segredo_intacto(self):
        texto = (
            "const akiaTokenizerFactory = 1; // identificador legítimo\n"
            "token = curto\nsk-ant curto\nhttps://example.com/caminho?x=1\n"
            "SELECT * FROM work_orders WHERE tenant_id = $1;\n"
        )
        self.assertEqual(self.r.redigir(texto), texto)
        uma = self.r.redigir(f"{CHAVE_FALSA} {PEM} {AWS_ID}")
        self.assertEqual(self.r.redigir(uma), uma)  # idempotente


class TestRedacaoNasSaidas(unittest.TestCase):
    def rodar(self, modelo, **kw) -> Cenario:
        cen = Cenario(modelo, **kw).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_tool_result_passa_pelo_redator(self):
        saida = f"config: {CHAVE_FALSA_2}\nid {AWS_ID}\n"
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": "chave"})), resposta_parecer()])
        cen = self.rodar(modelo, executor=ExecutorFalso(saida=saida))
        resultado = modelo.chamadas[1]["messages"][-1]["content"][0]["content"]
        self.assertNotIn(CHAVE_FALSA_2, resultado)
        self.assertNotIn(AWS_ID, resultado)
        self.assertIn("[REDIGIDO:anthropic]", resultado)
        self.assertNotIn(CHAVE_FALSA_2, cen.texto_saida())

    def test_auditoria_redigida(self):
        modelo = ModeloFalso([resposta(uso("buscar", {"padrao": GH_TOKEN})), resposta_parecer(resumo=f"vi {CHAVE_FALSA}")])
        cen = self.rodar(modelo)
        bruto = (cen.pasta / "auditoria.jsonl").read_text(encoding="utf-8")
        self.assertNotIn(GH_TOKEN, bruto)
        self.assertNotIn(CHAVE_FALSA, bruto)
        self.assertIn("[REDIGIDO", bruto)

    def test_parecer_redigido(self):
        achado = {
            "gravidade": "bloqueia", "escopo": "dentro-do-bloco", "arquivo": "src/x.ts", "linha": 3,
            "evidencia": {"comando": "ler_arquivo src/x.ts", "saida": f"const k = '{CHAVE_FALSA}';\n{PEM}"},
            "motivo": "chave no código",
        }
        modelo = ModeloFalso([resposta_parecer(veredito="reprovado", achados=[achado])])
        cen = self.rodar(modelo)
        for nome in ("parecer.json", "parecer.md", "resumo.json", "auditoria.jsonl"):
            conteudo = (cen.pasta / nome).read_text(encoding="utf-8")
            self.assertNotIn(CHAVE_FALSA, conteudo, nome)
            self.assertNotIn("MIIEow", conteudo, nome)

    def test_excecao_do_sdk_redigida(self):
        erro = ErroDeModelo("AuthenticationError", status=401, tipo="authentication_error", request_id="req_x",
                            mensagem=f"invalid x-api-key {CHAVE_FALSA}")
        cen = self.rodar(ModeloFalso([erro]))
        self.assertEqual(cen.codigo, 4)
        texto = (cen.pasta / "erro.txt").read_text(encoding="utf-8")
        self.assertIn("AuthenticationError", texto)
        self.assertNotIn(CHAVE_FALSA, texto)
        cen5 = self.rodar(ModeloFalso([RuntimeError(f"quebrou com {CHAVE_FALSA}")]))
        self.assertEqual(cen5.codigo, 5)
        self.assertNotIn(CHAVE_FALSA, (cen5.pasta / "erro.txt").read_text(encoding="utf-8"))
        self.assertNotIn(CHAVE_FALSA, cen5.texto_saida())

    def test_chave_nunca_em_argv_nem_env(self):
        usos = [
            uso("buscar", {"padrao": "x"}),
            uso("git_log", {"max_entradas": 3}),
            uso("gh_pr_view", {"numero": "416"}),
            uso("verificar", {"nome": "diff_check"}),
        ]
        modelo = ModeloFalso([resposta(*usos), resposta_parecer()])
        with mock.patch.dict(os.environ, {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA}):
            cen = self.rodar(modelo)
        self.assertEqual(len(cen.executor.chamadas), 4)
        for chamada in cen.executor.chamadas:
            self.assertNotIn(CHAVE_FALSA, " ".join(chamada["argv"]))
            self.assertNotIn(CHAVE_FALSA, " ".join(chamada["env"].values()))
            self.assertNotIn("ERP_AGENTE_ANTHROPIC_KEY", chamada["env"])


if __name__ == "__main__":
    unittest.main()
