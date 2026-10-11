type Hooks = { unitMs?: number[]; betweenUnitsMs?: number; failAfterUnits?: number; inUnitHoldMs?: (itemId: string) => number; beforeUnitCommitMs?: (itemId: string) => number; marks?: any[] };
const num = (v: any) => (v === null || v === undefined ? undefined : Number(v));
// v3: abortClose — sob FOR UPDATE da sessao, fechando + 0 carimbos -> CAS aberta ("reverted"); carimbos>0 -> "kept"
async function abortClose(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (rows[0]?.status !== "fechando") return { status: "not_closing", current: rows[0]?.status };
    const n = ((await tx.$queryRawUnsafe(STAMPED, t, s)) as any[])[0].n;
    if (n > 0) return { status: "kept", stamped: n };
    const r = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "fechando" }, data: { status: "aberta" } });
    return r.count === 1 ? { status: "reverted" } : { status: "not_closing" };
  });
}
async function closeV(kind: "v2" | "v3", client: any, t: string, s: string, userId: string, hooks: Hooks = {}) {
  const begin: any = await beginClose(client, t, s);
  if (begin.status === "not_found") throw err(404, "not_found");
  if (begin.status === "not_open") throw cycleCountNotOpen(begin.current);
  const pending = begin.entries
    .filter((e: any) => num(e.counted_quantity) !== undefined && num(e.counted_quantity) !== num(e.system_quantity) && !e.adjustment_movement_id)
    .sort((a: any, b: any) => (a.item_id < b.item_id ? -1 : 1));
  let totalV2 = 0; let applied = 0; let skipped = 0; let reused = 0; let abort: any = null;
  try {
    for (const p of pending) {
      if (hooks.failAfterUnits !== undefined && applied + skipped >= hooks.failAfterUnits) throw Object.assign(new Error("HOOK-FAIL"), { applied });
      const tu = Date.now(); const r: any = await withTenantRls(client, t, async (tx: any) => {
        const srow: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
        if (srow[0]?.status !== "fechando") throw cycleCountNotOpen(srow[0]?.status ?? "cancelada");
        const e = await tx.cycleCountEntry.findFirst({ where: { tenant_id: t, cycle_count_id: s, id: p.id } });
        if (e.adjustment_movement_id) return { skip: true };
        const variance = roundToDecimalPrecision(Number(e.counted_quantity) - Number(e.system_quantity));
        if (variance === 0) return { skip: true, zero: true };
        const inv = new invMod.PrismaInventoryRepository(tx);
        const prior = (await inv.listMovements({ tenantId: t, cycleCountId: s, itemId: e.item_id, limit: 1, offset: 0 })).items[0];
        const input = { itemId: e.item_id, type: "ajuste", quantidadeSinalizada: variance, reason: "contagem ciclica " + s, cycleCountId: s, createdBy: userId };
        const hold = hooks.inUnitHoldMs?.(e.item_id) ?? 0;
        const movement = prior ?? (await createMovementLocked(tx, t, input));
        if (hold) { hooks.marks?.push(["A: item travado, segurando", now()]); await sleep(hold); }
        if (!movement) throw err(400, "invalid_item_reference");
        await tx.cycleCountEntry.updateMany({ where: { tenant_id: t, cycle_count_id: s, id: e.id }, data: { variance, adjustment_movement_id: movement.id } });
        const bh = hooks.beforeUnitCommitMs?.(e.item_id) ?? 0; if (bh) await sleep(bh); // gancho DENTRO da tx (T-03)
        let avgCost = 0; if (kind === "v2") { const item = await inv.findItemById(t, e.item_id); avgCost = item?.avgCost ?? 0; }
        return { variance, avgCost, reused: !!prior };
      });
      hooks.unitMs?.push(Date.now() - tu); if (r.skip) skipped++; else { applied++; if (r.reused) reused++; totalV2 += r.variance * r.avgCost; }
      if (hooks.betweenUnitsMs) await sleep(hooks.betweenUnitsMs);
    }
  } catch (e) {
    if (kind === "v3") { try { abort = await abortClose(client, t, s); } catch (e2) { abort = { status: "abort_failed", err: errInfo(e2) }; } (e as any).abort = abort; }
    throw e;
  }
