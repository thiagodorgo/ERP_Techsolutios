import { prisma } from "../../database/prisma.js";
import { setTenantRlsContext } from "../../database/rls.js";
export async function platformList(tenantId?: string) {
  return prisma.$transaction(async (tx) => { if (tenantId) await setTenantRlsContext(tx, tenantId); return tx.cloudUsageEvent.findMany({}); });
}
