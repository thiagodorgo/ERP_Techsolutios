import { prisma } from "../../database/prisma.js";
export async function platformList() { return (prisma as any).cloudUsageEvent.findMany({}); }
