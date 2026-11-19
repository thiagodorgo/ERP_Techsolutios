import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const statements = readFileSync(
  new URL("../src/modules/subscription-billing/statements/statements.platform.routes.ts", import.meta.url),
  "utf8",
);
const tenant = readFileSync(
  new URL("../src/modules/subscription-billing/subscription-billing.tenant.routes.ts", import.meta.url),
  "utf8",
);
const vault = readFileSync(
  new URL("../src/modules/subscription-billing/vault/vault.platform.routes.ts", import.meta.url),
  "utf8",
);

function routeBlocks(source: string): readonly string[] {
  const starts = [...source.matchAll(/router\.(?:get|post|put|patch|delete)\(/g)].map((match) => match.index ?? 0);
  return starts.map((start, index) => source.slice(start, starts[index + 1] ?? source.length));
}

test("GT-TBODY · toda rota que lê tenantId da entrada começa pela permissão de plataforma", () => {
  const offenders = routeBlocks(statements)
    .filter((block) => /requireTenantId\(|(?:query|body)\.tenantId|input\.tenantId/.test(block))
    .filter((block) => !/^router\.(?:get|post|put|patch|delete)\(\s*["'`][^"'`]+["'`]\s*,\s*requirePlatformPermission\(/s.test(block));
  assert.deepEqual(offenders.map((block) => block.split("\n", 2)[0]), []);
});

test("GT-TBODY · a rota da organização só rejeita override e usa tenantContext", () => {
  assert.equal((tenant.match(/request\.query\.tenantId/g) ?? []).length, 1);
  assert.equal((tenant.match(/tenant_id_not_allowed/g) ?? []).length, 1);
  assert.equal((tenant.match(/requireTenantId\(/g) ?? []).length, 0);
  assert.match(tenant, /return request\.tenantContext\?\.tenantId \?\? "";/);
  for (const block of routeBlocks(tenant)) {
    assert.doesNotMatch(block, /(?:query|body)\.tenantId|input\.tenantId/);
  }
});

test("GT-TBODY · rotas globais do cofre não leem tenantId", () => {
  assert.doesNotMatch(vault, /tenantId/);
});
