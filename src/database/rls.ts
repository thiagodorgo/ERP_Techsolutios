import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaTenantContextClient = PrismaClient | Prisma.TransactionClient;

export async function setTenantRlsContext(
  client: PrismaTenantContextClient,
  tenantId: string,
): Promise<void> {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    throw new Error("Tenant id is required to set PostgreSQL RLS context.");
  }

  await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${normalizedTenantId}, true)`;
}

export async function withTenantRls<T>(
  client: PrismaClient,
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await setTenantRlsContext(tx, tenantId);

    return work(tx);
  });
}
