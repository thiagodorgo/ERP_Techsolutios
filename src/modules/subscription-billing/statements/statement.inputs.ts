// B-ASS-04 — o MONTADOR PURO das entradas do fechamento (plano §3.3 e §4.4 regras 7 e 8): transforma assinaturas,
// versões de preço, add-ons de rastreamento, medições diárias (`tenant_usage_daily`) e vínculos de veículo em
// `StatementInputs`. Sem banco e sem relógio: o repositório (F5) só carrega os dados e chama esta função.
//
// Regras:
//  - cada dia do mês é avaliado no INÍCIO do dia em São Paulo (`parseBusinessDate`), com as janelas `[validFrom,
//    validTo)` das assinaturas e das versões (`resolveVersionAt`);
//  - segmentos = dias consecutivos com a mesma assinatura, a mesma versão e o mesmo preço efetivo (G6);
//  - franquia e unitários do excedente = os do ÚLTIMO dia com assinatura (§3.3);
//  - refechar um reaberto usa as MESMAS versões do snapshot (`pin`, G5): a de cada trecho do plano base E a do
//    add-on de rastreamento; só as medições e os ajustes mudam (§3.4);
//  - nenhum dia com assinatura → `no_subscription`; dia com assinatura e sem versão vigente → `plan_without_price`;
//    organização de sistema `platform` → `platform_organization` (S16).

import { parseBusinessDate } from "../../../config/business-time.js";
import { resolveVersionAt } from "../plans/plan-versioning.js";
import type { SubscriptionPlanVersion, TenantSubscription, TenantSubscriptionAddon } from "../plans/plan-types.js";
import {
  bytesToMilliGbCeil,
  countDistinctVehiclesInDays,
  countDistinctVehiclesInMonth,
  daysInPeriod,
  gbToMilli,
  type StatementMeasurements,
  type StatementSegmentInput,
  type TrackingCharge,
  type TrackingFlatSegmentInput,
  type TrackingPerVehicleInput,
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

/** Refechar um reaberto (G5, §3.4): as versões gravadas no snapshot — a de cada trecho do plano base e a do add-on. */
export type StatementVersionPin = {
  readonly planVersionIds: readonly string[];
  readonly addonPlanVersionIds: readonly string[];
};

export type StatementResolveOptions = {
  /** `null` = fechamento novo: resolve a versão vigente em cada dia. */
  readonly pin: StatementVersionPin | null;
};

/**
 * Versão do plano para o dia `at`. Com `pin`, só as versões GRAVADAS no snapshot concorrem (uma versão publicada
 * depois do fechamento nunca entra no refechamento): vence a gravada vigente no dia; se a janela dela foi encerrada
 * depois do fechamento (a publicação de uma nova versão fecha a anterior), vence a última gravada que começou até o
 * dia. Um plano sem versão gravada (a assinatura mudou depois do fechamento) resolve a vigente — desvio declarado.
 */
function versionForDay(
  versions: readonly SubscriptionPlanVersion[],
  at: Date,
  pinnedIds: readonly string[] | null,
): SubscriptionPlanVersion | null {
  if (pinnedIds) {
    const pinned = versions.filter((candidate) => pinnedIds.includes(candidate.id));
    if (pinned.length > 0) {
      const live = resolveVersionAt(pinned, at);
      if (live) return live;
      const started = pinned
        .filter((candidate) => candidate.validFrom.getTime() <= at.getTime())
        .sort((left, right) => left.validFrom.getTime() - right.validFrom.getTime())
        .at(-1);
      return started ?? pinned[0]!;
    }
  }
  return resolveVersionAt(versions, at);
}

function dayStart(period: string, day: number): Date {
  return parseBusinessDate(`${period}-${String(day).padStart(2, "0")}`);
}

function rangeDays(fromDay: number, toDay: number): number[] {
  return Array.from({ length: toDay - fromDay + 1 }, (_, offset) => fromDay + offset);
}

function activeAt<T extends { validFrom: Date; validTo: Date | null }>(rows: readonly T[], at: Date): T | null {
  // A assinatura vigente é única por organização (R-PLAN-4); em caso de dado inconsistente, vence a mais recente.
  return resolveVersionAt(rows, at);
}

export function buildStatementInputs(
  period: string,
  data: StatementSourceData,
  options: StatementResolveOptions,
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
    const version = versionForDay(versions, at, options.pin?.planVersionIds ?? null);
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

  // B-ASS-12 — rastreamento, resolvido DIA A DIA: o add-on vigente no dia, na assinatura daquele dia, com a versão
  // daquele dia. A sobrescrita por veículo da organização define o regime dela (por veículo, pelo preço combinado),
  // qualquer que seja a unidade da versão: uma versão `flat` nova nunca apaga uma cortesia.
  type DayTracking = {
    readonly addon: TenantSubscriptionAddon;
    readonly version: SubscriptionPlanVersion;
    readonly unit: "per_vehicle" | "flat";
    readonly priceCents: number;
  };
  const pinnedAddonIds = options.pin && options.pin.addonPlanVersionIds.length > 0 ? options.pin.addonPlanVersionIds : null;
  const trackingDays: (DayTracking | null)[] = [];
  for (let index = 0; index < days.length; index += 1) {
    const current = days[index];
    const at = dayStart(period, index + 1);
    const dayAddon = current
      ? activeAt(
          data.addons.filter((row) => row.subscriptionId === current.subscription.id),
          at,
        )
      : null;
    if (!dayAddon) {
      trackingDays.push(null);
      continue;
    }
    const dayVersion = versionForDay(data.versionsByPlan.get(dayAddon.planId) ?? [], at, pinnedAddonIds);
    if (!dayVersion) return { kind: "skip", reason: "addon_without_price" };
    const override = dayAddon.perVehiclePriceOverrideCents;
    if (override !== null) {
      trackingDays.push({ addon: dayAddon, version: dayVersion, unit: "per_vehicle", priceCents: override });
    } else if (dayVersion.pricingUnit === "flat") {
      if (dayVersion.perVehiclePriceCents !== null && !(dayVersion.monthlyPriceCents > 0)) {
        return { kind: "skip", reason: "addon_without_price" };
      }
      trackingDays.push({ addon: dayAddon, version: dayVersion, unit: "flat", priceCents: dayVersion.monthlyPriceCents });
    } else {
      if (dayVersion.perVehiclePriceCents === null) return { kind: "skip", reason: "addon_without_price" };
      trackingDays.push({ addon: dayAddon, version: dayVersion, unit: "per_vehicle", priceCents: dayVersion.perVehiclePriceCents });
    }
  }

  const daysOf = (unit: "per_vehicle" | "flat" | null): number[] =>
    trackingDays.flatMap((entry, index) => (entry && (unit === null || entry.unit === unit) ? [index + 1] : []));
  const addonDays = daysOf(null);
  let perVehiclePriceCents: number | null = null;
  let addonVersion: SubscriptionPlanVersion | null = null;
  let tracking: TrackingCharge | null = null;
  if (addonDays.length > 0) {
    // A coluna `addon_plan_version_id` guarda a versão do ÚLTIMO dia com add-on; as demais vão no snapshot.
    addonVersion = trackingDays[addonDays.at(-1)! - 1]!.version;

    // Por veículo (P10): sem pro-rata e um preço só no mês — o do último dia nesse regime.
    const perVehicleDays = daysOf("per_vehicle");
    let perVehicle: TrackingPerVehicleInput | null = null;
    if (perVehicleDays.length > 0) {
      const reference = trackingDays[perVehicleDays.at(-1)! - 1]!;
      perVehiclePriceCents = reference.priceCents;
      perVehicle = {
        addonPlanVersionId: reference.version.id,
        billedVehicles: countDistinctVehiclesInDays(period, data.bindings, perVehicleDays),
        perVehiclePriceCents: reference.priceCents,
      };
    }

    // Mensalidade fixa (P17/R-B): um trecho por dias consecutivos com o mesmo add-on, a mesma versão e o mesmo preço.
    const flatSegments: TrackingFlatSegmentInput[] = [];
    for (let index = 0; index < trackingDays.length; index += 1) {
      const current = trackingDays[index];
      if (!current || current.unit !== "flat") continue;
      const previous = index > 0 ? trackingDays[index - 1] : null;
      const last = flatSegments.at(-1);
      const continues =
        last !== undefined &&
        previous !== null &&
        previous !== undefined &&
        previous.unit === "flat" &&
        previous.addon.id === current.addon.id &&
        previous.version.id === current.version.id &&
        previous.priceCents === current.priceCents;
      if (continues) {
        flatSegments[flatSegments.length - 1] = { ...last, toDay: index + 1 };
      } else {
        flatSegments.push({
          addonId: current.addon.id,
          addonPlanVersionId: current.version.id,
          fromDay: index + 1,
          toDay: index + 1,
          monthlyPriceCents: current.priceCents,
          billedVehicles: 0,
        });
      }
    }
    tracking = {
      billedVehicles: countDistinctVehiclesInDays(period, data.bindings, addonDays),
      perVehicle,
      flatSegments: flatSegments.map((segment) => ({
        ...segment,
        billedVehicles: countDistinctVehiclesInDays(period, data.bindings, rangeDays(segment.fromDay, segment.toDay)),
      })),
    };
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

  return {
    kind: "ready",
    subscriptionId: subscription.id,
    planVersionId: version.id,
    addonPlanVersionId: addonVersion?.id ?? null,
    computation: {
      daysInMonth,
      segments,
      terms,
      measurements: monthMeasurements(period, rows, data.bindings),
      perVehiclePriceCents,
      tracking,
    },
    daysMeasured: measuredDates.size,
    gaps,
    dueDays: subscription.dueDays,
  };
}

/**
 * Picos do mês — a MESMA conta do fechamento e da visão do cliente (usuários: maior ativo medido; espaço: maior dia,
 * banco + arquivos, com teto a 0,001 GB; veículos: distintos com vínculo em qualquer dia do mês — G15).
 */
export function monthMeasurements(
  period: string,
  usage: readonly UsageDayRow[],
  bindings: readonly VehicleBindingWindow[],
): StatementMeasurements {
  let usersPeak = 0;
  let storagePeakMilliGb = 0;
  for (const row of usage) {
    if (!row.date.startsWith(`${period}-`)) continue;
    if (row.activeUsers !== null && row.activeUsers > usersPeak) usersPeak = row.activeUsers;
    if (row.dbBytesEstimated !== null || row.filesBytes !== null) {
      const milli = bytesToMilliGbCeil((row.dbBytesEstimated ?? 0n) + (row.filesBytes ?? 0n));
      if (milli > storagePeakMilliGb) storagePeakMilliGb = milli;
    }
  }
  return { usersPeak, storagePeakMilliGb, trackedVehicles: countDistinctVehiclesInMonth(period, bindings) };
}
