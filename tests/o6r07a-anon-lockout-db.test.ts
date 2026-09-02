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
import { LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS } from "../src/modules/auth/anonymous-login.constants.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-07a (§3.4 do plano) — a MESMA medição do secops que abriu `P-O6R-B01-ANONIMO-SEM-LOCKOUT`,
// virada do avesso e transformada em sonda permanente: 12 tentativas anônimas com senha errada,
// contra Postgres real, através da ROTA. Antes deste bloco o contador ficava PARADO em 0 e o
// `locked_until` nunca era escrito — força bruta ilimitada, sem rastro, por uma via que sequer
// exige conhecer a organização.
//
// O que NÃO pode mudar junto (o anti-enumeração que o B01 comprou): a resposta anônima segue 401
// uniforme, indistinguível de e-mail inexistente, e nunca enumera organizações. O 423 é exclusivo
// do login DIRECIONADO.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("O6R-07a anonymous lockout tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute anonymous lockout tests.",
  });
} else {
  test("caminho anônimo: falha ARMA o lockout, deixa rastro e não vaza estado da conta", async (t) => {
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

      const email = `o6r07a-lock-${suffix}@example.com`;
      const senhaCerta = "SenhaCertaO6R07a123!";
      const org = await createOrgWithUser(adminClient, {
        name: `O6R07a Lock ${suffix}`,
        slug: `o6r07a-lock-${suffix}`,
        email,
        password: senhaCerta,
      });

      tenantIds.push(org.tenantId);

      const anonymousLogin = (mail: string, password: string) =>
        requestJson(baseUrl, "/api/v1/auth/login", { method: "POST", body: { email: mail, password } });
      const directedLogin = (password: string) =>
        requestJson(baseUrl, "/api/v1/auth/login", {
          method: "POST",
          body: { tenantId: org.tenantId, email, password },
        });
      const readCredential = () =>
        adminClient.localAuthCredential.findFirst({
          where: { tenant_id: org.tenantId, user_id: org.userId },
          select: { failed_attempts: true, locked_until: true },
        });

      await t.test("12 tentativas anônimas MOVEM o contador e ARMAM o lockout (a medição do secops)", async () => {
        const statuses: number[] = [];

        for (let attempt = 0; attempt < 12; attempt += 1) {
          const response = await anonymousLogin(email, "SenhaErradaO6R07a123!");

          statuses.push(response.status);
        }

        // Nenhuma das 12 pode ser 423: o caminho anônimo não tem 423 (401 uniforme; e o balde por
        // e-mail do B01 pode devolver 429 depois de 10 — os dois são desfechos legítimos aqui).
        assert.equal(
          statuses.every((status) => status === 401 || status === 429),
          true,
          `desfechos anônimos observados: ${JSON.stringify(statuses)}`,
        );
        assert.equal(statuses.includes(423), false, "o 423 NUNCA aparece no caminho anônimo");

        const credential = await readCredential();

        assert.ok(
          (credential?.failed_attempts ?? 0) >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
          `contador PARADO: failed_attempts = ${credential?.failed_attempts} (antes deste bloco era 0)`,
        );
        assert.ok(credential?.locked_until, "as falhas anônimas ARMARAM o locked_until de verdade");
        assert.ok((credential?.locked_until?.getTime() ?? 0) > Date.now());
      });

      await t.test("a conta trancada por via anônima recusa o login DIRETO com a senha certa (423)", async () => {
        const response = await directedLogin(senhaCerta);

        assert.equal(response.status, 423);
        assert.equal(response.body.error?.code, "ACCOUNT_LOCKED");
      });

      await t.test("sob lock, o anônimo com a senha CERTA segue 401 — idêntico a e-mail inexistente", async () => {
        // Organização PRÓPRIA: o balde por e-mail do B01 (10/15 min) já foi consumido pelas 12
        // tentativas do primeiro subteste, e um 429 aqui mediria o freio do B01, não o lockout.
        const emailUniforme = `o6r07a-uniforme-${suffix}@example.com`;
        const orgUniforme = await createOrgWithUser(adminClient, {
          name: `O6R07a Uniforme ${suffix}`,
          slug: `o6r07a-uniforme-${suffix}`,
          email: emailUniforme,
          password: senhaCerta,
        });

        tenantIds.push(orgUniforme.tenantId);

        for (let attempt = 0; attempt < LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS; attempt += 1) {
          const response = await anonymousLogin(emailUniforme, "SenhaErradaO6R07a123!");

          assert.equal(response.status, 401);
        }

        const travada = await adminClient.localAuthCredential.findFirst({
          where: { tenant_id: orgUniforme.tenantId, user_id: orgUniforme.userId },
          select: { locked_until: true },
        });

        assert.ok(travada?.locked_until, "pré-condição: as falhas anônimas armaram o lockout");

        const sobLock = await anonymousLogin(emailUniforme, senhaCerta);
        const fantasma = await anonymousLogin(`o6r07a-ghost-${suffix}@example.com`, senhaCerta);

        assert.equal(sobLock.status, 401, "conta em lock NÃO devolve 423 pelo caminho anônimo");
        assert.equal(fantasma.status, 401);
        assert.deepEqual(sobLock.body, fantasma.body, "resposta indistinguível — sem oráculo de conta");
        assert.equal(
          JSON.stringify(sobLock.body).includes(orgUniforme.tenantId),
          false,
          "a resposta anônima nunca enumera organizações",
        );
      });

      await t.test("o rastro existe e é INTERNO: auditoria de falha anônima na organização do candidato", async () => {
        const rows = await adminClient.auditLog.findMany({
          where: { tenant_id: org.tenantId, action: "auth.login.failed" },
          orderBy: { created_at: "asc" },
        });

        assert.ok(rows.length > 0, "antes deste bloco a falha anônima não auditava nada");

        const semOrganizacao = rows.filter(
          (row) => (row.metadata as { loginMode?: string } | null)?.loginMode === "without_org",
        );

        assert.ok(
          semOrganizacao.length >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
          `linhas marcadas without_org = ${semOrganizacao.length}`,
        );
        assert.equal(
          JSON.stringify(semOrganizacao).includes("SenhaErradaO6R07a123!"),
          false,
          "allowlist: a senha tentada nunca entra no rastro",
        );
      });

      await t.test("vencida a janela do lockout, a senha certa volta a entrar e o contador zera", async () => {
        // TTL simulado pelo VENCIMENTO ARMAZENADO: o serviço compara `locked_until` com o relógio
        // do processo e não tem seam de relógio (fora do §3.4). Rebobinar a coluna para o passado
        // é a operação equivalente a avançar o relógio além dos 15 min — declarado, não disfarçado.
        await adminClient.localAuthCredential.updateMany({
          where: { tenant_id: org.tenantId, user_id: org.userId },
          data: { locked_until: new Date(Date.now() - 60_000) },
        });

        const response = await directedLogin(senhaCerta);

        assert.equal(response.status, 200, "o lockout é TEMPORÁRIO — não é banimento de conta");

        const credential = await readCredential();

        assert.equal(credential?.failed_attempts, 0);
        assert.equal(credential?.locked_until, null);
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
