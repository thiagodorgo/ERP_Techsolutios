/**
 * B-RDV-COMPROVANTE · conserto c1 do #525 — o storage do comprovante (plano do conserto, §2(a), §12.1–§12.3,
 * §13.2), pela ROTA real em memória.
 *
 * RR-A.6 (Q1) — commit ambíguo: a transação comita e a conexão cai antes da resposta. A compensação só apaga
 *           o objeto depois que uma leitura NOVA prova que nenhuma linha o referencia; aqui a linha existe, então
 *           o objeto fica, o replay responde 200 com o mesmo comprovante e o `/file` serve os bytes.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// O provedor `local` da D-014 num diretório PRÓPRIO deste arquivo. As variáveis entram antes do 1º import de
// `src/` (todos os imports de `src/` deste arquivo são dinâmicos), porque `src/config/env.ts` congela no import.
const RECEIPT_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "rdvc1-storage-"));
process.env.CHECKLIST_STORAGE_PROVIDER = "local";
process.env.CHECKLIST_STORAGE_LOCAL_DIR = RECEIPT_STORAGE_DIR;
after(() => rmSync(RECEIPT_STORAGE_DIR, { recursive: true, force: true }));

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? (entry as { path: string }).path, entry.name));
}

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

type SeedData = { tenantA: Tenant; tenantB: Tenant; technicianA: User };

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { raw: text };
  }
}

async function withReceiptApi(callback: (context: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }, { resetExpenseManagementRuntimeForTests }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/expense-management/index.js"),
    ]);

  resetExpenseManagementRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Org Storage A", modules: ["dashboard", "expense_management"] });
  const tenantB = core.createTenant({ name: "Org Storage B", modules: ["dashboard", "expense_management"] });
  const technicianA = core.createUser({ tenantId: tenantA.id, name: "Tecnico Storage A", email: "storage-tech-a@example.com", roles: ["technician"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await new Promise<string>((resolve) => {
    server.once("listening", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB, technicianA } });
  } finally {
    resetExpenseManagementRuntimeForTests();
    const { resetExpenseReceiptRuntimeForTests } = await import("../src/modules/expense-management/expense-receipt.service.js");
    await resetExpenseReceiptRuntimeForTests();
    await new Promise<void>((resolve, reject) => (server as Server).close((error) => (error ? reject(error) : resolve())));
  }
}

async function createReportWithItem(baseUrl: string, tenant: Tenant, user: User, role: string): Promise<{ reportId: string; itemId: string }> {
  const headers = { ...authHeaders(tenant, user, role), "content-type": "application/json" };
  const reportResponse = await fetch(`${baseUrl}/api/v1/expense-reports`, {
    method: "POST",
    headers,
    body: JSON.stringify({ periodStart: "2026-11-01", periodEnd: "2026-11-07", origin: "mobile" }),
  });
  const reportBody = await readJson(reportResponse);
  assert.equal(reportResponse.status, 201, `setup createReport: ${JSON.stringify(reportBody)}`);
  const reportId = (reportBody.data?.id ?? reportBody.id) as string;

  const itemResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ categoryKey: "fuel", spentAt: "2026-11-02T10:00:00.000Z", amount: 120, currency: "BRL" }),
  });
  const itemBody = await readJson(itemResponse);
  assert.equal(itemResponse.status, 201, `setup addItem: ${JSON.stringify(itemBody)}`);
  return { reportId, itemId: (itemBody.data?.id ?? itemBody.id) as string };
}

function receiptForm(input: { clientActionId: string; bytes: Buffer; sha256: string }): FormData {
  const form = new FormData();
  form.set("client_action_id", input.clientActionId);
  form.set("sha256", input.sha256);
  form.set("size_bytes", String(input.bytes.length));
  form.set("file", new Blob([new Uint8Array(input.bytes)], { type: "image/jpeg" }), "comprovante.jpg");
  return form;
}

async function postReceipt(baseUrl: string, tenant: Tenant, user: User, role: string, reportId: string, itemId: string, form: FormData) {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
    method: "POST",
    headers: authHeaders(tenant, user, role),
    body: form,
  });
  return { status: response.status, body: await readJson(response) };
}

async function getReceiptFile(baseUrl: string, tenant: Tenant, user: User, role: string, reportId: string, itemId: string) {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt/file`, {
    headers: authHeaders(tenant, user, role),
  });
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function memoryRepositoryForTests(): Promise<any> {
  const { getMemoryExpenseManagementRepositoryForTests } = await import(
    "../src/modules/expense-management/expense-management.service.js"
  );
  return getMemoryExpenseManagementRepositoryForTests();
}

// ---------------------------------------------------------------------------
// RR-A.6 — commit ambíguo (Q1, §12.1)
// ---------------------------------------------------------------------------

test("RR-A.6 commit ambíguo (Q1): a transação do comprovante comita e a conexão cai — 500 unexpected_error sem a mensagem, o objeto FICA, o replay dá 200 com o mesmo receiptId e o /file devolve os bytes", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x6a);
    const digest = await sha256Hex(bytes);
    const form = () => receiptForm({ clientActionId: "rra6-commit-ambiguo", bytes, sha256: digest });

    // O repositório de memória EMBRULHADO: a transação que grava o comprovante (o resultado 201) comita, e só
    // DEPOIS a "conexão cai" — é o `ATK-K13a` (`rejected:Connection terminated unexpectedly … committed_rows=1`).
    const repository = await memoryRepositoryForTests();
    const original = repository.withSyncTransaction.bind(repository);
    let armed = true;
    repository.withSyncTransaction = async (tenantId: string, work: (tx: unknown) => Promise<any>) => {
      const result = await original(tenantId, work);
      if (armed && result?.statusCode === 201) {
        armed = false;
        throw new Error("Connection terminated unexpectedly");
      }
      return result;
    };

    try {
      const first = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, form());
      assert.equal(first.status, 500, `resposta do commit ambíguo: ${JSON.stringify(first.body)}`);
      assert.equal(first.body.error?.reason, "unexpected_error");
      assert.ok(!JSON.stringify(first.body).includes("Connection terminated"), "a resposta levou a mensagem crua do erro");
      assert.equal(armed, false, "o embrulho não disparou: o teste não exercitou o commit ambíguo");

      // A linha foi commitada: o objeto dela CONTINUA no diretório (a compensação releu e não apagou).
      const runDir = path.join(RECEIPT_STORAGE_DIR, seed.tenantA.id, `expense-receipt-${reportId}`);
      assert.equal(listFilesRecursive(runDir).length, 1, "a compensação apagou o objeto de uma linha commitada");
      const row = await repository.findLatestStoredExpenseReceipt({ tenantId: seed.tenantA.id, itemId });
      assert.ok(row?.id, "a linha commitada não existe");

      // O app tenta de novo: o replay responde 200 com o MESMO comprovante, e o arquivo é servido.
      const replay = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, form());
      assert.equal(replay.status, 200, JSON.stringify(replay.body));
      assert.equal(replay.body.data?.receiptId, row.id);
      assert.equal(replay.body.data?.uploadStatus, "uploaded");

      const download = await getReceiptFile(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId);
      assert.equal(download.status, 200, "o /file não serviu o comprovante da linha commitada");
      assert.equal(await sha256Hex(download.bytes), digest);
    } finally {
      delete repository.withSyncTransaction;
    }
  });
});
