import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";
import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S1 × P-SEG-2 (Emenda 1, UEM-02 resto) — o reset por administrador e uma
// religação simultâneos NÃO passam os dois. As travas de serialização sob prova:
//   T1 — o reset trava o vínculo do PAR do alvo com FOR UPDATE antes de ler a identidade dele;
//   T2 — a religação trava o vínculo do PAR do ATOR com FOR SHARE;
//   T3 — e só DEPOIS dessa trava relê a marca da senha provisória do ator.
// (A religação já relia a marca da conta PROVADA depois do FOR UPDATE do vínculo provado — P-SEG-2, 4b.)
//
// Cada caso põe um lado como uma transação CONTROLADA pelo teste (o administrador do cluster faz as
// mesmas travas e o mesmo efeito do lado real, e só confirma quando o teste manda) e o outro lado como o
// PRODUTO (rota real, papel efêmero NOSUPERUSER NOBYPASSRLS). Barreira determinística: o teste só confirma
// o lado controlado depois de ver, no `pg_stat_activity`, a instrução do produto BLOQUEADA na trava (filtro
// pelo nome do papel efêmero, único por execução) — ou depois de o produto já ter respondido, que é
// exatamente o desfecho que a trava ausente produz. Sem relógio.
//   SR·1a — o alvo é o ATOR de uma religação que vence: o reset responde 409 (a identidade agora está em
//           outra organização) e nada muda na credencial do alvo;
//   SR·1b — o reset vence: a religação do alvo responde 403 password_change_required e o vínculo não move;
//   SR·2a — o alvo é a conta PROVADA de uma religação que vence: o reset responde 409 e nada muda;
//   SR·2b — o reset vence: a religação que prova o alvo responde 403 e o vínculo não move.
// Vermelho-controle (UEM-02): o estágio intermediário — o reset já com a verificação da P-SEG-1, sem T1,
// T2 e T3 — com o desfecho duplo registrado no diário.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · serialização reset × religação exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  // O login real (a prova de credencial da religação) roda no cliente GLOBAL do produto, que lê o
  // DATABASE_URL quando é importado pela primeira vez: o carimbo de `application_name` deixa a barreira
  // ver também a espera dele (ele trava a linha da credencial quando registra o login). O cliente
  // administrador do teste usa a URL sem o carimbo.
  const productApplicationName = buildApplicationName("users-seg-sr");

  process.env.DATABASE_URL = withApplicationName(connectionString, productApplicationName);

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly baseUrl: string;
    readonly server: Server;
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
      const service = new IdentityLinkService(
        client,
        async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
        (tx) => new AuditLogRepository(tx),
        verifyPassword,
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
      const app = express();

      app.use(express.json());
      app.use("/api/v1/auth", createIdentityLinkRouter(async () => service));
      app.use(
        "/api/v1/auth",
        createAuthRouter({
          getCoreSaasService: async () => coreSaas,
          getIdentityLinkService: async () => service,
          resolvePersistentAuthorization: createPersistentAuthorizationResolver(client),
        }),
      );

      const server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      return { admin, role, tenantIds: [], baseUrl, server };
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

  async function call(h: Harness, path: string, init: { headers?: Record<string, string>; body?: unknown } = {}) {
    const response = await fetch(`${h.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      body: JSON.stringify(init.body ?? {}),
    });
    const text = await response.text();

    return { status: response.status, body: (text ? JSON.parse(text) : {}) as Record<string, any> };
  }

  type Org = Awaited<ReturnType<typeof createOrgWithUser>>;

  async function newOrg(h: Harness, tag: string, email: string, password: string): Promise<Org> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const org = await createOrgWithUser(h.admin, {
      name: `Users Seg SR ${suffix}`,
      slug: `users-seg-sr-${suffix}`,
      email,
      password,
    });

    h.tenantIds.push(org.tenantId);

    return org;
  }

  async function adminOf(h: Harness, org: Org) {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const permission = await h.admin.permission.upsert({
      where: { key: "users.manage" },
      update: {},
      create: { key: "users.manage", description: "Permissão users.manage" },
    });
    const role =
      (await h.admin.role.findFirst({ where: { tenant_id: org.tenantId, key: "tenant_admin" } })) ??
      (await h.admin.role.create({
        data: { tenant_id: org.tenantId, key: "tenant_admin", name: "Papel tenant_admin", scope: "tenant" },
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
        email: `admin-sr-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({ data: { tenant_id: org.tenantId, user_id: user.id, role_id: role.id } });

    const token = await signAccessToken({ user_id: user.id, tenant_id: org.tenantId, email: user.email, roles: ["tenant_admin"] });

    return { authorization: `Bearer ${token}` };
  }

  // Sessão do próprio usuário (o login real cria o vínculo do par — a identidade nasce aqui).
  async function sessionOf(h: Harness, org: Org) {
    const login = await call(h, "/api/v1/auth/login", {
      body: { tenantId: org.tenantId, email: org.email, password: org.password },
    });

    assert.equal(login.status, 200, "login do próprio usuário");

    return { authorization: `Bearer ${login.body.data.access_token}` };
  }

  async function linkOf(h: Harness, org: Org) {
    const [row] = await h.admin.$queryRaw<Array<{ id: string; identity_id: string }>>`
      SELECT id, identity_id FROM auth_identity_links
      WHERE tenant_id = ${org.tenantId}::uuid AND user_id = ${org.userId}::uuid
    `;

    assert.ok(row, "o par tem vínculo de identidade");

    return row;
  }

  async function credentialOf(h: Harness, org: Org) {
    return h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      select: { password_hash: true, must_change_password: true },
    });
  }

  // O lado CONTROLADO pelo teste: uma transação do administrador do cluster que faz as mesmas travas e o
  // mesmo efeito do lado real e só confirma quando o teste manda.
  async function controlledSide(h: Harness, work: (tx: Prisma.TransactionClient) => Promise<void>) {
    let release!: () => void;
    let markReady!: () => void;
    let failure: unknown;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const done = h.admin
      .$transaction(
        async (tx) => {
          await work(tx);
          markReady();
          await gate;
        },
        { maxWait: 10_000, timeout: 30_000 },
      )
      .catch((error: unknown) => {
        failure = error;
        markReady();
      });

    await ready;

    if (failure) {
      throw failure;
    }

    return async () => {
      release();
      await done;

      if (failure) {
        throw failure;
      }
    };
  }

  // Barreira: a instrução do PRODUTO (papel efêmero) bloqueada numa trava de linha, ou o produto já
  // respondeu (o que a trava ausente produz). Devolve qual dos dois — o teste não depende de relógio.
  async function blockedOrSettled(h: Harness, pending: Promise<unknown>): Promise<"bloqueado" | "respondeu"> {
    let settled = false;

    void pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    const deadline = Date.now() + 15_000;

    for (;;) {
      if (settled) {
        return "respondeu";
      }

      const [row] = await h.admin.$queryRaw<Array<{ waiting: number }>>`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE (usename = ${h.role.roleName} OR application_name = ${productApplicationName})
          AND wait_event_type = 'Lock' AND state = 'active'
      `;

      if ((row?.waiting ?? 0) >= 1) {
        return "bloqueado";
      }

      assert.ok(Date.now() < deadline, "o produto nem bloqueou nem respondeu");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  // A barreira e, aconteça o que acontecer, a confirmação do lado controlado (um teste que falha não deixa
  // trava presa para o seguinte).
  async function barrierThenCommit(h: Harness, pending: Promise<unknown>, commit: () => Promise<void>) {
    try {
      return await blockedOrSettled(h, pending);
    } finally {
      await commit();
    }
  }

  test("SR·0 — o produto roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("SR·1a — o ALVO religa outra organização e a religação vence: o reset responde 409 e nada muda na credencial", async () => {
    const h = await harness();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const home = await newOrg(h, "1a-casa", `sr1a-casa-${stamp}@example.com`, "SenhaCasaSR1a!");
    const other = await newOrg(h, "1a-outra", `sr1a-outra-${stamp}@example.com`, "SenhaOutraSR1a!");

    await sessionOf(h, home);
    await sessionOf(h, other);

    const homeLink = await linkOf(h, home);
    const otherLink = await linkOf(h, other);
    const headers = await adminOf(h, home);
    const before = await credentialOf(h, home);
    // A religação do alvo (ator = o par do alvo), controlada: a trava T2 no vínculo do ator e o efeito — o
    // vínculo da outra organização passa para a identidade do alvo.
    const commit = await controlledSide(h, async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${homeLink.id}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${otherLink.id}::uuid FOR UPDATE`;
      await tx.$executeRaw`UPDATE auth_identity_links SET identity_id = ${homeLink.identity_id}::uuid WHERE id = ${otherLink.id}::uuid`;
    });
    const pending = call(h, `/api/v1/auth/users/${home.userId}/reset-password`, { headers });
    const barrier = await barrierThenCommit(h, pending, commit);

    const reset = await pending;
    const moved = await linkOf(h, other);
    const after = await credentialOf(h, home);

    assert.equal(moved.identity_id, homeLink.identity_id, "a religação confirmou: o vínculo da outra organização é do alvo");
    assert.equal(
      reset.status,
      409,
      `um só efeito: com a religação confirmada, o reset recusa (barreira: ${barrier}; o reset respondeu ${reset.status})`,
    );
    assert.equal(reset.body.error?.reason, "identity_linked_elsewhere");
    assert.equal(after?.password_hash, before?.password_hash, "a senha do alvo não mudou");
    assert.equal(after?.must_change_password, false, "a marca não foi ligada");
  });

  test("SR·1b — o reset vence: a religação do ALVO responde 403 password_change_required e o vínculo não move", async () => {
    const h = await harness();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const home = await newOrg(h, "1b-casa", `sr1b-casa-${stamp}@example.com`, "SenhaCasaSR1b!");
    const other = await newOrg(h, "1b-outra", `sr1b-outra-${stamp}@example.com`, "SenhaOutraSR1b!");
    const targetSession = await sessionOf(h, home);

    await sessionOf(h, other);

    const homeLink = await linkOf(h, home);
    const otherLink = await linkOf(h, other);
    // O reset, controlado: a trava T1 no vínculo do par do alvo e o efeito — a marca da provisória ligada.
    const commit = await controlledSide(h, async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${homeLink.id}::uuid FOR UPDATE`;
      await tx.$executeRaw`
        UPDATE local_auth_credentials SET must_change_password = true
        WHERE tenant_id = ${home.tenantId}::uuid AND user_id = ${home.userId}::uuid
      `;
    });
    const pending = call(h, "/api/v1/auth/identity-links", {
      headers: targetSession,
      body: { tenantId: other.tenantId, email: other.email, password: other.password },
    });
    const barrier = await barrierThenCommit(h, pending, commit);

    const relink = await pending;
    const unmoved = await linkOf(h, other);

    assert.equal((await credentialOf(h, home))?.must_change_password, true, "o reset confirmou: a marca está ligada");
    assert.equal(
      relink.status,
      403,
      `um só efeito: com o reset confirmado, a religação do alvo recusa (barreira: ${barrier}; a religação respondeu ${relink.status})`,
    );
    assert.equal(relink.body.error?.reason, "password_change_required");
    assert.equal(unmoved.identity_id, otherLink.identity_id, "o vínculo da outra organização não moveu");
  });

  test("SR·2a — o ALVO é a conta provada de uma religação que vence: o reset responde 409 e nada muda na credencial", async () => {
    const h = await harness();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const home = await newOrg(h, "2a-casa", `sr2a-casa-${stamp}@example.com`, "SenhaCasaSR2a!");
    const elsewhere = await newOrg(h, "2a-ator", `sr2a-ator-${stamp}@example.com`, "SenhaAtorSR2a!");

    await sessionOf(h, home);
    await sessionOf(h, elsewhere);

    const homeLink = await linkOf(h, home);
    const actorLink = await linkOf(h, elsewhere);
    const headers = await adminOf(h, home);
    const before = await credentialOf(h, home);
    // A religação de OUTRO ator que prova a conta do alvo, controlada: o FOR UPDATE do vínculo provado e o
    // efeito — o vínculo do alvo passa para a identidade do ator.
    const commit = await controlledSide(h, async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${actorLink.id}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${homeLink.id}::uuid FOR UPDATE`;
      await tx.$executeRaw`UPDATE auth_identity_links SET identity_id = ${actorLink.identity_id}::uuid WHERE id = ${homeLink.id}::uuid`;
    });
    const pending = call(h, `/api/v1/auth/users/${home.userId}/reset-password`, { headers });
    const barrier = await barrierThenCommit(h, pending, commit);

    const reset = await pending;
    const moved = await linkOf(h, home);
    const after = await credentialOf(h, home);

    assert.equal(moved.identity_id, actorLink.identity_id, "a religação confirmou: o vínculo do alvo é do ator");
    assert.equal(
      reset.status,
      409,
      `um só efeito: com a religação confirmada, o reset recusa (barreira: ${barrier}; o reset respondeu ${reset.status})`,
    );
    assert.equal(reset.body.error?.reason, "identity_linked_elsewhere");
    assert.equal(after?.password_hash, before?.password_hash, "a senha do alvo não mudou");
    assert.equal(after?.must_change_password, false, "a marca não foi ligada");
  });

  test("SR·2b — o reset vence: a religação que PROVA o alvo responde 403 password_change_required e o vínculo não move", async () => {
    const h = await harness();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const home = await newOrg(h, "2b-casa", `sr2b-casa-${stamp}@example.com`, "SenhaCasaSR2b!");
    const elsewhere = await newOrg(h, "2b-ator", `sr2b-ator-${stamp}@example.com`, "SenhaAtorSR2b!");

    await sessionOf(h, home);

    const actorSession = await sessionOf(h, elsewhere);
    const homeLink = await linkOf(h, home);
    const commit = await controlledSide(h, async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_identity_links WHERE id = ${homeLink.id}::uuid FOR UPDATE`;
      await tx.$executeRaw`
        UPDATE local_auth_credentials SET must_change_password = true
        WHERE tenant_id = ${home.tenantId}::uuid AND user_id = ${home.userId}::uuid
      `;
    });
    const pending = call(h, "/api/v1/auth/identity-links", {
      headers: actorSession,
      body: { tenantId: home.tenantId, email: home.email, password: home.password },
    });
    const barrier = await barrierThenCommit(h, pending, commit);

    const relink = await pending;
    const unmoved = await linkOf(h, home);

    assert.equal(
      relink.status,
      403,
      `um só efeito: com o reset confirmado, a religação que prova o alvo recusa (barreira: ${barrier}; respondeu ${relink.status})`,
    );
    assert.equal(relink.body.error?.reason, "password_change_required");
    assert.equal(unmoved.identity_id, homeLink.identity_id, "o vínculo do alvo não moveu");
  });

}
