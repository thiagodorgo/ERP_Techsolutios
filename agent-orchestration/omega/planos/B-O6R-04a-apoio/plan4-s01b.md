
**Atores (permissão exata que a rota compara — CE-G2, §7):** `POST /api/v1/stock-movements` e `POST …/:movementId/reverse` comparam `stock_movements:create`
(`inventory.routes.ts:119,129`); **`POST /api/v1/cycle-counts` (open, `cycle-count.routes.ts:49`)**, `PATCH …/entries/:entryId` (`:65`), `POST …/close` (`:73`) e `POST …/cancel` (`:81`)
comparam `cycle_counts:create`. Concedidas a `manager`, `operator` e `inventory` (`catalog.ts:534/537, 775/778, 882/885`); `viewer`/`finance` só `:read`; `auditor` nenhuma
(v2 `[04]`, código inalterado). Consumidores service→service sem permissão própria: `fuel-log.service.ts:564,575` e `maintenance-order.service.ts:709,720`. Sistema:
`CycleCountService.close` gera `ajuste` com `cycleCountId` (não forjável pela API pública — `inventory.types.ts:230-235`).

**Fluxo origem→destino hoje e depois (V1):** rota → `requirePermission` → `InventoryController` → `InventoryService.createMovement:298` → `RlsPrismaInventoryRepository.createMovement:692`
→ `withTenantRls` (`$transaction` + `set_config`, `read committed` `[04]`) → `PrismaInventoryRepository.createMovement:206` → `findItemById:207` → `saldoOfCustody:214` → `wouldOverdraw:216`
→ [`saldoOf:221` → `inventoryItem.updateMany:224`] → `insertMovement:236` → `stockMovement.create:436`. **Depois:** `findItemById` vira `lockItemForUpdate` e toda leitura que decide roda
sob o lock (§3.1). **V6 hoje:** `close:137` = `findSessionWithEntries` → `listMovements` → N × `createMovement` (N tx) → `applyClose:207` (`status='concluida'` sem condição,
`cycle-count-prisma.repository.ts:114`). **Depois:** `beginClose` (sessão `FOR UPDATE` + CAS `aberta→fechando`) → uma unidade **por item** (porta `InventoryUnitOfWork`: sessão
`FOR UPDATE` + item `FOR UPDATE` + ajuste + carimbo) → em falha, `abortClose` (S-01) → `finishClose` (sessão `FOR UPDATE` + total da sessão + CAS `fechando→concluida`).
**`open` hoje:** `open:52` = `listItems` (tx própria) → `createSession:24` (tx própria: `cycleCount.create` + `cycleCountEntry.createMany`). **Depois:** `createSession` toma a linha do
tenant (`NO KEY UPDATE`), consulta sobreposição e só então insere (§3.5). Nada muda acima do serviço; nenhuma rota, payload ou permissão nova; um status novo (`fechando`) e três
códigos novos (§5).
