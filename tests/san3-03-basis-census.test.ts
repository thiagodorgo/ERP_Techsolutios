import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

import { PRODUZIDAS_EM_TX } from "../src/modules/cloud-usage/cloud-usage.capture.js";
import { DERIVADAS, STORAGE_INVENTORY_MODELS } from "../src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.js";
import { resolveAllocationRule } from "../src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.js";

const samples = [
  ["AmazonS3", "Requests-Tier1"],
  ["AmazonS3", "TimedStorage-ByteHrs"],
  ["JobService", "Executions"],
  ["AmazonApiGateway", "ApiGatewayRequest"],
  ["ChecklistService", "ChecklistRuns"],
] as const;

test("C-1 · toda chave de regra tem produtor transacional ou derivação", () => {
  const available = new Set<string>([...PRODUZIDAS_EM_TX, ...DERIVADAS]);
  const keys = samples.flatMap(([serviceCode, usageType]) =>
    resolveAllocationRule({ serviceCode, usageType })?.basisMetricKeys ?? [],
  );
  assert.ok(keys.length > 0);
  assert.deepEqual(keys.filter((key) => !available.has(key)), []);
});

test("C-2 · eventos pós-commit não produzem nenhuma chave de base", () => {
  const source = readFileSync("src/modules/cloud-usage/cloud-usage.events.ts", "utf8");
  const basisKeys = new Set(samples.flatMap(([serviceCode, usageType]) =>
    resolveAllocationRule({ serviceCode, usageType })?.basisMetricKeys ?? [],
  ));
  assert.deepEqual([...basisKeys].filter((key) => source.includes(`\"${key}\"`)), []);
});

test("C-3 · best-effort não grava chave usada no rateio", () => {
  const source = sourceFiles("src").map((path) => readFileSync(path, "utf8")).join("\n");
  const calls = [...source.matchAll(/recordCloudUsageBestEffort\([\s\S]{0,800}?metricKey:\s*\"([^\"]+)\"/g)]
    .map((match) => match[1]);
  const basisKeys = new Set(samples.flatMap(([serviceCode, usageType]) =>
    resolveAllocationRule({ serviceCode, usageType })?.basisMetricKeys ?? [],
  ));
  assert.deepEqual(calls.filter((key) => key && basisKeys.has(key)), []);
});

test("C-4 · listCostLineItems exige importId em interface e chamador", () => {
  const repository = readFileSync("src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts", "utf8");
  const service = readFileSync("src/modules/cloud-cost-allocation/cloud-cost-allocation.service.ts", "utf8");
  assert.match(repository, /listCostLineItems\(periodStart: Date, periodEnd: Date, importId: string\)/);
  assert.doesNotMatch(service, /listCostLineItems\([^)]*undefined/);
});

test("C-5 · não há teto silencioso nem laço privado no repositório de rateio", () => {
  const source = readFileSync("src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts", "utf8");
  assert.doesNotMatch(source, /^\s*take:\s*100_000,?\s*$/m);
  assert.doesNotMatch(source, /forEachTenantInOneTx/);
  // §2.8 da emenda: o 2º `take: 100_000` do aceite da linha 246 é o de `cloud-charge-prisma.repository.ts`.
  const charges = readFileSync("src/modules/cloud-charges/cloud-charge-prisma.repository.ts", "utf8");
  assert.doesNotMatch(charges, /^\s*take:\s*100_000,?\s*$/m);
});

test("C-6 · todo modelo com size_bytes está no inventário de storage", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
    .filter((match) => /\bsize_bytes\b/.test(match[2] ?? ""))
    .map((match) => toTableName(match[1]!, match[2] ?? ""))
    .sort();
  assert.deepEqual(models, [...STORAGE_INVENTORY_MODELS].sort());
});

function toTableName(model: string, body: string): string {
  const mapped = body.match(/@@map\(\"([^\"]+)\"\)/)?.[1];
  if (mapped) return mapped;
  return model.replace(/[A-Z]/g, (letter, index) => `${index === 0 ? "" : "_"}${letter.toLowerCase()}`);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}
