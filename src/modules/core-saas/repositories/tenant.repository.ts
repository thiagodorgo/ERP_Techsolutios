import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type CreateTenantData = {
  readonly name: string;
  readonly slug: string;
  readonly status?: string;
};

export class TenantRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  findById(id: string) {
    return this.client.tenant.findUnique({
      where: {
        id,
      },
    });
  }

  findBySlug(slug: string) {
    return this.client.tenant.findUnique({
      where: {
        slug,
      },
    });
  }

  async listForTenant(tenantId: string) {
    const tenant = await this.findById(tenantId);

    return tenant ? [tenant] : [];
  }

  create(data: CreateTenantData) {
    return this.client.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        status: data.status ?? "active",
      },
    });
  }
}
