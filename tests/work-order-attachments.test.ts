import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3-d — service/scan/idempotência/download-gate/delete lógico (memory).

async function setup() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [wo, att, storage] = await Promise.all([
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/work-orders/work-order-attachment.service.js"),
    import("../src/modules/work-orders/work-order-attachment.storage.js"),
  ]);
  wo.resetWorkOrderRuntimeForTests();
  att.resetWorkOrderAttachmentRuntimeForTests();
  storage.resetWorkOrderAttachmentScannerForTests();
  return {
    workOrderService: wo.createMemoryWorkOrderService(),
    attachmentService: att.createMemoryWorkOrderAttachmentService(),
    repo: att.getMemoryWorkOrderAttachmentRepositoryForTests(),
    setScanner: storage.configureWorkOrderAttachmentScannerForTests,
    FakeEvidenceScanner: (await import("../src/modules/evidence/evidence-storage.js")).FakeEvidenceScanner,
    reset: () => { wo.resetWorkOrderRuntimeForTests(); att.resetWorkOrderAttachmentRuntimeForTests(); storage.resetWorkOrderAttachmentScannerForTests(); },
  };
}

function actor(tenantId = randomUUID()) {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["work_orders:read", "work_orders:create", "work_orders:update"] } as never;
}

const upload = (clientActionId?: string) => ({
  clientActionId,
  file: { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), originalName: "f.png", mimeType: "image/png", sizeBytes: 4 },
});

test("Noop default → clean → grava status=stored", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    const created = await s.attachmentService.createUploadedAttachment(ctx, wo.id, upload());
    assert.equal(created.status, "stored");
    assert.equal(created.mimeType, "image/png");
    assert.ok(created.storageKey, "storageKey existe internamente (não no DTO)");
  } finally { s.reset(); }
});

test("scan infected → 422 e nada persiste (lista vazia)", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    s.setScanner(new s.FakeEvidenceScanner({ status: "infected" }));
    await assert.rejects(
      () => s.attachmentService.createUploadedAttachment(ctx, wo.id, upload()),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "evidence_rejected",
    );
    assert.equal((await s.attachmentService.listAttachments(ctx, wo.id)).length, 0);
  } finally { s.reset(); }
});

test("scan failed → 503 e nada persiste", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    s.setScanner(new s.FakeEvidenceScanner({ status: "failed" }));
    await assert.rejects(
      () => s.attachmentService.createUploadedAttachment(ctx, wo.id, upload()),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 503 && (e as { reason?: string }).reason === "scan_unavailable",
    );
    assert.equal((await s.attachmentService.listAttachments(ctx, wo.id)).length, 0);
  } finally { s.reset(); }
});

test("idempotência: 2º upload com mesmo client_action_id → 409", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    await s.attachmentService.createUploadedAttachment(ctx, wo.id, upload("act-1"));
    await assert.rejects(
      () => s.attachmentService.createUploadedAttachment(ctx, wo.id, upload("act-1")),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 409 && (e as { reason?: string }).reason === "already_uploaded",
    );
  } finally { s.reset(); }
});

test("download gate: status != stored → 409 attachment_not_ready", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    // semeia uma row pending_review direto no repo (o pipeline AV-assíncrono é forward-compat)
    const pending = await s.repo.createAttachment({
      tenantId: ctx.tenantId, workOrderId: wo.id, fileUrl: "x", storageProvider: "local", storageKey: "k", status: "pending_review", metadata: {},
    });
    await assert.rejects(
      () => s.attachmentService.getAttachmentDownload(ctx, wo.id, pending!.id),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 409 && (e as { reason?: string }).reason === "attachment_not_ready",
    );
  } finally { s.reset(); }
});

test("delete lógico: row some da lista e do findById; re-delete → 404", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    const created = await s.attachmentService.createUploadedAttachment(ctx, wo.id, upload());
    const removed = await s.attachmentService.deleteAttachment(ctx, wo.id, created.id);
    assert.ok(removed.deletedAt);
    assert.equal((await s.attachmentService.listAttachments(ctx, wo.id)).length, 0);
    await assert.rejects(
      () => s.attachmentService.deleteAttachment(ctx, wo.id, created.id),
      (e: unknown) => (e as { statusCode?: number }).statusCode === 404,
    );
  } finally { s.reset(); }
});

test("isolamento: anexo de outro tenant → 404 (download/delete)", async () => {
  const s = await setup();
  try {
    const owner = actor();
    const wo = await s.workOrderService.create(owner, { title: "OS" });
    const created = await s.attachmentService.createUploadedAttachment(owner, wo.id, upload());
    // outro tenant não enxerga a OS → 404 (assertWorkOrder)
    await assert.rejects(
      () => s.attachmentService.getAttachmentDownload(actor(), wo.id, created.id),
      (e: unknown) => (e as { statusCode?: number }).statusCode === 404,
    );
  } finally { s.reset(); }
});

test("após reupload com token novo, idempotência do token antigo liberada pós-delete", async () => {
  const s = await setup();
  try {
    const ctx = actor();
    const wo = await s.workOrderService.create(ctx, { title: "OS" });
    const first = await s.attachmentService.createUploadedAttachment(ctx, wo.id, upload("act-2"));
    await s.attachmentService.deleteAttachment(ctx, wo.id, first.id);
    // token antigo pode ser reusado após delete lógico (índice parcial só entre ativos)
    const second = await s.attachmentService.createUploadedAttachment(ctx, wo.id, upload("act-2"));
    assert.ok(second.id !== first.id);
  } finally { s.reset(); }
});
