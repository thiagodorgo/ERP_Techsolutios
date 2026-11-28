// B-EVIDENCIA-INDICE — F3: o upload do binário ligado ao recibo da evidência, EM MEMÓRIA, pela rota real.
// U1 a U11 do plano (corpo §8.2 + Ajuste 1 §A1.2 + Emenda 1 §E1.8). Vermelhos antes, verdes depois.
// Os casos falam com a ROTA real (/api/v1/mobile/evidence-uploads) e afirmam comportamento e estado do repositório.
// Repositório PÚBLICO: organizações de teste, e-mails @example.com, bucket de teste, sem nome de pessoa nem caminho local.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import { JPEG_BYTES, PNG_BYTES } from "./helpers/upload-fixtures.js";

// O env congela no 1º import de src/; por isso todos os imports de src/ são dinâmicos (molde do bloco durável).
const DEFAULT_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "evind-upload-default-"));
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.CHECKLIST_STORAGE_PROVIDER = "local";
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DEFAULT_STORAGE_DIR;
process.env.CHECKLIST_STORAGE_S3_BUCKET = "";
process.env.CHECKLIST_STORAGE_S3_REGION = "";
after(() => rmSync(DEFAULT_STORAGE_DIR, { recursive: true, force: true }));

const UPLOAD_ROUTE = "/api/v1/mobile/evidence-uploads";
const SYNC_ROUTE = "/api/v1/mobile/sync/evidence-actions";

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadModules() {
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    sync,
    upload,
    evidence,
    scannerFactory,
    local,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/mobile/mobile-evidence-sync.js"),
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/evidence/evidence-storage.js"),
    import("../src/modules/evidence/evidence-scanner.factory.js"),
    import("../src/modules/checklists/storage/local-checklist-storage.provider.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  return { createApp, workOrders, fieldDispatch, sync, upload, evidence, scannerFactory, local, CoreSaasRegistry, MemoryCoreSaasAdapter, InMemoryCoreSaasStore };
}

const M = await loadModules();

type EvidenceRecordLike = {
  id: string;
  tenantId: string;
  actorUserId: string;
  clientEvidenceId: string;
  scope: string;
  kind: string;
  workOrderId: string | null;
  fileStatus: string;
  fileId: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  storedAt: Date | null;
};

type RepositoryLike = {
  findByClientEvidenceId: (tenantId: string, userId: string, clientEvidenceId: string) => Promise<EvidenceRecordLike | undefined>;
  createAccepted: (input: unknown) => Promise<unknown>;
  markFileStored: (...args: unknown[]) => Promise<unknown>;
  listByWorkOrder: (tenantId: string, workOrderId: string) => Promise<readonly EvidenceRecordLike[]>;
  findByIdForWorkOrder: (tenantId: string, workOrderId: string, id: string) => Promise<EvidenceRecordLike | undefined>;
};

function repository(): RepositoryLike {
  return M.sync.getMobileEvidenceRepositoryForTests() as RepositoryLike;
}

function auditEvents(): Array<{ action: string; metadata: Record<string, unknown> }> {
  return M.upload.getMobileEvidenceUploadAuditEventsForTests() as Array<{ action: string; metadata: Record<string, unknown> }>;
}

function freshRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "evind-u-"));
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? (entry as { path: string }).path, entry.name));
}

/** Costura do armazenamento: um provedor local que CONTA as chamadas a save/deleteObject (espião do §A1.2). */
function storageSeam(root: string, opts: { failSave?: boolean } = {}) {
  const inner = new M.local.LocalChecklistStorageProvider(root);
  let saves = 0;
  let deletes = 0;
  let failSave = opts.failSave ?? false;
  const provider = {
    name: "local" as const,
    async save(input: unknown) {
      saves += 1;
      if (failSave) throw new Error("storage temporarily down");
      return inner.save(input as never);
    },
    async getObject(input: { storageKey: string }) {
      return inner.getObject(input);
    },
    async deleteObject(input: { storageKey: string }) {
      deletes += 1;
      return inner.deleteObject(input);
    },
  };
  return {
    provider,
    saves: () => saves,
    deletes: () => deletes,
    setFailSave: (value: boolean) => {
      failSave = value;
    },
  };
}

function countingScanner() {
  let calls = 0;
  return {
    scanner: {
      async scan() {
        calls += 1;
        return { status: "clean" as const };
      },
    },
    calls: () => calls,
  };
}
type Seed = { tenantA: Tenant; tenantB: Tenant; adminA: User; adminB: User; techA1: User; techA2: User; techB1: User };
type Api = { baseUrl: string; seed: Seed };

function seedCore(core: InstanceType<typeof M.CoreSaasRegistry>): Seed {
  const modules = ["dashboard", "mobile", "work_orders", "field_operations"];
  const tenantA = core.createTenant({ name: "Organização Teste A", modules });
  const tenantB = core.createTenant({ name: "Organização Teste B", modules });
  const adminA = core.createUser({ tenantId: tenantA.id, name: "Gestor A", email: "indice-up-admin-a@example.com", roles: ["tenant_admin"] });
  const adminB = core.createUser({ tenantId: tenantB.id, name: "Gestor B", email: "indice-up-admin-b@example.com", roles: ["tenant_admin"] });
  const techA1 = core.createUser({ tenantId: tenantA.id, name: "Técnico A1", email: "indice-up-tech-a1@example.com", roles: ["field_technician"] });
  const techA2 = core.createUser({ tenantId: tenantA.id, name: "Técnico A2", email: "indice-up-tech-a2@example.com", roles: ["field_technician"] });
  const techB1 = core.createUser({ tenantId: tenantB.id, name: "Técnico B1", email: "indice-up-tech-b1@example.com", roles: ["field_technician"] });
  return { tenantA, tenantB, adminA, adminB, techA1, techA2, techB1 };
}

async function withApi(callback: (api: Api) => Promise<void>): Promise<void> {
  M.workOrders.resetWorkOrderRuntimeForTests();
  M.fieldDispatch.resetFieldDispatchRuntimeForTests();
  M.sync.resetMobileEvidenceSyncRuntimeForTests();
  M.evidence.resetEvidenceAuditEventsForTests();
  M.scannerFactory.resetEvidenceScannerForTests();

  const core = new M.CoreSaasRegistry(new M.InMemoryCoreSaasStore());
  const seed = seedCore(core);
  const app = M.createApp(new M.MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  let failure: unknown;
  try {
    await callback({ baseUrl, seed });
  } catch (error) {
    failure = error;
  }
  try {
    M.evidence.resetEvidenceAuditEventsForTests();
    M.scannerFactory.resetEvidenceScannerForTests();
    M.sync.resetMobileEvidenceSyncRuntimeForTests();
    M.workOrders.resetWorkOrderRuntimeForTests();
    M.fieldDispatch.resetFieldDispatchRuntimeForTests();
  } catch (error) {
    failure ??= error;
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (failure !== undefined) throw failure;
}

function headers(tenant: Tenant, user: User, role = "tenant_admin"): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

function rawHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return { "x-tenant-id": tenantId, "x-user-id": userId, "x-role": role };
}

async function requestJson(baseUrl: string, routePath: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", connection: "close", ...options.headers },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

async function createWorkOrder(api: Api): Promise<string> {
  const created = await requestJson(api.baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: headers(api.seed.tenantA, api.seed.adminA),
    body: { title: "OS da evidência índice (upload)" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data.id as string;
}

async function syncAction(api: Api, tenant: Tenant, userId: string, role: string, action: Record<string, unknown>): Promise<{ status: number; body: any }> {
  return requestJson(api.baseUrl, SYNC_ROUTE, {
    method: "POST",
    headers: rawHeaders(tenant.id, userId, role),
    body: { client_batch_id: `up-lote-${randomUUID()}`, actions: [action] },
  });
}

async function syncPhoto(api: Api, tenant: Tenant, userId: string, role: string, clientEvidenceId: string, workOrderId: string, bytes: Buffer = JPEG_BYTES, mimeType = "image/jpeg"): Promise<string> {
  const response = await syncAction(api, tenant, userId, role, {
    client_evidence_id: clientEvidenceId,
    type: "evidence.work_order_photo",
    local_created_at: "2026-11-27T12:00:00.000Z",
    payload: { work_order_id: workOrderId, file_name: "foto.jpg", content_type: mimeType, size_bytes: bytes.length, sha256: sha256Hex(bytes) },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.summary.accepted, 1, `setup sync foto: ${JSON.stringify(response.body)}`);
  return response.body.data.accepted[0].evidence_id as string;
}

async function syncObservation(api: Api, tenant: Tenant, userId: string, role: string, clientEvidenceId: string, workOrderId: string): Promise<string> {
  const response = await syncAction(api, tenant, userId, role, {
    client_evidence_id: clientEvidenceId,
    type: "evidence.work_order_observation",
    local_created_at: "2026-11-27T12:00:00.000Z",
    payload: { work_order_id: workOrderId, note: "Portão fechado." },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.summary.accepted, 1, `setup sync observação: ${JSON.stringify(response.body)}`);
  return response.body.data.accepted[0].evidence_id as string;
}

async function postUpload(
  api: Api,
  tenant: Tenant,
  userId: string,
  role: string,
  input: { evidenceId: string; clientEvidenceId: string; bytes: Buffer; mimeType?: string; extraFields?: Record<string, string> },
) {
  const mimeType = input.mimeType ?? "image/jpeg";
  const form = new FormData();
  for (const [key, value] of Object.entries(input.extraFields ?? {})) form.append(key, value);
  form.append("evidence_id", input.evidenceId);
  form.append("client_evidence_id", input.clientEvidenceId);
  form.append("sha256", sha256Hex(input.bytes));
  form.append("size_bytes", String(input.bytes.length));
  form.append("content_type", mimeType);
  form.append("file", new Blob([input.bytes], { type: mimeType }), "foto.jpg");
  const response = await fetch(`${api.baseUrl}${UPLOAD_ROUTE}`, { method: "POST", headers: { ...rawHeaders(tenant.id, userId, role), connection: "close" }, body: form });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  // A rota responde `{ data: ... }` no sucesso e `{ error: ... }` na recusa; o caso lê o conteúdo útil.
  return { status: response.status, text, body: parsed.data ?? parsed };
}
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════
// U1 a U11
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════

test("U1 — upload depois do sync: 201 stored e a linha vira stored com provedor, chave, tipo, tamanho, SHA e hora", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u1-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const before = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(before?.fileStatus, "awaiting_file");

      const response = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(response.status, 201, response.text);
      assert.equal(response.body.status, "stored");

      const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.ok(record, "a linha existe");
      assert.equal(record.fileStatus, "stored");
      assert.equal(record.storageProvider, "local");
      assert.ok(record.storageKey && record.storageKey.startsWith(`${api.seed.tenantA.id}/`), `chave começa pela organização A: ${record.storageKey}`);
      assert.equal(record.mimeType, "image/jpeg");
      assert.equal(record.sizeBytes, JPEG_BYTES.length);
      assert.equal(record.checksumSha256, sha256Hex(JPEG_BYTES));
      assert.ok(record.storedAt instanceof Date, "storedAt gravado");
      assert.equal(record.fileId, response.body.file_id);
      assert.equal(listFiles(root).length, 1);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U2 — o mesmo upload de novo: 201 com o MESMO file_id, 0 save na 2ª vez, 1 antivírus na 2ª vez, 1 objeto, evento replayed", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      const scanner = countingScanner();
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(scanner.scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u2-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const first = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(first.status, 201, first.text);
      assert.equal(seam.saves(), 1);
      assert.equal(scanner.calls(), 1);

      const second = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(second.status, 201, second.text);
      assert.equal(second.body.file_id, first.body.file_id, "o MESMO file_id (vem da linha)");
      assert.equal(seam.saves(), 1, "0 chamada ao provider.save na 2ª vez");
      assert.equal(scanner.calls(), 2, "1 chamada ao antivírus na 2ª vez");
      assert.equal(listFiles(root).length, 1, "1 objeto só");
      assert.ok(auditEvents().some((event) => event.action === "evidence.upload.replayed"), "trilha com evidence.upload.replayed");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U3 — upload de novo com outro arquivo: 409 evidence_file_already_stored, a linha não muda, 1 objeto, 0 save na 2ª vez", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u3-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const first = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(first.status, 201, first.text);
      const stored = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);

      const second = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: PNG_BYTES, mimeType: "image/png" });
      assert.equal(second.status, 409, second.text);
      assert.equal(second.body.error.reason, "evidence_file_already_stored");
      assert.equal(seam.saves(), 1, "0 chamada ao provider.save na 2ª vez");
      assert.equal(listFiles(root).length, 1, "1 objeto");

      const after = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.deepEqual(after, stored, "a linha não muda");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U4 — upload para uma observação: 409 evidence_file_not_expected, 0 objeto", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u4-obs";
      const evidenceId = await syncObservation(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const response = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(response.status, 409, response.text);
      assert.equal(response.body.error.reason, "evidence_file_not_expected");
      assert.equal(seam.saves(), 0);
      assert.equal(listFiles(root).length, 0, "0 objeto");
      const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(record?.fileStatus, "none");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U5 — o armazenamento falha: 503, a linha fica awaiting_file; o reenvio sadio dá 201 e grava a linha", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root, { failSave: true });
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u5-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const failed = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(failed.status, 503, failed.text);
      assert.equal(failed.body.error.reason, "evidence_storage_unavailable");
      const awaiting = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(awaiting?.fileStatus, "awaiting_file");
      assert.equal(listFiles(root).length, 0);

      seam.setFailSave(false);
      const healthy = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(healthy.status, 201, healthy.text);
      const stored = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(stored?.fileStatus, "stored");
      assert.equal(listFiles(root).length, 1);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("U6 — o repositório falha no markFileStored: 503, sem stored no corpo, objeto apagado, trilha index_failed e sem stored", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u6-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const real = repository();
      const wrapper: RepositoryLike = {
        findByClientEvidenceId: (tenantId, userId, code) => real.findByClientEvidenceId(tenantId, userId, code),
        createAccepted: (input) => real.createAccepted(input),
        markFileStored: async () => {
          throw new Error("index temporarily down");
        },
        listByWorkOrder: (tenantId, workOrderIdArg) => real.listByWorkOrder(tenantId, workOrderIdArg),
        findByIdForWorkOrder: (tenantId, workOrderIdArg, id) => real.findByIdForWorkOrder(tenantId, workOrderIdArg, id),
      };
      M.sync.setMobileEvidenceRepositoryForTests(wrapper as never);
      try {
        const response = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
        assert.equal(response.status, 503, response.text);
        assert.equal(response.body.error.reason, "evidence_storage_unavailable");
        assert.notEqual(response.body.status, "stored", "o corpo não tem stored");
      } finally {
        M.sync.setMobileEvidenceRepositoryForTests(undefined);
      }

      assert.equal(listFiles(root).length, 0, "o objeto recém-gravado foi apagado");
      assert.equal(seam.deletes(), 1);
      const events = auditEvents();
      assert.ok(events.some((event) => event.action === "evidence.upload.index_failed"), "trilha com evidence.upload.index_failed");
      assert.ok(!events.some((event) => event.action === "evidence.upload.stored"), "sem evidence.upload.stored");
      const record = await real.findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(record?.fileStatus, "awaiting_file");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U7 — dois uploads iguais ao mesmo tempo: os dois 201 com o mesmo file_id, 1 linha stored, 1 objeto ao final", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u7-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const [first, second] = await Promise.all([
        postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES }),
        postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES }),
      ]);
      assert.equal(first.status, 201, first.text);
      assert.equal(second.status, 201, second.text);
      assert.equal(first.body.file_id, second.body.file_id, "os dois com o mesmo file_id");
      assert.equal(listFiles(root).length, 1, "1 objeto ao final");
      const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(record?.fileStatus, "stored");
      assert.equal(record?.fileId, first.body.file_id);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U8 — allowlist do 201 e de toda a trilha: sem chave, provedor, bucket, caminho nem o id da linha", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u8-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const first = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(first.status, 201, first.text);
      const replay = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(replay.status, 201, replay.text);

      const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.ok(record?.storageKey);
      const serialized = JSON.stringify(first.body) + JSON.stringify(replay.body) + JSON.stringify(auditEvents());
      assert.ok(!serialized.includes(record.storageKey), "a chave não aparece");
      assert.ok(!serialized.includes(record.id), "o id da linha não aparece");
      assert.ok(!serialized.includes(root), "o caminho local não aparece");
      assert.ok(!serialized.includes("storage_provider"), "sem campo storage_provider");
      assert.ok(!serialized.includes("storage_key"), "sem campo storage_key");
      assert.ok(!serialized.includes("bucket"), "sem bucket");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("U9 — sem sync antes (controle): 409 evidence_metadata_required", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const clientEvidenceId = "u9-sem-sync";
      const evidenceId = `evidence:${api.seed.tenantA.id}:${clientEvidenceId}`;
      const response = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(response.status, 409, response.text);
      assert.equal(response.body.error.reason, "evidence_metadata_required");
      assert.equal(listFiles(root).length, 0);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U10 — ex-técnico e nunca-técnico (controle): 409 assignment_changed_pending_review e 403; a linha não muda", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const manager = headers(api.seed.tenantA, api.seed.adminA, "manager");

      // Ex-técnico: o despacho atribui (grava histórico), o técnico sincroniza, o despacho passa a outro → 409.
      const workOrderEx = await createWorkOrder(api);
      const dispatch = await requestJson(api.baseUrl, "/api/v1/operations/dispatches", {
        method: "POST",
        headers: manager,
        body: { workOrderId: workOrderEx, operatorUserId: api.seed.techA1.id },
      });
      assert.equal(dispatch.status, 201, JSON.stringify(dispatch.body));
      const clientEx = "u10-ex";
      const evidenceEx = await syncPhoto(api, api.seed.tenantA, api.seed.techA1.id, "field_technician", clientEx, workOrderEx);
      const reassign = await requestJson(api.baseUrl, `/api/v1/operations/dispatches/${dispatch.body.data.id}/reassign`, {
        method: "PATCH",
        headers: manager,
        body: { operatorUserId: api.seed.techA2.id },
      });
      assert.equal(reassign.status, 200, JSON.stringify(reassign.body));
      const beforeEx = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, clientEx);
      const ex = await postUpload(api, api.seed.tenantA, api.seed.techA1.id, "field_technician", { evidenceId: evidenceEx, clientEvidenceId: clientEx, bytes: JPEG_BYTES });
      assert.equal(ex.status, 409, ex.text);
      assert.equal(ex.body.error.reason, "assignment_changed_pending_review");
      const afterEx = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, clientEx);
      assert.deepEqual(afterEx, beforeEx, "a linha do ex-técnico não muda");

      // Nunca-técnico: o recibo nasce com papel tenant_wide (sem escopo por objeto e sem histórico de atribuição);
      // o upload como técnico de campo (assigned_only) numa OS sem atribuição → 403 not_assigned_to_actor.
      const workOrderNever = await createWorkOrder(api);
      const clientNever = "u10-never";
      const evidenceNever = await syncPhoto(api, api.seed.tenantA, api.seed.techA1.id, "manager", clientNever, workOrderNever);
      const beforeNever = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, clientNever);
      const never = await postUpload(api, api.seed.tenantA, api.seed.techA1.id, "field_technician", { evidenceId: evidenceNever, clientEvidenceId: clientNever, bytes: JPEG_BYTES });
      assert.equal(never.status, 403, never.text);
      assert.equal(never.body.error.reason, "not_assigned_to_actor");
      const afterNever = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, clientNever);
      assert.deepEqual(afterNever, beforeNever, "a linha do nunca-técnico não muda");
      assert.equal(listFiles(root).length, 0);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("U11 — arquivo já stored, reenvio com antivírus infected depois failed (caso misto): 422 e 503; a linha continua stored; 1 objeto; sem replayed", async () => {
  const root = freshRoot();
  try {
    await withApi(async (api) => {
      const seam = storageSeam(root);
      M.upload.configureMobileEvidenceUploadStorageForTests({ provider: seam.provider } as never);
      M.upload.configureMobileEvidenceUploadScannerForTests(countingScanner().scanner);
      const workOrderId = await createWorkOrder(api);
      const clientEvidenceId = "u11-photo";
      const evidenceId = await syncPhoto(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", clientEvidenceId, workOrderId);

      const first = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(first.status, 201, first.text);
      const stored = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.equal(stored?.fileStatus, "stored", "a linha fica stored depois do 1º upload");

      M.upload.configureMobileEvidenceUploadScannerForTests({ async scan() { return { status: "infected" as const }; } });
      const infected = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(infected.status, 422, infected.text);
      assert.equal(infected.body.error.reason, "evidence_rejected");

      M.upload.configureMobileEvidenceUploadScannerForTests({ async scan() { return { status: "failed" as const }; } });
      const failed = await postUpload(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(failed.status, 503, failed.text);
      assert.equal(failed.body.error.reason, "evidence_scan_failed");

      const after = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, clientEvidenceId);
      assert.deepEqual(after, stored, "a linha continua stored com os mesmos dados");
      assert.equal(listFiles(root).length, 1, "1 objeto");
      assert.equal(seam.saves(), 1, "nenhum objeto novo");
      const events = auditEvents();
      assert.ok(events.some((event) => event.action === "evidence.upload.rejected"), "trilha com rejected");
      assert.ok(events.some((event) => event.action === "evidence.upload.scan_failed"), "trilha com scan_failed");
      assert.ok(!events.some((event) => event.action === "evidence.upload.replayed"), "nenhum replayed nesses envios");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
