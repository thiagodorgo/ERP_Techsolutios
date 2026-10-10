### 3.4 `recordEntry` (V7) e `cancel` (V8) — as saídas do `fechando` (S-01) sem reabrir A-01/A-02

- **`recordEntryCount` (Prisma), na mesma tx:** `SELECT status FROM cycle_counts WHERE tenant_id AND id FOR SHARE` → ausente → `not_found`; `concluida|cancelada` → `not_open`;
  **`aberta`** → `updateManyAndReturn({ where: { tenant_id, id: entryId, cycle_count_id } })` (como hoje); **`fechando`** → o mesmo UPDATE **com `adjustment_movement_id: null` no `where`**
  (predicado na própria linha, avaliado sob o `FOR SHARE` da sessão — a unidade que carimba segura `FOR UPDATE`, logo as duas serializam e o predicado é relido na versão nova); 0 linhas →
  relê a entry → existe → `entry_adjusted` (422 `CYCLE_COUNT_INVALID/entry_already_adjusted`), não existe → `not_found`. Provado `[04]` B3_v3 (bloqueia no `FOR SHARE`, relê `concluida`,
  entry intacta), `[07]` E34_recordEntry_carimbada (`entry_adjusted`), E34_recordEntry_naoCarimbada (`ok`; a unidade seguinte aplica o contado final; `coerente: true`). Por que é a saída
  certa para o STUCK: o operador corrige a contagem do item que falhou (ou a iguala ao sistema → variância 0 → a unidade pula) e chama `close` de novo — nenhum movimento fictício.
- **`cancelSession` (Prisma), na mesma tx:** `SELECT status … FOR UPDATE` (bloqueia atrás de qualquer unidade em curso) → `aberta` → CAS `updateManyAndReturn({ where: { …, status: "aberta" } })`;
  **`fechando`** → `count(adjustment_movement_id)` sob o lock → **0** → CAS com `status: "fechando"` (a sessão nunca chegou a aplicar nada — crash antes da 1ª unidade ou `abortClose` que
  falhou) · **> 0** → `close_in_progress` (422 `CYCLE_COUNT_INVALID/close_in_progress`, mensagem: "há N ajuste(s) aplicado(s); reconte as entradas pendentes e conclua o fechamento").
  Nunca subconsulta no `WHERE` do UPDATE (o `EvalPlanQual` reavaliaria a subconsulta com o snapshot antigo — seria o A-02 de volta); a contagem é statement próprio **depois** de
  adquirido o lock. Provado `[07]` E34_cancel (`close_in_progress, stamped 1`; sessão `concluida`, `is_active=true`), `[04]` STUCK_v3 (cancel ok em `aberta` após `reverted`).
- In-memory: mesma máquina de estados, sem lock; os 6 casos HTTP de `inventory-cycle-counts-routes.test.ts` seguem verdes (o 422 continua `CYCLE_COUNT_INVALID`).

### 3.5 V9 `open` — um item em no máximo uma sessão não terminal (N-OVL, I9)

`PrismaCycleCountRepository.createSession`, na tx do wrapper: (1) `SELECT id FROM tenants WHERE id = $1 FOR NO KEY UPDATE` (tagged) — serializa os `open` do tenant; `NO KEY UPDATE` porque
**não conflita com o KEY SHARE** que todo INSERT com FK `tenant_id` toma (medido `[04]` PRE: 70 ms sem bloqueio) e conflita entre `open`s; `tenants` não tem RLS (`relrowsecurity=false`) e o
papel tem `UPDATE` — a linha é sempre a do ator (`input.tenantId`), não uma escolha do cliente; (2) `SELECT DISTINCT e.item_id FROM cycle_count_entries e JOIN cycle_counts c ON c.tenant_id=e.tenant_id
AND c.id=e.cycle_count_id WHERE e.tenant_id=$1 AND c.status IN ('aberta','fechando') AND e.item_id = ANY($2::uuid[])` → linhas > 0 → **lança `itemsInOpenSessionError(n)`** (409
`CYCLE_COUNT_CONFLICT/items_in_open_session`, mensagem com N e sem ids de tenant); (3) `cycleCount.create` + `cycleCountEntry.createMany` como hoje. O serviço (`open:52`) não muda: a
decisão vive no repositório, dentro da tx. In-memory: mesma verificação sobre as sessões em memória. Provado `[07]` OVL_v3: 2º `open` → 409; corrida de 2 `open` × 5 → **1 sessão** (o perdedor
bloqueou no `FOR NO KEY UPDATE` e viu as entries commitadas); `open` após `concluida` → ok. **Não** há verificação no `close`: a propriedade nasce no `open` e as entries nunca são
acrescentadas depois; sessão semeada por SQL cru por cima de outra (B9b) é estado fora do módulo — o teste I7 não assere saldo. Sessões sobrepostas **pré-existentes** ao deploy: o
`open` novo recusa novas; as antigas fecham como hoje (nota na ata, §13).

### 3.6 Porta `InventoryUnitOfWork` — espelho de `src/modules/financial-uow/` (inalterado da v2)
`src/modules/inventory/inventory-uow.ts` (`run<T>(tenantId, work: (ctx: { inventory: InventoryRepository; cycleCounts: CycleCountRepository }) => Promise<T>)`; memória = mutex por
tenant, **sem journal** — emenda 1-e) e `inventory-uow-prisma.ts` (`withTenantRls(prisma, tenantId, tx => work({ inventory: new PrismaInventoryRepository(tx), cycleCounts: new
PrismaCycleCountRepository(tx) }))`). `CycleCountService` recebe a porta como 3º parâmetro; as fábricas (`cycle-count.service.ts:245-281`) a injetam. Uma `run` por **unidade**.

### 3.7 Perdedores por tempo e por deadlock (N-03, emenda 2-m) — inalterado da v2
`P2028`, `40P01` (ORM `DriverAdapterError.cause.code`; raw `P2010.meta.code`), `40001`, `55P03`, `P2034`, `P2024` → `mapTransientDbFailure` nos wrappers `Rls*` e na porta Prisma → 503
`STOCK_UNAVAILABLE/stock_busy` / `CYCLE_COUNT_UNAVAILABLE/cycle_count_busy` (precedente `checklist-prisma.repository.ts:1152-1195`); nada gravado; hoje é 400 cru (v2 `[10-TOK]`).

### 3.8 P2002 nos wrappers — cinto para escritor que não segura o lock (T-02)
`RlsPrismaInventoryRepository.reverseMovement`/`removeExitForSource`/`createExitForSource` envolvem o `withTenantRls` em `try/catch` e mapeiam `isUniqueViolation` → 409
`movement_already_reversed` / `undefined` / releitura da fonte, **fora da tx** (nunca `25P02`). Medido `[07]`: com escritor ORM que respeita a FK, o `23505` é inalcançável sob o lock (o
INSERT alheio toma KEY SHARE e espera o `FOR UPDATE`); com escritor **sem o lock** (SQL cru; linha com `item_id` de outra linha), B bloqueia no INSERT na tupla concorrente do índice e recebe
P2002 → o wrapper responde 409/`undefined`, 1 compensação; head-base: 2. C7/C8 exercitam **esse** escritor (é o único que chega lá).
