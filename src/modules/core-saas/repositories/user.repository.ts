import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type CreateUserData = {
  readonly tenant_id: string;
  readonly branch_id?: string | null;
  readonly name: string;
  readonly email: string;
  readonly status?: string;
};

export class UserRepository {
  constructor(private readonly client: PrismaExecutor = prisma) {}

  listByTenant(tenantId: string) {
    return this.client.user.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: {
        role_assignments: {
          include: {
            branch: true,
            role: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });
  }

  findByIdForTenant(userId: string, tenantId: string) {
    return this.client.user.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
      include: {
        role_assignments: {
          include: {
            branch: true,
            role: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });
  }

  findByIdWithRoleAssignmentsForTenant(userId: string, tenantId: string) {
    return this.client.user.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
      include: {
        role_assignments: {
          include: {
            branch: true,
            role: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });
  }

  create(data: CreateUserData) {
    return this.client.user.create({
      data: {
        tenant_id: data.tenant_id,
        branch_id: data.branch_id ?? null,
        name: data.name,
        email: data.email.toLowerCase(),
        status: data.status ?? "active",
      },
    });
  }

  updateProfile(
    userId: string,
    data: { readonly name?: string; readonly status?: string },
  ) {
    return this.client.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  createWithRoleAssignments(data: CreateUserData) {
    return this.client.user.create({
      data: {
        tenant_id: data.tenant_id,
        branch_id: data.branch_id ?? null,
        name: data.name,
        email: data.email.toLowerCase(),
        status: data.status ?? "active",
      },
      include: {
        role_assignments: {
          include: {
            branch: true,
            role: true,
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });
  }
}
