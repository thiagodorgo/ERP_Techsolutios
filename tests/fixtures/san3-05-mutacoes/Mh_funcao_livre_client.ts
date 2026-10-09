import { prisma } from "../../database/prisma.js";
async function listAll(client: typeof prisma) { return client.cloudUsageEvent.findMany({}); }
export function run() { return listAll(prisma); }
