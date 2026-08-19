import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupIdentityFixture,
  createCloneOwnerProbe,
  createEphemeralRole,
  createOrgWithUser,
  createSyntheticOrphanRole,
  dropSyntheticOrphanRole,
  ROLE_CATALOG_ADVISORY_LOCK,
  type CloneOwnerProbe,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — grupo da FUNÇÃO ELEVADA e da prontidão (§7, C4/dba/especialista/devops): a única
// SECURITY DEFINER do repositório, seus filtros, seu teto interno, os dois lados do DONO e o
// classificador da sonda exercido SOB a role efêmera (a única configuração em que o 42501
// existe — sob a conexão `postgres` da CI ele seria inalcançável).
//
// CICLO 3 (C2): TODA sequência de catálogo saiu deste arquivo para o arnês
// (`createCloneOwnerProbe`, inteira dentro do lock de catálogo) — este arquivo era o QUINTO
// escritor, fora do lock (`XX000` provado na junta do ciclo 2). A condição é verificável pelo
// ratchet `tests/db-catalog-write-guard.test.ts`: este arquivo fica FORA da allowlist, com zero
// palavra-chave de escrita de catálogo.
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
    let cloneProbe: CloneOwnerProbe | undefined;

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

      await t.test("EXECUTE ausente: a role efêmera recebe 42501 (o SQLSTATE sobrevive até o chamador)", async () => {
        // A migração retira EXECUTE de PUBLIC e nunca o concede a ninguém: a role efêmera NÃO tem EXECUTE.
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

      await t.test("dois lados do DONO: clone com dono NOSUPERUSER e leitura concedida retorna SEM exceção e ZERO linhas (RLS filtrando)", async () => {
        // O lado que a sonda sozinha NÃO distingue (especialista C): dono sem BYPASSRLS executa
        // sem erro e o FORCE RLS filtra tudo — todo login anônimo morreria em 401 com sonda
        // limpa. É a razão de 'active' ser CONJUNÇÃO. A sequência de catálogo inteira vive no
        // arnês, dentro do lock (ciclo 3, C2 — este arquivo era o quinto escritor, fora dele).
        cloneProbe = await createCloneOwnerProbe(adminClient);

        const rows = await adminClient.$queryRawUnsafe<unknown[]>(
          `SELECT * FROM public.${cloneProbe.functionName}($1)`,
          email,
        );

        assert.deepEqual(
          rows,
          [],
          "dono sem BYPASSRLS: sem exceção e ZERO linhas para um e-mail que EXISTE em 5 organizações",
        );
      });

      await t.test("prova de FILA do quinto escritor: com o lock tomado por conexão auxiliar, o helper enfileira (waiter em pg_locks) e só conclui após o release", async () => {
        // A introspecção de pg_locks é determinística; o TEMPO até o waiter aparecer não é — o
        // valor probatório real está no drill C (helper sem o lock → esta prova fica vermelha).
        // A asserção FORTE é `resolvedWhileHeld === false`: atribuição direta ao helper, imune a
        // waiter de suíte irmã por coincidência de janela.
        const lockClassId = Number(ROLE_CATALOG_ADVISORY_LOCK >> 32n);
        const lockObjId = Number(ROLE_CATALOG_ADVISORY_LOCK & 0xffffffffn);
        let released = false;
        let resolvedWhileHeld = false;
        let releaseHold: () => void = () => {};
        const holdUntil = new Promise<void>((resolve) => {
          releaseHold = resolve;
        });
        let holderHasLock: () => void = () => {};
        const holderLockAcquired = new Promise<void>((resolve) => {
          holderHasLock = resolve;
        });

        // Conexão auxiliar toma o lock do arnês numa transação aberta…
        const holder = adminClient.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ROLE_CATALOG_ADVISORY_LOCK}::bigint)`;
            holderHasLock();
            await holdUntil;
          },
          { maxWait: 30_000, timeout: 30_000 },
        );

        await holderLockAcquired;

        // …o helper dispara em paralelo (tem de ENFILEIRAR, não concluir)…
        const probePromise = createCloneOwnerProbe(adminClient).then((probe) => {
          if (!released) {
            resolvedWhileHeld = true;
          }

          return probe;
        });

        // …e o teste procura o waiter em pg_locks (granted = false na fila do advisory lock).
        let waiterSeen = false;
        const deadline = Date.now() + 15_000;

        while (Date.now() < deadline && !waiterSeen && !resolvedWhileHeld) {
          const waiters = await adminClient.$queryRaw<Array<{ pid: number }>>`
            SELECT pid FROM pg_locks
            WHERE locktype = 'advisory'
              AND classid = ${lockClassId}::oid
              AND objid = ${lockObjId}::oid
              AND objsubid = 1
              AND granted = false
          `;

          if (waiters.length > 0) {
            waiterSeen = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        released = true;
        releaseHold();
        await holder;

        const probe = await probePromise;

        try {
          assert.equal(
            resolvedWhileHeld,
            false,
            "o helper só pode concluir DEPOIS do release — concluir antes significa que ele não tomou o lock",
          );
          assert.equal(
            waiterSeen,
            true,
            "o helper tem de aparecer como waiter (granted = false) enquanto a auxiliar segura o lock",
          );
        } finally {
          await probe.drop();
        }
      });

      await t.test("varredor do arnês: órfã sintética o6r_clone_owner_ além do corte de 60 min é recolhida pela próxima criação de role", async () => {
        // C4/drill D: a família o6r_clone_owner_ nasceu neste arquivo (ciclo 2, nome fixo, sem
        // varredor — 5 órfãs vivas na base do dono). A órfã sintética retrodatada prova que o
        // sweep agora a alcança; drill D reverte a regex para só o6r_b01_ e isto fica vermelho.
        const orphanName = await createSyntheticOrphanRole(
          adminClient,
          "o6r_clone_owner",
          2 * 60 * 60 * 1000,
        );

        try {
          const sweeper = await createEphemeralRole(adminClient, connectionString);

          try {
            const rows = await adminClient.$queryRaw<Array<{ rolname: string }>>`
              SELECT rolname FROM pg_roles WHERE rolname = ${orphanName}
            `;

            assert.equal(
              rows.length,
              0,
              "o sweep cobre as DUAS famílias que o próprio arnês cria (o6r_b01_ e o6r_clone_owner_)",
            );
          } finally {
            await sweeper.drop();
          }
        } finally {
          await dropSyntheticOrphanRole(adminClient, orphanName);
        }
      });
    } finally {
      if (cloneProbe) {
        await cloneProbe.drop();
      }

      await cleanupIdentityFixture(adminClient, tenantIds);
      await ephemeral.drop();
      await adminClient.$disconnect();
    }
  });
}
