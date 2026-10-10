"""Definições JSON das ferramentas e do parecer.

- Ordem FIXA (tools renderiza na posição 0 do prompt: mudar a ordem invalida o
  cache inteiro — prompt-caching l.97, l.114) e `entregar_parecer` é a última.
- `strict: True` em todas, `additionalProperties: false` em TODO objeto; sem
  `minLength`/`maximum`/restrição de array (tool-use-concepts l.537-554).
- Todo campo é obrigatório; o que é opcional aceita `null` (`anyOf [tipo, null]`).
  Assim o esquema vale com qualquer leitura de `required` no modo estrito; a cerca
  valida tudo de novo no código (o modelo pode não respeitar o esquema).
"""

from __future__ import annotations

import copy
import json


def _nulo(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def _objeto(propriedades: dict) -> dict:
    return {
        "type": "object",
        "properties": propriedades,
        "required": list(propriedades),
        "additionalProperties": False,
    }


_TEXTO = {"type": "string"}
_INTEIRO = {"type": "integer"}
_BOOL = {"type": "boolean"}
_LISTA_TEXTO = {"type": "array", "items": {"type": "string"}}

VEREDITOS = ["aprovado", "aprovado_com_ressalvas", "reprovado", "respondido", "inconclusivo"]
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
            }
        ),
    },
    {
        "name": "listar_diretorio",
        "description": (
            "Lista as entradas de um diretório do worktree (até 500). Chame para se orientar na árvore antes de "
            "ler arquivos. Links aparecem como <link> e não são seguidos. Use '.' para a raiz."
        ),
        "input_schema": _objeto({"caminho": {"type": "string", "description": "Relativo à raiz; '.' = raiz."}}),
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
            }
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
            }
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
            }
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
            }
        ),
    },
    {
        "name": "git_ls_files",
        "description": "Lista arquivos rastreados (git ls-files). Chame para saber se um arquivo existe no commit.",
        "input_schema": _objeto({"caminhos": _CAMINHOS}),
    },
    {
        "name": "gh_pr_view",
        "description": (
            "Metadados de um PR do repositório (gh pr view --json): título, estado, head, base, arquivos, corpo. "
            "Chame no começo de uma revisão para saber o que o PR promete."
        ),
        "input_schema": _objeto({"numero": {"type": "string", "description": "Número do PR, só dígitos."}}),
    },
    {
        "name": "gh_pr_diff",
        "description": "Diff do PR no GitHub (gh pr diff). Chame para ler a mudança inteira do PR.",
        "input_schema": _objeto({"numero": {"type": "string"}, "so_nomes": _BOOL}),
    },
    {
        "name": "gh_pr_checks",
        "description": "Estado da CI do PR (gh pr checks --json). Chame para saber se os checks passaram.",
        "input_schema": _objeto({"numero": {"type": "string"}}),
    },
    {
        "name": "verificar",
        "description": (
            "Roda UMA verificação de lista fechada no worktree: 'diff_check' (git diff --check), 'espelho_codex' "
            "(node scripts/sync-agent-agents.mjs --check) ou 'teste' (node --test de tests/<arquivo>, nunca -db). "
            "'teste' só funciona se a execução foi iniciada com --npm-ci. Chame para comprovar por execução o que "
            "você afirma. (npm run check não está disponível: exige prisma generate com banco.)"
        ),
        "input_schema": _objeto(
            {
                "nome": {"type": "string", "enum": ["diff_check", "espelho_codex", "teste"]},
                "arquivo": _nulo({"type": "string", "description": "Só para 'teste': nome do arquivo em tests/."}),
            }
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

for _f in _FERRAMENTAS:
    _f["strict"] = True

NOMES_FERRAMENTAS = tuple(f["name"] for f in _FERRAMENTAS)


def ferramentas() -> list[dict]:
    """Cópia profunda, em ordem fixa (o laço manda a MESMA lista em todo turno)."""
    return copy.deepcopy(_FERRAMENTAS)


def serializar(obj: object) -> str:
    """Serialização determinística (`sort_keys`), para nada no prefixo variar (S13)."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)
