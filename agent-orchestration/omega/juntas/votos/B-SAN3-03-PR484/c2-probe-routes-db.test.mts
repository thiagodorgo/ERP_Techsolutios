// C2 da junta J484 — a mesma rota HTTP /summary, agora com CORE_SAAS_PERSISTENCE=prisma no Postgres descartável
// da cadeira (j484-c2-pg, 127.0.0.1:55482). Janela própria: julho de 2031.
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const WT = (process.env.C2_WT ?? "C:/Users/thiag/w-j484-c2").replace(/\\/g, "/");
const src = (p: string) => `file:///${WT}/src/${p}`;
const S = "/api/v1/platform/cloud-cost-allocations/summary";
const H = { "content-type": "application/json", "x-user-id": "usr_platform", "x-role": "super_admin" };

test("C2-db · /summary pela rota HTTP real sobre o repositório Prisma", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL obrigatório");
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  const [{ createApp }, alloc, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import(src("app.ts")),
      import(src("modules/cloud-cost-allocation/index.ts")),
      import(src("modules/core-saas/services/core-saas.service.ts")),
      import(src("modules/core-saas/services/memory-core-saas.adapter.ts")),
      import(src("modules/core-saas/store/core-saas.store.ts")),
    ]);
  alloc.resetCloudCostAllocationRuntimeForTests();
  const service = await alloc.createDefaultCloudCostAllocationService();
  const repository = (service as unknown as { repository: any }).repository;
  console.log("C2PROBE-DB", JSON.stringify({ case: "repo", ctor: repository?.constructor?.name }));
  assert.equal(repository?.constructor?.name, "PrismaCloudCostAllocationRepository");

  const ps = new Date("2031-07-01T00:00:00.000Z");
  const pe = new Date("2031-07-31T00:00:00.000Z");
  const run = await repository.createRun({ periodStart: ps, periodEnd: pe, metadata: {} });
  await repository.updateRun(run.id, {
    status: "completed", totalImportedCost: 77, totalAllocatedCost: 0, totalUnallocatedCost: 77, currency: "USD",
    completedAt: pe, metadata: {},
  });

  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server: Server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const q = async (name: string, query: string) => {
    const r = await fetch(`${baseUrl}${S}${query ? "?" + query : ""}`, { headers: H });
    const body: any = await r.json();
    const b = { status: r.status, reason: body?.error?.reason, total: body?.data?.totalImportedCost, runId: body?.data?.runId === run.id ? "a-desta-sonda" : body?.data?.runId, periodStart: body?.data?.periodStart, periodEnd: body?.data?.periodEnd };
    console.log("C2PROBE-DB", JSON.stringify({ case: name, query, ...b }));
    return b;
  };
  try {
    const both = await q("duas-pontas", "periodStart=2031-07-01&periodEnd=2031-07-31");
    assert.deepEqual([both.status, both.total, both.runId], [200, 77, "a-desta-sonda"]);
    assert.equal((await q("sem-query", "")).status, 200);
    for (const [n, qs] of [["so-start", "periodStart=2031-07-01"], ["so-end", "periodEnd=2031-07-31"]]) {
      const r = await q(n, qs);
      assert.deepEqual([r.status, r.reason], [400, "summary_period_incomplete"], n);
    }
    for (const [n, qs] of [
      ["vazio", "periodStart=&periodEnd=2031-07-31"],
      ["texto", "periodStart=nao-e-data&periodEnd=2031-07-31"],
      ["array", "periodStart=2031-07-01&periodStart=2031-08-01&periodEnd=2031-07-31"],
      ["31-02", "periodStart=2031-02-31&periodEnd=2031-07-31"],
      ["13-01", "periodStart=2031-13-01&periodEnd=2031-07-31"],
      ["00-10", "periodStart=2031-00-10&periodEnd=2031-07-31"],
    ]) {
      const r = await q(n, qs);
      assert.deepEqual([r.status, r.reason], [400, "summary_period_invalid"], n);
    }
    assert.equal((await q("bissexto", "periodStart=2028-02-29&periodEnd=2028-02-29")).status, 200);
    // formas novas, só medição
    await q("fuso+23:59-texto-jul02-ago01", "periodStart=2031-07-02T00:00:00%2B23:59&periodEnd=2031-08-01T00:00:00%2B23:59");
    await q("hora-24-texto-jun30-jul30", "periodStart=2031-06-30T24:00:00Z&periodEnd=2031-07-30T24:00:00Z");
    await q("hora-local-sem-fuso", "periodStart=2031-06-30T22:00&periodEnd=2031-07-30T22:00");
  } finally {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    const client = (repository as { client: any }).client;
    await client.cloudCostAllocationRun.delete({ where: { id: run.id } }).catch(() => undefined);
    await client.$disconnect?.();
    alloc.resetCloudCostAllocationRuntimeForTests();
  }
});
