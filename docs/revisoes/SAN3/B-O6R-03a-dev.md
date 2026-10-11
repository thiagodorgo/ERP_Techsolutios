# B-O6R-03a — relatório incremental do DEV

- Identidade: `dev-03a-codex`
- Papel: DEV (implementa o plano; não o reescreve nem o julga)
- Modelo declarado: Codex em GPT-5.6 Sol, nível menor
- Worktree: `C:/Users/AMP/w-03a`
- Ramo: `fix/expense-sync-atomic`
- HEAD inicial esperado e medido: `76bd103b9910b4272fd90640aeb3b0362fccdab7`
- Decisão aplicada: `D-03a-MESMA-CHAVE-OUTRO-ATOR = A` (2026-10-11): a ação é única por organização + `client_action_id`; pertence ao primeiro ator; outro ator recebe conflito e não produz lançamento.

## 2026-10-11T18:16:47Z — pré-voo e fontes

**Comando:** `git fetch origin; git branch --show-current; git rev-parse HEAD; git status --short --branch`

**Saída resumida:** fetch `ec=0`; ramo `fix/expense-sync-atomic`; HEAD `76bd103b9910b4272fd90640aeb3b0362fccdab7`; árvore limpa e alinhada a `origin/fix/expense-sync-atomic`.

**Estado:** VERDE. Ref e worktree correspondem ao mandato.

**Comando:** leitura integral, nesta ordem, de `docs/revisoes/SAN3/B-O6R-03a-plano.md`, `docs/revisoes/SAN3/B-O6R-03a-CRITICA-r2.md` e `docs/revisoes/SAN3/B-O6R-03a-EMENDA-v3.md`; antes disso, leitura integral do contrato canônico `CLAUDE.md`, `PROJECT_MEMORY.md` e skill multi-tenant, com consulta do estado/controle/log operacional.

**Saída resumida:** v2 exige atomicidade por ação, compatibilidade legada, prova por fingerprint/ator e matriz de mutações; r2 devolveu apenas A-04 como bloqueante; v3 troca K2 por K2t (`P + JSON([client_action_id])`) e torna o primeiro ator dono. A decisão A do dono satisfaz o pré-requisito da v3. `prisma/**` e `migrations/**` permanecem proibidos.

**Estado:** VERDE. Não foi encontrada premissa falsa sem regra de tratamento.

**Comando:** `git rev-parse HEAD; git status --short; node --version; npm --version; Get-Item node_modules; docker ps -a --filter name=^/dev03a-; Get-NetTCPConnection -LocalPort 58443`.

**Saída resumida:** HEAD confirmado; árvore limpa; Node `v20.19.5`; npm `11.7.0`; `node_modules` é diretório próprio, sem junction/symlink; nenhum container `dev03a-*`; porta `127.0.0.1:58443` livre.

**Estado:** VERDE. Próximo passo: `npm ci` próprio no worktree, com timeout.

## 2026-10-11T18:18:11Z — dependências próprias

**Comando:** `timeout 900 npm ci --no-audit --no-fund` no próprio `C:/Users/AMP/w-03a`.

**Saída resumida:** `ec=0`; 326 pacotes instalados em 35 s. Aviso `EBADENGINE` preexistente de `@prisma/streams-local@0.1.2` (pede Node >=22; runtime do repo é Node 20.19.5), sem falha de instalação.

**Estado:** VERDE. Nenhuma junction/symlink foi criada. Próximo passo: subir `dev03a-pg` em `127.0.0.1:58443`, aplicar somente migrations existentes e executar baseline integral antes de editar produto.

## 2026-10-11T18:19:31Z — PostgreSQL descartável

**Comando:** `timeout 60 docker run --detach --name dev03a-pg --publish 127.0.0.1:58443:5432 ... postgres:16`; espera causal por `pg_isready`; `docker ps --filter name=dev03a-pg`.

**Saída resumida:** container próprio `dev03a-pg` ativo; imagem `postgres:16`; bind exclusivo `127.0.0.1:58443->5432`. Nenhum serviço/base viva foi usado.

**Estado:** VERDE.

**Comando:** `DATABASE_URL=<dev03a-pg> timeout 300 node node_modules/prisma/build/index.js migrate deploy`.

**Saída resumida:** `ec=0`; 108 migrations versionadas encontradas e aplicadas; banco `dev03a` em `127.0.0.1:58443`. Nenhum arquivo em `prisma/**` ou `migrations/**` foi alterado.

**Estado:** VERDE. Próximo passo: suíte backend integral de baseline, em modo `memory` explícito e com `DATABASE_URL` apontando apenas ao container próprio.

## 2026-10-11T18:21:01Z — primeira tentativa de baseline (preparo incompleto)

**Comando:** `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<dev03a-pg> REDIS_URL=redis://127.0.0.1:63843 timeout 1800 node scripts/run-backend-tests.mjs`.

**Saída resumida:** runner encontrou 301 arquivos, mas falhou em cascata antes de medir produto: `@prisma/client` sem export `Prisma` e módulo `.prisma/client/default` ausente. Isso ocorreu imediatamente após `npm ci`, que removeu o cliente gerado local. Execução interrompida após confirmação repetida da mesma causa; `ec=1`. Nenhum resultado desta tentativa conta como baseline.

**Estado:** VERMELHO DE PREPARO, com regra explícita no plano §10.2: gerar o cliente somente se ausente/desatualizado. Próximo passo: `prisma generate` contra o banco próprio e repetir integralmente.

## 2026-10-11T18:22:07Z — cliente Prisma local

**Comando:** `DATABASE_URL=<dev03a-pg> timeout 180 node node_modules/prisma/build/index.js generate`.

**Saída resumida:** `ec=0`; Prisma Client `v7.8.0` gerado em `node_modules/@prisma/client` em 3,14 s. O aviso de versão 8 disponível foi ignorado; dependências e lockfiles não foram alterados.

**Estado:** VERDE. Próximo passo: repetir a suíte integral de baseline, sem reutilizar contagens da tentativa inconclusiva.

## Retomada 21:19Z — `dev-03a-claude` substitui `dev-03a-codex` (P3)

- Identidade NOVA: `dev-03a-claude`. Modelo: **Claude Opus 5.5 (`claude-opus-5-5`), nível menor** (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`), cobrindo o Codex, que está no limite até 23:15Z (`D-CLAUDE-SO-ORQUESTRA`).
- Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-03a-claude.txt` (orquestrador). Implemento o plano v2 + emenda v3 (onde divergem, vale a v3) + `D-03a-MESMA-CHAVE-OUTRO-ATOR = A`. Não reescrevo nem julgo o plano.
- Regra P3: cada comando registrado acima é re-executado e comparado; conclusão sem comando não é insumo. O que segue é só o que eu medi.

### R0 — ref e terreno

**Comando:** `git fetch origin; git rev-parse HEAD; git branch --show-current; git status --short; git diff --stat 76bd103b HEAD; docker ps -a; node --version; npm --version; cmd /c dir /AL C:\Users\AMP\w-03a; uname -a`

**Saída resumida:** HEAD `3a648ca4fc92b551a9f15ea470c0452d4b55e981` (o do mandato), ramo `fix/expense-sync-atomic`, árvore limpa. Entre o HEAD do Codex (`76bd103b`) e o atual, só `docs/revisoes/SAN3/B-O6R-03a-dev.md` (+67, o relatório parcial) — zero diff de produto. Node `v20.19.5`, npm `11.7.0` (iguais aos registrados). Nenhuma junction no worktree. Container `dev03a-pg` **não existe mais** (o Codex o removeu ou ele caiu com a sessão); vivos só `trc01-pg`/`trc01-redis` (do outro agente — não tocados) e `erp-postgres`/`erp-redis` (base viva — proibida). Máquina `MINGW64_NT-10.0-22631` (Windows do dono, local).

**Estado:** VERDE. Diferença com o registro: o container precisa ser recriado.

### R1 — re-execução dos comandos registrados pelo Codex (P3)

| Comando registrado | Minha saída | Igual ao registro? |
|---|---|---|
| `timeout 900 npm ci --no-audit --no-fund` | `ec=0`, **326** pacotes, 18 s; aviso `EBADENGINE` de `@prisma/streams-local` (pede Node >=22) | sim (326 pacotes, mesmo aviso) |
| causa do "vermelho de preparo": `ls node_modules/.prisma/client; node -e "require('@prisma/client').Prisma"` logo após o `npm ci` | diretório ausente; `MODULE_NOT_FOUND Cannot find module '.prisma/client/default'` | sim — reproduz a causa registrada (o `npm ci` apaga o cliente gerado). Não re-rodei o runner inteiro em cascata: a causa foi medida diretamente. |
| porta: `netsh interface ipv4 show excludedportrange protocol=tcp`; `Get-NetTCPConnection -LocalPort 58443` | 58443 livre e fora de toda faixa reservada (as reservas vão de 54861–56019 e 64297–65426, mais 5357 e 50000–50059) | sim (mesma porta) |
| `timeout 60 docker run --detach --name dev03a-pg --publish 127.0.0.1:58443:5432 … postgres:16` (senha aleatória descartável, fora do relatório) | container `dev03a-pg`, `127.0.0.1:58443->5432/tcp`; pronto (2ª linha "ready to accept connections") | sim |
| `DATABASE_URL=<dev03a-pg> timeout 300 node node_modules/prisma/build/index.js migrate deploy` | `ec=0`, 36 s; `SELECT count(*) FROM _prisma_migrations` → **108**; `SHOW default_transaction_isolation` → `read committed` | sim (108) |
| `DATABASE_URL=<dev03a-pg> timeout 180 node node_modules/prisma/build/index.js generate` | `ec=0`, Prisma Client **v7.8.0** em 2,21 s; `typeof require('@prisma/client').Prisma` → `object` | sim (v7.8.0) |

**Acréscimo meu (não registrado pelo Codex):** Redis próprio, porque o job `backend` da CI roda com Redis real (`ci.yml:35`) e o §10.2 manda criar um próprio se a suíte precisar: `timeout 60 docker run --detach --name dev03a-redis --publish 127.0.0.1:58444:6379 redis:7` → `PONG`. 58444 fora das faixas reservadas.

**Estado:** VERDE. Todas as saídas registradas foram reproduzidas. Próximo passo: baseline integral (a tentativa do Codex não contou).

### R2 — vermelho-controle no código do HEAD-base (antes de editar produto)

**Comando:** sonda própria `vc-head.mts` (scratchpad da sessão, fora do repo), `CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 120 node --import tsx vc-head.mts C:/Users/AMP/w-03a`, com o código do HEAD `3a648ca4` (produto intocado). Ela exercita o serviço antigo pelas interfaces que já existem (v2 §3, "Vermelho-controle").

**Saída resumida (ec=0):**
- **VC1 colisão u1/u2:** u1 cria `X1` (`processed`, `replayed:false`, resultRef `fb2ab28d…`); u2 (gestor) envia `X1` → `processed`, `replayed:true`, **resultRef de u1 (`fb2ab28d…`) entregue a u2**; relatórios = 1.
- **VC2 divergência silenciosa:** u1 cria `X2` com `advanceAmount 100`; reenvia `X2` com `999` → `processed`, `replayed:true`; valor persistido segue 100 — o divergente sai como sucesso.
- **VC3 UUID inválido:** item com `reportId` canônico v4 (`4be437fd-369a-4cae-b800-aaf64622448a`) → `400 EXPENSE_INVALID invalid_uuid`.
- **VC4 crash depois do efeito:** o recibo falha depois do relatório criado → relatórios = 1 sem recibo; o retry da mesma chave → `processed`, `replayed:false`, **relatórios = 2**.

**Estado:** VERMELHO-CONTROLE reproduzido nos quatro defeitos do v2 §3, no código antigo.

### R3 — drill §10.5 item 3a (v3): binário antigo diante de um recibo K2t

**Comando:** sonda própria `drill3a-old-binary.mts` (adaptação da `head_rollback.mts` da r2, com K2t = `P + JSON.stringify([id])`, `P = "expense-sync-v2/".padEnd(161, "~")`), mesmo modo e mesmo HEAD-base.

**Saída resumida (ec=0):** `K2t.length = 201`; estado deixado pela versão nova (relatório + recibo K2t, sem recibo cru) → relatórios = 1; o binário antigo recebe o replay fiel de X → `[{"status":"processed","replayed":false}]`, **relatórios = 2**.

**Estado:** perigo confirmado, como a v3 pede no 3a (1 → 2). É evidência do risco do rollback simples, não teste da suíte. A prova de "rota inacessível" saiu do dev pela v3 (vai para a `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO`).

### R4 — baseline integral ANTES de editar produto (HEAD `3a648ca4`)

**Comando:** `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<dev03a-pg> REDIS_URL=redis://127.0.0.1:58444 timeout 2400 node scripts/run-backend-tests.mjs` (mesma forma do job `backend` da CI: modo memory exportado, Postgres e Redis reais, ambos próprios).

**Saída resumida:** `ec=1`, 499 s. **301 arquivos · 3288 testes · pass 3278 · fail 8 · skipped 2** (os 2 skips são os nomeados do orçamento do runner, `permission-catalog-db-parity`, gated por `RBAC_DB_PARITY`). As 8 linhas `not ok`, todas fora de despesa:

| # | Teste | Causa medida | Classe |
|---|---|---|---|
| 1–3 | `B-SAN3-05` T14a/b, T14c, T14d | `psql: command not found` (`scripts/db-runtime-role.sh:36`) | ambiente Windows (sem `psql`) |
| 4 | `B-SAN3-05` T15 | `processo filho não encerrou em 3311ms` | ambiente (a mesma suíte; boot de processo filho) |
| 5 | `B-SAN3-05` (pai, "4 subtests failed") | agrega 1–4 | ambiente |
| 6 | `san3-09 T2` T2.1 | `node_modules\.bin\prisma:2` (shim do prisma no Windows) | ambiente (shim do prisma) |
| 7 | `san3-09 T2` (pai) | agrega 6 | ambiente |
| 8 | `o6r07c-subresource-scope-db` "[negativo · anexo] …" | `Transaction API error: … timeout 5000 ms, however 5155 ms passed` no teardown | carga da suíte inteira em paralelo; **re-rodado sozinho** (`node scripts/run-backend-tests.mjs tests/o6r07c-subresource-scope-db.test.ts`) → **6/6 pass, 0 fail**, 4 s |

Os itens 1–7 são as falhas de ambiente conhecidas do mandato (`psql` e shim do prisma; o mandato fala em 6 — aqui são 5 testes + 2 linhas-pai). O item 8 é intermitência de carga, fora do módulo de despesa, e não reproduz isolado.

**Estado:** baseline registrada. TAP integral em `scratchpad/dev03a/baseline-full.tap` (fora do repo). Próximo passo: implementação (produto liberado para edição só agora — a suíte lia `src/` durante a medição).

### R5 — forma dos erros do Prisma medida antes de escrever os mapeamentos

**Comando:** sonda própria `probe-errors.mts` (scratchpad, fora do repo) em `dev03a-pg`, tenant descartável `probe03a-*` apagado no `finally`; `DATABASE_URL=<dev03a-pg> timeout 120 node --import tsx probe-errors.mts C:/Users/AMP/w-03a`.

**Saída resumida (ec=0):**
- FK de work order no `create` e no `update` de relatório: `P2003`, `meta.driverAdapterError.cause = { originalCode: "23503", kind: "ForeignKeyConstraintViolation", constraint: { index: "expense_reports_tenant_id_work_order_id_fkey" }, originalMessage: '… "expense_reports_tenant_id_work_order_id_fkey"' }`. A FK do empregado chega com `constraint.index = "expense_reports_tenant_id_employee_user_id_fkey"` — é ela que NÃO pode virar 404 de work order.
- PK de `mobile_action_receipts`, direta e com espera (A segura a linha sem commit, B espera, A commita): as duas formas trazem `P2002`, `originalCode 23505`, `constraint.fields = ["tenant_id","client_action_id"]` e o nome `"mobile_action_receipts_pkey"` no `originalMessage`.
- Transação que espera a PK além do prazo: o INSERT fica preso no servidor; o Prisma só acusa na operação seguinte — `P2028`, `meta.operation = "commit"`, `timeout 5000`.

**Estado:** VERDE. Os classificadores `isSyncReceiptKeyViolation` e `isWorkOrderForeignKeyViolation` (em `expense-sync.ts`) leem a IDENTIDADE da restrição nessas formas medidas; violação não identificada propaga.

### R6 — implementação (produto)

Arquivos, todos no PERMITIDO do v2 §6.2:
- `src/modules/expense-management/expense-sync.ts` (novo): K2t = `P + JSON.stringify([id])` (v3) com `P` de 161 caracteres ASCII e decoder estrito; lookup compatível sempre ligado (`findCompatibleSyncReceipts`: chave crua E K2t, por busca exata); `SyncClaim` com marca; comando normalizado com campos explícitos e fingerprint v2 `{v:2, tenantId, actorUserId, clientActionId, type, normalized}` em JSON canônico; códigos de conflito; 503 `EXPENSE_SYNC_UNAVAILABLE/sync_busy` para a lista fechada de transitórios (cópia declarada da do estoque — `P-O6R-B03-TRANSIENT-CODES-DUPLICADOS`); classificadores da PK do recibo e da FK de work order.
- `expense-management.repository.ts`: porta `withSyncTransaction` + interface do repositório ligado à transação (claim, complete, lookup compatível, prova com ator obrigatório, agregado original); `createMobileActionReceipt` (find-then-create) REMOVIDO; memória com fila por instância, snapshot dos cinco mapas e restore no throw.
- `expense-management-prisma.repository.ts`: métodos ligados ao `tx`; `RlsPrisma…withSyncTransaction` = `withTenantRls(client, tenantId, tx => work(new PrismaExpenseManagementRepository(tx)))`; P2003 da FK de work order → 404 `work_order_not_found` no `createReport` e no `updateReport`.
- `expense-management.service.ts`: parse separado do efeito; fluxo do v2 §4.3; resolução da v3 (dono → ambíguo → legado → K2t); rotinas internas compartilhadas por REST e sync; evento de sync do item aponta o RELATÓRIO.
- `expense-management.types.ts` (tipos de prova/complete, `errorCode`), `expense-management.dto.ts` (`errorCode`), `expense-management.validators.ts` (só a regex da l.10: grupos 8-4-4-4-12), `index.ts` (export).

**Comandos:** `timeout 300 npm run check` → ec 0. `timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts` → **6/6 pass**, 0 fail (os seis testes antigos intactos, sem edição).

**Estado:** VERDE no tipo e nos seis antigos. Próximo passo: T-C, T-B, T-A.

### R7 — testes do bloco (primeira execução, antes das mutações)

Arquivos de teste (PERMITIDO do v2 §6.2): `tests/expense-sync-fingerprint.test.ts` (T-C, novo), `tests/expense-management-routes.test.ts` (T-B: seis antigos intactos + oito novos; o arnês ganhou só o usuário `managerA`, papel `manager`), `tests/expense-sync-atomic-db.test.ts` (T-A, novo).

Decisões de arnês (medidas, não herdadas):
- T-A roda o serviço em **dois papéis efêmeros** do arnês compartilhado (`createEphemeralRole` de `tests/helpers/auth-identity-fixture.ts`: `NOSUPERUSER`, sem `BYPASSRLS`, dentro do lock de catálogo). O arquivo novo não contém nenhuma palavra de escrita de catálogo — o ratchet `db-catalog-write-guard` não ganha entrada.
- A barreira é a escopada da suíte (`waitForOwnBlockedStatement`, `application_name = o6r-expense-sync-atomic-<pid>`), nunca sleep para ordenar. A única espera fixa é a do A9, e ela É o objeto do teste (passar do prazo de 5 s da transação interativa).
- A fixture do A12′/B7′ mora no T-C (`A12_ITEM_ACTION_FIXTURE`) e é importada por T-A e T-B com `EXPENSE_SYNC_FIXTURES_ONLY=1` (o T-C não registra testes naquele processo). Assim o C9 prova a pré-condição da MESMA fixture que o A12′ usa.
- A15 (reinício) é um processo Node NOVO (`node --import tsx --input-type=module -e …`), com módulos e cliente Prisma novos, que reenvia a ação e devolve o resultado em JSON. Ele usa a conexão do arnês (a propriedade é o determinismo da chave entre processos; RLS é provado no A0/A8).
- Falha injetada por subclasse de `RlsPrismaExpenseManagementRepository` que embrulha o repositório LIGADO à transação num proxy com ganchos antes/depois de métodos (o efeito de m4 — usar o repositório externo — escapa do proxy e do `tx`, e por isso fica visível).

**Comandos e saídas:**
- `timeout 300 node --test --import tsx tests/expense-sync-fingerprint.test.ts` → **9 testes · 9 pass · 0 fail** (1ª execução teve 1 fail no C7 por id duplicado NA FIXTURE do próprio teste — `(P + JSON(["x"])).slice(0,160)` é igual a `P.slice(0,160)`; troquei por `P.slice(0,120)+JSON(["x"])`; não é defeito de produto).
- `timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts` → **14 testes · 14 pass · 0 fail · 0 skipped**.
- `DATABASE_URL=<dev03a-pg> timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts` → **24 testes · 24 pass · 0 fail · 0 skipped**, 121 s (A2b 21,7 s; A9 11,5 s).
- Total do bloco: **47 = 24 + 14 + 9**, a meta da v3 (≥47).

**Estado:** VERDE na primeira execução — por isso mesmo, sem valor de prova até as mutações. Próximo passo: a matriz de mutações do §5 (v2 + v3), uma a uma, com sha256 de restauro.

### R8 — contrato e CI (PERMITIDO do v2 §6.2)

- `API_CONTRACTS.md` §3.11: linha da rota anotada e bloco novo **`mobile_expense_sync@2026-10-11.b-o6r-03a`** (uma transação por ação; a ação pertence a quem a enviou primeiro — `D-03a-MESMA-CHAVE-OUTRO-ATOR = A`; tabela de status/`errorCode`; erros do lote com o `503 sync_busy` novo e o `404 work_order_not_found`; condição de publicação/rollback). `git grep API_CONTRACTS tests scripts` → nenhum teste lê o arquivo.
- `.github/workflows/ci.yml`: UMA entrada `SUITES="$SUITES tests/expense-sync-atomic-db.test.ts"` + comentário, logo depois de `inventory-migration-drill-db` (job `backend-postgres`, sob o guard de zero pulos). Nada mais do workflow mudou. No job `backend`, o runner já pega o arquivo pela varredura de `tests/`.

**Estado:** VERDE. Diff: `API_CONTRACTS.md` +45/−1; `ci.yml` +5.

### R9 — matriz de mutações, rodada 1 (exploratória, sobre o código de R6/R7)

**Comando:** driver próprio `mutate.py` (scratchpad): por mutação, sha256 antes → aplica com âncora de contagem EXATA 1 (LF-normalizada, regravada em CRLF) → roda só os testes-alvo (`node --test --import tsx --test-name-pattern=…`) → restaura os bytes → confere sha256 → roda os alvos de novo. 36 mutações (+ `FIXdev` de calibração). Spec gerado por `spec.py`; log integral `mutations-round1.log` / `.jsonl` (scratchpad).

**Saída resumida:** 36/36 restauros com sha256 igual ao anterior; `sha256sum -c` dos 13 arquivos do bloco contra o instantâneo pré-mutação → todos OK. Retorno verde em 100% dos alvos. Vermelhos e sobreviventes, como medidos:
- **sobreviveram, como o v2 §5 previa:** `m1` (marca `SyncClaim`; `npm run check` ec 0, A1/A2 verdes) e `m6` (efeito antes do claim, no MESMO tx; A1/A2c verdes);
- **vermelhos em todos os alvos:** m3, m5, m9a, m9b, M10i, C3-mut, M11, M11′, M11″, M12, M14, M14r, M15, M16, M17, M17+M10c, M18, A10mut, A9mut, A7bmut, A7bwide, A13mut, A8mut, A4hash, A4field, A0super, FIXdev;
- **vermelho em parte dos alvos — é o desenho, registrado:** `m2` (A2 vermelho; A2c verde — o gancho do A2c dispara dentro da transação externa do claim e a mata); `m4` (A2 e A2b vermelhos; A2c verde — a falha do A2c é ANTES do efeito; A6 verde — o claim-primeiro serializa e o perdedor nunca roda o efeito); `m8` (C1 vermelho; A4b verde — o normalizado já nasce em ordem fixa); `M10c` (C3 e A12b vermelhos; A12′ verde — a conferência de dono da v3 pega antes da prova); `M13` (A11 e C8 vermelhos; A11d verde — os casos do A11d são incompletos e saem antes do ponto mutado);
- **vermelho, mas por PENDURA, não por asserção:** `m7` e `A1noclaim` no A1 — sem claim bem-sucedido o gancho "depois do claim" nunca dispara e o `await gate.claimed` pendura ("Promise resolution is still pending"). O A2 (m7) e o A6 (A1noclaim) ficaram vermelhos por asserção.

**Achados desta rodada sobre os PRÓPRIOS testes (corrigidos em R10):**
1. A1/A3c/A5 penduram se quem segura a PK falhar antes do claim → o teste passa a correr a espera do claim contra o desfecho do segurador e falha com a razão dele.
2. A11 parava na primeira forma de id que falhava → passa a exercitar as 4 formas e nomear CADA uma no vermelho (M11′ e M11″ precisam disso para provar a separação das formas).

**Achado sobre o PRODUTO (medido por leitura do censo, corrigido em R10):** o guard do 07c-a (`tests/helpers/o6r07c-census.ts`, `analisarTipos`) trata toda comparação com `X.type` como despacho de tipo e falha quando o outro lado não é constante. `legacy.actionType !== prepared.type` e `receipt.actionType !== prepared.type` cairiam em `naoResolvidos` → guard vermelho. A comparação não é despacho (é conferência do tipo gravado no recibo); o campo de `PreparedSyncAction` passa a se chamar `actionType`, o mesmo nome do campo do recibo. Por isso a rodada 1 é exploratória: a matriz OFICIAL roda de novo (R11) sobre o código final.

### R10 — correções da rodada 1 e o guard do censo do 07c-a

**Mudanças:** `PreparedSyncAction.type` → `actionType` (`expense-sync.ts`, `service.ts`; puramente nominal); T-A com `reachedClaim` (A1/A3c/A5 correm a espera do claim contra o desfecho do segurador) e A11 exercitando as 4 formas antes do veredito.

**Comandos e saídas:**
- `timeout 300 npm run check` → ec 0.
- `timeout 900 node scripts/run-backend-tests.mjs tests/o6r07c-census-guard.test.ts` → **31/31 pass**, 80 s.
- **Vermelho-controle do achado do censo:** troquei (backup + sha256) `legacy.actionType !== prepared.actionType` por `legacy.actionType !== prepared.command.type` no serviço e rodei o mesmo guard → **ec 1, 30 pass / 1 fail**, com `TIPO-NAO-RESOLVIDO: src/modules/expense-management/expense-management.service.ts:253: legacy.actionType !== prepared.command.type`; restaurado com sha256 igual (`0340348cc96cbcec`). A leitura de R9 está confirmada por execução.
- T-C 9/9 · T-B 14/14 · T-A 24/24, 0 skipped (16,6 s, banco já aquecido).

**H3 (v2 §1.4):** `git grep -n -E "mobileActionReceipt|MobileActionReceipt|mobile_action_receipts|expenseEvent\.|expense_events" -- src ':!src/modules/expense-management/**'` → vazio; busca de DML (`delete/update/upsert/create…` sobre recibo, evento, relatório e item fora do módulo; `DELETE FROM`/`UPDATE` cru em `src`, `scripts`, `prisma/migrations` além da fundadora) → vazio. Nenhum escritor externo dessas tabelas.

### R10b — registro do §9 (v2) e da v3

- `agent-orchestration/controle/pendencias.md` (append): linha de status PARCIAL na `P-O6R-B03` + 9 entradas `P-O6R-B03-*` — UUID-PATTERN-INVALIDO, EVENTO-DE-ITEM-VIOLA-FK, COMPATIBILIDADE-LEGADA e PROVA-DE-REPLAY-POR-ATOR como **fechadas na autoria**; FILA-POR-USUARIO (nova da v3, dono 03b, trava o QUA-001), CONTRATO-CONFLITO-POR-ACAO (inclui a N-03 da r2), APP-RECEIPT-ATTACH-NAO-SUPORTADO, TRANSIENT-CODES-DUPLICADOS e PUBLICACAO-SEM-WRITER-ANTIGO como **abertas**. PR e head ficam "a preencher pelo orquestrador" — o dev não commita.
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`: linha `- Status: fechado NA AUTORIA do B-O6R-03a …` sob `Ω6R-DIN-009`. `achados.jsonl` e `Kpis/**` NÃO foram tocados (KPI congelado; o guard `kpi-achados-paridade` só cobra o Markdown quando o JSONL diz `fechado`).
- O registro em `controle/decisoes.md` da decisão do dono e dos conflitos de fonte (l.243 do `PLANO_SAN3`, Runbook A, trava (c)) é o **passo 0 da v3, do orquestrador** — não foi feito por mim.
- `git diff --check` nos quatro arquivos de registro/contrato → ec 0.

### R11 — matriz de mutações OFICIAL (rodada 2, sobre o código final de produto)

**Comando:** `cd scratchpad/dev03a && timeout 5400 python mutate.py mutations-spec-v2.json` — o mesmo driver de R9, spec regenerado (`spec.py` → `mutations-spec-v2.json`, 36 mutações, 42 âncoras, todas com contagem 1 antes de rodar). Instantâneo sha256 pré-rodada: `sha-before-round2.txt` (13 arquivos). Uma mutação por vez, num só processo.

**Saída resumida:** `ec=0`; 36/36 restauros com sha256 igual ao de antes; retorno verde em todos os alvos. A tabela (gerada do `.jsonl` oficial, `mutations-round2-official.jsonl`) — "verde" no mutado é sobrevivência; a razão é a 1ª linha útil do TAP:

| Mutação | Esperado | Mutado (alvo: resultado) | Razão do vermelho (1ª linha útil) | sha256 antes→mutado→restaurado · retorno |
|---|---|---|---|---|
| m1 | pode sobreviver (marca de tipo; v2 §5) | npm run check: ec 0; T-A A1: verde; T-A A2: verde |  | `expense-sync.ts` 8acf1c3e→3c0cd436→8acf1c3e · verde |
| m2 | A2/A2c vermelhos (claim confirmado fora do tx = recibo órfão) | T-A A2: VERMELHO; T-A A2c: verde | error: /- create / completeMobileActionReceipt before: rollback REAL — contagens, total, status e recibo intactos | `expense-management.service.ts` 0340348c→b4c95608→0340348c · verde |
| m3 | A2/A2b vermelhos (sem fronteira transacional: cada operação confirma sozinha) | T-A A2: VERMELHO; T-A A2b: VERMELHO | error: /- create / completeMobileActionReceipt before: rollback REAL — contagens, total, status e recibo intactos | `expense-management-prisma.repository.ts` b8ecfc51→8903ec80→b8ecfc51 · verde |
| m4 | A2/A2b/A2c vermelhos nos três tipos; A6 vermelho (efeito pelo repositório externo) | T-A A2: VERMELHO; T-A A2b: VERMELHO; T-A A2c: verde; T-A A6: verde | error: /- create / completeMobileActionReceipt before: rollback REAL — contagens, total, status e recibo intactos | `expense-management.service.ts` 0340348c→b83348ad→0340348c · verde |
| m5 | A1 vermelho (releitura dentro do tx abortado → 25P02) | T-A A1: VERMELHO | error: /- B (perdedor relê FORA da transação abortada — sem 25P02): current transaction is aborted, commands ignored until end of transaction block | `expense-management-prisma.repository.ts` b8ecfc51→3dea039e→b8ecfc51 · verde |
| m6 | pode sobreviver (efeito antes do claim, MESMO tx; v2 §5) | T-A A1: verde; T-A A2c: verde |  | `expense-management.service.ts` 0340348c→146fc45f→0340348c · verde |
| m7 | A1/A2 vermelhos (claim 'processing' — o CHECK recusa) | T-A A1: VERMELHO; T-A A2: VERMELHO | error: 'A terminou ANTES de chegar ao claim: {"status":"rejected","reason":"new row for relation \\"mobile_action_receipts\\" violates check constraint \\"mobil | `expense-management-prisma.repository.ts` b8ecfc51→81c01e8d→b8ecfc51 · verde |
| m8 | C1 vermelho (JSON sem canonicalização) | T-C C1: VERMELHO; T-A A4b: verde | error: /- chaves reordenadas em qualquer nível e Date × ISO equivalente dão o MESMO hash | `expense-sync.ts` 8acf1c3e→ac80bd72→8acf1c3e · verde |
| m9a | A7/B3 vermelhos (regex antiga recusa UUID canônico) | T-A A7: VERMELHO; T-B B3: VERMELHO | error: 'reportId must be a valid UUID.' | `expense-management.validators.ts` 3ad5df0d→c4508467→3ad5df0d · verde |
| m9b | A7/B3 vermelhos (evento de prova do item com agregado = item) | T-A A7: VERMELHO; T-B B3: VERMELHO | error: /-  | `expense-management.service.ts` 0340348c→2242b97e→0340348c · verde |
| M10c | C3 e A12b vermelhos (hash sem ator + WHERE sem ator); A12′ segue verde pelo dono (v3) | T-C C3: VERMELHO; T-A A12b: VERMELHO; T-A A12′: verde | error: 'outro ATOR, mesmo comando → outro hash' | `expense-management-prisma.repository.ts` b8ecfc51→c4774c97→b8ecfc51, `expense-sync.ts` 8acf1c3e→889cdc02→8acf1c3e · verde |
| M10i | A12b vermelho (só o ator tirado do WHERE) | T-A A12b: VERMELHO | error: /- prova sob outro ator não serve, mesmo com o hash certo | `expense-management-prisma.repository.ts` b8ecfc51→c4774c97→b8ecfc51 · verde |
| C3mut | C3 vermelho (só o ator tirado do hash) | T-C C3: VERMELHO | error: 'outro ATOR, mesmo comando → outro hash' | `expense-sync.ts` 8acf1c3e→889cdc02→8acf1c3e · verde |
| M11 | A11 (4 formas) e B6 vermelhos (sem leitura legada) | T-A A11: VERMELHO; T-B B6: VERMELHO | error: /- recibo legado: conflito e zero escrita em toda forma de id | `expense-sync.ts` 8acf1c3e→aca1b540→8acf1c3e · verde |
| M11p | A11 vermelho no UUID v4 e no 160 sem ':' (legado só com ':') | T-A A11: VERMELHO | error: /- recibo legado: conflito e zero escrita em toda forma de id | `expense-sync.ts` 8acf1c3e→2cbe2b8d→8acf1c3e · verde |
| M11pp | A11 vermelho em local:42 e <uuid>:x (legado só sem ':') | T-A A11: VERMELHO | error: /- recibo legado: conflito e zero escrita em toda forma de id | `expense-sync.ts` 8acf1c3e→71b56e0c→8acf1c3e · verde |
| M12 | A11c e C7 vermelhos (prefixo curto colide com id legado válido) | T-A A11c: VERMELHO; T-C C7: VERMELHO | error: /-  | `expense-sync.ts` 8acf1c3e→1fbce598→8acf1c3e · verde |
| M13 | A11, A11d e C8 vermelhos (legado promovido pelo hash do replay) | T-A A11: VERMELHO; T-A A11d: verde; T-C C8: VERMELHO | error: /- recibo legado: conflito e zero escrita em toda forma de id | `expense-management.service.ts` 0340348c→958671a0→0340348c · verde |
| M14 | B5 vermelho (snapshot sem serialização) | T-B B5: VERMELHO | error: /- a segunda transação ESPERA a primeira (fila por instância) | `expense-management.repository.ts` 0739da87→b963968c→0739da87 · verde |
| M14r | B5 vermelho (sem restore) | T-B B5: VERMELHO | error: /- a transação que falhou não deixou NADA nos cinco mapas | `expense-management.repository.ts` 0739da87→7431285f→0739da87 · verde |
| M15 | A3′ vermelho (ator de volta na chave → 2 relatórios) | T-A A3′: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management.service.ts` 0340348c→6ff6c291→0340348c, `expense-sync.ts` 8acf1c3e→9993b13a→8acf1c3e · verde |
| M16 | A11b′ vermelho (regra do v2 l.106: legado de outro ator ignorado → +1 efeito) | T-A A11b′: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management.service.ts` 0340348c→5587d398→0340348c · verde |
| M17 | A3′ vermelho pelo errorCode (sem conferência de dono) | T-A A3′: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management.service.ts` 0340348c→9a127afb→0340348c · verde |
| M17M10c | A12′ vermelho (processed indevido: sem dono + hash e WHERE sem ator) | T-A A12′: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management-prisma.repository.ts` b8ecfc51→c4774c97→b8ecfc51, `expense-management.service.ts` 0340348c→9a127afb→0340348c, `expense-sync.ts` 8acf1c3e→889cdc02→8acf1c3e · verde |
| M18 | A15 vermelho (K2t não determinística entre processos) | T-A A15: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-sync.ts` 8acf1c3e→80abd95e→8acf1c3e · verde |
| FIXdev | C9 vermelho (spentAt da fixture desviado) | T-C C9: VERMELHO | error: /- o comando de u2 tem de ser campo a campo o de u1 (é a mesma ação da fila do aparelho) | `expense-sync-fingerprint.test.ts` 535cc3a3→922efd25→535cc3a3 · verde |
| A10mut | A10 e B4 vermelhos (parse movido para dentro do callback) | T-A A10: VERMELHO; T-B B4: VERMELHO | error: /- erro sintático sai ANTES de withSyncTransaction/claim (rollback sozinho não bastaria) | `expense-management.service.ts` 0340348c→2226be9c→0340348c · verde |
| A9mut | A9 vermelho (sem mapeamento de transitórios) | T-A A9: VERMELHO | error: /- 503 EXPENSE_SYNC_UNAVAILABLE/sync_busy | `expense-sync.ts` 8acf1c3e→ec002994→8acf1c3e · verde |
| A7bmut | A7b vermelho (P2003 da FK de work order sem mapeamento) | T-A A7b: VERMELHO | error: /- The "isWorkOrder404" validation function is expected to return "true". Received false | `expense-management-prisma.repository.ts` b8ecfc51→1f95b1ad→b8ecfc51 · verde |
| A7bwide | A7b vermelho (toda P2003 mascarada como work order) | T-A A7b: VERMELHO | error: 'FK do empregado NÃO vira 404 de work order' | `expense-management-prisma.repository.ts` b8ecfc51→ae0f9e52→b8ecfc51 · verde |
| A13mut | A13 vermelho (prova procurada no reportId do pedido) | T-A A13: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management.service.ts` 0340348c→3641b138→0340348c · verde |
| A8mut | A8 vermelho (transação sem GUC de tenant) | T-A A8: VERMELHO | error: 'new row violates row-level security policy for table "mobile_action_receipts"' | `expense-management-prisma.repository.ts` b8ecfc51→3d3eec34→b8ecfc51 · verde |
| A4hash | A4 e B2 vermelhos (hash ignorado: qualquer replay do dono vira processed) | T-A A4: VERMELHO; T-B B2: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-management.service.ts` 0340348c→5aa42a1d→0340348c · verde |
| A4field | A4 e C2 vermelhos (campo consumido fora do normalizado) | T-A A4: VERMELHO; T-C C2: VERMELHO | error: /- Expected values to be strictly deep-equal: | `expense-sync.ts` 8acf1c3e→d4f77ac5→8acf1c3e · verde |
| A1noclaim | A1 e A6 vermelhos (sem claim) | T-A A1: VERMELHO; T-A A6: VERMELHO | error: 'A terminou ANTES de chegar ao claim: {"status":"fulfilled","value":[{"clientActionId":"41ba72f8-3dd6-4be2-87ba-d621340c83fd","type":"expense_report.crea | `expense-management.service.ts` 0340348c→df2e944f→0340348c · verde |
| A0super | A0 vermelho (serviço rodando como superusuário) | T-A A0: VERMELHO | error: /- postura do papel que executa o serviço: sem superusuário e sem BYPASSRLS | `expense-sync-atomic-db.test.ts` dac39544→ca492217→dac39544 · verde |

**Leitura (sem julgar o plano, só o que mediu):**
- **Sobreviventes previstos pelo v2 §5:** `m1` (marca de tipo — nem o `tsc` reclama) e `m6` (efeito antes do claim no MESMO tx — a propriedade sobrevive).
- **Vermelho em parte dos alvos, por desenho dos testes:** `m2`/`m4` não aparecem no A2c (a falha do A2c é ANTES do efeito); `m4` não aparece no A6 (claim-primeiro serializa — o A6 morre com `A1noclaim`); `m8` não aparece no A4b (o normalizado nasce com chaves em ordem fixa — só o C1 enxerga); `M10c` não aparece no A12′ (a conferência de dono da v3 pega antes da prova — o A12′ morre com `M17+M10c`); `M13` não aparece no A11d (casos incompletos saem antes do ponto mutado — A11 e C8 o pegam).
- **Todo o resto é vermelho por ASSERÇÃO DE NEGÓCIO** (contagem, status/`errorCode`, dinheiro, RLS), nenhum por erro de import/compilação. O `m7` e o `A1noclaim` deixaram de pendurar: o A1 agora falha com "A terminou ANTES de chegar ao claim: …" (CHECK no m7; ação concluída sem claim no A1noclaim).
- Mutações da v3 pedidas nominalmente: **M11′** vermelho no UUID v4 e no 160 sem `:`, **M11″** em `local:42` e `<uuid>:x` (detalhe R11b); **M15** → u2 recebe `processed/replayed:false` (segundo lançamento); **M16** → u2 `processed` sobre legado de u1; **M17** → `receipt_unverifiable` em vez de `action_owned_by_other_actor`; **M17+M10c** → u2 recebe `processed` com o `resultRef` de u1; **M18** → o processo reiniciado responde `replayed:false` com outro `resultRef` (segundo lançamento); **desvio da fixture** (`FIXdev`) → C9 vermelho.

### R11a — INCIDENTE: rodada paralela contaminada (minha falha, registrada e desfeita)

Depois da rodada 2, para obter o detalhe por forma de id, disparei por engano SEIS processos `mutate.py` em PARALELO (`M11p M11pp M15 M17 M16 M18`, um `&` por id) sobre os mesmos arquivos. Cada processo guardou como "original" o arquivo já mutado por outro e o "restaurou" para um estado mutado.

**Medição:** `sha256sum -c sha-before-round2.txt` → `expense-management.service.ts` FAILED (ficou em `5587d398…`, o mutado do M16) e `expense-sync.ts` FAILED (ficou em `2cbe2b8d…`, o mutado do M11′). O `.jsonl` ganhou 4 linhas (M16, M11p, M17, M18) com `before` já mutado; M15 e M11pp abortaram na âncora.
**Conserto:** `service.ts` copiado de `service.bak` (backup feito em R10, sha256 `0340348c…` = o pré-rodada); `expense-sync.ts` com o inverso EXATO da edição do M11′ do spec (âncora nova presente 1×, antiga 0×). **Verificação:** `sha256sum -c sha-before-round2.txt` → **13/13 OK**. As 4 linhas contaminadas foram separadas (`mutations-contaminadas-paralelo.{log,jsonl}`) e NÃO contam como evidência; o oficial são as 36 primeiras (`mutations-round2-official.{log,jsonl}`). Nenhum processo `mutate.py` vivo depois (conferido por `Win32_Process`). Nenhum arquivo fora do bloco foi tocado.

### R11b — detalhe sequencial (mesmo código, um processo)

**Comando:** `SAVE_OUT_DIR=detalhe-2b python mutate.py mutations-spec-v2.json M11p M11pp M15 M16 M17 M17M10c M18 A13mut m9b M12` (o driver passou a gravar a saída TAP integral de cada alvo) → `ec=0`, 10/10 vermelhos, 10/10 restauros com sha256 igual (`sha-before-2b.txt`, 13/13 OK no fim).
- **M11′** (A11): falham `uuid v4 do app` e `160 sem ':'` — em cada uma, o 1º reenvio sai `processed` e a contagem vai de 1 para 2 relatórios (`advance 10 → 20`, `k2t 0 → 1`); `local:42` e `<uuid>:x` passam.
- **M11″** (A11): falham `local:42` e `<uuid>:x`; as outras duas passam. As duas mutações separam as formas, como a v3 pede.
- **m9b** (A7): `Foreign key constraint violated on the constraint: expense_events_tenant_id_aggregate_id_fkey` — o evento com agregado = item viola a FK.
- **M12** (A11c, rodada 2/2b): vermelho, MAS pela semeadura da fixture (`Unique constraint failed on (tenant_id, client_action_id)`) — a fixture lia o prefixo da constante de produção e, com o prefixo curto, dois ids legados ficavam iguais. **Corrigido no teste:** o prefixo da fixture do A11c passou a ser LITERAL.

### R11c — re-execução depois da correção do A11c

**Comando:** `SAVE_OUT_DIR=detalhe-2c python mutate.py mutations-spec-v2.json M12 A0super` (instantâneo `sha-final-candidate.txt`).
**Saída:** M12 → A11c vermelho por asserção de negócio (`+ 'conflict', true, 'action_owned_by_other_actor'` × `- 'processed', false, null`: a ação nova de u2 é capturada pelo recibo legado de u1 quando o prefixo encolhe) e C7 vermelho (`prefixo de 161 caracteres`: esperado 161, real 16); A0super → A0 vermelho na postura. Restauros com sha256 igual; `sha256sum -c sha-final-candidate.txt` → 13/13 OK.

### R12 — bateria final (código final; HEAD `3a648ca4` + diff do dev, não commitado)

Ambiente de todos os comandos: Git Bash no Windows (`MINGW64_NT-10.0-22631`), Node `v20.19.5`; `DATABASE_URL` só para `dev03a-pg` (`127.0.0.1:58443`, PostgreSQL 16, 108 migrações), `REDIS_URL` só para `dev03a-redis` (`127.0.0.1:58444`); nada exportado no shell além do que está na linha.

**Testes do bloco (N e forma):**
| Suíte | Comando | Resultado |
|---|---|---|
| T-C | `timeout 300 node --test --import tsx tests/expense-sync-fingerprint.test.ts` | ec 0 · **9 tests · 9 pass · 0 fail · 0 skipped** |
| T-B | `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<dev03a-pg> timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts` | ec 0 · **14 · 14 pass · 0 fail · 0 skipped** (6 antigos + 8 novos) |
| T-A #1 | `DATABASE_URL=<dev03a-pg> timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts` | ec 0 · **24 · 24 pass · 0 fail · 0 skipped**, 28,8 s |
| T-A #2 | idem | ec 0 · 24 · 24 · 0 · 0, 13,4 s |
| T-A #3 | idem | ec 0 · 24 · 24 · 0 · 0, 12,9 s |

Três execuções verdes CONSECUTIVAS do T-A, denominador estável (24), zero skipped. `grep -cE '25P02|40P01|current transaction is aborted|deadlock'` nos três TAP → 2 cada, e as 2 são o NOME do teste A1 ("…sem 25P02/40P01"); nenhuma ocorrência em erro. **Total do bloco: 47 = 24 + 14 + 9** (meta da v3: ≥47).

**Regressões de despesa, sync e guards que leem o código do bloco** (todas `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<dev03a-pg> REDIS_URL=<dev03a-redis> timeout 900 node scripts/run-backend-tests.mjs <arquivo>`):
| Arquivo | Resultado |
|---|---|
| `tests/mobile-backend-contracts.test.ts` (contrato do lote de despesa no bootstrap mobile) | ec 0 · 25/25 |
| `tests/o6r06-usage-fault-injection.test.ts` (sync do mobile, outra trilha) | ec 0 · 6/6 |
| `tests/o6r07c-census-guard.test.ts` (censo de rotas e de pares lote×tipo do 07c-a) | ec 0 · 31/31 |
| `tests/core-saas.test.ts` | ec 0 · 26/26 |
| `tests/permission-catalog-migration-parity.test.ts` | ec 0 · 3/3 |
| `tests/san3-04a-matriz-x-catalogo-guard.test.ts` | ec 0 · 14/14 |
| `tests/db-catalog-write-guard.test.ts` (o T-A não escreve catálogo) | ec 0 · 5/5 |
| `tests/kpi-achados-paridade.test.ts` (lê o REGISTRO_ACHADOS) | ec 0 · 6/6 |
| `tests/npm-test-runner-guard.test.ts` | ec 0 · 29/29 |
| `tests/auth-invariant-guards.test.ts` | ec 0 · 11/11 |

**Tipo e lint:** `timeout 300 npm run check` → ec 0 · `timeout 300 npm run lint` (= `tsc --noEmit`) → ec 0.

**Suíte integral DEPOIS** (mesma forma da baseline R4): `CORE_SAAS_PERSISTENCE=memory DATABASE_URL=<dev03a-pg> REDIS_URL=redis://127.0.0.1:58444 timeout 2400 npm test` → `ec=1`, 452 s, **303 arquivos · 3329 testes · pass 3321 · fail 6 · skipped 2**.

| | Arquivos | Testes | Pass | Fail | Skipped |
|---|---|---|---|---|---|
| Baseline (R4, HEAD `3a648ca4`) | 301 | 3288 | 3278 | 8 | 2 |
| Depois (código do dev) | 303 | 3329 | 3321 | 6 | 2 |
| Delta | +2 (T-A e T-C) | **+41** (= 24 T-A + 9 T-C + 8 T-B novos) | +43 | −2 | 0 |

As 6 falhas DEPOIS são as de ambiente da baseline, com a mesma causa medida: `B-SAN3-05` T14a/b, T14c, T14d (`psql: command not found`) + a linha-pai; `san3-09` T2.1 (`node_modules\.bin\prisma:2`, shim do prisma) + a linha-pai. Das 8 da baseline, saíram o T15 do `B-SAN3-05` (boot de processo filho; passou desta vez) e o `o6r07c-subresource-scope-db` (timeout de carga; já tinha passado 6/6 isolado em R4). **Nenhuma falha nova; nenhuma em despesa.** Os 2 skips são os nomeados do orçamento do runner.

**Build:** `timeout 300 npm run build` → ec 0 (`dist/modules/expense-management/expense-sync.js` gerado; `dist/` removido depois — ignorado pelo git, criado por mim).

**Escopo (v2 §6.2, como a v3 emenda):** `git diff --name-only 3a648ca4` + não rastreados → 16 arquivos, todos no PERMITIDO: os 8 de `src/modules/expense-management/` listados (validators: só a linha 10), os 3 testes (o de rotas: a ÚNICA linha removida é o `return` do seed, que ganhou `managerA`; os seis testes antigos sem edição), `ci.yml` (+5), `API_CONTRACTS.md`, `pendencias.md`, `REGISTRO_ACHADOS_O6R.md` e este relatório. `git diff --name-only 3a648ca4 -- prisma migrations infra Kpis mobile frontend src/database scripts .env package.json package-lock.json <controller> <routes> .claude .agents` → **0**. Sem migração: o desenho coube na PK atual (K2t de 201 a ~1,1 mil caracteres numa coluna TEXT). `git diff --check` → ec 0.

### R13 — limpeza (C5) e terreno

- Resíduo dos testes no banco descartável, ANTES de removê-lo: `pg_roles LIKE 'o6r_b01_%'` → 0; `tenants` com slug `exp-sync-%` → 0; `mobile_action_receipts` → 0; `expense_reports` → 0 (teardown escopado limpou tudo, inclusive depois do incidente de R11a).
- `rm -rf dist` (meu build); nenhum `*.tsbuildinfo`. `docker rm -f dev03a-pg dev03a-redis` → removidos pelo NOME; `docker ps -a --filter name=dev03a-` → 0. Containers do outro agente (`trc01-*`) e a base viva (`erp-postgres`, `erp-redis`) não foram tocados em momento algum.
- `node_modules` do worktree mantido (`npm ci` próprio, sem junction). Scripts e logs de evidência ficam no scratchpad da sessão; os re-executáveis estão no Apêndice abaixo.
- Nada commitado, nada empurrado: o orquestrador versiona. `git status --short` → 13 modificados + 3 novos, exatamente o diff acima.

## Fechamento do dev — 22:31Z

**Entregue:** v2 + emenda v3 + `D-03a-MESMA-CHAVE-OUTRO-ATOR = A`, sem migração. **Bateria do bloco: 47 testes = T-A 24 (Postgres real, papéis sem BYPASSRLS, 3 execuções consecutivas verdes, 0 skipped) + T-B 14 + T-C 9; suíte integral 3329 testes, 3321 pass, 6 fail (todos de ambiente, iguais à baseline), 2 skipped (orçamento nomeado).** Matriz oficial: 36 mutações, 34 vermelhas por asserção de negócio (2 sobreviventes previstas pelo v2: m1, m6), restauro com sha256 igual em todas.

**Para a junta (fatos medidos, sem julgamento do plano):**
1. A v3 pediu "A2/A2c falham por m2/m4"; medido: o A2c não enxerga m2 nem m4 (falha antes do efeito); A2/A2b enxergam. O v2 pediu "M13 → A11d"; medido: o A11d não enxerga (A11 e C8 enxergam). Registrado em R11.
2. O guard do censo do 07c-a obrigou a renomear `PreparedSyncAction.type` → `actionType` (R9/R10, com vermelho-controle por execução).
3. Incidente R11a (rodada paralela contaminada) foi meu, foi medido, desfeito e verificado 13/13 por sha256; as 4 linhas contaminadas estão separadas e não contam.
4. Passo 0 da v3 (registrar em `controle/decisoes.md` a decisão do dono e os conflitos com a l.243 do `PLANO_SAN3`, o Runbook A e a trava (c) do CD) é do orquestrador e não foi feito por mim. PR/head nos registros ficaram "a preencher pelo orquestrador".
5. O A15 usa a conexão do arnês (a propriedade é determinismo entre processos; RLS fica com A0/A8).

## Apêndice — scripts para re-execução (P3)

Os arquivos vivem no scratchpad da sessão; transcritos aqui na íntegra. `mutate.py` e `spec.py` rodam a partir de um diretório que contenha os dois e um `../dev03a-pw.txt` com a senha do Postgres descartável (ajuste `ROOT`, a porta e a senha ao seu terreno). As sondas `.mts` rodam com `CORE_SAAS_PERSISTENCE=memory node --import tsx <arquivo> <raiz-do-worktree>` a partir da raiz do worktree; elas foram rodadas no código do HEAD-base, ANTES de qualquer edição de produto.

### spec.py (matriz de mutações; gera `mutations-spec-v2.json`)

```python
"""Matriz de mutações do B-O6R-03a (v2 §5 + v3 + mutações dos critérios do §3). Gera mutations-spec.json."""
import json
import os

S = "src/modules/expense-management/expense-management.service.ts"
Y = "src/modules/expense-management/expense-sync.ts"
P = "src/modules/expense-management/expense-management-prisma.repository.ts"
R = "src/modules/expense-management/expense-management.repository.ts"
V = "src/modules/expense-management/expense-management.validators.ts"
TA_FILE = "tests/expense-sync-atomic-db.test.ts"
TC_FILE = "tests/expense-sync-fingerprint.test.ts"

CLAIM = """        const claim = await repository.claimMobileActionReceipt({
          tenantId: actor.tenantId,
          receiptKey: prepared.receiptKey,
          actorUserId: actor.userId,
          actionType: prepared.actionType,
        });
"""
EFFECT = "        const effect = await this.applySyncCommand(repository, actor, prepared.command);\n"
COMPLETE = "        await repository.completeMobileActionReceipt(claim, { resultRef: effect.resultRef, processedAt: new Date() });\n"
LOOKUP = """    const { legacy, current } = await repository.findSyncActionReceipts({
      tenantId: actor.tenantId,
      clientActionId: prepared.clientActionId,
    });
"""
OWNER = """    if ((legacy && legacy.actorUserId !== actor.userId) || (current && current.actorUserId !== actor.userId)) {
      return conflict(prepared, "action_owned_by_other_actor", undefined);
    }
"""
LEGACY_LOOKUP = "  const legacy = await findExact({ tenantId: input.tenantId, clientActionId: input.clientActionId });"
PREFIX = '"expense-sync-v2/".padEnd(LEGACY_CLIENT_ACTION_ID_MAX_LENGTH + 1, "~");'
HASH_ACTOR = "    actorUserId: input.actorUserId,\n    clientActionId: input.clientActionId,\n"
WHERE_PROOF = """      where: {
        tenant_id: input.tenantId,
        actor_user_id: input.actorUserId,
        aggregate_id: input.aggregateId,
        event_type: input.eventType,
        payload_hash: input.payloadHash,
"""
WHERE_PROOF_NO_ACTOR = """      where: {
        tenant_id: input.tenantId,
        aggregate_id: input.aggregateId,
        event_type: input.eventType,
        payload_hash: input.payloadHash,
"""
RLS_TX = "    return withTenantRls(this.prismaClient, tenantId, (tx) => work(new PrismaExpenseManagementRepository(tx)));"
NEW_REGEX = "const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;"
OLD_REGEX = "const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;"


def TA(p):
    return ["TA", p]


def TB(p):
    return ["TB", p]


def TC(p):
    return ["TC", p]


spec = [
    {"id": "m1", "expect": "pode sobreviver (marca de tipo; v2 §5)", "edits": [[Y, "  readonly [syncClaimBrand]: true;\n", ""]], "targets": [["CHECK", ""], TA("^A1 "), TA("^A2 ")]},
    {"id": "m2", "expect": "A2/A2c vermelhos (claim confirmado fora do tx = recibo órfão)", "edits": [[S, CLAIM, CLAIM.replace("await repository.claimMobileActionReceipt({", "await this.repository.withSyncTransaction(actor.tenantId, (outside) => outside.claimMobileActionReceipt({").replace("        });\n", "        }));\n")]], "targets": [TA("^A2 "), TA("^A2c ")]},
    {"id": "m3", "expect": "A2/A2b vermelhos (sem fronteira transacional: cada operação confirma sozinha)", "edits": [[P, RLS_TX, "    return work(new Proxy({}, { get: (_target, method) => (...args: unknown[]) => withTenantRls(this.prismaClient, tenantId, (tx) => (new PrismaExpenseManagementRepository(tx) as any)[method](...args)) }) as never);"]], "targets": [TA("^A2 "), TA("^A2b ")]},
    {"id": "m4", "expect": "A2/A2b/A2c vermelhos nos três tipos; A6 vermelho (efeito pelo repositório externo)", "edits": [[S, EFFECT, EFFECT.replace("this.applySyncCommand(repository,", "this.applySyncCommand(this.repository as never,")]], "targets": [TA("^A2 "), TA("^A2b "), TA("^A2c "), TA("^A6 ")]},
    {"id": "m5", "expect": "A1 vermelho (releitura dentro do tx abortado → 25P02)", "edits": [[P, "      if (isSyncReceiptKeyViolation(error)) throw new SyncActionAlreadyClaimedError(input.receiptKey);", "      if (isSyncReceiptKeyViolation(error)) { await this.findMobileActionReceipt({ tenantId: input.tenantId, clientActionId: input.receiptKey }); throw new SyncActionAlreadyClaimedError(input.receiptKey); }"]], "targets": [TA("^A1 ")]},
    {"id": "m6", "expect": "pode sobreviver (efeito antes do claim, MESMO tx; v2 §5)", "edits": [[S, CLAIM + EFFECT, EFFECT + CLAIM]], "targets": [TA("^A1 "), TA("^A2c ")]},
    {"id": "m7", "expect": "A1/A2 vermelhos (claim 'processing' — o CHECK recusa)", "edits": [[P, '          status: "processed",\n          result_ref: null,', '          status: "processing",\n          result_ref: null,']], "targets": [TA("^A1 "), TA("^A2 ")]},
    {"id": "m8", "expect": "C1 vermelho (JSON sem canonicalização)", "edits": [[Y, "JSON.stringify(canonicalizeSyncValue(envelope))", "JSON.stringify(envelope)"]], "targets": [TC("^C1 "), TA("^A4b ")]},
    {"id": "m9a", "expect": "A7/B3 vermelhos (regex antiga recusa UUID canônico)", "edits": [[V, NEW_REGEX, OLD_REGEX]], "targets": [TA("^A7 "), TB("^B3 ")]},
    {"id": "m9b", "expect": "A7/B3 vermelhos (evento de prova do item com agregado = item)", "edits": [[S, "      return { resultRef: item.id, aggregateId: item.reportId };", "      return { resultRef: item.id, aggregateId: item.id };"]], "targets": [TA("^A7 "), TB("^B3 ")]},
    {"id": "M10c", "expect": "C3 e A12b vermelhos (hash sem ator + WHERE sem ator); A12′ segue verde pelo dono (v3)", "edits": [[Y, HASH_ACTOR, "    clientActionId: input.clientActionId,\n"], [P, WHERE_PROOF, WHERE_PROOF_NO_ACTOR]], "targets": [TC("^C3 "), TA("^A12b "), TA("^A12′ ")]},
    {"id": "M10i", "expect": "A12b vermelho (só o ator tirado do WHERE)", "edits": [[P, WHERE_PROOF, WHERE_PROOF_NO_ACTOR]], "targets": [TA("^A12b ")]},
    {"id": "C3mut", "expect": "C3 vermelho (só o ator tirado do hash)", "edits": [[Y, HASH_ACTOR, "    clientActionId: input.clientActionId,\n"]], "targets": [TC("^C3 ")]},
    {"id": "M11", "expect": "A11 (4 formas) e B6 vermelhos (sem leitura legada)", "edits": [[Y, LEGACY_LOOKUP, "  const legacy = undefined as MobileActionReceipt | undefined;"]], "targets": [TA("^A11 "), TB("^B6 ")]},
    {"id": "M11p", "expect": "A11 vermelho no UUID v4 e no 160 sem ':' (legado só com ':')", "edits": [[Y, LEGACY_LOOKUP, '  const legacy = input.clientActionId.includes(":") ? await findExact({ tenantId: input.tenantId, clientActionId: input.clientActionId }) : undefined;']], "targets": [TA("^A11 ")]},
    {"id": "M11pp", "expect": "A11 vermelho em local:42 e <uuid>:x (legado só sem ':')", "edits": [[Y, LEGACY_LOOKUP, '  const legacy = !input.clientActionId.includes(":") ? await findExact({ tenantId: input.tenantId, clientActionId: input.clientActionId }) : undefined;']], "targets": [TA("^A11 ")]},
    {"id": "M12", "expect": "A11c e C7 vermelhos (prefixo curto colide com id legado válido)", "edits": [[Y, PREFIX, '"expense-sync-v2/";']], "targets": [TA("^A11c "), TC("^C7 ")]},
    {"id": "M13", "expect": "A11, A11d e C8 vermelhos (legado promovido pelo hash do replay)", "edits": [[S, '      return conflict(prepared, "legacy_payload_unverifiable", legacy.resultRef);', '      await repository.createEvent({ tenantId: actor.tenantId, aggregateId: legacy.resultRef!, eventType: EXPENSE_SYNC_EVENT_TYPE, payloadHash: prepared.fingerprint, actorUserId: actor.userId });\n      return syncResult(prepared, "processed", legacy.resultRef, true, null);']], "targets": [TA("^A11 "), TA("^A11d "), TC("^C8 ")]},
    {"id": "M14", "expect": "B5 vermelho (snapshot sem serialização)", "edits": [[R, "    await previous;\n", "    void previous;\n"]], "targets": [TB("^B5 ")]},
    {"id": "M14r", "expect": "B5 vermelho (sem restore)", "edits": [[R, "      this.restore(snapshot);\n", ""]], "targets": [TB("^B5 ")]},
    {"id": "M15", "expect": "A3′ vermelho (ator de volta na chave → 2 relatórios)", "edits": [[Y, "receiptKey: buildSyncReceiptKey(clientActionId) };", "receiptKey: EXPENSE_SYNC_RECEIPT_KEY_PREFIX + JSON.stringify([actor.userId, clientActionId]) };"], [S, LOOKUP, LOOKUP.replace("const { legacy, current }", "const { legacy }") + "    const current = await repository.findMobileActionReceipt({ tenantId: actor.tenantId, clientActionId: prepared.receiptKey });\n"], [S, '    if (decodeSyncReceiptKey(receipt.clientActionId) !== prepared.clientActionId) return conflict(prepared, "receipt_unverifiable", undefined);\n', ""]], "targets": [TA("^A3′ ")]},
    {"id": "M16", "expect": "A11b′ vermelho (regra do v2 l.106: legado de outro ator ignorado → +1 efeito)", "edits": [[S, LOOKUP, LOOKUP.replace("const { legacy, current }", "const { legacy: rawLegacy, current }") + "    const legacy = rawLegacy && rawLegacy.actorUserId === actor.userId ? rawLegacy : undefined;\n"]], "targets": [TA("^A11b′ ")]},
    {"id": "M17", "expect": "A3′ vermelho pelo errorCode (sem conferência de dono)", "edits": [[S, OWNER, ""]], "targets": [TA("^A3′ ")]},
    {"id": "M17M10c", "expect": "A12′ vermelho (processed indevido: sem dono + hash e WHERE sem ator)", "edits": [[S, OWNER, ""], [Y, HASH_ACTOR, "    clientActionId: input.clientActionId,\n"], [P, WHERE_PROOF, WHERE_PROOF_NO_ACTOR]], "targets": [TA("^A12′ ")]},
    {"id": "M18", "expect": "A15 vermelho (K2t não determinística entre processos)", "edits": [[Y, PREFIX, '"expense-sync-v2/".padEnd(LEGACY_CLIENT_ACTION_ID_MAX_LENGTH + 1, "~") + process.pid;']], "targets": [TA("^A15 ")]},
    {"id": "FIXdev", "expect": "C9 vermelho (spentAt da fixture desviado)", "edits": [[TC_FILE, '  fromU2: { categoryKey: "fuel", spentAt: "2026-10-11T10:00:00.000Z",', '  fromU2: { categoryKey: "fuel", spentAt: "2026-10-11T10:05:00.000Z",']], "targets": [TC("^C9 ")]},
    {"id": "A10mut", "expect": "A10 e B4 vermelhos (parse movido para dentro do callback)", "edits": [[S, "      const prepared = prepareSyncAction(actor, action);\n", "      const prepared = await this.repository.withSyncTransaction(actor.tenantId, async () => prepareSyncAction(actor, action));\n"]], "targets": [TA("^A10 "), TB("^B4 ")]},
    {"id": "A9mut", "expect": "A9 vermelho (sem mapeamento de transitórios)", "edits": [[Y, "  return syncDatabaseErrorCodes(error).some((code) => TRANSIENT_SYNC_DB_CODES.has(code)) ? syncBusyError() : error;", "  return error;"]], "targets": [TA("^A9 ")]},
    {"id": "A7bmut", "expect": "A7b vermelho (P2003 da FK de work order sem mapeamento)", "edits": [[P, "  throw isWorkOrderForeignKeyViolation(error) ? workOrderNotFoundError() : error;", "  throw error;"]], "targets": [TA("^A7b ")]},
    {"id": "A7bwide", "expect": "A7b vermelho (toda P2003 mascarada como work order)", "edits": [[P, "  throw isWorkOrderForeignKeyViolation(error) ? workOrderNotFoundError() : error;", '  throw (error as { code?: string })?.code === "P2003" ? workOrderNotFoundError() : error;']], "targets": [TA("^A7b ")]},
    {"id": "A13mut", "expect": "A13 vermelho (prova procurada no reportId do pedido)", "edits": [[S, "    const aggregateId = await repository.findSyncReceiptAggregate({ tenantId: actor.tenantId, receipt });", "    const aggregateId = syncCommandReportId(prepared.command) ?? (await repository.findSyncReceiptAggregate({ tenantId: actor.tenantId, receipt }));"]], "targets": [TA("^A13 ")]},
    {"id": "A8mut", "expect": "A8 vermelho (transação sem GUC de tenant)", "edits": [[P, RLS_TX, "    return this.prismaClient.$transaction((tx) => work(new PrismaExpenseManagementRepository(tx)));"]], "targets": [TA("^A8 ")]},
    {"id": "A4hash", "expect": "A4 e B2 vermelhos (hash ignorado: qualquer replay do dono vira processed)", "edits": [[S, "    if (!proof) {", "    if ((false as boolean) && !proof) {"]], "targets": [TA("^A4 "), TB("^B2 ")]},
    {"id": "A4field", "expect": "A4 e C2 vermelhos (campo consumido fora do normalizado)", "edits": [[Y, "      advanceAmount: input.advanceAmount,\n", ""]], "targets": [TA("^A4 "), TC("^C2 ")]},
    {"id": "A1noclaim", "expect": "A1 e A6 vermelhos (sem claim)", "edits": [[S, CLAIM, ""], [S, COMPLETE, ""]], "targets": [TA("^A1 "), TA("^A6 ")]},
    {"id": "A0super", "expect": "A0 vermelho (serviço rodando como superusuário)", "edits": [[TA_FILE, "  const serviceClientA = roles[0].client as any;", "  const serviceClientA = admin as any;"]], "targets": [TA("^A0 ")]},
]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mutations-spec-v2.json")
json.dump(spec, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(spec), "mutações em", out)
```

### mutate.py (driver: aplica, prova a substituição, roda os alvos, restaura e confere sha256)

```python
"""Driver de mutações do dev-03a-claude (B-O6R-03a). Uma mutação por vez, isolada, no worktree do executor.

Para cada mutação: sha256 do(s) arquivo(s) antes → aplica (âncora com contagem EXATA 1, LF-normalizada, grava de
volta em CRLF se o original era CRLF) → prova que a substituição aconteceu → roda os testes-alvo → restaura os bytes
originais → confere o sha256 → roda os testes-alvo de novo (retorno verde). Cada resultado é apensado ao log JSONL
e ao log legível ANTES da próxima mutação (evidência incremental).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time

ROOT = "C:/Users/AMP/w-03a"
SP = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(SP, "mutations.log")
JSONL = os.path.join(SP, "mutations.jsonl")
PW = open(os.path.join(os.path.dirname(SP), "dev03a-pw.txt")).read().strip()
DB = f"postgresql://postgres:{PW}@127.0.0.1:58443/dev03a"

SUITES = {
    "TA": ("tests/expense-sync-atomic-db.test.ts", {"DATABASE_URL": DB}),
    "TB": ("tests/expense-management-routes.test.ts", {"CORE_SAAS_PERSISTENCE": "memory"}),
    "TC": ("tests/expense-sync-fingerprint.test.ts", {}),
}


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def run_target(target):
    if target[0] == "CHECK":
        cmd = ["npm.cmd", "run", "check"]
        env = dict(os.environ)
    else:
        suite, pattern = target
        file, extra = SUITES[suite]
        cmd = ["node", "--test", "--import", "tsx", f"--test-name-pattern={pattern}", file]
        env = dict(os.environ)
        env.update(extra)
        env["LOG_LEVEL"] = "silent"
    started = time.time()
    try:
        proc = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
        out = proc.stdout + proc.stderr
        code = proc.returncode
    except subprocess.TimeoutExpired as exc:
        out = (exc.stdout or "") + (exc.stderr or "") if isinstance(exc.stdout, str) else ""
        code = "timeout"
    dur = round(time.time() - started, 1)
    if os.environ.get("SAVE_OUT_DIR"):
        tag = re.sub(r"[^A-Za-z0-9]+", "_", f"{os.environ.get('CURRENT_MUT', 'x')}_{target[0]}_{target[1]}_{os.environ.get('PHASE', '')}")
        open(os.path.join(os.environ["SAVE_OUT_DIR"], tag + ".txt"), "w", encoding="utf-8").write(out)
    if target[0] == "CHECK":
        return {"target": "npm run check", "ec": code, "dur": dur, "pass": None, "fail": None, "notok": [], "why": out.strip().splitlines()[-3:]}
    p = re.search(r"^# pass (\d+)", out, re.M)
    f = re.search(r"^# fail (\d+)", out, re.M)
    notok = re.findall(r"^not ok \d+ - (.+)$", out, re.M)
    why = []
    lines = out.splitlines()
    for index, line in enumerate(lines):
        s = line.strip()
        if s.startswith(("error:", "expected:", "actual:", "message:")) or "falha injetada" in s:
            if s.endswith(("|-", ":")) and index + 1 < len(lines):
                s = s + " " + lines[index + 1].strip()
            why.append(s[:300])
        if len(why) >= 8:
            break
    return {"target": f"{target[0]}:{target[1]}", "ec": code, "dur": dur, "pass": int(p.group(1)) if p else None, "fail": int(f.group(1)) if f else None, "notok": [n[:110] for n in notok], "why": why}


def apply(edits):
    originals = {}
    for file, old, new in edits:
        path = os.path.join(ROOT, file)
        if path not in originals:
            originals[path] = open(path, "rb").read()
        raw = open(path, "rb").read().decode("utf-8")
        crlf = "\r\n" in raw
        text = raw.replace("\r\n", "\n")
        count = text.count(old)
        if count != 1:
            raise SystemExit(f"ANCORA com contagem {count} (esperado 1) em {file}: {old[:80]!r}")
        text = text.replace(old, new)
        if text.count(new) < 1:
            raise SystemExit("substituição não aplicada")
        open(path, "wb").write((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))
    return originals


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    only = set(sys.argv[2:])
    for m in spec:
        if only and m["id"] not in only:
            continue
        files = sorted({os.path.join(ROOT, e[0]) for e in m["edits"]})
        before = {f: sha(f) for f in files}
        originals = apply(m["edits"])
        mutated = {f: sha(f) for f in files}
        assert all(mutated[f] != before[f] for f in files), "mutação não mudou o arquivo"
        os.environ["CURRENT_MUT"] = m["id"]
        os.environ["PHASE"] = "mutado"
        red = [run_target(t) for t in m["targets"]]
        os.environ["PHASE"] = "restaurado"
        for path, data in originals.items():
            open(path, "wb").write(data)
        restored = {f: sha(f) for f in files}
        restored_ok = all(restored[f] == before[f] for f in files)
        green = [run_target(t) for t in m["targets"]] if restored_ok else []
        record = {
            "id": m["id"],
            "expect": m["expect"],
            "files": {os.path.relpath(f, ROOT).replace("\\", "/"): {"before": before[f][:16], "mutated": mutated[f][:16], "restored": restored[f][:16]} for f in files},
            "restored_ok": restored_ok,
            "red": red,
            "green": green,
        }
        with open(JSONL, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        with open(LOG, "a", encoding="utf-8") as fh:
            fh.write(f"\n=== {m['id']} — esperado: {m['expect']} — {time.strftime('%H:%M:%SZ', time.gmtime())}\n")
            for f, v in record["files"].items():
                fh.write(f"  {f}: antes {v['before']} · mutado {v['mutated']} · restaurado {v['restored']} · igual={v['before'] == v['restored']}\n")
            for r in red:
                fh.write(f"  MUTADO  {r['target']}: ec={r['ec']} pass={r['pass']} fail={r['fail']} dur={r['dur']}s notok={r['notok']}\n")
                for w in r["why"][:5]:
                    fh.write(f"      {w}\n")
            for r in green:
                fh.write(f"  RESTAURO {r['target']}: ec={r['ec']} pass={r['pass']} fail={r['fail']} dur={r['dur']}s\n")
        print(f"{m['id']}: mutado={[ (r['pass'], r['fail']) for r in red]} restauro_ok={restored_ok} verde={[ (r['pass'], r['fail']) for r in green]}", flush=True)
        if not restored_ok:
            raise SystemExit("RESTAURO FALHOU — parada")


if __name__ == "__main__":
    main()
```

### vc-head.mts (vermelho-controle no HEAD-base, R2)

```ts
// VERMELHO-CONTROLE do B-O6R-03a (dev-03a-claude) — código do HEAD-BASE 3a648ca4, modo memória.
// Exercita o serviço ANTIGO pelas interfaces que já existem (v2 §3, "Vermelho-controle").
const W = process.argv[2];
const svcMod = await import(`file:///${W}/src/modules/expense-management/expense-management.service.ts`);
const T = "11111111-1111-4111-8111-111111111111";
const u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const u2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tech = ["expense_report:read_own","expense_report:create","expense_report:update","expense_report:submit","expense_sync:write"];
const mgr = ["expense_report:read", ...tech];
const actor = (userId: string, permissions: string[]) => ({ tenantId: T, userId, roles: [], permissions }) as any;
const createPayload = (adv: number) => ({ employeeUserId: u1, periodStart: "2026-10-11", periodEnd: "2026-10-11", origin: "mobile", advanceAmount: adv });
function fresh() { svcMod.resetExpenseManagementRuntimeForTests(); return { svc: svcMod.createMemoryExpenseManagementService(), repo: svcMod.getMemoryExpenseManagementRepositoryForTests() }; }
const count = async (repo: any) => (await repo.listReports({ tenantId: T, limit: 100, offset: 0 })).total;

// (1) colisão u1/u2: a mesma chave por outro ator devolve o resultado de u1 a u2
{ const { svc, repo } = fresh();
  const a = await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X1", type: "expense_report.create", payload: createPayload(100) }] });
  const b = await svc.syncExpenseActions(actor(u2, mgr), { actions: [{ clientActionId: "X1", type: "expense_report.create", payload: createPayload(100) }] });
  console.log("VC1 colisao u1/u2:", JSON.stringify({ u1: a.results[0], u2: b.results[0], relatorios: await count(repo) })); }

// (2) divergência silenciosa: mesmo ator, mesma chave, valor diferente → replay "processed"
{ const { svc, repo } = fresh();
  await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X2", type: "expense_report.create", payload: createPayload(100) }] });
  const b = await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X2", type: "expense_report.create", payload: createPayload(999) }] });
  const r = (await repo.listReports({ tenantId: T, limit: 10, offset: 0 })).items[0];
  console.log("VC2 divergencia silenciosa:", JSON.stringify({ replay: b.results[0], advanceAmountPersistido: r.advanceAmount, relatorios: await count(repo) })); }

// (3) UUID inválido: reportId canônico (v4) recusado pela regex do validador
{ const { svc, repo } = fresh();
  const a = await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X3", type: "expense_report.create", payload: createPayload(0) }] });
  const reportId = a.results[0].resultRef;
  try { await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X3i", type: "expense_item.create", payload: { reportId, categoryKey: "fuel", spentAt: "2026-10-11T10:00:00.000Z", amount: 10 } }] }); console.log("VC3 uuid: aceito", reportId); }
  catch (e: any) { console.log("VC3 uuid canonico recusado:", JSON.stringify({ reportId, status: e.statusCode, code: e.code, reason: e.reason })); } }

// (4) crash depois do efeito: o recibo falha após o relatório existir; o retry lança de novo
{ const { svc, repo } = fresh();
  const original = repo.createMobileActionReceipt.bind(repo); let falhar = true;
  repo.createMobileActionReceipt = async (input: any) => { if (falhar) { falhar = false; throw new Error("falha injetada apos o efeito"); } return original(input); };
  try { await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X4", type: "expense_report.create", payload: createPayload(100) }] }); } catch (e: any) { console.log("VC4 1a tentativa:", e.message, "| relatorios =", await count(repo)); }
  const r = await svc.syncExpenseActions(actor(u1, tech), { actions: [{ clientActionId: "X4", type: "expense_report.create", payload: createPayload(100) }] });
  console.log("VC4 retry:", JSON.stringify(r.results[0]), "| relatorios =", await count(repo)); }
```

### drill3a-old-binary.mts (drill §10.5 item 3a, R3)

```ts
// DRILL §10.5 item 3a (emenda v3): o binário ANTIGO (HEAD-base 3a648ca4, memória) diante do recibo K2t que a
// versão nova grava. Adaptação da sonda head_rollback.mts da r2, com K2t = P + JSON([id]) (v3).
const W = process.argv[2];
const svcMod = await import(`file:///${W}/src/modules/expense-management/expense-management.service.ts`);
svcMod.resetExpenseManagementRuntimeForTests();
const svc = svcMod.createMemoryExpenseManagementService();
const repo = svcMod.getMemoryExpenseManagementRepositoryForTests();
const T = "11111111-1111-4111-8111-111111111111", u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tech = ["expense_report:read_own","expense_report:create","expense_report:update","expense_report:submit","expense_sync:write"];
const actor = { tenantId: T, userId: u1, roles: [], permissions: tech } as any;
const X = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";
const payload = { employeeUserId: u1, periodStart: "2026-10-11", periodEnd: "2026-10-11", origin: "mobile", advanceAmount: 100 };
const report = await repo.createReport({ tenantId: T, employeeUserId: u1, periodStart: new Date("2026-10-11"), periodEnd: new Date("2026-10-11"), origin: "mobile", advanceAmount: 100, currency: "BRL", createdBy: u1 } as any);
const P = "expense-sync-v2/".padEnd(161, "~");
const k2t = P + JSON.stringify([X]);
await repo.createMobileActionReceipt({ tenantId: T, clientActionId: k2t, actorUserId: u1, actionType: "expense_report.create", status: "processed", resultRef: report.id, processedAt: new Date() } as any);
const count = async () => (await repo.listReports({ tenantId: T, limit: 100, offset: 0 } as any)).total;
console.log("K2t.length =", k2t.length, "| antes do replay no binario antigo: relatorios =", await count());
const r = await svc.syncExpenseActions(actor, { actions: [{ clientActionId: X, type: "expense_report.create", payload }] });
console.log("binario antigo, replay de X:", JSON.stringify(r.results.map((x: any) => ({ status: x.status, replayed: x.replayed }))), "| relatorios =", await count());
```
