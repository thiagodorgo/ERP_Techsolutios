// B-SAN3-09 — testes COM BANCO para scripts/bootstrap-platform-admin.ts
// T2.1–T2.10 + T2.3b (11 casos): RBAC não provisionado, 1ª execução, 2ª execução (idempotência),
// convergência de administrador legado sem vínculo de identidade, dry-run, admin adicional recusado,
// reset de senha, papel efêmero NOBYPASSRLS, HTTP (login direcionado + login sem organização antes e
// depois da concessão de EXECUTE na função elevada), processo filho, concorrência com trava própria.
// Banco de drill: `CREATE DATABASE erp_san3_09_drill_<sufixo>` (descartável), `migrate deploy` +
// `db:provision-rbac` como processos filhos; teardown: `DROP DATABASE … WITH (FORCE)`.
// Ratchet lexical (db-catalog-write-guard): sem DDL de catálogo de cluster nem concessão explícita neste arquivo.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BOOTSTRAP_MIN_PASSWORD_LENGTH,
  BOOTSTRAP_AUDIT_ACTION,
  BootstrapRefused,
  PLATFORM_TENANT_SLUG,
  PLATFORM_ROLE_KEY,
  bootstrapPlatformAdmin,
  readBootstrapInput,
} from "../scripts/bootstrap-platform-admin.js";
import { createPrismaClient } from "../src/database/pg-connection.js";
import { setTenantRlsContext } from "../src/database/rls.js";
import { LocalAuthCredentialRepository } from "../src/modules/auth/repositories/local-auth-credential.repository.js";
import { LocalAuthCredentialService } from "../src/modules/auth/services/local-auth-credential.service.js";
import { createEphemeralRole, withRoleCatalogLock } from "./helpers/auth-identity-fixture.js";
import { grantAuthLoginCandidatesExecuteToRole } from "./helpers/auth-login-candidates-grant.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "bootstrap-platform-admin.ts");

const ADMIN_EMAIL = "bootstrap-san3-09@example.com";
const ADMIN_PASSWORD = "TesteSan309-Bootstrap!";
const ADMIN_NAME = "Admin SAN3-09";

assert.ok(ADMIN_PASSWORD.length >= BOOTSTRAP_MIN_PASSWORD_LENGTH, "senha de teste deve respeitar a política");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("san3-09-db: testes com banco exigem DATABASE_URL e uma base migrada e provisionada", {
    skip: "Defina DATABASE_URL (base provisionada) para executar este teste.",
  });
} else {
  test(
    "san3-09 T2 — bootstrap do 1º administrador de plataforma (banco de drill descartável)",
    { timeout: 300_000 },
    async (t) => {
      process.env.LOG_LEVEL = "silent";
      process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
      process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";

      const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);

      // B-AUTH-LOGIN-PLATAFORMA — leitura das TRÊS tabelas de identidade SEMPRE pelo cliente
      // ADMINISTRATIVO do drill. Sob a política da trilha (RLS FORCE, única de INSERT) o papel de
      // runtime não tem SELECT em auth_identity_link_events, e o vínculo só aparece sob o braço de
      // tenant do GUC. As contagens são do banco ISOLADO do drill, nunca de base compartilhada.
      const identityState = async (
        adminLike: InstanceType<typeof PrismaClient>,
        tenantId: string | null,
        userId: string | null,
      ) => {
        const links = await adminLike.authIdentityLink.findMany({
          where: tenantId === null ? undefined : { tenant_id: tenantId },
          select: { id: true, identity_id: true, attached_via: true },
          orderBy: { created_at: "asc" },
        });
        const events = await adminLike.authIdentityLinkEvent.findMany({
          where: tenantId === null || userId === null ? undefined : { tenant_id: tenantId, user_id: userId },
          select: { id: true, event: true },
          orderBy: { occurred_at: "asc" },
        });

        return {
          identities: await adminLike.authIdentity.count(),
          links: links.length,
          linkIds: links.map((link) => link.id),
          identityIds: links.map((link) => link.identity_id),
          attachedVia: links.map((link) => link.attached_via),
          backfillEvents: events.filter((event) => event.event === "backfill").length,
          events: events.length,
          eventIds: events.map((event) => `${event.event}:${event.id}`),
        };
      };

      // Conexão administrativa para criar/destruir o banco de drill
      const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

      const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const drillDbName = `erp_san3_09_drill_${suffix}`;
      const modelDbName = `erp_san3_09_drill_model_${suffix}`;
      // Reescreve só o nome do banco na URL, preservando host/porta/usuário
      const drillUrl = connectionString.replace(/\/([^/?]+)(\?.*)?$/, `/${drillDbName}$2`);

      let drillClient: InstanceType<typeof PrismaClient> | undefined;
      let server: Server | undefined;
      let efemera: Awaited<ReturnType<typeof createEphemeralRole>> | undefined;

      try {
        // ── Setup: banco de drill limpo ────────────────────────────────────────
        await adminClient.$executeRawUnsafe(`CREATE DATABASE "${drillDbName}"`);

        // T2.1 — banco só migrado (sem db:provision-rbac): RBAC_NOT_PROVISIONED ─────────────────────────

        await t.test("T2.1 banco só migrado → RBAC_NOT_PROVISIONED; tenants=users=0", async () => {
          const res = spawnSync(
            process.execPath,
            ["--import", "tsx/esm", join(ROOT, "node_modules", ".bin", "prisma"), "migrate", "deploy"],
            {
              env: { ...process.env, DATABASE_URL: drillUrl },
              encoding: "utf8",
              timeout: 120_000,
            },
          );
          assert.equal(res.error, undefined, `migrate deploy falhou: ${res.error?.message}`);
          assert.equal(res.status, 0, `migrate deploy saiu com ${res.status}:\nstdout: ${res.stdout}\nstderr: ${res.stderr}`);

          const drillAdminMigrado = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillUrl }) });
          try {
            const input = readBootstrapInput(
              { PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD },
              { dryRun: false, passwordStdin: false, resetPassword: false },
            );
            try {
              await bootstrapPlatformAdmin(drillAdminMigrado, input);
              assert.fail("deveria ter lançado BootstrapRefused");
            } catch (e) {
              assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
              assert.equal(e.code, "RBAC_NOT_PROVISIONED");
            }
            const tenants = await drillAdminMigrado.tenant.count();
            const users = await drillAdminMigrado.user.count();
            assert.equal(tenants, 0, "nenhum tenant deve ter sido criado após RBAC_NOT_PROVISIONED");
            assert.equal(users, 0, "nenhum usuário deve ter sido criado após RBAC_NOT_PROVISIONED");
          } finally {
            await drillAdminMigrado.$disconnect();
          }
        });

        // Provisionar RBAC no banco de drill (T2.2 em diante depende disso) ────────────────────────────
        const provRes = spawnSync(
          process.execPath,
          ["--import", "tsx/esm", join(ROOT, "scripts", "provision-rbac.ts")],
          {
            env: { ...process.env, DATABASE_URL: drillUrl },
            encoding: "utf8",
            timeout: 60_000,
          },
        );
        // Fallback: tentar npm run db:provision-rbac se o caminho direto não existir
        if (provRes.status !== 0) {
          const npmRes = spawnSync("npm", ["run", "--silent", "db:provision-rbac"], {
            env: { ...process.env, DATABASE_URL: drillUrl },
            encoding: "utf8",
            timeout: 60_000,
            cwd: ROOT,
          });
          assert.equal(
            npmRes.status,
            0,
            `db:provision-rbac falhou:\nstdout: ${npmRes.stdout}\nstderr: ${npmRes.stderr}`,
          );
        }

        await adminClient.$executeRawUnsafe(`CREATE DATABASE "${modelDbName}" TEMPLATE "${drillDbName}"`);

        drillClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillUrl }) });

        const baseInput = readBootstrapInput(
          {
            PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL,
            PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD,
            PLATFORM_ADMIN_NAME: ADMIN_NAME,
          },
          { dryRun: false, passwordStdin: false, resetPassword: false },
        );

        // T2.2 — 1ª execução ────────────────────────────────────────────────────────────────────────────

        let firstTenantId: string | null = null;
        let firstPasswordHash: string | null = null;
        let firstUserId: string | null = null;
        let firstIdentity: Awaited<ReturnType<typeof identityState>> | null = null;

        await t.test("T2.2 1ª execução → flags true, 1/1/1/1/1, status active, vínculo global, scrypt-v1", async () => {
          const report = await bootstrapPlatformAdmin(drillClient!, baseInput);

          assert.equal(report.tenantCreated, true, "tenantCreated deve ser true na 1ª execução");
          assert.equal(report.userCreated, true, "userCreated deve ser true na 1ª execução");
          assert.equal(report.assignmentCreated, true, "assignmentCreated deve ser true na 1ª execução");
          assert.equal(report.credentialCreated, true, "credentialCreated deve ser true na 1ª execução");
          assert.equal(report.passwordReset, false, "passwordReset deve ser false na 1ª execução");
          assert.notEqual(report.tenantId, null, "tenantId deve estar preenchido");
          assert.notEqual(report.userId, null, "userId deve estar preenchido");
          assert.equal(report.dryRun, false);

          firstTenantId = report.tenantId;

          // Verificar contagens: 1 tenant de sistema, 1 usuário, 1 vínculo, 1 credencial, 1 audit_log
          const tenants = await drillClient!.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } });
          const users = await drillClient!.user.count({ where: { tenant_id: report.tenantId! } });
          const assignments = await drillClient!.userRoleAssignment.count({ where: { tenant_id: report.tenantId! } });
          const creds = await drillClient!.localAuthCredential.count({ where: { tenant_id: report.tenantId! } });
          const auditLogs = await drillClient!.auditLog.count({ where: { tenant_id: report.tenantId! } });

          assert.equal(tenants, 1, "deve haver exatamente 1 tenant de sistema");
          assert.equal(users, 1, "deve haver exatamente 1 usuário");
          assert.equal(assignments, 1, "deve haver exatamente 1 vínculo de papel");
          assert.equal(creds, 1, "deve haver exatamente 1 credencial");
          assert.equal(auditLogs, 1, "deve haver exatamente 1 registro de auditoria");

          // Verificar status active
          const user = await drillClient!.user.findUnique({
            where: { id: report.userId! },
            select: { status: true, email: true },
          });
          assert.equal(user?.status, "active", "usuário deve estar active");
          assert.equal(user?.email, ADMIN_EMAIL, "e-mail do usuário deve bater");

          // Verificar vínculo com papel GLOBAL (tenant_id IS NULL)
          const assignment = await drillClient!.userRoleAssignment.findFirst({
            where: { user_id: report.userId! },
            select: { role: { select: { key: true, tenant_id: true } } },
          });
          assert.equal(assignment?.role.key, PLATFORM_ROLE_KEY, "vínculo deve ser com o papel super_admin");
          assert.equal(assignment?.role.tenant_id, null, "o papel vinculado deve ser global (tenant_id IS NULL)");

          // Verificar credencial scrypt-v1
          const cred = await drillClient!.localAuthCredential.findFirst({
            where: { tenant_id: report.tenantId! },
            select: { password_hash: true },
          });
          assert.ok(cred?.password_hash?.startsWith("scrypt$v=1$"), `credencial deve ser scrypt-v1 (hash: scrypt$v=1$…), mas foi: ${cred?.password_hash?.slice(0, 25)}`);
          firstPasswordHash = cred?.password_hash ?? null;

          // B-AUTH-LOGIN-PLATAFORMA (§2 do plano) — o bootstrap entrega o administrador já
          // convergido nas TRÊS tabelas de identidade, na mesma transação e sob o GUC da
          // organização `platform` (mesmo efeito do fluxo normal em prisma-core-saas.store.ts:188).
          assert.equal(report.identityLinked, true, "identityLinked deve ser true na 1ª execução");
          firstUserId = report.userId;
          firstIdentity = await identityState(drillClient!, report.tenantId, report.userId);
          assert.equal(firstIdentity.links, 1, "deve haver exatamente 1 vínculo em auth_identity_links");
          assert.equal(firstIdentity.identities, 1, "deve haver exatamente 1 identidade em auth_identities");
          assert.equal(firstIdentity.backfillEvents, 1, "deve haver exatamente 1 evento 'backfill'");
          assert.deepEqual(firstIdentity.attachedVia, ["backfill"], "o vínculo chega por 'backfill'");
        });

        // T2.3 — 2ª execução idempotente ────────────────────────────────────────────────────────────────

        await t.test("T2.3 2ª execução → flags false, contagens iguais, hash igual, auditoria 1", async () => {
          const report = await bootstrapPlatformAdmin(drillClient!, baseInput);

          assert.equal(report.tenantCreated, false, "tenantCreated deve ser false na 2ª execução");
          assert.equal(report.userCreated, false, "userCreated deve ser false na 2ª execução");
          assert.equal(report.assignmentCreated, false, "assignmentCreated deve ser false na 2ª execução");
          assert.equal(report.credentialCreated, false, "credentialCreated deve ser false na 2ª execução");
          assert.equal(report.passwordReset, false, "passwordReset deve ser false na 2ª execução");

          // Contagens devem permanecer iguais
          const tenants = await drillClient!.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } });
          const users = await drillClient!.user.count({ where: { tenant_id: firstTenantId! } });
          const auditLogs = await drillClient!.auditLog.count({ where: { tenant_id: firstTenantId! } });

          assert.equal(tenants, 1, "contagem de tenants deve permanecer 1");
          assert.equal(users, 1, "contagem de usuários deve permanecer 1");
          assert.equal(auditLogs, 1, "auditoria não deve crescer na 2ª execução");

          // Hash deve permanecer igual
          const cred = await drillClient!.localAuthCredential.findFirst({
            where: { tenant_id: firstTenantId! },
            select: { password_hash: true },
          });
          assert.equal(cred?.password_hash, firstPasswordHash, "password_hash não deve mudar na 2ª execução");

          // B-AUTH-LOGIN-PLATAFORMA — a 2ª execução NÃO toca as três tabelas de identidade.
          assert.equal(report.identityLinked, false, "identityLinked deve ser false na 2ª execução (o vínculo já existia)");
          const identityDepois = await identityState(drillClient!, firstTenantId, firstUserId);
          assert.deepEqual(identityDepois, firstIdentity, "contagens e IDs de identidade permanecem na 2ª execução");
          assert.equal(identityDepois.links, 1, "auth_identity_links permanece 1");
          assert.equal(identityDepois.identities, 1, "auth_identities permanece 1");
          assert.equal(identityDepois.backfillEvents, 1, "auth_identity_link_events permanece 1");
          assert.equal(identityDepois.identityIds[0], firstIdentity?.identityIds[0], "o identity_id deve ser o mesmo");
        });

        // T2.3b — convergência de administrador LEGADO sem vínculo (o caso de produção) ─────────────────

        await t.test("T2.3b administrador legado sem vínculo → identityLinked true, 1/1/1, auditoria +1; reexecução → false sem duplicar", async () => {
          // Banco de drill SEPARADO (como os estados do T2.4). Apagar só o vínculo de uma execução do
          // novo bootstrap deixaria identidade órfã e evento antigo, contaminando as contagens e os
          // discriminantes do runbook. A fixture reproduz o efeito REAL do bootstrap anterior:
          // organização, usuário, vínculo de papel e credencial pelo serviço existente — e NADA nas
          // três tabelas de identidade.
          const dbName = `erp_san3_09_drill_t23b_${suffix}`;
          const url = new URL(connectionString);
          url.pathname = `/${dbName}`;
          await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE "${modelDbName}"`);
          // Pela fábrica única (B-DB-FUSO-UTC): fixa o fuso da sessão em UTC e não soma ocorrência
          // à catraca G3 de adapters de conexão construídos à mão em tests/**.
          const legado = createPrismaClient(url.toString());
          try {
            const tenant = await legado.tenant.create({
              data: { name: "Plataforma", slug: PLATFORM_TENANT_SLUG, status: "active", modules: [] },
            });
            const user = await legado.user.create({
              data: { tenant_id: tenant.id, name: ADMIN_NAME, email: ADMIN_EMAIL, status: "active" },
            });
            const globalRole = await legado.role.findFirst({
              where: { key: PLATFORM_ROLE_KEY, tenant_id: null },
              select: { id: true },
              orderBy: { created_at: "asc" },
            });
            assert.ok(globalRole, "a fixture do T2.3b exige o papel global provisionado no banco-modelo");
            await legado.userRoleAssignment.create({
              data: { tenant_id: tenant.id, user_id: user.id, role_id: globalRole.id, branch_id: null },
            });
            await legado.$transaction(async (tx) => {
              await setTenantRlsContext(tx, tenant.id);
              const credentials = new LocalAuthCredentialRepository(tx);
              const credentialService = new LocalAuthCredentialService(credentials, {
                findByIdForTenant: (userId, tenantId) =>
                  tx.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, tenant_id: true, email: true } }),
              });
              await credentialService.createCredentialForUser({
                tenant_id: tenant.id,
                user_id: user.id,
                email: user.email,
                password: ADMIN_PASSWORD,
              });
            });

            const hashAntes =
              (await legado.localAuthCredential.findFirst({
                where: { tenant_id: tenant.id, user_id: user.id },
                select: { password_hash: true },
              }))?.password_hash ?? null;
            assert.ok(hashAntes, "a fixture do T2.3b deve gravar a credencial");

            // Estado inicial medido: 0/0/0 nas três tabelas de identidade.
            const antes = await identityState(legado, tenant.id, user.id);
            assert.deepEqual(
              [antes.identities, antes.links, antes.backfillEvents],
              [0, 0, 0],
              "a fixture NÃO pode criar identidade, vínculo nem evento",
            );
            const auditoriaAntes = await legado.auditLog.count({ where: { tenant_id: tenant.id } });

            // 1ª convergência, SEM --reset-password.
            const report = await bootstrapPlatformAdmin(legado, baseInput);
            assert.equal(report.userCreated, false, "T2.3b: o usuário legado não pode ser recriado");
            assert.equal(report.credentialCreated, false, "T2.3b: a credencial legada não pode ser recriada");
            assert.equal(report.passwordReset, false, "T2.3b: sem --reset-password a senha não muda");
            assert.equal(report.identityLinked, true, "T2.3b: o vínculo ausente deve ser criado");
            assert.equal(report.tenantId, tenant.id, "T2.3b: o tenantId legado é preservado");
            assert.equal(report.userId, user.id, "T2.3b: o userId legado é preservado");

            const hashDepois =
              (await legado.localAuthCredential.findFirst({
                where: { tenant_id: tenant.id, user_id: user.id },
                select: { password_hash: true },
              }))?.password_hash ?? null;
            assert.equal(hashDepois, hashAntes, "T2.3b: password_hash idêntico ao anterior");

            const depois = await identityState(legado, tenant.id, user.id);
            assert.deepEqual(
              [depois.identities, depois.links, depois.backfillEvents],
              [1, 1, 1],
              "T2.3b: 1/1/1 nas três tabelas de identidade",
            );
            assert.deepEqual(depois.attachedVia, ["backfill"], "T2.3b: o vínculo chega por 'backfill'");

            const auditoria = await legado.auditLog.findMany({
              where: { tenant_id: tenant.id },
              select: { action: true, metadata: true },
              orderBy: { created_at: "asc" },
            });
            assert.equal(auditoria.length, auditoriaAntes + 1, "T2.3b: a auditoria cresce +1 na convergência isolada");
            assert.equal(auditoria[auditoria.length - 1]?.action, BOOTSTRAP_AUDIT_ACTION, "T2.3b: ação de auditoria do bootstrap");
            assert.equal(
              (auditoria[auditoria.length - 1]?.metadata as { identityLinked?: boolean } | null)?.identityLinked,
              true,
              "T2.3b: metadata.identityLinked deve ser true",
            );

            // Reexecução: idempotente, sem duplicar e sem auditoria nova.
            const report2 = await bootstrapPlatformAdmin(legado, baseInput);
            assert.equal(report2.identityLinked, false, "T2.3b: na reexecução o vínculo já existe");
            assert.equal(report2.userCreated, false, "T2.3b: reexecução não recria usuário");
            assert.equal(report2.credentialCreated, false, "T2.3b: reexecução não recria credencial");
            assert.equal(report2.passwordReset, false, "T2.3b: reexecução não redefine senha");
            assert.deepEqual(await identityState(legado, tenant.id, user.id), depois, "T2.3b: nada duplica na reexecução");
            assert.equal(
              await legado.auditLog.count({ where: { tenant_id: tenant.id } }),
              auditoriaAntes + 1,
              "T2.3b: a reexecução não cria auditoria nova",
            );
          } finally {
            await legado.$disconnect();
            await adminClient.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);
          }
        });

        // T2.4 — dry-run ────────────────────────────────────────────────────────────────────────────────

        await t.test("T2.4 --dry-run read-only em 5 estados + controle de escrita", async () => {
          const states = ["limpo", "tenant", "usuario", "convergido", "reset"] as const;
          for (const [index, state] of states.entries()) {
            const dbName = `erp_san3_09_drill_t24_${index}_${suffix}`;
            const url = new URL(connectionString);
            url.pathname = `/${dbName}`;
            await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE "${modelDbName}"`);
            const seed = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
            try {
              if (state === "tenant" || state === "usuario") {
                const tenant = await seed.tenant.create({ data: { name: "Plataforma", slug: PLATFORM_TENANT_SLUG, status: "active", modules: [] } });
                if (state === "usuario") await seed.user.create({ data: { tenant_id: tenant.id, name: ADMIN_NAME, email: ADMIN_EMAIL, status: "active" } });
              } else if (state === "convergido" || state === "reset") {
                await bootstrapPlatformAdmin(seed, baseInput);
              }
              const fingerprint = async () => {
                const tenant = await seed.tenant.findUnique({ where: { slug: PLATFORM_TENANT_SLUG }, select: { id: true } });
                const user = tenant
                  ? await seed.user.findFirst({ where: { tenant_id: tenant.id, email: ADMIN_EMAIL }, select: { id: true } })
                  : null;
                // B-AUTH-LOGIN-PLATAFORMA: a impressão digital passa a cobrir contagens E IDs das
                // três tabelas de identidade, lidas pelo cliente administrativo do drill.
                const identity = await identityState(seed, tenant?.id ?? null, user?.id ?? null);
                return {
                  tenants: await seed.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } }),
                  users: tenant ? await seed.user.count({ where: { tenant_id: tenant.id } }) : 0,
                  assignments: tenant ? await seed.userRoleAssignment.count({ where: { tenant_id: tenant.id } }) : 0,
                  credentials: tenant ? await seed.localAuthCredential.count({ where: { tenant_id: tenant.id } }) : 0,
                  audits: tenant ? await seed.auditLog.count({ where: { tenant_id: tenant.id } }) : 0,
                  hash: tenant ? (await seed.localAuthCredential.findFirst({ where: { tenant_id: tenant.id }, select: { password_hash: true } }))?.password_hash ?? null : null,
                  identities: identity.identities,
                  identityLinks: identity.links,
                  identityLinkIds: identity.linkIds,
                  identityIds: identity.identityIds,
                  identityAttachedVia: identity.attachedVia,
                  identityEvents: identity.events,
                  identityEventIds: identity.eventIds,
                };
              };
              const before = await fingerprint();
              const readOnlyUrl = new URL(url);
              readOnlyUrl.searchParams.set("options", "-c default_transaction_read_only=on");
              const readOnly = new PrismaClient({ adapter: new PrismaPg({ connectionString: readOnlyUrl.toString() }) });
              try {
                const input = state === "reset" ? { ...baseInput, resetPassword: true } : baseInput;
                const report = await bootstrapPlatformAdmin(readOnly, input, { dryRun: true });
                assert.equal(report.dryRun, true, `${state}: relatório dryRun`);
                // B-AUTH-LOGIN-PLATAFORMA (E1.3.3 item 5): o array de CINCO flags é ESTENDIDO com
                // `report.identityLinked` como SEXTO elemento; os cinco elementos anteriores e seus
                // esperados são preservados. O dry-run não escreve: onde o vínculo ainda seria criado
                // (limpo/tenant/usuario, inclusive nos dois retornos antecipados) o relatório diz
                // true; nos estados já convergidos o vínculo existe e o relatório diz false. MU2
                // morre especificamente no estado `usuario`, o único que chega ao cálculo da flag.
                const expected = {
                  limpo: [true, true, true, true, false, true], tenant: [false, true, true, true, false, true],
                  usuario: [false, false, true, true, false, true], convergido: [false, false, false, false, false, false], reset: [false, false, false, false, false, false],
                }[state];
                assert.deepEqual(
                  [report.tenantCreated, report.userCreated, report.assignmentCreated, report.credentialCreated, report.passwordReset, report.identityLinked], expected,
                  `${state}: relatório deve descrever o estado sem escrever`,
                );
                if (state === "limpo") {
                  await assert.rejects(() => bootstrapPlatformAdmin(readOnly, baseInput), /read-only transaction/i);
                }
              } finally {
                await readOnly.$disconnect();
              }
              assert.deepEqual(await fingerprint(), before, `${state}: impressão digital deve permanecer idêntica`);
            } finally {
              await seed.$disconnect();
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);
            }
          }
          const processDbName = `erp_san3_09_drill_t24_process_${suffix}`;
          const processUrl = new URL(connectionString); processUrl.pathname = `/${processDbName}`;
          await adminClient.$executeRawUnsafe(`CREATE DATABASE "${processDbName}" TEMPLATE "${modelDbName}"`);
          try {
            const result = spawnSync(process.execPath, ["--import", "tsx/esm", SCRIPT, "--password-stdin", "--dry-run"], {
              env: { ...process.env, DATABASE_URL: processUrl.toString(), PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL },
              input: `${ADMIN_PASSWORD}\n`, encoding: "utf8", timeout: 30_000,
            });
            assert.equal(result.status, 0, `processo Runbook dry-run: ${result.stderr}`);
            assert.match(result.stdout ?? "", /nada foi escrito/i);
            const verify = new PrismaClient({ adapter: new PrismaPg({ connectionString: processUrl.toString() }) });
            try {
              assert.deepEqual([await verify.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } }), await verify.user.count(), await verify.userRoleAssignment.count(), await verify.localAuthCredential.count(), await verify.auditLog.count()], [0, 0, 0, 0, 0]);
            } finally { await verify.$disconnect(); }
          } finally { await adminClient.$executeRawUnsafe(`DROP DATABASE "${processDbName}" WITH (FORCE)`); }
        });

        await t.test("T2.4b --dryrun desconhecido: exit 2 UNKNOWN_ARGUMENT e 0/0/0/0/0", async () => {
          const dbName = `erp_san3_09_drill_t24b_${suffix}`;
          const url = new URL(connectionString); url.pathname = `/${dbName}`;
          await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE "${modelDbName}"`);
          try {
            const result = spawnSync(process.execPath, ["--import", "tsx/esm", SCRIPT, "--password-stdin", "--dryrun"], {
              env: { ...process.env, DATABASE_URL: url.toString(), PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL }, input: `${ADMIN_PASSWORD}\n`, encoding: "utf8", timeout: 30_000,
            });
            assert.equal(result.status, 2);
            assert.match(result.stderr ?? "", /UNKNOWN_ARGUMENT/);
            const verify = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
            try {
              assert.deepEqual([
                await verify.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } }), await verify.user.count(),
                await verify.userRoleAssignment.count(), await verify.localAuthCredential.count(), await verify.auditLog.count(),
              ], [0, 0, 0, 0, 0]);
            } finally { await verify.$disconnect(); }
          } finally { await adminClient.$executeRawUnsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`); }
        });

        // T2.5 — outro e-mail recusado ──────────────────────────────────────────────────────────────────

        await t.test("T2.5 outro e-mail → ADDITIONAL_ADMIN_REFUSED, contagens intactas", async () => {
          const outroInput = readBootstrapInput(
            { PLATFORM_ADMIN_EMAIL: "outro-admin@example.com", PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD },
            { dryRun: false, passwordStdin: false, resetPassword: false },
          );

          const tenantsBefore = await drillClient!.tenant.count();
          const usersBefore = await drillClient!.user.count();

          try {
            await bootstrapPlatformAdmin(drillClient!, outroInput);
            assert.fail("deveria ter lançado BootstrapRefused");
          } catch (e) {
            assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
            assert.equal(e.code, "ADDITIONAL_ADMIN_REFUSED");
          }

          const tenantsAfter = await drillClient!.tenant.count();
          const usersAfter = await drillClient!.user.count();

          assert.equal(tenantsAfter, tenantsBefore, "contagem de tenants deve permanecer inalterada");
          assert.equal(usersAfter, usersBefore, "contagem de usuários deve permanecer inalterada");
        });

        // T2.6 — reset de senha ─────────────────────────────────────────────────────────────────────────

        await t.test("T2.6 --reset-password com failed_attempts/locked_until armados → hash muda, auditoria +1", async () => {
          // Armar failed_attempts=4 e locked_until no futuro
          const cred = await drillClient!.localAuthCredential.findFirst({
            where: { tenant_id: firstTenantId! },
            select: { id: true, password_hash: true, failed_attempts: true },
          });
          assert.ok(cred, "credencial deve existir antes do reset");

          await drillClient!.localAuthCredential.update({
            where: { id: cred.id },
            data: {
              failed_attempts: 4,
              locked_until: new Date(Date.now() + 600_000),
            },
          });

          const auditAntes = await drillClient!.auditLog.count({ where: { tenant_id: firstTenantId! } });
          const hashAntes = cred.password_hash;

          const newPassword = "NovaSenhaReset-2026!";
          const resetInput = readBootstrapInput(
            { PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD: newPassword },
            { dryRun: false, passwordStdin: false, resetPassword: true },
          );

          const report = await bootstrapPlatformAdmin(drillClient!, resetInput);

          assert.equal(report.passwordReset, true, "passwordReset deve ser true");
          assert.equal(report.credentialCreated, false, "credentialCreated deve ser false num reset");

          const credDepois = await drillClient!.localAuthCredential.findFirst({
            where: { tenant_id: firstTenantId! },
            select: { password_hash: true, failed_attempts: true, locked_until: true },
          });

          assert.notEqual(credDepois?.password_hash, hashAntes, "hash deve mudar após reset");
          assert.equal(credDepois?.failed_attempts, 0, "failed_attempts deve ser zerado após reset");
          assert.equal(credDepois?.locked_until, null, "locked_until deve ser NULL após reset");

          const auditDepois = await drillClient!.auditLog.count({ where: { tenant_id: firstTenantId! } });
          assert.equal(auditDepois, auditAntes + 1, "auditoria deve crescer +1 no reset");
        });

        // T2.7 — papel efêmero NOSUPERUSER NOBYPASSRLS ─────────────────────────────────────────────────

        await t.test("T2.7 papel efêmero NOSUPERUSER NOBYPASSRLS: criação + idempotência + RLS morde sem GUC", async () => {
          // Para T2.7, precisamos de um banco de drill limpo para testar criação do zero sob papel efêmero.
          // Usamos o drillClient administrativo para as verificações, efemera.client para o bootstrap.
          efemera = await createEphemeralRole(drillClient!, drillUrl);

          // Verificar postura do papel efêmero
          const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
            "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
          );
          assert.equal(postura.length, 1, "papel efêmero não encontrado em pg_roles");
          assert.equal(postura[0].rolsuper, false, "papel efêmero não pode ser superusuário");
          assert.equal(postura[0].rolbypassrls, false, "papel efêmero não pode atravessar o RLS");

          // T2.7a: criar um novo bootstrap com e-mail diferente sob o papel efêmero
          // (o tenant platform já existe; vai reaproveitar — mas o usuário de e-mail diferente causaria ADDITIONAL_ADMIN_REFUSED)
          // Para testar a criação completa, usamos outro banco de drill efêmero
          const suffixT27 = `t27_${Date.now()}`;
          const drillT27Name = `erp_san3_09_drill_${suffixT27}`;
          const drillT27Url = connectionString.replace(/\/([^/?]+)(\?.*)?$/, `/${drillT27Name}$2`);

          let drillT27Client: InstanceType<typeof PrismaClient> | undefined;
          let efemeraT27: Awaited<ReturnType<typeof createEphemeralRole>> | undefined;

          try {
            await adminClient.$executeRawUnsafe(`CREATE DATABASE "${drillT27Name}"`);

            // Migrar e provisionar
            const mRes = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", join(ROOT, "node_modules", ".bin", "prisma"), "migrate", "deploy"],
              { env: { ...process.env, DATABASE_URL: drillT27Url }, encoding: "utf8", timeout: 120_000 },
            );
            assert.equal(mRes.status, 0, `migrate deploy T2.7 falhou: ${mRes.stderr}`);

            const pRes = spawnSync("npm", ["run", "--silent", "db:provision-rbac"], {
              env: { ...process.env, DATABASE_URL: drillT27Url },
              encoding: "utf8",
              timeout: 60_000,
              cwd: ROOT,
            });
            assert.equal(pRes.status, 0, `db:provision-rbac T2.7 falhou: ${pRes.stderr}`);

            drillT27Client = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT27Url }) });
            efemeraT27 = await createEphemeralRole(drillT27Client, drillT27Url);

            const inputT27 = readBootstrapInput(
              { PLATFORM_ADMIN_EMAIL: "efemero-t27@example.com", PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD },
              { dryRun: false, passwordStdin: false, resetPassword: false },
            );

            // 1ª execução sob papel efêmero: deve criar
            const report1 = await bootstrapPlatformAdmin(efemeraT27.client, inputT27);
            assert.equal(report1.tenantCreated, true, "T2.7a: tenantCreated deve ser true");
            assert.equal(report1.userCreated, true, "T2.7a: userCreated deve ser true");
            assert.equal(report1.assignmentCreated, true, "T2.7a: assignmentCreated deve ser true");
            assert.equal(report1.credentialCreated, true, "T2.7a: credentialCreated deve ser true");
            assert.equal(report1.identityLinked, true, "T2.7a: identityLinked deve ser true sob o papel efêmero");

            // 2ª execução sob papel efêmero: deve ser idempotente
            const report2 = await bootstrapPlatformAdmin(efemeraT27.client, inputT27);
            assert.equal(report2.tenantCreated, false, "T2.7b: tenantCreated deve ser false");
            assert.equal(report2.userCreated, false, "T2.7b: userCreated deve ser false");
            assert.equal(report2.identityLinked, false, "T2.7b: identityLinked deve ser false na 2ª execução");

            // Sem GUC (sem setTenantRlsContext): o papel efêmero vê 0 usuários da organização
            const semGuc = await efemeraT27.client.$queryRawUnsafe<Array<{ n: bigint }>>(
              "SELECT count(*)::bigint AS n FROM users WHERE tenant_id = $1::uuid",
              report1.tenantId!,
            );
            assert.equal(Number(semGuc[0].n), 0, "sem GUC, o papel efêmero deve ver 0 usuários (RLS morde)");

            // A conexão administrativa vê o usuário
            const comAdmin = await drillT27Client!.user.count({ where: { tenant_id: report1.tenantId! } });
            assert.equal(comAdmin, 1, "a conexão administrativa deve ver 1 usuário");

            // B-AUTH-LOGIN-PLATAFORMA — o vínculo criado sob o papel efêmero NOSUPERUSER NOBYPASSRLS
            // é visível ao administrador (1 linha) e INVISÍVEL ao runtime sem o GUC de organização
            // (0 linhas): a escrita passou pelo braço de tenant do WITH CHECK, não por bypass. O
            // chamador NÃO recebe bypass para o teste passar.
            const vinculoAdmin = await identityState(drillT27Client!, report1.tenantId, report1.userId);
            assert.equal(vinculoAdmin.links, 1, "T2.7: o administrador deve ver 1 vínculo de identidade");
            assert.deepEqual(vinculoAdmin.attachedVia, ["backfill"], "T2.7: o vínculo chega por 'backfill'");
            const vinculoSemGuc = await efemeraT27.client.$queryRawUnsafe<Array<{ n: bigint }>>(
              "SELECT count(*)::bigint AS n FROM auth_identity_links WHERE tenant_id = $1::uuid",
              report1.tenantId!,
            );
            assert.equal(Number(vinculoSemGuc[0].n), 0, "T2.7: sem GUC, o papel efêmero deve ver 0 vínculos (RLS morde)");
          } finally {
            if (efemeraT27) {
              try { await efemeraT27.drop(); } catch { /* reportado no stderr pelo arnês */ }
            }
            if (drillT27Client) {
              try { await drillT27Client.$disconnect(); } catch { /* ignore */ }
            }
            try {
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillT27Name}" WITH (FORCE)`);
            } catch { /* ignore */ }
          }
        });

        // T2.8 — HTTP: login direcionado + GET /api/v1/platform/overview ────────────────────────────────

        await t.test("T2.8 HTTP: login com tenantId → 200 super_admin; overview → 200; sem tenantId → 401 antes da concessão de EXECUTE e 200 depois", async () => {
          // Precisamos de um banco de drill limpo com o admin criado para T2.8
          // Usamos o drillClient+firstTenantId que já tem o admin criado em T2.2/T2.6 (com senha resetada)
          // A senha foi redefinida em T2.6 para "NovaSenhaReset-2026!"
          const senhaAtual = "NovaSenhaReset-2026!";

          // Injetar o cliente efêmero no singleton antes dos imports dinâmicos (padrão san3-04a:63-69)
          if (!efemera) {
            efemera = await createEphemeralRole(drillClient!, drillUrl);
          }
          process.env.DATABASE_URL = drillUrl;
          (globalThis as { prisma?: unknown }).prisma = efemera.client;
          process.env.CORE_SAAS_PERSISTENCE = "prisma";

          const [
            { createApp },
            { signAccessToken: _ },
          ] = await Promise.all([
            import("../src/app.js"),
            import("../src/modules/auth/index.js"),
          ]);

          // Importar os módulos de serviço para criar o app corretamente
          const [
            { PrismaCoreSaasService },
            { PrismaCoreSaasStore },
            { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
          ] = await Promise.all([
            import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
            import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
            import("../src/modules/core-saas/repositories/index.js"),
          ]);

          const appClient = efemera.client;
          const service = new PrismaCoreSaasService(
            new PrismaCoreSaasStore(
              appClient,
              new TenantRepository(appClient),
              new UserRepository(appClient),
              new RoleRepository(appClient),
              new UserRoleRepository(appClient),
              new AuditLogRepository(appClient),
            ),
          );

          const app = createApp(service);
          server = app.listen(0);
          const baseUrl = await getBaseUrl(server);

          try {
            // Login direcionado com tenantId → 200
            const loginRes = await requestJson(baseUrl, "/api/v1/auth/login", {
              method: "POST",
              body: { tenantId: firstTenantId!, email: ADMIN_EMAIL, password: senhaAtual },
            });
            assert.equal(loginRes.status, 200, `login direcionado deve retornar 200, body: ${JSON.stringify(loginRes.body).slice(0, 200)}`);
            const rolesData: unknown[] = loginRes.body?.data?.roles ?? [];
            const hasSupAdmin = rolesData.some((r) =>
              typeof r === "string" ? r === "super_admin" : (r as Record<string, unknown>)?.key === "super_admin",
            );
            assert.ok(hasSupAdmin, `roles deve conter super_admin: ${JSON.stringify(rolesData)}`);

            const token: string = loginRes.body?.data?.access_token ?? loginRes.body?.data?.accessToken;
            assert.ok(token, `token deve estar presente; body.data: ${JSON.stringify(Object.keys(loginRes.body?.data ?? {})).slice(0, 100)}`);

            // GET /api/v1/platform/overview com o token → 200
            const overviewRes = await requestJson(baseUrl, "/api/v1/platform/overview", {
              headers: { authorization: `Bearer ${token}` },
            });
            assert.equal(overviewRes.status, 200, `GET /api/v1/platform/overview deve retornar 200, body: ${JSON.stringify(overviewRes.body).slice(0, 200)}`);

            // Senha errada → 401
            const loginErradoRes = await requestJson(baseUrl, "/api/v1/auth/login", {
              method: "POST",
              body: { tenantId: firstTenantId!, email: ADMIN_EMAIL, password: "SenhaErrada-9999!" },
            });
            assert.equal(loginErradoRes.status, 401, "senha errada deve retornar 401");

            // Sem tenantId → 401 ANTES da concessão de EXECUTE (o papel efêmero não executa
            // auth_login_candidates — A16). O corpo leva SOMENTE e-mail e senha.
            const corpoSemOrganizacao = { email: ADMIN_EMAIL, password: senhaAtual };
            assert.deepEqual(
              Object.keys(corpoSemOrganizacao).sort(),
              ["email", "password"],
              "o login sem organização pede somente e-mail e senha",
            );
            const loginSemTenantRes = await requestJson(baseUrl, "/api/v1/auth/login", {
              method: "POST",
              body: corpoSemOrganizacao,
            });
            assert.equal(loginSemTenantRes.status, 401, "sem tenantId, ANTES da concessão de EXECUTE, deve retornar 401");

            // ── Pré-condição MEDIDA, não presumida (E1.3.3 item 7) ─────────────────────────────────
            // Neste drill a dona da função é o migrador local/CI (super), e é só por isso que a
            // concessão de EXECUTE ao papel de runtime basta para o login sem organização. Em
            // produção a topologia pode ser outra e o roteiro é o E1.2 do plano: este teste prova a
            // dimensão EXECUTE, não declara a ativação de produção.
            const topologiaRows = await drillClient!.$queryRaw<Array<{
              owner: string;
              owner_super: boolean;
              owner_bypass: boolean;
              prosecdef: boolean;
              users_rls: boolean;
              users_force: boolean;
              credentials_force: boolean;
            }>>`
              SELECT pg_get_userbyid(p.proowner) AS owner,
                     (SELECT r.rolsuper FROM pg_roles r WHERE r.rolname = pg_get_userbyid(p.proowner)) AS owner_super,
                     (SELECT r.rolbypassrls FROM pg_roles r WHERE r.rolname = pg_get_userbyid(p.proowner)) AS owner_bypass,
                     p.prosecdef,
                     (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'public.users'::regclass) AS users_rls,
                     (SELECT c.relforcerowsecurity FROM pg_class c WHERE c.oid = 'public.users'::regclass) AS users_force,
                     (SELECT c.relforcerowsecurity FROM pg_class c WHERE c.oid = 'public.local_auth_credentials'::regclass) AS credentials_force
              FROM pg_proc p
              WHERE p.oid = 'public.auth_login_candidates(text)'::regprocedure
            `;
            assert.equal(topologiaRows.length, 1, "a função elevada auth_login_candidates(text) deve existir no drill");
            const topologia = topologiaRows[0];
            assert.equal(topologia.prosecdef, true, "a função deve ser SECURITY DEFINER");
            assert.equal(topologia.users_rls, true, "users deve ter RLS habilitado");
            assert.equal(topologia.users_force, true, "users deve ter RLS forçado");
            assert.equal(topologia.credentials_force, true, "local_auth_credentials deve ter RLS forçado");
            assert.ok(
              topologia.owner_super === true || topologia.owner_bypass === true,
              `pré-condição do drill: a dona da função precisa ser super ou bypass para a concessão de EXECUTE bastar (dona=${topologia.owner}, super=${topologia.owner_super}, bypass=${topologia.owner_bypass})`,
            );

            // Concessão de EXECUTE ao papel efêmero: exclusivamente pelo helper nomeado, dentro do
            // lock de catálogo (ratchet db-catalog-write-guard — nenhuma DDL lexical neste arquivo).
            await withRoleCatalogLock(drillClient!, async (tx) => {
              await grantAuthLoginCandidatesExecuteToRole(tx, efemera!.roleName);
            });

            // Depois da concessão → 200, com a organização do administrador e o papel de plataforma.
            const loginSemOrganizacao = await requestJson(baseUrl, "/api/v1/auth/login", {
              method: "POST",
              body: corpoSemOrganizacao,
            });
            assert.equal(
              loginSemOrganizacao.status,
              200,
              `sem tenantId, DEPOIS da concessão de EXECUTE, deve retornar 200; body: ${JSON.stringify(loginSemOrganizacao.body).slice(0, 200)}`,
            );
            assert.equal(loginSemOrganizacao.body?.data?.authenticated, true, "authenticated deve ser true no login sem organização");
            assert.equal(loginSemOrganizacao.body?.data?.tenant?.id, firstTenantId, "a organização resolvida deve ser a do administrador");
            const rolesSemOrganizacao: unknown[] = loginSemOrganizacao.body?.data?.roles ?? [];
            assert.ok(
              rolesSemOrganizacao.some((role) =>
                typeof role === "string" ? role === PLATFORM_ROLE_KEY : (role as Record<string, unknown>)?.key === PLATFORM_ROLE_KEY,
              ),
              `roles deve conter ${PLATFORM_ROLE_KEY}: ${JSON.stringify(rolesSemOrganizacao)}`,
            );

            const tokenSemOrganizacao: string =
              loginSemOrganizacao.body?.data?.access_token ?? loginSemOrganizacao.body?.data?.accessToken;
            assert.ok(tokenSemOrganizacao, "o token deve estar presente no login sem organização");
            const overviewSemOrganizacao = await requestJson(baseUrl, "/api/v1/platform/overview", {
              headers: { authorization: `Bearer ${tokenSemOrganizacao}` },
            });
            assert.equal(
              overviewSemOrganizacao.status,
              200,
              `GET /api/v1/platform/overview com o token obtido SEM organização deve retornar 200; body: ${JSON.stringify(overviewSemOrganizacao.body).slice(0, 200)}`,
            );
          } finally {
            if (server) {
              await closeServer(server);
              server = undefined;
            }
          }
        });

        // T2.9 — processo filho contra o drill ─────────────────────────────────────────────────────────

        await t.test("T2.9 processo filho: 1ª exit 0; 2ª exit 0; NODE_ENV=production sem opt-in → exit 2 e contagens intactas; saídas sem senha/hash/postgresql://", async () => {
          // Para T2.9 usamos um banco de drill limpo independente
          const suffixT29 = `t29_${Date.now()}`;
          const drillT29Name = `erp_san3_09_drill_${suffixT29}`;
          const drillT29Url = connectionString.replace(/\/([^/?]+)(\?.*)?$/, `/${drillT29Name}$2`);

          try {
            await adminClient.$executeRawUnsafe(`CREATE DATABASE "${drillT29Name}"`);

            const mRes = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", join(ROOT, "node_modules", ".bin", "prisma"), "migrate", "deploy"],
              { env: { ...process.env, DATABASE_URL: drillT29Url }, encoding: "utf8", timeout: 120_000 },
            );
            assert.equal(mRes.status, 0, `migrate T2.9 falhou: ${mRes.stderr}`);

            const pRes = spawnSync("npm", ["run", "--silent", "db:provision-rbac"], {
              env: { ...process.env, DATABASE_URL: drillT29Url },
              encoding: "utf8",
              timeout: 60_000,
              cwd: ROOT,
            });
            assert.equal(pRes.status, 0, `provision-rbac T2.9 falhou: ${pRes.stderr}`);

            const envBase = {
              PATH: process.env.PATH,
              DATABASE_URL: drillT29Url,
              PLATFORM_ADMIN_EMAIL: ADMIN_EMAIL,
              PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD,
              PLATFORM_ADMIN_NAME: ADMIN_NAME,
            };

            // 1ª execução: exit 0
            const res1 = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", SCRIPT],
              { env: envBase, encoding: "utf8", timeout: 30_000, input: `${ADMIN_PASSWORD}\n` },
            );
            assert.equal(res1.error, undefined, `spawn T2.9-1ª falhou: ${res1.error?.message}`);
            assert.equal(res1.status, 0, `1ª execução deve exit 0:\nstdout: ${res1.stdout}\nstderr: ${res1.stderr}`);
            assert.ok((res1.stdout + res1.stderr).includes("CONVERGIDO"), "saída deve conter CONVERGIDO");

            // 2ª execução: exit 0 (idempotente)
            const res2 = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", SCRIPT],
              { env: envBase, encoding: "utf8", timeout: 30_000 },
            );
            assert.equal(res2.error, undefined, `spawn T2.9-2ª falhou: ${res2.error?.message}`);
            assert.equal(res2.status, 0, `2ª execução deve exit 0:\nstdout: ${res2.stdout}\nstderr: ${res2.stderr}`);

            // NODE_ENV=production sem opt-in → exit 2 e contagens intactas
            const drillT29Client = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT29Url }) });
            const tenantsAntes = await drillT29Client.tenant.count();
            const storedHash = (await drillT29Client.localAuthCredential.findFirst({ select: { password_hash: true } }))?.password_hash;
            assert.ok(storedHash, "T2.9 deve ler o hash real gravado");
            const sensitiveSegments = storedHash.split("$").filter((segment) => segment.length >= 16);

            const resProd = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", SCRIPT],
              {
                env: { ...envBase, NODE_ENV: "production" },
                encoding: "utf8",
                timeout: 30_000,
              },
            );
            assert.equal(resProd.error, undefined, `spawn T2.9-prod falhou: ${resProd.error?.message}`);
            assert.equal(resProd.status, 2, `produção sem opt-in deve exit 2:\nstdout: ${resProd.stdout}\nstderr: ${resProd.stderr}`);
            assert.ok((resProd.stderr ?? "").includes("PRODUCTION_OPT_IN_MISSING"), "stderr deve conter PRODUCTION_OPT_IN_MISSING");

            const tenantsDepois = await drillT29Client.tenant.count();
            assert.equal(tenantsDepois, tenantsAntes, "contagens devem permanecer intactas após exit 2");
            await drillT29Client.$disconnect();

            // Verificar que nenhuma saída contém senha, hash ou postgresql://
            for (const [label, res] of [["1ª", res1], ["2ª", res2], ["prod", resProd]] as const) {
              const combined = (res.stdout ?? "") + (res.stderr ?? "");
              assert.ok(!combined.includes(ADMIN_PASSWORD), `T2.9-${label}: senha não deve aparecer em stdout/stderr`);
              assert.ok(!combined.includes(storedHash), `T2.9-${label}: hash inteiro não deve aparecer em stdout/stderr`);
              for (const segment of sensitiveSegments) assert.ok(!combined.includes(segment), `T2.9-${label}: segmento sensível do hash vazou`);
              assert.doesNotMatch(combined, /postgres(ql)?:\/\//, `T2.9-${label}: URL de banco não deve aparecer`);
            }
          } finally {
            try {
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillT29Name}" WITH (FORCE)`);
            } catch { /* ignore */ }
          }
        });

        // T2.10 — duas chamadas simultâneas (advisory lock) ─────────────────────────────────────────────

        await t.test("T2.10 3 rodadas: duas chamadas simultâneas resolvem → 1/1/1/1/1", async () => {
          // Banco de drill limpo para concorrência
          for (let round = 0; round < 3; round += 1) {
            const drillT210Name = `erp_san3_09_drill_t210_${round}_${suffix}`;
            const drillT210Url = new URL(connectionString); drillT210Url.pathname = `/${drillT210Name}`;
            try {
              await adminClient.$executeRawUnsafe(`CREATE DATABASE "${drillT210Name}" TEMPLATE "${modelDbName}"`);

            const drillT210ClientA = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url.toString() }) });
            const drillT210ClientB = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url.toString() }) });

            const emailA = `concurrent-a-${Date.now()}@example.com`;
            // Ambos usam o mesmo e-mail para simular corrida real
            const inputConcA = readBootstrapInput(
              { PLATFORM_ADMIN_EMAIL: emailA, PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD },
              { dryRun: false, passwordStdin: false, resetPassword: false },
            );
            const inputConcB = readBootstrapInput(
              { PLATFORM_ADMIN_EMAIL: emailA, PLATFORM_ADMIN_PASSWORD: ADMIN_PASSWORD },
              { dryRun: false, passwordStdin: false, resetPassword: false },
            );

            const [resultA, resultB] = await Promise.allSettled([
              bootstrapPlatformAdmin(drillT210ClientA, inputConcA),
              bootstrapPlatformAdmin(drillT210ClientB, inputConcB),
            ]);

            await drillT210ClientA.$disconnect();
            await drillT210ClientB.$disconnect();

            // Um deve CONVERGIDO, o outro também (idempotente pela trava)
            const isFulfilled = (r: PromiseSettledResult<unknown>): r is PromiseFulfilledResult<unknown> =>
              r.status === "fulfilled";

            const fulfilled = [resultA, resultB].filter(isFulfilled);
            assert.equal(fulfilled.length, 2, `rodada ${round + 1}: ambas as execuções devem resolver`);

            // Verificar estado final: exatamente 1 tenant, 1 usuário
            const drillT210Verify = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url.toString() }) });
            try {
              const tenants = await drillT210Verify.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } });
              const users = await drillT210Verify.user.count({ where: { tenant: { slug: PLATFORM_TENANT_SLUG } } });
              const assignments = await drillT210Verify.userRoleAssignment.count();
              const credentials = await drillT210Verify.localAuthCredential.count();
              const audits = await drillT210Verify.auditLog.count();
              assert.equal(tenants, 1, "deve haver exatamente 1 tenant após execução concorrente");
              assert.equal(users, 1, "deve haver exatamente 1 usuário após execução concorrente");
              assert.deepEqual([assignments, credentials, audits], [1, 1, 1]);
            } finally {
              await drillT210Verify.$disconnect();
            }
          } finally {
            try {
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillT210Name}" WITH (FORCE)`);
            } catch { /* ignore */ }
          }
          }
        });
      } finally {
        // Teardown: desconectar clientes e destruir o banco de drill principal
        if (server) {
          try { await closeServer(server); } catch { /* ignore */ }
        }
        if (efemera) {
          try { await efemera.drop(); } catch { /* reportado no stderr pelo arnês */ }
        }
        if (drillClient) {
          try { await drillClient.$disconnect(); } catch { /* ignore */ }
        }
        try { await adminClient.$disconnect(); } catch { /* ignore */ }
        try {
          await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillDbName}" WITH (FORCE)`);
        } catch { /* ignore */ }
        try {
          await adminClient.$executeRawUnsafe(`DROP DATABASE "${modelDbName}" WITH (FORCE)`);
        } catch { /* ignore */ }
      }
    },
  );
}

// ── Utilitários HTTP (cópia local de san3-04a:307-335) ────────────────────────────────────────────

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

async function getBaseUrl(srv: Server): Promise<string> {
  await new Promise<void>((resolve) => (srv.listening ? resolve() : srv.once("listening", () => resolve())));
  const address = srv.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(srv: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => srv.close((error) => (error ? reject(error) : resolve())));
}
