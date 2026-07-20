import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// J-MAPAS-7 (SPRINT ALOCAÇÃO) — Índice de conclusão de OS por TÉCNICO (operador de campo), AGREGADO
// READ-ONLY sobre work_orders. Alimenta o ranking de alocação do Mapa Operacional ("Maior índice de
// conclusão"). SEM migração: só LÊ assigned_user_id / status / created_at. Índice por operador =
// COUNT(status="completed") ÷ COUNT(atribuídas). completionRate = null quando assignedCount=0 (NUNCA
// 0 fabricado). Tenant-scoped (RLS); §2.8: o DTO NUNCA expõe tenant_id.

export const WORK_ORDER_COMPLETED_STATUS = "completed" as const;
export const WORK_ORDER_CANCELLED_STATUS = "cancelled" as const;

export type TechnicianPerformanceActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type TechnicianPerformanceInput = {
  readonly tenantId: string;
  // Opcional: recorta para UM técnico. O serviço sintetiza a linha zerada quando o técnico pedido não
  // tem OS atribuída na janela (completionRate=null, nunca lista vazia enganosa).
  readonly operatorUserId?: string;
  // Janela opcional por created_at da OS (inclusiva em ambos os limites).
  readonly from?: Date;
  readonly to?: Date;
};

// Linha bruta lida do work_orders — só a OS ATRIBUÍDA importa (não-atribuídas são descartadas antes do
// compute). createdAt alimenta a janela opcional.
export type WorkOrderPerformanceRow = {
  readonly operatorUserId: string;
  readonly status: string;
  readonly createdAt: Date;
};

export type TechnicianPerformanceRow = {
  readonly operatorUserId: string;
  readonly assignedCount: number;
  readonly completedCount: number;
  readonly cancelledCount: number;
  // 0..1 (concluídas ÷ atribuídas); null quando assignedCount=0.
  readonly completionRate: number | null;
};

export type TechnicianPerformanceResult = {
  readonly items: readonly TechnicianPerformanceRow[];
};

export class TechnicianPerformanceError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TechnicianPerformanceError";
  }
}
