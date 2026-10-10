import { prisma } from "../../database/prisma.js";
import * as cu from "../cloud-usage/cloud-usage-prisma.repository.js";
export function run() { return new cu.PrismaCloudUsageRepository(prisma).listEvents({}); }
