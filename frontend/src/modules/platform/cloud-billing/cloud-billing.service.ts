import { isMockMode } from "../../../config/env";
import { ApiError } from "../../../services/api/client";
import {
  createEconomicGroupFromApi,
  deleteEconomicGroupFromApi,
  getEconomicGroupFromApi,
  getEconomicGroupHistoryFromApi,
  getGlobalOverviewFromApi,
  getGroupOverviewFromApi,
  getTenantOverviewFromApi,
  importCloudCostsFromApi,
  listCloudAllocationRunsFromApi,
  listCloudCostImportsFromApi,
  listEconomicGroupsFromApi,
  listFxRatesFromApi,
  listTenantAllocationsFromApi,
  putEconomicGroupMembersFromApi,
  putFxRateFromApi,
  runCloudAllocationFromApi,
  updateEconomicGroupFromApi,
} from "./cloud-billing.adapter";
import type { CloudBillingData, CloudBillingFailure, CloudBillingPeriod } from "./cloud-billing.types";
import { emptyCloudBilling } from "./cloud-billing.types";

// B-ASS-10b (T5) — a leitura do mês da tela (plano v2 §6.3): antes do primeiro desenho, `overview` ×3 (organização,
// grupo, global), o câmbio de (mês − 5) a mês, os grupos, as importações do mês (só com `platform:cloud-costs:read`) e os
// rateios do mês. Falha de qualquer uma delas não mostra número parcial: 403 → acesso não permitido; os 3 erros 500 do
// contrato → erro de tela inteira com o motivo; o resto → erro geral. Nada aqui calcula valor.

export function periodForMonth(month: string): CloudBillingPeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Mês de consulta inválido.");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Mês de consulta inválido.");
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function currentBillingMonth(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
}

/** Hoje em São Paulo (`AAAA-MM-DD`): o mínimo de "Vale a partir de" na janela de membros (o servidor usa o mesmo dia). */
export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
}

/** `AAAA-MM` deslocado de `delta` meses (aritmética de calendário, não de dinheiro). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + delta, 15));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Os `count` meses que terminam em `month`, do mais velho ao mais novo. */
export function monthsEndingAt(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1));
}

/** Rateio com custo: concluído E com importação. A lista fechada do `coverageOf` do servidor (Emenda 1, A12-r2). */
const IMPORTED_RESOLUTIONS = new Set(["explicit", "latest_completed"]);
export type RunRef = { readonly status: string; readonly periodStart: string; readonly metadata?: { readonly importResolution?: unknown } | null };

/**
 * O mês em que a tela abre (§6.3.2): o maior mês entre os rateios `completed` cujo `importResolution` é `explicit`,
 * `latest_completed` ou ausente (rateio antigo, que tem custo: a mesma leitura do `coverageOf`). Mês depois do corrente é
 * ignorado. Nenhum → o mês corrente.
 */
export function latestAllocatedMonth(runs: readonly RunRef[], currentMonth: string): string {
  const months = runs
    .filter((run) => {
      if (run.status !== "completed") return false;
      const resolution = run.metadata?.importResolution;
      return typeof resolution !== "string" || IMPORTED_RESOLUTIONS.has(resolution);
    })
    .map((run) => run.periodStart.slice(0, 7))
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month <= currentMonth)
    .sort();
  return months[months.length - 1] ?? currentMonth;
}

/** O mês inicial lido do servidor; sem a lista (falha ou modo demonstração), o mês corrente. */
export async function getInitialBillingMonth(currentMonth = currentBillingMonth()): Promise<string> {
  if (isMockMode()) return currentMonth;
  try {
    return latestAllocatedMonth(await listCloudAllocationRunsFromApi(), currentMonth);
  } catch {
    return currentMonth;
  }
}

const INTEGRITY_REASONS: readonly CloudBillingFailure[] = ["membership_integrity_violation", "statement_integrity_violation", "overview_integrity_violation"];

function failureOf(error: unknown): CloudBillingFailure {
  if (error instanceof ApiError && error.reason && (INTEGRITY_REASONS as readonly string[]).includes(error.reason)) return error.reason as CloudBillingFailure;
  return "unavailable";
}

export type CloudBillingAccess = { readonly readImports: boolean };

export async function getCloudBilling(month: string, access: CloudBillingAccess = { readImports: true }): Promise<CloudBillingData> {
  const period = periodForMonth(month);
  if (isMockMode()) return emptyCloudBilling(month, period, "mock");
  try {
    const [tenant, group, global, fx, groups, imports, runs] = await Promise.all([
      getTenantOverviewFromApi(month),
      getGroupOverviewFromApi(month),
      getGlobalOverviewFromApi(month),
      listFxRatesFromApi(shiftMonth(month, -5), month),
      listEconomicGroupsFromApi(),
      access.readImports ? listCloudCostImportsFromApi(period) : Promise.resolve(null),
      listCloudAllocationRunsFromApi(period),
    ]);
    const monthRuns = runs.filter((run) => run.periodMonth === month).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const monthImports = imports === null ? null : imports.filter((item) => item.periodMonth === null || item.periodMonth === month);
    return { month, period, source: "api", forbidden: false, stale: false, failure: null, tenant, group, global, fx, groups, imports: monthImports, runs: monthRuns };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { ...emptyCloudBilling(month, period, "fallback"), forbidden: true };
    return { ...emptyCloudBilling(month, period, "fallback"), failure: failureOf(error) };
  }
}

/**
 * O resumo de custo do mês, no contrato que o T39 do B-ASS-09 importa (`tests/san3-06b-navegacao-plataforma.test.ts`,
 * arquivo PROIBIDO para este bloco): em demonstração, nenhum dado; na API, o global do mês, que é a fonte nova do custo.
 * Achado A-B2 (Dev-B): a F1 tinha tirado o nome, e o arquivo inteiro do T38-T40 deixou de carregar.
 */
export async function getCloudCostSummary(month = currentBillingMonth()) {
  if (isMockMode()) return { data: null, source: "mock" as const };
  return { data: await getGlobalOverviewFromApi(month), source: "api" as const };
}

// ---- leituras de segundo plano (série de 6 meses, detalhes de grupo, composição, histórico) -------------------------
export const getGlobalOverview = getGlobalOverviewFromApi;
export const getTenantOverview = getTenantOverviewFromApi;
export const getEconomicGroup = getEconomicGroupFromApi;
export const getEconomicGroupHistory = getEconomicGroupHistoryFromApi;
export const listTenantAllocations = listTenantAllocationsFromApi;
export const listCloudCostImports = listCloudCostImportsFromApi;

/** Roda `tasks` com no máximo `limit` chamadas ao mesmo tempo (§6.3: séries e detalhes em segundo plano, 3 por vez). */
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

// ---- escritas (só `useCloudBillingActions` chama; cada uma é UMA requisição) ----------------------------------------
export const importCloudCosts = importCloudCostsFromApi;
export const runCloudAllocation = runCloudAllocationFromApi;
export const putFxRate = putFxRateFromApi;
export const createEconomicGroup = createEconomicGroupFromApi;
export const updateEconomicGroup = updateEconomicGroupFromApi;
export const deleteEconomicGroup = deleteEconomicGroupFromApi;
export const putEconomicGroupMembers = putEconomicGroupMembersFromApi;
