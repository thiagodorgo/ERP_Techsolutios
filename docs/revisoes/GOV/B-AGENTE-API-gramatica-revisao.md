# B-AGENTE-API — Revisão do conserto da gramática estrita (PR #418)

> **Modelo que rodou:** Claude **Opus 5.5** (`claude-opus-5-5`), nível menor (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). Mesma identidade revisora do PR #417, olhar `agente-secops`. Não escrevi, não planejei e não desenvolvi este conserto.
> **Objeto:** PR #418, ramo `fix/agente-api-gramatica`, head `b261ae042f09b5a5df39c78801600435fd437fa2`, base `origin/main` = `3a0d1990` (#417 mergeado).
> **Terreno:** worktree próprio e detached `C:/Users/AMP/w-rev418`, venv próprio (15 pacotes, `anthropic==1.13.0`). Sem chamada à API; o valor de `ERP_AGENTE_ANTHROPIC_KEY` não foi lido; sem commit.

## Veredito

**APROVADO.**
- A validação local não foi contornada:
  - **83 de 83** entradas que passam o esquema e violam a cerca foram negadas pela cerca;
  - **39 de 39** entradas fora do esquema, nas formas que um validador frouxo aceitaria, foram negadas pelo esquema;
  - houve **0** processos, **0** `open` e **0** exceções escapando de `Ferramentas.executar`.
- Nenhuma ferramenta perdeu a verificação da cerca:
  - a `cerca.py` não mudou;
  - o `ferramentas.py` só ganhou linhas;
  - propriedades, tipos, enums, `anyOf`, descrições e `PARECER_SCHEMA` estão idênticos à `main`; só mudaram `required` e `strict`.
- A suíte deu 180/180 nos dois Pythons, com 0 pulados.
- As 4 mutações do dev deram vermelho na minha execução, com os mesmos números.
- Ficam duas notas:
  - **G1:** a entrada aninhada (P-N4a) agora é alcançável pela API e derruba a execução com exit 5, com os artefatos;
  - **G2:** o CI do head ainda estava em curso quando medi.

## 1. A validação local não pode ser contornada

Todas as entradas foram dadas a `Ferramentas.executar` com espiões, de modo que contei os processos do executor e cada `open`. Esse é o único caminho até um tratador: `grep` acha uma só chamada, `laco.py:325`. A raiz é temporária e tem `src/a.ts`, `.env`, `node_modules/x`, `tests/auth-jwt.test.ts` e `tests/x-db.test.ts`. Script: `scratchpad/rev417/scripts_418/entradas.py`.

**Grupo A, 83 entradas que PASSAM o esquema e violam a cerca.** Cada uma foi conferida antes com `erros_da_entrada(...) == []`. Todas negadas pela cerca, 0 processos, 0 `open`:

| Ferramenta | N | Exemplos |
|---|---|---|
| `ler_arquivo` | 11 | `../x`, `C:/Windows/win.ini`, `.env`, prefixo longo `\\?\C:\x`, `src/a.ts:zone`, `linha_inicial: 0`, `max_linhas: -1`, `node_modules/x`, 401 caracteres, `NUL`, string de **10 MB** |
| `listar_diretorio` | 7 | `..`, `C:/`, `.git`, `//srv/share`, `CON`, `""`, `node_modules` |
| `buscar` | 9 | caminhos `../` e `.env`, padrão de 501 caracteres, 11 caminhos, `a;b`, `a\nb`, `""`, padrão de 10 MB, lista de **1 000 000** caminhos |
| `git_log` | 9 | `rev` `--output=x` e `-p`, `max_entradas` 0 e 201, `desde` com `=`, `busca_texto` + `busca_regex`, `../x`, `HEAD@{1}`, autor de 201 caracteres |
| `git_show` | 7 | `--output=x`, `HEAD:.env`, `HEAD:../x`, `HEAD:a;b`, `:/msg`, 401 caracteres, `""` |
| `git_diff` | 7 | `--no-index`, 3 revisões, faixa + revisão, `contexto` 51 e −1, `C:/x`, revisão vazia |
| `git_ls_files` | 6 | `../x`, `C:/x`, `.git/config`, `:(top)`, 11 caminhos, `.env` |
| `gh_pr_view` | 7 | `0`, `416 --web`, `-R x/y`, `0416`, 8 dígitos, dígitos de largura total `４１６`, `416\n` |
| `gh_pr_diff` | 5 | `0`, `416 -e x`, `--web`, dígitos árabe-índicos `٤١٦`, ` 416` |
| `gh_pr_checks` | 5 | `0`, `416 --watch`, `-R evil/repo`, `4.16`, `1e3` |
| `verificar` (flag desligada) | 5 | `espelho_codex`, `teste`, `teste` sem arquivo, `arquivo: null` |
| `verificar` (flag e `--npm-ci` ligadas) | 5 | `x-db.test.ts`, `../x.test.ts`, inexistente, `null`, `sub/…` |

**Grupo B, 39 entradas FORA do esquema, nas formas que um validador frouxo aceitaria.** Todas foram negadas por `entrada fora do esquema`, 0 processos, 0 `open`:
- bool no lugar de integer (×3);
- float inteiro (`5.0`, `1.0`) no lugar de integer;
- `NaN` no lugar de integer;
- int no lugar de string (`numero: 416`, ×2);
- `"true"`/`"false"` e `1` no lugar de booleano;
- `null` em booleano não nulável e em lista;
- lista, ou objeto `{"$ref":…}`, no lugar de string;
- campo extra (`__proto__`, `flags: ["--no-index"]`, `argv: ["calc.exe"]`);
- chave homóglifa (`cаminho` com а cirílico) e chave com caixa diferente;
- lista dentro de lista, e aninhamento de **5000 níveis** em `caminhos` e em `padrao`;
- enum com caixa, com espaço, com largura zero (U+200B), com NUL, e o enum removido `npm_check`;
- string no lugar de lista, e objeto no lugar de lista;
- entrada não objeto (string, lista, `null`, número, bool);
- obrigatório ausente (×2).

**Pelo laço** (`laco418.py`, `Cenario` da suíte):
- `gh_pr_view {"numero": 416}`, `ler_arquivo {"caminho": "../x"}` e `buscar` com campo extra, no mesmo turno → `is_error: [True, True, True]`, 0 processos.
- Auditoria: `negado=True` e `argv=None` nas três; os motivos são `entrada fora do esquema…`, `fora da raiz` e `entrada fora do esquema…`.

## 2. Nenhuma ferramenta perdeu verificação da cerca

- `git diff --name-only origin/main...HEAD -- scripts/agente-claude-api/agente_claude/cerca.py` → 0 arquivos. Os montadores de argv, a `Raiz`, o portão `--permitir-execucao-do-alvo` e os padrões negados ficaram intactos.
- `ferramentas.py`: o diff não tem nenhuma linha removida. Só entrou a validação em `executar`, ANTES do tratador e DEPOIS da recusa de nome desconhecido. Os tratadores (`_ler_arquivo` com hard link no `lstat` e no `fstat`, `_listar_diretorio`, `_comando`) estão iguais.
- Esquemas, comparados por programa com o `esquemas.py` de `origin/main`:
  - mesmos 12 nomes, na mesma ordem;
  - em todas as 12 ferramentas, propriedades, tipos, enums, `anyOf` e descrições são **iguais**;
  - `PARECER_SCHEMA` **igual**;
  - só mudaram `required` (o real, contido nas propriedades) e `strict` (agora só em `entregar_parecer`).
- O grupo A mostra a cerca agindo DEPOIS do esquema em todas as 11 ferramentas, com os mesmos motivos de antes: `fora da raiz`, `nome protegido`, `rev inválida`, `não permitido nesta execução`, `teste de banco (-db)` e outros.

## 3. Suíte nos dois Pythons e as 4 mutações

- Venv: `.venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 180 tests in 8.066s` · `OK`; com `-v`, 0 `skipped`.
- Python global (`find_spec('anthropic')` → `None`): `Ran 180 tests in 8.283s` · `OK`.
- Mutações, aplicadas pelo meu arnês (`mutar418.py` com `mut.json`: troca exata que casa 1 vez com o EOL do arquivo, suíte inteira com `python -B`, `__pycache__` apagado, `sha256` restaurado). Controle sem mutação: `Ran 180 tests · OK`.

  | Mutação | Resultado |
  |---|---|
  | (a) `strict` de volta nas 12 | **VERMELHO** `FAILED (failures=3)` |
  | (b) sem a validação local em `Ferramentas.executar` | **VERMELHO** `FAILED (failures=264, errors=1)` |
  | (b2) o validador da entrada sempre aceita | **VERMELHO** `FAILED (failures=265, errors=1)` |
  | (c) o validador ignora palavra desconhecida (fail-open) | **VERMELHO** `FAILED (failures=1)` |

  O `sha256` de `agente_claude/*.py` antes e depois é `37775b3c…f843` = `37775b3c…f843`, e o `git status --porcelain` ficou vazio. Os números batem com os do relatório do dev.
- Escopo:
  - 0 arquivos fora de `scripts/agente-claude-api/` e `docs/revisoes/GOV/`;
  - `git diff --check origin/main...HEAD` → exit 0;
  - 0 padrões de segredo no diff.

## 4. Achados (gravidade · escopo · evidência · motivo). Quem achou não propõe correção (§C7.4-bis)

- **G1 · `nota` · dentro-do-bloco (a premissa de um residual declarado caiu com este PR) · `agente_claude/auditoria.py` (`redigir_objeto`, recursivo) e `orcamento.bytes_json`/`laco._entrada_prevista` (`json.dumps` da mensagem do assistente).**
  - Sem `strict` nas 11 ferramentas de leitura, a API deixa de impedir uma entrada de ferramenta aninhada.
  - Pelo laço (`laco418.py`), com `buscar {"padrao": [[[…"a"…]]]}`:

    | Profundidade | Resultado |
    |---|---|
    | 50 e 300 | exit 0, `aprovado` |
    | **600**, 900, 1500 e 5000 | **exit 5**, `veredito=inconclusivo`, `motivo_parcial=erro_interno:RecursionError` |

  - Com 600 ou mais, saem os 5 artefatos (com `erro.txt`) e 0 processos.
  - A validação NÃO é contornada: a entrada é negada pelo esquema. A queda vem da auditoria ou da previsão, que processam a entrada crua.
  - Motivo:
    - o P-N4a da reconferência foi aceito como residual porque "com `strict`, a API não entrega entrada fora do esquema"; com este PR essa premissa vale só para `entregar_parecer`;
    - ~600 níveis são ~1200 caracteres, ao alcance de um modelo instruído por conteúdo injetado;
    - o efeito é que um alvo hostil consegue abortar a revisão, de forma visível (exit 5, parcial `inconclusivo`, artefatos presentes) e sem aprovação falsa nem execução.
  - Dono: o mesmo do P-N4a ("próximo bloco do agente"), agora com o caminho alcançável pela API real.
- **G2 · `nota` · condição de merge, não defeito do código:** `check-runs` de `b261ae04` → 12 runs. `authority-portal`, `backend-postgres`, `flutter`, `frontend` e `owner-portal` deram `success` (2 cada); `backend` estava **`in_progress`** (2) quando medi. Pela §C7 item 8(1), o merge espera CI verde.
- **Confirmado, sem achado:** a afirmação do dev de que a validação local é mais estrita que a cerca em 4 pontos (`null` em booleano e em lista, `numero` inteiro, campo ignorado com tipo errado) foi reproduzida no grupo B (`null em bool`, `null em lista`, `int como string`). Antes, essas formas eram barradas só pelo `strict` do servidor.

## 5. Limpeza
- **Worktree:** antes de remover, 0 processos vivos em `C:/Users/AMP/w-rev418`. `git worktree remove --force C:/Users/AMP/w-rev418` → exit 0, seguido de `git worktree prune`. O `worktree list` tem 0 entradas `w-rev418`, e o diretório não existe. `C:/Users/AMP/w-ag-*`: 0.
- **Temporários:** `%TEMP%/agente-suite-*`: 0. As raízes temporárias dos ataques foram apagadas pelos próprios scripts. No scratchpad ficam só os scripts (`scripts_418/`), fora do repositório.
- **Repositório principal:** `git status` igual ao do início.
- **No `w-agfix`:** escrevi só este arquivo (novo), sem commit e sem push.
