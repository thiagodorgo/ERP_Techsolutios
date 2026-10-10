import { prisma } from "../../database/prisma.js";
class K { constructor(private readonly client: typeof prisma) {} listAll = async () => this.client.cloudUsageEvent.findMany({}); }
export function run() { return new K(prisma).listAll(); }
