import type { PeriodAction, PeriodStatus } from "./period-closes.types";

// B-SAN3-24 (24b, P-ACESSO) — Fechar e Reabrir são oferecidos se, e só se, o servidor os aceita para aquele papel e
// situação (`financial-period-close.routes.ts` e `.service.ts`; RBAC_MATRIX `financial_period`; RN-FIN-009):
//   - "fechando" (`closing`): nenhuma ação (o servidor responde 409 `period_closing_in_progress`);
//   - Fechar: competência ainda não fechada (`open` ou `reopened`), com `financial_period:close` (o Financeiro fecha);
//   - Reabrir: competência fechada, com `financial_period:reopen` (só os administradores).
// A página e as 3 aparências só leem daqui. R-E2E-JWT: só TypeScript puro.

export type PermissionSet = { has(permission: string): boolean };

const NONE: readonly PeriodAction[] = [];

export function periodActionsFor(period: { readonly status: PeriodStatus }, perms: PermissionSet): readonly PeriodAction[] {
  if (period.status === "closing") return NONE;
  const actions: PeriodAction[] = [];
  if (period.status !== "closed" && perms.has("financial_period:close")) actions.push("close");
  if (period.status === "closed" && perms.has("financial_period:reopen")) actions.push("reopen");
  return actions;
}

export const PERIOD_STATUS_LABELS: Readonly<Record<PeriodStatus, string>> = {
  open: "Aberto",
  closing: "Fechamento em andamento",
  closed: "Fechado",
  reopened: "Reaberto",
};

export const PERIOD_STATUS_TONES: Readonly<Record<PeriodStatus, { readonly bg: string; readonly fg: string }>> = {
  open: { bg: "#EFF6FF", fg: "#1D4ED8" },
  closing: { bg: "#FFFBEB", fg: "#B45309" },
  closed: { bg: "#ECFDF5", fg: "#047857" },
  reopened: { bg: "#F5F3FF", fg: "#6D28D9" },
};
