import { prisma } from "../../database/prisma.js";
export async function platformList() { return prisma.$transaction(async (tx) => tx.cloudUsageEvent.findMany({})); }
