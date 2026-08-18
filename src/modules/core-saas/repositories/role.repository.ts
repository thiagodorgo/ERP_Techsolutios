import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";
import { isValidRole } from "../permissions/catalog.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type CreateRoleData = {
  readonly tenant_id?: string | null;
  readonly key: string;
  readonly name: string;
  readonly scope: string;
};

export class RoleRepository {
  constructor(private readonly client: PrismaExecutor = prisma) {}

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

  // B-O6R-01 (Ω6R-SEC-001, DEFESA EM PROFUNDIDADE — não conserto de bug): key de SISTEMA
  // (catálogo) resolve SOMENTE a linha global (tenant_id IS NULL). Sem isto o comportamento já
  // era o mesmo — `tenant_id DESC` = NULLS FIRST no Postgres, o papel global já vence (correção
  // do secops ao próprio parecer da rodada 1, ata J-O6R-B01) — mas a ordenação deixava a
  // resolução dependente de um detalhe de ordenação; agora um clone tenant-scoped de papel de
  // sistema nunca é o resolvido, por construção.
  findByKeyForTenant(key: string, tenantId: string) {
    if (isValidRole(key)) {
      return this.client.role.findFirst({
        where: {
          key,
          tenant_id: null,
        },
      });
    }

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
    return this.findByIdForTenantOrGlobal(roleId, tenantId);
  }

  findByIdForTenantOrGlobal(roleId: string, tenantId: string) {
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
