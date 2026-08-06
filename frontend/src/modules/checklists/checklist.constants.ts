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

// CHECKLIST P1 PR-02a — rótulos EXATOS do protótipo do dono (Modelos de Checklist.dc.html):
// travessão (—) e acentuação corretas; "Personalizado" (não "Customizado"). §3: a UI nunca
// renderiza a chave técnica.
export const checklistTypeLabel: Record<TenantChecklistType, string> = {
  towing_collection: "Guincho — Coleta",
  towing_delivery: "Guincho — Entrega",
  technical_evidence: "Evidência técnica",
  custom: "Personalizado",
};

export const checklistStatusLabel: Record<TenantChecklistStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const runStatusLabel: Record<Exclude<ChecklistRunStatus, "cancelled">, string> = {
  in_progress: "Em andamento",
  completed: "Concluído",
  completed_with_divergence: "Com divergência",
  pending_acknowledgement: "Pendente de ciência",
};

export const checklistComponentTypeLabel: Record<TenantChecklistComponentType, string> = {
  vehicle_selector: "Seletor de veículo",
  damage_map: "Mapa de avarias",
  photo_upload: "Foto",
  observation: "Observação",
  comparison: "Comparação",
  acknowledgement: "Ciência",
  before_after: "Antes e depois",
  single_choice: "Escolha única",
  multi_choice: "Múltipla escolha",
  signature: "Assinatura",
};

// Descrições do protótipo (paleta do builder e resumos).
export const checklistComponentTypeDescription: Record<TenantChecklistComponentType, string> = {
  vehicle_selector: "Tipo do veículo e imagem da vistoria",
  damage_map: "Marca avarias sobre a imagem do veículo",
  photo_upload: "Coleta fotos pela câmera ou galeria",
  observation: "Texto livre para anotações do técnico",
  comparison: "Compara a entrega com a coleta",
  acknowledgement: "Ciência formal de responsabilidade",
  before_after: "Evidência técnica em dois estágios",
  single_choice: "Uma opção entre várias",
  multi_choice: "Uma ou mais opções",
  signature: "Assinatura do cliente ou responsável",
};

/**
 * NUNCA renderizar o rótulo cru do catálogo do backend (ele devolve sem acento): o mapa local
 * manda; tipo desconhecido cai no rótulo enviado pelo backend (fallback honesto — nunca a chave).
 */
export function resolveChecklistComponentTypeLabel(type: string, backendLabel: string): string {
  return (checklistComponentTypeLabel as Record<string, string | undefined>)[type] ?? backendLabel;
}

export function resolveChecklistComponentTypeDescription(type: string, backendDescription: string): string {
  return (checklistComponentTypeDescription as Record<string, string | undefined>)[type] ?? backendDescription;
}
