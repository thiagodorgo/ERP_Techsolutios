# DEV B-O6R-04a — relatório do desenvolvedor (plano v3)

- **Papel:** desenvolvedor (§C7.4-bis: não achou, não planejou). **Modelo que rodou:** Opus 5 (`claude-opus-5[1m]`).
- **Worktree:** `.claude/worktrees/b04a`, branch `fix/inventory-consistency`, HEAD inicial `756b8c37` (plano v3).
- **Insumos lidos:** briefing `prompt-dev-B-O6R-04a-v3.md`; plano v3 inteiro (626 linhas); comando com emendas 1 (a–f), 2 (g–m), 3 (n–s).
- **Data:** 2026-09-18

## 0. Terreno inicial
- `git status --short` no b04a → vazio; HEAD `756b8c37`; `node_modules` diretório real (não junction: `dir /AL` sem entradas); cliente Prisma gerado presente (13/09).

- Cluster do bloco: `dev-b04a-pg` (`postgres:16`, `127.0.0.1:58651`, base `erp_dev_b04a`) e `dev-b04a-redis` (`redis:7-alpine`, `127.0.0.1:58652`). Portas fora das faixas excluídas (`netsh … excludedportrange`: 49680–51918, 56500–57306, 60966–61165). `npx prisma migrate deploy` → 107 migrações em 26 s. Nenhum comando em `erp-*`, `pastrack-*`, `bsan301-*` (este de outra sessão, **Up** durante todo o trabalho — ressalva de terreno para o sizing), `j-*`, `plan-*`, `crit-*`.
- `origin/main` = `02bd7dab` (fetch 18/09); PR aberto: só #387 (sem migração) → timestamp `20260873000000` livre (R13).

## 1. Passos do plano

### 1.1 Migração (§4.1) + schema (§4.1) + censo (§4.2) — commit `2b7f8620`
- `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` = texto EXATO do §4.1.
- `prisma/schema.prisma`: só comentário junto do `@@index([tenant_id, reverses_movement_id])` (l.1508). `prisma validate` ok.
- `scripts/inventory-duplicates-census.sql`: as duas consultas + resumo, linha 1 = "SOMENTE LEITURA: o arquivo contém apenas consultas (SELECT); nada é gravado."
- up → down → re-up no `dev-b04a-pg`: `migrate deploy` → `pg_indexes` 2 (`WHERE (reverses_movement_id IS NOT NULL)` / `WHERE (cycle_count_id IS NOT NULL)`); `DROP INDEX` ×2 extraídos do rodapé → 0; `CREATE UNIQUE INDEX` ×2 extraídos → 2.

### 1.2 Código (§3) — commit `ea36c658`
- Sonda de FORMA dos erros transitórios (Prisma 7.8 + adapter-pg, `dev-b04a-errshape.mts`): P2028 = `PrismaClientKnownRequestError.code` (e o `$transaction` bloqueado NÃO é abortado pelo timeout: espera o lock e falha no commit — 19,9 s no ensaio); deadlock em query ORM = `DriverAdapterError.cause.code = "40P01"`; deadlock em `$queryRaw` = `P2010` com **`meta.driverAdapterError.cause.code = "40P01"`** (o plano §3.7 dizia `P2010.meta.code` — divergência D-3). `databaseErrorCodes` lê as três formas + `meta.code`.
- Smoke do caminho Prisma (`dev-b04a-smoke.mts`, admin): open 2 itens → 2º open 409 `items_in_open_session`; contar 7/7 → close `concluida`, total −15 (−3×2 + −3×3); 2º close 422; saída acima do saldo 409; estorno 2× → ok/already_reversed; baixa por fonte idempotente, estorno 2× → compensa/undefined; open depois de `concluida` ok; cancel ok.
- Em memória: as 7 suítes de estoque **67/67** (depois do commit de teste abaixo); consumidores `fuel-logs`/`maintenance-order-items`/`fleet-alerts-notifications` 45/45.

### 1.3 Commit isolado de teste — `cd055802` (DIVERGÊNCIA D-1)

---

## Instância 2

- **Papel:** desenvolvedor (§C7.4-bis), 2ª instância (a 1ª caiu por 429 às ~12:12). **Modelo que rodou:** Opus 5 (`claude-opus-5[1m]`).
- **Worktree:** `.claude/worktrees/b04a`, branch `fix/inventory-consistency`, HEAD ao chegar `cd055802` (3 commits da 1ª instância sobre `756b8c37`); `origin/main` = `02bd7dab` (fetch 18/09 ~14:30). Untracked ao chegar: `tests/inventory-balance-lock-race-db.test.ts`, `tests/inventory-write-paths-guard.test.ts`.
- **Terreno:** `node_modules` diretório real (sem junction, `dir /AL` vazio); `@prisma/client` 7.8.0; Node v20.19.5. Contêineres do bloco vivos: `dev-b04a-pg` (`127.0.0.1:58651`, `erp_dev_b04a`: 108 migrações, os 2 índices novos presentes, resíduo do smoke da 1ª instância = 1 tenant / 10 movimentos; nenhum papel efêmero órfão) e `dev-b04a-redis` (`127.0.0.1:58652`). De outras sessões, Up e intocados: `bsan301-pg`, `bsan301-redis`, `pastrack-*`. `gh pr list --state open` → só #387 (sem migração) → `20260873000000` segue livre (R13).

### I2.0 Medição do que a 1ª instância deixou, contra o plano v3 (nada herdado como fato)

| passo do plano | estado medido | como medi |
|---|---|---|
| §4.1 migração | **cumprido** — texto IDÊNTICO ao bloco `sql` do §4.1 | `awk` extrai o bloco do plano → `diff` contra o `migration.sql` → vazio |
| §4.1 `schema.prisma` | **cumprido** — só comentário junto do `@@index` de `reverses_movement_id` | `git show 2b7f8620 -- prisma/schema.prisma` |
| §4.2 censo | **cumprido** — linha 1 com "SOMENTE LEITURA: o arquivo contém apenas consultas (SELECT); nada é gravado." | leitura |
| §4.3 roteiro | não tocado (vai em `pendencias.md`) | — |
| §4.4 drill em base própria (T-C′) | **não tocado** | `ls tests` |
| §3.1 V1–V5 lock como tipo | **cumprido** no código; T-A 16/16 verde (execução minha, abaixo) | leitura + `node --test` |
| §3.2 I7 | **cumprido** (1 lock por via; unidade toma sessão antes do item via `createMovement` real) | leitura + A12 verde |
| §3.3 V6 em unidades | **cumprido** (`beginClose`/unidade com `beforeUnitCommit` DENTRO da tx/`abortClose` no `catch`/`finishClose` com SUM no banco + CAS); `applyClose` e `onUnitApplied` não existem | leitura + D4 verde |
| §3.4 V7/V8 | **cumprido** (FOR SHARE + predicado `adjustment_movement_id IS NULL` em `fechando`; cancel FOR UPDATE + contagem própria) | leitura |
| §3.5 V9 open (I9) | **cumprido** em Prisma (tenant `FOR NO KEY UPDATE` + sobreposição antes do `create`) e em memória | leitura + D8 verde |
| §3.6 porta UoW | **cumprido** (`inventory-uow.ts`, `inventory-uow-prisma.ts`) | leitura |
| §3.7 transitório → 503 | **cumprido** (`mapTransientDbFailure` em todo `this.tx` e na porta) | leitura + A14 + D7 |
| §3.8 P2002 fora da tx | **cumprido** nos wrappers V3/V4/V5 | leitura + D6 |
| §6 T-A | **escrito, não commitado**; **16/16 verde** no meu código (`dev-b04a-pg`, 14,7 s) | `node --test` |
| §6 T-B | **não tocado** | — |
| §6 T-C | **não tocado** | — |
| §6 T-D | **escrito, não commitado**; 8/9 — D9 vermelho porque T-B/T-C ainda não existem (exige ≥ 3 suítes) | `node --test` |
| §8 `ci.yml`, achados, REGISTRO, KPI, pendências, trilha | **não tocados** | `git diff --stat` |
| §10 bateria / vermelho-controle / drill M-02 / sizing | **não executados** (worktree `dev-b04a-base` não existe) | `git worktree list` |
| memória (67 → 67) | **67/67** re-medido por mim (7 suítes de estoque) | `node --test` |
| `npm run check` | **ec 0** (com `DATABASE_URL=postgresql://x` + `db:generate`) | re-medido |

### I2.1 Divergências plano × código (todas reportadas, nenhuma decidida por mim)

- **D-1 (leitura MINHA do rótulo que a 1ª instância deixou sem texto; a mensagem do commit `cd055802` a descreve).** Escopo × I9 em memória. O §3.5 manda a MESMA recusa de sobreposição no repositório em memória e o §9 exige 67 → 67; o caso `[isolamento]` de `tests/inventory-cycle-counts-routes.test.ts` (arquivo FORA da lista "PERMITIDO (e só isto)" do §8) abre uma 2ª sessão sobre o mesmo item com a 1ª ainda aberta. **Re-medido por mim:** com o arquivo como estava antes do `cd055802` (cópia temporária `tests/_tmp_d1_controle.test.ts`, apagada logo depois) → `not ok 5 - [isolamento] … 409 !== 201`. O commit isolado `cd055802` acrescenta só o `cancel` da sessão de A (200) antes da abertura com `tenant_id` forjado; nenhuma asserção removida. Fica isolado para a junta/orquestrador ratificar ou descartar — sem ele, ou I9 some da memória, ou a contagem cai para 66/67.
- **D-2 (minha).** O §3.1/§6-D2 diz que o arquivo não declara `isExitReversed(` sem sufixo `Locked`; mas `isExitReversed` é membro da interface pública `InventoryRepository` (que o §3.1 manda NÃO mudar) e é chamado por `inventory.service.ts:493` (PROIBIDO no §8). O código mantém `isExitReversed` público como LEITURA de exibição, sem chamador interno às vias que escrevem (elas usam `isExitReversedLocked`); o D2 assere exatamente isso. Conflito interno do plano; resolvido pela restrição mais forte (escopo), reportado.
- **D-3 (da 1ª instância, re-lida por mim no código).** §3.7 diz que o `40P01` em query crua vem em `P2010.meta.code`; a forma medida por ela é `P2010.meta.driverAdapterError.cause.code`. `databaseErrorCodes` lê as duas (e `cause.code`/`cause.originalCode`); A14 exercita as três formas.
- **D-4 (leitura MINHA do rótulo citado no comentário do A12).** Com I9, o `open()` real **não chega a pedir KEY SHARE** nos itens que a unidade segura: todo item que uma unidade trava está numa sessão `fechando` → o `open` recusa com 409 `items_in_open_session` sob o lock do tenant, sem esperar. O cenário do §6 A12/B8(ii) "B **bloqueia** no INSERT de `cycle_count_entries` e conclui" deixou de ser alcançável pelo próprio desenho (I9 é mais forte que I7 aqui). O A12 assere: 409, sem 40P01, e que o `open` recusado não esperou o lock da unidade (< 1 200 ms com a unidade segurando 1 500 ms). A rodada `recalculateAbc()` segue a do plano (B bloqueia em `abc_class` e conclui).
- **D-5 (minha).** Outcomes com um ramo a mais que o §3.3: `RecordEntryOutcome` ganhou `entry_not_found` (o plano juntava sessão e entrada em `not_found`, o que trocaria o 404 `CYCLE_COUNT_ENTRY_NOT_FOUND` de hoje pelo 404 de sessão) e `FinishCloseOutcome` ganhou `not_found`. `recordEntry` no serviço mantém uma leitura ADVISORY de `findSession` antes da validação do corpo, só para preservar a precedência de erro de hoje (404/422 terminal antes do 400 de corpo); a decisão que vale é refeita sob `FOR SHARE` no repositório.

### I2.2 O que a 2ª instância escreveu (passos do §6)

- **T-A** (da 1ª instância, assumido): bootstrap tolera a ausência de `inventory-uow-prisma.js` (no head-base o serviço antigo é construído sem a porta — o vermelho-controle mede o código antigo, não uma falha de import); A0 passa a asserir `env.CORE_SAAS_PERSISTENCE === "prisma"` (lição do #357). 16 casos.
- **T-D** (da 1ª instância, assumido): `stripComments` preserva as quebras de linha de comentário de bloco — o universo publicado do D1 citava `inventory-prisma.repository.ts:497` para o `stockMovement.create` que está na linha **520**; D4 separa "close não chama X" de "X fora da unidade" (a mensagem da mutação "remove o abortClose" era a errada). 9 guards.
- **T-B** `tests/inventory-cycle-count-close-units-db.test.ts` — **20 casos** (B0–B17 + B9b; B12 em dois: memória e Prisma). Controles vermelhos embutidos em SQL cru, marcados `// CONTROLE VERMELHO — não é o código do bloco`: `closeV2`/`recordEntryV2`/`cancelV2` (desenho v2 literal: sem `abortClose`, total por chamada) e o v1 do B8(i) (sessão + X + Y `FOR UPDATE` numa tx).
- **T-C** `tests/inventory-unique-backstops-db.test.ts` — **7 casos** (C0 + C1–C3, C6–C8). Sem DDL.
- **T-C′** `tests/inventory-migration-drill-db.test.ts` — **2 casos** (C4′, C5′), base própria `<db>_drill_<10 hex>` (`CREATE DATABASE … TEMPLATE template0` + `migrate deploy` por `execFileSync(process.execPath, prisma/build/index.js)`; `DROP DATABASE … WITH (FORCE)` no teardown).

**Primeira execução no meu código (`dev-b04a-pg`, sequencial):** T-A 16/16 (14,7 s) · T-B **20/20** (30,8 s; `[B8(i)] controle v1 × open: P2010/40P01 / ok`, `× abc: P2010/40P01 / ok`; `[B10] N=250: total 5 469 ms; unidade média 21,8 ms · p95 28 ms · máx 41 ms`) · T-C 7/7 (1,9 s) · T-C′ 2/2 (15,3 s; `migrate deploy` na base própria 13 560 ms; re-up 20 ms; base derrubada — `pg_database` sem `_drill_` depois) · T-D 9/9.

### I2.3 Divergências novas (minhas), reportadas

- **D-6.** C6 do §6 manda executar o censo "contra a base com 1 grupo semeado" **na T-C** (base compartilhada, sem DDL — D9). Com os dois índices únicos no lugar, grupo duplicado é **impossível** nessa base (é exatamente o que eles impedem). O que ficou: C6 prova na base compartilhada a regex fail-closed sobre o texto sem comentários (0 casamentos; controle de dentes: o mesmo texto + `DELETE FROM stock_movements;` → casa) e a execução das duas consultas numa transação **`READ ONLY`** (zero grupo; colunas do resumo); a execução **com grupos** (21 linhas, colunas `tipo, tenant_id, chave_1, chave_2, linhas, movimentos`, 13 + 8, contagem antes = depois) foi para o **C5′**, na base própria sem os índices. A comparação "contagem antes = depois" na base compartilhada seria corrida com as suítes irmãs em paralelo (T-A/T-B gravam movimentos) — trocada pela transação `READ ONLY`, que prova a mesma propriedade sem depender de silêncio alheio. O texto do §4.2 sobre "texto cru → 3 casamentos" não vale para o censo v3: a linha 1 reescrita não tem mais palavra de escrita (0 casamentos também no texto cru).
- **D-7.** T-C ganhou **C0** (postura do papel `pg_roles` + `application_name` + os dois índices com o predicado `WHERE (… IS NOT NULL)`): o arnês comum do §6 exige postura asserida em toda suíte `-db`, e o §6 não listava caso para isso na T-C. Contagem de T-C: 6 → **7**.
- **D-8.** B4 do §6 diz "idem [ao B3] com B = cancel real → 422 `close_in_progress`; sessão `concluida`". Com o arranjo do B3 (a tx do admin termina em `concluida`), o cancel relê `concluida` e o resultado correto é 422 `invalid_status_transition`, não `close_in_progress`. Para medir o que o B4 promete, o arranjo para em `fechando` + 1 carimbo (uma unidade aplicada e não commitada): B bloqueia no `FOR UPDATE` da sessão, relê `fechando` com 1 carimbo → **422 `close_in_progress`**; depois o `close` real retoma → `concluida`, `is_active=true`, 1 ajuste, total −6. No head-base o mesmo arranjo dá `cancelada` com o ajuste no razão (o vermelho do `[10-E4-hb]`).
- **D-9.** B15 do §6 pede o controle v2 "concorrente" (−48/−30). Concorrência não é determinística e o controle roda na CI; o controle embutido intercala o v2 **deterministicamente** (A aplica 5 unidades e para num portão; B retoma, aplica as outras 5 e conclui) → o 200 do v2 traz **−30** e A perde com 422. O caso real segue concorrente × RACE_N (dois `close` com `beforeUnitCommit` de 25 ms, o 2º largando 15 ms depois).

### I2.4 Mutações de T-D (cada uma executada UMA vez, revertida por bytes; `git status` antes = depois)

Script `b04a-i2/mutations.mjs` (scratchpad): aplica por âncora única, roda `node --test --test-name-pattern=^Dn tests/inventory-write-paths-guard.test.ts`, captura a linha vermelha, reescreve os bytes originais. Saída integral em `b04a-i2/mutations-out.json` (16 mutações, todas `exit 1`, `# pass 0 # fail 1`; `gitStatusDepois: (vazio)` na 1ª rodada, feita com a árvore limpa depois do commit `3c027b1d`).

| guard | mutação | linha vermelha / motivo |
|---|---|---|
| D1 | as 4 grafias do crítico (`createManyAndReturn(`, `updateManyAndReturn(`, `INSERT INTO "public"."stock_movements"`, `insert into stock_movements`) num arquivo novo | `not ok 1 - D1 …` — as **4** linhas aparecem no `outside` ("escritor de stock_movements fora da allowlist — via nova sem classificação") |
| D2 | `aggregate` antes do lock (createMovement) | `createMovement: leitura que DECIDE antes do lock (aggregate)` |
| D2 | 2 locks (createTransfer) | `createTransfer: exatamente 1 lockItemForUpdate (I7) — achei 2` |
| D2 | sem lock (removeExitForSource) | `removeExitForSource: … — achei 0` |
| D2 | laço antes do lock (reverseMovement) | `reverseMovement: lock depois/dentro de laço` |
| D2 | versão sem lock `hasReversalOf` declarada | `versão SEM lock de leitura que decide` |
| D3 | `saldoOfLocked(lock: any)` | `saldoOfLocked: assinatura sem o token ItemWriteLock` |
| D4 | remove o `abortClose` do `catch` | `close não chama abortClose(` (re-executada depois da correção da mensagem) |
| D4 | `applyClose` de volta | `applyClose (status sem condição) não existe mais` |
| D4 | acumula `avgCost` no laço (`findItemById` na unidade) | `close não lê avg_cost por item (S-02 …)` |
| D5 | `abortClose` sem `status` no `where` | `abortClose: updateMany de cycle_counts sem status no where (não é CAS)` |
| D6 | `isUniqueViolation(` dentro de `createExitForSource` | `createExitForSource: catch de P2002 DENTRO da transação (25P02)` |
| D7 | porta pública nova sem `this.tx` | `RlsPrismaInventoryRepository: porta pública sem this.tx (sem o mapeamento 503)` |
| D8 | `createSession` sem o lock do tenant | `lock NO KEY UPDATE da linha do tenant antes do create` |
| D8 | `FOR UPDATE` na linha do tenant | idem (a busca exige `FOR NO KEY UPDATE`; e o `FOR UPDATE` é reprovado à parte) |
| D9 | `DROP INDEX` em T-C | `inventory-unique-backstops-db.test.ts faz DDL na base compartilhada` |

### I2.5 Vermelho-controle no head-base (§10 passo 9) — EXECUTADO

- Worktree `dev-b04a-base` = `git -C <b04a> -c core.longpaths=true worktree add --detach …/dev-b04a-base cc696f93` (`git diff --stat 02bd7dab cc696f93 -- src prisma scripts tests` → vazio: `src/`/`prisma/`/`scripts/`/`tests/` = head-base). `npm ci` próprio (326 pacotes, 29 s, ec 0; sem junction) + `prisma generate` (`DATABASE_URL` só no env). Copiadas SÓ as 5 suítes novas (os commits `134d57da` + `3c027b1d` + a correção da mensagem do D4). Base `erp_dev_b04a_base` recriada no `dev-b04a-pg` e migrada com as migrações DO HEAD-BASE: 107, **0** índices novos.
- Execução (sequencial, `DATABASE_URL`/`REDIS_URL` exportadas, TAP em `b04a-i2/hb-*.tap`):

| suíte | head-base | vermelhos (motivo lido do TAP) | verdes no head-base (esperado) |
|---|---|---|---|
| T-A | **3/16** (ec 1, 27 s) | A1 `exatamente 10 aceitas … actual: 20`; **A2 pela invariante** (`B decide sobre o saldo NOVO: expected 409, actual ok`); A3–A6 `actual: 20`; A7/A7b `ok, ok` (2 compensações); A8 `compensou, compensou`; A9 `expected 2.333333, actual 2`; A10 `25P02 vazou — ok, DriverAdapterError/25P02`; A12 timeout de barreira em `abc_class` (o `close` antigo ignora o gancho, não segura o item); A14 `expected 503, actual P2028` | A0, A11, A13 (postura/cross-tenant/forma) |
| T-B | **6/20** (ec 1, 46 s) | B1 `ok, ok` (2 vencedores); B2 `expected rejected, actual fulfilled`; **B3 pela invariante** (`counted: 5` por cima do carimbo); B4 `expected close_in_progress, actual ok` (cancelou por cima do ajuste); B5 `invalid_status_transition` no lugar de `entry_already_adjusted`; B8 timeout de barreira (ii); B9 `ok, ok` (2 sessões); B11 e B14 `status aberta, carimbadas 0` (o head-base não conhece `fechando`); B12 memória `beginClose is not a function`, B12 Prisma `status must be one of: aberta, concluida, cancelada`; B15 `ok, ok`; B16 timeout de barreira em `cycle_counts`; B17 `expected ok, actual 422 invalid_status_transition` | B0, B6, B7, B9b, B10 (postura/cross-tenant/legado/concorrência sem assert de saldo/tamanho — nenhum deles está na lista de vermelhos do §10-9) e **B13 de propósito** (§10-9: o head-base fica `aberta`, a emulação v2 embutida é o controle e ficou vermelha como devia) |
| T-C | **1/7** (ec 1, 8 s) | C0 (índices ausentes); C1/C2 `expected rejected, actual fulfilled` (duplicata aceita); C6 `ENOENT scripts/inventory-duplicates-census.sql`; C7/C8 **2 compensações** (a do cru + a de B) | C3 |
| T-C′ | **0/2** (ec 1, 16 s) | C4′ `a migração do bloco foi aplicada … expected 1, actual 0`; C5′ `ENOENT … 20260873000000…/migration.sql` | — |
| T-D | **2/9** (ec 1) | D2 `achei 0` lock; D3 `leituras *Locked: ` vazio; D4 `close sem uow.run`; D5 `applyClose … sem status no where`; D6 `createExitForSource: catch de P2002 DENTRO da transação`; D7 porta pública sem `this.tx`; D8 sem `NO KEY UPDATE` | **D1 e D9** — divergência **D-10** abaixo |

- **D-10 (minha).** O §10-9 lista "vermelho … no guard D1–D9". D1 e D9 são **verdes no head-base, e têm de ser**: D1 enumera os escritores de `stock_movements` e o conjunto do head-base é o MESMO do bloco (`insertMovement` ×1 + semente — o bloco não criou nem removeu escritor); D9 afirma que nenhuma suíte `-db` do bloco faz DDL fora do drill, e as suítes copiadas são as mesmas. O vermelho desses dois guards é o das mutações (I2.4), não o do head-base.

### I2.6 Bateria — execuções (saídas coladas; TAP/logs integrais em `b04a-i2/` no scratchpad)

**Passo 1 — `npm run check`** (`DATABASE_URL=postgresql://x`, `npm run db:generate` antes): `ec 0` (medido às ~14:35, antes das suítes; re-executado no fim — ver I2.8).

**Passo 3 — `npm test` na forma canônica 3** (banco `erp_dev_b04a` RECRIADO: `DROP DATABASE … WITH (FORCE)` + `CREATE DATABASE` + `migrate deploy` → 108; `DATABASE_URL`/`REDIS_URL` do `dev-b04a-pg`/`dev-b04a-redis` exportadas; `CORE_SAAS_PERSISTENCE` NÃO exportado), `ec 0`, 289 s:
```
[run-backend-tests] CORE_SAAS_PERSISTENCE=memory — padrão do runner (nada exportado no ambiente — o `.env` não decide a bateria; mesma configuração do job `backend` da CI)
[run-backend-tests] 288 arquivo(s) de teste — executando...
# tests 3051
# pass 3049
# fail 0
# skipped 2
[run-backend-tests] 288 arquivo(s) · 3051 teste(s) · pass 3049 · fail 0 · skipped 2
```
Os 2 pulos são os do orçamento (`permission-catalog-db-parity`, `RBAC_DB_PARITY` ≠ "1"). Base 2995/2997 → **3049/3051 (+54 = 16 + 20 + 7 + 2 + 9)**; meta do §9 (≥ 3048/3050) cumprida. A regressão focada do passo 6 (`financial-*-db`, `o6r06-*-db`, `pg-barrier-scoped-db`, `checklist-run-*-db`) está DENTRO desta execução (forma canônica 3 roda toda suíte `-db` contra o mesmo cluster) — `# fail 0`.

**Passo 4 — as 4 suítes `-db` do bloco, 3 execuções com o banco RECRIADO antes de cada** (108 migrações cada):
```
run 1 (migracoes 108, serial --test-concurrency=1) ec=0 70s :: # tests 45 # pass 45 # fail 0 # skipped 0
run 2 (migracoes 108, serial --test-concurrency=1) ec=0 62s :: # tests 45 # pass 45 # fail 0 # skipped 0
run 3 (migracoes 108, paralelo — node --test default, a forma da CI) ec=0 33s :: # tests 45 # pass 45 # fail 0 # skipped 0
```
O plano previa 44 (T-C com 6); são 45 pela D-7 (C0).

**Passo 5 — T-D:** 9/9; as 16 mutações em I2.4.

**Passo 7 — KPI:** `node --check Kpis/app.js` ok · `node scripts/kpi-freeze.mjs` (reinjetou, 85 119 bytes) → `--check` "em dia (snapshot 2026-09-18)" · `kpi-achados-paridade` **6/6** · `kpi-dashboard-charts` 16/16 · `kpi-dashboard-contraste` 6/6. **Controle do K-01, executado:** o mesmo `kpis-latest.json` com `aguardando_merge: []` → `not ok 6 - auditoria: achado fechado SEM merge não conta como corrigido no painel` (`# pass 5 # fail 1`); restaurado por bytes → 6/6.

**Passo 8 — drill do M-02** (base `erp_dev_b04a_m02`, migrada com as 107 do HEAD-BASE pelo worktree `dev-b04a-base`; semente em `b04a-i2/m02-seed.sql`, limpeza escopada por slug `dev-b04a-m02-%`; log `b04a-i2/m02-drill.log`):
```
== 1. semeia 21 grupos            -> estorno_grupos|13 · ajuste_grupos|8
== deploy #1 (dado SUJO)          -> Error: P3018 · Database error code: P0001 · "stock_movements: 21 grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003) … Amostra (ate 20 de 21) …" · ec=1
== deploy #2 (dado SUJO)          -> Error: P3009 · ec=1
== limpeza escopada               -> DELETE 57 / 8 / 2 / 2
== deploy #3 (dado LIMPO)         -> Error: P3009 · ec=1   (a trava do M-02)
== migrate resolve --rolled-back  -> "Migration 20260873000000_add_stock_movements_unique_backstops marked as rolled back." ec=0
== deploy #4                      -> "All migrations have been successfully applied." ec=0
== pg_indexes                     -> stock_movements_cycle_count_item_key … WHERE (cycle_count_id IS NOT NULL)
                                     stock_movements_reversal_active_key … WHERE (reverses_movement_id IS NOT NULL)
== _prisma_migrations 20260873    -> (aplicada f, rolled_back t) + (aplicada t, rolled_back f)
== censo por stdin                -> (0 rows) · estornos 0 · ajustes_de_contagem 0
```
N = 0 **com a ressalva**: o N que importa é o de staging/produção — ato do dono (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`). Base derrubada depois.

### I2.7 Registro, KPI, `ci.yml` (§8, emendas 1-b/1-c, 3-q; K-01)

Tudo por script escrito com Write, preservando CRLF da árvore de trabalho (contagem `crlf=N lf=0` conferida em cada arquivo depois de gravar):
- `.github/workflows/ci.yml` (`b04a-i2/apply_ci.cjs`): **só** 5 linhas de comentário + as 4 `SUITES="$SUITES tests/inventory-…-db.test.ts"`, depois da `financial-entry-delete-reverse-race-db` e antes do `node --test` (`git diff`: +9, −0).
- `docs/revisoes/O6R/achados.jsonl` (`b04a-i2/apply_achados.py`, `json.dumps(ensure_ascii=False)` — o estilo da casa, asserido linha a linha nas 30 intocadas): DAT-002/003 `status: fechado`, `fechado_em: 2026-09-18`, `fechado_por: "B-O6R-04a (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"`, `evidencia_fechamento`; no DAT-003 o campo novo `nota_criterio` (A-DAT). Conferido por diff de objetos: só essas chaves mudaram, `correcao`/`teste` intactos, ordem das chaves preservada.
- `REGISTRO_ACHADOS_O6R.md`: linha `- Status: **fechado** em 2026-09-18 pelo \`B-O6R-04a\` (PR na autoria; …)` + parágrafo do conserto nas duas seções; no DAT-003, `- Nota de critério (§A2): …`.
- `Kpis/kpis-latest.json` (`b04a-i2/apply_kpi.cjs`, round-trip `JSON.stringify(…, null, 2)` idêntico ao arquivo antes de editar): `backend_tests` 3049/3051 com N e forma; `blocks_completed` 164; `release` do bloco (`pr`/`merge_commit`/`approved_head` `null`, `status: published_per_pr`); **`production_readiness.aguardando_merge = [DAT-002, DAT-003]`** + `nota_aguardando` (texto anterior preservado); `p0_fechados` **13** e `fechados` inalterados; `findings.itens[DAT-002/003].status = "fechado"`; `roadmap B-O6R-04 = parcial`; trilhas não tocadas CARREGADAS com marcador §C3.3 (`git diff --name-only origin/main...HEAD -- mobile frontend` → 0 linhas); `mvp_*` INTOCADOS (§C3.4). `kpis-history.json` +1 entrada (159); `kpis-history.md` +1 seção; `Kpis/app.js` só pelo `kpi-freeze.mjs`.
- `agent-orchestration/controle/pendencias.md` (APPEND no fim, nunca reescrita): nascem `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` (ALTA, ato do dono; roteiro do §4.3 com o `migrate resolve --rolled-back`, o aviso do gatilho do staging e o anexo R19 das sessões sobrepostas), `P-O6R-B04-CONSUMIDORES-503` (MÉDIA), `P-O6R-B04-UI-STATUS-FECHANDO` (MÉDIA) e `P-O6R-B04-DIVERGENCIA-ESCOPO-TESTE-ISOLAMENTO` (BAIXA — a D-1, para a junta ratificar ou descartar `cd055802`); seção "EMENDAS DO `B-O6R-04a`": `P-O6R-B04` PARCIAL na autoria, `P-020`/`P-021` fechadas na autoria (backfill pós-merge), as notas 4–6 do §13 e o "não nascem". As linhas de `status:` das entradas antigas NÃO mudam na autoria (precedente do `B-O6R-06`). Índice regenerado pelo gerador (`gerar-indice-pendencias.py`): baseline conferido byte-idêntico ao blob do HEAD ANTES de editar; depois, 374 cabeçalhos / 363 IDs / 271 ABERTAS (+4).
- **Quase-erro, registrado:** a 1ª invocação do script que insere a pendência da D-1 resolveu o caminho relativo contra o cwd da sessão (o worktree `b11`, de outra frente) e lançou `Error: marcador` ANTES de gravar (a âncora não existia lá). `git -C …/b11 status --short` → vazio; nada foi escrito fora do `b04a`. A 2ª invocação rodou com `cd` no `b04a`.

### I2.8 Sizing com o código REAL (§10 passo 10) — executado

Script `b04a-i2/sizing.mts` (importa o `CycleCountService` + repositórios `Rls*` + porta do worktree indicado; papel efêmero `createEphemeralRole`; uma base descartável por lado — `erp_dev_b04a_size` com as 108 migrações do bloco e `erp_dev_b04a_size_hb` com as 107 do head-base; itens `avg_cost 2`, BASE 10, contado 7 → esperado −6·N; tempo de unidade = intervalo entre chamadas do gancho `beforeUnitCommit`, que roda no fim de cada unidade). Bloco e head-base em processos separados, **sequenciais**. Terreno: `bsan301-*` e `pastrack-*` (de outras sessões) de pé, mas ociosos — `docker stats` no início, entre os lados e no fim: todos ~0% (pico `pastrack-api-1` 12% no 1º instante). Saídas integrais: `b04a-i2/size-bloco.json`, `size-hb.json`, `size-run.log`; `papeisOrfaos: 0` nos dois.

| N | bloco: total | unidade média / p95 / máx | `totalVarianceValue` (esperado) | bloco: final | head-base |
|---|---|---|---|---|---|
| 250 | 4 730 ms | 18,8 / 22 / 153 ms | −1 500 (−1 500) | `concluida`, 250 ajustes, 250 carimbos, 0 dup | 4 529 ms, `concluida`, −1 500 |
| 500 | 9 430 ms | 18,8 / 25 / 37 ms | −3 000 (−3 000) | `concluida`, 500/500, 0 dup | 8 703 ms, `concluida`, −3 000 |
| 1 000 | 18 667 ms | 18,6 / 23 / 41 ms | −6 000 (−6 000) | `concluida`, 1000/1000, 0 dup | 17 089 ms, `concluida`, −6 000 |
| 10 000 | **196 349 ms** | **19,6 / 27 / 156 ms** | **−60 000 (−60 000)** | **`concluida`, 10 000 ajustes, 10 000 carimbos, 0 dup** | **160 898 ms → `P2028` em `cycleCountEntry.updateMany()` (o `applyClose`), sessão `aberta`, 10 000 ajustes gravados, 0 carimbados** |

Leitura: nenhuma unidade passou de 156 ms (timeout 5 000 ms) em N algum; o custo do bloco é linear e fica 4,4 % / 8,4 % / 9,2 % acima do head-base em N = 250 / 500 / 1 000 (os N em que o head-base conclui) (o preço do lock da sessão + item por unidade e das duas transações extras); o head-base estoura no `SNAPSHOT_LIMIT` exatamente no modo que a emenda 2-h descreve. B10 (N=250 na CI) já publicava média 21,8 / p95 28 / máx 41 ms.

### I2.9 Commits (sem push) — `git log --oneline origin/main..HEAD` (os meus + os da 1ª instância)

```
3182034a docs(b-o6r-04a): KPI no proprio PR, DAT-002/003 fechados na autoria, pendencias e trilha
9c86f997 ci(inventory): as 4 suites -db do B-O6R-04a na lista SUITES do backend-postgres
e66231a8 test(inventory): D4 separa 'close nao chama X' de 'X fora da unidade' (B-O6R-04a)
3c027b1d test(inventory): T-B fechamento em unidades, T-C backstops de banco e T-C' drill em base propria (B-O6R-04a)
134d57da test(inventory): T-A saldo sob concorrencia e T-D guards de enumeracao fail-closed (B-O6R-04a)
cd055802 test(inventory): regressao em memoria cancela a 1a sessao antes da abertura com tenant forjado (B-O6R-04a, I9)
ea36c658 fix(inventory): lock do item em toda via de escrita e fechamento de contagem em unidades retomaveis (B-O6R-04a)
2b7f8620 feat(inventory): indices unicos parciais de estorno e de ajuste de contagem, fail-closed (B-O6R-04a)
```

Da 2ª instância: `134d57da`, `3c027b1d`, `e66231a8`, `9c86f997`, `3182034a`. Da 1ª: `2b7f8620`, `ea36c658`, `cd055802` (este é a D-1 — isolado para ratificação). HEAD final `3182034a`; `git status --short` vazio.

### I2.10 `git diff --stat origin/main` (inclui os commits de plano/apoio do planejador e do comando, anteriores ao dev)

```
 .github/workflows/ci.yml                                                               |    9 +
 Kpis/app.js                                                                            |    2 +-
 Kpis/kpis-history.json                                                                 |   12 +
 Kpis/kpis-history.md                                                                   |   30 ++
 Kpis/kpis-latest.json                                                                  |   68 +--
 agent-orchestration/codex/comandos/B-O6R-04a-inventory-consistency.md                  |  176 +++++++
 agent-orchestration/codex/log-execucao.md                                              |   41 ++
 agent-orchestration/controle/pendencias-indice.md                                      |   18 +-
 agent-orchestration/controle/pendencias.md                                             |   81 ++++
 agent-orchestration/docs/status-geral.md                                               |   26 +
 agent-orchestration/omega/juntas/votos/B-O6R-04a/00-critico-r1.md                      |  101 ++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/00-critico-r2.md                      |  160 ++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-fase1.json        |  411 ++++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-fase2.json        |  482 ++++++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-probe-b04a.mts    |  382 +++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-census.sql     |   10 +
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase1.json     |  483 ++++++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase2.json     |   59 +++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase3.json     |   37 ++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase4.json     |   51 ++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase5.json     |   32 ++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase6.json     |   39 ++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-guards.mjs     |   39 ++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-kpi-apply.cjs  |   14 +
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-plano-v2.md    |  769 +++++++++++++++++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-probe-b04a.mts |  377 ++++++++++++++
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-seed-dups.sql  |   20 +
 agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-size.json      |   51 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-e5.json                         |  201 ++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-faseA.json                      | 1701 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-probe-b04a.mts                  |  612 +++++++++++++++++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c01.mts                         |   47 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c02.mts                         |   52 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c03.mts                         |   50 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c04.mts                         |   46 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c05.mts                         |   46 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c05b.mts                        |   16 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c06.mts                         |   60 +++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c07.mts                         |   55 +++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c08.mts                         |   41 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c09.mts                         |   55 +++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c10.mts                         |   29 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-census-out.txt                  |   22 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-census.sql                      |   10 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-do.sql                          |   15 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-down.sql                        |    2 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-esqueleto-com-registro.bak.md   |   65 +++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseA.json                      |  651 +++++++++++++++++++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseB.json                      |  336 +++++++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseD.json                      |   17 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-guards.mjs                      |   39 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-kpi-apply.cjs                   |   22 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-probe-b04a.mts                  |  497 +++++++++++++++++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-reup.sql                        |    4 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00a.md                         |   25 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00b.md                         |    9 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00c.md                         |   24 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s01a.md                         |   13 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s01b.md                         |   16 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s02a.md                         |   19 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s02b.md                         |   21 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03a.md                         |   41 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03b.md                         |   48 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03c.md                         |   41 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s04a.md                         |   41 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s04b.md                         |   25 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s05.md                          |   19 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06a.md                         |   26 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06b.md                         |   24 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06c.md                         |   36 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s07.md                          |   23 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s08.md                          |   37 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s09.md                          |   20 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s10.md                          |   25 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s11.md                          |   28 ++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s12.md                          |   12 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s13.md                          |   23 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s14head.md                      |   18 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s14tail.md                      |   12 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-seed-dups.sql                   |   20 +
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-size.json                       |  114 +++++
 agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-size10k.json                    |   27 ++
 agent-orchestration/omega/planos/B-O6R-04a-plano.md                                    |  626 ++++++++++++++++++++++++
 docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md                                              |   36 ++
 docs/revisoes/O6R/achados.jsonl                                                        |    4 +-
 prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql    |   31 ++
 prisma/schema.prisma                                                                   |    6 +
 scripts/inventory-duplicates-census.sql                                                |   15 +
 src/modules/inventory/cycle-count-prisma.repository.ts                                 |  285 +++++++++--
 src/modules/inventory/cycle-count.repository.ts                                        |  190 ++++++--
 src/modules/inventory/cycle-count.service.ts                                           |  304 +++++++-----
 src/modules/inventory/cycle-count.types.ts                                             |  107 +++-
 src/modules/inventory/inventory-prisma.repository.ts                                   |  469 ++++++++++++------
 src/modules/inventory/inventory-uow-prisma.ts                                          |   31 ++
 src/modules/inventory/inventory-uow.ts                                                 |   55 +++
 src/modules/inventory/inventory.types.ts                                               |   26 +
 tests/inventory-balance-lock-race-db.test.ts                                           |  638 ++++++++++++++++++++++++
 tests/inventory-cycle-count-close-units-db.test.ts                                     | 1084 +++++++++++++++++++++++++++++++++++++++++
 tests/inventory-cycle-counts-routes.test.ts                                            |    8 +
 tests/inventory-migration-drill-db.test.ts                                             |  260 ++++++++++
 tests/inventory-unique-backstops-db.test.ts                                            |  346 +++++++++++++
 tests/inventory-write-paths-guard.test.ts                                              |  354 ++++++++++++++
 102 files changed, 13963 insertions(+), 370 deletions(-)
```

### I2.11 Bateria final, depois do último commit de código/registro (log `b04a-i2/bateria-final.log`)
```
db:generate ec=0                       (DATABASE_URL=postgresql://x)
npm run check ec=0
npm run lint ec=0
npm run build ec=0
node --check Kpis/app.js ec=0
kpi-freeze: em dia (snapshot 2026-09-18). ec=0
kpi-achados-paridade: # tests 6 # pass 6 # fail 0
kpi-dashboard-charts: # tests 16 # pass 16 # fail 0
kpi-dashboard-contraste: # tests 6 # pass 6 # fail 0
inventory-write-paths-guard: # tests 9 # pass 9 # fail 0
# tests 67 # pass 67 # fail 0   <- 7 suites de estoque em memoria
git diff --check (arvore) ec=0
git diff --check origin/main...HEAD ec=0
```
Índice de pendências: o blob commitado é **byte-idêntico** à saída do gerador rodado sobre o `pendencias.md` commitado (cópia isolada no scratchpad, `cmp` vazio).

### I2.12 Limpeza §C5 (1 linha) e terreno

**Limpeza:** `dist/` (build, ignorado pelo `.gitignore:2`) removido; worktree `dev-b04a-base` removido por `git worktree remove --force` (sem junction); bases descartáveis `erp_dev_b04a_base`, `erp_dev_b04a_m02`, `erp_dev_b04a_size`, `erp_dev_b04a_size_hb` e as `_drill_*` derrubadas; papéis efêmeros órfãos `o6r_b01_%` = 0; contêineres `dev-b04a-pg` e `dev-b04a-redis` removidos pelo nome (`docker rm -f`); árvore do `b04a` limpa (`git status --short` vazio). Scratchpad mantido (é a evidência deste relatório: `b04a-i2/*`).

**Terreno — anomalias, anotadas mesmo sem efeito no mérito:**
1. Rodei `git worktree prune` depois de remover o meu worktree. A entrada `plan-bsan301-c2` (outra sessão), que aparecia no `git worktree list` do início, **sumiu** da lista depois. O diretório dela já **não existia** no disco quando conferi (`ls .claude/worktrees/`), e o `prune` só apaga o metadado de worktree cujo diretório não existe — logo nenhum dado se perdeu; mas não sei se foi o meu `prune` ou o dono dela que tirou a entrada. Resíduo alheio, reportado; não devia ter rodado um `prune` genérico (a remoção pelo nome já bastava).
2. O quase-erro do cwd (`b11`) na I2.7 — nada gravado fora do `b04a`.
3. Há um diretório `san2-r` em `.claude/worktrees/` que não é worktree registrado — alheio, não tocado.
4. Base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`) e `pastrack-*`/`bsan301-*`/`j-*`/`plan-*`/`crit-*`: nenhum comando.

**Não executado (fora da bateria do briefing):** `npm test` na forma canônica 1 (sem `DATABASE_URL`; o §9 prevê +9 pass e +4 pulos declarados) e o `frontend check` (o PR não toca `frontend/`). **Sem push** (o orquestrador empurra). Dívidas do #386: não (pagas pelo #387).
