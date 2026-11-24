import assert from "node:assert/strict";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { PrismaAuctionRepository } from "../src/modules/auction/auction-prisma.repository.js";

test("RV12 · o repositório Prisma expõe o relote atômico protegido pela trava", () => {
  assert.equal(typeof PrismaAuctionRepository.prototype.relotAtomic, "function");
});
