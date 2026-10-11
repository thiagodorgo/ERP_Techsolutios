papel jurado-o6r04a-c2-suplente-fail-closed-backend · modelo GPT-5.6 Sol, nível menor, em substituição determinada pelo dono em 2026-10-10 (modelo de topo reservado ao plano e ao replanejamento após reprovação) · mandato_md5 6ff30b89401222b7932b076390d2f610 · corpo_md5 7a9ebea0821847f1784bf17bbae56c2e

# Evidência incremental — C2 · ciclo 3 · B-O6R-04a · PR #389

- Identidade nova: nunca votei neste bloco; nenhuma medição de outra cadeira foi herdada.
- Régua do mandato do ciclo 3: somente defeito GRAVE de produto — perda de dado, vazamento entre organizações, quebra de permissão ou erro de dinheiro — provado por execução pode receber `gravidade: bloqueia`. Forma de guard, teste ou registro recebe `ajuste` ou `nota`.
- Head inicialmente resolvido por `gh pr view` e `git ls-remote`: `622bf8453d2d60ecb6577aa611b2d87645a689ae`.
- Criado em `2026-10-10T14:23:24Z`.

## Item 1 — varredura por DESTINO

**EM APURAÇÃO**

## Item 2 — status desconhecido fail-closed

**EM APURAÇÃO**

## Item 3 — duplicidade concorrente pela identidade do índice

**EM APURAÇÃO**

## Voto

**EM APURAÇÃO**

## Retomada 2026-10-10T14:37Z (instância 2, Claude Opus)

papel jurado-o6r04a-c2-suplente-fail-closed-backend · **instância 2 (RELANÇADA)** · modelo **Claude Opus 5.5, nível menor**, por decisão do dono de 2026-10-10 (modelo de topo só no plano e no replanejamento após reprovação). A instância 1 (Codex GPT-5.6 Sol) caiu às 14:33Z pelo limite de uso do Codex, no meio do item 1 · mandato_md5 6ff30b89401222b7932b076390d2f610 · corpo_md5 (.agents, EOL-neutro) 7a9ebea0821847f1784bf17bbae56c2e · corpo_md5 (.claude, EOL-neutro) 0d8203d885814e8f7ca8488f1560580e. Régua: só defeito GRAVE de produto bloqueia (perde dado, vaza entre organizações, quebra permissão, erra dinheiro), provado por execução; forma de guard/teste/registro = ajuste ou nota. O mandato manda acima do corpo.

### R0 · corpo e mandato (passo 0) — 14:35Z
- `git show origin/fix/inventory-consistency:<corpo> | tr -d '\r' | md5sum` → `.claude` 0d8203d885814e8f7ca8488f1560580e · `.agents` 7a9ebea0821847f1784bf17bbae56c2e (= publicado) · `00-mandatos/C2c3.md` 6ff30b89401222b7932b076390d2f610 (= publicado).
- `diff <(.claude sem CR) <(.agents sem CR)` → ec=1, só 2 hunks: l.4 `tools: Read, Grep, Glob, Bash` (só no .claude) e o bloco "Papel para o Codex" (só no .agents). Corpo do mandato idêntico nos dois. **Veredito: corpo e mandato conferem.**

### R1 · P3 — re-execução dos comandos registrados pela instância 1
A instância 1 registrou UM comando com saída: o head por `gh pr view` e `git ls-remote` → 622bf845…. Nenhum item medido; o script `tests/_jurado_b04a_c3_c2/sweep-dest.mts` no worktree dela NÃO tem comando nem saída registrados — **não é insumo**; refaço o meu.
- `gh pr view 389 --json headRefOid,state,isDraft,mergeable` → `622bf8453d2d60ecb6577aa611b2d87645a689ae`, OPEN, draft, MERGEABLE.
- `git ls-remote origin refs/heads/fix/inventory-consistency refs/pull/389/head` → 622bf845… nas duas refs. **Igual ao registrado: confere.**
- `git merge-base origin/main 622bf845` → c1cfdabe12c74b58f8393dbee4f333224c56b303.
- `gh api …/commits/622bf845…/check-runs` → total=14, 14/14 `completed success` (backend, backend-postgres, frontend, flutter, owner-portal, authority-portal, docker ×2).
- Legalidade: `insp-c3-parecer.md @622bf845` → **LIBERADO COM RESSALVA** (objeto de1dff89). `git diff --name-status de1dff89 622bf845` → só registro (pendencias*, 00-mandatos/C1c3,C2c3,C3c3, insp-c3-*); de1dff89 é ancestral. `git diff --name-only 35ef85be 622bf845 -- src tests prisma scripts .github | wc -l` → **0**: ciclo 3 sem dev, código = objeto da junta 2.
- Veredito parcial R: objeto = 622bf845, CI concluído e verde, inspetor liberou, código inalterado desde 35ef85be.

### T · terreno (instância 2) — 14:45Z
- Worktree `C:/Users/AMP/w-ciclo3-389-c2` REUTILIZADO: `git rev-parse HEAD` = 622bf845…; `git status --porcelain` = só `?? tests/_jurado_b04a_c3_c2/` (resíduo da instância 1: `sweep-dest.mts`, md5 4a370de073557140fe9cb7782d61d676, não executado nem lido como insumo); `git diff --stat HEAD` vazio; sem `.env`.
- Containers da instância 1 reutilizados pelo nome: `j389c3-c2-pg` (postgres:16-alpine 16.15, rede `j389c3-c2-net`, **sem porta publicada** — só `5432/tcp` exposta), `j389c3-c2-runner` (erp-junta-node20-pg16:local, Node 20.20.2, psql 16.14, bind `/work` = worktree, volume `j389c3-c2-node-modules`). Portas do dono não são alvo. O estado do banco (115 tabelas) e do volume NÃO têm comando registrado → refaço os dois: `npm ci` próprio e banco recriado por mim.
- Leitura do código no head (produto): `inventory-prisma.repository.ts` (V1–V5, lock por token, wrapper RLS + classificação por índice), `cycle-count-prisma.repository.ts` (4 CAS de status, wrapper), `cycle-count.service.ts` (fechamento por unidades), `inventory-uow*.ts`, `cycle-count.types.ts` (CYCLE_COUNT_STATUS_KIND). Construção de repositório Prisma: `git grep 'new (Prisma|RlsPrisma)(Inventory|CycleCount)(Repository|UnitOfWork)('` → 6 sítios, todos com `tx` de `withTenantRls` ou com o cliente dentro do wrapper RLS; consumidores externos (fuel-logs, maintenance-orders) entram por `InventoryService.createExitForSource/removeExitForSource`.

### T (cont.) · terreno medido — 14:40Z–14:41Z
- `docker exec j389c3-c2-runner sh -c 'cd /work && npm ci --no-audit --no-fund'` → `npm_ci_ec=0`, "added 326 packages" (aviso EBADENGINE transitivo), no volume próprio `j389c3-c2-node-modules` (sem junction/symlink).
- `psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS erp_j389c3_c2 WITH (FORCE)" -c "CREATE DATABASE erp_j389c3_c2"` no `j389c3-c2-pg` → `recreate_ec=0`. `DATABASE_URL=postgresql://postgres@j389c3-c2-pg:5432/erp_j389c3_c2` SÓ no env do comando (cluster descartável, trust, sem senha real): `npx prisma generate` → `gen_ec=0`; `npx prisma migrate deploy` → `mig_ec=0`, "108 migrations found … All migrations have been successfully applied"; `_prisma_migrations` concluídas = 108; índices únicos de `stock_movements`: `stock_movements_cycle_count_item_key`, `_pkey`, `_reversal_active_key`, `_source_active_key`, `_tenant_id_id_key`.

## Item 1 — varredura por DESTINO (instância 2) — 14:53Z

**Instrumento (meu, não herdado):** `tests/_jurado_b04a_c3_c2/i2-sweep.mjs` (md5 2cbe5efb51ec9d50812ee2085d544802), programa TypeScript REAL (`ts.createProgram` com o `tsconfig.json` do head, `rootDir=/work`) sobre a lista `git ls-files src prisma scripts` do head (921 arquivos: **788 .ts** + 133 não-TS — 109 .sql, 19 .mjs, 4 .sh, 1 .prisma), **sem excluir diretório nenhum** (`git ls-files … | grep -E '/(generated|dist|build|out)/' | wc -l` → **0**). Rodado no runner Linux: `node tests/_jurado_b04a_c3_c2/i2-sweep.mjs` → `base_ec=0`, `syntaxErrors 0`, `semanticErrorsInListed(src) 0`.
Classes: r1 assinatura RESOLVIDA declarada em `StockMovementDelegate|CycleCountDelegate|CycleCountEntryDelegate|InventoryItemDelegate` (escrita = membro fora do conjunto de leitura; universo de escrita DERIVADO da interface: os 9 membros create/createMany/createManyAndReturn/delete/deleteMany/update/updateMany/updateManyAndReturn/upsert nos 4); r2 tipo `*(Create|Update|Upsert|Delete)*Input|Args` nomeado; r3 receptor `any`/`unknown` com membro de escrita ou de delegate; r3b acesso por elemento a delegate/escrita ou dinâmico sobre cliente; r4 SQL de escrita em QUALQUER literal/template/concatenação (INSERT/UPDATE [ONLY]/DELETE FROM [ONLY]/TRUNCATE/MERGE/COPY, comentário SQL entre tokens, aspas, schema, caixa; alvo dinâmico = vigiado); r4b literal que CITA tabela vigiada; r5 referência a membro de escrita que não é o callee direto (alias, `.call/.apply/.bind`, valor); r5b toda referência a `insertMovement`; r6 valor de tipo delegate vigiado que ESCAPA (atribuído, passado, cast, desestruturado); r7 escrita ANINHADA por relação (10 campos de relação do schema × create/connect/set/disconnect/…); r10 portas das classes do módulo (método, propriedade-função, getter/setter) × `this.tx`/`withTenantRls`; r11 `$extends`/`$use`; r12 driver direto (`pg`, knex…); r13 não-TS (DML/escrita por texto, função/trigger em .sql).

**Controle positivo (vermelho-controle do detector):** `tests/_jurado_b04a_c3_c2/i2-ctrl.ts` (md5 f6a791eff63f0e4f0bdb43207757e61e) + `i2-ctrl.sql` + `i2-ctrl.mjs`, uma forma por classe (desestruturação, `as any`, erasure por interface, `$executeRaw(Prisma.sql\`UPDATE ONLY "public"."stock_movements"…\`)`, `insert /* */ -- \n into Cycle_Count_Entries`, `"DELETE FROM " + t`, `.call` no delegate, `movements:{create}` aninhado, `(tx as any)[m]`, `$extends`, `StockMovementUncheckedCreateInput`, `avg_cost` sem lock, transição sem CAS, `import "pg"`, `this.insertMovement.call`, propriedade-arrow e getter, função plpgsql com INSERT, `.mjs` com `stockMovement.deleteMany`). `SWEEP_CONTROL=1 node …` → `ctrl_ec=0`, **TODAS as 15 classes de escrita MOVERAM** (r1 17→21, r2 0→1, r3 0→3, r3b 0→1, r4-vigiada 0→3, r4b 50→52, r5 0→1, r5b 0→1, r6 0→3, r7 0→1, r10 0→2, r11 0→1, r12 0→1, r13 0→2).
**Defeito do MEU detector achado pelo controle e corrigido antes do veredito:** na 1ª versão, `${SEP}?` virava quantificador PREGUIÇOSO (`(?:…)+?`), e UPDATE/DELETE com um só espaço não casavam (c4/c6 não moveram; baseline r4 = 8, só INSERT). Corrigido para `(?:${SEP})?`, provado em 4 strings (`UPDATE ONLY "public"."stock_movements"`, `DELETE FROM <dinâmico>`, `UPDATE stock_movements`, `DELETE FROM stock_movements` → todos casam) e baseline re-executado: r4 = **30** escritas SQL em literais, alvos = 14 tabelas de outros módulos (+ 3 falsos positivos de prosa: "the", "can", "dispatch"); **vigiadas ou dinâmicas = 0**.

**N por classe no head (622bf845):**
| classe | N | o que é |
|---|---|---|
| r1 escrita por assinatura | **17** | StockMovement **4** = `inventory-prisma.repository.ts:531` (`create` dentro de `insertMovement`, sob `ItemWriteLock`) + `prisma/seed-fleet.ts:171,172,173` (semente); CycleCount **5** = `cycle-count-prisma.repository.ts:72` (create `status:"aberta"`), `:165,:225,:255,:283`; CycleCountEntry **3** = `:84` (createMany na abertura), `:142` (recontagem sob `FOR SHARE`), `:198` (carimbo sob `FOR UPDATE`, `adjustment_movement_id: null` no where); InventoryItem **5** = `seed-fleet.ts:168`, `inventory-prisma.repository.ts:87` (createItem, sem avg_cost), `:196` (updateItem, data `compactRecord({…})` sem avg_cost — lido l.201-216), `:252` (**avg_cost**, dentro de `createMovement` depois de `lockItemForUpdate`), `:696` (abc_class) |
| 3 tabelas do ledger/contagem | **12 = allowlist do plano, 0 fora** | (4 + 5 + 3) |
| `avg_cost` (dinheiro) | **2** | seed (criação) e `:252` sob o lock do item |
| r8 transições de `cycle_counts.status` | 4 updates, **4/4 com `status` no where (CAS)** + create em `aberta` | `:165` aberta→fechando, `:225` fechando→aberta, `:255` fechando→concluida, `:283` →cancelada (where `status: current`) |
| r2 / r3 / r3b / r5 / r5b-outra-forma / r6 / r7 / r11 / r12 / r13 | **0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0** | nenhum alias, any, acesso dinâmico, indireção, escape de delegate, escrita aninhada, extensão, driver direto, nem DML/trigger/função .sql nas 4 tabelas |
| r5b `insertMovement` | 7 chamadas `this.insertMovement(` diretas + 1 declaração no ledger Prisma (l.264,282,295,364,456,490; decl. 518) | as 6+1 de `inventory.repository.ts` são o repositório em memória |
| r4b literais que citam tabela | 50 = 42 strings de permissão (`catalog.ts`, `*.routes.ts`) + **8 SELECT** (3 locks `FOR UPDATE`/`FOR SHARE` de sessão, 1 lock do item, overlap, pendentes, total, carimbos) | nenhuma escrita |
| r10 portas | `RlsPrismaInventoryRepository` 17/17 públicas por `this.tx`; `RlsPrismaCycleCountRepository` 12/12 por `this.tx`; `PrismaInventoryUnitOfWork.run` por `withTenantRls`; módulo: 168 métodos + 9 props, **0 propriedade-função, 0 getter/setter** | — |

**Veredito parcial item 1:** falsifiquei C3.1 por conta própria e NÃO consegui: **nenhum escritor, porta ou transição REAL fora da allowlist** no código de produto do head. Nenhum `bloqueia`. Limite declarado: estático sobre `src/prisma/scripts` (tests/** não é produto); views graváveis — `git grep -i 'create (or replace )?(materialized )?view' -- prisma/migrations src scripts` → 0.

## Item 2 — status DESCONHECIDO por DADO fecha no produto (instância 2) — 14:56Z

**Sonda (minha):** `tests/_jurado_b04a_c3_c2/i2-status.mts` — `CycleCountService` + `RlsPrismaCycleCountRepository` + `RlsPrismaInventoryRepository` + `PrismaInventoryUnitOfWork` REAIS, no cliente de um papel efêmero (`createEphemeralRole`, postura medida: `rolsuper=false, rolbypassrls=false`); admin só semeia/mede. Por cenário: tenant novo, 2 itens com saldo 10 (`avg_cost` 2), sessão aberta PELO PRODUTO (`svc.open`), contagem do item 1 = 7 (`svc.recordEntry`), e então **`UPDATE cycle_counts SET status = <desconhecido>` por SQL do admin**. Para cada decisão: impressão digital do tenant ANTES e DEPOIS (count + `md5(string_agg(row::text ORDER BY id))` de `stock_movements`, `cycle_counts`, `cycle_count_entries`, `inventory_items`). Comando: `docker exec -e DATABASE_URL=postgresql://postgres@j389c3-c2-pg:5432/erp_j389c3_c2 j389c3-c2-runner sh -c 'cd /work && timeout 240 node --import tsx tests/_jurado_b04a_c3_c2/i2-status.mts'` → **`st_ec=0`, `permissive=0`, 5 tenants, teardown escopado por tenant + `role.drop()`**.

**Tabela `status desconhecido → decisão → lado`** — 5 status desconhecidos (`"suspensa"`, `"ABERTA"`, `"aberta "` com espaço, `"Fechando"`, `""`) × 9 decisões = **45/45 FECHADO, 0 gravações**:
| decisão | resultado (idêntico nos 5 status) | gravou? | lado |
|---|---|---|---|
| `svc.recordEntry` | 422 `invalid_status_transition` | não | FECHADO |
| `svc.close` | 422 `invalid_status_transition` | não (0 ajuste, 0 carimbo) | FECHADO |
| `svc.cancel` | 422 `invalid_status_transition` | não | FECHADO |
| `svc.open` com o mesmo item (sobreposição I9) | 409 `items_in_open_session` (o desconhecido SEGURA o item) | não | FECHADO |
| `repo.beginClose` / `repo.finishClose` / `repo.recordEntryCount` / `repo.cancelSession` | `not_open` | não | FECHADO |
| `repo.abortClose` | `not_closing` | não | FECHADO |
| `svc.list` (exibição) | lista a sessão | não | n/a (não decide) |

**Vermelho-controle (a sonda enxerga gravação):** `UNKNOWN=suspensa CONTROL=1` → `stc_ec=0`; com status CONHECIDO `"aberta"` a mesma sonda marca `recordEntry` ok **wrote=true**, `close` ok **wrote=true**, `open` sobreposto depois de concluída ok **wrote=true** (o item é liberado por terminal), e as demais recusam pelo estado novo — a impressão digital detecta escrita.
**Mutações de sanidade (minhas, no produto, no meu worktree, uma por vez, restauradas):**
- **M-S1** `cycle-count.types.ts`: `(WRITABLE_CYCLE_COUNT_STATUSES as readonly string[]).includes(status);` → `!isTerminalCycleCountStatus(status);` (1 ocorrência) → sonda **VERMELHA `ms1_ec=1`, `permissive=3`**: `recordEntry` aceito e gravou, `cancel` → `cancelada` gravou, `open` sobreposto aceito. Restaurada; `git hash-object` = blob `b0ebebab63b3dd0c7d9b26ea034fd2e93cc736ea`. (O `sed -i` do Git Bash trocou CRLF→LF no arquivo de trabalho — conteúdo normalizado idêntico, `git diff --quiet` ec=0 —; reconvertido a CRLF por node: `w/crlf`, `git status` limpo.)
- **M-S2** `cycle-count-prisma.repository.ts:64`: `c.status NOT IN (${Prisma.join(TERMINAL_CYCLE_COUNT_STATUSES)})` → `c.status IN ('aberta', 'fechando')` (1 ocorrência, troca por node preservando CRLF) → sonda **VERMELHA `ms2_ec=1`, `permissive=1`**: `open` sobreposto aceito e gravou (o desconhecido LIBERA o item — a forma do C2-03 do ciclo 1). Restaurada; hash = blob `214e262210efc9871e1d13cee0dad2717222ac3f`; `git status --porcelain` = só `?? tests/_jurado_b04a_c3_c2/`.

**Veredito parcial item 2:** o não classificado cai do lado FECHADO em todas as 9 decisões, nos dois sentidos (escrita recusada E item segurado), e **nada é gravado**; a sonda tem controle positivo e duas mutações que a deixam vermelha. Nenhum `bloqueia`.

## Item 3 — duplicidade concorrente pela IDENTIDADE do índice (instância 2) — 14:59Z

**Sonda (minha):** `tests/_jurado_b04a_c3_c2/i3-dup.mts` (md5 ccbe1e415f0a62691b253dec0482cb0f) — `InventoryService`/`CycleCountService`/`RlsPrisma*` REAIS em **dois papéis efêmeros** (A e B, dois pools, `application_name` próprio), NOSUPERUSER sem BYPASSRLS; admin só semeia/mede. Comando: `docker exec -e DATABASE_URL=postgresql://postgres@j389c3-c2-pg:5432/erp_j389c3_c2 -e RACE_N=10 j389c3-c2-runner sh -c 'cd /work && timeout 500 node --import tsx tests/_jurado_b04a_c3_c2/i3-dup.mts'` → **`dup_ec=0`, `failures=0`, 46 verificações ok, 14 tenants (teardown escopado)**.

**Corridas reais A × B, N = 10 por via (40 corridas):**
| via | as duas respostas (distribuição em 10) | efeito no ledger | saldo |
|---|---|---|---|
| 3a V3 estorno duplo do mesmo movimento | `200 [1 compensação]` + `409 movement_already_reversed` — 10/10 | 1 compensação, sempre | 10 exato (10 −4 +4), 10/10 |
| 3b V5 estorno duplo da mesma baixa por fonte | `movimento` + `undefined` (no-op idempotente) — 10/10 | **1 compensação existe** (o `undefined` NÃO é sucesso silencioso: o efeito está no razão) | 10 exato, 10/10 |
| 3c V4 baixa dupla da mesma fonte | as duas devolvem o **mesmo id** — 10/10 | 1 EXIT por fonte | 7 exato, 10/10 |
| 3d V6 dois `close` da mesma sessão | `200 relatório` + `422 invalid_status_transition` — 10/10 | 2 ajustes (1 por item), sessão `concluida` | I1 = 7, I2 = 12; `totalVarianceValue = −2` (= −3×2 + 2×2), 10/10 |

**A identidade do índice (3e) — uma 2ª restrição única violada de propósito**, criada só no meu cluster: `CREATE UNIQUE INDEX j389c3_c2_probe_reason_key ON stock_movements (tenant_id, reason) WHERE reason LIKE 'J389C3-DUP%'` (removida no `finally`):
| caso | via | restrição violada | classificada como | resposta | efeito no ledger | 25P02 |
|---|---|---|---|---|---|---|
| X1 (direto) | V3 `reverseMovement` | sonda | **outra** (nome `j389c3_c2_probe_reason_key`) | ERRO propagado `P2002/23505` | 0 compensação, saldo 6 (inalterado); a chamada seguinte normal estorna (saldo 10) | 0 |
| X2 (direto) | V5 `removeExitForSource` | sonda | outra | ERRO propagado (nunca `undefined`) | 0 compensação, saldo 7; a seguinte normal estorna (10) | 0 |
| X3 (direto) | V4 `createExitForSource` | sonda | outra | ERRO propagado (nunca a "releitura do vencedor") | 0 EXIT, saldo 10 | 0 |
| X4 (ESPERA: `blocked=true` medido em `pg_stat_activity`, 23505 sem colunas) | V3 | sonda | outra, **pelo nome** | ERRO propagado | 0 compensação, saldo 6 | 0 |
| X5 (ESPERA, `blocked=true`) | V3 | a REAL `stock_movements_reversal_active_key` (escritor sem lock plantado pelo admin numa transação segurada) | reversal, pelo nome | `already_reversed` (→ 409), nunca 200 | 0 compensação no item do produto; 1 no total (a do escritor plantado) | — |
Catálogo medido com a sonda presente: os 6 índices únicos de `stock_movements` têm **conjuntos de colunas distintos** (sem ambiguidade de identidade por colunas). **25P02 em todo erro de 3e: 0.**

**Vermelho-controle por mutação (minha, no produto, restaurada):** **M-I1** `inventory-prisma.repository.ts`, em `isUniqueViolationOf`: `  if (!isUniqueViolation(error)) return false;` → `  return isUniqueViolation(error);` (1 ocorrência, troca por node preservando CRLF) → `RACE_N=1` → **`mi1_ec=1`, `failures=3`**: X1 vira `already_reversed` (falso), **X2 vira `undefined` com saldo 7 — o sucesso silencioso sem estorno do C2-04**, X4 vira `already_reversed`; X3 continua erro (a releitura não acha vencedor e o código relança). Restaurada; `git hash-object` = blob `11459e26f717e07269a449078d26a97674f7618b`; `w/crlf`; `git status --porcelain` = só `?? tests/_jurado_b04a_c3_c2/`.

**Veredito parcial item 3:** duplicidade concorrente resolve com UM gravado e o outro recusado (ou idempotente com o efeito presente), saldo e valor exatos em 40/40 corridas; violação de OUTRA restrição propaga como erro nos dois caminhos (direto e espera), 0 × 25P02; a sonda tem mutação que a deixa vermelha. Nenhum `bloqueia`.
**Nota (não grave, sem voto):** X5 mostra que, com um escritor SEM o lock que grave a compensação noutro item, o produto responde 409 e o saldo do item original não volta — mas o item 1 mediu que esse escritor **não existe** no produto (12 = allowlist); a classe já é das pendências `P-O6R-B04-GUARD-D1/D2`.

## Teardown (instância 2) — 15:00Z
- Antes: `git status --porcelain` no worktree = só `?? tests/_jurado_b04a_c3_c2/`; `git hash-object` = blob nos 3 arquivos mutados (`cycle-count.types.ts` b0ebebab…, `cycle-count-prisma.repository.ts` 214e2622…, `inventory-prisma.repository.ts` 11459e26…). Sondas e logs copiados para o scratchpad da sessão (`…/scratchpad/j389c3-c2-i2/`, fora de qualquer worktree). Processos no Windows com `w-ciclo3-389-c2` na linha de comando: só os da própria medição (bash/powershell da consulta).
- `docker rm -fv j389c3-c2-runner j389c3-c2-pg` → rm_ec=0 · `docker volume rm j389c3-c2-node-modules` → 0 · `docker network rm j389c3-c2-net` → 0 · `git worktree remove --force C:/Users/AMP/w-ciclo3-389-c2` → wt_ec=0. Nunca `prune`, nunca `rm -rf`.
- Depois: `git worktree list | grep -ic w-ciclo3-389-c2` → **0**; diretório ausente; `docker ps -a`/`volume ls`/`network ls` com `j389c3-c2` → **0/0/0**. Objetos criados nesta instância: 0 containers (reutilizei os 2 da instância 1), 1 banco recriado dentro do cluster descartável, 2 papéis efêmeros por sonda (dropados), 1 índice-sonda (dropado no `finally`), arquivos só em `tests/_jurado_b04a_c3_c2/` (removidos com o worktree). Derrubados: 2 containers + 1 volume + 1 rede + 1 worktree, todos `j389c3-c2-*`/`w-ciclo3-389-c2`.
- Não tocados: base viva `erp-postgres`/`erp-redis` (Up, nenhuma sentença minha), portas do dono, `w-389` além das 2 saídas, `w-07ca`, `w-pvpr`, `w-traccar`. **Anomalia de terreno sem efeito no mérito:** às 15:00Z os containers `dev07ca-*` não aparecem mais em `docker ps -a` (existiam às ~14:36Z) — **não removidos por mim** (o meu `docker rm` nomeou só os 2 `j389c3-c2-*` e a saída lista só eles); o `w-07ca` avançou `a0dafa05 → d4cd35e3`, há outro agente ativo nele. Reportado, não investigado.
- Disco: 14 GB livres antes e depois (`df -h /c`).

## Voto (instância 2) — 15:01Z
**APROVADO.** Pergunta do ciclo 3 — *há, no código de produto de 622bf845, defeito que perde dado, vaza entre organizações, quebra permissão ou erra dinheiro?* — **medi e não há**, na minha lente: (1) escritores/portas/transições por DESTINO = allowlist (12 nas 3 tabelas, 0 fora; avg_cost só sob o lock; 4/4 CAS; 0 nas 13 classes de fuga), com detector de controle positivo em 15 classes; (2) status desconhecido por dado: 45/45 decisões fecham sem gravar; (3) duplicidade concorrente: 40/40 corridas com um gravado e o outro recusado/idempotente com efeito presente, saldo e valor exatos; outra restrição propaga em X1–X4, a real classificada pelo nome em X5; 0 × 25P02. Três mutações de produto minhas (M-S1, M-S2, M-I1) deixaram as sondas vermelhas e foram restauradas (hash = blob). Achados: só notas (no voto JSON), nenhum `bloqueia`. Os 4 `bloqueia` da C2 do ciclo 2 e o A1 da C1 continuam as 5 pendências nomeadas — não os re-medi (são forma de guard; a minha cadeira no ciclo 3 mede o produto) e reencontrá-los não seria achado novo.
