import { prisma } from "../../database/prisma.js";
export async function platformList() { const ev = prisma.cloudUsageEvent; return ev.findMany({}); }
