// v3: cancel — sessao FOR UPDATE; aberta -> CAS; fechando com 0 carimbos -> CAS; fechando com carimbos -> close_in_progress
async function cancelV3(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (!rows[0]) return { status: "not_found" };
    const st = rows[0].status;
    if (st !== "aberta" && st !== "fechando") return { status: "not_open", current: st };
    if (st === "fechando") { const n = ((await tx.$queryRawUnsafe(STAMPED, t, s)) as any[])[0].n; if (n > 0) return { status: "close_in_progress", stamped: n }; }
    const u = await tx.cycleCount.updateManyAndReturn({ where: { tenant_id: t, id: s, status: st }, data: { status: "cancelada", is_active: false } });
    return u[0] ? { status: "ok", from: st } : { status: "not_open", current: "?" };
  });
}
// v3: open — lock NO KEY UPDATE na linha do tenant + exclusao de item ja em sessao aberta/fechando (N-OVL)
const TENANT_LOCK = `SELECT id FROM tenants WHERE id=$1::uuid FOR NO KEY UPDATE`;
const OVERLAP = `SELECT DISTINCT e.item_id FROM cycle_count_entries e JOIN cycle_counts c ON c.tenant_id=e.tenant_id AND c.id=e.cycle_count_id WHERE e.tenant_id=$1::uuid AND c.status IN ($3, $4) AND e.item_id = ANY($2::uuid[])`;
async function openV3(client: any, t: string, items: { id: string; saldo: number }[], holdMs = 0) {
  return withTenantRls(client, t, async (tx: any) => {
    const lk: any[] = await tx.$queryRawUnsafe(TENANT_LOCK, t);
    if (!lk[0]) throw err(404, "tenant_not_visible");
    const ov: any[] = await tx.$queryRawUnsafe(OVERLAP, t, items.map((i) => i.id), "aberta", "fechando");
    if (ov.length) throw new CycleCountError(409, "CYCLE_COUNT_CONFLICT", "items_in_open_session", `${ov.length} item(ns) ja em sessao aberta`);
    if (holdMs) await sleep(holdMs);
    const s = await tx.cycleCount.create({ data: { tenant_id: t, status: "aberta" } });
    await tx.cycleCountEntry.createMany({ data: items.map((i) => ({ tenant_id: t, cycle_count_id: s.id, item_id: i.id, system_quantity: i.saldo })) });
    return s.id as string;
  });
}
const svcOf = (c: any) => new CycleCountService(new ccMod.RlsPrismaCycleCountRepository(c), new invMod.RlsPrismaInventoryRepository(c));
const invSvcOf = (c: any) => new InventoryService(new invMod.RlsPrismaInventoryRepository(c));
// v3 V3/V5 — lock do item, releitura sob o lock, insert; P2002/23505 mapeado FORA da tx (no wrapper)
async function reverseV3(client: any, t: string, movementId: string) {
  try {
    return await withTenantRls(client, t, async (tx: any) => {
      const inv = new invMod.PrismaInventoryRepository(tx) as any;
      const original = await inv.findMovementById(t, movementId);
      if (!original) return { status: "not_found" };
      await tx.$queryRawUnsafe(LOCK_ITEM, t, original.itemId);
      if (await inv.hasReversalOf(t, [original.id])) return { status: "already_reversed" };
      const m = await inv.insertMovement({ tenantId: t, itemId: original.itemId, type: original.type, quantidadeSinalizada: -original.quantidadeSinalizada, custody: { custodyType: "base" }, reversesMovementId: original.id });
      return { status: "ok", id: m.id };
    });
  } catch (e: any) {
    if (e?.code === "P2002") return { status: "already_reversed", via: "P2002 fora da tx" };
    throw e;
  }
}
