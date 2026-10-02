import { prisma } from "../../database/prisma.js";
const SQL_TODOS = "SELECT * FROM cloud_usage_events";
export async function platformList() { return prisma.$queryRawUnsafe(SQL_TODOS); }
