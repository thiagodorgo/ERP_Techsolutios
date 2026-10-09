import { prisma } from "../../database/prisma.js";
import { PrismaCloudChargeRepository } from "../cloud-charges/cloud-charge-prisma.repository.js";
class Sub extends PrismaCloudChargeRepository {}
export function make() { return new Sub(prisma); }
