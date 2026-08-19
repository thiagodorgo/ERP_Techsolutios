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
// B-O6R-01 — login SEM organização de ponta a ponta contra o Postgres real (a rota atravessa a
// função elevada; em dev/CI a conexão tem privilégio e o caminho está ATIVO — §6.1). Aqui também
// vive a prova do lockout DIRECIONADO real (as falhas contam e a 5ª tranca) em contraste com o
// canal anônimo (que não incrementa e nunca devolve 423).
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Anonymous login tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute anonymous login tests.",
  });
} else {
  test("login sem organização: a credencial decide; anônimo não incrementa; direcionado tranca", async (t) => {
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

    try {
      const app = createApp(new PrismaCoreSaasService());

      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const anonymousLogin = (email: string, password: string) =>
        requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { email, password },
        });

      await t.test("1 organização: login sem tenantId autentica e o corpo é o contrato do login normal", async () => {
        const email = `anon-um-${suffix}@example.com`;
        const org = await createOrgWithUser(adminClient, {
          name: `Anon Um ${suffix}`,
          slug: `anon-um-${suffix}`,
          email,
          password: "SenhaAnonUm123!",
        });

        tenantIds.push(org.tenantId);

        const response = await anonymousLogin(email, "SenhaAnonUm123!");

        assert.equal(response.status, 200);

        const data = response.body.data as {
          authenticated: boolean;
          access_token: string;
          tenant: { id: string };
        };

        assert.equal(data.authenticated, true);
        assert.equal(data.tenant.id, org.tenantId);

        // Sucesso anônimo AUDITA na organização que autenticou (§6.4.3).
        const audit = await adminClient.auditLog.findFirst({
          where: { tenant_id: org.tenantId, action: "auth.login.success" },
          orderBy: { created_at: "desc" },
        });

        assert.equal(
          (audit?.metadata as { loginMode?: string })?.loginMode,
          "without_org",
          "a auditoria distingue o modo sem organização",
        );
      });

      await t.test("homônimo em 2 organizações, senhas distintas: a SENHA escolhe a organização", async () => {
        const email = `anon-dois-${suffix}@example.com`;
        const orgX = await createOrgWithUser(adminClient, {
          name: `Anon X ${suffix}`,
          slug: `anon-x-${suffix}`,
          email,
          password: "SenhaAnonX123!",
        });
        const orgY = await createOrgWithUser(adminClient, {
          name: `Anon Y ${suffix}`,
          slug: `anon-y-${suffix}`,
          email,
          password: "SenhaAnonY123!",
        });

        tenantIds.push(orgX.tenantId, orgY.tenantId);

        const loginY = await anonymousLogin(email, "SenhaAnonY123!");

        assert.equal(loginY.status, 200);
        assert.equal((loginY.body.data as { tenant: { id: string } }).tenant.id, orgY.tenantId);
      });

      await t.test("mesma senha em 2 organizações → 409 TENANT_SELECTION_REQUIRED com SOMENTE as provadas", async () => {
        const email = `anon-igual-${suffix}@example.com`;
        const orgM = await createOrgWithUser(adminClient, {
          name: `Anon M ${suffix}`,
          slug: `anon-m-${suffix}`,
          email,
          password: "SenhaIgual123!",
        });
        const orgN = await createOrgWithUser(adminClient, {
          name: `Anon N ${suffix}`,
          slug: `anon-n-${suffix}`,
          email,
          password: "SenhaIgual123!",
        });
        // Uma terceira organização com o mesmo e-mail e senha DIFERENTE — não pode aparecer.
        const orgO = await createOrgWithUser(adminClient, {
          name: `Anon O ${suffix}`,
          slug: `anon-o-${suffix}`,
          email,
          password: "SenhaDiferente123!",
        });

        tenantIds.push(orgM.tenantId, orgN.tenantId, orgO.tenantId);

        const response = await anonymousLogin(email, "SenhaIgual123!");

        assert.equal(response.status, 409);
        assert.equal(response.body.error?.code, "TENANT_SELECTION_REQUIRED");

        const offered = (response.body.error?.tenants as Array<{ id: string }>).map((item) => item.id).sort();

        assert.deepEqual(offered, [orgM.tenantId, orgN.tenantId].sort(), "SÓ as organizações PROVADAS");
      });

      await t.test("4+ organizações → 400 TENANT_ID_REQUIRED (o teto veio da própria função)", async () => {
        const email = `anon-teto-${suffix}@example.com`;

        for (let index = 0; index < 4; index += 1) {
          const org = await createOrgWithUser(adminClient, {
            name: `Anon Teto ${index} ${suffix}`,
            slug: `anon-teto-${index}-${suffix}`,
            email,
            password: `SenhaTeto${index}123!`,
          });

          tenantIds.push(org.tenantId);
        }

        const response = await anonymousLogin(email, "SenhaTeto0123!");

        assert.equal(response.status, 400);
        assert.equal(response.body.error?.code, "TENANT_ID_REQUIRED");
      });

      await t.test("anônimo com senha errada NÃO incrementa candidato; direcionado incrementa e a 5ª falha TRANCA", async () => {
        const email = `anon-lock-${suffix}@example.com`;
        const org = await createOrgWithUser(adminClient, {
          name: `Anon Lock ${suffix}`,
          slug: `anon-lock-${suffix}`,
          email,
          password: "SenhaLock123!",
        });

        tenantIds.push(org.tenantId);

        // Anônimo: senha errada, contador PARADO.
        const anon = await anonymousLogin(email, "SenhaErrada123!");

        assert.equal(anon.status, 401);

        const afterAnonymous = await adminClient.localAuthCredential.findFirst({
          where: { tenant_id: org.tenantId, user_id: org.userId },
          select: { failed_attempts: true, locked_until: true },
        });

        assert.equal(afterAnonymous?.failed_attempts, 0, "falha anônima não incrementa nenhum candidato");

        // E-mail INEXISTENTE responde exatamente igual à senha errada (401 uniforme).
        const ghost = await anonymousLogin(`ghost-${suffix}@example.com`, "SenhaErrada123!");

        assert.equal(ghost.status, 401);
        assert.deepEqual(ghost.body, anon.body);

        // Direcionado: 5 falhas → locked_until gravado (lockout REAL, não decorativo).
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const response = await requestJson(baseUrl, "/api/v1/auth/login", {
            method: "POST",
            body: { tenantId: org.tenantId, email, password: "SenhaErrada123!" },
          });

          assert.equal(response.status, 401);
        }

        const afterDirected = await adminClient.localAuthCredential.findFirst({
          where: { tenant_id: org.tenantId, user_id: org.userId },
          select: { failed_attempts: true, locked_until: true },
        });

        assert.equal(afterDirected?.failed_attempts, 5);
        assert.ok(afterDirected?.locked_until, "a 5ª falha ARMA o lockout");
        assert.ok((afterDirected?.locked_until?.getTime() ?? 0) > Date.now());

        // Direcionado em lock → 423; anônimo com o MESMO candidato em lock → 401 uniforme.
        const directedLocked = await requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: org.tenantId, email, password: "SenhaLock123!" },
        });

        assert.equal(directedLocked.status, 423);

        const anonymousLocked = await anonymousLogin(email, "SenhaLock123!");

        assert.equal(anonymousLocked.status, 401, "o 423 não existe no caminho anônimo");
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
