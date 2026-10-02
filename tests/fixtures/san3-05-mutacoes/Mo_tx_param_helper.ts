import { prisma } from "../../database/prisma.js";
async function helper(tx: typeof prisma) { return tx.tenantCloudCharge.findMany({}); }
export function run() { return helper(prisma); }
