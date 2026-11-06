import assert from "node:assert/strict";
import test from "node:test";

import type { TenantUsageDaily } from "../src/modules/subscription-billing/metering/index.js";
import { measureTenantsSequentially } from "../src/modules/subscription-billing/subscription-billing.jobs.js";

// B-ASS-03 · conserto do achado G-1 do revisor sênior do #505: a falha de UMA organização não pode apagar a
// medição das demais naquela janela (plano §4.3, R-MED-4: "o dia DESSA organização fica sem linha e o job registra
// o erro"). E a organização de sistema `platform` nunca é medida (S16; achado B-3: o filtro do job real não tinha
// teste).
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA: tirar o try/catch do laço (a falha de A propaga e B não é medida) → T-MED-18
// vermelho; tirar o filtro `platform` → T-MED-19 vermelho.

const row = (tenantId: string) => ({ tenantId, date: "2026-11-06" }) as unknown as TenantUsageDaily;

test("T-MED-18 · a organização que falha fica sem linha; as seguintes são medidas e a falha é registrada com o código", async () => {
  const measured: string[] = [];
  const result = await measureTenantsSequentially(
    [
      { id: "org-a", slug: "a" },
      { id: "org-b", slug: "b" },
      { id: "org-c", slug: "c" },
    ],
    "2026-11-06",
    async (tenantId) => {
      measured.push(tenantId);
      if (tenantId === "org-a") {
        throw Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });
      }
      return row(tenantId);
    },
  );

  assert.deepEqual(measured, ["org-a", "org-b", "org-c"], "a volta seguiu depois da falha de A");
  assert.deepEqual(result.rows.map((r) => r.tenantId), ["org-b", "org-c"]);
  assert.deepEqual(result.failures, [{ tenantId: "org-a", code: "55P03" }]);
});

test("T-MED-18b · a falha registrada não carrega a mensagem do erro (só o código)", async () => {
  const result = await measureTenantsSequentially([{ id: "org-a", slug: "a" }], "2026-11-06", async () => {
    throw new Error("dado sensível na mensagem");
  });
  assert.deepEqual(result.failures, [{ tenantId: "org-a", code: "Error" }]);
  assert.equal(JSON.stringify(result).includes("sensível"), false);
});

test("T-MED-19 · a organização de sistema `platform` nunca é medida (qualquer caixa)", async () => {
  const measured: string[] = [];
  const result = await measureTenantsSequentially(
    [
      { id: "org-platform", slug: "Platform" },
      { id: "org-a", slug: "a" },
      { id: "org-sem-slug", slug: null },
    ],
    "2026-11-06",
    async (tenantId) => {
      measured.push(tenantId);
      return row(tenantId);
    },
  );
  assert.deepEqual(measured, ["org-a", "org-sem-slug"]);
  assert.equal(result.failures.length, 0);
});
