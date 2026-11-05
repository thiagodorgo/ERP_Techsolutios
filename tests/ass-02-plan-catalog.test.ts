import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SUBSCRIPTION_PLAN_SEEDS } from "../src/modules/subscription-billing/plans/plan-catalog.js";

const EXPECTED = [
  "business",
  "enterprise",
  "professional",
  "starter",
  "tracking_basic",
  "tracking_plus",
] as const;

test("B-ASS-02: a fonte única contém quatro planos-base e dois add-ons, sem preço", () => {
  assert.deepEqual(SUBSCRIPTION_PLAN_SEEDS.map((plan) => plan.code).sort(), [...EXPECTED]);
  assert.equal(SUBSCRIPTION_PLAN_SEEDS.filter((plan) => plan.kind === "base").length, 4);
  assert.equal(SUBSCRIPTION_PLAN_SEEDS.filter((plan) => plan.kind === "addon_tracking").length, 2);
  assert.ok(SUBSCRIPTION_PLAN_SEEDS.every((plan) => !("price" in plan)));
});

test("B-ASS-02: M1-d e seed de desenvolvimento referenciam a mesma fonte de seis códigos", () => {
  const migration = readFileSync(
    "prisma/migrations/20260895000000_ass02_seed_subscription_plans/migration.sql",
    "utf8",
  );
  const migrationCodes = [...migration.matchAll(/gen_random_uuid\(\), '([a-z_]+)'/g)]
    .map((match) => match[1]!)
    .sort();
  assert.deepEqual(migrationCodes, [...EXPECTED]);

  const seed = readFileSync("prisma/seed.ts", "utf8");
  assert.match(seed, /import \{ SUBSCRIPTION_PLAN_SEEDS \}/);
  assert.match(seed, /for \(const plan of SUBSCRIPTION_PLAN_SEEDS\)/);
});
