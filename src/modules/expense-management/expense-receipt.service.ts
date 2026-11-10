import { createHash } from "node:crypto";

import pino from "pino";

import { env } from "../../config/env.js";
import { ChecklistError } from "../checklists/checklist.types.js";
import { createChecklistStorageProviderByName, readChecklistStorageConfig } from "../checklists/storage/checklist-storage.factory.js";
import type {
  ChecklistStorageObjectBody,
  ChecklistStorageProvider,
  ChecklistStorageProviderName,
} from "../checklists/storage/checklist-storage.types.js";
import type { S3ChecklistStorageProviderConfig } from "../checklists/storage/s3-checklist-storage.provider.js";
import {
  resetEvidenceScannerForTests,
  setEvidenceScannerForTests,
} from "../evidence/evidence-scanner.factory.js";
import {
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  type EvidenceScanner,
} from "../evidence/evidence-storage.js";
import { assertStorageKeyWithinTenant } from "../evidence/storage-key-scope.js";
import { UploadGateError, assertUploadVerification, uploadGateStatus, verifyUploadContent } from "../evidence/upload-gate.js";
import {
  getMemoryExpenseManagementRepositoryForTests,
} from "./expense-management.service.js";
import type {
  ExpenseManagementRepository,
  ExpenseSyncTransactionRepository,
} from "./expense-management.repository.js";
import { ExpenseManagementError, type ExpenseReceiptRecord, type ExpenseReport } from "./expense-management.types.js";
import {
  EXPENSE_RECEIPT_SYNC_ACTION_TYPE,
  SyncActionAlreadyClaimedError,
  buildSyncReceiptKey,
  computeSyncFingerprint,
  decodeSyncReceiptKey,
  isCompleteSyncReceipt,
  syncDatabaseErrorCodes,
} from "./expense-sync.js";

/**
 * B-RDV-COMPROVANTE (§G.3 do plano B-REENVIOS) — upload do comprovante de despesa.
 *
 * Sniff + scanner pelo GATE ÚNICO (`verifyUploadContent`, registro único do scanner — B-O6R-07b).
 * Storage (conserto c1 do #525, §2(a) e §12.3 do plano do conserto): o provedor da D-014 (`local|s3`,
 * a mesma classe de anexos, checklist, dano e OS). O comprovante saiu da raiz efêmera
 * `os.tmpdir()` (C1-D1). Nenhum scanner ou storage novo nasce aqui.
 *
 * Idempotência = a do sync de despesa (B-O6R-03a), COMPOSTA: claim na MESMA tabela
 * `mobile_action_receipts` por (tenant, `client_action_id` K2t), prova de payload pelo
 * `ExpenseEvent.payloadHash` (fingerprint v2) com o ATOR no predicado, replay devolve o mesmo
 * comprovante, payload divergente responde 409 `payload_mismatch`.
 *
 * Allowlist §2.8: resposta pública carrega só `receiptId`, `uploadStatus` e `downloadUrl` da rota
 * autenticada do próprio API — nunca `bucket`, storage key ou caminho (D-014: sem presigned novo).
 */

export const EXPENSE_RECEIPT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const EXPENSE_RECEIPT_MAX_FILE_SIZE_BYTES = EVIDENCE_MAX_FILE_SIZE_BYTES;

export const EXPENSE_RECEIPT_SYNC_EVENT_TYPE = "expense_receipt.synced";

const RECEIPT_EDITABLE_STATUSES = new Set(["draft", "returned"]);

/**
 * Conserto c1 (§2(a)6, §12.3) — COSTURA DE TESTE do storage do comprovante. Sem ela, quem resolve o
 * provedor é a fábrica da D-014 (`createChecklistStorageProviderByName`), a mesma dos 4 leitores de
 * anexo. O teste injeta um `LocalChecklistStorageProvider(<tmp>)` ou um `S3ChecklistStorageProvider(config,
 * clienteFingido)`; nenhum `*ForTests` da fábrica de storage entra em `src/` (cláusula C4 do censo).
 */
type ExpenseReceiptStorageTestSeam = {
  readonly provider?: ChecklistStorageProvider;
  /** O `NODE_ENV` que o portão de produção lê (§2(a)5). */
  readonly nodeEnv?: string;
  /** A configuração `s3` com que o teste construiu o provedor; o portão lê esta (§13.2 item 3). */
  readonly s3?: S3ChecklistStorageProviderConfig;
};

let receiptStorageSeam: ExpenseReceiptStorageTestSeam = {};

export function configureExpenseReceiptStorageForTests(seam: ExpenseReceiptStorageTestSeam): void {
  receiptStorageSeam = { ...seam };
}

/** Wrapper fino do registro único do scanner (B-O6R-07b) — igual ao da via de evidência. */
export function configureExpenseReceiptScannerForTests(scanner: EvidenceScanner): void {
  setEvidenceScannerForTests(scanner);
}

export async function resetExpenseReceiptRuntimeForTests(): Promise<void> {
  receiptStorageSeam = {};
  resetEvidenceScannerForTests();
  defaultReceiptServicePromise = undefined;
}

/**
 * §12.3 — UM resolvedor para escrever, ler e compensar: o provedor injetado pela costura com esse nome
 * ou, sem costura, a fábrica da D-014. A escrita resolve pelo nome configurado; a leitura e a
 * compensação, pelo nome que veio no `file_key`.
 */
function resolveReceiptStorage(name: ChecklistStorageProviderName): ChecklistStorageProvider {
  const injected = receiptStorageSeam.provider;
  if (injected && injected.name === name) return injected;
  return createChecklistStorageProviderByName(name);
}

/** O nome do provedor da ESCRITA: o da costura, ou `CHECKLIST_STORAGE_PROVIDER`. */
function receiptWriteProviderName(): ChecklistStorageProviderName {
  return receiptStorageSeam.provider?.name ?? env.CHECKLIST_STORAGE_PROVIDER;
}

/**
 * §2(a)5 + §13.2 — PORTÃO DE PRODUÇÃO, fail-closed, por requisição, só nesta via. Com `NODE_ENV=production`, o
 * comprovante só grava em `s3` com bucket e com o endpoint EXPLÍCITO regional da AWS da região configurada
 * (`https://s3.<região>.amazonaws.com`, sem porta, credencial no URL, caminho, consulta nem fragmento). Qualquer
 * outra forma → 503 `receipt_storage_unavailable`, antes do scanner e da gravação (0 objeto, 0 linha). Sem válvula:
 * `local` em produção é recusado mesmo com diretório declarado (o código não sabe se há volume montado).
 *
 * É lista do que PASSA, não do que não passa: não depende de DNS (`localtest.me` resolve para loopback) e recusa o
 * endpoint vazio, com o qual o SDK escolheria o destino por `AWS_ENDPOINT_URL_S3`, `AWS_ENDPOINT_URL` ou
 * `~/.aws/config`, que o portão não vê. O `forcePathStyle` não entra na conta.
 */
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d{1,2}$/;

function approvedReceiptS3Host(region: string): string | undefined {
  return AWS_REGION_PATTERN.test(region) ? `s3.${region}.amazonaws.com` : undefined;
}

function isApprovedReceiptS3Endpoint(s3: { endpoint?: string; region: string }): boolean {
  const host = approvedReceiptS3Host(s3.region.trim());
  if (!host) return false;
  const raw = (s3.endpoint ?? "").trim();
  if (!raw) return false; // vazio: o SDK resolveria o destino por AWS_ENDPOINT_URL_S3, AWS_ENDPOINT_URL ou ~/.aws/config
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === host &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    (url.pathname === "/" || url.pathname === "") &&
    url.search === "" &&
    url.hash === ""
  );
}

export function assertReceiptStorageDurable(input: {
  nodeEnv: string;
  provider: string;
  s3: S3ChecklistStorageProviderConfig;
}): void {
  if (input.nodeEnv !== "production") return;
  if (input.provider === "s3" && input.s3.bucket.trim() !== "" && isApprovedReceiptS3Endpoint(input.s3)) return;
  throw new ExpenseManagementError(503, "SERVICE_UNAVAILABLE", "receipt_storage_unavailable", "Receipt storage is temporarily unavailable.");
}

/** §13.2 item 3 — o portão lê no MESMO lugar que a escrita: a costura, ou o `env` e a fábrica da D-014. */
function receiptStorageGateInput(): { nodeEnv: string; provider: string; s3: S3ChecklistStorageProviderConfig } {
  return {
    nodeEnv: receiptStorageSeam.nodeEnv ?? env.NODE_ENV,
    provider: receiptWriteProviderName(),
    s3: receiptStorageSeam.s3 ?? readChecklistStorageConfig().s3,
  };
}

/**
 * §2(a)2 — `file_key = "<provedor>:<chave>"`. `expense_receipts` não tem coluna de provedor e
 * `prisma/**` não muda, então o provedor vai na chave.
 */
export function encodeReceiptFileKey(provider: ChecklistStorageProviderName, storageKey: string): string {
  return `${provider}:${storageKey}`;
}

/**
 * O inverso do `encodeReceiptFileKey`. Chave SEM prefixo de provedor (o que o objeto `b9e63ec0` gravava
 * na raiz efêmera) não é reconhecida: a leitura dá 404 sem tocar o disco e o replay responde 409.
 */
export function decodeReceiptFileKey(
  fileKey: string | undefined,
): { readonly provider: ChecklistStorageProviderName; readonly storageKey: string } | undefined {
  if (!fileKey) return undefined;
  const separator = fileKey.indexOf(":");
  if (separator <= 0) return undefined;
  const provider = fileKey.slice(0, separator);
  const storageKey = fileKey.slice(separator + 1);
  if (provider !== "local" && provider !== "s3") return undefined;
  if (!storageKey) return undefined;
  return { provider, storageKey };
}

/** O objeto gravado por esta requisição, antes da transação decidir se ele fica. */
type SavedReceiptObject = { readonly storage: ChecklistStorageProvider; readonly storageKey: string };

const logger = pino({ level: env.LOG_LEVEL });

/**
 * §12.2 item 3 — log de falha da via V6: rota, operação, NOME e CÓDIGO do erro (Prisma, Postgres ou AWS). Nunca a
 * mensagem, a chave, o caminho, o bucket nem o ARN: a mensagem do 403 do S3 traz os quatro.
 */
export function logReceiptFailure(operation: string, error: unknown, route?: string): void {
  logger.warn(
    {
      event: "expense_receipt.failure",
      via: "V6",
      route: route ?? null,
      operation,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: receiptFailureCode(error),
    },
    "expense receipt operation failed",
  );
}

function receiptFailureCode(error: unknown): string | null {
  const databaseCode = syncDatabaseErrorCodes(error)[0];
  if (databaseCode) return databaseCode;
  if (typeof error !== "object" || error === null) return null;
  const record = error as { readonly Code?: unknown; readonly $metadata?: { readonly httpStatusCode?: unknown } };
  if (typeof record.Code === "string" && record.Code !== "") return record.Code;
  if (typeof record.$metadata?.httpStatusCode === "number") return String(record.$metadata.httpStatusCode);
  return null;
}

/** Extensão do objeto pelo tipo VERIFICADO no gate (nunca pelo nome do arquivo do aparelho). */
function receiptFileExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "jpg";
}

/** O corpo do objeto vira Buffer, com o teto do contrato (10 MB). */
async function readReceiptBody(body: ChecklistStorageObjectBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body) {
    const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += piece.length;
    if (total > EXPENSE_RECEIPT_MAX_FILE_SIZE_BYTES) {
      body.destroy();
      throw new Error("Receipt object exceeds the contract size.");
    }
    chunks.push(piece);
  }
  return Buffer.concat(chunks);
}

export type ExpenseReceiptActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
};

export type AttachExpenseReceiptInput = {
  readonly reportId: string;
  readonly itemId: string;
  readonly clientActionId: string;
  readonly buffer: Buffer;
  readonly declaredSha256: string;
  readonly declaredSizeBytes: number;
  readonly declaredContentType: string;
};

export type AttachExpenseReceiptResult = {
  readonly statusCode: 200 | 201;
  readonly receiptId: string;
  readonly uploadStatus: string;
};

export type ExpenseReceiptDetails = {
  readonly receiptId: string;
  readonly uploadStatus: string;
  readonly mimeType: string;
  readonly downloadUrl: string;
};

function notFound(): ExpenseManagementError {
  return new ExpenseManagementError(404, "EXPENSE_NOT_FOUND", "not_found", "Expense resource was not found.");
}

export class ExpenseReceiptService {
  constructor(private readonly repository: ExpenseManagementRepository) {}

  async attachReceipt(actor: ExpenseReceiptActorContext, input: AttachExpenseReceiptInput): Promise<AttachExpenseReceiptResult> {
    const report = await this.loadOwnEditableReport(actor, input.reportId);
    const item = await this.repository.findExpenseItem({
      tenantId: actor.tenantId,
      reportId: report.id,
      itemId: input.itemId,
    });
    if (!item) throw notFound();

    if (!/^[a-f0-9]{64}$/.test(input.declaredSha256)) {
      throw new ExpenseManagementError(400, "BAD_REQUEST", "invalid_sha256", "sha256 must be a lowercase hex SHA-256 digest.");
    }
    if (input.declaredSizeBytes !== input.buffer.length) {
      throw new ExpenseManagementError(400, "BAD_REQUEST", "size_mismatch", "size_bytes does not match uploaded file size.");
    }
    const computedSha256 = createHash("sha256").update(input.buffer).digest("hex");
    if (computedSha256 !== input.declaredSha256) {
      throw new ExpenseManagementError(400, "BAD_REQUEST", "sha256_mismatch", "sha256 does not match uploaded file.");
    }

    // §2(a)5 + §13.2 — portão de produção ANTES do scanner e da gravação.
    assertReceiptStorageDurable(receiptStorageGateInput());

    // Sniff → scanner → marca, pelo gate único da evidência. A allowlist é a DESTA via
    // (jpeg/png/webp/pdf); o scanner é o do registro único (fail-closed em produção).
    const verification = await verifyUploadContent({
      via: "V6",
      buffer: input.buffer,
      declaredMimeType: input.declaredContentType,
      allowedMimeTypes: [...EXPENSE_RECEIPT_ALLOWED_MIME_TYPES],
      scan: {
        tenantId: actor.tenantId,
        evidenceId: `expense_receipt:${actor.tenantId}:${input.clientActionId}`,
        clientEvidenceId: input.clientActionId,
      },
    }).catch((error: unknown) => {
      if (!(error instanceof UploadGateError)) throw error;
      const status = uploadGateStatus(error.kind);
      if (status === 422) {
        throw new ExpenseManagementError(422, "UNPROCESSABLE_ENTITY", "receipt_rejected", "Receipt file was rejected by safety scan.");
      }
      if (status === 503) {
        throw new ExpenseManagementError(503, "SERVICE_UNAVAILABLE", "receipt_scan_unavailable", "Receipt safety scan is temporarily unavailable.");
      }
      throw new ExpenseManagementError(415, "UNSUPPORTED_MEDIA_TYPE", error.kind, error.detail);
    });

    const receiptKey = buildSyncReceiptKey(input.clientActionId);
    const fingerprint = computeSyncFingerprint({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      clientActionId: input.clientActionId,
      type: EXPENSE_RECEIPT_SYNC_ACTION_TYPE,
      normalized: {
        reportId: report.id,
        itemId: item.id,
        sha256: computedSha256,
        sizeBytes: input.buffer.length,
      },
    });

    const recorded = await this.repository.withSyncTransaction(actor.tenantId, (repository) =>
      this.resolveRecordedReceipt(repository, actor, input.clientActionId, fingerprint),
    );
    if (recorded) return recorded;

    // §12.1 — o objeto gravado; toda saída depois da gravação que não seja o 201 passa pela compensação.
    let saved: SavedReceiptObject | undefined;
    try {
      const result = await this.repository.withSyncTransaction(actor.tenantId, async (repository) => {
        const concurrent = await this.resolveRecordedReceipt(repository, actor, input.clientActionId, fingerprint);
        if (concurrent) return concurrent;

        const claim = await repository.claimMobileActionReceipt({
          tenantId: actor.tenantId,
          receiptKey,
          actorUserId: actor.userId,
          actionType: EXPENSE_RECEIPT_SYNC_ACTION_TYPE,
        });

        // §2(a)1 — provedor da D-014. O nome do arquivo do aparelho não vai ao storage (nem como
        // metadado do S3): o objeto se chama `comprovante.<ext do tipo VERIFICADO>`.
        const storage = resolveReceiptStorage(receiptWriteProviderName());
        const verifiedMimeType = assertUploadVerification(verification, input.buffer).mimeType;
        const stored = await storage.save({
          tenantId: actor.tenantId,
          runId: `expense-receipt-${report.id}`,
          buffer: input.buffer,
          originalName: "comprovante",
          safeFileName: `comprovante.${receiptFileExtension(verifiedMimeType)}`,
          sizeBytes: input.buffer.length,
          checksumSha256: computedSha256,
          verification,
        });
        saved = { storage, storageKey: stored.storageKey };

        const receipt = await repository.createExpenseReceipt({
          tenantId: actor.tenantId,
          itemId: item.id,
          localHash: computedSha256,
          mimeType: stored.mimeType,
          // O CHECK real da coluna (migration 20260619, expense_receipts_upload_status_check) só admite
          // local|pending_upload|uploading|uploaded|failed — "uploaded" é o estado "guardado no servidor".
          uploadStatus: "uploaded",
          fileKey: encodeReceiptFileKey(storage.name, stored.storageKey),
        });

        await repository.completeMobileActionReceipt(claim, { resultRef: receipt.id, processedAt: new Date() });
        await repository.createEvent({
          tenantId: actor.tenantId,
          aggregateId: report.id,
          eventType: EXPENSE_RECEIPT_SYNC_EVENT_TYPE,
          payloadHash: fingerprint,
          actorUserId: actor.userId,
        });

        return { statusCode: 201 as const, receiptId: receipt.id, uploadStatus: receipt.uploadStatus };
      });
      if (result.statusCode !== 201) await this.compensateSavedObject(actor, saved);
      return result;
    } catch (error) {
      await this.compensateSavedObject(actor, saved);
      if (error instanceof SyncActionAlreadyClaimedError) {
        const afterLostClaim = await this.repository.withSyncTransaction(actor.tenantId, (repository) =>
          this.resolveRecordedReceipt(repository, actor, input.clientActionId, fingerprint),
        );
        if (afterLostClaim) return afterLostClaim;
        throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Receipt claim raced and cannot be verified.");
      }
      throw error;
    }
  }

  /**
   * §12.1 — a compensação NUNCA apaga objeto de linha viva. Uma leitura NOVA, depois do fim da transação, procura
   * a linha com o `file_key` que a transação gravaria:
   *   - achou → NÃO apaga (é o commit ambíguo da Q1: o objeto é o arquivo de uma linha `uploaded`);
   *   - não achou → apaga (`deleteObject`, best-effort; falha só vai a log, sem a chave);
   *   - a leitura falhou → NÃO apaga. Sobra um órfão possível, que é lixo; perda, nunca.
   */
  private async compensateSavedObject(actor: ExpenseReceiptActorContext, saved: SavedReceiptObject | undefined): Promise<void> {
    if (!saved) return;
    const fileKey = encodeReceiptFileKey(saved.storage.name, saved.storageKey);
    let referenced: ExpenseReceiptRecord | undefined;
    try {
      referenced = await this.repository.findExpenseReceiptByFileKey({ tenantId: actor.tenantId, fileKey });
    } catch (error) {
      logReceiptFailure("compensation_reread", error);
      return;
    }
    if (referenced) return;
    try {
      await saved.storage.deleteObject({ storageKey: saved.storageKey });
    } catch (error) {
      logReceiptFailure("compensation_delete", error);
    }
  }

  async getReceipt(actor: ExpenseReceiptActorContext, input: { readonly reportId: string; readonly itemId: string }): Promise<ExpenseReceiptDetails> {
    const { receipt } = await this.loadStoredReceipt(actor, input);
    return {
      receiptId: receipt.id,
      uploadStatus: receipt.uploadStatus,
      mimeType: receipt.mimeType,
      downloadUrl: `/api/v1/expense-reports/${input.reportId}/items/${input.itemId}/receipt/file`,
    };
  }

  async serveReceiptFile(actor: ExpenseReceiptActorContext, input: { readonly reportId: string; readonly itemId: string }): Promise<{ readonly buffer: Buffer; readonly mimeType: string }> {
    const { receipt } = await this.loadStoredReceipt(actor, input);
    // §2(a)3 — o provedor vem do `file_key`; chave sem prefixo (o legado da raiz efêmera) → 404 sem
    // tocar o disco. A chave tem de começar na organização do ator (o 5º leitor do censo C7).
    const decoded = decodeReceiptFileKey(receipt.fileKey);
    if (!decoded) throw notFound();
    assertStorageKeyWithinTenant(
      { storageKey: decoded.storageKey, tenantId: actor.tenantId, provider: decoded.provider },
      notFound,
    );
    let object;
    try {
      object = await resolveReceiptStorage(decoded.provider).getObject({ storageKey: decoded.storageKey });
    } catch (error) {
      if (error instanceof ChecklistError && error.statusCode === 404) throw notFound();
      throw error;
    }
    const buffer = await readReceiptBody(object.body);
    // O tipo servido é o da linha, verificado no upload.
    return { buffer, mimeType: receipt.mimeType };
  }

  /** Leitura: `expense_report:read` vê o relatório da organização; `read_own` só o próprio. */
  private async loadReadableReport(actor: ExpenseReceiptActorContext, reportId: string): Promise<ExpenseReport> {
    const report = await this.repository.getReport({ tenantId: actor.tenantId, reportId });
    if (!report) throw notFound();
    if (!actor.permissions.includes("expense_report:read") && report.employeeUserId !== actor.userId) {
      // 404, nunca 403: não revela a existência de relatório alheio (§G.3).
      throw notFound();
    }
    return report;
  }

  /** Escrita: só o PRÓPRIO empregado anexa, e só em relatório editável (§G.3: 404 / 422). */
  private async loadOwnEditableReport(actor: ExpenseReceiptActorContext, reportId: string): Promise<ExpenseReport> {
    const report = await this.repository.getReport({ tenantId: actor.tenantId, reportId });
    if (!report || report.employeeUserId !== actor.userId) throw notFound();
    if (!RECEIPT_EDITABLE_STATUSES.has(report.status)) {
      throw new ExpenseManagementError(422, "EXPENSE_REPORT_LOCKED", "report_not_editable", "Only draft or returned reports can receive receipts.");
    }
    return report;
  }

  private async loadStoredReceipt(
    actor: ExpenseReceiptActorContext,
    input: { readonly reportId: string; readonly itemId: string },
  ): Promise<{ readonly receipt: ExpenseReceiptRecord }> {
    const report = await this.loadReadableReport(actor, input.reportId);
    const item = await this.repository.findExpenseItem({
      tenantId: actor.tenantId,
      reportId: report.id,
      itemId: input.itemId,
    });
    if (!item) throw notFound();
    const receipt = await this.repository.findLatestStoredExpenseReceipt({ tenantId: actor.tenantId, itemId: item.id });
    if (!receipt) throw notFound();
    return { receipt };
  }

  /**
   * Replay/conflito do MESMO `client_action_id` (espelho enxuto do `resolveRecordedAction` do lote):
   * recibo de outro ator → `action_owned_by_other_actor`; prova de payload (evento com o fingerprint
   * e o ATOR no predicado) → replay 200; evento do ator com OUTRO hash → 409 `payload_mismatch`.
   */
  private async resolveRecordedReceipt(
    repository: ExpenseSyncTransactionRepository,
    actor: ExpenseReceiptActorContext,
    clientActionId: string,
    fingerprint: string,
  ): Promise<AttachExpenseReceiptResult | undefined> {
    const { legacy, current } = await repository.findSyncActionReceipts({
      tenantId: actor.tenantId,
      clientActionId,
    });
    if (!legacy && !current) return undefined;

    const receipt = current ?? legacy!;
    if (receipt.actorUserId !== actor.userId) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "action_owned_by_other_actor", "This client_action_id belongs to another user.");
    }
    if (receipt.actionType !== EXPENSE_RECEIPT_SYNC_ACTION_TYPE) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "payload_mismatch", "This client_action_id was already used by a different action.");
    }
    if (current && decodeSyncReceiptKey(current.clientActionId) !== clientActionId) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Receipt key cannot be verified.");
    }
    if (!isCompleteSyncReceipt(receipt) || !receipt.resultRef) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Receipt is incomplete and cannot be verified.");
    }

    const stored = await repository.findExpenseReceiptById({ tenantId: actor.tenantId, receiptId: receipt.resultRef });
    if (!stored) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Stored receipt cannot be found.");
    }

    const proof = await repository.findExpenseEvent({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      aggregateId: await this.aggregateForReceipt(repository, actor, stored),
      eventType: EXPENSE_RECEIPT_SYNC_EVENT_TYPE,
      payloadHash: fingerprint,
    });
    if (!proof) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "payload_mismatch", "This client_action_id was already used with different content.");
    }
    // §12.1 item 3 (L6) — linha sem prefixo de provedor (o legado da raiz efêmera) não se lê: responder
    // 200 `uploaded` mandaria o app apagar o blob de um arquivo que o servidor não serve.
    if (!decodeReceiptFileKey(stored.fileKey)) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Stored receipt file cannot be verified.");
    }

    return { statusCode: 200, receiptId: stored.id, uploadStatus: stored.uploadStatus };
  }

  private async aggregateForReceipt(
    repository: ExpenseSyncTransactionRepository,
    actor: ExpenseReceiptActorContext,
    receipt: ExpenseReceiptRecord,
  ): Promise<string> {
    const reportId = await repository.findReportIdForExpenseItem({ tenantId: actor.tenantId, itemId: receipt.itemId });
    if (!reportId) {
      throw new ExpenseManagementError(409, "EXPENSE_SYNC_CONFLICT", "receipt_unverifiable", "Receipt aggregate cannot be resolved.");
    }
    return reportId;
  }
}

export type ExpenseReceiptServiceResolver = () => Promise<ExpenseReceiptService>;

let defaultReceiptServicePromise: Promise<ExpenseReceiptService> | undefined;

export async function createDefaultExpenseReceiptService(): Promise<ExpenseReceiptService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return new ExpenseReceiptService(getMemoryExpenseManagementRepositoryForTests());
  }

  defaultReceiptServicePromise ??= (async () => {
    const { createPrismaExpenseManagementRepository } = await import("./expense-management-prisma.repository.js");
    return new ExpenseReceiptService(await createPrismaExpenseManagementRepository());
  })();

  return defaultReceiptServicePromise;
}
