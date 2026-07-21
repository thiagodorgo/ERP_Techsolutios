// PR-01 Ω4C — anexos genéricos (a aba "Arquivos" polimórfica do AutEM, recriada no visual do ERP).
// Espelha o AttachmentDto do backend na allow-list §2.8: a UI SÓ enxerga id/entityType/entityId/
// fileName/extension/contentType/sizeBytes/status/downloadPath/uploadedByName/uploadedAt. NUNCA
// storageKey/checksum/fileUrl/tenant_id — o DTO sequer os expõe. `status='stored'` governa o
// download (só stored é baixável). D-007: o front nunca fabrica anexo; mock/erro/403 devolvem lista
// vazia honesta e a UI mostra o estado correspondente.

// Allow-list v1 (D-Ω4C-ANEXOS-ENTITYTYPES): o MESMO componente serve qualquer entidade abaixo.
export type AttachmentEntityType = "damage" | "fine" | "insurance_policy" | "maintenance_order";

export type AttachmentStatus = "stored" | "pending_review" | "rejected" | "scan_failed";

// Projeção segura para a UI (§2.8): só o que a aba mostra. Sem storageKey/checksum/fileUrl/tenant_id.
export type AttachmentView = {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly fileName: string;
  readonly extension: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly status: AttachmentStatus;
  // Caminho opaco de download servido pelo backend (sem storage key). Só usável quando status=stored.
  readonly downloadPath: string | null;
  // §11.2 — a UI exibe o NOME (resolvido no backend); o UUID de quem enviou nunca é renderizado.
  readonly uploadedByName?: string;
  readonly uploadedAt: string; // "dd/mm HH:mm" em America/Sao_Paulo (formatado pelo adapter); "—" se ausente
};

export type AttachmentsSource = "api" | "mock" | "fallback";

export type AttachmentsData = {
  readonly items: readonly AttachmentView[];
  readonly source: AttachmentsSource;
  readonly forbidden: boolean;
};

// Contexto de auth+tenant (claims do JWT); o backend é a autoridade final de autorização.
export type AttachmentsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Resultado do download autenticado → object URL (revogado pela tela após o clique).
export type AttachmentDownloadResult = {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly fileName: string;
  readonly contentType: string;
};

// Lista VAZIA honesta (mock/erro/403): sem inventar anexo (D-007). A UI mostra o estado honesto.
export function emptyAttachments(source: AttachmentsSource): AttachmentsData {
  return { items: [], source, forbidden: false };
}
