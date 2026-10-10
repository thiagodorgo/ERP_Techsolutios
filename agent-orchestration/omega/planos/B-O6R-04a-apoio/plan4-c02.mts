async function newSession(t: string, entries: { item: string; system: number; counted?: number }[]) {
  const s = ((await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t)) as any[])[0].id as string;
  const ids: string[] = [];
  const sql = `INSERT INTO cycle_count_entries (tenant_id,cycle_count_id,item_id,system_quantity,counted_quantity) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::numeric,$5::numeric) RETURNING id`;
  for (const e of entries) ids.push(((await admin.$queryRawUnsafe(sql, t, s, e.item, e.system, e.counted ?? null)) as any[])[0].id);
  return { s, ids };
}
async function state(t: string, s: string) {
  const ss: any[] = await admin.$queryRawUnsafe(`SELECT status, is_active FROM cycle_counts WHERE id=$1::uuid`, s);
  const a: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n, COALESCE(SUM(quantidade_sinalizada),0)::float8 AS soma FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
  const e: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS total, count(adjustment_movement_id)::int AS carimbadas FROM cycle_count_entries WHERE cycle_count_id=$1::uuid`, s);
  const d: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS dup FROM (SELECT item_id FROM stock_movements WHERE cycle_count_id=$1::uuid GROUP BY item_id HAVING count(*)>1) x`, s);
  return { status: ss[0]?.status, is_active: ss[0]?.is_active, ajustes: a[0].n, somaAjustes: a[0].soma, entries: e[0].total, carimbadas: e[0].carimbadas, dup: d[0].dup };
}
async function saldoBase(t: string, item: string) { return Number(((await admin.$queryRawUnsafe(`SELECT COALESCE(SUM(quantidade_sinalizada),0)::float8 s FROM stock_movements WHERE tenant_id=$1::uuid AND item_id=$2::uuid AND custody_type=$3`, t, item, "base")) as any[])[0].s); }
async function blockedOf(app: string) { return ((await admin.$queryRawUnsafe(`SELECT left(query,140) q FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type=$2`, app, "Lock")) as any[]).map((r) => r.q); }
async function waitBlocked(app: string, ms = 2500) { const dl = Date.now() + ms; for (;;) { const q = await blockedOf(app); if (q.length) return q; if (Date.now() > dl) return ["<timeout: nao bloqueou>"]; await sleep(20); } }

// ---------------- SQL das emulacoes ----------------
const LOCK_ITEM = `SELECT * FROM "inventory_items" WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid FOR UPDATE`;
const SESS_FU = `SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`;
const SESS_FS = `SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR SHARE`;
const STAMPED = `SELECT count(adjustment_movement_id)::int n FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`;
const PENDING = `SELECT count(*)::int n FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid AND counted_quantity IS NOT NULL AND counted_quantity <> system_quantity AND adjustment_movement_id IS NULL`;
// S-02: total da sessao INTEIRA = variancia carimbada x avg_cost vigente, sob o lock da sessao, na mesma tx do CAS final
const TOTAL = `SELECT COALESCE(SUM(e.variance * i.avg_cost),0)::float8 total FROM cycle_count_entries e JOIN inventory_items i ON i.tenant_id=e.tenant_id AND i.id=e.item_id WHERE e.tenant_id=$1::uuid AND e.cycle_count_id=$2::uuid AND e.adjustment_movement_id IS NOT NULL`;
const err = (status: number, reason: string) => new CycleCountError(status, "CYCLE_COUNT_INVALID", reason, reason);

// V1 v3 = V1 v2 (lock do item ANTES da leitura que decide) — inalterado da v2
async function createMovementLocked(tx: any, t: string, input: any) {
  const inv = new invMod.PrismaInventoryRepository(tx) as any;
  const rows: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, input.itemId);
  if (!rows[0]) return undefined;
  const custody = input.custody ?? { custodyType: "base" };
  const sb = await inv.saldoOfCustody(t, input.itemId, custody);
  if (wouldOverdraw(sb, input.quantidadeSinalizada)) throw insufficientBalanceError(sb);
  return inv.insertMovement({ ...input, tenantId: t, custody });
}
async function beginClose(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (!rows[0]) return { status: "not_found" };
    let st = "resumed";
    if (rows[0].status === "aberta") {
      const r = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "aberta" }, data: { status: "fechando" } });
      if (r.count !== 1) return { status: "not_open", current: rows[0].status };
      st = "started";
    } else if (rows[0].status !== "fechando") return { status: "not_open", current: rows[0].status };
    const entries = await tx.cycleCountEntry.findMany({ where: { tenant_id: t, cycle_count_id: s } });
    return { status: st, entries };
  });
}
