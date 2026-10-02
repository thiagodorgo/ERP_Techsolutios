import { prisma } from "../../database/prisma.js";
export async function platformList() {
  return prisma.$transaction(async (tx) => {
    // sem setTenantRlsContext( aqui
    return tx.cloudUsageEvent.findMany({});
  });
}
