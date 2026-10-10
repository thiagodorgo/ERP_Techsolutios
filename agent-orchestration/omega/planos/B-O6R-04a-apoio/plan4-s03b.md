### 3.3 V6 em UNIDADES — máquina de estados `aberta → fechando → concluida`, com saída em toda falha (S-01) e total da sessão inteira (S-02)

**Por que unidades por item e não uma transação (emenda 2-h, inalterado):** a tx única é O(N) sob timeout fixo de 5 s (`withTenantRls` sem opções) — teto ≈ 650 itens (r1 A-06); a unidade
por item segura **um** item por ≈ 15–30 ms `[10]`, cabe para qualquer N, e o estado intermediário é persistido e retomável. Lotes reintroduziriam k locks e a ordem (I7) — rejeitado.

**Estados:** `aberta` → `fechando` → `concluida`; `aberta → cancelada` e **`fechando (0 carimbos) → cancelada`** por CAS; **`fechando (0 carimbos) → aberta`** por `abortClose` (S-01).
`CYCLE_COUNT_STATUSES` ganha `"fechando"` (`cycle-count.types.ts:5`); a listagem o aceita. **O que `fechando` significa agora:** "há um fechamento em curso ou interrompido"; nele,
`close` retoma; `recordEntry` é aceito para entry **não carimbada** e recusado para carimbada; `cancel` é aceito só com **0 carimbos**.

**API do repositório (`CycleCountRepository`, in-memory e Prisma) — cada método é UMA transação:**
```ts
type BeginCloseOutcome = { status: "started" | "resumed"; session; entries } | { status: "not_found" } | { status: "not_open"; current: CycleCountStatus };
beginClose(tenantId, id): Promise<BeginCloseOutcome>;                 // sessão FOR UPDATE; aberta → CAS fechando ("started"); fechando → "resumed"; senão not_open
lockSessionForUpdate(tenantId, id): Promise<CycleCount | undefined>;   // dentro da unidade (via porta), ANTES do item
findEntry(tenantId, id, entryId): Promise<CycleCountEntry | undefined>;// releitura sob o lock da sessão
stampEntry({ tenantId, cycleCountId, entryId, variance, adjustmentMovementId }): Promise<void>;
abortClose(tenantId, id): Promise<{ status: "reverted" } | { status: "kept"; stamped: number } | { status: "not_closing"; current? }>;
  // sessão FOR UPDATE; exige fechando; count(adjustment_movement_id) = 0 → CAS fechando→aberta ("reverted"); > 0 → "kept" (S-01)
finishClose(tenantId, id, updatedBy?): Promise<{ status: "ok"; session: CycleCountWithEntries; totalVarianceValue: number } | { status: "not_open"; current } | { status: "pending"; remaining: number }>;
  // sessão FOR UPDATE; exige fechando; pendentes = 0 → total = SUM(variance × avg_cost) das carimbadas (mesma tx) → CAS fechando→concluida (S-02)
recordEntryCount(input): Promise<{ status: "ok"; entry } | { status: "not_found" } | { status: "not_open"; current } | { status: "entry_adjusted" }>;
cancelSession(tenantId, id, updatedBy?): Promise<{ status: "ok"; session } | { status: "not_found" } | { status: "not_open"; current } | { status: "close_in_progress"; stamped: number }>;
createSession(input): Promise<CycleCountWithEntries>;                 // lança itemsInOpenSessionError(n) — §3.5
```
`applyClose` **sai** da interface (D4 reprova qualquer uso). Prisma: `beginClose`/`finishClose`/`abortClose`/`cancelSession` = `$queryRaw … FOR UPDATE` tagged + `updateMany({ where: { tenant_id,
id, status: <esperado> } })` com `count === 1` (senão relê e devolve `not_open`). O total (S-02) é UMA SQL sob o lock:
`SELECT COALESCE(SUM(e.variance * i.avg_cost),0) FROM cycle_count_entries e JOIN inventory_items i ON i.tenant_id=e.tenant_id AND i.id=e.item_id WHERE e.tenant_id=$1 AND e.cycle_count_id=$2 AND e.adjustment_movement_id IS NOT NULL`
(`[04]` TVV: −30/−60). In-memory: `InMemoryCycleCountRepository` recebe um resolvedor opcional `avgCostOf(tenantId, itemId)` (a fábrica de memória em `cycle-count.service.ts:245` passa
`getMemoryInventoryRepositoryForTests().findItemById`) — mesma fórmula, sem lock (mono-thread).

**`CycleCountService.close(actor, id, hooks?)`:**
1. `begin = repository.beginClose(...)` → `not_found` → 404 · `not_open` → 422 `cycleCountNotOpen(current)`.
2. `pending = entries.filter(counted !== undefined && counted !== system && !adjustmentMovementId)`, ordenadas por `itemId` (só determinismo).
3. Para cada `entry`, **uma** `uow.run(tenantId, async ctx => { s = ctx.cycleCounts.lockSessionForUpdate(…); if (s?.status !== "fechando") throw cycleCountNotOpen(…); e = ctx.cycleCounts.findEntry(…);
   if (e.adjustmentMovementId) return "skip"; variance = round(e.counted − e.system); if (variance === 0) return "skip" /* recontada para o sistema em fechando */;
   prior = ctx.inventory.listMovements({ cycleCountId, itemId, limit 1 }).items[0] /* P-021 */; movement = prior ?? ctx.inventory.createMovement({ type: "ajuste", cycleCountId, … }) /* V1 real: lock do item DENTRO desta tx */;
   if (!movement) throw invalid_item_reference(400); ctx.cycleCounts.stampEntry({…}); await hooks?.beforeUnitCommit?.({ index, itemId }) /* T-03: DENTRO da tx, segurando sessão + item */; })`.
   **Sem** `findItemById` nem acúmulo por chamada (S-02): o total vem do passo 5.
4. **Em qualquer erro do laço** (409/400/503/`not_open`): `abort = repository.abortClose(...)` em tx própria; se `reverted` → a sessão está `aberta` de novo (estado do head-base, limpo);
   se `kept` → fica `fechando` com as unidades aplicadas; em ambos, **o erro original propaga** (mesmo status de hoje); a falha do próprio `abortClose` não engole o erro (log + propaga —
   a sessão fica `fechando` com 0 carimbos, de onde `cancel`, `recordEntry` e `close` continuam possíveis: I11 vale mesmo assim).
5. `fin = repository.finishClose(...)` → `not_open` → 422 · `pending` → 409 `close_incomplete` (defesa; sessão segue `fechando`) · `ok` → `{ cycleCount: fin.session, totalVarianceValue: fin.totalVarianceValue }`.
Provado `[04]`: STUCK_v3 (`reverted`), STUCK_partial_v3 (`kept`, retomada `resumed`), TVV_resume_v3 (−30), TVV_concorrente_v3 (−60 em 5/5, vencedor ora `started` ora `resumed`), v2 `[10-CRASH]`/`[10-LEGACY]` (retomada e P-021 — o mecanismo de unidade não mudou).

**Concorrência de dois `close`:** ambos passam por `beginClose` (o 2º lê `fechando` → `resumed`) e alternam unidades sob o `FOR UPDATE` da sessão; cada unidade relê o carimbo; `finishClose` tem
CAS → **exatamente um 200**, com o total da sessão inteira (`[04]` TVV_concorrente_v3: 5/5); o outro 422. Backstop de banco: índice único `(tenant_id, cycle_count_id, item_id)` (§4).
**Gancho de teste:** `hooks?: { beforeUnitCommit?(unit: { index: number; itemId: string }): Promise<void> }` — só o teste o passa (a rota não); B2 lança na unidade 8 (→ 7 aplicadas), B8/A12
dormem 1,5 s segurando sessão + item (`[07]` LO). O gancho pós-commit `onUnitApplied` do v2 **não existe** (T-03).
