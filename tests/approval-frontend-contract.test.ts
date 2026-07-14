import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("frontend de OS expoe painel e comandos de approval com bloqueio por permissao", async () => {
  const [page, tab, service] = await Promise.all([
    readFile("frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx", "utf8"),
    readFile("frontend/src/modules/work-orders/components/tabs/GeneralInfoTab.tsx", "utf8"),
    readFile("frontend/src/modules/work-orders/approval.service.ts", "utf8"),
  ]);

  // Ω3F-1: o Hub da OS virou shell de abas; o painel de aprovação (ApprovalPanel) migrou INTEGRAL para
  // a aba "Informações gerais" (GeneralInfoTab), ligado ao service real de approval. O contrato (painel +
  // comandos + gating por permissão) segue intacto — só mudou de arquivo.
  assert.match(tab, /ApprovalPanel/);
  assert.match(tab, /approveOperationalApproval/);
  assert.match(tab, /rejectOperationalApproval/);
  // Comandos de decisão visíveis (na aba).
  assert.match(tab, /Aprovar/);
  assert.match(tab, /Reprovar/);
  // Bloqueio por permissão: a PÁGINA deriva `canDecide` da permissão dedicada (work_orders:approve / :cancel)
  // e injeta na aba, que só mostra os comandos para quem pode decidir.
  assert.match(page, /work_orders:approve/);
  assert.match(page, /canDecide/);
  assert.match(tab, /canDecide/);
  // Service consome os endpoints reais de approval.
  assert.match(service, /\/approvals\/pending\?work_order_id=/);
  assert.match(service, /\/approve/);
  assert.match(service, /\/reject/);
  // §2.8 — o cliente nunca deve carregar caminho/segredo de storage.
  for (const unsafe of ["storage_key", "local_path", "file_data", "base64"]) {
    assert.equal(service.includes(unsafe), false);
  }
});
