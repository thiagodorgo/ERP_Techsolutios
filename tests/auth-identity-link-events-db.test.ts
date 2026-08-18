import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";

import {
  cleanupIdentityFixture,
  closeServer,
  createOrgWithUser,
  getBaseUrl,
  requestJson,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — o grupo do C3 (a trilha como REGISTRO DE PLATAFORMA): o atacante que religa e
// depois desvincula deixa para trás os eventos 'religacao' + 'desvinculo', ilegíveis e imutáveis
// para ele; e a trilha SOBREVIVE ao vínculo (sem FK, de propósito). A ilegibilidade sob role
// efêmera e os triggers vivem em tests/auth-identity-role-real-db.test.ts.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Identity link event tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute identity link event tests.",
  });
} else {
  test("a trilha sobrevive ao desvínculo e ao próprio vínculo", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";

    const [{ PrismaPg }, { PrismaClient }, { createApp }, { PrismaCoreSaasService }] =
      await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      ]);

    const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    let server: Server | undefined;
    const email = `trilha-${suffix}@example.com`;

    try {
      const orgA = await createOrgWithUser(adminClient, {
        name: `Trilha A ${suffix}`,
        slug: `trilha-a-${suffix}`,
        email,
        password: "SenhaTrilhaA123!",
      });
      const orgB = await createOrgWithUser(adminClient, {
        name: `Trilha B ${suffix}`,
        slug: `trilha-b-${suffix}`,
        email,
        password: "SenhaTrilhaB123!",
      });

      tenantIds.push(orgA.tenantId, orgB.tenantId);

      const app = createApp(new PrismaCoreSaasService());

      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const login = await requestJson(baseUrl, "/api/v1/auth/login", {
        method: "POST",
        body: { tenantId: orgA.tenantId, email, password: orgA.password },
      });
      const auth = {
        authorization: `Bearer ${(login.body.data as { access_token: string }).access_token}`,
      };

      // O cenário do ATACANTE do C3: religa a conta roubada e depois desvincula para "apagar" o
      // que fez.
      const relink = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
        method: "POST",
        headers: auth,
        body: { tenantId: orgB.tenantId, email, password: orgB.password },
      });

      assert.equal(relink.status, 201);

      const eventsAfterRelink = await adminClient.$queryRaw<
        Array<{ id: string; event: string; from_identity_id: string | null; to_identity_id: string }>
      >`
        SELECT id, event, from_identity_id, to_identity_id FROM auth_identity_link_events
        WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid AND event = 'religacao'
      `;

      assert.equal(eventsAfterRelink.length, 1);

      const religacaoEvent = eventsAfterRelink[0];

      const listing = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: auth });
      const linkB = (listing.body.data as Array<{ id: string; tenant: { id: string } }>).find(
        (link) => link.tenant.id === orgB.tenantId,
      );

      const unlink = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkB?.id}`, {
        method: "DELETE",
        headers: auth,
        body: { password: orgA.password, reauthTenantId: orgA.tenantId },
      });

      assert.equal(unlink.status, 200);

      await t.test("o DELETE não apaga o evento 'religacao' — o rastro do move sobrevive, byte a byte", async () => {
        const survivors = await adminClient.$queryRaw<
          Array<{ id: string; event: string; from_identity_id: string | null; to_identity_id: string }>
        >`
          SELECT id, event, from_identity_id, to_identity_id FROM auth_identity_link_events
          WHERE id = ${religacaoEvent.id}::uuid
        `;

        assert.equal(survivors.length, 1);
        assert.deepEqual(survivors[0], religacaoEvent, "nenhum campo do evento foi reescrito");
      });

      await t.test("o desvínculo APENDOU 'desvinculo' (from = identidade do ator, to = identidade nova)", async () => {
        const events = await adminClient.$queryRaw<
          Array<{ event: string; from_identity_id: string | null; to_identity_id: string }>
        >`
          SELECT event, from_identity_id, to_identity_id FROM auth_identity_link_events
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
          ORDER BY occurred_at
        `;

        assert.deepEqual(
          events.map((event) => event.event),
          ["backfill", "religacao", "desvinculo"],
          "a história completa do vínculo, em ordem",
        );

        const desvinculo = events[2];

        assert.equal(desvinculo.from_identity_id, religacaoEvent.to_identity_id);
        assert.notEqual(desvinculo.to_identity_id, desvinculo.from_identity_id);
      });

      await t.test("a trilha sobrevive ao VÍNCULO (sem FK, de propósito): apagar o link não toca os eventos", async () => {
        const eventsBefore = await adminClient.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n FROM auth_identity_link_events
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
        `;

        // Manutenção privilegiada apaga o LINK (que não é append-only)…
        await adminClient.authIdentityLink.deleteMany({
          where: { tenant_id: orgB.tenantId, user_id: orgB.userId },
        });

        // …e a trilha permanece inteira.
        const eventsAfter = await adminClient.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n FROM auth_identity_link_events
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
        `;

        assert.equal(eventsAfter[0]?.n, eventsBefore[0]?.n);
        assert.equal((eventsAfter[0]?.n ?? 0) >= 3, true);
      });
    } finally {
      if (server) {
        await closeServer(server);
      }

      await cleanupIdentityFixture(adminClient, tenantIds);
      await adminClient.$disconnect();
    }
  });
}
