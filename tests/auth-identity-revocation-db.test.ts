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

// Ator REAL construído pelo middleware attachAuthenticatedActor (o único lugar que constrói
// AuthenticatedActor): sobe um mini-app, faz uma requisição com o Bearer e captura request.actor
// — nada de literal fabricado (guard 6 / crítico higiene 5).
async function actorFromToken(
  accessToken: string,
): Promise<import("../src/modules/auth/types/auth.types.js").AuthenticatedActor> {
  const [{ default: express }, { attachAuthenticatedActor, getAuthenticatedActor }] =
    await Promise.all([import("express"), import("../src/modules/auth/index.js")]);

  const captured: Array<import("../src/modules/auth/types/auth.types.js").AuthenticatedActor> = [];
  const app = express();

  app.get("/whoami", attachAuthenticatedActor(), (request, response) => {
    const actor = getAuthenticatedActor(request);

    if (actor) {
      captured.push(actor);
    }

    response.json({ ok: true });
  });

  const server = app.listen(0);

  await new Promise<void>((resolve) => server.once("listening", resolve));

  const { port } = server.address() as { port: number };

  await fetch(`http://127.0.0.1:${port}/whoami`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  assert.equal(captured.length, 1, "o middleware precisa ter construído o ator");

  return captured[0];
}

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — o grupo do C1 (I3: revogar revoga a RENOVAÇÃO), com o SUJEITO nomeado (crítico 1):
// o token que precisa morrer é o refresh do PAR DO VÍNCULO REMOVIDO (tenant B, user B), obtido
// por LOGIN PRÓPRIO na org B — não o do requisitante (o access não carrega session_id; lido "do
// jeito óbvio", o teste falharia contra a implementação certa). Fixture com ≥2 sessões vivas do
// par, uma NUNCA usada (crítico 2): contagem de LINHAS não muda (sem hard-delete), revoked_at
// em TODAS, contagem da auditoria == 2. O DELETE remove vínculo de organização DIFERENTE da
// ativa do ator — a configuração em que um GUC errado revogaria zero (dba 1).
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Identity revocation tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute identity revocation tests.",
  });
} else {
  test("I3: o desvínculo revoga as sessões do PAR do vínculo removido — e o gancho de senha idem", async (t) => {
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
    const email = `revocacao-${suffix}@example.com`;

    try {
      const orgA = await createOrgWithUser(adminClient, {
        name: `Rev Org A ${suffix}`,
        slug: `rev-a-${suffix}`,
        email,
        password: "SenhaRevA123!",
      });
      const orgB = await createOrgWithUser(adminClient, {
        name: `Rev Org B ${suffix}`,
        slug: `rev-b-${suffix}`,
        email,
        password: "SenhaRevB123!",
      });

      tenantIds.push(orgA.tenantId, orgB.tenantId);

      const app = createApp(new PrismaCoreSaasService());

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

      // Ator: loga na org A e religa a org B (identidade A+B, por prova real).
      const sessionA = await loginRaw(orgA.tenantId, orgA.password);
      const authA = { authorization: `Bearer ${sessionA.access_token}` };
      const relink = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
        method: "POST",
        headers: authA,
        body: { tenantId: orgB.tenantId, email, password: orgB.password },
      });

      assert.equal(relink.status, 201);

      // Fixture do crítico 2: DUAS sessões vivas do PAR (org B) — a segunda NUNCA usada.
      const sessionB1 = await loginRaw(orgB.tenantId, orgB.password);
      const sessionB2 = await loginRaw(orgB.tenantId, orgB.password);

      // Controle NEGATIVO no MESMO par: antes do DELETE, o refresh do par FUNCIONA (o teste
      // morde — sem isto, "refresh falha" passaria com a revogação ausente pela rotação).
      const controlRefresh = await requestJson(baseUrl, "/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken: sessionB1.refresh_token },
      });

      assert.equal(controlRefresh.status, 200, "controle negativo: o par vive antes do DELETE");

      const rotatedB1 = (controlRefresh.body.data as { refresh_token: string }).refresh_token;

      const linksBefore = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: authA });
      const linkB = (linksBefore.body.data as Array<{ id: string; tenant: { id: string } }>).find(
        (link) => link.tenant.id === orgB.tenantId,
      );

      assert.ok(linkB, "fixture: o vínculo da org B está listado");

      const sessionRowsBefore = await adminClient.authSession.count({
        where: { tenant_id: orgB.tenantId, user_id: orgB.userId },
      });
      const liveRowsBefore = await adminClient.authSession.count({
        where: { tenant_id: orgB.tenantId, user_id: orgB.userId, revoked_at: null },
      });

      assert.equal(liveRowsBefore >= 2, true, "fixture: ≥2 sessões VIVAS do par");

      await t.test("sem reautenticação → 401; senha da PRÓPRIA org do vínculo removido → 403 (S7)", async () => {
        const noPassword = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkB?.id}`, {
          method: "DELETE",
          headers: authA,
        });

        assert.equal(noPassword.status, 401);

        const wrongOrg = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkB?.id}`, {
          method: "DELETE",
          headers: authA,
          body: { password: orgB.password, reauthTenantId: orgB.tenantId },
        });

        assert.equal(wrongOrg.status, 403);
        assert.equal(wrongOrg.body.error?.reason, "reauth_credential_unavailable");
      });

      await t.test("DELETE do vínculo de organização ≠ ativa: revoga TODAS as sessões do PAR, sem hard-delete", async () => {
        const response = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkB?.id}`, {
          method: "DELETE",
          headers: authA,
          body: { password: orgA.password, reauthTenantId: orgA.tenantId },
        });

        assert.equal(response.status, 200);

        const data = response.body.data as { status: string; revoked_sessions: number };

        assert.equal(data.status, "removed");
        assert.equal(data.revoked_sessions, liveRowsBefore, "contagem == sessões VIVAS do par");

        // (i) contagem de LINHAS não muda (proíbe o hard-delete — D-Ω4C-SESS-REVOKE-REAL);
        const sessionRowsAfter = await adminClient.authSession.count({
          where: { tenant_id: orgB.tenantId, user_id: orgB.userId },
        });

        assert.equal(sessionRowsAfter, sessionRowsBefore);

        // (ii) revoked_at não-nulo em TODAS — inclusive a sessão NUNCA usada;
        const liveAfter = await adminClient.authSession.count({
          where: { tenant_id: orgB.tenantId, user_id: orgB.userId, revoked_at: null },
        });

        assert.equal(liveAfter, 0);

        // (a) forma anti-teatro: o refresh do PAR morre — tanto o token ROTACIONADO (vivo) da
        // sessão usada quanto o da sessão nunca usada;
        const refreshUsed = await requestJson(baseUrl, "/api/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken: rotatedB1 },
        });
        const refreshNeverUsed = await requestJson(baseUrl, "/api/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken: sessionB2.refresh_token },
        });

        assert.equal(refreshUsed.status, 401);
        assert.equal(refreshNeverUsed.status, 401);

        // (c) sinal discriminante: a auditoria do refresh barrado diz reason='revoked' (não
        // 'invalid' — que a rotação produziria com a revogação ausente).
        const refreshAudits = await adminClient.auditLog.findMany({
          where: { tenant_id: orgB.tenantId, action: "auth.refresh.failed" },
          orderBy: { created_at: "desc" },
          take: 2,
        });

        assert.equal(refreshAudits.length, 2);

        for (const audit of refreshAudits) {
          assert.equal(
            (audit.metadata as { reason?: string })?.reason,
            "revoked",
            "o 401 veio da REVOGAÇÃO, não da rotação",
          );
        }

        // (iii) auditoria do desvínculo: actor_scope='linked_identity' (o ator age de outra
        // org), contagem == 2, e NENHUM identificador estrangeiro na metadata.
        const unlinkAudit = await adminClient.auditLog.findFirst({
          where: { tenant_id: orgB.tenantId, action: "auth.identity_link.removed" },
          orderBy: { created_at: "desc" },
        });

        assert.ok(unlinkAudit);

        const metadata = unlinkAudit?.metadata as {
          actor_scope?: string;
          revoked_sessions?: number;
        };

        assert.equal(metadata?.actor_scope, "linked_identity");
        assert.equal(metadata?.revoked_sessions, liveRowsBefore);

        const metadataRaw = JSON.stringify(unlinkAudit?.metadata);

        for (const foreign of [orgA.tenantId, orgA.userId]) {
          assert.equal(
            metadataRaw.includes(foreign),
            false,
            "metadata local sem identificador da organização do ator",
          );
        }
      });

      await t.test("token pré-DELETE não alcança a organização revogada NAS ROTAS DE IDENTIDADE; negócio na janela segue", async () => {
        // O access de A segue vivo (janela de 15min declarada): rota de NEGÓCIO responde.
        const businessInWindow = await requestJson(baseUrl, "/api/v1/me/tenants", { headers: authA });

        assert.equal(businessInWindow.status, 200, "requisição na janela não é cortada (janela declarada do I3)");

        // Mas as rotas de IDENTIDADE já não alcançam a org revogada:
        const listed = (businessInWindow.body.data as Array<{ tenant: { id: string } }>).map(
          (m) => m.tenant.id,
        );

        assert.deepEqual(listed, [orgA.tenantId], "o vínculo revogado sumiu da listagem");

        const activeTenant = await requestJson(baseUrl, "/api/v1/auth/active-tenant", {
          method: "POST",
          headers: authA,
          body: { tenantId: orgB.tenantId },
        });

        assert.equal(activeTenant.status, 403, "a troca para a org revogada morre na hora");
      });

      await t.test("vínculo alheio/inexistente → 404; header legado não alcança os fluxos de identidade", async () => {
        const alien = await requestJson(
          baseUrl,
          "/api/v1/auth/identity-links/11111111-1111-4111-8111-111111111111",
          {
            method: "DELETE",
            headers: authA,
            body: { password: orgA.password },
          },
        );

        assert.equal(alien.status, 404);

        const legacy = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          headers: {
            "x-tenant-id": orgA.tenantId,
            "x-user-id": orgA.userId,
            "x-role": "tenant_admin",
          },
        });

        assert.equal(legacy.status, 401, "header legado nunca constrói o ator dos fluxos de identidade (V2)");
      });

      await t.test(":id malformado → 404 uniforme com alheio/inexistente, sem erro cru do Postgres no corpo (B-7)", async () => {
        // id malformado não pode existir — 404 igual ao alheio, senão a forma vira oráculo.
        const malformed = await requestJson(baseUrl, "/api/v1/auth/identity-links/not-a-uuid", {
          method: "DELETE",
          headers: authA,
          body: { password: orgA.password },
        });

        assert.equal(malformed.status, 404);
        assert.equal(malformed.body.error?.reason, "identity_link_not_found");
        assert.doesNotMatch(
          JSON.stringify(malformed.body),
          /Raw query failed|SQLSTATE|22P02|invalid input syntax/i,
          "o corpo público não pode carregar erro cru do Postgres",
        );
      });

      await t.test("reauthTenantId malformado → 400 invalid_payload ANTES do banco, sem erro cru do Postgres (B-7)", async () => {
        // Antes do ciclo 2 o valor cru alcançava o GUC e um cast ::uuid, e o corpo público
        // devolvia a mensagem do Postgres (fallback do sendRouteError — P-O6R-B01-ROUTE-ERROR-LEAK).
        const malformed = await requestJson(
          baseUrl,
          "/api/v1/auth/identity-links/11111111-1111-4111-8111-111111111111",
          {
            method: "DELETE",
            headers: authA,
            body: { password: orgA.password, reauthTenantId: "not-a-uuid" },
          },
        );

        assert.equal(malformed.status, 400);
        assert.equal(malformed.body.error?.reason, "invalid_payload");
        assert.doesNotMatch(
          JSON.stringify(malformed.body),
          /Raw query failed|SQLSTATE|22P02|invalid input syntax/i,
          "o corpo público não pode carregar erro cru do Postgres",
        );
      });

      await t.test("único vínculo → 200 already_standalone e as sessões do par ficam INTACTAS (revoked_at NULO)", async () => {
        // O ator A agora só tem o vínculo de A. Sessão viva do par A:
        const sessionsALive = await adminClient.authSession.count({
          where: { tenant_id: orgA.tenantId, user_id: orgA.userId, revoked_at: null },
        });

        assert.equal(sessionsALive >= 1, true);

        const linksNow = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: authA });
        const linkA = (linksNow.body.data as Array<{ id: string; tenant: { id: string } }>).find(
          (link) => link.tenant.id === orgA.tenantId,
        );

        assert.ok(linkA);

        const response = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkA?.id}`, {
          method: "DELETE",
          headers: authA,
          body: { password: orgA.password },
        });

        assert.equal(response.status, 200);
        assert.equal((response.body.data as { status: string }).status, "already_standalone");

        const sessionsAAfter = await adminClient.authSession.count({
          where: { tenant_id: orgA.tenantId, user_id: orgA.userId, revoked_at: null },
        });

        assert.equal(sessionsAAfter, sessionsALive, "already_standalone NÃO revoga nada (prova do revoked_at nulo)");
      });

      await t.test("403 REAUTH_CREDENTIAL_UNAVAILABLE: identidade sem credencial elegível fora da org do vínculo", async () => {
        // Pessoa com duas orgs vinculadas, mas a org de reauth NÃO tem credencial: cria o par
        // C (com credencial) + D (SEM credencial), religa, e tenta remover C reautenticando por D.
        const pairEmail = `sem-credencial-${suffix}@example.com`;
        const orgC = await createOrgWithUser(adminClient, {
          name: `Rev Org C ${suffix}`,
          slug: `rev-c-${suffix}`,
          email: pairEmail,
          password: "SenhaRevC123!",
        });
        const orgD = await createOrgWithUser(adminClient, {
          name: `Rev Org D ${suffix}`,
          slug: `rev-d-${suffix}`,
          email: pairEmail,
          password: "SenhaRevD123!",
        });

        tenantIds.push(orgC.tenantId, orgD.tenantId);

        const loginC = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgC.tenantId, email: pairEmail, password: orgC.password },
        });
        const authC = {
          authorization: `Bearer ${(loginC.body.data as { access_token: string }).access_token}`,
        };
        const relinkD = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authC,
          body: { tenantId: orgD.tenantId, email: pairEmail, password: orgD.password },
        });

        assert.equal(relinkD.status, 201);

        // Apaga a credencial de D: a identidade fica sem credencial elegível para remover C.
        await adminClient.localAuthCredential.deleteMany({
          where: { tenant_id: orgD.tenantId, user_id: orgD.userId },
        });

        const linksC = await requestJson(baseUrl, "/api/v1/auth/identity-links", { headers: authC });
        const linkC = (linksC.body.data as Array<{ id: string; tenant: { id: string } }>).find(
          (link) => link.tenant.id === orgC.tenantId,
        );

        const response = await requestJson(baseUrl, `/api/v1/auth/identity-links/${linkC?.id}`, {
          method: "DELETE",
          headers: authC,
          body: { password: orgD.password, reauthTenantId: orgD.tenantId },
        });

        assert.equal(response.status, 403);
        assert.equal(response.body.error?.reason, "reauth_credential_unavailable");
      });

      await t.test("gancho de senha (§5.5): vínculo 'religacao' desvincula + sessões do par morrem; 'backfill' só revoga sessões", async () => {
        // Pessoa nova: org H (casa) + org I (religada). O ator vem de LOGIN REAL (JWT →
        // getAuthenticatedActor) — jamais literal fabricado (crítico higiene 5).
        const hookEmail = `gancho-${suffix}@example.com`;
        const orgH = await createOrgWithUser(adminClient, {
          name: `Rev Org H ${suffix}`,
          slug: `rev-h-${suffix}`,
          email: hookEmail,
          password: "SenhaRevH123!",
        });
        const orgI = await createOrgWithUser(adminClient, {
          name: `Rev Org I ${suffix}`,
          slug: `rev-i-${suffix}`,
          email: hookEmail,
          password: "SenhaRevI123!",
        });

        tenantIds.push(orgH.tenantId, orgI.tenantId);

        const loginH = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgH.tenantId, email: hookEmail, password: orgH.password },
        });
        const authH = {
          authorization: `Bearer ${(loginH.body.data as { access_token: string }).access_token}`,
        };
        const relinkI = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: authH,
          body: { tenantId: orgI.tenantId, email: hookEmail, password: orgI.password },
        });

        assert.equal(relinkI.status, 201);

        // Sessão viva do par I (o par cuja senha vai trocar):
        const loginI = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgI.tenantId, email: hookEmail, password: orgI.password },
        });

        assert.equal(loginI.status, 200);

        // O ator do gancho vem do MIDDLEWARE REAL (JWT → getAuthenticatedActor) — jamais um
        // literal fabricado (crítico higiene 5 / guard 6).
        const { getIdentityLinkService } = await import("../src/modules/auth/index.js");
        const hookService = await getIdentityLinkService();
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

        const actorI = await actorFromToken(
          (loginI.body.data as { access_token: string }).access_token,
        );
        const result = await credentialService.changePasswordWithIdentityHook(
          actorI,
          "SenhaNovaI123!",
          hookService,
        );

        // (a) o vínculo chegou por 'religacao' e a identidade tinha 2 vínculos → desvincula;
        assert.equal(result.unlinked, true);
        // (b) as sessões do par foram revogadas na MESMA transação.
        assert.equal(result.revokedSessions >= 1, true);

        const liveI = await adminClient.authSession.count({
          where: { tenant_id: orgI.tenantId, user_id: orgI.userId, revoked_at: null },
        });

        assert.equal(liveI, 0);

        // A senha NOVA vale (a troca aconteceu na mesma transação do desvínculo).
        const reLogin = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgI.tenantId, email: hookEmail, password: "SenhaNovaI123!" },
        });

        assert.equal(reLogin.status, 200);

        // Segunda troca: agora o vínculo do par I chegou por 'desvinculo' (não 'religacao') e a
        // identidade é standalone → NÃO desvincula; sessões do par revogadas mesmo assim (b).
        const actorI2 = await actorFromToken(
          (reLogin.body.data as { access_token: string }).access_token,
        );
        const secondChange = await credentialService.changePasswordWithIdentityHook(
          actorI2,
          "SenhaNovissima123!",
          hookService,
        );

        assert.equal(secondChange.unlinked, false, "vínculo de casa/desvinculado não re-desvincula");
        assert.equal(secondChange.revokedSessions >= 1, true, "toda troca de senha revoga as sessões do par");
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
