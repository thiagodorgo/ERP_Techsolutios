// B-ASS-04 — o MONTADOR PURO das entradas do fechamento (plano §3.3 e §4.4 regras 7 e 8): transforma assinaturas,
// versões de preço, add-ons de rastreamento, medições diárias (`tenant_usage_daily`) e vínculos de veículo em
// `StatementInputs`. Sem banco e sem relógio: o repositório (F5) só carrega os dados e chama esta função.
//
// Regras:
//  - cada dia do mês é avaliado no INÍCIO do dia em São Paulo (`parseBusinessDate`), com as janelas `[validFrom,
//    validTo)` das assinaturas e das versões (`resolveVersionAt`);
//  - segmentos = dias consecutivos com a mesma assinatura, a mesma versão e o mesmo preço efetivo (G6);
//  - franquia e unitários do excedente = os do ÚLTIMO dia com assinatura (§3.3);
//  - refechar um reaberto usa a MESMA versão do snapshot (`pinnedPlanVersionId`, G5);
//  - nenhum dia com assinatura → `no_subscription`; dia com assinatura e sem versão vigente → `plan_without_price`;
//    organização de sistema `platform` → `platform_organization` (S16).

import { parseBusinessDate } from "../../../config/business-time.js";
import { resolveVersionAt } from "../plans/plan-versioning.js";
import type { SubscriptionPlanVersion, TenantSubscription, TenantSubscriptionAddon } from "../plans/plan-types.js";
import {
  bytesToMilliGbCeil,
  countDistinctVehiclesInMonth,
  daysInPeriod,
  gbToMilli,
  type StatementSegmentInput,
} from "./statement.engine.js";
import type { StatementInputs } from "./statement.service.js";

export type UsageDayRow = {
  /** `YYYY-MM-DD` (data local SP). */
  readonly date: string;
  readonly activeUsers: number | null;
  readonly dbBytesEstimated: bigint | null;
  readonly filesBytes: bigint | null;
};

export type VehicleBindingWindow = { readonly vehicleId: string; readonly validFrom: string; readonly validTo: string | null };

export type StatementSourceData = {
  readonly tenantSlug: string | null;
  readonly subscriptions: readonly TenantSubscription[];
  readonly addons: readonly TenantSubscriptionAddon[];
  /** Versões por `planId` (base e add-ons). */
  readonly versionsByPlan: ReadonlyMap<string, readonly SubscriptionPlanVersion[]>;
  readonly usage: readonly UsageDayRow[];
  readonly bindings: readonly VehicleBindingWindow[];
};

function dayStart(period: string, day: number): Date {
  return parseBusinessDate(`${period}-${String(day).padStart(2, "0")}`);
}

function activeAt<T extends { validFrom: Date; validTo: Date | null }>(rows: readonly T[], at: Date): T | null {
  // A assinatura vigente é única por organização (R-PLAN-4); em caso de dado inconsistente, vence a mais recente.
  return resolveVersionAt(rows, at);
}

export function buildStatementInputs(
  period: string,
  data: StatementSourceData,
  options: { readonly pinnedPlanVersionId: string | null },
): StatementInputs {
  if ((data.tenantSlug ?? "").toLowerCase() === "platform") {
    return { kind: "skip", reason: "platform_organization" };
  }
  const daysInMonth = daysInPeriod(period);

  type DayPlan = { subscription: TenantSubscription; version: SubscriptionPlanVersion; priceCents: number };
  const days: (DayPlan | null)[] = [];
  let sawSubscription = false;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const at = dayStart(period, day);
    const subscription = activeAt(data.subscriptions, at);
    if (!subscription) {
      days.push(null);
      continue;
    }
    sawSubscription = true;
    const versions = data.versionsByPlan.get(subscription.planId) ?? [];
    const version = options.pinnedPlanVersionId
      ? versions.find((candidate) => candidate.id === options.pinnedPlanVersionId) ?? null
      : resolveVersionAt(versions, at);
    if (!version) return { kind: "skip", reason: "plan_without_price" };
    days.push({ subscription, version, priceCents: subscription.monthlyPriceOverrideCents ?? version.monthlyPriceCents });
  }
  if (!sawSubscription) return { kind: "skip", reason: "no_subscription" };

  const segments: StatementSegmentInput[] = [];
  for (let index = 0; index < days.length; index += 1) {
    const current = days[index];
    if (!current) continue;
    const last = segments.at(-1);
    const previous = index > 0 ? days[index - 1] : null;
    const continues =
      last !== undefined &&
      previous !== null &&
      previous !== undefined &&
      previous.subscription.id === current.subscription.id &&
      previous.version.id === current.version.id &&
      previous.priceCents === current.priceCents;
    if (continues) {
      segments[segments.length - 1] = { ...last, toDay: index + 1 };
    } else {
      segments.push({
        subscriptionId: current.subscription.id,
        planVersionId: current.version.id,
        fromDay: index + 1,
        toDay: index + 1,
        monthlyPriceCents: current.priceCents,
      });
    }
  }

  const lastDayIndex = days.map((entry, index) => (entry ? index : -1)).filter((index) => index >= 0).at(-1)!;
  const lastDay = days[lastDayIndex]!;
  const { subscription, version } = lastDay;
  const terms = {
    includedUsers: subscription.includedUsersOverride ?? version.includedUsers,
    includedStorageMilliGb: gbToMilli(subscription.includedStorageGbOverride ?? version.includedStorageGb),
    extraUserPriceCents: subscription.extraUserPriceOverrideCents ?? version.extraUserPriceCents,
    extraGbPriceCents: subscription.extraGbPriceOverrideCents ?? version.extraGbPriceCents,
  };

  // Add-on de rastreamento vigente no último dia com assinatura (por veículo no mês, sem pro-rata — §3.3).
  const lastAt = dayStart(period, lastDayIndex + 1);
  const addon = activeAt(
    data.addons.filter((row) => row.subscriptionId === subscription.id),
    lastAt,
  );
  let perVehiclePriceCents: number | null = null;
  if (addon) {
    const addonVersion = resolveVersionAt(data.versionsByPlan.get(addon.planId) ?? [], lastAt);
    perVehiclePriceCents = addon.perVehiclePriceOverrideCents ?? addonVersion?.perVehiclePriceCents ?? null;
  }

  // Medições do mês: o MAIOR de cada uma (R-ST-4); dias sem linha são gaps declarados, nunca preenchidos.
  const monthPrefix = `${period}-`;
  const rows = data.usage.filter((row) => row.date.startsWith(monthPrefix));
  const measuredDates = new Set(rows.map((row) => row.date));
  const gaps: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${period}-${String(day).padStart(2, "0")}`;
    if (!measuredDates.has(date)) gaps.push(date);
  }
  let usersPeak = 0;
  let storagePeakMilliGb = 0;
  for (const row of rows) {
    if (row.activeUsers !== null && row.activeUsers > usersPeak) usersPeak = row.activeUsers;
    if (row.dbBytesEstimated !== null || row.filesBytes !== null) {
      const milli = bytesToMilliGbCeil((row.dbBytesEstimated ?? 0n) + (row.filesBytes ?? 0n));
      if (milli > storagePeakMilliGb) storagePeakMilliGb = milli;
    }
  }

  return {
    kind: "ready",
    subscriptionId: subscription.id,
    planVersionId: version.id,
    addonPlanVersionId: addon ? (resolveVersionAt(data.versionsByPlan.get(addon.planId) ?? [], lastAt)?.id ?? null) : null,
    computation: {
      daysInMonth,
      segments,
      terms,
      measurements: {
        usersPeak,
        storagePeakMilliGb,
        trackedVehicles: countDistinctVehiclesInMonth(period, data.bindings),
      },
      perVehiclePriceCents,
    },
    daysMeasured: measuredDates.size,
    gaps,
    dueDays: subscription.dueDays,
  };
}
