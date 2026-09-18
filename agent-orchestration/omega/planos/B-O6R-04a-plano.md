# PLANO v2 — B-O6R-04a · consistência do estoque sob concorrência (replanejamento após a rodada 1 do crítico)

> **Papel:** `planejador-mestre` (2ª instância da v2; a 1ª caiu por queda de sessão e reboot da máquina depois de sondar e antes de
> escrever) · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`, o fixado no frontmatter; sem fallback) · **Corpo aplicado:**
> `origin/main@02bd7dab:.claude/agents/planejador-mestre.md`, lido por `MSYS_NO_PATHCONV=1 git -C <worktree b04a> show
> origin/main:.claude/agents/planejador-mestre.md` `[00]` — frontmatter `model: fable`; parágrafos `D-FALLBACK-MODELO-FABLE-OPUS` e
> `D-PLANEJADOR-MODELO-FABLE`.
> **Insumos:** comando com emendas 1 (a–f) e 2 (g–m); plano v1 (`b72fd626`); parecer do crítico r1 (`00-critico-r1.md`, 4 `bloqueia` · 4 ajuste ·
> 3 nota) e `critico-apoio/`; `docs/revisoes/SAN3/PLANO_SAN3.md` §5.6 (CE-G1/CE-G2) `[09]`. O que a 1ª instância desta v2 deixou (`plan2-*`,
> esqueleto) foi **roteiro**; todo número deste plano é de execução minha (§14).
> **Terreno:** worktree `.claude/worktrees/b04a`, branch `fix/inventory-consistency`, HEAD `63dd45bb` = 3 commits só de
> `agent-orchestration/` sobre `merge-base origin/main = 02bd7dab` → **`src/` no HEAD é o head-base** `[01]`. Somente leitura
> (`git status --short` = 0 linhas antes e depois de cada execução); sondas e este plano vivem no scratchpad.
> **Cluster:** `plan-b04a-pg` (`postgres:16`, base `erp_plan_b04a`) — recriado por mim na porta **58544** (a 56544 do briefing e todas as
> faixas 565xx–573xx estão na lista de exclusão de portas do Windows pós-reboot `[02]`); 107 migrações; removido pelo nome ao fim `[17]`.
> Nenhum comando em `erp-postgres`, `erp-redis`, `erp-postgres-alt`, `pastrack-*`, `bsan301-pg`, `dev-bsan304a-pg`.
> **Data:** 2026-09-17/18 · **Status:** COMPLETO — PRONTO PARA A RODADA 2 (última) do `critico-adversarial`. Os 4 `bloqueia` (A-01, A-02,
> A-03, A-06), os 4 ajustes (A-04, A-05, A-07, A-08) e as 3 notas (N-01…N-03) estão fechados por desenho **e** por medição no §0; as
> decisões g–m (e a–f) estão carregadas dentro do plano, não reabertas.
> Toda afirmação numerada `[NN]` remete ao §14 (comando → saída). Nada das atas anteriores foi herdado como fato.

## 0. Resposta a cada achado do crítico (rodada 1) e a cada decisão da emenda 2 — o que muda no desenho e a medição que prova

Toda medição abaixo é **minha**, nesta instância, no cluster `plan-b04a-pg:58544` (§14; `[10-*]` = sonda `plan3-probe-b04a.mts` fase A,
`[16]` = fase E5). A sonda da 1ª instância (`plan2-*`) e a do crítico (`crit2-*`) foram lidas como **roteiro**; nenhum número delas entra.
O lado "código real" de cada experimento é o código de produção do worktree importado por URL de arquivo; o lado "desenho v2" é a
emulação literal do §3 (unidades, `FOR UPDATE`/`FOR SHARE`, CAS) sobre os métodos privados do repositório real.

| achado | veredito r1 | o que muda no desenho (§) | medição que prova (comando → saída → veredito) |
|---|---|---|---|
| **A-01** `recordEntryCount` TOCTOU sem desenho | bloqueia | §3.4: `FOR SHARE` da sessão + checagem de status **na mesma tx** do `UPDATE` da entry; outcome tipado → 422. Teste **B3** (barreira) + B5 | `[10-E3]` A (tx crua) segura o fechamento 1,5 s; B `recordEntry` v2 **bloqueia no `FOR SHARE`** (texto em `pg_stat_activity`), relê `concluida` → `notOpen`; entry final `contado 7 / variance −3` → **fechado**. Controle `[10-E3-hb]`: B real grava em **15 ms antes do commit**; final `contado 5 / variance −3 / concluida`. Inverso `[10-E3-inv]`: B segura o `FOR SHARE`, o fechamento espera e aplica o contado final (−5) |
| **A-02** `cancelSession` fora do mapa | bloqueia | §2.2 V8 no mapa; §3.4: CAS `status='aberta'` **no próprio UPDATE**; outcome → 422. Teste **B4** + B5 | `[10-E4]` B `cancel` v2 bloqueia no `UPDATE`, ao liberar o `WHERE` reavaliado → 0 linhas → `notOpen: concluida` (fases `fechando` **e** `aplicado`); sessão `concluida`, `is_active=true` → **fechado**. Controle `[10-E4-hb]`: `cancelada` + `is_active=false` com o ajuste −3 no ledger |
| **A-03** "ordem global de locks" cria 2 ciclos `40P01` | bloqueia | §3.2 **I7**: mecanismo que **dispensa ordem** — nenhuma tx do módulo segura >1 item; sessão antes do item; V3 nunca toma 2º lock (`transfer_group_inconsistent`). Testes **B8** (controle embutido), B9, A12; guard D2 | `[10-LO]` desenho v2 (unidade segura X 1,5 s) × `open()` real → **0 × `40P01`**, `entries=[Y,X]`; × `recalculateAbc()` real → **0 × `40P01`**, `{A:1,B:0,C:1}`; V1 com lock × os dois → 0; **controle** desenho v1 (sessão + X + Y numa tx) → **`40P01`** nas duas, A vítima; `[10-V6V6]` sessões `[X,Y]`/`[Y,X]` em paralelo → ambas `concluida` → **fechado** |
| **A-06** V6 numa tx estoura 5 s acima de ~650 itens | bloqueia | §3.3: V6 em **unidades por item** (sessão `FOR UPDATE` + item `FOR UPDATE` por unidade), estado `fechando` **persistido e retomável**, CAS em cada transição; timeout global **intacto**. Testes B2, B10, B11 | `[16-E5]` desenho v2 / head-base: **N=250** 3 504 ms (unid. média 13,8 ms, p95 19) / 3 384 ms · **N=500** 6 338 ms (12,6 / 18) / 7 716 ms · **N=1000** 15 019 ms (15,0 / 21) / 36 058 ms · **N=10 000** **318 473 ms, `concluida`, 10 000 ajustes, 10 000 carimbos, 0 dup** (unid. média 31,8 ms, p95 67, **máx 1 180 ms < 5 000**) / head-base **332 027 ms → `P2028` em `applyClose`, sessão `aberta`, 10 000 ajustes gravados e 0 carimbados** (jamais fecha: o retry reaproveita os ajustes e estoura de novo no mesmo `applyClose`). `[10-CRASH]`: interrompido em 7/20 → `fechando` → retomado por outro cliente → 20/20 → **fechado** |
| **A-04** "1 linha" `cycle_count: { status }` não fecha nada | ajuste | sai do plano (era dado podre); o conserto é o de A-01 | `[10-E3]`/`[10-E3-hb]` acima → **fechado** |
| **A-05** censo na base errada; staging/prod sem dono | ajuste | §4.1 migração **fail-closed** nomeando os grupos (ids de movimento/contagem/item, **sem `tenant_id`**), **nunca deduplica**; §4.2 `scripts/inventory-duplicates-census.sql` somente leitura; §4.3 roteiro; §13-1 `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` dono = **ato do dono** (emenda 2-g) | `[10-IDX]` dado produzido pelo DEFEITO real: censo **13 grupos/26 linhas** (estornos) + **8/16** (ajustes); bloco `DO` → `P0001` "20 grupo(s)" com amostra; `CREATE UNIQUE INDEX` → **`23505`** `[11]`; limpeza escopada → censo 0/0, `DO` mudo, índices nascem em 35 ms, 2ª compensação/2º ajuste → `23505`, NULLs aceitos, drill 2→0→2→0 → **fechado** (o N de staging/prod continua desconhecido por mim — é o ato do dono) |
| **A-07** plano desatualizado frente à emenda 1 | ajuste | §8 carrega as decisões dentro de si: `ci.yml` (3 linhas após a l.249 `[12]`), `achados.jsonl` + `REGISTRO` na forma do #385 `[13]`, script do censo, 2º índice ratificado, `P-O6R-B04-SUITES-LIST-CI` não nasce, TOCTOU dentro | conferência de forma: `git show 15ef3fbe:docs/revisoes/O6R/achados.jsonl` → `"fechado_por": "B-O6R-06 (PR na autoria; no e hash no backfill pos-merge — §C3.5)"` sem hash `[13]` → **fechado** |
| **A-08** T-D não é fail-closed pela propriedade | ajuste | §6 T-D **D1** enumera **todo escritor de `stock_movements`** (ORM `create|createMany|upsert|update*|delete*` + SQL cru) em `src/`, `prisma/`, `scripts/`, com allowlist literal e **default negar**; D5 idem para transições de `cycle_counts.status`; D7 para os wrappers | `[05]` universo hoje: `inventory-prisma.repository.ts:436` (1) + `prisma/seed-fleet.ts:171-173` (semente); zero SQL cru; escritores de `cycle_counts`: `:25,:37,:86,:105,:114,:123` → **fechado** |
| **N-01** vermelho de A2 seria por timeout de barreira | nota | A2 usa `fragment: "tenant_id"` (casa nos dois mundos) e assere a **invariante primeiro** | `[10-P11]` head-base bloqueia em `INSERT INTO "public"."stock_movements" ("tenant_id",…` e commita (saldo −1); desenho bloqueia em `SELECT … WHERE tenant_id=$1::uuid … FOR UPDATE` e recebe 409 (saldo 0) → **fechado** |
| **N-02** "lugar reservado" não existe | nota | §8: as 3 linhas entram **depois** de `tests/financial-entry-delete-reverse-race-db.test.ts` e **antes** de `node --test --import tsx $SUITES` | `[12]` → **fechado** |
| **N-03** status dos perdedores por tempo/deadlock | nota | §3.6/§5: **503** `stock_busy`/`cycle_count_busy` via `mapTransientDbFailure` (espelho de `checklist-prisma.repository.ts:1171-1195`; 503 como `sanitizeReopenFailure:1152`); teste A14 | `[10-TOK]` hoje: `P2028` → **400 `BAD_REQUEST/invalid_request`** com a mensagem crua do Prisma; `40P01` ORM (`DriverAdapterError`, `cause.code`) → 400 "deadlock detected"; `40P01` raw (`P2010`) → 400 com texto de query; `InventoryError` → 409; `CycleCountError` → 422 → **fechado** |

**Decisões da emenda 2 (g–m), carregadas dentro do plano (não reabertas):**
- **(g)** censo = ato do dono; migração fail-closed que nomeia grupos e nunca deduplica; SQL em `scripts/inventory-duplicates-census.sql`;
  pendência com dono = dono → §4, §13-1 (prova `[10-IDX]`, `[11]`).
- **(h)** timeout global intacto; V6 em unidades por item com estado retomável e unicidade preservada sob concorrência; duração medida para
  N = 250/500/1000/10 000 com o head-base como controle → §3.3, `[16-E5]`, `[10-DBL]`, `[10-CRASH]`.
- **(i)** mecanismo que dispensa ordem (I7), escolhido e justificado, provado por execução com controle vermelho (`40P01` no desenho antigo)
  cobrindo `open`, `recalculateAbc` e as duas sessões cruzadas → §3.2, `[10-LO]`, `[10-V6V6]`; `cancelSession` não toma lock de item.
- **(j)** TOCTOU de `recordEntryCount` com desenho e teste; a "1 linha" saiu → §3.4, B3, `[10-E3]`.
- **(k)** `cancelSession` no mapa (V8) e no conserto (CAS), com vermelho-controle (cancelar por cima de fechamento aplicado → recusado) → §3.4, B4, `[10-E4]`.
- **(l)** escopo com `ci.yml` (só as 3 linhas, no lugar medido), `achados.jsonl` e `REGISTRO_ACHADOS_O6R.md`, o SQL do censo; `P-O6R-B04-SUITES-LIST-CI`
  não nasce; 2º índice ratificado; nada de "só com ratificação" → §8.
- **(m)** T-D enumera pela propriedade (todo escritor de `stock_movements`, gerado do código, default negar); status HTTP dos perdedores por
  tempo e por deadlock dito (hoje 400 cru; depois 503) → §6 D1/D5/D7, §3.6, `[10-TOK]`.
- **Emenda 1 (a–f), que segue valendo:** (a) 2º índice na mesma migração → §4.1; (b) DAT-002/003 → "fechado na autoria" → §8; (c) `SUITES` neste
  bloco → §8; (d) TOCTOU dentro → A-01; (e) journal fora → §3.5; (f) dívidas do #386 → §9.

**O que este plano NÃO reexecutou e não usa como prova:** o N=2500 da 1ª instância do crítico; qualquer duração das sondas `plan2-*`/`crit2-*`
(as minhas estão em `[10]`/`[16]`); a afirmação de que o frontend/app tratam 503 (registrada como hipótese em §13-2).

**Achado novo desta instância (fora dos 11 do crítico, mesma propriedade):** `sendRouteError` (`http.ts:51-59`) devolve **400 com a mensagem
crua** de qualquer `Error` não-domínio — o erro do Prisma carrega texto de invocação/query (§B2.8). O bloco não toca `http.ts` (fora do
escopo); fecha a instância no módulo (503 de domínio) e a classe fica anotada para o orquestrador (§13, nota final) — não é escopo deste bloco.
## 1. Objetivo · ator · fluxo origem→destino

**Objetivo — invariantes (os dois do comando + os que a medição mostrou serem a mesma propriedade):**
- **I1** saldo por item **e custódia** nunca negativo sob concorrência, em **toda** via que debita (V1–V5, §2) — head-base: 20/20
  saídas aceitas sobre saldo 10, saldo **−10** em 5/5 corridas `[10-P1]`.
- **I2** fechamento de contagem aplicado **exatamente uma vez**: um vencedor, um ajuste por (sessão, item), e falha no meio deixa
  estado **retomável** (nunca duplica, nunca some) — head-base: 2 vencedores, 2 ajustes, saldo 4 em 5/5 `[10-P6]`.
- **I3** no máximo **uma compensação por movimento original**, na aplicação **e no banco** — head-base: 2 compensações em 5/5 `[10-P3][10-P5]`.
- **I4** custo médio da `entrada` calculado sobre saldo serializado — head-base: 2,0 onde o certo é 2,333333, 5/5 `[10-P7]`.
- **I5** corrida da MESMA fonte em `createExitForSource` nunca vaza `25P02` — head-base: um perdedor `25P02` em 10/10 `[10-P9]`.
- **I6 (emenda 2-d/j/k — o ESTADO da contagem é a mesma propriedade):** durante um fechamento em curso ou aplicado, `recordEntry`
  e `cancel` são **recusados** (422), nunca aplicados por cima — head-base: `recordEntry` grava `contado=5` 15 ms antes do commit
  do fechamento que aplicou −3 `[10-E3]`; `cancel` deixa a sessão `cancelada` com o ajuste no ledger `[10-E4]`.
- **I7 (emenda 2-i):** nenhuma transação do módulo segura mais de **um** row lock de `inventory_items`, e a sessão é travada
  **antes** do item — o que dispensa ordem global e fecha os dois ciclos de deadlock do desenho v1 `[10-LO]`.
- **I8 (emenda 2-h):** o fechamento cabe no timeout de 5 s do Prisma para **qualquer** N até `SNAPSHOT_LIMIT` (10 000), porque a
  unidade de transação é o item (≈ 20 ms), não a sessão `[16-E5]`.

**Atores (permissão exata que a rota compara — CE-G2, §7):** `POST /api/v1/stock-movements` e `POST /api/v1/stock-movements/:movementId/reverse`
comparam `stock_movements:create` (`inventory.routes.ts:119,129`); `POST /api/v1/cycle-counts`, `PATCH …/entries/:entryId`,
`POST …/close` e `POST …/cancel` comparam `cycle_counts:create` (`cycle-count.routes.ts:49,65,73,81`) `[04]`. Concedidas a `manager`,
`operator` e `inventory` no catálogo (`catalog.ts:534/537, 775/778, 882/885`); `viewer` (`:715/717`) e `finance` (`:826/828`) só `:read`; `auditor` (bloco `:944`) nenhuma das quatro `[04]`.
Consumidores service→service sem permissão própria (efeito de domínio): `fuel-log.service.ts:564,575` e
`maintenance-order.service.ts:709,720` `[05]`. Sistema: `CycleCountService.close` gera `ajuste` com `cycleCountId`
(`cycle-count.service.ts:182`; o campo não é forjável pela API pública — `inventory.types.ts:230-235`).

**Fluxo origem→destino hoje (V1):** rota → `requirePermission` → `InventoryController` → `InventoryService.createMovement:298` →
`RlsPrismaInventoryRepository.createMovement:692` → `withTenantRls` (= `$transaction` + `set_config`, **sem `isolationLevel`**,
`read committed` pinado `[10-PRE]`) → `PrismaInventoryRepository.createMovement:206` → `findItemById:207` → `saldoOfCustody:214`
(`aggregate _sum`) → `wouldOverdraw:216` → [`entrada`: `saldoOf:221` → `inventoryItem.updateMany:224`] → `insertMovement:236` →
`stockMovement.create:436` → commit. **Depois do bloco:** o `findItemById` vira `lockItemForUpdate` (`SELECT … FOR UPDATE` da linha
do item, sob RLS) e toda leitura que decide roda **sob o lock**. **V6 hoje:** `close:137` = `findSessionWithEntries` (tx própria) →
`listMovements` (tx própria) → N × `createMovement` (N tx) → `applyClose:207` (tx própria: entries + `status='concluida'` **sem
condição**, `cycle-count-prisma.repository.ts:114`). **Depois:** unidade 0 (sessão `FOR UPDATE` + CAS `aberta→fechando`) → uma
unidade **por item** (sessão `FOR UPDATE` + item `FOR UPDATE` + ajuste + carimbo, na mesma tx via porta `InventoryUnitOfWork`) →
unidade final (sessão `FOR UPDATE` + CAS `fechando→concluida`). Nada muda acima do serviço; nenhuma rota, payload ou permissão nova.
## 2. Mapa das vias — gerado do código (comando → saída em `[05]`), agora com o ESTADO da contagem dentro

### 2.1 Geradores (a junta reexecuta)

```bash
cd .claude/worktrees/b04a
# (a) TODO escritor de stock_movements — ORM e SQL cru — em src/, prisma/ e scripts/ (universo do T-D, default negar)
grep -rn -E "stockMovement\.(create|createMany|upsert|update|updateMany|delete|deleteMany)\(" src prisma scripts --include=*.ts --include=*.mts --include=*.mjs
grep -rn -i -E "(insert\s+into|update|delete\s+from)\s+\"?(public\.)?\"?stock_movements" src prisma/seed*.ts scripts tests/helpers --include=*.ts --include=*.mts --include=*.mjs --include=*.sql
# (b) TODO escritor de cycle_counts / cycle_count_entries
grep -rn -E "cycleCount(Entry)?\.(create|createMany|upsert|update|updateMany|updateManyAndReturn|delete|deleteMany)\(" src prisma scripts --include=*.ts
# (c) quem chega a insertMovement / avg_cost dentro do repositório; quem chama as vias de fora do módulo
grep -n "insertMovement(\|inventoryItem.updateMany" src/modules/inventory/inventory-prisma.repository.ts
grep -rn -E "createExitForSource|removeExitForSource|createMovement\(|createTransfer\(|reverseMovement\(" src --include=*.ts | grep -v "^src/modules/inventory/"
```

Resultado `[05]`: **um único `stockMovement.create` em runtime** — `inventory-prisma.repository.ts:436` (dentro de `insertMovement`,
privado) — e **três em `prisma/seed-fleet.ts:171-173`** (semente: 2 `entrada` + 1 `consumo`, sem estorno nem contagem; **fora do
runtime**, classificado no T-D). **Zero** `update`/`delete`/`createMany`/`upsert` em `stock_movements`; **zero** SQL cru nas 4 tabelas
fora de `prisma/migrations`. `insertMovement` tem **6 chamadas** em 5 métodos (`:236, :253, :263, :309, :386, :416`); `avg_cost` só em
`:224`. Escritores de `cycle_counts`/`cycle_count_entries`: `cycle-count-prisma.repository.ts:25` (create), `:37` (entries `createMany`),
`:86` (`recordEntryCount` — `updateManyAndReturn` **sem condição de status**), `:105` (carimbo), `:114` (`status='concluida'` **sem
condição**), `:123` (`cancelSession` — **sem condição**). Fora do módulo: `fuel-log.service.ts:564,575`, `maintenance-order.service.ts:709,720`
(seams, fora de tx própria), `fleet-alerts.runner.ts:103` (só lê). `mobile-inventory-sync.ts` é memória pura e alvo do `B-O6R-04b`.

### 2.2 Tabela por via — LÊ · DECIDE · ESCREVE · lock hoje · vermelho medido (`[10]`, head-base, papel `NOSUPERUSER NOBYPASSRLS`)

| via | entrada | LÊ / DECIDE / ESCREVE (arquivo:linha) | lock hoje | vermelho medido (head-base) | verde medido (desenho v2 emulado) |
|---|---|---|---|---|---|
| **V1** `createMovement` | `InventoryService:298`; V6 | `findItemById:207` · `saldoOfCustody:214` · `wouldOverdraw:216` · [`saldoOf:221` · `updateMany:224`] · `insertMovement:236` | nenhum | **P1**: 20/20 ok, saldo **−10** (5/5) · **P7**: avg **2,0** (5/5) · **P11**: B bloqueia no `INSERT` (KEY SHARE), commita, saldo **−1** | **V1**: 10 ok / 10 × 409, saldo 0, 0 × P2028, 0 × 40P01 (5/5; 127–152 ms por 20) · **V7**: avg **2,333333** (5/5) · **P11-new**: B bloqueia no `FOR UPDATE`, relê saldo 0, **409** |
| **V2** `createTransfer` | `InventoryService:338` | `findItemById:240` · `saldoOfCustody:247` · `wouldOverdraw:248` · `insertMovement:253,:263` (mesmo `itemId`) | nenhum | mesma classe de P1 (código `:247-248` = `:214-216`) | mesma mudança de V1 (um lock, duas pernas) |
| **V3** `reverseMovement` | `InventoryService:361` | `findMovementById:278` · `movementsInGroup:282` · `hasReversalOf:286` · `saldoOfCustody:303` · `insertMovement:309` | nenhum; sem unicidade (`schema.prisma:1508` só `@@index`) | **P3**: 2 compensações, saldo 13 (5/5) | **V3**: 1 compensação, perdedor `already_reversed`, saldo 10 (5/5) |
| **V4** `createExitForSource` | `fuel-log:564`, `maintenance:709` → `InventoryService:444` | `findItemById:365` · `findExitBySource:370` · `isExitReversed:372` · `saldoOfCustody:380` · `insertMovement:386` · `catch` P2002 **dentro da tx** `:398-404` | nenhum | **P9**: mesma fonte ×2 → um `25P02` em **10/10** | **V4**: mesmo `id` nos dois lados em 10/10, 0 × `25P02`, 1 linha |
| **V5** `removeExitForSource` | `fuel-log:575`, `maintenance:720` → `InventoryService:471` | `findExitBySource:411` · `isExitReversed:413` · `insertMovement:416` | nenhum | **P5**: 2 compensações, saldo 13 (5/5) | **V5**: 1 compensação, perdedor `undefined` (5/5) |
| **V6** `close` | `cycle-count.controller.ts:88` | `findSessionWithEntries:138` · `status:146` · `listMovements:157` · N × `createMovement:182` · `applyClose:207` (`:105` carimbos, `:114` status sem condição) | nenhum; N+3 tx | **P6**: 2 vencedores, 2 ajustes, saldo 4 (5/5) · **E5-hb**: N=1000 fecha em ~20 s; N=10 000 → `P2028` no `applyClose` e sessão `aberta` `[16]` | **DBL**: 1 vencedor + 1 × 422 em 10/10 e com 50 itens · **CRASH**: 7/20 aplicados → `fechando` → retomada por outro cliente → 20/20, 0 dup · **E5**: unidades ≈ 18–20 ms, N=10 000 conclui `[16]` |
| **V7** `recordEntry` (novo no mapa) | `cycle-count.controller.ts` → `service:99` | `findSession:105` (tx própria) · `status:110` · `recordEntryCount:86` (tx própria, **sem condição**) | nenhum | **E3-hb**: B grava `contado=5` em 15 ms **antes** do commit do fechamento; final `contado 5 / variance −3 / concluida` | **E3**: B bloqueia no `FOR SHARE`, relê `concluida` → 422; entry intacta (`contado 7`) · **E3-inverso**: fechamento espera o `FOR SHARE` e aplica o contado final (−5) |
| **V8** `cancel` (novo no mapa) | `cycle-count.controller.ts:109` → `service:222` | `findSession:223` · `status:228` · `cancelSession:123` (**sem condição**) | nenhum | **E4-hb**: `cancelada` + `is_active=false` com o ajuste −3 no ledger | **E4**: CAS `status='aberta'` → 0 linhas → relê `concluida` → 422 (fases `fechando` e `aplicado`) |
| `open` (`createSession:25,37`) e `recalculateAbc` (`applyAbcClasses:563`) | — | não leem saldo; **tomam KEY SHARE / NO KEY UPDATE em vários itens numa tx** (ordem `created_at desc` / consumo desc) | — | **LO-old**: desenho v1 (sessão + itens `FOR UPDATE` ASC numa tx) → **`40P01`** nas duas (A vítima) | **LO-new/v1lock**: 0 × `40P01` — um lock de item por tx não fecha ciclo |

**Propriedade a fechar (não a instância):** (i) toda via que chega a `insertMovement`/`avg_cost` toma o lock do item **antes** da primeira
leitura que decide; (ii) toda transição de `cycle_counts.status` é **condicional** (CAS) e toda escrita em `cycle_count_entries` roda
sob lock da sessão; (iii) nenhuma tx do módulo segura >1 item. O T-D (§6) enumera (i)–(iii) **pelo fonte** e reprova via nova sem
classificação; o token de tipo faz o compilador negar antes do teste (CE-G1, §7).
## 3. Desenho

### 3.1 V1–V5: row lock `FOR UPDATE` na linha `inventory_items(tenant_id, id)` ANTES da primeira leitura que decide — como TIPO

Sobreviveu ao ataque (parecer r1 §3.2-3) e foi re-provado por mim: 10 ok / 10 × 409 em 5/5, saldo 0, 0 × `P2028`, 0 × `40P01`
`[10-V1]`; B bloqueia no `SELECT … FOR UPDATE` (texto capturado em `pg_stat_activity`), relê saldo 0 e recebe 409 `[10-P11-new]`.
`FOR UPDATE` (não `NO KEY UPDATE`) porque só ele conflita com o `KEY SHARE` que todo `INSERT` em `stock_movements` toma na linha do
item pela FK — é o que serializa até um escritor futuro que esqueça o lock (ele espera; perde só a releitura) `[10-P11-hb]`. Sob RLS
FORCE e papel sem `BYPASSRLS`: 1 linha com o contexto do tenant, **0 sem contexto, 0 com contexto de outro tenant** `[10-PRE]`.

```ts
// src/modules/inventory/inventory-prisma.repository.ts
declare const ItemWriteLockBrand: unique symbol;
/** Prova de posse do row lock do item. SÓ lockItemForUpdate produz; toda leitura-que-decide e insertMovement EXIGEM. */
export type ItemWriteLock = { readonly [ItemWriteLockBrand]: true; readonly item: InventoryItem };
private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
  const rows = await this.client.$queryRaw<ItemRecord[]>`SELECT * FROM "inventory_items" WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid FOR UPDATE`;
  return rows[0] ? ({ item: mapItemRecord(rows[0]) } as ItemWriteLock) : undefined;   // undefined = inexistente/outro tenant → 400/404 como hoje
}
private saldoOfCustodyLocked(lock: ItemWriteLock, custody: StockCustody): Promise<number>;
private saldoOfLocked(lock: ItemWriteLock): Promise<number>;
private hasReversalOfLocked(lock: ItemWriteLock, movementIds: readonly string[]): Promise<boolean>;
private findExitBySourceLocked(lock: ItemWriteLock, sourceType: string, sourceId: string): Promise<StockMovement | undefined>;
private insertMovement(input: …, lock: ItemWriteLock): Promise<StockMovement>;
```
`$queryRaw` **tagged** (nunca `Unsafe` com string montada). Via nova que chame `insertMovement` ou uma leitura `*Locked` sem o token é
`TS2554`/`TS2345` no `npm run check` — o default de negar antes de qualquer teste (CE-G1). A interface pública `InventoryRepository` não
muda de assinatura; o lock é interno ao repositório Prisma.

| via | mudança exata | prova (§14) |
|---|---|---|
| **V1** | `findItemById:207` → `lockItemForUpdate`; `saldoOfCustodyLocked` → `wouldOverdraw` → [`saldoOfLocked` + `avg_cost`] → `insertMovement(…, lock)` | `[10-V1]` 10/10 · `[10-V7]` avg 2,333333 · `[10-P11-new]` |
| **V2** | `findItemById:240` → `lockItemForUpdate`; as duas pernas sob o mesmo lock (mesmo `itemId`, `:253-272`) | mesma mudança de V1 (A3 no banco) |
| **V3** | `findMovementById:278` (sem lock, só para saber o item) → `lockItemForUpdate(original.itemId)` → `movementsInGroup` e `hasReversalOfLocked` **re-executados sob o lock** → pernas sob o lock. **Toda perna tem de ter `itemId === original.itemId`** (por construção, `createTransfer` usa `input.itemId` nas duas); perna com outro item = dado corrompido → `transferGroupInconsistentError()` (409 `STOCK_MOVEMENT_CONFLICT/transfer_group_inconsistent`, novo em `inventory.types.ts`) — **nunca um 2º lock** (I7) | `[10-V3]` 1 compensação em 5/5 |
| **V4** | `lockItemForUpdate` ANTES de `findExitBySourceLocked`/`hasReversalOfLocked`/saldo: o 2º da MESMA fonte vê o 1º commitado e o devolve. **O `catch` de P2002 (`:398-404`) sai da transação** e vai para o wrapper `RlsPrismaInventoryRepository.createExitForSource` (`try { withTenantRls(…) } catch (e) { if (isUniqueViolation(e)) { const raced = await withTenantRls(…, tx => new PrismaInventoryRepository(tx).findExitBySource(…)); if (raced) return raced; } throw e; }`) | `[10-V4]` mesmo `id` 10/10, 0 × `25P02` |
| **V5** | `findExitBySource:411` (sem lock) → `lockItemForUpdate(exit.itemId)` → `hasReversalOfLocked` → insert sob o lock; P2002 do índice novo → `undefined` no wrapper, fora da tx | `[10-V5]` 1 compensação em 5/5 |

### 3.2 I7 — o mecanismo que DISPENSA ordem global de locks (emenda 2-i)

Regra: **nenhuma transação do módulo segura mais de um row lock de `inventory_items`; quando há lock de sessão, ele vem ANTES do
lock do item.** Consequência, por construção: um ciclo de deadlock exige dois participantes que seguram algo e esperam algo; quem
segura `FOR UPDATE` de um item (V1–V5, ou a unidade do V6) só espera **antes** de tê-lo (pelo próprio item ou pela sessão), nunca por
um segundo item; `open` (`createMany` de entries: `KEY SHARE` em vários itens, ordem `created_at desc`) e `recalculateAbc`
(`NO KEY UPDATE` em vários itens, ordem consumo desc) esperam por um item travado mas **não seguram nada que a unidade do V6 vá
pedir depois** (ela já tem a sessão e pede um único item). Medido `[10-LO]`: desenho v2 × `open()` real e × `recalculateAbc()` real
→ **0 × `40P01`**, B bloqueia e conclui quando a unidade commita (`entries=[Y,X]`; `{A:1,B:0,C:1}`); V1 com lock × os dois → 0 ×
`40P01`; **controle**: o desenho v1 (sessão + X + Y `FOR UPDATE` numa tx) → **`40P01`** nas duas, A vítima. Duas sessões `[X,Y]` e
`[Y,X]` fechadas em paralelo com hold de 300 ms sob cada item → as duas `concluida`, 2 ajustes cada, saldos 98/98 `[10-V6V6]`.
O guard D2 (§6) reprova, pelo fonte, método com mais de um `lockItemForUpdate(` ou com o lock depois de um laço; o teste B8 mantém o
controle vermelho **embutido** (a emulação do desenho v1 em SQL cru dentro do teste tem de dar `40P01` — prova que o detector vê
deadlock — e o código real tem de dar 0).
### 3.3 V6 em UNIDADES — máquina de estados `aberta → fechando → concluida` (emenda 2-h; fecha A-06, A-03, P-021)

**Por que unidades por item e não uma transação:** a tx única é O(N) com ≥ 4 idas ao banco por item sob timeout fixo de 5 s
(`withTenantRls` sem opções, `src/database/**` fora do escopo) — o crítico mediu o teto em ≈ 650 itens; e ela segura `FOR UPDATE` de
centenas de itens por segundos, bloqueando toda saída/consumo desses itens. A unidade por item segura **um** item por ≈ 20 ms
`[16-E5]`, cabe no timeout para qualquer N, e o estado intermediário é **persistido e retomável**. Lotes (k itens por tx)
reintroduziriam k locks simultâneos e a ordem (I7) — rejeitado.

**Estados:** `aberta` (contagem em curso) → `fechando` (fechamento iniciado; ajustes sendo aplicados **e persistidos** unidade a
unidade) → `concluida`. `aberta → cancelada` só por CAS. **`fechando` é terminal para `recordEntry` e `cancel` (422) e retomável por
`close`** — `[10-CRASH]`: interrompido após 7/20 unidades → `fechando`, 7 ajustes; `recordEntry` → 422 `fechando`; `cancel` → 422;
`close` do head-base sobre ela → 422 (o serviço antigo também recusa); `close` v2 por OUTRO cliente → 13 unidades, `concluida`,
20 ajustes, 0 duplicado. `CYCLE_COUNT_STATUSES` ganha `"fechando"` (`cycle-count.types.ts:5`) — `parseOptionalStatus` passa a aceitá-lo
no filtro da listagem; o frontend (fora do escopo) mapeia status desconhecido para `"aberta"` (`cycle-counts.adapter.ts:128`) e mostra
o chip "Aberta" — o backend recusa com 422 e o adapter já trata o 422 (`:177-181`); pendência nomeada (§13-3).

**API do repositório (`CycleCountRepository`, in-memory e Prisma) — cada método é UMA transação:**
```ts
type BeginCloseOutcome = { status: "started" | "resumed"; session: CycleCount; entries: readonly CycleCountEntry[] } | { status: "not_found" } | { status: "not_open"; current: CycleCountStatus };
beginClose(tenantId, cycleCountId): Promise<BeginCloseOutcome>;            // sessão FOR UPDATE; aberta → CAS fechando ("started"); fechando → "resumed"; senão not_open
lockSessionForUpdate(tenantId, cycleCountId): Promise<CycleCount | undefined>; // dentro da unidade (via porta), ANTES do item
findEntry(tenantId, cycleCountId, entryId): Promise<CycleCountEntry | undefined>; // releitura sob o lock da sessão
stampEntry(input: { tenantId; cycleCountId; entryId; variance; adjustmentMovementId }): Promise<void>;
finishClose(tenantId, cycleCountId, updatedBy?): Promise<{ status: "ok"; session: CycleCountWithEntries } | { status: "not_open"; current } | { status: "pending"; remaining: number }>;
  // sessão FOR UPDATE; exige fechando; conta pendentes (counted≠system AND adjustment IS NULL); 0 → CAS fechando→concluida
```
`applyClose` **sai** da interface (o T-D D4 reprova qualquer uso). Prisma: `beginClose` = `$queryRaw … FOR UPDATE` + `updateMany({ where:
{ tenant_id, id, status: "aberta" } })` com `count === 1` (senão relê e devolve `not_open`); `finishClose` idem com `status: "fechando"`.

**`CycleCountService.close(actor, id)`:**
1. `begin = repository.beginClose(...)` → `not_found` → 404 · `not_open` → 422 `cycleCountNotOpen(current)`.
2. `pending = entries.filter(counted !== undefined && counted !== system && !adjustmentMovementId)`, ordenadas por `itemId` (só
   determinismo; a ordem **não** é o que evita deadlock).
3. Para cada `entry`: `await uow.run(tenantId, async ctx => { const s = await ctx.cycleCounts.lockSessionForUpdate(...); if (s?.status
   !== "fechando") throw cycleCountNotOpen(s?.status ?? "cancelada"); const e = await ctx.cycleCounts.findEntry(...); if (e.adjustmentMovementId)
   return skip; const variance = …; const prior = (await ctx.inventory.listMovements({ tenantId, cycleCountId, itemId, limit: 1, offset: 0 })).items[0]
   /* P-021: ajuste gravado por fechamento antigo que falhou no meio → reaproveita */; const movement = prior ?? await ctx.inventory.createMovement({ type: "ajuste", cycleCountId, … })
   /* V1 real: lock do item DENTRO desta tx */; if (!movement) throw invalid_item_reference(400); await ctx.cycleCounts.stampEntry({...});
   const item = await ctx.inventory.findItemById(...); return { variance, avgCost: item?.avgCost ?? 0 }; })` — acumula `totalVarianceValue`.
   `[10-LEGACY]`: ajuste pré-gravado para X → `reusedLegacy 1`, 2 ajustes no total, 0 duplicado.
4. `fin = repository.finishClose(...)` → `not_open` → 422 · `pending` (impossível por construção: `recordEntry` é recusado em `fechando`
   e carimbo nunca volta a NULL; fica como defesa) → 409 `CYCLE_COUNT_INVALID/close_incomplete`, sessão segue `fechando`.
5. Devolve `{ cycleCount: fin.session, totalVarianceValue }` — mesmo DTO de hoje.

**Erro no meio (ex.: 409 `insufficient_balance` no item k):** propaga como hoje (409); unidades 1..k−1 **ficam aplicadas e carimbadas**;
sessão em `fechando`; a via de saída é corrigir o saldo (entrada) e chamar `close` de novo, que retoma de k. É estritamente mais
honesto que o head-base, que deixa os mesmos ajustes parciais com a sessão `aberta` e `cancel` liberado (P-021 + A-02). "Abandonar" um
`fechando` compensando os ajustes aplicados é funcionalidade nova → pendência com dono (§13-4), não silêncio.

**Concorrência de dois `close`:** ambos passam pela unidade 0 (o 2º lê `fechando` → `resumed`) e alternam unidades sob o `FOR UPDATE` da
sessão; cada unidade relê o carimbo; a unidade final tem CAS `fechando→concluida` → **exatamente um 200**, o outro 422
`invalid_status_transition` (`concluida`) — `[10-DBL]`: 10/10 com 1 item; 50 itens: A 50 unidades, B 422; 0 duplicado sempre. Backstop de
banco para qualquer escritor: índice único parcial `(tenant_id, cycle_count_id, item_id)` (§4).
### 3.4 `recordEntry` (A-01/A-04, emenda 2-j) e `cancel` (A-02, emenda 2-k)

- **`recordEntryCount` (Prisma):** na mesma tx do wrapper: `SELECT status FROM cycle_counts WHERE tenant_id AND id FOR SHARE` → ausente →
  `{ status: "not_found" }`; `≠ aberta` → `{ status: "not_open", current }`; senão `updateManyAndReturn` (com `cycle_count_id` no `where`, como
  hoje) → `{ status: "ok", entry }` | `{ status: "not_found" }`. `FOR SHARE` conflita com o `FOR UPDATE` do fechamento **e** com o `UPDATE`
  do `cancel` (NO KEY UPDATE) → as três vias serializam na linha da sessão. O serviço mapeia `not_open` → 422 `cycleCountNotOpen(current)`.
  Provado: `[10-E3]` B bloqueia no `FOR SHARE` (texto capturado), relê `concluida` → 422, entry intacta (`contado 7`); **inverso** — B
  segura o `FOR SHARE` 1,5 s, o fechamento espera no `FOR UPDATE` e aplica o contado FINAL (variance −5, saldo 5) `[10-E3-inv]`.
  Controle head-base: B grava em 15 ms antes do commit → `contado 5 / variance −3` (incoerente) `[10-E3-hb]`. A "1 linha"
  `where: { cycle_count: { status: "aberta" } }` do §13-d da v1 **não existe mais** (A-04): filtro relacional sem lock lê o snapshot antigo.
- **`cancelSession` (Prisma):** `updateManyAndReturn({ where: { tenant_id, id, status: "aberta" }, data: { status: "cancelada", is_active: false, … } })`;
  0 linhas → relê → `{ status: "not_found" }` | `{ status: "not_open", current }`. Provado: `[10-E4]` B bloqueia no `UPDATE` (row lock de A),
  ao liberar o `WHERE status='aberta'` é reavaliado sobre a versão nova → 0 linhas → 422 (`concluida`), nas fases `fechando` e
  `aplicado`; sob RLS, sem contexto ou com contexto de outro tenant → 0 linhas `[10-PRE]`. Controle head-base: `cancelada` com o ajuste
  no ledger `[10-E4-hb]`.
- In-memory: mesma máquina de estados, sem lock (mono-thread); os 6 casos HTTP de `inventory-cycle-counts-routes.test.ts` seguem verdes.

### 3.5 Porta `InventoryUnitOfWork` — espelho de `src/modules/financial-uow/` `[07]`

`src/modules/inventory/inventory-uow.ts`: `interface InventoryUowContext { readonly inventory: InventoryRepository; readonly cycleCounts:
CycleCountRepository }`, `interface InventoryUnitOfWork { run<T>(tenantId: string, work: (ctx) => Promise<T>): Promise<T> }`; memória =
`MemoryInventoryUnitOfWork` (mutex por tenant sobre os singletons in-memory; **sem journal** — emenda 1-e; cabeçalho declara "NÃO é
evidência de atomicidade; a prova é a suíte `-db`"). `src/modules/inventory/inventory-uow-prisma.ts`: `run = withTenantRls(prisma, tenantId,
tx => work({ inventory: new PrismaInventoryRepository(tx), cycleCounts: new PrismaCycleCountRepository(tx) }))` (ambos os construtores já
aceitam `PrismaExecutor`, `:55` e `cycle-count-prisma.repository.ts:22`). `CycleCountService` recebe a porta como 3º parâmetro; as fábricas
(`cycle-count.service.ts:245-281`) a injetam. Uma `run` por **unidade**, nunca pelo fechamento inteiro.

### 3.6 Perdedores por tempo e por deadlock (N-03, emenda 2-m) — status HTTP hoje e depois

**Hoje (medido `[10-TOK]`):** `P2028` (tx expirada), `40P01` via ORM (`DriverAdapterError` **sem `code` no topo**; `cause.code = 40P01`) e via
`$queryRaw` (`P2010` com `meta.code = 40P01`) caem no ramo `error instanceof Error` de `sendRouteError` (`http.ts:51-59`) → **400
`BAD_REQUEST/invalid_request` com a mensagem crua do Prisma** (texto de invocação e query — o que §B2.8 proíbe). **Depois:** os wrappers
`Rls*` dos dois repositórios e a porta Prisma passam por `mapTransientDbFailure(error)` (espelho de `isTransientDatabaseFailure`,
`checklist-prisma.repository.ts:1171-1195` — detecta por CÓDIGO nos dois níveis: `P2028`, `P2034`, `P2024`, `P2010`+`meta.code`, e
`cause.code` do `DriverAdapterError` para `40P01`/`40001`/`55P03`) → `InventoryError(503, "STOCK_UNAVAILABLE", "stock_busy", "O estoque
estava ocupado e a operação não foi aplicada. Tente novamente em alguns instantes.")` / `CycleCountError(503, "CYCLE_COUNT_UNAVAILABLE",
"cycle_count_busy", …)` — precedente de status: `sanitizeReopenFailure` devolve 503 para transitório (`:1152-1157`). Nada é gravado
(rollback). Seams `fuel`/`maintenance` propagam o 503 (é `statusCode` de rota). Com o desenho, `P2028` só é alcançável por contenção
> 5 s num item e `40P01` é impossível dentro do módulo (I7) — o mapeamento é cinto para o que o desenho já evita.
## 4. Modelagem — UMA migração aditiva fail-closed, censo somente leitura, dois índices únicos parciais (emendas 1-a, 2-g)

### 4.1 `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (NOVO)
Timestamp livre `[08]`: última é `20260872000000_add_reversal_pair_fk` e `gh pr list --state open` → `[]`; **re-conferir no dia do PR**.
Molde: `20260832` (índice parcial único em `stock_movements`) + `20260872` (censo `DO $censo_fk$` fail-closed + down provado).

```sql
-- B-O6R-04a (Ω6R-DAT-002 / DAT-003) — DOIS backstops de banco, para QUALQUER escritor:
--   (1) no máximo UMA compensação por movimento original;  (2) no máximo UM ajuste por (sessão de contagem, item).
-- Aditiva pura: 2 índices parciais únicos; nenhuma coluna, nenhum DROP, nenhum UPDATE/DELETE de dado. prisma/schema.prisma só ganha
-- comentário (índice parcial não é modelável — precedente stock_movements_source_active_key, schema l.1483-1487).
-- FAIL-CLOSED: o censo abaixo ABORTA (zero mutação) se houver duplicata de legado e NUNCA deduplica — qual compensação/ajuste "vale" é
-- dinheiro, decisão do dono (P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD). A mensagem nomeia os grupos por id de MOVIMENTO / CONTAGEM / ITEM
-- (nunca tenant_id — §B2.8), até 20; a lista completa sai de scripts/inventory-duplicates-census.sql (somente leitura).
DO $censo$
DECLARE grupos bigint; amostra text;
BEGIN
  SELECT count(*), string_agg(g.chave, '; ') INTO grupos, amostra FROM (
    SELECT 'estorno duplicado: original=' || reverses_movement_id::text || ' x' || count(*) AS chave
      FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
    UNION ALL
    SELECT 'ajuste duplicado: contagem=' || cycle_count_id::text || ' item=' || item_id::text || ' x' || count(*)
      FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1
    ORDER BY 1 LIMIT 20) g;
  IF grupos > 0 THEN
    RAISE EXCEPTION 'stock_movements: % grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003). Os indices unicos nao podem nascer sobre dado inconsistente; NADA foi mutado; NADA foi deduplicado (qual compensacao vale e decisao humana). Rode scripts/inventory-duplicates-census.sql e consulte P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD. Grupos (ate 20): %', grupos, amostra
      USING ERRCODE = 'raise_exception';
  END IF;
END $censo$;

CREATE UNIQUE INDEX "stock_movements_reversal_active_key"
  ON "stock_movements" ("tenant_id", "reverses_movement_id") WHERE "reverses_movement_id" IS NOT NULL;
CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key"
  ON "stock_movements" ("tenant_id", "cycle_count_id", "item_id") WHERE "cycle_count_id" IS NOT NULL;

-- down (provado em T-C4: up -> down -> re-up em banco descartável, pg_indexes 2 -> 0 -> 2):
--   DROP INDEX IF EXISTS "stock_movements_cycle_count_item_key";
--   DROP INDEX IF EXISTS "stock_movements_reversal_active_key";
```
**Provado `[10-IDX]`:** com duplicatas produzidas pelo DEFEITO real (3 tenants × reversão dupla + fechamento duplo, mais os resíduos das
outras sondas): censo = **13 grupos/26 linhas** (estornos) + **8 grupos/16 linhas** (ajustes); o bloco `DO` aborta com `P0001` nomeando
"20 grupo(s)" e a amostra; `CREATE UNIQUE INDEX` sobre a duplicata → **`23505`** (`could not create unique index … Key (…) is duplicated`
`[11]`), transação desfeita, `pg_indexes` sem resíduo. Depois da limpeza **escopada aos tenants da sonda** (nunca wildcard): censo 0/0, `DO`
mudo, os dois índices nascem em **35 ms**, `indexdef` com `WHERE (reverses_movement_id IS NOT NULL)` / `WHERE (cycle_count_id IS NOT NULL)`;
2ª compensação → `23505`; 2º ajuste (sessão, item) → `23505`; 3 linhas com NULL → aceitas; drill `2 → 0 → 2 → 0`. Sem `CONCURRENTLY`
(`migrate deploy` roda em transação; precedente `20260832`). `prisma/schema.prisma:1508`: **manter** o `@@index`; acrescentar só o comentário.

### 4.2 `scripts/inventory-duplicates-census.sql` (NOVO, autorizado nominalmente — emenda 2-g) — somente leitura
```sql
-- B-O6R-04a — CENSO de duplicatas em stock_movements (Ω6R-DAT-002/003). SOMENTE LEITURA: nenhum INSERT/UPDATE/DELETE.
-- Uso (ato do dono, ANTES do próximo deploy de staging/produção): psql "$STAGING_DATABASE_URL" -f scripts/inventory-duplicates-census.sql
-- Saída: uma linha por grupo duplicado (com tenant_id — a saída fica com o dono, não é versionada) + um resumo. 0 linhas = deploy livre.
SELECT 'estorno' AS tipo, tenant_id, reverses_movement_id AS chave_1, NULL::uuid AS chave_2, count(*) AS linhas, array_agg(id ORDER BY created_at) AS movimentos
  FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
UNION ALL
SELECT 'ajuste_contagem', tenant_id, cycle_count_id, item_id, count(*), array_agg(id ORDER BY created_at)
  FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1
ORDER BY 1, 2;
SELECT count(*) FILTER (WHERE reverses_movement_id IS NOT NULL) AS estornos, count(*) FILTER (WHERE cycle_count_id IS NOT NULL) AS ajustes_de_contagem FROM stock_movements;
```
O T-C6 executa o arquivo contra o descartável e falha se ele contiver `INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP` (regex, fail-closed).

### 4.3 Roteiro do censo — ato do dono (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`, §13-1)
1. Rodar o script em **staging** (`STAGING_DATABASE_URL` — `deploy-staging.yml:44` é quem migra) e em **produção** (`PROD_DATABASE_URL`,
   `deploy-production.yml:136`), **antes do próximo deploy** de cada uma; guardar a saída fora do repositório.
2. N = 0 nas duas → o deploy passa. N > 0 → decisão humana por grupo (qual compensação/ajuste vale; o outro é estornado por movimento
   compensatório, nunca apagado — ledger imutável); só então o deploy. O merge do bloco **não** depende disto; o deploy, sim.
3. O ato entra na recontagem do `B-SAN3-10` (§4.2 do plano SAN3).

Nada de Decimal/dinheiro novo; `created_at`/`updated_at` já são `timestamptz`; ledger imutável (sem delete lógico em movimento); sessão
cancelada é delete lógico existente (`is_active=false`). `cycle_counts.status` é `TEXT` sem CHECK (`20260718` l.42 `[08]`) — o valor novo
`fechando` não exige migração; **não** se acrescenta CHECK (fora do aditivo autorizado).
## 5. Contrato (rotas, payloads e códigos — forma inalterada; agora determinísticos sob concorrência; um status novo e um código novo)

| rota / seam | permissão exata (`[04]`) | sucesso | recusas |
|---|---|---|---|
| `POST /api/v1/stock-movements` (`saida`/`consumo`/`ajuste`/`entrada`/`link`/`unlink`) | `stock_movements:create` (`inventory.routes.ts:119`) | 201 (1 movimento; par para link/unlink) | 409 `STOCK_INVALID/insufficient_balance` **decidido sob o lock** (nunca um vencedor a mais que o saldo); 400 `invalid_item_reference` (item de outra organização — a RLS o esconde, 0 linhas no `FOR UPDATE`); 422 `invalid_custody`; 400 `invalid_custody_reference`; **503 `STOCK_UNAVAILABLE/stock_busy`** (contenção > 5 s / deadlock — nada gravado; hoje era 400 com mensagem crua `[10-TOK]`) |
| `POST /api/v1/stock-movements/:movementId/reverse` | `stock_movements:create` (`:129`) | 200 (compensações, 1 por perna) | 404 `STOCK_MOVEMENT_NOT_FOUND` (cross-tenant); 409 `STOCK_MOVEMENT_CONFLICT/movement_already_reversed` (2º estorno — decidido sob o lock; `23505` do índice novo → 409 pelo wrapper, fora da tx); 409 `STOCK_MOVEMENT_CONFLICT/transfer_group_inconsistent` (grupo com mais de um item — dado corrompido; nunca 2º lock); 503 `stock_busy` |
| `POST /api/v1/cycle-counts/:cycleCountId/close` | `cycle_counts:create` (`cycle-count.routes.ts:73`) | 200 **exatamente uma vez** por sessão (relatório de variância, DTO de hoje) | 422 `CYCLE_COUNT_INVALID/invalid_status_transition` para `concluida`/`cancelada` e para o perdedor concorrente (status relido = `concluida`); 404 cross-tenant; erro numa unidade (409/400) → propaga, **unidades anteriores ficam aplicadas**, sessão em **`fechando`**; `close` sobre `fechando` = **retomada** (só o que falta); 409 `CYCLE_COUNT_INVALID/close_incomplete` (defesa: pendente após o laço); 503 `CYCLE_COUNT_UNAVAILABLE/cycle_count_busy` |
| `PATCH /api/v1/cycle-counts/:cycleCountId/entries/:entryId` | `cycle_counts:create` (`:65`) | 200 | 422 `invalid_status_transition` para `fechando`/`concluida`/`cancelada` — **decidido sob `FOR SHARE` da sessão** (nunca por cima de um fechamento em curso); 404 sessão/entry cross-tenant |
| `POST /api/v1/cycle-counts/:cycleCountId/cancel` | `cycle_counts:create` (`:81`) | 200 (`cancelada`, `is_active=false`) | 422 `invalid_status_transition` para `fechando`/`concluida`/`cancelada` — **CAS no próprio UPDATE**; 404 cross-tenant |
| `GET /api/v1/cycle-counts?status=` | `cycle_counts:read` | aceita `aberta`/`fechando`/`concluida`/`cancelada` | 400 `invalid_status` para outro valor (como hoje) |
| seam `createExitForSource` (fuel/maintenance) | nenhuma própria (efeito de domínio) | movimento `saida` BASE; corrida da MESMA fonte → o vencedor (**sem `25P02`/500**) | 409 `insufficient_balance`; 422 `item_not_fuel`; 409 `stock_baixa_reversed`; 503 `stock_busy` |
| seam `removeExitForSource` | nenhuma própria | compensação | já estornado/ausente → `undefined` (no-op idempotente), inclusive sob `23505` |

**Mudanças de contrato (explícitas):** (a) valor novo `fechando` em `status` de contagem (GET/list/close/cancel/PATCH) — o frontend,
fora do escopo, mostra "Aberta" por fallback (`cycle-counts.adapter.ts:128`) e recebe 422 ao agir; pendência §13-3; (b) código novo
**503** `stock_busy`/`cycle_count_busy` para contenção/deadlock (antes 400 cru); (c) `close` retomável; (d) `transfer_group_inconsistent`.
Nenhuma rota, payload ou permissão nova. `API_CONTRACTS.md` (fora do escopo, l.418 só lista as rotas sem enumerar status) **não muda**;
o registro do valor novo e do 503 vai na ata e na pendência §13-3, para o bloco de frontend levar ao contrato.
## 6. Testes de encerramento — cada caso com vermelho-controle no head-base (ou controle embutido)

**Arnês comum das 3 suítes `-db`** (padrão `o6r06-usage-atomic-db.test.ts:30-37` + `financial-entry-delete-reverse-race-db.test.ts:1-60`
`[06]`): DB-gated **só** por `DATABASE_URL` ausente (um `test(nome, { skip })` declarado por arquivo — conta no piso do runner);
`process.env.CORE_SAAS_PERSISTENCE = "prisma"` antes de qualquer import da aplicação e o modo asserido; cliente admin com
`withApplicationName(DATABASE_URL, buildApplicationName("b04a-<suite>"))` + `assertApplicationNamePropagated`; **dois papéis efêmeros**
`createEphemeralRole(admin, conexão)` (`auth-identity-fixture.ts:324-364`: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` + `GRANT
SELECT, INSERT, UPDATE, DELETE`), postura **asserida por `pg_roles`** (`rolsuper=false`, `rolbypassrls=false`, como `o6r06:623-629`) —
falha ao criar o papel = vermelho, nunca skip; **os repositórios/serviços sob teste rodam nos clientes dos papéis** (A e B, dois
`PrismaClient`); o admin só semeia, faz teardown e observa `pg_stat_activity`. Barreira determinística = `waitForOwnBlockedStatement`
escopada por `application_name` (`pg-barrier.ts:91-113`); largada comum nas corridas de N. Tenant descartável por caso; teardown
escopado por `tenant_id` em ordem de FK (`stock_movements` → `cycle_count_entries` → `cycle_counts` → `inventory_items` → `tenants`) —
nunca wildcard. `40P01` nunca aceitável. `RACE_N = 10`. "Head-base" = `[10]`/`[16]` (minha execução); o dev reexecuta as suítes contra
`63dd45bb` (§10 passo 9) e o número da ata é o que sair lá.

### T-A `tests/inventory-balance-lock-race-db.test.ts` — V1–V5 + I7 + transitório (fecha `Ω6R-DAT-002` + `P-020`)

| caso | forma | verde (pós-bloco) | vermelho-controle (head-base) |
|---|---|---|---|
| **A0** | postura dos 2 papéis (`pg_roles`); tag propagada; `transaction_isolation` dentro de `withTenantRls` | `false/false` ×2; tag; `read committed` | n/a (premissa pinada `[10-PRE]`) |
| **A1 [encerramento]** | item BASE=10; 20 saídas de 1 (10 por A + 10 por B, largada comum) × RACE_N | saldo ≥ 0 sempre; **exatamente 10** ok + 10 × 409 `insufficient_balance`; 0 × `40P01`; 0 × `P2028` | **`[10-P1]`: 20 ok, saldo −10 (5/5)** |
| **A2 [barreira]** | admin: tx crua `set_config` + `FOR UPDATE` do item + `INSERT` −10 sem commit; B: `createMovement(saida −1)`; barreira `waitForOwnBlockedStatement(admin, { applicationName: tag de B, fragment: "tenant_id" })` — o fragmento casa nos DOIS mundos (N-01): head-base bloqueia em `INSERT INTO "public"."stock_movements" ("tenant_id",…`, desenho em `SELECT … FROM "inventory_items" WHERE "tenant_id" … FOR UPDATE` `[10-P11]`; admin commita | **1ª asserção**: B → 409 e saldo 0; **2ª**: o texto bloqueado contém `inventory_items` | **`[10-P11-hb]`: B commita, saldo −1** — vermelho pela invariante, não por timeout de barreira |
| A3 (V2) | `link` ×20, BASE=10 → viatura | BASE ≥ 0; 10/10; viatura = 10 | mesma classe de P1 (código idêntico `:247-248`) |
| A4 / A5 | `ajuste −1` ×20; `saida` ×20 de custódia viatura=10 | saldo ≥ 0; 10/10; BASE intacta | mesma classe |
| A6 (V4) | `createExitForSource` ×20 fontes distintas, BASE=10 | BASE ≥ 0; 10/10 | mesma classe |
| **A7** (V3) | `reverseMovement` ×2 do mesmo movimento × RACE_N | **1** compensação; perdedor 409 `movement_already_reversed`; saldo restaurado | **`[10-P3]`: 2 compensações, saldo 13 (5/5)** |
| A7b (V3 grupo) | estorno ×2 de um `link` (2 pernas) | 2 compensações (1 por perna), nunca 4 | prev. 4 |
| **A8** (V5) | `removeExitForSource` ×2 da mesma fonte × RACE_N | 1 compensação; perdedor `undefined` | **`[10-P5]`: 2 compensações (5/5)** |
| **A9** (V1 entrada) | entrada 10@3 ×2 sobre 10@1 | `avg_cost = 2.333333` | **`[10-P7]`: 2,0 (5/5)** |
| **A10** (V4 mesma fonte) | `createExitForSource` ×2 MESMA fonte × RACE_N | mesmo `id` nos dois; 0 × `25P02`; 1 linha | **`[10-P9]`: `25P02` em 10/10** |
| A11 [cross-tenant] | saída no item de T2 sob contexto de T1 | `undefined` (→ 400); 0 linhas em T2 | n/a (`[10-PRE]`: 0 linhas) |
| **A12 [I7 × open/abc]** | admin cru segura `FOR UPDATE` do item X 1,5 s (o que V1 v2 faz); B: `open()` real (entries `[Y,X]`) e, noutra rodada, `recalculateAbc()` real | 0 × `40P01`; B bloqueia e conclui após o commit | n/a (o head-base não trava; o controle vermelho do ciclo vive em **B8**) |
| A13 [forma] | saída simples; saída acima do saldo | movimento devolvido; 409 com o saldo atual | n/a (regressão) |
| **A14 [transitório → 503]** | admin segura `FOR UPDATE` do item por 5,5 s; B `createMovement` → e, em unidade, `mapTransientDbFailure` com os 3 formatos (`P2028`; `P2010`+`meta.code 40P01`; `DriverAdapterError` com `cause.code 40P01`) | B → `InventoryError` **503 `stock_busy`**, nada gravado; os 3 formatos → 503 | **`[10-TOK]`: `P2028` cru sobe** (a rota responderia 400 `BAD_REQUEST` com a mensagem do Prisma) |
### T-B `tests/inventory-cycle-count-close-units-db.test.ts` — V6/V7/V8 (fecha `Ω6R-DAT-003`, decisões d/j/k, A-03, A-06)

| caso | forma | verde | vermelho-controle (head-base) |
|---|---|---|---|
| B0 | postura + `read committed` + tag | como A0 | n/a |
| **B1 [encerramento]** | sessão 1 item (10 → 7); `close` ×2 (A e B) × RACE_N | 1 × 200 + 1 × 422 `invalid_status_transition`; **1** ajuste (−3); saldo 7; 0 dup | **`[10-P6]`: 2 × 200, 2 ajustes, saldo 4 (5/5)** |
| **B2 [retomável]** | 20 itens divergentes; `close` com falha injetada após 7 unidades (hook `onUnitApplied` lança) | sessão `fechando`, 7 ajustes, 7 carimbos; `cancel`/`recordEntry` → 422; `close` por B → `concluida`, 20 ajustes, 0 dup | classe P-021: head-base deixa `aberta` com ajustes parciais e `cancel` liberado (asserção: status `fechando` + `cancel` 422) |
| **B3 [recordEntry × fechamento]** | admin: tx crua `FOR UPDATE` sessão + CAS `fechando` + ajuste + carimbo + `concluida`, sem commit; B: `recordEntry` real (contado 5); barreira `fragment: "cycle_counts"`; admin commita | B → 422; entry `contado 7`, variance −3 | **`[10-E3-hb]`: B grava em 15 ms; final `contado 5 / variance −3 / concluida`** (1ª asserção = a entry final; no head-base B não bloqueia e a barreira nem é o que falha) |
| **B4 [cancel × fechamento aplicado]** | idem com B = `cancel` real | B → 422; sessão `concluida`, `is_active=true` | **`[10-E4-hb]`: `cancelada` + ajuste no ledger** |
| B5 [fechando é terminal p/ escrita] | sessão em `fechando` (B2); `recordEntry`, `cancel`, `close` da instância antiga | 422 ×2; `close` retoma | n/a (regressão de estado) |
| B6 [cross-tenant] | `close`/`cancel`/`recordEntry` da sessão de T2 sob T1 | 404; 0 linhas em T2 | n/a |
| B7 [legado P-021] | sessão `aberta` com 1 ajuste pré-gravado por SQL cru; `close` | reaproveita; 1 ajuste para o item, 200 | `[10-LEGACY]`; regressão (a guarda existe hoje) |
| **B8 [I7 — deadlock com controle embutido]** | (i) **controle**: emulação do desenho v1 em SQL cru (sessão + X + Y `FOR UPDATE`, hold 1,5 s) × `open()` real e × `recalculateAbc()` real → tem de dar **`40P01`**; (ii) código real v2: `close` com hook segurando o item X 1,5 s × `open()` e × `recalculateAbc()` | (i) `40P01` observado (o detector funciona); (ii) 0 × `40P01`, ambos concluem | **`[10-LO-old]` = (i)**; o head-base real não trava (o controle é a emulação) |
| B9 [duas sessões cruzadas] | `[X,Y]` e `[Y,X]` fechadas em paralelo, hold 300 ms por item | as duas `concluida`, 2 ajustes cada, 0 × `40P01` | `[10-V6V6]` |
| B10 [tamanho] | N=250 itens divergentes; `close` | `concluida`, 250 ajustes, 250 carimbos, 0 dup; duração total e p95 por unidade logados na ata | **`[16-E5-hb]` N=10 000: head-base `P2028` em `applyClose`, sessão `aberta`** (o dev registra; a CI usa N=250) |
| B11 [409 no meio + retomada] | 3 itens; o 2º (ordem `itemId`) fica com saldo 0 após o snapshot | 409 `insufficient_balance`; 1 ajuste aplicado, sessão `fechando`; `entrada` no item → `close` → `concluida`, 3 ajustes | classe P-021 (parcial + `aberta`); asserção: `fechando` + `cancel` 422 |
| B12 [listagem] | `GET ?status=fechando` pela rota (memória e Prisma) | 200 com a sessão | head-base: 400 `invalid_status` |
### T-C `tests/inventory-unique-backstops-db.test.ts` — os dois backstops de banco + censo (I2/I3 para escritor cru)

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C1 | SQL cru: 2 INSERTs com o mesmo `reverses_movement_id` (tenant próprio) | 2º → `23505` nomeando `stock_movements_reversal_active_key` | **`[10-P3]`: coexistem** (só `@@index`) |
| C2 | SQL cru: 2 INSERTs com o mesmo `(cycle_count_id, item_id)` | 2º → `23505` nomeando `stock_movements_cycle_count_item_key` | **`[10-P6]`: coexistem** |
| C3 | N INSERTs com `reverses_movement_id`/`cycle_count_id` NULL | todos aceitos (parciais) | regressão (`[10-IDX]` 3 aceitos) |
| C4 [drill up→down→re-up] | `DROP INDEX` ×2 extraídos por regex do rodapé do `.sql` (nunca digitados) → C1/C2 viram aceitos → `CREATE UNIQUE INDEX` ×2 extraídos do `.sql` → `23505` de novo; `pg_indexes` 2→0→2 | as três medições | é o próprio drill (`[10-IDX]` drill 2→0→2→0) |
| C5 [censo fail-closed] | índices derrubados (C4); semear 1 estorno duplicado + 1 ajuste duplicado em tenant próprio; executar o bloco `DO $censo$` extraído do `.sql` | `RAISE` `P0001` citando `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`, "2 grupo(s)" e os dois ids (movimento; contagem+item) — **sem `tenant_id` no texto**; remover por `tenant_id` próprio → o bloco roda mudo; re-up | `[10-IDX]`: "20 grupo(s)" com amostra; mudo depois |
| C6 [script do censo] | ler `scripts/inventory-duplicates-census.sql`; regex fail-closed (`INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE` → falha); executar contra o descartável com 1 grupo semeado | linhas com `tipo`, `chave_1`, `chave_2`, `linhas`, `movimentos`; sem mutação (contagem antes = depois) | n/a (arquivo novo) |
| C7 [mapeamento V3] | compensação de `m` semeada por SQL cru; `repo.reverseMovement(m)` pelo papel | 409 `movement_already_reversed`, sem `25P02` | head-base: 2ª compensação aceita |
| C8 [mapeamento V5] | idem para `removeExitForSource` | `undefined`, sem `25P02` | head-base: aceita |

### T-D `tests/inventory-write-paths-guard.test.ts` — memória; CE-G1 (enumeração fail-closed gerada do fonte; default negar)

| caso | forma (enumeração gerada do código real) | verde | mutação que o deixa vermelho |
|---|---|---|---|
| **D1 [universo de escritores de `stock_movements`]** | varre `src/**/*.ts`, `prisma/**/*.ts`, `scripts/**/*.{ts,mts,mjs,sql}` por `stockMovement\.(create|createMany|upsert|update|updateMany|delete|deleteMany)\(` e `(INSERT INTO|UPDATE|DELETE FROM)\s+"?(public\.)?"?stock_movements`; **allowlist literal**: `{ "src/modules/inventory/inventory-prisma.repository.ts": { method: "insertMovement", count: 1 }, "prisma/seed-fleet.ts": "semente (fora do runtime; 2 entrada + 1 consumo; sem estorno/contagem)" }`; publica o universo na mensagem | universo = exatamente a allowlist (`[05]`: `:436` + `seed-fleet.ts:171-173`) | acrescentar `this.client.stockMovement.createMany(` em qualquer arquivo → vermelho (membro sem classificação = negar) |
| **D2 [lock antes de decidir; um lock por tx]** | isola `PrismaInventoryRepository`; para cada método cujo corpo contém `this.insertMovement(` ou `avg_cost:` exige: `this.lockItemForUpdate(` presente, **antes** da primeira ocorrência de `saldoOf`/`saldoOfCustody`/`hasReversalOf`/`findExitBySource`/`isExitReversed`, **exatamente 1** ocorrência, e **antes** de qualquer `for (`/`while (`/`.map(`/`.forEach(` do corpo; nenhuma chamada às versões SEM lock após o lock | universo ⊇ {createMovement, createTransfer, reverseMovement, createExitForSource, removeExitForSource} e todos conformes | apagar o lock de `createTransfer`; ou pôr um 2º `lockItemForUpdate` dentro do `for` de `reverseMovement` → vermelho |
| D3 [token] | a declaração de `insertMovement` e das 4 leituras `*Locked` lida do fonte contém o parâmetro tipado `ItemWriteLock` | sim | remover o parâmetro → vermelho (e `npm run check`) |
| **D4 [V6 só por unidades]** | `cycle-count.service.ts`: dentro de `close`, `.createMovement(` e `.stampEntry(` aparecem **só** dentro de `uow.run(`; `beginClose(` e `finishClose(` aparecem **fora** de `uow.run(`; `applyClose` não existe em `src/modules/inventory/**` | sim | envolver o laço inteiro num único `uow.run` (tx única) → vermelho; ressuscitar `applyClose` → vermelho |
| **D5 [toda transição de status é CAS]** | enumera por regex, em `cycle-count-prisma.repository.ts`, todo `cycleCount.update*(`/`UPDATE cycle_counts` e exige `status:` (ou `AND status =`) no `where` de cada um | universo = {beginClose, finishClose, cancelSession} (3) e todos com precondição | um `updateMany` de `status` sem `status` no `where` → vermelho |
| D6 [P2002 fora da tx] | em `PrismaInventoryRepository`, nenhum método que chame `insertMovement` contém `isUniqueViolation(`; os wrappers `Rls*` de `reverseMovement`/`createExitForSource`/`removeExitForSource` contêm | sim | devolver o `catch` para dentro de `createExitForSource` → vermelho |
| **D7 [503 em todo wrapper]** | conta os métodos públicos de `RlsPrismaInventoryRepository`, `RlsPrismaCycleCountRepository` e `PrismaInventoryUnitOfWork.run` (regex por `^\s{2}\w+\(`) e exige que cada corpo passe por `mapTransientDbFailure(`/`guardTransient(` | contagem = contagem | um wrapper novo sem o mapeamento → vermelho |

**Contagem prevista:** T-A 16 (A0–A14 + A7b) · T-B 13 (B0–B12) · T-C 8 · T-D 7 = **44 casos novos**, todos com execução real; os 67 de
memória `[03]` permanecem 67. **Cada mutação de T-D é executada UMA vez pelo dev** (ata: caso → mutação → linha vermelha → revert).
Hooks de teste no serviço (B2/B8/B11/A12): um parâmetro opcional `hooks?: { onUnitApplied?(n: number): Promise<void> }` no
`CycleCountService.close` (só o teste o passa; a rota não) — sem "andaime" em produção, sem flag de ambiente.
## 7. CE-G1 e CE-G2 (§5.6 do `docs/revisoes/SAN3/PLANO_SAN3.md` `[09]`)

**CE-G1 — enumeração fail-closed.** Os guards citados no teste de encerramento são T-D (D1, D2, D4, D5, D7) e o censo da migração (§4).
(a) **Fonte da enumeração, gerada por script do código real:** D1 varre `src/**`, `prisma/**` e `scripts/**` pelo padrão de escrita em
`stock_movements` (ORM e SQL cru) — nunca lista curada; o universo medido hoje é `{ inventory-prisma.repository.ts:436 (insertMovement),
prisma/seed-fleet.ts:171-173 (semente) }` `[05]` e o teste o **publica** na mensagem de sucesso; D2 enumera os métodos do repositório
pelo corpo (quem chega a `insertMovement`/`avg_cost`); D5 enumera as transições de `cycle_counts.status` pelo fonte; D7 enumera os
wrappers por assinatura; o censo da migração enumera os grupos duplicados pelo dado real. (b) **Default do membro não previsto: negar** —
escritor novo de `stock_movements` fora da allowlist reprova D1; método novo que chegue a `insertMovement` sem `lockItemForUpdate` (ou com
dois) reprova D2 e o compilador nega antes (`ItemWriteLock`); transição de status sem precondição reprova D5; wrapper sem mapeamento
reprova D7; duplicata de legado aborta a migração (nunca deduplica). (c) **Mutação que deixa o guard vermelho** (uma por guard, executada
e registrada na ata): `stockMovement.createMany(` em arquivo novo (D1); apagar o lock de `createTransfer` / 2º lock dentro do `for` de
`reverseMovement` (D2); remover o parâmetro do token (D3); laço inteiro num `uow.run` único ou `applyClose` ressuscitado (D4); `updateMany`
de status sem `status` no `where` (D5); `catch` de P2002 dentro da tx (D6); wrapper novo sem `mapTransientDbFailure` (D7); no censo,
o bloco `DO` extraído do `.sql` roda mudo sem duplicata e aborta com uma (C5).

**CE-G2 — papel × passo.** Nenhum caso `-db` atravessa uma rota: o lock e o CAS vivem abaixo da permissão e o ator passado ao serviço é
`{ tenantId, userId, roles: [], permissions: [] }` (o repositório e o `CycleCountService` não comparam permissão — `cycle-count.service.ts` não
importa `requirePermission`; a comparação é só nas rotas `[04]`). B12 (listagem por `?status=fechando`) e as regressões em memória
(`inventory-cycle-counts-routes.test.ts:194-231`) atravessam rotas com papéis de APLICAÇÃO: `manager` tem `stock_movements:create`
(`catalog.ts:534`) e `cycle_counts:create` (`:537`); `operator` (`:775/:778`) e `inventory` (`:882/:885`) idem; `cycle_counts:read` para o GET (`viewer :717`, `finance :828`; `auditor` nenhuma);
a rota compara **exatamente** `stock_movements:create` (`inventory.routes.ts:119,129`) e `cycle_counts:create`/`:read`
(`cycle-count.routes.ts:41,49,57,65,73,81`) `[04]`. Papel de **BANCO** nos drills: efêmero `NOSUPERUSER`, `rolbypassrls=false` (asserido por
`pg_roles` `[10-PRE]`), com `GRANT SELECT, INSERT, UPDATE, DELETE` — `FOR UPDATE`/`FOR SHARE` exigem `UPDATE`/`SELECT` e os têm; as policies
`USING`+`WITH CHECK` sem cláusula `FOR` valem para ALL — **provado por execução**: `FOR UPDATE` do item, `FOR UPDATE` e `FOR SHARE` da sessão
→ 1 linha com contexto, 0 sem, 0 com contexto de outro tenant; CAS de `cancel` sem contexto / outro tenant → 0 linhas `[10-PRE]`.
## 8. Escopo permitido e proibido — arquivo a arquivo (carrega as emendas 1-a/b/c e 2-g/l dentro de si; nada de "só com ratificação")

**PERMITIDO (e só isto):**
- `src/modules/inventory/inventory-prisma.repository.ts` — `lockItemForUpdate`, `ItemWriteLock`, leituras `*Locked`, V1–V5, `mapTransientDbFailure`
  (+ uso em todo wrapper `Rls*`), mapeamento de P2002 nos wrappers de `reverseMovement`/`createExitForSource`/`removeExitForSource` (fora da tx).
- `src/modules/inventory/inventory.types.ts` — **só** `transferGroupInconsistentError()` (409) e `stockBusyError()` (503).
- `src/modules/inventory/cycle-count.types.ts` — `CYCLE_COUNT_STATUSES` += `"fechando"`; tipos `BeginCloseOutcome`, `RecordEntryOutcome`,
  `CancelOutcome`, `FinishCloseOutcome`, `StampEntryInput`; `cycleCountBusyError()` (503); `closeIncompleteError()` (409).
- `src/modules/inventory/cycle-count.repository.ts` — interface (`beginClose`, `lockSessionForUpdate`, `findEntry`, `stampEntry`, `finishClose`,
  `recordEntryCount`/`cancelSession` com outcome; **sem** `applyClose`) + in-memory com a mesma máquina de estados.
- `src/modules/inventory/cycle-count-prisma.repository.ts` — os métodos acima (`FOR UPDATE`/`FOR SHARE` tagged; CAS por `status` no `where`);
  wrapper `Rls*` com `mapTransientDbFailure`.
- `src/modules/inventory/cycle-count.service.ts` — `close` por unidades (porta + hooks de teste opcionais), `recordEntry`/`cancel` mapeando
  outcomes; construtor com a porta; fábricas (`:245-281`).
- `src/modules/inventory/cycle-count.validators.ts` — nada a mudar se `parseOptionalStatus` continuar lendo `CYCLE_COUNT_STATUSES` (`:59-64`);
  tocar **só** se o dev medir que precisa.
- `src/modules/inventory/inventory-uow.ts` (NOVO) · `src/modules/inventory/inventory-uow-prisma.ts` (NOVO) · `src/modules/inventory/index.ts` (export, se preciso).
- `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (NOVO; os DOIS índices — emenda 1-a ratificou o 2º) ·
  `prisma/schema.prisma` (**só comentário** junto da l.1508; nenhum atributo).
- `scripts/inventory-duplicates-census.sql` (NOVO; somente leitura — emenda 2-g, autorizado nominalmente).
- `tests/inventory-balance-lock-race-db.test.ts` · `tests/inventory-cycle-count-close-units-db.test.ts` · `tests/inventory-unique-backstops-db.test.ts` ·
  `tests/inventory-write-paths-guard.test.ts` (NOVOS).
- `.github/workflows/ci.yml` — **só** 3 linhas `SUITES="$SUITES tests/<suíte -db>.test.ts"` + 1 bloco de comentário no formato das vizinhas,
  **depois da l.249** (`tests/financial-entry-delete-reverse-race-db.test.ts`) e **antes da l.250** (`node --test --import tsx $SUITES`) `[12]`
  — o "lugar reservado" foi consumido (N-02); a `P-O6R-B04-SUITES-LIST-CI` **não nasce** (emenda 1-c).
- `docs/revisoes/O6R/achados.jsonl` — **só** as 2 linhas `Ω6R-DAT-002` e `Ω6R-DAT-003`: `"status": "fechado"`, `"fechado_por": "B-O6R-04a (PR
  na autoria; nº e hash no backfill pós-merge — §C3.5)"`, `"fechado_em": "<data do PR>"`, `"evidencia_fechamento": "<1 parágrafo: lock/CAS/
  unidades/índices + suítes>"` — a forma exata do #385 antes do backfill `[13]`; sem hash → o guard `kpi-achados-paridade` os conta como
  "fechados na autoria (aguardando merge)" e **não** os soma em `p0_fechados`.
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` — **só** as 2 seções `### [Ω6R-DAT-002]`/`### [Ω6R-DAT-003]`: linha `- Status: **fechado** em <data>
  pelo \`B-O6R-04a\` (PR na autoria; nº e hash no backfill pós-merge — §C3.5).` + parágrafo do conserto (forma do `[Ω6R-DIN-005]:120` no #385 `[13]`).
- `agent-orchestration/**` (comando, atas, pendências, log) · `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js`
  (só o fallback congelado via `kpi-freeze.mjs`), `Kpis/index.html` se a hidratação exigir. Em `kpis-latest.json`: `production_readiness.p0_fechados`
  **fica 13** e `fechados` **inalterado** (só na main conta — guard `:158-190` `[13]`); `roadmap.blocos[B-O6R-04].estado` → `"parcial"` (valores
  válidos `concluido|a_fazer|parcial` `[13]`; `QUA-002` segue `ativo` para o 04b).

**PROIBIDO (o dev reporta, não decide — rito 3):** `src/modules/inventory/inventory.service.ts`, `inventory.repository.ts` (in-memory de
estoque), `inventory.routes.ts`, `inventory.controller.ts`, `cycle-count.routes.ts`, `cycle-count.controller.ts`, `inventory.calculations.ts`,
`inventory.abc.ts` (no módulo, mas **fora da necessidade** — tocá-los é divergência a reportar); `src/modules/mobile/**` (04b),
`src/modules/fuel-logs/**`, `src/modules/maintenance-orders/**`, `src/modules/checklists/**`, `src/database/**` (o `withTenantRls` NÃO ganha opções;
o timeout global NÃO sobe — emenda 2-h), `src/modules/core-saas/**` (o `sendRouteError` não muda — o 503 nasce como erro de domínio),
`tests/helpers/**` (só consumo), `frontend/**`, `mobile/**`, `API_CONTRACTS.md`, `RBAC_MATRIX.md`, `.env`, lockfiles, qualquer outra migração,
qualquer outra linha de `.github/workflows/**` e de `docs/**`. Migração destrutiva = parada irredutível (§C7.5).
## 9. Baseline N · meta M ≥ 2N · KPI no PR

**N medido `[03]`:** as 7 suítes de estoque em memória = **67/67** (0 fail, 0 skip, ec 0); suítes `-db` que exercem o ledger de estoque
= **0** (nenhuma das 7 lê `DATABASE_URL`). Valor oficial de `backend_tests` = **2995/2997** (`Kpis/kpis-latest.json`, release `pr 385`; os 2
skips são os do orçamento `SKIP_BUDGET_DB = 2`, `run-backend-tests.mjs:82` `[13]`); `blocks_completed` = 163; history com 158 entradas.

**Meta M:** N sob Postgres é 0 → a meta vira piso absoluto: **≥ 40 casos `-db`/guard novos** (§6 prevê 44), **≥ 2 casos por via** das 8 do
mapa (V1: A1,A2,A4,A5,A9,A13,A14 · V2: A3,A7b · V3: A7,A7b,C7 · V4: A6,A10 · V5: A8,C8 · V6: B1,B2,B8–B11 · V7: B3,B5 · V8: B4,B5), **67 → 67**
em memória sem morte, e `backend_tests` **≥ 3039/3041** na forma canônica 3 (`DATABASE_URL` presente: 2997 + 44; os 2 skips permanecem).
Sem `DATABASE_URL` (forma 1): +7 pass (T-D) e +3 skips declarados (um por arquivo `-db`).

**KPI no PR (§C3):** `backend_tests` com N e forma do §10 passo 3 (nota com o passo 4 e a tripla execução); `blocks_completed` 163 → 164;
`status: published_per_pr`; `pr` após `gh pr create`; `merge_commit`/`approved_head` `null` na autoria. `production_readiness`:
`p0_fechados` **13** (só na main conta — guard `kpi-achados-paridade.test.ts:158-190`), `fechados` inalterado, `deploy_bloqueado: true`
mantido; `roadmap.blocos[B-O6R-04].estado` → `"parcial"` (DAT-002/003 fechados na autoria; QUA-002 segue `ativo`). **Se este for o
primeiro PR de execução a mergear depois do #386**, carrega as dívidas do #386 (emenda 1-f: hoje estão no `B-SAN3-04a`; se este ficar
pronto antes, o orquestrador as acrescenta aqui — o dev não decide). A visão gráfica hidrata dos JSON — nada cravado em `app.js`
(`kpi-freeze.mjs --check` verde).
## 10. Bateria de validação (forma exata, N esperado, `ec` lido do processo)

1. `DATABASE_URL=postgresql://x npm run db:generate && npm run check` → ec 0 (o token `ItemWriteLock`, os outcomes e o status `fechando` são checados aqui).
2. `npm run lint` → ec 0.
3. `npm test` (`CORE_SAAS_PERSISTENCE` não exportado → runner assume `memory`; `DATABASE_URL` do cluster descartável exportado = forma canônica 3)
   → **≥ 3039 pass · 0 fail · 2 skipped**; a linha "modo resolvido" do runner colada na ata.
4. `DATABASE_URL=<descartável> CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/inventory-balance-lock-race-db.test.ts
   tests/inventory-cycle-count-close-units-db.test.ts tests/inventory-unique-backstops-db.test.ts` → **37 pass · 0 fail · 0 skip**, **3 execuções
   idênticas com o banco RECRIADO antes de cada** (`DROP DATABASE … WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`).
5. `node --test --import tsx tests/inventory-write-paths-guard.test.ts` → 7/7; depois **cada mutação de T-D (D1–D7) executada e revertida**
   (saída vermelha colada na ata; `git diff --stat` vazio ao fim).
6. Regressão focada: as 7 suítes de estoque (comando de `[03]`) → 67/67; `tests/financial-*-db.test.ts`, `tests/o6r06-*-db.test.ts`,
   `tests/pg-barrier-scoped-db.test.ts`, `tests/checklist-run-*-db.test.ts` contra o mesmo cluster → inalteradas (o lock não toca essas tabelas).
7. `npm run build` → ec 0 · `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · `node --test --import tsx
   tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts` → verdes · `git diff --check`.
8. Migração: `prisma migrate deploy` no descartável → `SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN
   ('stock_movements_reversal_active_key','stock_movements_cycle_count_item_key')` = 2 linhas com os `WHERE (... IS NOT NULL)`; T-C4 automatiza
   up→down→re-up; T-C5 o censo. `psql -f scripts/inventory-duplicates-census.sql` no descartável → 0 linhas (N publicado na ata **com a
   ressalva** de que o N que importa é o de staging/produção — ato do dono, §13-1).
9. **Vermelho-controle no head-base, executado:** worktree descartável em `63dd45bb` (`git worktree add <dir> 63dd45bb`, **`npm ci` próprio** —
   junction proibida, §C7.1-ter(c)), copiar só as 4 suítes novas, cluster recriado, rodar os passos 4–5 → esperado vermelho em A1, A2, A7, A8,
   A9, A10, A14, B1, B2, B3, B4, B8(ii não — só (i) verde/ii n/a), B11, B12, C1, C2, C4, C5, C7, C8 e no guard D1..D7 (o código não existe); colar
   `# pass/# fail` na ata; `git worktree remove --force`.
10. Sizing (emenda 2-h), registrado na ata pelo dev com o código REAL (não a emulação): `close` de N = 250 / 500 / 1000 / 10 000 itens divergentes
    no descartável, com duração total, média e p95 por unidade, e o head-base como controle nos mesmos N (script de medição em
    `agent-orchestration/omega/planos/apoio/` ou no scratchpad da ata; **não** vira teste de CI acima de 250).
11. CI: os 3 arquivos `-db` na lista `SUITES` do job `backend-postgres` (`ci.yml`, após a l.249) e o guard "Fail on skipped tests" verde (0 pulos).
12. Limpeza §C5: `docker rm -f <cluster do bloco>`, worktree descartável removido, `dist/`, `coverage/`, `*.tsbuildinfo` — em 1 linha.
## 11. Riscos · rollback

| # | risco | mitigação / prova |
|---|---|---|
| R1 | o lock do item serializa TODAS as custódias do mesmo item (throughput) | tx curtas (1 `FOR UPDATE` + ≤ 2 `aggregate` + ≤ 2 `INSERT`); medido: 20 saídas concorrentes em 127–152 ms `[10-V1]`; A1 publica o tempo |
| R2 | perdedor esperando o lock estoura o timeout da tx interativa (5 s → `P2028`) | NÃO subir timeout global (emenda 2-h); unidades ≈ 15–20 ms `[16-E5]`; A1/B1 asserem 0 × `P2028`; quando ocorrer, **503 `stock_busy`** com nada gravado (A14) — nunca 400 cru |
| R3 | o censo da migração ABORTA o deploy se houver duplicata de legado em staging/produção | fail-closed por desenho (zero mutação, nunca deduplica); SQL do censo somente leitura entregue; roteiro §4.3; **ato do dono antes do deploy** (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`); o merge não depende, o deploy sim; abre a trava de `prisma/` (`04a → 03a → …`) — por isso o censo é a 1ª pendência da ata |
| R4 | `FOR UPDATE` bloqueia `updateItem`/`applyAbcClasses`/`open` do mesmo item por instantes | aceito; medido: B bloqueia e conclui após o commit (`[10-LO]`), sem deadlock |
| R5 | deadlock V6 × V1–V5 / V6 × open / V6 × abc / V6 × V6 | **I7** (um item por tx; sessão antes do item) — `[10-LO]` 0 × `40P01` no desenho, `40P01` no controle; B8/B9/A12 |
| R6 | fechamento grande demora (N=10 000 ≈ minutos) e o cliente HTTP desiste | estado `fechando` persistido e **retomável** (`[10-CRASH]`); `close` de novo continua de onde parou; o head-base **nem fecha** N=10 000 (`P2028` em `applyClose` `[16-E5-hb]`) |
| R7 | sessão presa em `fechando` por 409 recorrente (saldo mudou depois do snapshot) | via de saída documentada (corrigir saldo → `close` retoma); "abandonar" compensando = pendência com dono (§13-4); hoje o equivalente é `aberta` com ajustes parciais e `cancel` liberado — pior |
| R8 | status `fechando` chega ao frontend | adapter mapeia desconhecido → "Aberta" (`cycle-counts.adapter.ts:128`) e trata 422 (`:177-181`); pendência §13-3 com dono; nenhum crash medido no código lido |
| R9 | o dublê em memória da porta não prova atomicidade | declarado no cabeçalho; a prova é T-B; a regressão de memória só garante contrato (67 → 67) |
| R10 | sessões `aberta` com ajustes parciais gravados ANTES do bloco (P-021) | reaproveitamento sob o lock, na unidade `[10-LEGACY]`; B7 |
| R11 | releitura na tx abortada (`25P02`) reaparece noutra via | D6 + A10 + C7/C8; os wrappers mapeiam `23505`/P2002 FORA da tx |
| R12 | `FOR UPDATE`/`FOR SHARE` sob RLS exigem `UPDATE`/`SELECT` para papéis de aplicação futuros sem esse grant | hoje a app conecta como dono; papel de menor privilégio é assunto do `B-O6R-12` — anotar lá |
| R13 | colisão de timestamp de migração com PR paralelo | `gh pr list` = `[]` hoje `[08]`; conferir no dia do PR; renomear é aditivo |
| R14 | `assertApplicationNamePropagated` falhar para o cliente do papel | medido: a tag sobrevive ao `buildConnectionStringForRole` (`plan3-A`/`plan3-B` em `pg_stat_activity` `[10-PRE]`) |
| R15 | `mapTransientDbFailure` engolir erro determinístico como transitório | detecta só por CÓDIGO (lista fechada, espelho de `checklist-prisma.repository.ts:1171-1195`); tudo o mais sobe como hoje; A14 cobre os 3 formatos |

**Rollback:** código = revert do squash (nenhuma outra árvore toca esses arquivos até `03a`, §6 do SAN3); migração = os dois `DROP INDEX IF
EXISTS` do rodapé (não-destrutivo, provado em T-C4 e `[10-IDX]` drill 2→0→2→0); nenhuma coluna/dado alterado; o índice antigo
`stock_movements_tenant_id_reverses_movement_id_idx` fica; sessões que estiverem em `fechando` no momento do revert ficam com um status que
o código antigo trata como "não aberta" (422 em tudo; `[10-CRASH]` mostrou o `close` antigo recusando `fechando`) — o rollback exige
concluir os `fechando` pendentes ANTES (1 `close` por sessão) ou aceitar 422 até o re-deploy; anotado na ata como condição de rollback.
## 12. Composição proposta da junta — **unanimidade de 3** (o bloco toca perda de dado; §C7.1-ter(b)); `critico-adversarial` antes (rodada 2 = última)

| cadeira | papel | o que julga por execução |
|---|---|---|
| 1 — banco e concorrência | `jurado-06-banco-atomicidade-rls` (suplente `jurado-06-suplente-banco-atomicidade-rls`) ou `jurado-c5-banco-fk-triggers` | `FOR UPDATE` × `KEY SHARE` (A2), I7 e o controle embutido (B8/B9/A12), barreiras B3/B4, retomada B2/B11, censo e drill C4/C5, RLS sob papel efêmero (A11/B6), `read committed` pinado, sizing (passo 10) reexecutado |
| 2 — diff × plano e invariante | `jurado-c5-validador-diff-plano` (suplente `jurado-c5-suplente-validador-diff-plano`) | cada via do §2.2 tem lock/CAS no diff; um lock por tx; D1–D7 enumeram pelo fonte e as 7 mutações foram executadas; escopo §8 respeitado; nada em `inventory.service.ts`/`src/database/**`; `applyClose` não existe; 503 nasce como erro de domínio |
| 3 — contrato, regressão e KPI | `jurado-06-contrato-regressao-kpi` (suplente `jurado-06-suplente-contrato-regressao-kpi`) | 67 → 67; consumidores fuel/maintenance intactos (409/422/503); `fechando` na listagem; achados em "fechado na autoria" sem hash e `p0_fechados` = 13; `backend_tests` reexecutado com N e forma; tripla execução; linhas do `ci.yml` só as 3 + comentário; dívidas do #386 conforme a emenda 1-f |

**Aviso medido `[14]`:** `git ls-tree origin/main .claude/agents/especialistas/` tem **2** arquivos (`jurado-san3c2-*`); os seis acima existem
só na árvore da sessão (`.claude/agents/especialistas/`, 14 arquivos `jurado-06-*`/`jurado-c5-*`/`critico-c5-*`). O
`inspetor-de-terreno-da-junta` confere por nome; ausentes na ref, a `agente-fabrica` os cria (ciclo 1–2, §C7.4) ou a cadeira é ocupada por
papel permanente com declaração na ata. Rito: inspetor libera antes (worktree + `npm ci` + cluster `postgres:16` por jurado, porta fora das
faixas excluídas do Windows `[02]`; base viva intocada; S0 do espelho Codex); quem acha ≠ quem planeja ≠ quem conserta (§C7.4-bis); o dev é
distinto deste planejador; toda reprovação volta a este papel em **Fable**.
## 13. Pendências que NASCEM neste bloco (com dono) — e as que NÃO nascem

1. **`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` — dono: ato do dono (emenda 2-g).** Rodar `scripts/inventory-duplicates-census.sql` em staging
   (`STAGING_DATABASE_URL`) e produção (`PROD_DATABASE_URL`) **antes do próximo deploy** de cada uma; N = 0 → deploy livre; N > 0 → decisão
   humana por grupo (qual compensação/ajuste vale; o outro é estornado por movimento compensatório, nunca apagado) e só então o deploy. O
   merge do bloco **não** depende; o deploy, sim (a migração é fail-closed e abre a trava de `prisma/`). Entra na recontagem do `B-SAN3-10`
   (§4.2 do plano SAN3: eram 6). Registro: `agent-orchestration/controle/pendencias.md`, com o roteiro do §4.3 e o precedente `[10-IDX]`
   (o head-base produz o dado que aborta os dois índices em toda corrida).
2. **`P-O6R-B04-CONSUMIDORES-503` — dono: `B-O6R-04b`/frontend de estoque (a designar pelo orquestrador).** O 503 `stock_busy`/`cycle_count_busy`
   é novo no contrato; o frontend e o app tratam 503 genericamente hoje (não medido neste plano — hipótese); registrar em `API_CONTRACTS.md`
   (fora do escopo deste bloco) e conferir a mensagem ao usuário.
3. **`P-O6R-B04-UI-STATUS-FECHANDO` — dono: bloco de frontend de estoque (a designar; sugestão: o próximo `B-SAN3-*` que tocar
   `frontend/src/modules/inventory/**`).** `CycleCountStatus` do frontend (`cycle-counts.types.ts:7`) não conhece `fechando`; o adapter mapeia
   para "Aberta" (`cycle-counts.adapter.ts:128`) e a aba de status (`EstoquePage.tsx:77,1262`) não a lista. Comportamento até lá: chip "Aberta",
   ações recusadas com 422 e a mensagem já existente ("Recarregue a lista", `:177-181`). Levar o valor novo a `API_CONTRACTS.md` no mesmo bloco.
4. **`P-O6R-B04-ABANDONO-DE-FECHAMENTO` — dono: a designar pelo orquestrador (estoque, backend).** Sessão em `fechando` presa por 409 recorrente
   só sai pela correção do saldo; "abandonar" compensando os ajustes já aplicados (movimentos compensatórios, ledger imutável) é funcionalidade
   nova. Hoje o equivalente (`aberta` com ajustes parciais + `cancel` liberado) é pior — a pendência é melhoria, não regressão.
5. **Nota para `B-O6R-12` (papel de menor privilégio):** `FOR UPDATE`/`FOR SHARE` exigem `UPDATE`/`SELECT` nas 3 tabelas para o papel da aplicação.
6. **Nota final para o orquestrador (classe, fora deste bloco):** `sendRouteError` (`src/modules/core-saas/routes/http.ts:51-59`) responde **400 `BAD_REQUEST` com `error.message` cru** a qualquer `Error` sem `statusCode` — medido com `P2028` e `40P01` `[10-TOK]`: a mensagem carrega texto de invocação/query do Prisma (§B2.8). Este bloco fecha a instância no módulo de estoque (503 de domínio, §3.6); a classe (todo módulo cujo erro de banco suba cru) é candidata a pendência transversal com dono — decisão do orquestrador, não deste plano.

**Não nascem (emendas 1-c, 1-e, 2-l):** `P-O6R-B04-SUITES-LIST-CI` (as linhas entram no `ci.yml` neste bloco); journal em memória da porta (só se a
junta exigir); `P-O6R-B04-AJUSTE-SEM-BACKSTOP-DE-BANCO` (o 2º índice está ratificado e entra); `P-O6R-B04-ESTORNOS-DUPLICADOS-LEGADO`/
`-AJUSTES-DUPLICADOS-LEGADO` da v1 (substituídas pela 1). **Fecham na autoria:** `Ω6R-DAT-002`, `Ω6R-DAT-003` (emenda 1-b); `P-020` (absorvida
por `P-O6R-B04`, `pendencias.md:243-253`) e `P-021` (`:256-266`) ganham a linha "fechada na autoria pelo B-O6R-04a; backfill pós-merge".
`P-O6R-B04` (`:2833`) fica **parcial** (QUA-002 é do 04b).
## 14. Registro de medições (comando → saída relevante) — cronológico, todas executadas por esta instância (2026-09-17/18)

- **[00]** `MSYS_NO_PATHCONV=1 git -C .../worktrees/b04a show origin/main:.claude/agents/planejador-mestre.md` → frontmatter `model: fable`,
  tools Read/Grep/Glob/Bash; parágrafos `D-FALLBACK-MODELO-FABLE-OPUS` (2026-09-07/08) e `D-PLANEJADOR-MODELO-FABLE` (2026-08-11).
- **[01]** `git rev-parse HEAD` = `63dd45bb741b…`; `git log --oneline -5` = `63dd45bb` (parecer r1 + emenda 2) · `b72fd626` (plano v1) ·
  `65ac41dc` (comando) · `02bd7dab` (#386); `git merge-base HEAD origin/main` = `02bd7dab…`; `git status --short | wc -l` = **0** no início,
  após a fase A, após a E5 e ao fim.
- **[02]** `docker start plan-b04a-pg` → `ports are not available: 0.0.0.0:56544 … proibida pelas permissões`; `netsh interface ipv4 show
  excludedportrange protocol=tcp` → 56500-56599 … 57207-57306 excluídas (tentativas 56701/56801/57001 falharam). `docker rm -f plan-b04a-pg`;
  `docker run -d --name plan-b04a-pg -e POSTGRES_USER=plan -e POSTGRES_PASSWORD=plan -e POSTGRES_DB=erp_plan_b04a -p 58544:5432 postgres:16` →
  `pg_isready` OK; `DATABASE_URL=postgresql://plan:***@localhost:58544/erp_plan_b04a?schema=public npx prisma migrate deploy` → "All migrations
  have been successfully applied"; `psql`: `_prisma_migrations` = **107** · `default_transaction_isolation` = `read committed` · `deadlock_timeout` =
  `1s` · `stock_movements` = 0. `@prisma/client` **7.8.0**; `grep -o "timeout:s.transactionOptions?.timeout??5e3" node_modules/@prisma/client/runtime/client.js`
  → 1 match (**5000 ms**). `docker ps -a`: `bsan301-pg`, `pastrack-*` Up; `erp-postgres`, `erp-redis`, `erp-postgres-alt`, `dev-bsan304a-pg`
  Exited — nenhum recebeu comando.
- **[03]** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/{inventory-abc,inventory-cycle-counts-routes,
  inventory-items-routes,inventory-stock-decrement,inventory,stock-custody,stock-movements-routes}.test.ts` → `# tests 67 · # pass 67 · # fail 0
  · # skipped 0`, ec=0.
- **[04]** `grep -n requirePermission src/modules/inventory/inventory.routes.ts` → `:111` read, `:119` create (`POST /stock-movements`), `:129` create
  (`/:movementId/reverse`), `:137` read; `STOCK_MOVEMENT_PERMISSIONS` `:24-26`. `cycle-count.routes.ts` → `:41` read (GET list), `:49` create (POST),
  `:57` read (GET id), `:65` create (PATCH entry), `:73` create (close), `:81` create (cancel); `CYCLE_COUNT_PERMISSIONS` `:18-20`. `catalog.ts`: blocos
  `manager:414 · technician:579 · field_dispatcher:628 · viewer:676 · operator:730 · finance:809 · inventory:873 · field_technician:895 · auditor:944 ·
  support:1014`; `stock_movements:create` `:534/:775/:882`; `cycle_counts:create` `:537/:778/:885`; só `:read` em `:715/:717` (viewer) e `:826/:828`
  (finance); nenhuma das quatro em `auditor`/`support`.
- **[05]** Censo (comandos do §2.1): ORM em `stock_movements` → `inventory-prisma.repository.ts:436`; `prisma/seed-fleet.ts:171,172,173`; SQL cru fora de
  migrações → **vazio**; escritores de `cycle_counts`/`cycle_count_entries` → `cycle-count-prisma.repository.ts:25,37,86,105,114,123`; `insertMovement(`
  em `:236,:253,:263,:309,:386,:416` (decl. `:429`); `inventoryItem.updateMany` em `:166,:224,:563`. Externos: `fuel-log.service.ts:564,575`,
  `maintenance-order.service.ts:709,720`, `fleet-alerts.runner.ts:7,103` (só `createDefaultInventoryRepository`). `inventory.service.ts`: `createMovement:298`,
  `createTransfer:338`, `reverseMovement:361`, `createExitForSource:444` (fast-path `:439`), `removeExitForSource:471`, `recalculateAbc:154-163`
  (`getConsumptionValues` + `applyAbcClasses`). `cycle-count.service.ts`: `SNAPSHOT_LIMIT = 10_000` `:35`; `close:137-219`; `recordEntry:99-127`;
  `cancel:222-239`; fábricas `:245-281`. `inventory.types.ts:230-235` ("NOT settable through the public movement API").
- **[06]** Arnês lido: `tests/o6r06-usage-atomic-db.test.ts:30-37` (skip declarado), `:623-629` (`pg_roles` rolbypassrls/rolsuper);
  `tests/financial-entry-delete-reverse-race-db.test.ts:1-60` (`RACE_N = 20`, `CORE_SAAS_PERSISTENCE = "prisma"` antes do import, tag);
  `tests/helpers/pg-barrier.ts:33-113,155-200` (`buildApplicationName`, `withApplicationName`, `assertApplicationNamePropagated`,
  `countBlockedStatements`, `waitForOwnBlockedStatement` com `DEFAULT_TIMEOUT_MS = 15000`, `captureSettled`, `expectRejected`);
  `tests/helpers/auth-identity-fixture.ts:324-364` (`createEphemeralRole`: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`, grants).
- **[07]** `src/modules/financial-uow/financial-uow.ts` (porta `run(tenantId, work)`, contexto com repositórios) e `financial-uow-prisma.ts:21-22`
  (`withTenantRls` + repositórios no `tx`). `src/database/rls.ts:29-39`: `withTenantRls = client.$transaction(async tx => { set_config…; return work(tx) })`
  **sem opções**. `docs/omega-pd.md:369,470` (advisory lock vetado: "não alcança todo escritor"); `tests/financial-period-lock-guard.test.ts:67`
  (`pg_advisory` só em `src/database/financial-period-lock.ts`).
- **[08]** `ls prisma/migrations | tail -6` → última `20260872000000_add_reversal_pair_fk` (molde: `DO $censo_fk$` fail-closed + down provado);
  `gh pr list --state open --json number,headRefName,title` → `[]`. `prisma/migrations/20260718*/migration.sql:42` `"status" TEXT NOT NULL DEFAULT
  'aberta'` — sem CHECK (os únicos `CHECK` do arquivo são `WITH CHECK` das policies, `:70,:112`). `prisma/schema.prisma`: comentário
  `stock_movements_source_active_key` `:1483-1487`; `@@index([tenant_id, reverses_movement_id], map: …)` `:1508`; `@@map("stock_movements")` `:1509`;
  `model CycleCount` `:1517` (`status String @default("aberta")`); `CycleCountEntry @@unique([tenant_id, cycle_count_id, item_id])`.
- **[09]** `docs/revisoes/SAN3/PLANO_SAN3.md` §5.6 (`:316-323`): CE-G1 (a/b/c) e CE-G2 — texto integral lido; a linha do bloco no §5 (`:5.x`).
- **[10]** **SONDA `scratchpad/plan3-probe-b04a.mts`** (54,8 KB; escrita por mim em 11 partes; importa produção do worktree por URL de arquivo; 2 papéis
  efêmeros `plan3-A`/`plan3-B`). Comando: `cd b04a && DATABASE_URL=postgresql://plan:***@localhost:58544/erp_plan_b04a?schema=public
  CORE_SAAS_PERSISTENCE=prisma LOG_LEVEL=silent NODE_ENV=test PROBE_ONLY=PRE,P1,P11,LO,V6V6,E3,E4,CRASH,LEGACY,DBL,HB,IDX,TOK PROBE_OUT=…/plan3-faseA.json
  node --import tsx …/plan3-probe-b04a.mts` → **ec=0, 41 s**; saída íntegra em `plan3-faseA.json` (`fimMs 40497`; papéis dropados sem erro;
  `pg_roles` sem `o6r_b01_%` ao fim). Resultados (chave → valor):
  - **PRE**: `role_A/B` `rolsuper=false, rolbypassrls=false`, `application_name` `plan3-A`/`plan3-B`; `isolation` `read committed`; `forShareSessao`
    `{1,0,0}`, `forUpdateSessao` `{1,0,0}`, `forUpdateItem` `{1,0,0}` (com contexto / sem / outro tenant); CAS de cancel sem contexto → 0 linhas; outro tenant → 0.
  - **P1_headbase** (5 iter × 20 saídas reais sobre 10): ok **20** em todas; saldo **−10** em 5/5; 67–225 ms. **V1_new** (lock antes do aggregate): ok **10** / 409
    `insufficient_balance` **10** em 5/5; saldo **0**; `p2028 0`; `deadlock 0`; 127–152 ms.
  - **P11_headbase**: B bloqueou em `INSERT INTO "public"."stock_movements" ("tenant_id","item_id",…` (ainda bloqueado após 300 ms); liberado → `inserted`; saldo
    **−1**. **P11_new**: B bloqueou em `SELECT id, avg_cost::float8 AS avg FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`; liberado →
    **409** `insufficient_balance saldo=0`; saldo **0**.
  - **LO** (A segura X 1,5 s; B = código real 300 ms depois): `open_new` deadlock **false**, A `concluida`, B `entries=[Y,X]`, B bloqueou em `INSERT INTO
    "public"."cycle_count_entries"`; `abc_new` **false**, A `concluida`, B `{A:1,B:0,C:1}`, B bloqueou em `UPDATE "public"."inventory_items" SET "abc_class"`;
    `open_v1lock`/`abc_v1lock` **false**; `open_old` **true** (A `P2010 … 40P01 deadlock detected`, B ok); `abc_old` **true** (idem). Finais das `new`: `concluida`,
    2 ajustes, 0 dup.
  - **V6V6**: `[{ok:concluida, units 2, 1009 ms}, {ok:concluida, units 2, 678 ms}]`; s1/s2 `concluida` com 2 ajustes cada; saldos X/Y **98/98**.
  - **E3_new**: B `notOpen: concluida` em 1222 ms, `terminouAntesDoCommitDeA: false`, bloqueou em `SELECT status FROM cycle_counts … FOR SHARE`; final entry
    `{contado 7, variance −3, tem_ajuste true}`, 1 ajuste, saldo 7. **E3_headbase_ctrl**: B `contado=5` em **15 ms**, `terminouAntesDoCommitDeA: true`, não
    bloqueou; final `{contado 5, variance −3, tem_ajuste true}`, `concluida`. **E3_inverso**: B `updated 1` (segurou 1,5 s); A bloqueou em `… FOR UPDATE`,
    `concluida` em 1241 ms; final `{contado 5, variance −5}`, 1 ajuste −5, saldo 5.
  - **E4_new_aplicado / E4_new_fechando**: B `notOpen: concluida` (1227/1223 ms), bloqueou em `UPDATE cycle_counts SET status='cancelada' …`; final `concluida`,
    `is_active true`, 1 ajuste, saldo 7. **E4_headbase_ctrl**: B `cancelledHeadBase: cancelada` (1208 ms), bloqueou em `UPDATE "public"."cycle_counts" SET
    "status" = $1, "is_active" = $2 …`; final **`cancelada`, `is_active false`, 1 ajuste −3, saldo 7**.
  - **CRASH**: `SIMULATED-CRASH-BETWEEN-UNITS`; após: `fechando`, 7 ajustes/7 carimbos de 20; `recordEntry` v2 → `notOpen: fechando`; `cancel` v2 →
    `notOpen: fechando`; `close` head-base → `CYCLE_COUNT_INVALID/422/invalid_status_transition ("fechando")`; retomada por B: `concluida`, 13 unidades,
    267 ms; final 20 ajustes/20 carimbos, 0 dup.
  - **LEGACY_P021**: `reusedLegacy 1`, 2 unidades, `concluida`; 2 ajustes (soma −5), 2 carimbos, 0 dup; saldos X 7 / Y 8.
  - **DBL_50**: A `concluida` 50 unidades 1151 ms; B `422 invalid_status_transition (not_open:concluida)`; final 50 ajustes, 50 carimbos, 0 dup.
    **DBL_1** (10 iter): `ajustesTotais [1×10]`, `vencedores200 [1×10]`, saldos `[7×10]`, dup `[0×10]`.
  - **P6_headbase** (5 iter): `[2 fulfilled, 2 ajustes, saldo 4, concluida] ×5`, duplicados 5/5. **P3_headbase**: 2 compensações, saldo 13, 5/5; **V3_new**: 1
    compensação, `already_reversed`/`ok`, saldo 10, 5/5. **P5_headbase**: 2 compensações 5/5; **V5_new**: 1, `undefined`/`compensou`, 5/5. **P7_headbase**: avg
    `[2,2,2,2,2]`; **V7_new**: `[2.333333 ×5]`. **P9_headbase**: `ok 10`, `25P02 … current transaction is aborted` **10** (10 iter); **V4_new**: `sameId 10`,
    `p25 0`, `linhas 10`, `outros {}`.
  - **IDX**: 3 tenants semeados pelo defeito real; censo antes `reverses {grupos 13, linhas 26}`, `cycleItem {grupos 8, linhas 16}`; `DO` → `P2010/P0001
    "stock_movements: 20 grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003)…"`; `CREATE UNIQUE INDEX` (rev e cc) com duplicata → erro, transação desfeita;
    limpeza escopada (`slug LIKE 'plan3-%'`): 13 + 8 linhas removidas; censo depois 0/0; `DO` → `mudo (0 grupos)`; up dos 2 índices **35 ms**; `indexdef` com
    `WHERE (reverses_movement_id IS NOT NULL)` / `WHERE (cycle_count_id IS NOT NULL)`; 2ª compensação → erro; 2º ajuste → erro; 3 NULLs aceitos;
    `pg_indexes` 2; drill `up 2 → down 0 → reup 2 → fim 0`.
  - **TOK**: `withTenantRls` com 5300 ms entre statements → `P2028 "… timeout for this transaction was 5000 ms, however 5315 ms passed …"` (8182 ms);
    deadlock ORM → `DriverAdapterError` (sem `code`; `cause.code 40P01`, msg "deadlock detected"); deadlock raw → `P2010` com `meta.code 40P01`.
    `sendRouteError` hoje: P2028 → **400 `BAD_REQUEST/invalid_request`** com a mensagem crua; deadlock ORM → **400** "deadlock detected"; deadlock raw →
    **400** com "Invalid `prisma.$executeRawUnsafe()` invocation: Raw query failed. Code: `40P01`…"; `InventoryError` → 409; `CycleCountError` → 422.
- **[11]** `docker exec -i plan-b04a-pg psql … \set VERBOSITY verbose` — tenant/item/original + 2 compensações do mesmo original em tx; `CREATE UNIQUE INDEX …
  WHERE reverses_movement_id IS NOT NULL` → `ERROR: 23505: could not create unique index … DETAIL: Key (tenant_id, reverses_movement_id)=(…) is duplicated.`;
  `ROLLBACK`. (O `DETAIL` exporia `tenant_id` no log de deploy — por isso o censo `DO` roda ANTES e aborta sem ele.)
- **[12]** `.github/workflows/ci.yml`: `:249` `SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"` (última da lista), `:250` `node --test
  --import tsx $SUITES 2>&1 | tee postgres-subset.tap`, `:255` guard "Fail on skipped tests"; `grep -i "lugar reservado"` → só `:248` (comentário consumido).
  `scripts/run-backend-tests.mjs:82` `SKIP_BUDGET_DB = 2`. `deploy-staging.yml:44` / `deploy-production.yml:136` → `npx prisma migrate deploy`.
- **[13]** `tests/kpi-achados-paridade.test.ts:48-49,107-113,158-190`: `fechado` conta como "na main" só com hash em `fechado_por`; `p0_fechados` = fechados
  com hash; `espelhados` = `production_readiness.fechados`; registro em Markdown tem de dizer `- Status: **fechado**`. `git show 15ef3fbe:docs/revisoes/O6R/
  achados.jsonl | grep DIN-005` → `"status": "fechado", … "fechado_por": "B-O6R-06 (PR na autoria; no e hash no backfill pos-merge — §C3.5)", "fechado_em":
  "2026-09-07", "evidencia_fechamento": "…"`; hoje (pós-backfill) `"fechado_por": "B-O6R-06 (PR #385, 15ef3fbe — mergeado em 2026-09-11; …)"`.
  `git show 15ef3fbe:…/REGISTRO_ACHADOS_O6R.md` `:120` `- Status: **fechado** em 2026-09-07 pelo \`B-O6R-06\` (PR na autoria; nº e hash no backfill
  pós-merge — §C3.5).` Valores de `status` no JSONL hoje: `ativo` 14 · `fechado` 15 · `parcialmente_superado` 3. `Kpis/kpis-latest.json`: `backend_tests
  2995/2997`, `blocks_completed 163`, `release.pr 385`, `production_readiness {p0_total 17, p0_fechados 13, p0_abertos 4, p1_fechados 2, deploy_bloqueado
  true}`, `roadmap.blocos` estados `{concluido, a_fazer, parcial}`, `B-O6R-04 {achados: [DAT-002, DAT-003, QUA-002], estado a_fazer}`, `as_of 2026-09-11`;
  history 158 entradas (última `pr 385`). `pendencias.md`: `P-020` `:243-253` (absorvida por `P-O6R-B04`), `P-021` `:256-266`, `P-O6R-B04` `:2833`.
- **[14]** `git ls-tree --name-only origin/main .claude/agents/especialistas/` → **2** (`jurado-san3c2-cobertura-de-fluxo.md`, `…-suplente-…`); árvore da sessão
  `.claude/agents/especialistas/` → 14 arquivos `jurado-06-*`/`jurado-c5-*`/`critico-c5-*` (untracked/modificados no `git status` da sessão).
- **[15]** Frontend (fora do escopo, só leitura): `frontend/src/modules/inventory/cycle-counts.types.ts:7` `CycleCountStatus = "aberta" | "concluida" | "cancelada"`;
  `cycle-counts.adapter.ts:17-35` (mapa de rótulos; `?? "—"`/`?? "default"`), `:128` `isCycleCountStatus(statusRaw) ? statusRaw : "aberta"`, `:177-181` (422 →
  "já foi concluída ou cancelada… Recarregue a lista"); `pages/EstoquePage.tsx:77,1262` (abas `aberta|concluida|cancelada|all`). Mobile: nenhum uso de
  contagem cíclica (`grep -rln cycle mobile/flutter_app/lib` → só checklists). Backend: `cycle-count.validators.ts:59-71` (`parseOptionalStatus` lê
  `CYCLE_COUNT_STATUSES`); `cycle-count.types.ts:5` (`["aberta","concluida","cancelada"]`); `API_CONTRACTS.md:418` (rotas sem enumeração de status).
  `src/modules/core-saas/routes/http.ts:28-68` (`sendRouteError`: `CoreSaasError` → status próprio; `isRouteError` `:85-97` exige `statusCode/code/reason/
  message`; `Error` → **400 BAD_REQUEST** com `error.message`; resto → 500). `src/modules/checklists/checklist-prisma.repository.ts:1143-1195`
  (`sanitizeReopenFailure` → 503 transitório / 500 determinístico; `isTransientDatabaseFailure` com a lista de códigos em dois níveis).
- **[16]** **E5** (`PROBE_ONLY=E5`, `E5_N` default `250,500,1000,10000`, controle head-base ligado; sozinha no cluster, depois da fase A) → **ec=0, 727 s**;
  `plan3-e5.json`. Por N — desenho v2 (`closeNew`: unidades por item) / head-base (`CycleCountService.close` real):
  | N | v2 total | unid. média / p95 / máx (ms) | v2 final | head-base total | head-base final |
  |---|---|---|---|---|---|
  | 250 | 3 504 ms | 13,83 / 19 / 67 | `concluida`, 250 ajustes, 250 carimbos, 0 dup | 3 384 ms | `concluida`, 250/250 |
  | 500 | 6 338 ms | 12,63 / 18 / 34 | `concluida`, 500/500, 0 dup | 7 716 ms | `concluida`, 500/500 |
  | 1000 | 15 019 ms | 14,99 / 21 / 101 | `concluida`, 1000/1000, 0 dup | 36 058 ms | `concluida`, 1000/1000 |
  | 10 000 | **318 473 ms** | 31,84 / 67 / **1 180** | **`concluida`, 10 000 ajustes, 10 000 carimbos, 0 dup** | 332 027 ms | **`P2028` em `cycleCountEntry.updateMany()` (`applyClose`), sessão `aberta`, 10 000 ajustes gravados, 0 carimbados** |
  Leitura: toda unidade do v2 ficou abaixo de 5 000 ms (máx 1 180 ms em N=10 000, com a máquina sob carga do próprio experimento); o head-base fecha até
  1000 e **não consegue** fechar `SNAPSHOT_LIMIT` (o `applyClose` de 10 000 `updateMany` numa tx estoura o timeout **depois** de os 10 000 ajustes já terem
  commitado em transações próprias — o pior estado do P-021). `unit0` 10–43 ms; `final` 7–14 ms.
- **[17]** Limpeza: `docker rm -f plan-b04a-pg` (linha final abaixo); `git status --short | wc -l` do worktree `b04a` → 0; nenhum arquivo do worktree
  criado/alterado; base viva intocada. Artefatos desta instância só no scratchpad: `plan3-probe-b04a.mts`, `plan3-faseA.json`, `plan3-e5.json`,
  `plan3-faseA.log`, `plan3-e5.log`, `p3/` (partes), `PLANO-B-O6R-04a-v2.md`; a cópia intacta do esqueleto herdado (`*.parcial-instancia2.md`) e os
  `plan2-*` da 1ª instância ficam como estavam.

FIM DO PLANO

> **Limpeza executada (2026-09-18):** `docker rm -f plan-b04a-pg` → removido (0 container(s) com esse nome depois); `git status --short` do worktree `b04a` → 0 linha(s); base viva intocada; papéis efêmeros dropados (`pg_roles` sem `o6r_b01_%` antes da remoção). Artefatos desta instância só no scratchpad (`plan3-*`, `p3/`, este plano).
