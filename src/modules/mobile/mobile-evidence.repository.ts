// B-EVIDENCIA-INDICE — F2a: a interface do repositório da evidência e a implementação EM MEMÓRIA.
// Em memória a regra é a mesma do banco: único por organização + usuário + código (excluída não renasce) e
// a troca condicional do `markFileStored`. O repositório Prisma com RLS (`mobile-evidence-prisma.repository.ts`)
// chega na F2b, depois da autorização nominal da migração.
import { randomUUID } from "node:crypto";

import type {
  CreateAcceptedResult,
  CreateMobileEvidenceInput,
  MarkFileStoredResult,
  MobileEvidenceRecord,
  StoredEvidenceFileInput,
} from "./mobile-evidence.types.js";

// O mesmo número do serviço e do CHECK do banco (§E1.4). A memória mede o JSON compacto, como o serviço;
// a faixa entre o compacto e o texto do JSONB só existe com banco (declarado no plano).
export const MOBILE_EVIDENCE_METADATA_MAX_BYTES = 16384;

export interface MobileEvidenceRepository {
  findByClientEvidenceId(tenantId: string, userId: string, clientEvidenceId: string): Promise<MobileEvidenceRecord | undefined>;
  createAccepted(input: CreateMobileEvidenceInput): Promise<CreateAcceptedResult>;
  markFileStored(tenantId: string, userId: string, clientEvidenceId: string, file: StoredEvidenceFileInput): Promise<MarkFileStoredResult>;
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly MobileEvidenceRecord[]>;
  findByIdForWorkOrder(tenantId: string, workOrderId: string, id: string): Promise<MobileEvidenceRecord | undefined>;
}

function idempotencyKey(tenantId: string, userId: string, clientEvidenceId: string): string {
  return `${tenantId}:${userId}:${clientEvidenceId}`;
}

function cloneRecord(record: MobileEvidenceRecord): MobileEvidenceRecord {
  return structuredClone(record);
}

export class InMemoryMobileEvidenceRepository implements MobileEvidenceRepository {
  private readonly records = new Map<string, MobileEvidenceRecord>();

  // Caminho SÍNCRONO usado pelo helper de recibo do upload enquanto o upload não passa ao repositório (F3).
  findRecordSync(tenantId: string, userId: string, clientEvidenceId: string): MobileEvidenceRecord | undefined {
    const record = this.records.get(idempotencyKey(tenantId, userId, clientEvidenceId));
    return record ? cloneRecord(record) : undefined;
  }

  async findByClientEvidenceId(tenantId: string, userId: string, clientEvidenceId: string): Promise<MobileEvidenceRecord | undefined> {
    return this.findRecordSync(tenantId, userId, clientEvidenceId);
  }

  async createAccepted(input: CreateMobileEvidenceInput): Promise<CreateAcceptedResult> {
    const key = idempotencyKey(input.tenantId, input.actorUserId, input.clientEvidenceId);
    if (this.records.has(key)) {
      return { outcome: "duplicate" };
    }

    if (Buffer.byteLength(JSON.stringify(input.metadata), "utf8") > MOBILE_EVIDENCE_METADATA_MAX_BYTES) {
      return { outcome: "invalid", reason: "metadata_too_large" };
    }

    const record: MobileEvidenceRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      clientEvidenceId: input.clientEvidenceId,
      actionType: input.actionType,
      scope: input.scope,
      kind: input.kind,
      workOrderId: input.workOrderId,
      metadata: structuredClone(input.metadata),
      fingerprintSha256: input.fingerprintSha256,
      localCreatedAt: input.localCreatedAt,
      fileStatus: input.fileStatus,
      fileId: null,
      storageProvider: null,
      storageKey: null,
      mimeType: null,
      sizeBytes: null,
      checksumSha256: null,
      storedAt: null,
      createdAt: new Date(),
      deletedAt: null,
    };
    this.records.set(key, record);
    return { outcome: "created", record: cloneRecord(record) };
  }

  async markFileStored(tenantId: string, userId: string, clientEvidenceId: string, file: StoredEvidenceFileInput): Promise<MarkFileStoredResult> {
    const key = idempotencyKey(tenantId, userId, clientEvidenceId);
    const record = this.records.get(key);
    if (!record) {
      return { outcome: "not_found" };
    }
    if (record.fileStatus !== "awaiting_file") {
      return { outcome: "current", record: cloneRecord(record) };
    }
    const stored: MobileEvidenceRecord = {
      ...record,
      fileStatus: "stored",
      fileId: file.fileId,
      storageProvider: file.storageProvider,
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      checksumSha256: file.checksumSha256,
      storedAt: file.storedAt,
    };
    this.records.set(key, stored);
    return { outcome: "updated", record: cloneRecord(stored) };
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly MobileEvidenceRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.tenantId === tenantId && record.workOrderId === workOrderId && record.scope === "work_order" && record.deletedAt === null)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(cloneRecord);
  }

  async findByIdForWorkOrder(tenantId: string, workOrderId: string, id: string): Promise<MobileEvidenceRecord | undefined> {
    const record = [...this.records.values()].find(
      (item) => item.tenantId === tenantId && item.workOrderId === workOrderId && item.id === id && item.deletedAt === null,
    );
    return record ? cloneRecord(record) : undefined;
  }

  /**
   * COSTURA DE TESTE (plano §8.3 L10, que mata a metade em memória da MU17): o delete lógico de uma linha já
   * gravada. Este bloco não cria rota de exclusão nenhuma (§3.1); sem a costura não há como uma linha em
   * memória ter `deleted_at`, e o filtro de `deleted_at` das duas leituras ficaria sem teste. Só memória —
   * o equivalente com banco é o `UPDATE` direto no preparo do D10 (§E1.8).
   */
  setDeletedAtForTests(tenantId: string, userId: string, clientEvidenceId: string, deletedAt: Date | null): boolean {
    const key = idempotencyKey(tenantId, userId, clientEvidenceId);
    const record = this.records.get(key);
    if (!record) {
      return false;
    }
    this.records.set(key, { ...record, deletedAt });
    return true;
  }

  clear(): void {
    this.records.clear();
  }
}
