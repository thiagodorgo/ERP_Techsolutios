import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω4C PR-01 — anexos genéricos POLIMÓRFICOS (memory service + resolver de posse/RBAC injetável).
// Cobre: create+list por entityType, cross-tenant 404, posse 404, RBAC herdada 403, soft-delete
// (some do list + deleteObject chamado), §2.8 (DTO sem campos internos), idempotência 409, download
// gate 409, entityType inválido 422, AV-scan (infected 422 / failed 503).

type Ownership = ReadonlyMap<string, ReadonlySet<string>>;

async function setup(ownership: Ownership) {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [svc, repoMod, storage, evidence] = await Promise.all([
    import("../src/modules/attachments/attachment.service.js"),
    import("../src/modules/attachments/attachment.repository.js"),
    import("../src/modules/attachments/attachment.storage.js"),
    import("../src/modules/evidence/evidence-storage.js"),
  ]);
  storage.resetAttachmentScannerForTests();

  const descriptor = {
    permRead: "maintenance_orders:read" as const,
    permCreate: "maintenance_orders:create" as const,
    permUpdate: "maintenance_orders:update" as const,
    get: async (actor: { tenantId: string }, entityId: string) =>
      ownership.get(actor.tenantId)?.has(entityId) ? { id: entityId } : undefined,
  };
  const registry = new Map([["maintenance_order", descriptor]]);
  const resolver = {
    descriptorFor: (entityType: string) => registry.get(entityType),
    entityTypes: () => [...registry.keys()],
  };

  const repository = new repoMod.InMemoryAttachmentRepository();
  const service = new svc.AttachmentService(repository, resolver as never);
  return {
    service,
    repository,
    setScanner: storage.configureAttachmentScannerForTests,
    FakeEvidenceScanner: evidence.FakeEvidenceScanner,
    getObject: async (storageKey: string) =>
      (await import("../src/modules/checklists/storage/checklist-storage.factory.js"))
        .createChecklistStorageProviderByName("local")
        .getObject({ storageKey }),
    reset: () => storage.resetAttachmentScannerForTests(),
    toDto: (await import("../src/modules/attachments/attachment.dto.js")).toAttachmentDto,
  };
}

function actor(tenantId: string, permissions: readonly string[] = ["maintenance_orders:read", "maintenance_orders:create", "maintenance_orders:update"]) {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions } as never;
}

const upload = (entityId: string, over: Record<string, unknown> = {}) => ({
  entityType: "maintenance_order",
  entityId,
  file: { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), originalName: "f.png", mimeType: "image/png", sizeBytes: 4 },
  ...over,
});

function ownershipFor(tenantId: string, entityIds: readonly string[]): Ownership {
  return new Map([[tenantId, new Set(entityIds)]]);
}

test("create + list por entityType", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    const created = await s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity));
    assert.equal(created.status, "stored");
    assert.equal(created.entityType, "maintenance_order");
    assert.equal(created.entityId, entity);
    const list = await s.service.listAttachments(ctx, "maintenance_order", entity);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, created.id);
  } finally {
    s.reset();
  }
});

test("cross-tenant → 404 (outro tenant não possui a entidade)", async () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenantA, [entity]));
  try {
    await s.service.createUploadedAttachment(actor(tenantA), "maintenance_order", entity, upload(entity));
    await assert.rejects(
      () => s.service.listAttachments(actor(tenantB), "maintenance_order", entity),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 404 && (e as { reason?: string }).reason === "entity_not_found",
    );
  } finally {
    s.reset();
  }
});

test("posse: entityId não-dono → 404", async () => {
  const tenant = randomUUID();
  const owned = randomUUID();
  const notOwned = randomUUID();
  const s = await setup(ownershipFor(tenant, [owned]));
  try {
    await assert.rejects(
      () => s.service.listAttachments(actor(tenant), "maintenance_order", notOwned),
      (e: unknown) => (e as { statusCode?: number }).statusCode === 404,
    );
  } finally {
    s.reset();
  }
});

test("RBAC herdada: sem permissão da entidade → 403 (antes da posse)", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    await assert.rejects(
      () => s.service.listAttachments(actor(tenant, []), "maintenance_order", entity),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 403 && (e as { reason?: string }).reason === "forbidden",
    );
  } finally {
    s.reset();
  }
});

test("soft-delete: some do list + deleteObject chamado (blob some do storage)", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    const created = await s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity));
    const storageKey = created.storageKey as string;
    const removed = await s.service.deleteAttachment(ctx, created.id);
    assert.ok(removed.deletedAt);
    assert.equal((await s.service.listAttachments(ctx, "maintenance_order", entity)).length, 0);
    // deleteObject foi chamado no soft-delete: o blob não existe mais no provider (getObject rejeita).
    await assert.rejects(() => s.getObject(storageKey));
  } finally {
    s.reset();
  }
});

test("§2.8: DTO NÃO expõe storageKey/checksumSha256/fileUrl/storageProvider/tenant_id", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const created = await s.service.createUploadedAttachment(actor(tenant), "maintenance_order", entity, upload(entity));
    // internamente os campos existem…
    assert.ok(created.storageKey);
    assert.ok(created.checksumSha256);
    assert.ok(created.fileUrl);
    // …mas o DTO da fronteira não os vaza
    const dto = s.toDto(created) as Record<string, unknown>;
    for (const forbidden of ["storageKey", "checksumSha256", "fileUrl", "storageProvider", "tenant_id", "tenantId"]) {
      assert.equal(forbidden in dto, false, `DTO NÃO pode expor ${forbidden}`);
    }
    assert.equal(dto.entityType, "maintenance_order");
    assert.equal(dto.downloadPath, `/api/v1/attachments/${encodeURIComponent(created.id)}/download`);
  } finally {
    s.reset();
  }
});

test("idempotência: 2º upload com mesmo client_action_id → 409", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    await s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity, { clientActionId: "act-1" }));
    await assert.rejects(
      () => s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity, { clientActionId: "act-1" })),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 409 && (e as { reason?: string }).reason === "already_uploaded",
    );
  } finally {
    s.reset();
  }
});

test("download gate: status != stored → 409 attachment_not_ready", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    const pending = await s.repository.createAttachment({
      tenantId: tenant,
      entityType: "maintenance_order",
      entityId: entity,
      fileUrl: "x",
      storageProvider: "local",
      storageKey: "k",
      status: "pending_review",
      metadata: {},
    });
    await assert.rejects(
      () => s.service.getAttachmentDownload(ctx, pending!.id),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 409 && (e as { reason?: string }).reason === "attachment_not_ready",
    );
  } finally {
    s.reset();
  }
});

test("entityType inválido (fora da allow-list) → 422", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    await assert.rejects(
      () => s.service.listAttachments(actor(tenant), "vehicle", entity),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "invalid_entity_type",
    );
  } finally {
    s.reset();
  }
});

test("AV-scan: infected → 422 e nada persiste", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    s.setScanner(new s.FakeEvidenceScanner({ status: "infected" }));
    await assert.rejects(
      () => s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity)),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "evidence_rejected",
    );
    assert.equal((await s.service.listAttachments(ctx, "maintenance_order", entity)).length, 0);
  } finally {
    s.reset();
  }
});

test("AV-scan: failed → 503 e nada persiste", async () => {
  const tenant = randomUUID();
  const entity = randomUUID();
  const s = await setup(ownershipFor(tenant, [entity]));
  try {
    const ctx = actor(tenant);
    s.setScanner(new s.FakeEvidenceScanner({ status: "failed" }));
    await assert.rejects(
      () => s.service.createUploadedAttachment(ctx, "maintenance_order", entity, upload(entity)),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 503 && (e as { reason?: string }).reason === "scan_unavailable",
    );
    assert.equal((await s.service.listAttachments(ctx, "maintenance_order", entity)).length, 0);
  } finally {
    s.reset();
  }
});
