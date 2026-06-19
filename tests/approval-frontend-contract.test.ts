import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("frontend de OS expoe card e comandos de approval com bloqueio por permissao", async () => {
  const [page, card, service] = await Promise.all([
    readFile("frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx", "utf8"),
    readFile("frontend/src/modules/work-orders/components/OperationalApprovalCard.tsx", "utf8"),
    readFile("frontend/src/modules/work-orders/approval.service.ts", "utf8"),
  ]);

  assert.match(page, /OperationalApprovalCard/);
  assert.match(page, /can\("work_orders:update"\)/);
  assert.match(card, /Aprovacao operacional/);
  assert.match(card, /Informe o motivo da reprovacao/);
  assert.match(card, /Aprovar/);
  assert.match(card, /Reprovar/);
  assert.match(service, /\/approvals\/pending\?work_order_id=/);
  assert.match(service, /\/approve/);
  assert.match(service, /\/reject/);
  for (const unsafe of ["storage_key", "local_path", "file_data", "base64"]) {
    assert.equal(service.includes(unsafe), false);
  }
});
