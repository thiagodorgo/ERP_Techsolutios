// C2 da junta J484 (jurado-j484-c2-opus) — sonda própria da rota HTTP real /summary.
// Fica FORA do worktree; importa o app do worktree por caminho absoluto (WT, default C:/Users/thiag/w-j484-c2).
// Saída: uma linha "C2PROBE <json>" por caso, mais asserções do contrato pedido no mandato.
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const WT = (process.env.C2_WT ?? "C:/Users/thiag/w-j484-c2").replace(/\\/g, "/");
const src = (p: string) => `file:///${WT}/src/${p}`;

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");

type Res = { status: number; body: any };

async function withApi(cb: (baseUrl: string) => Promise<void>) {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, alloc, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import(src("app.ts")),
      import(src("modules/cloud-cost-allocation/index.ts")),
      import(src("modules/core-saas/services/core-saas.service.ts")),
      import(src("modules/core-saas/services/memory-core-saas.adapter.ts")),
      import(src("modules/core-saas/store/core-saas.store.ts")),
    ]);
  alloc.resetCloudCostAllocationRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tA = core.createTenant({ name: "C2 A" });
  const tB = core.createTenant({ name: "C2 B" });
  const repo = alloc.getMemoryCloudCostAllocationRepositoryForTests();
  const line = (id: string, o: Record<string, unknown>) => ({
    id, importId: "import-1", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd,
    serviceCode: "AmazonEC2", usageType: "BoxUsage", unblendedCost: 1, currency: "USD", rawLineHash: id,
    metadata: {}, createdAt: periodStart, ...o,
  });
  const usage = (tenantId: string) => ({
    id: `${tenantId}-s`, tenantId, sourceType: "test", metricKey: "storage_bytes_current", quantity: 1, unit: "count",
    occurredAt: new Date("2026-06-15T12:00:00.000Z"), metadata: {}, createdAt: periodStart,
  });
  repo.seed({
    tenants: [
      { id: tA.id, name: tA.name, slug: tA.slug },
      { id: tB.id, name: tB.name, slug: tB.slug },
    ],
    imports: [{ id: "import-1", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd,
      importedAt: periodEnd, rowCount: 2, totalUnblendedCost: 15, currency: "USD", metadata: {}, createdAt: periodStart,
      updatedAt: periodEnd }],
    costLineItems: [
      line("cost-direct", { tenantTag: tA.id, unblendedCost: 5 }),
      line("cost-s3", { serviceCode: "AmazonS3", usageType: "TimedStorage-ByteHrs", unblendedCost: 10 }),
    ],
    usageEvents: [usage(tA.id), usage(tB.id)],
  });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try { await cb(baseUrl); } finally {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    alloc.resetCloudCostAllocationRuntimeForTests();
  }
}

const H = { "content-type": "application/json", "x-user-id": "usr_platform", "x-role": "super_admin" };
async function req(baseUrl: string, path: string, method = "GET", body?: unknown): Promise<Res> {
  const r = await fetch(`${baseUrl}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
}
const S = "/api/v1/platform/cloud-cost-allocations/summary";
const brief = (r: Res) => ({
  status: r.status,
  reason: r.body?.error?.reason,
  code: r.body?.error?.code,
  total: r.body?.data?.totalImportedCost,
  coverage: r.body?.data?.coverage,
  periodStart: r.body?.data?.periodStart,
  periodEnd: r.body?.data?.periodEnd,
});

test("C2 · /summary pela rota HTTP real", async () => {
  await withApi(async (baseUrl) => {
    const created = await req(baseUrl, "/api/v1/platform/cloud-cost-allocations/runs", "POST", {
      periodStart: "2026-06-01", periodEnd: "2026-06-30", strategy: "direct_tag_then_usage_weighted_v1",
    });
    assert.equal(created.status, 201);
    console.log("C2PROBE", JSON.stringify({ case: "run", runStart: created.body.data.periodStart, runEnd: created.body.data.periodEnd, total: created.body.data.totalImportedCost }));

    const out: Record<string, ReturnType<typeof brief>> = {};
    const q = async (name: string, query: string) => {
      const r = await req(baseUrl, `${S}${query ? "?" + query : ""}`);
      out[name] = brief(r);
      console.log("C2PROBE", JSON.stringify({ case: name, query, ...out[name] }));
      return out[name];
    };

    // contrato do mandato
    assert.equal((await q("sem-query", "")).total, 15);
    assert.deepEqual([(await q("duas-pontas", "periodStart=2026-06-01&periodEnd=2026-06-30")).status, out["duas-pontas"].total], [200, 15]);
    for (const [n, qs] of [["so-start", "periodStart=2026-06-01"], ["so-end", "periodEnd=2026-06-30"]] as const) {
      const r = await q(n, qs);
      assert.deepEqual([r.status, r.code, r.reason], [400, "CLOUD_COST_ALLOCATION_INVALID_PERIOD", "summary_period_incomplete"], n);
    }
    const invalid: Array<[string, string]> = [];
    for (const side of ["periodStart", "periodEnd"] as const) {
      const other = side === "periodStart" ? "periodEnd=2026-06-30" : "periodStart=2026-06-01";
      for (const [n, v] of [["vazio", ""], ["texto", "nao-e-data"], ["31-02", "2026-02-31"], ["13-01", "2026-13-01"], ["00-10", "2026-00-10"]]) {
        invalid.push([`${side}-${n}`, `${side}=${v}&${other}`]);
      }
      invalid.push([`${side}-array`, `${side}=2026-06-01&${side}=2026-07-01&${other}`]);
      invalid.push([`${side}-sozinho-vazio`, `${side}=`]);
    }
    for (const [n, qs] of invalid) {
      const r = await q(n, qs);
      assert.deepEqual([r.status, r.code, r.reason], [400, "CLOUD_COST_ALLOCATION_INVALID_PERIOD", "summary_period_invalid"], n);
    }
    const leap = await q("bissexto-2028-02-29", "periodStart=2028-02-29&periodEnd=2028-02-29");
    assert.equal(leap.status, 200);

    // formas NOVAS — só medição; o juízo vai na evidência
    const novas: Array<[string, string]> = [
      ["iso-fuso+05-cruza-dia", "periodStart=2026-06-01T00:30:00%2B05:00&periodEnd=2026-06-30"],
      ["iso-fuso+0500-ambos", "periodStart=2026-06-02T00:00:00.000%2B0500&periodEnd=2026-07-01T00:00:00.000%2B0500"],
      ["iso-fuso+23:59-texto-jun02-jul01", "periodStart=2026-06-02T00:00:00%2B23:59&periodEnd=2026-07-01T00:00:00%2B23:59"],
      ["iso-fuso-23:59-texto-mai31-jun29", "periodStart=2026-05-31T00:00:00-23:59&periodEnd=2026-06-29T00:00:00-23:59"],
      ["hora-24-texto-mai31-jun29", "periodStart=2026-05-31T24:00:00Z&periodEnd=2026-06-29T24:00:00Z"],
      ["hora-24-so-fim", "periodStart=2026-06-01&periodEnd=2026-06-29T24:00:00Z"],
      ["hora-local-sem-fuso", "periodStart=2026-05-31T22:00&periodEnd=2026-06-29T22:00"],
      ["iso-Z-completo", "periodStart=2026-06-01T00:00:00.000Z&periodEnd=2026-06-30T23:59:59.999Z"],
      ["sem-zero-2026-6-1", "periodStart=2026-6-1&periodEnd=2026-6-30"],
      ["espaco-antes", "periodStart=%202026-06-01&periodEnd=2026-06-30"],
      ["espaco-depois", "periodStart=2026-06-01%20&periodEnd=2026-06-30"],
      ["mais-cru-vira-espaco", "periodStart=2026-06-01T00:00:00+05:00&periodEnd=2026-06-30"],
      ["epoca-ms", "periodStart=1780272000000&periodEnd=1782777600000"],
      ["ano-estendido", "periodStart=%2B002026-06-01&periodEnd=2026-06-30"],
      ["hora-25", "periodStart=2026-06-01T25:00:00Z&periodEnd=2026-06-30"],
      ["T-vazio", "periodStart=2026-06-01T&periodEnd=2026-06-30"],
      ["vazio-mais-valido-array", "periodStart=&periodStart=2026-06-01&periodEnd=2026-06-30"],
      ["chave-maiuscula-ignorada", "PeriodStart=2026-10-01"],
      ["start-bracket", "periodStart[]=2026-06-01&periodEnd=2026-06-30"],
      ["start-objeto", "periodStart[a]=2026-06-01&periodEnd=2026-06-30"],
      ["ambos-bracket", "periodStart[]=2026-10-01&periodEnd[]=2026-10-31"],
    ];
    for (const [n, qs] of novas) await q(n, qs);
  });
});
