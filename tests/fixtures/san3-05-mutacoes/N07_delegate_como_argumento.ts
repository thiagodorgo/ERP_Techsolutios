import { prisma } from "../../database/prisma.js";
function paginate(d: typeof prisma.cloudUsageEvent) { return d.findMany({ take: 50 }); }
export function run() { return paginate(prisma.cloudUsageEvent); }
