import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { CanonicalValue, ImpoundStatus } from "../impound/impound.types.js";

export type ReleaseActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-10a — enums em INGLÊS validados na APP (SEM CHECK de enum no banco). Labels PT-BR ficam no DTO.
// STANDARD   = restituição definitiva (art. 271 §1º). FOR_REPAIR = saída p/ reparo (art. 271 §2º) — declarado
//              AGORA p/ o PR-10b USÁ-LO; PR-10a só produz STANDARD.
export const RELEASE_KINDS = ["STANDARD", "FOR_REPAIR"] as const;
export type ReleaseKind = (typeof RELEASE_KINDS)[number];

// IN_PROGRESS = dossiê aberto (freeze T_stop feito). AUTHORIZED = ato da autoridade registrado. COMPLETED =
// consumada (RELEASED, sink I9). RETURNED = retorno do reparo (PR-10b).
export const RELEASE_STATUSES = ["IN_PROGRESS", "AUTHORIZED", "COMPLETED", "RETURNED"] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RECIPIENT_RELATIONSHIPS = ["OWNER", "ATTORNEY", "THIRD_PARTY"] as const;
export type RecipientRelationship = (typeof RECIPIENT_RELATIONSHIPS)[number];

// Item do checklist de liberação — SNAPSHOT do JurisdictionProfile.releaseRequirements no ATO (I9).
export type ReleaseRequirementCheck = {
  readonly id: string;
  readonly tenantId: string;
  readonly releaseId: string;
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly note?: string;
  readonly attachmentId?: string;
  readonly checkedBy?: string;
  readonly checkedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Dossiê da liberação. settledTotal = string canônica "0.00" (Decimal(12,2)).
export type ImpoundRelease = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly kind: ReleaseKind;
  readonly status: ReleaseStatus;
  readonly authorityApprovedBy?: string;
  readonly authorityApprovedAt?: Date;
  readonly authorityReference?: string;
  readonly authorityNote?: string;
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly recipientRelationship?: RecipientRelationship;
  readonly releasedAt?: Date;
  readonly repairDeadline?: Date;
  readonly settledTotal?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ReleaseView = {
  readonly release: ImpoundRelease;
  readonly checks: readonly ReleaseRequirementCheck[];
};

// Snapshot de UM requisito do perfil (o que o start congela na tabela-filha).
export type RequirementSnapshot = {
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
};

// ── Inputs de repositório ─────────────────────────────────────────────────────────────────────────────────────
export type StartReleaseInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // ACTIVE_CUSTODY (guarda de corrida sob lock)
  readonly kind: ReleaseKind;
  readonly requirements: readonly RequirementSnapshot[];
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly recipientRelationship?: RecipientRelationship;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Ω5P PR-10b — cria o dossiê FOR_REPAIR (IN_PROGRESS) SEM transicionar o processo (montar). Sem checklist (o
// FOR_REPAIR não exige requisitos — art. 271 §2º ≠ §1º). O partial-unique barra 2 liberações em curso.
export type StartForRepairInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedStatus: ImpoundStatus; // ACTIVE_CUSTODY (defensivo, evita dossiê órfão)
  readonly repairDeadline: Date;
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly recipientRelationship?: RecipientRelationship;
  readonly actorId?: string;
};

// Ω5P PR-10b — SAÍDA atômica: lock do processo (expectedFrom ACTIVE_CUSTODY) + re-verifica dossiê FOR_REPAIR
// aprovado+recipient+deadline sob lock + transição→RELEASED_FOR_REPAIR (setFrozenAt=false) + STATUS_CHANGE + vacate.
export type ExitForRepairInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly releaseId: string;
  readonly expectedFrom: ImpoundStatus; // ACTIVE_CUSTODY
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Ω5P PR-10b — RETORNO atômico: lock (expectedFrom RELEASED_FOR_REPAIR) + dossiê→RETURNED + STATUS_CHANGE (não congela).
export type ReturnFromRepairInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly releaseId: string;
  readonly expectedFrom: ImpoundStatus; // RELEASED_FOR_REPAIR
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type SetRecipientInput = {
  readonly tenantId: string;
  readonly releaseId: string;
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly recipientRelationship?: RecipientRelationship;
  readonly actorId?: string;
};

export type SetRequirementCheckInput = {
  readonly tenantId: string;
  readonly releaseId: string;
  readonly code: string;
  readonly satisfied: boolean;
  readonly note?: string;
  readonly attachmentId?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type ApproveReleaseInput = {
  readonly tenantId: string;
  readonly releaseId: string;
  readonly authorityReference?: string;
  readonly authorityNote?: string;
  readonly actorId?: string;
};

// Consumação (salto B). O gate resolvido pelo serviço é RE-VERIFICADO sob FOR UPDATE no repo (anti-TOCTOU).
export type ConsumeReleaseInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly releaseId: string;
  readonly expectedFrom: ImpoundStatus; // RELEASE_IN_PROGRESS
  readonly settledTotal: string;
  readonly overAccruedDailyIds: readonly string[]; // reconciliação: cada uma DEVE ter estorno (re-check sob lock)
  readonly eventPayload: CanonicalValue; // snapshot RELEASE (§2.8: só refs/hashes/valores-string — construído no serviço)
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export class ReleaseError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ReleaseError";
  }
}
