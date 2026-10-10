import { getPrisma } from "../../database/prisma.js";
export async function platformList() { return getPrisma().cloudUsageEvent.findMany({}); }
