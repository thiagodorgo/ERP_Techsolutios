import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  createEphemeralRole,
  withRoleCatalogLock,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";
import { grantAuthLoginCandidatesExecuteToRole } from "./helpers/auth-login-candidates-grant.js";
import { createPrismaClient } from "../src/database/pg-connection.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S-c (SC, D3-2) — a saída do grupo derruba os acessos na hora, pelo dia de negócio de
// São Paulo. Suíte -db da fatia: role EFÊMERA NOSUPERUSER NOBYPASSRLS (o RLS existe), semeadura
// direta do par `concessao` (a rota do S2a está em paralelo) e os testes X1 a X6.
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
// O modo `prisma` é forçado ANTES de qualquer import de src/ (o portão e a conferência só existem
// no caminho do banco; sem isso, sessionLiveness devolveria "skipped").
process.env.CORE_SAAS_PERSISTENCE = "prisma";

const connectionString = process.env.DATABASE_URL;

const randomHex = (length: number): string => randomBytes(length).toString("hex");

if (!connectionString) {
  test("B-APP-ORG-2S-c (X1 a X6) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar esta suíte.",
  });
} else {
  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly groupIds: string[];
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const admin = createPrismaClient(connectionString);
      const role = await createEphemeralRole(admin, connectionString);

      // O portão e os serviços usam o Prisma GLOBAL; ele é o papel efêmero.
      (globalThis as { prisma?: unknown }).prisma = role.client;

      // A função elevada auth_login_candidates nasce sem EXECUTE (runbook humano). O teste X2
      // (Entrar) precisa listar candidatos sob o papel efêmero; a concessão vive SÓ nesta suíte, no
      // lock de catálogo, e morre junto com a role no teardown (DROP OWNED BY).
      await withRoleCatalogLock(admin, async (tx) => {
        await grantAuthLoginCandidatesExecuteToRole(tx, role.roleName);
      });

      return { admin, role, tenantIds: [], groupIds: [] };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await h.admin.userCreationLog.deleteMany({ where: { tenant_id: { in: h.tenantIds } } });
      await h.admin.economicGroupMember.deleteMany({ where: { tenant_id: { in: h.tenantIds } } });
      await h.admin.economicGroup.deleteMany({ where: { id: { in: h.groupIds } } });
      await cleanupIdentityFixture(h.admin, h.tenantIds);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  type ConcessaoScenario = {
    readonly groupId: string;
    readonly originTenantId: string;
    readonly destTenantId: string;
    readonly originUserId: string;
    readonly destUserId: string;
    readonly identityId: string;
    readonly originSessionId: string;
    readonly destSessionId: string;
    readonly email: string;
  };

  async function newTenant(h: Harness, tag: string): Promise<{ readonly id: string }> {
    const suffix = `${tag}-${Date.now()}-${randomHex(4)}`;
    const tenant = await h.admin.tenant.create({
      data: { name: `SC ${suffix}`, slug: `sc-${suffix.toLowerCase()}` },
    });
    h.tenantIds.push(tenant.id);
    return tenant;
  }

  async function newGroup(h: Harness, tag: string): Promise<{ readonly id: string }> {
    const suffix = `${tag}-${Date.now()}-${randomHex(4)}`;
    const group = await h.admin.economicGroup.create({ data: { name: `SC Grupo ${suffix}` } });
    h.groupIds.push(group.id);
    return group;
  }

  async function insertMembership(
    h: Harness,
    tenantId: string,
    groupId: string,
    validFrom: string,
    validTo: string | null,
  ): Promise<void> {
    if (validTo === null) {
      await h.admin.$executeRaw`
        INSERT INTO economic_group_members (tenant_id, group_id, valid_from)
        VALUES (${tenantId}::uuid, ${groupId}::uuid, ${validFrom}::date)
      `;
      return;
    }

    await h.admin.$executeRaw`
      INSERT INTO economic_group_members (tenant_id, group_id, valid_from, valid_to)
      VALUES (${tenantId}::uuid, ${groupId}::uuid, ${validFrom}::date, ${validTo}::date)
    `;
  }

  async function leaveGroup(h: Harness, tenantId: string): Promise<void> {
    await h.admin.economicGroupMember.deleteMany({ where: { tenant_id: tenantId } });
  }

  async function newUser(h: Harness, tenantId: string, email: string): Promise<{ readonly id: string }> {
    return h.admin.user.create({
      data: { tenant_id: tenantId, name: `Usuário ${email}`, email, status: "active" },
      select: { id: true },
    });
  }

  async function linkUser(
    h: Harness,
    identityId: string,
    tenantId: string,
    userId: string,
    attachedVia: string,
  ): Promise<void> {
    await h.admin.authIdentityLink.create({
      data: { identity_id: identityId, tenant_id: tenantId, user_id: userId, attached_via: attachedVia },
    });
  }

  async function newCredential(h: Harness, tenantId: string, userId: string, email: string): Promise<void> {
    await h.admin.localAuthCredential.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        email,
        password_hash: randomHex(32),
        password_algorithm: "scrypt",
      },
    });
  }

  async function newCreationLog(
    h: Harness,
    tenantId: string,
    userId: string,
    originTenantId: string,
  ): Promise<void> {
    await h.admin.userCreationLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        origin_tenant_id: originTenantId,
        state: "concessao",
        email_key: randomHex(32),
      },
    });
  }

  async function newSession(h: Harness, tenantId: string, userId: string): Promise<{ readonly id: string }> {
    return h.admin.authSession.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        refresh_token_hash: randomHex(32),
        expires_at: new Date(Date.now() + 3_600_000),
      },
      select: { id: true },
    });
  }

  async function seedConcessaoPair(
    h: Harness,
    tag: string,
    options: { readonly originValidTo?: string | null } = {},
  ): Promise<ConcessaoScenario> {
    const group = await newGroup(h, tag);
    const origin = await newTenant(h, `${tag}p`);
    const dest = await newTenant(h, `${tag}y`);
    await insertMembership(h, origin.id, group.id, "2026-11-01", options.originValidTo ?? null);
    await insertMembership(h, dest.id, group.id, "2026-11-01", null);

    const email = `sc-${tag}-${Date.now()}-${randomHex(4)}@example.com`;
    const originUser = await newUser(h, origin.id, email);
    const destUser = await newUser(h, dest.id, email);
    const identity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });

    await linkUser(h, identity.id, origin.id, originUser.id, "backfill");
    await linkUser(h, identity.id, dest.id, destUser.id, "concessao");
    await newCreationLog(h, dest.id, destUser.id, origin.id);
    await newCredential(h, origin.id, originUser.id, email);
    await newCredential(h, dest.id, destUser.id, email);
    const originSession = await newSession(h, origin.id, originUser.id);
    const destSession = await newSession(h, dest.id, destUser.id);

    return {
      groupId: group.id,
      originTenantId: origin.id,
      destTenantId: dest.id,
      originUserId: originUser.id,
      destUserId: destUser.id,
      identityId: identity.id,
      originSessionId: originSession.id,
      destSessionId: destSession.id,
      email,
    };
  }

  async function coreSaasService(h: Harness): Promise<InstanceType<typeof import("../src/modules/core-saas/services/prisma-core-saas.service.js")["PrismaCoreSaasService"]>> {
    const [{ PrismaCoreSaasService }, { PrismaCoreSaasStore }, { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository }] =
      await Promise.all([
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
      ]);
    const client = h.role.client;
    return new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new TenantRepository(client),
        new UserRepository(client),
        new RoleRepository(client),
        new UserRoleRepository(client),
        new AuditLogRepository(client),
      ),
    );
  }

  test("SC·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.rolsuper, false, "o papel efêmero não pode ser superusuário");
    assert.equal(rows[0]?.rolbypassrls, false, "o papel efêmero não pode contornar o RLS");
  });

  test("X1 — a origem sai do grupo hoje: o token de Y cai na conferência, usuário inativo, sessões revogadas e auditoria em Y; o par de origem segue entrando", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x1");
    const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");

    await leaveGroup(h, fx.originTenantId);

    const verdict = await sessionLiveness.check({
      userId: fx.destUserId,
      tenantId: fx.destTenantId,
      sessionId: fx.destSessionId,
    });

    assert.equal(verdict, "inactive", "a próxima requisição com o token de Y dá 401 (o portão recebe inactive)");

    const destUser = await h.admin.user.findFirst({
      where: { id: fx.destUserId, tenant_id: fx.destTenantId },
      select: { status: true },
    });
    assert.equal(destUser?.status, "inactive", "o usuário de Y fica inativo");

    const destSession = await h.admin.authSession.findFirst({
      where: { id: fx.destSessionId, tenant_id: fx.destTenantId },
      select: { revoked_at: true },
    });
    assert.notEqual(destSession?.revoked_at, null, "a sessão de Y cai");

    const audit = await h.admin.auditLog.findFirst({
      where: { tenant_id: fx.destTenantId, action: "user.access_ended_group_exit", entity: "user", entity_id: fx.destUserId },
      select: { id: true },
    });
    assert.ok(audit, "auditoria user.access_ended_group_exit em Y");

    const originVerdict = await sessionLiveness.check({
      userId: fx.originUserId,
      tenantId: fx.originTenantId,
      sessionId: fx.originSessionId,
    });
    assert.equal(originVerdict, "alive", "o par de P segue entrando (vínculo de origem não é concessao)");
  });

  test("X2 — active-tenant: a organização pedida devolve null (a rota responde 403)", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x2a");
    const service = await coreSaasService(h);

    const actor = {
      userId: fx.originUserId,
      tenantId: fx.originTenantId,
      email: fx.email,
      roles: [] as string[],
      authType: "jwt" as const,
    };

    await leaveGroup(h, fx.originTenantId);

    const membership = await service.findMembershipForIdentity(actor, fx.destTenantId);
    assert.equal(membership, null, "active-tenant devolve null (a rota responde 403)");
  });

  test("X2 — Entrar: Y não é candidato, o par de origem segue candidato", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x2b");
    const service = await coreSaasService(h);

    await leaveGroup(h, fx.originTenantId);

    const candidates = await service.listLoginCandidates(fx.email);
    assert.deepEqual(
      candidates.map((candidate) => candidate.tenantId),
      [fx.originTenantId],
      "o Entrar exclui Y; o par de origem segue candidato",
    );
  });

  test("X2 — renovação: a sessão de Y responde 401 (revoked)", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x2c");

    const { AuthSessionService } = await import("../src/modules/auth/index.js");
    const { withTenantRls } = await import("../src/database/rls.js");
    const sessions = new AuthSessionService((tenantId, work) => withTenantRls(h.role.client, tenantId, work));
    const created = await sessions.createSession({ tenant_id: fx.destTenantId, user_id: fx.destUserId });

    await leaveGroup(h, fx.originTenantId);

    const refresh = await sessions.refreshSession(created.refreshToken);
    assert.deepEqual(refresh, { ok: false, reason: "revoked" }, "a renovação responde 401 (revoked)");
  });

  test("X3 — Y sai do grupo: os acessos que Y deu caem, os que Y recebeu caem e os logins criados em Y seguem", async () => {
    const h = await harness();
    const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");

    const group = await newGroup(h, "x3");
    const origin = await newTenant(h, "x3p");
    const dest = await newTenant(h, "x3y");
    await insertMembership(h, origin.id, group.id, "2026-11-01", null);
    await insertMembership(h, dest.id, group.id, "2026-11-01", null);

    const emailGiven = `sc-x3-given-${Date.now()}-${randomHex(4)}@example.com`;
    const emailReceived = `sc-x3-received-${Date.now()}-${randomHex(4)}@example.com`;
    const emailHome = `sc-x3-home-${Date.now()}-${randomHex(4)}@example.com`;

    // (a) Y deu acesso a P: par em P, origem Y.
    const givenUserP = await newUser(h, origin.id, emailGiven);
    const givenIdentity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });
    await linkUser(h, givenIdentity.id, origin.id, givenUserP.id, "concessao");
    await newCreationLog(h, origin.id, givenUserP.id, dest.id);
    await newCredential(h, origin.id, givenUserP.id, emailGiven);
    const givenSessionP = await newSession(h, origin.id, givenUserP.id);

    // (b) P deu acesso a Y: par em Y, origem P (a direção que a MX5 protege).
    const receivedUserY = await newUser(h, dest.id, emailReceived);
    const receivedIdentity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });
    await linkUser(h, receivedIdentity.id, dest.id, receivedUserY.id, "concessao");
    await newCreationLog(h, dest.id, receivedUserY.id, origin.id);
    await newCredential(h, dest.id, receivedUserY.id, emailReceived);
    const receivedSessionY = await newSession(h, dest.id, receivedUserY.id);

    // (c) login criado em Y (vínculo próprio, não concessao).
    const homeUserY = await newUser(h, dest.id, emailHome);
    const homeIdentity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });
    await linkUser(h, homeIdentity.id, dest.id, homeUserY.id, "backfill");
    await newCredential(h, dest.id, homeUserY.id, emailHome);
    const homeSessionY = await newSession(h, dest.id, homeUserY.id);

    await leaveGroup(h, dest.id);

    const givenVerdict = await sessionLiveness.check({
      userId: givenUserP.id,
      tenantId: origin.id,
      sessionId: givenSessionP.id,
    });
    assert.equal(givenVerdict, "inactive", "o acesso que Y deu a P cai");

    const receivedVerdict = await sessionLiveness.check({
      userId: receivedUserY.id,
      tenantId: dest.id,
      sessionId: receivedSessionY.id,
    });
    assert.equal(receivedVerdict, "inactive", "o acesso que Y recebeu de P cai (a MX5 morre aqui)");

    const homeVerdict = await sessionLiveness.check({
      userId: homeUserY.id,
      tenantId: dest.id,
      sessionId: homeSessionY.id,
    });
    assert.equal(homeVerdict, "alive", "login criado em Y (não concessao) segue entrando");
  });

  test("X4 — saída agendada: antes do dia funciona; com o relógio no dia de São Paulo, cai", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x4", { originValidTo: "2026-11-21" });
    const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");
    const { groupProbeClock } = await import("../src/modules/core-saas/services/group-peer-probe.js");

    const realNow = groupProbeClock.now;

    try {
      // 22:30 de São Paulo do dia 20/11: a saída marcada para 21/11 ainda não vale.
      groupProbeClock.now = () => new Date("2026-11-21T01:30:00Z");
      const before = await sessionLiveness.check({
        userId: fx.destUserId,
        tenantId: fx.destTenantId,
        sessionId: fx.destSessionId,
      });
      assert.equal(before, "alive", "antes do dia, o par concessao segue vivo");

      const activeBefore = await h.admin.user.findFirst({
        where: { id: fx.destUserId, tenant_id: fx.destTenantId },
        select: { status: true },
      });
      assert.equal(activeBefore?.status, "active");

      // 00:00 de São Paulo do dia 21/11: a saída passa a valer.
      groupProbeClock.now = () => new Date("2026-11-21T03:00:00Z");
      const after = await sessionLiveness.check({
        userId: fx.destUserId,
        tenantId: fx.destTenantId,
        sessionId: fx.destSessionId,
      });
      assert.equal(after, "inactive", "no dia de São Paulo, o par concessao cai");

      const activeAfter = await h.admin.user.findFirst({
        where: { id: fx.destUserId, tenant_id: fx.destTenantId },
        select: { status: true },
      });
      assert.equal(activeAfter?.status, "inactive");
    } finally {
      groupProbeClock.now = realNow;
    }
  });

  test("X5 — par que não é concessao: exatamente 1 leitura (o modo do vínculo), nenhuma leitura de grupo e nenhuma queda", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x5");

    const { withTenantRls } = await import("../src/database/rls.js");
    const { isGrantOutsideGroup } = await import("../src/modules/core-saas/services/grant-group-guard.js");

    const counts = { link: 0, group: 0, log: 0 };

    const wrap = (tx: Prisma.TransactionClient): Prisma.TransactionClient =>
      new Proxy(tx, {
        get(target, prop) {
          if (prop === "authIdentityLink") {
            return new Proxy(Reflect.get(target, prop), {
              get(target2, prop2) {
                const value = Reflect.get(target2, prop2);
                if (prop2 === "findFirst") {
                  return (...args: unknown[]) => {
                    counts.link += 1;
                    return (value as (...a: unknown[]) => unknown).apply(target2, args);
                  };
                }
                return typeof value === "function" ? value.bind(target2) : value;
              },
            });
          }
          if (prop === "userCreationLog") {
            return new Proxy(Reflect.get(target, prop), {
              get(target2, prop2) {
                const value = Reflect.get(target2, prop2);
                if (prop2 === "findFirst") {
                  return (...args: unknown[]) => {
                    counts.log += 1;
                    return (value as (...a: unknown[]) => unknown).apply(target2, args);
                  };
                }
                return typeof value === "function" ? value.bind(target2) : value;
              },
            });
          }
          if (prop === "$queryRaw") {
            const value = Reflect.get(target, prop);
            return (...args: unknown[]) => {
              counts.group += 1;
              return (value as (...a: unknown[]) => unknown).apply(target, args);
            };
          }
          const value = Reflect.get(target, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });

    // O par de origem (P, originUserId) tem vínculo próprio (backfill), não concessao.
    const outside = await withTenantRls(h.role.client, fx.originTenantId, (tx) =>
      isGrantOutsideGroup(wrap(tx), fx.originTenantId, fx.originUserId),
    );

    assert.equal(outside, false, "par não concessao nunca cai");
    assert.deepEqual(
      counts,
      { link: 1, group: 0, log: 0 },
      "exatamente 1 leitura: o modo do vínculo; nenhuma leitura de grupo nem do registro de origem",
    );

    const user = await h.admin.user.findFirst({
      where: { id: fx.originUserId, tenant_id: fx.originTenantId },
      select: { status: true },
    });
    assert.equal(user?.status, "active", "nenhuma queda: o usuário segue ativo");
  });

  test("X6 — reativar par concessao fora do grupo responde 409 access_outside_group", async () => {
    const h = await harness();
    const fx = await seedConcessaoPair(h, "x6");
    const service = await coreSaasService(h);
    const { CoreSaasError } = await import("../src/modules/core-saas/types/core-saas.types.js");

    await leaveGroup(h, fx.originTenantId);

    await h.admin.user.update({ where: { id: fx.destUserId }, data: { status: "inactive" } });

    await assert.rejects(
      service.updateUser(
        { userId: fx.destUserId, tenantId: fx.destTenantId, status: "active" },
        { tenantId: fx.destTenantId, userId: fx.originUserId, roles: [], permissions: [], explicitPermissions: false },
      ),
      (error: unknown) =>
        error instanceof CoreSaasError &&
        error.statusCode === 409 &&
        error.reason === "access_outside_group",
      "reativar par fora do grupo recusa com 409 access_outside_group",
    );
  });

  // B-APP-ORG-2S-c (SC) · X7 (Emenda 1.8.3.13 §5.5) — a origem gravada pela concessão REAL (o
  // `grantUserAccess` do S2a, o mesmo que a rota `POST /api/v1/users/access-grants` chama), com Y de id
  // MENOR que X: Y e depois Z recebem o login de X. Caso 1: X sai do grupo e os acessos de Y e de Z caem.
  // Caso 2: Y sai do grupo, o de Y cai e o de Z continua (a origem de Z é X, nunca Y). Mutação: MO1.
  async function newTenantWithId(h: Harness, id: string, tag: string): Promise<{ readonly id: string }> {
    const suffix = `${tag}-${Date.now()}-${randomHex(4)}`;
    const tenant = await h.admin.tenant.create({
      data: { id, name: `SC ${suffix}`, slug: `sc-${suffix.toLowerCase()}` },
    });
    h.tenantIds.push(tenant.id);
    return tenant;
  }

  type X7Scenario = {
    readonly xTenantId: string;
    readonly yTenantId: string;
    readonly zTenantId: string;
    readonly xUserId: string;
    readonly yUserId: string;
    readonly zUserId: string;
    readonly xSessionId: string;
    readonly ySessionId: string;
    readonly zSessionId: string;
  };

  async function grantByRealConcession(h: Harness, tag: string): Promise<X7Scenario> {
    const service = await coreSaasService(h);
    const group = await newGroup(h, tag);
    const x = await newTenant(h, `${tag}x`);
    const y = await newTenantWithId(h, `00000000-0000-4000-8000-${randomHex(6)}`, `${tag}y`);
    const z = await newTenantWithId(h, `ffffffff-ffff-4fff-8fff-${randomHex(6)}`, `${tag}z`);
    assert.ok(y.id < x.id, "X7 (fixture): o id de Y é menor que o de X");

    for (const tenantId of [x.id, y.id, z.id]) {
      await insertMembership(h, tenantId, group.id, "2026-11-01", null);
    }

    const email = `sc-${tag}-${Date.now()}-${randomHex(4)}@example.com`;
    const xUser = await newUser(h, x.id, email);
    const identity = await h.admin.authIdentity.create({ data: { id: randomUUID() } });
    await linkUser(h, identity.id, x.id, xUser.id, "backfill");
    await newCredential(h, x.id, xUser.id, email);

    const grant = async (tenantId: string, label: string) => {
      const actor = await newUser(h, tenantId, `sc-${tag}-adm-${randomHex(4)}@example.com`);
      const outcome = await service
        .grantUserAccess(
          { tenantId, name: "Técnico do grupo", email },
          { tenantId, userId: actor.id, roles: [], permissions: [], explicitPermissions: false },
        )
        .then(
          (granted) => ({ granted, reason: null as string | null }),
          (error: unknown) => ({ granted: null, reason: (error as { reason?: string }).reason ?? String(error) }),
        );
      assert.equal(outcome.reason, null, `X7: a concessão real a ${label} é aceita (o login nasceu em X; a origem é X)`);
      return outcome.granted!;
    };

    const grantedY = await grant(y.id, "Y");
    const grantedZ = await grant(z.id, "Z");

    const origins = await h.admin.userCreationLog.findMany({
      where: { tenant_id: { in: [y.id, z.id] }, state: "concessao" },
      select: { tenant_id: true, origin_tenant_id: true },
    });
    assert.deepEqual(
      origins.map((row) => [row.tenant_id === y.id ? "Y" : "Z", row.origin_tenant_id === x.id ? "X" : "outro"]).sort(),
      [["Y", "X"], ["Z", "X"]],
      "X7: a concessão real grava X como origem de Y e de Z",
    );

    const xSession = await newSession(h, x.id, xUser.id);
    const ySession = await newSession(h, y.id, grantedY.user.id);
    const zSession = await newSession(h, z.id, grantedZ.user.id);

    return {
      xTenantId: x.id,
      yTenantId: y.id,
      zTenantId: z.id,
      xUserId: xUser.id,
      yUserId: grantedY.user.id,
      zUserId: grantedZ.user.id,
      xSessionId: xSession.id,
      ySessionId: ySession.id,
      zSessionId: zSession.id,
    };
  }

  test("X7 (caso 1) — origem pela concessão real, Y de id menor que X: X sai do grupo e os acessos de Y e de Z caem", async () => {
    const h = await harness();
    const fx = await grantByRealConcession(h, "x7a");
    const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");

    await leaveGroup(h, fx.xTenantId);

    const yVerdict = await sessionLiveness.check({ userId: fx.yUserId, tenantId: fx.yTenantId, sessionId: fx.ySessionId });
    const zVerdict = await sessionLiveness.check({ userId: fx.zUserId, tenantId: fx.zTenantId, sessionId: fx.zSessionId });
    const xVerdict = await sessionLiveness.check({ userId: fx.xUserId, tenantId: fx.xTenantId, sessionId: fx.xSessionId });

    assert.equal(yVerdict, "inactive", "X7 caso 1: o acesso de Y (origem X) cai");
    assert.equal(zVerdict, "inactive", "X7 caso 1: o acesso de Z (origem X) cai");
    assert.equal(xVerdict, "alive", "X7 caso 1: o login de X, onde ele nasceu, segue entrando");
  });

  test("X7 (caso 2) — origem pela concessão real, Y de id menor que X: Y sai do grupo, o acesso de Y cai e o de Z continua", async () => {
    const h = await harness();
    const fx = await grantByRealConcession(h, "x7b");
    const { sessionLiveness } = await import("../src/modules/auth/services/session-liveness.service.js");

    await leaveGroup(h, fx.yTenantId);

    const yVerdict = await sessionLiveness.check({ userId: fx.yUserId, tenantId: fx.yTenantId, sessionId: fx.ySessionId });
    const zVerdict = await sessionLiveness.check({ userId: fx.zUserId, tenantId: fx.zTenantId, sessionId: fx.zSessionId });

    assert.equal(yVerdict, "inactive", "X7 caso 2: o acesso de Y, que saiu do grupo, cai");
    assert.equal(zVerdict, "alive", "X7 caso 2: o acesso de Z continua (a origem de Z é X, não Y)");

    const zUser = await h.admin.user.findFirst({ where: { id: fx.zUserId, tenant_id: fx.zTenantId }, select: { status: true } });
    assert.equal(zUser?.status, "active", "X7 caso 2: o usuário de Z segue ativo");
  });
}
