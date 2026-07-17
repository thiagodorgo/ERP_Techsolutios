import type { WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-8a — aba "Logs da OS" (leitura da auditoria). Espelha o DTO do backend (work-order-audit-log):
// quem [actorName/actorUserId] · o quê [action] · quando [createdAt]. §2.8: sem tenant_id no payload;
// `actorUserId` é referência técnica opaca (nunca renderizada) — a UI mostra `actorName` (ou "Sistema").

export type WorkOrderAuditLog = {
  readonly id: string;
  readonly action: string;
  // Referência técnica opaca (não renderizada). O que a UI exibe é `actorName` (null → "Sistema").
  readonly actorUserId: string | null;
  readonly actorName: string | null;
  readonly entity: string;
  readonly entityId: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
};

export type WorkOrderAuditLogList = {
  readonly items: readonly WorkOrderAuditLog[];
};

export type WorkOrderAuditLogApiContext = WorkOrdersApiContext;
