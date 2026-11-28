import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";

import Busboy from "busboy";
import type { Request } from "express";

import { env } from "../../config/env.js";
import { isDurableStorageConfig } from "../../config/storage-durability.js";
import { createLogger } from "../../infra/logging/logger.js";
import { createChecklistStorageProviderByName, readChecklistStorageConfig } from "../checklists/storage/checklist-storage.factory.js";
import type { ChecklistStorageProvider, StoredChecklistStorageObject } from "../checklists/storage/checklist-storage.types.js";
import { LocalChecklistStorageProvider } from "../checklists/storage/local-checklist-storage.provider.js";
import type { S3ChecklistStorageProviderConfig } from "../checklists/storage/s3-checklist-storage.provider.js";
import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import {
  resetEvidenceScannerForTests,
  setEvidenceScannerForTests,
} from "../evidence/evidence-scanner.factory.js";
import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  getEvidenceAuditEventsForTests,
  recordEvidenceAuditEvent,
  resetEvidenceAuditEventsForTests,
  type EvidenceAuditEvent,
  type EvidenceScanner,
} from "../evidence/evidence-storage.js";
import { UploadGateError, assertUploadVerification, uploadGateStatus, verifyUploadContent } from "../evidence/upload-gate.js";
import { createDefaultWorkOrderService, type WorkOrderService } from "../work-orders/work-order.service.js";
import { actorMutatesAssignedOnly, isPreviouslyAssignedRefusal } from "../work-orders/work-order.types.js";
import { resolveMobileEvidenceRepository } from "./mobile-evidence-sync.js";
import type { MarkFileStoredResult, MobileEvidenceRecord } from "./mobile-evidence.types.js";

const CONTRACT_NAME = "mobile_evidence_file_upload";
const CONTRACT_VERSION = "2026-06-18.b108";

type ParsedUpload = {
  readonly fields: Map<string, string>;
  readonly file: {
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type MobileEvidenceUploadResponse = {
  readonly contract: {
    readonly name: typeof CONTRACT_NAME;
    readonly version: typeof CONTRACT_VERSION;
    readonly status: "partial";
  };
  readonly evidence_id: string;
  readonly file_id: string;
  readonly status: "stored";
  readonly size_bytes: number;
  readonly mime_type: string;
  readonly content_type: string;
  readonly checksum_sha256: string;
  readonly sha256: string;
  readonly uploaded_at: string;
};

/** §3.2 — a mensagem fixa dos dois 503 novos. Nunca a mensagem do SDK ou do sistema de arquivos. */
const EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE = "Evidence storage is temporarily unavailable.";

const logger = createLogger();

/**
 * B-EVIDENCIA-DURAVEL (plano §3.6) — COSTURA DE TESTE do armazenamento da evidência. Sem ela, quem resolve o provedor é
 * a fábrica da D-014 (`createChecklistStorageProviderByName(env.CHECKLIST_STORAGE_PROVIDER)`), a mesma dos anexos de OS
 * e do comprovante de despesa. A foto deixou o diretório temporário do servidor, que sumia no reinício DEPOIS de a rota
 * responder `stored` (`P-UPLOAD-ARMAZENAMENTO-EFEMERO`). Dois formatos:
 *   - uma raiz em TEXTO, como antes (os 4 arnês antigos): monta um `LocalChecklistStorageProvider` nessa raiz;
 *   - um objeto `{ provider, nodeEnv, s3 }`, igual à costura do comprovante: injeta o S3 com cliente fingido e o
 *     `NODE_ENV` que o portão lê.
 */
type MobileEvidenceUploadStorageTestSeam = {
  readonly provider?: ChecklistStorageProvider;
  /** O `NODE_ENV` que o portão de produção lê. */
  readonly nodeEnv?: string;
  /** A configuração `s3` com que o teste construiu o provedor; o portão lê esta. */
  readonly s3?: S3ChecklistStorageProviderConfig;
};

let evidenceStorageSeam: MobileEvidenceUploadStorageTestSeam = {};
/** A raiz em texto que o teste configurou: a ÚNICA pasta que o `reset` apaga. */
let evidenceStorageTestRoot: string | undefined;

export function configureMobileEvidenceUploadStorageForTests(seam: string | MobileEvidenceUploadStorageTestSeam): void {
  if (typeof seam === "string") {
    evidenceStorageTestRoot = seam;
    evidenceStorageSeam = { provider: new LocalChecklistStorageProvider(seam) };
    return;
  }
  evidenceStorageTestRoot = undefined;
  evidenceStorageSeam = { ...seam };
}

// B-O6R-07b (§3.2) — wrapper fino do registro único; a variável de módulo com `new NoopEvidenceScanner()`
// como default morreu aqui também.
export function configureMobileEvidenceUploadScannerForTests(scanner: EvidenceScanner): void {
  setEvidenceScannerForTests(scanner);
}

export function getMobileEvidenceUploadAuditEventsForTests(): readonly EvidenceAuditEvent[] {
  return getEvidenceAuditEventsForTests();
}

/**
 * Apaga a raiz em TEXTO que o teste configurou (os arquivos), zera a trilha e o scanner, e MANTÉM a costura: os 4 arnês
 * antigos chamam `configure(raiz)` e logo depois `reset()`, antes do envio (nota do orquestrador no plano do bloco, "o
 * reset dos testes MANTÉM a costura (P-DEV-1 do dev)"). Sem raiz em texto configurada NÃO apaga nada: o provedor
 * padrão aponta para o diretório compartilhado dos anexos, e apagá-lo destruiria arquivo de outra suíte.
 */
export async function resetMobileEvidenceUploadRuntimeForTests(): Promise<void> {
  if (evidenceStorageTestRoot !== undefined) {
    await rm(evidenceStorageTestRoot, { force: true, recursive: true });
  }
  resetEvidenceAuditEventsForTests();
  resetEvidenceScannerForTests();
}

/** O provedor da ESCRITA: o da costura, ou a fábrica da D-014 pelo `CHECKLIST_STORAGE_PROVIDER`. */
function evidenceWriteProvider(): ChecklistStorageProvider {
  return evidenceStorageSeam.provider ?? createChecklistStorageProviderByName(env.CHECKLIST_STORAGE_PROVIDER);
}

/**
 * B-EVIDENCIA-DURAVEL (plano §3.5) — PORTÃO DE PRODUÇÃO por requisição, espelho do comprovante e defesa em profundidade
 * da trava de boot `G-STORAGE-DURAVEL`: com `NODE_ENV=production`, a evidência só grava no S3 durável da D-014, pela
 * regra ÚNICA de `src/config/storage-durability.ts`. Qualquer outra forma → 503 `evidence_storage_unavailable`, antes
 * do antivírus e da gravação (0 chamada, 0 objeto). Lê do MESMO lugar que a escrita: a costura, ou o `env` e a fábrica.
 */
function assertEvidenceStorageDurable(): void {
  const nodeEnv = evidenceStorageSeam.nodeEnv ?? env.NODE_ENV;
  if (nodeEnv !== "production") return;
  const provider = evidenceStorageSeam.provider?.name ?? env.CHECKLIST_STORAGE_PROVIDER;
  const s3 = evidenceStorageSeam.s3 ?? readChecklistStorageConfig().s3;
  if (isDurableStorageConfig({ provider, bucket: s3.bucket, region: s3.region, endpoint: s3.endpoint })) return;
  throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_storage_unavailable", EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE);
}

export async function uploadMobileEvidenceFile(
  actor: AuthenticatedActor | undefined,
  request: Request,
  resolveWorkOrderService: () => Promise<WorkOrderService> = createDefaultWorkOrderService,
): Promise<MobileEvidenceUploadResponse> {
  assertUploadActor(actor);
  if (request.is("multipart/form-data") !== "multipart/form-data") {
    throw routeError(400, "BAD_REQUEST", "invalid_content_type", "Request must be multipart/form-data.");
  }

  const parsed = await parseMultipartEvidenceUploadRequest(request);
  const evidenceId = requiredField(parsed.fields, "evidence_id");
  const clientEvidenceId = requiredField(parsed.fields, "client_evidence_id");
  const declaredSha256 = requiredField(parsed.fields, "sha256").toLowerCase();
  const declaredSizeBytes = parsePositiveInteger(requiredField(parsed.fields, "size_bytes"), "size_bytes");
  const contentType = normalizeContentType(parsed.file.mimeType, parsed.fields.get("content_type"));

  if (!isSafeClientEvidenceId(clientEvidenceId)) {
    throw routeError(400, "BAD_REQUEST", "invalid_client_evidence_id", "client_evidence_id is invalid.");
  }

  if (evidenceId !== `evidence:${actor.tenantId}:${clientEvidenceId}`) {
    throw routeError(403, "FORBIDDEN", "evidence_tenant_mismatch", "Evidence does not belong to the authenticated tenant.");
  }

  // B-EVIDENCIA-INDICE (§4.3) — o recibo vem do REPOSITÓRIO (não mais do Map): depois do reinício a linha continua lá.
  const evidenceRepository = resolveMobileEvidenceRepository();
  const record = await evidenceRepository.findByClientEvidenceId(actor.tenantId, actor.userId, clientEvidenceId);
  if (!record) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_metadata_required", "Evidence metadata must be synced before file upload.");
  }
  const receipt = {
    evidenceId: `evidence:${record.tenantId}:${record.clientEvidenceId}`,
    scope: record.scope,
    workOrderId: record.workOrderId ?? undefined,
  };

  if (receipt.evidenceId !== evidenceId) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_metadata_required", "Evidence metadata does not match this upload.");
  }

  const uploadWorkOrderId = parsed.fields.get("work_order_id")?.trim();
  if (uploadWorkOrderId && receipt.workOrderId && uploadWorkOrderId !== receipt.workOrderId) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "work_order_mismatch", "work_order_id does not match synced evidence metadata.");
  }

  // B-O6R-07c-b1 (Ω6R-SEC-002, entrada `POST /mobile/evidence-uploads`; crítica, ajuste 5) — o escopo por objeto é
  // conferido DE NOVO aqui, depois do recibo e antes de qualquer validação de bytes ou gravação: a OS pode ter mudado
  // de técnico entre o metadado e o binário. A OS vem do RECIBO (`receipt.workOrderId`, gravado pelo servidor quando
  // o metadado passou pelo escopo), nunca do campo `work_order_id` do formulário, que é opcional e do cliente.
  // Só a evidência DA OS (`scope === "work_order"`); a `field_*` fica fora pela mesma razão do lote.
  //   - ex-técnico (`D2-07c`): 409 `assignment_changed_pending_review` — o app trata 409 como conflito e PRESERVA
  //     o blob (`evidence_upload.dart`, `on ApiConflictError`); nada se perde até o `B-O6R-07c-b2`.
  //   - quem nunca foi técnico: 403 `not_assigned_to_actor`. OS que sumiu: 404 da OS.
  //   - papel `tenant_wide`: não cai no escopo (regra de presença do 07a), como no lote.
  if (receipt.scope === "work_order" && receipt.workOrderId && actorMutatesAssignedOnly(actor)) {
    const workOrderService = await resolveWorkOrderService();
    try {
      await workOrderService.getForMutation(actor, receipt.workOrderId);
    } catch (error) {
      if (isPreviouslyAssignedRefusal(error)) {
        throw routeError(
          409,
          "MOBILE_EVIDENCE_CONFLICT",
          "assignment_changed_pending_review",
          "The work order was reassigned; this evidence awaits supervisor review.",
        );
      }
      throw error;
    }
  }

  if (!/^[a-f0-9]{64}$/.test(declaredSha256)) {
    throw routeError(400, "BAD_REQUEST", "invalid_sha256", "sha256 must be a lowercase hex SHA-256 digest.");
  }

  if (!EVIDENCE_ALLOWED_MIME_TYPES.has(contentType)) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "unsupported_content_type", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "unsupported_content_type", "content_type must be image/jpeg or image/png.");
  }

  if (declaredSizeBytes !== parsed.file.sizeBytes) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "size_mismatch", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "size_mismatch", "size_bytes does not match uploaded file size.");
  }

  const computedSha256 = createHash("sha256").update(parsed.file.buffer).digest("hex");
  if (computedSha256 !== declaredSha256) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "sha256_mismatch", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "sha256_mismatch", "sha256 does not match uploaded file.");
  }

  // B-EVIDENCIA-DURAVEL (plano §3.1 e Emenda 1 §E1.2) — onde a foto fica. A organização é a do ATOR (o provedor a põe
  // no 1º segmento depois do prefixo). A OS vem do RECIBO do servidor, e só quando o recibo é da OS
  // (`scope === "work_order"` e com OS); em qualquer outro caso o segmento é `mobile-evidence-field`. O `work_order_id`
  // e o `tenant_id` do formulário não entram em nenhum caso. O usuário e o código da evidência vão no nome do objeto,
  // para o bloco do índice religar sem tabela. Segmento vazio ou só de pontos → 400, antes de qualquer gravação.
  const evidenceRunId =
    receipt.scope === "work_order" && receipt.workOrderId
      ? `mobile-evidence-wo-${requireStorageSegment(receipt.workOrderId)}`
      : "mobile-evidence-field";
  const objectBaseName = `u-${requireStorageSegment(actor.userId)}--${requireStorageSegment(clientEvidenceId)}`;

  // §3.5 — o portão de armazenamento durável, imediatamente ANTES do antivírus: recusa com 0 chamada e 0 objeto.
  assertEvidenceStorageDurable();

  // B-O6R-07b (Ω6R-SEC-004) — GATE ÚNICO no lugar do `evidenceScanner.scan` solto. Posição preservada:
  // DEPOIS dos 400 de sha/tamanho e do 409 de recibo (ordem vigente do B-108). A allowlist desta via é
  // a `EVIDENCE_ALLOWED_MIME_TYPES` (jpeg/png) — mais estreita que a das irmãs, de propósito: um PDF
  // com bytes válidos declarado `image/jpeg` era 201 aqui e passa a ser 415 `unsupported_media_type`.
  const verification = await verifyUploadContent({
    via: "V1",
    buffer: parsed.file.buffer,
    declaredMimeType: contentType,
    allowedMimeTypes: [...EVIDENCE_ALLOWED_MIME_TYPES],
    scan: { tenantId: actor.tenantId, evidenceId, clientEvidenceId },
  }).catch((error: unknown) => {
    if (!(error instanceof UploadGateError)) throw error;
    const status = uploadGateStatus(error.kind);
    if (status === 422) {
      recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "scanner_infected", parsed.file.sizeBytes, contentType);
      throw routeError(422, "UNPROCESSABLE_ENTITY", "evidence_rejected", "Evidence file was rejected by safety scan.");
    }
    if (status === 503) {
      recordEvidenceAuditEvent({
        action: "evidence.upload.scan_failed",
        tenantId: actor.tenantId,
        actorId: actor.userId,
        evidenceId,
        outcome: "failure",
        metadata: {
          client_evidence_id: clientEvidenceId,
          mime_type: contentType,
          size_bytes: parsed.file.sizeBytes,
          reason: "scanner_unavailable",
        },
      });
      throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_scan_failed", "Evidence safety scan is temporarily unavailable.");
    }
    // 415 novo: o evento `evidence.upload.rejected` em memória leva o MESMO reason do gate
    // (`content_type_mismatch` | `content_unrecognized` | `unsupported_media_type`).
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, error.kind, parsed.file.sizeBytes, contentType);
    throw routeError(415, "UNSUPPORTED_MEDIA_TYPE", error.kind, error.detail);
  });

  recordEvidenceAuditEvent({
    action: "evidence.upload.accepted",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "success",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: contentType,
      size_bytes: parsed.file.sizeBytes,
      checksum_sha256: computedSha256,
    },
  });

  // B-EVIDENCIA-INDICE (§4.3, Ajuste 1 §A1.2) — o ramo do reenvio, DEPOIS do portão e do antivírus e ANTES do
  // `provider.save`: a linha já `stored` com o mesmo SHA responde DA LINHA (zero objeto novo); SHA diferente → 409;
  // observação (`none`) → 409. O antivírus roda em todo envio, inclusive no reenvio (o B-108 fica intacto).
  if (record.fileStatus === "stored") {
    if (record.checksumSha256 !== computedSha256) {
      throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_file_already_stored", "Evidence file is already stored with a different checksum.");
    }
    recordEvidenceAuditEvent({
      action: "evidence.upload.replayed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "success",
      metadata: {
        client_evidence_id: clientEvidenceId,
        mime_type: record.mimeType,
        size_bytes: record.sizeBytes,
        checksum_sha256: record.checksumSha256,
      },
    });
    return storedResponseFromRecord(record);
  }
  if (record.fileStatus === "none") {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_file_not_expected", "Evidence of this kind does not expect a file.");
  }

  // §3.1 e §3.3 — grava pelo provedor da D-014, e SÓ DEPOIS de o provedor confirmar a rota responde `stored` (no S3, o
  // `PutObject` volta com o SHA-256 conferido pelo próprio S3). A extensão sai do tipo VERIFICADO; o nome que o aparelho
  // mandou não é guardado em lugar nenhum (nem no metadado do objeto). Falha do provedor (montagem ou gravação) → 503
  // `evidence_storage_unavailable` com a mensagem fixa: o app mantém a foto e tenta de novo (regra do B-108).
  const verifiedMimeType = assertUploadVerification(verification, parsed.file.buffer).mimeType;
  const safeFileName = `${objectBaseName}.${verifiedMimeType === "image/png" ? "png" : "jpg"}`;
  let stored: StoredChecklistStorageObject;
  try {
    stored = await evidenceWriteProvider().save({
      tenantId: actor.tenantId, // B-EVIDENCIA-DURAVEL: a organização do ATOR (claims), nunca do formulário
      runId: evidenceRunId,
      buffer: parsed.file.buffer,
      originalName: safeFileName,
      safeFileName,
      sizeBytes: parsed.file.sizeBytes,
      checksumSha256: computedSha256,
      verification,
    });
  } catch (error) {
    logEvidenceStorageFailure(error);
    recordEvidenceAuditEvent({
      action: "evidence.upload.storage_failed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "failure",
      metadata: {
        client_evidence_id: clientEvidenceId,
        mime_type: contentType,
        size_bytes: parsed.file.sizeBytes,
        reason: "storage_unavailable",
      },
    });
    throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_storage_unavailable", EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE);
  }
  // B-EVIDENCIA-INDICE (§4.3) — o `stored` é DA LINHA, não do arquivo: depois do `save`, a troca condicional
  // `markFileStored` confirma a ligação. O `storedAt` nasce aqui, depois que o `save` resolve (Emenda 1 B2).
  const storedAt = new Date();
  const fileId = evidenceFileId(stored);
  let markResult: MarkFileStoredResult;
  try {
    markResult = await evidenceRepository.markFileStored(actor.tenantId, actor.userId, clientEvidenceId, {
      fileId,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      checksumSha256: stored.checksumSha256,
      storedAt,
    });
  } catch (error) {
    logEvidenceStorageFailure(error);
    await deleteOwnObjectBestEffort(actor, evidenceId, clientEvidenceId, stored.storageKey);
    recordEvidenceAuditEvent({
      action: "evidence.upload.index_failed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "failure",
      metadata: { client_evidence_id: clientEvidenceId, reason: "index_unavailable" },
    });
    throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_storage_unavailable", EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE);
  }

  if (markResult.outcome === "not_found") {
    await deleteOwnObjectBestEffort(actor, evidenceId, clientEvidenceId, stored.storageKey);
    recordEvidenceAuditEvent({
      action: "evidence.upload.index_failed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "failure",
      metadata: { client_evidence_id: clientEvidenceId, reason: "index_unavailable" },
    });
    throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_storage_unavailable", EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE);
  }

  if (markResult.outcome === "current") {
    // Outro envio igual ganhou a corrida: apaga o próprio objeto; fica o do vencedor. SHA diferente → 409.
    await deleteOwnObjectBestEffort(actor, evidenceId, clientEvidenceId, stored.storageKey);
    const winner = markResult.record;
    if (winner.checksumSha256 !== computedSha256) {
      throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_file_already_stored", "Evidence file is already stored with a different checksum.");
    }
    recordEvidenceAuditEvent({
      action: "evidence.upload.replayed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "success",
      metadata: { client_evidence_id: clientEvidenceId, mime_type: winner.mimeType, size_bytes: winner.sizeBytes, checksum_sha256: winner.checksumSha256 },
    });
    return storedResponseFromRecord(winner);
  }

  recordEvidenceAuditEvent({
    action: "evidence.upload.stored",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "success",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      checksum_sha256: stored.checksumSha256,
    },
  });

  return storedResponseFromRecord(markResult.record);
}

/**
 * B-EVIDENCIA-INDICE (§4.3) — a resposta `201 stored` montada DA LINHA (primeira resposta, reenvio e corrida usam a
 * mesma fonte). A allowlist do §2.8 fica: sem `storage_key`, sem `storage_provider`, sem o `id` interno da linha.
 * Os campos de arquivo são nulos só fora de `stored`; os fallbacks nunca disparam para uma linha `stored`.
 */
function storedResponseFromRecord(record: MobileEvidenceRecord): MobileEvidenceUploadResponse {
  return {
    contract: { name: CONTRACT_NAME, version: CONTRACT_VERSION, status: "partial" },
    evidence_id: `evidence:${record.tenantId}:${record.clientEvidenceId}`,
    file_id: record.fileId ?? "",
    status: "stored",
    size_bytes: record.sizeBytes ?? 0,
    mime_type: record.mimeType ?? "",
    content_type: record.mimeType ?? "",
    checksum_sha256: record.checksumSha256 ?? "",
    sha256: record.checksumSha256 ?? "",
    uploaded_at: (record.storedAt ?? new Date()).toISOString(),
  };
}

/**
 * B-EVIDENCIA-INDICE (§4.3) — apaga o objeto que ESTE envio acabou de gravar, melhor esforço. Se falhar, sobra um
 * objeto sem linha (não é perda: o blob continua no app e o reenvio guarda de novo); o evento `orphan_object` nasce
 * na trilha SEM a chave. A varredura de órfãos fica como pendência (§11).
 */
async function deleteOwnObjectBestEffort(
  actor: AuthenticatedActor,
  evidenceId: string,
  clientEvidenceId: string,
  storageKey: string,
): Promise<void> {
  try {
    await evidenceWriteProvider().deleteObject({ storageKey });
  } catch (error) {
    logEvidenceStorageFailure(error);
    recordEvidenceAuditEvent({
      action: "evidence.upload.orphan_object",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "failure",
      metadata: { client_evidence_id: clientEvidenceId, reason: "cleanup_failed" },
    });
  }
}

/**
 * §3.1 — `evfile_` + os 32 primeiros hexadecimais do SHA-256 de `<provedor>:<chave>`. Mantém o formato que o contrato e
 * o app já aceitam, deixa de ser aleatório e solto, e não revela a chave (é um resumo, sem volta).
 */
function evidenceFileId(stored: StoredChecklistStorageObject): string {
  return `evfile_${createHash("sha256").update(`${stored.storageProvider}:${stored.storageKey}`).digest("hex").slice(0, 32)}`;
}

/** §3.1 — saneamento de segmento da chave (função local, pura): só letra sem acento, dígito, ponto, sublinhado e hífen. */
function safeStorageSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

/** O segmento saneado. Vazio ou feito só de pontos → 400 `invalid_client_evidence_id`, antes de qualquer gravação. */
function requireStorageSegment(value: string): string {
  const segment = safeStorageSegment(value);
  if (segment === "" || /^\.+$/.test(segment)) {
    throw routeError(400, "BAD_REQUEST", "invalid_client_evidence_id", "client_evidence_id is invalid.");
  }
  return segment;
}

/**
 * §3.2 — o log da falha do armazenamento: operação, NOME e CÓDIGO do erro (espelho do `logReceiptFailure` do #525).
 * Nunca a mensagem, a chave, o caminho, o bucket nem o ARN: a mensagem do 403 do S3 traz os quatro.
 */
function logEvidenceStorageFailure(error: unknown): void {
  logger.warn(
    {
      event: "mobile_evidence_upload.failure",
      via: "V1",
      operation: "storage_save",
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: storageFailureCode(error),
    },
    "mobile evidence upload storage failed",
  );
}

function storageFailureCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as {
    readonly Code?: unknown;
    readonly code?: unknown;
    readonly $metadata?: { readonly httpStatusCode?: unknown };
  };
  if (typeof record.Code === "string" && record.Code !== "") return record.Code;
  if (typeof record.code === "string" && /^[A-Z][A-Z0-9_]*$/.test(record.code)) return record.code;
  if (typeof record.$metadata?.httpStatusCode === "number") return String(record.$metadata.httpStatusCode);
  return null;
}

function parseMultipartEvidenceUploadRequest(request: Request): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileCount = 0;
    let mimeType = "";
    let sizeBytes = 0;
    let terminalError: RouteLikeError | undefined;

    const fail = (error: RouteLikeError): void => {
      terminalError ??= error;
    };

    const busboy = Busboy({
      headers: request.headers,
      limits: {
        fields: 12,
        files: 1,
        fileSize: EVIDENCE_MAX_FILE_SIZE_BYTES,
      },
    });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (name, file, info) => {
      fileCount += 1;
      if (name !== "file" || fileCount > 1) {
        fail(routeError(400, "BAD_REQUEST", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      mimeType = info.mimeType.toLowerCase();

      file.on("limit", () => {
        chunks.length = 0;
        fail(routeError(413, "PAYLOAD_TOO_LARGE", "file_too_large", "File must not exceed 10 MB."));
      });

      file.on("data", (chunk: Buffer) => {
        if (terminalError) return;
        sizeBytes += chunk.length;
        chunks.push(chunk);
      });

      file.on("error", (error) => {
        reject(error);
      });
    });

    busboy.on("filesLimit", () => {
      fail(routeError(400, "BAD_REQUEST", "too_many_files", "Upload accepts one file only."));
    });

    busboy.on("error", (error) => {
      reject(error);
    });

    busboy.on("finish", () => {
      if (terminalError) {
        reject(terminalError);
        return;
      }

      if (fileCount !== 1 || chunks.length === 0) {
        reject(routeError(400, "BAD_REQUEST", "file_required", "file is required."));
        return;
      }

      resolve({
        fields,
        file: {
          buffer: Buffer.concat(chunks),
          mimeType,
          sizeBytes,
        },
      });
    });

    request.pipe(busboy);
  });
}

function assertUploadActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }
  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }
  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }
  if (!actor.permissions.includes("work_orders:update") && !actor.permissions.includes("field_location:send")) {
    throw routeError(403, "FORBIDDEN", "permission_required", "One of these permissions is required: work_orders:update, field_location:send.");
  }
}

function requiredField(fields: Map<string, string>, name: string): string {
  const value = fields.get(name)?.trim();
  if (!value) {
    throw routeError(400, "BAD_REQUEST", "required_field", `${name} is required.`);
  }
  return value;
}

function parsePositiveInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_number", `${field} must be a positive integer.`);
  }
  if (parsed > EVIDENCE_MAX_FILE_SIZE_BYTES) {
    throw routeError(413, "PAYLOAD_TOO_LARGE", "file_too_large", `${field} must not exceed 10 MB.`);
  }
  return parsed;
}

function normalizeContentType(fileMimeType: string, declaredContentType: string | undefined): string {
  const fileType = fileMimeType.toLowerCase();
  const declaredType = declaredContentType?.trim().toLowerCase() ?? "";
  if (EVIDENCE_ALLOWED_MIME_TYPES.has(fileType)) return fileType;
  if (fileType === "application/octet-stream" && EVIDENCE_ALLOWED_MIME_TYPES.has(declaredType)) return declaredType;
  return fileType || declaredType;
}

function isSafeClientEvidenceId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,120}$/.test(value) && !value.includes("..");
}

type RouteLikeError = {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
};

function routeError(statusCode: number, code: string, reason: string, message: string): RouteLikeError {
  return { statusCode, code, reason, message };
}

function recordRejectedEvidenceAudit(
  actor: AuthenticatedActor,
  evidenceId: string,
  clientEvidenceId: string,
  reason: string,
  sizeBytes: number,
  mimeType: string,
): void {
  recordEvidenceAuditEvent({
    action: "evidence.upload.rejected",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "failure",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      reason,
    },
  });
}
