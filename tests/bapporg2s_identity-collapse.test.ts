import assert from "node:assert/strict";
import test from "node:test";

import { collapsesToOneIdentity } from "../src/modules/auth/services/anonymous-login.service.js";

test("G2: pares da mesma identidade colapsam sem escolha", () => {
  assert.equal(collapsesToOneIdentity(["identity-a", "identity-a"]), true);
  assert.equal(collapsesToOneIdentity(["identity-a", "identity-b"]), false);
});

test("G2b: pares sem identidade nunca colapsam", () => {
  assert.equal(collapsesToOneIdentity([null, null]), false);
  assert.equal(collapsesToOneIdentity(["identity-a", null]), false);
});
