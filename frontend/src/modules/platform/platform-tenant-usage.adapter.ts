import { apiData } from "../../services/api/client";

// B-ASS-10b (T5, F10) — uso medido POR ORGANIZAÇÃO no detalhe da organização da plataforma
// (`GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary`, gate `platform:cloud-usage:read`; `API_CONTRACTS.md`).
// O "Uso medido" saiu da tela de custos (que agora pede `platform:cloud-cost-allocation:read` e `platform:billing:read`) e
// veio para cá, pela recomendação aceita em `D-DONO-1311-RECOMENDACOES`. `mapUsageSummary` era do módulo da tela de
// custos e mudou de casa junto (plano v2, §6.1).
// Normalização defensiva (D-007): métrica sem chave, ou com quantidade que não é número finito e não negativo, é
// DESCARTADA — nunca vira zero. §2.8: o identificador da organização só monta a rota; a resposta traz `tenantId` e ele
// não é copiado para o modelo da tela.

export type TenantUsageMetric = {
  readonly metricKey: string;
  readonly quantity: number;
  readonly unit: string;
};

export type TenantUsageSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metrics: readonly TenantUsageMetric[];
  readonly generatedAt: string;
};

export type TenantUsagePeriod = {
  readonly start: string;
  readonly end: string;
};

export function tenantUsageSummaryPath(tenantId: string, period: TenantUsagePeriod): string {
  const query = new URLSearchParams({ periodStart: period.start, periodEnd: period.end });
  return `/platform/cloud-usage/tenants/${encodeURIComponent(tenantId)}/summary?${query.toString()}`;
}

export async function getTenantUsageSummaryFromApi(tenantId: string, period: TenantUsagePeriod): Promise<TenantUsageSummary> {
  return mapUsageSummary(await apiData<unknown>(tenantUsageSummaryPath(tenantId, period)));
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

export function mapUsageSummary(data: unknown): TenantUsageSummary {
  const row = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const metrics = Array.isArray(row.metrics) ? row.metrics : [];
  return {
    periodStart: text(row.periodStart),
    periodEnd: text(row.periodEnd),
    metrics: metrics
      .map((raw) => (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null))
      .filter((metric): metric is Record<string, unknown> => metric !== null)
      .filter((metric) => text(metric.metricKey).length > 0 && typeof metric.quantity === "number" && Number.isFinite(metric.quantity) && metric.quantity >= 0)
      .map((metric) => ({ metricKey: text(metric.metricKey), quantity: metric.quantity as number, unit: text(metric.unit) })),
    generatedAt: text(row.generatedAt),
  };
}
