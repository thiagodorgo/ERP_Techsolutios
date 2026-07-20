import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Série temporal de OS — AGREGADO READ-ONLY sobre work_orders que alimenta os GRÁFICOS TEMPORAIS reais do
// Dashboard operacional ("telas que abrem números mostram gráficos temporais"). Por DIA (bucket) e janela,
// conta OS: criadas (created_at), concluídas (completed_at, status completed) e canceladas (cancelled_at,
// status cancelled). SEM migração: só LÊ status/created_at/completed_at/cancelled_at. Tenant-scoped (RLS).
// Bucketing por DIA no FUSO DE NEGÓCIO (America/Sao_Paulo, via deriveBusinessDate — mesmo utilitário/approach
// de deriveCompetencia, P-Ω4-COMPETENCIA-TZ), NUNCA em UTC. Zero-fill server-side: todo dia da janela existe
// (0 quando vazio) → série contínua e honesta. §2.8: o DTO NUNCA expõe tenant_id/token/PII.

export const WORK_ORDER_COMPLETED_STATUS = "completed" as const;
export const WORK_ORDER_CANCELLED_STATUS = "cancelled" as const;

// Janela padrão (dias) e teto de dias — evita série ilimitada (payload/scan).
export const DEFAULT_TIMESERIES_DAYS = 30;
export const MAX_TIMESERIES_DAYS = 366;

export type WorkOrderTimeseriesActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Janela resolvida em DATAS CIVIS de negócio ('YYYY-MM-DD', America/Sao_Paulo), from<=to, inclusiva.
export type WorkOrderTimeseriesWindow = {
  readonly from: string; // YYYY-MM-DD (data civil de negócio)
  readonly to: string; // YYYY-MM-DD (data civil de negócio)
};

export type WorkOrderTimeseriesInput = {
  readonly tenantId: string;
  readonly window: WorkOrderTimeseriesWindow;
};

// Linha bruta lida de work_orders — só o MÍNIMO: status + os 3 timestamps que alimentam os buckets.
// completedAt/cancelledAt são nullable (nem toda OS os tem: legado/OS em aberto).
export type WorkOrderTimeseriesRow = {
  readonly status: string;
  readonly createdAt: Date;
  readonly completedAt?: Date | null;
  readonly cancelledAt?: Date | null;
};

export type WorkOrderTimeseriesPoint = {
  readonly date: string; // YYYY-MM-DD (data civil de negócio)
  readonly created: number;
  readonly completed: number;
  readonly cancelled: number;
};

export type WorkOrderTimeseriesResult = {
  readonly from: string;
  readonly to: string;
  readonly bucket: "day";
  readonly timezone: string;
  readonly points: readonly WorkOrderTimeseriesPoint[];
};

export class WorkOrderTimeseriesError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderTimeseriesError";
  }
}
