## 3. Desenho

### 3.1 V1–V5: row lock `FOR UPDATE` na linha `inventory_items(tenant_id, id)` ANTES da primeira leitura que decide — como TIPO (inalterado da v2; D-02 fecha o guard)

Sobreviveu às duas rodadas (r1 §3.2-3; r2 §5.1) e foi provado pelo v2 (`[10-V1]`, `[10-P11-new]`, `[10-V7]`, `[10-V3/V4/V5]`); a v3 não muda o mecanismo. `FOR UPDATE` (não `NO KEY
UPDATE`) porque só ele conflita com o `KEY SHARE` que todo `INSERT` em `stock_movements` toma na linha do item pela FK — é o que serializa até um escritor que esqueça o lock.

```ts
// src/modules/inventory/inventory-prisma.repository.ts
declare const ItemWriteLockBrand: unique symbol;
export type ItemWriteLock = { readonly [ItemWriteLockBrand]: true; readonly item: InventoryItem };   // SÓ lockItemForUpdate produz
private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
  const rows = await this.client.$queryRaw<ItemRecord[]>`SELECT * FROM "inventory_items" WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid FOR UPDATE`;
  return rows[0] ? ({ item: mapItemRecord(rows[0]) } as ItemWriteLock) : undefined;   // undefined = inexistente/outro tenant → 400/404 como hoje
}
private saldoOfCustodyLocked(lock, custody) · saldoOfLocked(lock) · hasReversalOfLocked(lock, ids) · movementsInGroupLocked(lock, groupId) · isExitReversedLocked(lock, id)
private insertMovement(input, lock: ItemWriteLock)
```
**(D-02) As versões SEM lock que DECIDEM — `saldoOf`, `saldoOfCustody`, `hasReversalOf`, `isExitReversed`, `movementsInGroup` — deixam de existir** no arquivo (o guard D2 reprova a
mera presença). Ficam, sem lock e ANTES do lock, apenas as leituras de **identificação**, que só dizem QUAL item travar: `findMovementById` (V3) e `findExitBySource` (V4/V5); o que
elas devolvem é relido sob o lock antes de qualquer decisão (`hasReversalOfLocked` em V3/V5; `findExitBySourceLocked` em V4 — hoje `:370`). `$queryRaw` tagged (nunca `Unsafe` com string
montada). Via nova que chame `insertMovement` ou uma leitura `*Locked` sem o token é `TS2554`/`TS2345` no `npm run check` (CE-G1). A interface pública `InventoryRepository` não muda.

| via | mudança exata | prova |
|---|---|---|
| **V1** | `findItemById:207` → `lockItemForUpdate`; `saldoOfCustodyLocked` → `wouldOverdraw` → [`saldoOfLocked` + `avg_cost`] → `insertMovement(…, lock)` | v2 `[10-V1]`, `[10-V7]`, `[10-P11-new]` |
| **V2** | `findItemById:240` → `lockItemForUpdate`; as duas pernas sob o mesmo lock (mesmo `itemId`) | mesma mudança |
| **V3** | `findMovementById:278` (identificação) → `lockItemForUpdate(original.itemId)` → `movementsInGroupLocked` + `hasReversalOfLocked` sob o lock → pernas sob o lock; perna com `itemId ≠ original.itemId` = dado corrompido → 409 `transfer_group_inconsistent`, **nunca 2º lock** (I7) | v2 `[10-V3]`; `[07]` C7_v3 |
| **V4** | `lockItemForUpdate` ANTES de `findExitBySourceLocked`/`isExitReversedLocked`/saldo; o `catch` de P2002 (`:398-404`) **sai da tx** para o wrapper `Rls*` (§3.8) | v2 `[10-V4]` |
| **V5** | `findExitBySource:411` (identificação, sem lock) → `lockItemForUpdate(exit.itemId)` → `isExitReversedLocked` → insert sob o lock; P2002 do índice novo → `undefined` no wrapper, fora da tx | v2 `[10-V5]`; `[07]` C8_v3 |

### 3.2 I7 — o mecanismo que DISPENSA ordem global de locks (emenda 2-i; enunciado corrigido — N-I7)

Regra (I7 v3, §1): **toda tx que toma `FOR UPDATE` de item toma exatamente um, e a sessão antes; quem segura locks fracos em N itens (`open` KEY SHARE, `recalculateAbc` NO KEY
UPDATE) não toma `FOR UPDATE` e nunca espera por sessão nem por tenant.** Por que não há ciclo: um ciclo exige dois participantes que seguram algo e esperam algo. Quem segura
`FOR UPDATE` de um item (V1–V5, a unidade do V6) só esperou **antes** de tê-lo (pelo próprio item, ou pela sessão) e não pede mais nada depois; `open` segura KEY SHARE de Y e
espera KEY SHARE de X (bloqueado pelo `FOR UPDATE` da unidade), mas a unidade não pede Y; `recalculateAbc` idem com NO KEY UPDATE; `recordEntry`/`cancel`/`abortClose`/`finishClose`
seguram só a linha da sessão e não pedem item; `open` segura a linha do tenant (`NO KEY UPDATE`) e pede KEY SHARE de itens — ninguém que segure item pede a linha do tenant.
Medido `[07]` LO: unidade v3 segurando sessão + X **dentro da tx** × `open()` real / × `recalculateAbc()` real → B bloqueia e conclui, **0 × `40P01`**; controle v1 → `40P01`. `[04]` PRE:
`NO KEY UPDATE` na linha do tenant × INSERT de movimento (KEY SHARE pela FK `tenant_id`) → não conflita (70 ms). O guard D2 reprova método com >1 `lockItemForUpdate(` ou lock após laço;
o D8 reprova `createSession` sem o lock do tenant; B8 mantém o controle vermelho embutido (`40P01` na emulação v1) e o verde no código real com o gancho **dentro** da tx.
