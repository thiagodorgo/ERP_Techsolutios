// B-ASS-05b · R-05b-2 — com `CORE_SAAS_PERSISTENCE=prisma`, a trilha dos planos grava em `platform_audit_logs`,
// e `plans.bootstrapped_by_migration` entra UMA vez no banco, inclusive depois de um reinício (serviço novo).
//
// Base própria: `CREATE DATABASE` a partir do `DATABASE_URL` + `prisma migrate deploy` (a seed dos planos é migração).
// A tabela nasce vazia, então a contagem é exata. O ambiente (URL e modo) é trocado ANTES de qualquer import do
// código: `env.ts` e `database/prisma.ts` congelam o que leem no import, e este arquivo roda num processo próprio.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTION = "plans.bootstrapped_by_migration";

if (!connectionString) {
  test("B-ASS-05b · a trilha dos planos no banco exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar R-05b-2.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let admin: any;
  let db: any;
  let databaseName: string | undefined;
  let url = "";
  let runtimePrisma: any;

  after(async () => {
    await runtimePrisma?.$disconnect();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function trailRows(): Promise<Array<{ action: string; entity: string; metadata: Record<string, unknown>; actor_user_id: string | null }>> {
    return db.$queryRawUnsafe(
      `SELECT action, entity, metadata, actor_user_id FROM platform_audit_logs WHERE action = $1 ORDER BY created_at`,
      ACTION,
    );
  }

  test("R-05b-2 · base própria migrada: os planos da seed existem e a trilha nasce vazia", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass05b_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    url = target.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    const seeded = (await db.$queryRawUnsafe(`SELECT code FROM subscription_plans WHERE created_by IS NULL`)) as Array<{ code: string }>;
    assert.ok(seeded.length > 0, "a seed da migração cria planos com created_by NULL");
    const empty = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM platform_audit_logs`)) as Array<{ n: number }>;
    assert.equal(empty[0]!.n, 0);
  });

  test("R-05b-2 · a 1ª leitura grava UMA linha; um serviço NOVO (reinício) relê a linha e não grava outra", async () => {
    assert.ok(db, "depende da base própria");
    // Antes de qualquer import do código: a fábrica lê o modo e o singleton do Prisma lê a URL no import.
    process.env.DATABASE_URL = url;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    const runtime = await import("../src/modules/subscription-billing/subscription-billing.service.js");
    const { env } = await import("../src/config/env.js");
    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "a fábrica está no modo prisma");
    runtimePrisma = (await import("../src/database/prisma.js")).prisma;

    const first = await runtime.createDefaultPlansService();
    const plans = await first.listPlans();
    await first.listPlans();
    const expected = plans.filter((plan) => plan.createdBy === null).map((plan) => plan.code).sort();
    const seeded = ((await db.$queryRawUnsafe(`SELECT code FROM subscription_plans WHERE created_by IS NULL`)) as Array<{ code: string }>)
      .map((row) => row.code)
      .sort();
    assert.deepEqual(expected, seeded, "o serviço leu os planos da seed");

    let rows = await trailRows();
    assert.equal(rows.length, 1, "a 1ª leitura do catálogo grava a trilha no banco, uma vez");
    assert.equal(rows[0]!.entity, "subscription_plan");
    assert.equal(rows[0]!.actor_user_id, null);
    assert.deepEqual(rows[0]!.metadata, { codes: seeded, count: seeded.length });

    runtime.resetSubscriptionBillingRuntimeForTests();
    const second = await runtime.createDefaultPlansService();
    assert.notEqual(second, first, "serviço novo, marca de processo zerada");
    await second.listPlans();
    rows = await trailRows();
    assert.equal(rows.length, 1, "o reinício relê a linha e não grava a segunda");
  });

  test("R-05b-2 · as outras ações passam direto, e a metadata passa pela allowlist", async () => {
    assert.ok(db, "depende da base própria");
    const { BootstrapTrailOnceWriter } = await import("../src/modules/subscription-billing/platform-audit/bootstrap-trail-once.js");
    const writer = new BootstrapTrailOnceWriter(db);
    await writer.record({ action: "plans.other_probe", entity: "subscription_plan", metadata: { count: 1 } });
    await writer.record({ action: "plans.other_probe", entity: "subscription_plan", metadata: { count: 2, token: "SECRET-ABC123-XYZ" } });
    await writer.record({ action: ACTION, entity: "subscription_plan", metadata: { codes: ["starter"], count: 1 } });
    const other = (await db.$queryRawUnsafe(
      `SELECT metadata::text AS m FROM platform_audit_logs WHERE action = 'plans.other_probe' ORDER BY created_at`,
    )) as Array<{ m: string }>;
    assert.equal(other.length, 2, "só a ação de bootstrap é deduplicada");
    assert.equal(other.some((row) => row.m.includes("SECRET")), false, "a allowlist segue valendo");
    assert.equal((await trailRows()).length, 1, "o bootstrap já gravado não ganha linha nova");
    await db.$executeRawUnsafe(`DELETE FROM platform_audit_logs WHERE action = 'plans.other_probe'`);
  });

  test("R-05b-2 · o papel de runtime (NOSUPERUSER NOBYPASSRLS) lê e grava a trilha pelo escritor", async () => {
    assert.ok(db, "depende da base própria");
    const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
    const role = await createEphemeralRole(db, url);
    try {
      const posture = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);
      const { BootstrapTrailOnceWriter } = await import("../src/modules/subscription-billing/platform-audit/bootstrap-trail-once.js");
      const writer = new BootstrapTrailOnceWriter(role.client);
      await writer.record({ action: ACTION, entity: "subscription_plan", metadata: { codes: ["starter"], count: 1 } });
      assert.equal((await trailRows()).length, 1, "o papel de runtime acha a linha e não duplica");
      await db.$executeRawUnsafe(`DELETE FROM platform_audit_logs WHERE action = $1`, ACTION);
      await writer.record({ action: ACTION, entity: "subscription_plan", metadata: { codes: ["starter"], count: 1 } });
      assert.equal((await trailRows()).length, 1, "sem a linha, o papel de runtime grava");
    } finally {
      await role.drop();
    }
  });
}
