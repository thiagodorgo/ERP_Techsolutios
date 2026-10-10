# B-AGENTE-API — Correção da gramática estrita grande demais (`strict` só no parecer)

> **Papel:** dev da correção, identidade NOVA `dev-agente-api-gramatica`. Não escrevi o código original, não revisei nem ajustei o PR #417 (§C7.4-bis).
> **Modelo que rodou:** Claude **Opus 5.5** (`claude-opus-5-5`), **nível menor** (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
> **Objeto de partida:** worktree `C:/Users/AMP/w-agfix`, ramo `fix/agente-api-gramatica`, head `3a0d199009218b9b60109d0e483a41a8bbf5578e` (= `origin/main`, PR #417 mergeado).
> **Defeito (medido pelo orquestrador, 2026-10-10 21:34Z):** `revisar-pr 416` parou na 1ª chamada com HTTP 400 (`req_011CfuGt9EbSiLQU7aYYbAec`): "The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools." Causa medida: `agente_claude/esquemas.py:218-219` marcava `strict=True` nas 12 ferramentas.
> **Proibições respeitadas:** nenhuma chamada à API; `ERP_AGENTE_ANTHROPIC_KEY` não lida; sem commit nem push; sem `git clean/stash/reset --hard/add -A`; sem `tail -f`; `timeout` em toda execução.
> **Gravação:** incremental (P1).

## 0. Estado

| Item | Estado |
|---|---|
| Leitura do skill `claude-api` | FEITO — o diretório existe; o skill manda validar a entrada antes de executar e devolver erro (P1) |
| Remédio: `strict` só em `entregar_parecer` | FEITO — 1 estrita; conjunto estrito 8 464 → 1 377 B (P4, P6) |
| Validação local de toda entrada não estrita | FEITO — não existia; implementada em `Ferramentas.executar`, validador fail-closed (P3, P4) |
| Testes (≤1 estrita; inválida recusada sem execução) | FEITO — 10 novos + 1 atualizado; 263 entradas inválidas geradas, 0 execuções (P5) |
| Mutações (a) e (b) | FEITO — (a), (b) e as extras (b2), (c): 4/4 vermelhas, 4/4 restauradas (P7) |
| Suíte nos dois Pythons | FEITO — 180/180 no venv e no global, 0 pulados; `git diff --check` limpo (P8) |
| Confirmação contra a API real | NÃO FEITA — proibida a este dev; é do orquestrador (§2) |

## 1. Log incremental (comando → saída → veredito parcial)

### P0 — terreno de partida (21:37Z)
- `git worktree list` → `C:/Users/AMP/w-agfix 3a0d1990 [fix/agente-api-gramatica]`; `git rev-parse origin/main` → `3a0d199009218b9b60109d0e483a41a8bbf5578e`; `git status --short` → vazio.
- Arquivos: índice LF, disco CRLF (`git ls-files --eol`: `i/lf w/crlf`).
- Linha de base: `timeout 300 .venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 170 tests ... OK`.
- Python global: `C:\Users\AMP\AppData\Local\Microsoft\WindowsApps\...\python.exe` 3.13.14, `find_spec('anthropic')` → `None` (sem SDK).
- Veredito: terreno limpo; partida = 3a0d1990, 170/170.

### P1 — leitura do skill `claude-api` (21:38Z)
- O diretório indicado existe: `C:/Users/AMP/AppData/Local/Temp/claude/bundled-skills/2.1.296/ce59948a71c1387402a3496c3d3f4a10/claude-api/` (`ls` → `shared/tool-use-concepts.md` 44 936 B, `python/claude-api/tool-use.md` 22 054 B).
- `grep -n -i -E "strict|grammar|validat"` nos dois arquivos, e leitura dos trechos:
  - `shared/tool-use-concepts.md` l.526-563 (Structured Outputs): `strict: true` "garante esquema válido"; objetos com `additionalProperties: false`; sem `minimum`/`maxLength`/restrição de array; "**First request latency**: New schemas incur a one-time compilation cost" — a gramática é compilada no servidor a partir dos esquemas estritos. O skill **não** dá um teto numérico para a gramática (a palavra "grammar" não aparece nele); o teto só se conhece pelo 400 medido.
  - `shared/tool-use-concepts.md` l.71 e l.74: "Validate the parsed input against the tool's schema before running the tool … In a manual loop, validate yourself … and treat a failure exactly like invalid JSON"; "When validation fails … do not run the tool; return … as an error result so it can retry" (`is_error: true`). l.570: "Validate inputs: Always validate tool inputs before execution".
  - `shared/tool-use-concepts.md` l.106 e `python/claude-api/tool-use.md` l.325-331: no Opus 5.5 `tool_choice` `any`/`tool` dá 400; usa-se `auto` e `strict: true` para manter a garantia de argumentos válidos **onde ela importa** — aqui, o parecer.
- Veredito: o remédio do orquestrador bate com o skill — `strict` onde a garantia do servidor vale o custo de gramática (o parecer, que encerra a execução), e validação local, no script, de toda entrada antes de executar; inválida volta como `tool_result` com `is_error`.

### P2 — medição do conjunto estrito na partida (21:39Z)
- Script `scratchpad/agfix/medir_estritas.py` (importa `agente_claude.esquemas` do worktree; `json.dumps(sort_keys=True)`, a mesma serialização de `esquemas.serializar`):
  `timeout 60 .venv/Scripts/python.exe -B medir_estritas.py .` →
  ```
  ferramentas: 12
  estritas: 12 ['ler_arquivo', ..., 'verificar', 'entregar_parecer']
  bytes JSON de todas as ferramentas: 8464
  bytes JSON das estritas: 8464
  bytes JSON dos input_schema estritos: 5219
  nós nas estritas: {'anyOf': 15, 'enum': 7, 'object': 14, 'propriedades': 49}
  ```
- Veredito: confirma o defeito — as 12 ferramentas entram na gramática estrita (8 464 B de definição; o "~8,7 KB" do orquestrador é outra serialização do mesmo objeto).

### P3 — o que a cerca já valida, ferramenta a ferramenta (21:39Z)
- Leitura de `cerca.py` (montadores `_argv_*`) e `ferramentas.py` (`_ler_arquivo`, `_listar_diretorio`): a cerca confere campo desconhecido (`_conferir_campos`), tipo de cada campo que usa e faixas; **mas aceita `None` onde o esquema não aceita**: `_booleano(None)` → `False` (ex.: `buscar.ignorar_caixa: null`), `_caminhos(None)` → `[]` (ex.: `git_log.caminhos: null`), `revs: null` em `git_diff`; e aceita `numero` inteiro (`_numero_pr(416)`) onde o esquema diz `string`.
- Não existe validação da entrada **contra o esquema** para as 11 ferramentas de leitura: o `strict` do servidor era a única garantia de forma. Só `entregar_parecer` tem validador local (`parecer.validar`, sobre `PARECER_SCHEMA`).
- Veredito: a validação local contra o esquema **não existe** para as ferramentas não estritas — implementar. A cerca continua como segunda camada (faixas, regex, contenção de caminho), não como substituta.

### P4 — implementação (21:44Z)
Arquivos tocados (todos dentro de `scripts/agente-claude-api/`, mais este relatório):
- `agente_claude/esquemas.py`
  - `FERRAMENTAS_ESTRITAS = ("entregar_parecer",)`; o laço que punha `strict = True` nas 12 agora só o põe nessa.
  - `_objeto(propriedades, obrigatorios=None)`: `None` = todos obrigatórios (a forma do esquema estrito, usada só pelo parecer). As 11 de leitura declaram o `required` real: `ler_arquivo`/`listar_diretorio` → `caminho`; `buscar` → `padrao`; `git_show` → `objeto`; `gh_pr_*` → `numero`; `verificar` → `nome`; `git_log`/`git_diff`/`git_ls_files` → nenhum. Propriedades, tipos, enums e descrições **não mudaram**.
  - Validador local de JSON Schema em stdlib movido de `parecer.py` para cá (`erros_de_schema`), agora **fail-closed**: palavra que ele não confere (`minimum`, `pattern`…), objeto sem `additionalProperties: false` e nó sem tipo recusam a entrada em vez de serem ignorados. Mensagem de `anyOf` passou de "nenhuma opção do anyOf casa" para "esperado integer ou null" (útil para o modelo corrigir). Nome de campo do modelo cortado em 40 caracteres e cada erro em 200.
  - `erros_da_entrada(nome, entrada)`: valida contra o esquema DA ferramenta; nome sem esquema = erro.
- `agente_claude/ferramentas.py` — `Ferramentas.executar`: depois do catálogo (nome desconhecido continua "ferramenta desconhecida") e **antes do tratador**, `erros_da_entrada`; com erro → `negado: entrada fora do esquema da ferramenta (corrija e chame de novo): <até 10 erros>`. O laço já transforma negado em `tool_result` com `is_error: true` e audita com `argv: null`.
- `agente_claude/parecer.py` — `validar` usa `esquemas.erros_de_schema` (mesmo validador; a cópia local saiu). Regra por tarefa (A7b) intacta.
- `README.md` — item 3 da cerca: uma frase sobre a validação local e o `strict` só no parecer.
- `tests/test_parecer.py` — o teste que exigia `strict` nas 12 passou a exigir `strict` só no parecer; `required == properties` só no estrito; nas não estritas, `required ⊆ properties` e o `required` de cada uma pinado em `OBRIGATORIOS_NAO_ESTRITAS`.
- `tests/test_esquema_entrada.py` (novo, 10 testes) — ver P5.

Decisões do dev:
- **D1 — `required` real nas não estritas.** Manter "todo campo obrigatório" com a validação local recusaria `{"padrao": "x"}` em `buscar` e `{}` em `git_ls_files` — formas que a suíte já usa e que um modelo sem `strict` manda o tempo todo. O "tudo obrigatório + null" existia só para o modo estrito. A cerca já trata ausente como padrão (`_booleano(None)`, `_caminhos(None)`, `_inteiro(None)`).
- **D2 — validação em `Ferramentas.executar`, não no laço.** É o único caminho até um tratador (processo, `open`, `scandir`); quem chamar `executar` por outro caminho também passa por ela.
- **D3 — o esquema de `entregar_parecer` NÃO foi simplificado.** Não há medida de que ele sozinho passe do teto (o teto não está no skill e chamar a API é proibido a este dev). Ver P6 para o tamanho medido; a confirmação contra a API é do orquestrador.
- **D4 — a validação local é mais estrita que a cerca em 4 pontos** (todos de forma, nenhum de conteúdo): `null` em booleano (`buscar.fixo`, `git_log.sem_merges`, `git_diff.renomes`, `gh_pr_diff.so_nomes`), `null` em lista (`caminhos`, `revs`), `numero` inteiro (o esquema diz string) e campo ignorado com tipo errado (`verificar.arquivo: 5` com `diff_check`). Antes, o `strict` do servidor impedia essas formas; agora o script as recusa com mensagem, e o modelo corrige no turno seguinte.

Comando → saída:
- `timeout 300 .venv/Scripts/python.exe -B -m unittest discover -s tests -t .` (antes de mexer nos testes) → `Ran 170 tests … FAILED (errors=1)`: só `test_schema_strict_e_additional_properties_false_em_todo_objeto` (`KeyError: 'strict'`), o teste que pinava o defeito. Nenhum outro teste caiu com o `required` real nem com a validação local.
- Depois dos testes: `timeout 300 .venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 180 tests in 8.330s OK`.
- Veredito: remédio implementado; 170 → 180 testes.

### P5 — testes novos (`tests/test_esquema_entrada.py`, 10 testes) e o atualizado (21:46Z)
Sem rede e sem SDK (a guarda de `tests/__init__.py` vale para eles); modelo e executor falsos de `tests/fakes.py`.
- `TestEstritas` (3):
  - `test_no_maximo_uma_estrita_e_ela_e_o_parecer` — `[f for f in ferramentas() if f.get("strict") is True]` = `["entregar_parecer"]`; as outras 11 nem têm a chave.
  - `test_pedido_que_vai_a_api_leva_uma_so_estrita` — mede o **pedido montado** (`modelo.montar_pedido`) e o pedido que o laço entregou ao modelo falso em cada um dos 2 turnos: 12 ferramentas, 1 estrita.
  - `test_parecer_estrito_continua_com_todos_os_campos_obrigatorios` — nenhum campo obrigatório do parecer se perdeu (5 no topo, 6 no achado, 2 na evidência).
- `TestValidacaoLocal` (5):
  - `test_entrada_invalida_em_cada_ferramenta_e_recusada_sem_execucao` — os casos são **gerados do esquema** de cada uma das 11 não estritas: não-objeto (3), campo intruso, cada obrigatório ausente, e para cada propriedade um valor de cada tipo JSON que o esquema não aceita (a invalidez vem dos tipos declarados, não do validador sob teste), mais enum fora da lista e item de lista com tipo errado. **N = 263** (`ler_arquivo` 21 · `listar_diretorio` 11 · `buscar` 36 · `git_log` 76 · `git_show` 17 · `git_diff` 35 · `git_ls_files` 11 · `gh_pr_view` 11 · `gh_pr_diff` 17 · `gh_pr_checks` 11 · `verificar` 17). Cada tratador do catálogo é trocado por um espião: 0 chamadas de tratador, 0 processos, 0 `open`; todo resultado `negado`, `erro`, `argv=None`, motivo começando por "entrada fora do esquema".
  - `test_controle_entrada_minima_valida_executa` — vermelho-controle do anterior: a entrada mínima válida de cada ferramenta passa no esquema e chama o tratador exatamente 1 vez (sem isso, um validador que recusa tudo passaria).
  - `test_catalogo_e_esquemas_cobrem_as_mesmas_ferramentas` — catálogo de `Ferramentas` == as 11 não estritas, na mesma ordem.
  - `test_validador_e_fail_closed_para_o_que_nao_conhece` e `test_todo_esquema_usa_so_o_que_o_validador_confere` — o validador recusa `minimum`, objeto aberto e nó sem tipo; e nenhum esquema real usa palavra fora de `PALAVRAS_SUPORTADAS` (senão a ferramenta seria recusada sempre).
- `TestValidacaoNoLaco` (2), ponta a ponta pelo `Cenario`:
  - `test_premissa_a_cerca_sozinha_executaria_cada_caso` — para os 10 casos (`buscar.fixo: null`, `git_log.sem_merges: null`, `git_log.caminhos: null`, `git_diff.revs: null`, `git_diff.renomes/formato: null`, `git_ls_files.caminhos: null`, `gh_pr_view.numero: 416`, `gh_pr_diff.so_nomes: null`, `gh_pr_checks.numero: 416`, `verificar` `diff_check` com `arquivo: 5`), `validar_argv` devolve argv (a cerca sozinha EXECUTARIA) e `erros_da_entrada` não é vazio. Prova que, nesses casos, só a validação de esquema impede a execução.
  - `test_vira_tool_result_de_erro_e_nada_executa` — os 10 num turno: 10 `tool_result` com `is_error: true` e "negado: entrada fora do esquema"; auditoria com 10 negadas, `argv: null`; e o controle do turno seguinte (`git_ls_files {}`) executa — o executor registra **1** chamada, só a do controle.
- `tests/test_parecer.py::TestEsquema::test_additional_properties_false_em_todo_objeto_e_strict_so_no_parecer` (substitui o que exigia `strict` nas 12).
- Veredito: os três pedidos de teste do mandato estão cobertos (≤1 estrita e é o parecer; inválida recusada sem execução em CADA não estrita; mutações no P7).

### P6 — o conjunto estrito depois (21:46Z)
- `timeout 60 .venv/Scripts/python.exe -B medir_estritas.py .` →
  ```
  ferramentas: 12
  estritas: 1 ['entregar_parecer']
  bytes JSON de todas as ferramentas: 7946
  bytes JSON das estritas: 1377
  bytes JSON dos input_schema estritos: 1068
  nós nas estritas: {'anyOf': 1, 'enum': 3, 'object': 3, 'propriedades': 13}
  ```
- Antes × depois, no que entra na gramática estrita: 8 464 → 1 377 B de definição (−84%); `input_schema` 5 219 → 1 068 B; `anyOf` 15 → 1; `enum` 7 → 3; objetos 14 → 3; propriedades 49 → 13. O esquema do parecer é o mesmo do PR #417 (não foi simplificado — D3).
- Veredito: a redução é grande, mas **o teto da API não está documentado**; que 1 377 B cabem só se prova com a chamada real, que é do orquestrador.

### P7 — mutações (21:47Z)
- Arnês `scratchpad/agfix/mutar.py`: âncora no EOL do arquivo (os `.py` estão CRLF no disco; a âncora é convertida e tem de casar **exatamente 1 vez**); aplica e confere que mudou e que a âncora sumiu; `__pycache__` apagado antes e depois; suíte inteira com `python -B`; restaura os bytes e confere sha256; no fim, sha256 dos 33 `.py` antes × depois.
- 1ª execução abortou antes da 1ª suíte (`FileNotFoundError` — caminho relativo do intérprete no `subprocess`); o `finally` restaurou o arquivo (`grep` confirmou `if _f["name"] in FERRAMENTAS_ESTRITAS:` de volta, 349 CRLF / 349 LF). 2ª execução, com o caminho absoluto:
  `timeout 1500 .venv/Scripts/python.exe -B mutar.py . C:/Users/AMP/w-agfix/scripts/agente-claude-api/.venv/Scripts/python.exe` →
  ```
  [a]  strict de volta nas 12 | esquemas.py | aplicada=True | Ran 180 tests | FAILED (failures=3) | VERMELHA | restaurada=True
       - test_parecer.TestEsquema.test_additional_properties_false_em_todo_objeto_e_strict_so_no_parecer
       - test_esquema_entrada.TestEstritas.test_no_maximo_uma_estrita_e_ela_e_o_parecer
       - test_esquema_entrada.TestEstritas.test_pedido_que_vai_a_api_leva_uma_so_estrita
  [b]  sem a validação local (bloco removido de Ferramentas.executar) | ferramentas.py | aplicada=True | Ran 180 tests | FAILED (failures=264, errors=1) | VERMELHA | restaurada=True
       - test_esquema_entrada.TestValidacaoLocal.test_entrada_invalida_em_cada_ferramenta_e_recusada_sem_execucao
       - test_esquema_entrada.TestValidacaoNoLaco.test_vira_tool_result_de_erro_e_nada_executa
  [b2] validador da entrada sempre aceita | esquemas.py | aplicada=True | Ran 180 tests | FAILED (failures=265, errors=1) | VERMELHA | restaurada=True
       - (os dois acima) + test_esquema_entrada.TestValidacaoNoLaco.test_premissa_a_cerca_sozinha_executaria_cada_caso
  [c]  validador ignora palavra desconhecida (fail-open) | esquemas.py | aplicada=True | Ran 180 tests | FAILED (failures=1) | VERMELHA | restaurada=True
       - test_esquema_entrada.TestValidacaoLocal.test_validador_e_fail_closed_para_o_que_nao_conhece
  árvore idêntica antes × depois: True (33 arquivos)
  ```
  (As 264/265 falhas de [b]/[b2] são subtestes: cada um dos 263 casos gerados falha sozinho.)
- Veredito: as duas mutações pedidas — (a) `strict` de volta em todas e (b) sem a validação local — ficam **vermelhas** e foram restauradas; as duas extras (b2, c) também. **4/4 vermelhas, 4/4 restauradas, árvore idêntica.**

### P8 — suíte inteira nos dois Pythons, `diff --check`, limpeza (21:48Z)
- venv: `.venv/Scripts/python.exe` 3.13.14 com `anthropic 1.13.0` → `timeout 300 .venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 180 tests in 8.191s` · `OK` · exit 0 · 0 pulados.
- global: `WindowsApps\...\python.exe` 3.13.14, `find_spec('anthropic')` → `None` → `timeout 300 python -B -m unittest discover -s tests -t .` → `Ran 180 tests in 8.092s` · `OK` · exit 0 · 0 pulados.
- `git diff --check` → exit 0, sem saída; arquivos novos: 0 espaço final, 0 tab, LF uniforme, terminam em LF.
- Mensagem que o modelo vê (amostra, executor falso, 0 processos):
  - `gh_pr_view {"numero": 416}` → `negado: entrada fora do esquema da ferramenta (corrija e chame de novo): entrada.numero: esperado string`
  - `git_log {"formato": "full", "max_entradas": "5"}` → `… entrada.max_entradas: esperado integer ou null; entrada.formato: esperado um de ['oneline', 'stat', 'name-only', 'name-status'] ou null`
  - `ler_arquivo {}` → `… entrada.caminho: obrigatório`
- Limpeza: `find scripts/agente-claude-api -name __pycache__ -not -path '*/.venv/*'` → vazio; nenhum `agente-suite-*` no temporário; nenhuma `saidas/`. Os scripts de medição e mutação ficam no scratchpad, fora do repositório.
- `git status --short --untracked-files=all` →
  ```
   M scripts/agente-claude-api/README.md
   M scripts/agente-claude-api/agente_claude/esquemas.py
   M scripts/agente-claude-api/agente_claude/ferramentas.py
   M scripts/agente-claude-api/agente_claude/parecer.py
   M scripts/agente-claude-api/tests/test_parecer.py
  ?? docs/revisoes/GOV/B-AGENTE-API-gramatica.md
  ?? scripts/agente-claude-api/tests/test_esquema_entrada.py
  ```
  Sem commit nem push (proibidos a este dev). `git diff --stat`: 5 arquivos, +186 −81, mais os 2 novos.

## 2. O que fica para o orquestrador
1. **Confirmar contra a API real** (proibido a este dev): `revisar-pr 416` tem de passar da 1ª chamada sem o 400 de gramática. Se ainda der 400 com só o parecer estrito, a próxima redução é no esquema do parecer (D3), sem perder campo obrigatório.
2. Commitar e abrir o PR com os 7 caminhos do `git status` acima.
3. Comportamento novo a observar na 1ª execução real: sem `strict`, o modelo pode mandar uma forma fora do esquema; ela volta como `tool_result` de erro, com a mensagem, e **conta** no teto de ferramentas e no turno. Se isso pesar no orçamento, o remédio é no prompt, não na cerca.

## Confirmação contra a API real (orquestrador, 2026-10-10 21:48Z)

Rodado deste worktree, antes do commit: `.venv/Scripts/python -m agente_claude revisar-pr 416` →
`parecer completo: veredito=aprovado · custo US$ 0.277374`, exit 0, 5 turnos, 10 ferramentas, 0 negadas, 57 s,
`modelo_respondeu = claude-opus-5-5`, cache lido 92 979 tokens. Antes da correção a mesma chamada dava HTTP 400
"The compiled grammar is too large" na 1ª chamada (`req_011CfuGt9EbSiLQU7aYYbAec`). O parecer está registrado em
`agent-orchestration/omega/juntas/REVISAO-PR-416.md` (ramo do #416).
