import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type CreateRoleData = {
  readonly tenant_id?: string | null;
  readonly key: string;
  readonly name: string;
  readonly scope: string;
};

export class RoleRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  listForTenant(tenantId: string) {
    return this.client.role.findMany({
      where: {
        OR: [
          {
            tenant_id: null,
          },
          {
            tenant_id: tenantId,
          },
        ],
      },
      orderBy: {
        key: "asc",
      },
    });
  }

  findByKeyForTenant(key: string, tenantId: string) {
    return this.client.role.findFirst({
      where: {
        key,
        OR: [
          {
            tenant_id: null,
          },
          {
            tenant_id: tenantId,
          },
        ],
      },
      orderBy: {
        tenant_id: "desc",
      },
    });
  }

  findByIdForTenant(roleId: string, tenantId: string) {
    return this.client.role.findFirst({
      where: {
        id: roleId,
        OR: [
          {
            tenant_id: null,
          },
          {
            tenant_id: tenantId,
          },
        ],
      },
    });
  }

  listByUserForTenant(userId: string, tenantId: string) {
    return this.client.role.findMany({
      where: {
        user_assignments: {
          some: {
            tenant_id: tenantId,
            user_id: userId,
          },
        },
      },
      orderBy: {
        key: "asc",
      },
    });
  }

  create(data: CreateRoleData) {
    return this.client.role.create({
      data: {
        tenant_id: data.tenant_id ?? null,
        key: data.key,
        name: data.name,
        scope: data.scope,
      },
    });
  }

  listPermissionsByRoleId(roleId: string) {
    return this.client.rolePermission.findMany({
      where: {
        role_id: roleId,
      },
      include: {
        permission: true,
      },
      orderBy: {
        permission: {
          key: "asc",
        },
      },
    });
  }
}
