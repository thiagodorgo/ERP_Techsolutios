import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — A23 do plano v3 (R2-06) contra o PostgreSQL REAL: os buckets do agregado são do FUSO DO NEGÓCIO
// (America/Sao_Paulo), nunca UTC. O caso de virada: 2026-10-31T23:30-03:00 é 2026-11-01T02:30Z — tem de cair em
// `2026-10` (mês = a coluna `competencia`) e em `2026-10-31` (dia = `(occurred_at AT TIME ZONE …)::date`). E o
// filtro `from`/`to` é a data civil do negócio. A sessão do banco fica em UTC de propósito (a conversão é explícita).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-12a agregado (fuso) exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL e aplique as migrations." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  test("A23 (db): virada de mês e de dia no fuso do negócio — 2026-10-31T23:30-03:00 → 2026-10 e 2026-10-31; 2026-10-24T22:15-03:00 → 2026-10-24", async () => {
    const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls }, entries] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/config/env.js"),
      import("../src/database/rls.js"),
      import("../src/modules/financial-entries/index.js"),
    ]);
    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
    const mark = `tz-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const tenant = await client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
    try {
      const tz = (await client.$queryRaw`SELECT current_setting('TimeZone') AS tz`) as Array<{ tz: string }>;
      const user = await withTenantRls(client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Fin", email: `${mark}@example.com` } }));
      const account = await withTenantRls(client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true } }));
      const actor = { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: ["financial_entries:read" as const, "financial_entries:create" as const] };
      const service = await entries.createDefaultFinancialEntryService();
      await service.create(actor, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-10-31T23:30:00-03:00" });
      await service.create(actor, { account_id: account.id, direction: "in", amount: 7, payment_method: "pix", occurred_at: "2026-10-24T22:15:00-03:00" });

      const months = await service.aggregate(actor, { group_by: "month", from: "2026-09-01", to: "2026-11-30" });
      assert.deepEqual(months.items, [{ bucket: "2026-10", count: 2, inflow: 17, outflow: 0, net: 17 }], `sessão do banco em ${tz[0]?.tz}`);
      const days = await service.aggregate(actor, { group_by: "day", from: "2026-10-20", to: "2026-11-02" });
      assert.deepEqual(days.items.map((i) => [i.bucket, i.inflow]), [["2026-10-24", 7], ["2026-10-31", 10]]);
      const november = await service.aggregate(actor, { group_by: "day", from: "2026-11-01", to: "2026-11-02" });
      assert.deepEqual(november.items, [], "o filtro de datas é a data civil do negócio, não a UTC");
      const octoberLastDay = await service.aggregate(actor, { group_by: "none", from: "2026-10-31", to: "2026-10-31" });
      assert.deepEqual(octoberLastDay.items, [{ bucket: null, count: 1, inflow: 10, outflow: 0, net: 10 }]);
    } finally {
      await client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenant.id);
      await client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenant.id);
      await client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenant.id);
      await client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenant.id);
      await client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenant.id);
      await client.$disconnect();
    }
  });
}
