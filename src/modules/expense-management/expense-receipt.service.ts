import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { env } from "../../config/env.js";
import {
  resetEvidenceScannerForTests,
  setEvidenceScannerForTests,
} from "../evidence/evidence-scanner.factory.js";
import {
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  LocalProtectedEvidenceStorageProvider,
  type EvidenceScanner,
} from "../evidence/evidence-storage.js";
import { UploadGateError, uploadGateStatus, verifyUploadContent } from "../evidence/upload-gate.js";
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
} from "./expense-sync.js";

/**
 * B-RDV-COMPROVANTE (§G.3 do plano B-REENVIOS) — upload do comprovante de despesa.
 *
 * Regra do espelho = evidência (`mobile-evidence-upload.ts`): sniff + scanner pelo GATE ÚNICO
 * (`verifyUploadContent`, registro único do scanner — B-O6R-07b) e storage pela MESMA classe da
 * evidência (`LocalProtectedEvidenceStorageProvider`, instância com root próprio). Nenhum scanner
 * ou storage novo nasce aqui.
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

let receiptStorageRoot = path.join(os.tmpdir(), "erp-expense-receipt-uploads");
let receiptStorageProvider = new LocalProtectedEvidenceStorageProvider(receiptStorageRoot);

export function configureExpenseReceiptStorageForTests(root: string): void {
  receiptStorageRoot = root;
  receiptStorageProvider = new LocalProtectedEvidenceStorageProvider(root);
}

/** Wrapper fino do registro único do scanner (B-O6R-07b) — igual ao da via de evidência. */
export function configureExpenseReceiptScannerForTests(scanner: EvidenceScanner): void {
  setEvidenceScannerForTests(scanner);
}

export async function resetExpenseReceiptRuntimeForTests(): Promise<void> {
  await receiptStorageProvider.clear?.();
  resetEvidenceScannerForTests();
  defaultReceiptServicePromise = undefined;
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

    try {
      return await this.repository.withSyncTransaction(actor.tenantId, async (repository) => {
        const concurrent = await this.resolveRecordedReceipt(repository, actor, input.clientActionId, fingerprint);
        if (concurrent) return concurrent;

        const claim = await repository.claimMobileActionReceipt({
          tenantId: actor.tenantId,
          receiptKey,
          actorUserId: actor.userId,
          actionType: EXPENSE_RECEIPT_SYNC_ACTION_TYPE,
        });

        const stored = await receiptStorageProvider.store({
          tenantId: actor.tenantId,
          evidenceId: `expense_receipt:${actor.tenantId}:${input.clientActionId}`,
          clientEvidenceId: input.clientActionId,
          buffer: input.buffer,
          checksumSha256: computedSha256,
          verification,
        });

        const receipt = await repository.createExpenseReceipt({
          tenantId: actor.tenantId,
          itemId: item.id,
          localHash: computedSha256,
          mimeType: stored.mimeType,
          // O CHECK real da coluna (migration 20260619, expense_receipts_upload_status_check) só admite
          // local|pending_upload|uploading|uploaded|failed — "uploaded" é o estado "guardado no servidor".
          uploadStatus: "uploaded",
          fileKey: stored.storageKey ?? stored.fileId,
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
    } catch (error) {
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
    if (!receipt.fileKey) throw notFound();
    const buffer = await receiptStorageProvider.load?.(receipt.fileKey);
    if (!buffer) throw notFound();
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
