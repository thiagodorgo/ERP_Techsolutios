import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { after, before } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-ASS-09a — rateio automático a partir da importação, contra o Postgres REAL.
//
// O código sob teste roda num papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`, o arnês único da casa,
// dentro do lock de catálogo). A URL admin (superusuário) só semeia, segura a barreira e limpa. A janela é PRÓPRIA
// (ano 2033, livre em `tests/**`), fora da reservada de `o6r06-cost-summary-sum-db`; as linhas levam a tag de uma
// organização criada pela suíte, para nenhuma outra suíte casar com elas.
//
// A fábrica de produção (`createPrismaCloudCostService`) usa o cliente global de `src/database/prisma.ts`. Ele honra
// `globalThis.prisma` fora de produção; esta suíte põe ali o cliente do papel ANTES do primeiro import da aplicação, e
// assim o caminho real da importação até a run roda sob o papel sem bypass.
//
// As barreiras (T3-db, T6-db) são escopadas pelo NOME DO PAPEL, que é único por processo: só conta statement bloqueado
// de conexão desta suíte (a lição do `pg-barrier.ts`: barreira cluster-wide é satisfeita por bloqueio alheio).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

type Ctx = Awaited<ReturnType<typeof bootstrap>>;

if (!connectionString) {
  test("B-ASS-09a · rateio automático -db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL para o PostgreSQL descartável do bloco.",
  });
} else {
  let ctx: Ctx | undefined;

  before(async () => {
    ctx = await bootstrap(connectionString);
  });

  after(async () => {
    await ctx?.close();
  });

  test("T-M09a-db · a coluna import_id existe com FK SET NULL, createRun a grava, e apagar a importação a anula", async () => {
    // MUTAÇÃO QUE MATA: M6 (`import_id: input.importId ?? null,` → apagada).
    const c = ctx!;
    const columns = (await c.admin.$queryRawUnsafe(
      `SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cloud_cost_allocation_runs' AND column_name = 'import_id'`,
    )) as Array<{ data_type: string }>;
    assert.deepEqual(columns, [{ data_type: "uuid" }]);
    const fk = (await c.admin.$queryRawUnsafe(
      `SELECT confdeltype::text AS confdeltype, (SELECT relname::text FROM pg_class WHERE oid = confrelid) AS target
         FROM pg_constraint WHERE conname = 'cloud_cost_allocation_runs_import_id_fkey'`,
    )) as Array<{ confdeltype: string; target: string }>;
    assert.deepEqual(fk, [{ confdeltype: "n", target: "cloud_cost_imports" }], "FK para cloud_cost_imports com ON DELETE SET NULL");

    const importId = await seedImport(c, { status: "completed", marker: false });
    try {
      const run = await c.allocationRepository.createRun({
        periodStart: new Date("2033-01-01T00:00:00.000Z"),
        periodEnd: new Date("2033-01-31T23:59:59.999Z"),
        importId,
        metadata: { importId, importResolution: "explicit" },
      });
      assert.equal(await runImportColumn(c, run.id), importId, "createRun grava a coluna import_id");

      await c.admin.cloudCostImport.delete({ where: { id: importId } });
      assert.equal(await runImportColumn(c, run.id), null, "apagar a importação deixa import_id NULL (a run fica)");
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T1-db · P1 — a fábrica Prisma de produção importa e grava 1 run com id v5 e import_id, e enfileira 1 vez", async () => {
    // MUTAÇÃO QUE MATA: M1c (`new CloudCostService(await createPrismaCloudCostRepository(), { onImportCompleted: hook })` → sem o gancho).
    const c = ctx!;
    const enqueued: unknown[][] = [];
    const service = await c.costs.createPrismaCloudCostService({
      enqueue: async (name, payload, options) => {
        enqueued.push([name, payload, options]);
      },
    });
    let importId: string | undefined;
    try {
      const imported = await service.importAwsCurCsv({ csv: c.fixture("aws-cur-sample.csv") });
      importId = imported.id;
      assert.equal(imported.status, "completed");
      assert.equal(imported.metadata.autoAllocation, "v1");

      const rows = (await c.admin.$queryRawUnsafe(
        `SELECT id::text AS id, import_id::text AS "importId", status, metadata->>'trigger' AS trigger
           FROM cloud_cost_allocation_runs WHERE import_id = $1::uuid`,
        imported.id,
      )) as Array<{ id: string; importId: string; status: string; trigger: string }>;
      assert.deepEqual(rows, [
        {
          id: c.trigger.importRunId(imported.id, new Date("2033-06-01T00:00:00Z"), new Date("2033-06-30T23:59:59Z")),
          importId: imported.id,
          status: "pending",
          trigger: "import",
        },
      ]);
      assert.deepEqual(enqueued, [["cloud-cost-allocation.run", { mode: "import_auto", importId: imported.id }, undefined]]);
    } finally {
      await cleanup(c, importId ? [importId] : []);
    }
  });

  test("T3-db · P2 — duas conexões criando a MESMA run automática em corrida gravam 1 linha; uma volta created:false", async () => {
    // MUTAÇÃO QUE MATA: M3 (`id: input.id,` → apagada).
    const c = ctx!;
    const importId = await importWithoutHook(c, "aws-cur-sample.csv");
    const start = new Date("2033-06-01T00:00:00.000Z");
    const end = new Date("2033-06-30T23:59:59.000Z");
    try {
      // Barreira: o admin segura a linha da importação (FOR UPDATE); o INSERT da run precisa de KEY SHARE nela pela FK,
      // então as DUAS criações bloqueiam no INSERT. Soltas juntas, uma grava e a outra bate na PK.
      const results = await holdRowThenRelease(
        c,
        `SELECT id FROM cloud_cost_imports WHERE id = '${importId}'::uuid FOR UPDATE`,
        2,
        "INSERT",
        () =>
          Promise.all([
            c.allocation.createImportRun({ importId, billingPeriods: [{ billingPeriodStart: start, billingPeriodEnd: end }] }),
            c.allocation.createImportRun({ importId, billingPeriods: [{ billingPeriodStart: start, billingPeriodEnd: end }] }),
          ]),
      );

      const id = c.trigger.importRunId(importId, start, end);
      assert.deepEqual(results.map((result) => result.run.id), [id, id], "as duas chamadas devolvem o mesmo id");
      assert.deepEqual(results.map((result) => result.created).sort(), [false, true]);
      const count = (await c.admin.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM cloud_cost_allocation_runs WHERE import_id = $1::uuid`,
        importId,
      )) as Array<{ n: number }>;
      assert.equal(count[0]!.n, 1, "uma linha só");
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T4-db · P3 (R1) — no Postgres, cada linha entra em UMA run automática (fim exclusivo e pares sobrepostos)", async () => {
    // MUTAÇÃO QUE MATA: M4c (a igualdade do par vira sobreposição no `listCostLineItemsForBillingPeriod`).
    const c = ctx!;
    const exclusive = await importWithoutHook(c, "aws-cur-two-months-exclusive.csv");
    const overlapping = await importWithoutHook(c, "aws-cur-overlapping-pairs.csv");
    try {
      const totals = async (importId: string) => {
        await c.trigger.ensureImportRuns(c.allocation, importId);
        const executed = await c.allocation.executeImportRuns(importId);
        return executed.map((run) => [run.periodStart.toISOString().slice(0, 10), run.status, run.totalImportedCost]);
      };
      assert.deepEqual(await totals(exclusive), [
        ["2033-10-01", "completed", 100],
        ["2033-11-01", "completed", 30],
      ]);
      assert.deepEqual(await totals(overlapping), [
        ["2033-10-01", "completed", 40],
        ["2033-10-15", "completed", 7],
      ]);
    } finally {
      await cleanup(c, [exclusive, overlapping]);
    }
  });

  test("T4m-db · P3m (R4) — no Postgres, o manual de novembro dá 30 e, sem importId, escolhe a importação de novembro", async () => {
    // MUTAÇÕES QUE MATAM: M4f (`{ gt: periodStart }, // B-ASS-09a R4 listCostLineItems` → `gte`) e M4g (o mesmo em findBillableImport).
    const c = ctx!;
    const novStart = new Date("2033-11-01T00:00:00.000Z");
    const novEnd = new Date("2033-11-30T23:59:59.999Z");
    const both = await importWithoutHook(c, "aws-cur-two-months-exclusive.csv");
    const ids = [both];
    try {
      const manual = await c.allocation.allocateCostsForPeriod({ periodStart: novStart, periodEnd: novEnd, importId: both });
      assert.equal(manual.status, "completed", manual.errorMessage);
      assert.equal(manual.totalImportedCost, 30, "a linha de outubro (fim 11-01T00:00) não entra em novembro");
      await cleanup(c, [both]);
      ids.length = 0;

      // T4m-b: Y = importação de novembro, mais VELHA; X = importação só de outubro (fim exclusivo), mais NOVA.
      const november = await importWithoutHook(c, "aws-cur-two-months-exclusive.csv", (row) => row.startsWith("2033-11"));
      ids.push(november);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const onlyOctober = await importWithoutHook(c, "aws-cur-two-months-exclusive.csv", (row) => row.startsWith("2033-10"));
      ids.push(onlyOctober);
      const resolved = await c.allocation.createAllocationRun({ periodStart: novStart, periodEnd: novEnd });
      assert.equal(resolved.metadata.importId, november, "sem importId, o manual de novembro escolhe Y (novembro), não X");
    } finally {
      await cleanup(c, ids);
    }
  });

  test("T6-db · P4 — duas execuções em corrida da mesma importação rodam o motor 1 vez; a run fica completed com 1 execução", async () => {
    // MUTAÇÃO QUE MATA: M6p (`where: { id: runId, status: "pending" }` → `where: { id: runId }`).
    const c = ctx!;
    const importId = await importWithoutHook(c, "aws-cur-sample.csv");
    try {
      await c.trigger.ensureImportRuns(c.allocation, importId);
      const [run] = await c.allocation.listRunsByImport(importId);
      assert.ok(run, "a run automática existe");
      let engineCalls = 0;
      const spy: typeof c.engine.allocateCloudCosts = (input) => {
        engineCalls += 1;
        return c.engine.allocateCloudCosts(input);
      };
      const spied = new c.CloudCostAllocationService(c.allocationRepository, spy);

      // Barreira: o admin segura a linha da run (FOR UPDATE); as duas reivindicações (`UPDATE … WHERE status='pending'`)
      // bloqueiam nela. Soltas, a 1ª grava `processing` e a 2ª reavalia o WHERE e conta 0.
      const [first, second] = await holdRowThenRelease(
        c,
        `SELECT id FROM cloud_cost_allocation_runs WHERE id = '${run.id}'::uuid FOR UPDATE`,
        2,
        "UPDATE",
        () => Promise.all([spied.executeImportRuns(importId), spied.executeImportRuns(importId)]),
      );

      assert.equal(engineCalls, 1, "o motor rodou uma vez só");
      assert.equal(first.length + second.length, 1, "uma execução venceu a reivindicação");
      const final = await c.allocation.getAllocationRun(run.id);
      assert.equal(final.status, "completed", final.errorMessage);
      // A amostra tem 2 linhas da organização (EC2 e S3; a 3ª é repetida e não entra): 2 alocações numa execução.
      assert.equal(final.metadata.tenantAllocationCount, 2);
      assert.equal(final.totalImportedCost, 12.75);
      const allocations = (await c.admin.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM tenant_cloud_cost_allocations WHERE allocation_run_id = $1::uuid`,
        run.id,
      )) as Array<{ n: number }>;
      assert.equal(allocations[0]!.n, 2, "as alocações são de uma execução só");
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T9b-db · P7 (A2) — importação SEM marcador, com junho publicado à mão: a varredura não cria run para ela", async () => {
    // MUTAÇÃO QUE MATA: M9b-db (`metadata: { path: ["autoAllocation"], equals: AUTO_ALLOCATION_MARKER },` → apagada).
    const c = ctx!;
    const legacy = await seedImport(c, { status: "completed", marker: false, rowCount: 2 });
    const junStart = new Date("2033-06-01T00:00:00.000Z");
    const junEnd = new Date("2033-06-30T23:59:59.999Z");
    try {
      await seedLine(c, legacy, "2033-06-01T00:00:00.000Z", "2033-06-30T23:59:59.999Z", "10.000000");
      await seedLine(c, legacy, "2033-07-01T00:00:00.000Z", "2033-07-31T23:59:59.999Z", "20.000000");
      const manual = await c.allocation.allocateCostsForPeriod({ periodStart: junStart, periodEnd: junEnd, importId: legacy });
      assert.equal(manual.status, "completed", manual.errorMessage);

      await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined, limit: 10_000 });

      const runs = await c.allocation.listRunsByImport(legacy);
      assert.deepEqual(runs.map((run) => run.id), [manual.id], "0 runs novas para a importação anterior ao bloco");
      const summary = await c.allocation.getAllocationSummary({ periodStart: junStart, periodEnd: junEnd });
      assert.equal(summary.runId, manual.id, "o resumo de junho segue na manual");
    } finally {
      await cleanup(c, [legacy]);
    }
  });

  test("T9d-db · R2-02 (PR542-02) — no Postgres, com limite 2 e 3 importações marcadas, a mais nova (sem run) é alcançada", async () => {
    // MUTAÇÃO QUE MATA: apagar `allocation_runs: { none: { metadata: { path: ["trigger"], equals: "import" } } }, // B-ASS-09a R2-02 pendência`.
    const c = ctx!;
    const ids: string[] = [];
    try {
      for (let index = 0; index < 3; index += 1) {
        const id = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: `2000-01-0${index + 1}T00:00:00.000Z` });
        ids.push(id);
        await seedLine(c, id, "2033-06-01T00:00:00.000Z", "2033-06-30T23:59:59.999Z", "10.000000");
      }
      await c.trigger.ensureImportRuns(c.allocation, ids[0]!);
      await c.trigger.ensureImportRuns(c.allocation, ids[1]!);

      const result = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined, limit: 2 });

      assert.equal(result.runsCreated, 1);
      const runs = await c.allocation.listRunsByImport(ids[2]!);
      assert.deepEqual(runs.map((run) => run.metadata.trigger), ["import"], "a importação mais nova ganhou a run");
    } finally {
      await cleanup(c, ids);
    }
  });

  test("T9f-db · PR542-01 — no Postgres, 3 importações sem nada a criar não tapam a fila: na 2ª passada a nova ganha o rateio", async () => {
    // MUTAÇÃO QUE MATA: apagar `OR: SWEEP_ELIGIBLE_WHERE, // B-ASS-09a PR542-01 avaliada`.
    const c = ctx!;
    const ids: string[] = [];
    const junStart = new Date("2033-06-01T00:00:00.000Z");
    const junEnd = new Date("2033-06-30T23:59:59.999Z");
    try {
      for (let index = 0; index < 4; index += 1) {
        const id = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: `2000-02-0${index + 1}T00:00:00.000Z` });
        ids.push(id);
        await seedLine(c, id, "2033-06-01T00:00:00.000Z", "2033-06-30T23:59:59.999Z", "10.000000");
      }
      const eternal = ids.slice(0, 3);
      const fresh = ids[3]!;
      for (const id of eternal) {
        const manual = await c.allocation.allocateCostsForPeriod({ periodStart: junStart, periodEnd: junEnd, importId: id });
        assert.equal(manual.status, "completed", manual.errorMessage);
      }

      const first = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined, limit: 2 });
      assert.equal(first.importsSettled, 2, "as 2 eternas mais antigas são marcadas na 1ª passada");
      assert.equal((await c.allocation.listRunsByImport(fresh)).length, 0);
      const marks = (await c.admin.$queryRawUnsafe(
        `SELECT id::text AS id, metadata->'autoAllocationSweep'->>'status' AS status FROM cloud_cost_imports WHERE id = ANY($1::uuid[]) ORDER BY imported_at`,
        ids,
      )) as Array<{ id: string; status: string | null }>;
      assert.deepEqual(marks.map((mark) => mark.status), ["done", "done", null, null]);

      const second = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined, limit: 2 });
      assert.equal(second.runsCreated, 1);
      assert.deepEqual(
        (await c.allocation.listRunsByImport(fresh)).map((run) => run.metadata.trigger),
        ["import"],
        "na 2ª passada a nova ganha o rateio",
      );
    } finally {
      await cleanup(c, ids);
    }
  });


  // -----------------------------------------------------------------------------------------------
  // E4/E4.1 — conserto único do §C7 10(3): P9 (publicação), P10 (janela), P11 (fila), C2-02/03/04 e R41-*
  // -----------------------------------------------------------------------------------------------

  function dbSpyLogger() {
    const warns: Array<[Record<string, unknown>, string]> = [];
    const errors: Array<[Record<string, unknown>, string]> = [];
    return {
      logger: {
        warn: (payload: Record<string, unknown>, message: string) => void warns.push([payload, message]),
        error: (payload: Record<string, unknown>, message: string) => void errors.push([payload, message]),
      },
      warns,
      errors,
    };
  }

  const OCT_START = new Date("2034-10-01T00:00:00.000Z");
  const OCT_END = new Date("2034-10-31T23:59:59.999Z");
  const NOV_START = new Date("2034-11-01T00:00:00.000Z");
  const NOV_END = new Date("2034-11-30T23:59:59.999Z");

  const CUR_HEADER =
    "bill/BillingPeriodStartDate,bill/BillingPeriodEndDate,lineItem/UsageStartDate,lineItem/UsageEndDate,lineItem/ProductCode,lineItem/UsageType,lineItem/Operation,product/region,lineItem/ResourceId,lineItem/UsageAmount,lineItem/UsageUnit,lineItem/UnblendedCost,lineItem/CurrencyCode,resourceTags/user:Project,resourceTags/user:Environment,resourceTags/user:Tenant,resourceTags/user:Module";

  test("T-E4-1-db · P9 — no Postgres, a varredura não regride o número publicado", async () => {
    const c = ctx!;
    const X = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-01T00:00:00.000Z" });
    const Y = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-02T00:00:00.000Z" });
    try {
      await seedLine(c, X, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      await seedLine(c, Y, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "130.000000");

      await c.trigger.ensureImportRuns(c.allocation, Y);
      await c.allocation.executeImportRuns(Y);
      const before = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(before.totalImportedCost, 130);
      assert.equal(before.importId, Y);

      await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
      await c.allocation.executeImportRuns(X);

      const after = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(after.totalImportedCost, 130, "o resumo continua na Y, a mais nova");
      assert.equal(after.importId, Y);
      const runsX = await c.allocation.listRunsByImport(X);
      assert.equal(runsX.length, 1, "a run de X existe");
      assert.equal(runsX[0]!.status, "completed", runsX[0]!.errorMessage);
    } finally {
      await cleanup(c, [X, Y]);
    }
  });

  test("T-E4-2-db · P9 — no Postgres, o manual de outubro sem importId publica Y; a varredura cria X e o resumo continua na manual", async () => {
    const c = ctx!;
    const X = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-01T00:00:00.000Z" });
    const Y = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-02T00:00:00.000Z" });
    try {
      await seedLine(c, X, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      await seedLine(c, Y, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "130.000000");

      const manual = await c.allocation.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(manual.metadata.importId, Y, "sem importId, o manual escolhe Y (a mais nova)");
      assert.equal(manual.totalImportedCost, 130);

      const result = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
      assert.equal(result.runsCreated, 1, "a varredura cria a run de X");
      await c.allocation.executeImportRuns(X);

      const after = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(after.runId, manual.id, "o resumo continua na run manual (130)");
      assert.equal(after.totalImportedCost, 130);
    } finally {
      await cleanup(c, [X, Y]);
    }
  });


  test("T-E4-3-db · P11 — no Postgres, o gancho cai no 2º mês e a varredura completa; no reenvio, novembro publica Y", async () => {
    const c = ctx!;

    // (a) SONDA F: só outubro nasce no gancho; a varredura completa novembro.
    {
      const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-01-01T00:00:00.000Z" });
      try {
        await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
        await seedLine(c, importId, "2034-11-01T00:00:00.000Z", "2034-12-01T00:00:00.000Z", "30.000000");
        const costImport = await c.allocation.findImportForAllocation(importId);
        assert.ok(costImport);

        let calls = 0;
        const flaky = Object.create(c.allocation) as typeof c.allocation;
        flaky.createImportRun = async (input: never) => {
          calls += 1;
          if (calls === 2) throw Object.assign(new Error("conexão caiu (simulado)"), { code: "P1017" });
          return c.allocation.createImportRun(input);
        };
        const hookResult = await c.trigger
          .buildCloudCostImportHook({ allocation: flaky, enqueue: async () => undefined })(costImport)
          .then(
            () => "ok",
            (error: { code?: string }) => `throw ${error.code}`,
          );
        assert.equal(hookResult, "throw P1017");
        const afterHook = await c.allocation.listRunsByImport(importId);
        assert.deepEqual(
          afterHook.map((run) => run.periodStart.toISOString().slice(0, 10)).sort(),
          ["2034-10-01"],
          "só outubro nasceu antes da varredura",
        );

        const sweep1 = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
        assert.equal(sweep1.runsCreated, 1, "a varredura cria o mês que faltou");
        const afterSweep = await c.allocation.listRunsByImport(importId);
        assert.deepEqual(
          afterSweep.map((run) => run.periodStart.toISOString().slice(0, 10)).sort(),
          ["2034-10-01", "2034-11-01"],
        );
      } finally {
        await cleanup(c, [importId]);
      }
    }

    // (b) V2: X publica out e nov; o gancho de Y cai em novembro; a varredura faz novembro publicar Y (45).
    {
      const X = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-02-01T00:00:00.000Z" });
      const Y = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-02-02T00:00:00.000Z" });
      try {
        await seedLine(c, X, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
        await seedLine(c, X, "2034-11-01T00:00:00.000Z", "2034-12-01T00:00:00.000Z", "30.000000");
        await seedLine(c, Y, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "110.000000");
        await seedLine(c, Y, "2034-11-01T00:00:00.000Z", "2034-12-01T00:00:00.000Z", "45.000000");

        await c.trigger.ensureImportRuns(c.allocation, X);
        await c.allocation.executeImportRuns(X);
        const xNov = await c.allocation.getAllocationSummary({ periodStart: NOV_START, periodEnd: NOV_END });
        assert.equal(xNov.totalImportedCost, 30);
        assert.equal(xNov.importId, X);

        let calls = 0;
        const flaky = Object.create(c.allocation) as typeof c.allocation;
        flaky.createImportRun = async (input: never) => {
          calls += 1;
          if (calls === 2) throw Object.assign(new Error("conexão caiu (simulado)"), { code: "P1017" });
          return c.allocation.createImportRun(input);
        };
        const costImportY = await c.allocation.findImportForAllocation(Y);
        assert.ok(costImportY);
        const hookResult = await c.trigger
          .buildCloudCostImportHook({ allocation: flaky, enqueue: async () => undefined })(costImportY)
          .then(
            () => "ok",
            (error: { code?: string }) => `throw ${error.code}`,
          );
        assert.equal(hookResult, "throw P1017");
        await c.allocation.executeImportRuns(Y);

        for (let index = 0; index < 3; index += 1) {
          await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
          await c.allocation.executeImportRuns(Y);
        }

        const yNov = await c.allocation.getAllocationSummary({ periodStart: NOV_START, periodEnd: NOV_END });
        assert.equal(yNov.totalImportedCost, 45, "novembro passa a publicar Y, o arquivo mais novo");
        assert.equal(yNov.importId, Y);
      } finally {
        await cleanup(c, [X, Y]);
      }
    }
  });


  test("T-E4-3b-db · P11 — no Postgres, a própria varredura cai no 2º mês: failed/1 e a 2ª passada completa e marca done", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      await seedLine(c, importId, "2034-11-01T00:00:00.000Z", "2034-12-01T00:00:00.000Z", "30.000000");

      let calls = 0;
      const flaky = Object.create(c.allocation) as typeof c.allocation;
      flaky.createImportRun = async (input: never) => {
        calls += 1;
        if (calls === 2) throw Object.assign(new Error("conexão caiu (simulado)"), { code: "P1017" });
        return c.allocation.createImportRun(input);
      };

      const sweep1 = await c.trigger.runImportCatchUp({ allocation: flaky, enqueue: async () => undefined });
      assert.equal(sweep1.importsFailed, 1);
      const mark1 = (await c.admin.cloudCostImport.findUnique({ where: { id: importId } }))!.metadata.autoAllocationSweep as {
        status: string;
        attempts: number;
      };
      assert.deepEqual({ status: mark1.status, attempts: mark1.attempts }, { status: "failed", attempts: 1 });

      const sweep2 = await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
      const after = await c.allocation.listRunsByImport(importId);
      assert.deepEqual(
        after.map((run) => run.periodStart.toISOString().slice(0, 10)).sort(),
        ["2034-10-01", "2034-11-01"],
        "a 2ª passada completa o mês que faltou",
      );
      const mark2 = (await c.admin.cloudCostImport.findUnique({ where: { id: importId } }))!.metadata.autoAllocationSweep as {
        status: string;
        attempts: number;
      };
      assert.deepEqual({ status: mark2.status, attempts: mark2.attempts }, { status: "done", attempts: 0 });
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E4-5-db · P10 — no Postgres, os dois formatos de fim do mesmo mês viram 1 run (130)", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-10-31T23:59:59.999Z", "30.000000");
      await c.trigger.ensureImportRuns(c.allocation, importId);
      const runs = await c.allocation.listRunsByImport(importId);
      assert.equal(runs.length, 1, "1 run para o mesmo mês nos dois formatos de fim");
      await c.allocation.executeImportRuns(importId);
      const executed = await c.allocation.getAllocationRun(runs[0]!.id);
      assert.equal(executed.totalImportedCost, 130);
      const summary = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(summary.totalImportedCost, 130);
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E4-7-db · C2-02 — no Postgres, 3 falhas seguidas → failed/3 → fora da fila", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      const flaky = Object.create(c.allocation) as typeof c.allocation;
      flaky.createImportRun = async () => {
        throw Object.assign(new Error("conexão caiu (simulado)"), { code: "P1017" });
      };

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const result = await c.trigger.runImportCatchUp({ allocation: flaky, enqueue: async () => undefined });
        assert.equal(result.importsFailed, 1);
        const mark = (await c.admin.cloudCostImport.findUnique({ where: { id: importId } }))!.metadata.autoAllocationSweep as {
          status: string;
          attempts: number;
        };
        assert.deepEqual({ status: mark.status, attempts: mark.attempts }, { status: "failed", attempts: attempt });
      }

      const fourth = await c.trigger.runImportCatchUp({ allocation: flaky, enqueue: async () => undefined });
      assert.equal(fourth.importsScanned, 0, "failed/3 sai da fila");
    } finally {
      await cleanup(c, [importId]);
    }
  });


  test("T-E4-8-db · C2-03 — no Postgres, markImportSweep preserva o metadata de quem chamou byte a byte", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 1 });
    try {
      await c.admin.cloudCostImport.update({
        where: { id: importId },
        data: { metadata: { block: "B-ASS-09a", autoAllocation: "v1", duplicateRowsSkipped: 7, note: "chave-de-quem-chamou" } },
      });
      await c.allocation.markImportSweep(importId, { status: "done", attempts: 0, at: "2034-01-01T00:00:00.000Z" });
      const after = await c.admin.cloudCostImport.findUnique({ where: { id: importId } });
      assert.equal(after!.metadata.autoAllocation, "v1");
      assert.equal(after!.metadata.duplicateRowsSkipped, 7);
      assert.equal(after!.metadata.note, "chave-de-quem-chamou");
      assert.deepEqual(after!.metadata.autoAllocationSweep, { status: "done", attempts: 0, at: "2034-01-01T00:00:00.000Z" });
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E4-9-db · C2-04 — no Postgres, markImportSweep não toca importação processing", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "processing", marker: true });
    try {
      await c.allocation.markImportSweep(importId, { status: "done", attempts: 0, at: "2034-01-01T00:00:00.000Z" });
      const after = await c.admin.cloudCostImport.findUnique({ where: { id: importId } });
      assert.equal(after!.metadata.autoAllocationSweep, undefined, "a marca não é gravada em processing");
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E41-1-db · R41-01(a) — no Postgres, a importação com linha invertida falha no parser, sem linhas nem runs", async () => {
    const c = ctx!;
    const row = (start: string, end: string, cost: string): string =>
      `${start},${end},,,AmazonEC2,BoxUsage,RunInstances,us-east-1,i-x,1,Hrs,${cost},USD,ERP,prod,tenant-a,compute`;
    const csv = [CUR_HEADER, row("2034-10-01T00:00:00Z", "2034-11-01T00:00:00Z", "110"), row("2034-09-15T00:00:00Z", "2034-09-01T00:00:00Z", "1"), row("2034-11-01T00:00:00Z", "2034-12-01T00:00:00Z", "45")].join("\n");
    const imported = await c.plainCosts.importAwsCurCsv({ csv, sourceType: "manual_csv" });
    try {
      assert.equal(imported.status, "failed");
      assert.match(imported.errorMessage ?? "", /at row 3/);
      assert.equal(await c.admin.cloudCostLineItem.count({ where: { import_id: imported.id } }), 0, "0 linhas");
      assert.equal((await c.allocation.listRunsByImport(imported.id)).length, 0, "0 runs");
    } finally {
      await cleanup(c, [imported.id]);
    }
  });

  test("T-E41-2-db · R41-01(b) — no Postgres, a guarda fecha: par invertido injetado por API Prisma não gera run", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 3, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "110.000000");
      await seedLine(c, importId, "2034-11-01T00:00:00.000Z", "2034-12-01T00:00:00.000Z", "45.000000");
      await seedLine(c, importId, "2034-12-01T00:00:00.000Z", "2035-01-01T00:00:00.000Z", "1.000000");
      // DP542-01 — injeta o par invertido pela API Prisma (Date), nunca por literal SQL UTC.
      const updated = await c.admin.cloudCostLineItem.updateMany({
        where: { import_id: importId, billing_period_start: new Date("2034-12-01T00:00:00.000Z") },
        data: { billing_period_start: new Date("2035-01-20T00:00:00.000Z") },
      });
      assert.equal(updated.count, 1, "a injeção por API Prisma afetou exatamente 1 linha");

      const { logger, errors } = dbSpyLogger();
      const result = await c.trigger.ensureImportRuns(c.allocation, importId, { logger });
      assert.deepEqual(result, { outcome: "invalid_periods", created: 0, pendingCount: 0 });
      assert.equal((await c.allocation.listRunsByImport(importId)).length, 0, "0 runs");
      assert.deepEqual(
        errors.map(([payload, message]) => [message, Object.keys(payload).sort()] as const),
        [["cloud_cost_auto_allocation_skipped_invalid_period", ["importId", "invalidPeriods"]]],
      );
      const after = await c.admin.cloudCostImport.findUnique({ where: { id: importId } });
      const sweep = after!.metadata.autoAllocationSweep as { status: string };
      assert.equal(sweep.status, "done", "a marca fica done");
    } finally {
      await cleanup(c, [importId]);
    }
  });


  test("T-E41-3-db · R41-02 — no Postgres, no empate de imported_at, a varredura não troca o número publicado (duas ordens)", async () => {
    const c = ctx!;
    const TIE = "2000-01-05T00:00:00.000Z";

    // (i) X com gancho caído, Y publica 130; a varredura cria X e o resumo continua 130 (Y).
    {
      const X = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: TIE });
      const Y = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: TIE });
      try {
        await seedLine(c, X, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
        await seedLine(c, Y, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "130.000000");
        await c.trigger.ensureImportRuns(c.allocation, Y);
        await c.allocation.executeImportRuns(Y);
        const before = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
        assert.equal(before.totalImportedCost, 130);
        assert.equal(before.importId, Y);

        await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
        await c.allocation.executeImportRuns(X);
        const after = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
        assert.equal(after.totalImportedCost, 130, "o resumo continua em Y");
        assert.equal(after.importId, Y);
      } finally {
        await cleanup(c, [X, Y]);
      }
    }

    // (ii) Y com gancho caído, X publica 100; a varredura cria Y e o resumo continua 100 (X).
    {
      const X = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: TIE });
      const Y = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: TIE });
      try {
        await seedLine(c, X, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
        await seedLine(c, Y, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "130.000000");
        await c.trigger.ensureImportRuns(c.allocation, X);
        await c.allocation.executeImportRuns(X);
        const before = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
        assert.equal(before.totalImportedCost, 100);
        assert.equal(before.importId, X);

        await c.trigger.runImportCatchUp({ allocation: c.allocation, enqueue: async () => undefined });
        await c.allocation.executeImportRuns(Y);
        const after = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
        assert.equal(after.totalImportedCost, 100, "o resumo continua em X");
        assert.equal(after.importId, X);
      } finally {
        await cleanup(c, [X, Y]);
      }
    }
  });

  test("T-E41-4-db · R41-03 — no Postgres, fim exclusivo e fim só com data do mesmo mês dão 1 run de 130", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 2, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-11-01T00:00:00.000Z", "100.000000");
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-10-31T00:00:00.000Z", "30.000000");
      await c.trigger.ensureImportRuns(c.allocation, importId);
      const runs = await c.allocation.listRunsByImport(importId);
      assert.equal(runs.length, 1, "1 run para o mesmo mês nos dois formatos de fim");
      assert.equal(runs[0]!.periodStart.toISOString(), "2034-10-01T00:00:00.000Z");
      assert.equal(runs[0]!.periodEnd.toISOString(), "2034-10-31T23:59:59.999Z");
      await c.allocation.executeImportRuns(importId);
      const executed = await c.allocation.getAllocationRun(runs[0]!.id);
      assert.equal(executed.totalImportedCost, 130);
      const summary = await c.allocation.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
      assert.equal(summary.totalImportedCost, 130);
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E41-4b-db · R41-03 — no Postgres, o fim só com data cobre o dia inteiro: periodEnd 23:59:59.999", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 1, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      await seedLine(c, importId, "2034-10-01T00:00:00.000Z", "2034-10-31T00:00:00.000Z", "30.000000");
      await c.trigger.ensureImportRuns(c.allocation, importId);
      const runs = await c.allocation.listRunsByImport(importId);
      assert.equal(runs.length, 1);
      assert.equal(runs[0]!.periodEnd.toISOString(), "2034-10-31T23:59:59.999Z");
    } finally {
      await cleanup(c, [importId]);
    }
  });

  test("T-E41-5-db · R41-04 — no Postgres, 13 meses × 2 formatos = 26 pares e 13 janelas: 13 runs", async () => {
    const c = ctx!;
    const importId = await seedImport(c, { status: "completed", marker: true, rowCount: 26, importedAt: "2000-01-01T00:00:00.000Z" });
    try {
      for (let month = 0; month < 13; month += 1) {
        const start = new Date(Date.UTC(2034, month, 1));
        const next = new Date(Date.UTC(2034, month + 1, 1));
        const last = new Date(Date.UTC(2034, month + 1, 0));
        await seedLine(c, importId, start.toISOString(), next.toISOString(), "1.000000");
        await seedLine(c, importId, start.toISOString().slice(0, 10), last.toISOString().slice(0, 10), "1.000000");
      }
      const result = await c.trigger.ensureImportRuns(c.allocation, importId);
      assert.equal(result.created, 13, "13 janelas, não 26 pares");
      const runs = await c.allocation.listRunsByImport(importId);
      assert.equal(runs.length, 13);
    } finally {
      await cleanup(c, [importId]);
    }
  });

}

// -----------------------------------------------------------------------------------------------
// Arnês
// -----------------------------------------------------------------------------------------------

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const role = await createEphemeralRole(admin, connection);
  const attributes = (await admin.$queryRawUnsafe(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    role.roleName,
  )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(attributes, [{ rolsuper: false, rolbypassrls: false }], "o código sob teste roda SEM superusuário e SEM bypass de RLS");

  // O cliente global da aplicação (`src/database/prisma.ts`) passa a ser o do papel, antes de qualquer import dela.
  (globalThis as { prisma?: unknown }).prisma = role.client;

  const [repositoryModule, serviceModule, trigger, engine, costs, costRepositoryModule] = await Promise.all([
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.import-trigger.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.js"),
    import("../src/modules/cloud-costs/aws-cur.service.js"),
    import("../src/modules/cloud-costs/aws-cur-prisma.repository.js"),
  ]);
  const allocationRepository = new repositoryModule.PrismaCloudCostAllocationRepository(role.client);
  const allocation = new serviceModule.CloudCostAllocationService(allocationRepository);
  // Importação SEM gancho (o caminho que o T1-db não cobre): semeia importação e linhas pelo código real, sob o papel.
  const plainCosts = new costs.CloudCostService(new costRepositoryModule.PrismaCloudCostRepository(role.client));
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-ASS-09a ${suffix}`, slug: `ass09a-${suffix}` } });

  /** A fixture do repositório na janela própria (2026 → 2033) e com a tag da organização desta suíte. */
  const fixture = (name: string, keepRow: (row: string) => boolean = () => true): string => {
    const [header, ...rows] = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
      .replace(/\r\n/g, "\n")
      .trim()
      .split("\n");
    const moved = rows.map((row) => row.replaceAll("2026-", "2033-").replace(",tenant-a,", `,${tenant.slug},`));
    return [header, ...moved.filter(keepRow)].join("\n");
  };

  return {
    admin,
    role,
    allocationRepository,
    allocation,
    CloudCostAllocationService: serviceModule.CloudCostAllocationService,
    trigger,
    engine,
    costs,
    plainCosts,
    tenant,
    suffix,
    fixture,
    async close(): Promise<void> {
      try {
        await admin.tenantCloudCostAllocation.deleteMany({ where: { tenant_id: tenant.id } });
        await admin.tenant.delete({ where: { id: tenant.id } });
        await role.drop();
      } finally {
        await admin.$disconnect();
      }
    },
  };
}

async function importWithoutHook(c: Ctx, name: string, keepRow?: (row: string) => boolean): Promise<string> {
  const imported = await c.plainCosts.importAwsCurCsv({ csv: c.fixture(name, keepRow) });
  assert.equal(imported.status, "completed", imported.errorMessage);
  return imported.id;
}

async function seedImport(
  c: Ctx,
  input: { status: string; marker: boolean; rowCount?: number; importedAt?: string },
): Promise<string> {
  const id = randomUUID();
  await c.admin.cloudCostImport.create({
    data: {
      id,
      provider: "aws",
      source_type: "manual_csv",
      status: input.status,
      imported_at: input.importedAt ? new Date(input.importedAt) : new Date(),
      row_count: input.rowCount ?? 0,
      total_unblended_cost: "0",
      currency: "USD",
      metadata: input.marker ? { block: "B-ASS-09a", autoAllocation: "v1" } : { block: "B-ASS-09a" },
    },
  });
  return id;
}

async function seedLine(c: Ctx, importId: string, start: string, end: string, cost: string): Promise<void> {
  await c.admin.cloudCostLineItem.create({
    data: {
      import_id: importId,
      provider: "aws",
      billing_period_start: new Date(start),
      billing_period_end: new Date(end),
      service_code: "AmazonEC2",
      usage_type: "BoxUsage",
      tenant_tag: c.tenant.slug,
      unblended_cost: cost,
      currency: "USD",
      raw_line_hash: `${c.suffix}-${importId}-${start}-${end}`,
      metadata: {},
    },
  });
}

async function runImportColumn(c: Ctx, runId: string): Promise<string | null> {
  const rows = (await c.admin.$queryRawUnsafe(
    `SELECT import_id::text AS "importId" FROM cloud_cost_allocation_runs WHERE id = $1::uuid`,
    runId,
  )) as Array<{ importId: string | null }>;
  assert.equal(rows.length, 1);
  return rows[0]!.importId;
}

/**
 * Barreira determinística: o admin abre uma transação e trava uma linha (`lockSql`, com `FOR UPDATE`); `work` dispara as
 * operações do papel; espera até `waiters` statements DESTE PAPEL (nome único por processo) estarem bloqueados num lock
 * com o verbo `verb`; só então solta a transação. Nunca relógio.
 */
async function holdRowThenRelease<T>(c: Ctx, lockSql: string, waiters: number, verb: string, work: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let locked!: () => void;
  const lockTaken = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const holder = c.admin.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(lockSql);
      locked();
      await released;
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
  await lockTaken;
  const pending = work();
  try {
    await waitForRoleBlocked(c, waiters, verb);
  } finally {
    release();
    await holder;
  }
  return pending;
}

async function waitForRoleBlocked(c: Ctx, waiters: number, verb: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const rows = (await c.admin.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE usename = $1 AND wait_event_type = 'Lock' AND state = 'active'
          AND query ILIKE '%cloud_cost_allocation_runs%' AND query ILIKE $2`,
      c.role.roleName,
      `%${verb}%`,
    )) as Array<{ n: number }>;
    if (rows[0]!.n >= waiters) return;
    if (Date.now() > deadline) assert.fail(`barreira: ${rows[0]!.n} de ${waiters} statements ${verb} do papel bloqueados`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/** Limpeza escopada: as runs (e alocações) das importações do teste, depois as importações (as linhas caem em cascata). */
async function cleanup(c: Ctx, importIds: readonly string[], extraRunIds: readonly string[] = []): Promise<void> {
  if (importIds.length === 0 && extraRunIds.length === 0) return;
  const runs = await c.admin.cloudCostAllocationRun.findMany({
    where: {
      OR: [
        { import_id: { in: [...importIds] } },
        { id: { in: [...extraRunIds] } },
        ...importIds.map((importId) => ({ metadata: { path: ["importId"], equals: importId } })),
      ],
    },
    select: { id: true },
  });
  const runIds = runs.map((run) => run.id);
  await c.admin.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: { in: runIds } } });
  await c.admin.cloudCostAllocationRun.deleteMany({ where: { id: { in: runIds } } });
  await c.admin.cloudCostImport.deleteMany({ where: { id: { in: [...importIds] } } });
}
