import { prisma } from "../../database/prisma.js";
export async function platformList() { const db2 = prisma; return db2.cloudUsageEvent.findMany({}); }
