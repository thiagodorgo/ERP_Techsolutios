import assert from "node:assert/strict";
import test from "node:test";

import { mapAllocationRun } from "../src/modules/platform/cloud-billing/cloud-billing.adapter";

// B-ASS-10b (T5) · as escritas da tela (plano v2 §6.4) e o rateio em processamento. A F1 traz o T-ACT-3 (a leitura dos 4
// estados do rateio); a F7 acrescenta T-ACT-1, T-ACT-2, T-FX-2, T-GRP-3, T-GRP-4 e T-GRP-5 (as janelas).

const RUN = {
  id: "run-1",
  provider: "aws",
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T00:00:00.000Z",
  startedAt: "2026-11-04T12:13:00.000Z",
  createdAt: "2026-11-04T12:13:00.000Z",
  metadata: { importResolution: "latest_completed" },
};

test("T-ACT-3 o rateio pending e processing é lido como tal (nunca como concluído nem como falha)", () => {
  for (const status of ["pending", "processing", "completed", "failed"] as const) {
    assert.equal(mapAllocationRun({ ...RUN, status }).status, status, status);
  }
  const unknown = mapAllocationRun({ ...RUN, status: "running" });
  assert.notEqual(unknown.status, "completed", "estado desconhecido nunca vira concluído");
  assert.equal(mapAllocationRun({ ...RUN, status: "processing" }).startedAt, "2026-11-04T12:13:00.000Z");
  assert.equal(mapAllocationRun({ ...RUN, status: "completed" }).periodMonth, "2026-10");
});
