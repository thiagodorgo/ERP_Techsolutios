
import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { cleanupIdentityFixture, createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S (S1) — HK1 PELAS ROTAS (1.8.3 §6; arquivo nasce no bloco, 1.8.3.1 §6).
// Pela rota HTTP, duas conexões de verdade, papel de runtime NOSUPERUSER NOBYPASSRLS no STORE:
//   K1 em 50 rodadas dá sempre 201 e 409, 1 usuário, 1 identidade, o número do cancelado maior;
//   K14: 503 e nada criado; ao fim, 0 linha em_curso; nenhum 5xx fora do K14.
//   K0: POST /users com e-mail que existe em outro pátio do grupo → 409 email_in_group.
//   K10/K11 (a concessão 201) são completados na S2a, quando a rota de concessão nascer.
// O app roda em CORE_SAAS_PERSISTENCE=memory (as permissões do JWT saem do catálogo); o STORE é o
// caminho prisma sob o papel efêmero sem bypass.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROLE_KEY = "field_technician";

if (!connectionString) {
  test("B-APP-ORG-2S HK1 pelas rotas exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrations para executar esta suíte.",
  });
} else {
  test("B-APP-ORG-2S HK1 pelas rotas: K0, K1 (50), K14, sem 5xx fora do K14", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.CORE_SAAS_PERSISTENCE = "memory";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";

    const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, { signAccessToken }, { createPrismaClient }] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/auth/index.js"),
      import("../src/database/pg-connection.js"),
    ]);

    const admin = createPrismaClient(connectionString!);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const createdGroups: string[] = [];
    let createdGlobalRole = false;
    let server: Server | undefined;
    let baseUrl = "";

    const role = await createEphemeralRole(admin, connectionString!);
    const service = new PrismaCoreSaasService(new PrismaCoreSaasStore(role.client));
    const app = createApp(service);

    const createTenant = async (label: string): Promise<string> => {
      const tenant = await admin.tenant.create({ data: { name: `${label} ${suffix}`, slug: `${label}-${suffix}` } });
      tenantIds.push(tenant.id);
      return tenant.id;
    };

    const ensureGlobalRole = async (): Promise<void> => {
      const existing = await admin.role.findFirst({ where: { key: ROLE_KEY, tenant_id: null }, select: { id: true } });
      if (!existing) {
        await admin.role.create({ data: { key: ROLE_KEY, name: ROLE_KEY, scope: "system" } });
        createdGlobalRole = true;
      }
    };

    const createGroup = async (label: string): Promise<string> => {
      const group = await admin.economicGroup.create({ data: { name: `${label} ${suffix}` } });
      createdGroups.push(group.id);
      return group.id;
    };

    const linkToGroup = async (tenantId: string, groupId: string): Promise<void> => {
      await admin.$executeRaw`
        INSERT INTO economic_group_members (tenant_id, group_id, valid_from, valid_to)
        VALUES (${tenantId}::uuid, ${groupId}::uuid, '2026-01-01'::date, NULL::date)
      `;
    };

    const tokenFor = async (tenantId: string): Promise<string> => {
      const userId = randomUUID();
      return signAccessToken({ user_id: userId, tenant_id: tenantId, email: `actor-${suffix}@example.com`, roles: ["tenant_admin"] });
    };

    const postUser = async (token: string, email: string): Promise<{ status: number; body: any }> => {
      const response = await fetch(`${baseUrl}/api/v1/users`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: email.split("@")[0], email, roles: [ROLE_KEY] }),
      });
      return { status: response.status, body: await response.json() };
    };

    try {
      await ensureGlobalRole();
      const group = await createGroup("grupo-hk1");

      const A = await createTenant("hk1-a");
      const B = await createTenant("hk1-b");
      await linkToGroup(A, group);
      await linkToGroup(B, group);
      const tokenA = await tokenFor(A);
      const tokenB = await tokenFor(B);

      server = app.listen(0);
      baseUrl = await getBaseUrl(server);

      await t.test("K0: POST /users com e-mail que existe em outro pátio do grupo → 409 email_in_group", async () => {
        const email = `hk1-k0-${suffix}@example.com`.toLowerCase();
        await admin.user.create({ data: { tenant_id: A, name: "existente", email, status: "active" } });
        const response = await postUser(tokenB, email);
        assert.equal(response.status, 409);
        assert.equal(response.body.error?.reason, "email_in_group");
      });

      await t.test("K1 (rotas, 50): sempre 201 e 409, 1 usuário, 1 identidade, cancelado maior", async () => {
        const { creationEmailKey } = await import("../src/modules/core-saas/services/user-creation-log.js");
        const statuses: number[] = [];
        const k1Keys: string[] = [];
        for (let round = 0; round < 50; round += 1) {
          const email = `hk1-k1-${suffix}-r${round}@example.com`.toLowerCase();
          k1Keys.push(creationEmailKey(email));
          const [ra, rb] = await Promise.all([postUser(tokenA, email), postUser(tokenB, email)]);
          statuses.push(ra.status, rb.status);
          assert.deepEqual([ra.status, rb.status].sort(), [201, 409], `rodada ${round}: 201 e 409`);
          const users = await admin.user.count({ where: { email } });
          assert.equal(users, 1, `rodada ${round}: 1 usuário`);
          const links = await admin.$queryRawUnsafe(
            `SELECT count(*)::int AS n FROM auth_identity_links l JOIN users u ON u.id = l.user_id WHERE u.email = $1`,
            email,
          ).then((rows: any) => rows[0].n);
          assert.equal(links, 1, `rodada ${round}: 1 identidade (vínculo)`);
        }

        const rows = (await admin.$queryRawUnsafe(
          `SELECT state, count(*)::int AS n, max(seq) AS max_seq FROM user_creation_log WHERE email_key = ANY($1::text[]) GROUP BY state`,
          k1Keys,
        )) as Array<{ state: string; n: number; max_seq: string }>;
        assert.equal(rows.find((r) => r.state === "confirmado")?.n, 50, "50 confirmado");
        assert.equal(rows.find((r) => r.state === "cancelado")?.n, 50, "50 cancelado");
        assert.ok(BigInt(rows.find((r) => r.state === "cancelado")!.max_seq) > BigInt(rows.find((r) => r.state === "confirmado")!.max_seq), "cancelado maior");
        assert.ok(statuses.every((s) => s === 201 || s === 409), "nenhum 5xx fora do K14");
      });

      await t.test("K14 (rotas): espera além do prazo → 503, nada criado, nenhum em_curso sobra", async () => {
        const email = `hk1-k14-${suffix}@example.com`.toLowerCase();
        const emailKey = await import("../src/modules/core-saas/services/user-creation-log.js").then((m) => m.creationEmailKey(email));

        const hold = admin.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(
              `INSERT INTO user_creation_log (tenant_id, email_key, state) VALUES ($1::uuid, $2, 'em_curso')`,
              A,
              emailKey,
            );
            await new Promise((resolve) => setTimeout(resolve, 6000));
            await tx.$executeRawUnsafe(`DELETE FROM user_creation_log WHERE tenant_id = $1::uuid AND email_key = $2 AND state = 'em_curso'`, A, emailKey);
          },
          { maxWait: 5000, timeout: 15000 },
        );

        await new Promise((resolve) => setTimeout(resolve, 300));
        const response = await postUser(tokenA, email);
        await hold;

        assert.equal(response.status, 503);
        assert.equal(response.body.error?.reason, "creation_unavailable");
        assert.equal(await admin.user.count({ where: { email } }), 0, "nada criado");
        const remaining = (await admin.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM user_creation_log WHERE tenant_id = ANY($1::uuid[]) AND state = 'em_curso'`,
          [A, B],
        )) as Array<{ n: number }>;
        assert.equal(remaining[0].n, 0, "nenhuma linha em_curso sobra");
      });

      await t.test("fim: nenhum em_curso sobrando nos pátios do teste", async () => {
        const remaining = (await admin.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM user_creation_log WHERE tenant_id = ANY($1::uuid[]) AND state = 'em_curso'`,
          [A, B],
        )) as Array<{ n: number }>;
        assert.equal(remaining[0].n, 0);
      });
    } finally {
      if (server) {
        await closeServer(server);
      }

      await admin.$executeRawUnsafe(`DELETE FROM user_creation_log WHERE tenant_id = ANY($1::uuid[])`, tenantIds);
      await admin.$executeRawUnsafe(`DELETE FROM economic_group_members WHERE tenant_id = ANY($1::uuid[])`, tenantIds);
      await admin.$executeRawUnsafe(`DELETE FROM economic_groups WHERE id = ANY($1::uuid[])`, createdGroups);
      await cleanupIdentityFixture(admin, tenantIds);

      if (createdGlobalRole) {
        await admin.role.deleteMany({ where: { key: ROLE_KEY, tenant_id: null } });
      }

      await role.drop();
      await admin.$disconnect();
    }
  });
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
