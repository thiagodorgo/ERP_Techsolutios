"""`strict` só no parecer e validação LOCAL de toda entrada não estrita.

Defeito de origem (2026-10-10, 1ª chamada real): com as 12 ferramentas `strict`, a API
respondeu 400 "The compiled grammar is too large" (req_011CfuGt9EbSiLQU7aYYbAec). O
remédio tira o `strict` das 11 ferramentas de leitura; a garantia de forma passa a ser
do script, que valida a entrada contra o esquema ANTES de executar.

Os casos inválidos são GERADOS do próprio esquema de cada ferramenta (não de uma lista
escrita à mão), e a invalidez de cada valor é derivada dos tipos que o esquema declara,
sem perguntar ao validador sob teste.
"""

import tempfile
import unittest
from pathlib import Path

from agente_claude import esquemas
from agente_claude.cerca import ContextoComandos, Raiz, validar_argv
from agente_claude.ferramentas import MOTIVO_FORA_DO_ESQUEMA, Ferramentas, ResultadoFerramenta
from agente_claude.modelo import montar_pedido
from tests.fakes import EXE, Cenario, ExecutorFalso, ModeloFalso, resposta, resposta_parecer, uso

NAO_ESTRITAS = tuple(n for n in esquemas.NOMES_FERRAMENTAS if n not in esquemas.FERRAMENTAS_ESTRITAS)

# Uma amostra por tipo JSON. A amostra de um tipo é inválida para um esquema que não aceita esse
# tipo (`True` não é integer; 1.5 não é integer; `None` só vale onde há `null`).
_AMOSTRAS = {"string": "texto", "integer": 7, "number": 1.5, "boolean": True, "null": None, "array": [], "object": {}}


def _opcoes(schema: dict) -> list[dict]:
    return list(schema["anyOf"]) if "anyOf" in schema else [schema]


def valores_invalidos(schema: dict) -> list[object]:
    """Valores que o esquema de UMA propriedade não aceita, derivados dos tipos que ele declara."""
    opcoes = _opcoes(schema)
    aceitos = {o["type"] for o in opcoes}
    invalidos = []
    for tipo, amostra in _AMOSTRAS.items():
        if tipo in aceitos or (tipo == "integer" and "number" in aceitos):
            continue  # 7 é number válido; 1.5 continua inválido para integer
        invalidos.append(amostra)
    for o in opcoes:
        if "enum" in o:
            invalidos.append("valor-fora-da-lista")
        if o.get("type") == "array" and o.get("items", {}).get("type") == "string":
            invalidos.append([7])  # item de tipo errado
    return invalidos


def valor_valido(schema: dict) -> object:
    o = _opcoes(schema)[0]
    if "enum" in o:
        return o["enum"][0]
    return {"string": "x", "integer": 1, "boolean": False, "array": [], "null": None}[o["type"]]


def entrada_minima(nome: str) -> dict:
    schema = esquemas._ESQUEMA_POR_NOME[nome]
    return {campo: valor_valido(schema["properties"][campo]) for campo in schema["required"]}


def casos_invalidos(nome: str) -> list[tuple[str, object]]:
    """(descrição, entrada inválida) para a ferramenta `nome`, todos gerados do esquema dela."""
    schema = esquemas._ESQUEMA_POR_NOME[nome]
    base = entrada_minima(nome)
    casos: list[tuple[str, object]] = [
        ("não é objeto: None", None),
        ("não é objeto: texto", "texto"),
        ("não é objeto: lista", [base]),
        ("campo intruso", dict(base, campo_intruso=1)),
    ]
    for campo in schema["required"]:
        sem = dict(base)
        del sem[campo]
        casos.append((f"sem o obrigatório {campo}", sem))
    for campo, sub in schema["properties"].items():
        for ruim in valores_invalidos(sub):
            casos.append((f"{campo}={ruim!r}", dict(base, **{campo: ruim})))
    return casos


class _Espiao:
    """Tratador falso: registra a chamada. Se for chamado com entrada inválida, a validação falhou."""

    def __init__(self) -> None:
        self.chamadas: list[tuple[str, object]] = []

    def __call__(self, nome, entrada):
        self.chamadas.append((nome, entrada))
        return ResultadoFerramenta(texto="executou", erro=False, codigo=0)


class TestEstritas(unittest.TestCase):
    def test_no_maximo_uma_estrita_e_ela_e_o_parecer(self):
        estritas = [f["name"] for f in esquemas.ferramentas() if f.get("strict") is True]
        self.assertEqual(estritas, ["entregar_parecer"])
        self.assertEqual(esquemas.FERRAMENTAS_ESTRITAS, ("entregar_parecer",))
        for f in esquemas.ferramentas():
            if f["name"] != "entregar_parecer":
                self.assertNotIn("strict", f, f["name"])

    def test_pedido_que_vai_a_api_leva_uma_so_estrita(self):
        # O que importa é o pedido montado, não só o módulo: medido no `montar_pedido` real e no
        # pedido que o laço entregou ao modelo em cada turno.
        pedido = montar_pedido("s", esquemas.ferramentas(), [{"role": "user", "content": "x"}], 100, "low")
        self.assertEqual([t["name"] for t in pedido["tools"] if t.get("strict")], ["entregar_parecer"])
        modelo = ModeloFalso([resposta(uso("git_ls_files", {})), resposta_parecer()])
        cen = Cenario(modelo).rodar()
        self.addCleanup(cen.limpar)
        self.assertEqual(len(modelo.chamadas), 2)
        for chamada in modelo.chamadas:
            self.assertEqual([t["name"] for t in chamada["tools"] if t.get("strict")], ["entregar_parecer"])
            self.assertEqual(len(chamada["tools"]), 12)

    def test_parecer_estrito_continua_com_todos_os_campos_obrigatorios(self):
        schema = esquemas.PARECER_SCHEMA
        self.assertEqual(schema["required"], ["veredito", "resumo", "achados", "comandos_executados", "limitacoes"])
        achado = schema["properties"]["achados"]["items"]
        self.assertEqual(achado["required"], ["gravidade", "escopo", "arquivo", "linha", "evidencia", "motivo"])
        self.assertEqual(achado["properties"]["evidencia"]["required"], ["comando", "saida"])


class TestValidacaoLocal(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        raiz = Path(self._tmp.name) / "wt"
        raiz.mkdir()
        self.ctx = ContextoComandos(raiz=Raiz(raiz), executaveis=dict(EXE), repo_gh="dono/repo", npm_ci=True)
        self.executor = ExecutorFalso()
        self.aberturas: list[object] = []

        def abrir(*a, **kw):
            self.aberturas.append(a)
            raise AssertionError("abriu arquivo")

        self.f = Ferramentas(self.ctx, executar_processo=self.executor, abrir=abrir)
        self.espioes = {nome: _Espiao() for nome in self.f._catalogo}
        self.f._catalogo = dict(self.espioes)

    def test_catalogo_e_esquemas_cobrem_as_mesmas_ferramentas(self):
        self.assertEqual(tuple(self.espioes), NAO_ESTRITAS)
        self.assertEqual(len(NAO_ESTRITAS), 11)

    def test_controle_entrada_minima_valida_executa(self):
        # Vermelho-controle do teste abaixo: a entrada válida passa e o tratador roda UMA vez. Sem
        # isso, "o espião não foi chamado" também passaria com um validador que recusa tudo.
        for nome in NAO_ESTRITAS:
            entrada = entrada_minima(nome)
            self.assertEqual(esquemas.erros_da_entrada(nome, entrada), [], nome)
            res = self.f.executar(nome, entrada)
            self.assertFalse(res.negado, (nome, res.motivo_negacao))
            self.assertEqual(self.espioes[nome].chamadas, [(nome, entrada)])

    def test_entrada_invalida_em_cada_ferramenta_e_recusada_sem_execucao(self):
        total = 0
        for nome in NAO_ESTRITAS:
            casos = casos_invalidos(nome)
            self.assertGreaterEqual(len(casos), 5, nome)
            for descricao, entrada in casos:
                with self.subTest(ferramenta=nome, caso=descricao):
                    total += 1
                    res = self.f.executar(nome, entrada)
                    self.assertTrue(res.negado and res.erro, (nome, descricao))
                    self.assertTrue(res.motivo_negacao.startswith(MOTIVO_FORA_DO_ESQUEMA), res.motivo_negacao)
                    self.assertTrue(res.texto.startswith("negado: " + MOTIVO_FORA_DO_ESQUEMA))
                    self.assertIsNone(res.argv)
        for nome, espiao in self.espioes.items():
            self.assertEqual(espiao.chamadas, [], nome)
        self.assertEqual(self.executor.chamadas, [])
        self.assertEqual(self.aberturas, [])
        self.assertGreaterEqual(total, 100)  # N medido: impresso no relatório do bloco

    def test_validador_e_fail_closed_para_o_que_nao_conhece(self):
        # Uma palavra que o validador não confere, objeto aberto ou nó sem tipo: recusa, nunca ignora.
        self.assertTrue(esquemas.erros_de_schema(5, {"type": "integer", "minimum": 1}, "x"))
        self.assertTrue(esquemas.erros_de_schema({"a": 1}, {"type": "object", "properties": {}}, "x"))
        self.assertTrue(esquemas.erros_de_schema("y", {"description": "sem tipo"}, "x"))
        self.assertEqual(esquemas.erros_de_schema(5, {"type": "integer"}, "x"), [])  # controle

    def test_todo_esquema_usa_so_o_que_o_validador_confere(self):
        # Sem isso, uma ferramenta com palavra desconhecida seria recusada SEMPRE (fail-closed).
        from tests.test_parecer import nos_de_schema

        for f in esquemas.ferramentas():
            for caminho, no in nos_de_schema(f["input_schema"], f["name"]):
                if caminho.endswith(".properties"):
                    continue  # mapa nome -> esquema, não é um nó de esquema
                self.assertFalse(set(no) - esquemas.PALAVRAS_SUPORTADAS, caminho)


class TestValidacaoNoLaco(unittest.TestCase):
    """Ponta a ponta: entradas que a CERCA aceitaria (e executariam), mas o esquema recusa."""

    SO_O_ESQUEMA_RECUSA = (
        ("buscar", {"padrao": "x", "fixo": None}),
        ("git_log", {"sem_merges": None}),
        ("git_log", {"caminhos": None}),
        ("git_diff", {"revs": None}),
        ("git_diff", {"renomes": None, "formato": None}),
        ("git_ls_files", {"caminhos": None}),
        ("gh_pr_view", {"numero": 416}),
        ("gh_pr_diff", {"numero": "416", "so_nomes": None}),
        ("gh_pr_checks", {"numero": 416}),
        ("verificar", {"nome": "diff_check", "arquivo": 5}),
    )

    def test_premissa_a_cerca_sozinha_executaria_cada_caso(self):
        # Prova que cada caso só para por causa da validação de esquema (a cerca devolve argv).
        with tempfile.TemporaryDirectory() as tmp:
            ctx = ContextoComandos(raiz=Raiz(tmp), executaveis=dict(EXE), repo_gh="dono/repo")
            for nome, entrada in self.SO_O_ESQUEMA_RECUSA:
                self.assertTrue(validar_argv(nome, entrada, ctx), (nome, entrada))
                self.assertTrue(esquemas.erros_da_entrada(nome, entrada), (nome, entrada))

    def test_vira_tool_result_de_erro_e_nada_executa(self):
        invalidas = resposta(*[uso(n, e) for n, e in self.SO_O_ESQUEMA_RECUSA])
        controle = resposta(uso("git_ls_files", {}))  # válida: tem de executar (o executor está ligado)
        modelo = ModeloFalso([invalidas, controle, resposta_parecer()])
        executor = ExecutorFalso()
        cen = Cenario(modelo, executor=executor).rodar()
        self.addCleanup(cen.limpar)
        resultados = modelo.chamadas[1]["messages"][-1]["content"]
        self.assertEqual(len(resultados), len(self.SO_O_ESQUEMA_RECUSA))
        for r in resultados:
            self.assertEqual(r["type"], "tool_result")
            self.assertIs(r["is_error"], True)
            self.assertIn("negado: " + MOTIVO_FORA_DO_ESQUEMA, r["content"])
        self.assertEqual(len(executor.chamadas), 1)  # só o controle
        self.assertEqual(executor.chamadas[0]["argv"][-2:], ["ls-files", "--"])
        linhas = [l for l in cen.linhas_auditoria() if l["tipo"] == "ferramenta" and l["negado"]]
        self.assertEqual(len(linhas), len(self.SO_O_ESQUEMA_RECUSA))
        self.assertTrue(all(l["argv"] is None and l["motivo_negacao"].startswith(MOTIVO_FORA_DO_ESQUEMA) for l in linhas))
        self.assertEqual(cen.codigo, 0)


if __name__ == "__main__":
    unittest.main()
