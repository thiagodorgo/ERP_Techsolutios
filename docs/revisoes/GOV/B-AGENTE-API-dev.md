# B-AGENTE-API — Relatório do dev

> **Papel:** dev do bloco `B-AGENTE-API` (instância nova). **Modelo que rodou:** Claude **Opus 5.5** (`claude-opus-5-5`), **nível menor**, pela decisão do dono `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` (topo só no plano e em toda reprovação; dev em Opus declarado).
> **Fonte de verdade:** worktree `C:/Users/AMP/w-agapi`, ramo `chore/agente-claude-api`, head de partida `a6606e41` (plano + brief). Plano: `docs/revisoes/GOV/B-AGENTE-API-plano.md` (Fable). Implemento o plano; não o reescrevo.
> **Proibições respeitadas:** nenhuma chamada à API da Anthropic; o valor de `ERP_AGENTE_ANTHROPIC_KEY` nunca foi lido nem impresso; sem commit/push (o orquestrador versiona); nada fora do venv da pasta; base viva e portas intocadas.
> **Gravação:** incremental (P1). Cada passo traz comando → saída resumida → veredito parcial.

## 0. Estado

| Item | Estado |
|---|---|
| Leitura do brief e do plano | FEITO (2026-10-10T18:46Z) |
| Leitura do skill `claude-api` (5 arquivos) | FEITO |
| B1 venv / B2 pip / B3 [H1] | FEITO — [H1] confirmada (`default_headers`) |
| [H2] usage.output_tokens | FEITO — confirmada |
| Código `agente_claude/*` (17 módulos) | FEITO |
| Testes `tests/*` (130) | FEITO |
| B4/B5/B6 suíte | FEITO — 130/130 nos dois Pythons, 0 pulados |
| B7 mutações | FEITO — 48/48 vermelhas (2ª e 3ª passadas) |
| B8 simulação | FEITO — 1ª por arnês (chave real em HKCU), 2ª literal |
| B9 [H3]/[H4] | FEITO — [H3] ok; [H3b] generate exige DATABASE_URL, logo `npm_check` fora |
| B10–B12 | FEITO |
| B13 verificar-conta | NÃO EXECUTADO — proibição do mandato (sem chamada à API) |
| Registro (decisoes/pendencias) | FEITO — D-AGENTE-CLAUDE-API + P-AGENTE-CHECK-SEM-GENERATE |

## 1. Log de passos (comando → saída → veredito)

### P0 — terreno de partida
- `git rev-parse HEAD` → `a6606e41da96af3dcabd9dad6d650741e01176db`; ramo `chore/agente-claude-api`; `git status --porcelain` → vazio.
- `df -h /c` → `238G 221G 17G 93%`.
- `git worktree list` → 8 worktrees (principal + `w-03a`, `w-07ca`, `w-agapi`, `w-ciclo1-07ca-c2`, `w-govmod`, `w-pvpr`, `w-traccar`); nenhum `w-ag-*`.
- Veredito: terreno limpo; partida = a6606e41.

### P1 — leitura do skill `claude-api` (nunca de memória)
- `wc -l` → README 568 · tool-use 643 · tool-use-concepts 577 · error-codes 277 · prompt-caching 297 (= os números do §0.6 do plano). Lidos inteiros.
- Confirmados os pontos S1–S19 do plano nas linhas citadas. **Não aparecem nos cinco arquivos:** `default_headers` (construtor), `extra_headers` (por chamada), `Usage.output_tokens` → decididos por `inspect` no SDK instalado ([H1], [H2]).
- Veredito: referência fechada; o que não está no skill será medido no venv sem rede à API.

### B1 — venv ([H5])
- `cd scripts/agente-claude-api && timeout 300 python -m venv .venv` → exit 0; `.venv/Scripts/python.exe -c "import sys; print(sys.prefix, sys.version)"` → `C:\Users\AMP\w-agapi\scripts\agente-claude-api\.venv` · `3.13.14 ... [MSC v.1944 64 bit (AMD64)]`.
- Veredito: **[H5] confirmada** — o Python da Store cria venv funcional; o caminho alternativo do F1 não foi preciso.
- `.gitignore` local criado **antes** do pip (`.venv/`, `saidas/`, `__pycache__/`, `*.pyc`): `git check-ignore -v scripts/agente-claude-api/.venv/x scripts/agente-claude-api/saidas/x` → exit 0, regras `scripts/agente-claude-api/.gitignore:1` e `:2`.

### B2 — SDK fixado
- `requirements.txt` = `anthropic==1.13.0` (uma linha).
- `timeout 500 .venv/Scripts/python.exe -m pip install --disable-pip-version-check -r requirements.txt` → exit 0, `Successfully installed ... anthropic-1.13.0 ...`.
- `pip freeze`:
```
annotated-types==0.8.0
anthropic==1.13.0
anyio==4.15.1
docstring_parser==0.18.0
h11==0.16.0
httpcore2==2.13.1
httpx2==2.13.1
idna==3.20
jiter==0.17.0
pydantic==2.14.0
pydantic_core==2.50.0
sniffio==1.3.1
truststore==0.10.4
typing-inspection==0.4.4
typing_extensions==4.16.0
```
- Veredito: 15 pacotes, todos transitivos do SDK; nada no Python global.

### B3 — [H1] cabeçalho fixo `anthropic-workspace-id` (sem rede)
- `inspect.signature(anthropic.Anthropic.__init__)` → `(..., api_key, auth_token, credentials, config, profile, webhook_key, base_url, timeout, max_retries=2, default_headers: Mapping[str,str] | None = None, default_query, http_client, middleware, ...)`.
- `inspect.signature(Messages.create)` → parâmetros incluem `extra_headers`, `output_config`, `cache_control`, `tool_choice`, `thinking`, `system`, `tools` **e `workspace_id`** (docstring, `resources/messages/messages.py` l.387-392: *"Optional header to select the Workspace for this request ... Only needed for credentials that can act on more than one Workspace"*; o código põe `"anthropic-workspace-id": workspace_id` no cabeçalho, l.1024).
- **Veredito [H1]: CONFIRMADA.** Pela ordem de preferência do plano, uso `default_headers={"anthropic-workspace-id": <id>}` no construtor (vale em todo pedido). `extra_headers`/`workspace_id=` existem como alternativa, não usadas.
- Prova sem rede (chave FALSA, valores inventados): `Anthropic(api_key='CHAVE-FALSA-EXPLICITA', base_url='https://api.anthropic.com', default_headers={'anthropic-workspace-id':'ws-explicito'}).default_headers` → `anthropic-workspace-id = ws-explicito`.

### Achado de terreno A1 — `ANTHROPIC_CUSTOM_HEADERS` sobrescreve a chave explícita (fora da lista do plano)
- Código do SDK, `_client.py` l.244-251: `custom_headers_env = os.environ.get("ANTHROPIC_CUSTOM_HEADERS")` é lido **sempre**, mesmo com `api_key=` explícito, e mesclado nos cabeçalhos padrão.
- Medição (chave e valores FALSOS, sem rede): `ANTHROPIC_CUSTOM_HEADERS=$'x-api-key: FALSA-DO-AMBIENTE\n...'` + `Anthropic(api_key='CHAVE-FALSA-EXPLICITA', ...)` → `default_headers['x-api-key'] = FALSA-DO-AMBIENTE`. **A variável de ambiente troca a chave**: a cobrança iria para outra conta.
- Também lidos do ambiente pelo construtor: `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` (só sem credencial explícita, l.216-225), `ANTHROPIC_BASE_URL` (só sem `base_url=`, l.234-235), `ANTHROPIC_WEBHOOK_SIGNING_KEY` (l.231, irrelevante para `messages`), e o subsistema de credenciais (`ANTHROPIC_PROFILE`, `ANTHROPIC_CONFIG_DIR`, `ANTHROPIC_IDENTITY_TOKEN*`, `ANTHROPIC_WORKSPACE_ID`… em `lib/credentials/_constants.py`) — este só roda quando **não** há credencial explícita (l.271), e o agente sempre passa `api_key=`.
- **Regra aplicada (a do plano para o caso análogo, §4.1-2 e [H8]: "remover do `os.environ` do próprio processo antes de importar o SDK"), fechando a classe em vez da instância:** depois de validar `ANTHROPIC_BASE_URL`, `conta.higienizar_ambiente()` remove **todo** `ANTHROPIC_*` do `os.environ` do processo (superconjunto das três do plano: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_LOG`). Os nomes removidos vão para `inicio.conta.ignoradas[]` (nunca valores). Teste: `test_custom_headers_removido_do_environ` + o teste do plano `test_auth_token_e_log_removidos_do_environ`.
- Limitação declarada (não fechada aqui): variáveis de proxy/TLS do `httpx2` (`HTTPS_PROXY`, `SSL_CERT_FILE`…) — ver §5.

### [H2] — `usage.output_tokens`
- `anthropic.types.Usage.model_fields` → `['cache_creation', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'inference_geo', 'input_tokens', 'output_tokens', 'output_tokens_details', 'server_tool_use', 'service_tier']`.
- **Veredito [H2]: CONFIRMADA** — `output_tokens` existe; o `Orcamento` usa os quatro nomes medidos e o cliente falso os espelha.
- `StopReason` medido = `end_turn | max_tokens | stop_sequence | tool_use | pause_turn | refusal | model_context_window_exceeded`. O último **não está no skill**; o laço o trata como parcial (`motivo_parcial="model_context_window_exceeded"`), sem executar ferramentas do turno — mesma regra do plano para `max_tokens`/`refusal` (fail-closed).
- Erros (MRO medido): `BadRequestError`…`InternalServerError` ⊂ `APIStatusError` ⊂ `APIError`; `APIConnectionError` ⊂ `APIError` (irmã de `APIStatusError`, S14 confirmado); `APITimeoutError` ⊂ `APIConnectionError`. `APIStatusError` tem `.status_code`, `.request_id`, `.type`, `.response`.
- Resposta crua: `messages.with_raw_response.create` → `APIResponse` com `.headers` (`httpx2.Headers`), `.request_id`, `.parse()` (`_response.py` l.84, 300, 311).

### B9 — [H3]/[H3b]/[H3c]/[H4] (worktree descartável à mão, ambiente LIMPO do próprio agente)
- Script de medição no scratchpad (`b9_h3_h4.py`) que usa `agente_claude.cerca.ambiente_limpo()` e `agente_claude.executor.executar()` — mede exatamente o que o agente fará. `env` (nomes) = `APPDATA, CI, COMSPEC, CORE_SAAS_PERSISTENCE, FORCE_COLOR, GIT_PAGER, GIT_TERMINAL_PROMPT, HOMEDRIVE, HOMEPATH, LOCALAPPDATA, NO_COLOR, NUMBER_OF_PROCESSORS, NVM_HOME, NVM_SYMLINK, PATH, PATHEXT, PROCESSOR_ARCHITECTURE, PROGRAMDATA, SYSTEMDRIVE, SYSTEMROOT, TEMP, TMP, USERPROFILE, WINDIR, npm_config_*` (sem `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_*`).
- `git worktree add --detach C:/Users/AMP/w-ag-h3 9b611468` → código 0 (1,6 s).
- `npm.CMD ci` → código 0 (15,1 s, cache quente).
- `npm.CMD run check` **sem generate** → **código 2** (37,3 s): `error TS2305: Module '"@prisma/client"' has no exported member 'Prisma'` / `'PrismaClient'` em dezenas de `*-prisma.repository.ts`. **[H3] CONFIRMADA.**
- `node.EXE --test --import tsx tests/auth-jwt.test.ts` **sem generate**, sem `.env`, `CORE_SAAS_PERSISTENCE=memory` → código 0, `# tests 6 # pass 6 # fail 0`. **[H3c] e [H4] CONFIRMADAS.**
- `node.EXE node_modules/prisma/build/index.js generate` com ambiente limpo → **código 1**: `Failed to load config file ... PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.` **[H3b]: o generate EXIGE `DATABASE_URL`.** `npm run check` depois disso continua código 2.
- **Regra do plano aplicada (§0.7 [H3] coluna "Se falhar" e §8):** `npm run check` **sai da lista fechada neste bloco** (`verificar.nome` não aceita mais `npm_check`; o passo de `prisma generate` não entra na preparação) e vira a pendência `P-AGENTE-CHECK-SEM-GENERATE`. **Não** inventei `DATABASE_URL` inerte: o brief proíbe `DATABASE_URL` no ambiente das verificações, e o plano não autoriza. `teste` (node --test sem `-db`) segue na lista: roda sem generate.
- Custo de disco medido do `--npm-ci`: `du -sm C:/Users/AMP/w-ag-h3` = **488 MB** (worktree + `node_modules`).
- Limpeza: processos vivos com `w-ag-h3` na linha de comando = 0 (`Get-CimInstance Win32_Process`); `git worktree remove --force C:/Users/AMP/w-ag-h3` → exit 0; `git worktree prune`; diretório removido; `git worktree list | grep -c w-ag-` → 0.

### Achado de terreno A2 — ponto/espaço final só some no `realpath` quando o arquivo existe (refina o F22)
- Probe (`python -I`, scratchpad): `existe.pem.` → `realpath` = `existe.pem`; `existe.pem ` → `existe.pem`; **`nao_existe.pem.` → `nao_existe.pem.`** (o ponto fica); `nao_existe.key ` → fica; `abspath` tira nos dois casos.
- Regra do plano mantida (padrões casam no RESOLVIDO); acrescido, fail-closed: `nome_negado` e o teste de componente casam também com o nome sem ponto/espaço final (semântica do Win32 ao abrir). Teste `test_ponto_e_espaco_finais_casam_no_resolvido` cobre arquivo existente (a ameaça real) e inexistente.

### Suíte — cerca de caminhos
- `.venv/Scripts/python.exe -m unittest tests.test_cerca_caminhos -v` → `Ran 26 tests ... OK`, **0 pulados** (junction por `_winapi.CreateJunction`, symlink de arquivo e de diretório por `os.symlink`, 8.3 por `GetShortPathNameW` — todos criados de verdade nesta máquina).

### B4 / B5 / B6 — primeira passada (antes da rodada de mutação)
- B4 `.venv/Scripts/python.exe -m unittest discover -s tests -t . -v` → exit 0, `Ran 130 tests`, **ok=130 · skipped=0 · FAIL/ERROR=0**.
- B5 `python -m unittest discover -s tests -t .` no Python **global** (`importlib.util.find_spec('anthropic')` → `None`, SDK ausente) → exit 0, `Ran 130 tests ... OK`.
- B6 `.venv/Scripts/python.exe -m unittest tests.test_suite -v` → `Ran 2 tests ... OK` (`test_suite_nao_importa_anthropic`, `test_nenhum_teste_abre_socket`).
- Cobertura de nomes do plano, por script (regex `` `test_[a-z0-9_]+ `` no plano × `ast` dos testes): 120 nomes distintos no plano; 115 exatos presentes; os 5 restantes são abreviações do próprio plano (`test_symlink_*`, `test_nome_curto_83_*`, `test_soma_inclui_cache...`, `test_parecer_invalido_volta_is_error...`, `test_uma_linha_por_evento`), todas prefixo de método existente; 15 testes extras (A1, B9, CLI ponta a ponta, histórico append-only, PEM truncado, fim de contexto etc.).

### B7 — rodada de mutação (cerca × teste × mutação × vermelho medido)
- Arnês: `mutar.py` (scratchpad). Por mutação: âncora tem de casar **exatamente 1 vez** no arquivo (arquivos em LF, conferido: 0 bytes CR em `agente_claude/*.py` e `tests/*.py`) — prova de aplicação; aplica; roda só os testes indicados com o Python do venv; restaura os bytes originais e confere o **sha256**; aborta se a restauração falhar. Código inteiro conferido antes × depois por `sha256sum agente_claude/*.py` → **idêntico**.
- **1ª passada: 47/48 vermelhas; 3.3e VERDE.** Causa medida (não era teste fraco): a troca `Decimal("5")`→`Decimal("4")` tem o mesmo tamanho, e o `.pyc` guarda mtime em segundos + tamanho da fonte — gravado no mesmo segundo, o bytecode velho foi reusado (falso verde; o mesmo mecanismo poderia dar falso VERMELHO com um `.pyc` mutado velho). **Arnês corrigido**: `python -B` e `__pycache__` apagado antes e depois de cada execução. **2ª passada (a que vale): 48/48 VERMELHAS, 0 âncora inválida, 48/48 restauradas.**
- Mutações do §3 do plano executadas: 3.1 a–g (+h), 3.2 a–i, 3.3 a–e, 3.4 a (em duas: tool_result e auditoria)–e, 3.5 a–c, 3.6 a–c, 3.7 a–e (+ a2 "não higienizar"), 3.8 a–e, 3.9 a e c; + A1 (higiene só das 3 variáveis do plano deixaria `ANTHROPIC_CUSTOM_HEADERS`).
- **Não executada: 3.9 (b)** ("cerca consultando um campo `confiavel: true`"). Motivo: a mutação de UMA linha não fica vermelha por defesa em camadas — `_conferir_campos` rejeita qualquer campo fora do esquema antes de o resolvedor ser chamado; bypass exigiria mudar duas camadas. Registrado como limitação da rodada, não como verde.
- Mutações do plano cuja forma precisou de adaptação ao código real (mesmo efeito): 3.4(e) foi aplicada em `tarefas._gravar_erro` (onde o `erro.txt` é escrito); 3.7(a) virou "a chave vem de `ANTHROPIC_API_KEY`" (`VAR_CHAVE`) + 3.7(a2) "não higienizar", porque a higiene remove `ANTHROPIC_API_KEY` antes de qualquer leitura e um *fallback* de uma linha ficaria inerte; 3.7(e) foi aplicada no `except Exception` da CLI, e o teste `test_chave_nunca_impressa` ganhou um caso com exceção que chega à CLI com a chave na mensagem (antes, a exceção morria na tarefa e a mutação ficaria mascarada); 3.1(h) exigiu apertar `test_raiz_trocada...` para o motivo EXATO ("fora da raiz" também contém "raiz"); 3.6(b) exigiu que `test_ctrl_c_no_laco_grava_parcial` exija o evento gravado PELO LAÇO (o 2º nível, na tarefa, mascarava).

| Mutação | Cerca | Arquivo | O que a mutação faz | Teste(s) que a pegam | Resultado medido | Restaurado (sha256) |
|---|---|---|---|---|---|---|
| 3.1a | 1 raiz | `cerca.py` | realpath -> abspath em resolver | test_junction_para_fora_negada<br>test_symlink_dir_para_fora_negado<br>test_symlink_arquivo_para_fora_negado<br>test_nome_curto_83_negado_quando_destino_fora | **VERMELHO** — Ran 4 tests in 0.024s · FAILED (failures=4) | sim |
| 3.1b | 1 raiz | `cerca.py` | remover normcase do candidato | test_maiuscula_minuscula_mesmo_arquivo | **VERMELHO** — Ran 1 test in 0.008s · FAILED (failures=1) | sim |
| 3.1c | 1 raiz | `cerca.py` | padrões casados no texto de entrada em vez do resolvido | test_ponto_e_espaco_finais_casam_no_resolvido<br>test_nome_curto_83_de_arquivo_protegido_negado | **VERMELHO** — Ran 2 tests in 0.016s · FAILED (failures=1) | sim |
| 3.1d | 1 raiz | `cerca.py` | is_relative_to -> str.startswith | test_raiz_irma_com_prefixo_igual | **VERMELHO** — Ran 1 test in 0.007s · FAILED (errors=1) | sim |
| 3.1e | 1 raiz | `cerca.py` | apagar a checagem de ':' (ADS) | test_ads_negado | **VERMELHO** — Ran 1 test in 0.006s · FAILED (failures=1) | sim |
| 3.1f | 1 raiz | `cerca.py` | apagar a lista de dispositivos | test_dispositivo_negado | **VERMELHO** — Ran 1 test in 0.006s · FAILED (failures=1) | sim |
| 3.1g | 1 raiz | `ferramentas.py` | abrir o arquivo antes de validar | test_conteudo_negado_nunca_e_lido | **VERMELHO** — Ran 1 test in 0.010s · FAILED (failures=1) | sim |
| 3.1h | 1 raiz | `cerca.py` | não conferir a raiz gravada na criação | test_raiz_trocada_depois_de_criar_e_recusada | **VERMELHO** — Ran 1 test in 0.009s · FAILED (failures=1) | sim |
| 3.2a | 2 comandos | `executor.py` | shell=True | test_executor_sempre_shell_false_e_lista | **VERMELHO** — Ran 1 test in 0.009s · FAILED (failures=1) | sim |
| 3.2b | 2 comandos | `ferramentas.py` | env = os.environ (cópia) no lugar da allowlist | test_ambiente_limpo_nao_vaza_segredo | **VERMELHO** — Ran 1 test in 0.005s · FAILED (failures=1) | sim |
| 3.2c | 2 comandos | `cerca.py` | allowlist de rev -> denylist de --output | test_git_log_rev_com_hifen_negado | **VERMELHO** — Ran 1 test in 0.008s · FAILED (failures=1) | sim |
| 3.2d | 2 comandos | `cerca.py` | -db só como sufixo | test_verificar_teste_db_negado | **VERMELHO** — Ran 1 test in 0.009s · FAILED (failures=1) | sim |
| 3.2e | 2 comandos | `cerca.py` | gh sem -R do script | test_gh_repo_vem_do_script | **VERMELHO** — Ran 1 test in 0.008s · FAILED (failures=1) | sim |
| 3.2f | 2 comandos | `cerca.py` | padrão antes de -e | test_buscar_padrao_com_hifen_vai_depois_de_e | **VERMELHO** — Ran 1 test in 0.009s · FAILED (failures=1) | sim |
| 3.2g | 2 comandos | `executor.py` | executar sem timeout | test_timeout_marca_expirou | **VERMELHO** — Ran 1 test in 8.105s · FAILED (failures=1) | sim |
| 3.2h | 2 comandos | `ferramentas.py` | catálogo por getattr | test_ferramenta_desconhecida_e_error_e_auditada | **VERMELHO** — Ran 1 test in 0.111s · FAILED (errors=1) | sim |
| 3.2i | 2 comandos | `cerca.py` | arquivo do modelo por npm.CMD test -- | test_npm_argv_fixo_sem_campo_do_modelo | **VERMELHO** — Ran 1 test in 0.009s · FAILED (failures=1) | sim |
| 3.3a | 3 orçamento | `orcamento.py` | total sem cache | test_soma_inclui_cache_escrita_e_leitura | **VERMELHO** — Ran 1 test in 0.000s · FAILED (failures=1) | sim |
| 3.3b | 3 orçamento | `orcamento.py` | > no lugar de >= | test_limite_igual_conta_como_estouro | **VERMELHO** — Ran 1 test in 0.000s · FAILED (failures=1) | sim |
| 3.3c | 3 orçamento | `orcamento.py` | float no preço | test_custo_decimal_exato | **VERMELHO** — Ran 1 test in 0.001s · FAILED (errors=1) | sim |
| 3.3d | 3 orçamento | `laco.py` | orçamento de ferramentas só no fim do turno | test_estouro_de_ferramentas_no_meio_do_turno | **VERMELHO** — Ran 1 test in 0.061s · FAILED (failures=1) | sim |
| 3.3e | 3 orçamento | `orcamento.py` | preço de escrita de cache = 4 | test_custo_decimal_exato | **VERMELHO** — Ran 1 test in 0.001s · FAILED (failures=1) | sim |
| 3.4a1 | 4 segredos | `laco.py` | tool_result sem redação | test_tool_result_passa_pelo_redator | **VERMELHO** — Ran 1 test in 0.050s · FAILED (failures=1) | sim |
| 3.4a2 | 4 segredos | `auditoria.py` | auditoria sem redação | test_auditoria_redigida | **VERMELHO** — Ran 1 test in 0.066s · FAILED (failures=1) | sim |
| 3.4b | 4 segredos | `redacao.py` | regex da chave exige api03 | test_chave_anthropic_exata_e_por_padrao | **VERMELHO** — Ran 1 test in 0.000s · FAILED (failures=1) | sim |
| 3.4c | 4 segredos | `redacao.py` | URL: redige também o usuário | test_url_com_senha_preserva_usuario | **VERMELHO** — Ran 1 test in 0.001s · FAILED (failures=1) | sim |
| 3.4d | 4 segredos | `redacao.py` | IGNORECASE no padrão AWS | test_texto_sem_segredo_intacto | **VERMELHO** — Ran 1 test in 0.001s · FAILED (failures=1) | sim |
| 3.4e | 4 segredos | `tarefas.py` | erro.txt sem redação | test_excecao_do_sdk_redigida | **VERMELHO** — Ran 1 test in 0.047s · FAILED (failures=1) | sim |
| 3.5a | 5 auditoria | `auditoria.py` | gravar em lote (sem flush/fsync por evento) | test_uma_linha_por_evento_json_valido | **VERMELHO** — Ran 1 test in 0.008s · FAILED (errors=1) | sim |
| 3.5b | 5 auditoria | `laco.py` | auditar só ferramenta executada | test_ferramenta_negada_tambem_auditada | **VERMELHO** — Ran 1 test in 0.061s · FAILED (failures=1) | sim |
| 3.5c | 5 auditoria | `laco.py` | conteúdo de arquivo no evento | test_conteudo_de_arquivo_nao_vai_a_auditoria | **VERMELHO** — Ran 1 test in 0.070s · FAILED (failures=1) | sim |
| 3.6a | 6 parada | `laco.py` | STOP só no início do turno | test_stop_entre_ferramentas_do_mesmo_turno | **VERMELHO** — Ran 1 test in 0.051s · FAILED (failures=1) | sim |
| 3.6b | 6 parada | `laco.py` | except KeyboardInterrupt: raise (sem gravar no laço) | test_ctrl_c_no_laco_grava_parcial | **VERMELHO** — Ran 1 test in 0.055s · FAILED (failures=1) | sim |
| 3.6c | 6 parada | `auditoria.py` | STOP pelo conteúdo | test_stop_antes_do_modelo_encerra_sem_chamar | **VERMELHO** — Ran 1 test in 0.053s · FAILED (failures=1) | sim |
| 3.7a | 7 conta | `conta.py` | chave lida de ANTHROPIC_API_KEY | test_anthropic_api_key_ignorada_mesmo_presente<br>test_chave_do_processo_vence_registro | **VERMELHO** — Ran 2 tests in 0.001s · FAILED (failures=1, errors=1) | sim |
| 3.7a2 | 7 conta | `conta.py` | não higienizar ANTHROPIC_* do processo | test_auth_token_e_log_removidos_do_environ | **VERMELHO** — Ran 1 test in 0.000s · FAILED (failures=1) | sim |
| A1 | 7 conta (A1) | `conta.py` | higiene só das 3 variáveis do plano (deixa ANTHROPIC_CUSTOM_HEADERS) | test_custom_headers_removido_do_environ | **VERMELHO** — Ran 1 test in 0.001s · FAILED (failures=1) | sim |
| 3.7b | 7 conta | `conta.py` | pular a checagem de workspace | test_usuario_sem_workspace_para_antes_da_rede | **VERMELHO** — Ran 1 test in 0.050s · FAILED (failures=1) | sim |
| 3.7c | 7 conta | `conta.py` | base_url por startswith | test_base_url_outro_host_recusada | **VERMELHO** — Ran 1 test in 0.001s · FAILED (failures=1) | sim |
| 3.7d | 7 conta | `modelo.py` | thinking adaptive 'por segurança' | test_modelo_fixo_e_esforco_explicito | **VERMELHO** — Ran 1 test in 0.044s · FAILED (failures=1) | sim |
| 3.7e | 7 conta | `cli.py` | print do erro sem redator na CLI | test_chave_nunca_impressa | **VERMELHO** — Ran 1 test in 0.134s · FAILED (failures=1) | sim |
| 3.8a | 8 parecer | `modelo.py` | tool_choice forçado | test_tool_choice_nunca_forcado | **VERMELHO** — Ran 1 test in 0.058s · FAILED (failures=1) | sim |
| 3.8b | 8 parecer | `parecer.py` | confiar no comandos_executados do modelo | test_comandos_executados_vem_da_auditoria_nao_do_modelo | **VERMELHO** — Ran 1 test in 0.054s · FAILED (errors=1) | sim |
| 3.8c | 8 parecer | `laco.py` | pular a validação local | test_parecer_invalido_volta_is_error_e_modelo_tenta_de_novo | **VERMELHO** — Ran 1 test in 0.046s · FAILED (failures=1) | sim |
| 3.8d | 8 parecer | `laco.py` | re-pedir em laço até vir | test_sem_entregar_parecer_reprompt_uma_vez_depois_parcial | **VERMELHO** — Ran 1 test in 0.052s · FAILED (failures=1) | sim |
| 3.8e | 8 parecer | `laco.py` | executar ferramentas em refusal | test_refusal_nao_executa_ferramentas | **VERMELHO** — Ran 1 test in 0.054s · FAILED (failures=1) | sim |
| 3.9a | 9 injeção | `ferramentas.py` | tool_result sem escapar '<' | test_injecao_em_saida_de_comando_nao_escapa_do_envelope | **VERMELHO** — Ran 1 test in 0.052s · FAILED (failures=1) | sim |
| 3.9c | 9 injeção | `laco.py` | data no system | test_prompt_sistema_congelado_sem_data | **VERMELHO** — Ran 1 test in 0.022s · FAILED (failures=1) | sim |

### B8 — simulação ponta a ponta
- **Medição de terreno que muda o B8 escrito:** a chave real do dono está em `HKCU\Environment` (F27). A 1ª execução "sem chave no ambiente", rodada como CLI pura, faria o script **ler o valor real da chave do registro** — proibido ao dev. Executada por arnês (`b8_sem_chave.py`, scratchpad) que só troca `conta.ler_registro_usuario` por "ausente", tira `ERP_AGENTE_*`/`ANTHROPIC_*` do processo, bloqueia o SDK (`sys.modules['anthropic'] = None`) e registra toda chamada de processo; o resto é a CLI real (`cli.main(["revisar-pr","416","--simular"])`).
  - Saída: `recusado antes de começar: ERP_AGENTE_ANTHROPIC_KEY ausente no processo e em HKCU\Environment. Grave com: setx ...` · `codigo=3 processos=0 anthropic_importado=False`. **Exit 3, mensagem cita a variável, zero processos (nem git, nem gh, nem fetch).**
- **2ª execução, literal do plano:** `ERP_AGENTE_ANTHROPIC_KEY=sk-ant-teste-falso ERP_AGENTE_ANTHROPIC_WORKSPACE=wrkspc_teste .venv/Scripts/python.exe -m agente_claude revisar-pr 416 --simular` (as duas variáveis no processo: o registro nem é consultado).
  - Saída: `parecer completo: veredito=inconclusivo · custo US$ 0.00` · `pasta: ...\saidas\20261010-193012Z-revisar-pr-416` · **exit 0**.
  - `saidas/20261010-193012Z-revisar-pr-416/` = `auditoria.jsonl`, `parecer.json`, `parecer.md`, `resumo.json` (mantida como evidência, ignorada pelo git).
  - `parecer.json`: `alvo.sha = 9af697df441dec6716235bb8765ad2629f8bc9b6` (= `headRefOid` do #416, F16/F34, conferido com `FETCH_HEAD`), `modelo.respondeu = "simulado"`, `fallback_servidor = false`, `nivel = "menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)"`, `conta.origem_chave = processo`, `execucao.worktree = C:\Users\AMP\w-ag-20261010-193012`, `worktree_removido = true`, `sdk = anthropic 1.13.0`.
  - Auditoria: `1 inicio · 2 evento worktree_criado · 3 modelo · 4 ferramenta entregar_parecer · 5 evento worktree_removido · 6 fim`.
  - `git worktree list | grep -c w-ag-` → 0; `ls -d C:/Users/AMP/w-ag-*` → nenhum; `grep -c teste-falso` nos 4 arquivos → 0.
- **Prova extra (item 11 do revisor, antecipado):** `b8_stop_real.py` (scratchpad) sobe `investigar ... --simular --simular-turnos 5` como processo real e cria `STOP` (vazio) quando a auditoria tem 2 linhas `modelo`: `STOP criado após 2 turnos (6.4s)` → `parecer PARCIAL (STOP)` · **código 2** · auditoria `7 modelo (turno 3) · 8 evento stop_detectado "entre ferramentas do mesmo turno" · 9 ferramenta listar_diretorio negado=true motivo=STOP · 10 worktree_removido · 11 fim codigo_saida=2`. Saída gravada no scratchpad (fora do repositório).

### Achado de terreno A3 — sob mutação, um teste escreveu fora do temporário (corrigido)
- Depois do B8 havia **duas pastas a mais** em `saidas/` (19:28:14Z e 19:29:04Z). Origem medida pelo `parecer.json` delas: head `bbbb…` (o do repositório falso), chave de usuário sem workspace — eram da mutação 3.7b (pula a checagem de workspace) nas duas primeiras passadas: o teste que esperava recusa seguiu adiante sem `--saida`, gravou na `saidas/` real e o worktree falso criou e apagou `C:\Users\AMP\w-ag-<data>` (`worktree_removido: true`).
- Correção (só nos testes): `tests/__init__.py` aponta `tarefas.PASTA_SAIDAS` para um temporário da suíte (apagado no `atexit`); `deps_repo_falso` põe `USERPROFILE` no temporário; `test_conta.py` trocou `tempfile.mkdtemp()` sem limpeza por temporário com `addCleanup`. As duas pastas espúrias (artefato meu, dentro da `saidas/` ignorada) foram apagadas.
- **3ª passada da rodada de mutação, com conferência de escape:** 48/48 vermelhas; `ls saidas/` e `ls -d C:/Users/AMP/w-ag-*` idênticos antes × depois; 0 temporários `agente-suite-*` restantes.

### B10 — escopo e espaço em branco
- `git diff --check` (rastreados) → exit 0, sem saída.
- Arquivos novos (o git não os vê sem `add`): `grep -rnE "[[:blank:]]+$"` → **0 linhas**; todos terminam com newline.
- `git status --porcelain` → ` M agent-orchestration/controle/decisoes.md` · ` M agent-orchestration/controle/pendencias.md` · `?? docs/revisoes/GOV/B-AGENTE-API-dev.md` · `?? scripts/agente-claude-api/`. Expandido (`git ls-files --others --exclude-standard`): `.gitignore`, `README.md`, `requirements.txt`, 17 módulos em `agente_claude/`, 14 arquivos em `tests/` e este relatório. `.venv/`, `saidas/`, `__pycache__/` ignorados pelo `.gitignore` local. **Tudo dentro do §5 PERMITIDO; nada do PROIBIDO tocado.**

### B11
- `node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 49 agentes, espelho consistente.` exit 0.

### B12
- `grep -rn "shell=True\|ANTHROPIC_API_KEY\|os.environ.copy\|print(.*chave" agente_claude/` → 2 linhas, ambas no **docstring** de `conta.py` (l.4 e l.8, o porquê da regra). Não há `pop` nominal de `ANTHROPIC_API_KEY`: a higiene remove a classe inteira `ANTHROPIC_*` (A1); a mensagem de erro não cita `ANTHROPIC_API_KEY`. (Um `.pyc` em `__pycache__` também casava; `__pycache__` é ignorado e foi apagado na limpeza.)
- Item 3 do revisor, antecipado: `grep -rnE "shell=True|os\.system|os\.popen|/c\b" agente_claude/` → **0 linhas**.

### B13 — `verificar-conta`
- **Não executado.** Medido: `ERP_AGENTE_ANTHROPIC_WORKSPACE` **agora existe** em HKCU (`REG_SZ`, 31 caracteres, prefixo `wrkspc_`, casa a regex do script; valor não impresso) — o plano o tinha medido ausente (F27/F29). Mesmo com as duas variáveis presentes, o mandato do dev proíbe chamar a API: o primeiro uso real é do orquestrador, depois do merge.

### Registro
- `agent-orchestration/controle/decisoes.md`: anexada ao fim a seção `## Registro de 10/10/2026 (noite) — agente Python sobre a API do Claude (B-AGENTE-API)` com a `D-AGENTE-CLAUDE-API`, **verbatim** do §8 do plano (extraída por script do bloco markdown do plano; 32 linhas; CRLF como o resto do arquivo). Append-only: `git diff --stat` → 33 linhas a mais (bloco + linha em branco).
  - Nota: o texto verbatim diz "medido: ausente em 2026-10-10" sobre o workspace — era verdade na hora do plano; a medição nova está no B13 acima. Não alterei o verbatim.
- `agent-orchestration/controle/pendencias.md`: anexada `## P-AGENTE-CHECK-SEM-GENERATE (2026-10-10) — npm run check no worktree descartável exige prisma generate — BAIXA` (título do §8; corpo no formato F31; dono = dono do projeto). `git diff --stat` → 8 linhas a mais.
- `P-AGENTE-WORKSPACE-ID` **não** foi criada: a condição do §8 ("se o ID do workspace continuar ausente") não se cumpre — o nome existe em HKCU.
- `pendencias-indice.md` **não** foi regenerado: está fora do §5 PERMITIDO e o gerador (`gerar-indice-pendencias.py`) só escreve (não tem modo de conferência). Até o orquestrador rodá-lo, a pendência nova não aparece no índice.

## 2. O que foi feito e o que não foi

**Feito (dentro do §5 PERMITIDO):**
- `scripts/agente-claude-api/`: `requirements.txt` (`anthropic==1.13.0`), `.gitignore` local (`.venv/`, `saidas/`, `__pycache__/`, `*.pyc`), `README.md` em PT-BR, pacote `agente_claude/` com os 17 módulos da árvore do §2.1 (`__init__`, `__main__`, `cli`, `conta`, `modelo`, `cerca`, `executor`, `ferramentas`, `esquemas`, `prompts`, `orcamento`, `redacao`, `auditoria`, `laco`, `parecer`, `worktree`, `tarefas`) e `tests/` (`__init__`, `fakes`, 12 arquivos `test_*.py`, **130 testes**).
- venv em `scripts/agente-claude-api/.venv/` (Python 3.13.14), SDK `anthropic 1.13.0` + 14 transitivas; nada no Python global.
- Bateria do §6: B1–B12 executados com N e forma (seções acima). Rodada de mutação: 48 mutações, todas vermelhas.
- Registro: `D-AGENTE-CLAUDE-API` (verbatim do §8) e `P-AGENTE-CHECK-SEM-GENERATE`.

**Não feito, com motivo:**
| Item | Motivo |
|---|---|
| B13 `verificar-conta` | proibição do mandato do dev (nenhuma chamada à API; o primeiro uso real é do orquestrador, depois do merge). |
| `npm_check` na lista fechada de `verificar` | regra do plano para [H3]/[H3b] (B9): `npm run check` exige `prisma generate`, que exige `DATABASE_URL`. Pendência `P-AGENTE-CHECK-SEM-GENERATE`. |
| Passo de `prisma generate` na preparação do worktree | mesmo motivo; o passo sempre falharia com o ambiente limpo. |
| `P-AGENTE-WORKSPACE-ID` | condição do §8 não se cumpre (o nome já existe em HKCU, B13). |
| Regenerar `pendencias-indice.md` | fora do §5 PERMITIDO; o gerador só escreve. Fica para o orquestrador. |
| Mutação 3.9(b) | inexequível como mutação de uma linha: o `_conferir_campos` rejeita o campo `confiavel` antes do resolvedor (defesa em camadas). Não é um verde: não foi executada. |
| Commit, push, PR | proibidos ao dev; o orquestrador versiona. |
| 1ª execução do B8 como CLI pura | leria a chave real em HKCU; feita por arnês que só troca o leitor de registro (B8). |

## 3. Tabela consolidada — cerca × teste × mutação × vermelho medido

Detalhe por mutação na tabela do B7 (gerada do JSON da rodada). Aqui, por item da cerca (contagens geradas por `ast` dos arquivos de teste):

| # | Cerca (regra) | Onde vive | Testes | Mutações executadas → vermelhas (3ª passada, com `-B` e sem `__pycache__`) |
|---|---|---|---|---|
| 1 | Raiz confinada: `realpath` + `normcase` + `is_relative_to`; UNC, `\\?\`, `\\.\`, ADS, absoluto, outra unidade e `..` recusados na entrada; `.env*`/`*.pem`/`*.key`/`id_*`/`.git`/`node_modules`/dispositivos negados no resolvido; conteúdo negado nunca aberto | `cerca.Raiz`, `ferramentas._ler_arquivo/_listar_diretorio` | `test_cerca_caminhos.py` — 26 (junction, symlink e 8.3 reais; 0 pulados) | 3.1a–h → **8/8** |
| 2 | Comandos: ferramentas nomeadas, argv do script, flags por allowlist, `shell=False`, `stdin=DEVNULL`, executável absoluto, timeout com morte da árvore, saída truncada; ambiente por allowlist | `cerca.validar_argv`, `executor`, `cerca.ambiente_limpo/gh` | `test_cerca_comandos.py` — 22; `test_ambiente_limpo.py` — 2 | 3.2a–i → **9/9** |
| 3 | Orçamento: turnos, ferramentas (no meio do turno), tokens com cache, US$ em `Decimal` com previsão; `>=` | `orcamento`, `laco` | `test_orcamento.py` — 8 | 3.3a–e → **5/5** |
| 4 | Segredos: redação exata + padrões em tool_result, auditoria, parecer, `erro.txt`, CLI | `redacao`, `laco`, `auditoria`, `parecer`, `tarefas`, `cli` | `test_redacao.py` — 15 | 3.4a1, a2, b–e → **6/6** |
| 5 | Auditoria: JSONL por evento com `flush`+`fsync`, `seq`, negadas auditadas, sem conteúdo de arquivo, resumo mesmo em exceção | `auditoria`, `laco` | `test_auditoria.py` — 7 | 3.5a–c → **3/3** |
| 6 | Parada: `STOP` antes do modelo e de cada ferramenta; Ctrl+C em dois níveis | `laco`, `tarefas`, `executor` | `test_parada.py` — 5 (+ prova real no B8) | 3.6a–c → **3/3** |
| 7 | Conta e modelo: chave só de `ERP_AGENTE_ANTHROPIC_KEY` (processo → HKCU), higiene de todo `ANTHROPIC_*` (A1), `base_url` canônica, usuário sem workspace para antes da rede, `default_headers` com o workspace, modelo fixo, esforço explícito, sem `thinking`; request-id/rate limit/modelo que respondeu no parecer | `conta`, `modelo`, `tarefas`, `cli` | `test_conta.py` — 16; `test_cli.py` — 8 | 3.7a, a2, b–e, A1 → **7/7** |
| 8 | Saída estruturada: `entregar_parecer` estrito e validado localmente; `tool_choice` nunca forçado; re-pedido único; `refusal`/`max_tokens`/`pause_turn`/fim de contexto viram parcial; campos S do script | `esquemas`, `laco`, `parecer` | `test_parecer.py` — 14 | 3.8a–e → **5/5** |
| 9 | Injeção: cláusula de dado no system congelado; envelope com escape; ferramentas e system byte-idênticos em todo turno | `prompts`, `ferramentas.envelopar`, `laco` | `test_injecao.py` — 5 | 3.9a, c → **2/2**; 3.9b não executável (seção 2) |
| — | Suíte sem rede e sem SDK | `tests/__init__.py` | `test_suite.py` — 2 | — |
| | **Total** | | **130** | **48/48** |

## 4. Decisões de implementação e desvios declarados (o plano manda; isto é como o código o cumpre)

| # | O quê | Por quê / medição |
|---|---|---|
| D1 | Higiene remove **todo** `ANTHROPIC_*` do processo, não só as 3 do plano | A1: `ANTHROPIC_CUSTOM_HEADERS` troca o `x-api-key` explícito (SDK `_client.py` l.244-251). Mutação A1 prova o teste. |
| D2 | Padrões negados casam também sem ponto/espaço final | A2: `realpath` só os tira quando o arquivo existe. |
| D3 | Cabeçalho do workspace por `default_headers` | [H1], primeira preferência do plano; existe também `workspace_id=` em `messages.create` (docstring do SDK), não usado. |
| D4 | `stop_reason == "model_context_window_exceeded"` → parcial | Medido no `StopReason` do SDK; não está no skill. Mesma regra fail-closed do `max_tokens`. |
| D5 | Esquemas: todo campo em `required`, o opcional como `anyOf [tipo, null]` | O skill não diz como o modo estrito trata `required` parcial; assim o esquema vale em qualquer leitura. A cerca revalida tudo no código. |
| D6 | `--no-ext-diff --no-textconv` em `git log/show/diff` | Mesmo espírito da linha "negado: `--ext-diff`, `--textconv`" do §3.2: o script os desliga explicitamente. |
| D7 | `entregar_parecer` não consome o teto de ferramentas | Ele não executa nada; com o teto esgotado, o parecer final ainda é aceito. |
| D8 | Ctrl+C **durante a limpeza** não rebaixa o parecer | O 2º Ctrl+C aborta só a remoção do worktree; o parecer fica como estava e diz o comando exato de remoção. |
| D9 | Cabeçalhos de prova gravados: todo nome com `ratelimit` (superconjunto de `x-ratelimit-*`, [H7]), `retry-after`, `request-id`, `anthropic-workspace-id`, `anthropic-organization-id` | [H7] manda gravar o que vier; o SDK lê `anthropic-workspace-id` da resposta (`lib/streaming/_messages.py` l.66). |
| D10 | Saída da CLI forçada a UTF-8 | Num pipe do Windows a codificação padrão é cp1252; um `≈` na ajuda derrubaria a CLI (medido no `versao`: `·` virou `�`). |
| D11 | `--simular-turnos N` (com `--simular`) | Citado pelo plano no item 11 do revisor; espera 2 s por turno para dar tempo de criar `STOP`. |
| D12 | Executor lê a saída numa thread com teto de memória e mata a árvore por `taskkill /T /F` | `subprocess.run(timeout=)` pode pendurar no `communicate()` com netos segurando o pipe (`npm.CMD` → `cmd` → `node`); lição de 28-29/09. O teste de timeout usa o `python.exe` do venv, que é um lançador com processo filho — prova a morte da árvore (`duracao_ms < 6000` com `sleep(8)`). |
| D13 | Arnês de mutação com `python -B` e `__pycache__` apagado antes e depois de cada execução | 1ª passada deu falso verde (3.3e) por `.pyc` de mesmo tamanho gravado no mesmo segundo. |
| D14 | Suíte bloqueia o registro real (`winreg.OpenKey`/`QueryValueEx` lançam) e grava só em temporários | A chave real está em HKCU; A3 mostrou um teste escrevendo fora do temporário sob mutação. |

## 5. Limitações declaradas, com dono

| Limitação | Dono | Mitigação existente |
|---|---|---|
| `npm run check` fora da lista fechada | dono do projeto (`P-AGENTE-CHECK-SEM-GENERATE`) | o agente lê o código para tipos; `teste` sem `-db` funciona |
| Conteúdo de arquivo protegido **rastreado** (num commit ou no diff do PR) chega ao modelo por `git_diff`/`gh_pr_diff`/`git_show <rev>`/`buscar`, só redigido por padrão; a negação por nome vale para disco e para `git_show <rev>:<caminho>` | dono do repositório (nenhum segredo versionado) e revisor do PR | redação por padrão; um PR que versiona `.env` é exatamente o que o revisor deve apontar |
| Variáveis de proxy/TLS do `httpx2` (`HTTPS_PROXY`, `SSL_CERT_FILE`…) não são higienizadas | dono do ambiente | o TLS com `api.anthropic.com` continua valendo; documentado no README |
| `evidencia.conferida` é heurística (substring normalizada do comando na auditoria) | orquestrador que lê o parecer | `comandos_executados` vem inteiro da auditoria, com argv real |
| Itens do §3.11 do plano (rede de teste do repositório, scripts do `npm ci`, CPU/disco, escopo do token do `gh`, objetos do `git fetch`, qualidade do julgamento, chave em memória/HKCU, dois processos na mesma pasta) | os donos que o plano nomeia | tabela "O que a cerca NÃO cobre" do README |
| O texto verbatim da `D-AGENTE-CLAUDE-API` diz "workspace ausente" (verdade na hora do plano) | orquestrador (registro) | medição nova no B13 |
| `pendencias-indice.md` sem a pendência nova | orquestrador | rodar `gerar-indice-pendencias.py` |
| Primeiro uso real (`verificar-conta`, depois `revisar-pr 416`) não foi feito | orquestrador, depois do merge | `--simular` exercitou tudo menos a chamada real |

## 6. Classificador e permissões

Nenhuma ação foi barrada pelo classificador ou pela permissão durante a construção (criação do pacote, do executor com `taskkill`, dos testes com junction/symlink, do `npm ci` do B9, do `git fetch`/`worktree add/remove` do B8). Nada foi contornado.

## 7. Limpeza (C5)

Removidos: worktree de medição `C:/Users/AMP/w-ag-h3` (488 MB; 0 processos vivos antes; `git worktree remove --force` + `prune`); worktrees `w-ag-*` do B8 (removidos pelo próprio agente); 2 pastas espúrias de `saidas/` (A3); `__pycache__/` de `agente_claude/` e `tests/`; temporários da suíte (`atexit`). Ficam: `.venv/` (ignorado) e `saidas/20261010-193012Z-revisar-pr-416/` (evidência do B8, ignorada). Artefatos de medição no scratchpad da sessão (fora do repo): `b9/`, `b8/`, `mutacao/`. `git worktree list` sem `w-ag-*`.

## 8. Bateria final (N e forma)

- **B4** venv: `Ran 130 tests ... OK` — ok=130, skipped=0, FAIL/ERROR=0.
- **B5** Python global sem o SDK: `Ran 130 tests ... OK`.
- **B6**: 2/2 OK.
- **B7**: 48 mutações, **48 vermelhas**, 48 restauradas por sha256, código idêntico antes × depois; nada escapou do temporário.
- **B8**: 1ª → exit 3, 0 processos; 2ª → exit 0, parecer + auditoria + resumo, worktree removido; STOP real → exit 2.
- **B9**: [H3] confirmada; [H3b] generate exige `DATABASE_URL` → `npm_check` fora; [H3c]/[H4] confirmadas (auth-jwt 6/6).
- **B10** limpo · **B11** OK (49 agentes) · **B12** 2 linhas de docstring, 0 de código · **B13** não executado (mandato).
