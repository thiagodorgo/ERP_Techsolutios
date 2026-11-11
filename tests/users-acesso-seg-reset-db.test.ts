import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S1 / P-SEG-1 (Emenda 1 + UEM-02/UEM-03/UEM-R2-01) — o reset de senha por
// administrador, `POST /api/v1/auth/users/:userId/reset-password`, e a recusa da `D-USERS-1`: o
// administrador NÃO redefine a senha de quem tem vínculo de identidade em outra organização.
//
// O que este arquivo prova, com o serviço de identidade ligado ao papel EFÊMERO NOSUPERUSER
// NOBYPASSRLS (atributos conferidos no S1·0):
//   S1·a — identidade em 2 organizações → 409 `identity_linked_elsewhere`, mensagem fixa, nada muda;
//   S1·b — identidade só na organização do admin → 200 `{user_id, temporary_password,
//          must_change_password: true, revoked_sessions}`; a provisória entra, a antiga não; as sessões
//          do alvo caem; auditoria `user.password_reset` sem a provisória, sem hash, sem outra organização;
//   S1·c — os códigos fixados (400 ×2, 401, 403, 404 ×2, 409 `cannot_reset_self`, 409 `user_inactive`);
//   S1·d — a outra organização SUSPENSA ainda conta (falha fechada) → 409, nada muda;
//   S1·e — vínculo da outra organização com mudança EM VOO durante a verificação (trava segurada além
//          do lock_timeout) → 503 `reset_unavailable`, nada muda;
//   S1·e2 — o vínculo da outra organização é REMOVIDO no meio da verificação (desvínculo confirmado com
//          o reset bloqueado na trava — barreira determinística) → 503 `reset_unavailable`, nada muda; com
//          o estado firme, o reset passa;
//   S1·f — a transação expira durante a verificação (prazo vence antes da trava soltar; lock_timeout
//          alto) → 503 `reset_unavailable`, nada muda;
//   S1·g — nenhuma resposta (corpo e cabeçalhos) nem auditoria do reset carrega id ou nome de outra
//          organização (UEM-03). Os logs do processo entram no arquivo da S8.
// Vermelho-controle (UEM-02): o reset INGÊNUO (sem a verificação de existência) num commit
// intermediário do ramo, com o `not ok` do S1·a registrado no diário.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · S1 exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  type Responses = Array<{ status: number; text: string; headers: string }>;

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly baseUrl: string;
    readonly server: Server;
    readonly responses: Responses;
    readonly makeService: (budget?: Record<string, number>) => Promise<unknown>;
    readonly startApp: (service: unknown) => Promise<{ readonly baseUrl: string; readonly server: Server }>;
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [
        { PrismaPg },
        { PrismaClient: Client },
        { default: express },
        { createAuthRouter, createIdentityLinkRouter, IdentityLinkService, getLocalAuthLoginService, verifyPassword },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { createPersistentAuthorizationResolver },
      ] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("express"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/modules/core-saas/middleware/persistent-rbac-context.middleware.js"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);
      const client = role.client;
      const makeService = async (budget?: Record<string, number>) =>
        new IdentityLinkService(
          client,
          async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
          (tx) => new AuditLogRepository(tx),
          verifyPassword,
          budget ? { resetBudget: budget as never } : undefined,
        );
      const coreSaas = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          client,
          new TenantRepository(client),
          new UserRepository(client),
          new RoleRepository(client),
          new UserRoleRepository(client),
          new AuditLogRepository(client),
        ),
        client,
      );
      const startApp = async (service: unknown) => {
        const app = express();

        app.use(express.json());
        app.use("/api/v1/auth", createIdentityLinkRouter(async () => service as never));
        app.use(
          "/api/v1/auth",
          createAuthRouter({
            getCoreSaasService: async () => coreSaas,
            getIdentityLinkService: async () => service as never,
            // O RBAC persistente da rota do reset lê papéis e permissões pelo papel efêmero.
            resolvePersistentAuthorization: createPersistentAuthorizationResolver(client),
          }),
        );

        const server = app.listen(0);

        return { baseUrl: await getBaseUrl(server), server };
      };
      const main = await startApp(await makeService());

      return {
        admin,
        role,
        tenantIds: [],
        baseUrl: main.baseUrl,
        server: main.server,
        responses: [],
        makeService,
        startApp,
      };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await closeServer(h.server);
      await cleanupIdentityFixture(h.admin, h.tenantIds);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // Requisição que guarda corpo e cabeçalhos para a varredura de não vazamento (S1·g).
  async function call(
    h: Harness,
    path: string,
    init: { method?: string; headers?: Record<string, string>; body?: unknown; baseUrl?: string } = {},
  ) {
    const response = await fetch(`${init.baseUrl ?? h.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const text = await response.text();
    const headers = JSON.stringify([...response.headers.entries()]);

    if (path.includes("/reset-password")) {
      h.responses.push({ status: response.status, text, headers });
    }

    return { status: response.status, text, body: (text ? JSON.parse(text) : {}) as Record<string, any> };
  }

  type Org = Awaited<ReturnType<typeof createOrgWithUser>> & { readonly name: string };

  async function newOrg(h: Harness, tag: string, email: string, password: string): Promise<Org> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const name = `Users Seg S1 ${suffix}`;
    const org = await createOrgWithUser(h.admin, { name, slug: `users-seg-s1-${suffix}`, email, password });

    h.tenantIds.push(org.tenantId);

    return { ...org, name };
  }

  // Ator com papel PERSISTIDO (o RBAC persistente lê `role_permissions`, não o catálogo em código):
  // `tenant_admin` com users.manage, ou `viewer` só com users.read (o 403 do S1·c).
  async function adminOf(h: Harness, org: Org, roleKey: "tenant_admin" | "viewer" = "tenant_admin") {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const permissionKey = roleKey === "tenant_admin" ? "users.manage" : "users.read";
    const permission = await h.admin.permission.upsert({
      where: { key: permissionKey },
      update: {},
      create: { key: permissionKey, description: `Permissão ${permissionKey}` },
    });
    const role =
      (await h.admin.role.findFirst({ where: { tenant_id: org.tenantId, key: roleKey } })) ??
      (await h.admin.role.create({
        data: { tenant_id: org.tenantId, key: roleKey, name: `Papel ${roleKey}`, scope: "tenant" },
      }));

    await h.admin.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: permission.id } },
      update: {},
      create: { role_id: role.id, permission_id: permission.id },
    });

    const user = await h.admin.user.create({
      data: {
        tenant_id: org.tenantId,
        name: "Administrador",
        email: `admin-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({ data: { tenant_id: org.tenantId, user_id: user.id, role_id: role.id } });

    const token = await signAccessToken({ user_id: user.id, tenant_id: org.tenantId, email: user.email, roles: [roleKey] });

    return { userId: user.id, headers: { authorization: `Bearer ${token}` } };
  }

  async function login(h: Harness, tenantId: string, email: string, password: string) {
    return call(h, "/api/v1/auth/login", { method: "POST", body: { tenantId, email, password } });
  }

  async function linkElsewhere(h: Harness, home: Org, other: Org, email: string) {
    const session = await login(h, home.tenantId, email, home.password);

    assert.equal(session.status, 200);

    const relink = await call(h, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: { authorization: `Bearer ${session.body.data.access_token}` },
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relink.status, 201, "a fixture religa a outra organização na identidade do alvo");
  }

  async function credentialOf(h: Harness, org: Org) {
    return h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      select: { password_hash: true, must_change_password: true },
    });
  }

  async function resetAudits(h: Harness, tenantId: string): Promise<number> {
    return h.admin.auditLog.count({ where: { tenant_id: tenantId, action: "user.password_reset" } });
  }

  // Nada muda: hash e marca iguais, nenhuma auditoria de reset, a senha antiga segue entrando.
  async function assertNothingChanged(h: Harness, org: Org, email: string, before: Awaited<ReturnType<typeof credentialOf>>) {
    const after = await credentialOf(h, org);

    assert.equal(after?.password_hash, before?.password_hash, "o hash não mudou");
    assert.equal(after?.must_change_password, false, "a marca não foi ligada");
    assert.equal(await resetAudits(h, org.tenantId), 0, "nenhuma auditoria de reset");
    // Conserto do #527, F4 (mapa da C1, §5.2): nos estados de erro da UEM-03 nenhuma sessão do alvo cai, e
    // nenhuma linha de auditoria DESTA organização carrega id ou nome de outra organização do arquivo.
    assert.equal(
      await h.admin.authSession.count({ where: { tenant_id: org.tenantId, user_id: org.userId, revoked_at: { not: null } } }),
      0,
      "nenhuma sessão do alvo foi revogada",
    );
    const others = await h.admin.tenant.findMany({
      where: { id: { in: h.tenantIds.filter((id) => id !== org.tenantId) } },
      select: { id: true, name: true },
    });
    const ownAudit = JSON.stringify(
      await h.admin.auditLog.findMany({
        where: { tenant_id: org.tenantId },
        select: { action: true, entity: true, entity_id: true, metadata: true },
      }),
    );
    for (const other of others) {
      assert.equal(ownAudit.includes(other.id), false, "a auditoria desta organização não carrega id de outra");
      assert.equal(ownAudit.includes(other.name), false, "a auditoria desta organização não carrega nome de outra");
    }
    assert.equal((await login(h, org.tenantId, email, org.password)).status, 200, "a senha antiga segue entrando");
  }

  test("S1·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("S1·a — identidade em 2 organizações: o admin da 1ª recebe 409 identity_linked_elsewhere e nada muda", async () => {
    const h = await harness();
    const email = `s1a-${Date.now()}@example.com`;
    const home = await newOrg(h, "a-casa", email, "SenhaCasaS1a!");
    const other = await newOrg(h, "a-outra", email, "SenhaOutraS1a!");

    await linkElsewhere(h, home, other, email);

    const admin = await adminOf(h, home);
    const before = await credentialOf(h, home);
    const response = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(response.status, 409, "D-USERS-1: o admin não redefine a senha de quem tem vínculo em outra organização");
    assert.equal(response.body.error?.reason, "identity_linked_elsewhere");
    assert.equal(response.text.includes("temporary_password"), false);
    await assertNothingChanged(h, home, email, before);
  });

  test("S1·b — identidade só na organização do admin: 200 com a provisória uma vez; a provisória entra, a antiga não; sessões revogadas; auditoria sem segredo", async () => {
    const h = await harness();
    const email = `s1b-${Date.now()}@example.com`;
    const home = await newOrg(h, "b", email, "SenhaAntigaS1b!");

    assert.equal((await login(h, home.tenantId, email, home.password)).status, 200, "uma sessão viva do alvo antes do reset");

    const admin = await adminOf(h, home);
    const response = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(response.status, 200);

    const data = response.body.data as {
      user_id: string;
      temporary_password: string;
      must_change_password: boolean;
      revoked_sessions: number;
    };

    assert.deepEqual(Object.keys(data).sort(), ["must_change_password", "revoked_sessions", "temporary_password", "user_id"]);
    assert.equal(data.user_id, home.userId);
    assert.equal(data.must_change_password, true);
    assert.equal(data.revoked_sessions, 1, "a sessão viva do alvo caiu");
    assert.ok(data.temporary_password.length >= 20, "a provisória é longa (18 bytes em base64url)");
    assert.equal(response.text.split(data.temporary_password).length - 1, 1, "a provisória aparece UMA vez na resposta");

    const liveSessions = await h.admin.authSession.count({
      where: { tenant_id: home.tenantId, user_id: home.userId, revoked_at: null },
    });

    assert.equal(liveSessions, 0);
    assert.equal((await login(h, home.tenantId, email, home.password)).status, 401, "a senha antiga não entra");
    assert.equal((await login(h, home.tenantId, email, data.temporary_password)).status, 200, "a provisória entra");
    assert.equal((await credentialOf(h, home))?.must_change_password, true, "a marca da P1 está ligada");

    const audit = await h.admin.auditLog.findFirst({
      where: { tenant_id: home.tenantId, action: "user.password_reset", entity_id: home.userId },
    });

    assert.ok(audit, "o reset fica auditado na organização ativa");
    assert.equal(audit?.actor_user_id, admin.userId, "ator = o administrador");

    const serialized = JSON.stringify(audit);

    assert.equal(serialized.includes(data.temporary_password), false, "a provisória não vai para a auditoria");
    assert.equal(/scrypt|password_hash/i.test(serialized), false, "nem o hash");
  });

  test("S1·c — os códigos fixados: 400 (id e corpo), 401, 403, 404 (outra organização e inexistente), 409 cannot_reset_self, 409 user_inactive", async () => {
    const h = await harness();
    const email = `s1c-${Date.now()}@example.com`;
    const home = await newOrg(h, "c-casa", email, "SenhaCasaS1c!");
    const elsewhere = await newOrg(h, "c-outra", `s1c-outra-${Date.now()}@example.com`, "SenhaOutraS1c!");
    const admin = await adminOf(h, home);
    const viewer = await adminOf(h, home, "viewer");
    const route = (userId: string) => `/api/v1/auth/users/${userId}/reset-password`;

    const malformed = await call(h, route("nao-e-uuid"), { method: "POST", headers: admin.headers, body: {} });

    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error?.reason, "invalid_request");

    const extra = await call(h, route(home.userId), { method: "POST", headers: admin.headers, body: { password: "x" } });

    assert.equal(extra.status, 400);
    assert.equal(extra.body.error?.reason, "invalid_request");

    assert.equal((await call(h, route(home.userId), { method: "POST", body: {} })).status, 401, "sem sessão");
    assert.equal(
      (await call(h, route(home.userId), { method: "POST", headers: viewer.headers, body: {} })).status,
      403,
      "sem users.manage",
    );

    const foreign = await call(h, route(elsewhere.userId), { method: "POST", headers: admin.headers, body: {} });

    assert.equal(foreign.status, 404, "usuário de outra organização = não existe aqui (nunca 403)");
    assert.equal(foreign.body.error?.reason, "user_not_found");

    const missing = await call(h, route("00000000-0000-4000-8000-000000000000"), { method: "POST", headers: admin.headers, body: {} });

    assert.equal(missing.status, 404);
    assert.equal(missing.body.error?.reason, "user_not_found");

    const self = await call(h, route(admin.userId), { method: "POST", headers: admin.headers, body: {} });

    assert.equal(self.status, 409);
    assert.equal(self.body.error?.reason, "cannot_reset_self");

    await h.admin.user.update({ where: { id: home.userId }, data: { status: "inactive" } });

    const inactive = await call(h, route(home.userId), { method: "POST", headers: admin.headers, body: {} });

    assert.equal(inactive.status, 409);
    assert.equal(inactive.body.error?.reason, "user_inactive");
    assert.equal(await resetAudits(h, home.tenantId), 0, "nenhum dos erros mudou nada");
  });

  test("S1·d — a outra organização SUSPENSA ainda conta: 409 identity_linked_elsewhere e nada muda", async () => {
    const h = await harness();
    const email = `s1d-${Date.now()}@example.com`;
    const home = await newOrg(h, "d-casa", email, "SenhaCasaS1d!");
    const other = await newOrg(h, "d-outra", email, "SenhaOutraS1d!");

    await linkElsewhere(h, home, other, email);
    await h.admin.tenant.update({ where: { id: other.tenantId }, data: { status: "inactive" } });

    const admin = await adminOf(h, home);
    const before = await credentialOf(h, home);
    const response = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.error?.reason, "identity_linked_elsewhere");
    await assertNothingChanged(h, home, email, before);
  });

  // Uma transação do administrador do cluster TRAVA o vínculo da outra organização (a forma de um
  // desvínculo ou de uma religação em voo) e só solta quando o teste manda (ou sozinha, depois de
  // `autoReleaseMs`). Com `detach`, ela também MOVE o vínculo para uma identidade nova antes de soltar —
  // a mecânica do desvínculo (§5.4: identidade nova + move), sem confirmar até o teste mandar.
  async function holdOtherLink(
    h: Harness,
    other: Org,
    options: { readonly autoReleaseMs?: number; readonly detach?: boolean } = {},
  ) {
    let release!: () => void;
    let markReady!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const done = h.admin
      .$transaction(
        async (tx) => {
          const [link] = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM auth_identity_links
            WHERE tenant_id = ${other.tenantId}::uuid AND user_id = ${other.userId}::uuid
            FOR UPDATE
          `;

          if (options.detach && link) {
            const fresh = randomUUID();

            await tx.$executeRaw`INSERT INTO auth_identities (id) VALUES (${fresh}::uuid)`;
            await tx.$executeRaw`UPDATE auth_identity_links SET identity_id = ${fresh}::uuid WHERE id = ${link.id}::uuid`;
          }

          markReady();
          await gate;
        },
        { maxWait: 10_000, timeout: 30_000 },
      )
      .catch(() => undefined);

    await ready;

    const timer = options.autoReleaseMs === undefined ? undefined : setTimeout(() => release(), options.autoReleaseMs);

    return async () => {
      if (timer) {
        clearTimeout(timer);
      }

      release();
      await done;
    };
  }

  // Barreira determinística: espera a leitura FOR SHARE do reset (papel efêmero desta suíte) ficar
  // BLOQUEADA na trava. Escopada pelo nome do papel, que é único por execução.
  async function waitForResetBlocked(h: Harness): Promise<void> {
    const deadline = Date.now() + 15_000;

    for (;;) {
      const [row] = await h.admin.$queryRaw<Array<{ waiting: number }>>`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE usename = ${h.role.roleName} AND wait_event_type = 'Lock' AND state = 'active'
          AND query ILIKE '%FOR SHARE%'
      `;

      if ((row?.waiting ?? 0) >= 1) {
        return;
      }

      assert.ok(Date.now() < deadline, "a leitura FOR SHARE do reset não chegou a bloquear na trava");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  test("S1·e — mudança em voo no vínculo da outra organização durante a verificação: 503 reset_unavailable e nada muda", async () => {
    const h = await harness();
    const email = `s1e-${Date.now()}@example.com`;
    const home = await newOrg(h, "e-casa", email, "SenhaCasaS1e!");
    const other = await newOrg(h, "e-outra", email, "SenhaOutraS1e!");

    await linkElsewhere(h, home, other, email);

    const admin = await adminOf(h, home);
    const before = await credentialOf(h, home);
    const service = await h.makeService({ maxWait: 5_000, timeout: 15_000, lockTimeoutMs: 400, statementTimeoutMs: 5_000 });
    const app = await h.startApp(service);
    const unlock = await holdOtherLink(h, other);

    try {
      const response = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
        method: "POST",
        headers: admin.headers,
        body: {},
        baseUrl: app.baseUrl,
      });

      assert.equal(response.status, 503);
      assert.equal(response.body.error?.reason, "reset_unavailable");
    } finally {
      await unlock();
      await closeServer(app.server);
    }

    await assertNothingChanged(h, home, email, before);
  });

  test("S1·e2 — o vínculo da outra organização é REMOVIDO no meio da verificação (barreira determinística): 503 reset_unavailable e nada muda; com o estado firme, o reset passa", async () => {
    const h = await harness();
    const email = `s1e2-${Date.now()}@example.com`;
    const home = await newOrg(h, "e2-casa", email, "SenhaCasaS1e2!");
    const other = await newOrg(h, "e2-outra", email, "SenhaOutraS1e2!");

    await linkElsewhere(h, home, other, email);

    const admin = await adminOf(h, home);
    const before = await credentialOf(h, home);
    // O desvínculo em voo: o vínculo da outra organização já foi movido para uma identidade nova, sem
    // confirmar. O reset vê o vínculo na leitura simples e fica bloqueado na leitura FOR SHARE.
    const unlock = await holdOtherLink(h, other, { detach: true });
    const pending = call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    try {
      await waitForResetBlocked(h);
    } finally {
      // Confirma o desvínculo com o reset bloqueado na trava.
      await unlock();
    }

    const response = await pending;

    assert.equal(response.status, 503, "o vínculo sumiu durante a verificação: o reset não decide sobre estado em movimento");
    assert.equal(response.body.error?.reason, "reset_unavailable");
    await assertNothingChanged(h, home, email, before);

    const retry = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(retry.status, 200, "com a identidade só nesta organização, o reset passa");
  });

  test("S1·f — a transação expira durante a verificação: 503 reset_unavailable e nada muda", async () => {
    const h = await harness();
    const email = `s1f-${Date.now()}@example.com`;
    const home = await newOrg(h, "f-casa", email, "SenhaCasaS1f!");
    const other = await newOrg(h, "f-outra", email, "SenhaOutraS1f!");

    await linkElsewhere(h, home, other, email);

    const admin = await adminOf(h, home);
    const before = await credentialOf(h, home);
    // O prazo da transação (600 ms) vence ANTES da trava soltar (1,5 s); o lock_timeout (10 s) e o
    // statement_timeout (10 s) ficam ALTOS de propósito: quem corta aqui é o prazo, não a trava.
    const service = await h.makeService({ maxWait: 5_000, timeout: 600, lockTimeoutMs: 10_000, statementTimeoutMs: 10_000 });
    const app = await h.startApp(service);
    const unlock = await holdOtherLink(h, other, { autoReleaseMs: 1_500 });

    try {
      const response = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
        method: "POST",
        headers: admin.headers,
        body: {},
        baseUrl: app.baseUrl,
      });

      assert.equal(response.status, 503);
      assert.equal(response.body.error?.reason, "reset_unavailable");
    } finally {
      await unlock();
      await closeServer(app.server);
    }

    await assertNothingChanged(h, home, email, before);
  });

  // O vermelho-controle original da S1 ("admin de A reseta; trocar para B com a sessão do reset falha"), ponta a
  // ponta com o reset REAL: com vínculo em B o reset é recusado (S1·a); sem vínculo, a sessão da provisória não
  // troca de organização nem liga a conta de B — só troca a senha, e aí volta a valer tudo (P-SEG-2).
  test("S1·h — ponta a ponta: a sessão da provisória do reset não troca de organização nem religa; depois da troca de senha, religa", async () => {
    const h = await harness();
    const email = `s1h-${Date.now()}@example.com`;
    const home = await newOrg(h, "h-casa", email, "SenhaCasaS1h!");
    const other = await newOrg(h, "h-outra", email, "SenhaOutraS1h!");
    const admin = await adminOf(h, home);
    const reset = await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(reset.status, 200, "a identidade do alvo só está na organização do admin");

    const temporary = reset.body.data.temporary_password as string;
    const session = await login(h, home.tenantId, email, temporary);

    assert.equal(session.status, 200, "a provisória entra");

    const headers = { authorization: `Bearer ${session.body.data.access_token}` };
    const switchTenant = await call(h, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers,
      body: { tenantId: home.tenantId },
    });

    assert.equal(switchTenant.status, 403);
    assert.equal(switchTenant.body.error?.reason, "password_change_required");

    const relinkBefore = await call(h, "/api/v1/auth/identity-links", {
      method: "POST",
      headers,
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relinkBefore.status, 403, "com a provisória a conta da outra organização não é ligada");
    assert.equal(relinkBefore.body.error?.reason, "password_change_required");

    const changed = await call(h, "/api/v1/auth/password", {
      method: "POST",
      headers,
      body: { currentPassword: temporary, newPassword: "SenhaEscolhidaS1h!" },
    });

    assert.equal(changed.status, 200);

    const fresh = await login(h, home.tenantId, email, "SenhaEscolhidaS1h!");
    const relinkAfter = await call(h, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: { authorization: `Bearer ${fresh.body.data.access_token}` },
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relinkAfter.status, 201, "com a senha escolhida pelo próprio usuário, a religação volta a valer");
  });

  test("S1·g — UEM-03: nenhuma resposta do reset (corpo e cabeçalhos) nem auditoria do reset carrega id ou nome de organização", async () => {
    const h = await harness();
    const email = `s1g-${Date.now()}@example.com`;
    const home = await newOrg(h, "g-casa", email, "SenhaCasaS1g!");
    const other = await newOrg(h, "g-outra", email, "SenhaOutraS1g!");
    const standalone = await newOrg(h, "g-so", `s1g-so-${Date.now()}@example.com`, "SenhaSoS1g!");

    await linkElsewhere(h, home, other, email);

    const homeAdmin = await adminOf(h, home);
    const standaloneAdmin = await adminOf(h, standalone);

    // Recusa (2 organizações), 404 (usuário da outra organização) e sucesso (identidade só aqui).
    await call(h, `/api/v1/auth/users/${home.userId}/reset-password`, { method: "POST", headers: homeAdmin.headers, body: {} });
    await call(h, `/api/v1/auth/users/${other.userId}/reset-password`, { method: "POST", headers: homeAdmin.headers, body: {} });
    await call(h, `/api/v1/auth/users/${standalone.userId}/reset-password`, { method: "POST", headers: standaloneAdmin.headers, body: {} });

    // Nenhuma resposta do reset deste ARQUIVO (todos os testes acima: 200, 400, 401, 403, 404, 409, 503)
    // carrega id ou nome de organização — nem da outra ponta, nem de nenhuma.
    const tenants = await h.admin.tenant.findMany({ where: { id: { in: h.tenantIds } }, select: { id: true, name: true } });
    const links = await h.admin.authIdentityLink.findMany({ where: { tenant_id: { in: h.tenantIds } }, select: { id: true } });
    const forbidden = [...tenants.flatMap((tenant) => [tenant.id, tenant.name]), ...links.map((link) => link.id)];

    assert.ok(h.responses.length >= 10, `as respostas do reset deste arquivo foram guardadas (${h.responses.length})`);

    for (const response of h.responses) {
      for (const value of forbidden) {
        assert.equal(response.text.includes(value), false, `corpo do ${response.status} sem id/nome de organização`);
        assert.equal(response.headers.includes(value), false, `cabeçalhos do ${response.status} sem id/nome de organização`);
      }
    }

    // A auditoria do reset (`user.password_reset`) não carrega id nem nome de organização além da coluna
    // `tenant_id` da própria linha (a organização ativa do admin), nem id de vínculo.
    const audits = await h.admin.auditLog.findMany({
      where: { tenant_id: { in: h.tenantIds }, action: "user.password_reset" },
      select: { actor_user_id: true, entity: true, entity_id: true, metadata: true },
    });

    assert.ok(audits.length >= 1, "há reset bem-sucedido auditado para varrer");

    const auditText = JSON.stringify(audits);

    for (const value of forbidden) {
      assert.equal(auditText.includes(value), false, "a auditoria do reset não carrega id/nome de organização nem de vínculo");
    }
  });

  // Mapa de códigos do reset (conserto do #527, F4; §5.2 item 1): os dois códigos de borda que o S1·c conferia só
  // pelo status passam a ter código E motivo conferidos (sem o motivo, uma camada esconde a outra).
  test("C1·mapa — 401 sem sessão (UNAUTHORIZED jwt_required) e 403 sem users.manage (FORBIDDEN permission_required)", async () => {
    const h = await harness();
    const email = `c1m-${Date.now()}@example.com`;
    const home = await newOrg(h, "c1m", email, "SenhaCasaC1m!");
    const viewer = await adminOf(h, home, "viewer");
    const before = await credentialOf(h, home);
    const route = `/api/v1/auth/users/${home.userId}/reset-password`;
    const anonymous = await call(h, route, { method: "POST", body: {} });

    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error?.code, "UNAUTHORIZED");
    assert.equal(anonymous.body.error?.reason, "jwt_required");

    const denied = await call(h, route, { method: "POST", headers: viewer.headers, body: {} });

    assert.equal(denied.status, 403);
    assert.equal(denied.body.error?.code, "FORBIDDEN");
    assert.equal(denied.body.error?.reason, "permission_required");
    assert.deepEqual(await credentialOf(h, home), before, "nada muda");
  });

  test("A8/A8b — administrador da organização não redefine alvo com papel de plataforma", async () => {
    const h = await harness();
    const { PLATFORM_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");

    for (const platformRole of PLATFORM_ROLES) {
      const email = `a8-${platformRole}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
      const org = await newOrg(h, `a8-${platformRole}`, email, "SenhaAntigaA8!");
      const admin = await adminOf(h, org);
      const platform =
        (await h.admin.role.findFirst({ where: { tenant_id: null, key: platformRole } })) ??
        (await h.admin.role.create({
          data: { tenant_id: null, key: platformRole, name: `Papel ${platformRole}`, scope: "platform" },
        }));

      await h.admin.userRoleAssignment.create({
        data: { tenant_id: org.tenantId, user_id: org.userId, role_id: platform.id },
      });
      assert.equal((await login(h, org.tenantId, email, org.password)).status, 200);
      const before = await credentialOf(h, org);
      const sessionsBefore = await h.admin.authSession.count({
        where: { tenant_id: org.tenantId, user_id: org.userId, revoked_at: null },
      });
      const auditsBefore = await resetAudits(h, org.tenantId);

      const response = await call(h, `/api/v1/auth/users/${org.userId}/reset-password`, {
        method: "POST",
        headers: admin.headers,
        body: {},
      });

      assert.equal(response.status, 403, platformRole);
      assert.equal(response.body.error?.reason, "target_not_manageable", platformRole);
      assert.equal(response.body.error?.message, "This account cannot be managed by an organization administrator.");
      // Varredura da UEM-03 sobre esta resposta (corpo e cabeçalhos): nem id nem nome de organização, nem o papel.
      const swept = h.responses[h.responses.length - 1];
      assert.ok(swept && swept.status === 403, "a resposta da recusa foi capturada para a varredura");
      for (const value of [org.tenantId, org.name, platform.id, org.userId]) {
        assert.equal(`${swept.text}\n${swept.headers}`.includes(value), false, `a recusa não carrega ${platformRole}`);
      }
      assert.deepEqual(await credentialOf(h, org), before, "hash e marca não mudam");
      assert.equal(
        await h.admin.authSession.count({ where: { tenant_id: org.tenantId, user_id: org.userId, revoked_at: null } }),
        sessionsBefore,
        "sessões seguem vivas",
      );
      assert.equal(await resetAudits(h, org.tenantId), auditsBefore, "sem auditoria de sucesso");
    }
  });
}
