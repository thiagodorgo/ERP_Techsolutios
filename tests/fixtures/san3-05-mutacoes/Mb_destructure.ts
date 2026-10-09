import { prisma } from "../../database/prisma.js";
export async function platformList() { const { cloudUsageEvent } = prisma; return cloudUsageEvent.findMany({}); }
