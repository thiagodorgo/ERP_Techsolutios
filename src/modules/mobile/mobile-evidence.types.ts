// B-EVIDENCIA-INDICE — F2: o registro durável da evidência do app (metadado, recibo de idempotência e
// vínculo com o arquivo). A forma espelha a tabela `mobile_evidences` (§3.1 do plano). O repositório
// Prisma com RLS chega na F2b, depois da autorização nominal da migração; aqui vivem os tipos e a memória.

export type EvidenceActionType =
  | "evidence.work_order_photo"
  | "evidence.work_order_signature"
  | "evidence.work_order_observation"
  | "evidence.field_photo"
  | "evidence.field_signature"
  | "evidence.field_observation";

export type EvidenceScope = "work_order" | "field";
export type EvidenceKind = "photo" | "signature" | "observation";
export type EvidenceFileStatus = "none" | "awaiting_file" | "stored";

export type MobileEvidenceRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly clientEvidenceId: string;
  readonly actionType: EvidenceActionType;
  readonly scope: EvidenceScope;
  readonly kind: EvidenceKind;
  readonly workOrderId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly fingerprintSha256: string;
  readonly localCreatedAt: Date;
  readonly fileStatus: EvidenceFileStatus;
  readonly fileId: string | null;
  readonly storageProvider: string | null;
  readonly storageKey: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly checksumSha256: string | null;
  readonly storedAt: Date | null;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
};

export type CreateMobileEvidenceInput = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly clientEvidenceId: string;
  readonly actionType: EvidenceActionType;
  readonly scope: EvidenceScope;
  readonly kind: EvidenceKind;
  readonly workOrderId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly fingerprintSha256: string;
  readonly localCreatedAt: Date;
  readonly fileStatus: EvidenceFileStatus;
};

export type StoredEvidenceFileInput = {
  readonly fileId: string;
  readonly storageProvider: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly storedAt: Date;
};

// O `createAccepted` nunca lança por erro de DADO: devolve `invalid` com o reason (§E1.4). `user_required` é
// a FK do ator (§8.4, D13): o usuário não tem linha em `users` desta organização. Só o que o tempo resolve
// (conexão, timeout) relança, e o sync responde 503 `evidence_index_unavailable`.
export type CreateAcceptedResult =
  | { readonly outcome: "created"; readonly record: MobileEvidenceRecord }
  | { readonly outcome: "duplicate" }
  | { readonly outcome: "invalid"; readonly reason: "metadata_too_large" | "metadata_not_storable" | "user_required" };

// Troca condicional do §4.3: só grava se `file_status = awaiting_file`; senão devolve a linha atual.
export type MarkFileStoredResult =
  | { readonly outcome: "updated"; readonly record: MobileEvidenceRecord }
  | { readonly outcome: "current"; readonly record: MobileEvidenceRecord }
  | { readonly outcome: "not_found" };
