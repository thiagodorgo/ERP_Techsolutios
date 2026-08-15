import type { ChecklistApplicabilityRole } from "./applicability/checklist-applicability.types.js";

/**
 * CHECKLIST P1 PR-04c (§5.4 do plano — MÉDIA 10) — a FASE com que a vistoria NASCEU, viajando na própria run.
 *
 * FONTE ÚNICA do vocabulário: é literalmente o mesmo tipo de `CHECKLIST_APPLICABILITY_ROLES`. Não há uma
 * segunda lista para sair de sincronia — estender a fase (o dono já antecipou `custody_field`/`custody_yard`)
 * é 1 linha na união TS + 1 migração que refaz os 3 CHECKs (regra, junção, run); o guard de paridade
 * CHECK×união reprova quem estender só um lado.
 *
 * `import type` de propósito: é apagado na compilação, então NÃO cria aresta de runtime entre este arquivo e o
 * subdiretório de aplicabilidade (que, por sua vez, importa `ChecklistError` daqui em runtime).
 */
export type ChecklistRunRole = ChecklistApplicabilityRole;

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
  // CHECKLIST P1 PR-04c (§9) — a FASE com que esta vistoria nasceu (coleta/entrega/genérica), carimbada pelo
  // despacho a partir da linha da junção. `undefined` nas runs anteriores a esta fatia e nas criadas à mão
  // (web/mobile), que não nascem de uma linha de aplicabilidade.
  //
  // ELA NÃO É EXPOSTA PELO `toChecklistRunDto` NESTA FATIA — e isso é decisão, não esquecimento: o enum do app
  // (`MobileChecklistRunKind`) conhece só `collection|delivery` e manda todo o resto para `unknown`, e uma run
  // `unknown` faz a tela de comparação RECUSAR comparar com "Atualize o aplicativo". Expor `generic` (a
  // configuração default) ou `null` (100% das ordens em voo no dia do deploy) travaria a comparação da
  // organização inteira num app que já está atualizado. O guard de ausência vive em
  // `tests/field-dispatch-multi-checklist.test.ts` e lista as 5 exigências para expor.
  readonly role?: ChecklistRunRole;
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
