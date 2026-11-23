import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/database/prisma.js";
import { withTenantRls } from "../src/database/rls.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-PATIO-LEILAO-DIARIAS · DB-12 — drill da migração 20261123010000_add_impound_daily_suspensions.
// Prova, contra o banco aplicado: a tabela existe; o segundo período aberto no mesmo processo viola
// o índice único parcial; fim antes do início viola o CHECK; leitura de outra organização sob RLS
// FORCE devolve 0 linhas; e a migração não traz GRANT (as concessões vêm de scripts/db-runtime-role.sh).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "20261123010000_add_impound_daily_suspensions";
const TABLE = "impound_daily_suspensions";

const migrationSql = readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

const PROFILE_INSERT = `
  INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_model, daily_cap, required_photo_sets)
  VALUES ($1::uuid, 'Perfil', 'PUBLIC_AGREEMENT', 'ROLLING_24H', 'SIX_MONTHS', '["FRONT"]'::jsonb)
  RETURNING id`;

const PROCESS_INSERT = `
  INSERT INTO impound_processes
    (tenant_id, profile_id, regime_scope, regime_owner_notif_days, regime_notice_edict_day,
     regime_auction_eligible_day, regime_auction_edict_business_days, regime_daily_model, regime_daily_cap,
     regime_release_requirements, origin_authority, status, vehicle_unidentified, unidentified_reason)
  VALUES ($1::uuid, $2::uuid, 'PUBLIC_AGREEMENT', 10, 30, 60, 15, 'ROLLING_24H', 'SIX_MONTHS', '[]'::json, 'Autoridade', 'IN_REMOVAL', true, 'Placa adulterada')
  RETURNING id`;

if (!connectionString) {
  test("B-PATIO-LEILAO-DIARIAS · drill exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
  });
} else {
  test(`${MIGRATION}: tabela, índice único parcial, CHECK, RLS FORCE e zero GRANT`, async () => {
    assert.equal(/GRANT/i.test(migrationSql), false, "a migração não traz GRANT");

    const catalog = (await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = '${TABLE}') AS tables,
        (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = '${TABLE}' AND c.relrowsecurity AND c.relforcerowsecurity) AS forced,
        (SELECT count(*)::int FROM pg_policies WHERE tablename = '${TABLE}'
          AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS policies,
        (SELECT count(*)::int FROM pg_indexes WHERE tablename = '${TABLE}' AND indexname = '${TABLE}_open_idem_key') AS unique_partial,
        (SELECT count(*)::int FROM pg_constraint WHERE conname = '${TABLE}_ended_at_chk' AND contype = 'c') AS checks
    `)) as Array<{ tables: number; forced: number; policies: number; unique_partial: number; checks: number }>;

    assert.deepEqual(catalog[0], { tables: 1, forced: 1, policies: 1, unique_partial: 1, checks: 1 });
  });

  test(`${MIGRATION}: segundo período aberto viola o índice único; fim antes do início viola o CHECK`, async () => {
    const slug = `patio-diaria-${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const tenants = (await prisma.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slug,
    )) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;

    const profiles = (await prisma.$queryRawUnsafe(PROFILE_INSERT, tenantId)) as Array<{ id: string }>;
    const processes = (await prisma.$queryRawUnsafe(PROCESS_INSERT, tenantId, profiles[0]!.id)) as Array<{ id: string }>;
    const processId = processes[0]!.id;

    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE} (tenant_id, process_id, started_at, reason) VALUES ($1::uuid, $2::uuid, $3::timestamptz, 'AUCTION')`,
      tenantId,
      processId,
      new Date("2026-01-10T00:00:00Z"),
    );

    await assert.rejects(
      prisma.$executeRawUnsafe(
        `INSERT INTO ${TABLE} (tenant_id, process_id, started_at, reason) VALUES ($1::uuid, $2::uuid, $3::timestamptz, 'AUCTION')`,
        tenantId,
        processId,
        new Date("2026-01-11T00:00:00Z"),
      ),
      /23505|unique|duplicate/i,
      "segundo período aberto no mesmo processo viola o índice único parcial",
    );

    await assert.rejects(
      prisma.$executeRawUnsafe(
        `INSERT INTO ${TABLE} (tenant_id, process_id, started_at, ended_at, reason) VALUES ($1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz, 'AUCTION')`,
        tenantId,
        processId,
        new Date("2026-01-20T00:00:00Z"),
        new Date("2026-01-10T00:00:00Z"),
      ),
      /23514|check/i,
      "fim antes do início viola o CHECK ended_at >= started_at",
    );
  });

  test(`${MIGRATION}: leitura de outra organização sob RLS devolve 0 linhas`, async () => {
    const slugA = `patio-rls-a-${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const tenants = (await prisma.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slugA,
    )) as Array<{ id: string }>;
    const tenantA = tenants[0]!.id;

    const profiles = (await prisma.$queryRawUnsafe(PROFILE_INSERT, tenantA)) as Array<{ id: string }>;
    const processes = (await prisma.$queryRawUnsafe(PROCESS_INSERT, tenantA, profiles[0]!.id)) as Array<{ id: string }>;
    const processId = processes[0]!.id;

    await prisma.$executeRawUnsafe(
      `INSERT INTO ${TABLE} (tenant_id, process_id, started_at, reason) VALUES ($1::uuid, $2::uuid, now(), 'AUCTION')`,
      tenantA,
      processId,
    );

    const role = await createEphemeralRole(prisma, connectionString!);
    try {
      const posture = (await role.client.$queryRawUnsafe(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);

      const empty = (await role.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${TABLE}`)) as Array<{ n: number }>;
      assert.equal(empty[0]!.n, 0, "sem GUC, a tabela devolve zero linhas");

      const viaA = await withTenantRls(role.client, tenantA, async (tx) => {
        return (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${TABLE}`)) as Array<{ n: number }>;
      });
      assert.equal(viaA[0]!.n, 1, "GUC da organização dona vê a própria linha");

      const viaOther = await withTenantRls(role.client, randomUUID(), async (tx) => {
        return (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${TABLE}`)) as Array<{ n: number }>;
      });
      assert.equal(viaOther[0]!.n, 0, "GUC de outra organização vê zero linhas");
    } finally {
      await role.drop();
    }
  });
}