import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { AttachmentsTab, AttachmentRow } from "../src/modules/work-orders/components/tabs/AttachmentsTab";
import type { WorkOrderAttachment } from "../src/modules/work-orders/attachments.types";

// Ω3F-5b — aba Arquivos (front): estados §7 (cabeçalho + carregamento), gating de upload
// (work_orders:create OU update), badges de status e download desabilitado p/ status != stored.

const ctx = { tenantId: "t1", token: "tok" };

function baseAttachment(overrides: Partial<WorkOrderAttachment> = {}): WorkOrderAttachment {
  return {
    id: "att-1",
    workOrderId: "wo-1",
    fileName: "laudo.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    status: "stored",
    downloadPath: "/download/opaco",
    uploadedBy: "Maria",
    createdAt: "2026-07-14T12:00:00.000Z",
    ...overrides,
  };
}

function renderRow(attachment: WorkOrderAttachment) {
  return renderToString(
    <table>
      <tbody>
        <AttachmentRow attachment={attachment} canDelete busy={false} onDownload={() => {}} onDelete={() => {}} />
      </tbody>
    </table>,
  );
}

test("AttachmentsTab: cabeçalho + estado de carregamento (§7) no primeiro render (SSR)", () => {
  const html = renderToString(
    <AttachmentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Arquivos/);
  assert.match(html, /Carregando arquivos/);
});

test("AttachmentsTab: upload só com work_orders:create OU update", () => {
  const withUpload = renderToString(
    <AttachmentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read", "work_orders:update"]} />,
  );
  assert.match(withUpload, /Enviar arquivo/);

  const withoutUpload = renderToString(
    <AttachmentsTab workOrderId="wo-1" context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.doesNotMatch(withoutUpload, /Enviar arquivo/);
});

test("AttachmentRow: badge 'Disponível' e download habilitado quando status=stored", () => {
  const html = renderRow(baseAttachment({ status: "stored" }));
  assert.match(html, /laudo\.pdf/);
  assert.match(html, /Disponível/);
  assert.match(html, /PDF/);
  // Com busy=false e canDelete, o único botão que pode ficar desabilitado é o de baixar; stored não desabilita.
  assert.doesNotMatch(html, /disabled/);
  assert.match(html, /title="Baixar arquivo"/);
});

test("AttachmentRow: badges de status e download desabilitado p/ não-stored", () => {
  const pending = renderRow(baseAttachment({ status: "pending_review" }));
  assert.match(pending, /Em análise/);
  assert.match(pending, /disabled/);
  assert.match(pending, /Disponível após verificação/);

  const rejected = renderRow(baseAttachment({ status: "rejected" }));
  assert.match(rejected, /Rejeitado/);
  assert.match(rejected, /disabled/);

  const scanFailed = renderRow(baseAttachment({ status: "scan_failed" }));
  assert.match(scanFailed, /Falha na verificação/);
  assert.match(scanFailed, /disabled/);
});
