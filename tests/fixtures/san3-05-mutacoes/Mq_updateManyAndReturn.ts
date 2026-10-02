import { prisma } from "../../database/prisma.js";
class Rep { constructor(private readonly client: typeof prisma) {} async fechar(id: string) { return this.client.tenantCloudCharge.updateManyAndReturn({ where: { id }, data: { status: "void" } }); } }
export function run() { return new Rep(prisma).fechar("x"); }
