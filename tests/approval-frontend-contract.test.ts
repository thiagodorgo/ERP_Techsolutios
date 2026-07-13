import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("frontend de OS expoe painel e comandos de approval com bloqueio por permissao", async () => {
  const [page, service] = await Promise.all([
    readFile("frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx", "utf8"),
    readFile("frontend/src/modules/work-orders/approval.service.ts", "utf8"),
  ]);

  // O painel de aprovação vive inline na tela de detalhe da OS (ApprovalPanel), ligado ao
  // service real de approval — não mais um card separado (OperationalApprovalCard ficou legado).
  assert.match(page, /ApprovalPanel/);
  assert.match(page, /approveOperationalApproval/);
  assert.match(page, /rejectOperationalApproval/);
  // Bloqueio por permissão: os comandos só aparecem para quem pode decidir. A tela deriva
  // `canDecide` da permissão dedicada de aprovação (work_orders:approve / :cancel).
  assert.match(page, /work_orders:approve/);
  assert.match(page, /canDecide/);
  // Comandos de decisão visíveis.
  assert.match(page, /Aprovar/);
  assert.match(page, /Reprovar/);
  // Service consome os endpoints reais de approval.
  assert.match(service, /\/approvals\/pending\?work_order_id=/);
  assert.match(service, /\/approve/);
  assert.match(service, /\/reject/);
  // §2.8 — o cliente nunca deve carregar caminho/segredo de storage.
  for (const unsafe of ["storage_key", "local_path", "file_data", "base64"]) {
    assert.equal(service.includes(unsafe), false);
  }
});
