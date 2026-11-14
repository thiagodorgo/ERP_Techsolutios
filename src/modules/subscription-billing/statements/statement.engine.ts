// B-ASS-04 · F1 — o motor PURO do demonstrativo mensal (plano §4.4, §3.3). Sem banco, sem relógio, sem I/O.
//
// Regra de ouro (§3.3): dinheiro em CENTAVOS INTEIROS (`Number.isSafeInteger` assertado) e espaço em MILÉSIMOS DE GB
// inteiros. Nenhuma conta de dinheiro passa por ponto flutuante: o arredondamento "half-up" é divisão inteira
// (`halfUpDiv`). Um guard de texto em `tests/ass-04-statement-engine.test.ts` proíbe `toFixed`, `Math.round` e
// `parseFloat` neste arquivo.

export const BYTES_PER_GB = 1024n ** 3n;

export class StatementEngineError extends Error {
  constructor(readonly reason: string, message: string) {
    super(message);
    this.name = "StatementEngineError";
  }
}

function assertCents(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new StatementEngineError("unsafe_cents", `${field} must be a safe integer amount of cents.`);
  }
}

function assertNonNegativeInt(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new StatementEngineError("invalid_quantity", `${field} must be a non-negative safe integer.`);
  }
}

/** `round_half_up(numerator / denominator)` em inteiros não negativos: 0,5 sobe (nunca "half-even"). */
export function halfUpDiv(numerator: number, denominator: number): number {
  assertNonNegativeInt(numerator, "numerator");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new StatementEngineError("invalid_denominator", "denominator must be a positive safe integer.");
  }
  const big = (2n * BigInt(numerator) + BigInt(denominator)) / (2n * BigInt(denominator));
  const result = Number(big);
  assertCents(result, "halfUpDiv");
  return result;
}

/** Bytes → milésimos de GB, arredondado PARA CIMA a 0,001 GB (§3.3: `storage_peak_gb` teto a 0,001). */
export function bytesToMilliGbCeil(bytes: bigint): number {
  if (bytes < 0n) throw new StatementEngineError("invalid_quantity", "bytes must be non-negative.");
  const scaled = bytes * 1000n;
  const milli = scaled / BYTES_PER_GB + (scaled % BYTES_PER_GB === 0n ? 0n : 1n);
  const result = Number(milli);
  assertNonNegativeInt(result, "storageMilliGb");
  return result;
}

/** GB com até 3 casas (como o catálogo guarda `includedStorageGb`) → milésimos inteiros. */
export function gbToMilli(gb: number): number {
  const text = String(gb);
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(text)) {
    throw new StatementEngineError("invalid_storage_gb", "storage GB must have at most 3 decimal places.");
  }
  const [whole, fraction = ""] = text.split(".");
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  assertNonNegativeInt(milli, "storageMilliGb");
  return milli;
}

export type StatementSegmentInput = {
  readonly subscriptionId: string;
  readonly planVersionId: string;
  /** Primeiro e último dia (1-based, inclusivos) do trecho dentro do mês. */
  readonly fromDay: number;
  readonly toDay: number;
  /** Preço mensal efetivo do trecho (sobrescrita da organização, se houver; senão o da versão). */
  readonly monthlyPriceCents: number;
};

export type StatementSegment = StatementSegmentInput & { readonly days: number; readonly baseCents: number };

/** Pro-rata diário por segmento (§3.3, G6): `round_half_up(monthly × days / days_in_month)` por trecho. */
export function prorate(
  segments: readonly StatementSegmentInput[],
  daysInMonth: number,
): { readonly segments: readonly StatementSegment[]; readonly baseCents: number } {
  if (!Number.isSafeInteger(daysInMonth) || daysInMonth < 28 || daysInMonth > 31) {
    throw new StatementEngineError("invalid_days_in_month", "daysInMonth must be between 28 and 31.");
  }
  let previousTo = 0;
  const out: StatementSegment[] = [];
  for (const segment of segments) {
    assertCents(segment.monthlyPriceCents, "monthlyPriceCents");
    if (segment.monthlyPriceCents < 0) {
      throw new StatementEngineError("invalid_amount", "monthlyPriceCents must be non-negative.");
    }
    if (segment.fromDay < 1 || segment.toDay > daysInMonth || segment.fromDay > segment.toDay) {
      throw new StatementEngineError("invalid_segment", "segment days must lie inside the month, from <= to.");
    }
    if (segment.fromDay <= previousTo) {
      throw new StatementEngineError("overlapping_segments", "segments must be ordered and must not overlap.");
    }
    previousTo = segment.toDay;
    const days = segment.toDay - segment.fromDay + 1;
    const baseCents = halfUpDiv(segment.monthlyPriceCents * days, daysInMonth);
    out.push({ ...segment, days, baseCents });
  }
  const baseCents = out.reduce((total, segment) => total + segment.baseCents, 0);
  assertCents(baseCents, "baseCents");
  return { segments: out, baseCents };
}

/** Franquia e unitários do excedente: os da versão/assinatura vigente no ÚLTIMO dia com assinatura (§3.3). */
export type StatementTerms = {
  readonly includedUsers: number;
  readonly includedStorageMilliGb: number;
  readonly extraUserPriceCents: number;
  readonly extraGbPriceCents: number;
};

export type StatementMeasurements = {
  /** Maior número de usuários ativos medido no mês. */
  readonly usersPeak: number;
  /** Maior espaço diário do mês, em milésimos de GB (já com teto a 0,001). */
  readonly storagePeakMilliGb: number;
  /** Veículos distintos com vínculo vigente em qualquer dia do mês (G15). */
  readonly trackedVehicles: number;
};

/** B-ASS-12 — a parte POR VEÍCULO do mês (P10: no mês, sem pro-rata): um preço só, o do último dia nesse regime. */
export type TrackingPerVehicleInput = {
  readonly addonPlanVersionId: string;
  /** Veículos distintos com vínculo em algum dia do regime por veículo. */
  readonly billedVehicles: number;
  readonly perVehiclePriceCents: number;
};

/** B-ASS-12 — um trecho de MENSALIDADE FIXA (P17/R-B: o add-on `flat` segue a regra da base, por segmento de vigência). */
export type TrackingFlatSegmentInput = {
  readonly addonId: string;
  readonly addonPlanVersionId: string;
  /** Primeiro e último dia (1-based, inclusivos) do trecho dentro do mês. */
  readonly fromDay: number;
  readonly toDay: number;
  readonly monthlyPriceCents: number;
  /** Veículos distintos com vínculo em algum dia DO TRECHO; zero = o trecho não cobra (0 cobrança sem vínculo). */
  readonly billedVehicles: number;
};

export type TrackingFlatSegment = TrackingFlatSegmentInput & { readonly days: number; readonly cents: number };

/**
 * B-ASS-12 — a cobrança de rastreamento do mês, já resolvida dia a dia pelo montador:
 *  - `perVehicle`: `billedVehicles × perVehiclePriceCents`, sem pro-rata (P10);
 *  - `flatSegments`: `round_half_up(mensalidade × dias do trecho / dias do mês)` POR TRECHO, somados (P17/R-B), e só o
 *    trecho em que algum veículo teve vínculo;
 *  - `billedVehicles`: veículos distintos com vínculo em algum dia COM add-on (o que explica a linha).
 */
export type TrackingCharge = {
  readonly billedVehicles: number;
  readonly perVehicle: TrackingPerVehicleInput | null;
  readonly flatSegments: readonly TrackingFlatSegmentInput[];
};

export type TrackingUnit = "per_vehicle" | "flat" | "mixed";

export type StatementComputationInput = {
  readonly daysInMonth: number;
  readonly segments: readonly StatementSegmentInput[];
  readonly terms: StatementTerms;
  readonly measurements: StatementMeasurements;
  /** Preço por veículo do add-on de rastreamento vigente; `null` = sem add-on (rastreamento 0). */
  readonly perVehiclePriceCents: number | null;
  /**
   * B-ASS-12 — presente (objeto ou `null`) em todo fechamento novo: é a fonte da linha de rastreamento. AUSENTE só em
   * snapshot gravado antes do B-ASS-12, que recalcula pela regra antiga (`trackedVehicles × perVehiclePriceCents`).
   */
  readonly tracking?: TrackingCharge | null;
  /** Soma dos ajustes manuais (pode ser negativa); o piso `total >= 0` é do serviço (S9). */
  readonly adjustmentsCents: number;
  /** Créditos aplicados a este demonstrativo (abatem o total; G7). */
  readonly creditsAppliedCents: number;
};

export type StatementComputation = {
  readonly segments: readonly StatementSegment[];
  readonly baseCents: number;
  readonly usersIncluded: number;
  readonly usersPeak: number;
  readonly usersExtra: number;
  readonly usersExtraCents: number;
  readonly storageIncludedMilliGb: number;
  readonly storagePeakMilliGb: number;
  readonly storageExtraMilliGb: number;
  readonly storageExtraCents: number;
  readonly trackedVehicles: number;
  readonly trackingCents: number;
  /** B-ASS-12 — o regime e a quantidade que explicam `trackingCents` (`null`/0 = sem add-on; `mixed` = os dois no mês). */
  readonly trackingUnit: TrackingUnit | null;
  readonly trackingBilledVehicles: number;
  readonly trackingPerVehicleCents: number;
  readonly trackingFlatCents: number;
  readonly trackingSegments: readonly TrackingFlatSegment[];
  readonly adjustmentsCents: number;
  readonly creditsAppliedCents: number;
  readonly totalCents: number;
};

/** O cálculo inteiro do demonstrativo (§3.3). Determinístico: a mesma entrada dá o mesmo total, sempre. */
export function computeStatement(input: StatementComputationInput): StatementComputation {
  const { terms, measurements } = input;
  for (const [field, value] of [
    ["includedUsers", terms.includedUsers],
    ["includedStorageMilliGb", terms.includedStorageMilliGb],
    ["extraUserPriceCents", terms.extraUserPriceCents],
    ["extraGbPriceCents", terms.extraGbPriceCents],
    ["usersPeak", measurements.usersPeak],
    ["storagePeakMilliGb", measurements.storagePeakMilliGb],
    ["trackedVehicles", measurements.trackedVehicles],
    ["creditsAppliedCents", input.creditsAppliedCents],
  ] as const) {
    assertNonNegativeInt(value, field);
  }
  assertCents(input.adjustmentsCents, "adjustmentsCents");

  const { segments, baseCents } = prorate(input.segments, input.daysInMonth);

  const usersExtra = Math.max(0, measurements.usersPeak - terms.includedUsers);
  const usersExtraCents = usersExtra * terms.extraUserPriceCents;
  assertCents(usersExtraCents, "usersExtraCents");

  const storageExtraMilliGb = Math.max(0, measurements.storagePeakMilliGb - terms.includedStorageMilliGb);
  const storageExtraCents = halfUpDiv(storageExtraMilliGb * terms.extraGbPriceCents, 1000);

  const tracking = computeTracking(input);
  const trackingCents = tracking.trackingCents;

  const totalCents =
    baseCents + usersExtraCents + storageExtraCents + trackingCents + input.adjustmentsCents - input.creditsAppliedCents;
  assertCents(totalCents, "totalCents");

  return {
    segments,
    baseCents,
    usersIncluded: terms.includedUsers,
    usersPeak: measurements.usersPeak,
    usersExtra,
    usersExtraCents,
    storageIncludedMilliGb: terms.includedStorageMilliGb,
    storagePeakMilliGb: measurements.storagePeakMilliGb,
    storageExtraMilliGb,
    storageExtraCents,
    trackedVehicles: measurements.trackedVehicles,
    ...tracking,
    adjustmentsCents: input.adjustmentsCents,
    creditsAppliedCents: input.creditsAppliedCents,
    totalCents,
  };
}

type TrackingComputation = {
  readonly trackingCents: number;
  readonly trackingUnit: TrackingUnit | null;
  readonly trackingBilledVehicles: number;
  readonly trackingPerVehicleCents: number;
  readonly trackingFlatCents: number;
  readonly trackingSegments: readonly TrackingFlatSegment[];
};

const NO_TRACKING: TrackingComputation = {
  trackingCents: 0,
  trackingUnit: null,
  trackingBilledVehicles: 0,
  trackingPerVehicleCents: 0,
  trackingFlatCents: 0,
  trackingSegments: [],
};

/** A linha de rastreamento (B-ASS-12). Snapshot sem `tracking` = regra antiga, para o recálculo reproduzir o total. */
function computeTracking(input: StatementComputationInput): TrackingComputation {
  if (input.tracking === undefined) {
    if (input.perVehiclePriceCents === null) return NO_TRACKING;
    assertNonNegativeInt(input.perVehiclePriceCents, "perVehiclePriceCents");
    const legacyCents = input.measurements.trackedVehicles * input.perVehiclePriceCents;
    assertCents(legacyCents, "trackingCents");
    return {
      ...NO_TRACKING,
      trackingCents: legacyCents,
      trackingUnit: "per_vehicle",
      trackingBilledVehicles: input.measurements.trackedVehicles,
      trackingPerVehicleCents: legacyCents,
    };
  }
  const tracking = input.tracking;
  if (tracking === null) return NO_TRACKING;
  const tracked = input.measurements.trackedVehicles;
  const assertBilled = (value: number, field: string): void => {
    assertNonNegativeInt(value, field);
    if (value > tracked) {
      throw new StatementEngineError("invalid_quantity", `${field} cannot exceed trackedVehicles.`);
    }
  };
  assertBilled(tracking.billedVehicles, "billedVehicles");

  let perVehicleCents = 0;
  if (tracking.perVehicle !== null) {
    assertBilled(tracking.perVehicle.billedVehicles, "perVehicle.billedVehicles");
    assertNonNegativeInt(tracking.perVehicle.perVehiclePriceCents, "perVehiclePriceCents");
    perVehicleCents = tracking.perVehicle.billedVehicles * tracking.perVehicle.perVehiclePriceCents;
    assertCents(perVehicleCents, "trackingPerVehicleCents");
  }

  const flatSegments: TrackingFlatSegment[] = [];
  const flatCents = flatSegments.reduce((total, segment) => total + segment.cents, 0);
  const cents = perVehicleCents + flatCents;
  assertCents(cents, "trackingCents");

  const hasFlat = flatSegments.length > 0;
  const unit: TrackingUnit | null = tracking.perVehicle !== null ? (hasFlat ? "mixed" : "per_vehicle") : hasFlat ? "flat" : null;
  if (unit === null) {
    throw new StatementEngineError("invalid_tracking", "tracking needs a per-vehicle part or a flat segment; no add-on is null.");
  }
  return {
    trackingCents: cents,
    trackingUnit: unit,
    trackingBilledVehicles: tracking.billedVehicles,
    trackingPerVehicleCents: perVehicleCents,
    trackingFlatCents: flatCents,
    trackingSegments: flatSegments,
  };
}

/** O snapshot guardado no demonstrativo: tudo o que é preciso para recalcular o total sem o catálogo atual. */
export type StatementSnapshot = {
  readonly daysInMonth: number;
  readonly segments: readonly StatementSegmentInput[];
  readonly terms: StatementTerms;
  readonly measurements: StatementMeasurements;
  readonly perVehiclePriceCents: number | null;
  readonly tracking?: TrackingCharge | null;
  readonly adjustmentsCents: number;
  readonly creditsAppliedCents: number;
};

export function snapshotOf(input: StatementComputationInput): StatementSnapshot {
  return {
    daysInMonth: input.daysInMonth,
    segments: input.segments.map((segment) => ({ ...segment })),
    terms: { ...input.terms },
    measurements: { ...input.measurements },
    perVehiclePriceCents: input.perVehiclePriceCents,
    ...(input.tracking === undefined ? {} : { tracking: cloneTracking(input.tracking) }),
    adjustmentsCents: input.adjustmentsCents,
    creditsAppliedCents: input.creditsAppliedCents,
  };
}

function cloneTracking(tracking: TrackingCharge | null): TrackingCharge | null {
  if (tracking === null) return null;
  return {
    billedVehicles: tracking.billedVehicles,
    perVehicle: tracking.perVehicle === null ? null : { ...tracking.perVehicle },
    flatSegments: tracking.flatSegments.map((segment) => ({ ...segment })),
  };
}

/** Invariante §3.3: recalcular do snapshot reproduz o total, byte a byte. */
export function recompute(snapshot: StatementSnapshot): number {
  return computeStatement(snapshot).totalCents;
}

export type DayWindow = { readonly validFrom: string; readonly validTo: string | null };

/**
 * Dias (1-based) do mês `period` (`YYYY-MM`) em que a janela `[validFrom, validTo)` vigora. Datas no formato
 * `YYYY-MM-DD` já no fuso de negócio (São Paulo). `validTo` é exclusivo (a versão anterior recebe
 * `valid_to = validFrom` da nova — §3.4).
 */
export function activeDayRange(
  period: string,
  daysInMonth: number,
  window: DayWindow,
): { readonly fromDay: number; readonly toDay: number } | null {
  const monthFirst = `${period}-01`;
  const monthLast = `${period}-${String(daysInMonth).padStart(2, "0")}`;
  const start = window.validFrom > monthFirst ? window.validFrom : monthFirst;
  // último dia ativo = véspera de validTo (exclusivo)
  let end = monthLast;
  if (window.validTo !== null) {
    const dayBefore = previousDate(window.validTo);
    if (dayBefore < end) end = dayBefore;
  }
  if (start > end || start > monthLast || end < monthFirst) return null;
  return { fromDay: Number(start.slice(8, 10)), toDay: Number(end.slice(8, 10)) };
}

function previousDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const previous = new Date(Date.UTC(y, m - 1, d - 1));
  return previous.toISOString().slice(0, 10);
}

/** Dias do mês `YYYY-MM` (calendário gregoriano; independe de fuso). */
export function daysInPeriod(period: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new StatementEngineError("invalid_period", "period must be YYYY-MM.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new StatementEngineError("invalid_period", "period month must be 01..12.");
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Veículos DISTINTOS com vínculo vigente em qualquer dia do mês (G15): X nos dias 1-10 e Y nos dias 11-30 → 2,
 * nunca o máximo diário (1). Janelas `[validFrom, validTo]` em datas de negócio; `validTo` nulo = aberto.
 */
export function countDistinctVehiclesInMonth(
  period: string,
  bindings: readonly { readonly vehicleId: string; readonly validFrom: string; readonly validTo: string | null }[],
): number {
  const monthFirst = `${period}-01`;
  const monthLast = `${period}-${String(daysInPeriod(period)).padStart(2, "0")}`;
  const vehicles = new Set<string>();
  for (const binding of bindings) {
    if (binding.validFrom > monthLast) continue;
    if (binding.validTo !== null && binding.validTo < monthFirst) continue;
    vehicles.add(binding.vehicleId);
  }
  return vehicles.size;
}

/**
 * B-ASS-12 — veículos DISTINTOS com vínculo vigente em pelo menos um dos `days` (1-based) do mês: só o vínculo que
 * convive com o add-on entra na cobrança ("0 cobrança sem vínculo vigente"). Janelas como em
 * `countDistinctVehiclesInMonth`: datas de negócio, `validTo` inclusivo, nulo = aberto.
 */
export function countDistinctVehiclesInDays(
  period: string,
  bindings: readonly { readonly vehicleId: string; readonly validFrom: string; readonly validTo: string | null }[],
  days: readonly number[],
): number {
  const dates = days.map((day) => `${period}-${String(day).padStart(2, "0")}`);
  const vehicles = new Set<string>();
  for (const binding of bindings) {
    if (dates.some((date) => binding.validFrom <= date && (binding.validTo === null || binding.validTo >= date))) {
      vehicles.add(binding.vehicleId);
    }
  }
  return vehicles.size;
}
