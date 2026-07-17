import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { toWorkOrderAttachmentDto, toWorkOrderAttachmentListDto } from "../src/modules/work-orders/work-order-attachment.dto.js";
import type { WorkOrderAttachment } from "../src/modules/work-orders/work-order-attachment.types.js";

function attachment(overrides: Partial<WorkOrderAttachment> = {}): WorkOrderAttachment {
  return {
    id: randomUUID(),
    tenantId: "tenant-secreto",
    workOrderId: randomUUID(),
    fileUrl: "file:///private/secret-path/blob",
    fileName: "foto.png",
    mimeType: "image/png",
    sizeBytes: 1234,
    checksumSha256: "deadbeefchecksum",
    storageProvider: "s3",
    storageKey: "prefix/tenant-secreto/wo/uuid-foto.png",
    status: "stored",
    metadata: {},
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    ...overrides,
  };
}

test("§2.8 — DTO expõe SÓ campos seguros e NUNCA storage_key/provider/fileUrl/checksum/tenant_id", () => {
  const dto = toWorkOrderAttachmentDto(attachment());
  // Ω3F-5b — `uploadedByName` entra na allowlist: é o NOME legível de quem enviou (resolvido no backend
  // para a UI não imprimir o UUID, §11.2). Nome de usuário não é segredo — storage_key/checksum/tenant_id
  // seguem PROIBIDOS (asseverado abaixo).
  assert.deepEqual(
    Object.keys(dto).sort(),
    ["createdAt", "downloadPath", "fileName", "id", "mimeType", "sizeBytes", "status", "uploadedBy", "uploadedByName", "workOrderId"],
  );
  const raw = JSON.stringify(dto);
  for (const secret of ["tenant-secreto", "secret-path", "deadbeefchecksum", "prefix/tenant-secreto", "s3"]) {
    assert.equal(raw.includes(secret), false, `DTO não pode conter o segredo "${secret}"`);
  }
  assert.ok(dto.downloadPath.startsWith("/api/v1/work-orders/"));
  assert.ok(dto.downloadPath.endsWith("/download"));
});

test("DTO emite status e uploadedBy null quando ausente", () => {
  const dto = toWorkOrderAttachmentDto(attachment({ status: "pending_review", uploadedBy: undefined }));
  assert.equal(dto.status, "pending_review");
  assert.equal(dto.uploadedBy, null);
});

// Ω3F-5b (veto §11.2 J-Ω3F-5B) — o DTO resolve uploadedBy → uploadedByName para a UI mostrar o NOME.
test("§11.2 — DTO emite uploadedByName do mapa de nomes; sem mapa (ou id ausente) → null", () => {
  const withName = toWorkOrderAttachmentDto(attachment({ uploadedBy: "user-1" }), new Map([["user-1", "Marina Costa"]]));
  assert.equal(withName.uploadedByName, "Marina Costa");

  // Sem resolver/mapa: null (o front cai em rótulo neutro — nunca imprime o UUID).
  assert.equal(toWorkOrderAttachmentDto(attachment({ uploadedBy: "user-1" })).uploadedByName, null);
  // Sem autor: null.
  assert.equal(toWorkOrderAttachmentDto(attachment({ uploadedBy: undefined }), new Map([["user-1", "X"]])).uploadedByName, null);
});

test("list DTO envelopa items[] §2.8-safe", () => {
  const list = toWorkOrderAttachmentListDto([attachment(), attachment()]);
  assert.equal(list.items.length, 2);
  assert.equal("storageKey" in list.items[0]!, false);
});
