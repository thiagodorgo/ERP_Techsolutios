import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω3F-8a — LEITURA da auditoria (AuditLog) filtrada por OS ("aba Logs da OS"). Módulo PRÓPRIO,
// montado no app.ts (padrão work-order-comments), para NÃO fazer core-saas/audit importar
// work-orders (audit é escrito por todos os módulos → ciclo). Só leitura; nunca escreve.

/** Entidade auditada que a aba Logs consulta. Hoje só a OS; o filtro é sempre por entidade+id. */
export const WORK_ORDER_AUDIT_ENTITY = "work_order";

/** Teto de registros lidos por consulta (a UI mostra os mais recentes; sem paginação nesta fatia). */
export const WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT = 200;

export type WorkOrderAuditLogActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Modelo de leitura normalizado (memory + prisma convergem para ele). §2.8: NUNCA carrega tenant_id —
// o recorte de tenant é do ator autenticado e o DTO jamais o emite. `metadata` é sanitizado na leitura.
export type WorkOrderAuditLogEntry = {
  readonly id: string;
  readonly actorUserId: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
};
