import assert from "node:assert/strict";
import test from "node:test";

import { traccarIngestResponse } from "../src/integrations/traccar/traccar-ingest.app.js";
import {
  createPrismaDiscoveryPorts,
  TraccarTenantResolver,
  type TraccarConfirmResult,
} from "../src/integrations/traccar/traccar-resolution.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · custo da resolução do dispositivo (plano v2.1 §4.3; B-03, A2-06; MUT-06–MUT-09, MUT-36).
// A prova é por CONTAGEM de sondagens, determinística, com relógio injetado. As portas de descoberta são as REAIS
// (`createPrismaDiscoveryPorts` → `findFirstTenantRls`, com o canário), sobre um client FALSO que guarda o GUC da
// volta e conta: `listagens` (contar/listar organizações ativas), `sondagens` (a consulta do vínculo em cada volta da
// descoberta) e `confirmações` (a fase 2, que aqui é falsa e também é uma sondagem).
// -----------------------------------------------------------------------------------------------

const INSTANCE = "erp-dev";
const MINUTE = 60_000;

type Row = { id: string; tenantId: string; vehicleId: string; validFrom: Date };

class FakeTraccarDb {
  listings = 0;
  scanProbes = 0;
  confirms = 0;
  private guc = "";
  readonly bound = new Map<string, string>(); // dispositivo → organização
  leak: { readonly whenTenant: string; readonly rowTenant: string } | undefined;

  constructor(readonly tenants: string[]) {}

  readonly tx = {
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join("?").includes("set_config")) this.guc = String(values[0]);
      return 1;
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> => {
      const sql = strings.join("?");
      assert.match(sql, /vehicle_tracking_bindings/);
      this.scanProbes += 1;
      if (this.leak && this.leak.whenTenant === this.guc) {
        return [{ id: "x", tenantId: this.leak.rowTenant, vehicleId: "v", validFrom: new Date(0) }];
      }
      const device = String(values[1]);
      return this.bound.get(device) === this.guc
        ? [{ id: `b-${device}`, tenantId: this.guc, vehicleId: `v-${device}`, validFrom: new Date(0) }]
        : [];
    },
  };

  readonly client = {
    tenant: {
      count: async () => {
        this.listings += 1;
        return this.tenants.length;
      },
      findMany: async () => {
        this.listings += 1;
        return this.tenants.map((id) => ({ id }));
      },
    },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(this.tx),
  };

  confirm = async (tenantId: string, device: string): Promise<TraccarConfirmResult<string>> => {
    this.confirms += 1;
    return this.bound.get(device) === tenantId ? { kind: "confirmed", value: tenantId } : { kind: "not_bound" };
  };

  resetCounters(): void {
    this.listings = 0;
    this.scanProbes = 0;
    this.confirms = 0;
  }
}

function tenants(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `org-${String(index + 1).padStart(4, "0")}`);
}

function setup(options: { tenants: number; maxTenants?: number; cacheMax?: number; hintTtlMs?: number; negativeTtlMs?: number }) {
  const db = new FakeTraccarDb(tenants(options.tenants));
  let now = 1_000_000;
  const warnings: Array<Record<string, unknown>> = [];
  const resolver = new TraccarTenantResolver(
    createPrismaDiscoveryPorts(db.client as never, { maxWait: 250, timeout: 1_000 }),
    {
      maxTenants: options.maxTenants ?? 500,
      hintTtlMs: options.hintTtlMs ?? 10 * MINUTE,
      negativeTtlMs: options.negativeTtlMs ?? MINUTE,
      cacheMax: options.cacheMax ?? 10_000,
      now: () => now,
      logger: { info: () => undefined, warn: (fields) => warnings.push(fields) },
    },
  );
  const resolve = (device: string) =>
    resolver.resolve({ instanceKey: INSTANCE, externalDeviceKey: device }, (tenantId) => db.confirm(tenantId, device), now + 3_000);
  return { db, resolver, resolve, warnings, advance: (ms: number) => (now += ms) };
}

test("resolução: dica confirmada custa 1 sondagem (a confirmação) e 0 listagem", { timeout: 30_000 }, async () => {
  const { db, resolve } = setup({ tenants: 50 });
  db.bound.set("trcdemo01", "org-0030");
  const first = await resolve("trcdemo01");
  assert.equal(first.kind, "confirmed");
  db.resetCounters();
  const second = await resolve("trcdemo01");
  assert.deepEqual(second.kind === "confirmed" ? [second.tenantId, second.via] : [], ["org-0030", "hint"]);
  assert.deepEqual([db.listings, db.scanProbes, db.confirms], [0, 0, 1]);
});

test("resolução: sem dica, a varredura para no primeiro achado (k sondagens)", { timeout: 30_000 }, async () => {
  const { db, resolve } = setup({ tenants: 10 });
  db.bound.set("trcdemo01", "org-0003");
  const outcome = await resolve("trcdemo01");
  assert.deepEqual(outcome.kind === "confirmed" ? [outcome.tenantId, outcome.via] : [], ["org-0003", "discovery"]);
  assert.equal(db.scanProbes, 3, "parar na 3ª organização, não varrer as 10");
  assert.equal(db.confirms, 1);
});

test("resolução: sem vínculo, T sondagens; no prazo do cache negativo, 0; depois dele, T de novo", { timeout: 30_000 }, async () => {
  const { db, resolve, advance } = setup({ tenants: 12 });
  assert.equal((await resolve("desconhecido")).kind, "unmapped");
  assert.equal(db.scanProbes, 12);
  db.resetCounters();
  assert.equal((await resolve("desconhecido")).kind, "unmapped");
  assert.deepEqual([db.listings, db.scanProbes, db.confirms], [0, 0, 0], "cache negativo: nem lista nem varre");
  advance(MINUTE + 1);
  db.resetCounters();
  assert.equal((await resolve("desconhecido")).kind, "unmapped");
  assert.equal(db.scanProbes, 12, "vencido o cache negativo, a descoberta volta a rodar");
});

test("resolução: com mais de 500 organizações ativas, 0 sondagens e `resolution_budget_exceeded`", { timeout: 30_000 }, async () => {
  const { db, resolve } = setup({ tenants: 501 });
  db.bound.set("trcdemo01", "org-0001");
  const outcome = await resolve("trcdemo01");
  assert.equal(outcome.kind, "budget_exceeded");
  assert.deepEqual([db.scanProbes, db.confirms], [0, 0], "acima do teto, nem uma sondagem, nunca uma organização adivinhada");
});

test("resolução: dica envenenada cai e a descoberta acha a organização certa", { timeout: 30_000 }, async () => {
  const { db, resolve, resolver } = setup({ tenants: 8 });
  db.bound.set("trcdemo01", "org-0002");
  assert.equal((await resolve("trcdemo01")).kind, "confirmed");
  db.bound.set("trcdemo01", "org-0006"); // o vínculo mudou de organização: a dica (org-0002) ficou envenenada
  db.resetCounters();
  const outcome = await resolve("trcdemo01");
  assert.deepEqual(outcome.kind === "confirmed" ? [outcome.tenantId, outcome.via] : [], ["org-0006", "discovery"]);
  assert.equal(db.confirms, 2, "a dica foi CONFIRMADA (e recusada) antes de valer");
  assert.equal(db.scanProbes, 6);
  assert.equal(resolver.cacheSizes().hints, 1);
});

test("resolução: linha de outra organização numa volta dá TenantRowsLeakError → 503", { timeout: 30_000 }, async () => {
  const { db, resolve } = setup({ tenants: 5 });
  db.bound.set("trcdemo01", "org-0004");
  db.leak = { whenTenant: "org-0002", rowTenant: "org-0004" };
  const outcome = await resolve("trcdemo01");
  assert.deepEqual(outcome, { kind: "unavailable", reason: "rows_from_another_tenant" });
  assert.equal(traccarIngestResponse(outcome).status, 503);
  assert.equal(db.confirms, 0, "o canário derruba a descoberta antes de qualquer confirmação");
});

test("resolução: os caches respeitam o teto de entradas", { timeout: 30_000 }, async () => {
  const { db, resolve, resolver } = setup({ tenants: 4, cacheMax: 3 });
  for (let index = 1; index <= 5; index++) db.bound.set(`bound${index}`, "org-0001");
  for (let index = 1; index <= 5; index++) {
    await resolve(`bound${index}`);
    await resolve(`unbound${index}`);
  }
  const sizes = resolver.cacheSizes();
  assert.ok(sizes.hints <= 3, `dicas: ${sizes.hints}`);
  assert.ok(sizes.negatives <= 3, `negativos: ${sizes.negatives}`);
  assert.ok(sizes.hints >= 1 && sizes.negatives >= 1);
});

test("resolução: a confirmação renova a dica (validade deslizante, A2-06)", { timeout: 30_000 }, async () => {
  const renewed = setup({ tenants: 20 });
  renewed.db.bound.set("trcdemo01", "org-0015");
  await renewed.resolve("trcdemo01"); // t = 0: descoberta, dica até t = 10 min
  renewed.advance(9 * MINUTE);
  await renewed.resolve("trcdemo01"); // t = 9 min: dica confirmada e RENOVADA até t = 19 min
  renewed.advance(MINUTE + 1_000);
  renewed.db.resetCounters();
  const outcome = await renewed.resolve("trcdemo01"); // t = 10 min + 1 s
  assert.deepEqual(outcome.kind === "confirmed" ? outcome.via : undefined, "hint");
  assert.deepEqual([renewed.db.listings, renewed.db.scanProbes, renewed.db.confirms], [0, 0, 1], "ainda 1 sondagem");

  const control = setup({ tenants: 20 });
  control.db.bound.set("trcdemo01", "org-0015");
  await control.resolve("trcdemo01");
  control.advance(10 * MINUTE + 1_000);
  control.db.resetCounters();
  const expired = await control.resolve("trcdemo01");
  assert.deepEqual(expired.kind === "confirmed" ? expired.via : undefined, "discovery", "sem renovação, a dica vence aos 10 min");
});

test("resolução: com 400 de 500 organizações ativas sai o aviso de 80 %", { timeout: 30_000 }, async () => {
  const at80 = setup({ tenants: 400, maxTenants: 500 });
  await at80.resolve("qualquer");
  assert.ok(
    at80.warnings.some((fields) => fields.activeTenants === 400 && fields.maxTenants === 500),
    "aviso de capacidade com o número de organizações contra o teto",
  );
  const below = setup({ tenants: 399, maxTenants: 500 });
  await below.resolve("qualquer");
  assert.equal(below.warnings.length, 0, "abaixo de 80 % não há aviso");
});
