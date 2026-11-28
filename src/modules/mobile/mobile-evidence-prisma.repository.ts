// B-EVIDENCIA-INDICE — F2b: o repositório da evidência no BANCO, com RLS. Espelha o contrato do
// repositório em memória da F2a (`mobile-evidence.repository.ts`): os mesmos métodos, os mesmos
// resultados e a mesma ordem. Duas camadas de isolamento, como manda o §3.4 do plano: o RLS
// ENABLE+FORCE da migração `20261127000000_add_mobile_evidences` E o `tenant_id` em todo `where`
// do código (o caso D8 prova o filtro do código sobre uma conexão que contorna o RLS).
//
// `storage_provider` e `storage_key` são colunas INTERNAS: entram e saem daqui, e nenhum DTO,
// trilha ou log as expõe (§3.2 do plano).
import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { MobileEvidenceRepository } from "./mobile-evidence.repository.js";
import type {
  CreateAcceptedResult,
  CreateMobileEvidenceInput,
  EvidenceActionType,
  EvidenceFileStatus,
  EvidenceKind,
  EvidenceScope,
  MarkFileStoredResult,
  MobileEvidenceRecord,
  StoredEvidenceFileInput,
} from "./mobile-evidence.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const METADATA_SIZE_CONSTRAINT = "mobile_evidences_metadata_chk";

export class PrismaMobileEvidenceRepository implements MobileEvidenceRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async findByClientEvidenceId(tenantId: string, userId: string, clientEvidenceId: string): Promise<MobileEvidenceRecord | undefined> {
    // Linha com `deleted_at` preenchido TAMBÉM conta: evidência excluída logicamente não renasce por
    // reenvio (§3.3 do plano — o único de idempotência não tem filtro por `deleted_at`).
    const record = await this.client.mobileEvidence.findFirst({
      where: { tenant_id: tenantId, actor_user_id: userId, client_evidence_id: clientEvidenceId },
    });
    return record ? mapRecord(record) : undefined;
  }

  async createAccepted(input: CreateMobileEvidenceInput): Promise<CreateAcceptedResult> {
    try {
      const record = await this.client.mobileEvidence.create({
        data: {
          tenant_id: input.tenantId,
          actor_user_id: input.actorUserId,
          client_evidence_id: input.clientEvidenceId,
          action_type: input.actionType,
          scope: input.scope,
          kind: input.kind,
          work_order_id: input.workOrderId,
          metadata: input.metadata as Prisma.InputJsonValue,
          fingerprint_sha256: input.fingerprintSha256,
          local_created_at: input.localCreatedAt,
          file_status: input.fileStatus,
        },
      });
      return { outcome: "created", record: mapRecord(record) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { outcome: "duplicate" };
      }
      // §E1.4 do plano: erro de DADO nunca é 503 e nunca é `accepted`. A classificação é pelo
      // SQLSTATE e pelo nome da restrição, nunca pelo texto da mensagem para o usuário.
      if (isCheckViolation(error)) {
        return mentionsConstraint(error, METADATA_SIZE_CONSTRAINT)
          ? { outcome: "invalid", reason: "metadata_too_large" }
          : { outcome: "invalid", reason: "metadata_not_storable" };
      }
      if (isDataExceptionClass(error)) {
        // Classe 22 — por exemplo 22P05, o caractere nulo (U+0000) dentro de um texto, que o JSONB não guarda.
        return { outcome: "invalid", reason: "metadata_not_storable" };
      }
      throw error;
    }
  }

  async markFileStored(tenantId: string, userId: string, clientEvidenceId: string, file: StoredEvidenceFileInput): Promise<MarkFileStoredResult> {
    // Troca CONDICIONAL (§4.3 do plano): só grava se a linha ainda está em `awaiting_file`. O `updateMany`
    // com a condição no `where` é o que faz dois reenvios simultâneos terem UM vencedor só (D6).
    const updated = await this.client.mobileEvidence.updateMany({
      where: { tenant_id: tenantId, actor_user_id: userId, client_evidence_id: clientEvidenceId, file_status: "awaiting_file" },
      data: {
        file_status: "stored",
        file_id: file.fileId,
        storage_provider: file.storageProvider,
        storage_key: file.storageKey,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        checksum_sha256: file.checksumSha256,
        stored_at: file.storedAt,
      },
    });

    if (updated.count > 0) {
      const record = await this.findByClientEvidenceId(tenantId, userId, clientEvidenceId);
      if (record) {
        return { outcome: "updated", record };
      }
    }

    const current = await this.findByClientEvidenceId(tenantId, userId, clientEvidenceId);
    return current ? { outcome: "current", record: current } : { outcome: "not_found" };
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly MobileEvidenceRecord[]> {
    const items = await this.client.mobileEvidence.findMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, scope: "work_order", deleted_at: null },
      orderBy: [{ created_at: "desc" }],
    });
    return items.map(mapRecord);
  }

  async findByIdForWorkOrder(tenantId: string, workOrderId: string, id: string): Promise<MobileEvidenceRecord | undefined> {
    const record = await this.client.mobileEvidence.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }
}

export class RlsPrismaMobileEvidenceRepository implements MobileEvidenceRepository {
  constructor(private readonly resolveClient: () => Promise<PrismaClient>) {}

  findByClientEvidenceId(tenantId: string, userId: string, clientEvidenceId: string): Promise<MobileEvidenceRecord | undefined> {
    return this.run(tenantId, (tx) => new PrismaMobileEvidenceRepository(tx).findByClientEvidenceId(tenantId, userId, clientEvidenceId));
  }

  createAccepted(input: CreateMobileEvidenceInput): Promise<CreateAcceptedResult> {
    return this.run(input.tenantId, (tx) => new PrismaMobileEvidenceRepository(tx).createAccepted(input));
  }

  markFileStored(tenantId: string, userId: string, clientEvidenceId: string, file: StoredEvidenceFileInput): Promise<MarkFileStoredResult> {
    return this.run(tenantId, (tx) => new PrismaMobileEvidenceRepository(tx).markFileStored(tenantId, userId, clientEvidenceId, file));
  }

  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly MobileEvidenceRecord[]> {
    return this.run(tenantId, (tx) => new PrismaMobileEvidenceRepository(tx).listByWorkOrder(tenantId, workOrderId));
  }

  findByIdForWorkOrder(tenantId: string, workOrderId: string, id: string): Promise<MobileEvidenceRecord | undefined> {
    return this.run(tenantId, (tx) => new PrismaMobileEvidenceRepository(tx).findByIdForWorkOrder(tenantId, workOrderId, id));
  }

  private async run<T>(tenantId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withTenantRls(await this.resolveClient(), tenantId, work);
  }
}

// O resolvedor do sync é SÍNCRONO (é valor padrão de parâmetro e o upload o chama sem `await`), então o
// cliente do Prisma é importado SOB DEMANDA na primeira chamada — o mesmo `import()` dinâmico do molde
// `createPrismaWorkOrderAttachmentRepository`, só que adiado para dentro do método.
let prismaClientPromise: Promise<PrismaClient> | undefined;

function resolvePrismaClient(): Promise<PrismaClient> {
  prismaClientPromise ??= import("../../database/prisma.js").then((module) => module.prisma);
  return prismaClientPromise;
}

export function createMobileEvidencePrismaRepository(): RlsPrismaMobileEvidenceRepository {
  return new RlsPrismaMobileEvidenceRepository(resolvePrismaClient);
}

export function resetMobileEvidencePrismaRepositoryForTests(): void {
  prismaClientPromise = undefined;
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly actor_user_id: string;
  readonly client_evidence_id: string;
  readonly action_type: string;
  readonly scope: string;
  readonly kind: string;
  readonly work_order_id: string | null;
  readonly metadata: Prisma.JsonValue;
  readonly fingerprint_sha256: string;
  readonly local_created_at: Date;
  readonly file_status: string;
  readonly file_id: string | null;
  readonly storage_provider: string | null;
  readonly storage_key: string | null;
  readonly mime_type: string | null;
  readonly size_bytes: number | null;
  readonly checksum_sha256: string | null;
  readonly stored_at: Date | null;
  readonly created_at: Date;
  readonly deleted_at: Date | null;
}): MobileEvidenceRecord {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    actorUserId: record.actor_user_id,
    clientEvidenceId: record.client_evidence_id,
    actionType: record.action_type as EvidenceActionType,
    scope: record.scope as EvidenceScope,
    kind: record.kind as EvidenceKind,
    workOrderId: record.work_order_id,
    metadata: (record.metadata as Record<string, unknown> | null) ?? {},
    fingerprintSha256: record.fingerprint_sha256,
    localCreatedAt: record.local_created_at,
    fileStatus: record.file_status as EvidenceFileStatus,
    fileId: record.file_id,
    storageProvider: record.storage_provider,
    storageKey: record.storage_key,
    mimeType: record.mime_type,
    sizeBytes: record.size_bytes,
    checksumSha256: record.checksum_sha256,
    storedAt: record.stored_at,
    createdAt: record.created_at,
    deletedAt: record.deleted_at,
  };
}

// Molde: `databaseErrorCodes`/`isCheckViolation` de
// `src/modules/checklists/applicability/checklist-applicability-prisma.repository.ts`. Com o driver
// adapter do PostgreSQL o SQLSTATE real nem sempre aparece no topo: é preciso varrer `code`,
// `originalCode`, `cause`, `meta` e `driverAdapterError`.
function databaseErrorCodes(error: unknown): readonly string[] {
  const codes: string[] = [];

  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 5 || typeof candidate !== "object" || candidate === null) return;
    const record = candidate as Record<string, unknown>;
    for (const key of ["code", "originalCode"]) {
      if (typeof record[key] === "string") codes.push(record[key] as string);
    }
    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };

  collect(error, 0);
  return codes;
}

function hasDatabaseErrorCode(error: unknown, codes: readonly string[]): boolean {
  const found = new Set(databaseErrorCodes(error));
  return codes.some((code) => found.has(code));
}

function isUniqueViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, ["P2002", "23505"]);
}

function isCheckViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, ["23514"]);
}

// Classe 22 do SQLSTATE (`data_exception`): 22P05 é o nulo dentro de texto, que o JSONB recusa.
function isDataExceptionClass(error: unknown): boolean {
  return databaseErrorCodes(error).some((code) => /^22[0-9A-Z]{3}$/.test(code));
}

// O nome da restrição vem na mensagem do servidor (`new row for relation ... violates check constraint
// "mobile_evidences_metadata_chk"`). É o ÚNICO lugar em que se lê texto de erro: a decisão é pelo
// SQLSTATE, e o texto só distingue QUAL restrição de verificação falhou.
function mentionsConstraint(error: unknown, constraint: string): boolean {
  const seen = new Set<unknown>();
  const walk = (candidate: unknown, depth: number): boolean => {
    if (depth > 5 || candidate === null || seen.has(candidate)) return false;
    if (typeof candidate === "object") {
      seen.add(candidate);
      const record = candidate as Record<string, unknown>;
      for (const key of ["message", "cause", "meta", "driverAdapterError"]) {
        if (walk(record[key], depth + 1)) return true;
      }
      return false;
    }
    return typeof candidate === "string" && candidate.includes(constraint);
  };
  return walk(error, 0);
}
