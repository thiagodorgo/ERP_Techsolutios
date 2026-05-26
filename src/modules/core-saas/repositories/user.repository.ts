import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type CreateUserData = {
  readonly tenant_id: string;
  readonly branch_id?: string | null;
  readonly name: string;
  readonly email: string;
  readonly status?: string;
};

export class UserRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  listByTenant(tenantId: string) {
    return this.client.user.findMany({
      where: {
        tenant_id: tenantId,
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
}
