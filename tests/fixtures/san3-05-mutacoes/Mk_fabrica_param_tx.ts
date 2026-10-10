import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
const make = (tx: typeof prisma) => new PrismaCloudUsageRepository(tx);
export function run() { return make(prisma).listEvents({}); }
