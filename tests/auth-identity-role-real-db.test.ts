import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  requestJson,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — o grupo do dba 1 (BLOQUEANTE): as transações que MUDAM dados rodando sob ROLE REAL
// (efêmera NOSUPERUSER — o único arranjo em que o RLS existe; sob a conexão `postgres` da CI
// estes testes ficariam verdes para sempre, independentemente da política). O PrismaClient da
// role efêmera é injetado no serviço de identidade e ESTE serviço atende o app (createApp com
// getIdentityLinkService). Também aqui: a caracterização do resíduo do C6 (condição 2 da
// arbitragem, SOB role efêmera — dba 3) e a mecânica sem-RETURNING das tabelas INSERT-only.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Role-real identity tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute role-real identity tests.",
  });
} else {
  test("religação, desvínculo e normalização sob role REAL (NOSUPERUSER)", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";

    const [
      { PrismaPg },
      { PrismaClient },
      { createApp },
      { PrismaCoreSaasService },
      { IdentityLinkService, getLocalAuthLoginService },
      { AuditLogRepository },
      { withTenantRls },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/database/rls.js"),
    ]);

    const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const ephemeral = await createEphemeralRole(adminClient, connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    let server: Server | undefined;
    const email = `role-real-${suffix}@example.com`;

    try {
      const orgP = await createOrgWithUser(adminClient, {
        name: `RR Org P ${suffix}`,
        slug: `rr-p-${suffix}`,
        email,
        password: "SenhaRRP123!",
      });
      const orgQ = await createOrgWithUser(adminClient, {
        name: `RR Org Q ${suffix}`,
        slug: `rr-q-${suffix}`,
        email,
        password: "SenhaRRQ123!",
      });

      tenantIds.push(orgP.tenantId, orgQ.tenantId);

      // O serviço de identidade conecta como a ROLE EFÊMERA; a prova de credencial usa o serviço
      // de login real (a credencial não é o sujeito do RLS aqui).
      const roleRealService = new IdentityLinkService(
        ephemeral.client,
        async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
        (tx) => new AuditLogRepository(tx),
      );
      const app = createApp(new PrismaCoreSaasService(), {
        getIdentityLinkService: async () => roleRealService,
      });

      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const loginRaw = async (tenantId: string, password: string) => {
        const response = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId, email, password },
        });

        assert.equal(response.status, 200);

        return response.body.data as { access_token: string; refresh_token: string };
      };

      const sessionP = await loginRaw(orgP.tenantId, orgP.password);
      const authP = { authorization: `Bearer ${sessionP.access_token}` };

      await t.test("religação sob role real: 201 e o vínculo MOVIDO de verdade (GUC certo, linhas afetadas > 0)", async () => {
        const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authP,
          body: { tenantId: orgQ.tenantId, email, password: orgQ.password },
        });

        assert.equal(response.status, 201);

        const [pairP] = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
          SELECT identity_id FROM auth_identity_links
          WHERE tenant_id = ${orgP.tenantId}::uuid AND user_id = ${orgP.userId}::uuid
        `;
        const [pairQ] = await adminClient.$queryRaw<Array<{ identity_id: string; attached_via: string }>>`
          SELECT identity_id, attached_via FROM auth_identity_links
          WHERE tenant_id = ${orgQ.tenantId}::uuid AND user_id = ${orgQ.userId}::uuid
        `;

        assert.equal(pairQ?.identity_id, pairP?.identity_id, "sob role real o move não pode ser no-op silencioso");
        assert.equal(pairQ?.attached_via, "religacao");
      });

      await t.test("desvínculo sob role real: contagem de sessões revogadas > 0 e == sessões vivas do par", async () => {
        // Sessões vivas do PAR Q (vínculo de organização ≠ ativa do ator — a configuração em que
        // um GUC errado revogaria ZERO sem erro).
        await loginRaw(orgQ.tenantId, orgQ.password);
        await loginRaw(orgQ.tenantId, orgQ.password);

        const liveBefore = await adminClient.authSession.count({
          where: { tenant_id: orgQ.tenantId, user_id: orgQ.userId, revoked_at: null },
        });

        assert.equal(liveBefore >= 2, true);

        const links = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: authP });
        const linkQ = (links.body.data as Array<{ id: string; tenant: { id: string } }>).find(
          (link) => link.tenant.id === orgQ.tenantId,
        );

        assert.ok(linkQ);

        const response = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkQ?.id}`, {
          method: "DELETE",
          headers: authP,
          body: { password: orgP.password, reauthTenantId: orgP.tenantId },
        });

        assert.equal(response.status, 200);

        const data = response.body.data as { revoked_sessions: number };

        assert.equal(data.revoked_sessions > 0, true, "GUC errado revogaria ZERO sem erro — o defeito do dba 1");
        assert.equal(data.revoked_sessions, liveBefore);

        const liveAfter = await adminClient.authSession.count({
          where: { tenant_id: orgQ.tenantId, user_id: orgQ.userId, revoked_at: null },
        });

        assert.equal(liveAfter, 0);
      });

      await t.test("normalização preguiçosa sob role real: par sem vínculo ganha identidade+vínculo+evento", async () => {
        const freshEmail = `rr-fresh-${suffix}@example.com`;
        const orgFresh = await createOrgWithUser(adminClient, {
          name: `RR Fresh ${suffix}`,
          slug: `rr-fresh-${suffix}`,
          email: freshEmail,
          password: "SenhaFresh123!",
        });

        tenantIds.push(orgFresh.tenantId);

        // Remove o que o login criaria por fora: o par nasce SEM vínculo (fixture direta).
        const loginFresh = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgFresh.tenantId, email: freshEmail, password: "SenhaFresh123!" },
        });

        assert.equal(loginFresh.status, 200);

        // O GET dos vínculos normaliza preguiçosamente SOB A ROLE EFÊMERA.
        const listing = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          headers: {
            authorization: `Bearer ${(loginFresh.body.data as { access_token: string }).access_token}`,
          },
        });

        assert.equal(listing.status, 200);
        assert.equal((listing.body.data as unknown[]).length, 1);

        const [link] = await adminClient.$queryRaw<Array<{ attached_via: string }>>`
          SELECT attached_via FROM auth_identity_links
          WHERE tenant_id = ${orgFresh.tenantId}::uuid AND user_id = ${orgFresh.userId}::uuid
        `;

        assert.equal(link?.attached_via, "backfill", "a normalização preguiçosa grava o vínculo de casa");
      });

      await t.test("caracterização do resíduo do C6 (condição 2, SOB role efêmera): o braço de tenant expõe identity_id às N linhas da organização", async () => {
        // O RESÍDUO ACEITO pela arbitragem: em contexto de tenant, SELECT identity_id devolve as
        // linhas da organização — a coluna é legível ao tenant. Fixa o fato; estreitar a política
        // depois exige REABRIR a junta (gatilho §13.4-d). Quem impede a chave de junção é a
        // camada de exposição (allowlist + varredura por valor), não a política.
        const rows = await withTenantRls(ephemeral.client, orgP.tenantId, (tx) =>
          tx.$queryRaw<Array<{ identity_id: string }>>`
            SELECT identity_id FROM auth_identity_links WHERE tenant_id = ${orgP.tenantId}::uuid
          `,
        );

        assert.equal(rows.length >= 1, true);

        for (const row of rows) {
          assert.match(row.identity_id, /^[0-9a-f-]{36}$/i);
        }

        // E o braço de tenant NÃO vaza as linhas de OUTRA organização.
        const crossRows = await withTenantRls(ephemeral.client, orgP.tenantId, (tx) =>
          tx.$queryRaw<Array<{ identity_id: string }>>`
            SELECT identity_id FROM auth_identity_links WHERE tenant_id = ${orgQ.tenantId}::uuid
          `,
        );

        assert.deepEqual(crossRows, []);
      });

      await t.test("trilha ilegível sob role efêmera (INSERT-only): SELECT devolve zero, com e sem contexto de tenant", async () => {
        const noContext = await ephemeral.client.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid
        `;

        assert.deepEqual(noContext, [], "sem política de SELECT, a trilha é ilegível");

        const withContext = await withTenantRls(ephemeral.client, orgQ.tenantId, (tx) =>
          tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid
          `,
        );

        assert.deepEqual(withContext, [], "nem o contexto de tenant lê a trilha (não é chave de junção)");

        // Com privilégio (BYPASSRLS) a correlação EXISTE — é registro de plataforma, não segredo.
        const privileged = await adminClient.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid
        `;

        assert.equal(privileged.length >= 2, true, "religacao + desvinculo deixaram rastro");
      });

      await t.test("UPDATE/DELETE na trilha: RLS zera para a role efêmera; o TRIGGER estoura para o superusuário", async () => {
        // Duas camadas com alcances DIFERENTES (§3.1): sob a role efêmera o RLS (sem política de
        // UPDATE/DELETE = default-deny) esconde as linhas — a mutação afeta ZERO linhas e o
        // trigger nem chega a disparar; o registro segue intacto.
        const updatedByEphemeral = await ephemeral.client.$executeRaw`
          UPDATE auth_identity_link_events SET event = 'backfill' WHERE tenant_id = ${orgQ.tenantId}::uuid
        `;
        const deletedByEphemeral = await ephemeral.client.$executeRaw`
          DELETE FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid
        `;

        assert.equal(updatedByEphemeral, 0, "RLS default-deny: a role da app não alcança linha nenhuma");
        assert.equal(deletedByEphemeral, 0);

        // RLS não vincula superusuário — quem o vincula é o TRIGGER (por linha).
        await assert.rejects(
          adminClient.$executeRaw`UPDATE auth_identity_link_events SET event = 'backfill' WHERE tenant_id = ${orgQ.tenantId}::uuid`,
          /append-only/,
        );
        await assert.rejects(
          adminClient.$executeRaw`DELETE FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid`,
          /append-only/,
        );

        const survivors = await adminClient.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM auth_identity_link_events WHERE tenant_id = ${orgQ.tenantId}::uuid
        `;

        assert.equal(survivors.length >= 2, true, "a trilha sobreviveu às quatro tentativas");
      });

      await t.test("TRUNCATE estoura no trigger de STATEMENT (conexão privilegiada — a efêmera nem tem o privilégio)", async () => {
        await assert.rejects(
          adminClient.$executeRaw`TRUNCATE auth_identity_link_events`,
          /append-only/,
          "TRUNCATE não dispara trigger de linha — o de statement (além do molde, declarado) fecha o contorno",
        );
      });

      await t.test("regra do RETURNING sob role efêmera: create() com RETURNING falha; o caminho sem RETURNING passa", async () => {
        const { randomUUID } = await import("node:crypto");
        const identityId = randomUUID();

        // create() emite RETURNING; a política de SELECT de auth_identities só enxerga a
        // identidade do GUC corrente → sob role sem BYPASSRLS a linha nova não volta → erro.
        await assert.rejects(
          withTenantRls(ephemeral.client, orgP.tenantId, (tx) =>
            tx.authIdentity.create({ data: { id: randomUUID() } }),
          ),
          undefined,
          "create() nas tabelas INSERT-only precisa falhar sob a role real — é a razão da regra",
        );

        // createMany (sem RETURNING) atravessa: identidade nova com o GUC de identidade AINDA na
        // antiga (o cenário exato do desvínculo, §5.4).
        await withTenantRls(ephemeral.client, orgP.tenantId, async (tx) => {
          await tx.authIdentity.createMany({ data: [{ id: identityId }] });
          await tx.authIdentityLinkEvent.createMany({
            data: [
              {
                id: randomUUID(),
                link_id: randomUUID(),
                from_identity_id: null,
                to_identity_id: identityId,
                event: "backfill",
                tenant_id: orgP.tenantId,
                user_id: orgP.userId,
              },
            ],
          });
        });

        const [inserted] = await adminClient.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM auth_identities WHERE id = ${identityId}::uuid
        `;

        assert.equal(inserted?.id, identityId, "o caminho sem RETURNING gravou de verdade");
      });
    } finally {
      if (server) {
        await closeServer(server);
      }

      await cleanupIdentityFixture(adminClient, tenantIds);
      await ephemeral.drop();
      await adminClient.$disconnect();
    }
  });
}
