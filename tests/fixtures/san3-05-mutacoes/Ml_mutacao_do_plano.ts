import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new PrismaCloudUsageRepository(prisma).listEvents({}); }
