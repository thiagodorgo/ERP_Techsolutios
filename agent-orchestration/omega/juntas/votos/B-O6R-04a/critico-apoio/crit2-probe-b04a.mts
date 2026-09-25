// critico-adversarial B-O6R-04a r1 — instancia 2 — sonda PROPRIA (escrita do zero; a da instancia 1 foi roteiro).
// Importa codigo de PRODUCAO do worktree b04a (HEAD b72fd626 = head-base do bloco em src/) por URL de arquivo.
// Clientes sob teste = 2 papeis efemeros NOSUPERUSER NOBYPASSRLS (createEphemeralRole do arnes); admin so semeia/observa.
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
const { wouldOverdraw } = await imp("src/modules/inventory/inventory.calculations.ts");
const { createEphemeralRole } = await imp("tests/helpers/auth-identity-fixture.ts");
const { withApplicationName } = await imp("tests/helpers/pg-barrier.ts");

const R: Record<string, unknown> = {};
const save = () => writeFileSync(OUT, JSON.stringify(R, null, 2));
const want = (k: string) => ONLY.length === 0 || ONLY.includes(k);

function errInfo(e: any) {
  if (!e) return null;
  return { name: e?.name, code: e?.code, status: e?.status ?? e?.statusCode, reason: e?.reason, msg: String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 220) };
}
const short = (e: any) => { const i = errInfo(e)!; return `${i.code ?? ""}|${i.status ?? ""}|${i.reason ?? ""}|${i.msg.slice(0, 70)}`; };
const countBy = (xs: string[]) => xs.reduce((m: Record<string, number>, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
const actor = (t: string) => ({ tenantId: t, userId: randomUUID(), roles: [], permissions: [] });

async function newTenant(tag: string): Promise<string> {
  const slug = `crit2-${tag}-${randomUUID().slice(0, 8)}`;
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
  await admin.$executeRawUnsafe(`INSERT INTO inventory_items (id, tenant_id, sku, name, unit, is_fuel) VALUES ($1::uuid, $2::uuid, $3, $3, 'un', $4)`, id, t, `SKU-${id.slice(0, 13)}`, o.isFuel ?? false);
  if (o.base) await mov(t, id, "entrada", o.base, o.unitCost ?? 1);
  return id;
}
async function saldo(t: string, item: string): Promise<number> {
  const r: any[] = await admin.$queryRawUnsafe(
    `SELECT COALESCE(SUM(quantidade_sinalizada),0)::float8 AS s FROM stock_movements WHERE tenant_id=$1::uuid AND item_id=$2::uuid AND custody_type='base' AND custody_operator_profile_id IS NULL AND custody_vehicle_id IS NULL`, t, item);
  return Number(r[0].s);
}
async function avgCost(t: string, item: string): Promise<number> {
  const r: any[] = await admin.$queryRawUnsafe(`SELECT avg_cost::float8 AS a FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, item);
  return Number(r[0].a);
}
async function newSession(t: string, entries: { item: string; system: number; counted?: number }[]) {
  const r: any[] = await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
  const s = r[0].id as string;
  const entryIds: string[] = [];
  for (const e of entries) {
    const rr: any[] = await admin.$queryRawUnsafe(
      `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::numeric,$5::numeric) RETURNING id`,
      t, s, e.item, e.system, e.counted ?? null);
    entryIds.push(rr[0].id);
  }
  return { s, entryIds };
}
const invOf = (c: any) => new invMod.RlsPrismaInventoryRepository(c);
const svcOf = (c: any) => new CycleCountService(new ccMod.RlsPrismaCycleCountRepository(c), invOf(c));
async function race<T>(fns: (() => Promise<T>)[]) {
  let go!: () => void; const start = new Promise<void>((r) => (go = r));
  const ps = fns.map((f) => (async () => { await start; return f(); })());
  go();
  return Promise.allSettled(ps);
}
async function blockedOf(appName: string): Promise<{ n: number; queries: string[] }> {
  const rows: any[] = await admin.$queryRawUnsafe(
    `SELECT left(query, 90) AS q FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND pid <> pg_backend_pid()`, appName);
  return { n: rows.length, queries: rows.map((r) => r.q) };
}
async function waitBlocked(appName: string, timeoutMs = 4000) {
  const dl = Date.now() + timeoutMs;
  for (;;) { const b = await blockedOf(appName); if (b.n >= 1) return b; if (Date.now() > dl) return { n: 0, queries: [], timeout: true } as any; await sleep(25); }
}

const roleA = await createEphemeralRole(admin, withApplicationName(DB, "crit2-A"));
const roleB = await createEphemeralRole(admin, withApplicationName(DB, "crit2-B"));
try {
  for (const [n, r] of [["A", roleA], ["B", roleB]] as const) {
    const rows: any[] = await (r as any).client.$queryRawUnsafe(`SELECT current_user AS u, r.rolsuper, r.rolbypassrls, current_setting($1) AS app FROM pg_roles r WHERE r.rolname = current_user`, "application_name");
    R[`role_${n}`] = rows[0];
  }
  {
    const t = await newTenant("iso");
    const it = await newItem(t, { base: 1 });
    const iso: any[] = await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting($1) AS iso`, "transaction_isolation"));
    const withCtx: any[] = await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, it));
    const noCtx: any[] = await roleA.client.$transaction((tx: any) => tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, it));
    const t2 = await newTenant("iso2");
    const crossCtx: any[] = await withTenantRls(roleA.client, t2, (tx: any) => tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, it));
    R.premissas = { isolation: iso[0].iso, forUpdateComContexto: withCtx.length, forUpdateSemContexto: noCtx.length, forUpdateContextoDeOutroTenant: crossCtx.length };
  }
  save();

  // ---------- FASE A: vermelho-controle no head-base, codigo de producao sem alteracao ----------
  if (want("P1")) {
    const iters: any[] = [];
    for (let i = 0; i < 10; i++) {
      const t = await newTenant("p1"); const item = await newItem(t, { base: 10 });
      const repos = [invOf(roleA.client), invOf(roleB.client)];
      const t0 = Date.now();
      const st = await race(Array.from({ length: 20 }, (_, k) => () => repos[k % 2].createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1, custody: { custodyType: "base" } })));
      const ok = st.filter((s) => s.status === "fulfilled").length;
      iters.push({ i, ok, rej: countBy(st.filter((s) => s.status === "rejected").map((s: any) => short(s.reason))), saldo: await saldo(t, item), ms: Date.now() - t0 });
    }
    R.P1 = { forma: "10 iter x 20 saidas de 1 (10 via papel A + 10 via papel B, largada comum), BASE=10, V1 head-base", iters, negativas: iters.filter((x) => x.saldo < 0).length }; save();
  }
  if (want("P6")) {
    const iters: any[] = [];
    for (let i = 0; i < 10; i++) {
      const t = await newTenant("p6"); const item = await newItem(t, { base: 10 });
      const { s } = await newSession(t, [{ item, system: 10, counted: 7 }]);
      const st = await race([() => svcOf(roleA.client).close(actor(t), s), () => svcOf(roleB.client).close(actor(t), s)]);
      const adj: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
      iters.push({ i, fulfilled: st.filter((x) => x.status === "fulfilled").length, rej: st.filter((x) => x.status === "rejected").map((x: any) => short(x.reason)), ajustes: adj[0].n, saldo: await saldo(t, item) });
    }
    R.P6 = { forma: "10 iter x close() x2 (A e B), sistema 10 contado 7, V6 head-base", iters, duplicados: iters.filter((x) => x.ajustes > 1).length }; save();
  }
  if (want("P3")) {
    const iters: any[] = [];
    for (let i = 0; i < 10; i++) {
      const t = await newTenant("p3"); const item = await newItem(t, { base: 10 }); const m = await mov(t, item, "saida", -3);
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.reverseMovement({ tenantId: t, movementId: m })));
      const c: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t, m);
      iters.push({ i, compensacoes: c[0].n, st: st.map((x: any) => (x.status === "fulfilled" ? x.value.status : short(x.reason))), saldo: await saldo(t, item) });
    }
    R.P3 = { forma: "10 iter x reverseMovement x2 do mesmo movimento, V3 head-base", iters, duplicados: iters.filter((x) => x.compensacoes > 1).length }; save();
  }
  if (want("P5")) {
    const iters: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p5"); const item = await newItem(t, { base: 10 }); const src = randomUUID();
      const m = await mov(t, item, "saida", -3, null, { source: ["fuel_log", src] });
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.removeExitForSource({ tenantId: t, sourceType: "fuel_log", sourceId: src })));
      const c: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND reverses_movement_id=$2::uuid`, t, m);
      iters.push({ i, compensacoes: c[0].n, st: st.map((x: any) => (x.status === "fulfilled" ? (x.value ? "mov" : "undef") : short(x.reason))), saldo: await saldo(t, item) });
    }
    R.P5 = { forma: "5 iter x removeExitForSource x2 da mesma fonte, V5 head-base", iters, duplicados: iters.filter((x) => x.compensacoes > 1).length }; save();
  }
  if (want("P7")) {
    const iters: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p7"); const item = await newItem(t, { base: 10, unitCost: 1 });
      await admin.$executeRawUnsafe(`UPDATE inventory_items SET avg_cost=1 WHERE id=$1::uuid`, item);
      const st = await race([invOf(roleA.client), invOf(roleB.client)].map((r) => () => r.createMovement({ tenantId: t, itemId: item, type: "entrada", quantidadeSinalizada: 10, unitCost: 3, custody: { custodyType: "base" } })));
      iters.push({ i, ok: st.filter((x) => x.status === "fulfilled").length, avg: await avgCost(t, item), saldo: await saldo(t, item) });
    }
    R.P7 = { forma: "5 iter x entrada 10@3 x2 concorrentes sobre 10@1 (esperado 2.333333), V1 head-base", iters, errados: iters.filter((x) => Math.abs(x.avg - 2.333333) > 1e-6).length }; save();
  }
  if (want("P9")) {
    const iters: any[] = [];
    for (let i = 0; i < 5; i++) {
      const t = await newTenant("p9"); const item = await newItem(t, { base: 10, isFuel: true }); const src = randomUUID();
      const svcs = [new InventoryService(invOf(roleA.client)), new InventoryService(invOf(roleB.client))];
      const st = await race(svcs.map((s) => () => s.createExitForSource(actor(t), { sourceType: "fuel_log", sourceId: src, itemId: item, quantity: 1 })));
      const c: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND source_id=$2::uuid`, t, src);
      iters.push({ i, linhas: c[0].n, st: st.map((x: any) => (x.status === "fulfilled" ? "ok" : short(x.reason))) });
    }
    R.P9 = { forma: "5 iter x createExitForSource x2 MESMA fonte (InventoryService real, fast-path incluso), V4 head-base", iters, com25P02: iters.filter((x) => x.st.some((s: string) => /25P02|aborted/.test(s))).length }; save();
  }

  // ---------- FASE B: os dois indices sobre o dado que a fase A produziu ----------
  if (want("IDX")) {
    const dupRev: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM (SELECT tenant_id, reverses_movement_id FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d`);
    const dupCc: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM (SELECT tenant_id, cycle_count_id, item_id FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY 1,2,3 HAVING count(*)>1) d`);
    const tryIdx = async (sql: string) => { try { await admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(sql); throw new Error("ROLLBACK-ON-PURPOSE"); }); return "created(?)"; } catch (e: any) { return String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 200); } };
    R.IDX = {
      duplicadosReverses: dupRev[0].n, duplicadosCycleItem: dupCc[0].n,
      idxReverses: await tryIdx(`CREATE UNIQUE INDEX crit2_rev ON stock_movements (tenant_id, reverses_movement_id) WHERE reverses_movement_id IS NOT NULL`),
      idxCycleItem: await tryIdx(`CREATE UNIQUE INDEX crit2_cc ON stock_movements (tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL`),
      sobrou: (await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname LIKE 'crit2_%'`) as any[])[0].n,
    }; save();
  }

  // ---------- FASE C: o V6 DO PLANO (emulacao literal do §3.3-V6/§3.1-6) contra codigo REAL do outro lado ----------
  async function closePlanHoldItems(t: string, s: string, first: string, second: string, mode: string, holdMs: number, marks: any[]) {
    return withTenantRls(roleA.client, t, async (tx: any) => {
      await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
      await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid ${mode}`, t, first);
      marks.push(["A: 1o item travado", now()]);
      await sleep(holdMs);
      marks.push(["A: pede 2o item", now()]);
      await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid ${mode}`, t, second);
      marks.push(["A: 2o item travado", now()]);
      return "A-ok";
    });
  }
  async function lockOrder(kind: "open" | "abc", mode: string) {
    const t = await newTenant(`lo-${kind}`);
    const [lo, hi] = [randomUUID(), randomUUID()].sort();
    const X = await newItem(t, { id: lo, base: 100 }); await sleep(30);
    const Y = await newItem(t, { id: hi, base: 100 });
    if (kind === "abc") { await mov(t, X, "saida", -1, 1); await mov(t, Y, "saida", -50, 1); }
    const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
    const marks: any[] = [];
    const pa = closePlanHoldItems(t, s, X, Y, mode, 1500, marks).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
    await sleep(300);
    marks.push([`B: inicia ${kind} (codigo real)`, now()]);
    const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}) : new InventoryService(invOf(roleB.client)).recalculateAbc(actor(t)))
      .then((v: any) => ({ ok: kind === "open" ? `sessao entries=[${v.entries.map((e: any) => (e.itemId === X ? "X" : "Y")).join(",")}]` : JSON.stringify(v.summary), at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
    const [ra, rb] = await Promise.all([pa, pb]);
    return { modoA: mode, ordemA: "X(menor id, mais antigo) depois Y", A: ra, B: rb, marks };
  }
  if (want("LO")) {
    R.LO_open_forUpdate = await lockOrder("open", "FOR UPDATE"); save();
    R.LO_open_controleKeyShare = await lockOrder("open", "FOR KEY SHARE"); save();
    R.LO_abc_forUpdate = await lockOrder("abc", "FOR UPDATE"); save();
    R.LO_abc_controleKeyShare = await lockOrder("abc", "FOR KEY SHARE"); save();
  }

  async function closePlanFull(t: string, s: string, E: string, X: string, holdMs: number, marks: any[], stampAfterHold: boolean) {
    return withTenantRls(roleA.client, t, async (tx: any) => {
      await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
      const e: any[] = await tx.$queryRawUnsafe(`SELECT counted_quantity::float8 AS c, system_quantity::float8 AS sq FROM cycle_count_entries WHERE tenant_id=$1::uuid AND id=$2::uuid`, t, E);
      const variance = e[0].c - e[0].sq;
      await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, X);
      const m = await new invMod.PrismaInventoryRepository(tx).createMovement({ tenantId: t, itemId: X, type: "ajuste", quantidadeSinalizada: variance, reason: "crit2", cycleCountId: s });
      marks.push([`A: leu contado=${e[0].c}, gravou ajuste ${variance}`, now()]);
      const stamp = async () => {
        await tx.cycleCountEntry.updateMany({ where: { tenant_id: t, id: E, cycle_count_id: s }, data: { variance, adjustment_movement_id: m.id } });
        const cas = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "aberta" }, data: { status: "concluida" } });
        marks.push([`A: carimbou entry + CAS concluida count=${cas.count}`, now()]);
      };
      if (!stampAfterHold) await stamp();
      await sleep(holdMs);
      if (stampAfterHold) await stamp();
      marks.push(["A: commit", now()]);
      return "A-ok";
    });
  }
  async function finalState(t: string, s: string, E: string, X: string) {
    const e: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 AS contado, variance::float8 AS variance, adjustment_movement_id IS NOT NULL AS tem_ajuste FROM cycle_count_entries WHERE id=$1::uuid`, E);
    const ss: any[] = await admin.$queryRawUnsafe(`SELECT status, is_active FROM cycle_counts WHERE id=$1::uuid`, s);
    const a: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n, COALESCE(SUM(quantidade_sinalizada),0)::float8 AS soma FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
    return { entry: e[0], sessao: ss[0], ajustes: a[0], saldoX: await saldo(t, X) };
  }
  async function e3(variant: "codigo_atual" | "filtro_relacional_13d") {
    const t = await newTenant("e3"); const X = await newItem(t, { base: 10 });
    const { s, entryIds: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
    const marks: any[] = [];
    const pa = closePlanFull(t, s, E, X, 1500, marks, true).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
    await sleep(300);
    const tb = now(); marks.push([`B: recordEntry(${variant}) contado=5`, tb]);
    let rb: any;
    try {
      if (variant === "codigo_atual") { const r = await svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 5 }); rb = { ok: `contado=${r.countedQuantity}` }; }
      else { const r = await withTenantRls(roleB.client, t, (tx: any) => tx.cycleCountEntry.updateMany({ where: { tenant_id: t, id: E, cycle_count_id: s, cycle_count: { status: "aberta" } }, data: { counted_quantity: 5 } })); rb = { ok: `count=${r.count}` }; }
    } catch (e) { rb = { err: errInfo(e) }; }
    const tbEnd = now(); marks.push(["B: terminou", tbEnd]);
    const ra = await pa;
    return { variante: variant, B: { ...rb, elapsedMs: tbEnd - tb, terminouAntesDoCommitDeA: tbEnd < ra.at }, A: ra, final: await finalState(t, s, E, X), marks };
  }
  async function e4() {
    const t = await newTenant("e4"); const X = await newItem(t, { base: 10 });
    const { s, entryIds: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
    const marks: any[] = [];
    const pa = closePlanFull(t, s, E, X, 1500, marks, false).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
    await sleep(300);
    const tb = now(); marks.push(["B: cancel() codigo atual", tb]);
    let rb: any;
    try { const r = await svcOf(roleB.client).cancel(actor(t), s); rb = { ok: `status=${r.status}` }; } catch (e) { rb = { err: errInfo(e) }; }
    const tbEnd = now(); marks.push(["B: terminou", tbEnd]);
    const ra = await pa;
    return { B: { ...rb, elapsedMs: tbEnd - tb }, A: ra, final: await finalState(t, s, E, X), marks };
  }
  if (want("E3")) { R.E3_codigo_atual = await e3("codigo_atual"); save(); R.E3_filtro_13d = await e3("filtro_relacional_13d"); save(); }
  if (want("E4")) { R.E4_cancel = await e4(); save(); }

  // ---------- FASE D: V6 do plano numa tx UNICA sob o timeout default do Prisma (5 s) ----------
  async function bulk(t: string, n: number) {
    await admin.$executeRawUnsafe(`INSERT INTO inventory_items (tenant_id, sku, name, unit) SELECT $1::uuid, 'SKU-'||g, 'Item '||g, 'un' FROM generate_series(1,$2::int) g`, t, n);
    await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type) SELECT tenant_id, id, 'entrada', 10, 1, 'base' FROM inventory_items WHERE tenant_id=$1::uuid`, t);
    const r: any[] = await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
    await admin.$executeRawUnsafe(`INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) SELECT tenant_id, $2::uuid, id, 10, 7 FROM inventory_items WHERE tenant_id=$1::uuid`, t, r[0].id);
    return r[0].id as string;
  }
  if (want("E5")) {
    const runs: any[] = [];
    for (const n of (process.env.E5_N ?? "250,500,1000").split(",").map(Number)) {
      const t = await newTenant(`e5-${n}`); const s = await bulk(t, n);
      const t0 = Date.now(); let err: any = null; let done = 0;
      try {
        await withTenantRls(roleA.client, t, async (tx: any) => {
          const inv = new invMod.PrismaInventoryRepository(tx);
          await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, s);
          const entries: any[] = await tx.$queryRawUnsafe(`SELECT id, item_id FROM cycle_count_entries WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid ORDER BY item_id ASC`, t, s);
          for (const e of entries) {
            await tx.$queryRawUnsafe(`SELECT * FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, e.item_id);
            const sb = await (inv as any).saldoOfCustody(t, e.item_id, { custodyType: "base" });
            if (wouldOverdraw(sb, -3)) throw new Error("overdraw");
            const m = await (inv as any).insertMovement({ tenantId: t, itemId: e.item_id, type: "ajuste", quantidadeSinalizada: -3, reason: "crit2", cycleCountId: s, custody: { custodyType: "base" } });
            await tx.cycleCountEntry.updateMany({ where: { tenant_id: t, id: e.id, cycle_count_id: s }, data: { variance: -3, adjustment_movement_id: m.id } });
            done++;
          }
          await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "aberta" }, data: { status: "concluida" } });
        });
      } catch (e) { err = errInfo(e); }
      const ms = Date.now() - t0;
      const g: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
      const st: any[] = await admin.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE id=$1::uuid`, s);
      const run: any = { n, forma: "1 tx withTenantRls (opcoes default = timeout 5000 ms), por item: FOR UPDATE + aggregate + INSERT + UPDATE entry", ms, itensAntesDoFim: done, erro: err, ajustesGravados: g[0].n, status: st[0].status };
      if (err && n === 1000) {
        const t1 = Date.now(); let cerr: any = null;
        try { await svcOf(roleA.client).close(actor(t), s); } catch (e) { cerr = errInfo(e); }
        const g2: any[] = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id=$1::uuid AND cycle_count_id=$2::uuid`, t, s);
        const st2: any[] = await admin.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE id=$1::uuid`, s);
        run.controleHeadBase = { forma: "CycleCountService.close REAL (head-base, N+3 tx)", ms: Date.now() - t1, erro: cerr, ajustesGravados: g2[0].n, status: st2[0].status };
      }
      runs.push(run); R.E5 = runs; save();
    }
  }

  // ---------- FASE E: prova positiva do desenho V1 do plano (lock ANTES da leitura) + barreira P11 ----------
  const v1Plan = (client: any) => (t: string, item: string, q: number) => withTenantRls(client, t, async (tx: any) => {
    const inv = new invMod.PrismaInventoryRepository(tx);
    const rows: any[] = await tx.$queryRawUnsafe(`SELECT * FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, item);
    if (!rows[0]) return undefined;
    const sb = await (inv as any).saldoOfCustody(t, item, { custodyType: "base" });
    if (wouldOverdraw(sb, q)) { const e: any = new Error(`insufficient_balance saldo=${sb}`); e.code = "STOCK_INVALID"; e.status = 409; e.reason = "insufficient_balance"; throw e; }
    return (inv as any).insertMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: q, custody: { custodyType: "base" } });
  });
  if (want("V1P")) {
    const iters: any[] = [];
    for (let i = 0; i < 10; i++) {
      const t = await newTenant("v1p"); const item = await newItem(t, { base: 10 });
      const fns = [v1Plan(roleA.client), v1Plan(roleB.client)];
      const t0 = Date.now();
      const st = await race(Array.from({ length: 20 }, (_, k) => () => fns[k % 2](t, item, -1)));
      const ok = st.filter((s) => s.status === "fulfilled").length;
      iters.push({ i, ok, rej: countBy(st.filter((s) => s.status === "rejected").map((s: any) => short(s.reason))), saldo: await saldo(t, item), ms: Date.now() - t0 });
    }
    R.V1_plano = { forma: "10 iter x 20 saidas de 1 com FOR UPDATE do item ANTES do aggregate (emulacao do 3.3-V1), A+B", iters, negativas: iters.filter((x) => x.saldo < 0).length, p2028: iters.filter((x) => Object.keys(x.rej).some((k) => k.startsWith("P2028"))).length }; save();
  }
  if (want("P11")) {
    async function p11(bKind: "head" | "plano") {
      const t = await newTenant(`p11-${bKind}`); const item = await newItem(t, { base: 10 });
      const marks: any[] = []; let release!: () => void; const released = new Promise<void>((r) => (release = r));
      const pa = withTenantRls(roleA.client, t, async (tx: any) => {
        await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id=$1::uuid AND id=$2::uuid FOR UPDATE`, t, item);
        await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type) VALUES ($1::uuid,$2::uuid,'saida',-10,'base')`, t, item);
        marks.push(["A: FOR UPDATE + INSERT -10 sem commit", now()]);
        await released; marks.push(["A: commit", now()]);
      });
      await sleep(200);
      const pb = (bKind === "head" ? invOf(roleB.client).createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1, custody: { custodyType: "base" } }) : v1Plan(roleB.client)(t, item, -1))
        .then((v: any) => ({ ok: v ? "gravou" : "undef", at: now() }), (e: any) => ({ err: short(e), at: now() }));
      const blocked = await waitBlocked("crit2-B");
      marks.push([`B bloqueado em: ${blocked.queries.join(" || ") || "(nada)"}`, now()]);
      release();
      const [ra, rb] = await Promise.all([pa, pb]);
      return { B: bKind === "head" ? "createMovement REAL (head-base)" : "V1 do plano (lock antes da leitura)", bloqueioDeB: blocked, resultadoB: rb, saldoFinal: await saldo(t, item), marks };
    }
    R.P11_headbase = await p11("head"); save();
    R.P11_plano = await p11("plano"); save();
  }
} finally {
  R.fimMs = now(); save();
  await roleA.drop().catch((e: any) => { R.dropA = errInfo(e); });
  await roleB.drop().catch((e: any) => { R.dropB = errInfo(e); });
  save();
  await admin.$disconnect();
}
