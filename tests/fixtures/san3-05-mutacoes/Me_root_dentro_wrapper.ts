import { prisma } from "../../database/prisma.js";
import { withTenantRls } from "../../database/rls.js";
export async function platformList(id: string) { return withTenantRls(prisma, id, async (_tx) => prisma.cloudUsageEvent.findMany({})); }
