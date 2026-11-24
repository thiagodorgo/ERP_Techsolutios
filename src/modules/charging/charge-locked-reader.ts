import type { Prisma, PrismaClient } from "@prisma/client";

import { PrismaChargeRepository } from "./charge-prisma.repository.js";
import { ChargeService } from "./charge.service.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedChargeReader = Pick<ChargeService, "getReleaseChargeState" | "getCascadeExpenseClaim">;

const NO_TARIFF = async () => undefined;

export function createLockedChargeReader(tx: PrismaExecutor): LockedChargeReader {
  return new ChargeService(new PrismaChargeRepository(tx), NO_TARIFF);
}
