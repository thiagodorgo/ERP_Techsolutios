// B-ASS-09 · F6 — o serviço da visão de custo × assinatura (plano v2 §3, §4.1 R1). Lê o que o motor PURO precisa e o chama:
// o resumo do rateio na janela EXATA do mês e as runs dele (P11), a taxa vigente do mês para a moeda do resumo (P1), a lista
// de organizações, a assinatura do período de cada uma (P3, `subscription-amount.ts`) e os vínculos de grupo (P5).
//
// Não decide número nenhum: conversão, margem, alerta, agregados e falha fechada são do `overview.engine.ts`. Falha de
// integridade sai como erro (nunca número parcial): dois grupos no mesmo dia (`MembershipOverlapError`), demonstrativo
// gravado que não fecha com o retrato do fechamento (`StatementIntegrityError`, Emenda 2.1 §2.6) e entrada incoerente
// (`OverviewEngineError`). A rota traduz os três em 500.
//
// O fim da janela no último dia do mês (`lastDayOfPeriod`, em `getOverview`) é a expressão canônica da M-MG-7 (plano v2 §6):
// não reescrever sem emenda.

import { deriveCompetencia } from "../../../config/business-time.js";
import type { CloudCostAllocationService } from "../../cloud-cost-allocation/index.js";
import type { EconomicGroupsRepository } from "../economic-groups/economic-groups.repository.js";
import type { FxRatesService } from "../fx-rates/fx-rates.service.js";
import { SubscriptionBillingError } from "../plans/plan-types.js";
// `firstDayOfNextPeriod` não é usado na conta: fica no escopo para a M-MG-7 do plano rodar como escrita (o fim da janela no
// dia 1 do mês seguinte devolve `no_run` em silêncio, K1), em vez de cair num `ReferenceError`.
import {
  buildOverview,
  firstDayOfNextPeriod,
  firstDayOfPeriod,
  isPlatformTenant,
  lastDayOfPeriod,
  summaryCurrencyOf,
} from "./overview.engine.js";

void firstDayOfNextPeriod;
import {
  OVERVIEW_GROUP_BYS,
  type FxRateRef,
  type OverviewData,
  type OverviewGroup,
  type OverviewGroupBy,
  type SubscriptionAmount,
} from "./overview.types.js";
import { SubscriptionAmountError, subscriptionAmountOf, type SubscriptionAmountRuntime } from "./subscription-amount.js";
import type { OverviewTenantList } from "./tenant-list.js";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Um demonstrativo gravado não fecha com o retrato do fechamento (Emenda 2.1 §2.2, D-A2-1 e D-A2-2). Leva a organização e o
 * mês para o LOG do servidor (visto `rev-ass09-e21-cl`, A-E21-2); a resposta não leva nenhum dos dois.
 */
export class StatementIntegrityError extends Error {
  readonly code = "statement_integrity_violation";

  constructor(
    readonly reason: "statement_snapshot_missing" | "statement_snapshot_mismatch",
    readonly tenantId: string,
    readonly period: string,
  ) {
    super("statement_integrity_violation: um demonstrativo gravado não fecha com o retrato do fechamento.");
    this.name = "StatementIntegrityError";
  }
}

export type OverviewServiceDeps = {
  readonly allocation: Pick<CloudCostAllocationService, "getAllocationSummary" | "listAllocationRuns">;
  readonly fx: Pick<FxRatesService, "currentRate">;
  readonly groupsRepository: Pick<EconomicGroupsRepository, "listMembershipsOfTenants" | "getGroup">;
  readonly tenants: OverviewTenantList;
  readonly statements: SubscriptionAmountRuntime;
  readonly clock: () => Date;
};

export class OverviewService {
  constructor(private readonly deps: OverviewServiceDeps) {}

  /** R1: `GET /overview?period=AAAA-MM&groupBy=tenant|group|global`. 400 `invalid_period`, `invalid_group_by`; 422 `period_in_future`. */
  async getOverview(input: { readonly period: string; readonly groupBy?: string }): Promise<OverviewData> {
    const { period } = input;
    if (typeof period !== "string" || !PERIOD_PATTERN.test(period)) {
      throw new SubscriptionBillingError(400, "SUBSCRIPTION_BILLING_INVALID", "invalid_period", "Período inválido: use AAAA-MM.");
    }
    const groupBy = input.groupBy ?? "tenant";
    if (!isGroupBy(groupBy)) {
      throw new SubscriptionBillingError(400, "SUBSCRIPTION_BILLING_INVALID", "invalid_group_by", "groupBy é tenant, group ou global.");
    }
    const now = this.deps.clock();
    if (period > deriveCompetencia(now)) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "period_in_future",
        "O período é depois do mês corrente (America/Sao_Paulo).",
      );
    }

    const window = { periodStart: firstDayOfPeriod(period), periodEnd: lastDayOfPeriod(period) };
    const summary = await this.deps.allocation.getAllocationSummary(window);
    const runs = await this.deps.allocation.listAllocationRuns({ ...window, status: "completed" });
    const fxRate = await this.fxRateOf(period, summaryCurrencyOf(summary));

    const tenants = await this.deps.tenants.listTenants();
    const orgs = tenants.filter((tenant) => !isPlatformTenant(tenant));
    const subscriptions = new Map<string, SubscriptionAmount>();
    for (const tenant of orgs) {
      subscriptions.set(tenant.tenantId, await this.subscriptionOf(tenant.tenantId, period, now));
    }

    const memberships = await this.deps.groupsRepository.listMembershipsOfTenants(orgs.map((tenant) => tenant.tenantId));
    const groups: OverviewGroup[] = [];
    for (const groupId of new Set(memberships.map((row) => row.groupId))) {
      // Inclusive o grupo excluído depois: um mês passado pode ter membro dele. Grupo que não existe fica de fora, e o
      // motor falha fechado (`group_unknown`).
      const group = await this.deps.groupsRepository.getGroup(groupId);
      if (group) groups.push({ groupId: group.id, groupName: group.name });
    }

    return buildOverview({
      period,
      groupBy,
      generatedAt: now,
      summary,
      runs,
      fxRate,
      tenants,
      subscriptions,
      groups,
      memberships,
    });
  }

  /** A versão vigente da taxa do mês para a moeda do resumo; em real ou sem moeda, nenhuma. */
  private async fxRateOf(period: string, currency: string | null): Promise<FxRateRef | null> {
    if (currency === null || currency === "BRL") return null;
    const rate = await this.deps.fx.currentRate(period, currency);
    return rate ? { month: rate.month, currencyFrom: rate.currencyFrom, rate: rate.rate, version: rate.version } : null;
  }

  /** A assinatura do período; o demonstrativo que não fecha com o retrato vira `StatementIntegrityError`, com a organização. */
  private async subscriptionOf(tenantId: string, period: string, now: Date): Promise<SubscriptionAmount> {
    try {
      return await subscriptionAmountOf(this.deps.statements, { tenantId, period, now });
    } catch (error) {
      if (
        error instanceof SubscriptionAmountError &&
        (error.reason === "statement_snapshot_missing" || error.reason === "statement_snapshot_mismatch")
      ) {
        throw new StatementIntegrityError(error.reason, tenantId, period);
      }
      throw error;
    }
  }
}

function isGroupBy(value: string): value is OverviewGroupBy {
  return (OVERVIEW_GROUP_BYS as readonly string[]).includes(value);
}
