// B-ASS-10b (T5) — os rótulos pt-BR da tela de custo e margem (os mesmos da maquete aprovada,
// `screen-refs/platform-cloud-billing-3opcoes.reference.html`). Só texto e data: nenhum valor de dinheiro nasce aqui.

import type { AlertKind, CostStatus, SubscriptionSource, TenantLineJson } from "./cloud-billing.types";

export type Tone = { readonly bg: string; readonly fg: string; readonly dot: string };

export const ALERT_LABEL: Readonly<Record<AlertKind, string>> = {
  critical: "Crítico",
  warning: "Atenção",
  none: "Normal",
  no_subscription: "Sem assinatura",
  cost_missing: "Sem custo",
  unknown: "Sem situação",
};

export const ALERT_TONE: Readonly<Record<AlertKind, Tone>> = {
  critical: { bg: "#FEF2F2", fg: "#B91C1C", dot: "#dc2626" },
  warning: { bg: "#FFFBEB", fg: "#B45309", dot: "#f59e0b" },
  none: { bg: "#ECFDF5", fg: "#047857", dot: "#10b981" },
  no_subscription: { bg: "#F1F5F9", fg: "#475569", dot: "#94a3b8" },
  cost_missing: { bg: "#F1F5F9", fg: "#64748B", dot: "#cbd5e1" },
  unknown: { bg: "#F1F5F9", fg: "#64748B", dot: "#cbd5e1" },
};

export const ALERT_RULE: Readonly<Record<AlertKind, string>> = {
  critical: "o custo passou da assinatura",
  warning: "o custo chegou a 80 % da assinatura ou mais",
  none: "o custo está abaixo de 80 % da assinatura",
  no_subscription: "não há assinatura neste mês para comparar",
  cost_missing: "o mês está sem custo em reais",
  unknown: "a situação ainda não é reconhecida por esta tela",
};

export const SOURCE_LABEL: Readonly<Record<SubscriptionSource, string>> = {
  statement: "Demonstrativo fechado ou pago",
  statement_reopened: "Demonstrativo reaberto",
  cancelled: "Demonstrativo cancelado",
  projection: "Projeção do mês (demonstrativo em aberto)",
  none: "Sem demonstrativo",
};

export const COST_STATUS_LABEL: Readonly<Record<CostStatus, string>> = {
  ok: "Rateio do mês",
  legacy_unscoped: "Rateio antigo",
  no_run: "Sem rateio do mês",
  no_import: "Rateio vazio",
  fx_missing: "Sem dólar do mês",
  currency_unknown: "Moeda desconhecida",
};

const REASONS: Readonly<Record<string, readonly [string, string]>> = {
  no_allocation_rule: ["Sem regra de rateio", "O serviço ainda não tem regra que diga como dividir o custo entre as organizações. Até ter regra, a plataforma paga."],
  unknown_tenant_tag: ["Marcação de organização desconhecida", "O recurso na AWS tem etiqueta de organização que não bate com nenhuma organização cadastrada. Corrija a etiqueta e rode o rateio."],
  ambiguous_tenant_tag: ["Marcação ambígua", "O recurso tem mais de uma etiqueta de organização. Deixe uma só e rode o rateio."],
  missing_usage_basis: ["Sem medida de uso", "Não houve uso medido no mês para dividir este custo entre as organizações."],
  mixed_currency: ["Moedas misturadas", "O arquivo tem linhas em mais de uma moeda. Importe o arquivo do mês numa moeda só."],
  residual_exceeded: ["Resíduo acima do limite", "A sobra do rateio passou do limite. Rode o rateio de novo; se continuar, revise as regras."],
  unspecified: ["Sem motivo informado", "O rateio não informou o motivo."],
};

export function reasonLabel(reason: string): string {
  return REASONS[reason]?.[0] ?? "Outro motivo";
}
export function reasonAction(reason: string): string {
  return REASONS[reason]?.[1] ?? "Confira as regras de rateio e rode o rateio do mês de novo.";
}

/** O rótulo de situação da linha (a maquete separa plano sem preço e filial de grupo). */
export function alertLabelOf(line: Pick<TenantLineJson, "alert" | "subscriptionSkipReason" | "groupId">): string {
  if (line.alert === "no_subscription") {
    if (line.subscriptionSkipReason === "plan_without_price") return "Plano sem preço";
    return line.groupId ? "Sem assinatura própria" : "Sem assinatura";
  }
  return ALERT_LABEL[line.alert];
}
/** A forma curta da lista (uma linha só). */
export function shortAlertLabel(line: Pick<TenantLineJson, "alert" | "subscriptionSkipReason">): string {
  if (line.alert === "no_subscription") return line.subscriptionSkipReason === "plan_without_price" ? "Sem preço" : "Sem assinatura";
  return ALERT_LABEL[line.alert];
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthIndex(month: string): number {
  return Number(month.slice(5, 7)) - 1;
}
/** "outubro de 2026". */
export function monthLabel(month: string): string {
  return `${MONTHS[monthIndex(month)] ?? month} de ${month.slice(0, 4)}`;
}
/** "outubro". */
export function monthName(month: string): string {
  return MONTHS[monthIndex(month)] ?? month;
}
/** "out/26". */
export function monthShort(month: string): string {
  return `${MONTHS_SHORT[monthIndex(month)] ?? month}/${month.slice(2, 4)}`;
}
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const DATE_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
/** "04/11 09:13" (São Paulo). Data inválida ou ausente → "—". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date).replace(",", "");
}
/** "14/11/2026" a partir de `AAAA-MM-DD` (data civil, sem fuso) ou de um instante ISO. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE.format(date);
}
