import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — A14 / A24 / R-res-5 do plano v3 contra o PostgreSQL REAL: o agregado somado em SQL sobre Decimal(12,2)
// tem PARIDADE com o da memória (mesmos lançamentos, centavos adversariais, deletado de fora, filtros), o mensal
// somado por conta é IGUAL ao `cashFlow` do resumo, e duas organizações na mesma base veem só os seus lançamentos.
// A virada de fuso fica em `tests/b-san3-12a-aggregate-tz-db.test.ts`.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-12a agregado (paridade) exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL e aplique as migrations." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const FIXTURE = [
    { acc: 0, direction: "in", amount: 0.1, at: "2026-09-29T10:00:00-03:00" },
    { acc: 0, direction: "in", amount: 0.2, at: "2026-09-29T11:00:00-03:00" },
    { acc: 0, direction: "out", amount: 0.3, at: "2026-09-30T23:59:00-03:00" },
    { acc: 1, direction: "in", amount: 1234.56, at: "2026-10-01T00:00:30-03:00" },
    { acc: 1, direction: "out", amount: 0.07, at: "2026-10-15T12:00:00-03:00" },
    { acc: 0, direction: "in", amount: 99999.99, at: "2026-10-31T23:30:00-03:00" },
    { acc: 1, direction: "out", amount: 33.33, at: "2026-11-01T00:10:00-03:00" },
  ] as const;

  test("A14 (db): paridade memória × Prisma — none/month/day, com e sem filtros; deletado não conta", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a14");
      const memory = new h.entries.InMemoryFinancialEntryRepository();
      for (const row of FIXTURE) {
        const occurredAt = new Date(row.at);
        const input = {
          tenantId: s.tenantId, accountId: s.accounts[row.acc]!, direction: row.direction, amount: row.amount, currency: "BRL",
          paymentMethod: "pix", occurredAt, competencia: h.deriveCompetencia(occurredAt),
        };
        await h.entryService.create(s.actor, { account_id: input.accountId, direction: row.direction, amount: row.amount, payment_method: "pix", occurred_at: row.at });
        await memory.create(input);
      }
      const gone = await h.entryService.create(s.actor, { account_id: s.accounts[0], direction: "in", amount: 5000, payment_method: "pix", occurred_at: "2026-10-02T12:00:00-03:00" });
      await h.entryService.delete(s.actor, gone.id);
      const memoryService = new h.entries.FinancialEntryService(memory, h.noPeriods, h.noAccounts, h.titles.createDefaultFinancialTitleService, undefined, undefined, { aggregateReader: memory });
      const actor = s.actor;
      const queries: Record<string, unknown>[] = [
        { group_by: "none" },
        { group_by: "none", reconciled: "false" },
        { group_by: "none", direction: "out" },
        { group_by: "none", account_id: s.accounts[1] },
        { group_by: "month", from: "2026-09-01", to: "2026-11-30" },
        { group_by: "day", from: "2026-09-28", to: "2026-11-02" },
        { group_by: "day", from: "2026-10-01", to: "2026-10-31", account_id: s.accounts[0] },
      ];
      for (const query of queries) {
        const fromDb = await h.entryService.aggregate(actor, query);
        const fromMemory = await memoryService.aggregate(actor, query);
        assert.deepEqual(fromDb.items, fromMemory.items, `paridade em ${JSON.stringify(query)}`);
      }
      const total = await h.entryService.aggregate(actor, { group_by: "none" });
      assert.deepEqual(total.items, [{ bucket: null, count: 7, inflow: 101234.85, outflow: 33.7, net: 101201.15 }], "oráculo independente (somado à mão)");
    } finally {
      await teardown(h);
    }
  });

  test("A24 (db): Σ por conta do agregado mensal == cashFlow do resumo, mês a mês, sobre os mesmos lançamentos", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a24");
      const now = new Date();
      const competencia = h.deriveCompetencia(now);
      const [y, m] = competencia.split("-").map(Number);
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      const rows = [
        { acc: 0, direction: "in", amount: 10.1, at: `${prev}-28T23:30:00-03:00` },
        { acc: 1, direction: "in", amount: 0.2, at: `${competencia}-01T00:30:00-03:00` },
        { acc: 0, direction: "out", amount: 3.3, at: `${competencia}-01T01:00:00-03:00` },
      ];
      for (const row of rows) {
        await h.entryService.create(s.actor, { account_id: s.accounts[row.acc], direction: row.direction, amount: row.amount, payment_method: "pix", occurred_at: row.at });
      }
      const summed = new Map<string, { inflow: number; outflow: number }>();
      for (const account of s.accounts) {
        const result = await h.entryService.aggregate(s.actor, { group_by: "month", account_id: account });
        for (const item of result.items) {
          const b = summed.get(item.bucket!) ?? { inflow: 0, outflow: 0 };
          b.inflow = Math.round((b.inflow + item.inflow) * 100) / 100;
          b.outflow = Math.round((b.outflow + item.outflow) * 100) / 100;
          summed.set(item.bucket!, b);
        }
      }
      const summary = await (await h.summary.createDefaultFinancialSummaryService()).getSummary(s.actor);
      for (const point of summary.cashFlow) {
        assert.deepEqual(summed.get(point.competencia) ?? { inflow: 0, outflow: 0 }, { inflow: point.inflow, outflow: point.outflow }, point.competencia);
      }
    } finally {
      await teardown(h);
    }
  });

  test("R-res-5 (db): duas organizações na mesma base — o agregado de cada uma vê só os seus lançamentos (none e day)", async () => {
    const h = await bootstrap();
    try {
      const a = await seed(h, "rres5-a");
      const b = await seed(h, "rres5-b");
      await h.entryService.create(a.actor, { account_id: a.accounts[0], direction: "in", amount: 11, payment_method: "pix", occurred_at: "2026-10-10T12:00:00-03:00" });
      await h.entryService.create(b.actor, { account_id: b.accounts[0], direction: "in", amount: 22, payment_method: "pix", occurred_at: "2026-10-10T12:00:00-03:00" });
      const ofA = await h.entryService.aggregate(a.actor, { group_by: "day", from: "2026-10-01", to: "2026-10-31" });
      const ofB = await h.entryService.aggregate(b.actor, { group_by: "none" });
      assert.deepEqual(ofA.items, [{ bucket: "2026-10-10", count: 1, inflow: 11, outflow: 0, net: 11 }]);
      assert.deepEqual(ofB.items, [{ bucket: null, count: 1, inflow: 22, outflow: 0, net: 22 }]);
      const foreignAccount = await h.entryService.aggregate(a.actor, { account_id: b.accounts[0] });
      assert.deepEqual(foreignAccount.items, [], "a conta de outra organização não devolve nada");
    } finally {
      await teardown(h);
    }
  });
}

// B-SAN3-12a, ciclo 2 — R-res-5-bis (C4-01): o R-res-5 acima roda sob o papel da CI (superusuário, BYPASSRLS), que nunca vê a
// camada RLS — tirar o `withTenantRls` do agregado standalone (M5a) não deixava nada vermelho, porque o SQL também filtra
// tenant_id. Aqui o MESMO agregado roda pela standalone `RlsPrismaFinancialEntryRepository` sob um papel descartável SEM
// bypass (NOSUPERUSER, NOBYPASSRLS — criado pelo arnês `createEphemeralRole`, no lock de catálogo): com o `withTenantRls`
// cada organização vê só os seus (igual ao superusuário); sem ele (M5a) o GUC não existe, a RLS falha fechada e vem vazio.
if (connectionString) {
  test("R-res-5-bis (db, papel SEM bypass): o agregado standalone vê só os lançamentos da organização (none e day), igual ao superusuário; sem o contexto de RLS viria vazio", async (t) => {
    const h = await bootstrap();
    let role: { readonly roleName: string; readonly client: import("@prisma/client").PrismaClient; drop(): Promise<void> } | undefined;
    try {
      const caps = (await h.client.$queryRaw`SELECT rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user`) as Array<{ rolsuper: boolean; rolcreaterole: boolean }>;
      if (!caps[0]?.rolsuper && !caps[0]?.rolcreaterole) {
        t.skip("exige criar papel: a DATABASE_URL não tem rolsuper nem rolcreaterole");
        return;
      }
      const a = await seed(h, "rres5bis-a");
      const b = await seed(h, "rres5bis-b");
      await h.entryService.create(a.actor, { account_id: a.accounts[0], direction: "in", amount: 11, payment_method: "pix", occurred_at: "2026-10-10T12:00:00-03:00" });
      await h.entryService.create(b.actor, { account_id: b.accounts[0], direction: "in", amount: 22, payment_method: "pix", occurred_at: "2026-10-10T12:00:00-03:00" });

      const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
      role = await createEphemeralRole(h.client, process.env.DATABASE_URL!);
      const attrs = (await role.client.$queryRaw`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(attrs[0], { rolsuper: false, rolbypassrls: false }, "o papel da prova não contorna a RLS");

      const { RlsPrismaFinancialEntryRepository } = await import("../src/modules/financial-entries/financial-entry-prisma.repository.js");
      const underRole = new h.entries.FinancialEntryService(new h.entries.InMemoryFinancialEntryRepository(), h.noPeriods, h.noAccounts, h.titles.createDefaultFinancialTitleService, undefined, undefined, {
        aggregateReader: new RlsPrismaFinancialEntryRepository(role.client),
      });
      const queries: ReadonlyArray<readonly [typeof a, Record<string, unknown>]> = [
        [a, { group_by: "day", from: "2026-10-01", to: "2026-10-31" }],
        [a, { group_by: "none" }],
        [b, { group_by: "none" }],
        [a, { group_by: "none", account_id: b.accounts[0] }],
      ];
      for (const [who, query] of queries) {
        const fromRole = await underRole.aggregate(who.actor, query);
        const fromSuper = await h.entryService.aggregate(who.actor, query);
        assert.deepEqual(fromRole.items, fromSuper.items, `papel sem bypass × superusuário em ${JSON.stringify(query)}`);
      }
      assert.deepEqual((await underRole.aggregate(a.actor, { group_by: "day", from: "2026-10-01", to: "2026-10-31" })).items, [{ bucket: "2026-10-10", count: 1, inflow: 11, outflow: 0, net: 11 }]);
      assert.deepEqual((await underRole.aggregate(b.actor, { group_by: "none" })).items, [{ bucket: null, count: 1, inflow: 22, outflow: 0, net: 22 }]);
      assert.deepEqual((await underRole.aggregate(a.actor, { account_id: b.accounts[0] })).items, [], "a conta de outra organização não devolve nada");
    } finally {
      await role?.drop();
      await teardown(h);
    }
  });
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap() {
  const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls }, entries, titles, summary] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-summary/index.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  return {
    client,
    withTenantRls,
    entries,
    titles,
    summary,
    deriveCompetencia: titles.deriveCompetencia,
    entryService: await entries.createDefaultFinancialEntryService(),
    noPeriods: { isPeriodClosed: async () => false } as never,
    noAccounts: { findAccount: async () => undefined } as never,
    tenantIds: [] as string[],
  };
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro 12a", email: `${mark}@example.com` } }));
  const accounts: string[] = [];
  for (const n of [1, 2]) {
    const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${n} ${mark}`, kind: "bank", currency: "BRL", is_active: true } }));
    accounts.push(account.id);
  }
  return {
    tenantId: tenant.id,
    accounts,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: ["financial_entries:read" as const, "financial_entries:create" as const, "financial_entries:update" as const] },
  };
}

async function teardown(h: Harness): Promise<void> {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally {
    await h.client.$disconnect();
  }
}
