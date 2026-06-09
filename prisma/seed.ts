import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  STANDARD_ROLES,
  type Permission,
  type Role,
} from "../src/modules/core-saas/permissions/catalog.js";
import {
  LocalAuthCredentialRepository,
  LocalAuthCredentialService,
} from "../src/modules/auth/index.js";
import { withTenantRls } from "../src/database/rls.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma/seed.ts.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const permissionDescriptions = {
  "platform:cloud-cost-allocation:read": "Consultar runs e alocacoes de custo cloud por tenant.",
  "platform:cloud-cost-allocation:run": "Executar motor de alocacao de custo cloud por tenant.",
  "platform:cloud-costs:read": "Consultar custos AWS CUR brutos importados no Console da Plataforma.",
  "platform:cloud-costs:import": "Importar custos AWS CUR via fonte segura sem credenciais reais.",
  "platform:cloud-usage:read": "Consultar uso cloud medido por tenant no Console da Plataforma.",
  "tenant.manage": "Gerenciar configuracoes, filiais e dados administrativos do tenant.",
  "users.manage": "Criar e alterar usuarios do tenant.",
  "users.read": "Consultar usuarios do tenant.",
  "roles.manage": "Consultar e manter papeis e permissoes.",
  "audit.read": "Consultar trilhas de auditoria do tenant.",
  "os.manage": "Gerenciar ordens de servico.",
  "os.read": "Consultar ordens de servico.",
  "inventory.manage": "Gerenciar estoque e movimentacoes.",
  "inventory.read": "Consultar estoque.",
  "finance.manage": "Gerenciar informacoes financeiras.",
  "finance.read": "Consultar informacoes financeiras.",
  "notifications:read": "Consultar a propria caixa de notificacoes internas.",
  "notifications:update": "Marcar notificacoes proprias como lidas ou arquivadas.",
  "tenant_checklists:read": "Consultar checklists configuraveis do tenant.",
  "tenant_checklists:create": "Criar checklists configuraveis do tenant.",
  "tenant_checklists:update": "Editar, ativar e inativar checklists configuraveis do tenant.",
  "tenant_checklists:publish": "Publicar versoes de checklist configuravel.",
  "checklist_runs:read": "Consultar execucoes, comparacoes, respostas e evidencias de checklist.",
  "checklist_runs:create": "Iniciar execucoes de checklist publicado.",
  "checklist_runs:update": "Registrar respostas, anexos, marcadores e divergencias de checklist.",
  "checklist_runs:complete": "Concluir execucoes de checklist.",
  "checklist_runs:acknowledge": "Registrar ciencia de responsabilidade em execucoes de checklist.",
} satisfies Record<Permission, string>;

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: {
      slug: "demo",
    },
    update: {
      name: "Tenant Demo",
      status: "active",
    },
    create: {
      name: "Tenant Demo",
      slug: "demo",
      status: "active",
    },
  });

  const permissions = new Map<Permission, { id: string }>();
  const roles = new Map<Role, { id: string }>();

  for (const permission of PERMISSION_CATALOG) {
    const permissionRecord = await prisma.permission.upsert({
      where: {
        key: permission,
      },
      update: {
        description: permissionDescriptions[permission],
      },
      create: {
        key: permission,
        description: permissionDescriptions[permission],
      },
      select: {
        id: true,
      },
    });

    permissions.set(permission, permissionRecord);
  }

  for (const role of STANDARD_ROLES) {
    const roleRecord = await upsertSystemRole(role);
    roles.set(role, roleRecord);

    for (const permission of ROLE_PERMISSIONS[role]) {
      const permissionRecord = permissions.get(permission);

      if (!permissionRecord) {
        throw new Error(`Permission not seeded: ${permission}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: roleRecord.id,
            permission_id: permissionRecord.id,
          },
        },
        update: {},
        create: {
          role_id: roleRecord.id,
          permission_id: permissionRecord.id,
        },
      });
    }
  }

  const tenantAdminRole = roles.get("tenant_admin");
  const superAdminRole = roles.get("super_admin");

  if (!tenantAdminRole) {
    throw new Error("tenant_admin role was not seeded.");
  }

  if (!superAdminRole) {
    throw new Error("super_admin role was not seeded.");
  }

  await withTenantRls(prisma, tenant.id, async (tx) => {
    const branch = await tx.branch.upsert({
      where: {
        tenant_id_code: {
          tenant_id: tenant.id,
          code: "MAIN",
        },
      },
      update: {
        name: "Filial Principal",
        status: "active",
      },
      create: {
        tenant_id: tenant.id,
        name: "Filial Principal",
        code: "MAIN",
        status: "active",
      },
    });

    const admin = await tx.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: tenant.id,
          email: "admin.demo@example.com",
        },
      },
      update: {
        name: "Admin Demo",
        status: "active",
        branch_id: branch.id,
      },
      create: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        name: "Admin Demo",
        email: "admin.demo@example.com",
        status: "active",
      },
    });

    const existingAdminAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: admin.id,
        role_id: tenantAdminRole.id,
        branch_id: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingAdminAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          tenant_id: tenant.id,
          user_id: admin.id,
          role_id: tenantAdminRole.id,
          branch_id: null,
        },
      });
    }

    const localAuthCredentials = new LocalAuthCredentialService(
      new LocalAuthCredentialRepository(tx),
      {
        findByIdForTenant: (userId, tenantId) =>
          tx.user.findFirst({
            where: {
              id: userId,
              tenant_id: tenantId,
            },
            select: {
              id: true,
              tenant_id: true,
              email: true,
            },
          }),
      },
    );

    await localAuthCredentials.upsertCredentialForUser({
      tenant_id: tenant.id,
      user_id: admin.id,
      email: admin.email,
      password: readDemoAdminPassword(),
    });

    const platformAdmin = await tx.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: tenant.id,
          email: readPlatformAdminEmail(),
        },
      },
      update: {
        name: "Platform Admin Local",
        status: "active",
        branch_id: branch.id,
      },
      create: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        name: "Platform Admin Local",
        email: readPlatformAdminEmail(),
        status: "active",
      },
    });

    const existingPlatformAdminAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: platformAdmin.id,
        role_id: superAdminRole.id,
        branch_id: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingPlatformAdminAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          tenant_id: tenant.id,
          user_id: platformAdmin.id,
          role_id: superAdminRole.id,
          branch_id: null,
        },
      });
    }

    await localAuthCredentials.upsertCredentialForUser({
      tenant_id: tenant.id,
      user_id: platformAdmin.id,
      email: platformAdmin.email,
      password: readPlatformAdminPassword(),
    });

    const existingSeedAudit = await tx.auditLog.findFirst({
      where: {
        tenant_id: tenant.id,
        action: "seed.initialized",
        entity: "database",
        entity_id: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingSeedAudit) {
      await tx.auditLog.create({
        data: {
          tenant_id: tenant.id,
          actor_user_id: admin.id,
          action: "seed.initialized",
          entity: "database",
          entity_id: tenant.id,
          metadata: {
            source: "prisma/seed.ts",
            auth_note: "Admins locais criados com senhas configuraveis por DEMO_ADMIN_PASSWORD e E2E_PLATFORM_PASSWORD.",
          },
        },
      });
    }
  });
}

async function upsertSystemRole(role: Role): Promise<{ id: string }> {
  const existingRole = await prisma.role.findFirst({
    where: {
      key: role,
      tenant_id: null,
    },
    select: {
      id: true,
    },
  });

  if (existingRole) {
    return prisma.role.update({
      where: {
        id: existingRole.id,
      },
      data: {
        name: formatRoleName(role),
        scope: "system",
      },
      select: {
        id: true,
      },
    });
  }

  return prisma.role.create({
    data: {
      key: role,
      name: formatRoleName(role),
      scope: "system",
    },
    select: {
      id: true,
    },
  });
}

function formatRoleName(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readDemoAdminPassword(): string {
  const configuredPassword = process.env.DEMO_ADMIN_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DEMO_ADMIN_PASSWORD is required when running seed in production.");
  }

  return "ChangeMe123!";
}

function readPlatformAdminEmail(): string {
  return process.env.E2E_PLATFORM_EMAIL?.trim().toLowerCase() || "platform.admin@erp.local";
}

function readPlatformAdminPassword(): string {
  const configuredPassword = process.env.E2E_PLATFORM_PASSWORD?.trim() || process.env.PLATFORM_ADMIN_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E_PLATFORM_PASSWORD or PLATFORM_ADMIN_PASSWORD is required when running seed in production.");
  }

  return "platform-admin-dev-password";
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
