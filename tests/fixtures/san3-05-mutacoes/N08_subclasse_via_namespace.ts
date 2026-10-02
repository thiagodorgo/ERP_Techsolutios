import { prisma } from "../../database/prisma.js";
import * as cc from "../cloud-charges/cloud-charge-prisma.repository.js";
class Sub extends cc.PrismaCloudChargeRepository {}
export function run() { return new Sub(prisma).listTenantCharges("x"); }
