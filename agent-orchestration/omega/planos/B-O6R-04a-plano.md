# PLANO — B-O6R-04a · consistência do estoque sob concorrência

> **Papel:** `planejador-mestre` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`, o fixado no frontmatter; sem fallback
> para Opus) · **Corpo aplicado:** `origin/main@02bd7dab:.claude/agents/planejador-mestre.md`, lido por
> `MSYS_NO_PATHCONV=1 git show 'origin/main:.claude/agents/planejador-mestre.md'` `[00]` — traz o parágrafo
> `D-FALLBACK-MODELO-FABLE-OPUS` (2026-09-07/08) que o corpo carregado pelo registro não tem; nenhuma outra diferença altera este plano.
> **Base medida:** worktree `.claude/worktrees/b04a`, branch `fix/inventory-consistency`, `HEAD=65ac41dc` (comando do bloco) sobre
> `merge-base origin/main = 02bd7dab`; `git status --short` vazio no início e ao fim de cada execução `[01][16][17]`. Este agente
> **não escreveu no worktree** (só leitura; sondas e este plano vivem no scratchpad).
> **Data:** 2026-09-13 · **Status:** PRONTO PARA O ATAQUE do `critico-adversarial` (bloco de invariante; ≤ 2 rodadas).
> Toda afirmação numerada `[NN]` remete ao §14 (comando → saída). Nada das atas do #386 foi herdado como fato.

## 0. Queda anterior, fragmentos encontrados e o que foi re-executado

- **Queda declarada:** a primeira instância deste papel caiu por limite de sessão do Fable (HTTP 429). O orquestrador primeiro
  informou que ela não deixara nada; depois corrigiu: ela deixou ~56 KB de plano e um container `plan-b04a-pg` (removido por ele).
- **Sequência honesta dos arquivos:** o meu esqueleto (`cat >`) sobrescreveu `PLANO-B-O6R-04a.md` **antes** de a mensagem
  "não sobrescreva" chegar; a cópia `*.parcial-instancia1.md` feita depois tem 2,3 KB — é o meu esqueleto, não o parcial (o
  orquestrador confirmou e vai apagá-la). **Mas os fragmentos P2 da instância 1 sobrevivem no scratchpad** `[23]`:
  `plan-s00.md … plan-s11-apendice-extra.md`, `plan-s99-apendice.md` (somam ≈ 56 KB) e `probe-head-base.mts`/`probe-part*.mts`/
  `probe-p9.mts`. Eu os li. Regra aplicada, conforme a primeira correção do orquestrador e o espírito da segunda: **nenhuma
  afirmação deles entra sem a minha execução.** Este plano é escrito do zero, por mim, com medições minhas.
- **Re-executado por mim (comando → saída no §14):** corpo da ref `[00]`; terreno `[01]`; censo por grep `[04][05]`; isolamento
  `[06][17-P10]`; schema/migrações/RLS `[07][08][09]`; rotas/catálogo `[10][11]`; arnês `[12]`; CI/runner `[13]`; KPI `[14]`;
  baseline 67/67 `[15]`; cluster próprio + `migrate deploy` `[16]`; **sonda de vermelho-controle nova (`probe-b04a-v2.mts`),
  com 13 experimentos — 9 da classe do achado e 4 que a instância 1 não fez ou fez diferente** `[17]`.
- **Descartado (não medido por mim, não entra):** qualquer número de duração/p95; "9 de 20" do 25P02 (o meu resultado é 10 de 10
  iterações com um perdedor — §6 A10); a afirmação de que `mobile-inventory-sync.ts` usa permissões `inventory.read/manage`
  (irrelevante aqui; não conferi); a lista de jurados como "existentes no registro" — medi: **não estão em `origin/main`** `[20]`.
- **Container:** criei o MEU `plan-b04a-pg` (porta **56542**, `postgres:16`, base `erp_plan_b04a`, 107 migrações aplicadas `[16]`)
  e o removo pelo nome ao fim (§14, última linha). A base viva (`erp-postgres:5432`, `erp-redis`) não recebeu um comando.

## 1. Objetivo · ator · fluxo origem→destino

**Objetivo — os invariantes, literais do comando e o que a medição acrescentou:**
- **I1** saldo por item **e custódia** nunca negativo sob concorrência, em **toda** via que debita (não só a saída).
- **I2** fechamento de contagem aplicado **exatamente uma vez**: um vencedor, zero ajuste parcial, e falha no meio = nada gravado.
- **I3** no máximo **uma compensação por movimento original** — na aplicação **e no banco** (backstop para escritor cru).
- **I4** (mesma classe, medido em `[17-P7]`): o custo médio da `entrada` é calculado sobre o saldo **serializado** — hoje é lost update.
- **I5** (mesma classe, medido em `[17-P9]`): a corrida da MESMA fonte em `createExitForSource` nunca vaza `25P02` (500) ao consumidor.

**Atores (permissão exata medida `[10][11]`):** `POST /api/v1/stock-movements` e `POST /api/v1/stock-movements/:id/reverse`
comparam `stock_movements:create` (`inventory.routes.ts:119,129`) — concedida a `manager` (`catalog.ts:534`, bloco l.414),
`operator` (`:775`, bloco l.730) e `inventory` (`:882`, bloco l.873). `POST /api/v1/cycle-counts/:id/close` compara
`cycle_counts:create` (`cycle-count.routes.ts:73`) — `manager :537`, `operator :778`, `inventory :885`. `viewer` (l.676),
`finance` (l.809) e `auditor` (l.944) têm só `:read`. Consumidores **service→service sem permissão própria** (efeito de domínio):
`fuel-log.service.ts:564,575` e `maintenance-order.service.ts:709,720` `[05]`. Sistema: `CycleCountService.close` gera `ajuste`
com `cycleCountId` (`cycle-count.service.ts:182`).

**Fluxo origem→destino (via principal, hoje):** rota → `requirePermission` → `InventoryController.createMovement:120` →
`InventoryService.createMovement` (regras, custódia, referências; chama o repositório em `:298`) →
`RlsPrismaInventoryRepository.createMovement:692` → `withTenantRls` = `client.$transaction` + `set_config` **sem `isolationLevel`**
(`src/database/rls.ts`; `read committed` pinado por execução `[06][17-P10]`) → `PrismaInventoryRepository.createMovement:206` →
`findItemById:207` → `saldoOfCustody:214` (**`aggregate _sum`**) → `wouldOverdraw:216` → [`entrada`: `saldoOf:221` →
`inventoryItem.updateMany:224` (avg_cost)] → `insertMovement:236` → `stockMovement.create:436` → commit.
**Depois do bloco:** entre `withTenantRls` e a primeira leitura de saldo entra `lockItemForUpdate` (row lock do item), em
**todas** as vias do §2; o fechamento de contagem passa a rodar em UMA transação (porta `InventoryUnitOfWork`, §3.4). Nada muda
acima do repositório; a interface pública `InventoryRepository` não muda de assinatura.

## 2. MAPA DAS VIAS — gerado do código, por arquivo:linha (não por lista)

### 2.1 Os comandos que geram o mapa (a junta reexecuta; saídas em `[04][05]`)

```bash
cd .claude/worktrees/b04a
# (a) leituras de saldo, decisões e escritas de movimento/item/sessão DENTRO do módulo (excluídas as interfaces + in-memory)
grep -n -E "saldoOf\(|saldoOfCustody\(|sumByItem\(|insertMovement\(|stockMovement\.create|stockMovement\.aggregate|stockMovement\.groupBy|wouldOverdraw\(|\.createMovement\(|\.createTransfer\(|\.reverseMovement\(|\.createExitForSource\(|\.removeExitForSource\(|applyClose\(|cancelSession\(|updateMany\(|\$transaction|withTenantRls\(" src/modules/inventory/*.ts | grep -v -E "^src/modules/inventory/(inventory|cycle-count)\.repository\.ts"
# (b) quem chama as vias de FORA do módulo
grep -rn -E "createExitForSource|removeExitForSource|createMovement\(|createTransfer\(|reverseMovement\(|InventoryRepository|createPrismaInventoryRepository|InventoryService" src --include=*.ts | grep -v "^src/modules/inventory/"
# (c) escritas em stock_movements fora do INSERT único (esperado: nenhuma) e acesso direto fora do módulo (esperado: nenhum)
grep -rn -E "stockMovement\.(update|delete|createMany|upsert)" src --include=*.ts; grep -rn -E "stockMovement\b|stock_movements|cycleCount\b|cycle_counts" src --include=*.ts | grep -v "^src/modules/inventory/"
```
Resultado `[04]`: **um único ponto de INSERT em `stock_movements`** — `insertMovement` (privado, `inventory-prisma.repository.ts:429-459`,
`create` em `:436`); **zero** `update`/`delete`/`createMany` em `stock_movements` (ledger imutável confirmado no código);
**5 chamadores** de `insertMovement` (`:236`, `:253`+`:263`, `:309`, `:386`, `:416`); leituras de saldo por `aggregate _sum`
(`saldoOfCustody:479-492`, `saldoOf:596-606`) — **não há lock possível num agregado**; escritas de `inventory_items` que leem
saldo: só `avg_cost` em `:224-233`. Escritas em `cycle_counts`/`cycle_count_entries`: `cycle-count-prisma.repository.ts:25,37`
(open), `:86` (contagem), `:105` e `:114` (close — o `:114` muda `status` **sem condição**), `:123` (cancel).
Fora do módulo `[05][19]`: `fuel-log.service.ts:564,575`, `maintenance-order.service.ts:709,720`, `inventory.controller.ts:120,172`,
`cycle-count.service.ts:182`; `fleet-alerts.runner.ts:103` só lê; `mobile-inventory-sync.ts:99-100` é memória pura (`Map`) e é
alvo do `B-O6R-04b`. **Nenhum acesso direto às tabelas fora do módulo.**

### 2.2 Tabela por via — onde LÊ · onde DECIDE · onde ESCREVE · transação · isolamento · vermelho medido

Arquivo de V1–V5: `src/modules/inventory/inventory-prisma.repository.ts`. Transação = a aberta pelo wrapper `Rls*` (uma por
chamada, READ COMMITTED, sem lock) `[06]`. "Sonda" = `[17]` (minha execução no head-base, cluster próprio).

| via | entrada (chamadores) | LÊ | DECIDE | ESCREVE | tx / lock hoje | sonda head-base |
|---|---|---|---|---|---|---|
| **V1** `createMovement` (saida·consumo·ajuste; entrada c/ custo) | `InventoryService:298` (HTTP); `CycleCountService.close:182` (ajuste) | `findItemById:207`; `saldoOfCustody:214`; entrada: `saldoOf:221` | `wouldOverdraw:216` | entrada: `inventoryItem.updateMany:224` (avg_cost); `insertMovement:236` | 1 tx (`:692`); **nenhum lock** | **P1 saldo −2** (12 ok/8×409 sobre saldo 10) · **P7 avg 2,0** (correto 2,333333) · P8 verde por agendamento |
| **V2** `createTransfer` (link·unlink) | `InventoryService.createTransferMovement:338` | `findItemById:240`; `saldoOfCustody(origem):247` | `wouldOverdraw:248` | `insertMovement:253` (−origem) e `:263` (+destino), mesmo `transfer_group_id`; **mesmo `itemId` nas duas pernas** | 1 tx (`:697`); nenhum lock | P2 verde por agendamento (código idêntico a V1 `:247-248`) |
| **V3** `reverseMovement` | `InventoryService.reverseMovement:361` (HTTP `/reverse`) | `findMovementById:278`; `movementsInGroup:282`; `hasReversalOf:286` (count); por perna `saldoOfCustody:303` | `:286` already_reversed; `wouldOverdraw:304` | `insertMovement:309` por perna | 1 tx (`:702`); nenhum lock; unicidade de `reverses_movement_id` **inexistente** (só `@@index`, `schema.prisma:1508`; migração `20260828` l.80-81) | **P3: 2 compensações**, saldo 13 (era 10) |
| **V4** `createExitForSource` (seam) | `fuel-log:564`, `maintenance-order:709` → `InventoryService:444` (fast-path `:439`) | `findItemById:365`; `findExitBySource:370`; `isExitReversed:372`; `saldoOfCustody(BASE):380` | idempotência `:371-376`; `wouldOverdraw:381` | `insertMovement:386`; `catch` P2002 → `findExitBySource:402` **dentro da tx já abortada** | 1 tx (`:721`); nenhum lock; `stock_movements_source_active_key` só cobre a MESMA fonte | P4 (20 fontes distintas) verde por agendamento · **P9: `25P02` em 10 de 10 iterações** (mesma fonte ×2 → um perdedor sempre estoura "current transaction is aborted") |
| **V5** `removeExitForSource` (seam) | `fuel-log:575`, `maintenance-order:720` → `InventoryService:471` | `findExitBySource:411`; `isExitReversed:413` | `:412-413` | `insertMovement:416` | 1 tx (`:726`); nenhum lock | **P5: 2 compensações**, saldo 13 |
| **V6** `CycleCountService.close` (`cycle-count.service.ts:137-219`) | `cycle-count.controller.ts:88` (HTTP `/close`) | `findSessionWithEntries:138` (tx própria); `listMovements:157` (tx própria) | `status:146`; `variance:168`; `alreadyAdjusted:171` (P-021) | N× `createMovement:182` (N tx, via V1) + `applyClose:207` → `cycle-count-prisma.repository.ts:105` (entries) e `:114` (`status='concluida'` **sem condição**) | **N+3 transações**; nenhum lock; nenhum CAS | **P6: 2 vencedores, 2 ajustes**, saldo 4 (era para ser 7) · **P12: falha no 3º item deixa 2 ajustes gravados e a sessão `aberta`** |

Fora da propriedade (escrevem item/sessão sem ler saldo): `updateItem:166`, `applyAbcClasses:563`, `createSession`, `recordEntryCount:86`,
`cancelSession:123`. Nota: `recordEntryCount` numa sessão que virou `concluida` entre o `findSession` do serviço e o `updateMany` é
TOCTOU da mesma família — **fora do teste de encerramento**; fica como pendência nomeada (§13-e), não como escopo.

**Propriedade a fechar (e não a instância):** toda via que chega a `insertMovement` ou a `inventoryItem.updateMany(avg_cost)`
toma o lock do item ANTES da primeira leitura de saldo/estorno. O guard T-D (§6) enumera as vias **pelo fonte** e reprova via nova
sem lock; o token de tipo (§3.2) faz o compilador negar antes do teste — é o CE-G1 deste bloco (§7).

**Duas provas positivas para o desenho, medidas `[17]`:** **P13** — `SELECT … FOR UPDATE` em `inventory_items` sob papel
`NOSUPERUSER NOBYPASSRLS` com FORCE RLS devolve **1 linha com o contexto do tenant e 0 sem contexto** (a policy é `USING`+`WITH CHECK`
sem cláusula `FOR`, logo vale para ALL `[09]`; o papel tem `UPDATE` na tabela `[12]`). **P11** — com A segurando `FOR UPDATE` do
item, o `INSERT` de B (via V1 real, sem lock) **bloqueia em `stock_movements`** (`KEY SHARE` da FK `item`), não em `inventory_items`;
B já tinha lido saldo 10 e, liberado, **commita → saldo −1**. Ou seja: o `KEY SHARE` serializa a escrita mas **não** a releitura —
o lock tem de vir **antes da leitura**, e é isso que o §3 faz.

## 3. Desenho do conserto por via

### 3.1 O agregado certo: row lock `FOR UPDATE` na linha `inventory_items(tenant_id, id)` — e por quê (para ser atacado)

1. **Toda via é mono-item** `[04]`: V2 e V3 tocam duas custódias do MESMO item (as duas pernas de `createTransfer` usam
   `input.itemId`, `:253-272`); V4/V5 fixam BASE; V6 itera itens. Um lock por (item, custódia) exigiria dois locks ordenados em
   V2/V3 sem ganho: o contendor real é o item. A linha do item já é lida por toda via (`findItemById`) — vira o próprio
   `SELECT … FOR UPDATE`, uma consulta a menos.
2. **É uma linha real, sob FK e RLS** (P13): sem colisão de hash, visível só sob o contexto do tenant, e reprovada de graça
   pelo cross-tenant (0 linhas → `undefined` → 400/404 como hoje).
3. **`FOR UPDATE` e não `FOR NO KEY UPDATE`:** só o `FOR UPDATE` conflita com o `FOR KEY SHARE` que todo `INSERT` em
   `stock_movements` toma na linha do item pela FK — é o que P11 mostrou. Um escritor futuro que **não** tome o lock ainda espera
   pelo detentor (perde só a releitura); com `NO KEY UPDATE` ele nem esperaria. Defesa em profundidade observável (A2).
4. **Alternativas rejeitadas, com motivo medido:** (a) coluna de saldo + CAS `UPDATE … SET saldo=saldo−q WHERE saldo≥q` —
   não há coluna; o saldo é DERIVADO por decisão registrada (`schema.prisma:1471-1472`, D-Ω4C-INV-CUSTODY-MODEL) e criar uma é
   modelagem fora da autorização nominal de `prisma/` (§8); (b) `SERIALIZABLE` — exige laço de retry em toda via E nos consumidores
   service→service (`fuel-log`/`maintenance` não têm; `40001` viraria 500); (c) `pg_advisory_xact_lock(hashtext(tenant:item))` —
   o guard `tests/financial-period-lock-guard.test.ts:67` reprova `pg_advisory` fora de `src/database/financial-period-lock.ts`, e
   a junta do `B-O6R-01` já vetou advisory como sincronização "porque o lock não alcança todo escritor" (`docs/omega-pd.md:369`) `[18]`.
5. **Custo aceito:** serializa custódias do mesmo item; bloqueia por instantes `updateItem`/`applyAbcClasses` do mesmo item
   (ambos tomam `NO KEY UPDATE` na linha, que conflita). Transações curtas (1 `FOR UPDATE` + ≤2 `aggregate` + ≤2 `INSERT`; zero I/O
   externo). Quem esperar mais que o `timeout` da tx interativa do Prisma 7.8.0 (`[20]`; default 5 s) recebe `P2028` — risco R2.
6. **Ordem global de locks (anti-deadlock):** V1–V5 tomam **um** lock (o item). V6 toma **primeiro** a sessão (`cycle_counts`) e
   **depois** os itens em **ordem crescente de `item_id`**. Ninguém toma sessão depois de item; duas sessões com itens em comum
   travam na mesma ordem. `open` (`createSession`) toma `KEY SHARE` dos itens pela FK de `cycle_count_entries` sem segurar item
   nenhum antes → sem ciclo. Provado por A12/B6 (0 × `40P01`).

### 3.2 Mecanismo comum (em `inventory-prisma.repository.ts`) — o lock como TIPO, não como convenção

```ts
declare const ItemWriteLockBrand: unique symbol;
/** Prova de posse do row lock do item. SÓ `lockItemForUpdate` produz; toda leitura-sob-lock e `insertMovement` EXIGEM. */
export type ItemWriteLock = { readonly [ItemWriteLockBrand]: true; readonly item: InventoryItem };

private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
  const rows = await this.client.$queryRaw<ItemRecord[]>`
    SELECT * FROM "inventory_items" WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid FOR UPDATE`;
  return rows[0] ? ({ item: mapItemRecord(rows[0]) } as ItemWriteLock) : undefined;
}
// Leituras que DECIDEM ganham a variante sob lock (as públicas da interface ficam como estão, sem lock):
private saldoOfCustodyLocked(lock: ItemWriteLock, custody: StockCustody): Promise<number>;
private saldoOfLocked(lock: ItemWriteLock): Promise<number>;
private hasReversalOfLocked(lock: ItemWriteLock, movementIds: readonly string[]): Promise<boolean>;
private findExitBySourceLocked(lock: ItemWriteLock, sourceType: string, sourceId: string): Promise<StockMovement | undefined>;
private insertMovement(input: …, lock: ItemWriteLock): Promise<StockMovement>;
```
`undefined` = item inexistente/de outro tenant → o chamador devolve `undefined` (400/404 como hoje). `$queryRaw` **tagged**
(nunca `Unsafe` com string montada). O token é o **default de negar**: via nova que chame `insertMovement` ou uma leitura
`*Locked` sem o token é `TS2554`/`TS2345` no `npm run check` — antes de qualquer teste.

### 3.3 Por via (idioma da casa: ler → travar → **re-verificar sob o lock** → escrever; `auction-prisma.repository.ts:96-569`)

| via | mudança exata | fecha | backstop de banco |
|---|---|---|---|
| **V1** `createMovement` | `findItemById:207` → `lockItemForUpdate`; `saldoOfCustodyLocked`, `wouldOverdraw`, [`saldoOfLocked` + `avg_cost`] e `insertMovement` sob o lock | P1, P7, P8 (I1, I4) | `FOR UPDATE` × `KEY SHARE` (3.1-3) |
| **V2** `createTransfer` | `findItemById:240` → `lockItemForUpdate`; as duas pernas sob o mesmo lock | P2 (I1) | idem |
| **V3** `reverseMovement` | `findMovementById:278` (sem lock, só para saber o item) → `lockItemForUpdate(original.itemId)` (se alguma perna tiver outro `itemId` — impossível por construção — trava em ordem ASC) → `movementsInGroup` e `hasReversalOfLocked` **re-executados sob o lock** → pernas sob o lock | P3 (I3) | índice único parcial §4: P2002 → `{status:"already_reversed"}` (409), **mapeado no wrapper `Rls*` fora da tx** |
| **V4** `createExitForSource` | fast-path do serviço (`InventoryService:439`) mantido; no repositório: `lockItemForUpdate` ANTES de `findExitBySourceLocked`/`isExitReversed`/saldo (a leitura idempotente fica sob o lock: o 2º da MESMA fonte vê o 1º commitado e o devolve; 20 fontes DISTINTAS serializam no item). **O `catch` de P2002 (`:398-404`) sai da transação:** `RlsPrismaInventoryRepository.createExitForSource = try { withTenantRls(…) } catch (e) { if (isUniqueViolation(e)) { const raced = await withTenantRls(…, tx => new PrismaInventoryRepository(tx).findExitBySource(…)); if (raced) return raced; } throw e; }` | P4 (I1), **P9 (I5)** | `stock_movements_source_active_key` (existente, `20260832` l.64-66) |
| **V5** `removeExitForSource` | `findExitBySource:411` (sem lock, só para saber o item) → `lockItemForUpdate(exit.itemId)` → `isExitReversed` re-executado sob o lock (`hasReversalOfLocked`) → insert sob o lock | P5 (I3) | índice §4: P2002 → `undefined` (contrato idempotente), mapeado no wrapper fora da tx |
| **V6** `CycleCountService.close` | tudo dentro de `uow.run(tenantId, ctx => …)` (§3.4): `ctx.cycleCounts.lockSession(tenantId, id)` (`SELECT … FROM cycle_counts WHERE tenant_id AND id FOR UPDATE`) → 404/422 sob o lock → `findSessionWithEntries` → `listMovements({cycleCountId})` **na mesma tx** (guarda de legado P-021, `:153-163`, mantida: sessões `aberta` com ajustes parciais gravados ANTES deste bloco não duplicam) → laço **ordenado por `itemId` ASC** → `ctx.inventory.createMovement` (V1, mesma tx, lock do item) → `ctx.cycleCounts.applyClose({…, expectedStatus:"aberta"})` = `cycleCount.updateMany({ where:{tenant_id,id,status:"aberta"} })` → `count !== 1` → `undefined` → o serviço lança `cycleCountNotOpen(status relido)` (CAS = cinto; lock = suspensório) → commit. Qualquer erro → **rollback total** (0 ajustes, `aberta`, entries intactas) | P6, P12 (I2) | §4.3 (ratificação): índice `(tenant_id, cycle_count_id, item_id)` parcial |

`InventoryRepository` (interface pública) **não muda**; o lock é interno ao repositório Prisma. `CycleCountRepository` ganha
`lockSession(tenantId, id)` e `ApplyCloseInput` ganha `expectedStatus` (in-memory: `lockSession = findSession`; `applyClose`
devolve `undefined` se `status !== expectedStatus`). `inventory.service.ts` fica **intocado** (decisão, não proibição: está no
escopo permitido, mas nenhuma via precisa dele).

### 3.4 Porta `InventoryUnitOfWork` — espelho de `src/modules/financial-uow/` `[18]`

`src/modules/inventory/inventory-uow.ts`: `interface InventoryUowContext { readonly inventory: InventoryRepository; readonly cycleCounts: CycleCountRepository }`,
`interface InventoryUnitOfWork { run<T>(tenantId: string, work: (ctx) => Promise<T>): Promise<T> }`; **memória** =
`MemoryInventoryUnitOfWork` com mutex por tenant sobre os singletons in-memory (`getMemoryInventoryRepositoryForTests`,
`memoryCycleCountRepository`) — **dublê honesto, SEM journal**, declarado no cabeçalho como no financeiro ("NÃO é evidência de
atomicidade; a prova é a suíte `-db`"). `src/modules/inventory/inventory-uow-prisma.ts`: `run = withTenantRls(prisma, tenantId, tx =>
work({ inventory: new PrismaInventoryRepository(tx), cycleCounts: new PrismaCycleCountRepository(tx) }))` — os dois construtores já
aceitam `PrismaExecutor` (`:55`; `cycle-count-prisma.repository.ts:22`). `CycleCountService` recebe a porta como 3º parâmetro;
`createMemoryCycleCountService`/`createPrismaCycleCountService` (`cycle-count.service.ts:245-281`) a injetam; `InventoryService`
**não** consome a porta (V1–V5 já são uma tx cada). Decisão sobre journal em memória: **não neste bloco** — o único fluxo
multi-escrita é o close, cuja atomicidade só o Postgres prova; se a junta exigir o journal (precedente M1 do financeiro), vira
pendência nomeada, não retrabalho silencioso.

## 4. Modelagem — migração aditiva com up/down provado + unicidade do fechamento

### 4.1 Arquivo novo: `prisma/migrations/20260873000000_add_stock_reversal_unique_index/migration.sql`
Próximo timestamp livre `[08]` (última: `20260872000000_add_reversal_pair_fk`). **Re-conferir no dia do PR** contra `origin/main` e
os PRs abertos — o `B-O6R-02` colidiu timestamp com o `07a` e teve de renomear (`status-geral.md`, atualização de 2026-09-05).
Molde: `20260832` (índice parcial único em `stock_movements`, l.64-66) + `20260872` (censo prévio fail-closed + down provado).

```sql
-- B-O6R-04a (Ω6R-DAT-002) — UNICIDADE do estorno: no máximo UMA compensação por movimento original, para QUALQUER escritor.
-- Aditiva pura: 1 índice parcial único; nenhuma coluna, nenhum DROP, nenhum UPDATE de dado. prisma/schema.prisma só ganha
-- comentário (índice parcial não é modelável — precedente stock_movements_source_active_key, schema l.1483-1487).
DO $censo$
DECLARE duplicados bigint;
BEGIN
  SELECT count(*) INTO duplicados FROM (
    SELECT tenant_id, reverses_movement_id FROM stock_movements
     WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1) d;
  IF duplicados > 0 THEN
    RAISE EXCEPTION 'stock_movements: % movimento(s) com MAIS DE UMA compensacao (legado do Ω6R-DAT-002). O indice unico nao pode nascer sobre dado inconsistente; NADA foi mutado. Higiene e decisao humana — abrir/consultar P-O6R-B04-ESTORNOS-DUPLICADOS-LEGADO.', duplicados
      USING ERRCODE = 'raise_exception';
  END IF;
END $censo$;

CREATE UNIQUE INDEX "stock_movements_reversal_active_key"
  ON "stock_movements" ("tenant_id", "reverses_movement_id")
  WHERE "reverses_movement_id" IS NOT NULL;

-- down (provado em T-C3: up -> down -> re-up em banco descartavel, pg_indexes 1 -> 0 -> 1):
--   DROP INDEX IF EXISTS "stock_movements_reversal_active_key";
```
- Mensagem publica só a **contagem** — nunca `tenant_id` (§B2.8). Sem `CONCURRENTLY` (`migrate deploy` roda em transação;
  precedente `20260832`). `prisma/schema.prisma:1508`: **manter** o `@@index`; acrescentar comentário apontando a migração
  (mudança de comentário = dentro da autorização nominal).
- **Por que parcial e não `@@unique` modelável:** (i) precedente da casa; (ii) a maioria das linhas tem `reverses_movement_id` NULL —
  o índice parcial é menor; (iii) modelar `@@unique` faria o Prisma gerar a troca do `@@index` existente por outro índice — sai do
  "só o índice parcial" da autorização.
- **Fail-closed de propósito (precedente `20260872`):** se a base tiver estornos duplicados (o próprio DAT-002 pode tê-los produzido —
  P3/P5 mostram como), o deploy PARA com pendência nomeada e zero mutação. O dev roda o `SELECT` do censo na base de demo/dev do
  bloco e publica o N na ata.

### 4.2 Unicidade do fechamento (I2) — camada de serviço, provada no banco
`FOR UPDATE` da sessão + CAS `status='aberta'` na mesma tx (§3.3 V6). `cycle_counts.status` é `TEXT` **sem CHECK** (`20260718` l.42
`[09]`) — o CAS é o que decide; não se acrescenta CHECK (fora do escopo e fora do aditivo). A unicidade `(tenant_id, cycle_count_id,
item_id)` de `cycle_count_entries` **já existe** (`schema.prisma:1559`); a do **ledger** (movimentos de ajuste) não.

### 4.3 Backstop de banco do I2 — fora da autorização nominal; exige ratificação (§13-a)
`CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key" ON "stock_movements" ("tenant_id","cycle_count_id","item_id")
WHERE "cycle_count_id" IS NOT NULL;` + censo próprio (`P-O6R-B04-AJUSTES-DUPLICADOS-LEGADO`) na **mesma** migração. É a mesma
classe (aditiva, índice parcial único, mesma tabela) e é o que o DAT-003 pede ("unique tenant-cycle-item"), mas o comando autoriza
`prisma/` **só** para `reverses_movement_id`. Recomendação: **ratificar**. Sem ratificação, o I2 fica garantido pela camada de
serviço (lock + CAS + tx única) com prova T-B, e nasce a pendência `P-O6R-B04-AJUSTE-SEM-BACKSTOP-DE-BANCO` com dono nomeado.

Nada de Decimal/dinheiro novo; `created_at` já é `timestamptz`; ledger imutável por desenho (sem delete lógico em movimento);
sessão cancelada é delete lógico já existente (`is_active=false`).

## 5. Contrato (rotas, payloads, códigos — inalterados na forma; agora determinísticos sob concorrência)

| rota / seam | permissão exata (medida `[10]`) | sucesso | recusas |
|---|---|---|---|
| `POST /api/v1/stock-movements` (`saida`/`consumo`/`ajuste`/`entrada`/`link`/`unlink`) | `stock_movements:create` (`inventory.routes.ts:119`) | 201 (1 movimento; par para link/unlink) | 409 `STOCK_INVALID/insufficient_balance` **decidido sob o lock** (nunca um vencedor a mais que o saldo); 400 `invalid_item_reference` (item de outra organização — a RLS o esconde); 422 `invalid_custody`; 400 `invalid_custody_reference` |
| `POST /api/v1/stock-movements/:movementId/reverse` | `stock_movements:create` (`:129`) | 200 (compensações, 1 por perna) | 404 `STOCK_MOVEMENT_NOT_FOUND` (cross-tenant); 409 `STOCK_MOVEMENT_CONFLICT/movement_already_reversed` (2º estorno — decidido sob lock; P2002 do índice → 409 pelo wrapper) |
| `POST /api/v1/cycle-counts/:cycleCountId/close` | `cycle_counts:create` (`cycle-count.routes.ts:73`) | 200 **uma vez** | 422 `CYCLE_COUNT_INVALID/invalid_status_transition` para o perdedor concorrente e para `concluida`/`cancelada` (`cycleCountNotOpen`, `cycle-count.types.ts:128-135`); 404 cross-tenant; erro no meio → propaga (409/400) e **nada gravado** |
| seam `createExitForSource` (fuel/maintenance) | nenhuma própria (efeito de domínio) | movimento `saida` BASE | 409 `insufficient_balance`; 422 `item_not_fuel`; 409 `stock_baixa_reversed`; corrida da MESMA fonte → devolve o vencedor (**sem 25P02/500**) |
| seam `removeExitForSource` | nenhuma própria | compensação | já estornado/ausente → `undefined` (no-op idempotente), inclusive sob P2002 |

Nenhuma rota, payload ou código novo → `API_CONTRACTS.md` (fora do escopo) não muda.

## 6. Testes de encerramento — cada um com vermelho-controle no head-base

**Arnês comum das 3 suítes `-db` (padrão do drill do `B-O6R-06` `[12]` + corrida do `B-O6R-02`):** DB-gated **só** por `DATABASE_URL`
ausente (um `test(nome, { skip })` declarado por arquivo — conta no piso do runner, não some); `process.env.CORE_SAAS_PERSISTENCE =
"prisma"` antes de qualquer import da aplicação e o modo asserido; cliente admin com `withApplicationName(DATABASE_URL,
buildApplicationName("b04a-<suite>"))` + `assertApplicationNamePropagated`; **papel efêmero `createEphemeralRole(admin, conexão)`**
(`auth-identity-fixture.ts:324-364`: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`, `GRANT SELECT, INSERT, UPDATE, DELETE`) com a
postura **asserida por `pg_roles`** (`rolsuper=false`, `rolbypassrls=false`) — **falha ao criar o papel = vermelho, nunca skip**;
**os repositórios sob teste rodam no cliente do papel** (`new RlsPrismaInventoryRepository(papel.client)`, idem cycle-count e a
porta UoW); o admin só semeia, faz teardown e lê `pg_stat_activity` (o texto da query alheia só é visível a superuser — por isso a
barreira `waitForOwnBlockedStatement` é sempre polida pelo admin). "2 conexões" = **dois papéis efêmeros, dois `PrismaClient`**
(A e B), cada um asserido; "barreira" = (i) portão de largada comum (`await start`) nas corridas de N e (ii) barreira determinística
por `waitForOwnBlockedStatement` nos casos A2/B3. Tenant descartável por caso; teardown escopado por `tenant_id` em ordem de FK
(`stock_movements` → `cycle_count_entries` → `cycle_counts` → `inventory_items` → `vehicles` → `users` → `tenants`) — nunca
mass-delete por wildcard. Deadlock `40P01` nunca aceitável. `RACE_N = 10` por corrida (B-O6R-02 usa 20 numa corrida; aqui são 15
corridas). "Head-base" = medido por mim em `[17]`; *prev.* = previsto por identidade de código, a confirmar pelo dev rodando as
suítes contra `65ac41dc` (§10 passo 9) — o número que sair lá é o que vai para a ata, não o previsto.

### T-A `tests/inventory-balance-lock-race-db.test.ts` — fecha `Ω6R-DAT-002` + `P-020` (I1, I3, I4, I5)

| caso | forma | verde (pós-bloco) | vermelho-controle (head-base) |
|---|---|---|---|
| **A0** | postura dos 2 papéis por `pg_roles`; `application_name` propagado; `current_setting('transaction_isolation')` dentro de `withTenantRls` | `false/false` ×2; tag presente; `read committed` | n/a (premissas pinadas por execução) |
| **A1 [encerramento do comando]** | item fresco, BASE=10; **20 saídas de 1** (10 pelo cliente A + 10 pelo B, largada comum) ×RACE_N | saldo ≥ 0 SEMPRE; **exatamente 10** fulfilled e 10 rejeitados com 409 `insufficient_balance`; 0 × `40P01`; 0 × `P2028` | **medido P1: 12 ok, saldo −2** |
| **A2 [barreira determinística]** | admin: tx crua `setTenantRlsContext` + `SELECT … FOR UPDATE` do item + `INSERT` cru de −10 + espera sinal; B (papel): `repo.createMovement(saida −1)`; `waitForOwnBlockedStatement(admin,{applicationName: tag de B, fragment:"inventory_items"})`; admin commita; libera | B bloqueou em **`inventory_items`** (no `FOR UPDATE`, antes de ler); B → 409; saldo 0 | **medido P11: B bloqueou em `stock_movements`** (KEY SHARE), commitou ao liberar, **saldo −1** |
| A3 (V2) | `link` ×20 (2 clientes), BASE=10 → viatura | BASE ≥ 0; 10 ok / 10 × 409; viatura = 10 | *prev.* (P2 verde por agendamento; código `:247-248` = `:214-216`) |
| A4 (V1 ajuste) | `ajuste −1` ×20 | saldo ≥ 0; 10/10 | *prev.* (P8 verde por agendamento) |
| A5 (V1 custódia VIATURA) | `saida` ×20 de custódia viatura=10 (BASE=0) | saldo(viatura) ≥ 0; 10/10; BASE intacta | *prev.* |
| A6 (V4) | `createExitForSource` ×20 fontes DISTINTAS, BASE=10 | BASE ≥ 0; 10/10 | *prev.* (P4 verde por agendamento) |
| A7 (V3) | `reverseMovement` ×2 do mesmo movimento (A e B) ×RACE_N | **1** compensação; perdedor 409 `movement_already_reversed`; saldo restaurado | **medido P3: 2 compensações, saldo 13** |
| A7b (V3 grupo) | estorno ×2 de um `link` (2 pernas) | exatamente 2 compensações (1 por perna), nunca 4; saldos restaurados | *prev.* 4 |
| A8 (V5) | `removeExitForSource` ×2 da mesma fonte ×RACE_N | 1 compensação; perdedor `undefined` | **medido P5: 2 compensações** |
| A9 (V1 entrada) | entrada 10@3 ×2 concorrentes sobre 10@1 | `avg_cost = 2.333333` | **medido P7: 2,0** |
| A10 (V4 mesma fonte) | `createExitForSource` ×2 MESMA fonte ×RACE_N | ambos devolvem o MESMO `id`; zero `25P02`; 1 linha | **medido P9: `25P02` em 10 de 10 iterações** |
| A11 [cross-tenant] | saída no item de T2 sob contexto de T1 (papel efêmero) | `undefined` (→400); 0 linhas em T2 | n/a (P13 mostra 0 linhas sem contexto) |
| A12 [anti-deadlock] | `close` de sessão com item X concorrente com `saida` em X ×RACE_N | 0 × `40P01`; um recusa por saldo/422 ou ambos commitam em ordem; saldo ≥ 0 | n/a |
| A13 [sanidade de contrato sob lock] | saída simples sem concorrência; saída acima do saldo | movimento devolvido; 409 com o saldo atual na mensagem | n/a (regressão de forma) |

### T-B `tests/inventory-cycle-count-close-atomic-db.test.ts` — fecha `Ω6R-DAT-003` (I2)

| caso | forma | verde | vermelho-controle (head-base) |
|---|---|---|---|
| **B0** | postura do papel + `read committed` + tag | como A0 | n/a |
| **B1 [encerramento do comando]** | sessão com 1 item (sistema 10, contado 7); `close` ×2 concorrentes (A e B) ×RACE_N | 1 × 200 e 1 × 422 `invalid_status_transition`; **1** ajuste (−3) ligado à sessão; saldo 7 | **medido P6: 2 × 200, 2 ajustes, saldo 4** |
| **B2 [rollback integral]** | 3 itens divergentes (contado 7 sobre 10); o 3º em ordem de `itemId` ASC teve saída de 10 depois do snapshot → ajuste −3 estoura | 409 `insufficient_balance` propagado; **0** ajustes gravados; sessão `aberta`; entries sem `variance`/`adjustment_movement_id` | **medido P12: 2 ajustes gravados + sessão `aberta`** (commit parcial) |
| B3 [barreira] | admin segura `SELECT … FROM cycle_counts … FOR UPDATE` + `UPDATE … status='concluida'` sem commitar; B chama `close` → `waitForOwnBlockedStatement({fragment:"cycle_counts"})`; admin commita; libera | B → 422; 0 ajustes de B | *prev.*: B não bloqueia (não há lock) → grava ajuste e commita → 2 vencedores |
| B4 [CAS] | `applyClose({expectedStatus:"aberta"})` numa sessão já `concluida` (porta Prisma, direto) | `undefined` → o serviço lança 422 | *prev.*: `updateMany` sem condição (`:114`) → "fecha" de novo |
| B5 [cross-tenant] | `close` da sessão de T2 sob contexto de T1 (papel efêmero) | 404 `cycleCountNotFound`; 0 linhas em T2 | n/a |
| B6 [ordem de locks] | sessão com itens [X, Y]; `saida` concorrente em Y ×RACE_N; e duas sessões [X,Y] e [Y,X] fechadas em paralelo | 0 × `40P01`; ajustes corretos ou 422/409 explicáveis | n/a |
| B7 [legado P-021] | sessão `aberta` com 1 ajuste pré-gravado por SQL cru (`cycle_count_id` da sessão); `close` | reaproveita o ajuste; **1** ajuste total; 200 | *prev.* verde (guarda existe hoje) — é regressão, não vermelho |

### T-C `tests/inventory-reversal-unique-index-db.test.ts` — o backstop de banco (I3), sob o papel efêmero

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C1 | SQL cru: 2 INSERTs com o mesmo `reverses_movement_id` (tenant próprio) | 2º → `23505` nomeando `stock_movements_reversal_active_key` | **medido P3/P5: as 2 linhas coexistem** (só `@@index` hoje `[07]`) |
| C2 | N INSERTs com `reverses_movement_id NULL` | todos aceitos (o índice é parcial) | idem (aceitos hoje também — regressão) |
| C3 [drill up→down→re-up] | `DROP INDEX` extraído por regex do cabeçalho do `.sql` da migração (nunca digitado) → C1 vira aceito → `CREATE UNIQUE INDEX` extraído do `.sql` → `23505` de novo; `pg_indexes` 1→0→1 (admin) | as três medições | é o próprio drill |
| C4 [censo] | com o índice derrubado (C3), semear 2 compensações do mesmo original em tenant próprio; executar o bloco `DO $censo$` extraído do `.sql` → `RAISE` citando `P-O6R-B04-ESTORNOS-DUPLICADOS-LEGADO`; remover a duplicata → o bloco roda mudo; re-up | as duas metades | é o próprio drill |
| C5 [mapeamento V3] | compensação de `m` semeada por SQL cru; `repo.reverseMovement(m)` pelo papel | 409 `movement_already_reversed`, **sem** `25P02` | head-base: 2ª compensação aceita |
| C6 [mapeamento V5] | idem para `removeExitForSource` da fonte de `m` | `undefined`, sem `25P02` | head-base: 2ª compensação aceita |

### T-D `tests/inventory-write-paths-lock-guard.test.ts` — memória, CE-G1 (fail-closed por enumeração do fonte)

| caso | forma | verde | mutação que o deixa vermelho |
|---|---|---|---|
| D1 | lê `inventory-prisma.repository.ts`; isola a classe `PrismaInventoryRepository`; enumera por regex os métodos cujo corpo contém `this.insertMovement(` ou `avg_cost:`; para cada um exige `this.lockItemForUpdate(` e que nenhuma leitura SEM lock (`this.saldoOf(`, `this.saldoOfCustody(`, `this.hasReversalOf(`, `this.isExitReversed(`, `this.findExitBySource(`) apareça depois do lock; publica o universo na mensagem | universo ⊇ {createMovement, createTransfer, reverseMovement, createExitForSource, removeExitForSource} (5, `[04]`) e todos com lock | apagar a linha do lock em `createTransfer` → D1 vermelho (e A3 vermelho no banco) |
| D2 | a declaração de `insertMovement` lida do fonte contém o parâmetro tipado `ItemWriteLock`; idem as 4 leituras `*Locked` | sim | remover o parâmetro → vermelho (e `npm run check` vermelho) |
| D3 | `cycle-count.service.ts`: dentro de `close`, `.createMovement(` e `.applyClose(` só aparecem **depois** de `uow.run(` (por posição no fonte) | sim | mover o `applyClose` para fora → vermelho |
| D4 | em `PrismaInventoryRepository`, nenhum método que chame `insertMovement` contém `isUniqueViolation(` (a releitura pós-P2002 vive nos wrappers `Rls*`, fora da tx) | sim | devolver o `catch` para dentro de `createExitForSource` → vermelho (e A10 vermelho) |

**Contagem prevista:** T-A 15 · T-B 8 · T-C 6 · T-D 4 = **33 casos novos**, todos com execução real; os 67 de memória `[15]`
permanecem 67 (os 6 casos HTTP de `close` em `inventory-cycle-counts-routes.test.ts:40-119,164` continuam verdes pela porta em
memória). **Cada mutação de T-D é executada UMA vez pelo dev** (ata: caso → mutação → linha vermelha → revert), nunca só descrita.

## 7. CE-G1 e CE-G2 (§5.6 do PLANO_SAN3 — valem para todo bloco)

**CE-G1 — enumeração fail-closed.** O único guard/censo citado no teste de encerramento é T-D. (a) Fonte da enumeração: o **próprio
fonte** de `src/modules/inventory/inventory-prisma.repository.ts`, varrido por regex por método — nunca lista curada; o universo
medido hoje é 5 (`[04]`) e o teste o **publica** na mensagem de sucesso. (b) Default do membro não previsto: **negar** — método
novo que chegue a `insertMovement`/`avg_cost` sem `lockItemForUpdate` reprova D1; e o token `ItemWriteLock` faz o compilador negar
antes do teste (§3.2). (c) Mutação que deixa o guard vermelho: apagar o lock de `createTransfer` (D1), o parâmetro do token (D2),
mover o `applyClose` para fora da porta (D3), devolver o `catch` para dentro da tx (D4) — cada uma executada e registrada na ata.

**CE-G2 — papel × passo.** Nenhum caso `-db` deste bloco atravessa uma rota: o lock vive abaixo da permissão e o ator passado ao
serviço é `{tenantId, userId, roles: [], permissions: []}` (o repositório e o `CycleCountService` não comparam permissão — medido:
`cycle-count.service.ts` não importa `requirePermission`; a comparação é só nas rotas `[10]`). Onde um passo cita papel de
APLICAÇÃO (regressão em memória `inventory-cycle-counts-routes.test.ts:194-231`, que exercita `manager` e outros por `authHeaders`):
`manager` tem `stock_movements:create` (`catalog.ts:534`) e `cycle_counts:create` (`:537`); `operator` (`:775/:778`) e `inventory`
(`:882/:885`) idem; a rota compara **exatamente** `stock_movements:create` (`inventory.routes.ts:119,129`) e `cycle_counts:create`
(`cycle-count.routes.ts:73`). Papel de **BANCO** nos drills: efêmero `NOSUPERUSER`, `rolbypassrls=false` (default de `CREATE ROLE`;
asserido por `pg_roles`), com `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` — o `FOR UPDATE` exige `UPDATE` e o tem; a policy
`USING`+`WITH CHECK` sem `FOR` vale para `SELECT … FOR UPDATE` — **provado por execução em P13** (1 linha com contexto, 0 sem).

## 8. Escopo permitido e proibido — arquivos exatos

**PERMITIDO (e só isto):**
- `src/modules/inventory/inventory-prisma.repository.ts` — `lockItemForUpdate`, `ItemWriteLock`, leituras `*Locked`, V1–V5,
  mapeamento de P2002 nos wrappers `Rls*` de `reverseMovement`/`createExitForSource`/`removeExitForSource` (fora da tx).
- `src/modules/inventory/cycle-count.service.ts` — `close` via porta; construtor com a porta; fábricas (`:245-281`).
- `src/modules/inventory/cycle-count.repository.ts` — interface (`lockSession`, `applyClose` com `expectedStatus`) + in-memory.
- `src/modules/inventory/cycle-count-prisma.repository.ts` — `lockSession` (`FOR UPDATE`), `applyClose` com CAS.
- `src/modules/inventory/cycle-count.types.ts` — `ApplyCloseInput.expectedStatus`.
- `src/modules/inventory/inventory-uow.ts` (NOVO) · `src/modules/inventory/inventory-uow-prisma.ts` (NOVO) · `src/modules/inventory/index.ts` (export, se preciso).
- `prisma/migrations/20260873000000_add_stock_reversal_unique_index/migration.sql` (NOVO) · `prisma/schema.prisma` (**só comentário**
  junto da l.1508; nenhum atributo) · o 2º índice **só** com a ratificação do §13-a.
- `tests/inventory-balance-lock-race-db.test.ts` · `tests/inventory-cycle-count-close-atomic-db.test.ts` ·
  `tests/inventory-reversal-unique-index-db.test.ts` · `tests/inventory-write-paths-lock-guard.test.ts` (NOVOS).
- `agent-orchestration/**` (comando, atas, pendências, log) · `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`,
  `Kpis/app.js` (só o fallback congelado), `Kpis/index.html` se a hidratação exigir.

**PROIBIDO (o dev reporta, não decide — rito 3):** `src/modules/inventory/inventory.service.ts`, `inventory.repository.ts` (in-memory
de estoque: a interface não muda), `inventory.routes.ts`, `inventory.controller.ts`, `cycle-count.routes.ts`, `cycle-count.controller.ts`,
`inventory.types.ts`, `inventory.calculations.ts` (todos no módulo, mas **fora da necessidade** — tocá-los é divergência a reportar);
`src/modules/mobile/mobile-inventory-sync.ts` (04b), `src/modules/fuel-logs/**`, `src/modules/maintenance-orders/**`, `src/database/**`,
`tests/helpers/**` (só consumo), `.github/**`, `docs/**` (inclusive `achados.jsonl`), `API_CONTRACTS.md`, `RBAC_MATRIX.md`, `.env`,
lockfiles, `frontend/**`, `mobile/**`, qualquer outra migração. Migração destrutiva = parada irredutível (§C7.5).

## 9. Baseline N · meta M ≥ 2N · KPI no PR

**N medido `[15]`:** as 7 suítes de estoque em memória = **67/67** (0 fail, 0 skip, ec 0); suítes `-db` que exercem o ledger de
estoque = **0** (nenhuma das 7 lê `DATABASE_URL`). Valor oficial de `backend_tests` = **2995/2997** (`Kpis/kpis-latest.json`, release
`pr 385`; os 2 skips são os nomeados no orçamento `SKIP_BUDGET_DB=2` do runner `[13][14]`).

**Meta M:** o contrato pede M ≥ 2N; N do que o bloco exerce sob Postgres é 0, então a meta vira piso absoluto: **≥ 30 casos
`-db`/guard novos** (§6 prevê 33), **≥ 2 casos por via** das 6 do mapa (V1: A1,A2,A4,A5,A9,A13 · V2: A3,A7b · V3: A7,A7b,C5 · V4: A6,A10 ·
V5: A8,C6 · V6: B1–B7), **67 → 67** em memória sem morte, e `backend_tests` **≥ 3028/3030** na forma canônica 3 (`DATABASE_URL`
presente: 2997 + 33; os 2 skips permanecem). Sem `DATABASE_URL` (forma 1): +4 pass (T-D) e +3 skips declarados (um por arquivo `-db`).

**KPI no PR (§C3):** `backend_tests` com N e forma do §10 passo 3 (e nota com o passo 4 e a tripla execução); `blocks_completed`
163 → 164; `status: published_per_pr`; `merge_commit`/`approved_head` `null` na autoria. **Se este for o primeiro PR de execução a
mergear depois do #386**, carrega as 4 dívidas do rascunho do `B-SAN3-04a` `[14]`: backfill §C3.5 do #386 (`pr 386` ·
`merge_commit 02bd7dab` · `approved_head 764e175d`); aposentadoria rodada 3 (`git rm` das duas `jurado-san3c2-*` nos dois espelhos +
`sync-agent-agents.mjs --check` verde); versionar o parecer do porteiro do #386; emenda "54 → 56 bloqueantes" no `status-geral.md`.
Se outro PR mergear antes, este faz rebase sem duplicar. A visão gráfica hidrata dos JSON — nada cravado em `app.js`.

## 10. Bateria de validação (forma exata, N esperado, `ec` lido do processo)

1. `DATABASE_URL=postgresql://x npm run db:generate && npm run check` → ec 0 (o token `ItemWriteLock` e `expectedStatus` são checados aqui).
2. `npm run lint` → ec 0.
3. `npm test` (`CORE_SAAS_PERSISTENCE` não exportado → runner assume `memory`; `DATABASE_URL` do cluster descartável exportado = forma
   canônica 3) → **≥ 3028 pass · 0 fail · 2 skipped**; a linha "modo resolvido" do runner colada na ata.
4. `DATABASE_URL=<cluster descartável do bloco> CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-atomic-db.test.ts tests/inventory-reversal-unique-index-db.test.ts`
   → **29 pass · 0 fail · 0 skip**, **3 execuções idênticas com o banco RECRIADO antes de cada** (`DROP DATABASE … WITH (FORCE)` +
   `CREATE DATABASE` + `prisma migrate deploy` — as suítes limpam por tenant, mas a forma canônica é a recriação).
5. `node --test --import tsx tests/inventory-write-paths-lock-guard.test.ts` → 4/4; depois **cada mutação de T-D executada e
   revertida** (saída vermelha colada na ata; `git diff --stat` vazio ao fim).
6. Regressão focada: as 7 suítes de estoque (comando de `[15]`) → 67/67; `tests/financial-*-db.test.ts`, `tests/o6r06-*-db.test.ts`,
   `tests/pg-barrier-scoped-db.test.ts` contra o mesmo cluster → inalteradas (o lock não toca essas tabelas).
7. `npm run build` → ec 0 · `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · `git diff --check`.
8. Migração: `prisma migrate deploy` no descartável → `SELECT indexdef FROM pg_indexes WHERE indexname='stock_movements_reversal_active_key'`
   = 1 linha com `WHERE (reverses_movement_id IS NOT NULL)`; T-C3 automatiza up→down→re-up; o `SELECT` do censo rodado à mão na base
   de demo/dev do bloco com o N publicado.
9. **Vermelho-controle no head-base, executado:** worktree descartável em `65ac41dc` (`git worktree add <dir> 65ac41dc`, **`npm ci`
   próprio** — junction proibida, §C7.1-ter(c)), copiar só as 4 suítes novas, cluster recriado, rodar os passos 4–5 → esperado vermelho
   em A1, A2, A7, A8, A9, A10, B1, B2, B3, B4, C1, C3, C4, C5, C6 e no guard D1/D2 (o lock não existe); colar `# pass/# fail` na ata;
   `git worktree remove --force`.
10. Limpeza §C5: `docker rm -f <cluster do bloco>`, worktree descartável removido, `dist/`, `coverage/`, `*.tsbuildinfo` — em 1 linha.

## 11. Riscos · rollback

| # | risco | mitigação / prova |
|---|---|---|
| R1 | o lock do item serializa TODAS as custódias do mesmo item (throughput) | tx curtas (1 `FOR UPDATE` + ≤2 `aggregate` + ≤2 `INSERT`, zero I/O externo); A1 mede a duração das 20 saídas e a ata publica o tempo total |
| R2 | perdedor esperando o lock estoura o `timeout` da tx interativa do Prisma (5 s → `P2028`) | tx curtas; NÃO subir timeout global; A1 assere 0 × `P2028`; comentário no wrapper documenta `P2028` como "tente de novo" |
| R3 | o censo da migração ABORTA o deploy se houver estornos duplicados de legado (o DAT-002 pode tê-los produzido — P3/P5) | fail-closed por precedente `20260872` (zero mutação); N do censo publicado na ata; produção = decisão humana com o SQL pronto (`P-O6R-B04-ESTORNOS-DUPLICADOS-LEGADO`) |
| R4 | `FOR UPDATE` bloqueia `updateItem`/`applyAbcClasses` do mesmo item por instantes | aceito; sem teste (não é invariante) |
| R5 | deadlock V6 × V1–V5 ou V6 × V6 | ordem global (§3.1-6); A12 e B6 asseguram 0 × `40P01` |
| R6 | o dublê em memória da porta não prova atomicidade | declarado no cabeçalho; a prova é T-B; a regressão de memória só garante contrato |
| R7 | sessões `aberta` com ajustes parciais gravados ANTES do bloco (P-021) | `alreadyAdjusted` mantido sob o lock, na mesma tx; B7 |
| R8 | releitura na tx abortada (`25P02`) reaparece noutra via | D4 + A10 + C5/C6; os wrappers mapeiam P2002 FORA da tx |
| R9 | as 3 suítes `-db` novas não entram na lista curada do job `backend-postgres` (`ci.yml:174-249`) porque `.github/**` é proibido | elas **rodam** no job `backend` via `npm test` com `DATABASE_URL` presente (`ci.yml:15,84-96`) sob o orçamento de skip C5.3 — não ficam cegas; a lista curada é segunda camada → pendência `P-O6R-B04-SUITES-LIST-CI` com dono (§13-c) |
| R10 | `FOR UPDATE` sob RLS exige `UPDATE` na tabela para papéis de aplicação futuros sem esse grant | hoje a app conecta como dono; papel de menor privilégio é assunto do `B-O6R-12` — anotar na pendência dele |
| R11 | colisão de timestamp de migração com PR paralelo | conferir no dia do PR (§4.1); renomear é aditivo |
| R12 | `assertApplicationNamePropagated` falhar para o cliente do papel (a tag não sobreviver ao `buildConnectionStringForRole`) | falha alta e nomeada em A0/B0, nunca silenciosa; se ocorrer, o dev reporta (helper é fora do escopo) — a barreira determinística pode escopar pelo `usename` do papel via admin |

**Rollback:** código = revert do squash (nenhuma outra árvore toca esses arquivos até `03a`, §6 do SAN3); migração =
`DROP INDEX IF EXISTS "stock_movements_reversal_active_key"` (não-destrutivo, provado em T-C3); nenhuma coluna/dado alterado;
o índice antigo `stock_movements_tenant_id_reverses_movement_id_idx` fica (removê-lo seria fora do aditivo).

## 12. Composição sugerida da junta (unanimidade de 3 — dado; `critico-adversarial` antes, ≤ 2 rodadas)

| cadeira | papel | o que julga por execução |
|---|---|---|
| 1 — banco e concorrência | `jurado-06-banco-atomicidade-rls` (suplente `jurado-06-suplente-banco-atomicidade-rls`) ou `jurado-c5-banco-fk-triggers` | `FOR UPDATE` × `KEY SHARE` (A2), ordem de locks (A12/B6), barreira B3, censo e drill C3/C4, RLS sob papel efêmero (A11/B5/P13), `read committed` pinado |
| 2 — diff × plano e invariante | `jurado-c5-validador-diff-plano` (suplente `jurado-c5-suplente-validador-diff-plano`) | cada via do §2.2 tem lock no diff, D1 enumera pelo fonte, mutações executadas, escopo §8 respeitado, nada em `inventory.service.ts` |
| 3 — contrato, regressão e KPI | `jurado-06-contrato-regressao-kpi` (suplente `jurado-06-suplente-contrato-regressao-kpi`) | 67 → 67, consumidores fuel/maintenance intactos (409/422 iguais), `backend_tests` reexecutado com N e forma, tripla execução, dívidas do #386 |

**Aviso medido `[20]`:** esses seis especialistas **não estão em `origin/main@02bd7dab`** — existem só como untracked na árvore da
sessão (`.claude/agents/especialistas/`). O `inspetor-de-terreno-da-junta` confere por nome; ausentes na ref, a `agente-fabrica`
os cria (ciclo 1–2, §C7.4) ou a cadeira é ocupada por papel permanente com declaração. Rito: inspetor libera antes (worktree +
`npm ci` + cluster `postgres:16` por jurado; base viva intocada; S0 do espelho Codex); quem acha ≠ quem planeja ≠ quem conserta
(§C7.4-bis); o dev é distinto deste planejador; toda reprovação volta a este papel em **Fable**.

## 13. Decisões que só o orquestrador toma, ANTES de o dev começar (1 linha cada, na ata)

- **(a)** ratificar o 2º índice parcial `(tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL` na mesma migração
  (§4.3; fora da autorização nominal) — recomendação: **ratificar**; senão nasce `P-O6R-B04-AJUSTE-SEM-BACKSTOP-DE-BANCO`.
- **(b)** quem flipa o `status` de `Ω6R-DAT-002`/`DAT-003` em `docs/revisoes/O6R/achados.jsonl` (fora do escopo) — recomendação: o porteiro.
- **(c)** abrir `P-O6R-B04-SUITES-LIST-CI` (R9) com dono nomeado (bloco com `.github/**` autorizado).
- **(d)** o TOCTOU de `recordEntryCount` (§2.2, nota): fechar de graça com 1 linha (`where: {…, cycle_count: { status: "aberta" }}`)
  ou abrir pendência nomeada — recomendação: pendência (não é o teste de encerramento; não inflar o diff de invariante).
- **(e)** journal em memória para a porta (§3.4) — recomendação: não neste bloco; pendência só se a junta exigir.
- **(f)** as dívidas do #386 (§9) — confirmar se este PR ou o do `B-SAN3-04a` (em paralelo, container `plan-bsan304a-redis` vivo `[16]`) as carrega.

## 14. Registro de medições (comando → saída relevante) — cronológico, todas executadas por esta instância

- **[00]** `MSYS_NO_PATHCONV=1 git show 'origin/main:.claude/agents/planejador-mestre.md'` (o Git Bash traduz `origin/main:` em caminho sem
  a variável) → frontmatter `model: fable`, tools Read/Grep/Glob/Bash; parágrafos `D-FALLBACK-MODELO-FABLE-OPUS` e `D-PLANEJADOR-MODELO-FABLE`.
- **[01]** `git log --oneline -5` → `65ac41dc docs(b-o6r-04a): comando do bloco` sobre `02bd7dab (#386)`; `git rev-parse HEAD` = `65ac41dc…`;
  `git merge-base HEAD origin/main` = `02bd7dab…`; `git status --short` → vazio.
- **[02]** `wc -l src/modules/inventory/*.ts` → 20 arquivos, 5116 linhas (`inventory-prisma.repository.ts` 914 · `inventory.service.ts` 739 ·
  `cycle-count.service.ts` 281 · `cycle-count-prisma.repository.ts` 264).
- **[03]** `ls tests | grep -iE "inventory|cycle|stock|estoque"` → 7 arquivos + `checklist-run-lifecycle-db` (falso positivo de "cycle").
- **[04]** grep gerador (§2.1-a) → `insertMovement(` chamado em `:236, :253, :263, :309, :386, :416`; `stockMovement.create` só em `:436`;
  `stockMovement.aggregate` em `:480, :597, :628`; `wouldOverdraw(` em `:216, :248, :304, :381`; `inventoryItem.updateMany` em `:224, :563`;
  `withTenantRls(` nos wrappers `:670-748` e `cycle-count-prisma.repository.ts:154-181`; `applyClose` `:100/:175`, `cancelSession` `:122/:179`;
  `cycle-count.service.ts:182` (createMovement), `:207` (applyClose); zero `stockMovement.update|delete|createMany`.
- **[05]** grep de consumidores externos → `fuel-logs/fuel-log.service.ts:564,575`; `maintenance-orders/maintenance-order.service.ts:709,720`;
  `notifications/fleet-alerts.runner.ts:103` (`createDefaultInventoryRepository`, leitura); nenhum acesso direto a `stock_movements`/`cycle_counts`.
- **[06]** `cat src/database/rls.ts` → `withTenantRls = client.$transaction(async tx => { set_config('app.current_tenant_id', …, true); return work(tx) })`
  — **sem `isolationLevel`** (READ COMMITTED); uma transação por método público dos wrappers `Rls*`.
- **[07]** `prisma/schema.prisma:1414-1563` → `InventoryItem` `@@unique([tenant_id, id])` (l.1448); `StockMovement` sem coluna de saldo,
  `reverses_movement_id` só `@@index` (l.1508), FK composta `item` (l.1493) e `cycle_count` (l.1494); comentário do índice parcial `source_active_key`
  (l.1483-1487); `CycleCount.status String` sem enum (l.1521); `CycleCountEntry @@unique([tenant_id, cycle_count_id, item_id])` (l.1559).
- **[08]** `ls prisma/migrations | tail -8` → última `20260872000000_add_reversal_pair_fk`; `20260828` cria `stock_movements_tenant_id_reverses_movement_id_idx`
  (l.80-81, não único); `20260832` l.64-66 = molde do índice parcial único; `20260872` = molde do censo `DO $censo_fk$` fail-closed + `NOT VALID`/`VALIDATE`.
- **[09]** policies: `20260717` l.69-74 (`inventory_items`) e l.109-114 (`stock_movements`); `20260718` l.65-70 (`cycle_counts`) e l.107-112 (`cycle_count_entries`)
  — todas `ENABLE + FORCE`, `USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK (idem)`, sem `FOR`;
  `cycle_counts.status TEXT NOT NULL DEFAULT 'aberta'` sem CHECK (l.42).
- **[10]** `inventory.routes.ts`: `POST /stock-movements` l.117-123 (perm l.119), `POST /:movementId/reverse` l.127-133 (l.129);
  `cycle-count.routes.ts`: open l.47-53 (l.49), entries PATCH l.63-69 (l.65), close l.71-77 (l.73), cancel l.79-85 (l.81) — todos `cycle_counts:create`.
- **[11]** `catalog.ts`: blocos `manager:414 · technician:579 · field_dispatcher:628 · viewer:676 · operator:730 · finance:809 · inventory:873 ·
  field_technician:895 · auditor:944 · support:1014`; `stock_movements:create` l.534/775/882; `cycle_counts:create` l.537/778/885; só `:read` em 714-717, 825-828, 989-992.
- **[12]** arnês: `tests/helpers/pg-barrier.ts` exporta `buildApplicationName:33`, `withApplicationName:41`, `assertApplicationNamePropagated:51`,
  `countBlockedStatements:69`, `waitForOwnBlockedStatement:91`, `captureSettled:163`, `expectRejected:171`, `expectAllFulfilled:180`;
  `createEphemeralRole` (`auth-identity-fixture.ts:324-364`) → `{ roleName, client, drop }`, `CREATE ROLE … LOGIN … NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
  + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` dentro de `withRoleCatalogLock`; drill `o6r06-usage-atomic-db.test.ts`: bootstrap l.574,
  papel + `pg_roles` l.620-628, isolamento l.463, teardown por tenant em ordem de FK l.714-740; corrida `financial-entry-delete-reverse-race-db.test.ts`:
  `RACE_N=20` l.37, `40P01` nunca aceitável l.87, barreira vencedor-emulado/perdedor-real l.196-262.
- **[13]** CI/runner: `.github/workflows/ci.yml` l.15 `DATABASE_URL` no job `backend`, l.84-96 (`migrate deploy` → `npm run check` → `npm test` → build);
  job `backend-postgres` l.106+, lista curada l.174-249, guard "zero pulos" l.252-262; `scripts/run-backend-tests.mjs`: `SKIP_BUDGET_DB = 2`
  (os 2 de `permission-catalog-db-parity`), modo `memory` quando `CORE_SAAS_PERSISTENCE` não é exportado, piso estrutural por arquivo.
- **[14]** `Kpis/kpis-latest.json` → `backend_tests 2995/2997`, `blocks_completed 163`, `flutter_tests 864/864`, `frontend_smoke_tests 1126/1126`,
  `release.pr 385`, `merge_commit 15ef3fbe…` — o #386 não atualizou KPI (dívidas); rascunho `scratchpad/cmd-B-SAN3-04a.md` l.76-90 lista as 4 dívidas
  (`approved_head 764e175d`). O comando `B-SAN3-04a` **não existe** em `agent-orchestration/codex/comandos/` no head `65ac41dc`.
- **[15]** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap <7 suítes de estoque>` → `# tests 67 · # pass 67 · # fail 0 · # skipped 0`,
  `ec=0`; `grep -l DATABASE_URL` nas 7 → vazio.
- **[16]** `docker ps -a` → `erp-postgres:5432`, `erp-redis:6379`, `plan-bsan304a-redis:56380` (do planejador paralelo; não tocado). `docker run -d --name plan-b04a-pg
  -e POSTGRES_USER=plan -e POSTGRES_PASSWORD=plan -e POSTGRES_DB=erp_plan_b04a -p 56542:5432 postgres:16` → `pg_isready` OK;
  `DATABASE_URL=postgresql://plan:plan@localhost:56542/erp_plan_b04a?schema=public npx prisma migrate deploy` → "All migrations have been successfully applied"
  (última `20260872000000`), `ec=0`; `git status --short` → vazio.
- **[17]** **SONDA `scratchpad/probe-b04a-v2.mts`** (13,4 KB; escrita por mim; importa os repositórios de PRODUÇÃO do worktree por URL de arquivo; papel =
  superuser do container salvo P13). Comando: `cd b04a && DATABASE_URL=… CORE_SAAS_PERSISTENCE=prisma LOG_LEVEL=silent NODE_ENV=test node --import tsx
  …/probe-b04a-v2.mts` → `ec=0`; saída íntegra em `scratchpad/probe-b04a-v2.out.json`. Resultado (head `65ac41dc`, 1 passada):
  | sonda | via | forma | resultado | invariante | vermelho? |
  |---|---|---|---|---|---|
  | P1 | V1 | `saida` ×20, BASE=10, qty 1 | 12 ok / 8 × `insufficient_balance`; **saldoBase −2** | I1 | **SIM** |
  | P2 | V2 | `link` ×20, BASE=10→viatura | 10 ok / 10 × 409; base 0 / viatura 10 | I1 | não (agendamento; código = P1) |
  | P3 | V3 | `reverseMovement` ×2 do mesmo movimento | 2 ok; **2 compensações**; saldo 13 | I3 | **SIM** |
  | P4 | V4 | `createExitForSource` ×20 fontes distintas | 10 ok / 10 × 409; base 0 | I1 | não (agendamento) |
  | P5 | V5 | `removeExitForSource` ×2 da mesma fonte | 2 ok; **2 compensações**; saldo 13 | I3 | **SIM** |
  | P6 | V6 | `close` ×2 da mesma sessão (10 → 7) | 2 ok; **2 ajustes**; saldo 4 | I2 | **SIM** |
  | P7 | V1 | `entrada` ×2 (10@3 sobre 10@1) | **avg_cost 2,0** (esperado 2,333333) | I4 | **SIM** |
  | P8 | V1 | `ajuste −1` ×20 | 10 ok / 10 × 409; base 0 | I1 | não (agendamento) |
  | P9 | V4 | mesma fonte ×2, 10 iterações | `{ ok: 10, "current transaction is aborted…": 10 }` — **um perdedor `25P02` em 10/10** | I5 | **SIM** |
  | P10 | — | `current_setting('transaction_isolation')` em `withTenantRls` | `read committed` | premissa | pinada |
  | P11 | V1 | A: `FOR UPDATE` item + INSERT −10 sem commit; B: `createMovement(−1)` real | B **bloqueou em `stock_movements`** (2 polls), não resolveu enquanto A segurava; liberado: ok; **saldo −1** | I1 | **SIM** |
  | P12 | V6 | `close` com 3 itens, 3º estoura saldo (até 3 tentativas) | **2 ajustes gravados**, sessão `aberta`, erro `insufficient_balance` | I2 | **SIM** |
  | P13 | — | `SELECT … FOR UPDATE` sob papel `NOSUPERUSER NOBYPASSRLS` | `rolsuper=false, rolbypassrls=false`; **1 linha com contexto, 0 sem** | RLS | prova positiva |
  Leitura honesta: verde em P2/P4/P8 é **sorte de agendamento** (janela entre o `aggregate` e o `INSERT`, pool de 10) — o defeito é o mesmo de P1 por
  construção; por isso o teste de encerramento tem a barreira determinística (A2), não só `Promise.all`.
- **[18]** `src/modules/financial-uow/{financial-uow,financial-uow-prisma}.ts` → porta `run(tenantId, work)` sobre `withTenantRls`, repositórios construídos com o `tx`;
  memória = mutex por tenant + journal (M1). `tests/financial-period-lock-guard.test.ts:67` reprova `pg_advisory` fora de `src/database/financial-period-lock.ts`.
  `docs/omega-pd.md:365-372` (PD-O6R-B01-ISOLAMENTO): advisory lock vetado pela junta "porque o lock não alcança todo escritor". Idioma `FOR UPDATE` + re-verificação:
  `src/modules/auction/auction-prisma.repository.ts:96-569`, `auction-settlement-prisma.repository.ts:45-233`.
- **[19]** `src/modules/mobile/mobile-inventory-sync.ts:99-100` → `syncReceipts = new Map`, `inventoryByTenant = new Map` (memória; alvo do 04b).
- **[20]** `git ls-tree origin/main .claude/agents/especialistas/ | grep jurado-06|jurado-c5|critico-c5` → **vazio**; os mesmos existem na árvore da sessão
  (`ls .claude/agents/especialistas/`); permanentes em `origin/main`: `agente-pesquisador-web`, `critico-adversarial`, `inspetor-de-terreno-da-junta`,
  `planejador-mestre`, `porteiro-pos-merge`. `@prisma/client` = **7.8.0**.
- **[21]** `inventory.service.ts`: chamadas ao repositório em `:298` (createMovement), `:338` (createTransfer), `:361` (reverseMovement), `:430/:439/:444`
  (createExitForSource: posse, fast-path, seam), `:471` (removeExitForSource); `inventory.controller.ts:120,172`; `cycle-count.controller.ts:88-96` (close).
- **[22]** `cycle-count.repository.ts:15-28` (interface; in-memory `applyClose` l.117-139 sem condição); `cycle-count.types.ts:94-99` (`ApplyCloseInput`),
  `:128-135` (`cycleCountNotOpen` → 422 `invalid_status_transition`); `inventory.types.ts:372` (409 `insufficient_balance`), `:405` (409 `movement_already_reversed`),
  `:438` (409 `stock_baixa_reversed`).
- **[23]** Fragmentos da instância 1 no scratchpad: `plan-s00.md…plan-s11-apendice-extra.md`, `plan-s99-apendice.md` (12:26–12:41), `probe-head-base.mts`,
  `probe-part1..3.mts`, `probe-p9.mts` (12:18–12:22) — lidos; nada entrou sem a minha execução (§0).
- **[24]** Limpeza: `docker rm -f plan-b04a-pg` executado ao fim (linha final abaixo); nenhum arquivo do worktree criado/alterado (`git status --short`
  vazio antes e depois de cada execução); sondas, saída e partes ficam só no scratchpad.

FIM DO PLANO

> **Limpeza executada (2026-09-13):** `docker rm -f plan-b04a-pg` → removido (0 containers com esse nome depois); `git status --short` do worktree `b04a` → 0 linhas; base viva intocada. Artefatos desta instância só no scratchpad: `probe-b04a-v2.mts`, `probe-b04a-v2.out.json`, `b04a-parts/`.
