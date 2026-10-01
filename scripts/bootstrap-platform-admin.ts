// B-SAN3-09 (P-SAN-PROD-BOOTSTRAP, item 43 do PLANO_SAN3) — bootstrap do 1º administrador de PLATAFORMA.
//
// O QUE ELE FAZ (e só isto): numa base já MIGRADA e já PROVISIONADA pelo CD (`prisma migrate deploy` +
// `npm run db:provision-rbac` — deploy-production.yml:135-164), cria UMA organização de sistema
// (`tenants.slug = "platform"`, sem RLS), UM usuário nela, o vínculo dele ao papel GLOBAL `super_admin`
// (`roles.tenant_id IS NULL`, provisionado pelo CD — este script NUNCA cria papel) e UMA credencial local
// (scrypt-v1, pelo MESMO serviço que o login verifica). Tudo dentro de UMA transação, sob advisory lock,
// e sob o GUC `app.current_tenant_id` da organização (users/user_role_assignments/local_auth_credentials/
// audit_logs têm FORCE ROW LEVEL SECURITY — migração 20260608000000). IDEMPOTENTE: a 2ª execução não cria
// nada e não troca a senha (só com `--reset-password`, explícito).
//
// O QUE ELE NÃO FAZ, DE PROPÓSITO:
//   · não semeia demonstração, não cria papel, não concede permissão (é o db:provision-rbac; Runbook B);
//   · não cria um SEGUNDO administrador: organização de sistema com admin de outro e-mail → RECUSA
//     (`ADDITIONAL_ADMIN_REFUSED`); administradores adicionais são a rota de plataforma pendente
//     (P-O6R-B01-PROMOCAO-PLATAFORMA), com SoD e trilha própria — nunca este script;
//   · não importa `src/modules/auth/index.js` nem nada que alcance `src/config/env.ts`: o env.ts faz
//     `envSchema.parse(process.env)` no import (l.599) e, em NODE_ENV=production, exige JWT_SECRET,
//     REDIS_URL, CORS_ORIGIN, PORTAL_* — o operador que roda isto de fora do contêiner não os tem, e não
//     deve precisar ter. Só módulos-folha: rls.ts, o repositório/serviço de credencial e o password.service.
//
// TRAVA DE PRODUÇÃO (coerente com prisma/seed-guard.ts — mesma semântica ESTRITA de `booleanFlag`):
//   NODE_ENV=production → recusa (exit 2) salvo opt-in one-shot `ALLOW_PROD_BOOTSTRAP=1|true|yes|on`,
//   inline no único comando e nunca persistido. Variável PRÓPRIA (não ALLOW_PROD_SEED): reusar a do seed
//   faria o mesmo opt-in reabrir o seed demo no mesmo ambiente (docs/deployment.md, Runbook B, item 2).
//   Honestidade de alcance (a mesma de seed-guard.ts:3-7): a trava só morde onde NODE_ENV=production
//   está exportado; por isso o Runbook manda exportá-lo INLINE junto com o opt-in.
//
// SEGREDO: a senha entra por `PLATFORM_ADMIN_PASSWORD` (variável de ambiente) ou por `--password-stdin`
// (1ª linha da entrada padrão). NUNCA por argumento: `--password[=…]` é recusado (`PASSWORD_IN_ARGV`) —
// argv aparece em `ps -o args` para qualquer usuário da máquina; env não aparece (medido no plano, §0.5).
// Nenhuma senha, hash ou URL de banco vai ao log (§2.8): o relatório é nome do banco, ids e flags.
//
// USO (docs/deployment.md, Runbook B):
//   PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… npx tsx scripts/bootstrap-platform-admin.ts
//   … --dry-run            só relata o que criaria; não escreve nada
//   … --password-stdin     lê a senha da entrada padrão (1ª linha), em vez da variável
//   … --reset-password     redefine a senha do admin já existente (zera lockout/contador)
// Códigos de saída: 0 = ok (criado ou já convergido) · 2 = RECUSA nomeada (trava/entrada/estado) · 1 = erro.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../src/database/rls.js";
import {
  LocalAuthCredentialRepository,
  normalizeCredentialEmail,
} from "../src/modules/auth/repositories/local-auth-credential.repository.js";
import {
  LocalAuthCredentialService,
  validateLocalPassword,
} from "../src/modules/auth/services/local-auth-credential.service.js";

export const PLATFORM_TENANT_SLUG = "platform";
export const PLATFORM_TENANT_NAME = "Plataforma";
export const PLATFORM_ROLE_KEY = "super_admin";
export const PLATFORM_ADMIN_DEFAULT_NAME = "Administrador da Plataforma";
// Mais estrito que o mínimo do app (8, `validateLocalPassword`): é a credencial que alcança TODAS as
// organizações (`platform-permissions.ts` concede plataforma pela presença do papel). Decisão declarada
// no plano do bloco; a junta (agente-secops) ratifica o número.
export const BOOTSTRAP_MIN_PASSWORD_LENGTH = 12;
// Serializa duas execuções concorrentes (o UNIQUE de `tenants.slug` já protege a organização; o lock
// protege a sequência usuário → vínculo → credencial, como `scripts/provision-rbac.ts:70`).
export const BOOTSTRAP_ADVISORY_LOCK = 20260909n;
export const BOOTSTRAP_AUDIT_ACTION = "platform.bootstrap.admin_created";

export type BootstrapRefusalCode =
  | "PRODUCTION_OPT_IN_MISSING"
  | "DATABASE_URL_MISSING"
  | "EMAIL_MISSING"
  | "PASSWORD_MISSING"
  | "PASSWORD_IN_ARGV"
  | "PASSWORD_TOO_WEAK"
  | "RBAC_NOT_PROVISIONED"
  | "ADDITIONAL_ADMIN_REFUSED";

export class BootstrapRefused extends Error {
  constructor(
    readonly code: BootstrapRefusalCode,
    message: string,
  ) {
    super(message);
    this.name = "BootstrapRefused";
  }
}

const TRUTHY = new Set(["true", "1", "yes", "on"]);

function strictBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return TRUTHY.has(raw.trim().toLowerCase());
}

/** Núcleo puro/testável da trava (espelho de `isSeedAllowed`, prisma/seed-guard.ts:25-32). */
export function isBootstrapAllowed(envLike: Record<string, string | undefined> = process.env): boolean {
  if (envLike.NODE_ENV === "production") {
    return strictBool(envLike.ALLOW_PROD_BOOTSTRAP);
  }
  return true;
}

export type BootstrapFlags = {
  readonly dryRun: boolean;
  readonly passwordStdin: boolean;
  readonly resetPassword: boolean;
};

export function parseArgv(argv: readonly string[]): BootstrapFlags {
  for (const argument of argv) {
    if (argument === "--password" || argument.startsWith("--password=")) {
      throw new BootstrapRefused(
        "PASSWORD_IN_ARGV",
        "Senha por argumento é recusada (argv é visível em `ps`). Use PLATFORM_ADMIN_PASSWORD ou --password-stdin.",
      );
    }
  }
  return {
    dryRun: argv.includes("--dry-run"),
    passwordStdin: argv.includes("--password-stdin"),
    resetPassword: argv.includes("--reset-password"),
  };
}

export type BootstrapInput = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly resetPassword: boolean;
};

export function assertBootstrapPassword(password: string, normalizedEmail: string): void {
  try {
    validateLocalPassword(password, normalizedEmail);
  } catch (error) {
    throw new BootstrapRefused("PASSWORD_TOO_WEAK", error instanceof Error ? error.message : "Senha inválida.");
  }
  if (password.length < BOOTSTRAP_MIN_PASSWORD_LENGTH) {
    throw new BootstrapRefused(
      "PASSWORD_TOO_WEAK",
      `A senha do administrador da plataforma precisa de pelo menos ${BOOTSTRAP_MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
}

export function readBootstrapInput(
  envLike: Record<string, string | undefined>,
  flags: BootstrapFlags,
  stdinPassword?: string,
): BootstrapInput {
  const email = normalizeCredentialEmail(envLike.PLATFORM_ADMIN_EMAIL ?? "");
  if (!email || !email.includes("@")) {
    throw new BootstrapRefused("EMAIL_MISSING", "PLATFORM_ADMIN_EMAIL é obrigatório (e-mail do 1º administrador).");
  }
  const password = flags.passwordStdin ? (stdinPassword ?? "") : (envLike.PLATFORM_ADMIN_PASSWORD ?? "");
  if (!password) {
    throw new BootstrapRefused(
      "PASSWORD_MISSING",
      flags.passwordStdin ? "Nenhuma senha na entrada padrão." : "PLATFORM_ADMIN_PASSWORD é obrigatório (ou use --password-stdin).",
    );
  }
  assertBootstrapPassword(password, email);
  const name = envLike.PLATFORM_ADMIN_NAME?.trim() || PLATFORM_ADMIN_DEFAULT_NAME;
  return { email, name, password, resetPassword: flags.resetPassword };
}

export type BootstrapReport = {
  readonly database: string;
  readonly dryRun: boolean;
  readonly tenantId: string | null;
  readonly userId: string | null;
  readonly tenantCreated: boolean;
  readonly userCreated: boolean;
  readonly assignmentCreated: boolean;
  readonly credentialCreated: boolean;
  readonly passwordReset: boolean;
};

export async function bootstrapPlatformAdmin(
  prisma: PrismaClient,
  input: BootstrapInput,
  options: { readonly dryRun?: boolean } = {},
): Promise<BootstrapReport> {
  const dryRun = options.dryRun === true;
  const [{ db }] = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK}::bigint)`;

      // 1) O papel GLOBAL super_admin tem de existir COM concessões — quem o cria é o CD (db:provision-rbac).
      //    Sem ele o admin nasceria sem plataforma nenhuma, em silêncio: recusa, nunca "cria para ajudar".
      //    (`roles` sob FORCE RLS: a política deixa ver `tenant_id IS NULL` sem GUC — migração 20260608, l.26.)
      const globalRoles = await tx.role.findMany({
        where: { key: PLATFORM_ROLE_KEY, tenant_id: null },
        select: { id: true, _count: { select: { role_permissions: true } } },
        orderBy: { created_at: "asc" },
      });
      const role = [...globalRoles].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0];
      if (!role || role._count.role_permissions === 0) {
        throw new BootstrapRefused(
          "RBAC_NOT_PROVISIONED",
          `Papel global "${PLATFORM_ROLE_KEY}" ausente ou sem concessões neste banco. Rode \`npm run db:provision-rbac\` antes (é o passo do CD).`,
        );
      }

      // 2) Organização de sistema (`tenants` não tem RLS; `slug` é UNIQUE — a 2ª execução a reencontra).
      let tenant = await tx.tenant.findUnique({ where: { slug: PLATFORM_TENANT_SLUG }, select: { id: true } });
      const tenantCreated = tenant === null;
      if (!tenant) {
        if (dryRun) {
          return {
            database: db,
            dryRun,
            tenantId: null,
            userId: null,
            tenantCreated: true,
            userCreated: true,
            assignmentCreated: true,
            credentialCreated: true,
            passwordReset: false,
          } satisfies BootstrapReport;
        }
        tenant = await tx.tenant.create({
          data: { name: PLATFORM_TENANT_NAME, slug: PLATFORM_TENANT_SLUG, status: "active", modules: [] },
          select: { id: true },
        });
      }

      // 3) Contexto de RLS da organização — sem isto, sob papel NOBYPASSRLS, users/vínculos/credenciais
      //    são invisíveis (SELECT = 0) e o INSERT é recusado (42501). Sob superusuário é inócuo.
      await setTenantRlsContext(tx, tenant.id);

      // 4) Só o 1º administrador. Admin de OUTRO e-mail já vinculado ao papel → recusa nomeada.
      const existingAdmins = await tx.userRoleAssignment.findMany({
        where: { tenant_id: tenant.id, role_id: role.id },
        select: { user: { select: { email: true } } },
      });
      if (
        existingAdmins.length > 0 &&
        !existingAdmins.some((assignment) => normalizeCredentialEmail(assignment.user.email) === input.email)
      ) {
        throw new BootstrapRefused(
          "ADDITIONAL_ADMIN_REFUSED",
          "A organização de sistema já tem um administrador com outro e-mail. Este script cria só o 1º; administradores adicionais são ato de plataforma (P-O6R-B01-PROMOCAO-PLATAFORMA).",
        );
      }

      // 5) Usuário (UNIQUE (tenant_id, email)).
      let user = await tx.user.findUnique({
        where: { tenant_id_email: { tenant_id: tenant.id, email: input.email } },
        select: { id: true, email: true },
      });
      const userCreated = user === null;
      if (!user) {
        if (dryRun) {
          return {
            database: db,
            dryRun,
            tenantId: tenant.id,
            userId: null,
            tenantCreated,
            userCreated: true,
            assignmentCreated: true,
            credentialCreated: true,
            passwordReset: false,
          } satisfies BootstrapReport;
        }
        user = await tx.user.create({
          data: { tenant_id: tenant.id, name: input.name, email: input.email, status: "active" },
          select: { id: true, email: true },
        });
      }

      // 6) Vínculo ao papel global (índice parcial UNIQUE (tenant_id, user_id, role_id) WHERE branch_id IS NULL).
      const assignment = await tx.userRoleAssignment.findFirst({
        where: { tenant_id: tenant.id, user_id: user.id, role_id: role.id, branch_id: null },
        select: { id: true },
      });
      const assignmentCreated = assignment === null;
      if (!assignment && !dryRun) {
        await tx.userRoleAssignment.create({
          data: { tenant_id: tenant.id, user_id: user.id, role_id: role.id, branch_id: null },
        });
      }

      // 7) Credencial local — pelo MESMO serviço/hash que o login verifica (scrypt-v1, N=16384/r=8/p=1).
      const credentials = new LocalAuthCredentialRepository(tx);
      const credentialService = new LocalAuthCredentialService(credentials, {
        findByIdForTenant: (userId, tenantId) =>
          tx.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, tenant_id: true, email: true } }),
      });
      const existingCredential = await credentials.findByUserForTenant(user.id, tenant.id);
      const credentialCreated = existingCredential === null;
      let passwordReset = false;
      if (!dryRun) {
        if (!existingCredential) {
          await credentialService.createCredentialForUser({
            tenant_id: tenant.id,
            user_id: user.id,
            email: user.email,
            password: input.password,
          });
        } else if (input.resetPassword) {
          await credentialService.upsertCredentialForUser({
            tenant_id: tenant.id,
            user_id: user.id,
            email: user.email,
            password: input.password,
          });
          passwordReset = true;
        }
      }

      // 8) Trilha — só quando algo foi criado/redefinido. Allowlist (§2.8): e-mail e flags; nunca senha/hash.
      if (!dryRun && (userCreated || assignmentCreated || credentialCreated || passwordReset)) {
        await tx.auditLog.create({
          data: {
            tenant_id: tenant.id,
            actor_user_id: user.id,
            action: BOOTSTRAP_AUDIT_ACTION,
            entity: "user",
            entity_id: user.id,
            metadata: {
              source: "scripts/bootstrap-platform-admin.ts",
              email: user.email,
              tenantCreated,
              userCreated,
              assignmentCreated,
              credentialCreated,
              passwordReset,
            },
          },
        });
      }

      return {
        database: db,
        dryRun,
        tenantId: tenant.id,
        userId: user.id,
        tenantCreated,
        userCreated,
        assignmentCreated,
        credentialCreated,
        passwordReset,
      } satisfies BootstrapReport;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[bootstrap-platform-admin] ${message}`);
}

async function readStdinFirstLine(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/)[0] ?? "";
}

async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  if (!isBootstrapAllowed()) {
    throw new BootstrapRefused(
      "PRODUCTION_OPT_IN_MISSING",
      "Bootstrap BLOQUEADO em produção (NODE_ENV=production). Para o ato one-shot, defina ALLOW_PROD_BOOTSTRAP=1 inline nesse único comando e remova-o em seguida (nunca persista a variável).",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new BootstrapRefused("DATABASE_URL_MISSING", "DATABASE_URL é obrigatório.");
  }

  const stdinPassword = flags.passwordStdin ? await readStdinFirstLine() : undefined;
  const input = readBootstrapInput(process.env, flags, stdinPassword);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const report = await bootstrapPlatformAdmin(prisma, input, { dryRun: flags.dryRun });
    log(`banco: ${report.database} · modo: ${report.dryRun ? "simulação (--dry-run)" : "aplicar"}`);
    log(
      `organização de sistema "${PLATFORM_TENANT_SLUG}": ${report.tenantCreated ? (report.dryRun ? "a criar" : "criada") : "já existia"}` +
        `${report.tenantId ? ` (${report.tenantId})` : ""}`,
    );
    log(
      `administrador ${input.email}: usuário ${report.userCreated ? (report.dryRun ? "a criar" : "criado") : "já existia"}` +
        ` · vínculo ${PLATFORM_ROLE_KEY} ${report.assignmentCreated ? (report.dryRun ? "a criar" : "criado") : "já existia"}` +
        ` · credencial ${report.credentialCreated ? (report.dryRun ? "a criar" : "criada") : report.passwordReset ? "senha redefinida" : "já existia (senha mantida)"}`,
    );
    log(report.dryRun ? "simulação encerrada — nada foi escrito no banco." : "CONVERGIDO — 1 organização de sistema, 1 administrador de plataforma.");
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa main() quando rodado como script (não em import de teste) — padrão de scripts/backfill-third-party-vehicle-identity.ts:561.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("bootstrap-platform-admin.ts")) {
  try {
    await main();
  } catch (error) {
    if (error instanceof BootstrapRefused) {
      // eslint-disable-next-line no-console
      console.error(`[bootstrap-platform-admin] RECUSADO (${error.code}): ${error.message}`);
      process.exitCode = 2;
    } else {
      // eslint-disable-next-line no-console
      console.error(`[bootstrap-platform-admin] FALHOU: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      process.exitCode = 1;
    }
  }
}
