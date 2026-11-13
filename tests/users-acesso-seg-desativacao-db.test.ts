import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  getBaseUrl,
  requestJson,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S4 (ajuste 2 da crítica, D-USERS-3) e Achado 3 do plano original.
//
// O que a fatia promete (replano, "Reconciliação D-USERS-2 × ajuste 2"): desativar um usuário
// corta as PERMISSÕES dele na próxima requisição, mesmo com o token de acesso ainda válido (os
// 15 min do D-USERS-2 valem só para a identidade do token), e revoga as sessões dele na mesma
// transação da desativação (a renovação já barrava usuário inativo; agora a sessão fica marcada
// como revogada e some da lista de sessões ativas).
//
// Onde mede: no caminho do RBAC persistente (o de produção), com o código sob teste conectado
// como papel EFÊMERO NOSUPERUSER NOBYPASSRLS (o arnês `createEphemeralRole`). O `DATABASE_URL`
// é o administrador do cluster e só monta e desmonta a fixture.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · S4 exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  // B-USERS-SEG-DESATIVADO (Emenda 1, E1.6 item 1): o modo `prisma` é forçado aqui, antes de qualquer import de
  // `src/`. Sem isso o S4·c rodaria em memória no job `backend`, com o portão em "skipped".
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);

      // B-USERS-SEG-DESATIVADO (E1.6 item 2): o portão consulta pelo Prisma GLOBAL; ele é o papel efêmero.
      (globalThis as { prisma?: unknown }).prisma = role.client;

      return { admin, role, tenantIds: [] };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await cleanupIdentityFixture(h.admin, h.tenantIds);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  type Fixture = {
    readonly tenantId: string;
    readonly roleId: string;
    readonly adminUserId: string;
    readonly targetUserId: string;
    readonly targetEmail: string;
    readonly controlUserId: string;
  };

  // Organização com um papel de catálogo (`viewer`) que concede `users.read` pela TABELA (o RBAC
  // persistente lê `role_permissions`, não o catálogo em código). Alvo e controle têm o MESMO
  // papel: o controle prova que o corte é do usuário desativado, não do papel.
  async function seedOrganization(h: Harness, tag: string): Promise<Fixture> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await h.admin.tenant.create({
      data: { name: `Users Seg S4 ${suffix}`, slug: `users-seg-s4-${suffix}` },
    });

    h.tenantIds.push(tenant.id);

    const permission = await h.admin.permission.upsert({
      where: { key: "users.read" },
      update: {},
      create: { key: "users.read", description: "Permissão users.read" },
    });
    const viewer = await h.admin.role.create({
      data: { tenant_id: tenant.id, key: "viewer", name: `Viewer ${suffix}`, scope: "tenant" },
    });

    await h.admin.rolePermission.create({
      data: { role_id: viewer.id, permission_id: permission.id },
    });

    const makeUser = async (label: string) => {
      const user = await h.admin.user.create({
        data: {
          tenant_id: tenant.id,
          name: `Usuário ${label}`,
          email: `users-seg-s4-${label}-${suffix}@example.com`,
          status: "active",
        },
      });

      await h.admin.userRoleAssignment.create({
        data: { tenant_id: tenant.id, user_id: user.id, role_id: viewer.id },
      });

      return user;
    };

    const adminUser = await makeUser("admin");
    const target = await makeUser("alvo");
    const control = await makeUser("controle");

    return {
      tenantId: tenant.id,
      roleId: viewer.id,
      adminUserId: adminUser.id,
      targetUserId: target.id,
      targetEmail: target.email,
      controlUserId: control.id,
    };
  }

  async function deactivateDirectly(h: Harness, userId: string): Promise<void> {
    await h.admin.user.update({ where: { id: userId }, data: { status: "inactive" } });
  }

  test("S4·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.rolsuper, false, "o papel efêmero não pode ser superusuário");
    assert.equal(rows[0]?.rolbypassrls, false, "o papel efêmero não pode contornar o RLS");
  });

  test("S4·a — resolveForActor nega papéis e permissões ao usuário desativado (o serviço, sob o papel real)", async () => {
    const h = await harness();
    const fx = await seedOrganization(h, "a");
    const [{ withTenantRls }, { RoleRepository, UserRoleRepository }, { PersistentAuthorizationService }] =
      await Promise.all([
        import("../src/database/rls.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/modules/core-saas/services/persistent-authorization.service.js"),
      ]);

    const resolve = (userId: string) =>
      withTenantRls(h.role.client, fx.tenantId, async (tx) => {
        const service = new PersistentAuthorizationService(
          new UserRoleRepository(tx),
          new RoleRepository(tx),
          {
            findStatusForTenant: (lookupUserId: string, lookupTenantId: string) =>
              tx.user.findFirst({
                where: { id: lookupUserId, tenant_id: lookupTenantId },
                select: { status: true },
              }),
          },
        );

        return service.resolveForActor({ tenantId: fx.tenantId, userId });
      });

    const before = await resolve(fx.targetUserId);

    assert.deepEqual([...before.roles], ["viewer"]);
    assert.ok(before.permissions.includes("users.read"), "ativo: a permissão vem da tabela");

    await deactivateDirectly(h, fx.targetUserId);

    const afterDeactivation = await resolve(fx.targetUserId);

    assert.deepEqual([...afterDeactivation.roles], [], "desativado: nenhum papel");
    assert.deepEqual([...afterDeactivation.permissions], [], "desativado: nenhuma permissão");

    const control = await resolve(fx.controlUserId);

    assert.ok(control.permissions.includes("users.read"), "controle ativo com o mesmo papel mantém a permissão");
  });

  test("S4·b — o resolvedor padrão do middleware (a fiação de produção) corta o desativado", async () => {
    const h = await harness();
    const fx = await seedOrganization(h, "b");
    const { createPersistentAuthorizationResolver } = await import(
      "../src/modules/core-saas/middleware/persistent-rbac-context.middleware.js"
    );
    const resolver = createPersistentAuthorizationResolver(h.role.client);

    const before = await resolver({ tenantId: fx.tenantId, userId: fx.targetUserId });

    assert.ok(before.permissions.includes("users.read"));

    await deactivateDirectly(h, fx.targetUserId);

    const afterDeactivation = await resolver({ tenantId: fx.tenantId, userId: fx.targetUserId });

    assert.deepEqual([...afterDeactivation.roles], []);
    assert.deepEqual([...afterDeactivation.permissions], []);

    const control = await resolver({ tenantId: fx.tenantId, userId: fx.controlUserId });

    assert.ok(control.permissions.includes("users.read"));
  });

  test("S4·c — o MESMO token ainda válido é recusado pelo portão na próxima requisição (401 session_inactive)", async () => {
    const h = await harness();
    const fx = await seedOrganization(h, "c");
    const [
      { default: express },
      { attachAuthenticatedActor, signAccessToken, verifyAccessToken },
      { createPersistentAuthorizationResolver, createPersistentRbacContextMiddleware },
      { requirePermission },
    ] = await Promise.all([
      import("express"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/middleware/persistent-rbac-context.middleware.js"),
      import("../src/modules/core-saas/middleware/rbac.middleware.js"),
    ]);

    const app = express();

    app.get(
      "/probe",
      attachAuthenticatedActor(),
      createPersistentRbacContextMiddleware({
        resolveAuthorization: createPersistentAuthorizationResolver(h.role.client),
      }),
      requirePermission("users.read"),
      (_request, response) => {
        response.json({ data: { ok: true } });
      },
    );

    // B-USERS-SEG-DESATIVADO (E1.6 item 3): o modo e o cliente do portão (A9), antes da primeira requisição (e
    // antes do `listen`: o `getBaseUrl` espera o evento `listening`).
    const { env } = await import("../src/config/env.js");

    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
    assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "A9: o portão usa o papel");

    const server: Server = app.listen(0);

    try {
      const baseUrl = await getBaseUrl(server);
      const token = await signAccessToken({
        user_id: fx.targetUserId,
        tenant_id: fx.tenantId,
        email: fx.targetEmail,
        roles: ["viewer"],
      });
      const headers = { authorization: `Bearer ${token}` };

      const before = await requestJson(baseUrl, "/probe", { headers });

      assert.equal(before.status, 200, "ativo: a rota protegida responde");

      await deactivateDirectly(h, fx.targetUserId);

      const afterDeactivation = await requestJson(baseUrl, "/probe", { headers });

      assert.equal(afterDeactivation.status, 401, "desativado: o portão recusa a próxima requisição");
      assert.equal(afterDeactivation.body.error?.reason, "session_inactive");

      const payload = await verifyAccessToken(token);

      assert.equal(payload.sub, fx.targetUserId, "verifyAccessToken sozinho ainda aceita a assinatura; quem recusa é o portão (P-SESSAO-VIVA)");
    } finally {
      await closeServer(server);
    }
  });

  test("A3 — desativar revoga, na mesma transação, as sessões ativas do par; a renovação diz 'revogada'", async () => {
    const h = await harness();
    const fx = await seedOrganization(h, "a3");
    const [
      { withTenantRls },
      { AuthSessionService },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
    ] = await Promise.all([
      import("../src/database/rls.js"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const sessions = new AuthSessionService((tenantId, work) => withTenantRls(h.role.client, tenantId, work));
    const first = await sessions.createSession({ tenant_id: fx.tenantId, user_id: fx.targetUserId });

    await sessions.createSession({ tenant_id: fx.tenantId, user_id: fx.targetUserId });
    await sessions.createSession({ tenant_id: fx.tenantId, user_id: fx.controlUserId });

    const client = h.role.client;
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

    const updated = await service.updateUser(
      { userId: fx.targetUserId, tenantId: fx.tenantId, status: "inactive" },
      {
        tenantId: fx.tenantId,
        userId: fx.adminUserId,
        roles: ["tenant_admin"],
        permissions: [],
        explicitPermissions: false,
      },
    );

    assert.equal(updated.status, "inactive");

    const liveTarget = await h.admin.authSession.count({
      where: { tenant_id: fx.tenantId, user_id: fx.targetUserId, revoked_at: null },
    });
    const liveControl = await h.admin.authSession.count({
      where: { tenant_id: fx.tenantId, user_id: fx.controlUserId, revoked_at: null },
    });

    assert.equal(liveTarget, 0, "as duas sessões do desativado ficam revogadas (GUC certo, linhas afetadas > 0)");
    assert.equal(liveControl, 1, "a sessão do controle fica intacta");

    const refresh = await sessions.refreshSession(first.refreshToken);

    assert.deepEqual(refresh, { ok: false, reason: "revoked" }, "a renovação recusa por revogação, não só por usuário inativo");

    const audit = await h.admin.auditLog.findFirst({
      where: { tenant_id: fx.tenantId, action: "user.updated", entity_id: fx.targetUserId },
      orderBy: { created_at: "desc" },
    });
    const metadata = (audit?.metadata ?? {}) as Record<string, unknown>;

    assert.equal(metadata.revoked_sessions, 2, "a contagem revogada vai para a auditoria");
  });
}
