import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  AUTO_ALLOCATION_MARKER,
  buildCloudCostImportHook,
  CloudCostAllocationService,
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
  const imported = await chain.costs.importAwsCurCsv({ csv: fixture("aws-cur-sample.csv") });

  assert.equal(imported.status, "completed");
  const runs = await chain.allocationRepository.listRunsByImport(imported.id);
  assert.equal(runs.length, 1);
  assert.equal(runs[0]!.metadata.trigger, "import");
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
// Ajudantes
// -----------------------------------------------------------------------------------------------

/**
 * A composição EXPLÍCITA do T1 (R3): repositório de importação em memória, rateio com a ponte `costSource` e o gancho
 * com fila falsa. É o que a fábrica Prisma monta em produção, aqui sem banco.
 */
function importChain() {
  const costRepository = new InMemoryCloudCostRepository();
  const allocationRepository = new InMemoryCloudCostAllocationRepository({ costSource: costRepository });
  allocationRepository.seed({ tenants });
  const allocation = new CloudCostAllocationService(allocationRepository);
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
