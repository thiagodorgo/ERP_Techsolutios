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
    try {
      resetExpenseManagementRuntimeForTests();
      const { resetExpenseReceiptRuntimeForTests } = await import("../src/modules/expense-management/expense-receipt.service.js");
      await resetExpenseReceiptRuntimeForTests();
    } finally {
      // O servidor fecha mesmo se a limpeza falhar: sem isso o processo fica preso num handle aberto (medido no
      // vermelho-controle do objeto, cuja costura recebe um caminho e não um provedor).
      await new Promise<void>((resolve, reject) => (server as Server).close((error) => (error ? reject(error) : resolve())));
    }
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

// ---------------------------------------------------------------------------
// RR-A.2 / RR-A.2b — portão de produção (§2(a)5, §13.2)
// ---------------------------------------------------------------------------

/** Scanner de teste que conta as chamadas: o portão vem ANTES do scanner. */
function countingScanner(): { scanner: { scan(): Promise<{ status: "clean" }> }; calls: () => number } {
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

/** Cliente S3 fingido: guarda cada comando e responde como o S3 (Put → {}, Get → corpo guardado). */
function fakeS3Client(options: { failWith?: unknown } = {}) {
  const commands: Array<{ name: string; input: Record<string, any> }> = [];
  const objects = new Map<string, Buffer>();
  return {
    commands,
    objects,
    async send(command: { constructor: { name: string }; input: Record<string, any> }): Promise<any> {
      commands.push({ name: command.constructor.name, input: command.input });
      if (options.failWith) throw options.failWith;
      if (command.constructor.name === "PutObjectCommand") {
        objects.set(String(command.input.Key), Buffer.from(command.input.Body));
        return {};
      }
      if (command.constructor.name === "GetObjectCommand") {
        const body = objects.get(String(command.input.Key));
        if (!body) throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
        return { Body: body, ContentLength: body.length };
      }
      return {};
    },
  };
}

async function storageModules() {
  const [receipt, local, s3, { env }] = await Promise.all([
    import("../src/modules/expense-management/expense-receipt.service.js"),
    import("../src/modules/checklists/storage/local-checklist-storage.provider.js"),
    import("../src/modules/checklists/storage/s3-checklist-storage.provider.js"),
    import("../src/config/env.js"),
  ]);
  return { receipt, local, s3, prefix: env.CHECKLIST_STORAGE_S3_PREFIX };
}

async function countReceiptRows(tenantId: string): Promise<number> {
  const repository = await memoryRepositoryForTests();
  return [...(repository.expenseReceipts as Map<string, { tenantId: string }>).values()].filter((row) => row.tenantId === tenantId).length;
}

test("RR-A.2 portão de produção: `production` com provedor `local` (ou `s3` sem bucket) → 503 receipt_storage_unavailable antes do scanner e da gravação (0 objeto, 0 linha)", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { receipt, local, s3, prefix } = await storageModules();
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x2a);
    const digest = await sha256Hex(bytes);

    // (1) production + local: recusado mesmo com diretório declarado (o código não sabe se há volume montado).
    const localRoot = mkdtempSync(path.join(os.tmpdir(), "rdvc1-gate-local-"));
    try {
      const counter = countingScanner();
      receipt.configureExpenseReceiptScannerForTests(counter.scanner as any);
      receipt.configureExpenseReceiptStorageForTests({ provider: new local.LocalChecklistStorageProvider(localRoot), nodeEnv: "production" } as any);
      const refused = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rra2-local", bytes, sha256: digest }));
      assert.equal(refused.status, 503, `production + local: ${JSON.stringify(refused.body)}`);
      assert.equal(refused.body.error?.reason, "receipt_storage_unavailable");
      assert.equal(counter.calls(), 0, "o scanner rodou antes do portão");
      assert.equal(listFilesRecursive(localRoot).length, 0, "o portão deixou gravar um objeto");
      assert.equal(await countReceiptRows(seed.tenantA.id), 0, "o portão deixou gravar uma linha");
    } finally {
      await receipt.resetExpenseReceiptRuntimeForTests();
      rmSync(localRoot, { recursive: true, force: true });
    }

    // (2) production + s3 SEM bucket.
    const s3Config = { bucket: "", region: "us-east-1", endpoint: "https://s3.us-east-1.amazonaws.com", forcePathStyle: true, prefix };
    const client = fakeS3Client();
    const counter = countingScanner();
    receipt.configureExpenseReceiptScannerForTests(counter.scanner as any);
    receipt.configureExpenseReceiptStorageForTests({ provider: new s3.S3ChecklistStorageProvider(s3Config, client as any), nodeEnv: "production", s3: s3Config } as any);
    const noBucket = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rra2-s3-sem-bucket", bytes, sha256: digest }));
    assert.equal(noBucket.status, 503, `production + s3 sem bucket: ${JSON.stringify(noBucket.body)}`);
    assert.equal(noBucket.body.error?.reason, "receipt_storage_unavailable");
    assert.equal(counter.calls(), 0, "o scanner rodou antes do portão");
    assert.equal(client.commands.length, 0, "o portão deixou chegar comando ao S3");
    assert.equal(await countReceiptRows(seed.tenantA.id), 0, "o portão deixou gravar uma linha");
  });
});

test("RR-A.2b portão de produção só aceita o endpoint EXPLÍCITO regional da AWS (§13.2): 13 formas recusadas com 503 e 0 PutObject; o endpoint regional aceito com path-style e virtual-host", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { receipt, s3, prefix } = await storageModules();
    const refusedItem = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x2b);
    const digest = await sha256Hex(bytes);

    const refused: Array<{ endpoint: string; forcePathStyle: boolean; region?: string }> = [
      { endpoint: "http://127.0.0.1:9000", forcePathStyle: true }, //                           1 — o caso do crítico
      { endpoint: "", forcePathStyle: true }, //                                                  2
      { endpoint: "", forcePathStyle: false }, //                                                 3
      { endpoint: "https://[::1]:9000", forcePathStyle: true }, //                                4
      { endpoint: "https://169.254.169.254", forcePathStyle: true }, //                           5
      { endpoint: "https://10.0.0.5", forcePathStyle: true }, //                                  6
      { endpoint: "https://172.16.0.5", forcePathStyle: true }, //                                7
      { endpoint: "https://192.168.0.5", forcePathStyle: true }, //                               8
      { endpoint: "http://s3.us-east-1.amazonaws.com", forcePathStyle: true }, //                 9
      { endpoint: "https://localtest.me", forcePathStyle: true }, //                             10
      { endpoint: "https://s3.us-east-1.amazonaws.com.localtest.me", forcePathStyle: true }, //  11
      { endpoint: "https://s3.us-east-1.amazonaws.com@127.0.0.1", forcePathStyle: true }, //     12
      { endpoint: "https://s3.sa-east-1.amazonaws.com", forcePathStyle: true, region: "us-east-1" }, // 13
    ];
    for (const [index, form] of refused.entries()) {
      const caseNumber = index + 1;
      const s3Config = { bucket: "erp", region: form.region ?? "us-east-1", endpoint: form.endpoint, forcePathStyle: form.forcePathStyle, prefix };
      const client = fakeS3Client();
      const counter = countingScanner();
      receipt.configureExpenseReceiptScannerForTests(counter.scanner as any);
      receipt.configureExpenseReceiptStorageForTests({ provider: new s3.S3ChecklistStorageProvider(s3Config, client as any), nodeEnv: "production", s3: s3Config } as any);
      const response = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", refusedItem.reportId, refusedItem.itemId, receiptForm({ clientActionId: `rra2b-recusa-${caseNumber}`, bytes, sha256: digest }));
      assert.equal(response.status, 503, `caso ${caseNumber} (${form.endpoint || "vazio"}): ${JSON.stringify(response.body)}`);
      assert.equal(response.body.error?.reason, "receipt_storage_unavailable", `caso ${caseNumber}`);
      assert.equal(client.commands.filter((command) => command.name === "PutObjectCommand").length, 0, `caso ${caseNumber}: PutObject saiu`);
      assert.equal(counter.calls(), 0, `caso ${caseNumber}: o scanner rodou antes do portão`);
      assert.equal(await countReceiptRows(seed.tenantA.id), 0, `caso ${caseNumber}: linha gravada`);
      if (form.endpoint) assert.ok(!JSON.stringify(response.body).includes(form.endpoint), `caso ${caseNumber}: o corpo expõe o endpoint`);
    }

    // Aceitos: o endpoint regional explícito da região configurada, com path-style (14) e virtual-host (15).
    for (const [index, forcePathStyle] of [true, false].entries()) {
      const caseNumber = 14 + index;
      const accepted = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
      const s3Config = { bucket: "erp", region: "us-east-1", endpoint: "https://s3.us-east-1.amazonaws.com", forcePathStyle, prefix };
      const client = fakeS3Client();
      receipt.configureExpenseReceiptScannerForTests(countingScanner().scanner as any);
      receipt.configureExpenseReceiptStorageForTests({ provider: new s3.S3ChecklistStorageProvider(s3Config, client as any), nodeEnv: "production", s3: s3Config } as any);
      const response = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", accepted.reportId, accepted.itemId, receiptForm({ clientActionId: `rra2b-aceito-${caseNumber}`, bytes, sha256: digest }));
      assert.equal(response.status, 201, `caso ${caseNumber} (forcePathStyle=${forcePathStyle}): ${JSON.stringify(response.body)}`);
      assert.equal(client.commands.filter((command) => command.name === "PutObjectCommand").length, 1, `caso ${caseNumber}: esperado 1 PutObject`);
    }
  });
});

// ---------------------------------------------------------------------------
// RR-A.3 — S3 pela classe da D-014, escrita E leitura pelo mesmo resolvedor (§2(a), §12.3, §13.2 item 7)
// ---------------------------------------------------------------------------

test("RR-A.3 S3 pela classe da D-014: `production` + s3 completo → 201 com 1 PutObject na chave `<prefixo>/<org>/expense-receipt-<rep>/<uuid>-comprovante.jpg`; `file_key = s3:<Key>`; o /file faz GetObject na mesma Key e devolve os bytes; nada de `s3:`, Key, bucket nem prefixo nas respostas", async () => {
  await withReceiptApi(async ({ baseUrl, seed }) => {
    const { receipt, s3, prefix } = await storageModules();
    assert.ok(prefix, "o prefixo do S3 do env está vazio: o teste precisa do prefixo que o assertStorageKeyWithinTenant lê");
    const { reportId, itemId } = await createReportWithItem(baseUrl, seed.tenantA, seed.technicianA, "technician");
    const bytes = jpegBytes(0x3a);
    const digest = await sha256Hex(bytes);

    const bucket = "rdvc1-bucket-comprovante";
    const s3Config = { bucket, region: "sa-east-1", endpoint: "https://s3.sa-east-1.amazonaws.com", forcePathStyle: true, prefix };
    const client = fakeS3Client();
    receipt.configureExpenseReceiptScannerForTests(countingScanner().scanner as any);
    receipt.configureExpenseReceiptStorageForTests({ provider: new s3.S3ChecklistStorageProvider(s3Config, client as any), nodeEnv: "production", s3: s3Config } as any);

    const upload = await postReceipt(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId, receiptForm({ clientActionId: "rra3-s3", bytes, sha256: digest }));
    assert.equal(upload.status, 201, JSON.stringify(upload.body));

    const puts = client.commands.filter((command) => command.name === "PutObjectCommand");
    assert.equal(puts.length, 1, "esperado 1 PutObjectCommand");
    const key = String(puts[0].input.Key);
    const keyPattern = new RegExp(`^${prefix}/${seed.tenantA.id}/expense-receipt-${reportId}/[0-9a-f-]{36}-comprovante\\.jpg$`);
    assert.match(key, keyPattern, "Key do PutObject fora do padrão da D-014");
    assert.equal(puts[0].input.Bucket, bucket);
    assert.equal(puts[0].input.ChecksumSHA256, Buffer.from(digest, "hex").toString("base64"), "ChecksumSHA256 não é o do arquivo");

    const repository = await memoryRepositoryForTests();
    const row = await repository.findLatestStoredExpenseReceipt({ tenantId: seed.tenantA.id, itemId });
    assert.equal(row?.fileKey, `s3:${key}`, "file_key não é s3:<Key>");

    // A leitura passa pelo MESMO resolvedor da escrita: o GetObject cai no cliente fingido, na mesma Key.
    const download = await getReceiptFile(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId, itemId);
    assert.equal(download.status, 200, `o /file não serviu: ${download.bytes.toString("utf8")}`);
    assert.equal(await sha256Hex(download.bytes), digest);
    const gets = client.commands.filter((command) => command.name === "GetObjectCommand");
    assert.equal(gets.length, 1, "esperado 1 GetObjectCommand no cliente fingido");
    assert.equal(String(gets[0].input.Key), key);

    // Allowlist §2.8: nenhuma resposta pública traz o provedor, a chave, o bucket nem o prefixo.
    const detail = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}/items/${itemId}/receipt`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const detailBody = await readJson(detail);
    assert.equal(detail.status, 200, JSON.stringify(detailBody));
    for (const body of [JSON.stringify(upload.body), JSON.stringify(detailBody)]) {
      for (const secret of ["s3:", key, bucket, prefix]) {
        assert.ok(!body.includes(secret), `resposta pública expõe ${secret}: ${body}`);
      }
    }
  });
});
