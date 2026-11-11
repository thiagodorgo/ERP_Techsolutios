import { periodLabel } from "./period-keys";

// B-SAN3-24 (24b) — o erro do servidor vira texto de negócio, pelo `reason` estável do envelope de erro. Conflito de
// situação (alguém fechou, ou o fechamento está em andamento) → "a competência mudou; relendo" (e a tela relê).

export function periodErrorReason(error: unknown): string | undefined {
  const reason = (error as { reason?: unknown } | null)?.reason;
  return typeof reason === "string" ? reason : undefined;
}

export function isPeriodConflict(error: unknown): boolean {
  const reason = periodErrorReason(error);
  return reason === "period_already_closed" || reason === "period_closing_in_progress" || reason === "period_not_closed" || (error as { status?: unknown } | null)?.status === 409;
}

export function periodErrorMessage(error: unknown, period: string): string {
  const label = periodLabel(period);
  switch (periodErrorReason(error)) {
    case "period_already_closed":
      return `${label} já foi fechado por outra pessoa; relendo.`;
    case "period_closing_in_progress":
      return `O fechamento de ${label} está em andamento; relendo.`;
    case "period_not_closed":
      return `${label} não está fechado; relendo.`;
    case "pending_items_block_close":
      return `Há título em contestação em ${label}: o fechamento pede o 2º passo, com motivo.`;
    case "reason_required":
    case "invalid_reason":
      return "Informe o motivo (até 2000 caracteres).";
    default:
      break;
  }
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 403) return "Seu perfil não tem permissão para esta ação.";
  return "Não foi possível concluir. Nada foi alterado; tente de novo.";
}
