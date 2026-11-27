/**
 * B-EVIDENCIA-DURAVEL — a foto do app de campo no armazenamento durável da D-014 (plano §3.1–§3.6, §6.2 e
 * Emenda 1 §E1.2), pela ROTA real em memória (`POST /api/v1/mobile/evidence-uploads`).
 *
 * O defeito (`P-UPLOAD-ARMAZENAMENTO-EFEMERO`, GRAVE): a foto ia para o diretório temporário do servidor e sumia no
 * reinício, depois de o servidor responder `stored` e o app apagar a cópia dele (regra do B-108). O conserto manda a
 * foto para o MESMO provedor dos anexos de OS, com a organização do ATOR no primeiro segmento da chave, e só responde
 * `stored` depois de o provedor confirmar.
 *
 * O S3 é o do repositório: `new S3ChecklistStorageProvider(config, clienteFingido)`; o cliente fingido é cópia do
 * `fakeS3Client` do #525 (`tests/b-rdv-comprovante-receipt-storage.test.ts`), que guarda cada comando e os bytes.
 * Nenhum serviço externo.
 *
 * ORDEM: o E15 e o E16 vêm PRIMEIRO de propósito. Eles medem o caminho SEM costura de teste (o provedor resolvido pelo
 * `env`), e a costura é estado de módulo que fica configurada depois de um teste a configurar (o `reset` mantém a
 * costura — nota do orquestrador "o reset dos testes MANTÉM a costura (P-DEV-1 do dev)" no plano do bloco).
 *
 * Repositório público: organizações "Organização Teste A/B", e-mails `@example.com`, bucket `erp-teste-evidencia`, a
 * conta de exemplo `123456789012` no ARN do teste de falha (como o #525).
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import { JPEG_BYTES, PNG_BYTES } from "./helpers/upload-fixtures.js";

// O provedor `local` da D-014 numa pasta PRÓPRIA deste arquivo ("a pasta padrão"). As variáveis entram antes do 1º
// import de `src/` (todos os imports de `src/` deste arquivo são dinâmicos), porque `src/config/env.ts` congela no import.
const DEFAULT_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "evdur-d014-"));
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.CHECKLIST_STORAGE_PROVIDER = "local";
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DEFAULT_STORAGE_DIR;
// S3 NÃO configurado no env deste arquivo: o S3 de cada caso vem pela costura, com o cliente fingido.
process.env.CHECKLIST_STORAGE_S3_BUCKET = "";
process.env.CHECKLIST_STORAGE_S3_REGION = "";
after(() => rmSync(DEFAULT_STORAGE_DIR, { recursive: true, force: true }));

const BUCKET = "erp-teste-evidencia";
const REGION = "us-east-1";
const ENDPOINT = "https://s3.us-east-1.amazonaws.com";
/** O nome que o cliente põe no multipart. Nunca é guardado (§3.1). */
const CLIENT_FILE_NAME = "foto-original-do-cliente.jpg";
/** O nome que o app declara no metadado sincronizado. Também não vai para o objeto. */
const SYNCED_FILE_NAME = "nome-sincronizado-pelo-app.jpg";
/** A pasta que o defeito usava (`os.tmpdir()/erp-mobile-evidence-uploads`). */
const LEGACY_TMP_DIR = path.join(os.tmpdir(), "erp-mobile-evidence-uploads");

// ── utilitários ──────────────────────────────────────────────────────────────────────────────────────────────

function sha256Hex(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A regra de saneamento de segmento do §3.1, copiada para o teste (a fonte é `mobile-evidence-upload.ts`). */
function sanitize(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? (entry as { path: string }).path, entry.name))
    .sort();
}

/** `null` quando a pasta não existe; senão, a lista ordenada dos arquivos (caminho relativo). */
function snapshotFiles(root: string): string[] | null {
  if (!existsSync(root)) return null;
  return listFilesRecursive(root).map((file) => path.relative(root, file));
}

/**
 * Limpa só o que o caso criou na pasta antiga do defeito (na base, a foto ia para lá): os arquivos novos e, se a pasta
 * não existia antes, ela mesma quando não sobrar arquivo. Nunca apaga arquivo que já estava lá (o id de organização em
 * memória é sequencial, `ten_000001`, então a subpasta da organização não é exclusiva deste caso).
 */
function cleanupLegacyCreated(before: string[] | null): void {
  const current = snapshotFiles(LEGACY_TMP_DIR);
  if (current === null) return;
  for (const file of current) {
    if (!(before ?? []).includes(file)) rmSync(path.join(LEGACY_TMP_DIR, file), { force: true });
  }
  if (before === null && listFilesRecursive(LEGACY_TMP_DIR).length === 0) {
    rmSync(LEGACY_TMP_DIR, { recursive: true, force: true });
  }
}

/** Os dois jeitos de um texto aparecer num JSON serializado: cru e escapado (barra invertida do Windows). */
function leaks(serialized: string, secret: string): boolean {
  if (!secret) return false;
  return serialized.includes(secret) || serialized.includes(JSON.stringify(secret).slice(1, -1));
}

/** Cliente S3 fingido — cópia do `fakeS3Client` do #525: guarda cada comando e responde como o S3. */
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

type FakeS3 = ReturnType<typeof fakeS3Client>;

function puts(client: FakeS3): Array<{ name: string; input: Record<string, any> }> {
  return client.commands.filter((command) => command.name === "PutObjectCommand");
}

/** Scanner de teste que conta as chamadas e responde `clean`: o portão de armazenamento vem ANTES do scanner. */
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

async function loadModules() {
  const [upload, evidence, s3, local, keyScope, { env }] = await Promise.all([
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/evidence/evidence-storage.js"),
    import("../src/modules/checklists/storage/s3-checklist-storage.provider.js"),
    import("../src/modules/checklists/storage/local-checklist-storage.provider.js"),
    import("../src/modules/evidence/storage-key-scope.js"),
    import("../src/config/env.js"),
  ]);
  return { upload, evidence, s3, local, keyScope, prefix: env.CHECKLIST_STORAGE_S3_PREFIX };
}

type Modules = Awaited<ReturnType<typeof loadModules>>;

function durableS3Config(prefix: string, overrides: Record<string, unknown> = {}) {
  return { bucket: BUCKET, region: REGION, endpoint: ENDPOINT, forcePathStyle: true, prefix, ...overrides };
}

/** A costura do S3 em produção, no formato do comprovante do #525: `{ provider, nodeEnv, s3 }`. */
function configureS3(m: Modules, config: ReturnType<typeof durableS3Config>, client: FakeS3): void {
  m.upload.configureMobileEvidenceUploadStorageForTests({
    provider: new m.s3.S3ChecklistStorageProvider(config as any, client as any),
    nodeEnv: "production",
    s3: config,
  } as any);
}

// ── arnês: a API real em memória, duas organizações e um usuário de campo em cada ─────────────────────────────────

type Seed = { tenantA: Tenant; tenantB: Tenant; userA: User; userB: User };
type Ctx = { baseUrl: string; seed: Seed };

/**
 * O arnês zera a trilha e o scanner pelas funções de origem, e NÃO chama o `resetMobileEvidenceUploadRuntimeForTests`:
 * o `reset` do módulo é o OBJETO do E16, e cada caso cuida da própria raiz de teste (`finally`). Assim, o que fica
 * vermelho num caso é o comportamento dele, nunca a limpeza do caso anterior.
 */
async function withEvidenceApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }, workOrders, evidenceSync, evidence, scannerFactory] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/work-orders/index.js"),
      import("../src/modules/mobile/mobile-evidence-sync.js"),
      import("../src/modules/evidence/evidence-storage.js"),
      import("../src/modules/evidence/evidence-scanner.factory.js"),
    ]);

  workOrders.resetWorkOrderRuntimeForTests();
  evidenceSync.resetMobileEvidenceSyncRuntimeForTests();
  evidence.resetEvidenceAuditEventsForTests();
  scannerFactory.resetEvidenceScannerForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const modules = ["dashboard", "mobile", "work_orders", "field_operations"];
  const tenantA = core.createTenant({ name: "Organização Teste A", modules });
  const tenantB = core.createTenant({ name: "Organização Teste B", modules });
  const userA = core.createUser({ tenantId: tenantA.id, name: "Usuário de Campo A", email: "campo-a@example.com", roles: ["tenant_admin"] });
  const userB = core.createUser({ tenantId: tenantB.id, name: "Usuário de Campo B", email: "campo-b@example.com", roles: ["tenant_admin"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await new Promise<string>((resolve) => {
    server.once("listening", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });

  // A 1ª falha é a que se reporta (a do teste, não a da limpeza); e o servidor fecha mesmo se a limpeza falhar.
  let failure: unknown;
  try {
    await callback({ baseUrl, seed: { tenantA, tenantB, userA, userB } });
  } catch (error) {
    failure = error;
  }
  try {
    evidence.resetEvidenceAuditEventsForTests();
    scannerFactory.resetEvidenceScannerForTests();
    evidenceSync.resetMobileEvidenceSyncRuntimeForTests();
    workOrders.resetWorkOrderRuntimeForTests();
  } catch (error) {
    failure ??= error;
  } finally {
    await new Promise<void>((resolve, reject) => (server as Server).close((error) => (error ? reject(error) : resolve())));
  }
  if (failure !== undefined) throw failure;
}

function headersFor(tenant: Tenant, user: User): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": "tenant_admin" };
}

async function requestJson(ctx: Ctx, routePath: string, init: { method: string; headers: Record<string, string>; body: unknown }) {
  const response = await fetch(`${ctx.baseUrl}${routePath}`, {
    method: init.method,
    headers: { "content-type": "application/json", ...init.headers },
    body: JSON.stringify(init.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, any>) : {} };
}

async function createWorkOrder(ctx: Ctx, tenant: Tenant, user: User): Promise<string> {
  const created = await requestJson(ctx, "/api/v1/work-orders", {
    method: "POST",
    headers: headersFor(tenant, user),
    body: { title: "OS de teste da evidência durável" },
  });
  assert.equal(created.status, 201, `setup createWorkOrder: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

function photoAction(clientEvidenceId: string, type: string, bytes: Buffer, mimeType: string, workOrderId?: string) {
  return {
    client_evidence_id: clientEvidenceId,
    type,
    local_created_at: "2026-11-27T12:00:00.000Z",
    payload: {
      ...(workOrderId === undefined ? {} : { work_order_id: workOrderId }),
      kind: "photo",
      file_name: SYNCED_FILE_NAME,
      content_type: mimeType,
      size_bytes: bytes.length,
      sha256: sha256Hex(bytes),
    },
  };
}

async function syncEvidence(ctx: Ctx, tenant: Tenant, user: User, action: ReturnType<typeof photoAction>): Promise<string> {
  const response = await requestJson(ctx, "/api/v1/mobile/sync/evidence-actions", {
    method: "POST",
    headers: headersFor(tenant, user),
    body: { client_batch_id: `evdur-lote-${action.client_evidence_id}`, actions: [action] },
  });
  assert.equal(response.status, 200, `setup sync: ${JSON.stringify(response.body)}`);
  const accepted = (response.body.data?.accepted ?? []) as Array<{ evidence_id: string }>;
  assert.equal(accepted.length, 1, `setup sync: metadado não aceito: ${JSON.stringify(response.body)}`);
  return accepted[0].evidence_id;
}

/** Metadado de foto DA OS (escopo `work_order`) sincronizado, com uma OS real da organização. */
async function prepareWorkOrderEvidence(ctx: Ctx, tenant: Tenant, user: User, clientEvidenceId: string, bytes: Buffer, mimeType = "image/jpeg") {
  const workOrderId = await createWorkOrder(ctx, tenant, user);
  const evidenceId = await syncEvidence(ctx, tenant, user, photoAction(clientEvidenceId, "evidence.work_order_photo", bytes, mimeType, workOrderId));
  return { workOrderId, evidenceId, clientEvidenceId };
}

/** Metadado de foto de CAMPO (escopo `field`), com ou sem um `work_order_id` (rótulo livre) no metadado. */
async function prepareFieldEvidence(ctx: Ctx, tenant: Tenant, user: User, clientEvidenceId: string, bytes: Buffer, label?: string) {
  const evidenceId = await syncEvidence(ctx, tenant, user, photoAction(clientEvidenceId, "evidence.field_photo", bytes, "image/jpeg", label));
  return { evidenceId, clientEvidenceId };
}

async function postEvidence(
  ctx: Ctx,
  tenant: Tenant,
  user: User,
  input: {
    readonly evidenceId: string;
    readonly clientEvidenceId: string;
    readonly bytes: Buffer;
    readonly mimeType?: string;
    readonly fileName?: string;
    readonly extraFields?: Record<string, string>;
  },
) {
  const mimeType = input.mimeType ?? "image/jpeg";
  const form = new FormData();
  for (const [key, value] of Object.entries(input.extraFields ?? {})) form.append(key, value);
  form.append("evidence_id", input.evidenceId);
  form.append("client_evidence_id", input.clientEvidenceId);
  form.append("sha256", sha256Hex(input.bytes));
  form.append("size_bytes", String(input.bytes.length));
  form.append("content_type", mimeType);
  form.append("file", new Blob([input.bytes], { type: mimeType }), input.fileName ?? CLIENT_FILE_NAME);
  const response = await fetch(`${ctx.baseUrl}/api/v1/mobile/evidence-uploads`, {
    method: "POST",
    headers: headersFor(tenant, user),
    body: form,
  });
  const text = await response.text();
  return { status: response.status, text, body: text ? (JSON.parse(text) as Record<string, any>) : {} };
}

function expectedKeyPattern(prefix: string, tenantId: string, segment: string, userId: string, clientEvidenceId: string, extension: string): RegExp {
  const head = [prefix, tenantId, segment].filter(Boolean).map(escapeRegExp).join("/");
  return new RegExp(`^${head}/[0-9a-f-]{36}-u-${escapeRegExp(sanitize(userId))}--${escapeRegExp(sanitize(clientEvidenceId))}\\.${extension}$`);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E15 e E16 — o caminho SEM costura (primeiros do arquivo; ver o cabeçalho)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

test("E15 sem costura: o provedor vem do env (`local` numa pasta do teste, posta antes do 1º import de src/); o arquivo cai nessa pasta, e a pasta `erp-mobile-evidence-uploads` do diretório temporário do sistema não é criada", async () => {
  const legacyBefore = snapshotFiles(LEGACY_TMP_DIR);
  await withEvidenceApi(async (ctx) => {
    const { tenantA, userA } = ctx.seed;
    try {
      const bytes = JPEG_BYTES;
      const { workOrderId, evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e15-sem-costura", bytes);
      const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
      assert.equal(response.status, 201, response.text);
      assert.equal(response.body.data?.status, "stored");

      const files = listFilesRecursive(path.join(DEFAULT_STORAGE_DIR, tenantA.id, `mobile-evidence-wo-${sanitize(workOrderId)}`));
      assert.equal(files.length, 1, `esperado 1 arquivo na pasta do provedor do env; a pasta da organização tem: ${JSON.stringify(listFilesRecursive(path.join(DEFAULT_STORAGE_DIR, tenantA.id)))}`);
      assert.deepEqual(readFileSync(files[0]), bytes, "os bytes gravados não são os enviados");

      const legacyAfter = snapshotFiles(LEGACY_TMP_DIR);
      if (legacyBefore === null) {
        assert.equal(legacyAfter, null, "a pasta temporária antiga `erp-mobile-evidence-uploads` foi criada");
      } else {
        const created = (legacyAfter ?? []).filter((file) => !legacyBefore.includes(file));
        assert.deepEqual(created, [], "o envio gravou arquivo novo na pasta temporária antiga");
      }
    } finally {
      cleanupLegacyCreated(legacyBefore);
    }
  });
});

test("E16 segurança da limpeza: sem raiz de teste configurada, o reset não apaga o que o provedor padrão guardou (a evidência gravada pela rota e um sentinela de outra suíte); com raiz configurada, a raiz é apagada", async () => {
  const legacyBefore = snapshotFiles(LEGACY_TMP_DIR);
  try {
    await withEvidenceApi(async (ctx) => {
      const m = await loadModules();
      const { tenantA, userA } = ctx.seed;

      // Um arquivo de OUTRA suíte na pasta padrão do provedor (a pasta compartilhada dos anexos).
      const sentinel = path.join(DEFAULT_STORAGE_DIR, "outra-suite", "sentinela.bin");
      mkdirSync(path.dirname(sentinel), { recursive: true });
      writeFileSync(sentinel, "sentinela de outra suite");

      // A evidência gravada pela rota, SEM costura: vai para a pasta padrão do provedor.
      const bytes = JPEG_BYTES;
      const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e16-limpeza", bytes);
      const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
      assert.equal(response.status, 201, response.text);
      const stored = listFilesRecursive(path.join(DEFAULT_STORAGE_DIR, tenantA.id));
      assert.equal(stored.length, 1, "a evidência não foi gravada pelo provedor padrão");

      // (1) reset SEM raiz de teste configurada: nada é apagado.
      await m.upload.resetMobileEvidenceUploadRuntimeForTests();
      assert.ok(existsSync(sentinel), "o reset sem raiz configurada apagou arquivo de outra suíte");
      assert.ok(existsSync(stored[0]), "o reset sem raiz configurada apagou a evidência guardada pelo provedor padrão");

      // (2) reset COM raiz de teste configurada: a raiz é apagada, e só ela.
      const root = mkdtempSync(path.join(os.tmpdir(), "evdur-e16-raiz-"));
      writeFileSync(path.join(root, "arquivo-da-raiz.bin"), "x");
      try {
        m.upload.configureMobileEvidenceUploadStorageForTests(root);
        await m.upload.resetMobileEvidenceUploadRuntimeForTests();
        assert.equal(existsSync(root), false, "a raiz de teste configurada não foi apagada");
        assert.ok(existsSync(sentinel), "o reset da raiz configurada apagou arquivo fora dela");
        assert.ok(existsSync(stored[0]), "o reset da raiz configurada apagou a evidência fora dela");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  } finally {
    cleanupLegacyCreated(legacyBefore);
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E1 a E14, E17, E18
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

test("E1 provedor local numa raiz de teste: 201 stored e 1 arquivo em <raiz>/<orgA>/mobile-evidence-wo-<OS>/, com os bytes enviados", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const root = mkdtempSync(path.join(os.tmpdir(), "evdur-e1-"));
    try {
      m.upload.configureMobileEvidenceUploadStorageForTests(root);
      const bytes = JPEG_BYTES;
      const { workOrderId, evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e1-local", bytes);
      const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
      assert.equal(response.status, 201, response.text);
      assert.equal(response.body.data?.status, "stored");

      const files = listFilesRecursive(path.join(root, tenantA.id, `mobile-evidence-wo-${sanitize(workOrderId)}`));
      assert.equal(files.length, 1, `esperado 1 arquivo em <raiz>/<orgA>/mobile-evidence-wo-<OS>/; a raiz tem: ${JSON.stringify(listFilesRecursive(root).map((file) => path.relative(root, file)))}`);
      assert.deepEqual(readFileSync(files[0]), bytes);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test("E2 S3 fingido em produção com configuração durável: 201; exatamente 1 PutObjectCommand, na Key <prefixo>/<orgA>/mobile-evidence-wo-<OS>/<uuid>-u-<usuário>--<evidência>.jpg, no Bucket configurado, com o ChecksumSHA256 do arquivo e o ContentType verificado", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const bytes = JPEG_BYTES;
    const { workOrderId, evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e2-s3", bytes);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.data?.status, "stored");

    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    assert.match(
      String(sent[0].input.Key),
      expectedKeyPattern(m.prefix, tenantA.id, `mobile-evidence-wo-${sanitize(workOrderId)}`, userA.id, clientEvidenceId, "jpg"),
    );
    assert.equal(sent[0].input.Bucket, BUCKET);
    assert.equal(sent[0].input.ChecksumSHA256, Buffer.from(sha256Hex(bytes), "hex").toString("base64"));
    assert.equal(sent[0].input.ContentType, "image/jpeg");
  });
});

test("E3 tenant-first: a Key gravada está dentro da organização A (isStorageKeyWithinTenant verdadeiro) e fora da B (falso)", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, tenantB, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const bytes = JPEG_BYTES;
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e3-tenant", bytes);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const storageKey = String(sent[0].input.Key);
    assert.equal(m.keyScope.isStorageKeyWithinTenant({ storageKey, tenantId: tenantA.id, provider: "s3" }), true);
    assert.equal(m.keyScope.isStorageKeyWithinTenant({ storageKey, tenantId: tenantB.id, provider: "s3" }), false);
  });
});

// Emenda 1 (intenção do §E1.2/§E1.3, MU7) e nota N-M2 do orquestrador: o formulário leva o `tenant_id` da
// organização B SEM `work_order_id` divergente, e o pedido CHEGA ao `save`. O texto antigo do §6.2 ("tenant_id e
// work_order_id da organização B") bate no 409 `work_order_mismatch` antes de gravar — esse caso é o E17. Molde dos
// dois pedidos separados: `tests/mobile-backend-contracts.test.ts` (`tenantSpoof` à parte do `workOrderMismatch`).
test("E4 tentativa de troca de organização: o formulário leva o tenant_id da organização B (sem work_order_id divergente); a Key gravada começa em <prefixo>/<orgA>/ e nenhum comando sai com a organização B", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, tenantB, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const bytes = JPEG_BYTES;
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e4-troca", bytes);
    const response = await postEvidence(ctx, tenantA, userA, {
      evidenceId,
      clientEvidenceId,
      bytes,
      extraFields: { tenant_id: tenantB.id },
    });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    assert.ok(
      String(sent[0].input.Key).startsWith(`${m.prefix}/${tenantA.id}/`),
      `a Key não começa na organização do ator: ${String(sent[0].input.Key)}`,
    );
    for (const command of client.commands) {
      const serialized = JSON.stringify({ Key: command.input.Key, Bucket: command.input.Bucket, Metadata: command.input.Metadata });
      assert.ok(!serialized.includes(tenantB.id), `comando ${command.name} sai com a organização B: ${serialized}`);
    }
  });
});

test("E5 as duas organizações mandam o MESMO client_evidence_id: 2 objetos, um sob cada organização, nenhum sobrescrito", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, tenantB, userA, userB } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const sameClientEvidenceId = "evdur-e5-mesmo-id";

    const fromA = await prepareWorkOrderEvidence(ctx, tenantA, userA, sameClientEvidenceId, JPEG_BYTES);
    const responseA = await postEvidence(ctx, tenantA, userA, { evidenceId: fromA.evidenceId, clientEvidenceId: sameClientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(responseA.status, 201, responseA.text);

    const fromB = await prepareWorkOrderEvidence(ctx, tenantB, userB, sameClientEvidenceId, PNG_BYTES, "image/png");
    const responseB = await postEvidence(ctx, tenantB, userB, { evidenceId: fromB.evidenceId, clientEvidenceId: sameClientEvidenceId, bytes: PNG_BYTES, mimeType: "image/png" });
    assert.equal(responseB.status, 201, responseB.text);

    const sent = puts(client);
    assert.equal(sent.length, 2, "esperados 2 PutObjectCommand");
    const keyA = sent.map((command) => String(command.input.Key)).find((key) => key.startsWith(`${m.prefix}/${tenantA.id}/`));
    const keyB = sent.map((command) => String(command.input.Key)).find((key) => key.startsWith(`${m.prefix}/${tenantB.id}/`));
    assert.ok(keyA, "nenhum objeto sob a organização A");
    assert.ok(keyB, "nenhum objeto sob a organização B");
    assert.equal(client.objects.size, 2, "um objeto sobrescreveu o outro");
    assert.deepEqual(client.objects.get(keyA), JPEG_BYTES);
    assert.deepEqual(client.objects.get(keyB), PNG_BYTES);
  });
});

test("E6a recibo de escopo `field` SEM work_order_id; o formulário leva o id de uma OS que existe: 201, segmento mobile-evidence-field, e o id do formulário não aparece na Key", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const existingWorkOrderId = await createWorkOrder(ctx, tenantA, userA);
    const bytes = JPEG_BYTES;
    const { evidenceId, clientEvidenceId } = await prepareFieldEvidence(ctx, tenantA, userA, "evdur-e6a-campo", bytes);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes, extraFields: { work_order_id: existingWorkOrderId } });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const key = String(sent[0].input.Key);
    assert.match(key, expectedKeyPattern(m.prefix, tenantA.id, "mobile-evidence-field", userA.id, clientEvidenceId, "jpg"));
    assert.ok(!key.includes(existingWorkOrderId) && !key.includes(sanitize(existingWorkOrderId)), `o id da OS do formulário entrou na Key: ${key}`);
  });
});

test("E6b recibo de escopo `field` COM work_order_id no metadado (rótulo livre); o formulário não leva work_order_id: 201, segmento mobile-evidence-field, e o rótulo não aparece na Key", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const label = "rotulo-livre-os-777";
    const bytes = JPEG_BYTES;
    const { evidenceId, clientEvidenceId } = await prepareFieldEvidence(ctx, tenantA, userA, "evdur-e6b-campo", bytes, label);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const key = String(sent[0].input.Key);
    assert.match(key, expectedKeyPattern(m.prefix, tenantA.id, "mobile-evidence-field", userA.id, clientEvidenceId, "jpg"));
    assert.ok(!key.includes(label), `o rótulo livre do metadado entrou na Key: ${key}`);
  });
});

test("E7 antivírus ANTES da gravação: infectado → 422, antivírus fora → 503 evidence_scan_failed, tipo que não confere → 415; 0 PutObjectCommand nos 3 (controle no mesmo S3: o arquivo limpo grava 1)", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e7-antivirus", JPEG_BYTES);

    m.upload.configureMobileEvidenceUploadScannerForTests(new m.evidence.FakeEvidenceScanner({ status: "infected" }));
    const infected = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(infected.status, 422, infected.text);
    assert.equal(infected.body.error?.reason, "evidence_rejected");

    m.upload.configureMobileEvidenceUploadScannerForTests(new m.evidence.FakeEvidenceScanner({ status: "failed" }));
    const scannerDown = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(scannerDown.status, 503, scannerDown.text);
    assert.equal(scannerDown.body.error?.reason, "evidence_scan_failed");

    m.upload.configureMobileEvidenceUploadScannerForTests(new m.evidence.FakeEvidenceScanner({ status: "clean" }));
    // Bytes PNG declarados image/jpeg: o tipo não confere com a assinatura.
    const mismatch = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: PNG_BYTES, mimeType: "image/jpeg" });
    assert.equal(mismatch.status, 415, mismatch.text);

    assert.equal(puts(client).length, 0, "um envio recusado pelo antivírus ou pelo tipo chegou ao armazenamento");

    // Controle: o MESMO S3 fingido é o armazenamento ativo (sem isto, o 0 acima seria vazio).
    const clean = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(clean.status, 201, clean.text);
    assert.equal(puts(client).length, 1, "o arquivo limpo não gravou no S3 fingido");
  });
});

test("E8 portão por requisição em produção: provedor local; s3 sem bucket; endpoint vazio, http:// e host com sufixo → 503 evidence_storage_unavailable nos 5, 0 chamada ao antivírus, 0 arquivo e 0 comando", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e8-portao", JPEG_BYTES);

    // (1) produção + local: recusado mesmo com diretório declarado (o código não sabe se há volume montado).
    const localRoot = mkdtempSync(path.join(os.tmpdir(), "evdur-e8-local-"));
    try {
      const counter = countingScanner();
      m.upload.configureMobileEvidenceUploadScannerForTests(counter.scanner as any);
      m.upload.configureMobileEvidenceUploadStorageForTests({ provider: new m.local.LocalChecklistStorageProvider(localRoot), nodeEnv: "production" } as any);
      const refused = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(refused.status, 503, `produção + local: ${refused.text}`);
      assert.equal(refused.body.error?.reason, "evidence_storage_unavailable", "produção + local");
      assert.equal(counter.calls(), 0, "produção + local: o antivírus rodou antes do portão");
      assert.equal(listFilesRecursive(localRoot).length, 0, "produção + local: o portão deixou gravar");
    } finally {
      rmSync(localRoot, { recursive: true, force: true });
    }

    // (2) a (5) produção + s3 fora da forma durável.
    const s3Cases: Array<{ label: string; overrides: Record<string, unknown> }> = [
      { label: "s3 sem bucket", overrides: { bucket: "" } },
      { label: "endpoint vazio", overrides: { endpoint: "" } },
      { label: "endpoint http://s3.us-east-1.amazonaws.com", overrides: { endpoint: "http://s3.us-east-1.amazonaws.com" } },
      { label: "endpoint https://evil-s3.us-east-1.amazonaws.com", overrides: { endpoint: "https://evil-s3.us-east-1.amazonaws.com" } },
    ];
    for (const item of s3Cases) {
      const counter = countingScanner();
      const client = fakeS3Client();
      m.upload.configureMobileEvidenceUploadScannerForTests(counter.scanner as any);
      configureS3(m, durableS3Config(m.prefix, item.overrides), client);
      const refused = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      assert.equal(refused.status, 503, `${item.label}: ${refused.text}`);
      assert.equal(refused.body.error?.reason, "evidence_storage_unavailable", item.label);
      assert.equal(counter.calls(), 0, `${item.label}: o antivírus rodou antes do portão`);
      assert.equal(client.commands.length, 0, `${item.label}: o portão deixou chegar comando ao S3`);
    }
  });
});

test("E9 o S3 falha com a classe real S3ServiceException (acesso negado, com bucket, chave e ARN na mensagem): 503 evidence_storage_unavailable; o corpo não expõe bucket, ARN, chave, prefixo nem o nome do erro, e não diz `stored`; a trilha tem evidence.upload.storage_failed e não tem evidence.upload.stored", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { S3ServiceException } = await import("@aws-sdk/client-s3");
    const { tenantA, userA } = ctx.seed;
    const { workOrderId, evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e9-falha-s3", JPEG_BYTES);
    const deniedKey = `${m.prefix}/${tenantA.id}/mobile-evidence-wo-${workOrderId}/negado-u-x--y.jpg`;
    const accessDenied = new S3ServiceException({
      name: "AccessDenied",
      $fault: "client",
      $metadata: { httpStatusCode: 403 },
      message: `User: arn:aws:iam::123456789012:user/erp-app is not authorized to perform: s3:PutObject on resource: "arn:aws:s3:::${BUCKET}/${deniedKey}" because no identity-based policy allows the s3:PutObject action`,
    });
    configureS3(m, durableS3Config(m.prefix), fakeS3Client({ failWith: accessDenied }));

    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(response.status, 503, response.text);
    assert.equal(response.body.error?.reason, "evidence_storage_unavailable");
    for (const secret of [BUCKET, "arn:", deniedKey, m.prefix, "AccessDenied", "S3ServiceException", "123456789012"]) {
      assert.ok(!leaks(response.text, secret), `o corpo expõe ${secret}: ${response.text}`);
    }
    assert.ok(!response.text.includes("stored"), `o corpo da falha diz stored: ${response.text}`);

    const actions = m.upload.getMobileEvidenceUploadAuditEventsForTests().map((event) => event.action as string);
    assert.ok(actions.includes("evidence.upload.storage_failed"), `a trilha não registrou a falha do armazenamento: ${actions.join(", ")}`);
    assert.ok(!actions.includes("evidence.upload.stored"), "a trilha registrou `stored` sem o armazenamento confirmar");
  });
});

test("E10 o provedor local falha com caminho absoluto na mensagem: 503 evidence_storage_unavailable; o corpo não expõe o caminho nem a mensagem crua", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e10-falha-local", JPEG_BYTES);
    const secretPath = path.join(os.tmpdir(), "evdur-segredo", tenantA.id, "objeto.jpg");
    const failingLocal = {
      name: "local" as const,
      async save() {
        throw new Error(`EACCES: permission denied, open '${secretPath}'`);
      },
      async getObject() {
        throw new Error("não usado");
      },
      async deleteObject() {},
    };
    m.upload.configureMobileEvidenceUploadStorageForTests({ provider: failingLocal } as any);

    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(response.status, 503, response.text);
    assert.equal(response.body.error?.reason, "evidence_storage_unavailable");
    for (const secret of [secretPath, "evdur-segredo", "EACCES", "permission denied"]) {
      assert.ok(!leaks(response.text, secret), `o corpo expõe ${secret}: ${response.text}`);
    }
  });
});

test("E11 reenvio depois da falha do E9, com o provedor sadio: 201 stored (o recibo do metadado continua valendo; nada foi marcado como guardado antes)", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { S3ServiceException } = await import("@aws-sdk/client-s3");
    const { tenantA, userA } = ctx.seed;
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e11-reenvio", JPEG_BYTES);
    const accessDenied = new S3ServiceException({
      name: "AccessDenied",
      $fault: "client",
      $metadata: { httpStatusCode: 403 },
      message: "Access Denied",
    });

    configureS3(m, durableS3Config(m.prefix), fakeS3Client({ failWith: accessDenied }));
    const failed = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(failed.status, 503, failed.text);
    const before = m.upload.getMobileEvidenceUploadAuditEventsForTests().filter((event) => event.action === "evidence.upload.stored");
    assert.equal(before.length, 0, "a falha marcou a evidência como guardada");

    const healthy = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), healthy);
    const retried = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(retried.status, 201, retried.text);
    assert.equal(retried.body.data?.status, "stored");
    assert.equal(puts(healthy).length, 1, "o reenvio não gravou no provedor sadio");
  });
});

test("E12 file_id: casa com o formato de hoje (evfile_ + 32 hexadecimais) e é o resumo de `s3:<Key>`", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e12-file-id", JPEG_BYTES);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const fileId = String(response.body.data?.file_id);
    assert.match(fileId, /^evfile_[a-f0-9]{32}$/);
    assert.equal(fileId, `evfile_${sha256Hex(`s3:${String(sent[0].input.Key)}`).slice(0, 32)}`);
  });
});

test("E13 allowlist: o corpo do 201 e todos os eventos de trilha do envio não carregam bucket, Key, prefixo, s3://, local://, raiz nem o nome original do arquivo", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e13-allowlist", JPEG_BYTES);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES, fileName: CLIENT_FILE_NAME });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const events = m.upload.getMobileEvidenceUploadAuditEventsForTests();
    assert.ok(events.length >= 2, "a trilha do envio está vazia");

    const forbidden = [
      BUCKET,
      String(sent[0].input.Key),
      m.prefix,
      "s3://",
      "local://",
      DEFAULT_STORAGE_DIR,
      os.tmpdir(),
      "erp-mobile-evidence",
      CLIENT_FILE_NAME,
      SYNCED_FILE_NAME,
    ];
    for (const [label, serialized] of [["corpo do 201", response.text], ...events.map((event) => [`evento ${event.action}`, JSON.stringify(event)] as const)]) {
      for (const secret of forbidden) {
        assert.ok(!leaks(serialized, secret), `${label} expõe ${secret}: ${serialized}`);
      }
    }
  });
});

test("E14 o metadado do objeto no S3 (Metadata) não carrega o nome de arquivo que o cliente mandou", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    configureS3(m, durableS3Config(m.prefix), client);
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e14-metadata", JPEG_BYTES);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES, fileName: CLIENT_FILE_NAME });
    assert.equal(response.status, 201, response.text);
    const sent = puts(client);
    assert.equal(sent.length, 1, "esperado exatamente 1 PutObjectCommand");
    const metadata = JSON.stringify(sent[0].input.Metadata ?? {});
    const key = String(sent[0].input.Key);
    for (const clientName of [CLIENT_FILE_NAME, SYNCED_FILE_NAME]) {
      assert.ok(!metadata.includes(clientName), `o Metadata do objeto carrega o nome do cliente ${clientName}: ${metadata}`);
      assert.ok(!key.includes(clientName), `a Key carrega o nome do cliente ${clientName}: ${key}`);
    }
  });
});

test("E17 recibo de escopo work_order da OS X; o formulário leva a OS Y: 409 work_order_mismatch, 0 PutObjectCommand e 0 chamada ao antivírus (controle: o 409 já existe; o que se acrescenta é a contagem de 0 gravação)", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const client = fakeS3Client();
    const counter = countingScanner();
    configureS3(m, durableS3Config(m.prefix), client);
    m.upload.configureMobileEvidenceUploadScannerForTests(counter.scanner as any);
    const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e17-os-x", JPEG_BYTES);
    const otherWorkOrderId = await createWorkOrder(ctx, tenantA, userA);
    const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES, extraFields: { work_order_id: otherWorkOrderId } });
    assert.equal(response.status, 409, response.text);
    assert.equal(response.body.error?.reason, "work_order_mismatch");
    assert.equal(puts(client).length, 0, "a OS divergente chegou ao armazenamento");
    assert.equal(counter.calls(), 0, "a OS divergente chegou ao antivírus");
  });
});

test("E18 uploaded_at do 201: data ISO válida, não anterior ao envio nem posterior à resposta (controle: o campo já existe)", async () => {
  await withEvidenceApi(async (ctx) => {
    const m = await loadModules();
    const { tenantA, userA } = ctx.seed;
    const root = mkdtempSync(path.join(os.tmpdir(), "evdur-e18-"));
    try {
      m.upload.configureMobileEvidenceUploadStorageForTests(root);
      const { evidenceId, clientEvidenceId } = await prepareWorkOrderEvidence(ctx, tenantA, userA, "evdur-e18-uploaded-at", JPEG_BYTES);
      const sentAt = Date.now();
      const response = await postEvidence(ctx, tenantA, userA, { evidenceId, clientEvidenceId, bytes: JPEG_BYTES });
      const respondedAt = Date.now();
      assert.equal(response.status, 201, response.text);
      const uploadedAt = String(response.body.data?.uploaded_at);
      const parsed = Date.parse(uploadedAt);
      assert.ok(Number.isFinite(parsed), `uploaded_at não é data: ${uploadedAt}`);
      assert.equal(new Date(parsed).toISOString(), uploadedAt, "uploaded_at não está no formato ISO");
      assert.ok(parsed >= sentAt, `uploaded_at (${uploadedAt}) é anterior ao envio`);
      assert.ok(parsed <= respondedAt, `uploaded_at (${uploadedAt}) é posterior à resposta`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
