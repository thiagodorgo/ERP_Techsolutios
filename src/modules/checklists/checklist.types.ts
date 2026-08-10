export const CHECKLIST_TYPES = [
  "towing_collection",
  "towing_delivery",
  "technical_evidence",
  "custom",
] as const;

export type ChecklistType = (typeof CHECKLIST_TYPES)[number];

export const CHECKLIST_STATUSES = [
  "draft",
  "published",
  "inactive",
  "archived",
] as const;

export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const CHECKLIST_RUN_STATUSES = [
  "in_progress",
  "completed",
  "completed_with_divergence",
  "pending_acknowledgement",
  "cancelled",
] as const;

export type ChecklistRunStatus = (typeof CHECKLIST_RUN_STATUSES)[number];

export const CHECKLIST_COMPONENT_TYPES = [
  "vehicle_selector",
  "damage_map",
  "photo_upload",
  "observation",
  "comparison",
  "acknowledgement",
  "before_after",
  // CHECKLIST P1 PR-01 — alinha os tipos que o app Flutter (MobileChecklistFieldType) e o codec de sync JÁ aceitam
  // e renderizam, mas que o backend/builder web não conheciam. Appended ao fim: preserva a ordem do catálogo.
  "single_choice",
  "multi_choice",
  "signature",
] as const;

export type ChecklistComponentType = (typeof CHECKLIST_COMPONENT_TYPES)[number];

export type JsonRecord = Record<string, unknown>;

export type ChecklistTemplateComponent = {
  readonly id: string;
  readonly tenantId: string;
  readonly templateId: string;
  readonly componentKey: string;
  readonly type: ChecklistComponentType;
  readonly label: string;
  readonly required: boolean;
  readonly orderIndex: number;
  readonly config: JsonRecord;
  readonly validationRules: JsonRecord;
  readonly visibilityRules: JsonRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ChecklistTemplate = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly type: ChecklistType;
  readonly status: ChecklistStatus;
  readonly version: number;
  readonly schema: JsonRecord;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly publishedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly components: readonly ChecklistTemplateComponent[];
};

export type ChecklistRun = {
  readonly id: string;
  readonly tenantId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
  // P0a — chave durável de idempotência do replay de criação de run pelo mobile (local_run_id). Interno:
  // NÃO é exposto pelo toChecklistRunDto (sem valor para a UI e mantém a superfície pública enxuta).
  readonly clientRunKey?: string;
  // CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — vínculo de VERSÃO: quando esta run nasceu da reabertura de
  // uma vistoria concluída, guarda o id da run anterior (mesma organização) e o motivo declarado pelo gestor.
  // A vistoria original NUNCA é editada — a correção vira versão nova, encadeada por este campo.
  readonly reopenedFromRunId?: string;
  readonly reopenReason?: string;
  readonly status: ChecklistRunStatus;
  readonly startedBy?: string;
  readonly completedBy?: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ChecklistRunAnswer = {
  readonly id: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly componentId: string;
  readonly value: unknown;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ChecklistAttachment = {
  readonly id: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly componentId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly metadata: JsonRecord;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ChecklistMarker = {
  readonly id: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly componentId: string;
  readonly x: number;
  readonly y: number;
  readonly markerType: string;
  readonly description?: string;
  readonly metadata: JsonRecord;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ChecklistAcknowledgement = {
  readonly id: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly acknowledgedBy: string;
  readonly message: string;
  readonly observation?: string;
  readonly acknowledgedAt: Date;
  readonly metadata: JsonRecord;
};

export class ChecklistError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ChecklistError";
  }
}
