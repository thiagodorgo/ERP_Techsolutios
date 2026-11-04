import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = [
  "frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts",
  "frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts",
  "frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts",
  "frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx",
];

test("ASS-01 Cloud Billing nao referencia markup nem cloud-charge", async () => {
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /cloud-charge|CloudCharge|markup|Valor cobrável|Margem|Organizações com cobrança|Cobrança por organização/i);
});

test("ASS-01 service agrega somente quatro resumos", async () => {
  const source = await readFile("frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts", "utf8");
  const aggregate = source.match(/Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  const reads = aggregate.match(/FromApi\(period\)/g) ?? [];
  assert.equal(reads.length, 4);
});
