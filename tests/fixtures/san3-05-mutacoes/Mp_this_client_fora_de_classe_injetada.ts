import { prisma } from "../../database/prisma.js";
import { PrismaCloudChargeRepository } from "../cloud-charges/cloud-charge-prisma.repository.js";
export const repos = { charges: new PrismaCloudChargeRepository(prisma) };
export function run() { return repos.charges.listTenantCharges("x"); }
