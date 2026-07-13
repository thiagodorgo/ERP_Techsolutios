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
  assert.deepEqual(
    Object.keys(dto).sort(),
    ["createdAt", "downloadPath", "fileName", "id", "mimeType", "sizeBytes", "status", "uploadedBy", "workOrderId"],
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

test("list DTO envelopa items[] §2.8-safe", () => {
  const list = toWorkOrderAttachmentListDto([attachment(), attachment()]);
  assert.equal(list.items.length, 2);
  assert.equal("storageKey" in list.items[0]!, false);
});
