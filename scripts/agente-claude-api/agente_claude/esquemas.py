"""Definições JSON das ferramentas e do parecer, e o validador local de esquema.

- Ordem FIXA (tools renderiza na posição 0 do prompt: mudar a ordem invalida o
  cache inteiro — prompt-caching l.97, l.114) e `entregar_parecer` é a última.
- `strict: True` SÓ em `entregar_parecer` (`FERRAMENTAS_ESTRITAS`). Com as 12
  estritas, a API recusou a 1ª chamada real com 400 "The compiled grammar is too
  large" (req_011CfuGt9EbSiLQU7aYYbAec, 2026-10-10): o servidor compila UMA
  gramática com todos os esquemas estritos. O parecer fica estrito porque é ele que
  encerra a execução; as ferramentas de leitura não precisam da garantia do servidor.
- `additionalProperties: false` em TODO objeto; sem `minLength`/`maximum`/restrição
  de array (tool-use-concepts l.537-554) — o validador local também não as conhece.
- No esquema ESTRITO todo campo é obrigatório e o opcional aceita `null`
  (`anyOf [tipo, null]`): assim ele vale com qualquer leitura de `required` no modo
  estrito. Nos NÃO estritos, `required` lista só o que a ferramenta não tem como
  adivinhar (o resto pode faltar; a cerca trata ausente como o padrão).
- Toda entrada de ferramenta é validada pelo SCRIPT contra o esquema dela antes de
  executar (`erros_da_entrada`; tool-use-concepts l.71, l.74): entrada inválida
  volta ao modelo como `tool_result` de erro e nunca executa. Depois disso a cerca
  ainda confere faixas, padrões e contenção de caminho (a segunda camada).
"""

from __future__ import annotations

import copy
import json


def _nulo(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def _objeto(propriedades: dict, obrigatorios: tuple[str, ...] | None = None) -> dict:
    """Objeto fechado. `obrigatorios=None` = todos (a forma do esquema estrito)."""
    required = list(propriedades) if obrigatorios is None else list(obrigatorios)
    if not set(required) <= set(propriedades):
        raise ValueError("obrigatório fora das propriedades")
    return {
        "type": "object",
        "properties": propriedades,
        "required": required,
        "additionalProperties": False,
    }


_TEXTO = {"type": "string"}
_INTEIRO = {"type": "integer"}
_BOOL = {"type": "boolean"}
_LISTA_TEXTO = {"type": "array", "items": {"type": "string"}}

VEREDITOS = ["aprovado", "aprovado_com_ressalvas", "reprovado", "respondido", "inconclusivo"]
# A7(b): o enum do esquema é o mesmo para as duas tarefas (a lista de ferramentas é fixa, por
# causa do cache); a restrição por tarefa (plano §2.3) é imposta pelo validador local.
VEREDITOS_POR_TAREFA = {
    "revisar-pr": ("aprovado", "aprovado_com_ressalvas", "reprovado", "inconclusivo"),
    "investigar": ("respondido", "inconclusivo"),
}
GRAVIDADES = ["bloqueia", "ajuste", "nota"]
ESCOPOS = ["dentro-do-bloco", "pre-existente"]

PARECER_SCHEMA = _objeto(
    {
        "veredito": {"type": "string", "enum": VEREDITOS},
        "resumo": _TEXTO,
        "achados": {
            "type": "array",
            "items": _objeto(
                {
                    "gravidade": {"type": "string", "enum": GRAVIDADES},
                    "escopo": {"type": "string", "enum": ESCOPOS},
                    "arquivo": _TEXTO,
                    "linha": _nulo(_INTEIRO),
                    "evidencia": _objeto({"comando": _TEXTO, "saida": _TEXTO}),
                    "motivo": _TEXTO,
                }
            ),
        },
        "comandos_executados": _LISTA_TEXTO,
        "limitacoes": _LISTA_TEXTO,
    }
)

_CAMINHOS = {
    "type": "array",
    "items": {"type": "string"},
    "description": "Até 10 caminhos RELATIVOS à raiz do worktree (sem '..', sem absoluto). Lista vazia = tudo.",
}

_FERRAMENTAS = [
    {
        "name": "ler_arquivo",
        "description": (
            "Lê um arquivo de texto do worktree, com número de linha. Chame quando precisar ver o conteúdo "
            "de um arquivo citado no diff, na pergunta ou numa busca. Máximo 2000 linhas e 256 KB por chamada; "
            "use linha_inicial para paginar. Caminhos protegidos (.env*, *.pem, *.key, id_*, .git, node_modules) "
            "e caminhos fora da raiz voltam negados."
        ),
        "input_schema": _objeto(
            {
                "caminho": {"type": "string", "description": "Caminho relativo à raiz do worktree."},
                "linha_inicial": _nulo(_INTEIRO),
                "max_linhas": _nulo(_INTEIRO),
            },
            ("caminho",),
        ),
    },
    {
        "name": "listar_diretorio",
        "description": (
            "Lista as entradas de um diretório do worktree (até 500). Chame para se orientar na árvore antes de "
            "ler arquivos. Links aparecem como <link> e não são seguidos. Use '.' para a raiz."
        ),
        "input_schema": _objeto({"caminho": {"type": "string", "description": "Relativo à raiz; '.' = raiz."}}, ("caminho",)),
    },
    {
        "name": "buscar",
        "description": (
            "Busca texto no worktree com git grep (arquivos rastreados, com número de linha, até 200 ocorrências "
            "por arquivo). Chame para localizar onde um símbolo, rota ou regra aparece antes de ler o arquivo."
        ),
        "input_schema": _objeto(
            {
                "padrao": {"type": "string", "description": "Padrão (regex estendida, ou texto fixo se fixo=true)."},
                "ignorar_caixa": _BOOL,
                "palavra_inteira": _BOOL,
                "fixo": _BOOL,
                "caminhos": _CAMINHOS,
            },
            ("padrao",),
        ),
    },
    {
        "name": "git_log",
        "description": (
            "Histórico de commits (git log) em modo só leitura. Chame para datar uma mudança, achar quem a fez "
            "ou listar os commits de uma faixa (ex.: rev='origin/main..HEAD')."
        ),
        "input_schema": _objeto(
            {
                "max_entradas": _nulo(_INTEIRO),
                "formato": _nulo({"type": "string", "enum": ["oneline", "stat", "name-only", "name-status"]}),
                "sem_merges": _BOOL,
                "primeiro_pai": _BOOL,
                "seguir_renomes": _BOOL,
                "data_iso": _BOOL,
                "busca_texto": _nulo(_TEXTO),
                "busca_regex": _nulo(_TEXTO),
                "desde": _nulo(_TEXTO),
                "ate": _nulo(_TEXTO),
                "autor": _nulo(_TEXTO),
                "rev": _nulo(_TEXTO),
                "caminhos": _CAMINHOS,
            },
            (),
        ),
    },
    {
        "name": "git_show",
        "description": (
            "Mostra um commit (git show <rev>) ou um arquivo numa revisão (git show <rev>:<caminho>). Chame para "
            "ver o que um commit mudou ou o conteúdo de um arquivo antes da mudança."
        ),
        "input_schema": _objeto(
            {
                "objeto": {"type": "string", "description": "<rev> ou <rev>:<caminho relativo>."},
                "formato": _nulo({"type": "string", "enum": ["stat", "name-only", "patch"]}),
            },
            ("objeto",),
        ),
    },
    {
        "name": "git_diff",
        "description": (
            "Diferenças entre revisões (git diff). Chame para ver o diff de uma faixa (revs=['origin/main...HEAD']) "
            "ou comparar duas revisões; formato='check' acusa problemas de espaço em branco."
        ),
        "input_schema": _objeto(
            {
                "formato": _nulo({"type": "string", "enum": ["stat", "name-only", "name-status", "check"]}),
                "contexto": _nulo(_INTEIRO),
                "renomes": _BOOL,
                "revs": {"type": "array", "items": {"type": "string"}, "description": "0 a 2 revisões, ou 1 faixa."},
                "caminhos": _CAMINHOS,
            },
            (),
        ),
    },
    {
        "name": "git_ls_files",
        "description": "Lista arquivos rastreados (git ls-files). Chame para saber se um arquivo existe no commit.",
        "input_schema": _objeto({"caminhos": _CAMINHOS}, ()),
    },
    {
        "name": "gh_pr_view",
        "description": (
            "Metadados de um PR do repositório (gh pr view --json): título, estado, head, base, arquivos, corpo. "
            "Chame no começo de uma revisão para saber o que o PR promete."
        ),
        "input_schema": _objeto({"numero": {"type": "string", "description": "Número do PR, só dígitos."}}, ("numero",)),
    },
    {
        "name": "gh_pr_diff",
        "description": "Diff do PR no GitHub (gh pr diff). Chame para ler a mudança inteira do PR.",
        "input_schema": _objeto({"numero": {"type": "string"}, "so_nomes": _BOOL}, ("numero",)),
    },
    {
        "name": "gh_pr_checks",
        "description": "Estado da CI do PR (gh pr checks --json). Chame para saber se os checks passaram.",
        "input_schema": _objeto({"numero": {"type": "string"}}, ("numero",)),
    },
    {
        "name": "verificar",
        "description": (
            "Roda UMA verificação de lista fechada no worktree: 'diff_check' (git diff --check), 'espelho_codex' "
            "(node scripts/sync-agent-agents.mjs --check) ou 'teste' (node --test de tests/<arquivo>, nunca -db). "
            "'espelho_codex' e 'teste' EXECUTAM código do commit alvo: só rodam se a execução foi iniciada com "
            "--permitir-execucao-do-alvo ('teste' exige também --npm-ci); senão voltam negadas. Chame para comprovar "
            "por execução o que você afirma. (npm run check não está disponível: exige prisma generate com banco.)"
        ),
        "input_schema": _objeto(
            {
                "nome": {"type": "string", "enum": ["diff_check", "espelho_codex", "teste"]},
                "arquivo": _nulo({"type": "string", "description": "Só para 'teste': nome do arquivo em tests/."}),
            },
            ("nome",),
        ),
    },
    {
        "name": "entregar_parecer",
        "description": (
            "Entrega o parecer FINAL e encerra o trabalho. Chame exatamente uma vez, quando terminar de investigar "
            "(ou quando não houver mais o que verificar). Cada achado precisa de evidência: o comando que você "
            "rodou e a saída que viu."
        ),
        "input_schema": PARECER_SCHEMA,
    },
]

# UMA estrita: a gramática compilada pelo servidor cresce com cada esquema estrito, e
# com as 12 ela passou do teto da API (400 na 1ª chamada real, 2026-10-10).
FERRAMENTAS_ESTRITAS = ("entregar_parecer",)

for _f in _FERRAMENTAS:
    if _f["name"] in FERRAMENTAS_ESTRITAS:
        _f["strict"] = True

NOMES_FERRAMENTAS = tuple(f["name"] for f in _FERRAMENTAS)
_ESQUEMA_POR_NOME = {f["name"]: f["input_schema"] for f in _FERRAMENTAS}


def ferramentas() -> list[dict]:
    """Cópia profunda, em ordem fixa (o laço manda a MESMA lista em todo turno)."""
    return copy.deepcopy(_FERRAMENTAS)


def serializar(obj: object) -> str:
    """Serialização determinística (`sort_keys`), para nada no prefixo variar (S13)."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)


# -- validador local de JSON Schema (stdlib) ----------------------------------------------------
# Cobre exatamente o subconjunto que os esquemas acima usam. É fail-closed: uma palavra do
# esquema que ele não conhece (ex.: `minimum`, `pattern`) RECUSA a entrada em vez de ser
# ignorada — um esquema que prometesse uma restrição que ninguém confere seria pior que nenhum.

PALAVRAS_SUPORTADAS = frozenset(
    {"type", "properties", "required", "additionalProperties", "items", "enum", "anyOf", "description"}
)
MAX_CHARS_ERRO = 200


def _tipo_ok(valor: object, tipo: str) -> bool:
    if tipo == "object":
        return isinstance(valor, dict)
    if tipo == "array":
        return isinstance(valor, list)
    if tipo == "string":
        return isinstance(valor, str)
    if tipo == "integer":
        return isinstance(valor, int) and not isinstance(valor, bool)
    if tipo == "number":
        return isinstance(valor, (int, float)) and not isinstance(valor, bool)
    if tipo == "boolean":
        return isinstance(valor, bool)
    if tipo == "null":
        return valor is None
    return False


def _descrever(opcao: dict) -> str:
    if "enum" in opcao:
        return f"um de {opcao['enum']}"
    return str(opcao.get("type", "?"))


def _validar(valor: object, schema: dict, caminho: str, erros: list[str]) -> None:
    desconhecidas = set(schema) - PALAVRAS_SUPORTADAS
    if desconhecidas:
        erros.append(f"{caminho}: esquema com palavra que o validador local não confere ({', '.join(sorted(desconhecidas))})")
        return
    if "anyOf" in schema:
        for opcao in schema["anyOf"]:
            sub: list[str] = []
            _validar(valor, opcao, caminho, sub)
            if not sub:
                return
        erros.append(f"{caminho}: esperado " + " ou ".join(_descrever(o) for o in schema["anyOf"]))
        return
    tipo = schema.get("type")
    if not tipo:
        erros.append(f"{caminho}: esquema sem tipo")
        return
    if not _tipo_ok(valor, tipo):
        erros.append(f"{caminho}: esperado {tipo}")
        return
    if "enum" in schema and valor not in schema["enum"]:
        erros.append(f"{caminho}: fora de {schema['enum']}")
        return
    if tipo == "object":
        if schema.get("additionalProperties") is not False:
            erros.append(f"{caminho}: esquema de objeto sem additionalProperties: false")
            return
        props = schema.get("properties", {})
        for nome in schema.get("required", []):
            if nome not in valor:
                erros.append(f"{caminho}.{nome}: obrigatório")
        for nome in valor:
            if nome not in props:
                erros.append(f"{caminho}.{str(nome)[:40]}: campo não permitido")
        for nome, sub in props.items():
            if nome in valor:
                _validar(valor[nome], sub, f"{caminho}.{nome}", erros)
    elif tipo == "array" and "items" in schema:
        for i, item in enumerate(valor):
            _validar(item, schema["items"], f"{caminho}[{i}]", erros)


def erros_de_schema(valor: object, schema: dict, caminho: str) -> list[str]:
    """Lista de erros de `valor` contra `schema` (vazia = válido)."""
    erros: list[str] = []
    _validar(valor, schema, caminho, erros)
    return [e[:MAX_CHARS_ERRO] for e in erros]


def erros_da_entrada(nome: object, entrada: object) -> list[str]:
    """Erros da entrada de uma ferramenta contra o esquema DELA. Nome sem esquema = erro."""
    schema = _ESQUEMA_POR_NOME.get(nome) if isinstance(nome, str) else None
    if schema is None:
        return ["ferramenta sem esquema"]
    return erros_de_schema(entrada, schema, "entrada")
