import { prisma } from "../../database/prisma.js";
import { PrismaCloudUsageRepository } from "../cloud-usage/cloud-usage-prisma.repository.js";
class Svc { constructor(readonly repo: PrismaCloudUsageRepository) {} run() { return this.repo.listEvents({}); } }
export function build() { return new Svc(new PrismaCloudUsageRepository(prisma)); }
