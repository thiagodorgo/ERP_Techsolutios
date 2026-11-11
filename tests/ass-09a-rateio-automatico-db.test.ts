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
            c.allocation.createImportRun({ importId, billingPeriodStart: start, billingPeriodEnd: end }),
            c.allocation.createImportRun({ importId, billingPeriodStart: start, billingPeriodEnd: end }),
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

async function seedImport(c: Ctx, input: { status: string; marker: boolean; rowCount?: number }): Promise<string> {
  const id = randomUUID();
  await c.admin.cloudCostImport.create({
    data: {
      id,
      provider: "aws",
      source_type: "manual_csv",
      status: input.status,
      imported_at: new Date(),
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
      raw_line_hash: `${c.suffix}-${importId}-${start}`,
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
