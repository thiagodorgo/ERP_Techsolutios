import type { Readable } from "node:stream";

import { createChecklistStorageProviderByName } from "../checklists/storage/checklist-storage.factory.js";
import type { ChecklistStorageObject, ChecklistStorageProviderName } from "../checklists/storage/checklist-storage.types.js";
import { assertStorageKeyWithinTenant } from "../evidence/storage-key-scope.js";
import { resolveMobileEvidenceRepository } from "../mobile/mobile-evidence-sync.js";
import type { MobileEvidenceRepository } from "../mobile/mobile-evidence.repository.js";
import type { MobileEvidenceRecord } from "../mobile/mobile-evidence.types.js";
import { createDefaultWorkOrderService, type WorkOrderService } from "./work-order.service.js";
import { WorkOrderError, type WorkOrderActorContext } from "./work-order.types.js";

// B-EVIDENCIA-INDICE (§5.1 e §5.2) — a LEITURA da evidência do app por OS. Espelho do anexo de OS
// (`work-order-attachment.service.ts`): mesma permissão (`work_orders:read`, aplicada na rota), mesma porta
// de escopo por objeto (`getForRead`, as 18 leituras do B-WO-LEITURA) e o mesmo egresso (stream no servidor
// por `sendVerifiedFile`, SEM URL assinada). Nenhuma permissão nova nasce aqui.
export type WorkOrderEvidenceActorContext = WorkOrderActorContext;

export type WorkOrderEvidenceDownload = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
};

/** §3.5 do plano do B-EVIDENCIA-DURAVEL — a mensagem fixa do 503. Nunca a mensagem do SDK ou do disco. */
const EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE = "Evidence storage is temporarily unavailable.";

export class WorkOrderEvidenceError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderEvidenceError";
  }
}

export class WorkOrderEvidenceService {
  constructor(
    private readonly repository: MobileEvidenceRepository,
    private readonly workOrderService: WorkOrderService,
  ) {}

  /**
   * §5.1 — a lista da evidência DA OS. A porta é `getForRead`: o técnico de campo só lê a OS dele, a OS
   * alheia responde o MESMO 404 da inexistente (`D-WO-LEITURA-404-ESCRITA-403`) e quem perdeu a OS perde a
   * leitura (`D-WO-LEITURA-EX-TECNICO`). O filtro de organização, de escopo `work_order` e de `deleted_at`
   * é do repositório (§4.1); aqui não se alarga nada.
   */
  async listEvidences(actor: WorkOrderEvidenceActorContext, workOrderId: string): Promise<readonly MobileEvidenceRecord[]> {
    const workOrder = await this.assertWorkOrderForRead(actor, workOrderId); // B-WO-LEITURA:evidencia-lista
    return this.repository.listByWorkOrder(actor.tenantId, workOrder.id);
  }

  /**
   * §5.2 — a foto é servida por stream no servidor: o objeto é lido pela chave guardada na linha, a chave é
   * conferida contra a organização DA LINHA antes de qualquer leitura (`assertStorageKeyWithinTenant`, teste
   * L7 e mutação MU8) e o tipo é re-derivado dos bytes no egresso (`sendVerifiedFile`, na rota).
   *
   * Códigos (§5.1): evidência inexistente ou de outra OS/organização → 404 `evidence_not_found`; observação
   * (sem arquivo) → 404 `evidence_file_not_found`; `awaiting_file` → 409 `evidence_file_not_ready` (molde
   * `attachment_not_ready`); chave fora da organização da linha → 404 `evidence_file_not_found`, idêntico ao
   * "sem chave", para não revelar que o objeto existe em outro lugar; falha do armazenamento → 503 com a
   * mensagem fixa.
   */
  async getEvidenceDownload(
    actor: WorkOrderEvidenceActorContext,
    workOrderId: string,
    evidenceId: string,
  ): Promise<WorkOrderEvidenceDownload> {
    const workOrder = await this.assertWorkOrderForRead(actor, workOrderId); // B-WO-LEITURA:evidencia-download
    const record = await this.repository.findByIdForWorkOrder(actor.tenantId, workOrder.id, evidenceId);
    if (!record) {
      throw evidenceNotFoundError();
    }
    if (record.fileStatus === "none") {
      throw evidenceFileNotFoundError();
    }
    if (record.fileStatus !== "stored") {
      throw new WorkOrderEvidenceError(
        409,
        "WORK_ORDER_EVIDENCE_NOT_READY",
        "evidence_file_not_ready",
        "Evidence file is not ready for download.",
      );
    }

    const provider = normalizeProvider(record.storageProvider);
    const storageKey = record.storageKey;
    if (!provider || !storageKey) {
      throw evidenceFileNotFoundError();
    }

    // B-O6R-07b (E1·2) — a chave tem de ficar dentro da organização DA LINHA antes de qualquer leitura.
    // É o 6º leitor de storage do sistema (§A1.3 do plano; cláusula C7 do censo de upload).
    assertStorageKeyWithinTenant(
      { storageKey, tenantId: record.tenantId, provider },
      () => evidenceFileNotFoundError(),
    );

    let object: ChecklistStorageObject;
    try {
      object = await createChecklistStorageProviderByName(provider).getObject({ storageKey });
    } catch {
      // A falha do armazenamento não revela chave, caminho nem provider: 503 com a mensagem fixa.
      throw new WorkOrderEvidenceError(
        503,
        "WORK_ORDER_EVIDENCE_STORAGE_UNAVAILABLE",
        "evidence_storage_unavailable",
        EVIDENCE_STORAGE_UNAVAILABLE_MESSAGE,
      );
    }

    return {
      body: object.body,
      fileName: downloadFileName(record),
      mimeType: object.mimeType ?? record.mimeType ?? "application/octet-stream",
      sizeBytes: object.sizeBytes ?? record.sizeBytes ?? undefined,
    };
  }

  /** A OS para LER: `getForRead`. A conversão do 404 é a mesma do inexistente — alheia e inexistente respondem igual. */
  private async assertWorkOrderForRead(actor: WorkOrderEvidenceActorContext, workOrderId: string) {
    try {
      return await this.workOrderService.getForRead(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new WorkOrderEvidenceError(404, "WORK_ORDER_NOT_FOUND", "work_order_not_found", "Work order was not found.");
      }
      throw error;
    }
  }
}

export function evidenceNotFoundError(): WorkOrderEvidenceError {
  return new WorkOrderEvidenceError(404, "WORK_ORDER_EVIDENCE_NOT_FOUND", "evidence_not_found", "Work order evidence was not found.");
}

export function evidenceFileNotFoundError(): WorkOrderEvidenceError {
  return new WorkOrderEvidenceError(404, "WORK_ORDER_EVIDENCE_NOT_FOUND", "evidence_file_not_found", "Evidence file not found.");
}

/**
 * O nome do arquivo no `Content-Disposition` é GERADO PELO SERVIDOR a partir do id público da linha.
 * Leitura do dev, declarada (§A6): o molde do anexo usa `path.basename(storageKey)`, mas a chave da evidência
 * carrega o id do usuário e o `client_evidence_id` (§4.3, `objectBaseName`), e o §5.3 proíbe os dois na
 * leitura. O tipo não depende deste nome: `sendVerifiedFile` o re-deriva dos bytes.
 */
function downloadFileName(record: MobileEvidenceRecord): string {
  const extension = record.mimeType === "image/png" ? "png" : record.mimeType === "image/jpeg" ? "jpg" : "bin";
  return `evidence-${record.id}.${extension}`;
}

function normalizeProvider(provider: string | null): ChecklistStorageProviderName | undefined {
  return provider === "s3" || provider === "local" ? provider : undefined;
}

/**
 * O repositório é resolvido A CADA chamada (`resolveMobileEvidenceRepository`, o mesmo ponto único do sync e
 * do upload): memória, Prisma com RLS ou a costura de teste, sem estado de módulo próprio — por isso esta
 * fábrica não precisa de `reset` e não guarda promise.
 */
export async function createDefaultWorkOrderEvidenceService(): Promise<WorkOrderEvidenceService> {
  return new WorkOrderEvidenceService(resolveMobileEvidenceRepository(), await createDefaultWorkOrderService());
}
