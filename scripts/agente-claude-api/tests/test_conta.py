"""Cerca 7 — conta e modelo (plano §3.7, §4). Nenhum teste lê o registro real nem chama a API."""

import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from agente_claude import cli
from agente_claude.conta import ContaRecusada, carregar_credenciais
from agente_claude.modelo import MODELO, ErroDeModelo, ModeloAnthropic, montar_pedido, opcoes_cliente
from tests.fakes import (
    CHAVE_FALSA,
    CHAVE_FALSA_2,
    WORKSPACE_FALSO,
    Cenario,
    ExecutorRepoFalso,
    ModeloFalso,
    credenciais,
    deps_repo_falso,
    resposta,
    resposta_parecer,
    uso,
)

SEM_REGISTRO = staticmethod(lambda nome: None)


def registro(valores: dict):
    return lambda nome: valores.get(nome)


class TestCarregar(unittest.TestCase):
    def test_chave_do_processo_vence_registro(self):
        env = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2}
        c = carregar_credenciais(env, registro({"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO}))
        self.assertEqual(c.chave, CHAVE_FALSA_2)
        self.assertEqual(c.origem_chave, "processo")
        self.assertEqual(c.tipo_chave, "workspace_ou_api")

    def test_chave_do_registro_quando_processo_vazio(self):
        import winreg

        valores = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO}
        consultas = []

        def query(chave, nome):
            consultas.append(nome)
            if nome not in valores:
                raise FileNotFoundError(nome)
            return valores[nome], winreg.REG_SZ

        with mock.patch("winreg.OpenKey", lambda *a, **k: contextlib.nullcontext("hkcu")), \
             mock.patch("winreg.QueryValueEx", query):
            c = carregar_credenciais({"ERP_AGENTE_ANTHROPIC_KEY": ""})  # leitor PADRÃO, winreg falso
        self.assertEqual(c.origem_chave, "registro")
        self.assertEqual(c.chave, CHAVE_FALSA)
        self.assertEqual(c.workspace_id, WORKSPACE_FALSO)
        self.assertEqual(consultas, ["ERP_AGENTE_ANTHROPIC_KEY", "ERP_AGENTE_ANTHROPIC_WORKSPACE"])

    def test_anthropic_api_key_ignorada_mesmo_presente(self):
        env = {"ANTHROPIC_API_KEY": CHAVE_FALSA_2}
        with self.assertRaises(ContaRecusada) as c:
            carregar_credenciais(env, lambda n: None)
        self.assertIn("ERP_AGENTE_ANTHROPIC_KEY ausente", str(c.exception))
        self.assertNotIn("ANTHROPIC_API_KEY", env)
        self.assertNotIn(CHAVE_FALSA_2, str(c.exception))

    def test_auth_token_e_log_removidos_do_environ(self):
        env = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2, "ANTHROPIC_AUTH_TOKEN": "tok-" + "x" * 20,
               "ANTHROPIC_LOG": "debug", "ANTHROPIC_API_KEY": CHAVE_FALSA}
        c = carregar_credenciais(env, lambda n: None)
        for nome in ("ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_LOG", "ANTHROPIC_API_KEY"):
            self.assertNotIn(nome, env)
            self.assertIn(nome, c.ignoradas)
        self.assertNotIn(CHAVE_FALSA, str(c.resumo()))
        self.assertNotIn(CHAVE_FALSA_2, repr(c))

    def test_custom_headers_removido_do_environ(self):
        # Achado A1 do dev: ANTHROPIC_CUSTOM_HEADERS troca o x-api-key explícito (SDK _client.py l.244-251).
        env = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2, "ANTHROPIC_CUSTOM_HEADERS": "x-api-key: outra",
               "ANTHROPIC_PROFILE": "p", "ANTHROPIC_WORKSPACE_ID": "w", "anthropic_config_dir": "c"}
        c = carregar_credenciais(env, lambda n: None)
        self.assertEqual([k for k in env if k.upper().startswith("ANTHROPIC_")], [])
        self.assertIn("ANTHROPIC_CUSTOM_HEADERS", c.ignoradas)

    def test_usuario_com_workspace_manda_cabecalho(self):
        c = carregar_credenciais({"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO}, lambda n: None)
        self.assertEqual(c.tipo_chave, "usuario")
        op = opcoes_cliente(c)
        self.assertEqual(op["default_headers"], {"anthropic-workspace-id": WORKSPACE_FALSO})
        self.assertEqual(op["base_url"], "https://api.anthropic.com")
        self.assertEqual(op["max_retries"], 2)
        self.assertEqual(op["api_key"], CHAVE_FALSA)

    def test_workspace_dispensa_cabecalho(self):
        c = carregar_credenciais({"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2}, lambda n: None)
        self.assertNotIn("default_headers", opcoes_cliente(c))
        self.assertFalse(c.cabecalho_workspace)

    def test_base_url_outro_host_recusada(self):
        for url in ("http://api.anthropic.com", "https://api.anthropic.com.evil.tld", "https://proxy.local",
                    "https://api.anthropic.com:8443", "https://u:p@api.anthropic.com", "https://api.anthropic.com/v2/x",
                    "https://evil.tld/api.anthropic.com", "https://api.anthropic.com?x=1", "ftp://api.anthropic.com"):
            env = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2, "ANTHROPIC_BASE_URL": url}
            with self.assertRaises(ContaRecusada, msg=url):
                carregar_credenciais(env, lambda n: None)

    def test_base_url_canonica_aceita(self):
        for url in ("https://api.anthropic.com", "https://api.anthropic.com/", ""):
            env = {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA_2, "ANTHROPIC_BASE_URL": url}
            c = carregar_credenciais(env, lambda n: None)
            self.assertEqual(c.base_url, "https://api.anthropic.com")
            self.assertNotIn("ANTHROPIC_BASE_URL", env)

    def test_chave_formato_inesperado_recusada(self):
        for chave in ("abc", "sk-ant-x", "sk-ant-" + "a b c d e f g h", CHAVE_FALSA + "\nx", "Bearer " + CHAVE_FALSA, "sk-proj-" + "a" * 30):
            with self.assertRaises(ContaRecusada) as c:
                carregar_credenciais({"ERP_AGENTE_ANTHROPIC_KEY": chave}, lambda n: None)
            self.assertNotIn(chave.strip(), str(c.exception))


class TestModeloEConta(unittest.TestCase):
    def _temporario(self) -> Path:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        return Path(tmp.name)

    def rodar(self, modelo, **kw) -> Cenario:
        cen = Cenario(modelo, **kw).rodar()
        self.addCleanup(cen.limpar)
        return cen

    def test_usuario_sem_workspace_para_antes_da_rede(self):
        ex = ExecutorRepoFalso(self._temporario())
        deps = deps_repo_falso(ex, {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA}, modelo=ModeloFalso())
        erro = io.StringIO()
        with contextlib.redirect_stderr(erro), contextlib.redirect_stdout(io.StringIO()):
            codigo = cli.main(["revisar-pr", "416", "--simular"], deps)
        self.assertEqual(codigo, 3)
        self.assertIn("ERP_AGENTE_ANTHROPIC_WORKSPACE", erro.getvalue())
        self.assertEqual(ex.chamadas, [])  # nem git, nem gh, nem fetch
        self.assertEqual(deps.modelos_construidos, [])  # o modelo nem é construído

    def test_modelo_fixo_e_esforco_explicito(self):
        for esforco in ("medium", "high", "low"):
            modelo = ModeloFalso([resposta_parecer()])
            cen = Cenario(modelo)
            cen.opcoes.esforco = esforco
            cen.rodar()
            self.addCleanup(cen.limpar)
            pedido = modelo.chamadas[0]
            self.assertEqual(pedido["model"], "claude-opus-5-5")
            self.assertEqual(pedido["output_config"], {"effort": esforco})
            for proibido in ("thinking", "temperature", "top_p", "top_k", "tool_choice"):
                self.assertNotIn(proibido, pedido)
            self.assertEqual(cen.parecer["modelo"]["esforco"], esforco)
            self.assertIn("D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO", cen.parecer["modelo"]["nivel"])
        with self.assertRaises(ValueError):
            montar_pedido("s", [], [], 100, "max")

    def test_request_id_rate_limit_e_modelo_respondeu_no_parecer(self):
        cab = {"request-id": "req_111", "x-ratelimit-remaining-requests": "99", "anthropic-ratelimit-tokens-remaining": "5000", "retry-after": "3"}
        cen = self.rodar(ModeloFalso([resposta(uso("git_ls_files", {}), request_id="req_111", cabecalhos=cab), resposta_parecer()]))
        conta = cen.parecer["conta"]
        self.assertEqual(conta["request_ids"][0], "req_111")
        self.assertEqual(len(conta["request_ids"]), 2)
        self.assertEqual(cen.parecer["modelo"]["respondeu"], MODELO)
        self.assertTrue(conta["retry_after_visto"])
        self.assertIn("Conta e cobrança", (cen.pasta / "parecer.md").read_text(encoding="utf-8"))

    def test_fallback_de_modelo_marcado(self):
        cen = self.rodar(ModeloFalso([resposta(uso("entregar_parecer", {"veredito": "aprovado", "resumo": "r", "achados": [],
                                                                         "comandos_executados": [], "limitacoes": []}), modelo="claude-opus-4-8")]))
        self.assertTrue(cen.parecer["modelo"]["fallback_servidor"])
        self.assertEqual(cen.parecer["modelo"]["respondeu"], "claude-opus-4-8")
        snap = self.rodar(ModeloFalso([resposta(uso("entregar_parecer", {"veredito": "aprovado", "resumo": "r", "achados": [],
                                                                          "comandos_executados": [], "limitacoes": []}), modelo="claude-opus-5-5-20261001")]))
        self.assertFalse(snap.parecer["modelo"]["fallback_servidor"])

    def test_chave_nunca_impressa(self):
        erro_api = ErroDeModelo("AuthenticationError", status=401, tipo="authentication_error", request_id="req_e",
                                mensagem=f"invalid x-api-key: {CHAVE_FALSA}")
        base = self._temporario()
        ex = ExecutorRepoFalso(base)
        deps = deps_repo_falso(ex, {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO},
                               modelo=ModeloFalso([erro_api]))
        saida, erro = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(saida), contextlib.redirect_stderr(erro):
            codigo = cli.main(["revisar-pr", "416", "--saida", str(base / "s"), "--worktree-dir", str(base / "w")], deps)
        self.assertEqual(codigo, 4)
        tudo = saida.getvalue() + erro.getvalue()
        self.assertNotIn(CHAVE_FALSA, tudo)
        for arquivo in (base / "s").iterdir():
            self.assertNotIn(CHAVE_FALSA, arquivo.read_text(encoding="utf-8"), arquivo.name)
        # Exceção que CHEGA à CLI (antes da tarefa), com a chave na mensagem: a CLI não a imprime.
        def explode(argv, execf):
            if argv[1:3] == ["pr", "view"]:
                raise RuntimeError(f"falha inesperada com {CHAVE_FALSA}")

        ex2 = ExecutorRepoFalso(base / "b2")
        ex2.efeito = explode
        deps2 = deps_repo_falso(ex2, {"ERP_AGENTE_ANTHROPIC_KEY": CHAVE_FALSA, "ERP_AGENTE_ANTHROPIC_WORKSPACE": WORKSPACE_FALSO},
                                modelo=ModeloFalso())
        saida2, erro2 = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(saida2), contextlib.redirect_stderr(erro2):
            codigo2 = cli.main(["revisar-pr", "416", "--saida", str(base / "s2"), "--worktree-dir", str(base / "w2")], deps2)
        self.assertEqual(codigo2, 5)
        self.assertNotIn(CHAVE_FALSA, saida2.getvalue() + erro2.getvalue())
        self.assertIn("RuntimeError", erro2.getvalue())

    def test_adaptador_real_com_cliente_falso(self):
        """O caminho de `ModeloAnthropic.responder` (with_raw_response) sem importar o SDK."""

        class Bloco:
            def __init__(self, d):
                self.d = d

            def to_dict(self, mode="python"):
                return dict(self.d)

        class Uso:
            input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens = 11, 22, 33, 44

        class Mensagem:
            content = [Bloco({"type": "thinking", "thinking": "", "signature": "sig"}), Bloco({"type": "text", "text": "oi"})]
            usage = Uso()
            stop_reason = "end_turn"
            stop_details = None
            model = "claude-opus-5-5"

        class Bruto:
            headers = {"request-id": "req_raw", "x-ratelimit-limit-requests": "50", "set-cookie": "nao", "content-type": "json"}
            request_id = "req_raw"

            def parse(self):
                return Mensagem()

        pedidos = []

        class Criar:
            def create(self, **kw):
                pedidos.append(kw)
                return Bruto()

        class Mensagens:
            with_raw_response = Criar()

        class Cliente:
            messages = Mensagens()

        m = ModeloAnthropic(credenciais(), cliente=Cliente())
        r = m.responder(system="s", tools=[], messages=[{"role": "user", "content": "x"}], max_tokens=100, esforco="low")
        self.assertEqual(r.request_id, "req_raw")
        self.assertEqual(r.usage, {"input_tokens": 11, "cache_creation_input_tokens": 22, "cache_read_input_tokens": 33, "output_tokens": 44})
        self.assertEqual(r.content[0], {"type": "thinking", "thinking": "", "signature": "sig"})
        self.assertEqual(r.cabecalhos, {"request-id": "req_raw", "x-ratelimit-limit-requests": "50"})
        self.assertEqual(pedidos[0]["model"], MODELO)
        self.assertNotIn("thinking", pedidos[0])


if __name__ == "__main__":
    unittest.main()
