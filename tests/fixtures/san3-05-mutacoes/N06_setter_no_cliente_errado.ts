import { prisma } from "../../database/prisma.js";
import { setTenantRlsContext } from "../../database/rls.js";
export async function platformList(id: string) {
  return prisma.$transaction(async (tx) => { await setTenantRlsContext(prisma, id); return tx.cloudUsageEvent.findMany({}); });
}
