/**
 * B-RDV-COMPROVANTE (§G.3 do plano B-REENVIOS) — rota de upload do comprovante de despesa.
 *
 * Contrato: POST /api/v1/expense-reports/:reportId/items/:itemId/receipt (multipart ≤10 MB,
 * jpeg/png/webp/pdf), permissão `expense_receipt:attach`; idempotência por (tenant, ator,
 * client_action_id); 404 para relatório de outra organização OU de outro empregado (nunca 403
 * que revele existência); 409 `payload_mismatch`; 413/415/422/503; GET devolve metadados e
 * `download_url` do próprio API — nunca `bucket`/`key`/`path`/storage key (D-014: sem presigned).
 *
 * RR1 (4): rota e permissão · RR2 (2): isolamento por organização/empregado · RR3 (2): idempotência.
 * Vermelho-controle: na `origin/main` a rota não existe — o caminho feliz (201) de cada caso falha.
 */
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// JPEG mínimo válido para o sniff (FF D8 FF + corpo qualquer).
function jpegBytes(filler = 0x10, length = 64): Buffer {
  const buffer = Buffer.alloc(length, filler);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  return buffer;
}

async function sha256Hex(bytes: Buffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(bytes).digest("hex");
}

type SeedData = {
  tenantA: Tenant;
  tenantB: Tenant;
  technicianA: User;
  otherTechnicianA: User;
  fieldTechnicianA: User;
  auditorA: User;
  adminB: User;
};

type ReceiptApiContext = { baseUrl: string; seed: SeedData };

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Org Comprovante A", modules: ["dashboard", "expense_management"] });
  const tenantB = service.createTenant({ name: "Org Comprovante B", modules: ["dashboard", "expense_management"] });
  const technicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Comprovante A",
    email: "receipt-tech-a@example.com",
    roles: ["technician"],
  });
  const otherTechnicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Comprovante A2",
    email: "receipt-tech-a2@example.com",
    roles: ["technician"],
  });
  const fieldTechnicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico de Campo Comprovante A",
    email: "receipt-field-a@example.com",
    roles: ["field_technician"],
  });
  const auditorA = service.createUser({
    tenantId: tenantA.id,
    name: "Auditor Comprovante A",
    email: "receipt-auditor-a@example.com",
    roles: ["auditor"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin Comprovante B",
    email: "receipt-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  return { tenantA, tenantB, technicianA, otherTechnicianA, fieldTechnicianA, auditorA, adminB };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

function jsonHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { ...authHeaders(tenant, user, role), "content-type": "application/json" };
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { raw: text };
  }
}

function getBaseUrl(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.once("listening", () => {
      const address = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function withReceiptApi(callback: (context: ReceiptApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetExpenseManagementRuntimeForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/expense-management/index.js"),
  ]);

  resetExpenseManagementRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    resetExpenseManagementRuntimeForTests();
    await closeServer(server);
  }
}

/** Cria relatório + item pela API REST e devolve os ids de servidor. */
async function createReportWithItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
): Promise<{ reportId: string; itemId: string }> {
  const reportResponse = await fetch(`${baseUrl}/api/v1/expense-reports`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({
      periodStart: "2026-11-01",
      periodEnd: "2026-11-07",
      origin: "mobile",
    }),
  });
  const reportBody = await readJson(reportResponse);
  assert.equal(reportResponse.status, 201, `setup createReport: ${JSON.stringify(reportBody)}`);
  const reportId = (reportBody.data?.id ?? reportBody.id) as string;
  assert.ok(reportId, "setup createReport sem id");

  const itemResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({
      categoryKey: "fuel",
      spentAt: "2026-11-02T10:00:00.000Z",
      amount: 120,
      currency: "BRL",
    }),
  });
  const itemBody = await readJson(itemResponse);
  assert.equal(itemResponse.status, 201, `setup addItem: ${JSON.stringify(itemBody)}`);
  const itemId = (itemBody.data?.id ?? itemBody.id) as string;
  assert.ok(itemId, "setup addItem sem id");

  return { reportId, itemId };
}

function receiptForm(input: {
  clientActionId: string;
  bytes: Buffer;
  sha256: string;
  contentType?: string;
  declaredSize?: number;
}): FormData {
  const form = new FormData();
  form.set("client_action_id", input.clientActionId);
  form.set("sha256", input.sha256);
  form.set("size_bytes", String(input.declaredSize ?? input.bytes.length));
  if (input.contentType) form.set("content_type", input.contentType);
  form.set(
    "file",
    new Blob([new Uint8Array(input.bytes)], { type: input.contentType ?? "image/jpeg" }),
    "comprovante.jpg",
  );
  return form;
}

async function postReceipt(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  reportId: string,
  itemId: string,
  form: FormData,
): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
    method: "POST",
    headers: authHeaders(tenant, user, role),
    body: form,
  });
  return { status: response.status, body: await readJson(response) };
}

// ---------------------------------------------------------------------------
// RR1 — rota e permissão (4)
// ---------------------------------------------------------------------------

test("RR1.1 técnico dono anexa comprovante: 201 stored; GET sem bucket/key/path; download devolve os bytes", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes();
    const digest = await sha256Hex(bytes);

    const upload = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr11-attach-1", bytes, sha256: digest }));
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    const receiptId = upload.body.data?.receiptId as string;
    assert.ok(receiptId, "201 sem receiptId");
    assert.equal(upload.body.data?.uploadStatus, "uploaded");

    const detail = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const detailBody = await readJson(detail);
    assert.equal(detail.status, 200, JSON.stringify(detailBody));
    assert.equal(detailBody.data?.receiptId, receiptId);
    assert.equal(detailBody.data?.uploadStatus, "uploaded");
    const downloadUrl = detailBody.data?.downloadUrl as string;
    assert.ok(downloadUrl, "GET sem downloadUrl");

    // Allowlist §2.8: nada de storage interno na resposta pública.
    const serialized = JSON.stringify(detailBody);
    assert.ok(!/bucket/i.test(serialized), "resposta expõe bucket");
    assert.ok(!/file_key|fileKey|storage_key|storageKey/i.test(serialized), "resposta expõe storage key");
    assert.ok(!/"path"|local_path|localPath/i.test(serialized), "resposta expõe path");
    assert.ok(!serialized.includes(seed.tenantB.id), "resposta expõe outra organização");

    const download = await fetch(`${baseUrl}${downloadUrl}`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    assert.equal(download.status, 200);
    const served = Buffer.from(await download.arrayBuffer());
    assert.equal(served.length, bytes.length);
    assert.equal(await sha256Hex(served), digest);
  });
});

test("RR1.2 field_technician anexa no próprio relatório: 201 (permissão nova do catálogo)", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.fieldTechnicianA, "field_technician");
    const bytes = jpegBytes(0x22);
    const digest = await sha256Hex(bytes);

    const upload = await postReceipt(baseUrl, seed.tenantA, seed.fieldTechnicianA, "field_technician", reportId, itemId, receiptForm({ clientActionId: "rr12-attach-1", bytes, sha256: digest }));
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    assert.equal(upload.body.data?.uploadStatus, "uploaded");
  });
});

test("RR1.3 papel sem expense_receipt:attach (auditor): 403 e nada é gravado", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x33);
    const digest = await sha256Hex(bytes);

    const upload = await postReceipt(baseUrl, seed.tenantA, seed.auditorA, "auditor", reportId, itemId, receiptForm({ clientActionId: "rr13-attach-1", bytes, sha256: digest }));
    assert.equal(upload.status, 403, JSON.stringify(upload.body));

    const detail = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    assert.equal(detail.status, 404, "403 não pode ter deixado comprovante");
  });
});

test("RR1.4 recusas do contrato: 422 não-editável · 415 tipo · 413 tamanho · 503 scanner indisponível sem efeito", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x44);
    const digest = await sha256Hex(bytes);

    // 415 — bytes que o sniff não reconhece (texto puro declarado jpeg).
    const textBytes = Buffer.from("isto nao e imagem nem pdf, so texto puro de teste", "utf8");
    const unsupported = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr14-415", bytes: textBytes, sha256: await sha256Hex(textBytes) }));
    assert.equal(unsupported.status, 415, JSON.stringify(unsupported.body));

    // 413 — acima de 10 MB.
    const big = jpegBytes(0x55, 10 * 1024 * 1024 + 1);
    const tooLarge = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr14-413", bytes: big, sha256: await sha256Hex(big) }));
    assert.equal(tooLarge.status, 413, JSON.stringify(tooLarge.body));

    // 503 — scanner indisponível preserva o direito de reenvio: nada persistido.
    const { configureExpenseReceiptScannerForTests, resetExpenseReceiptRuntimeForTests } = await import(
      "../src/modules/expense-management/expense-receipt.service.js"
    );
    const { UnavailableEvidenceScanner } = await import("../src/modules/evidence/evidence-storage.js");
    configureExpenseReceiptScannerForTests(new UnavailableEvidenceScanner());
    try {
      const unavailable = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr14-503", bytes, sha256: digest }));
      assert.equal(unavailable.status, 503, JSON.stringify(unavailable.body));
      const detail = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
        headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
      });
      assert.equal(detail.status, 404, "503 não pode ter deixado comprovante");
    } finally {
      await resetExpenseReceiptRuntimeForTests();
    }

    // 422 — relatório submetido não recebe comprovante.
    const submit = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/submit`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    assert.equal(submit.status, 200, JSON.stringify(await readJson(submit)));
    const locked = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr14-422", bytes, sha256: digest }));
    assert.equal(locked.status, 422, JSON.stringify(locked.body));
    assert.match(JSON.stringify(locked.body), /report_not_editable/);
  });
});

// ---------------------------------------------------------------------------
// RR2 — isolamento por organização e por empregado (2)
// ---------------------------------------------------------------------------

test("RR2.1 relatório de outra organização: 404 (nunca 403), com o caminho do dono provado antes", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x66);
    const digest = await sha256Hex(bytes);

    // Caminho do dono primeiro: prova que a rota existe (vermelho-controle honesto na main).
    const own = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr21-own", bytes, sha256: digest }));
    assert.equal(own.status, 201, JSON.stringify(own.body));

    // Ator da organização B sobre o relatório da A: 404, nunca 403 (não revela existência).
    const cross = await postReceipt(baseUrl, seed.tenantB, seed.adminB, "tenant_admin", reportId, itemId, receiptForm({ clientActionId: "rr21-cross", bytes, sha256: digest }));
    assert.equal(cross.status, 404, JSON.stringify(cross.body));
    assert.notEqual(cross.status, 403);
    assert.ok(!JSON.stringify(cross.body).includes(seed.tenantA.id), "corpo do 404 expõe a organização dona");
  });
});

test("RR2.2 relatório de outro empregado da mesma organização: 404 (nunca 403)", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x77);
    const digest = await sha256Hex(bytes);

    const own = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr22-own", bytes, sha256: digest }));
    assert.equal(own.status, 201, JSON.stringify(own.body));

    const other = await postReceipt(baseUrl, seed.tenantA, seed.otherTechnicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr22-other", bytes, sha256: digest }));
    assert.equal(other.status, 404, JSON.stringify(other.body));
    assert.notEqual(other.status, 403);
  });
});

// ---------------------------------------------------------------------------
// RR3 — idempotência por (tenant, ator, client_action_id) (2)
// ---------------------------------------------------------------------------

test("RR3.1 replay do mesmo client_action_id com o mesmo conteúdo devolve o mesmo comprovante, sem efeito novo", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x88);
    const digest = await sha256Hex(bytes);
    const form = () => receiptForm({ clientActionId: "rr31-replay", bytes, sha256: digest });

    const first = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, form());
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const firstId = first.body.data?.receiptId as string;

    const replay = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, form());
    assert.ok(replay.status === 200 || replay.status === 201, JSON.stringify(replay.body));
    assert.equal(replay.body.data?.receiptId, firstId, "replay devolveu outro comprovante");
    assert.equal(replay.body.data?.uploadStatus, "uploaded");
  });
});

test("RR3.2 mesmo client_action_id com conteúdo diferente: 409 payload_mismatch", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x99);
    const digest = await sha256Hex(bytes);

    const first = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr32-mismatch", bytes, sha256: digest }));
    assert.equal(first.status, 201, JSON.stringify(first.body));

    const different = jpegBytes(0xaa);
    const mismatch = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rr32-mismatch", bytes: different, sha256: await sha256Hex(different) }));
    assert.equal(mismatch.status, 409, JSON.stringify(mismatch.body));
    assert.match(JSON.stringify(mismatch.body), /payload_mismatch/);
  });
});
