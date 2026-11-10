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
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Conserto c1 do #525 (§2(a), §12.3, §12.11 RR-A.1) — o comprovante grava no provedor da D-014. Aqui é o
// `local`, num diretório PRÓPRIO deste arquivo. As variáveis entram antes do primeiro import de `src/`
// (todos os imports de `src/` deste arquivo são dinâmicos), porque `src/config/env.ts` congela no import.
const RECEIPT_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "rdvc1-routes-"));
process.env.CHECKLIST_STORAGE_PROVIDER = "local";
process.env.CHECKLIST_STORAGE_LOCAL_DIR = RECEIPT_STORAGE_DIR;
after(() => rmSync(RECEIPT_STORAGE_DIR, { recursive: true, force: true }));

/** A raiz efêmera que o objeto `b9e63ec0` usava (`os.tmpdir()/erp-expense-receipt-uploads`). */
const LEGACY_TMP_ROOT = path.join(os.tmpdir(), "erp-expense-receipt-uploads");

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? (entry as { path: string }).path, entry.name));
}

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

// ---------------------------------------------------------------------------
// Conserto c1 (#525) — RR-A: armazenamento durável pela D-014 (§2(a), §12.1 item 3, §12.3)
// ---------------------------------------------------------------------------

async function memoryRepositoryForTests(): Promise<any> {
  const { getMemoryExpenseManagementRepositoryForTests } = await import(
    "../src/modules/expense-management/expense-management.service.js"
  );
  return getMemoryExpenseManagementRepositoryForTests();
}

/** Troca o `file_key` de uma linha do repositório de memória (a forja do RR-A.4; teste não tem `tsc`). */
function forgeReceiptFileKey(repository: any, receiptId: string, fileKey: string): void {
  const rows = repository.expenseReceipts as Map<string, Record<string, unknown>>;
  const row = rows.get(receiptId);
  assert.ok(row, `linha ${receiptId} não existe no repositório de memória`);
  rows.set(receiptId, { ...row, fileKey });
}

async function getReceiptFile(baseUrl: string, tenant: Tenant, user: User, role: string, reportId: string, itemId: string) {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt/file`, {
    headers: authHeaders(tenant, user, role),
  });
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
}

test("RR-A.1 storage configurado: o 201 grava no provedor local da D-014 (diretório configurado, não o tmpdir), `file_key` começa com `local:`, e um serviço NOVO serve os mesmos bytes", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0xa1);
    const digest = await sha256Hex(bytes);
    const legacyBefore = new Set(listFilesRecursive(LEGACY_TMP_ROOT));

    const upload = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rra1-attach", bytes, sha256: digest }));
    assert.equal(upload.status, 201, JSON.stringify(upload.body));

    // 1 arquivo sob <dir>/<org>/expense-receipt-<reportId>/ e 0 na raiz efêmera do objeto.
    const runDir = path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id, `expense-receipt-${reportId}`);
    const written = listFilesRecursive(runDir);
    assert.equal(written.length, 1, `esperado 1 arquivo sob o diretório configurado ${runDir}; achados ${written.length}`);
    assert.match(path.basename(written[0]), /^[0-9a-f-]{36}-comprovante\.jpg$/, "nome do objeto fora do padrão da D-014");
    const newInLegacy = listFilesRecursive(LEGACY_TMP_ROOT).filter((file) => !legacyBefore.has(file));
    assert.deepEqual(newInLegacy, [], "o comprovante não pode ir para a raiz efêmera os.tmpdir()/erp-expense-receipt-uploads");

    // A linha guarda o provedor no `file_key`.
    const repository = await memoryRepositoryForTests();
    const row = await repository.findLatestStoredExpenseReceipt({ tenantId: seed.tenantA.id, itemId });
    assert.equal(row?.fileKey, `local:${seed.tenantA.id}/expense-receipt-${reportId}/${path.basename(written[0])}`);

    // "Reinício": um serviço NOVO, com o provedor recriado pela fábrica da D-014, serve os mesmos bytes.
    const { ExpenseReceiptService } = await import("../src/modules/expense-management/expense-receipt.service.js");
    const restarted = new ExpenseReceiptService(repository);
    const served = await restarted.serveReceiptFile(
      { tenantId: seed.tenantA.id, userId: seed.technicianA.id, roles: ["technician"], permissions: ["expense_report:read_own"] },
      { reportId, itemId },
    );
    assert.equal(await sha256Hex(served.buffer), digest, "o serviço novo não serviu os mesmos bytes");

    const download = await getReceiptFile(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId);
    assert.equal(download.status, 200);
    assert.equal(await sha256Hex(download.bytes), digest);
  });
});

test("RR-A.4 leitura só na organização da linha: chave sem provedor (legado) → 404; chave `local:` de outra organização → 404; replay sobre linha legada → 409 receipt_unverifiable", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const repository = await memoryRepositoryForTests();

    // (1) Legado: linha de A com `file_key` SEM prefixo, apontando para um arquivo real sob o diretório
    // configurado. A leitura dá 404 sem tocar o disco, e os bytes não saem.
    const legacyCase = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const legacyBytes = jpegBytes(0xa4);
    const legacyKey = `${seed.tenantA.id}/${randomUUID()}.jpg`;
    mkdirSync(path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id), { recursive: true });
    writeFileSync(path.join(RECEIPT_STORAGE_DIR, ...legacyKey.split("/")), legacyBytes);
    await repository.createExpenseReceipt({
      tenantId: seed.tenantA.id,
      itemId: legacyCase.itemId,
      localHash: await sha256Hex(legacyBytes),
      mimeType: "image/jpeg",
      uploadStatus: "uploaded",
      fileKey: legacyKey,
    });
    const legacyRead = await getReceiptFile(baseUrl, seed.tenantA, seed.technicianA, "technician", legacyCase.reportId, legacyCase.itemId);
    assert.equal(legacyRead.status, 404, "linha legada (sem provedor) não pode ser servida");
    assert.ok(!legacyRead.bytes.equals(legacyBytes), "os bytes do arquivo legado saíram");

    // (2) Outra organização: B envia um comprovante real pela rota; A ganha uma linha forjada com
    // `file_key = "local:<orgB>/…"`, a chave do arquivo de B. A leitura de A dá 404 e os bytes de B não saem.
    const caseB = await createReportWithItem(baseUrl, seed.tenantB, seed.adminB, "tenant_admin");
    const bytesB = jpegBytes(0xb4);
    const digestB = await sha256Hex(bytesB);
    const uploadB = await postReceipt(baseUrl, seed.tenantB, seed.adminB, "tenant_admin", caseB.reportId, caseB.itemId, receiptForm({ clientActionId: "rra4-org-b", bytes: bytesB, sha256: digestB }));
    assert.equal(uploadB.status, 201, JSON.stringify(uploadB.body));
    const rowB = await repository.findLatestStoredExpenseReceipt({ tenantId: seed.tenantB.id, itemId: caseB.itemId });
    assert.ok(rowB?.fileKey, "a linha de B não tem file_key");
    const forgedKey = String(rowB.fileKey).startsWith("local:") ? String(rowB.fileKey) : `local:${rowB.fileKey}`;
    const crossCase = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    await repository.createExpenseReceipt({
      tenantId: seed.tenantA.id,
      itemId: crossCase.itemId,
      localHash: digestB,
      mimeType: "image/jpeg",
      uploadStatus: "uploaded",
      fileKey: forgedKey,
    });
    const crossRead = await getReceiptFile(baseUrl, seed.tenantA, seed.technicianA, "technician", crossCase.reportId, crossCase.itemId);
    assert.equal(crossRead.status, 404, "linha de A com a chave de B não pode servir");
    assert.ok(!crossRead.bytes.equals(bytesB), "os bytes de B saíram pela linha de A");
    assert.ok(!crossRead.bytes.toString("utf8").includes(seed.tenantB.id), "a resposta expõe a outra organização");

    // (3) L6 (§12.1 item 3): o replay do MESMO client_action_id sobre uma linha legada (sem prefixo) é
    // 409 receipt_unverifiable, nunca 200 `uploaded` (o app apagaria o blob de um arquivo que o servidor não lê).
    const replayCase = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const replayBytes = jpegBytes(0xa6);
    const replayForm = async () => receiptForm({ clientActionId: "rra4-l6", bytes: replayBytes, sha256: await sha256Hex(replayBytes) });
    const first = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", replayCase.reportId, replayCase.itemId, await replayForm());
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const row = await repository.findLatestStoredExpenseReceipt({ tenantId: seed.tenantA.id, itemId: replayCase.itemId });
    const unprefixed = String(row.fileKey).replace(/^(local|s3):/, "");
    forgeReceiptFileKey(repository, row.id, unprefixed);
    const replay = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", replayCase.reportId, replayCase.itemId, await replayForm());
    assert.equal(replay.status, 409, `replay sobre linha legada: ${JSON.stringify(replay.body)}`);
    assert.equal(replay.body.error?.reason, "receipt_unverifiable");
    assert.notEqual(replay.body.data?.uploadStatus, "uploaded");
  });
});

// ---------------------------------------------------------------------------
// Conserto c1 (#525) — RR-B: a editabilidade decidida DENTRO da transação que grava (§2(b), §12.4, §12.5)
// ---------------------------------------------------------------------------

/** Uma barreira: `entered` resolve quando o código chega nela; `release()` a solta. */
function barrier(): { entered: Promise<void>; signal: () => void; wait: Promise<void>; release: () => void } {
  let signal!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((resolve) => {
    signal = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { entered, signal, wait, release };
}

function submitReport(baseUrl: string, tenant: Tenant, user: User, role: string, reportId: string) {
  return fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/submit`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
  }).then(async (response) => ({ status: response.status, body: await readJson(response) }));
}

test("RR-B.1 corrida com o scanner: upload pausado em scan(), submit 200, solta → 422 report_not_editable, 0 linha e 0 objeto (compensação)", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { configureExpenseReceiptScannerForTests } = await import("../src/modules/expense-management/expense-receipt.service.js");
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0xb1);
    const gate = barrier();
    configureExpenseReceiptScannerForTests({
      async scan() {
        gate.signal();
        await gate.wait;
        return { status: "clean" as const };
      },
    });

    const upload = postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rrb1-corrida", bytes, sha256: await sha256Hex(bytes) }));
    let submitted: { status: number; body: Record<string, any> };
    try {
      await gate.entered; // o upload passou pela editabilidade de fora e está DENTRO do scanner
      submitted = await submitReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId);
    } finally {
      gate.release(); // solta também na falha: senão o upload fica pendurado e o servidor não fecha
    }
    assert.equal(submitted.status, 200, `submit durante o scanner: ${JSON.stringify(submitted.body)}`);

    const result = await upload;
    assert.equal(result.status, 422, `o upload que perdeu a corrida: ${JSON.stringify(result.body)}`);
    assert.equal(result.body.error?.reason, "report_not_editable");

    const repository = await memoryRepositoryForTests();
    const rows = [...(repository.expenseReceipts as Map<string, { tenantId: string }>).values()].filter((row) => row.tenantId === seed.tenantA.id);
    assert.equal(rows.length, 0, "o comprovante entrou num relatório já submetido");
    const runDir = path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id, `expense-receipt-${reportId}`);
    assert.equal(listFilesRecursive(runDir).length, 0, "o objeto do upload recusado ficou no storage (sem compensação)");
  });
});

test("RR-B.2 a submissão espera a gravação do comprovante: com `createExpenseReceipt` pausado dentro da transação, o submit não responde; solto, upload 201 e depois submit 200, `expense_receipt.synced` antes de `expense_report.submitted`", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const repository = await memoryRepositoryForTests();
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0xb2);
    const gate = barrier();
    const original = repository.createExpenseReceipt.bind(repository);
    repository.createExpenseReceipt = async (input: unknown) => {
      gate.signal();
      await gate.wait;
      return original(input);
    };

    try {
      const upload = postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rrb2-espera", bytes, sha256: await sha256Hex(bytes) }));
      await gate.entered; // a transação do comprovante está aberta, parada antes de gravar a linha

      let submitSettled = false;
      const submit = submitReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId).finally(() => {
        submitSettled = true;
      });
      for (let turn = 0; turn < 3; turn += 1) await new Promise((resolve) => setImmediate(resolve));
      // Além das 3 voltas do laço, uma janela real (300 ms): sem ela, um submit que NÃO espera poderia ainda estar
      // no caminho de rede e o vermelho-controle no objeto viraria falso verde.
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(submitSettled, false, "o submit respondeu enquanto a transação do comprovante estava aberta");

      gate.release();
      const uploaded = await upload;
      assert.equal(uploaded.status, 201, `upload: ${JSON.stringify(uploaded.body)}`);
      const submitted = await submit;
      assert.equal(submitted.status, 200, `submit: ${JSON.stringify(submitted.body)}`);

      const events = (repository.listEventsForTests(seed.tenantA.id) as Array<{ eventType: string }>).map((event) => event.eventType);
      const synced = events.indexOf("expense_receipt.synced");
      const submittedAt = events.indexOf("expense_report.submitted");
      assert.ok(synced >= 0 && submittedAt >= 0, `eventos: ${events.join(", ")}`);
      assert.ok(synced < submittedAt, `o submit entrou antes do comprovante: ${events.join(", ")}`);
    } finally {
      // Solta a barreira também na falha: senão o upload fica pendurado e o servidor não fecha (medido no objeto).
      gate.release();
      delete repository.createExpenseReceipt;
    }
  });
});

test("RR-B.3 replay primeiro (C1-A3): comprovante guardado → submit → replay do mesmo client_action_id e conteúdo → 200 com o mesmo receiptId, 0 linha e 0 objeto novos; com o scanner respondendo `failed`, o replay também é 200", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { configureExpenseReceiptScannerForTests } = await import("../src/modules/expense-management/expense-receipt.service.js");
    const repository = await memoryRepositoryForTests();
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0xb3);
    const form = async () => receiptForm({ clientActionId: "rrb3-replay", bytes, sha256: await sha256Hex(bytes) });
    const runDir = path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id, `expense-receipt-${reportId}`);
    const rows = () => [...(repository.expenseReceipts as Map<string, { tenantId: string }>).values()].filter((row) => row.tenantId === seed.tenantA.id).length;

    const first = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, await form());
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const submitted = await submitReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId);
    assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
    const rowsBefore = rows();
    const objectsBefore = listFilesRecursive(runDir).length;

    const replay = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, await form());
    assert.equal(replay.status, 200, `replay depois da submissão: ${JSON.stringify(replay.body)}`);
    assert.equal(replay.body.data?.receiptId, first.body.data?.receiptId);
    assert.equal(rows(), rowsBefore, "o replay criou linha");
    assert.equal(listFilesRecursive(runDir).length, objectsBefore, "o replay criou objeto");

    // A consulta vem ANTES do scanner: um scanner que responde `failed` (503) não muda o replay.
    configureExpenseReceiptScannerForTests({ async scan() { return { status: "failed" as const, reason: "rrb3" }; } });
    const replayScannerDown = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, await form());
    assert.equal(replayScannerDown.status, 200, `replay com o scanner fora: ${JSON.stringify(replayScannerDown.body)}`);
    assert.equal(replayScannerDown.body.data?.receiptId, first.body.data?.receiptId);
  });
});

test("RR-B.4 replay do concorrente dentro da transação (Q6): dois envios do MESMO client_action_id pausados no scanner; solta o 1º → 201; submit 200; solta o 2º → 200 com o mesmo receiptId, 1 linha e 1 objeto (o do 2º foi compensado)", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { configureExpenseReceiptScannerForTests } = await import("../src/modules/expense-management/expense-receipt.service.js");
    const repository = await memoryRepositoryForTests();
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0xb4);
    const form = async () => receiptForm({ clientActionId: "rrb4-concorrente", bytes, sha256: await sha256Hex(bytes) });
    const gates = [barrier(), barrier()];
    let calls = 0;
    configureExpenseReceiptScannerForTests({
      async scan() {
        const gate = gates[calls] ?? barrier();
        calls += 1;
        gate.signal();
        await gate.wait;
        return { status: "clean" as const };
      },
    });

    const firstUpload = postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, await form());
    await gates[0].entered;
    const secondUpload = postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, await form());
    let submitted: { status: number; body: Record<string, any> };
    let first: { status: number; body: Record<string, any> };
    try {
      await gates[1].entered; // os dois passaram do replay de fora (ainda sem recibo) e estão no scanner
      gates[0].release();
      first = await firstUpload;
      submitted = await submitReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId);
    } finally {
      gates[0].release();
      gates[1].release();
    }
    assert.equal(first.status, 201, `1º envio: ${JSON.stringify(first.body)}`);
    assert.equal(submitted.status, 200, `submit: ${JSON.stringify(submitted.body)}`);

    const second = await secondUpload;
    assert.equal(second.status, 200, `2º envio, depois do submit: ${JSON.stringify(second.body)}`);
    assert.equal(second.body.data?.receiptId, first.body.data?.receiptId);
    const rows = [...(repository.expenseReceipts as Map<string, { tenantId: string }>).values()].filter((row) => row.tenantId === seed.tenantA.id);
    assert.equal(rows.length, 1, "esperada 1 linha");
    const runDir = path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id, `expense-receipt-${reportId}`);
    assert.equal(listFilesRecursive(runDir).length, 1, "esperado 1 objeto: o do 2º envio tinha de ser compensado");
  });
});
