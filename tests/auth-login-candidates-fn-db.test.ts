import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupIdentityFixture,
  createEphemeralRole,
  createOrgWithUser,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — grupo da FUNÇÃO ELEVADA e da prontidão (§7, C4/dba/especialista/devops): a única
// SECURITY DEFINER do repositório, seus filtros, seu teto interno, os dois lados do DONO e o
// classificador da sonda exercido SOB a role efêmera (a única configuração em que o 42501
// existe — sob a conexão `postgres` da CI ele seria inalcançável).
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Login candidates function tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute login candidates tests.",
  });
} else {
  test("auth_login_candidates: filtros, teto interno, dois lados do dono e sonda", async (t) => {
    const [{ PrismaPg }, { PrismaClient }, { listLoginCandidatesViaFunction, readSqlState }] =
      await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("../src/modules/auth/repositories/login-candidates.repository.js"),
      ]);

    const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const ephemeral = await createEphemeralRole(adminClient, connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const email = `fn-${suffix}@example.com`;
    let cloneOwnerRole: string | undefined;

    try {
      // 5 organizações com o MESMO e-mail (uma acima do teto+1) + 1 inativa + 1 sem credencial.
      const orgs = [];

      for (let index = 0; index < 5; index += 1) {
        const org = await createOrgWithUser(adminClient, {
          name: `FN Org ${index} ${suffix}`,
          slug: `fn-${index}-${suffix}`,
          email,
          password: `SenhaFn${index}123!`,
        });

        orgs.push(org);
        tenantIds.push(org.tenantId);
      }

      await t.test("NULL, vazio e curinga devolvem ZERO linhas (igualdade estrita, jamais LIKE)", async () => {
        const nullRows = await adminClient.$queryRaw<unknown[]>`
          SELECT * FROM public.auth_login_candidates(NULL)
        `;
        const emptyRows = await adminClient.$queryRaw<unknown[]>`
          SELECT * FROM public.auth_login_candidates('')
        `;
        const wildcardRows = await adminClient.$queryRaw<unknown[]>`
          SELECT * FROM public.auth_login_candidates('%@%')
        `;

        assert.deepEqual(nullRows, []);
        assert.deepEqual(emptyRows, []);
        assert.deepEqual(wildcardRows, [], "curinga não é padrão — é um e-mail que não existe");
      });

      await t.test("normalização: caixa/espaço no INPUT casam com o e-mail normalizado armazenado", async () => {
        const rows = await listLoginCandidatesViaFunction(adminClient, `  ${email.toUpperCase()}  `);

        assert.equal(rows.length, 4, "trim+lower no input (espelho de normalizeCredentialEmail)");
      });

      await t.test("teto DENTRO da função: 5 candidatos → exatamente MAX+1 = 4 linhas, ORDER BY tenant_id determinístico", async () => {
        const rows = await listLoginCandidatesViaFunction(adminClient, email);

        assert.equal(rows.length, 4, "a 4ª linha é o sentinela do teto (400 na aplicação)");

        const tenantOrder = rows.map((row) => row.tenant_id);

        assert.deepEqual(
          tenantOrder,
          [...tenantOrder].sort(),
          "ORDER BY tenant_id: o corte do teto é determinístico",
        );
      });

      await t.test("filtros da função: usuário inativo, organização inativa e conta sem credencial ficam de fora", async () => {
        const uniqueEmail = `fn-filtros-${suffix}@example.com`;
        const active = await createOrgWithUser(adminClient, {
          name: `FN Ativa ${suffix}`,
          slug: `fn-ativa-${suffix}`,
          email: uniqueEmail,
          password: "SenhaAtiva123!",
        });
        const inactiveUserOrg = await createOrgWithUser(adminClient, {
          name: `FN UsuInativo ${suffix}`,
          slug: `fn-usu-inativo-${suffix}`,
          email: uniqueEmail,
          password: "SenhaInativa123!",
          userStatus: "inactive",
        });
        const inactiveTenantOrg = await createOrgWithUser(adminClient, {
          name: `FN OrgInativa ${suffix}`,
          slug: `fn-org-inativa-${suffix}`,
          email: uniqueEmail,
          password: "SenhaOrgInativa123!",
        });

        await adminClient.tenant.update({
          where: { id: inactiveTenantOrg.tenantId },
          data: { status: "inactive" },
        });

        // Conta SEM credencial: usuário direto, sem local_auth_credentials.
        const noCredTenant = await adminClient.tenant.create({
          data: { name: `FN SemCred ${suffix}`, slug: `fn-sem-cred-${suffix}` },
        });

        await adminClient.user.create({
          data: { tenant_id: noCredTenant.id, name: "Sem Cred", email: uniqueEmail },
        });

        tenantIds.push(
          active.tenantId,
          inactiveUserOrg.tenantId,
          inactiveTenantOrg.tenantId,
          noCredTenant.id,
        );

        const rows = await listLoginCandidatesViaFunction(adminClient, uniqueEmail);

        assert.deepEqual(
          rows.map((row) => row.tenant_id),
          [active.tenantId],
          "só o par ativo+ativo+com credencial é candidato",
        );
      });

      await t.test("EXECUTE revogado: a role efêmera recebe 42501 (o SQLSTATE sobrevive até o chamador)", async () => {
        // REVOKE ALL FROM PUBLIC na migração + nenhum GRANT: a role efêmera NÃO tem EXECUTE.
        await assert.rejects(
          listLoginCandidatesViaFunction(ephemeral.client, email),
          (error: unknown) => {
            assert.equal(readSqlState(error), "42501", "a conversão para 401 é da ROTA, nunca do repositório");

            return true;
          },
        );
      });

      await t.test("classificador da sonda: 42501 sob a role efêmera → inert_no_execute → luz 'inactive'", async () => {
        const { classifyLoginReadiness, resetLoginReadinessForTests, getLoginWithoutOrgStatus } =
          await import("../src/modules/auth/services/login-readiness.js");

        const outcome = await classifyLoginReadiness(ephemeral.client);

        assert.equal(outcome, "inert_no_execute");

        // O desfecho classificado sob a role real dirige a luz pública.
        resetLoginReadinessForTests(outcome);
        assert.equal(getLoginWithoutOrgStatus(), "inactive");
        resetLoginReadinessForTests();
      });

      await t.test("sonda com e-mail-sentinela no lado PRIVILEGIADO: zero linhas sem exceção → conjunção com o catálogo → active", async () => {
        const { classifyLoginReadiness } = await import(
          "../src/modules/auth/services/login-readiness.js"
        );

        const outcome = await classifyLoginReadiness(adminClient);

        assert.equal(outcome, "active", "dono superusuário (dev/CI): sonda limpa + catálogo com bypass");
      });

      await t.test("dois lados do DONO: clone com dono NOSUPERUSER + GRANT SELECT retorna SEM exceção e ZERO linhas (RLS filtrando)", async () => {
        // O lado que a sonda sozinha NÃO distingue (especialista C): dono sem BYPASSRLS executa
        // sem erro e o FORCE RLS filtra tudo — todo login anônimo morreria em 401 com sonda
        // limpa. É a razão de 'active' ser CONJUNÇÃO.
        cloneOwnerRole = `o6r_clone_owner_${Date.now()}`;
        await adminClient.$executeRawUnsafe(
          `CREATE ROLE "${cloneOwnerRole}" NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        );
        await adminClient.$executeRawUnsafe(
          `GRANT SELECT ON public.users, public.local_auth_credentials, public.tenants TO "${cloneOwnerRole}"`,
        );
        await adminClient.$executeRawUnsafe(`
          CREATE FUNCTION public.auth_login_candidates_owner_probe_clone(p_email text)
          RETURNS TABLE (tenant_id uuid, user_id uuid)
          LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
          AS $probe$
            SELECT u.tenant_id, u.id
            FROM public.users u
            JOIN public.tenants t ON t.id = u.tenant_id
            JOIN public.local_auth_credentials c ON c.tenant_id = u.tenant_id AND c.user_id = u.id
            WHERE btrim(lower(p_email)) <> ''
              AND u.email = btrim(lower(p_email))
              AND u.status = 'active'
              AND t.status = 'active'
            ORDER BY u.tenant_id
            LIMIT 4
          $probe$;
        `);
        await adminClient.$executeRawUnsafe(
          `ALTER FUNCTION public.auth_login_candidates_owner_probe_clone(text) OWNER TO "${cloneOwnerRole}"`,
        );

        const rows = await adminClient.$queryRaw<unknown[]>`
          SELECT * FROM public.auth_login_candidates_owner_probe_clone(${email})
        `;

        assert.deepEqual(
          rows,
          [],
          "dono sem BYPASSRLS: sem exceção e ZERO linhas para um e-mail que EXISTE em 5 organizações",
        );
      });
    } finally {
      if (cloneOwnerRole) {
        await adminClient.$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS public.auth_login_candidates_owner_probe_clone(text)`,
        );
        await adminClient.$executeRawUnsafe(`DROP OWNED BY "${cloneOwnerRole}"`);
        await adminClient.$executeRawUnsafe(`DROP ROLE IF EXISTS "${cloneOwnerRole}"`);
      }

      await cleanupIdentityFixture(adminClient, tenantIds);
      await ephemeral.drop();
      await adminClient.$disconnect();
    }
  });
}
