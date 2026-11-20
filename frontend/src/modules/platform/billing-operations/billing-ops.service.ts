import { isMockMode } from "../../../config/env";
import { listPlatformTenants } from "../platform.service";
import { isPlatformSystemOrg } from "../platform-overview.types";
import {
  cancelChargeFromApi,
  cancelUnknownChargeFromApi,
  confirmCancelledFromApi,
  disableProviderFromApi,
  enableProviderFromApi,
  getBillingProfileFromApi,
  getChargesFromApi,
  getStatementFromApi,
  listInvoiceBacklogFromApi,
  listProvidersFromApi,
  listQueueFromApi,
  listStatementsFromApi,
  registerPaymentFromApi,
  registerWebhookFromApi,
  requestChargeFromApi,
  requestInvoiceFromApi,
  resolveQueueLineFromApi,
  retryQueueLineFromApi,
  reversePaymentFromApi,
  saveCredentialFromApi,
  saveProviderSettingsFromApi,
  testConnectionFromApi,
} from "./billing-ops.adapter";
import type { Organization } from "./billing-ops.types";

// B-ASS-10c-OPERACAO — a fronteira do módulo com o adapter (§6.1: adapter → service → hook). Aqui moram o calendário de
// São Paulo (o "hoje" e o mês da tela), o teto de leituras simultâneas (`runLimited`) e a lista de organizações; nada aqui
// calcula valor. Em modo demonstração não há dado: a lista de organizações vem vazia (o padrão da plataforma, T39).

/** Hoje em São Paulo (`AAAA-MM-DD`): a régua do "em atraso" e do vencimento mínimo. */
export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
}

/** O mês corrente em São Paulo (`AAAA-MM`). */
export function currentMonthInSaoPaulo(now = new Date()): string {
  return todayInSaoPaulo(now).slice(0, 7);
}

/** `AAAA-MM` deslocado de `delta` meses (aritmética de calendário, não de dinheiro). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + delta, 15));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Os `count` meses que terminam em `month`, do mais velho ao mais novo. */
export function monthsEndingAt(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1));
}

/** `AAAA-MM-DD` deslocado de `days` dias (o teto de 60 dias do vencimento novo). */
export function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split("-").map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year!, month! - 1, date! + days));
  return shifted.toISOString().slice(0, 10);
}

/** Roda `tasks` com no máximo `limit` chamadas ao mesmo tempo (§3.1: leituras por organização em segundo plano, 3 por vez). */
export async function runLimited(tasks: readonly (() => Promise<void>)[], limit = 3): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++]!;
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

/** As organizações que têm cobrança: a lista da plataforma, sem a organização de sistema (ela não tem demonstrativo). */
export async function listBillingOrganizations(): Promise<Organization[]> {
  if (isMockMode()) return [];
  const tenants = await listPlatformTenants();
  return tenants.filter((tenant) => !isPlatformSystemOrg(tenant)).map((tenant) => ({ id: tenant.id, name: tenant.name }));
}

// ---- leituras -------------------------------------------------------------------------------------------------------
export const listStatements = listStatementsFromApi;
export const getStatement = getStatementFromApi;
export const getCharges = getChargesFromApi;
export const listQueue = listQueueFromApi;
export const listInvoiceBacklog = listInvoiceBacklogFromApi;
export const getBillingProfile = getBillingProfileFromApi;
export const listProviders = listProvidersFromApi;

// ---- escritas (só `useBillingOpsActions` chama; cada uma é UMA requisição) -------------------------------------------
export const requestCharge = requestChargeFromApi;
export const cancelCharge = cancelChargeFromApi;
export const cancelUnknownCharge = cancelUnknownChargeFromApi;
export const confirmCancelled = confirmCancelledFromApi;
export const registerPayment = registerPaymentFromApi;
export const reversePayment = reversePaymentFromApi;
export const requestInvoice = requestInvoiceFromApi;
export const resolveQueueLine = resolveQueueLineFromApi;
export const retryQueueLine = retryQueueLineFromApi;
export const saveProviderSettings = saveProviderSettingsFromApi;
export const saveCredential = saveCredentialFromApi;
export const testConnection = testConnectionFromApi;
export const registerWebhook = registerWebhookFromApi;
export const enableProvider = enableProviderFromApi;
export const disableProvider = disableProviderFromApi;
