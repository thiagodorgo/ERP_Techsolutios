import assert from "node:assert/strict";
import test from "node:test";

import { latestAllocatedMonth } from "../src/modules/platform/cloud-billing/cloud-billing.service";

// B-ASS-10b (T5) · §6.3.2 do plano v2 + A12-r2 da Emenda 1 — o mês em que a tela abre: o último mês com rateio
// concluído E com custo importado. Conta só `explicit`, `latest_completed` ou o campo ausente (rateio antigo), a lista
// fechada do `coverageOf` do servidor (`cloud-cost-allocation.service.ts:589-595`).

const run = (status: string, month: string, importResolution?: unknown) =>
  ({ status, periodStart: `${month}-01T00:00:00.000Z`, metadata: importResolution === undefined ? {} : { importResolution } });

test("T-MES-1 a tela abre no último mês com rateio concluído E com custo importado", () => {
  assert.equal(latestAllocatedMonth([], "2026-11"), "2026-11");
  assert.equal(latestAllocatedMonth([run("completed", "2026-10", "latest_completed"), run("completed", "2026-09", "explicit")], "2026-11"), "2026-10");
  assert.equal(latestAllocatedMonth([run("pending", "2026-11", "explicit"), run("processing", "2026-11"), run("failed", "2026-11"), run("completed", "2026-08")], "2026-11"), "2026-08");
  // A12: o rateio do mês corrente rodado sem arquivo não puxa a tela para o mês vazio
  assert.equal(latestAllocatedMonth([run("completed", "2026-11", "none"), run("completed", "2026-10", "latest_completed")], "2026-11"), "2026-10");
  assert.equal(latestAllocatedMonth([run("completed", "2026-11", "none")], "2026-11"), "2026-11");
  // mês depois do corrente é ignorado
  assert.equal(latestAllocatedMonth([run("completed", "2026-12", "explicit")], "2026-11"), "2026-11");
  // A12-r2: valor desconhecido de importResolution é "sem importação" para o servidor, logo não puxa a tela
  assert.equal(latestAllocatedMonth([run("completed", "2026-11", "skipped"), run("completed", "2026-10", "latest_completed")], "2026-11"), "2026-10");
  // rateio antigo (campo ausente, null ou de outro tipo) conta, como no `coverageOf`
  assert.equal(latestAllocatedMonth([run("completed", "2026-09", null)], "2026-11"), "2026-09");
  assert.equal(latestAllocatedMonth([{ status: "completed", periodStart: "2026-07-01T00:00:00.000Z" }], "2026-11"), "2026-07");
});
