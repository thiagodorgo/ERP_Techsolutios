import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import { env } from "../src/config/env.js";
import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import { parseAwsCurCsv } from "../src/modules/cloud-costs/aws-cur.parser.js";
import { InMemoryCloudCostRepository } from "../src/modules/cloud-costs/aws-cur.repository.js";
import {
  CLOUD_COST_AUTO_ALLOCATION_MARKER,
  CloudCostService,
  cloudCostImportLogger,
  createDefaultCloudCostService,
  resetCloudCostRuntimeForTests,
} from "../src/modules/cloud-costs/aws-cur.service.js";
import {
  allocateCloudCosts,
  AUTO_ALLOCATION_MARKER,
  buildCloudCostImportHook,
  CloudCostAllocationService,
  createCloudCostAllocationRunJobHandler,
  enqueueInitialCloudAllocationImportCatchUp,
  IMPORT_CATCH_UP_FIRST_DELAY_MS,
  IMPORT_CATCH_UP_INTERVAL_MS,
  runImportCatchUp,
  type CloudCostAllocationEnqueue,
  ensureImportRuns,
  getMemoryCloudCostAllocationRepositoryForTests,
  importRunId,
  InMemoryCloudCostAllocationRepository,
  MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT,
  resetCloudCostAllocationRuntimeForTests,
  uuidV5,
  type CloudCostAllocationAutoJobPayload,
  type CloudCostAllocationRun,
  type CloudCostAllocationTenant,
  type ImportTriggerLogger,
} from "../src/modules/cloud-cost-allocation/index.js";

// -----------------------------------------------------------------------------------------------
// B-ASS-09a — rateio automático a partir da importação (item 61 do portão). Suíte em memória.
//
// Plano: `plano-B-ASS-09a-v2.md` com a Emenda 1 (fora do repositório, em `erp-pausa-2026-10-03/planos/`).
// Cada caso nomeia a propriedade (P1…P8) e a mutação literal do §3 que ele mata.
//
// F0 — os dois primeiros casos (T4m e T4m-b) só usam APIs que já existiam antes do bloco
// (`allocateCostsForPeriod`, `createAllocationRun`). Foram executados VERMELHOS por asserção na base
// `a0979f51`, antes de qualquer código de produção (saída no diário `docs/revisoes/ASSINATURA/B-ASS-09a-dev.md`).
// -----------------------------------------------------------------------------------------------

const tenants: CloudCostAllocationTenant[] = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
];

const NOV_START = new Date("2026-11-01T00:00:00.000Z");
const NOV_END = new Date("2026-11-30T23:59:59.999Z");

test("T4m · P3m (R4) — o manual de novembro, no fim exclusivo da AWS, não soma a linha de outubro (30, não 130)", async () => {
  // MUTAÇÃO QUE MATA: M4d (`line.billingPeriodEnd > periodStart && // B-ASS-09a R4 listCostLineItems` → `>=`).
  const importId = "09a00000-0000-4000-8000-000000000001";
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: [completedImport(importId, "2026-12-02T00:00:00.000Z")],
    costLineItems: linesFromFixture("aws-cur-two-months-exclusive.csv", importId, "t4m"),
  });
  const service = new CloudCostAllocationService(repository);

  const run = await service.allocateCostsForPeriod({ periodStart: NOV_START, periodEnd: NOV_END, importId });

  assert.equal(run.status, "completed", run.errorMessage);
  assert.equal(run.totalImportedCost, 30);
});

test("T4m-b · P3m (R4) — sem importId, o manual de novembro não escolhe a importação só de outubro (fim exclusivo)", async () => {
  // MUTAÇÃO QUE MATA: M4e (`line.billingPeriodEnd > periodStart && // B-ASS-09a R4 findBillableImport` → `>=`).
  // X = importação SÓ de outubro (fim exclusivo 11-01T00:00), mais NOVA; Y = importação de novembro, mais VELHA.
  const onlyOctober = "09a00000-0000-4000-8000-000000000002";
  const november = "09a00000-0000-4000-8000-000000000003";
  const exclusive = linesFromFixture("aws-cur-two-months-exclusive.csv", "x", "t4mb");
  const octoberLines = exclusive
    .filter((line) => line.billingPeriodStart.toISOString().startsWith("2026-10"))
    .map((line) => ({ ...line, importId: onlyOctober }));
  const novemberLines = exclusive
    .filter((line) => line.billingPeriodStart.toISOString().startsWith("2026-11"))
    .map((line) => ({ ...line, importId: november }));
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: [completedImport(november, "2026-12-02T00:00:00.000Z"), completedImport(onlyOctober, "2026-12-05T00:00:00.000Z")],
    costLineItems: [...octoberLines, ...novemberLines],
  });
  const service = new CloudCostAllocationService(repository);

  const run = await service.createAllocationRun({ periodStart: NOV_START, periodEnd: NOV_END });

  assert.equal(run.metadata.importId, november, "a importação escolhida é a de novembro (Y), não a só de outubro (X)");
  assert.equal(run.metadata.importResolution, "latest_completed");
});

// -----------------------------------------------------------------------------------------------
// F1 — run determinística por importação e par de período (P1, P2, P3, P7)
// -----------------------------------------------------------------------------------------------

test("T2b · P2 — o UUIDv5 bate o vetor da RFC 4122 e o id da run automática tem versão 5 e variante RFC", () => {
  // MUTAÇÃO QUE MATA: M2b (`(bytes[6] & 0x0f) | 0x50` → `(bytes[6] & 0x0f) | 0x40`).
  assert.equal(uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "www.example.com"), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
  const id = importRunId(
    "09a00000-0000-4000-8000-0000000000aa",
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-11-01T00:00:00.000Z"),
  );
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(
    id,
    importRunId("09a00000-0000-4000-8000-0000000000aa", new Date("2026-10-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z")),
    "o mesmo par bruto dá o mesmo id",
  );
  assert.notEqual(
    id,
    importRunId("09a00000-0000-4000-8000-0000000000aa", new Date("2026-10-01T00:00:00Z"), new Date("2026-10-31T23:59:59.999Z")),
    "fim diferente é par diferente",
  );
});

test("T2 · P2 — ensureImportRuns 3 vezes dá 1 run por par, com o id v5, e o número de alocações não muda", async () => {
  // MUTAÇÃO QUE MATA: M2 (`return uuidV5(IMPORT_RUN_NAMESPACE, name);` → `return randomUUID();`).
  const importId = "09a00000-0000-4000-8000-000000000010";
  const { repository, service } = seeded([completedImport(importId, "2026-12-02T00:00:00.000Z")], {
    [importId]: "aws-cur-two-months-exclusive.csv",
  });

  const first = await ensureImportRuns(service, importId);
  const second = await ensureImportRuns(service, importId);
  const third = await ensureImportRuns(service, importId);
  assert.deepEqual([first.created, second.created, third.created], [2, 0, 0]);
  assert.deepEqual([first.pendingCount, second.pendingCount, third.pendingCount], [2, 2, 2]);

  const runs = await autoRuns(repository, importId);
  assert.deepEqual(
    runs.map((run) => run.id).sort(),
    [
      importRunId(importId, new Date("2026-10-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z")),
      importRunId(importId, new Date("2026-11-01T00:00:00Z"), new Date("2026-12-01T00:00:00Z")),
    ].sort(),
  );

  for (const run of runs) await service.executeAllocationRun(run.id);
  const allocationsBefore = await countAllocations(service, runs);
  await ensureImportRuns(service, importId);
  assert.equal((await autoRuns(repository, importId)).length, 2, "a 4ª passada não cria run");
  assert.equal(await countAllocations(service, runs), allocationsBefore, "nem mexe nas alocações");
});

test("T4 · P3 (R1) — cada linha entra em UMA run automática: fim exclusivo, pares sobrepostos e fim inclusivo", async () => {
  // MUTAÇÕES QUE MATAM: M4a (serviço volta a `listCostLineItems` pela janela) e M4b (a igualdade do par vira sobreposição).
  const exclusive = "09a00000-0000-4000-8000-000000000020";
  const overlapping = "09a00000-0000-4000-8000-000000000021";
  const inclusive = "09a00000-0000-4000-8000-000000000022";
  const { repository, service } = seeded(
    [
      completedImport(exclusive, "2026-12-02T00:00:00.000Z"),
      completedImport(overlapping, "2026-12-03T00:00:00.000Z"),
      completedImport(inclusive, "2026-07-02T00:00:00.000Z"),
    ],
    {
      [exclusive]: "aws-cur-two-months-exclusive.csv",
      [overlapping]: "aws-cur-overlapping-pairs.csv",
      [inclusive]: "aws-cur-sample.csv",
    },
  );

  const totals = async (importId: string) => {
    await ensureImportRuns(service, importId);
    const runs = await autoRuns(repository, importId);
    const executed: CloudCostAllocationRun[] = [];
    for (const run of runs) executed.push(await service.executeAllocationRun(run.id));
    return executed
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((run) => [run.periodStart.toISOString().slice(0, 10), run.periodEnd.toISOString(), run.totalImportedCost] as const);
  };

  const exclusiveTotals = await totals(exclusive);
  assert.deepEqual(exclusiveTotals, [
    ["2026-10-01", "2026-10-31T23:59:59.999Z", 100],
    ["2026-11-01", "2026-11-30T23:59:59.999Z", 30],
  ]);
  assert.equal(sumOf(exclusiveTotals), 130, "Σ das runs = total da importação (era 230 com a sobreposição)");

  const overlappingTotals = await totals(overlapping);
  assert.deepEqual(
    overlappingTotals.map(([start, , total]) => [start, total]),
    [
      ["2026-10-01", 40],
      ["2026-10-15", 7],
    ],
  );
  assert.equal(sumOf(overlappingTotals), 47);

  const inclusiveTotals = await totals(inclusive);
  const sampleTotal = linesFromFixture("aws-cur-sample.csv", inclusive, "x").reduce((total, line) => total + line.unblendedCost, 0);
  assert.equal(inclusiveTotals.length, 1);
  assert.equal(inclusiveTotals[0]![1], "2026-06-30T23:59:59.000Z", "fim inclusivo fica como está");
  assert.equal(sumOf(inclusiveTotals), Number(sampleTotal.toFixed(6)));

  // Repetir não muda nada.
  assert.deepEqual(await totals(exclusive), exclusiveTotals);
  assert.deepEqual(await totals(overlapping), overlappingTotals);
});

test("T5 · P1 — importação que não está concluída, ou sem linha, não ganha run automática", async () => {
  // MUTAÇÃO QUE MATA: M5a (`if (costImport.status !== "completed" || costImport.rowCount === 0) return NOT_ELIGIBLE;` → `if (false) …`).
  const failed = "09a00000-0000-4000-8000-000000000030";
  const empty = "09a00000-0000-4000-8000-000000000031";
  const { repository, service } = seeded(
    [
      { ...completedImport(failed, "2026-12-02T00:00:00.000Z"), status: "failed" },
      { ...completedImport(empty, "2026-12-02T00:00:00.000Z"), rowCount: 0 },
    ],
    { [failed]: "aws-cur-two-months-exclusive.csv" },
  );

  assert.deepEqual(await ensureImportRuns(service, failed), { outcome: "not_eligible", created: 0, pendingCount: 0 });
  assert.deepEqual(await ensureImportRuns(service, empty), { outcome: "not_eligible", created: 0, pendingCount: 0 });
  assert.deepEqual(
    await ensureImportRuns(service, "09a00000-0000-4000-8000-0000000000ff"),
    { outcome: "not_eligible", created: 0, pendingCount: 0 },
    "importação inexistente",
  );
  assert.equal((await repository.listRuns()).length, 0);
});

test("T5-cap · R11 — 25 pares de período: nenhuma run e 1 aviso; 24 pares: 24 runs", async () => {
  // MUTAÇÃO QUE MATA: M11 (`MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT = 24` → `= 1000`).
  const tooMany = "09a00000-0000-4000-8000-000000000040";
  const atCap = "09a00000-0000-4000-8000-000000000041";
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: [completedImport(tooMany, "2026-12-02T00:00:00.000Z"), completedImport(atCap, "2026-12-02T00:00:00.000Z")],
    costLineItems: [...monthlyLines(tooMany, 25), ...monthlyLines(atCap, 24)],
  });
  const service = new CloudCostAllocationService(repository);
  const { logger, warns } = spyLogger();

  assert.deepEqual(await ensureImportRuns(service, tooMany, { logger }), { outcome: "too_many_periods", created: 0, pendingCount: 0 });
  assert.equal((await repository.listRunsByImport(tooMany)).length, 0);
  assert.deepEqual(
    warns.map(([payload, message]) => [message, payload.periods, payload.cap]),
    [["cloud_cost_auto_allocation_skipped_too_many_periods", 25, MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT]],
  );

  const result = await ensureImportRuns(service, atCap, { logger });
  assert.equal(result.created, 24);
  assert.equal((await repository.listRunsByImport(atCap)).length, 24);
  assert.equal(warns.length, 1, "no teto, sem aviso");
});

test("T9c · P7 — importação marcada com run manual dela no mesmo dia UTC: o automático não cria run e o resumo segue na manual", async () => {
  // MUTAÇÃO QUE MATA: M9c (`if (manualRunExists) continue;` → apagada).
  const importId = "09a00000-0000-4000-8000-000000000050";
  const { repository, service } = seeded(
    [completedImport(importId, "2026-07-02T00:00:00.000Z", { autoAllocation: "v1" })],
    { [importId]: "aws-cur-sample.csv" },
  );
  const junStart = new Date("2026-06-01T00:00:00.000Z");
  const junEnd = new Date("2026-06-30T23:59:59.000Z");
  const manual = await service.allocateCostsForPeriod({ periodStart: junStart, periodEnd: junEnd, importId, createdBy: "operador" });

  const result = await ensureImportRuns(service, importId);

  assert.deepEqual(result, { outcome: "ensured", created: 0, pendingCount: 0 });
  assert.deepEqual((await repository.listRunsByImport(importId)).map((run) => run.id), [manual.id]);
  assert.equal((await service.getAllocationSummary({ periodStart: junStart, periodEnd: junEnd })).runId, manual.id);
});

// -----------------------------------------------------------------------------------------------
// F2 — a importação concluída dispara o rateio (P1, P5, A3)
// -----------------------------------------------------------------------------------------------

test("T1 · P1 — importar 1 mês, em composição explícita, dá 1 run automática e 1 enfileiramento", async () => {
  // MUTAÇÃO QUE MATA: M1 (`if (this.onImportCompleted) await this.onImportCompleted(completed).catch(…);` → apagada).
  const chain = importChain();
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv"), importedBy: "operador-plataforma" });

  assert.equal(imported.status, "completed");
  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.equal(runs.length, 1);
  assert.equal(runs[0]!.metadata.trigger, "import");
  assert.equal(runs[0]!.createdBy, "operador-plataforma", "CE-G2: a run automática guarda quem importou");
  assert.equal(runs[0]!.metadata.importId, imported.id);
  assert.equal(runs[0]!.metadata.importResolution, "explicit");
  assert.equal(runs[0]!.status, "pending");
  assert.equal(runs[0]!.periodStart.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(runs[0]!.periodEnd.toISOString(), "2026-06-30T23:59:59.000Z");
  assert.equal(
    runs[0]!.id,
    importRunId(imported.id, new Date("2026-06-01T00:00:00Z"), new Date("2026-06-30T23:59:59Z")),
  );
  assert.deepEqual(chain.enqueued, [["cloud-cost-allocation.run", { mode: "import_auto", importId: imported.id }, undefined]]);
});

test("T1-ponte · A3 — a run automática lê a importação e as linhas pela ponte, e soma o total importado", async () => {
  // MUTAÇÃO QUE MATA: M1b (`if (this.costSource) return this.costSource.getImport(importId); // B-ASS-09a ponte` → apagada).
  const chain = importChain();
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });
  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.equal(runs.length, 1, "sem a ponte, a importação não existe para o rateio e nada nasce");

  const executed = await chain.allocation.executeAllocationRun(runs[0]!.id);
  assert.equal(executed.status, "completed", executed.errorMessage);
  assert.equal(executed.totalImportedCost, imported.totalUnblendedCost);
});

test("T1b · P1/R11 — importar 2 meses dá 2 runs e UM enfileiramento", async () => {
  // MUTAÇÃO QUE MATA: M1e (`if (pendingCount > 0) await deps.enqueue(` → `if (pendingCount < 0) await deps.enqueue(`).
  const chain = importChain();
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-two-months-exclusive.csv") });

  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.deepEqual(
    runs.map((run) => [run.periodStart.toISOString(), run.periodEnd.toISOString()]).sort(),
    [
      ["2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
      ["2026-11-01T00:00:00.000Z", "2026-11-30T23:59:59.999Z"],
    ],
  );
  assert.deepEqual(chain.enqueued, [["cloud-cost-allocation.run", { mode: "import_auto", importId: imported.id }, undefined]]);
});

test("T1-mem · A3 — na fábrica de memória a importação NÃO tem gancho: 0 runs e nenhum log de falha do gancho", async (t) => {
  // MUTAÇÃO QUE MATA: M1d (`return createMemoryCloudCostService();` → serviço com um gancho que lança).
  assert.equal(env.CORE_SAAS_PERSISTENCE, "memory", "este caso exige a suíte em memória (forma do job `backend`)");
  resetCloudCostRuntimeForTests();
  resetCloudCostAllocationRuntimeForTests();
  const warn = t.mock.method(cloudCostImportLogger, "warn");
  try {
    const service = await createDefaultCloudCostService();
    const imported = await service.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });
    assert.equal(imported.status, "completed");
    assert.equal((await getMemoryCloudCostAllocationRepositoryForTests().listRuns()).length, 0);
    assert.equal(warn.mock.callCount(), 0, "nenhum gancho foi chamado (e portanto nenhum falhou)");
  } finally {
    resetCloudCostRuntimeForTests();
    resetCloudCostAllocationRuntimeForTests();
  }
});

test("T5 (gancho) · P1 — importação que falha não chama o gancho: 0 runs e 0 enfileiramentos", async () => {
  const chain = importChain();
  const failed = await chain.costs.importAwsCurCsv({
    csv: "bill/BillingPeriodStartDate,lineItem/ProductCode,lineItem/UnblendedCost,lineItem/CurrencyCode\n2026-06-01,AmazonEC2,1,USD",
  });
  assert.equal(failed.status, "failed");
  assert.equal((await chain.allocationRepository.listRuns()).length, 0);
  assert.deepEqual(chain.enqueued, []);
});

test("T8 (síncrono) · P5 — um gancho que lança não derruba a importação: ela resolve completed, com as linhas intactas", async (t) => {
  // MUTAÇÃO QUE MATA: M8 (`.catch(logImportCompletedHookFailure)` → apagado).
  const warn = t.mock.method(cloudCostImportLogger, "warn", () => {});
  const costRepository = new InMemoryCloudCostRepository();
  const costs = new CloudCostService(costRepository, {
    onImportCompleted: async () => {
      throw new Error("falha do gancho com Bearer abc.def");
    },
  });

  const imported = await costs.importAwsCurCsv({ csv: fixture("aws-cur-two-months-exclusive.csv") });

  assert.equal(imported.status, "completed");
  assert.equal(imported.rowCount, 3);
  assert.equal(imported.totalUnblendedCost, 130);
  assert.equal((await costRepository.listLineItems({ importId: imported.id })).length, 3);
  assert.equal((await costRepository.getImport(imported.id))?.status, "completed", "a importação gravada segue completed");
  assert.equal(warn.mock.callCount(), 1);
  assert.equal(warn.mock.calls[0]!.arguments[1], "cloud_cost_import_completed_hook_failed");
  assert.doesNotMatch(JSON.stringify(warn.mock.calls[0]!.arguments[0]), /abc\.def/, "o log sanitiza o erro");
});

test("T-MARK · R2-12(a) — o marcador é gravado DEPOIS do metadata de quem chama, e é igual nos dois módulos", async () => {
  assert.equal(CLOUD_COST_AUTO_ALLOCATION_MARKER, AUTO_ALLOCATION_MARKER);
  const costs = new CloudCostService(new InMemoryCloudCostRepository());
  const imported = await costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv"), metadata: { autoAllocation: "x" } });
  assert.equal(imported.status, "completed");
  assert.equal(imported.metadata.autoAllocation, "v1");
});

test("T13 · E11 — depois do rateio automático de outubro (fim exclusivo), o resumo de outubro acha a run v5 (100)", async () => {
  // MUTAÇÃO QUE MATA: M13 (`new Date(billingPeriodEnd.getTime() - 1)` → `new Date(billingPeriodEnd.getTime())`).
  const chain = importChain();
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-two-months-exclusive.csv") });
  for (const run of await chain.allocationRepository.listRunsByImport(imported.id)) {
    await chain.allocation.executeAllocationRun(run.id);
  }

  const summary = await chain.allocation.getAllocationSummary({
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-10-31T23:59:59.999Z"),
  });

  assert.equal(summary.coverage, "imported");
  assert.equal(summary.runId, importRunId(imported.id, new Date("2026-10-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z")));
  assert.equal(summary.totalImportedCost, 100);
});

// -----------------------------------------------------------------------------------------------
// F3 — execução reivindicada da run automática (P4, E7)
// -----------------------------------------------------------------------------------------------

test("T6 · P4 — duas execuções da mesma importação (em paralelo no laço e em sequência) rodam o motor 1 vez por run", async () => {
  // MUTAÇÃO QUE MATA: M6m (`if (!run || run.status !== "pending") return false; // B-ASS-09a claim` → `if (!run) return false; …`).
  let engineCalls = 0;
  const spy: typeof allocateCloudCosts = (input) => {
    engineCalls += 1;
    return allocateCloudCosts(input);
  };
  const chain = importChain(spy);
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-two-months-exclusive.csv") });

  const [first, second] = await Promise.all([
    chain.allocation.executeImportRuns(imported.id),
    chain.allocation.executeImportRuns(imported.id),
  ]);
  const third = await chain.allocation.executeImportRuns(imported.id);

  assert.equal(engineCalls, 2, "1 chamada do motor por run (2 runs), nunca 4");
  assert.equal(first.length + second.length + third.length, 2);
  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.deepEqual(runs.map((run) => run.status), ["completed", "completed"]);
  for (const run of runs) {
    const allocations = await chain.allocation.listTenantAllocations(run.id);
    assert.equal(allocations.length, 1, "as alocações são de uma execução só");
  }
});

test("T2 (job) · P2 — o job `import_auto` duas vezes dá 1 run por par e não muda o número de alocações", async () => {
  const chain = importChain();
  const handler = createCloudCostAllocationRunJobHandler({ getService: async () => chain.allocation });
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-two-months-exclusive.csv") });
  const job = { mode: "import_auto", importId: imported.id } as const;

  await handler(job, {} as never);
  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  const allocationsAfterFirst = await countAllocations(chain.allocation, runs);
  await handler(job, {} as never);

  const after = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.equal(after.length, 2);
  assert.deepEqual(after.map((run) => run.status), ["completed", "completed"]);
  assert.equal(await countAllocations(chain.allocation, after), allocationsAfterFirst);
  await assert.rejects(handler({ mode: "import_auto" }, {} as never), /requires importId/);
});

test("T7 · E7 — o caminho manual segue reexecutando de propósito uma run concluída (recalcula)", async () => {
  // MUTAÇÃO QUE MATA: M7 (`return this.runAllocation(run, "unclaimed");` → reivindica antes e devolve a run sem recalcular).
  const repository = new InMemoryCloudCostAllocationRepository();
  const importId = "09a00000-0000-4000-8000-000000000060";
  const s3 = {
    ...linesFromFixture("aws-cur-sample.csv", importId, "t7")[0]!,
    serviceCode: "AmazonS3",
    usageType: "TimedStorage-ByteHrs",
    tenantTag: undefined,
    unblendedCost: 12,
  };
  const attachment = (tenantId: string, sizeBytes: number) => ({
    tenantId,
    model: "attachments" as const,
    sizeBytes,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
  });
  repository.seed({
    tenants,
    imports: [completedImport(importId, "2026-07-02T00:00:00.000Z")],
    costLineItems: [s3],
    attachments: [attachment("tenant-a", 100), attachment("tenant-b", 100)],
  });
  const service = new CloudCostAllocationService(repository);
  const run = await service.allocateCostsForPeriod({
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.000Z"),
    importId,
  });
  assert.deepEqual(await split(service, run.id), [["tenant-a", 6], ["tenant-b", 6]]);

  // A medição de espaço muda (chegou atrasada): a reexecução manual da MESMA run recalcula.
  repository.seed({ attachments: [attachment("tenant-a", 300), attachment("tenant-b", 100)] });
  const again = await service.executeAllocationRun(run.id);

  assert.equal(again.status, "completed");
  assert.deepEqual(await split(service, run.id), [["tenant-a", 9], ["tenant-b", 3]]);
});

// -----------------------------------------------------------------------------------------------
// F4 — a varredura de recuperação (P5, P7, R2-02, R2-04, R2-05)
// -----------------------------------------------------------------------------------------------

test("T8 (varredura) · P5 — o gancho falhou: a importação ficou completed e a varredura cria a run e enfileira", async (t) => {
  t.mock.method(cloudCostImportLogger, "warn", () => {});
  const costRepository = new InMemoryCloudCostRepository();
  const allocationRepository = new InMemoryCloudCostAllocationRepository({ costSource: costRepository });
  allocationRepository.seed({ tenants });
  const allocation = new CloudCostAllocationService(allocationRepository);
  const costs = new CloudCostService(costRepository, {
    onImportCompleted: async () => {
      throw new Error("redis fora do ar");
    },
  });
  const imported = await costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });
  assert.equal(imported.status, "completed");
  assert.equal((await allocationRepository.listRunsByImport(imported.id)).length, 0, "o gancho não criou nada");

  const queue = fakeQueue();
  const result = await runImportCatchUp({ allocation, enqueue: queue.enqueue });

  assert.deepEqual(result, { importsScanned: 1, runsCreated: 1, importsEnqueued: 1, importsFailed: 0 });
  assert.equal((await allocationRepository.listRunsByImport(imported.id)).length, 1);
  assert.deepEqual(queue.calls, [["cloud-cost-allocation.run", { mode: "import_auto", importId: imported.id }, undefined]]);
});

test("T9 · P5 — a varredura cria a run que falta, enfileira a pending, NÃO enfileira a failed, e a 2ª passada não cria", async () => {
  // MUTAÇÃO QUE MATA: M9 (`run.status === "pending" && // B-ASS-09a listPendingImportRuns` → `(… || run.status === "failed") && …`).
  const withoutRun = "09a00000-0000-4000-8000-000000000070";
  const withPending = "09a00000-0000-4000-8000-000000000071";
  const withFailed = "09a00000-0000-4000-8000-000000000072";
  const marked = { autoAllocation: "v1" };
  const { repository, service } = seeded(
    [
      completedImport(withoutRun, "2026-07-02T00:00:00.000Z", marked),
      completedImport(withPending, "2026-07-03T00:00:00.000Z", marked),
      completedImport(withFailed, "2026-07-04T00:00:00.000Z", marked),
    ],
    { [withoutRun]: "aws-cur-sample.csv", [withPending]: "aws-cur-sample.csv", [withFailed]: "aws-cur-sample.csv" },
  );
  await ensureImportRuns(service, withPending);
  await ensureImportRuns(service, withFailed);
  const failedRun = (await repository.listRunsByImport(withFailed))[0]!;
  await repository.updateRun(failedRun.id, { status: "failed", errorMessage: "mixed_currency" });

  const queue = fakeQueue();
  const first = await runImportCatchUp({ allocation: service, enqueue: queue.enqueue });
  assert.deepEqual(first, { importsScanned: 1, runsCreated: 1, importsEnqueued: 2, importsFailed: 0 });
  assert.deepEqual(queue.importIds().sort(), [withoutRun, withPending].sort(), "a failed não é reenfileirada (pergunta 3, (a))");

  const second = await runImportCatchUp({ allocation: service, enqueue: fakeQueue().enqueue });
  assert.equal(second.runsCreated, 0, "a 2ª passada não cria nada");
  assert.equal(second.importsScanned, 0, "nenhuma importação marcada ficou sem run");
});

test("T9b · P7 (A2) — importação SEM marcador (anterior ao bloco), com junho publicado à mão: a varredura não cria nada", async () => {
  // MUTAÇÃO QUE MATA: M9b (`costImport.metadata.autoAllocation === AUTO_ALLOCATION_MARKER` → `true`).
  const legacy = "09a00000-0000-4000-8000-000000000080";
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: [completedImport(legacy, "2026-08-02T00:00:00.000Z")],
    costLineItems: [
      line(legacy, "jun", "2026-06-01T00:00:00.000Z", "2026-06-30T23:59:59.999Z", 10),
      line(legacy, "jul", "2026-07-01T00:00:00.000Z", "2026-07-31T23:59:59.999Z", 20),
    ],
  });
  const service = new CloudCostAllocationService(repository);
  const junStart = new Date("2026-06-01T00:00:00.000Z");
  const junEnd = new Date("2026-06-30T23:59:59.999Z");
  const manual = await service.allocateCostsForPeriod({ periodStart: junStart, periodEnd: junEnd, importId: legacy });

  const result = await runImportCatchUp({ allocation: service, enqueue: fakeQueue().enqueue });

  assert.equal(result.runsCreated, 0);
  assert.deepEqual((await repository.listRunsByImport(legacy)).map((run) => run.id), [manual.id], "0 runs novas");
  assert.equal((await service.getAllocationSummary({ periodStart: junStart, periodEnd: junEnd })).runId, manual.id);
});

test("T9d · R2-02 — com limite 2 e 3 importações marcadas, a mais nova (sem run) é alcançada pela varredura", async () => {
  // MUTAÇÃO QUE MATA: o filtro de pendência (`!this.hasImportAutoRun(costImport.id)`) trocado por `true`.
  const ids = ["09a00000-0000-4000-8000-000000000090", "09a00000-0000-4000-8000-000000000091", "09a00000-0000-4000-8000-000000000092"];
  const marked = { autoAllocation: "v1" };
  const { repository, service } = seeded(
    ids.map((id, index) => completedImport(id, `2026-07-0${index + 2}T00:00:00.000Z`, marked)),
    Object.fromEntries(ids.map((id) => [id, "aws-cur-sample.csv"])),
  );
  await ensureImportRuns(service, ids[0]!);
  await ensureImportRuns(service, ids[1]!);

  const result = await runImportCatchUp({ allocation: service, enqueue: fakeQueue().enqueue, limit: 2 });

  assert.equal(result.runsCreated, 1);
  assert.equal((await repository.listRunsByImport(ids[2]!)).length, 1, "a importação mais nova ganhou a run");
});

test("T9e · R2-05(b) — reenviar junho cria importação nova, com rateio novo, e o resumo de junho passa a ela", async () => {
  const chain = importChain();
  const junStart = new Date("2026-06-01T00:00:00.000Z");
  const junEnd = new Date("2026-06-30T23:59:59.000Z");
  const first = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });
  await chain.allocation.executeImportRuns(first.id);
  const published = await chain.allocation.getAllocationSummary({ periodStart: junStart, periodEnd: junEnd });
  assert.equal(published.importId, first.id);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const resent = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });
  await chain.allocation.executeImportRuns(resent.id);
  const after = await chain.allocation.getAllocationSummary({ periodStart: junStart, periodEnd: junEnd });

  assert.notEqual(resent.id, first.id, "o mesmo arquivo vira importação NOVA");
  assert.equal(after.importId, resent.id, "o número publicado de junho passa ao rateio da importação nova");
  assert.equal(after.runId, importRunId(resent.id, new Date("2026-06-01T00:00:00Z"), new Date("2026-06-30T23:59:59Z")));
  assert.equal(after.totalImportedCost, published.totalImportedCost, "sem somar as duas");
  assert.equal((await chain.allocationRepository.listRunsByImport(first.id)).length, 1, "a run antiga continua lá");
});

test("T-R2-04 · a varredura que falha não relança e reenfileira UMA vez com 6 h; a que passa também", async () => {
  // MUTAÇÃO QUE MATA: relançar no `catch` (`// B-ASS-09a R2-04 não relança` → `throw error; // B-ASS-09a R2-04 não relança`).
  const { logger, errors } = spyLogger();
  const failing = fakeQueue();
  const handler = createCloudCostAllocationRunJobHandler({
    enqueue: failing.enqueue,
    logger,
    runCatchUp: async () => {
      throw Object.assign(new Error("connection refused 10.0.0.1:5432"), { code: "ECONNREFUSED" });
    },
  });

  await handler({ mode: "import_catch_up" }, {} as never);

  assert.deepEqual(failing.calls, [["cloud-cost-allocation.run", { mode: "import_catch_up" }, { delayMs: IMPORT_CATCH_UP_INTERVAL_MS }]]);
  assert.equal(IMPORT_CATCH_UP_INTERVAL_MS, 6 * 60 * 60 * 1000);
  assert.deepEqual(errors, [[{ code: "ECONNREFUSED" }, "cloud_cost_auto_allocation_catch_up_failed"]], "o log leva só o código");

  const passing = fakeQueue();
  let ran = 0;
  await createCloudCostAllocationRunJobHandler({ enqueue: passing.enqueue, logger, runCatchUp: async () => void (ran += 1) })(
    { mode: "import_catch_up" },
    {} as never,
  );
  assert.equal(ran, 1);
  assert.equal(passing.calls.length, 1);
});

test("T10b · o 1º tique da varredura enfileira import_catch_up no job que já existe", async () => {
  const queue = fakeQueue();
  await enqueueInitialCloudAllocationImportCatchUp(queue.enqueue);
  assert.deepEqual(queue.calls, [["cloud-cost-allocation.run", { mode: "import_catch_up" }, { delayMs: IMPORT_CATCH_UP_FIRST_DELAY_MS }]]);
});

test("T11 · CE-G1 — toda escrita de importação `completed` em src/** passa pelo gancho, e o marcador é o mesmo nos dois módulos", () => {
  // SONDA: criar `src/modules/cloud-costs/__sonda_ceg1.ts` com `export const s = (r: any) => r.updateImport("x", { status: "completed" });`.
  assert.equal(CLOUD_COST_AUTO_ALLOCATION_MARKER, AUTO_ALLOCATION_MARKER);
  const writers = completedImportWriters();
  assert.deepEqual(
    writers,
    ["src/modules/cloud-costs/aws-cur.service.ts"],
    "escrita nova de importação `completed` precisa disparar o rateio automático (onImportCompleted) e entrar aqui",
  );
  for (const file of writers) {
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /this\.onImportCompleted\(completed\)/, file);
  }
});

// -----------------------------------------------------------------------------------------------
// Ajudantes
// -----------------------------------------------------------------------------------------------

/**
 * CE-G1 — os arquivos de `src/**` com uma chamada de escrita de importação de custo (`createImport(`, `updateImport(` ou
 * `cloudCostImport.<create|update|updateMany|upsert|createMany>(`) cujo argumento, até o parêntese que a fecha, traz o
 * literal `status: "completed"` (aspas simples ou duplas). Alcance declarado: literal; escrita por SQL cru não entra.
 */
function completedImportWriters(): string[] {
  const root = new URL("../src/", import.meta.url);
  const found = new Set<string>();
  const call = /(?:\bcreateImport|\bupdateImport|cloudCostImport\.(?:create|update|updateMany|upsert|createMany))\s*\(/g;
  for (const relative of listTsFiles(root)) {
    const text = readFileSync(new URL(relative, root), "utf8");
    for (const match of text.matchAll(call)) {
      const open = (match.index ?? 0) + match[0].length - 1;
      const body = balancedParenthesis(text, open);
      if (/status\s*:\s*["']completed["']/.test(body)) found.add(`src/${relative}`);
    }
  }
  return [...found].sort();
}

function listTsFiles(root: URL, prefix = ""): string[] {
  const entries = readdirSync(new URL(prefix, root), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return listTsFiles(root, `${relative}/`);
    return entry.isFile() && entry.name.endsWith(".ts") ? [relative] : [];
  });
}

function balancedParenthesis(text: string, open: number): string {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    if (text[index] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  return text.slice(open);
}

function fakeQueue() {
  const calls: Array<[string, CloudCostAllocationAutoJobPayload, unknown]> = [];
  const enqueue: CloudCostAllocationEnqueue = async (name, payload, options) => {
    calls.push([name, payload, options]);
  };
  return { calls, enqueue, importIds: () => calls.map(([, payload]) => payload.importId) };
}

function line(importId: string, suffix: string, start: string, end: string, cost: number): CloudCostLineItem {
  return {
    id: `${importId}-${suffix}`,
    importId,
    provider: "aws",
    billingPeriodStart: new Date(start),
    billingPeriodEnd: new Date(end),
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    tenantTag: "tenant-a",
    unblendedCost: cost,
    currency: "USD",
    rawLineHash: `${importId}-${suffix}`,
    metadata: {},
    createdAt: new Date(start),
  };
}

async function split(service: CloudCostAllocationService, runId: string) {
  return (await service.listTenantAllocations(runId))
    .map((item) => [item.tenantId, item.allocatedCost] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * A composição EXPLÍCITA do T1 (R3): repositório de importação em memória, rateio com a ponte `costSource` e o gancho
 * com fila falsa. É o que a fábrica Prisma monta em produção, aqui sem banco.
 */
function importChain(engine?: typeof allocateCloudCosts) {
  const costRepository = new InMemoryCloudCostRepository();
  const allocationRepository = new InMemoryCloudCostAllocationRepository({ costSource: costRepository });
  allocationRepository.seed({ tenants });
  const allocation = new CloudCostAllocationService(allocationRepository, engine);
  const enqueued: Array<[string, CloudCostAllocationAutoJobPayload, unknown]> = [];
  const hook = buildCloudCostImportHook({
    allocation,
    enqueue: async (name, payload, options) => {
      enqueued.push([name, payload, options]);
    },
  });
  const costs = new CloudCostService(costRepository, { onImportCompleted: hook });
  return { costRepository, allocationRepository, allocation, costs, enqueued };
}

/** Repositório semeado (sem ponte), com as linhas de cada importação tiradas de uma fixture. */
function seeded(imports: readonly CloudCostImport[], fixtures: Readonly<Record<string, string>>) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports,
    costLineItems: Object.entries(fixtures).flatMap(([importId, name]) => linesFromFixture(name, importId, importId)),
  });
  return { repository, service: new CloudCostAllocationService(repository) };
}

async function autoRuns(repository: InMemoryCloudCostAllocationRepository, importId: string) {
  return (await repository.listRunsByImport(importId)).filter((run) => run.metadata.trigger === "import");
}

async function countAllocations(service: CloudCostAllocationService, runs: readonly CloudCostAllocationRun[]) {
  let total = 0;
  for (const run of runs) total += (await service.listTenantAllocations(run.id)).length;
  return total;
}

function sumOf(rows: ReadonlyArray<readonly [string, string, number]>): number {
  return Number(rows.reduce((total, [, , value]) => total + value, 0).toFixed(6));
}

/** `count` meses seguidos a partir de 2024-01, um par bruto por mês (fim exclusivo), 1 USD cada. */
function monthlyLines(importId: string, count: number): CloudCostLineItem[] {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(2024, index, 1));
    const end = new Date(Date.UTC(2024, index + 1, 1));
    return {
      id: `${importId}-m${index}`,
      importId,
      provider: "aws",
      billingPeriodStart: start,
      billingPeriodEnd: end,
      serviceCode: "AmazonEC2",
      usageType: "BoxUsage",
      tenantTag: "tenant-a",
      unblendedCost: 1,
      currency: "USD",
      rawLineHash: `${importId}-m${index}`,
      metadata: {},
      createdAt: start,
    };
  });
}

function spyLogger() {
  const warns: Array<[Record<string, unknown>, string]> = [];
  const errors: Array<[Record<string, unknown>, string]> = [];
  const logger: ImportTriggerLogger = {
    warn: (payload, message) => void warns.push([payload, message]),
    error: (payload, message) => void errors.push([payload, message]),
  };
  return { logger, warns, errors };
}

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

function linesFromFixture(name: string, importId: string, prefix: string): CloudCostLineItem[] {
  return parseAwsCurCsv(fixture(name)).map((line, index) => ({
    ...line,
    id: `${prefix}-${index}`,
    importId,
    createdAt: new Date("2026-12-01T00:00:00.000Z"),
  }));
}

function completedImport(id: string, importedAt: string, metadata: Record<string, unknown> = {}): CloudCostImport {
  const at = new Date(importedAt);
  return {
    id,
    provider: "aws",
    sourceType: "manual_csv",
    status: "completed",
    importedAt: at,
    rowCount: 1,
    totalUnblendedCost: 0,
    currency: "USD",
    metadata,
    createdAt: at,
    updatedAt: at,
  };
}
