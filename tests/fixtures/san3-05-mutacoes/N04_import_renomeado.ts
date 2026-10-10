import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository as UsageRepo } from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new UsageRepo(prisma).listEvents({}); }
