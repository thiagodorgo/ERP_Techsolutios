// planejador-mestre v3 — B-O6R-04a — SONDA PROPRIA (plan4). Importa PRODUCAO do worktree b04a (src/ = head-base) por URL.
// "v2" = emulacao literal do plano v2 (fb9ee5a6) — usada so como VERMELHO (S-01/S-02).
// "v3" = emulacao literal do desenho v3 deste plano: abortClose (fechando->aberta com 0 carimbos), recordEntry em fechando
// para entry NAO carimbada, cancel em fechando so com 0 carimbos (sob FOR UPDATE da sessao), total da sessao inteira no
// finishClose (SUM(variance*avg_cost) sob o lock), open com lock NO KEY UPDATE na linha do tenant + exclusao de item em sessao aberta.
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const WT = "C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b04a";
const OUT = process.env.PROBE_OUT!;
const ONLY = (process.env.PROBE_ONLY ?? "").split(",").filter(Boolean);
const imp = (p: string) => import(pathToFileURL(`${WT}/${p}`).href);
const DB = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const now = () => Date.now() - T0;

const { prisma: admin } = await imp("src/database/prisma.ts");
const { withTenantRls } = await imp("src/database/rls.ts");
const invMod = await imp("src/modules/inventory/inventory-prisma.repository.ts");
const ccMod = await imp("src/modules/inventory/cycle-count-prisma.repository.ts");
const { CycleCountService } = await imp("src/modules/inventory/cycle-count.service.ts");
const { InventoryService } = await imp("src/modules/inventory/inventory.service.ts");
const { wouldOverdraw, roundToDecimalPrecision } = await imp("src/modules/inventory/inventory.calculations.ts");
const { insufficientBalanceError } = await imp("src/modules/inventory/inventory.types.ts");
const { cycleCountNotOpen, CycleCountError } = await imp("src/modules/inventory/cycle-count.types.ts");
const { createEphemeralRole } = await imp("tests/helpers/auth-identity-fixture.ts");
const { withApplicationName, waitForOwnBlockedStatement } = await imp("tests/helpers/pg-barrier.ts");

const R: Record<string, unknown> = {};
const save = () => writeFileSync(OUT, JSON.stringify(R, null, 2));
const want = (k: string) => ONLY.length === 0 || ONLY.includes(k);
const errInfo = (e: any) => e ? ({ name: e?.name, code: e?.code, metaCode: e?.meta?.code ?? e?.cause?.code, status: e?.statusCode ?? e?.status, reason: e?.reason, abort: e?.abort, msg: String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 160) }) : null;
const actor = (t: string) => ({ tenantId: t, userId: randomUUID(), roles: [], permissions: [] });
const Q = "'";
async function newTenant(tag: string) { const slug = `plan4-${tag}-${randomUUID().slice(0, 8)}`; return ((await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, slug)) as any[])[0].id as string; }
async function mov(t: string, item: string, type: string, q: number, o: { unitCost?: number; custody?: string; vehicle?: string; group?: string; cc?: string; reverses?: string; sourceType?: string; sourceId?: string } = {}) {
  const sql = `INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,unit_cost,custody_type,custody_vehicle_id,transfer_group_id,cycle_count_id,reverses_movement_id,source_type,source_id) VALUES ($1::uuid,$2::uuid,$3,$4::numeric,$5::numeric,$6,$7::uuid,$8::uuid,$9::uuid,$10::uuid,$11,$12::uuid) RETURNING id`;
  return ((await admin.$queryRawUnsafe(sql, t, item, type, q, o.unitCost ?? null, o.custody ?? "base", o.vehicle ?? null, o.group ?? null, o.cc ?? null, o.reverses ?? null, o.sourceType ?? null, o.sourceId ?? null)) as any[])[0].id as string;
}
async function newItem(t: string, o: { id?: string; base?: number; avg?: number } = {}) {
  const id = o.id ?? randomUUID();
  await admin.$executeRawUnsafe(`INSERT INTO inventory_items (id,tenant_id,sku,name,unit,avg_cost) VALUES ($1::uuid,$2::uuid,$3,$3,$5,$4::numeric)`, id, t, `SKU-${id.slice(0, 13)}`, o.avg ?? 0, "un");
  if (o.base) await mov(t, id, "entrada", o.base, { unitCost: o.avg ?? 1 });
  return id;
}
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
  const fin: any = await withTenantRls(client, t, async (tx: any) => {
    const srow: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (srow[0]?.status !== "fechando") return { status: "not_open", current: srow[0]?.status };
    const left: any[] = await tx.$queryRawUnsafe(PENDING, t, s);
    if (left[0].n > 0) return { status: "pending", remaining: left[0].n };
    const total = kind === "v3" ? Number(((await tx.$queryRawUnsafe(TOTAL, t, s)) as any[])[0].total) : totalV2;
    const r = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "fechando" }, data: { status: "concluida" } });
    return r.count === 1 ? { status: "ok", total } : { status: "not_open", current: "?" };
  });
  if (fin.status === "not_open") throw cycleCountNotOpen(fin.current);
  if (fin.status === "pending") throw err(409, "close_incomplete");
  return { status: "concluida", beginStatus: begin.status, totalVarianceValue: roundToDecimalPrecision(fin.total), applied, skipped, reused };
}
const closeV2 = (c: any, t: string, s: string, u: string, h: Hooks = {}) => closeV("v2", c, t, s, u, h);
const closeV3 = (c: any, t: string, s: string, u: string, h: Hooks = {}) => closeV("v3", c, t, s, u, h);
// v2: recordEntry so em aberta; cancel CAS status=aberta
async function recordEntryV2(client: any, t: string, s: string, entryId: string, counted: number) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FS, t, s);
    if (!rows[0]) return { status: "not_found" };
    if (rows[0].status !== "aberta") return { status: "not_open", current: rows[0].status };
    const u = await tx.cycleCountEntry.updateManyAndReturn({ where: { tenant_id: t, id: entryId, cycle_count_id: s }, data: { counted_quantity: counted } });
    return u[0] ? { status: "ok" } : { status: "not_found" };
  });
}
async function cancelV2(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const u = await tx.cycleCount.updateManyAndReturn({ where: { tenant_id: t, id: s, status: "aberta" }, data: { status: "cancelada", is_active: false } });
    if (u[0]) return { status: "ok" };
    const r = await tx.cycleCount.findFirst({ where: { tenant_id: t, id: s } });
    return r ? { status: "not_open", current: r.status } : { status: "not_found" };
  });
}
// v3: recordEntry — aberta: como hoje; fechando: SO entry NAO carimbada (predicado na propria linha, sob FOR SHARE da sessao)
async function recordEntryV3(client: any, t: string, s: string, entryId: string, counted: number, holdMs = 0) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FS, t, s);
    if (!rows[0]) return { status: "not_found" };
    if (rows[0].status !== "aberta" && rows[0].status !== "fechando") return { status: "not_open", current: rows[0].status };
    if (holdMs) await sleep(holdMs);
    const u = await tx.cycleCountEntry.updateManyAndReturn({ where: { tenant_id: t, id: entryId, cycle_count_id: s, ...(rows[0].status === "fechando" ? { adjustment_movement_id: null } : {}) }, data: { counted_quantity: counted } });
    if (u[0]) return { status: "ok", phase: rows[0].status };
    const ex = await tx.cycleCountEntry.findFirst({ where: { tenant_id: t, id: entryId, cycle_count_id: s } });
    return ex ? { status: "entry_adjusted" } : { status: "not_found" };
  });
}
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
async function removeExitV3(client: any, t: string, sourceType: string, sourceId: string) {
  try {
    return await withTenantRls(client, t, async (tx: any) => {
      const inv = new invMod.PrismaInventoryRepository(tx) as any;
      const exit = await inv.findExitBySource(t, sourceType, sourceId);
      if (!exit) return "undefined";
      await tx.$queryRawUnsafe(LOCK_ITEM, t, exit.itemId);
      if (await inv.hasReversalOf(t, [exit.id])) return "undefined";
      const m = await inv.insertMovement({ tenantId: t, itemId: exit.itemId, type: exit.type, quantidadeSinalizada: -exit.quantidadeSinalizada, custody: { custodyType: "base" }, reversesMovementId: exit.id });
      return { compensou: m.id };
    });
  } catch (e: any) {
    if (e?.code === "P2002") return "undefined (P2002 fora da tx)";
    throw e;
  }
}
const roleA = await createEphemeralRole(admin, withApplicationName(DB, "plan4-A"));
const roleB = await createEphemeralRole(admin, withApplicationName(DB, "plan4-B"));
try {
  if (want("PRE")) {
    const out: any = {};
    for (const [n, r] of [["A", roleA], ["B", roleB]] as const) out[n] = ((await (r as any).client.$queryRawUnsafe(`SELECT current_user u, r.rolsuper, r.rolbypassrls, current_setting($1) app FROM pg_roles r WHERE r.rolname=current_user`, "application_name")) as any[])[0];
    const t = await newTenant("pre"); const t2 = await newTenant("pre2");
    out.iso = ((await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting($1) i`, "transaction_isolation"))) as any[])[0].i;
    out.tenantLock_linhas = { comContexto: (await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length, semContexto: (await roleA.client.$transaction((tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length, contextoDeOutroTenant: (await withTenantRls(roleA.client, t2, (tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length };
    out.tenantsTemRls = ((await admin.$queryRawUnsafe(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname=$1`, "tenants")) as any[])[0];
    const X = await newItem(t, { base: 10 });
    let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
    const pa = withTenantRls(roleA.client, t, async (tx: any) => { await tx.$queryRawUnsafe(TENANT_LOCK, t); await gate; return "A-ok"; });
    await sleep(150); const tV = Date.now();
    const rv = await new invMod.RlsPrismaInventoryRepository(roleB.client).createMovement({ tenantId: t, itemId: X, type: "saida", quantidadeSinalizada: -1 }).then(() => ({ ok_ms: Date.now() - tV }), (e: any) => ({ err: errInfo(e) }));
    rel(); await pa; out.tenantNoKeyUpdate_vs_insertMovimento = rv;
    R.PRE = out; save();
  }
  // S-01: cenario STUCK do critico (BASE 4 + viatura 6; open real fotografa 10; contado 2 -> -8 na BASE -> 409)
  if (want("STUCK")) {
    for (const kind of ["headbase", "v2", "v3", "v3_recount_close"] as const) {
      const t = await newTenant("stuck-" + kind);
      const V = ((await admin.$queryRawUnsafe(`INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, $3) RETURNING id`, t, "PLN" + Math.floor(Math.random() * 9000 + 1000), "Guincho")) as any[])[0].id;
      const X = await newItem(t, { base: 10, avg: 1 });
      const g = randomUUID(); await mov(t, X, "link", -6, { group: g }); await mov(t, X, "link", 6, { custody: "vehicle", vehicle: V, group: g });
      const opened: any = await svcOf(roleA.client).open(actor(t), {});
      const s = opened.id; const E = opened.entries[0].id;
      await svcOf(roleA.client).recordEntry(actor(t), s, E, { counted_quantity: 2 });
      const out: any = { forma: "item 10 no total (BASE 4 + viatura 6); open real; contado 2 (variancia -8); ajuste vai para a BASE", systemQuantity: opened.entries[0].systemQuantity, saldoBase: await saldoBase(t, X) };
      const closeFn = kind === "headbase" ? () => svcOf(roleA.client).close(actor(t), s) : kind === "v2" ? () => closeV2(roleA.client, t, s, randomUUID()) : () => closeV3(roleA.client, t, s, randomUUID());
      try { await closeFn(); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
      out.aposClose = await state(t, s);
      if (kind === "headbase") {
        try { const r = await svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 4 }); out.recontagem = "ok contado=" + r.countedQuantity; } catch (e) { out.recontagem = errInfo(e); }
        try { const r = await svcOf(roleB.client).cancel(actor(t), s); out.cancel = "ok " + r.status; } catch (e) { out.cancel = errInfo(e); }
      } else if (kind === "v2") { out.recontagem = await recordEntryV2(roleB.client, t, s, E, 4); out.cancel = await cancelV2(roleB.client, t, s); try { await closeV2(roleA.client, t, s, randomUUID()); out.close2 = "ok"; } catch (e) { out.close2 = errInfo(e); } }
      else if (kind === "v3") { out.recontagem = await recordEntryV3(roleB.client, t, s, E, 4); out.cancel = await cancelV3(roleB.client, t, s); }
      else { out.recontagem = await recordEntryV3(roleB.client, t, s, E, 8); try { const r = await closeV3(roleA.client, t, s, randomUUID()); out.close2 = r; } catch (e) { out.close2 = errInfo(e); } out.saldoBaseFinal = await saldoBase(t, X); }
      out.final = await state(t, s);
      R["STUCK_" + kind] = out; save();
    }
    // parcial: X aplicado, Y (BASE 4 + viatura 6, contado 2) -> 409 -> fechando com 1 carimbo; saidas: recontar Y (nao carimbada) e retomar; cancel recusado; X (carimbada) recusada
    {
      const t = await newTenant("stuck-partial"); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const V = ((await admin.$queryRawUnsafe(`INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, $3) RETURNING id`, t, "PLP" + Math.floor(Math.random() * 9000 + 1000), "Guincho")) as any[])[0].id;
      const X = await newItem(t, { id: lo, base: 10, avg: 1 }); const Y = await newItem(t, { id: hi, base: 10, avg: 1 });
      const g = randomUUID(); await mov(t, Y, "link", -6, { group: g }); await mov(t, Y, "link", 6, { custody: "vehicle", vehicle: V, group: g });
      const { s, ids: [EX, EY] } = await newSession(t, [{ item: X, system: 10, counted: 7 }, { item: Y, system: 10, counted: 2 }]);
      const out: any = {};
      try { await closeV3(roleA.client, t, s, randomUUID()); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
      out.aposClose = await state(t, s);
      out.recontagemY_naoCarimbada = await recordEntryV3(roleB.client, t, s, EY, 8);
      out.recontagemX_carimbada = await recordEntryV3(roleB.client, t, s, EX, 9);
      out.cancel = await cancelV3(roleB.client, t, s);
      try { out.close2 = await closeV3(roleB.client, t, s, randomUUID()); } catch (e) { out.close2 = errInfo(e); }
      out.final = await state(t, s); out.saldoBaseY = await saldoBase(t, Y);
      const ent: any[] = await admin.$queryRawUnsafe(`SELECT item_id, counted_quantity::float8 contado, variance::float8 variance, adjustment_movement_id IS NOT NULL carimbada FROM cycle_count_entries WHERE cycle_count_id=$1::uuid ORDER BY item_id`, s);
      out.entries = ent; R.STUCK_partial_v3 = out; save();
    }
  }
  // S-02: TVV_resume (esperado -30) e TVV_concorrente (esperado -60) do critico, avg_cost 2
  if (want("TVV")) {
    for (const kind of ["headbase", "v2", "v3"] as const) {
      const t = await newTenant("tvv-" + kind); const items: string[] = [];
      for (let i = 0; i < 5; i++) items.push(await newItem(t, { base: 10, avg: 2 }));
      items.sort();
      const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
      await mov(t, items[2], "saida", -9);
      const u = randomUUID(); const fn = kind === "headbase" ? () => svcOf(roleA.client).close({ ...actor(t), userId: u }, s).then((r: any) => ({ status: r.cycleCount.status, totalVarianceValue: r.totalVarianceValue })) : kind === "v2" ? () => closeV2(roleA.client, t, s, u) : () => closeV3(roleA.client, t, s, u);
      let c1: any; let c2: any;
      try { c1 = await fn(); } catch (e) { c1 = { err: errInfo(e) }; }
      const aposFalha = await state(t, s);
      await mov(t, items[2], "entrada", 9, { unitCost: 2 });
      try { c2 = await fn(); } catch (e) { c2 = { err: errInfo(e) }; }
      R["TVV_resume_" + kind] = { close1: c1, aposFalha, close2: c2, final: await state(t, s), esperado: -30 }; save();
    }
    for (const kind of ["v2", "v3"] as const) {
      const iters: any[] = [];
      for (let i = 0; i < (kind === "v2" ? 3 : 5); i++) {
        const t = await newTenant("tvvc-" + kind); const items: string[] = [];
        for (let k = 0; k < 10; k++) items.push(await newItem(t, { base: 10, avg: 2 }));
        const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
        let go!: () => void; const start = new Promise<void>((r) => (go = r));
        const ps = [roleA.client, roleB.client].map((c, k) => (async () => { await start; if (k === 1) await sleep(15); return closeV(kind, c, t, s, randomUUID(), { betweenUnitsMs: 25 }); })());
        go(); const st = await Promise.allSettled(ps);
        iters.push({ st: st.map((x: any) => x.status === "fulfilled" ? { ok: x.value.status, begin: x.value.beginStatus, applied: x.value.applied, skipped: x.value.skipped, totalVarianceValue: x.value.totalVarianceValue } : { err: x.reason?.statusCode + "|" + x.reason?.reason }), final: await state(t, s) });
      }
      R["TVV_concorrente_" + kind] = { esperado: -60, iters }; save();
    }
  }
  // T-01: B3 como ESPECIFICADO (carimbo ANTES do B) com barreira fragment "tenant_id" (casa nos dois mundos) — head-base e v3
  if (want("B3")) {
    for (const kind of ["headbase", "v3"] as const) {
      const t = await newTenant("b3-" + kind); const X = await newItem(t, { base: 10 });
      const { s, ids: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      let release!: () => void; const gate = new Promise<void>((r) => (release = r)); const marks: any[] = [];
      const pa = admin.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config($2,$1,true)`, t, "app.current_tenant_id");
        await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE id=$1::uuid FOR UPDATE`, s);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status=$2 WHERE id=$1::uuid AND status=$3`, s, "fechando", "aberta");
        const m: any[] = await tx.$queryRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,cycle_count_id) VALUES ($1::uuid,$2::uuid,$4,-3,$5,$3::uuid) RETURNING id`, t, X, s, "ajuste", "base");
        await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance=-3, adjustment_movement_id=$2::uuid WHERE id=$1::uuid`, E, m[0].id);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status=$2 WHERE id=$1::uuid AND status=$3`, s, "concluida", "fechando");
        marks.push(["admin: carimbo+concluida (nao commitado)", now()]); await gate; marks.push(["admin: commit", now()]);
      }, { timeout: 30000 });
      await sleep(200); marks.push(["B: recordEntry " + kind + " contado=5", now()]);
      const pb = (kind === "headbase" ? svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 5 }).then((r: any) => ({ ok: "contado=" + r.countedQuantity })) : recordEntryV3(roleB.client, t, s, E, 5)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("plan4-B", 2500);
      const barreira: any = {};
      for (const frag of ["tenant_id", "cycle_counts"]) { try { await waitForOwnBlockedStatement(admin, { applicationName: "plan4-B", fragment: frag, label: "B3", timeoutMs: 2000 }); barreira[frag] = "casou"; } catch (e: any) { barreira[frag] = "FALHOU: " + String(e.message).slice(0, 120); } }
      release(); await pa; const rb = await pb;
      const entry: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 contado, variance::float8 variance FROM cycle_count_entries WHERE id=$1::uuid`, E);
      R["B3_" + kind] = { bloqueadoEm, barreira, B: rb, entryFinal: entry[0], invarianteContado7: entry[0].contado === 7, sessao: await state(t, s), marks }; save();
    }
  }
  // T-02: C7/C8 com escritor que NAO segura o lock do item (SQL cru, item_id de OUTRO item, nao commitado) — o unico jeito de alcancar o 23505
  if (want("C78")) {
    const IDX = `CREATE UNIQUE INDEX plan4_rev_key ON stock_movements (tenant_id, reverses_movement_id) WHERE reverses_movement_id IS NOT NULL`;
    for (const kind of ["v3", "headbase"] as const) {
      if (kind === "v3") await admin.$executeRawUnsafe(IDX);
      for (const via of ["C7", "C8"] as const) {
        const t = await newTenant(via + "-" + kind); const X = await newItem(t, { base: 10 }); const Z = await newItem(t, { base: 10 });
        const sid = randomUUID();
        const m = via === "C7" ? await mov(t, X, "saida", -3) : await mov(t, X, "saida", -3, { sourceType: "fuel_log", sourceId: sid });
        let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
        const ph = admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,reverses_movement_id) VALUES ($1::uuid,$2::uuid,$3,3,$4,$5::uuid)`, t, Z, "saida", "base", m); await gate; }, { timeout: 30000 });
        await sleep(200); const tb = Date.now();
        const repo = new invMod.RlsPrismaInventoryRepository(roleB.client);
        const pb = (via === "C7"
          ? (kind === "headbase" ? repo.reverseMovement({ tenantId: t, movementId: m }) : reverseV3(roleB.client, t, m))
          : (kind === "headbase" ? repo.removeExitForSource({ tenantId: t, sourceType: "fuel_log", sourceId: sid }).then((r: any) => r === undefined ? "undefined" : { compensou: r.id }) : removeExitV3(roleB.client, t, "fuel_log", sid)))
          .then((v: any) => ({ ok: v, ms: Date.now() - tb }), (e: any) => ({ err: errInfo(e), ms: Date.now() - tb }));
        const bloqueadoEm = await waitBlocked("plan4-B", 1500);
        await sleep(300); rel(); await ph; const rb = await pb;
        const n = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM stock_movements WHERE reverses_movement_id=$1::uuid`, m)) as any[])[0].n;
        R[via + "_" + kind] = { forma: "compensacao de m por SQL cru com item_id=Z (escritor sem o lock de X), NAO commitada; B = " + via + " " + kind + "; commit do cru durante o INSERT de B", B: rb, B_bloqueadoEm: bloqueadoEm, compensacoesDepois: n }; save();
      }
      if (kind === "v3") await admin.$executeRawUnsafe(`DROP INDEX plan4_rev_key`);
    }
  }
  // T-03 / A-03: unidade v3 segurando X DENTRO da tx (gancho beforeUnitCommit) x open() real / recalculateAbc() real; controle v1 -> 40P01
  if (want("LO")) {
    for (const kind of ["open", "abc"] as const) for (const design of ["v3", "v1ctrl"] as const) {
      const t = await newTenant("lo-" + kind + "-" + design); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 100 }); await sleep(20); const Y = await newItem(t, { id: hi, base: 100 });
      if (kind === "abc") { await mov(t, X, "saida", -1, { unitCost: 1 }); await mov(t, Y, "saida", -50, { unitCost: 1 }); }
      const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
      const v1 = () => withTenantRls(roleA.client, t, async (tx: any) => { await tx.$queryRawUnsafe(SESS_FU, t, s); await tx.$queryRawUnsafe(LOCK_ITEM, t, X); await sleep(1500); await tx.$queryRawUnsafe(LOCK_ITEM, t, Y); return "A-ok"; });
      const pa = (design === "v3" ? closeV3(roleA.client, t, s, randomUUID(), { beforeUnitCommitMs: (id) => (id === X ? 1500 : 0) }) : v1()).then((v: any) => ({ ok: v?.status ?? v }), (e) => ({ err: errInfo(e) }));
      await sleep(300);
      const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}).then((v: any) => "entries=" + v.entries.length) : invSvcOf(roleB.client).recalculateAbc(actor(t)).then((v: any) => JSON.stringify(v.summary))).then((v: any) => ({ ok: v }), (e: any) => ({ err: errInfo(e) }));
      const bloqueadoEm = await waitBlocked("plan4-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      R["LO_" + kind + "_" + design] = { A: ra, B: rb, B_bloqueadoEm: bloqueadoEm, deadlock: /40P01/.test(JSON.stringify([ra, rb])), final: design === "v3" ? await state(t, s) : undefined }; save();
    }
  }
  // N-OVL: head-base (2 open reais no mesmo item -> saldo 98) x v3 (open com lock do tenant + exclusao -> 2o open 409; corrida 2 opens x5 -> 1 ok)
  if (want("OVL")) {
    { const t = await newTenant("ovl-hb"); const X = await newItem(t, { base: 100 });
      const s1: any = await svcOf(roleA.client).open(actor(t), {}); const s2: any = await svcOf(roleA.client).open(actor(t), {});
      await svcOf(roleA.client).recordEntry(actor(t), s1.id, s1.entries[0].id, { counted_quantity: 99 });
      await svcOf(roleA.client).recordEntry(actor(t), s2.id, s2.entries[0].id, { counted_quantity: 99 });
      for (const s of [s1.id, s2.id]) await svcOf(roleA.client).close(actor(t), s);
      R.OVL_headbase = { sessoes: 2, saldoFinal: await saldoBase(t, X), fisico: 99 }; save(); }
    { const t = await newTenant("ovl-v3"); const X = await newItem(t, { base: 100 });
      const s1 = await openV3(roleA.client, t, [{ id: X, saldo: 100 }]);
      let s2: any; try { s2 = await openV3(roleA.client, t, [{ id: X, saldo: 100 }]); } catch (e) { s2 = errInfo(e); }
      const iters: any[] = [];
      for (let i = 0; i < 5; i++) {
        const t2 = await newTenant("ovl-race"); const Y = await newItem(t2, { base: 100 });
        let go!: () => void; const start = new Promise<void>((r) => (go = r));
        const ps = [roleA.client, roleB.client].map((c) => (async () => { await start; return openV3(c, t2, [{ id: Y, saldo: 100 }], 400); })());
        go(); await sleep(250); const bloq = await blockedOf("plan4-B");
        const st = await Promise.allSettled(ps);
        const n = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM cycle_counts WHERE tenant_id=$1::uuid`, t2)) as any[])[0].n;
        iters.push({ resultados: st.map((x: any) => x.status === "fulfilled" ? "ok" : x.reason?.reason), B_bloqueadoEm: bloq, sessoesCriadas: n });
      }
      const E1 = ((await admin.$queryRawUnsafe(`SELECT id FROM cycle_count_entries WHERE cycle_count_id=$1::uuid`, s1)) as any[])[0].id;
      await recordEntryV3(roleA.client, t, s1, E1, 99); const c = await closeV3(roleA.client, t, s1, randomUUID());
      // depois de concluida, um novo open do mesmo item e aceito
      let s3: any; try { s3 = await openV3(roleA.client, t, [{ id: X, saldo: 99 }]); } catch (e) { s3 = errInfo(e); }
      R.OVL_v3 = { open2: s2, corrida: iters, closeS1: c, saldoFinal: await saldoBase(t, X), fisico: 99, openDepoisDeConcluida: typeof s3 === "string" ? "ok" : s3 }; save(); }
  }
  // A-01/A-02 re-medidos contra o desenho v3 (recordEntry em fechando so para entry nao carimbada; cancel sob FOR UPDATE)
  if (want("E34")) {
    for (const kind of ["recordEntry_carimbada", "cancel", "recordEntry_naoCarimbada"] as const) {
      const t = await newTenant("e34-" + kind); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 10 }); const Y = kind === "recordEntry_naoCarimbada" ? await newItem(t, { id: hi, base: 10 }) : undefined;
      const { s, ids } = await newSession(t, Y ? [{ item: X, system: 10, counted: 7 }, { item: Y, system: 10, counted: 7 }] : [{ item: X, system: 10, counted: 7 }]);
      const pa = closeV3(roleA.client, t, s, randomUUID(), { beforeUnitCommitMs: (id) => (id === X ? 1500 : 0) }).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const pb = (kind === "cancel" ? cancelV3(roleB.client, t, s) : recordEntryV3(roleB.client, t, s, kind === "recordEntry_carimbada" ? ids[0] : ids[1], 5)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("plan4-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      const ent: any[] = await admin.$queryRawUnsafe(`SELECT item_id, counted_quantity::float8 contado, system_quantity::float8 sistema, variance::float8 variance FROM cycle_count_entries WHERE cycle_count_id=$1::uuid ORDER BY item_id`, s);
      R["E34_" + kind] = { A: ra, B: rb, B_bloqueadoEm: bloqueadoEm, entries: ent, coerente: ent.every((e) => e.variance === null || e.variance === e.contado - e.sistema), sessao: await state(t, s) }; save();
    }
  }
  // T-04: DDL numa base PROPRIA (erp_plan_mig) nao toca quem segura stock_movements na base das suites (erp_plan_b04a)
  if (want("DDLISO")) {
    const t1 = await newTenant("ddl-h"); const X = await newItem(t1, { base: 10 }); const t2 = await newTenant("ddl-v"); const Y = await newItem(t2, { base: 10 });
    let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
    const h = admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type) VALUES ($1::uuid,$2::uuid,$3,-1,$4)`, t1, X, "saida", "base"); await gate; }, { timeout: 30000 });
    await sleep(200); const tD = Date.now();
    const d = (async () => { try { const o = execFileSync("docker", ["exec", "plan-b04a-pg", "psql", "-U", "plan", "-d", "erp_plan_mig", "-v", "ON_ERROR_STOP=1", "-c", "CREATE UNIQUE INDEX plan4_tmp ON stock_movements (tenant_id, id) WHERE false; DROP INDEX plan4_tmp;"], { encoding: "utf8" }); return { ok_ms: Date.now() - tD, out: o.trim().slice(-40) }; } catch (e: any) { return { err: String(e.stderr ?? e.message).slice(0, 200) }; } })();
    await sleep(200); const tV = Date.now();
    const v = new invMod.RlsPrismaInventoryRepository(roleB.client).createMovement({ tenantId: t2, itemId: Y, type: "saida", quantidadeSinalizada: -1 }).then(() => ({ ok_ms: Date.now() - tV }), (e: any) => ({ err: errInfo(e), ms: Date.now() - tV }));
    const bloq = await waitBlocked("plan4-B", 1000);
    await sleep(3000); rel(); await h; const [rd, rv] = await Promise.all([d, v]);
    R.DDLISO = { forma: "H (admin) INSERT em stock_movements na base das suites + segura 3,4 s; D = CREATE/DROP INDEX na base PROPRIA erp_plan_mig; V = createMovement head-base de outro tenant na base das suites", D: rd, V: rv, V_bloqueadoEm: bloq }; save();
  }
  // A-06 / N-E5: sizing com a emulacao LITERAL do v3 (sem findItemById por unidade; total no finishClose) x head-base
  if (want("SIZE")) {
    const bulk = async (t: string, n: number) => {
      await admin.$executeRawUnsafe(`INSERT INTO inventory_items (tenant_id,sku,name,unit,avg_cost) SELECT $1::uuid,$3||g,$4||g,$5,2 FROM generate_series(1,$2::int) g`, t, n, "SKU-", "Item ", "un");
      await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,unit_cost,custody_type) SELECT tenant_id,id,$2,10,1,$3 FROM inventory_items WHERE tenant_id=$1::uuid`, t, "entrada", "base");
      const s = ((await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t)) as any[])[0].id;
      await admin.$executeRawUnsafe(`INSERT INTO cycle_count_entries (tenant_id,cycle_count_id,item_id,system_quantity,counted_quantity) SELECT tenant_id,$2::uuid,id,10,7 FROM inventory_items WHERE tenant_id=$1::uuid`, t, s);
      return s as string;
    };
    const Ns = (process.env.SIZE_N ?? "250,500,1000").split(",").map(Number); const out: any[] = [];
    const pct = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
    for (const N of Ns) {
      const row: any = { N };
      { const t = await newTenant("size-v3"); const s = await bulk(t, N); const unitMs: number[] = []; const t1 = Date.now(); let r: any;
        try { r = await closeV3(roleA.client, t, s, randomUUID(), { unitMs }); } catch (e) { r = { err: errInfo(e) }; }
        row.v3 = { ms: Date.now() - t1, status: r.status ?? r.err, totalVarianceValue: r.totalVarianceValue, esperado: -3 * 2 * N, unid_media: Math.round(unitMs.reduce((a, b) => a + b, 0) / Math.max(1, unitMs.length) * 100) / 100, unid_p95: pct(unitMs, 0.95), unid_max: Math.max(...unitMs), final: await state(t, s) }; save(); }
      if (process.env.SIZE_HB !== "0") { const t = await newTenant("size-hb"); const s = await bulk(t, N); const t1 = Date.now(); let r: any;
        try { const x: any = await svcOf(roleA.client).close(actor(t), s); r = { status: x.cycleCount.status, totalVarianceValue: x.totalVarianceValue }; } catch (e) { r = { err: errInfo(e) }; }
        row.headbase = { ms: Date.now() - t1, ...r, final: await state(t, s) }; }
      out.push(row); R.SIZE = out; save();
    }
  }
} finally {
  R.fimMs = now(); save();
  await roleA.drop().catch((e: any) => { R.dropA = errInfo(e); });
  await roleB.drop().catch((e: any) => { R.dropB = errInfo(e); });
  R.papeisOrfaos = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE $1`, "o6r_b01_%")) as any[])[0].n;
  save(); await admin.$disconnect();
}
