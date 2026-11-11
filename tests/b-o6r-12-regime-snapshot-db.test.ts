import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { PrismaChargeRepository } from "../src/modules/charging/charge-prisma.repository.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-O6R-12 snapshot exige DATABASE_URL", { skip: "Defina DATABASE_URL para a suíte -db." });
} else {
  test("B-O6R-12 C4/C5/C6/C16: banco carimba payload, congela regime e mantém 23503", async () => {
    const { Client } = await import("pg");
    const db = new Client({ connectionString });
    await db.connect();
    const slug = `b12-${randomUUID().slice(0, 8)}`;
    let tenantId = "";
    try {
      const columns = await db.query<{ column_name: string; is_nullable: string }>(
        `SELECT column_name, is_nullable FROM information_schema.columns
          WHERE table_schema='public' AND table_name='impound_processes' AND column_name LIKE 'regime_%'`,
      );
      assert.equal(columns.rowCount, 9);
      assert.equal(columns.rows.filter((row) => row.column_name !== "regime_daily_service_catalog_id").every((row) => row.is_nullable === "NO"), true);

      tenantId = (await db.query<{ id: string }>(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, [slug])).rows[0]!.id;
      const profileId = (
        await db.query<{ id: string }>(
          `INSERT INTO jurisdiction_profiles
            (tenant_id,name,scope,owner_notif_days,notice_edict_day,auction_eligible_day,auction_edict_business_days,daily_model,daily_cap,release_requirements)
           VALUES ($1,'Perfil','PUBLIC_AGREEMENT',5,10,60,15,'ROLLING_24H','SIX_MONTHS','[]'::jsonb) RETURNING id`,
          [tenantId],
        )
      ).rows[0]!.id;
      const process = (
        await db.query<{ id: string; regime_daily_cap: string }>(
          `INSERT INTO impound_processes
            (tenant_id,profile_id,vehicle_unidentified,unidentified_reason,status,origin_authority,regime_daily_cap)
           VALUES ($1,$2,true,'Teste B-O6R-12','IN_REMOVAL','Órgão','UNLIMITED') RETURNING id,regime_daily_cap`,
          [tenantId, profileId],
        )
      ).rows[0]!;
      assert.equal(process.regime_daily_cap, "SIX_MONTHS");
      await assert.rejects(
        db.query(`UPDATE impound_processes SET regime_daily_cap='UNLIMITED' WHERE id=$1`, [process.id]),
        (error: unknown) => (error as { code?: string }).code === "23514",
      );
      await assert.rejects(
        db.query(
          `INSERT INTO impound_processes (tenant_id,profile_id,vehicle_unidentified,unidentified_reason,status,origin_authority)
           VALUES ($1,$2,true,'Teste B-O6R-12','IN_REMOVAL','Órgão')`,
          [tenantId, randomUUID()],
        ),
        (error: unknown) => (error as { code?: string }).code === "23503",
      );
    } finally {
      if (tenantId) {
        await db.query(`DELETE FROM impound_processes WHERE tenant_id=$1`, [tenantId]);
        await db.query(`DELETE FROM jurisdiction_profiles WHERE tenant_id=$1`, [tenantId]);
        await db.query(`DELETE FROM tenants WHERE id=$1`, [tenantId]);
      }
      await db.end();
    }
  });

  test("B-O6R-12 C17: papel NOSUPERUSER NOBYPASSRLS carimba o regime certo", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const slug = `b12-role-${randomUUID().slice(0, 8)}`;
    const tenant = (await admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name,slug) VALUES ($1,$1) RETURNING id`, slug))[0]!;
    const profile = (
      await admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO jurisdiction_profiles
          (tenant_id,name,scope,owner_notif_days,notice_edict_day,auction_eligible_day,auction_edict_business_days,daily_model,daily_cap,release_requirements)
         VALUES ($1::uuid,'Perfil runtime','PUBLIC_AGREEMENT',5,10,60,15,'ROLLING_24H','SIX_MONTHS','[]'::jsonb) RETURNING id`,
        tenant.id,
      )
    )[0]!;
    const role = await createEphemeralRole(admin, connectionString);
    try {
      const row = await role.client.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;
        return (
          await tx.$queryRawUnsafe<Array<{ regime_daily_cap: string }>>(
            `INSERT INTO impound_processes
              (tenant_id,profile_id,vehicle_unidentified,unidentified_reason,status,origin_authority,regime_daily_cap)
             VALUES ($1::uuid,$2::uuid,true,'Teste runtime','IN_REMOVAL','Órgão','UNLIMITED')
             RETURNING regime_daily_cap`,
            tenant.id,
            profile.id,
          )
        )[0]!;
      });
      assert.equal(row.regime_daily_cap, "SIX_MONTHS");
    } finally {
      await role.drop();
      await admin.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id=$1::uuid`, tenant.id);
      await admin.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id=$1::uuid`, tenant.id);
      await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id=$1::uuid`, tenant.id);
      await admin.$disconnect();
    }
  });

  test("B-O6R-12 C1-C3/C12-C13: cobrança lê teto/modelo/escopo e ponteiro do retrato", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const slug = `b12-charge-${randomUUID().slice(0, 8)}`;
    const tenant = (await admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name,slug) VALUES ($1,$1) RETURNING id`, slug))[0]!;
    try {
      const profile = (
        await admin.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO jurisdiction_profiles
            (tenant_id,name,scope,owner_notif_days,notice_edict_day,auction_eligible_day,auction_edict_business_days,daily_model,daily_cap,release_requirements)
           VALUES ($1::uuid,'Perfil cobrança','PUBLIC_AGREEMENT',5,10,60,15,'ROLLING_24H','SIX_MONTHS','[]'::jsonb) RETURNING id`,
          tenant.id,
        )
      )[0]!;
      const process1 = (
        await admin.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO impound_processes (tenant_id,profile_id,vehicle_unidentified,unidentified_reason,status,origin_authority,entered_at)
           VALUES ($1::uuid,$2::uuid,true,'Teste cobrança','ACTIVE_CUSTODY','Órgão',now()) RETURNING id`,
          tenant.id,
          profile.id,
        )
      )[0]!;
      await admin.$executeRawUnsafe(
        `UPDATE jurisdiction_profiles SET scope='PRIVATE_CONTRACT',daily_model='CALENDAR',daily_cap='UNLIMITED' WHERE id=$1::uuid`,
        profile.id,
      );
      const repo = new PrismaChargeRepository(admin);
      const frozen = await repo.loadAccrualContext(tenant.id, process1.id);
      assert.equal(frozen?.scope, "PUBLIC_AGREEMENT");
      assert.equal(frozen?.model, "ROLLING_24H");
      assert.equal(frozen?.cap, "SIX_MONTHS");

      const service1 = (
        await admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO service_catalog (tenant_id,name) VALUES ($1::uuid,'Diária 1') RETURNING id`, tenant.id)
      )[0]!;
      await admin.$executeRawUnsafe(`UPDATE jurisdiction_profiles SET daily_service_catalog_id=$1::uuid WHERE id=$2::uuid`, service1.id, profile.id);
      assert.equal((await repo.loadAccrualContext(tenant.id, process1.id))?.dailyServiceCatalogId, service1.id);

      const process2 = (
        await admin.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO impound_processes (tenant_id,profile_id,vehicle_unidentified,unidentified_reason,status,origin_authority,entered_at)
           VALUES ($1::uuid,$2::uuid,true,'Teste ponteiro','ACTIVE_CUSTODY','Órgão',now()) RETURNING id`,
          tenant.id,
          profile.id,
        )
      )[0]!;
      const service2 = (
        await admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO service_catalog (tenant_id,name) VALUES ($1::uuid,'Diária 2') RETURNING id`, tenant.id)
      )[0]!;
      await admin.$executeRawUnsafe(`UPDATE jurisdiction_profiles SET daily_service_catalog_id=$1::uuid WHERE id=$2::uuid`, service2.id, profile.id);
      assert.equal((await repo.loadAccrualContext(tenant.id, process2.id))?.dailyServiceCatalogId, service1.id);
    } finally {
      await admin.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id=$1::uuid`, tenant.id);
      await admin.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id=$1::uuid`, tenant.id);
      await admin.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id=$1::uuid`, tenant.id);
      await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id=$1::uuid`, tenant.id);
      await admin.$disconnect();
    }
  });
}
