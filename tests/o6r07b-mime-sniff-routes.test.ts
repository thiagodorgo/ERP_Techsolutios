import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import {
  JPEG_BYTES,
  MZ_BYTES,
  PDF_BYTES,
  PNG_BYTES,
  SVG_BYTES,
  TRUNCATED_PNG_BYTES,
} from "./helpers/upload-fixtures.js";

// B-O6R-07b (Ω6R-SEC-004) · §6.1 do plano — aceites A1–A11 nas CINCO vias de ingresso de bytes.
//
// Cada caso roda contra a rota HTTP real, e "nada persistido" é asserido pelos DOIS lados sempre: o
// diretório do storage sem arquivo novo E o recurso sem linha nova.
//
// VERMELHO-CONTROLE na base `e55245a` (worktree próprio `o6r07b-base`, `npm ci` próprio): A1/A2/A4/A5
// devolvem **201** e gravam, porque não existe sniff nenhum; A6/A7 devolvem 201 em V4/V5 porque essas
// duas vias não têm scanner algum (nem Noop), e 201 em V1–V3 porque o default de módulo era Noop.
// MUTAÇÃO QUE DERRUBA TODOS: comentar a chamada a `verifyUploadContent` na via → volta 201.

const storagePath = path.join(os.tmpdir(), `erp-o6r07b-sniff-${process.pid}`);
const evidenceRoot = path.join(os.tmpdir(), `erp-o6r07b-evidence-${process.pid}`);

after(async () => {
  await rm(storagePath, { recursive: true, force: true }).catch(() => undefined);
  await rm(evidenceRoot, { recursive: true, force: true }).catch(() => undefined);
});

// ── A1/A2/A4: bytes que mentem sobre o tipo, nas 5 vias (15 casos) ────────────────────────────────

for (const via of ["V1", "V2", "V3", "V4", "V5"] as const) {
  test(`A1 [${via}] MZ (executável) declarado image/png → 415 e NADA persistido`, async () => {
    await withUploadApi(async (ctx) => {
      const target = await prepare(ctx, via);
      const before = await countStoredFiles(via);
      const response = await target.upload(MZ_BYTES, "image/png", "malware.png");
      assert.equal(response.status, 415, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "content_unrecognized");
      assert.equal(await countStoredFiles(via), before, "nenhum blob novo no storage");
      assert.equal(await target.count(), 0, "nenhuma linha nova no recurso");
    });
  });

  test(`A2 [${via}] bytes PNG válidos declarados image/jpeg → 415 content_type_mismatch e NADA persistido`, async () => {
    await withUploadApi(async (ctx) => {
      const target = await prepare(ctx, via);
      const before = await countStoredFiles(via);
      const response = await target.upload(PNG_BYTES, "image/jpeg", "mentira.jpg");
      assert.equal(response.status, 415, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "content_type_mismatch");
      assert.equal(await countStoredFiles(via), before);
      assert.equal(await target.count(), 0);
    });
  });

  test(`A4 [${via}] PNG truncado em 7 bytes → 415 content_unrecognized e NADA persistido`, async () => {
    await withUploadApi(async (ctx) => {
      const target = await prepare(ctx, via);
      const before = await countStoredFiles(via);
      const response = await target.upload(TRUNCATED_PNG_BYTES, "image/png", "truncado.png");
      assert.equal(response.status, 415, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "content_unrecognized");
      assert.equal(await countStoredFiles(via), before);
      assert.equal(await target.count(), 0);
    });
  });
}

// ── A3: o caso LIMPO continua passando, nas 5 vias (5 casos) ──────────────────────────────────────
// MUTAÇÃO: sniff devolvendo sempre `undefined` → o caso limpo vira 415 e estes 5 caem.

for (const via of ["V1", "V2", "V3", "V4", "V5"] as const) {
  test(`A3 [${via}] PNG válido declarado image/png → 201 com mime_type verificado`, async () => {
    await withUploadApi(async (ctx) => {
      const target = await prepare(ctx, via);
      const response = await target.upload(PNG_BYTES, "image/png", "foto.png");
      assert.equal(response.status, 201, JSON.stringify(response.body));
      assert.equal(target.storedMimeType(response.body), "image/png");
      assert.equal(await target.count(), 1);
    });
  });
}

// ── A5: a allowlist é DA VIA — o PDF separa V1 das irmãs (2 casos) ────────────────────────────────

test("A5.1 [V2] PDF válido declarado application/pdf → 201 (a allowlist da via inclui pdf)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V2");
    const response = await target.upload(PDF_BYTES, "application/pdf", "laudo.pdf");
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(target.storedMimeType(response.body), "application/pdf");
  });
});

test("A5.2 [V1] bytes PDF declarados image/jpeg → 415 (na base isto era 201: o declarado era permitido)", async () => {
  // O vermelho-controle está no DECLARADO: `content_type: image/jpeg` passa o `400
  // unsupported_content_type` da via, e na base `e55245a` os bytes nunca eram olhados → 201 `stored`.
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V1");
    const before = await countStoredFiles("V1");
    const response = await target.upload(PDF_BYTES, "image/jpeg", "laudo.jpg");
    assert.equal(response.status, 415, JSON.stringify(response.body));
    // `unsupported_media_type` e nao `content_type_mismatch`: a ordem do gate e (1) reconheco os bytes?
    // (2) a assinatura esta na allowlist DA VIA? (3) bate com o declarado? A assinatura PDF, que V1 nao
    // aceita, morre no (2) — e e exatamente o que o §6.1/A5 do plano descreve para esta via.
    assert.equal(response.body.error.reason, "unsupported_media_type");
    assert.equal(await countStoredFiles("V1"), before);
  });
});

test("A5.3 [V1] bytes PDF declarados application/pdf → 400 do MIME declarado (contrato vigente, roda antes)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V1");
    const response = await target.upload(PDF_BYTES, "application/pdf", "laudo.pdf");
    assert.equal(response.status, 400, JSON.stringify(response.body));
    assert.equal(response.body.error.reason, "unsupported_content_type");
  });
});

// ── A6: scanner `unavailable` → 503 da família da via, nas 5 vias (5 casos) ───────────────────────

for (const via of ["V1", "V2", "V3", "V4", "V5"] as const) {
  test(`A6 [${via}] scanner unavailable → 503 e NADA persistido`, async () => {
    await withUploadApi(async (ctx) => {
      const { UnavailableEvidenceScanner } = await import("../src/modules/evidence/evidence-storage.js");
      ctx.setScanner(new UnavailableEvidenceScanner());
      const target = await prepare(ctx, via);
      const before = await countStoredFiles(via);
      const response = await target.upload(PNG_BYTES, "image/png", "foto.png");
      assert.equal(response.status, 503, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, via === "V1" ? "evidence_scan_failed" : "scan_unavailable");
      assert.equal(await countStoredFiles(via), before);
      assert.equal(await target.count(), 0);
      if (via === "V1") {
        const { getMobileEvidenceUploadAuditEventsForTests } = await import(
          "../src/modules/mobile/mobile-evidence-upload.js"
        );
        const events = getMobileEvidenceUploadAuditEventsForTests();
        assert.ok(events.some((event) => event.action === "evidence.upload.scan_failed"));
      }
    });
  });
}

// ── A7: scanner `infected` nas duas vias que NÃO TINHAM scanner (2 casos) ─────────────────────────

for (const via of ["V4", "V5"] as const) {
  test(`A7 [${via}] scanner infected → 422 evidence_rejected e NADA persistido (esta via não tinha scan)`, async () => {
    await withUploadApi(async (ctx) => {
      const { FakeEvidenceScanner } = await import("../src/modules/evidence/evidence-storage.js");
      ctx.setScanner(new FakeEvidenceScanner({ status: "infected", reason: "eicar" }));
      const target = await prepare(ctx, via);
      const before = await countStoredFiles(via);
      const response = await target.upload(PNG_BYTES, "image/png", "foto.png");
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "evidence_rejected");
      assert.equal(await countStoredFiles(via), before, "nenhum órfão no storage");
      assert.equal(await target.count(), 0);
    });
  });
}

// ── A8–A10: a ORDEM dos gates não mudou ───────────────────────────────────────────────────────────
// MUTAÇÃO: mover o gate para antes da checagem de idempotência/recibo → estes viram 415.

test("A8 [V2] client_action_id duplicado + bytes MZ → 409 (idempotência ANTES do gate)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V2");
    const first = await target.upload(PNG_BYTES, "image/png", "foto.png", { clientActionId: "dup-1" });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const second = await target.upload(MZ_BYTES, "image/png", "malware.png", { clientActionId: "dup-1" });
    assert.equal(second.status, 409, JSON.stringify(second.body));
    assert.equal(second.body.error.reason, "already_uploaded");
  });
});

test("A9 [V1] recibo de sync ausente + bytes MZ → 409 evidence_metadata_required (recibo ANTES do gate)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V1");
    const response = await target.uploadUnsynced(MZ_BYTES, "image/png");
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(response.body.error.reason, "evidence_metadata_required");
  });
});

test("A10 [V1] sha/tamanho corretos + content_type jpeg + bytes PNG → 415 (o 400 do declarado NÃO dispara)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V1");
    const response = await target.upload(PNG_BYTES, "image/jpeg", "foto.jpg");
    assert.equal(response.status, 415, JSON.stringify(response.body));
    assert.equal(response.body.error.reason, "content_type_mismatch");
  });
});

// ── A11 (EMENDA E1·4) — ver a nota abaixo: o caso vive no nível do GATE ───────────────────

// A11 (a SEGUNDA camada: "svg na allowlist é entrada MORTA") vive em
// `tests/o6r07b-upload-gate.test.ts`, e não aqui, por uma razão medida: `readChecklistStorageConfig()`
// deriva a allowlist de `env`, cujo snapshot é CONGELADO no primeiro import de `src/config/env.ts`.
// Escrever `process.env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` depois do boot não move a allowlist
// efetiva: a versão em rota deste caso ficava verde pelo motivo ERRADO — era o PARSER recusando com o
// seu próprio `415 unsupported_media_type` (allowlist congelada, sem svg), e o gate nunca era
// alcançado. Verde-cego. No nível do gate a allowlist é parâmetro, então o caso mede o que promete.
//
// O que FICA aqui é o fato pré-existente correspondente, que também vale a pena afirmar:

test("A11-rota [V2] SVG declarado image/svg+xml → 415 do PARSER (allowlist efetiva não tem svg)", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V2");
    const before = await countStoredFiles("V2");
    const response = await target.upload(SVG_BYTES, "image/svg+xml", "logo.svg");
    assert.equal(response.status, 415, JSON.stringify(response.body));
    assert.equal(response.body.error.reason, "unsupported_media_type");
    assert.equal(await countStoredFiles("V2"), before);
    assert.equal(await target.count(), 0);
  });
});

test("A11-rota [V2] bytes SVG declarados image/png → 415 content_unrecognized (o gate, não o parser)", async () => {
  // Aqui o declarado PASSA no parser (image/png está na allowlist), então quem recusa é o gate, pelos
  // BYTES. É a prova em rota de que XML scriptable não entra nem se enfeitado com um tipo permitido.
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V2");
    const before = await countStoredFiles("V2");
    const response = await target.upload(SVG_BYTES, "image/png", "logo.png");
    assert.equal(response.status, 415, JSON.stringify(response.body));
    assert.equal(response.body.error.reason, "content_unrecognized");
    assert.equal(await countStoredFiles("V2"), before);
    assert.equal(await target.count(), 0);
  });
});

// ── um caso extra que fecha o mecanismo (2) do achado no que é GRAVADO ────────────────────────────

test("o mime_type GRAVADO é o verificado, não o declarado — JPEG declarado image/jpeg em V2", async () => {
  await withUploadApi(async (ctx) => {
    const target = await prepare(ctx, "V2");
    const response = await target.upload(JPEG_BYTES, "image/jpeg", "foto.jpg");
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(target.storedMimeType(response.body), "image/jpeg");
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════
//                                            harness
// ══════════════════════════════════════════════════════════════════════════════════════════════════

type Via = "V1" | "V2" | "V3" | "V4" | "V5";

type SeedData = { readonly tenantA: Tenant; readonly adminA: User };

type UploadApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly setScanner: (scanner: unknown) => void;
};

type UploadTarget = {
  upload(
    bytes: Buffer,
    declaredMimeType: string,
    fileName: string,
    options?: { readonly clientActionId?: string },
  ): Promise<{ status: number; body: any }>;
  uploadUnsynced(bytes: Buffer, declaredMimeType: string): Promise<{ status: number; body: any }>;
  count(): Promise<number>;
  storedMimeType(body: any): string | undefined;
};

async function withUploadApi(callback: (context: UploadApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.CHECKLIST_STORAGE_PROVIDER = "local";
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = storagePath;
  process.env.CHECKLIST_STORAGE_MAX_FILE_SIZE_MB = "10";
  process.env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

  await rm(storagePath, { recursive: true, force: true }).catch(() => undefined);
  await rm(evidenceRoot, { recursive: true, force: true }).catch(() => undefined);

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    scannerFactory,
    checklists,
    damages,
    vehicles,
    workOrders,
    workOrderAttachments,
    attachments,
    attachmentResolver,
    mobileEvidence,
    mobileSync,
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/evidence/evidence-scanner.factory.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/damages/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/work-orders/work-order-attachment.service.js"),
    import("../src/modules/attachments/attachment.service.js"),
    import("../src/modules/attachments/attachment-entity-resolver.js"),
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/mobile/mobile-evidence-sync.js"),
  ]);

  const resetAll = (): void => {
    scannerFactory.resetEvidenceScannerForTests();
    checklists.resetChecklistRuntimeForTests();
    checklists.resetChecklistStorageProviderForTests();
    damages.resetDamageRuntimeForTests();
    vehicles.resetVehicleRuntimeForTests();
    workOrders.resetWorkOrderRuntimeForTests();
    workOrderAttachments.resetWorkOrderAttachmentRuntimeForTests();
    attachments.resetAttachmentRuntimeForTests();
    attachmentResolver.resetAttachmentEntityResolverForTests();
    (mobileSync as { resetMobileEvidenceSyncStateForTests?: () => void }).resetMobileEvidenceSyncStateForTests?.();
  };

  resetAll();
  mobileEvidence.configureMobileEvidenceUploadStorageForTests(evidenceRoot);
  await mobileEvidence.resetMobileEvidenceUploadRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "O6R07b A", modules: ["dashboard", "work_orders"] });
  const adminA = core.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: `o6r07b-${randomSuffix()}@example.com`,
    roles: ["tenant_admin"],
  });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed: { tenantA, adminA },
      setScanner: (scanner) => scannerFactory.setEvidenceScannerForTests(scanner as never),
    });
  } finally {
    await closeServer(server);
    resetAll();
    await mobileEvidence.resetMobileEvidenceUploadRuntimeForTests();
  }
}

function headers(ctx: UploadApiContext, role = "tenant_admin"): Record<string, string> {
  return { "x-tenant-id": ctx.seed.tenantA.id, "x-user-id": ctx.seed.adminA.id, "x-role": role };
}

async function prepare(ctx: UploadApiContext, via: Via): Promise<UploadTarget> {
  if (via === "V1") return prepareV1(ctx);
  if (via === "V2") return prepareV2(ctx);
  if (via === "V3") return prepareV3(ctx);
  if (via === "V4") return prepareV4(ctx);
  return prepareV5(ctx);
}

// V1 — POST /api/v1/mobile/evidence-uploads (evidência mobile; exige recibo de sync antes).
async function prepareV1(ctx: UploadApiContext): Promise<UploadTarget> {
  const clientEvidenceId = `o6r07b-${randomSuffix()}`;
  const evidenceId = `evidence:${ctx.seed.tenantA.id}:${clientEvidenceId}`;
  let registered = false;

  const register = async (bytes: Buffer): Promise<void> => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const response = await requestJson(ctx.baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers: headers(ctx),
      body: {
        client_batch_id: `o6r07b-batch-${randomSuffix()}`,
        actions: [
          {
            client_evidence_id: clientEvidenceId,
            type: "evidence.work_order_photo",
            local_created_at: "2026-09-06T12:00:00.000Z",
            payload: {
              work_order_id: "wo-o6r07b-1",
              kind: "photo",
              file_name: "foto.png",
              content_type: "image/png",
              size_bytes: bytes.length,
              sha256,
            },
          },
        ],
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    registered = true;
  };

  const post = async (bytes: Buffer, declaredMimeType: string, clientId: string, evId: string) => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const form = new FormData();
    form.set("evidence_id", evId);
    form.set("client_evidence_id", clientId);
    form.set("sha256", sha256);
    form.set("size_bytes", String(bytes.length));
    form.set("content_type", declaredMimeType);
    form.set("file", new Blob([bytes], { type: declaredMimeType }), "foto.bin");
    const response = await fetch(`${ctx.baseUrl}/api/v1/mobile/evidence-uploads`, {
      method: "POST",
      headers: headers(ctx),
      body: form,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return {
    async upload(bytes, declaredMimeType) {
      if (!registered) await register(bytes);
      return post(bytes, declaredMimeType, clientEvidenceId, evidenceId);
    },
    async uploadUnsynced(bytes, declaredMimeType) {
      const orphan = `o6r07b-orphan-${randomSuffix()}`;
      return post(bytes, declaredMimeType, orphan, `evidence:${ctx.seed.tenantA.id}:${orphan}`);
    },
    async count() {
      // V1 não tem rota de listagem nem de download (`evfile_*` não é servido por rota alguma): a única
      // evidência de persistência é o blob no storage protegido, contado por `countStoredFiles`.
      return (await countStoredFiles("V1")) > 0 ? 1 : 0;
    },
    storedMimeType: (body) => body?.data?.mime_type,
  };
}

// V2 — POST /api/v1/attachments (anexo genérico polimórfico; entity_type = damage).
async function prepareV2(ctx: UploadApiContext): Promise<UploadTarget> {
  const damageId = await createDamage(ctx);
  const listPath = `/api/v1/attachments?entity_type=damage&entity_id=${damageId}`;
  return {
    async upload(bytes, declaredMimeType, fileName, options) {
      const form = new FormData();
      form.set("entity_type", "damage");
      form.set("entity_id", damageId);
      if (options?.clientActionId) form.set("client_action_id", options.clientActionId);
      form.set("file", new Blob([bytes], { type: declaredMimeType }), fileName);
      return postForm(ctx, "/api/v1/attachments", form);
    },
    uploadUnsynced: unsupportedUnsynced,
    async count() {
      const list = await requestJson(ctx.baseUrl, listPath, { headers: headers(ctx) });
      return (list.body?.items ?? []).length as number;
    },
    storedMimeType: (body) => body?.data?.contentType ?? body?.data?.mimeType,
  };
}

// V3 — POST /api/v1/work-orders/:id/attachments.
async function prepareV3(ctx: UploadApiContext): Promise<UploadTarget> {
  const workOrderId = await createWorkOrder(ctx);
  const routePath = `/api/v1/work-orders/${workOrderId}/attachments`;
  return {
    async upload(bytes, declaredMimeType, fileName, options) {
      const form = new FormData();
      if (options?.clientActionId) form.set("client_action_id", options.clientActionId);
      form.set("file", new Blob([bytes], { type: declaredMimeType }), fileName);
      return postForm(ctx, routePath, form);
    },
    uploadUnsynced: unsupportedUnsynced,
    async count() {
      const list = await requestJson(ctx.baseUrl, routePath, { headers: headers(ctx) });
      return (list.body?.items ?? []).length as number;
    },
    storedMimeType: (body) => body?.data?.mimeType,
  };
}

// V4 — POST /api/v1/mobile/checklist-runs/:runId/attachments (ramo multipart).
async function prepareV4(ctx: UploadApiContext): Promise<UploadTarget> {
  const { runId, componentId } = await createPublishedRun(ctx);
  const routePath = `/api/v1/mobile/checklist-runs/${runId}/attachments`;
  return {
    async upload(bytes, declaredMimeType, fileName) {
      const form = new FormData();
      form.set("componentId", componentId);
      form.set("file", new Blob([bytes], { type: declaredMimeType }), fileName);
      return postForm(ctx, routePath, form);
    },
    uploadUnsynced: unsupportedUnsynced,
    async count() {
      // Nao existe GET /mobile/checklist-runs/:runId — quem devolve o DTO de detalhes (com
      // `attachments`) e o PATCH, cujo dto aceita corpo vazio (`answers` tem default []). O status e
      // conferido para o contador nunca ser vacuamente 0: um 404 aqui viraria "nada persistido" falso.
      const run = await requestJson(ctx.baseUrl, `/api/v1/mobile/checklist-runs/${runId}`, {
        method: "PATCH",
        headers: headers(ctx),
        body: {},
      });
      assert.equal(run.status, 200, `leitura do run falhou: ${JSON.stringify(run.body)}`);
      return (run.body?.data?.attachments ?? []).length as number;
    },
    storedMimeType: (body) => body?.data?.mimeType,
  };
}

// V5 — POST /api/v1/damages/:damageId/attachments.
async function prepareV5(ctx: UploadApiContext): Promise<UploadTarget> {
  const damageId = await createDamage(ctx);
  const routePath = `/api/v1/damages/${damageId}/attachments`;
  return {
    async upload(bytes, declaredMimeType, fileName) {
      const form = new FormData();
      form.set("file", new Blob([bytes], { type: declaredMimeType }), fileName);
      return postForm(ctx, routePath, form);
    },
    uploadUnsynced: unsupportedUnsynced,
    async count() {
      const detail = await requestJson(ctx.baseUrl, `/api/v1/damages/${damageId}`, {
        headers: headers(ctx, "manager"),
      });
      return (detail.body?.data?.attachments ?? detail.body?.data?.galeria ?? []).length as number;
    },
    storedMimeType: (body) => body?.data?.mimeType,
  };
}

function unsupportedUnsynced(): Promise<{ status: number; body: any }> {
  throw new Error("uploadUnsynced só existe para V1 (o recibo de sync é exclusivo dessa via).");
}

async function postForm(ctx: UploadApiContext, routePath: string, form: FormData) {
  const response = await fetch(`${ctx.baseUrl}${routePath}`, { method: "POST", headers: headers(ctx), body: form });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function createWorkOrder(ctx: UploadApiContext): Promise<string> {
  const created = await requestJson(ctx.baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: headers(ctx),
    body: { title: "OS o6r07b", customerName: "Cliente", serviceAddress: "Rua Exemplo, 1" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data.id as string;
}

async function createDamage(ctx: UploadApiContext): Promise<string> {
  const vehicle = await requestJson(ctx.baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: headers(ctx),
    body: { plate: `O6R${randomSuffix().slice(0, 4).toUpperCase()}`, model: "Caminhao Guincho" },
  });
  assert.equal(vehicle.status, 201, JSON.stringify(vehicle.body));
  const created = await requestJson(ctx.baseUrl, "/api/v1/damages", {
    method: "POST",
    headers: headers(ctx),
    body: {
      vehicle_id: vehicle.body.data.id,
      data: "2026-09-06",
      gravidade: "moderada",
      descricao: "Dano o6r07b",
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data.id as string;
}

async function createPublishedRun(ctx: UploadApiContext): Promise<{ runId: string; componentId: string }> {
  const created = await requestJson(ctx.baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: headers(ctx),
    body: {
      name: "Checklist o6r07b",
      type: "technical_evidence",
      schema: { source: "o6r07b" },
      components: [{ componentKey: "photos", type: "photo_upload", label: "Fotos", required: true }],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const componentId = created.body.data.components[0].id as string;
  const published = await requestJson(ctx.baseUrl, `/api/v1/tenant/checklists/${created.body.data.id}/publish`, {
    method: "POST",
    headers: headers(ctx),
  });
  assert.equal(published.status, 200, JSON.stringify(published.body));
  const run = await requestJson(ctx.baseUrl, "/api/v1/mobile/checklist-runs", {
    method: "POST",
    headers: headers(ctx),
    body: { checklistId: published.body.data.id },
  });
  assert.equal(run.status, 201, JSON.stringify(run.body));
  return { runId: run.body.data.id as string, componentId };
}

/** V1 grava no storage protegido de evidência; V2–V5 no storage de checklist. */
async function countStoredFiles(via: Via): Promise<number> {
  return countFilesIn(via === "V1" ? evidenceRoot : storagePath);
}

async function countFilesIn(root: string): Promise<number> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).length;
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
