import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { PLATFORM_ROLES } from "../src/modules/core-saas/permissions/catalog.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 ciclo 2 (R-B-O6R-01-ciclo1, B-4) — o caminho PRISMA (o de produção) ganha o teste que
// morre. O defeito do ciclo 1: os dois pontos de validação de `prisma-core-saas.service.ts`
// (create e update) não tinham NENHUM teste — removê-los deixava a bateria inteira verde, e a
// garantia central do bloco era medida só no adaptador de memória ("a única configuração onde
// ela não pode falhar"). Este arquivo dirige POST/PATCH /users por HTTP contra o Postgres real,
// atravessando exatamente aqueles dois pontos; o drill 4 do ciclo 2 comenta os dois
// `assertAssignableRole` e anexa as falhas (≥2) que este arquivo produz.
//
// Espelho de `core-saas-persistence-restart-db.test.ts` na disciplina:
//   · AUTO-SKIP sem DATABASE_URL — e o guard de zero pulos do job `backend-postgres` (ci.yml)
//     pune o pulo lá, onde o banco existe;
//   · com DATABASE_URL presente, a suíte FIXA `CORE_SAAS_PERSISTENCE=prisma` em runtime, antes
//     de qualquer import que LEIA o modo. Precisão que o porteiro do #357 cobrou: a linha 6
//     importa `catalog.js` ANTES disso — e é seguro só porque `catalog.ts` não importa nada, logo
//     não alcança `src/config/env.ts`, que é quem congela o modo. Essa propriedade era acidente e
//     virou guarda: `tests/auth-invariant-guards.test.ts` (guard 11) fica vermelho se alguém
//     acrescentar import lá. (convenção escrita no ci.yml; molde de
//     `checklist-routes-db.test.ts:266`). Uma suíte que prova o caminho de persistência real
//     não pode executar com internals de memória (middleware de permissão resolvendo do
//     catálogo em vez da tabela) — nem passando, nem falhando: ou fixa o modo, ou pula
//     (R-B-O6R-01-ci-vermelha, CI-1);
//   · serviço prisma construído DIRETAMENTE (nunca `createCoreSaasService()`) — reforço sobre o
//     modo fixado acima;
//   · teardown ESCOPADO aos ids desta execução, em ordem de FK — nunca curinga em base viva.
//
// Autorização: com o modo fixado em prisma, o middleware persistente resolve permissões da
// TABELA `role_permissions` nas DUAS configurações da CI — por isso o ator (tenant_admin)
// recebe as linhas de permissão abaixo (molde de `checklist-routes-db.test.ts`). O JWT é
// assinado direto (mesmo molde), papel `tenant_admin`.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Role-authority no caminho prisma exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar esta suíte.",
  });
} else {
  test("SEC-001 no caminho prisma: escalada de papel → 403 e banco intacto; papel de tenant segue fluindo", async (t) => {
    process.env.LOG_LEVEL = "silent";
    // ANTES de qualquer import da aplicação (os imports abaixo são dinâmicos e é o primeiro
    // deles que congela src/config/env.ts): esta suíte prova o caminho prisma, então ela mesma
    // estabelece o modo — o job `backend` da CI roda em CORE_SAAS_PERSISTENCE=memory.
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";

    const [
      { PrismaPg },
      { PrismaClient },
      { createApp },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
      { signAccessToken },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/modules/auth/index.js"),
    ]);

    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let server: Server | undefined;
    let tenantId: string | undefined;
    let createdGlobalManagerRoleId: string | undefined;

    try {
      const tenant = await client.tenant.create({
        data: { name: `Role Authority DB ${suffix}`, slug: `role-authority-db-${suffix}` },
      });
      tenantId = tenant.id;

      const admin = await client.user.create({
        data: {
          tenant_id: tenant.id,
          name: "Admin da organização",
          email: `role-authority-admin-${suffix}@example.com`,
          status: "active",
        },
      });

      const papelAdmin = await client.role.create({
        data: { tenant_id: tenant.id, key: "tenant_admin", name: `Admin ${suffix}`, scope: "tenant" },
      });
      // O controle positivo PRECISA da linha GLOBAL do papel-alvo (tenant_id IS NULL): para key
      // de catálogo, `findByKeyForTenant` resolve SOMENTE a linha global (defesa Ω6R-SEC-001 em
      // role.repository.ts — um clone tenant-scoped de papel de sistema nunca é o resolvido).
      // O job `backend` da CI roda com o banco migrado e SEM seed — era daí que vinha o 400 do
      // controle positivo na CI do #357 (medido: sem esta linha a falha é idêntica em memory e
      // em prisma). Esta suíte cria a linha SÓ quando falta, e o teardown remove SÓ o que ela
      // criou — numa base seedada (backend-postgres, dev local) a linha pré-existe e fica
      // intocada. O 201 do manager prova que o 403 dos papéis de plataforma vem da ALLOWLIST,
      // não de "papel inexistente".
      const managerGlobal = await client.role.findFirst({
        where: { key: "manager", tenant_id: null },
        select: { id: true },
      });

      if (!managerGlobal) {
        createdGlobalManagerRoleId = (
          await client.role.create({
            data: { key: "manager", name: "Manager", scope: "system" },
            select: { id: true },
          })
        ).id;
      }

      // No job `backend-postgres` (CORE_SAAS_PERSISTENCE=prisma) o middleware persistente IGNORA
      // os papéis do token e resolve permissões da tabela `role_permissions` — sem estas linhas,
      // o 403 viria de permission_required e o teste não exerceria a allowlist.
      for (const key of ["users.manage", "users.read"]) {
        const permission = await client.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: `Permissão ${key}` },
        });
        await client.rolePermission.create({
          data: { role_id: papelAdmin.id, permission_id: permission.id },
        });
      }

      await client.userRoleAssignment.create({
        data: { tenant_id: tenant.id, user_id: admin.id, role_id: papelAdmin.id },
      });

      const service = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          client,
          new TenantRepository(client),
          new UserRepository(client),
          new RoleRepository(client),
          new UserRoleRepository(client),
          new AuditLogRepository(client),
        ),
      );
      const app = createApp(service);

      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const token = await signAccessToken({
        user_id: admin.id,
        tenant_id: tenant.id,
        email: admin.email,
        roles: ["tenant_admin"],
      });
      const headers = { authorization: `Bearer ${token}` };
      const emailEscalada = `role-authority-escalada-${suffix}@example.com`;

      await t.test("CREATE (prisma): POST /users com platform_admin → 403 role_not_assignable", async () => {
        const response = await requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: { name: "Escalador", email: emailEscalada, roles: ["platform_admin"] },
        });

        assert.equal(response.status, 403);
        assert.equal(
          (response.body.error as { reason?: string }).reason,
          "role_not_assignable",
        );
      });

      await t.test("UPDATE (prisma): PATCH self para super_admin → 403; papéis intactos no banco", async () => {
        const response = await requestJson(baseUrl, `/api/v1/users/${admin.id}`, {
          method: "PATCH",
          headers,
          body: { roles: ["super_admin"] },
        });

        assert.equal(response.status, 403);
        assert.equal(
          (response.body.error as { reason?: string }).reason,
          "role_not_assignable",
        );

        const assignments = await client.userRoleAssignment.findMany({
          where: { tenant_id: tenant.id, user_id: admin.id },
          include: { role: { select: { key: true } } },
        });

        assert.deepEqual(
          assignments.map((assignment) => assignment.role.key),
          ["tenant_admin"],
          "o PATCH negado não pode ter alterado os papéis persistidos",
        );
      });

      await t.test("controle POSITIVO: POST /users com manager → 201 (o 403 vem da allowlist, não do encanamento)", async () => {
        const response = await requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: {
            name: "Gestora",
            email: `role-authority-gestora-${suffix}@example.com`,
            roles: ["manager"],
          },
        });

        assert.equal(response.status, 201);
        assert.deepEqual((response.body.data as { roles: string[] }).roles, ["manager"]);
      });

      await t.test("pós-403: NENHUM assignment de plataforma no banco, nenhum usuário parcial", async () => {
        const platformAssignments = await client.userRoleAssignment.count({
          where: { tenant_id: tenant.id, role: { key: { in: [...PLATFORM_ROLES] } } },
        });

        assert.equal(platformAssignments, 0, "a escalada negada não pode deixar assignment de plataforma");

        const escaladores = await client.user.count({
          where: { tenant_id: tenant.id, email: emailEscalada },
        });

        assert.equal(escaladores, 0, "o 403 do CREATE não pode deixar usuário parcial para trás");
      });
    } finally {
      if (server) {
        await closeServer(server);
      }

      // Teardown ESCOPADO ao tenant descartável desta execução, em ordem de FK (auditoria e
      // assignments antes de users/roles; roles antes do tenant). Nunca curinga em base viva.
      if (tenantId) {
        await client.auditLog.deleteMany({ where: { tenant_id: tenantId } });
        await client.userRoleAssignment.deleteMany({ where: { tenant_id: tenantId } });
        await client.$executeRawUnsafe(
          "delete from role_permissions where role_id in (select id from roles where tenant_id = $1::uuid)",
          tenantId,
        );
        await client.user.deleteMany({ where: { tenant_id: tenantId } });
        await client.role.deleteMany({ where: { tenant_id: tenantId } });
        await client.tenant.deleteMany({ where: { id: tenantId } });

        assert.equal(
          await client.tenant.count({ where: { id: tenantId } }),
          0,
          "teardown deixou organização para trás",
        );
      }

      // A linha global de `manager` só é removida se ESTA execução a criou (banco sem seed);
      // os assignments que a referenciavam são deste tenant e já caíram acima.
      if (createdGlobalManagerRoleId) {
        await client.role.deleteMany({
          where: { id: createdGlobalManagerRoleId, tenant_id: null },
        });
      }

      await client.$disconnect();
    }
  });
}

async function requestJson(
  baseUrl: string,
  pathName: string,
  init: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown> & {
      data?: unknown;
      error?: unknown;
    },
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
