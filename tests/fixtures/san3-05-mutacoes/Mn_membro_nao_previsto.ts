import { prisma } from "../../database/prisma.js";
class K { constructor(private readonly conn: typeof prisma) {} async listAll() { return this.conn.cloudUsageEvent.findMany({}); } }
export function run() { return new K(prisma).listAll(); }
