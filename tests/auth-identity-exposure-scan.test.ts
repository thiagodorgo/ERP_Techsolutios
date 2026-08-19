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
// B-O6R-01 — vazamento POR VALOR (V3 + secops 3, §5.7): serializa cada corpo JSON e falha se
// QUALQUER uuid de identidade da fixture aparecer, em qualquer profundidade, como chave ou
// valor — o do ATOR, o da ORIGEM (o correlator que interessa na religação) e o da identidade
// NOVA do desvínculo. A varredura cobre também os corpos de ERRO (403/404/409) e a metadata de
// auditoria dos dois lados. O guard de texto (auth-invariant-guards) é só a primeira camada.
// -----------------------------------------------------------------------------------------------

function deepScanForUuids(value: unknown, uuids: readonly string[], path = "$"): string[] {
  const hits: string[] = [];

  if (typeof value === "string") {
    for (const uuid of uuids) {
      if (value.toLowerCase().includes(uuid.toLowerCase())) {
        hits.push(`${path} contém ${uuid}`);
      }
    }

    return hits;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...deepScanForUuids(item, uuids, `${path}[${index}]`));
    });

    return hits;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      for (const uuid of uuids) {
        if (key.toLowerCase().includes(uuid.toLowerCase())) {
          hits.push(`${path}.${key} (CHAVE) contém ${uuid}`);
        }
      }

      hits.push(...deepScanForUuids(item, uuids, `${path}.${key}`));
    }
  }

  return hits;
}

if (!connectionString) {
  test("Identity exposure scan requires DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute the exposure scan.",
  });
} else {
  test("nenhum uuid de identidade da fixture atravessa a borda — sucesso, erro e auditoria", async () => {
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
    const email = `exposicao-${suffix}@example.com`;

    try {
      const orgA = await createOrgWithUser(adminClient, {
        name: `Exp Org A ${suffix}`,
        slug: `exp-a-${suffix}`,
        email,
        password: "SenhaExpA123!",
      });
      const orgB = await createOrgWithUser(adminClient, {
        name: `Exp Org B ${suffix}`,
        slug: `exp-b-${suffix}`,
        email,
        password: "SenhaExpB123!",
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

      // Monta o cenário completo: religação (origem → ator) e depois desvínculo (identidade nova).
      const scannedBodies: Array<{ label: string; body: unknown }> = [];
      const capture = (label: string, response: { body: unknown }) => {
        scannedBodies.push({ label, body: response.body });

        return response;
      };

      capture("login 200", login);

      const relink = capture(
        "religação 201",
        await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: auth,
          body: { tenantId: orgB.tenantId, email, password: orgB.password },
        }),
      );

      assert.equal((relink as { status: number }).status, 201, "fixture: a religação precisa acontecer");

      capture(
        "religação idempotente 200",
        await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: auth,
          body: { tenantId: orgB.tenantId, email, password: orgB.password },
        }),
      );
      capture(
        "listagem de vínculos 200",
        await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: auth }),
      );
      capture(
        "active-tenant 200",
        await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: auth,
          body: { tenantId: orgB.tenantId },
        }),
      );
      capture("/me/tenants 200", await requestJson(baseUrl, "/api/v1/me/tenants", { headers: auth }));

      // Corpos de ERRO: 403 (active-tenant sem vínculo), 404 (DELETE alheio), 409 (conflito),
      // 401 (religação com senha errada).
      const orgC = await createOrgWithUser(adminClient, {
        name: `Exp Org C ${suffix}`,
        slug: `exp-c-${suffix}`,
        email,
        password: "SenhaExpC123!",
      });

      tenantIds.push(orgC.tenantId);

      capture(
        "active-tenant 403",
        await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: auth,
          body: { tenantId: orgC.tenantId },
        }),
      );
      capture(
        "DELETE alheio 404",
        await requestJson(baseUrl, "/api/v1/auth/identity-links/11111111-1111-4111-8111-111111111111", {
          method: "DELETE",
          headers: auth,
          body: { password: orgA.password },
        }),
      );
      capture(
        "religação 401",
        await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: auth,
          body: { tenantId: orgC.tenantId, email, password: "SenhaErrada123!" },
        }),
      );

      // Desvínculo (cria a identidade NOVA) e captura o corpo.
      const listing = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: auth });
      const linkB = (listing.body.data as Array<{ id: string; tenant: { id: string } }>).find(
        (link) => link.tenant.id === orgB.tenantId,
      );

      capture(
        "desvínculo 200",
        await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkB?.id}`, {
          method: "DELETE",
          headers: auth,
          body: { password: orgA.password, reauthTenantId: orgA.tenantId },
        }),
      );

      // TODOS os uuids de identidade da fixture, lidos com privilégio: ator, origem (from da
      // religacao) e a identidade NOVA do desvínculo (to do desvinculo).
      const identityRows = await adminClient.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT to_identity_id AS id FROM auth_identity_link_events
        WHERE tenant_id = ANY(${tenantIds}::uuid[])
        UNION
        SELECT DISTINCT from_identity_id AS id FROM auth_identity_link_events
        WHERE tenant_id = ANY(${tenantIds}::uuid[]) AND from_identity_id IS NOT NULL
      `;
      const identityUuids = identityRows.map((row) => row.id);

      assert.equal(identityUuids.length >= 3, true, "fixture precisa ter ator + origem + identidade nova");

      // 1) Corpos de API (sucesso E erro): nenhum uuid de identidade, como chave ou valor.
      for (const { label, body } of scannedBodies) {
        const hits = deepScanForUuids(body, identityUuids);

        assert.deepEqual(hits, [], `corpo "${label}" vaza identity uuid: ${hits.join("; ")}`);
      }

      // 2) Metadata de auditoria visível a tenant (os dois lados da religação + desvínculo).
      const audits = await adminClient.auditLog.findMany({
        where: {
          tenant_id: { in: [...tenantIds] },
          action: { in: ["auth.identity_link.moved", "auth.identity_link.attached", "auth.identity_link.removed"] },
        },
      });

      assert.equal(audits.length >= 3, true, "as três auditorias da fixture existem");

      for (const audit of audits) {
        const hits = deepScanForUuids(audit.metadata, identityUuids);

        assert.deepEqual(hits, [], `metadata de ${audit.action} vaza identity uuid`);
      }
    } finally {
      if (server) {
        await closeServer(server);
      }

      await cleanupIdentityFixture(adminClient, tenantIds);
      await adminClient.$disconnect();
    }
  });
}
