// Seed de USUÁRIOS por papel (demonstração) — cria um usuário para cada papel
// canônico, com a role e as permissões concedidas no banco, para testar a
// visualização por permissão em modo real. Idempotente.
//
//   npm run db:seed         # base (tenant/roles/admin) — rode ANTES
//   npm run db:seed:users
//
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { ROLE_PERMISSIONS, type Role } from "../src/modules/core-saas/permissions/catalog.js";
import { LocalAuthCredentialRepository, LocalAuthCredentialService } from "../src/modules/auth/index.js";
import { withTenantRls } from "../src/database/rls.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to run prisma/seed-users.ts.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PASSWORD = process.env.DEMO_ADMIN_PASSWORD?.trim() || "ChangeMe123!";

// papel canônico → (email, nome exibido). Cobre os 9 papéis da matriz de navegação.
const DEMO_USERS: ReadonlyArray<{ role: Role; email: string; name: string }> = [
  { role: "super_admin", email: "plataforma.demo@example.com", name: "Ana Plataforma (Admin Plataforma)" },
  { role: "tenant_admin", email: "admin.demo@example.com", name: "Admin Demo (Administrador)" },
  { role: "manager", email: "gestor.demo@example.com", name: "Gustavo Reis (Gestor Operacional)" },
  { role: "operator", email: "operador.demo@example.com", name: "Marina Costa (Operador)" },
  { role: "finance", email: "financeiro.demo@example.com", name: "Beatriz Lima (Financeiro)" },
  { role: "inventory", email: "estoque.demo@example.com", name: "Lucas Prado (Estoque)" },
  { role: "field_technician", email: "tecnico.demo@example.com", name: "Carla Mendes (Técnico de Campo)" },
  { role: "auditor", email: "auditor.demo@example.com", name: "Rafael Souza (Auditor)" },
  { role: "support", email: "suporte.demo@example.com", name: "Paula Nunes (Suporte)" },
];

function roleName(role: string): string {
  return role.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo" }, select: { id: true } });
  if (!tenant) throw new Error("Tenant 'demo' não encontrado. Rode `npm run db:seed` primeiro.");
  const tenantId = tenant.id;

  const branch = await prisma.branch.findFirst({ where: { tenant_id: tenantId, code: "MAIN" }, select: { id: true } });

  for (const demo of DEMO_USERS) {
    // 1) garante o registro do papel (sistema) — os LEGACY_ROLES não vêm do seed base.
    let role = await prisma.role.findFirst({ where: { key: demo.role, tenant_id: null }, select: { id: true } });
    if (!role) {
      role = await prisma.role.create({ data: { key: demo.role, name: roleName(demo.role), scope: "system" }, select: { id: true } });
    }

    // 2) concede ao papel as permissões do catálogo (role_permissions) — cobre o RBAC persistente.
    for (const permKey of ROLE_PERMISSIONS[demo.role]) {
      const perm = await prisma.permission.findFirst({ where: { key: permKey }, select: { id: true } });
      if (!perm) continue; // deve existir após o seed base; ignora ausências
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
        update: {},
        create: { role_id: role.id, permission_id: perm.id },
      });
    }

    await withTenantRls(prisma, tenantId, async (tx) => {
      // 3) usuário + atribuição de papel + credencial.
      const user = await tx.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: demo.email } },
        update: { name: demo.name, status: "active", branch_id: branch?.id ?? null },
        create: { tenant_id: tenantId, branch_id: branch?.id ?? null, name: demo.name, email: demo.email, status: "active" },
        select: { id: true, email: true },
      });

      const has = await tx.userRoleAssignment.findFirst({ where: { tenant_id: tenantId, user_id: user.id, role_id: role.id, branch_id: null }, select: { id: true } });
      if (!has) await tx.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: role.id, branch_id: null } });

      const creds = new LocalAuthCredentialService(new LocalAuthCredentialRepository(tx), {
        findByIdForTenant: (userId, tId) => tx.user.findFirst({ where: { id: userId, tenant_id: tId }, select: { id: true, tenant_id: true, email: true } }),
      });
      await creds.upsertCredentialForUser({ tenant_id: tenantId, user_id: user.id, email: user.email, password: PASSWORD });
    });

    console.log(`[seed-users] ${demo.role.padEnd(16)} -> ${demo.email}`);
  }

  console.log(`[seed-users] OK — ${DEMO_USERS.length} usuários por papel (senha: ${PASSWORD}).`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
