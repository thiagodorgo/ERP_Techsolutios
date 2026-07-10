import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { booleanFlag, envSchema } from "../src/config/env.js";

// B1 — `z.coerce.boolean()` transforma a STRING "false" em true. `booleanFlag` conserta isso:
// só "true"/"1"/"yes"/"on" ligam; "false"/"0"/""/unset desligam.

test("B1: booleanFlag parseia strings de forma estrita (false não vira true)", () => {
  const schema = z.object({ FLAG: booleanFlag(false) });
  assert.equal(schema.parse({ FLAG: "false" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "0" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "no" }).FLAG, false);
  assert.equal(schema.parse({}).FLAG, false); // default
  assert.equal(schema.parse({ FLAG: "true" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: "1" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: "TRUE" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: true }).FLAG, true);
});

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
};

test("B1: GEOCODING_ENABLED=false realmente desliga (não coage para true)", () => {
  const parsed = envSchema.parse({ ...PROD_BASE, GEOCODING_ENABLED: "false" });
  assert.equal(parsed.GEOCODING_ENABLED, false);
});

test("R11: produção + geocoding ligado + Nominatim público → schema REJEITA", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("GEOCODING_ENABLED")));
  }
});

test("R11: produção + geocoding ligado + provedor PRÓPRIO (self-host) → schema aceita", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://geo.interno.exemplo.com/search",
  });
  assert.equal(result.success, true);
});

test("R11: desenvolvimento + Nominatim público ligado → permitido (só prod é barrado)", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "development",
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search",
  });
  assert.equal(result.success, true);
});
