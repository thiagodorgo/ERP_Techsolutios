// planejador-mestre v2 (2a instancia) — B-O6R-04a — SONDA PROPRIA (a da 1a instancia foi roteiro; nada herdado como fato).
// Importa codigo de PRODUCAO do worktree b04a (HEAD 63dd45bb; src/ = head-base) por URL de arquivo.
// 2 papeis efemeros NOSUPERUSER NOBYPASSRLS (A e B); o admin (superuser do container) semeia/observa/emula o lado A cru.
// "New" = emulacao LITERAL do desenho v2 (V1-V5 lock do item antes da leitura; V6 em unidades por item, estado fechando, CAS).
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const WT = "C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b04a";
const OUT = process.env.PROBE_OUT!;
const ONLY = (process.env.PROBE_ONLY ?? "").split(",").filter(Boolean);
const imp = (p: string) => import(pathToFileURL(`${WT}/${p}`).href);
const DB = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const now = () => Date.now() - T0;

const { prisma: admin } = await imp("src/database/prisma.ts");
const { withTenantRls } = await imp("src/database/rls.ts");
const invMod = await imp("src/modules/inventory/inventory-prisma.repository.ts");
const ccMod = await imp("src/modules/inventory/cycle-count-prisma.repository.ts");
const { CycleCountService } = await imp("src/modules/inventory/cycle-count.service.ts");
const { InventoryService } = await imp("src/modules/inventory/inventory.service.ts");
const { wouldOverdraw, roundToDecimalPrecision, computeMovingAverage } = await imp("src/modules/inventory/inventory.calculations.ts");
const { sendRouteError } = await imp("src/modules/core-saas/routes/http.ts");
const { createEphemeralRole } = await imp("tests/helpers/auth-identity-fixture.ts");
const { withApplicationName } = await imp("tests/helpers/pg-barrier.ts");

const R: Record<string, unknown> = {};
const save = () => writeFileSync(OUT, JSON.stringify(R, null, 2));
const want = (k: string) => ONLY.length === 0 || ONLY.includes(k);
function errInfo(e: any) {
  if (!e) return null;
  return { name: e?.name, code: e?.code, metaCode: e?.meta?.code ?? e?.meta?.driverAdapterError?.cause?.code ?? e?.cause?.code, status: e?.status ?? e?.statusCode, reason: e?.reason, msg: String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 220) };
}
const short = (e: any) => { const i = errInfo(e)!; return `${i.code ?? ""}/${i.metaCode ?? ""}|${i.status ?? ""}|${i.reason ?? ""}|${i.msg.slice(0, 70)}`; };
const actor = (t: string) => ({ tenantId: t, userId: randomUUID(), roles: [], permissions: [] });

async function newTenant(tag: string): Promise<string> {
  const slug = `plan3-${tag}-${randomUUID().slice(0, 8)}`;
  const rows: any[] = await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
  return rows[0].id;
}
async function mov(t: string, item: string, type: string, q: number, unitCost: number | null = null, extra: { source?: [string, string]; reverses?: string; cc?: string } = {}): Promise<string> {
  const r: any[] = await admin.$queryRawUnsafe(
    `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type, source_type, source_id, reverses_movement_id, cycle_count_id)
     VALUES ($1::uuid,$2::uuid,$3,$4::numeric,$5::numeric,'base',$6,$7::uuid,$8::uuid,$9::uuid) RETURNING id`,
    t, item, type, q, unitCost, extra.source?.[0] ?? null, extra.source?.[1] ?? null, extra.reverses ?? null, extra.cc ?? null);
  return r[0].id;
}
async function newItem(t: string, o: { id?: string; base?: number; unitCost?: number; isFuel?: boolean } = {}): Promise<string> {
  const id = o.id ?? randomUUID();
  await admin.$executeRawUnsafe(`INSERT INTO inventory_items (id, tenant_id, sku, name, unit, is_fuel, avg_cost) VALUES ($1::uuid, $2::uuid, $3, $3, 'un', $4, $5::numeric)`, id, t, `SKU-${id.slice(0, 13)}`, o.isFuel ?? false, o.unitCost ?? 0);
  if (o.base) await mov(t, id, "entrada", o.base, o.unitCost ?? 1);
  return id;
}
async function saldo(t: string, item: string): Promise<number> {
  const r: any[] = await admin.$queryRawUnsafe(
    `SELECT COALESCE(SUM(quantidade_sinalizada),0)::float8 AS s FROM stock_movements WHERE tenant_id=$1::uuid AND item_id=$2::uuid AND custody_type='base' AND custody_operator_profile_id IS NULL AND custody_vehicle_id IS NULL`, t, item);
  return Number(r[0].s);
}
async function avgCostOf(t: string, item: string): Promise<number> {
  const r: any[] = await admin.$queryRawUnsafe(`SELECT avg_cost::float8 AS a FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, item);
  return Number(r[0].a);
}
async function newSession(t: string, entries: { item: string; system: number; counted?: number }[]) {
  const r: any[] = await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
  const s = r[0].id as string; const entryIds: string[] = [];
  for (const e of entries) {
    const rr: any[] = await admin.$queryRawUnsafe(
      `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::numeric,$5::numeric) RETURNING id`,
      t, s, e.item, e.system, e.counted ?? null);
    entryIds.push(rr[0].id);
  }
  return { s, entryIds };
}
async function bulk(t: string, n: number) {
  await admin.$executeRawUnsafe(`INSERT INTO inventory_items (tenant_id, sku, name, unit) SELECT $1::uuid, 'SKU-'||g, 'Item '||g, 'un' FROM generate_series(1,$2::int) g`, t, n);
  await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type) SELECT tenant_id, id, 'entrada', 10, 1, 'base' FROM inventory_items WHERE tenant_id=$1::uuid`, t);
  const r: any[] = await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
  await admin.$executeRawUnsafe(`INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) SELECT tenant_id, $2::uuid, id, 10, 7 FROM inventory_items WHERE tenant_id=$1::uuid`, t, r[0].id);
  return r[0].id as string;
}
async function sessionState(t: string, s: string) {
  const ss: any[] = await admin.$queryRawUnsafe(`SELECT status, is_active FROM cycle_counts WHERE id=$1::uuid`, s);
  const a: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n, count(DISTINCT item_id)::int AS itens, COALESCE(SUM(quantidade_sinalizada),0)::float8 AS soma FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
  const e: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS total, count(adjustment_movement_id)::int AS carimbadas FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
  const dup: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM (SELECT item_id FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid GROUP BY item_id HAVING count(*)>1) d`, t, s);
  return { sessao: ss[0], ajustes: a[0], entries: e[0], itensComAjusteDuplicado: dup[0].n };
}
const invOf = (c: any) => new invMod.RlsPrismaInventoryRepository(c);
const svcOf = (c: any) => new CycleCountService(new ccMod.RlsPrismaCycleCountRepository(c), invOf(c));
async function race<T>(fns: (() => Promise<T>)[]) {
  let go!: () => void; const start = new Promise<void>((r) => (go = r));
  const ps = fns.map((f) => (async () => { await start; return f(); })());
  go(); return Promise.allSettled(ps);
}
async function blockedOf(appName: string) {
  const rows: any[] = await admin.$queryRawUnsafe(
    `SELECT left(query, 120) AS q, wait_event FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND pid <> pg_backend_pid()`, appName);
  return { n: rows.length, queries: rows.map((r) => r.q) };
}
async function waitBlocked(appName: string, timeoutMs = 3000) {
  const dl = Date.now() + timeoutMs;
  for (;;) { const b = await blockedOf(appName); if (b.n >= 1) return { ...b, at: now() }; if (Date.now() > dl) return { n: 0, queries: [], timeout: true, at: now() } as any; await sleep(20); }
}
const notOpen = (st: any) => Object.assign(new Error(`not_open:${st}`), { statusCode: 422, reason: "invalid_status_transition", code: "CYCLE_COUNT_INVALID", statusRead: st });
const insufficient = (sb: number) => Object.assign(new Error(`insufficient_balance saldo=${sb}`), { statusCode: 409, reason: "insufficient_balance", code: "STOCK_INVALID" });
const LOCK_ITEM = `SELECT id, avg_cost::float8 AS avg FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`;
// ---------------- DESENHO v2 — V1..V5, emulados literalmente (lock do item ANTES da primeira leitura que decide) ----------------
async function v1New(client: any, t: string, item: string, qty: number, holdMs = 0, marks?: any[]) {
  return withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx) as any;
    const lock: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, item);
    if (!lock[0]) return undefined;
    if (holdMs) { marks?.push(["A(v1New): item travado", now()]); await sleep(holdMs); }
    const sb = await inv.saldoOfCustody(t, item, { custodyType: "base" });
    if (wouldOverdraw(sb, qty)) throw insufficient(sb);
    return inv.insertMovement({ tenantId: t, itemId: item, type: qty < 0 ? "saida" : "entrada", quantidadeSinalizada: qty, custody: { custodyType: "base" } });
  });
}
async function entradaNew(client: any, t: string, item: string, qty: number, unitCost: number) {
  return withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx) as any;
    const lock: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, item);
    const gs = await inv.saldoOf(t, item);
    const avg = computeMovingAverage(gs, Number(lock[0].avg), qty, unitCost);
    await tx.inventoryItem.updateMany({ where: { tenant_id: t, id: item }, data: { avg_cost: avg } });
    return inv.insertMovement({ tenantId: t, itemId: item, type: "entrada", quantidadeSinalizada: qty, unitCost, custody: { custodyType: "base" } });
  });
}
async function reverseNew(client: any, t: string, movementId: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx) as any;
    const original = await inv.findMovementById(t, movementId);
    if (!original) return { status: "not_found" };
    await tx.$queryRawUnsafe(LOCK_ITEM, t, original.itemId);
    const siblings = original.transferGroupId ? await inv.movementsInGroup(t, original.transferGroupId) : [original];
    if (await inv.hasReversalOf(t, siblings.map((m: any) => m.id))) return { status: "already_reversed" };
    const out: any[] = [];
    for (const leg of siblings) {
      const signed = roundToDecimalPrecision(-leg.quantidadeSinalizada);
      const sb = await inv.saldoOfCustody(t, leg.itemId, { custodyType: leg.custodyType });
      if (wouldOverdraw(sb, signed)) throw insufficient(sb);
      out.push(await inv.insertMovement({ tenantId: t, itemId: leg.itemId, type: leg.type, quantidadeSinalizada: signed, custody: { custodyType: leg.custodyType }, reversesMovementId: leg.id }));
    }
    return { status: "ok", movements: out };
  });
}
async function exitNew(client: any, t: string, item: string, src: [string, string], qty = 1) {
  const body = () => withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx) as any;
    const lock: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, item);
    if (!lock[0]) return undefined;
    const existing = await inv.findExitBySource(t, src[0], src[1]);
    if (existing) return existing;
    const sb = await inv.saldoOfCustody(t, item, { custodyType: "base" });
    if (wouldOverdraw(sb, -qty)) throw insufficient(sb);
    return inv.insertMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -qty, custody: { custodyType: "base" }, sourceType: src[0], sourceId: src[1] });
  });
  try { return await body(); } catch (e: any) {
    if (e?.code === "P2002") { const raced = await withTenantRls(client, t, (tx: any) => new invMod.PrismaInventoryRepository(tx).findExitBySource(t, src[0], src[1])); if (raced) return raced; }
    throw e;
  }
}
async function removeExitNew(client: any, t: string, src: [string, string]) {
  return withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx) as any;
    const exit = await inv.findExitBySource(t, src[0], src[1]);
    if (!exit) return undefined;
    await tx.$queryRawUnsafe(LOCK_ITEM, t, exit.itemId);
    if (await inv.hasReversalOf(t, [exit.id])) return undefined;
    return inv.insertMovement({ tenantId: t, itemId: exit.itemId, type: exit.type, quantidadeSinalizada: roundToDecimalPrecision(-exit.quantidadeSinalizada), custody: { custodyType: "base" }, reversesMovementId: exit.id });
  });
}
type Hooks = { holdAfterUnit0Ms?: number; holdInUnitAfterItemLockMs?: (itemId: string) => number; stopAfterUnits?: number; marks?: any[] };
// V6 v2: unidade 0 (sessao FOR UPDATE; aberta->fechando por CAS; fechando = retomada; snapshot das entries pendentes),
// N unidades (uma por item: sessao FOR UPDATE + status=fechando; entry relida; carimbada -> pula; ajuste legado (P-021) -> reaproveita;
// senao item FOR UPDATE -> saldo -> INSERT ajuste -> carimbo), unidade final (sessao FOR UPDATE; 0 pendentes; CAS fechando->concluida).
async function closeNew(client: any, t: string, s: string, hooks: Hooks = {}) {
  const marks = hooks.marks ?? []; const t0 = Date.now();
  const snapshot: any[] = await withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
    if (!rows[0]) throw Object.assign(new Error("not_found"), { statusCode: 404 });
    if (rows[0].status === "aberta") {
      const cas = await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='fechando', updated_at=now() WHERE tenant_id=$1::uuid AND id=$2::uuid AND status='aberta'`, t, s);
      if (cas !== 1) throw new Error(`cas-unit0-count=${cas}`);
    } else if (rows[0].status !== "fechando") throw notOpen(rows[0].status);
    marks.push([`A: unit0 status->fechando (era ${rows[0].status})`, now()]);
    if (hooks.holdAfterUnit0Ms) await sleep(hooks.holdAfterUnit0Ms);
    return tx.$queryRawUnsafe(`SELECT id, item_id, system_quantity::float8 AS sq, counted_quantity::float8 AS cq, adjustment_movement_id AS adj FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid ORDER BY item_id`, t, s);
  });
  const unit0Ms = Date.now() - t0;
  const pending = snapshot.filter((e) => e.cq !== null && e.cq !== e.sq && e.adj === null);
  const units: number[] = []; let done = 0; let skipped = 0; let reusedLegacy = 0; let totalVarianceValue = 0;
  for (const e of pending) {
    if (hooks.stopAfterUnits !== undefined && done >= hooks.stopAfterUnits) throw Object.assign(new Error("SIMULATED-CRASH-BETWEEN-UNITS"), { done });
    const tu = Date.now();
    const r = await withTenantRls(client, t, async (tx: any) => {
      const srow: any[] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
      if (srow[0]?.status !== "fechando") throw notOpen(srow[0]?.status);
      const erow: any[] = await tx.$queryRawUnsafe(`SELECT counted_quantity::float8 AS cq, system_quantity::float8 AS sq, adjustment_movement_id AS adj FROM cycle_count_entries WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, e.id);
      if (erow[0].adj !== null) return "skip-stamped";
      const variance = roundToDecimalPrecision(erow[0].cq - erow[0].sq);
      const prior: any[] = await tx.$queryRawUnsafe(`SELECT id FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid AND item_id=$3::uuid LIMIT 1`, t, s, e.item_id);
      let movementId: string; let avg = 0;
      if (prior[0]) { movementId = prior[0].id; reusedLegacy++; avg = await avgCostOf(t, e.item_id); }
      else {
        const lock: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, e.item_id);
        if (!lock[0]) throw Object.assign(new Error("item-gone"), { statusCode: 400 });
        avg = Number(lock[0].avg);
        const hold = hooks.holdInUnitAfterItemLockMs?.(e.item_id) ?? 0;
        if (hold) { marks.push([`A: item ${e.item_id.slice(0, 8)} travado FOR UPDATE, segura ${hold}ms`, now()]); await sleep(hold); }
        const inv = new invMod.PrismaInventoryRepository(tx) as any;
        const sb = await inv.saldoOfCustody(t, e.item_id, { custodyType: "base" });
        if (wouldOverdraw(sb, variance)) throw insufficient(sb);
        const m = await inv.insertMovement({ tenantId: t, itemId: e.item_id, type: "ajuste", quantidadeSinalizada: variance, reason: `contagem ciclica ${s}`, cycleCountId: s, custody: { custodyType: "base" } });
        movementId = m.id;
      }
      await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance=$3::numeric, adjustment_movement_id=$4::uuid, updated_at=now() WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, e.id, variance, movementId);
      totalVarianceValue += variance * avg;
      return "done";
    });
    units.push(Date.now() - tu); done++; if (r === "skip-stamped") skipped++;
  }
  const tf = Date.now();
  await withTenantRls(client, t, async (tx: any) => {
    const srow: any[] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
    if (srow[0]?.status !== "fechando") throw notOpen(srow[0]?.status);
    const left: any[] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid AND counted_quantity IS NOT NULL AND counted_quantity <> system_quantity AND adjustment_movement_id IS NULL`, t, s);
    if (left[0].n > 0) throw new Error(`pending-left=${left[0].n}`);
    const cas = await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='concluida', updated_at=now() WHERE tenant_id=$1::uuid AND id=$2::uuid AND status='fechando'`, t, s);
    if (cas !== 1) throw new Error(`cas-final-count=${cas}`);
  });
  marks.push(["A: final status->concluida", now()]);
  const sorted = [...units].sort((a, b) => a - b);
  return { status: "concluida", totalMs: Date.now() - t0, unit0Ms, finalMs: Date.now() - tf, unitCount: units.length, unitMaxMs: sorted.at(-1) ?? 0, unitAvgMs: units.length ? Math.round((units.reduce((a, b) => a + b, 0) / units.length) * 100) / 100 : 0, unitP95Ms: units.length ? sorted[Math.floor(units.length * 0.95)] : 0, skipped, reusedLegacy, totalVarianceValue: roundToDecimalPrecision(totalVarianceValue) };
}
// desenho ANTIGO (plano v1): tx unica, sessao FOR UPDATE, itens FOR UPDATE em ordem ASC — CONTROLE do A-03
async function closeOldHold(client: any, t: string, s: string, first: string, second: string, holdMs: number, marks: any[]) {
  return withTenantRls(client, t, async (tx: any) => {
    await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
    await tx.$queryRawUnsafe(LOCK_ITEM, t, first);
    marks.push(["A(old): 1o item travado", now()]); await sleep(holdMs); marks.push(["A(old): pede 2o item", now()]);
    await tx.$queryRawUnsafe(LOCK_ITEM, t, second);
    marks.push(["A(old): 2o item travado", now()]); return "A-ok";
  });
}
async function recordEntryNew(client: any, t: string, s: string, entryId: string, counted: number, holdMs = 0) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR SHARE`, t, s);
    if (!rows[0]) return { notFound: true };
    if (rows[0].status !== "aberta") return { notOpen: rows[0].status };
    const n = await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET counted_quantity=$3::numeric, updated_at=now() WHERE tenant_id=$1::uuid AND id=$2::uuid AND cycle_count_id=$4::uuid`, t, entryId, counted, s);
    if (holdMs) await sleep(holdMs);
    return { updated: n };
  });
}
async function cancelNew(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(`UPDATE cycle_counts SET status='cancelada', is_active=false, updated_at=now() WHERE tenant_id=$1::uuid AND id=$2::uuid AND status='aberta' RETURNING status`, t, s);
    if (rows[0]) return { cancelled: true };
    const st: any[] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, s);
    return st[0] ? { notOpen: st[0].status } : { notFound: true };
  });
}
// lado A "fechamento em curso/aplicado" emulado pelo ADMIN em tx crua (E3/E4: B e o codigo sob teste)
async function adminClosingHold(t: string, s: string, E: string, X: string, phase: "fechando" | "aplicado", holdMs: number, marks: any[]) {
  return admin.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, t);
    await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
    const e: any[] = await tx.$queryRawUnsafe(`SELECT counted_quantity::float8 AS c, system_quantity::float8 AS sq FROM cycle_count_entries WHERE id=$1::uuid`, E);
    const variance = e[0].c - e[0].sq;
    await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='fechando' WHERE id=$1::uuid AND status='aberta'`, s);
    marks.push([`A(admin): sessao FOR UPDATE + status=fechando (leu contado=${e[0].c})`, now()]);
    const apply = async () => {
      const m: any[] = await tx.$queryRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id) VALUES ($1::uuid,$2::uuid,'ajuste',$3::numeric,'base',$4::uuid) RETURNING id`, t, X, variance, s);
      await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance=$2::numeric, adjustment_movement_id=$3::uuid WHERE id=$1::uuid`, E, variance, m[0].id);
      await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='concluida' WHERE id=$1::uuid AND status='fechando'`, s);
      marks.push([`A(admin): ajuste ${variance} + carimbo + status=concluida (nao commitado)`, now()]);
    };
    if (phase === "aplicado") await apply();
    await sleep(holdMs);
    if (phase === "fechando") await apply();
    marks.push(["A(admin): commit", now()]);
    return "A-ok";
  }, { timeout: 20000 });
}
async function finalEntry(t: string, s: string, E: string, X: string) {
  const e: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 AS contado, variance::float8 AS variance, adjustment_movement_id IS NOT NULL AS tem_ajuste FROM cycle_count_entries WHERE id=$1::uuid`, E);
  return { entry: e[0], ...(await sessionState(t, s)), saldoX: await saldo(t, X) };
}
const roleA = await createEphemeralRole(admin, withApplicationName(DB, "plan3-A"));
const roleB = await createEphemeralRole(admin, withApplicationName(DB, "plan3-B"));
try {
  if (want("PRE")) {
    for (const [n, r] of [["A", roleA], ["B", roleB]] as const) {
      const rows: any[] = await (r as any).client.$queryRawUnsafe(`SELECT current_user AS u, r.rolsuper, r.rolbypassrls, current_setting($1) AS app FROM pg_roles r WHERE r.rolname = current_user`, "application_name");
      R[`role_${n}`] = rows[0];
    }
    const t = await newTenant("pre"); const it = await newItem(t, { base: 1 }); const { s } = await newSession(t, [{ item: it, system: 1, counted: 1 }]);
    const t2 = await newTenant("pre2");
    const q = (sql: string, ctx: string | null, ...args: any[]) => ctx === null ? roleA.client.$transaction((tx: any) => tx.$queryRawUnsafe(sql, ...args)) : withTenantRls(roleA.client, ctx, (tx: any) => tx.$queryRawUnsafe(sql, ...args));
    const iso: any[] = await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting($1) AS iso`, "transaction_isolation"));
    const fsCc = `SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR SHARE`;
    const fuCc = `SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`;
    R.premissas = {
      isolation: iso[0].iso,
      forShareSessao: { comContexto: (await q(fsCc, t, t, s) as any[]).length, semContexto: (await q(fsCc, null, t, s) as any[]).length, contextoOutroTenant: (await q(fsCc, t2, t, s) as any[]).length },
      forUpdateSessao: { comContexto: (await q(fuCc, t, t, s) as any[]).length, semContexto: (await q(fuCc, null, t, s) as any[]).length, contextoOutroTenant: (await q(fuCc, t2, t, s) as any[]).length },
      forUpdateItem: { comContexto: (await q(LOCK_ITEM, t, t, it) as any[]).length, semContexto: (await q(LOCK_ITEM, null, t, it) as any[]).length, contextoOutroTenant: (await q(LOCK_ITEM, t2, t, it) as any[]).length },
      casCancelSemContexto_linhas: await roleA.client.$transaction((tx: any) => tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='cancelada' WHERE tenant_id=$1::uuid AND id=$2::uuid AND status='aberta'`, t, s)),
      casCancelContextoOutroTenant_linhas: await withTenantRls(roleA.client, t2, (tx: any) => tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='cancelada' WHERE tenant_id=$1::uuid AND id=$2::uuid AND status='aberta'`, t, s)),
    };
    save();
  }
  if (want("P1")) {
    const iters: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p1"); const item = await newItem(t, { base: 10 });
      const repos = [invOf(roleA.client), invOf(roleB.client)];
      const t1 = Date.now();
      const st = await race(Array.from({ length: 20 }, (_, k) => () => repos[k % 2].createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1 })));
      iters.push({ i, ms: Date.now() - t1, ok: st.filter((x) => x.status === "fulfilled").length, rej: st.filter((x) => x.status === "rejected").map((x: any) => x.reason?.reason ?? short(x.reason)).reduce((m: any, r: string) => ((m[r] = (m[r] ?? 0) + 1), m), {}), saldo: await saldo(t, item) });
    }
    R.P1_headbase = { forma: "5 iter x 20 saidas de 1 (A/B alternados) sobre BASE=10, createMovement REAL", iters, negativos: iters.filter((x) => x.saldo < 0).length }; save();
    const iters2: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("v1p"); const item = await newItem(t, { base: 10 });
      const clients = [roleA.client, roleB.client];
      const t1 = Date.now();
      const st = await race(Array.from({ length: 20 }, (_, k) => () => v1New(clients[k % 2], t, item, -1)));
      iters2.push({ i, ms: Date.now() - t1, ok: st.filter((x) => x.status === "fulfilled").length, rej: st.filter((x) => x.status === "rejected").map((x: any) => x.reason?.reason ?? short(x.reason)).reduce((m: any, r: string) => ((m[r] = (m[r] ?? 0) + 1), m), {}), p2028: st.filter((x: any) => x.status === "rejected" && x.reason?.code === "P2028").length, deadlock: st.filter((x: any) => /40P01/.test(JSON.stringify(errInfo(x.reason)))).length, saldo: await saldo(t, item) });
    }
    R.V1_new = { forma: "5 iter x 20 saidas de 1 com FOR UPDATE do item ANTES do aggregate (desenho v2)", iters: iters2 }; save();
  }
  if (want("P11")) {
    async function p11(kind: "headbase" | "new") {
      const t = await newTenant(`p11-${kind}`); const X = await newItem(t, { base: 10 }); const marks: any[] = [];
      let release!: () => void; const gate = new Promise<void>((r) => (release = r));
      const pa = admin.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, t);
        await tx.$queryRawUnsafe(LOCK_ITEM, t, X);
        await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type) VALUES ($1::uuid,$2::uuid,'saida',-10,'base')`, t, X);
        marks.push(["A(admin): FOR UPDATE X + INSERT -10 (nao commitado)", now()]);
        await gate; marks.push(["A(admin): commit", now()]);
      }, { timeout: 20000 });
      await sleep(200);
      const pb = (kind === "headbase" ? invOf(roleB.client).createMovement({ tenantId: t, itemId: X, type: "saida", quantidadeSinalizada: -1 }) : v1New(roleB.client, t, X, -1))
        .then((v: any) => ({ ok: v?.id ? "inserted" : v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const blocked = await waitBlocked("plan3-B", 3000);
      await sleep(300); const still = await blockedOf("plan3-B");
      release(); const [ra, rb] = await Promise.all([pa, pb]);
      return { B_bloqueouEm: blocked, aindaBloqueadoApos300ms: still.n, B: rb, saldoFinal: await saldo(t, X), marks };
    }
    R.P11_headbase = await p11("headbase"); save();
    R.P11_new = await p11("new"); save();
  }
  async function lockOrder(kind: "open" | "abc", design: "new" | "v1lock" | "old") {
    const t = await newTenant(`lo-${kind}-${design}`);
    const [lo, hi] = [randomUUID(), randomUUID()].sort();
    const X = await newItem(t, { id: lo, base: 100 }); await sleep(20);
    const Y = await newItem(t, { id: hi, base: 100 });
    if (kind === "abc") { await mov(t, X, "saida", -1, 1); await mov(t, Y, "saida", -50, 1); }
    const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
    const marks: any[] = [];
    const pa = (design === "new" ? closeNew(roleA.client, t, s, { marks, holdInUnitAfterItemLockMs: (id) => (id === X ? 1500 : 0) })
      : design === "old" ? closeOldHold(roleA.client, t, s, X, Y, 1500, marks)
      : v1New(roleA.client, t, X, -1, 1500, marks)).then((v: any) => ({ ok: typeof v === "object" && v?.status ? v.status : "A-ok", at: now() }), (e) => ({ err: errInfo(e), at: now() }));
    await sleep(300);
    marks.push([`B: inicia ${kind} (codigo real)`, now()]);
    const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}) : new InventoryService(invOf(roleB.client)).recalculateAbc(actor(t)))
      .then((v: any) => ({ ok: kind === "open" ? `sessao entries=[${v.entries.map((e: any) => (e.itemId === X ? "X" : "Y")).join(",")}]` : JSON.stringify(v.summary), at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
    const blocked = await waitBlocked("plan3-B", 2500);
    const [ra, rb] = await Promise.all([pa, pb]);
    const deadlock = [ra, rb].some((r: any) => /40P01/.test(JSON.stringify(r)));
    return { design, ordemA: "X(menor id) depois Y", A: ra, B: rb, bBloqueouEm: blocked, deadlock, final: design === "new" ? await sessionState(t, s) : undefined, marks };
  }
  if (want("LO")) {
    for (const d of ["new", "v1lock", "old"] as const) for (const k of ["open", "abc"] as const) { R[`LO_${k}_${d}`] = await lockOrder(k, d); save(); }
  }
  if (want("V6V6")) {
    const t = await newTenant("v6v6"); const [lo, hi] = [randomUUID(), randomUUID()].sort();
    const X = await newItem(t, { id: lo, base: 100 }); const Y = await newItem(t, { id: hi, base: 100 });
    const s1 = (await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }])).s;
    const s2 = (await newSession(t, [{ item: Y, system: 100, counted: 99 }, { item: X, system: 100, counted: 99 }])).s;
    const st = await race([() => closeNew(roleA.client, t, s1, { holdInUnitAfterItemLockMs: () => 300 }), () => closeNew(roleB.client, t, s2, { holdInUnitAfterItemLockMs: () => 300 })]);
    R.V6V6 = { forma: "duas sessoes [X,Y] e [Y,X] fechadas em paralelo (v2), hold 300ms sob cada lock de item", st: st.map((x: any) => (x.status === "fulfilled" ? { ok: x.value.status, units: x.value.unitCount, ms: x.value.totalMs } : { err: errInfo(x.reason) })), s1: await sessionState(t, s1), s2: await sessionState(t, s2), saldoX: await saldo(t, X), saldoY: await saldo(t, Y) }; save();
  }
  if (want("E3")) {
    async function e3(bKind: "new" | "headbase") {
      const t = await newTenant(`e3-${bKind}`); const X = await newItem(t, { base: 10 });
      const { s, entryIds: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      const marks: any[] = [];
      const pa = adminClosingHold(t, s, E, X, "fechando", 1500, marks).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const tb = now(); marks.push([`B: recordEntry(${bKind}) contado=5`, tb]);
      const pb = (bKind === "new" ? recordEntryNew(roleB.client, t, s, E, 5) : svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 5 }).then((r: any) => ({ updatedHeadBase: `contado=${r.countedQuantity}` })))
        .then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const blocked = await waitBlocked("plan3-B", 1000);
      const rb: any = await pb; const ra = await pa;
      return { B: { ...rb, elapsedMs: rb.at - tb, terminouAntesDoCommitDeA: rb.at < ra.at }, bBloqueouEm: blocked, A: ra, final: await finalEntry(t, s, E, X), marks };
    }
    R.E3_new = await e3("new"); save();
    R.E3_headbase_ctrl = await e3("headbase"); save();
    {
      const t = await newTenant("e3-inv"); const X = await newItem(t, { base: 10 });
      const { s, entryIds: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      const marks: any[] = [];
      const pb = recordEntryNew(roleB.client, t, s, E, 5, 1500).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const pa = closeNew(roleA.client, t, s, { marks }).then((v: any) => ({ ok: v.status, at: now(), ms: v.totalMs }), (e: any) => ({ err: errInfo(e), at: now() }));
      const blocked = await waitBlocked("plan3-A", 1000);
      const [rb, ra] = await Promise.all([pb, pa]);
      R.E3_inverso = { forma: "B(recordEntry v2, FOR SHARE, segura 1500ms) comeca antes; A(close v2) entra 300ms depois", B_recordEntryNewHold: rb, A_closeNew: ra, aBloqueouEm: blocked, final: await finalEntry(t, s, E, X), marks }; save();
    }
  }
  if (want("E4")) {
    async function e4(bKind: "new" | "headbase", phase: "aplicado" | "fechando") {
      const t = await newTenant(`e4-${bKind}-${phase}`); const X = await newItem(t, { base: 10 });
      const { s, entryIds: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      const marks: any[] = [];
      const pa = adminClosingHold(t, s, E, X, phase, 1500, marks).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const tb = now(); marks.push([`B: cancel(${bKind})`, tb]);
      const pb = (bKind === "new" ? cancelNew(roleB.client, t, s) : svcOf(roleB.client).cancel(actor(t), s).then((r: any) => ({ cancelledHeadBase: r.status })))
        .then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const blocked = await waitBlocked("plan3-B", 1000);
      const rb: any = await pb; const ra = await pa;
      return { faseDeA: phase, B: { ...rb, elapsedMs: rb.at - tb }, bBloqueouEm: blocked, A: ra, final: await finalEntry(t, s, E, X), marks };
    }
    R.E4_new_aplicado = await e4("new", "aplicado"); save();
    R.E4_new_fechando = await e4("new", "fechando"); save();
    R.E4_headbase_ctrl = await e4("headbase", "aplicado"); save();
  }
  if (want("CRASH")) {
    const t = await newTenant("crash"); const s = await bulk(t, 20);
    let crash: any = null;
    try { await closeNew(roleA.client, t, s, { stopAfterUnits: 7 }); } catch (e) { crash = errInfo(e); }
    const afterCrash = await sessionState(t, s);
    const eid = (await admin.$queryRawUnsafe(`SELECT id FROM cycle_count_entries WHERE cycle_count_id=$1::uuid ORDER BY item_id LIMIT 1 OFFSET 15`, s) as any[])[0].id;
    const recordDuring = await recordEntryNew(roleB.client, t, s, eid, 5);
    const cancelDuring = await cancelNew(roleB.client, t, s);
    let headBaseCloseOnFechando: any; try { await svcOf(roleB.client).close(actor(t), s); headBaseCloseOnFechando = "ok?!"; } catch (e) { headBaseCloseOnFechando = short(e); }
    const resume = await closeNew(roleB.client, t, s);
    R.CRASH = { forma: "close v2 interrompido apos 7 de 20 unidades; depois recordEntry/cancel v2 e close head-base sobre fechando; depois retomada por OUTRO cliente", crash, afterCrash, recordEntryDuranteFechando: recordDuring, cancelDuranteFechando: cancelDuring, headBaseCloseSobreFechando: headBaseCloseOnFechando, resume, afterResume: await sessionState(t, s) }; save();
  }
  if (want("LEGACY")) {
    const t = await newTenant("legacy"); const X = await newItem(t, { base: 10 }); const Y = await newItem(t, { base: 10 });
    const { s } = await newSession(t, [{ item: X, system: 10, counted: 7 }, { item: Y, system: 10, counted: 8 }]);
    await mov(t, X, "ajuste", -3, null, { cc: s });
    const r = await closeNew(roleA.client, t, s);
    R.LEGACY_P021 = { forma: "sessao aberta com ajuste pre-gravado para X (sem carimbo na entry, como o head-base deixa ao falhar no meio); close v2", resultado: r, final: await sessionState(t, s), saldoX: await saldo(t, X), saldoY: await saldo(t, Y) }; save();
  }
  if (want("DBL")) {
    const t = await newTenant("dbl"); const s = await bulk(t, 50);
    const st = await race([() => closeNew(roleA.client, t, s), () => closeNew(roleB.client, t, s)]);
    R.DBL_50 = { forma: "50 itens divergentes; close v2 x2 (A e B) em paralelo", st: st.map((x: any) => (x.status === "fulfilled" ? { ok: x.value.status, units: x.value.unitCount, skipped: x.value.skipped, ms: x.value.totalMs } : { err: errInfo(x.reason) })), final: await sessionState(t, s) }; save();
    const iters: any[] = [];
    for (let i = 0; i < 10; i++) {
      const t2 = await newTenant("dbl1"); const X = await newItem(t2, { base: 10 }); const { s: s2 } = await newSession(t2, [{ item: X, system: 10, counted: 7 }]);
      const r = await race([() => closeNew(roleA.client, t2, s2), () => closeNew(roleB.client, t2, s2)]);
      iters.push({ i, st: r.map((x: any) => (x.status === "fulfilled" ? x.value.status : `${(x.reason as any)?.statusCode}|${(x.reason as any)?.reason}|${(x.reason as any)?.statusRead}`)), ...(await sessionState(t2, s2)), saldo: await saldo(t2, X) });
    }
    R.DBL_1 = { forma: "10 iter x close v2 x2 (A e B), sistema 10 contado 7", iters, ajustesTotais: iters.map((x) => x.ajustes.n), vencedores200: iters.map((x) => x.st.filter((y: string) => y === "concluida").length) }; save();
  }
  if (want("HB")) {
    const p6: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p6"); const item = await newItem(t, { base: 10 }); const { s } = await newSession(t, [{ item, system: 10, counted: 7 }]);
      const st = await race([() => svcOf(roleA.client).close(actor(t), s), () => svcOf(roleB.client).close(actor(t), s)]);
      p6.push({ i, fulfilled: st.filter((x) => x.status === "fulfilled").length, rej: st.filter((x) => x.status === "rejected").map((x: any) => short(x.reason)), ...(await sessionState(t, s)), saldo: await saldo(t, item) });
    }
    R.P6_headbase = { forma: "5 iter x close() x2 head-base", iters: p6, duplicados: p6.filter((x) => x.ajustes.n > 1).length }; save();
    const p3: any[] = []; const v3: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p3"); const item = await newItem(t, { base: 10 }); const m = await mov(t, item, "saida", -3);
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.reverseMovement({ tenantId: t, movementId: m })));
      const c: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t, m);
      p3.push({ i, compensacoes: c[0].n, st: st.map((x: any) => (x.status === "fulfilled" ? x.value.status : short(x.reason))), saldo: await saldo(t, item) });
      const t2 = await newTenant("v3"); const item2 = await newItem(t2, { base: 10 }); const m2 = await mov(t2, item2, "saida", -3);
      const st2 = await race([roleA.client, roleB.client].map((c2) => () => reverseNew(c2, t2, m2)));
      const c2: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t2, m2);
      v3.push({ i, compensacoes: c2[0].n, st: st2.map((x: any) => (x.status === "fulfilled" ? x.value.status : short(x.reason))), saldo: await saldo(t2, item2) });
    }
    R.P3_headbase = { forma: "5 iter x reverseMovement x2 head-base", iters: p3, duplicados: p3.filter((x) => x.compensacoes > 1).length };
    R.V3_new = { forma: "5 iter x reverse v2 (lock do item ANTES do hasReversalOf) x2", iters: v3, duplicados: v3.filter((x) => x.compensacoes > 1).length }; save();
    const p5: any[] = []; const v5: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p5"); const item = await newItem(t, { base: 10, isFuel: true }); const src: [string, string] = ["fuel_log", randomUUID()]; const m = await mov(t, item, "saida", -3, null, { source: src });
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.removeExitForSource({ tenantId: t, sourceType: src[0], sourceId: src[1] })));
      const c: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t, m);
      p5.push({ i, compensacoes: c[0].n, st: st.map((x: any) => (x.status === "fulfilled" ? (x.value ? "compensou" : "undefined") : short(x.reason))), saldo: await saldo(t, item) });
      const t2 = await newTenant("v5"); const item2 = await newItem(t2, { base: 10, isFuel: true }); const src2: [string, string] = ["fuel_log", randomUUID()]; const m2 = await mov(t2, item2, "saida", -3, null, { source: src2 });
      const st2 = await race([roleA.client, roleB.client].map((c2) => () => removeExitNew(c2, t2, src2)));
      const c2: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t2, m2);
      v5.push({ i, compensacoes: c2[0].n, st: st2.map((x: any) => (x.status === "fulfilled" ? (x.value ? "compensou" : "undefined") : short(x.reason))), saldo: await saldo(t2, item2) });
    }
    R.P5_headbase = { forma: "5 iter x removeExitForSource x2 head-base", iters: p5, duplicados: p5.filter((x) => x.compensacoes > 1).length };
    R.V5_new = { forma: "5 iter x removeExit v2 x2", iters: v5, duplicados: v5.filter((x) => x.compensacoes > 1).length }; save();
    const p7: any[] = []; const v7: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p7"); const item = await newItem(t, { base: 10, unitCost: 1 });
      await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.createMovement({ tenantId: t, itemId: item, type: "entrada", quantidadeSinalizada: 10, unitCost: 3 })));
      p7.push({ i, avg: await avgCostOf(t, item), saldo: await saldo(t, item) });
      const t2 = await newTenant("v7"); const item2 = await newItem(t2, { base: 10, unitCost: 1 });
      await race([roleA.client, roleB.client].map((c2) => () => entradaNew(c2, t2, item2, 10, 3)));
      v7.push({ i, avg: await avgCostOf(t2, item2), saldo: await saldo(t2, item2) });
    }
    R.P7_headbase = { forma: "5 iter x entrada 10@3 x2 concorrentes sobre 10@1 (esperado avg 2.333333)", iters: p7, errados: p7.filter((x) => Math.abs(x.avg - 2.333333) > 1e-6).length };
    R.V7_new = { forma: "idem, desenho v2 (lock antes do saldoOf)", iters: v7, errados: v7.filter((x) => Math.abs(x.avg - 2.333333) > 1e-6).length }; save();
    const p9: any = { ok: 0, outros: {} }; const v4: any = { sameId: 0, outros: {}, p25: 0, linhas: 0 };
    for (let i = 0; i < 10; i++) {
      const t = await newTenant("p9"); const item = await newItem(t, { base: 10, isFuel: true }); const src: [string, string] = ["fuel_log", randomUUID()];
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.createExitForSource({ tenantId: t, itemId: item, sourceType: src[0], sourceId: src[1], quantity: 1, reason: "x" })));
      for (const x of st) { if (x.status === "fulfilled") p9.ok++; else { const k = short(x.reason).slice(0, 60); p9.outros[k] = (p9.outros[k] ?? 0) + 1; } }
      const t2 = await newTenant("v4"); const item2 = await newItem(t2, { base: 10, isFuel: true }); const src2: [string, string] = ["fuel_log", randomUUID()];
      const st2 = await race([roleA.client, roleB.client].map((c2) => () => exitNew(c2, t2, item2, src2)));
      const ids = st2.map((x: any) => (x.status === "fulfilled" ? x.value?.id : null));
      if (ids[0] && ids[0] === ids[1]) v4.sameId++; for (const x of st2) if (x.status === "rejected") { const k = short(x.reason).slice(0, 60); v4.outros[k] = (v4.outros[k] ?? 0) + 1; if (/25P02/.test(k)) v4.p25++; }
      const lines: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND source_id=$2::uuid`, t2, src2[1]); v4.linhas += lines[0].n;
    }
    R.P9_headbase = { forma: "10 iter x createExitForSource MESMA fonte x2 head-base", ...p9 };
    R.V4_new = { forma: "10 iter x exit v2 (lock antes do findExitBySource; catch P2002 fora da tx) MESMA fonte x2", ...v4 }; save();
  }
  if (want("IDX")) {
    const seeds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const t = await newTenant("idx"); const item = await newItem(t, { base: 10 }); const m = await mov(t, item, "saida", -3);
      await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.reverseMovement({ tenantId: t, movementId: m })));
      const { s } = await newSession(t, [{ item, system: 10, counted: 9 }]);
      await race([() => svcOf(roleA.client).close(actor(t), s), () => svcOf(roleB.client).close(actor(t), s)]);
      seeds.push(t);
    }
    const censo = async () => ({
      reverses: (await admin.$queryRawUnsafe(`SELECT count(*)::int AS grupos, COALESCE(sum(n),0)::int AS linhas FROM (SELECT tenant_id, reverses_movement_id, count(*) AS n FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d`) as any[])[0],
      cycleItem: (await admin.$queryRawUnsafe(`SELECT count(*)::int AS grupos, COALESCE(sum(n),0)::int AS linhas FROM (SELECT tenant_id, cycle_count_id, item_id, count(*) AS n FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY 1,2,3 HAVING count(*)>1) d`) as any[])[0] });
    const tryIdx = async (sql: string) => { try { await admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(sql); throw new Error("ROLLBACK-ON-PURPOSE"); }); return "created-then-rolled-back"; } catch (e: any) { return short(e); } };
    const doBlock = `DO $censo$
DECLARE grupos bigint; amostra text;
BEGIN
  SELECT count(*), string_agg(g.chave, '; ') INTO grupos, amostra FROM (
    SELECT 'estorno duplicado: original=' || reverses_movement_id::text || ' x' || count(*) AS chave FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
    UNION ALL
    SELECT 'ajuste duplicado: contagem=' || cycle_count_id::text || ' item=' || item_id::text || ' x' || count(*) FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1
    ORDER BY 1 LIMIT 20) g;
  IF grupos > 0 THEN
    RAISE EXCEPTION 'stock_movements: % grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003). Os indices unicos nao podem nascer sobre dado inconsistente; NADA foi mutado; NADA foi deduplicado (qual compensacao vale e decisao humana). Rode scripts/inventory-duplicates-census.sql e consulte P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD. Grupos (ate 20): %', grupos, amostra USING ERRCODE = 'raise_exception';
  END IF;
END $censo$;`;
    const runDo = async () => { try { await admin.$executeRawUnsafe(doBlock); return "mudo (0 grupos)"; } catch (e: any) { return errInfo(e); } };
    const REV = `CREATE UNIQUE INDEX "stock_movements_reversal_active_key" ON "stock_movements" ("tenant_id", "reverses_movement_id") WHERE "reverses_movement_id" IS NOT NULL`;
    const CC = `CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key" ON "stock_movements" ("tenant_id", "cycle_count_id", "item_id") WHERE "cycle_count_id" IS NOT NULL`;
    const censoAntes = await censo(); const doComDup = await runDo(); const idxRevComDup = await tryIdx(REV); const idxCcComDup = await tryIdx(CC);
    await admin.$executeRawUnsafe(`UPDATE cycle_count_entries e SET adjustment_movement_id=NULL WHERE e.tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'plan3-%') AND adjustment_movement_id IN (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY tenant_id, cycle_count_id, item_id ORDER BY created_at, id) rn FROM stock_movements WHERE cycle_count_id IS NOT NULL) x WHERE rn>1)`);
    const del1 = await admin.$executeRawUnsafe(`DELETE FROM stock_movements sm USING (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY tenant_id, reverses_movement_id ORDER BY created_at, id) rn FROM stock_movements WHERE reverses_movement_id IS NOT NULL AND tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'plan3-%')) x WHERE rn>1) d WHERE sm.id=d.id`);
    const del2 = await admin.$executeRawUnsafe(`DELETE FROM stock_movements sm USING (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY tenant_id, cycle_count_id, item_id ORDER BY created_at, id) rn FROM stock_movements WHERE cycle_count_id IS NOT NULL AND tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'plan3-%')) x WHERE rn>1) d WHERE sm.id=d.id`);
    const censoDepois = await censo(); const doDepois = await runDo();
    const t0c = Date.now(); await admin.$executeRawUnsafe(REV); await admin.$executeRawUnsafe(CC); const upMs = Date.now() - t0c;
    const cnt = async () => (await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname IN ('stock_movements_reversal_active_key','stock_movements_cycle_count_item_key')`) as any[])[0].n;
    const indexdefs = (await admin.$queryRawUnsafe(`SELECT indexdef FROM pg_indexes WHERE indexname IN ('stock_movements_reversal_active_key','stock_movements_cycle_count_item_key') ORDER BY 1`) as any[]).map((r) => r.indexdef);
    const tt = await newTenant("idxup"); const it = await newItem(tt, { base: 10 }); const m = await mov(tt, it, "saida", -3); await mov(tt, it, "saida", 3, null, { reverses: m });
    let dup2: any; try { await mov(tt, it, "saida", 3, null, { reverses: m }); dup2 = "2a compensacao ACEITA?!"; } catch (e: any) { dup2 = short(e); }
    const { s: ss } = await newSession(tt, []); await mov(tt, it, "ajuste", -1, null, { cc: ss });
    let dupCc: any; try { await mov(tt, it, "ajuste", -1, null, { cc: ss }); dupCc = "2o ajuste ACEITO?!"; } catch (e: any) { dupCc = short(e); }
    const nulls = await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type) SELECT $1::uuid, $2::uuid, 'entrada', 1, 'base' FROM generate_series(1,3)`, tt, it);
    const nUp = await cnt();
    await admin.$executeRawUnsafe(`DROP INDEX IF EXISTS "stock_movements_reversal_active_key"`); await admin.$executeRawUnsafe(`DROP INDEX IF EXISTS "stock_movements_cycle_count_item_key"`);
    const nDown = await cnt(); await admin.$executeRawUnsafe(REV); await admin.$executeRawUnsafe(CC); const nReup = await cnt();
    await admin.$executeRawUnsafe(`DROP INDEX IF EXISTS "stock_movements_reversal_active_key"`); await admin.$executeRawUnsafe(`DROP INDEX IF EXISTS "stock_movements_cycle_count_item_key"`);
    R.IDX = { seedsTenants: seeds.length, censoAntes, doBlockComDuplicatas: doComDup, idxReversesComDup: idxRevComDup, idxCycleItemComDup: idxCcComDup, limpezaEscopada: { linhasRemovidasReverses: del1, linhasRemovidasCycleItem: del2 }, censoDepois, doBlockDepois: doDepois,
      up: { ms: upMs, indexdefs, segundaCompensacao: dup2, segundoAjuste: dupCc, nullsAceitos: nulls, pg_indexes: nUp }, drill: { up: nUp, down: nDown, reup: nReup, fim: await cnt() } }; save();
  }
  if (want("TOK")) {
    const t = await newTenant("tok"); let p2028: any; const t0 = Date.now();
    try { await withTenantRls(roleA.client, t, async (tx: any) => { await tx.$queryRawUnsafe(`SELECT 1`); await sleep(5300); await tx.$queryRawUnsafe(`SELECT 1`); }); p2028 = "no-error?!"; } catch (e) { p2028 = e; }
    const X = await newItem(t), Y = await newItem(t);
    const dl = async (raw: boolean) => {
      const upd = (tx: any, id: string, v: string) => raw ? tx.$executeRawUnsafe(`UPDATE inventory_items SET name=$2 WHERE id=$1::uuid`, id, v) : tx.inventoryItem.updateMany({ where: { id }, data: { name: v } });
      const [a, b] = await Promise.all([
        admin.$transaction(async (tx: any) => { await upd(tx, X, "a"); await sleep(400); await upd(tx, Y, "a"); }).then(() => null, (e: any) => e),
        admin.$transaction(async (tx: any) => { await upd(tx, Y, "b"); await sleep(400); await upd(tx, X, "b"); }).then(() => null, (e: any) => e)]);
      return a ?? b;
    };
    const dlOrm = await dl(false); const dlRaw = await dl(true);
    const fake = () => { const r: any = { s: 0, b: null }; r.status = (n: number) => { r.s = n; return r; }; r.json = (b: any) => { r.b = b; return r; }; return r; };
    const map = (e: any) => { const r = fake(); sendRouteError(r, e); return { status: r.s, code: r.b?.error?.code, reason: r.b?.error?.reason, message: String(r.b?.error?.message ?? "").replace(/\s+/g, " ").slice(0, 160) }; };
    R.TOK = { formaP2028: "withTenantRls (opcoes default) com 5300 ms entre dois statements", ms: Date.now() - t0, p2028: errInfo(p2028), deadlockOrm: errInfo(dlOrm), deadlockRaw: errInfo(dlRaw),
      httpHoje: { p2028: map(p2028), deadlockOrm: map(dlOrm), deadlockRaw: map(dlRaw), inventoryError409: map(insufficient(0)), cycleCountError422: map(notOpen("concluida")) } }; save();
  }
  if (want("E5")) {
    const runs: any[] = [];
    for (const n of (process.env.E5_N ?? "250,500,1000,10000").split(",").map(Number)) {
      const t = await newTenant(`e5n-${n}`); const s = await bulk(t, n);
      let r: any; try { r = await closeNew(roleA.client, t, s); } catch (e) { r = { err: errInfo(e) }; }
      const run: any = { n, novo: { ...r, ...(await sessionState(t, s)) } };
      if (process.env.E5_CTRL !== "0") {
        const t2 = await newTenant(`e5h-${n}`); const s2 = await bulk(t2, n);
        const t1 = Date.now(); let cerr: any = null;
        try { await svcOf(roleA.client).close(actor(t2), s2); } catch (e) { cerr = errInfo(e); }
        run.headBase = { ms: Date.now() - t1, erro: cerr, ...(await sessionState(t2, s2)) };
      }
      runs.push(run); R.E5 = runs; save();
    }
  }
} finally {
  R.fimMs = now(); save();
  await roleA.drop().catch((e: any) => { R.dropA = errInfo(e); });
  await roleB.drop().catch((e: any) => { R.dropB = errInfo(e); });
  save();
  await admin.$disconnect();
}
