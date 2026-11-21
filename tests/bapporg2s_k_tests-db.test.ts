
import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { cleanupIdentityFixture, createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { groupProbeClock } from "../src/modules/core-saas/services/group-peer-probe.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S (S1) — testes K da trava de e-mail único no grupo NA CRIAÇÃO (sem concessão, que é S2a).
// Postgres descartável, papel de runtime NOSUPERUSER NOBYPASSRLS (createEphemeralRole), corridas com
// duas conexões de verdade. O serviço é construído DIRETAMENTE sobre o papel efêmero (nunca
// createCoreSaasService): o caminho que interessa é `PrismaCoreSaasService.createUser` + a volta.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROLE_KEY = "field_technician";

if (!connectionString) {
  test("B-APP-ORG-2S K-tests exigem DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar esta suíte.",
  });
} else {
  test("B-APP-ORG-2S S1: K1, K2–K7, K12, K13, K14 (trava de e-mail único no grupo)", async (t) => {
    process.env.LOG_LEVEL = "silent";

    const [{ PrismaCoreSaasService }, { PrismaCoreSaasStore }, { withTenantRls }, { createPrismaClient }] = await Promise.all([
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/database/rls.js"),
      import("../src/database/pg-connection.js"),
    ]);

    const admin = createPrismaClient(connectionString!);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const createdGlobalRoles: string[] = [];
    const createdGroups: string[] = [];

    const [roleA, roleB] = await Promise.all([
      createEphemeralRole(admin, connectionString!),
      createEphemeralRole(admin, connectionString!),
    ]);
    const serviceA = new PrismaCoreSaasService(new PrismaCoreSaasStore(roleA.client));
    const serviceB = new PrismaCoreSaasService(new PrismaCoreSaasStore(roleB.client));
    const storeA = new PrismaCoreSaasStore(roleA.client);

    const createTenant = async (label: string): Promise<string> => {
      const tenant = await admin.tenant.create({ data: { name: `${label} ${suffix}`, slug: `${label}-${suffix}` } });
      tenantIds.push(tenant.id);
      return tenant.id;
    };

    const ensureGlobalRole = async (): Promise<void> => {
      const existing = await admin.role.findFirst({ where: { key: ROLE_KEY, tenant_id: null }, select: { id: true } });
      if (!existing) {
        await admin.role.create({ data: { key: ROLE_KEY, name: ROLE_KEY, scope: "system" } });
        createdGlobalRoles.push(ROLE_KEY);
      }
    };

    const createGroup = async (label: string): Promise<string> => {
      const group = await admin.economicGroup.create({ data: { name: `${label} ${suffix}` } });
      createdGroups.push(group.id);
      return group.id;
    };

    const linkToGroup = async (tenantId: string, groupId: string, validFrom: string, validTo: string | null): Promise<void> => {
      await admin.$executeRaw`
        INSERT INTO economic_group_members (tenant_id, group_id, valid_from, valid_to)
        VALUES (${tenantId}::uuid, ${groupId}::uuid, ${validFrom}::date, ${validTo ?? null}::date)
      `;
    };

    const existingUser = async (tenantId: string, email: string, status = "active"): Promise<string> => {
      const user = await admin.user.create({ data: { tenant_id: tenantId, name: email.split("@")[0], email, status } });
      const role = await admin.role.create({ data: { tenant_id: tenantId, key: `role_${randomUUID().replaceAll("-", "").slice(0, 8)}`, name: "Fixture", scope: "tenant" } });
      await admin.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: role.id } });
      return user.id;
    };

    const countUsersByEmail = (email: string): Promise<number> => admin.user.count({ where: { email } });

    const logRows = async (tenantId: string): Promise<Array<{ seq: bigint; state: string; email_key: string; reason: string | null }>> =>
      admin.$queryRawUnsafe(
        `SELECT seq, state, email_key, reason FROM user_creation_log WHERE tenant_id = $1::uuid ORDER BY seq`,
        tenantId,
      ) as Promise<Array<{ seq: bigint; state: string; email_key: string; reason: string | null }>>;

    try {
      await ensureGlobalRole();
      const group = await createGroup("grupo-k");

      await t.test("K1: duas criações simultâneas em dois pátios do grupo, 50 rodadas: 1 usuário, 1 cancelado com número maior", async () => {
        const A = await createTenant("k1-a");
        const B = await createTenant("k1-b");
        await linkToGroup(A, group, "2026-01-01", null);
        await linkToGroup(B, group, "2026-01-01", null);

        for (let round = 0; round < 50; round += 1) {
          const email = `k1-${suffix}-r${round}@example.com`.toLowerCase();
          const [ra, rb] = await Promise.allSettled([
            serviceA.createUser({ tenantId: A, name: "A", email, roles: [ROLE_KEY] }),
            serviceB.createUser({ tenantId: B, name: "B", email, roles: [ROLE_KEY] }),
          ]);
          const ok = ra.status === "fulfilled" ? ra : rb;
          const refused = ra.status === "rejected" ? ra : rb;
          assert.equal(ok.status, "fulfilled", `rodada ${round}: uma criação nasce`);
          assert.equal(refused.status, "rejected", `rodada ${round}: a outra é recusada`);
          assert.equal((refused as PromiseRejectedResult).reason?.statusCode, 409, `rodada ${round}: 409`);
          assert.equal((refused as PromiseRejectedResult).reason?.reason, "email_in_group", `rodada ${round}: email_in_group`);
          assert.equal(await countUsersByEmail(email), 1, `rodada ${round}: exatamente 1 usuário`);
        }

        const rows = (await admin.$queryRawUnsafe(
          `SELECT state, count(*)::int AS n, max(seq) AS max_seq FROM user_creation_log WHERE tenant_id = ANY($1::uuid[]) GROUP BY state`,
          [A, B],
        )) as Array<{ state: string; n: number; max_seq: string }>;
        assert.equal(rows.find((r) => r.state === "confirmado")?.n, 50, "50 confirmado no total");
        assert.equal(rows.find((r) => r.state === "cancelado")?.n, 50, "50 cancelado no total");
        assert.ok(
          BigInt(rows.find((r) => r.state === "cancelado")!.max_seq) > BigInt(rows.find((r) => r.state === "confirmado")!.max_seq),
          "o cancelado tem número maior",
        );
      });

      await t.test("K2: o recusado não deixa rastro de login", async () => {
        const X = await createTenant("k2-x");
        const Y = await createTenant("k2-y");
        await linkToGroup(X, group, "2026-01-01", null);
        await linkToGroup(Y, group, "2026-01-01", null);
        const email = `k2-${suffix}@example.com`.toLowerCase();
        await existingUser(X, email);

        await assert.rejects(serviceB.createUser({ tenantId: Y, name: "Y", email, roles: [ROLE_KEY] }), (err: any) => err?.reason === "email_in_group");

        assert.equal(await admin.user.count({ where: { tenant_id: Y, email } }), 0, "0 usuário no pátio recusado");
        assert.equal(await admin.localAuthCredential.count({ where: { tenant_id: Y } }), 0, "0 senha no pátio recusado");
        assert.equal(await admin.authIdentityLink.count({ where: { tenant_id: Y } }), 0, "0 vínculo de identidade no pátio recusado");
        assert.equal(await admin.authSession.count({ where: { tenant_id: Y } }), 0, "0 sessão no pátio recusado");
      });

      await t.test("K3: a primeira falha por papel inválido depois do registro; a que esperava nasce, sem confirmado órfão", async () => {
        const X = await createTenant("k3-x");
        const Y = await createTenant("k3-y");
        await linkToGroup(X, group, "2026-01-01", null);
        await linkToGroup(Y, group, "2026-01-01", null);
        const email = `k3-${suffix}@example.com`.toLowerCase();

        // A primeira passa pelo STORE (não pelo service): papel inválido falha DENTRO da transação,
        // depois de openCreationLog + volta. A segunda (pelo service) nasce.
        const failing = storeA.createUser({ tenantId: X, name: "X", email, roles: ["papel_inexistente"] }).catch(() => undefined);
        const winner = await serviceB.createUser({ tenantId: Y, name: "Y", email, roles: [ROLE_KEY] });
        await failing;
        assert.ok(winner.id, "a que esperava nasce");

        const rows = await logRows(X);
        assert.equal(rows.filter((r) => r.state === "confirmado").length, 0, "nenhum confirmado órfão no pátio que falhou");
        assert.equal(await countUsersByEmail(email), 1, "exatamente 1 usuário");
      });

      await t.test("K4: mesmo e-mail em grupos diferentes e em pátio sem grupo: as duas nascem", async () => {
        const g2 = await createGroup("grupo-k4-b");
        const A = await createTenant("k4-a");
        const B = await createTenant("k4-b");
        const C = await createTenant("k4-c");
        await linkToGroup(A, group, "2026-01-01", null);
        await linkToGroup(B, g2, "2026-01-01", null);
        const email = `k4-${suffix}@example.com`.toLowerCase();

        const [ra, rb, rc] = await Promise.all([
          serviceA.createUser({ tenantId: A, name: "A", email, roles: [ROLE_KEY] }),
          serviceB.createUser({ tenantId: B, name: "B", email, roles: [ROLE_KEY] }),
          serviceA.createUser({ tenantId: C, name: "C", email, roles: [ROLE_KEY] }),
        ]);
        assert.ok(ra.id && rb.id && rc.id, "as três nascem");
        assert.equal(await countUsersByEmail(email), 3, "3 usuários com o mesmo e-mail");
      });

      await t.test("K5: a recusa não vaza o pátio vencedor", async () => {
        const X = await createTenant("k5-x");
        const Y = await createTenant("k5-y");
        await linkToGroup(X, group, "2026-01-01", null);
        await linkToGroup(Y, group, "2026-01-01", null);
        const email = `k5-${suffix}@example.com`.toLowerCase();
        await existingUser(X, email, "inactive");

        const err: any = await serviceB.createUser({ tenantId: Y, name: "Y", email, roles: [ROLE_KEY] }).then(() => null, (e) => e);
        assert.equal(err?.statusCode, 409);
        assert.equal(err?.reason, "email_in_group");
        assert.equal(err?.message, "Este e-mail já tem acesso no grupo.");
        assert.ok(!JSON.stringify(err).includes(X), "a resposta não traz o id do pátio vencedor");

        const cancelled = (await logRows(Y)).filter((r) => r.state === "cancelado");
        assert.equal(cancelled.length, 1, "1 cancelado em Y");
        assert.equal(cancelled[0]!.reason, "email_in_group");
      });

      await t.test("K6: o registro é isolado por pátio", async () => {
        const A = await createTenant("k6-a");
        const B = await createTenant("k6-b");
        await linkToGroup(A, group, "2026-01-01", null);
        await linkToGroup(B, group, "2026-01-01", null);
        const emailA = `k6-${suffix}@example.com`.toLowerCase();
        await serviceA.createUser({ tenantId: A, name: "A", email: emailA, roles: [ROLE_KEY] });
        assert.ok((await logRows(A)).length >= 1, "A tem registro");

        const rows = await withTenantRls(roleB.client, B, async (tx) =>
          tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM user_creation_log WHERE tenant_id = $1::uuid`, A),
        );
        assert.equal((rows as any)[0].n, 0, "com o contexto de B, a leitura do registro devolve 0 linha de A");
      });

      await t.test("K7: o e-mail não fica em claro no registro", async () => {
        const A = await createTenant("k7-a");
        await linkToGroup(A, group, "2026-01-01", null);
        const email = `k7-segredo-${suffix}@example.com`.toLowerCase();
        await serviceA.createUser({ tenantId: A, name: "A", email, roles: [ROLE_KEY] });
        const rows = await logRows(A);
        assert.ok(rows.length >= 1);
        for (const row of rows) {
          assert.ok(!row.email_key.includes(email), "nenhum e-mail em claro no registro");
          assert.equal(row.email_key.length, 64, "a chave é um resumo sha256 (64 hex)");
        }
      });

      await t.test("K12: saída agendada para amanhã ainda 409; valendo hoje, a criação nasce (dia de São Paulo)", async () => {
        const originalNow = groupProbeClock.now;
        try {
          // 2026-11-21T01:30:00Z = 22:30 de São Paulo do dia 20/11.
          groupProbeClock.now = () => new Date("2026-11-21T01:30:00Z");

          // Cenário 1: saída amanhã — [2026-11-20, 2026-11-21) ainda vale hoje (20/11 SP).
          const A = await createTenant("k12-a");
          const B = await createTenant("k12-b");
          await linkToGroup(A, group, "2026-11-20", "2026-11-21");
          await linkToGroup(B, group, "2026-11-20", "2026-11-21");
          const email = `k12-${suffix}@example.com`.toLowerCase();
          await existingUser(A, email);
          await assert.rejects(serviceB.createUser({ tenantId: B, name: "B", email, roles: [ROLE_KEY] }), (err: any) => err?.reason === "email_in_group");

          // Cenário 2: saída valendo hoje — B2 fora do grupo desde hoje, sem nenhuma escrita no teste.
          const A2 = await createTenant("k12-a2");
          const B2 = await createTenant("k12-b2");
          await linkToGroup(A2, group, "2026-11-20", "2026-11-21");
          await linkToGroup(B2, group, "2026-11-19", "2026-11-20");
          const email2 = `k12b-${suffix}@example.com`.toLowerCase();
          await existingUser(A2, email2);
          const born = await serviceB.createUser({ tenantId: B2, name: "B2", email: email2, roles: [ROLE_KEY] });
          assert.ok(born.id, "saída valendo hoje: a criação nasce");
        } finally {
          groupProbeClock.now = originalNow;
        }
      });

      await t.test("K13: técnico inativo no único pátio dele ainda trava a criação em outro pátio do grupo", async () => {
        const X = await createTenant("k13-x");
        const Y = await createTenant("k13-y");
        await linkToGroup(X, group, "2026-01-01", null);
        await linkToGroup(Y, group, "2026-01-01", null);
        const email = `k13-${suffix}@example.com`.toLowerCase();
        const userId = await existingUser(X, email, "inactive");

        await assert.rejects(serviceB.createUser({ tenantId: Y, name: "Y", email, roles: [ROLE_KEY] }), (err: any) => err?.reason === "email_in_group");

        await serviceA.updateUser({ userId, tenantId: X, status: "active" });
        const user = await admin.user.findUnique({ where: { id: userId }, select: { status: true } });
        assert.equal(user?.status, "active", "reativado pelo caminho do PATCH");
      });

      await t.test("K14: espera além do prazo da transação → 503, nada criado, nenhum em_curso sobra", async () => {
        const A = await createTenant("k14-a");
        await linkToGroup(A, group, "2026-01-01", null);
        const email = `k14-${suffix}@example.com`.toLowerCase();
        const emailKey = await import("../src/modules/core-saas/services/user-creation-log.js").then((m) => m.creationEmailKey(email));

        const hold = admin.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `INSERT INTO user_creation_log (tenant_id, email_key, state) VALUES ($1::uuid, $2, 'em_curso')`,
            A,
            emailKey,
          );
          await new Promise((resolve) => setTimeout(resolve, 3200));
          await tx.$executeRawUnsafe(`DELETE FROM user_creation_log WHERE tenant_id = $1::uuid AND email_key = $2 AND state = 'em_curso'`, A, emailKey);
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
        const err: any = await serviceB.createUser({ tenantId: A, name: "A", email, roles: [ROLE_KEY] }).then(() => null, (e) => e);
        await hold;

        assert.equal(err?.statusCode, 503, "503 creation_unavailable");
        assert.equal(err?.reason, "creation_unavailable");
        assert.equal(await countUsersByEmail(email), 0, "nada criado");
        const remaining = (await admin.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM user_creation_log WHERE tenant_id = $1::uuid AND state = 'em_curso'`,
          A,
        )) as Array<{ n: number }>;
        assert.equal(remaining[0].n, 0, "nenhuma linha em_curso sobra");
      });
    } finally {
      await admin.$executeRawUnsafe(`DELETE FROM user_creation_log WHERE tenant_id = ANY($1::uuid[])`, tenantIds);
      await admin.$executeRawUnsafe(`DELETE FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`, tenantIds);
      await admin.$executeRawUnsafe(`DELETE FROM economic_groups WHERE id = ANY($1::uuid[])`, createdGroups);

      await cleanupIdentityFixture(admin, tenantIds);

      for (const key of createdGlobalRoles) {
        await admin.role.deleteMany({ where: { key, tenant_id: null } });
      }

      await roleA.drop();
      await roleB.drop();
      await admin.$disconnect();
    }
  });
}
