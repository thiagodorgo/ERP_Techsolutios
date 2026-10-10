import { prisma } from "../../../src/database/prisma.js";

export function run(id: string) {
  return prisma.cloudChargeCalculationRun.findUnique({
    where: { id },
    include: { tenant_cloud_charges: true },
  });
}
