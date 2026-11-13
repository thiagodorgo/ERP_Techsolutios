import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";

// B-SAN3-24 (24b, B7 — R-AUDIT-FORCADO, A-04 da crítica r1; Q1 = (b) por `D-DONO-TODAS-RECOMENDACOES-1111`). Contra o
// PostgreSQL REAL, pela HTTP REAL, com JWT real e as permissões DO BANCO (`CORE_SAAS_PERSISTENCE=prisma`), no molde de
// `tests/b-san3-12-ce4-db.test.ts`: o Financeiro fecha MESMO ASSIM uma competência com 1 título em contestação, e o banco
// guarda
//   (i)   em `financial_period_closes`: `snapshot.latest.forced === true` e `forcedReason` igual ao motivo APARADO;
//   (ii)  UMA linha em `audit_logs` com `action = 'financial_period.closed'`, `metadata.forced = true` e
//         `metadata.overriddenDisputeTitleIds = [o id do título]`;
//   (iii) `metadata.forcedReason` igual ao motivo (a linha nova do controller, Q1 = (b)).
// PAPEL DO BANCO: o app roda sob papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`), injetado no singleton
// ANTES de importar o app; a semeadura, a leitura de conferência e a limpeza usam a conexão administrativa.
// Os dois braços (base PROVISIONADA × SÓ-MIGRADA) são os do molde. Sem `DATABASE_URL`, pula com aviso; o aceite exige
// `ok` sem `# SKIP` no TAP do job `backend` (R-ACEITE-JOB-CERTO).

const connectionString = process.env.DATABASE_URL;

const DEMO_MODULES = [
  ...readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8")
    .match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/)![1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

const PERIOD = "2025-03";
const REASON = "Cliente confirmou o acerto por e-mail";

if (!connectionString) {
  test("B-SAN3-24 B7 exige DATABASE_URL e uma base migrada", { skip: "Defina DATABASE_URL (base migrada)." });
} else {
  test("B-SAN3-24 B7: fechar MESMO ASSIM grava forced e o motivo no retrato e na auditoria (com os ids sobrepostos)", async () => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const efemera = await createEphemeralRole(client, connectionString);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdRoleIds: string[] = [];
    let tenantId: string | undefined;
    let server: Server | undefined;

    try {
      const [
        { createApp },
        { signAccessToken },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
      ]);
      const appClient = efemera.client;
      const service = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          appClient,
          new TenantRepository(appClient),
          new UserRepository(appClient),
          new RoleRepository(appClient),
          new UserRoleRepository(appClient),
          new AuditLogRepository(appClient),
        ),
      );

      const postura = await appClient.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o app roda sem superusuário e sem atravessar a RLS");

      const financeGlobais = await client.role.findMany({ where: { key: "finance", tenant_id: null }, select: { id: true, _count: { select: { role_permissions: true } } } });
      const braco: 1 | 2 = financeGlobais.some((r) => r._count.role_permissions > 0) ? 1 : 2;

      const tenant = await client.tenant.create({ data: { name: `SAN3-24 B7 ${suffix}`, slug: `san3-24-b7-${suffix}`, modules: DEMO_MODULES } });
      tenantId = tenant.id;

      let roleId: string;
      if (braco === 1) {
        roleId = [...financeGlobais].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0].id;
      } else {
        const role = await client.role.create({ data: { tenant_id: tenant.id, key: "finance", name: `SAN3-24 finance ${suffix}`, scope: "tenant" }, select: { id: true } });
        createdRoleIds.push(role.id);
        roleId = role.id;
        const rows: Array<{ role_id: string; permission_id: string }> = [];
        for (const permission of ROLE_PERMISSIONS.finance) rows.push({ role_id: role.id, permission_id: (await ensurePermission(client, permission)).id });
        await client.rolePermission.createMany({ data: rows, skipDuplicates: true });
      }
      const user = await client.user.create({ data: { tenant_id: tenant.id, name: "B7 Financeiro", email: `san3-24-b7-${suffix}@example.com` } });
      await client.userRoleAssignment.create({ data: { tenant_id: tenant.id, user_id: user.id, role_id: roleId } });
      const token = await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: ["finance"] });

      server = createApp(service).listen(0);
      await new Promise<void>((resolve) => (server!.listening ? resolve() : server!.once("listening", () => resolve())));
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
      const call = async (method: string, path: string, body?: unknown) => {
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await response.text();
        return { status: response.status, body: text ? JSON.parse(text) : null };
      };

      const titulo = await call("POST", "/financial-titles", {
        direction: "receivable",
        party_type: "customer",
        party_name: "Cliente em contestação B7",
        amount: 750,
        issue_date: `${PERIOD}-10`,
        due_date: `${PERIOD}-25`,
      });
      assert.equal(titulo.status, 201, `título (braço ${braco}): ${JSON.stringify(titulo.body)}`);
      const titleId = titulo.body.data.id as string;
      const contestado = await call("PATCH", `/financial-titles/${titleId}/status`, { status: "in_dispute" });
      assert.equal(contestado.status, 200, JSON.stringify(contestado.body));

      const bloqueado = await call("POST", `/financial-periods/${PERIOD}/close`, {});
      assert.equal(bloqueado.status, 422, "sem force, a contestação impede");
      assert.equal(bloqueado.body.error.reason, "pending_items_block_close");

      const fechado = await call("POST", `/financial-periods/${PERIOD}/close`, { force: true, reason: `   ${REASON}   `.trim() });
      assert.equal(fechado.status, 200, JSON.stringify(fechado.body));
      assert.equal(fechado.body.data.status, "closed");

      // (i) o retrato no banco
      const linha = await client.$queryRawUnsafe<Array<{ status: string; snapshot: { latest: { forced: boolean; forcedReason: string | null } } }>>(
        "SELECT status, snapshot FROM financial_period_closes WHERE tenant_id = $1::uuid AND period = $2",
        tenant.id,
        PERIOD,
      );
      assert.equal(linha.length, 1);
      assert.equal(linha[0].status, "closed");
      assert.equal(linha[0].snapshot.latest.forced, true);
      assert.equal(linha[0].snapshot.latest.forcedReason, REASON);

      // (ii) e (iii) a auditoria no banco (gravada depois do fechamento, em transação própria: espera curta e limitada)
      let auditorias: Array<{ metadata: Record<string, unknown> }> = [];
      for (let attempt = 0; attempt < 20 && auditorias.length === 0; attempt++) {
        auditorias = await client.$queryRawUnsafe<Array<{ metadata: Record<string, unknown> }>>(
          "SELECT metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'financial_period.closed'",
          tenant.id,
        );
        if (auditorias.length === 0) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(auditorias.length, 1, "UMA linha de auditoria do fechamento");
      const metadata = auditorias[0].metadata;
      assert.equal(metadata.forced, true, "(ii) forced na auditoria");
      assert.deepEqual(metadata.overriddenDisputeTitleIds, [titleId], "(ii) o título em contestação sobreposto");
      assert.equal(metadata.forcedReason, REASON, "(iii) o motivo na auditoria (Q1 = (b))");
      assert.equal(metadata.period, PERIOD);
    } finally {
      if (server) await new Promise<void>((resolve, reject) => server!.close((error) => (error ? reject(error) : resolve())));
      if (tenantId) {
        for (const table of ["financial_entries", "financial_titles", "financial_accounts", "financial_period_closes", "tenant_settings", "audit_logs", "user_role_assignments"]) {
          await client.$executeRawUnsafe(`delete from ${table} where tenant_id = $1::uuid`, tenantId);
        }
        if (createdRoleIds.length) {
          await client.rolePermission.deleteMany({ where: { role_id: { in: createdRoleIds } } });
          await client.role.deleteMany({ where: { id: { in: createdRoleIds } } });
        }
        await client.user.deleteMany({ where: { tenant_id: tenantId } });
        await client.tenant.deleteMany({ where: { id: tenantId } });
      }
      await efemera.drop();
      await client.$disconnect();
    }
  });
}
