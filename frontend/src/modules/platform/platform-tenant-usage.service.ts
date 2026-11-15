import { isMockMode } from "../../config/env";
import { ApiError } from "../../services/api/client";
import { getTenantUsageSummaryFromApi, type TenantUsagePeriod, type TenantUsageSummary } from "./platform-tenant-usage.adapter";

// B-ASS-10b (T5, F10) — o uso medido de UMA organização no mês corrente (São Paulo). O período segue a forma que a tela
// de custos usava para o uso da plataforma (`AAAA-MM-01` a `AAAA-MM-<último dia>`), para o número não mudar de sentido ao
// mudar de tela. Estados honestos (D-007): demonstração → nada; 403 → "não permitido" (o servidor é a autoridade);
// outro erro → falha, sem número.

export type TenantUsageStatus = "ok" | "mock" | "forbidden" | "error";

export type TenantUsageData = {
  readonly status: TenantUsageStatus;
  readonly month: string;
  readonly summary: TenantUsageSummary | null;
};

export function currentUsageMonth(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
}

export function usagePeriodForMonth(month: string): TenantUsagePeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Mês de consulta inválido.");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Mês de consulta inválido.");
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export async function getPlatformTenantUsage(tenantId: string, now = new Date()): Promise<TenantUsageData> {
  const month = currentUsageMonth(now);
  if (isMockMode()) return { status: "mock", month, summary: null };
  try {
    return { status: "ok", month, summary: await getTenantUsageSummaryFromApi(tenantId, usagePeriodForMonth(month)) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { status: "forbidden", month, summary: null };
    return { status: "error", month, summary: null };
  }
}
