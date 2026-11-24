import assert from "node:assert/strict";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";

import { AuctionController } from "../src/modules/auction/auction.controller.js";

test("RV13 · o controlador expõe o ato de relote para a rota protegida", () => {
  assert.equal(typeof AuctionController.prototype.relotForResale, "function");
});

