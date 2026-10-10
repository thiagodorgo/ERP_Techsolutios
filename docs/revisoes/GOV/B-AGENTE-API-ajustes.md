# B-AGENTE-API — Ajustes da revisão (PR #417)

> **Papel:** dev dos ajustes, identidade NOVA `dev-agente-api-ajustes`. Não escrevi o código original nem fiz a revisão (§C7.4-bis).
> **Modelo que rodou:** Claude **Opus 5.5** (`claude-opus-5-5`), **nível menor** (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
> **Objeto de partida:** worktree `C:/Users/AMP/w-agapi`, ramo `chore/agente-claude-api`, head `c876e6b08946e5d1b9854934e3c16fa2c0ae3311`. Durante o trabalho o orquestrador commitou `debae897` (só `docs/revisoes/GOV/B-AGENTE-API-revisao.md`, 352 linhas; `git diff --stat c876e6b0 debae897` não toca código): as mudanças abaixo valem sobre o mesmo código, e o head medido no fim é `debae897c0c5079cc87252fcb0a9d2365da2ffd0` com a árvore modificada, sem commit.
> **Insumos lidos inteiros:** `B-AGENTE-API-revisao.md` (A1–A11), `B-AGENTE-API-plano.md`, `B-AGENTE-API-brief.md`, `B-AGENTE-API-dev.md`.
> **Remédios:** decisão do orquestrador (o revisor não propôs correção), guiada pelo brief do dono: "mais autonomia, não muita, sem probabilidades altas de dar merda".
> **Proibições respeitadas:** nenhuma chamada à API da Anthropic; `ERP_AGENTE_ANTHROPIC_KEY` não lida nem impressa; sem commit nem push; nada instalado fora do venv; sem `git clean/stash/reset --hard/add -A`; base viva e portas intocadas.
> **Gravação:** incremental (P1).

## 0. Estado

| Item | Estado |
|---|---|
| Leitura dos insumos | FEITO (20:14Z) |
| A1 portão de execução do alvo + hard link | FEITO — flag `--permitir-execucao-do-alvo` desligada por padrão; hard link recusado (lstat + fstat) |
| A2 evidência conferida por chamada real | FEITO — ferramenta + argumentos normalizados, igualdade exata |
| A3 `parecer.md` não forjável | FEITO — seções do script antes; texto do modelo em bloco de delimitador maior |
| A4 teto previsto antes da chamada | FEITO — entrada estimada + `max_tokens`; limites por turno (12 ferramentas, 384 KB) |
| A7 a/b/c, A8, A10, A11 | FEITO |
| A5, A6 | FEITO (consertos simples): `git show <objeto> --`, `--literal-pathspecs`; esquema da URL limitado a 32 |
| A9 declaração | FEITO (§1, P5) — `decisoes.md` não alterado |
| Bateria (venv, global, mutações, `diff --check`) | FEITO — 160/160 nos dois Pythons, 0 pulados; 30/30 mutações vermelhas e restauradas; `git diff --check` limpo |

## 1. Log incremental (comando → saída → veredito parcial)

### P0 — terreno de partida (20:14Z)
- `git rev-parse HEAD` → `c876e6b08946e5d1b9854934e3c16fa2c0ae3311`; ramo `chore/agente-claude-api`; `git status --short` → só `?? docs/revisoes/GOV/B-AGENTE-API-revisao.md` (o parecer do revisor, ainda não versionado).
- Arquivos `.py`/`README.md` da pasta: 0 bytes CR (LF no índice e no disco, `git ls-files --eol`).
- `sha256sum agente_claude/*.py tests/*.py README.md` → 32 linhas gravadas no scratchpad (`sha-inicio.txt`), base para conferir a restauração das mutações.
- Veredito: terreno limpo; partida = c876e6b0.

### P1 — leitura do código e medições prévias (20:30Z)
- Li inteiros: `cerca.py`, `ferramentas.py`, `laco.py`, `parecer.py`, `orcamento.py`, `tarefas.py`, `worktree.py`, `cli.py`, `executor.py`, `prompts.py`, `redacao.py`, `esquemas.py`, `auditoria.py`, `modelo.py`, `README.md`, `tests/fakes.py`, `tests/__init__.py` e os testes de comandos, caminhos, parecer, orçamento, CLI, injeção e redação.
- **Hard link no Windows** (`medir_nlink.py`, scratchpad, `python -I`): `os.link(a, b)` → `lstat a 2 · stat a 2 · lstat b 2 · fstat b 2` (antes: 1). Veredito: `st_nlink` é confiável no Python 3.13.14 deste Windows, tanto no `lstat` (antes de abrir) quanto no `fstat` (depois de abrir).
- **`git show` com `--`** (repositório temporário com `cfg/.env` rastreado, git 2.53):
  - `git show cfg/.env` (DWIM) → 1 linha com `CANARIO` (reproduz o G2 do revisor);
  - `git show cfg/.env --` → `fatal: bad revision 'cfg/.env'`, exit 128;
  - `git show HEAD:cfg/app.txt --` → `ok` (a forma `<rev>:<caminho>` continua funcionando).
- **`--literal-pathspecs`** (mesmo repositório):
  - `git grep -e CANARIO -- 'cfg/*.env'` → `cfg/.env:1:CANARIO_ENV=…` (reproduz o G5);
  - `git --literal-pathspecs grep -e CANARIO -- 'cfg/*.env'` → nada, exit 1;
  - com diretório (`-- cfg`), `grep`, `log`, `ls-files`, `diff --stat` e `log --follow` seguem funcionando.
- **ReDoS do padrão de URL** (`medir_regex.py`, scratchpad; três variantes do padrão 6):

  | Variante | `"y"*16000` | `"y"*256K` | `"a1"*` 256K | `"ab-"*` 256K | `-postgresql://u:pw@h` | `1postgres://u:pw@h` |
  |---|---|---|---|---|---|---|
  | atual (`[a-z][a-z0-9+.-]*`) | 1,042 s | (não medido: quadrático) | — | — | redige | redige |
  | esquema limitado (`{0,31}`) | 0,004 s | 0,073 s | 0,037 s | 0,051 s | redige | redige |
  | lookbehind | 0,000 s | 0,006 s | 0,005 s | 0,005 s | **NÃO redige** | **NÃO redige** |

  Veredito: o lookbehind é mais rápido, mas vaza senha quando o esquema vem colado a `-`, `.` ou dígito. Escolho o **esquema limitado a 32 caracteres**: linear e sem regressão de redação (um esquema real tem menos de 32 caracteres; com prefixo maior, o motor acha um início dentro dos 32 anteriores ao `://`, como mostra o caso `"x"*40 + "postgres://…"`).

### P2 — código dos remédios (20:55Z)
Arquivos de produto tocados (todos em `scripts/agente-claude-api/agente_claude/`): `cerca.py`, `ferramentas.py`, `worktree.py`, `tarefas.py`, `cli.py`, `prompts.py`, `esquemas.py`, `parecer.py`, `orcamento.py`, `laco.py`, `executor.py`, `redacao.py`, `conta.py`. Resumo por achado na tabela da §2.
- Suíte antiga contra o código novo, ANTES de mexer nos testes: `.venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 130 tests` · `FAILED (failures=7, errors=1)`. As 8 quebras são exatamente os comportamentos que a revisão mandou mudar:
  - 4 em `TestVerificar` (`npm_argv_fixo`, `sem_npm_ci`, `teste_db`, `teste_inexistente`): o contexto do teste não liga `permitir_execucao_alvo`, e agora `espelho_codex`/`teste` são negados antes de qualquer outra regra (A1);
  - `test_git_show_objeto_com_pontopontos_negado`: o argv agora termina em `--` (A5);
  - `test_estouro_de_tokens_para_antes_da_proxima_chamada`: com teto de 1000 tokens, a 1ª chamada já não é feita, porque o próprio prompt passa do teto (A4);
  - `test_evidencia_conferida`: `"buscar tenant_id"` deixa de ser conferida — não é ferramenta + argumentos (A2);
  - `test_md_legivel_tem_veredito_custo_e_conta`: o achado saiu do cabeçalho para dentro do bloco de código (A3).
- Veredito parcial: nenhuma quebra fora do previsto; os testes são ajustados para a regra nova (não para "passar"), e cada regra nova ganha teste próprio com mutação.

### P3 — testes novos e suíte (21:20Z)
- Testes ajustados à regra nova (5): `TestVerificar` (o contexto base liga `permitir_execucao_alvo` para continuar exercitando as regras de `teste` que vêm depois do portão), `test_git_show_objeto_com_pontopontos_negado` (argv termina em `["HEAD:src/app.ts", "--"]`), `test_estouro_de_tokens_para_antes_da_proxima_chamada` (teto 60 000; a 1ª chamada cabe, a 2ª não), `test_evidencia_conferida` (cita `buscar {"padrao": "tenant_id"}`), `test_md_legivel_tem_veredito_custo_e_conta` (o achado está no bloco).
- Testes novos (30), por achado:
  - A1: `TestExecucaoDoAlvo` (5: padrão desligado em `ContextoComandos`/`Opcoes`/`WorktreeDescartavel`; recusa de `espelho_codex` e `teste` sem processo; liberação com a flag; recusa no laço com `is_error` + linha de auditoria `negado` + `execucao.permitir_execucao_alvo=false`; `--npm-ci` sem a flag recusado antes de criar, nas duas camadas), `test_hard_link_negado`, `test_hard_link_criado_depois_do_lstat_negado_no_arquivo_aberto`, `test_execucao_do_alvo_desligada_por_padrao_na_cli`, `test_parecer_registra_se_a_execucao_do_alvo_foi_permitida`, `test_mensagem_inicial_diz_se_a_execucao_do_alvo_esta_permitida`;
  - A2: `test_evidencia_conferida_so_com_chamada_real` (12 citações, incluindo os dois casos do L1);
  - A3: `TestParecerMdNaoForjavel` (2: a evidência L2 em resumo, arquivo, motivo, comando, saída e limitações, com ```` ``` ````, ```` `````` ````, 8 crases, `\r` solto e `#` de título; e o tamanho do delimitador);
  - A4: `test_previsao_conta_entrada_e_saida_antes_da_chamada`, `test_teto_menor_que_a_primeira_chamada_nem_chama`, `test_l3_um_turno_com_60_ferramentas_nao_estoura_o_teto`, `test_custo_final_nunca_passa_do_teto` (5 formas, com "custo real de cada chamada <= custo previsto"), `test_limite_de_ferramentas_por_turno`, `test_limite_de_bytes_de_resultado_por_turno`;
  - A5: `test_git_show_objeto_e_sempre_revisao`, `test_comandos_com_caminho_usam_pathspec_literal`, `TestGitReal` (2, git REAL em repositório temporário: `git show cfg/.env` não devolve o conteúdo; `cfg/*.env`, `cfg/[.]env*` e `cfg/.e?v` não expandem; controles positivos);
  - A6: `test_url_com_senha_redigida_com_esquema_colado`, `test_redacao_linear_em_texto_hostil`;
  - A7: `test_nada_executa_depois_do_parecer_no_mesmo_turno` (L4), `test_veredito_tem_de_valer_para_a_tarefa` (L5), `test_titulo_do_pr_nao_forja_linhas_da_primeira_mensagem` (L6, 8 tipos de quebra);
  - A8: `test_diff_externo_e_textconv_desligados`;
  - A10: `test_taskkill_recebe_ambiente_limpo`.
- **Suíte no venv:** `timeout 400 .venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 160 tests in 5.901s` · `OK`. Com `-v`: 160 `... ok`, 0 `skipped`.
- **Suíte no Python global sem o SDK:** `find_spec('anthropic')` → `None`; `timeout 400 python -B -m unittest discover -s tests -t .` → `Ran 160 tests in 5.885s` · `OK`.
- **B6:** `.venv/Scripts/python.exe -B -m unittest tests.test_suite -v` → `Ran 2 tests` · `OK`.
- `__pycache__` em `agente_claude/` e `tests/`: inexistente (rodei com `-B`).
- Veredito parcial: 160/160 nos dois Pythons, 0 pulados (130 → 160).

### P4 — README (21:30Z)
- "Por que ele é seguro": item novo 4 (nada do commit alvo roda por padrão); item 5 (ambiente limpo) diz que tira o segredo do ambiente do filho e NÃO impede um código executado de buscá-lo em outro lugar; item 6 (orçamento) descreve a previsão antes de cada chamada e os limites por turno (12 ferramentas, 384 KB).
- Seção nova "Rodar código do commit alvo (`--permitir-execucao-do-alvo`) — leia antes de ligar": roda como o usuário do Windows; alcança `HKCU` (onde mora a chave), o keyring do `gh` (escopos `repo` e `workflow`), o disco fora do worktree e a rede; a cerca vale contra o modelo, não contra esse código; só para SHA de autoria confiável; nunca PR de terceiro ou fork.
- Tabela de opções: `--permitir-execucao-do-alvo` (desligado) e `--npm-ci` (exige a flag). Parágrafo "Verificações disponíveis" diz o que cada uma exige.
- A11: a gravação da chave passou a ser `Read-Host -AsSecureString` + `[Environment]::SetEnvironmentVariable(..., "User")`, com o porquê (o histórico do PSReadLine e o `.bash_history` guardam o que se digita). O ID do workspace, que não é segredo, por `SetEnvironmentVariable` direto. A mensagem de recusa de `conta.py` deixou de ensinar `setx <chave>` e aponta para o README.
- "O que sai": a ordem do `parecer.md` (seções do script primeiro, conteúdo do modelo em blocos) e a regra nova do `evidencia.conferida` (ferramenta + argumentos normalizados; as duas formas aceitas; o que dá `false`).
- "O que a cerca NÃO cobre": a linha do `verificar teste`/`npm ci` virou a linha do código do alvo com a flag ligada; a linha do conteúdo protegido rastreado diz que `git_show <caminho>` é recusado e que os caminhos vão ao git como literais, e mantém declarado que `git_diff`, `gh_pr_diff`, `git_show <rev>` e `buscar` sem caminho ainda alcançam conteúdo protegido rastreado (classe declarada desde o bloco, A5).

### P5 — A9, declaração de registro (21:45Z; só medido, `decisoes.md` NÃO alterado)
- `git log origin/main..c876e6b0 -- agent-orchestration/controle/` → um commit só, `c876e6b0` (autor `thiagodorgo`, 2026-10-10T16:38:54-03:00), o do PR.
- Texto da `D-AGENTE-CLAUDE-API` no plano §8 × no `decisoes.md` do `c876e6b0` (extraídos por script, sem CR; `diff`): duas diferenças, exatamente as do A9(a):
  - linhas 12–13 do bloco: o plano lista `npm run check` na lista fechada; o commit diz que "o `npm run check` saiu na implementação, porque o `prisma generate` exige `DATABASE_URL` — `P-AGENTE-CHECK-SEM-GENERATE`";
  - linhas 31–32 do bloco: o plano diz "só depois de o dono gravar `ERP_AGENTE_ANTHROPIC_WORKSPACE` (medido: ausente em 2026-10-10)"; o commit diz que o dono gravou o workspace ("erp") ~19:00Z e que `GET /v1/models` respondeu 200 (gratuito).
- **Declaração pedida pelo orquestrador:** a `D-AGENTE-CLAUDE-API` foi **editada pelo orquestrador depois do plano**, nas duas passagens acima (a do `npm run check` e a do workspace). O relatório do dev (`B-AGENTE-API-dev.md` l.201-202) a descreve como "verbatim … não alterei" porque descreve o texto que o DEV anexou; a edição posterior não estava declarada no PR. O `GET /v1/models` (gratuito) foi feito **pelo orquestrador** às ~19:00Z; depois disso, **o dono** fez **duas chamadas pagas de teste**. Nenhuma dessas chamadas foi feita por mim (dev dos ajustes) nem pelo dev original nem pelo revisor.
- A9(c): o `pendencias-indice.md` mudou no `c876e6b0` (`13 +++++----`, a regeneração com a `P-AGENTE-CHECK-SEM-GENERATE`). O dev declarou não tê-lo regenerado (fora do §5 PERMITIDO); a regeneração entrou no commit do orquestrador. Declaro, não altero.

### P6 — rodada de mutação dos ajustes (21:50Z)
- Arnês `mutar_ajustes.py` (scratchpad, fora do repositório). Por mutação: a âncora casa **exatamente 1 vez** (bytes, LF; arquivos com 0 bytes CR) → **controle sem mutação** (OK com ≥ 1 teste) → aplica → roda os testes indicados com `.venv/Scripts/python.exe -B` e `__pycache__` apagado antes e depois → restaura os bytes e confere o `sha256` (aborta se falhar).
- Comando: `timeout 1500 python -I mutar_ajustes.py` → `TOTAL 30 · VERMELHAS 30`, exit 0. Registro por mutação em `mutacoes.jsonl` (scratchpad).
- Pós-rodada: `sha256sum -c sha-antes-mutacao.txt` (31 arquivos de `agente_claude/` e `tests/`) → 31 `OK`, 0 diferentes; `__pycache__` ausente; suíte de novo nos dois Pythons → 160/160 (venv 6,291 s; global 6,017 s).
- Veredito parcial: 30 de 30 mutações novas vermelhas pelo teste certo, com controle verde e restauração provada.

## 2. Tabela consolidada — achado × mudança × teste × mutação × vermelho medido

Todas as mutações: controle sem mutação = OK; restaurado por `sha256` = sim.

| Achado | Mudança | Teste(s) | Mutação | Vermelho medido |
|---|---|---|---|---|
| A1 | `ContextoComandos.permitir_execucao_alvo=False` (padrão) | `TestExecucaoDoAlvo` (5) | M-A1a: padrão `= True` | `Ran 5` · `FAILED (failures=2)` · `test_desligado_recusa_espelho_e_teste_sem_processo`, `test_padrao_e_desligado` |
| A1 | `Opcoes.permitir_execucao_alvo=False` (padrão) | `test_padrao_e_desligado`, `test_recusa_volta_ao_modelo_e_fica_na_auditoria` | M-A1b: padrão `= True` | `Ran 2` · `FAILED (failures=1, errors=1)` · os dois |
| A1 | CLI `--permitir-execucao-do-alvo` com `default=False` | `test_execucao_do_alvo_desligada_por_padrao_na_cli` | M-A1c: `default=True` | `Ran 1` · `FAILED (failures=1)` |
| A1 | portão em `_argv_verificar`: `espelho_codex` e `teste` → "não permitido nesta execução", antes de qualquer processo; a recusa vai ao modelo com `is_error` e à auditoria como `negado` | `TestExecucaoDoAlvo` (5) | M-A1d: `if False:` no portão | `Ran 5` · `FAILED (failures=1, errors=1)` · `test_desligado_recusa_…`, `test_recusa_volta_ao_modelo_…` |
| A1 | `npm ci` exige a flag: `RecusaPrevia` em `verificar_previo` (+ 2ª camada em `preparar`) | `test_npm_ci_sem_permissao_recusado_antes_de_criar` | M-A1e: `if False:` em `verificar_previo` | `Ran 1` · `FAILED (failures=1)` |
| A1 | CLI: `--npm-ci` sem a flag → exit 3 antes de qualquer processo | `test_execucao_do_alvo_desligada_por_padrao_na_cli` | M-A1f: `if False:` em `_opcoes` | `Ran 1` · `FAILED (failures=1)` (o `git rev-parse` passava a rodar) |
| A1 (hard link) | `ler_arquivo` recusa `st_nlink > 1` no `lstat`, antes de abrir | `test_hard_link_negado` | M-A1g: `if False:` no `lstat` | `Ran 1` · `FAILED (failures=1)` (o arquivo passava a ser aberto) |
| A1 (hard link) | 2ª camada: `fstat` do arquivo aberto | `test_hard_link_criado_depois_do_lstat_negado_no_arquivo_aberto` | M-A1h: `if False:` no `fstat` | `Ran 1` · `FAILED (failures=1)` |
| A1 (ordem) | o portão do A1 vem antes do de `--npm-ci`; o de `--npm-ci` continua valendo | `test_verificar_sem_npm_ci_devolve_erro_ao_modelo` | R1 (regressão): `if False:` no portão `npm_ci` | `Ran 1` · `FAILED (failures=1)` |
| A2 | `conferida` = (ferramenta, argumentos normalizados) iguais aos de uma chamada EXECUTADA; formas `<ferramenta> <JSON>` e `<ferramenta> chave=valor` | `test_evidencia_conferida_so_com_chamada_real` (12 citações, com os 2 casos do L1) | M-A2a: casar só pelo nome da ferramenta | `Ran 1` · `FAILED (failures=1)` |
| A2 | chamada negada pela cerca não é evidência | idem | M-A2b: aceitar evento `negado` | `Ran 1` · `FAILED (failures=1)` |
| A2 | normalização (null, false, "" e [] contam como ausentes) | idem | M-A2c: não normalizar | `Ran 1` · `FAILED (failures=1)` |
| A3 | delimitador do bloco maior que a maior sequência de crases | `TestParecerMdNaoForjavel` (2) | M-A3a: delimitador fixo de 3 crases | `Ran 2` · `FAILED (failures=2)` |
| A3 | texto do modelo sempre em bloco | `test_secoes_do_script_antes_e_conteudo_do_modelo_em_bloco` (evidência L2 em 6 campos) | M-A3b: resumo fora do bloco | `Ran 1` · `FAILED (failures=1)` |
| A3 | cabeçalho do achado só com enum, inteiro e bool do script | idem | M-A3c: `arquivo` no cabeçalho | `Ran 1` · `FAILED (failures=1)` |
| A3 | seções do script ANTES do conteúdo do modelo, marcadas "(gerado pelo script)" | idem | M-A3d: conteúdo do modelo antes de "## Veredito" | `Ran 1` · `FAILED (failures=1)` |
| A4 | custo: acumulado + pior caso da PRÓXIMA chamada (entrada estimada × 5/MTok + `max_tokens` × 20/MTok) > teto → não chama | `test_l3_um_turno_com_60_ferramentas_nao_estoura_o_teto`, `test_custo_final_nunca_passa_do_teto` (5 formas + "custo real ≤ previsto" por chamada) | M-A4a: sem previsão | `Ran 2` · `FAILED (failures=6)` |
| A4 | a entrada prevista conta os `tool_result` pendentes | idem | M-A4e: ignorar o que entrou depois da última chamada | `Ran 2` · `FAILED (failures=5)` |
| A4 | tokens: acumulado + entrada prevista + `max_tokens` > teto → não chama | `test_estouro_de_tokens_para_antes_da_proxima_chamada`, `test_previsao_conta_entrada_e_saida_antes_da_chamada` | M-A4d: só o acumulado | `Ran 2` · `FAILED (failures=2)` |
| A4 | no máximo 12 ferramentas executadas por turno (o resto volta "peça no próximo turno"; não é parada) | `test_limite_de_ferramentas_por_turno` | M-A4b: sem o limite | `Ran 1` · `FAILED (failures=1)` |
| A4 | no máximo 384 KB de `tool_result` por turno (corte sem partir entidade, aviso, `truncado="true"`) | `test_limite_de_bytes_de_resultado_por_turno` | M-A4c: sem o corte | `Ran 1` · `FAILED (failures=1)` |
| A5 | `git show <objeto> --` (o objeto é sempre revisão; fecha o DWIM de `git show cfg/.env`) | `test_git_show_objeto_e_sempre_revisao`, `TestGitReal.test_git_show_caminho_sem_dois_pontos_nao_le_conteudo` (git real) | M-A5a: sem `--` | `Ran 2` · `FAILED (failures=2)` |
| A5 | `--literal-pathspecs` em `buscar`, `git_log`, `git_diff` e `git_ls_files` (glob não expande depois da cerca) | `test_comandos_com_caminho_usam_pathspec_literal`, `TestGitReal.test_glob_no_caminho_nao_expande` (git real) | M-A5b: sem `--literal-pathspecs` | `Ran 2` · `FAILED (failures=2)` |
| A6 | esquema da URL limitado a 32 caracteres (linear) | `test_redacao_linear_em_texto_hostil` (5 textos hostis, < 1 s cada); `test_url_com_senha_redigida_com_esquema_colado` (sem regressão) | M-A6: volta o `*` | `Ran 1 test in 18.191s` · `FAILED (failures=1)` |
| A7(a) | nada executa depois de um `entregar_parecer` válido no mesmo turno (nem um 2º parecer) | `test_nada_executa_depois_do_parecer_no_mesmo_turno` (L4) | M-A7a: sem a checagem | `Ran 1` · `FAILED (failures=1)` |
| A7(b) | veredito por tarefa: `investigar` só `respondido`/`inconclusivo`; `revisar-pr` não aceita `respondido` | `test_veredito_tem_de_valer_para_a_tarefa` (L5) | M-A7b: sem a checagem | `Ran 1` · `FAILED (failures=1)` |
| A7(c) | título rotulado, numa linha, em JSON entre aspas | `test_titulo_do_pr_nao_forja_linhas_da_primeira_mensagem` (L6, 8 tipos de quebra) | M-A7c: título cru | `Ran 1` · `FAILED (failures=1)` |
| A7(c) | toda quebra de linha Unicode, controle e formatação invisível (Cc, Cf, Zl, Zp) vira espaço | idem | M-A7c2: só `\n` | `Ran 1` · `FAILED (failures=1)` |
| A8 | (sem mudança de código) `--no-ext-diff --no-textconv` presos por teste em `git_diff`, `git_log` e `git_show` | `test_diff_externo_e_textconv_desligados` | M-A8 = R4 do revisor: tirar do `git_diff` | `Ran 1` · `FAILED (failures=1)` (antes: R4 VERDE, 130/130) |
| A10 | `taskkill` com `env=ambiente_limpo()` | `test_taskkill_recebe_ambiente_limpo` | M-A10: sem `env=` | `Ran 1` · `FAILED (failures=1)` |
| A11 | README: `Read-Host -AsSecureString` + `SetEnvironmentVariable(..., "User")`; `conta.py` não ensina mais `setx <chave>` | — (texto) | — | — |
| A9 | declaração (§1, P5) | — | — | — |

## 3. Decisões de implementação e desvios declarados

| # | O quê | Por quê |
|---|---|---|
| J1 | `diff_check` continua liberado sem a flag | é só `git diff --check`; não roda código do commit (o `--check` não usa diff externo). |
| J2 | `--npm-ci` sem a flag é **argumento inválido** (exit 3), e não `npm ci --ignore-scripts` | `npm ci` só serve ao `teste`, que já exige a flag; deixá-lo rodar sem scripts gastaria disco e rede sem uso. |
| J3 | A 1ª mensagem diz ao modelo se a execução do alvo está permitida | evita turnos gastos pedindo o que vai voltar negado. O `system` e as ferramentas continuam congelados, por causa do cache. |
| J4 | A2 aceita duas formas de citação e nenhuma outra; `"5"` citado e `5` executado são a mesma chamada | para uma mesma chave a cerca só aceita um tipo, então essa equivalência não confere chamada que não houve. O `PROMPT_SISTEMA` passou a pedir a forma `<ferramenta> <JSON>`, com exemplo. |
| J5 | A7(b) também recusa `respondido` em `revisar-pr` | é a outra metade do plano §2.3 e do `PROMPT_SISTEMA`; custo zero. |
| J6 | A4: a previsão é de PIOR caso e pode parar antes do teto quando o histórico é grande | o teto passou a ser duro ("o custo final medido nunca passa"); o preço é reservar uma chamada de pior caso. Com os padrões (US$ 6, 8000 de saída), a reserva da 1ª chamada é ~US$ 0,25. Teto abaixo disso nem chama (teste próprio). |
| J7 | A4: o limite por turno não encerra a execução | o resto volta como `is_error` "peça de novo no próximo turno"; o modelo segue, e a previsão já conta o que voltou. |
| J8 | A5: o conserto fecha as duas vias medidas (G2, G5), não a classe inteira | `git_diff`, `gh_pr_diff`, `git_show <rev>` (o patch) e `buscar` **sem** caminho continuam alcançando conteúdo protegido **rastreado** — classe já declarada desde o bloco, agora com a redação exata no README. |
| J9 | A6: esquema limitado a 32, e não lookbehind | medido (P1): o lookbehind é mais rápido, mas deixa de redigir senha com esquema colado a `-`, `.` ou dígito. |
| J10 | `orcamento_estourado` antes da chamada passou a ter `detalhe` em objeto (`motivo`, `entrada_prevista_tokens`, `custo_previsto_usd`, `custo_acumulado_usd`); a linha `modelo` ganhou `entrada_prevista_tokens` e `custo_previsto_usd` | dá ao orquestrador o dado para calibrar a previsão no uso real (custo real × previsto, por chamada). |

## 4. Pendências e hipóteses, com dono

| Item | Dono | Situação |
|---|---|---|
| **[H] 1 token ≤ 1 byte UTF-8** do JSON — a base da previsão de pior caso do A4 | orquestrador, no 1º uso real | Não medido: medir exige `count_tokens`, uma chamada à API (proibida a este dev). A auditoria grava `entrada_prevista_tokens` e o `usage` real de cada chamada. No 1º `revisar-pr`, conferir que `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` ≤ `entrada_prevista_tokens` em todas as linhas `modelo`. Se falhar, a margem ou a razão tem de mudar antes de confiar no teto. |
| A5 residual: conteúdo protegido **rastreado** chega ao modelo por `git_diff`, `gh_pr_diff`, `git_show <rev>` e `buscar` sem caminho (só com a redação por padrão) | dono do repositório (nenhum segredo versionado) | Classe declarada no README desde o bloco; este ajuste fechou só as duas vias de contorno da negação por nome (G2, G5). |
| Com `--permitir-execucao-do-alvo` ligada, o worktree e a máquina deixam de ser confiáveis durante a execução | quem liga a flag | Declarado no README, sem eufemismo. O `ler_arquivo` recusa hard link como 2ª linha, mas `buscar` e `git_*` leem arquivos rastreados do worktree, que o código do alvo pode ter trocado. |
| Resíduo alheio: `%TEMP%\agente-suite-dssc53qv` (vazio, criado 16:57:49 -03:00 = 19:57Z) | orquestrador | Anterior ao início deste trabalho (20:14Z); provavelmente da execução real de STOP/Ctrl+C do revisor. Reportado, **não** apagado. |
| A9: `decisoes.md` e `pendencias-indice.md` | orquestrador | Declarado no §1 (P5); nada alterado por mim. |

## 5. Escopo e limpeza (C5)

- Arquivos tocados (`git status --short`): 13 módulos em `scripts/agente-claude-api/agente_claude/`, o `README.md` da pasta, 7 arquivos de teste em `scripts/agente-claude-api/tests/` e este relatório (novo, não versionado). Nada em `src/`, `prisma/`, `migrations/`, `infra/`, `.github/`, `Kpis/`, `package*.json`, `.env*`, `.claude/`, `.agents/`, `CLAUDE.md`, `AGENTS.md`, nem em `agent-orchestration/` (o A9 é só declarado).
- `git diff --check` (rastreados) → exit 0, sem saída. Relatório: 0 linhas com espaço no fim.
- `git worktree list | grep -c w-ag-` → 0; diretórios `C:/Users/AMP/w-ag-*` → 0. A `saidas/` tem só a evidência do B8 do dev (`20261010-193012Z-revisar-pr-416`, ignorada). `__pycache__` ausente.
- Scratchpad: removi o repositório temporário da medição do git (`repo-g`). Ficam os scripts de medição e de mutação, o `mutacoes.jsonl` e os `sha256`, todos fora do repositório.
- Nenhum comando foi barrado pelo classificador ou pela permissão; nada foi contornado.
- Nenhuma chamada à API da Anthropic. A chave não foi lida nem impressa: a suíte bloqueia o registro real e só usa chaves falsas montadas por concatenação. Sem commit, sem push.

## 6. Bateria final (N e forma)

- **Suíte, venv** (`.venv/Scripts/python.exe -B -m unittest discover -s tests -t .`): `Ran 160 tests` · `OK` · 0 pulados (`-v`: 160 `ok`, 0 `skipped`). Por arquivo (`ast`): ambiente 2 · auditoria 7 · caminhos 28 · comandos 33 · CLI 10 · conta 16 · injeção 7 · orçamento 14 · parada 5 · parecer 19 · redação 17 · suíte 2.
- **Suíte, Python global sem o SDK** (`find_spec('anthropic')` → `None`): `Ran 160 tests` · `OK`.
- **B6** (`tests.test_suite`): 2/2 OK (sem socket, sem `anthropic`).
- **Mutações novas:** 30 aplicadas, **30 VERMELHAS**, 30 restauradas por `sha256` (31/31 arquivos idênticos ao estado anterior à rodada).
- **`git diff --check`:** exit 0.
- Base: 130 testes no `c876e6b0` → 160 (30 novos; 5 ajustados à regra nova).

## N1/N2 (head f6abcaa0)

> Mesma identidade (`dev-agente-api-ajustes`), mesmo modelo (Claude **Opus 5.5**, nível menor), mesmas proibições: sem API, sem ler a chave, sem commit nem push. Insumo: `B-AGENTE-API-revisao.md`, seção "Reconferência dos ajustes" (N1, N2). O revisor não propôs correção; os remédios são os do orquestrador.

### Q0 — terreno (22:40Z)
- `git rev-parse HEAD` → `f6abcaa0e8a6f8252fcff5f7892d678200f92c78`; `git status --short` → vazio (os ajustes anteriores estão no `c727fb4e`; o `f6abcaa0` só acrescenta a reconferência ao parecer do revisor).
- `sha256sum agente_claude/*.py tests/*.py README.md` → gravado no scratchpad (`n1/sha-inicio-n1.txt`).

### Q1 — reprodução ANTES do conserto (`n1/medir_n1.py`, `Cenario` da suíte, falsos, sem rede)
| Caso | Resultado no `f6abcaa0` | Arquivos na pasta de saída |
|---|---|---|
| N1 exato: `comando = 'buscar ' + '{"a":'*3000 + '1' + '}'*3000` | **levanta `RecursionError`** | `['auditoria.jsonl']` |
| N1, forma `chave=valor`: `buscar padrao=` + `[`×3000 + `]`×3000 | **levanta `RecursionError`** | `['auditoria.jsonl']` |
| N1 com profundidade 100 000 | **levanta `RecursionError`** | `['auditoria.jsonl']` |
| Irmão medido da mesma classe: `resumo = "x\ud800y"` (surrogate solto no texto do modelo) | **levanta `UnicodeEncodeError`** | `['auditoria.jsonl', 'parecer.json.tmp']` |
| Entrada de ferramenta aninhada 3000 níveis (`buscar {"padrao": [[[…]]]}`) | `codigo=5` (o `redigir_objeto` da auditoria recursa; o laço cai) | `auditoria.jsonl`, `erro.txt`, `parecer.json`, `parecer.md`, `resumo.json` |

Veredito parcial: o N1 se reproduz nas três formas. Achei um quarto caminho da mesma propriedade, "conteúdo do modelo suprime o artefato de uma execução paga": o surrogate solto. O quinto caso já termina COM artefato; a própria API, com `strict`, não manda entrada fora do esquema. Ele fica declarado no §N-4.

### Q2 — conserto (23:05Z)
- **(1) N1, `parecer.py`:**
  - A citação passa por `_ler_citacao`. Teto de **8000 caracteres** na citação inteira e em cada texto que vai ao `json.loads`.
  - Teto de **profundidade 2**, medido por `profundidade_excede`: uma varredura linear, sem parse e sem recursão, que conta `[`/`{` fora de string JSON. Vale ANTES de qualquer `json.loads`, na forma JSON e em cada valor da forma `chave=valor`.
  - `_escalar` recusa lista dentro de lista e objeto: argumento de ferramenta deste agente é plano, profundidade 2. Por isso a recusa não perde evidência verdadeira.
  - `conferir_evidencia_com_motivo` **nunca levanta**. Qualquer falha, inclusive `RecursionError` e `MemoryError`, vira `conferida=false`.
  - O motivo vai em `evidencia.motivo_conferencia`: `conferida … #<seq>`, `não é texto`, `mais de 8000 caracteres`, `aninhada além da profundidade 2`, `forma não é …`, `nenhuma chamada executada …` ou `erro ao conferir (<Classe>)`. O `.md` mostra o motivo fora do bloco, como linha do script.
- **(2) Montagem à prova de falha, `tarefas.py`:**
  - Cada etapa tem a sua rede: `montar`, `parecer.json`, `parecer.md`, evento `fim` e `resumo.json`.
  - Se `montar` falha, entra o `parecer_de_emergencia`, só com campos do script, `parcial=true` e `motivo_parcial="falha_na_montagem:<Classe>"`. O parecer validado do modelo vai cru em `parecer_do_modelo_sem_montagem`.
  - O `parecer.json` é gravado PRIMEIRO. Se ele falha, grava-se o de emergência.
  - Havendo qualquer falha:
    - `parecer.json.falhas_de_gravacao` lista a falha (o campo está sempre presente; vazio quando não há falha);
    - o `erro.txt` recebe o traceback redigido, em modo de acréscimo;
    - o `fim` traz `falhas_de_gravacao`;
    - o **código de saída vira 5**.
  - O `fechar()` da auditoria está num `finally`.
- **Irmão do N1 (surrogate):** `errors="backslashreplace"` em todo arquivo gravado: `parecer.*` (`_escrever`), `auditoria.jsonl`, `resumo.json` e `erro.txt`. O surrogate vira o texto `\udXXX`, que é escape JSON válido.
- **(3) N2, `redacao.py`:** o padrão do JWT passou a `(?<![A-Za-z0-9_-])(?>[A-Za-z0-9_-]*?eyJ)[A-Za-z0-9_-]{8,}+\.[A-Za-z0-9_-]{8,}+\.[A-Za-z0-9_-]{8,}+`. Funciona assim:
  - o início só acontece na borda de uma sequência base64url;
  - o prefixo até o 1º `eyJ` é atômico;
  - os segmentos são possessivos.
- **Medições depois do conserto:**
  - `n1/medir_n1.py`: as 3 formas do N1 e o surrogate deram `codigo=0`, com `auditoria.jsonl`, `parecer.json`, `parecer.md` e `resumo.json`; a entrada aninhada de ferramenta segue em `codigo=5` com todos os artefatos (§N-4).
  - JWT: `'eyJ'*n` → 16 K 0,006 s · 64 K 0,021 s · 256 K 0,106 s (antes: 64 K 1,1 s; 256 K 17,6 s). Outras 4 formas hostis (`eyJ…` + ponto, cadeias com ponto, colado a `x `) ficaram ≤ 0,09 s em 256 K.
  - Semântica do JWT:
    - `Bearer <jwt>`, `"token":"<jwt>"` e `a.<jwt>` são redigidos como antes;
    - `x<jwt>` e `abc-<jwt>` (colados) são redigidos, junto com o prefixo colado;
    - os limiares (`eyJ` + ≥ 8, segmentos ≥ 8) são os mesmos de antes.
  - Varredura da PROPRIEDADE "todo padrão linear" (`n1/medir_redacao.py`, textos gerados do prefixo literal de cada padrão, com 5 formas cada): na régua de 16 K → 64 K, só o JWT antigo passava de razão 8 (16,7); todos os outros ficaram em ≤ 4,9.
- Suíte antiga sobre o código novo: `Ran 160 tests` · `OK`.

### Q3 — testes, mutações e bateria (23:40Z)
- **Testes novos (10):**
  - `tests/test_parecer_resiliente.py`, arquivo novo, 8 testes:
    - `test_n1_citacao_aninhada_nao_derruba_o_parecer`: uma execução inteira com 6 citações. São a reprodução EXATA do revisor, a profundidade 100 000, a forma `chave=valor` com 3000 níveis, uma citação curta e funda (1000 níveis, 6008 caracteres), uma longa e rasa (9100 caracteres) e o controle verdadeiro. O teste exige `codigo=0`, os 4 artefatos, o evento `fim`, `conferida` e `motivo_conferencia` esperados, e tempo < 10 s.
    - `test_qualquer_falha_na_conferencia_vira_false_com_motivo`: 10 entradas estranhas, mais `RecursionError` forçado dentro da conferência.
    - `test_profundidade_medida_sem_parse_e_sem_recursao`: `[`×1 000 000 em < 2 s; colchetes dentro de string e aspas escapadas não contam.
    - `TestGravacaoAProvaDeFalha` (5 testes): `.md` falha; montagem falha; `.json` falha uma vez; `.json` falha sempre; surrogate solto em `resumo`, achado e entrada de ferramenta.
  - Em `test_redacao.py`, 2 testes:
    - `test_jwt_colado_redigido_e_limiares_iguais`;
    - `test_todo_padrao_linear_em_texto_gerado`: a PROPRIEDADE. São 14 prefixos literais, um ou mais por padrão, em 5 formas hostis de 128 KB cada (70 textos); cada redação tem de levar < 1 s.
- **Mutações** (`n1/mutar_n1.py`, mesmo arnês: troca exata casando 1 vez, controle verde, `python -B` sem `__pycache__`, `sha256` restaurado) → `TOTAL 13 · VERMELHAS 13`, e `sha256sum -c` → 32/32 `OK`:

| Mutação | O que tira | Teste | Vermelho medido |
|---|---|---|---|
| M-N1a | o teto de profundidade | `test_n1_citacao_aninhada_…` | `Ran 1` · `FAILED (failures=1)` |
| M-N1b | os dois tetos de tamanho | idem | `Ran 1` · `FAILED (failures=1)` |
| M-N1c | **toda** a pré-checagem (tamanho + profundidade) | idem | `Ran 1` · `FAILED (failures=1)` |
| M-N1d | a pré-checagem **e** a rede da conferência (= o código do N1) | idem | `Ran 1` · `FAILED (failures=1)`: o `RecursionError` sobe, a rede da montagem (2) segura, e sai código 5 em vez de 0 |
| M-N1e | a rede da conferência | `test_qualquer_falha_na_conferencia_…` | `Ran 1` · `FAILED (errors=1)` |
| M-N1f | a rede da montagem | `test_montagem_falha_…` | `Ran 1` · `FAILED (errors=1)` |
| M-N1g | a rede do `.md` | `test_md_falha_…` | `Ran 1` · `FAILED (errors=1)` |
| M-N1h | a rede do `.json` | `test_json_falha_uma_vez_…`, `test_json_sempre_falha_…` | `Ran 2` · `FAILED (errors=2)` |
| M-N1i | o código 5 em falha de artefato | `test_md_falha_…` | `Ran 1` · `FAILED (failures=1)` |
| M-N1j | `backslashreplace` no `parecer.*` | `test_surrogate_solto_…` | `Ran 1` · `FAILED (failures=1)` |
| M-N1k | `backslashreplace` na auditoria | idem | `Ran 1` · `FAILED (failures=1)` |
| M-N1l | `backslashreplace` na medida de bytes da previsão | idem | `Ran 1` · `FAILED (failures=1)` |
| M-N2 | volta o padrão antigo do JWT | `test_todo_padrao_linear_em_texto_gerado` | `Ran 1 test in 5.235s` · `FAILED (failures=1)` (controle: 1,365 s para os 70 textos) |

- **N1 pela CLI** (`n1/cli_n1.py`, falsos da suíte, `revisar-pr 416` com a citação exata do revisor) → **exit 0**, `['auditoria.jsonl', 'parecer.json', 'parecer.md', 'resumo.json']`, worktree removido, `conferida False · não conferida: citação com mais de 8000 caracteres`, `parecer completo: veredito=aprovado`. Antes: exit 5, só `auditoria.jsonl`.
- **Suíte, venv:** `.venv/Scripts/python.exe -B -m unittest discover -s tests -t .` → `Ran 170 tests in 8.162s` · `OK`; `-v` → 0 `skipped`.
- **Suíte, Python global sem o SDK** (`find_spec('anthropic')` → `None`): `Ran 170 tests in 8.088s` · `OK`. `tests.test_suite` → OK.
- `git diff --check` → exit 0. O arquivo novo de teste e este relatório: 0 linhas com espaço no fim.

### N-4 — decisões, pendências e escopo
| # | O quê | Por quê / dono |
|---|---|---|
| K1 | Falha de artefato sai com **código 5** (erro interno), e não com um código novo | O contrato já garante, para o 5, que parecer, auditoria e resumo existem; agora isso vale também quando um artefato falha. `parecer.json.falhas_de_gravacao` e `erro.txt` dizem qual etapa falhou. Se o orquestrador quiser distinguir "revisão completa com artefato falho" de "erro interno", um código próprio custa uma linha mais o README. |
| K2 | O teto de profundidade é **2**, e não um número "folgado" | Argumento de ferramenta deste agente é sempre plano (objeto → lista → escalar). Uma citação mais funda não pode ser chamada executada; recusá-la não perde evidência. |
| K3 | O tamanho (8000) é conferido antes da profundidade | A reprodução exata do N1 (18 008 caracteres) e a de 100 000 níveis param no tamanho; a forma `chave=valor` (6014) e a curta e funda (6008) param na profundidade. Cada teto tem caso próprio e mutação própria. |
| K4 | `backslashreplace` em todo arquivo gravado e em toda medida de bytes | É o irmão do N1 medido aqui: um surrogate solto no texto do modelo suprimia os artefatos. Na medida de bytes, `backslashreplace` só aumenta o tamanho, então a previsão do A4 continua sendo de pior caso. |
| K5 | O padrão do JWT exige Python ≥ 3.11 (grupo atômico e quantificador possessivo) | O venv e o Python global são 3.13.14; o README passou a dizer o mínimo. |
| P-N4a | **Entrada de ferramenta aninhada** (o modelo manda `{"padrao": [[[…]]]}` com 3000 níveis) | Não é N1: já termina **com** todos os artefatos, mas com `codigo=5`. O `redigir_objeto` da auditoria recursa e o laço cai no 1º turno. Com `strict: true`, a API não entrega entrada fora do esquema; o caminho só existe com um modelo que viole o esquema. Fica declarado; dono: o próximo bloco do agente (limitar a profundidade em `redigir_objeto` e em `bytes_json`). |
| P-N4b | **[H] 1 token ≤ 1 byte** (A4) | Continua aberta, sem mudança: conferir no 1º uso real (§4). |
| N3 | CI do head (teste instável `san3-05-runtime-role-guard-db` T15) | Pré-existente, fora do escopo deste bloco; continua com o orquestrador e com o dono do #405. |

- **Escopo** (`git status --short`):
  - modificados: `agente_claude/{auditoria,ferramentas,laco,orcamento,parecer,redacao,tarefas}.py`, `README.md`, `tests/test_redacao.py` e este relatório;
  - novo: `tests/test_parecer_resiliente.py`;
  - nada fora de `scripts/agente-claude-api/**` e `docs/revisoes/GOV/`.
- **Limpeza:**
  - `git worktree list | grep -c w-ag-` → 0;
  - `%TEMP%\agente-suite-*` → 0;
  - `__pycache__` ausente.
  - No scratchpad, `n1/` guarda os scripts de medição e de mutação, `mutacoes_n1.jsonl` e os `sha256`, tudo fora do repositório.
- Nenhum comando foi barrado pelo classificador ou pela permissão. Sem chamada à API, sem ler a chave, sem commit nem push.
