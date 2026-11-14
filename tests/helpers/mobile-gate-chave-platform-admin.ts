// B-MOBILE-GATE-CHAVE (item 66 do portão), Emenda 2 (E2.2) — o arnês DESCARTÁVEL do `platform_admin` da prova com
// perfil real. J-561, C3-01: o setup entra no repositório (antes vivia só fora do git, ao lado do roteiro da prova).
//
// O seed (`prisma/seed-users.ts`) semeia `super_admin`, não `platform_admin`, e `prisma/**` é PROIBIDO no bloco. Este
// arnês cria, SÓ num banco descartável declarado, o papel de sistema `platform_admin` com as concessões de
// `ROLE_PERMISSIONS.platform_admin`, o usuário, a atribuição e a credencial local, no mesmo molde do `seed-users.ts`.
// O `super_admin` do seed NÃO conta como `platform_admin` (E2.2): o ator da prova é o que este arnês cria.
//
// Trava (fail-closed), antes de abrir conexão: o banco alvo tem de estar declarado em `ERP_ARNES_BANCO_DESCARTAVEL`
// (`127.0.0.1:<porta>/<banco>`), e o `DATABASE_URL` tem de apontar exatamente para ele, em 127.0.0.1 e fora da porta
// 5432 (a da base viva). Qualquer outra coisa sai com `RECUSADO`, exit 2.
//
// Uso, num cluster descartável próprio (com `timezone='UTC'` gravado antes do start), depois de
// `npx prisma migrate deploy`, `npm run db:seed` e `npm run db:seed:users`:
//
//   ERP_ARNES_BANCO_DESCARTAVEL=127.0.0.1:55644/erp_prova \
//   DATABASE_URL='postgresql://postgres@127.0.0.1:55644/erp_prova?schema=public' \
//   npx tsx tests/helpers/mobile-gate-chave-platform-admin.ts
//
// Saída esperada: `OK — platform_admin -> plataforma-pa.demo@example.com; role_permissions concedidas: N (catálogo: N)`.
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLATFORM_ADMIN_EMAIL = "plataforma-pa.demo@example.com";

const PORTA_DA_BASE_VIVA = "5432";

/** `null` quando o alvo é o banco descartável declarado; senão, o motivo da recusa. Não abre conexão. */
export function conferirBancoDescartavel(databaseUrl: string | undefined, declarado: string | undefined): string | null {
  const alvo = /^127\.0\.0\.1:(\d+)\/([A-Za-z0-9_]+)$/.exec((declarado ?? "").trim());
  if (!alvo) return "ERP_ARNES_BANCO_DESCARTAVEL ausente ou fora do formato 127.0.0.1:<porta>/<banco>";
  const [, porta, banco] = alvo;
  if (porta === PORTA_DA_BASE_VIVA) return "a porta 5432 é a da base viva";
  let url: URL;
  try {
    url = new URL((databaseUrl ?? "").replace(/^postgres(?:ql)?:/, "http:"));
  } catch {
    return "DATABASE_URL ausente ou inválido";
  }
  if (!/^postgres(?:ql)?:/.test(databaseUrl ?? "")) return "DATABASE_URL não é postgresql";
  const recebido = `${url.hostname}:${url.port}${url.pathname}`;
  if (recebido !== `127.0.0.1:${porta}/${banco}`) {
    return `DATABASE_URL (${recebido}) não é o banco descartável declarado (127.0.0.1:${porta}/${banco})`;
  }
  return null;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? "";
  const recusa = conferirBancoDescartavel(connectionString, process.env.ERP_ARNES_BANCO_DESCARTAVEL);
  if (recusa !== null) {
    console.error(`[arnes-platform-admin] RECUSADO: ${recusa}.`);
    process.exit(2);
  }

  // Só depois da trava: nenhum cliente de banco nasce antes de o alvo ser conferido.
  const [{ PrismaPg }, { PrismaClient }, { ROLE_PERMISSIONS }, auth, { withTenantRls }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../../src/modules/core-saas/permissions/catalog.js"),
    import("../../src/modules/auth/index.js"),
    import("../../src/database/rls.js"),
  ]);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const password = process.env.DEMO_ADMIN_PASSWORD?.trim() || "ChangeMe123!";

  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: "demo" }, select: { id: true } });
    if (!tenant) throw new Error("Organização 'demo' não encontrada. Rode `npm run db:seed` primeiro.");
    const tenantId = tenant.id;
    const branch = await prisma.branch.findFirst({ where: { tenant_id: tenantId, code: "MAIN" }, select: { id: true } });

    let role = await prisma.role.findFirst({ where: { key: "platform_admin", tenant_id: null }, select: { id: true } });
    if (!role) {
      role = await prisma.role.create({ data: { key: "platform_admin", name: "Platform Admin", scope: "system" }, select: { id: true } });
    }

    let concedidas = 0;
    for (const chave of ROLE_PERMISSIONS.platform_admin) {
      const perm = await prisma.permission.findFirst({ where: { key: chave }, select: { id: true } });
      if (!perm) throw new Error(`Permissão do catálogo ausente no banco: ${chave}`);
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
        update: {},
        create: { role_id: role.id, permission_id: perm.id },
      });
      concedidas += 1;
    }

    const roleId = role.id;
    await withTenantRls(prisma, tenantId, async (tx) => {
      const user = await tx.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: PLATFORM_ADMIN_EMAIL } },
        update: { name: "Admin Plataforma (arnês descartável)", status: "active", branch_id: branch?.id ?? null },
        create: {
          tenant_id: tenantId,
          branch_id: branch?.id ?? null,
          name: "Admin Plataforma (arnês descartável)",
          email: PLATFORM_ADMIN_EMAIL,
          status: "active",
        },
        select: { id: true, email: true },
      });
      const jaTem = await tx.userRoleAssignment.findFirst({
        where: { tenant_id: tenantId, user_id: user.id, role_id: roleId, branch_id: null },
        select: { id: true },
      });
      if (!jaTem) await tx.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: roleId, branch_id: null } });
      const credenciais = new auth.LocalAuthCredentialService(new auth.LocalAuthCredentialRepository(tx), {
        findByIdForTenant: (userId: string, tId: string) =>
          tx.user.findFirst({ where: { id: userId, tenant_id: tId }, select: { id: true, tenant_id: true, email: true } }),
      });
      await credenciais.upsertCredentialForUser({ tenant_id: tenantId, user_id: user.id, email: user.email, password });
    });

    console.log(
      `[arnes-platform-admin] OK — platform_admin -> ${PLATFORM_ADMIN_EMAIL}; role_permissions concedidas: ${concedidas} (catálogo: ${ROLE_PERMISSIONS.platform_admin.length}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const executadoDireto =
  process.argv[1] !== undefined && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (executadoDireto) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
