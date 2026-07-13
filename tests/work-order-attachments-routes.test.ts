import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3-d — anexos de OS: upload(scan→store)/list/download/delete, §2.8, RBAC, idempotência, isolamento.
const tinyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

test("upload clean → 201 DTO (sem storageKey) status=stored; aparece na lista; download devolve bytes", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "foto.png", mimeType: "image/png", content: tinyPng });
    assert.equal(up.status, 201);
    const dto = up.body.data;
    assert.equal(dto.status, "stored");
    assert.equal(dto.mimeType, "image/png");
    assert.equal(dto.workOrderId, wo);
    assert.ok(dto.downloadPath.includes("/download"));
    // §2.8 — nunca vaza storage_key/provider/fileUrl/checksum/tenant_id.
    for (const k of ["storageKey", "storage_key", "storageProvider", "fileUrl", "checksumSha256", "tenantId", "tenant_id"]) {
      assert.equal(k in dto, false, `DTO não pode conter ${k}`);
    }
    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager") });
    assert.equal(list.body.items.length, 1);
    const dl = await raw(baseUrl, `/api/v1/work-orders/${wo}/attachments/${dto.id}/download`, { headers: h(seed, "manager") });
    assert.equal(dl.status, 200);
    assert.deepEqual(Buffer.from(await dl.arrayBuffer()), tinyPng);
  });
});

test("mime não permitido → 415", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "x.txt", mimeType: "text/plain", content: Buffer.from("no") });
    assert.equal(up.status, 415);
    assert.equal(up.body.error.reason, "unsupported_media_type");
  });
});

test("sem multipart → 400 multipart_required; multipart sem part file → 400 file_required", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const noMp = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { method: "POST", headers: h(seed, "manager"), body: { x: 1 } });
    assert.equal(noMp.status, 400);
    assert.equal(noMp.body.error.reason, "multipart_required");

    // multipart VÁLIDO porém SEM o part "file" (só um campo) → file_required.
    const form = new FormData();
    form.set("description", "sem arquivo");
    const resp = await fetch(`${baseUrl}/api/v1/work-orders/${wo}/attachments`, { method: "POST", headers: h(seed, "manager"), body: form });
    const body = JSON.parse(await resp.text());
    assert.equal(resp.status, 400);
    assert.equal(body.error.reason, "file_required");
  });
});

test("arquivo acima do máximo → 413 file_too_large", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    // default CHECKLIST_STORAGE_MAX_FILE_SIZE_MB = 10 → 11MB estoura (busboy corta no limite).
    const big = Buffer.alloc(11 * 1024 * 1024, 0x41);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "big.png", mimeType: "image/png", content: big });
    assert.equal(up.status, 413);
    assert.equal(up.body.error.reason, "file_too_large");
  });
});

test("scan INFECTED → 422 evidence_rejected; nada persiste (lista vazia)", async () => {
  await withApi(async ({ baseUrl, seed, setScanner }) => {
    const { FakeEvidenceScanner } = await import("../src/modules/evidence/evidence-storage.js");
    setScanner(new FakeEvidenceScanner({ status: "infected", reason: "eicar" }));
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "v.png", mimeType: "image/png", content: tinyPng });
    assert.equal(up.status, 422);
    assert.equal(up.body.error.reason, "evidence_rejected");
    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager") });
    assert.equal(list.body.items.length, 0);
  });
});

test("scan FAILED → 503 scan_unavailable; nada persiste", async () => {
  await withApi(async ({ baseUrl, seed, setScanner }) => {
    const { FakeEvidenceScanner } = await import("../src/modules/evidence/evidence-storage.js");
    setScanner(new FakeEvidenceScanner({ status: "failed", reason: "down" }));
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "v.png", mimeType: "image/png", content: tinyPng });
    assert.equal(up.status, 503);
    assert.equal(up.body.error.reason, "scan_unavailable");
    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager") });
    assert.equal(list.body.items.length, 0);
  });
});

test("delete → 204 (lógico): some da lista e o download some (404)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "f.png", mimeType: "image/png", content: tinyPng });
    const id = up.body.data.id;
    const del = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments/${id}`, { method: "DELETE", headers: h(seed, "manager") });
    assert.equal(del.status, 204);
    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager") });
    assert.equal(list.body.items.length, 0);
    const dl = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments/${id}/download`, { headers: h(seed, "manager") });
    assert.equal(dl.status, 404);
  });
});

test("409 idempotência: dois uploads com o mesmo client_action_id → 2º 409", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const first = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "a.png", mimeType: "image/png", content: tinyPng, clientActionId: "act-1" });
    const dup = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "a.png", mimeType: "image/png", content: tinyPng, clientActionId: "act-1" });
    assert.equal(first.status, 201);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.reason, "already_uploaded");
  });
});

test("[isolamento] OS de outra organização → 404 (upload/list/download)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const upCross = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager", "B"), fileName: "x.png", mimeType: "image/png", content: tinyPng });
    assert.equal(upCross.status, 404);
    const listCross = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager", "B") });
    assert.equal(listCross.status, 404);
  });
});

test("[isolamento] a lista da org B nunca contém anexos da A", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "a.png", mimeType: "image/png", content: tinyPng });
    // B não enxerga a OS de A → 404 (não vaza)
    const listB = await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager", "B") });
    assert.equal(listB.status, 404);
  });
});

test("[RBAC] upload: field_technician e manager 201; auditor 403; viewer 403; sem auth 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const asTech = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "field_technician"), fileName: "t.png", mimeType: "image/png", content: tinyPng });
    assert.equal(asTech.status, 201);
    const asAuditor = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "auditor"), fileName: "t.png", mimeType: "image/png", content: tinyPng });
    assert.equal(asAuditor.status, 403);
    const asViewer = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "viewer"), fileName: "t.png", mimeType: "image/png", content: tinyPng });
    assert.equal(asViewer.status, 403);
    const anon = await raw(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { method: "POST" });
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] list/download (read) ok p/ viewer; delete exige update (viewer 403)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed);
    const up = await upload(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "manager"), fileName: "f.png", mimeType: "image/png", content: tinyPng });
    const id = up.body.data.id;
    assert.equal((await req(baseUrl, `/api/v1/work-orders/${wo}/attachments`, { headers: h(seed, "viewer") })).status, 200);
    assert.equal((await raw(baseUrl, `/api/v1/work-orders/${wo}/attachments/${id}/download`, { headers: h(seed, "viewer") })).status, 200);
    assert.equal((await req(baseUrl, `/api/v1/work-orders/${wo}/attachments/${id}`, { method: "DELETE", headers: h(seed, "viewer") })).status, 403);
  });
});

// ---------- harness ----------

type SeedData = { tenantA: Tenant; tenantB: Tenant; managerA: User; managerB: User };

function h(seed: SeedData, role: string, org: "A" | "B" = "A"): Record<string, string> {
  const tenant = org === "A" ? seed.tenantA : seed.tenantB;
  const user = org === "A" ? seed.managerA : seed.managerB;
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function withApi(cb: (c: { baseUrl: string; seed: SeedData; setScanner: (s: unknown) => void }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetWorkOrderAttachmentRuntimeForTests },
    storage,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/work-orders/work-order-attachment.service.js"),
    import("../src/modules/work-orders/work-order-attachment.storage.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetWorkOrderRuntimeForTests();
  resetWorkOrderAttachmentRuntimeForTests();
  (storage as { resetWorkOrderAttachmentScannerForTests: () => void }).resetWorkOrderAttachmentScannerForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "WOA A", modules: ["work_orders"] });
  const tenantB = core.createTenant({ name: "WOA B", modules: ["work_orders"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "M A", email: "woa-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "M B", email: "woa-b@example.com", roles: ["manager"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  const setScanner = (s: unknown) => (storage as { configureWorkOrderAttachmentScannerForTests: (x: unknown) => void }).configureWorkOrderAttachmentScannerForTests(s);
  try {
    await cb({ baseUrl, seed, setScanner });
  } finally {
    await close(server);
    resetWorkOrderRuntimeForTests();
    resetWorkOrderAttachmentRuntimeForTests();
    (storage as { resetWorkOrderAttachmentScannerForTests: () => void }).resetWorkOrderAttachmentScannerForTests();
  }
}

async function createWO(baseUrl: string, seed: SeedData): Promise<string> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed, "manager"), body: { title: "OS anexo" } });
  assert.equal(res.status, 201);
  return res.body.data.id as string;
}

async function upload(baseUrl: string, routePath: string, o: { headers: Record<string, string>; fileName: string; mimeType: string; content: Buffer; clientActionId?: string }) {
  const form = new FormData();
  if (o.clientActionId) form.set("client_action_id", o.clientActionId);
  form.set("file", new Blob([o.content], { type: o.mimeType }), o.fileName);
  const response = await fetch(`${baseUrl}${routePath}`, { method: "POST", headers: o.headers, body: form });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function raw(baseUrl: string, routePath: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, { method: options.method ?? "GET", headers: options.headers, body: options.body as BodyInit | undefined });
  return response;
}

async function req(baseUrl: string, routePath: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function baseUrlOf(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
}
