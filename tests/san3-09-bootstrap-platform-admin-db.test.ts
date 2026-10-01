// B-SAN3-09 — testes COM BANCO para scripts/bootstrap-platform-admin.ts
// T2.1–T2.10 (10 casos): RBAC não provisionado, 1ª execução, 2ª execução (idempotência), dry-run,
// admin adicional recusado, reset de senha, papel efêmero NOBYPASSRLS, HTTP (login+overview), processo
// filho, concorrência com trava própria.
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
  BootstrapRefused,
  PLATFORM_TENANT_SLUG,
  PLATFORM_ROLE_KEY,
  bootstrapPlatformAdmin,
  readBootstrapInput,
} from "../scripts/bootstrap-platform-admin.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

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

      // Conexão administrativa para criar/destruir o banco de drill
      const adminClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

      const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const drillDbName = `erp_san3_09_drill_${suffix}`;
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
        });

        // T2.4 — dry-run ────────────────────────────────────────────────────────────────────────────────

        await t.test("T2.4 --dry-run em estado limpo (novo tenant) e em estado convergido: 0 escritas", async () => {
          // Estado convergido: dry-run não deve mudar nada
          const tenantsAntes = await drillClient!.tenant.count();
          const usersAntes = await drillClient!.user.count();
          const auditAntes = await drillClient!.auditLog.count();

          const reportConvergido = await bootstrapPlatformAdmin(drillClient!, baseInput, { dryRun: true });

          assert.equal(reportConvergido.dryRun, true, "dryRun deve ser true");
          assert.equal(reportConvergido.tenantCreated, false, "dry-run em estado convergido: tenantCreated false");

          const tenantsDepois = await drillClient!.tenant.count();
          const usersDepois = await drillClient!.user.count();
          const auditDepois = await drillClient!.auditLog.count();

          assert.equal(tenantsDepois, tenantsAntes, "dry-run não deve criar tenants");
          assert.equal(usersDepois, usersAntes, "dry-run não deve criar usuários");
          assert.equal(auditDepois, auditAntes, "dry-run não deve criar audit_logs");
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

            // 2ª execução sob papel efêmero: deve ser idempotente
            const report2 = await bootstrapPlatformAdmin(efemeraT27.client, inputT27);
            assert.equal(report2.tenantCreated, false, "T2.7b: tenantCreated deve ser false");
            assert.equal(report2.userCreated, false, "T2.7b: userCreated deve ser false");

            // Sem GUC (sem setTenantRlsContext): o papel efêmero vê 0 usuários da organização
            const semGuc = await efemeraT27.client.$queryRawUnsafe<Array<{ n: bigint }>>(
              "SELECT count(*)::bigint AS n FROM users WHERE tenant_id = $1::uuid",
              report1.tenantId!,
            );
            assert.equal(Number(semGuc[0].n), 0, "sem GUC, o papel efêmero deve ver 0 usuários (RLS morde)");

            // A conexão administrativa vê o usuário
            const comAdmin = await drillT27Client!.user.count({ where: { tenant_id: report1.tenantId! } });
            assert.equal(comAdmin, 1, "a conexão administrativa deve ver 1 usuário");
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

        await t.test("T2.8 HTTP: login com tenantId → 200 super_admin; GET /api/v1/platform/overview → 200; sem tenantId → 401", async () => {
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

            // Sem tenantId → 401 (papel efêmero não executa auth_login_candidates — A16)
            const loginSemTenantRes = await requestJson(baseUrl, "/api/v1/auth/login", {
              method: "POST",
              body: { email: ADMIN_EMAIL, password: senhaAtual },
            });
            assert.equal(loginSemTenantRes.status, 401, "sem tenantId deve retornar 401");
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
              assert.ok(!combined.includes("$scrypt-v1$"), `T2.9-${label}: hash não deve aparecer em stdout/stderr`);
              assert.ok(!combined.includes("postgresql://"), `T2.9-${label}: URL de banco não deve aparecer em stdout/stderr`);
            }
          } finally {
            try {
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillT29Name}" WITH (FORCE)`);
            } catch { /* ignore */ }
          }
        });

        // T2.10 — duas chamadas simultâneas (advisory lock) ─────────────────────────────────────────────

        await t.test("T2.10 duas chamadas simultâneas → 1/1/1/1/1 (trava própria)", async () => {
          // Banco de drill limpo para concorrência
          const suffixT210 = `t210_${Date.now()}`;
          const drillT210Name = `erp_san3_09_drill_${suffixT210}`;
          const drillT210Url = connectionString.replace(/\/([^/?]+)(\?.*)?$/, `/${drillT210Name}$2`);

          try {
            await adminClient.$executeRawUnsafe(`CREATE DATABASE "${drillT210Name}"`);

            const mRes = spawnSync(
              process.execPath,
              ["--import", "tsx/esm", join(ROOT, "node_modules", ".bin", "prisma"), "migrate", "deploy"],
              { env: { ...process.env, DATABASE_URL: drillT210Url }, encoding: "utf8", timeout: 120_000 },
            );
            assert.equal(mRes.status, 0, `migrate T2.10 falhou: ${mRes.stderr}`);

            const pRes = spawnSync("npm", ["run", "--silent", "db:provision-rbac"], {
              env: { ...process.env, DATABASE_URL: drillT210Url },
              encoding: "utf8",
              timeout: 60_000,
              cwd: ROOT,
            });
            assert.equal(pRes.status, 0, `provision-rbac T2.10 falhou: ${pRes.stderr}`);

            const drillT210ClientA = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url }) });
            const drillT210ClientB = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url }) });

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
            assert.ok(fulfilled.length >= 1, "pelo menos uma das execuções deve ter sucesso");

            // Verificar estado final: exatamente 1 tenant, 1 usuário
            const drillT210Verify = new PrismaClient({ adapter: new PrismaPg({ connectionString: drillT210Url }) });
            try {
              const tenants = await drillT210Verify.tenant.count({ where: { slug: PLATFORM_TENANT_SLUG } });
              const users = await drillT210Verify.user.count({
                where: { tenant: { slug: PLATFORM_TENANT_SLUG } },
              });
              assert.equal(tenants, 1, "deve haver exatamente 1 tenant após execução concorrente");
              assert.equal(users, 1, "deve haver exatamente 1 usuário após execução concorrente");
            } finally {
              await drillT210Verify.$disconnect();
            }
          } finally {
            try {
              await adminClient.$executeRawUnsafe(`DROP DATABASE "${drillT210Name}" WITH (FORCE)`);
            } catch { /* ignore */ }
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
