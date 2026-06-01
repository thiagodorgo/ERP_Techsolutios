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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma/seed.ts.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const permissionDescriptions = {
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

  const branch = await prisma.branch.upsert({
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

  const admin = await prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: tenant.id,
        email: "admin.demo@example.com",
      },
    },
    update: {
      branch_id: branch.id,
      name: "Admin Demo",
      status: "active",
    },
    create: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      name: "Admin Demo",
      email: "admin.demo@example.com",
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

  if (!tenantAdminRole) {
    throw new Error("tenant_admin role was not seeded.");
  }

  const existingAdminAssignment = await prisma.userRoleAssignment.findFirst({
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
    await prisma.userRoleAssignment.create({
      data: {
        tenant_id: tenant.id,
        user_id: admin.id,
        role_id: tenantAdminRole.id,
        branch_id: null,
      },
    });
  }

  const existingSeedAudit = await prisma.auditLog.findFirst({
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
    await prisma.auditLog.create({
      data: {
        tenant_id: tenant.id,
        actor_user_id: admin.id,
        action: "seed.initialized",
        entity: "database",
        entity_id: tenant.id,
        metadata: {
          source: "prisma/seed.ts",
          auth_note: "Admin demo criado sem senha; autenticacao real sera implementada em bloco futuro.",
        },
      },
    });
  }
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
