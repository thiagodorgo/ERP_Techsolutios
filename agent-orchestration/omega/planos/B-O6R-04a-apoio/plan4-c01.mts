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
