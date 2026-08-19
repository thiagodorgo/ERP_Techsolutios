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
  type OrgFixture,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — Ω6R-TEN-001 (o e-mail nunca decide; o vínculo explícito decide) + religação (§5).
// Toda autenticação aqui é por JWT REAL obtido por login na app (jamais header legado, jamais
// ator fabricado).
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Identity link tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute identity link tests.",
  });
} else {
  test("TEN-001 fechado + religação move exatamente um vínculo", async (t) => {
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

    // O MESMO e-mail em três organizações — o cenário exato do achado (homônimos).
    const email = `homonimo-${suffix}@example.com`;

    try {
      const orgA = await createOrgWithUser(adminClient, {
        name: `Org A ${suffix}`,
        slug: `org-a-${suffix}`,
        email,
        password: "SenhaOrgA123!",
      });
      const orgB = await createOrgWithUser(adminClient, {
        name: `Org B ${suffix}`,
        slug: `org-b-${suffix}`,
        email,
        password: "SenhaOrgB123!",
      });
      const orgC = await createOrgWithUser(adminClient, {
        name: `Org C ${suffix}`,
        slug: `org-c-${suffix}`,
        email,
        password: "SenhaOrgC123!",
      });
      const orgD = await createOrgWithUser(adminClient, {
        name: `Org D ${suffix}`,
        slug: `org-d-${suffix}`,
        email,
        password: "SenhaOrgD123!",
      });

      tenantIds.push(orgA.tenantId, orgB.tenantId, orgC.tenantId, orgD.tenantId);

      const app = createApp(new PrismaCoreSaasService());

      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const login = async (org: OrgFixture, password = org.password) =>
        requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: org.tenantId, email, password },
        });

      const tokenA = await login(orgA);

      assert.equal(tokenA.status, 200);

      const accessA = (tokenA.body.data as { access_token: string }).access_token;
      const authA = { authorization: `Bearer ${accessA}` };

      await t.test("repro do achado: homônimo SEM vínculo → active-tenant 403, jamais fallback por e-mail", async () => {
        const response = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId },
        });

        assert.equal(response.status, 403, "antes deste bloco, isto emitia token como o usuário da org B");
      });

      await t.test("/me/tenants lista SÓ as organizações vinculadas (não todos os homônimos)", async () => {
        const response = await requestJson(baseUrl, "/api/v1/me/tenants", { headers: authA });

        assert.equal(response.status, 200);

        const listed = (response.body.data as Array<{ tenant: { id: string } }>).map(
          (m) => m.tenant.id,
        );

        assert.deepEqual(listed, [orgA.tenantId], "homônimos de B/C/D não aparecem sem vínculo");
      });

      await t.test("religação exige a CREDENCIAL: senha errada → 401, nada muda, e a tentativa conta como direcionada", async () => {
        const before = await adminClient.localAuthCredential.findFirst({
          where: { tenant_id: orgB.tenantId, user_id: orgB.userId },
          select: { failed_attempts: true },
        });
        const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId, email, password: "SenhaErrada123!" },
        });

        assert.equal(response.status, 401);

        const after = await adminClient.localAuthCredential.findFirst({
          where: { tenant_id: orgB.tenantId, user_id: orgB.userId },
          select: { failed_attempts: true },
        });

        assert.equal(
          (after?.failed_attempts ?? 0) - (before?.failed_attempts ?? 0),
          1,
          "a prova de religação é tentativa DIRECIONADA: falha incrementa o contador do alvo",
        );

        const links = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
          SELECT identity_id FROM auth_identity_links
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
        `;
        const linksA = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
          SELECT identity_id FROM auth_identity_links
          WHERE tenant_id = ${orgA.tenantId}::uuid AND user_id = ${orgA.userId}::uuid
        `;

        assert.notEqual(links[0]?.identity_id, linksA[0]?.identity_id, "identidades seguem distintas");
      });

      await t.test("religação com a senha certa → 201; active-tenant e listagem passam a funcionar", async () => {
        const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId, email, password: orgB.password },
        });

        assert.equal(response.status, 201);

        const activeTenant = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId },
        });

        assert.equal(activeTenant.status, 200);
        assert.equal(
          (activeTenant.body.data as { user: { id: string } }).user.id,
          orgB.userId,
          "o token novo é do usuário REAL da org B (o par provado)",
        );

        const listing = await requestJson(baseUrl, "/api/v1/me/tenants", { headers: authA });
        const listed = (listing.body.data as Array<{ tenant: { id: string } }>)
          .map((m) => m.tenant.id)
          .sort();

        assert.deepEqual(listed, [orgA.tenantId, orgB.tenantId].sort());
      });

      await t.test("idempotência: religar a MESMA organização de novo → 200 already_linked", async () => {
        const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId, email, password: orgB.password },
        });

        assert.equal(response.status, 200);
        assert.equal((response.body.data as { status: string }).status, "already_linked");
      });

      await t.test("evento 'religacao' na trilha com from/to/actor (lido com privilégio — a app não lê a trilha)", async () => {
        const events = await adminClient.$queryRaw<
          Array<{ event: string; from_identity_id: string | null; to_identity_id: string; actor_user_id: string | null }>
        >`
          SELECT event, from_identity_id, to_identity_id, actor_user_id
          FROM auth_identity_link_events
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
          ORDER BY occurred_at
        `;

        const religacao = events.find((event) => event.event === "religacao");

        assert.ok(religacao, "a religação deixa rastro na trilha");
        assert.ok(religacao?.from_identity_id, "from = identidade de origem");
        assert.equal(religacao?.actor_user_id, orgA.userId, "actor = quem religou");
        assert.notEqual(religacao?.from_identity_id, religacao?.to_identity_id);
      });

      await t.test("o teste literal (§5.2): origem com C e D; prova só B NÃO alcança C nem D", async () => {
        // Constrói uma identidade com C e D (um segundo ator, via login em C, religa D).
        const tokenC = await login(orgC);
        const accessC = (tokenC.body.data as { access_token: string }).access_token;
        const authC = { authorization: `Bearer ${accessC}` };
        const relinkD = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authC,
          body: { tenantId: orgD.tenantId, email, password: orgD.password },
        });

        assert.equal(relinkD.status, 201, "fixture: identidade C+D montada por prova real");

        // O ator A (identidade A+B) NÃO alcança C nem D — a religação de B não moveu o conjunto.
        for (const alvo of [orgC.tenantId, orgD.tenantId]) {
          const response = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
            method: "POST",
            headers: authA,
            body: { tenantId: alvo },
          });

          assert.equal(response.status, 403, "alcance não cresce além da organização provada");
        }

        const listing = await requestJson(baseUrl, "/api/v1/me/tenants", { headers: authA });
        const listed = (listing.body.data as Array<{ tenant: { id: string } }>)
          .map((m) => m.tenant.id)
          .sort();

        assert.deepEqual(listed, [orgA.tenantId, orgB.tenantId].sort(), "listagem sem C e D");
      });

      await t.test("identidade de origem que ficou vazia NÃO é apagada (referente da trilha — C3)", async () => {
        const events = await adminClient.$queryRaw<Array<{ from_identity_id: string | null }>>`
          SELECT from_identity_id FROM auth_identity_link_events
          WHERE tenant_id = ${orgB.tenantId}::uuid AND user_id = ${orgB.userId}::uuid
            AND event = 'religacao'
        `;
        const originIdentityId = events[0]?.from_identity_id;

        assert.ok(originIdentityId);

        const identity = await adminClient.authIdentity.findFirst({
          where: { id: originIdentityId ?? "" },
        });

        assert.ok(identity, "a identidade de origem sobrevive vazia — hard-delete é pendência com junta");
      });

      await t.test("conflito: ator já tem vínculo na organização provada → 409 IDENTITY_LINK_CONFLICT", async () => {
        // Um segundo usuário na org B, com credencial própria: o ator A (que já tem vínculo em
        // B) prova essa conta → 409, nada muda.
        const otherEmail = `homonimo-b2-${suffix}@example.com`;
        const otherUser = await adminClient.user.create({
          data: { tenant_id: orgB.tenantId, name: "Outro B", email: otherEmail },
        });
        const { LocalAuthCredentialRepository, LocalAuthCredentialService } = await import(
          "../src/modules/auth/index.js"
        );
        const credentialService = new LocalAuthCredentialService(
          new LocalAuthCredentialRepository(adminClient),
          {
            findByIdForTenant: (userId: string, tenantId: string) =>
              adminClient.user.findFirst({
                where: { id: userId, tenant_id: tenantId },
                select: { id: true, tenant_id: true, email: true },
              }),
          },
        );

        await credentialService.createCredentialForUser({
          tenant_id: orgB.tenantId,
          user_id: otherUser.id,
          email: otherEmail,
          password: "SenhaOutroB123!",
        });

        const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId, email: otherEmail, password: "SenhaOutroB123!" },
        });

        assert.equal(response.status, 409);
        assert.equal(response.body.error?.reason, "identity_link_conflict");
      });

      await t.test("organização suspensa: religação recusada PÓS-prova (403)", async () => {
        await adminClient.tenant.update({
          where: { id: orgC.tenantId },
          data: { status: "inactive" },
        });

        try {
          const response = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
            method: "POST",
            headers: authA,
            body: { tenantId: orgC.tenantId, email, password: orgC.password },
          });

          assert.equal(response.status, 403);
        } finally {
          await adminClient.tenant.update({
            where: { id: orgC.tenantId },
            data: { status: "active" },
          });
        }
      });

      await t.test("usuário INATIVO na organização pedida → active-tenant 403 (filtro de status preservado)", async () => {
        await adminClient.user.update({
          where: { id: orgB.userId },
          data: { status: "inactive" },
        });

        try {
          const response = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
            method: "POST",
            headers: authA,
            body: { tenantId: orgB.tenantId },
          });

          assert.equal(response.status, 403);
        } finally {
          await adminClient.user.update({
            where: { id: orgB.userId },
            data: { status: "active" },
          });
        }
      });

      await t.test("organização SUSPENSA → active-tenant 403 (filtro de status preservado)", async () => {
        await adminClient.tenant.update({
          where: { id: orgB.tenantId },
          data: { status: "inactive" },
        });

        try {
          const response = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
            method: "POST",
            headers: authA,
            body: { tenantId: orgB.tenantId },
          });

          assert.equal(response.status, 403);
        } finally {
          await adminClient.tenant.update({
            where: { id: orgB.tenantId },
            data: { status: "active" },
          });
        }
      });

      await t.test("token em voo SEM claim resolve por (tenant_id, sub); sem vínculo, normaliza SÓ o par do token (C8)", async () => {
        const { signAccessToken } = await import("../src/modules/auth/index.js");
        // Usuário novo SEM vínculo (criado direto no banco — fora do createUser da app).
        const freshEmail = `fresh-${suffix}@example.com`;
        const freshUser = await adminClient.user.create({
          data: { tenant_id: orgA.tenantId, name: "Fresh", email: freshEmail },
        });
        // Token SEM claim identity_id (assinador chamado sem o campo).
        const token = await signAccessToken({
          user_id: freshUser.id,
          tenant_id: orgA.tenantId,
          email: freshEmail,
          roles: ["viewer"],
        });

        // Fail-closed para qualquer OUTRA organização…
        const crossResponse = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: { tenantId: orgB.tenantId },
        });

        assert.equal(crossResponse.status, 403);

        // …e a normalização criou vínculo APENAS para o par do token (nunca para o da org pedida).
        const freshLinks = await adminClient.$queryRaw<Array<{ tenant_id: string }>>`
          SELECT tenant_id FROM auth_identity_links
          WHERE user_id = ${freshUser.id}::uuid
        `;

        assert.deepEqual(
          freshLinks.map((link) => link.tenant_id),
          [orgA.tenantId],
          "C8: só o par (tenant do token, sub) é normalizado",
        );
      });

      await t.test("corrida: duas religações concorrentes IDÊNTICAS terminam {201, 409|200} — nunca 500", async () => {
        // O MESMO ator dispara a mesma religação duas vezes em paralelo (duplo-clique): a trava
        // no vínculo + re-check + mapeamento do 23505 garantem que um move vence e o outro
        // termina idempotente (200) ou em conflito (409) — jamais 500.
        const alvoEmail = `alvo-corrida-${suffix}@example.com`;
        const orgE = await createOrgWithUser(adminClient, {
          name: `Org E ${suffix}`,
          slug: `org-e-${suffix}`,
          email: alvoEmail,
          password: "SenhaOrgE123!",
        });
        const orgG = await createOrgWithUser(adminClient, {
          name: `Org G ${suffix}`,
          slug: `org-g-${suffix}`,
          email: alvoEmail,
          password: "SenhaOrgG123!",
        });

        tenantIds.push(orgE.tenantId, orgG.tenantId);

        const loginE = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgE.tenantId, email: alvoEmail, password: orgE.password },
        });
        const relink = (token: string) =>
          requestJson(baseUrl, "/api/v1/auth/identity-links", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: { tenantId: orgG.tenantId, email: alvoEmail, password: orgG.password },
          });
        const accessE = (loginE.body.data as { access_token: string }).access_token;

        const [first, second] = await Promise.all([relink(accessE), relink(accessE)]);
        const statuses = [first.status, second.status].sort();

        assert.equal(statuses.includes(500), false, "corrida nunca degrada para 500");
        assert.equal(statuses.filter((status) => status === 201).length, 1, "exatamente um move vence");
        assert.ok(
          [200, 409].includes(statuses.find((status) => status !== 201) ?? 0),
          "o perdedor recebe 409 (conflito) ou 200 (idempotente)",
        );

        // E o estado final é UM vínculo, na identidade do ator.
        const links = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
          SELECT identity_id FROM auth_identity_links
          WHERE tenant_id = ${orgG.tenantId}::uuid AND user_id = ${orgG.userId}::uuid
        `;

        assert.equal(links.length, 1);
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
