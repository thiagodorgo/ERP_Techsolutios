import { useMemo } from "react";

import { ApiError } from "../../../services/api/client";
import type { CloudBillingAccess } from "./cloud-billing.access";
import {
  createEconomicGroup,
  deleteEconomicGroup,
  importCloudCosts,
  periodForMonth,
  putEconomicGroupMembers,
  putFxRate,
  runCloudAllocation,
  updateEconomicGroup,
} from "./cloud-billing.service";
import type { CloudAllocationRun, CloudCostImport, EconomicGroup, EconomicGroupDetail, FxPutResult } from "./cloud-billing.types";

// B-ASS-10b (T5) — as escritas da tela (plano v2 §6.4). Cada função confere a PRÓPRIA permissão antes de chamar
// (defesa em profundidade, §6.4.3) e faz UMA requisição, nunca duas (R-GRP, §6.4.2.1). O resultado traz o motivo do
// servidor (`reason`) para a janela escolher a mensagem; nada aqui "prevê" valor: depois do sucesso a tela relê o mês.

export type ActionResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string };

/** Sem a permissão, a ação nem chama o servidor. */
const FORBIDDEN = { ok: false, reason: "sem_permissao" } as const;

async function attempt<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, reason: error.reason ?? `http_${error.status}` };
    return { ok: false, reason: "falha_de_rede" };
  }
}

export type CloudBillingActions = {
  readonly importCsv: (csv: string) => Promise<ActionResult<CloudCostImport>>;
  readonly runAllocation: (month: string) => Promise<ActionResult<CloudAllocationRun>>;
  readonly saveFxRate: (month: string, rate: string) => Promise<ActionResult<FxPutResult>>;
  readonly createGroup: (name: string, notes: string | null) => Promise<ActionResult<EconomicGroup>>;
  readonly renameGroup: (groupId: string, name: string, notes: string | null) => Promise<ActionResult<EconomicGroup>>;
  readonly deleteGroup: (groupId: string) => Promise<ActionResult<EconomicGroup>>;
  readonly putMembers: (groupId: string, body: { readonly tenantIds: readonly string[]; readonly validFrom: string }) => Promise<ActionResult<EconomicGroupDetail>>;
};

export function cloudBillingActions(access: CloudBillingAccess): CloudBillingActions {
  return {
    importCsv: async (csv) => (access.importCosts ? attempt(() => importCloudCosts(csv)) : FORBIDDEN),
    runAllocation: async (month) => (access.runAllocation ? attempt(() => runCloudAllocation(periodForMonth(month))) : FORBIDDEN),
    saveFxRate: async (month, rate) => (access.manageBilling ? attempt(() => putFxRate(month, rate)) : FORBIDDEN),
    createGroup: async (name, notes) => (access.manageBilling ? attempt(() => createEconomicGroup({ name, notes })) : FORBIDDEN),
    renameGroup: async (groupId, name, notes) => (access.manageBilling ? attempt(() => updateEconomicGroup(groupId, { name, notes })) : FORBIDDEN),
    deleteGroup: async (groupId) => (access.manageBilling ? attempt(() => deleteEconomicGroup(groupId)) : FORBIDDEN),
    putMembers: async (groupId, body) => (access.manageBilling ? attempt(() => putEconomicGroupMembers(groupId, body)) : FORBIDDEN),
  };
}

export function useCloudBillingActions(access: CloudBillingAccess): CloudBillingActions {
  return useMemo(() => cloudBillingActions(access), [access.importCosts, access.runAllocation, access.manageBilling, access.readImports]);
}
