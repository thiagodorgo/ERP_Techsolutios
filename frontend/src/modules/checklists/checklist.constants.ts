import type {
  ChecklistRunStatus,
  TenantChecklistComponentType,
  TenantChecklistStatus,
  TenantChecklistType,
} from "./types";

export const CHECKLIST_TYPES: TenantChecklistType[] = [
  "towing_collection",
  "towing_delivery",
  "technical_evidence",
  "custom",
];

export const CHECKLIST_RUN_STATUSES: Exclude<ChecklistRunStatus, "cancelled">[] = [
  "in_progress",
  "completed",
  "completed_with_divergence",
  "pending_acknowledgement",
];

export const checklistTypeLabel: Record<TenantChecklistType, string> = {
  towing_collection: "Guincho - coleta",
  towing_delivery: "Guincho - entrega",
  technical_evidence: "Evidência técnica",
  custom: "Customizado",
};

export const checklistStatusLabel: Record<TenantChecklistStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const runStatusLabel: Record<Exclude<ChecklistRunStatus, "cancelled">, string> = {
  in_progress: "Em andamento",
  completed: "Concluido",
  completed_with_divergence: "Com divergencia",
  pending_acknowledgement: "Pendente de ciencia",
};

export const checklistComponentTypeLabel: Record<TenantChecklistComponentType, string> = {
  vehicle_selector: "Seletor de veiculo",
  damage_map: "Mapa de avarias",
  photo_upload: "Foto",
  observation: "Observação",
  comparison: "Comparacao",
  acknowledgement: "Ciencia",
  before_after: "Antes e depois",
};

export const checklistStatusOptions: Array<TenantChecklistStatus | "all" | "pending_changes"> = [
  "all",
  "draft",
  "published",
  "inactive",
  "pending_changes",
];
