import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type CreateTenantData = {
  readonly name: string;
  readonly slug: string;
  readonly status?: string;
  // Ω-ACESSO — módulos provisionados ao tenant (governam a visibilidade dos itens de menu).
  readonly modules?: readonly string[];
};

export class TenantRepository {
  constructor(private readonly client: PrismaExecutor = prisma) {}

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

  listAll() {
    return this.client.tenant.findMany({
      orderBy: {
        created_at: "asc",
      },
    });
  }

  listByStatus(status: string) {
    return this.client.tenant.findMany({
      where: {
        status,
      },
      orderBy: {
        created_at: "asc",
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
        modules: data.modules ? [...data.modules] : [],
      },
    });
  }
}
