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

// Ator REAL construído pelo middleware attachAuthenticatedActor (o único lugar que constrói
// AuthenticatedActor): sobe um mini-app, faz uma requisição com o Bearer e captura request.actor
// — nada de literal fabricado (guard 6 / crítico higiene 5). Mesmo idioma da revocation-db.
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

      await t.test("gancho da troca de senha SOB role real (B-1): decide por attached_via com a trilha lendo ZERO", async () => {
        // A prova da TERCEIRA ARMADILHA (R-B-O6R-01-ciclo1, B-1): o gancho desvincula/preserva a
        // partir de `auth_identity_links.attached_via` — NUNCA da trilha append-only, que sob a
        // role real é ILEGÍVEL (RLS sem política de SELECT). O teste do gancho que já existia
        // (revocation-db) roda no Prisma compartilhado como `postgres`, onde a trilha É legível —
        // lá uma regressão que passasse a decidir pela trilha continuaria verde. AQUI o serviço
        // roda na conexão efêmera NOSUPERUSER: se o gancho voltar a depender de leitura
        // privilegiada, o braço (a) falha — a armadilha não reabre em silêncio.
        const hookEmail = `rr-gancho-${suffix}@example.com`;
        const orgHome = await createOrgWithUser(adminClient, {
          name: `RR Casa ${suffix}`,
          slug: `rr-casa-${suffix}`,
          email: hookEmail,
          password: "SenhaCasa123!",
        });
        const orgAway = await createOrgWithUser(adminClient, {
          name: `RR Religada ${suffix}`,
          slug: `rr-religada-${suffix}`,
          email: hookEmail,
          password: "SenhaAway123!",
        });

        tenantIds.push(orgHome.tenantId, orgAway.tenantId);

        const loginHome = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgHome.tenantId, email: hookEmail, password: orgHome.password },
        });

        assert.equal(loginHome.status, 200);

        const relink = await requestJson(baseUrl, "/api/v1/auth/identity-links", {
          method: "POST",
          headers: {
            authorization: `Bearer ${(loginHome.body.data as { access_token: string }).access_token}`,
          },
          body: { tenantId: orgAway.tenantId, email: hookEmail, password: orgAway.password },
        });

        assert.equal(relink.status, 201);

        // A assimetria que faz deste caso uma GUARDA: a trilha, pela conexão efêmera, lê ZERO —
        // enquanto a privilegiada já lê a linha que a religação acabou de gravar. Qualquer fonte
        // de decisão do gancho baseada na trilha leria zero aqui e erraria o braço (a).
        const [trailByEphemeral] = await ephemeral.client.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM auth_identity_link_events
        `;
        const [religacaoVisible] = await adminClient.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM auth_identity_link_events
          WHERE tenant_id = ${orgAway.tenantId}::uuid
            AND user_id = ${orgAway.userId}::uuid
            AND event = 'religacao'
        `;

        assert.equal(trailByEphemeral?.count, 0, "sob a role real a trilha lê ZERO — a fonte proibida da terceira armadilha");
        assert.equal(religacaoVisible?.count, 1, "o contraste: com privilégio a religação está na trilha — o zero acima é RLS, não vazio");

        // O ator vem do MIDDLEWARE REAL (JWT → getAuthenticatedActor); o gancho é DIRIGIDO pelo
        // serviço da role efêmera (roleRealService) — a transação inteira roda NOSUPERUSER.
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

        // Braço (b) — vínculo de CASA ('backfill'), com a identidade AINDA em 2 vínculos: a troca
        // de senha NÃO desvincula, mas revoga as sessões do par.
        const actorHome = await actorFromToken(
          (loginHome.body.data as { access_token: string }).access_token,
        );
        const liveHomeBefore = await adminClient.authSession.count({
          where: { tenant_id: orgHome.tenantId, user_id: orgHome.userId, revoked_at: null },
        });

        assert.equal(liveHomeBefore >= 1, true);

        const armB = await credentialService.changePasswordWithIdentityHook(
          actorHome,
          "SenhaCasaNova123!",
          roleRealService,
        );

        assert.equal(armB.unlinked, false, "vínculo 'backfill' não desvincula, MESMO com a identidade em 2 vínculos");
        assert.equal(armB.revokedSessions, liveHomeBefore, "toda troca revoga as sessões do par — e conta certo");

        const liveHomeAfter = await adminClient.authSession.count({
          where: { tenant_id: orgHome.tenantId, user_id: orgHome.userId, revoked_at: null },
        });

        assert.equal(liveHomeAfter, 0);

        const [homeLink] = await adminClient.$queryRaw<Array<{ identity_id: string; attached_via: string }>>`
          SELECT identity_id, attached_via FROM auth_identity_links
          WHERE tenant_id = ${orgHome.tenantId}::uuid AND user_id = ${orgHome.userId}::uuid
        `;
        const [awayLink] = await adminClient.$queryRaw<Array<{ identity_id: string; attached_via: string }>>`
          SELECT identity_id, attached_via FROM auth_identity_links
          WHERE tenant_id = ${orgAway.tenantId}::uuid AND user_id = ${orgAway.userId}::uuid
        `;

        assert.equal(homeLink?.attached_via, "backfill");
        assert.equal(awayLink?.attached_via, "religacao");
        assert.equal(awayLink?.identity_id, homeLink?.identity_id, "o braço (b) não pode ter mexido nos vínculos");

        // A senha NOVA vale — o UPDATE da credencial aconteceu DE VERDADE sob a role efêmera
        // (um UPDATE zerado em silêncio pelo RLS devolveria 401 aqui).
        const reLoginHome = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgHome.tenantId, email: hookEmail, password: "SenhaCasaNova123!" },
        });

        assert.equal(reLoginHome.status, 200);

        // Braço (a) — vínculo 'religacao' + identidade com 2 vínculos: a troca de senha DESVINCULA
        // e revoga as sessões do par na MESMA transação.
        await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgAway.tenantId, email: hookEmail, password: orgAway.password },
        });

        const loginAway = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgAway.tenantId, email: hookEmail, password: orgAway.password },
        });

        assert.equal(loginAway.status, 200);

        const actorAway = await actorFromToken(
          (loginAway.body.data as { access_token: string }).access_token,
        );
        const liveAwayBefore = await adminClient.authSession.count({
          where: { tenant_id: orgAway.tenantId, user_id: orgAway.userId, revoked_at: null },
        });

        assert.equal(liveAwayBefore >= 2, true);

        const armA = await credentialService.changePasswordWithIdentityHook(
          actorAway,
          "SenhaAwayNova123!",
          roleRealService,
        );

        assert.equal(armA.unlinked, true, "vínculo 'religacao' com 2+ vínculos desvincula na troca de senha");
        assert.equal(armA.revokedSessions, liveAwayBefore, "as sessões do par desvinculado morrem na mesma transação");

        const liveAwayAfter = await adminClient.authSession.count({
          where: { tenant_id: orgAway.tenantId, user_id: orgAway.userId, revoked_at: null },
        });

        assert.equal(liveAwayAfter, 0);

        const [awayLinkAfter] = await adminClient.$queryRaw<Array<{ identity_id: string; attached_via: string }>>`
          SELECT identity_id, attached_via FROM auth_identity_links
          WHERE tenant_id = ${orgAway.tenantId}::uuid AND user_id = ${orgAway.userId}::uuid
        `;

        assert.equal(awayLinkAfter?.attached_via, "desvinculo");
        assert.notEqual(awayLinkAfter?.identity_id, homeLink?.identity_id, "o par desvinculado ganhou identidade própria");

        const reLoginAway = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: orgAway.tenantId, email: hookEmail, password: "SenhaAwayNova123!" },
        });

        assert.equal(reLoginAway.status, 200, "a troca de senha e o desvínculo aconteceram na MESMA transação");

        // E DEPOIS dos dois braços a trilha segue ilegível pela conexão efêmera — enquanto a
        // privilegiada, escopada ao par deste caso, ganhou o evento 'desvinculo'.
        const [trailByEphemeralAfter] = await ephemeral.client.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM auth_identity_link_events
        `;
        const [desvinculoVisible] = await adminClient.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM auth_identity_link_events
          WHERE tenant_id = ${orgAway.tenantId}::uuid
            AND user_id = ${orgAway.userId}::uuid
            AND event = 'desvinculo'
        `;

        assert.equal(trailByEphemeralAfter?.count, 0, "o gancho decidiu certo SEM conseguir ler a trilha — é esta a prova");
        assert.equal(desvinculoVisible?.count, 1, "o desvínculo do braço (a) está na trilha, lido só com privilégio");
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
