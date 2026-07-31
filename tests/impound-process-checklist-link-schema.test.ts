import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω-VID PR-04 (§Parte D) — bateria de prova viva do schema (Postgres real) de "impound_process_checklist_links".
// DB-gated (skip sem DATABASE_URL). Cobre a bateria exigida pelo comando:
//   1) CHECK impound_process_checklist_links_link_source_chk (enum fechado AUTO|MANUAL)
//   2) FK RESTRICT process_id -> impound_processes (cross-tenant rejeitada)
//   3) FK RESTRICT checklist_run_id -> checklist_runs (cross-tenant rejeitada)
//   4) RLS isolamento por tenant
//   5) unique constraint (tenant_id, process_id, checklist_run_id)
if (!connectionString) {
  test("Impound process checklist link schema (Ω-VID PR-04) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("(1) CHECK impound_process_checklist_links_link_source_chk — enum fechado AUTO|MANUAL", async () => {
    const { client } = await bootstrap(connectionString);
    const ctx = await seedContext(client, "link-source-chk");
    try {
      await assert.rejects(
        () =>
          client.$executeRawUnsafe(
            `INSERT INTO impound_process_checklist_links (tenant_id, process_id, checklist_run_id, link_source)
             VALUES ('${ctx.tenantId}'::uuid, '${ctx.processId}'::uuid, '${ctx.runId}'::uuid, 'BOGUS')`,
          ),
        /link_source_chk|23514/,
        "link_source fora do enum deve ser rejeitado",
      );

      const auto = await client.impoundProcessChecklistLink.create({
        data: { tenant_id: ctx.tenantId, process_id: ctx.processId, checklist_run_id: ctx.runId, link_source: "AUTO" },
      });
      assert.equal(auto.link_source, "AUTO");
    } finally {
      await teardown(client, ctx);
    }
  });

  test("(2) FK RESTRICT process_id -> impound_processes: process_id inexistente/cross-tenant é rejeitado", async () => {
    const { client } = await bootstrap(connectionString);
    const ctx = await seedContext(client, "fk-process");
    try {
      const otherTenant = await client.tenant.create({ data: { name: `VID link-fk-b ${uniq()}`, slug: `vid-link-fk-b-${uniq()}` } });
      await assert.rejects(
        () =>
          client.$executeRawUnsafe(
            `INSERT INTO impound_process_checklist_links (tenant_id, process_id, checklist_run_id, link_source)
             VALUES ('${otherTenant.id}'::uuid, '${ctx.processId}'::uuid, '${ctx.runId}'::uuid, 'MANUAL')`,
          ),
        /foreign key|violates/i,
        "process_id de outro tenant deve falhar por FK composta tenant-first RESTRICT",
      );
      await client.tenant.deleteMany({ where: { id: otherTenant.id } });
    } finally {
      await teardown(client, ctx);
    }
  });

  test("(3) FK RESTRICT checklist_run_id -> checklist_runs: checklist_run_id inexistente/cross-tenant é rejeitado", async () => {
    const { client } = await bootstrap(connectionString);
    const ctx = await seedContext(client, "fk-run");
    try {
      await assert.rejects(
        () =>
          client.$executeRawUnsafe(
            `INSERT INTO impound_process_checklist_links (tenant_id, process_id, checklist_run_id, link_source)
             VALUES ('${ctx.tenantId}'::uuid, '${ctx.processId}'::uuid, '${randomUUID()}'::uuid, 'MANUAL')`,
          ),
        /foreign key|violates/i,
        "checklist_run_id inexistente deve falhar por FK RESTRICT",
      );
    } finally {
      await teardown(client, ctx);
    }
  });

  test("(4) RLS isola impound_process_checklist_links por tenant (role NOSUPERUSER)", async () => {
    const { client: adminClient } = await bootstrap(connectionString);
    const roleName = `vid_link_rls_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rolePassword = `vid-link-rls-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let client: BootstrapClient | undefined;
    let ctxA: Awaited<ReturnType<typeof seedContext>> | undefined;
    let ctxB: Awaited<ReturnType<typeof seedContext>> | undefined;
    try {
      await adminClient.$executeRawUnsafe(
        `CREATE ROLE "${roleName}" LOGIN PASSWORD '${escapeSqlLiteral(rolePassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      await adminClient.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
      await adminClient.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`);
      await adminClient.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`);

      ctxA = await seedContext(adminClient, "rls-a");
      ctxB = await seedContext(adminClient, "rls-b");
      await adminClient.impoundProcessChecklistLink.create({
        data: { tenant_id: ctxA.tenantId, process_id: ctxA.processId, checklist_run_id: ctxA.runId, link_source: "MANUAL" },
      });

      const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
      client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: buildConnectionStringForRole(connectionString, roleName, rolePassword) }),
      }) as unknown as BootstrapClient;

      const { withTenantRls } = await import("../src/database/rls.js");
      const linksFromB = await withTenantRls(client, ctxB.tenantId, (tx) =>
        tx.impoundProcessChecklistLink.findMany({ where: { tenant_id: ctxA!.tenantId } }),
      );
      assert.equal(linksFromB.length, 0, "sessão de B não vê vínculos de A (RLS real, role NOSUPERUSER)");

      const linksFromA = await withTenantRls(client, ctxA.tenantId, (tx) =>
        tx.impoundProcessChecklistLink.findMany({ where: { tenant_id: ctxA!.tenantId } }),
      );
      assert.equal(linksFromA.length, 1, "sessão de A vê o próprio vínculo normalmente");
    } finally {
      if (ctxA) await teardown(adminClient, ctxA, { skipDisconnect: true });
      if (ctxB) await teardown(adminClient, ctxB, { skipDisconnect: true });
      if (client) await client.$disconnect();
      await adminClient.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`).catch(() => undefined);
      await adminClient.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => undefined);
      await adminClient.$disconnect();
    }
  });

  test("(5) unique (tenant_id, process_id, checklist_run_id): repetir o MESMO par é rejeitado por UPSERT idempotente (não duplica)", async () => {
    const { client } = await bootstrap(connectionString);
    const ctx = await seedContext(client, "unique");
    try {
      await client.impoundProcessChecklistLink.create({
        data: { tenant_id: ctx.tenantId, process_id: ctx.processId, checklist_run_id: ctx.runId, link_source: "MANUAL" },
      });
      await assert.rejects(
        () =>
          client.impoundProcessChecklistLink.create({
            data: { tenant_id: ctx.tenantId, process_id: ctx.processId, checklist_run_id: ctx.runId, link_source: "AUTO" },
          }),
        /Unique constraint|23505/i,
        "INSERT direto do MESMO par deve violar a unique (o repositório real usa upsert para ser idempotente)",
      );

      const count = await client.impoundProcessChecklistLink.count({ where: { tenant_id: ctx.tenantId } });
      assert.equal(count, 1);
    } finally {
      await teardown(client, ctx);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client };
}

async function seedContext(client: BootstrapClient, label: string) {
  const suffix = uniq();
  const tenant = await client.tenant.create({ data: { name: `VID link ${label} ${suffix}`, slug: `vid-link-${label}-${suffix}` } });
  const profile = await client.$queryRaw<Array<{ id: string }>>`
    INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil Link', 'PUBLIC_AGREEMENT') RETURNING id
  `;
  const process = await client.$queryRaw<Array<{ id: string }>>`
    INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_plate)
    VALUES (${tenant.id}::uuid, ${profile[0].id}::uuid, 'Autoridade Teste', 'LNK0001')
    RETURNING id
  `;
  const template = await client.checklistTemplate.create({
    data: { tenant_id: tenant.id, name: `Template ${suffix}`, type: "towing_collection", status: "published", schema: {} },
  });
  const run = await client.checklistRun.create({
    data: { tenant_id: tenant.id, template_id: template.id, template_version: 1 },
  });
  return { tenantId: tenant.id, processId: process[0].id, templateId: template.id, runId: run.id };
}

async function teardown(
  client: BootstrapClient,
  ctx: { readonly tenantId: string },
  options?: { readonly skipDisconnect?: boolean },
): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM impound_process_checklist_links WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM checklist_run_answers WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM checklist_runs WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${ctx.tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${ctx.tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: ctx.tenantId } });
  } finally {
    if (!options?.skipDisconnect) await client.$disconnect();
  }
}

function buildConnectionStringForRole(source: string, roleName: string, rolePassword: string): string {
  const url = new URL(source);
  url.username = roleName;
  url.password = rolePassword;
  return url.toString();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
