import { prisma } from "../../database/prisma.js";
export async function platformList() { const { cloudUsageEvent: ev } = prisma; return ev.findMany({}); }
