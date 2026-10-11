// critico-adversarial r2 — B-O6R-04a — SONDA PROPRIA (crit3). Importa PRODUCAO do worktree b04a (src/ = head-base) por URL.
// "v2" = emulacao LITERAL do plano v2 (fb9ee5a6) 3.1/3.3/3.4: V1 com FOR UPDATE do item antes da leitura; close em unidades
// (beginClose -> pending do snapshot -> 1 uow por item: sessao FOR UPDATE + status fechando + findEntry + skip se carimbada + prior
// (listMovements real) ?? createMovement v2 + stampEntry + findItemById -> acumula totalVarianceValue -> finishClose CAS).
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

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
const { cycleCountNotOpen } = await imp("src/modules/inventory/cycle-count.types.ts");
const { createEphemeralRole } = await imp("tests/helpers/auth-identity-fixture.ts");
const { withApplicationName, waitForOwnBlockedStatement } = await imp("tests/helpers/pg-barrier.ts");

const R: Record<string, unknown> = {};
const save = () => writeFileSync(OUT, JSON.stringify(R, null, 2));
const want = (k: string) => ONLY.length === 0 || ONLY.includes(k);
const errInfo = (e: any) => e ? ({ name: e?.name, code: e?.code, metaCode: e?.meta?.code ?? e?.cause?.code, status: e?.statusCode ?? e?.status, reason: e?.reason, msg: String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 200) }) : null;
const actor = (t: string) => ({ tenantId: t, userId: randomUUID(), roles: [], permissions: [] });

async function newTenant(tag: string) { const slug = `crit3-${tag}-${randomUUID().slice(0, 8)}`; return ((await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, slug)) as any[])[0].id as string; }
async function mov(t: string, item: string, type: string, q: number, o: { unitCost?: number; custody?: string; vehicle?: string; group?: string; cc?: string } = {}) {
  const sql = `INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,unit_cost,custody_type,custody_vehicle_id,transfer_group_id,cycle_count_id) VALUES ($1::uuid,$2::uuid,$3,$4::numeric,$5::numeric,$6,$7::uuid,$8::uuid,$9::uuid) RETURNING id`;
  return ((await admin.$queryRawUnsafe(sql, t, item, type, q, o.unitCost ?? null, o.custody ?? "base", o.vehicle ?? null, o.group ?? null, o.cc ?? null)) as any[])[0].id as string;
}
async function newItem(t: string, o: { id?: string; base?: number; avg?: number } = {}) {
  const id = o.id ?? randomUUID();
  await admin.$executeRawUnsafe(`INSERT INTO inventory_items (id,tenant_id,sku,name,unit,avg_cost) VALUES ($1::uuid,$2::uuid,$3,$3,'un',$4::numeric)`, id, t, `SKU-${id.slice(0, 13)}`, o.avg ?? 0);
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
  return { status: ss[0]?.status, is_active: ss[0]?.is_active, ajustes: a[0].n, somaAjustes: a[0].soma, entries: e[0].total, carimbadas: e[0].carimbadas };
}
async function saldoBase(t: string, item: string) { return Number(((await admin.$queryRawUnsafe(`SELECT COALESCE(SUM(quantidade_sinalizada),0)::float8 s FROM stock_movements WHERE tenant_id=$1::uuid AND item_id=$2::uuid AND custody_type='base'`, t, item)) as any[])[0].s); }
async function blockedOf(app: string) { return ((await admin.$queryRawUnsafe(`SELECT left(query,140) q FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'`, app)) as any[]).map((r) => r.q); }
async function waitBlocked(app: string, ms = 2500) { const dl = Date.now() + ms; for (;;) { const q = await blockedOf(app); if (q.length) return q; if (Date.now() > dl) return ["<timeout: nao bloqueou>"]; await sleep(20); } }

// ---------------- DESENHO v2 (literal do plano) ----------------
type Hooks = { betweenUnitsMs?: number; failAfterUnits?: number; inUnitHoldMs?: (itemId: string) => number; marks?: any[] };
const LOCK_ITEM = `SELECT * FROM "inventory_items" WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid FOR UPDATE`;
const SESS_FU = `SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`;
const SESS_FS = `SELECT status FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR SHARE`;
async function createMovementV2(tx: any, t: string, input: any, hold = 0, marks?: any[]) {
  const inv = new invMod.PrismaInventoryRepository(tx) as any;
  const rows: any[] = await tx.$queryRawUnsafe(LOCK_ITEM, t, input.itemId);
  if (!rows[0]) return undefined;
  if (hold) { marks?.push(["A: item travado, segurando", now()]); await sleep(hold); }
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
async function closeV2(client: any, t: string, s: string, userId: string, hooks: Hooks = {}) {
  const begin: any = await beginClose(client, t, s);
  if (begin.status === "not_found") throw Object.assign(new Error("not_found"), { statusCode: 404 });
  if (begin.status === "not_open") throw cycleCountNotOpen(begin.current);
  const num = (v: any) => (v === null || v === undefined ? undefined : Number(v));
  const pending = begin.entries
    .filter((e: any) => num(e.counted_quantity) !== undefined && num(e.counted_quantity) !== num(e.system_quantity) && !e.adjustment_movement_id)
    .sort((a: any, b: any) => (a.item_id < b.item_id ? -1 : 1));
  let total = 0; let applied = 0; let skipped = 0; let reused = 0;
  for (const p of pending) {
    if (hooks.failAfterUnits !== undefined && applied + skipped >= hooks.failAfterUnits) throw Object.assign(new Error("HOOK-FAIL"), { applied });
    const r: any = await withTenantRls(client, t, async (tx: any) => {
      const srow: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
      if (srow[0]?.status !== "fechando") throw cycleCountNotOpen(srow[0]?.status ?? "cancelada");
      const e = await tx.cycleCountEntry.findFirst({ where: { tenant_id: t, cycle_count_id: s, id: p.id } });
      if (e.adjustment_movement_id) return { skip: true };
      const variance = roundToDecimalPrecision(Number(e.counted_quantity) - Number(e.system_quantity));
      const inv = new invMod.PrismaInventoryRepository(tx);
      const prior = (await inv.listMovements({ tenantId: t, cycleCountId: s, itemId: e.item_id, limit: 1, offset: 0 })).items[0];
      const input = { itemId: e.item_id, type: "ajuste", quantidadeSinalizada: variance, reason: "contagem ciclica " + s, cycleCountId: s, createdBy: userId };
      const movement = prior ?? (await createMovementV2(tx, t, input, hooks.inUnitHoldMs?.(e.item_id) ?? 0, hooks.marks));
      if (!movement) throw Object.assign(new Error("invalid_item_reference"), { statusCode: 400 });
      await tx.cycleCountEntry.updateMany({ where: { tenant_id: t, cycle_count_id: s, id: e.id }, data: { variance, adjustment_movement_id: movement.id } });
      const item = await inv.findItemById(t, e.item_id);
      return { variance, avgCost: item?.avgCost ?? 0, reused: !!prior };
    });
    if (r.skip) skipped++; else { applied++; if (r.reused) reused++; total += r.variance * r.avgCost; }
    if (hooks.betweenUnitsMs) await sleep(hooks.betweenUnitsMs);
  }
  const fin: any = await withTenantRls(client, t, async (tx: any) => {
    const srow: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (srow[0]?.status !== "fechando") return { status: "not_open", current: srow[0]?.status };
    const left: any[] = await tx.$queryRawUnsafe(`SELECT count(*)::int n FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid AND counted_quantity IS NOT NULL AND counted_quantity <> system_quantity AND adjustment_movement_id IS NULL`, t, s);
    if (left[0].n > 0) return { status: "pending", remaining: left[0].n };
    const r = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "fechando" }, data: { status: "concluida" } });
    return r.count === 1 ? { status: "ok" } : { status: "not_open", current: "?" };
  });
  if (fin.status === "not_open") throw cycleCountNotOpen(fin.current);
  if (fin.status === "pending") throw Object.assign(new Error("close_incomplete"), { statusCode: 409 });
  return { status: "concluida", beginStatus: begin.status, totalVarianceValue: roundToDecimalPrecision(total), applied, skipped, reused };
}
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
const svcOf = (c: any) => new CycleCountService(new ccMod.RlsPrismaCycleCountRepository(c), new invMod.RlsPrismaInventoryRepository(c));

const roleA = await createEphemeralRole(admin, withApplicationName(DB, "crit3-A"));
const roleB = await createEphemeralRole(admin, withApplicationName(DB, "crit3-B"));
try {
  if (want("PRE")) {
    const out: any = {};
    for (const [n, r] of [["A", roleA], ["B", roleB]] as const) out[n] = ((await (r as any).client.$queryRawUnsafe(`SELECT current_user u, r.rolsuper, r.rolbypassrls, current_setting('application_name') app FROM pg_roles r WHERE r.rolname=current_user`)) as any[])[0];
    const t = await newTenant("pre");
    out.iso = ((await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting('transaction_isolation') i`))) as any[])[0].i;
    R.PRE = out; save();
  }
  // B3 do plano como ESPECIFICADO (T-B): admin FOR UPDATE sessao + CAS fechando + ajuste + CARIMBO + concluida, SEM commit; B depois
  if (want("B3")) {
    for (const kind of ["headbase", "v2"] as const) {
      const t = await newTenant("b3-" + kind); const X = await newItem(t, { base: 10 });
      const { s, ids: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      let release!: () => void; const gate = new Promise<void>((r) => (release = r)); const marks: any[] = [];
      const pa = admin.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id',$1,true)`, t);
        await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE id=$1::uuid FOR UPDATE`, s);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='fechando' WHERE id=$1::uuid AND status='aberta'`, s);
        const m: any[] = await tx.$queryRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,cycle_count_id) VALUES ($1::uuid,$2::uuid,'ajuste',-3,'base',$3::uuid) RETURNING id`, t, X, s);
        await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance=-3, adjustment_movement_id=$2::uuid WHERE id=$1::uuid`, E, m[0].id);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status='concluida' WHERE id=$1::uuid AND status='fechando'`, s);
        marks.push(["admin: carimbo+concluida (nao commitado)", now()]);
        await gate; marks.push(["admin: commit", now()]);
      }, { timeout: 30000 });
      await sleep(200);
      marks.push(["B: recordEntry " + kind + " contado=5", now()]);
      const pb = (kind === "headbase" ? svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 5 }).then((r: any) => ({ ok: "contado=" + r.countedQuantity }))
        : recordEntryV2(roleB.client, t, s, E, 5)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("crit3-B", 2500);
      let barreiraCycleCounts = "casou";
      try { await waitForOwnBlockedStatement(admin, { applicationName: "crit3-B", fragment: "cycle_counts", label: "B3", timeoutMs: 3000 }); } catch (e: any) { barreiraCycleCounts = "FALHOU: " + String(e.message).slice(0, 170); }
      let barreiraTenantId = "casou";
      try { await waitForOwnBlockedStatement(admin, { applicationName: "crit3-B", fragment: "tenant_id", label: "B3", timeoutMs: 3000 }); } catch (e: any) { barreiraTenantId = "FALHOU: " + String(e.message).slice(0, 170); }
      release(); await pa; const rb = await pb;
      const entry: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 contado, variance::float8 variance FROM cycle_count_entries WHERE id=$1::uuid`, E);
      R["B3_" + kind] = { forma: "B3 como especificado no plano (carimbo ANTES do B)", bloqueadoEm, barreira_fragment_cycle_counts: barreiraCycleCounts, barreira_fragment_tenant_id: barreiraTenantId, B: rb, entryFinal: entry[0], sessao: await state(t, s), marks }; save();
    }
  }
  // A-01/A-02 reverificados com a MINHA emulacao: A = closeV2 com hold DENTRO da unidade (sessao FOR UPDATE + item seguros 1,5 s)
  if (want("E3E4")) {
    for (const kind of ["recordEntry", "cancel"] as const) {
      const t = await newTenant("e34-" + kind); const X = await newItem(t, { base: 10 });
      const { s, ids: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      const pa = closeV2(roleA.client, t, s, randomUUID(), { inUnitHoldMs: () => 1500 }).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const pb = (kind === "recordEntry" ? recordEntryV2(roleB.client, t, s, E, 5) : cancelV2(roleB.client, t, s)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("crit3-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      const entry: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 contado, variance::float8 variance FROM cycle_count_entries WHERE id=$1::uuid`, E);
      R["E34_" + kind] = { A: ra, B: rb, bloqueadoEm, entryFinal: entry[0], sessao: await state(t, s), saldoX: await saldoBase(t, X) }; save();
    }
  }
  // A-03: unidade v2 segurando X x open() real / recalculateAbc() real; controle = desenho v1 (sessao + X, depois Y, numa tx)
  if (want("LO")) {
    for (const kind of ["open", "abc"] as const) for (const design of ["v2", "v1ctrl"] as const) {
      const t = await newTenant("lo-" + kind + "-" + design); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 100 }); await sleep(20); const Y = await newItem(t, { id: hi, base: 100 });
      if (kind === "abc") { await mov(t, X, "saida", -1, { unitCost: 1 }); await mov(t, Y, "saida", -50, { unitCost: 1 }); }
      const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
      const v1 = () => withTenantRls(roleA.client, t, async (tx: any) => {
        await tx.$queryRawUnsafe(SESS_FU, t, s); await tx.$queryRawUnsafe(LOCK_ITEM, t, X); await sleep(1500); await tx.$queryRawUnsafe(LOCK_ITEM, t, Y); return "A-ok";
      });
      const pa = (design === "v2" ? closeV2(roleA.client, t, s, randomUUID(), { inUnitHoldMs: (id) => (id === X ? 1500 : 0) }) : v1())
        .then((v: any) => ({ ok: v?.status ?? v }), (e) => ({ err: errInfo(e) }));
      await sleep(300);
      const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}).then((v: any) => "entries=" + v.entries.length)
        : new InventoryService(new invMod.RlsPrismaInventoryRepository(roleB.client)).recalculateAbc(actor(t)).then((v: any) => JSON.stringify(v.summary)))
        .then((v: any) => ({ ok: v }), (e: any) => ({ err: errInfo(e) }));
      const bloqueadoEm = await waitBlocked("crit3-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      R["LO_" + kind + "_" + design] = { A: ra, B: rb, bloqueadoEm, deadlock: /40P01/.test(JSON.stringify([ra, rb])) }; save();
    }
  }
  // NOVO: totalVarianceValue na RETOMADA (409 no meio -> corrigir saldo -> close de novo) e na CONCORRENCIA
  if (want("TVV")) {
    for (const kind of ["headbase", "v2"] as const) {
      const t = await newTenant("tvv-" + kind); const items: string[] = [];
      for (let i = 0; i < 5; i++) items.push(await newItem(t, { base: 10, avg: 2 }));
      items.sort();
      const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
      await mov(t, items[2], "saida", -9);
      const u = randomUUID(); let c1: any; let c2: any;
      try { c1 = kind === "headbase" ? await svcOf(roleA.client).close({ ...actor(t), userId: u }, s) : await closeV2(roleA.client, t, s, u); } catch (e) { c1 = { err: errInfo(e) }; }
      const aposFalha = await state(t, s);
      await mov(t, items[2], "entrada", 9, { unitCost: 2 });
      try {
        const r: any = kind === "headbase" ? await svcOf(roleA.client).close({ ...actor(t), userId: u }, s) : await closeV2(roleA.client, t, s, u);
        c2 = kind === "headbase" ? { status: r.cycleCount.status, totalVarianceValue: r.totalVarianceValue } : r;
      } catch (e) { c2 = { err: errInfo(e) }; }
      R["TVV_resume_" + kind] = { forma: "5 itens avg 2, sistema 10 contado 7 (esperado -30); 3o item com BASE 1 -> 409 no 1o close; entrada +9; 2o close", close1: c1, aposFalha, close2: c2, final: await state(t, s), esperado: -30 }; save();
    }
    const iters: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("tvvc"); const items: string[] = [];
      for (let k = 0; k < 10; k++) items.push(await newItem(t, { base: 10, avg: 2 }));
      const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
      let go!: () => void; const start = new Promise<void>((r) => (go = r));
      const ps = [roleA.client, roleB.client].map((c, k) => (async () => { await start; if (k === 1) await sleep(15); return closeV2(c, t, s, randomUUID(), { betweenUnitsMs: 25 }); })());
      go(); const st = await Promise.allSettled(ps);
      iters.push({ i, st: st.map((x: any) => x.status === "fulfilled" ? { ok: x.value.status, begin: x.value.beginStatus, applied: x.value.applied, skipped: x.value.skipped, totalVarianceValue: x.value.totalVarianceValue } : { err: x.reason?.statusCode + "|" + x.reason?.reason + "|" + String(x.reason?.message).slice(0, 60) }), final: await state(t, s), esperado: -60 });
    }
    R.TVV_concorrente = { forma: "10 itens avg 2, sistema 10 contado 7 (esperado -60); close v2 x2 (B 15 ms depois), 25 ms entre unidades; 5 iter", iters }; save();
  }
  // NOVO: sessao presa em fechando por 409 DETERMINISTICO (saldo em custodia de viatura; open fotografa o GLOBAL, ajuste vai p/ BASE)
  if (want("STUCK")) {
    for (const kind of ["headbase", "v2"] as const) {
      const t = await newTenant("stuck-" + kind);
      const V = ((await admin.$queryRawUnsafe(`INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Guincho') RETURNING id`, t, "CRT" + Math.floor(Math.random() * 9000 + 1000))) as any[])[0].id;
      const X = await newItem(t, { base: 10, avg: 1 });
      const g = randomUUID(); await mov(t, X, "link", -6, { group: g }); await mov(t, X, "link", 6, { custody: "vehicle", vehicle: V, group: g });
      const opened: any = await svcOf(roleA.client).open(actor(t), {});
      const s = opened.id; const E = opened.entries[0].id;
      await svcOf(roleA.client).recordEntry(actor(t), s, E, { counted_quantity: 2 });
      const out: any = { forma: "item 10 no total (BASE 4 + viatura 6); open real; contado 2 (variancia -8); ajuste vai para a BASE", systemQuantity: opened.entries[0].systemQuantity, saldoBase: await saldoBase(t, X) };
      if (kind === "headbase") {
        try { await svcOf(roleA.client).close(actor(t), s); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
        out.aposClose = await state(t, s);
        try { const r = await svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 4 }); out.recontagem = "ok contado=" + r.countedQuantity; } catch (e) { out.recontagem = errInfo(e); }
        try { const r = await svcOf(roleB.client).cancel(actor(t), s); out.cancel = "ok " + r.status; } catch (e) { out.cancel = errInfo(e); }
      } else {
        try { await closeV2(roleA.client, t, s, randomUUID()); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
        out.aposClose = await state(t, s);
        out.recontagem = await recordEntryV2(roleB.client, t, s, E, 4);
        out.cancel = await cancelV2(roleB.client, t, s);
        try { await closeV2(roleA.client, t, s, randomUUID()); out.close2 = "ok"; } catch (e) { out.close2 = errInfo(e); }
      }
      out.final = await state(t, s);
      R["STUCK_" + kind] = out; save();
    }
  }
  // A-06: sizing (v2 com e sem o indice unico novo) x head-base
  if (want("SIZE")) {
    const bulk = async (t: string, n: number) => {
      await admin.$executeRawUnsafe(`INSERT INTO inventory_items (tenant_id,sku,name,unit) SELECT $1::uuid,'SKU-'||g,'Item '||g,'un' FROM generate_series(1,$2::int) g`, t, n);
      await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,unit_cost,custody_type) SELECT tenant_id,id,'entrada',10,1,'base' FROM inventory_items WHERE tenant_id=$1::uuid`, t);
      const s = ((await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t)) as any[])[0].id;
      await admin.$executeRawUnsafe(`INSERT INTO cycle_count_entries (tenant_id,cycle_count_id,item_id,system_quantity,counted_quantity) SELECT tenant_id,$2::uuid,id,10,7 FROM inventory_items WHERE tenant_id=$1::uuid`, t, s);
      return s as string;
    };
    const N = Number(process.env.SIZE_N ?? 1000); const out: any = { N };
    const runV2 = async (tag: string) => { const t = await newTenant(tag); const s = await bulk(t, N); const t1 = Date.now(); let r: any; try { r = { ms: Date.now() - t1, ...(await closeV2(roleA.client, t, s, randomUUID())) }; r.ms = Date.now() - t1; } catch (e) { r = { ms: Date.now() - t1, err: errInfo(e) }; } r.final = await state(t, s); return r; };
    out.v2_semIndice = await runV2("size-v2"); save();
    await admin.$executeRawUnsafe(`CREATE UNIQUE INDEX "crit3_tmp_cc_item" ON stock_movements (tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL`);
    out.v2_comIndice = await runV2("size-v2i"); save();
    await admin.$executeRawUnsafe(`DROP INDEX "crit3_tmp_cc_item"`);
    if (process.env.SIZE_HB !== "0") { const t = await newTenant("size-hb"); const s = await bulk(t, N); const t1 = Date.now(); try { await svcOf(roleA.client).close(actor(t), s); out.headbase = { ms: Date.now() - t1 }; } catch (e) { out.headbase = { ms: Date.now() - t1, err: errInfo(e) }; } out.headbase.final = await state(t, s); }
    R.SIZE = out; save();
  }
  // C7/C8 do plano: compensacao pre-semeada por SQL cru; head-base reverseMovement / removeExitForSource pelo papel
  if (want("C78")) {
    const t = await newTenant("c7"); const X = await newItem(t, { base: 10 }); const m = await mov(t, X, "saida", -3);
    await admin.$executeRawUnsafe("INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,reverses_movement_id) VALUES ($1::uuid,$2::uuid,$3,3,$4,$5::uuid)", t, X, "saida", "base", m);
    let c7: any; try { c7 = await new invMod.RlsPrismaInventoryRepository(roleA.client).reverseMovement({ tenantId: t, movementId: m }); } catch (e) { c7 = { err: errInfo(e) }; }
    const n7 = ((await admin.$queryRawUnsafe("SELECT count(*)::int n FROM stock_movements WHERE reverses_movement_id=$1::uuid", m)) as any[])[0].n;
    const t8 = await newTenant("c8"); const Y = await newItem(t8, { base: 10 }); const sid = randomUUID();
    const ex = ((await admin.$queryRawUnsafe("INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,source_type,source_id) VALUES ($1::uuid,$2::uuid,$3,-3,$4,$5,$6::uuid) RETURNING id", t8, Y, "saida", "base", "fuel_log", sid)) as any[])[0].id;
    await admin.$executeRawUnsafe("INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,reverses_movement_id) VALUES ($1::uuid,$2::uuid,$3,3,$4,$5::uuid)", t8, Y, "saida", "base", ex);
    let c8: any; try { const r = await new invMod.RlsPrismaInventoryRepository(roleA.client).removeExitForSource({ tenantId: t8, sourceType: "fuel_log", sourceId: sid }); c8 = r === undefined ? "undefined" : { compensou: r.id }; } catch (e) { c8 = { err: errInfo(e) }; }
    const n8 = ((await admin.$queryRawUnsafe("SELECT count(*)::int n FROM stock_movements WHERE reverses_movement_id=$1::uuid", ex)) as any[])[0].n;
    R.C78_headbase = { C7: { resultado: c7?.status ?? c7, compensacoesDepois: n7 }, C8: { resultado: c8, compensacoesDepois: n8 } }; save();
  }
  // B8(ii) com o gancho do plano (onUnitApplied, POS-commit): a unidade nao segura nada enquanto o gancho dorme
  if (want("B8POST")) {
    for (const kind of ["open", "abc"] as const) {
      const t = await newTenant("b8post-" + kind); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 100 }); await sleep(20); const Y = await newItem(t, { id: hi, base: 100 });
      if (kind === "abc") { await mov(t, X, "saida", -1, { unitCost: 1 }); await mov(t, Y, "saida", -50, { unitCost: 1 }); }
      const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
      const pa = closeV2(roleA.client, t, s, randomUUID(), { betweenUnitsMs: 1500 }).then((v: any) => ({ ok: v.status }), (e) => ({ err: errInfo(e) }));
      await sleep(300);
      const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}).then((v: any) => "entries=" + v.entries.length) : new InventoryService(new invMod.RlsPrismaInventoryRepository(roleB.client)).recalculateAbc(actor(t)).then((v: any) => JSON.stringify(v.summary))).then((v: any) => ({ ok: v }), (e: any) => ({ err: errInfo(e) }));
      const bloqueadoEm = await waitBlocked("crit3-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      R["B8POST_" + kind] = { A: ra, B: rb, bloqueadoEm, deadlock: /40P01/.test(JSON.stringify([ra, rb])) }; save();
    }
  }
  // sessoes sobrepostas no mesmo item: dupla aplicacao da variancia (head-base x v2), mesma forma do B9 do plano
  if (want("OVL")) {
    for (const kind of ["headbase", "v2"] as const) {
      const t = await newTenant("ovl-" + kind); const X = await newItem(t, { base: 100 });
      const s1 = (await svcOf(roleA.client).open(actor(t), {})); const s2 = (await svcOf(roleA.client).open(actor(t), {}));
      await svcOf(roleA.client).recordEntry(actor(t), s1.id, s1.entries[0].id, { counted_quantity: 99 });
      await svcOf(roleA.client).recordEntry(actor(t), s2.id, s2.entries[0].id, { counted_quantity: 99 });
      for (const s of [s1.id, s2.id]) { if (kind === "headbase") await svcOf(roleA.client).close(actor(t), s); else await closeV2(roleA.client, t, s, randomUUID()); }
      R["OVL_" + kind] = { forma: "item 100; 2 sessoes abertas (open real) sobre o mesmo item; as duas contam 99 (fisico = 99); fecha as duas", snapshot: [s1.entries[0].systemQuantity, s2.entries[0].systemQuantity], saldoFinal: await saldoBase(t, X), s1: await state(t, s1.id), s2: await state(t, s2.id) }; save();
    }
  }
  // DDL do T-C4 (DROP INDEX em stock_movements) enquanto outra suite segura tx com escrita em stock_movements (A2/A14/B3) e uma 3a suite roda V1
  if (want("DDL")) {
    for (const comDDL of [false, true]) {
      await admin.$executeRawUnsafe("CREATE UNIQUE INDEX IF NOT EXISTS crit3_tmp_idx ON stock_movements (tenant_id, id) WHERE false");
      const t1 = await newTenant("ddl-h"); const X = await newItem(t1, { base: 10 });
      const t2 = await newTenant("ddl-v"); const Y = await newItem(t2, { base: 10 });
      let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
      const h = admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe("INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type) VALUES ($1::uuid,$2::uuid,$3,-1,$4)", t1, X, "saida", "base"); await gate; }, { timeout: 30000 });
      await sleep(200);
      const tD = Date.now(); const d = comDDL ? admin.$executeRawUnsafe("DROP INDEX crit3_tmp_idx").then(() => ({ ok: Date.now() - tD }), (e: any) => ({ err: errInfo(e) })) : Promise.resolve({ semDDL: true });
      await sleep(200);
      const tV = Date.now();
      const v = new invMod.RlsPrismaInventoryRepository(roleB.client).createMovement({ tenantId: t2, itemId: Y, type: "saida", quantidadeSinalizada: -1 }).then(() => ({ ok: Date.now() - tV }), (e: any) => ({ err: errInfo(e), ms: Date.now() - tV }));
      const bloqueadoEm = await waitBlocked("crit3-B", 1500);
      await sleep(5500); rel(); await h; const [rd, rv] = await Promise.all([d, v]);
      R["DDL_" + (comDDL ? "com" : "sem")] = { forma: "H (admin) INSERT em stock_movements + segura 5,9 s (como A2/A14/B3); D = DROP INDEX (T-C4); V = createMovement head-base de OUTRO tenant/item (suite paralela)", D: rd, V: rv, V_bloqueadoEm: bloqueadoEm }; save();
    }
    await admin.$executeRawUnsafe("DROP INDEX IF EXISTS crit3_tmp_idx");
  }
  // versoes mistas (deploy rolling): cancel do CODIGO ANTIGO enquanto o close v2 esta em fechando
  if (want("MIX")) {
    const t = await newTenant("mix"); const items: string[] = [];
    for (let i = 0; i < 4; i++) items.push(await newItem(t, { base: 10, avg: 1 }));
    const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
    const pa = closeV2(roleA.client, t, s, randomUUID(), { betweenUnitsMs: 400 }).then((v: any) => ({ ok: v }), (e: any) => ({ err: errInfo(e) }));
    await sleep(250);
    const antes = await state(t, s);
    let old: any; try { const r = await svcOf(roleB.client).cancel(actor(t), s); old = "ok " + r.status; } catch (e) { old = errInfo(e); }
    const ra = await pa;
    R.MIX = { forma: "close v2 com 400 ms entre unidades; 250 ms depois, cancel do HEAD-BASE (codigo antigo)", estadoQuandoCancelChegou: antes, cancelAntigo: old, closeV2: ra, final: await state(t, s) }; save();
  }
} finally {
  R.fimMs = now(); save();
  await roleA.drop().catch((e: any) => { R.dropA = errInfo(e); });
  await roleB.drop().catch((e: any) => { R.dropB = errInfo(e); });
  save(); await admin.$disconnect();
}
