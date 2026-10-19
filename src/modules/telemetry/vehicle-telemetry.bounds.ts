// B-TRC-02 · o domínio FECHADO dos atributos veiculares (plano v2 §6.3; A-02, A-16 iv). ÚNICA fonte dos limites: o parser
// (`src/integrations/traccar/traccar-position.schema.ts`) usa `normalizeVehicleTelemetry`, e a migração
// `20260879000000_vehicle_telemetry_events` repete estes números LITERALMENTE no CHECK `vehicle_telemetry_events_ranges_check`.
// As suítes B (tabela de borda gerada daqui) e F (as mesmas bordas no banco) provam que o parser aceita só o que a coluna
// aceita. Forma errada (NaN, ±Infinity, string, null, booleano em campo numérico, número em campo booleano) ou fora da faixa
// → o ATRIBUTO é descartado e contado; o resto da amostra e a posição seguem.

import type { VehicleTelemetrySample } from "./vehicle-telemetry.types.js";

/** 2^53 − 1: o maior inteiro exato em `number`; teto das colunas BIGINT (o CHECK repete o literal). */
export const MAX_SAFE_TELEMETRY_INTEGER = 9007199254740991;

export const VEHICLE_TELEMETRY_BOUNDS = {
  /** metros, depois do arredondamento. */
  odometer: { min: 0, max: MAX_SAFE_TELEMETRY_INTEGER },
  /** metros, depois do arredondamento. */
  totalDistance: { min: 0, max: MAX_SAFE_TELEMETRY_INTEGER },
  /** SEGUNDOS, depois de `ms / 1000` arredondado (o Traccar manda `hours` em ms). */
  hours: { min: 0, max: MAX_SAFE_TELEMETRY_INTEGER },
  /** volts, ANTES da conversão; 1000 V é teto declarado (nenhuma viatura passa de 60 V) → 0..1 000 000 mV, cabe em int4. */
  power: { minV: 0, maxV: 1000 },
  /** %, depois do arredondamento. */
  batteryLevel: { min: 0, max: 100 },
} as const;

/** O domínio de cada COLUNA, derivado da fonte acima (o que o CHECK repete). */
export const VEHICLE_TELEMETRY_COLUMN_DOMAIN = {
  odometer_m: VEHICLE_TELEMETRY_BOUNDS.odometer,
  total_distance_m: VEHICLE_TELEMETRY_BOUNDS.totalDistance,
  engine_hours_s: VEHICLE_TELEMETRY_BOUNDS.hours,
  power_mv: { min: VEHICLE_TELEMETRY_BOUNDS.power.minV * 1000, max: VEHICLE_TELEMETRY_BOUNDS.power.maxV * 1000 },
  battery_level_pct: VEHICLE_TELEMETRY_BOUNDS.batteryLevel,
} as const;

const zeroSafe = (value: number): number => (Object.is(value, -0) ? 0 : value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const within = (value: number, range: { readonly min: number; readonly max: number }) =>
  value >= range.min && value <= range.max;

function meters(raw: unknown, range: { readonly min: number; readonly max: number }): number | undefined {
  if (!isFiniteNumber(raw)) return undefined;
  const normalized = zeroSafe(Math.round(raw));
  return within(normalized, range) ? normalized : undefined;
}

function engineSeconds(raw: unknown): number | undefined {
  if (!isFiniteNumber(raw)) return undefined;
  const normalized = zeroSafe(Math.round(raw / 1000));
  return within(normalized, VEHICLE_TELEMETRY_BOUNDS.hours) ? normalized : undefined;
}

function powerMillivolts(volts: unknown): number | undefined {
  if (!isFiniteNumber(volts)) return undefined;
  const { power } = VEHICLE_TELEMETRY_BOUNDS;
  if (volts < power.minV || volts > power.maxV) return undefined;
  return zeroSafe(Math.round(volts * 1000));
}

function batteryPercent(value: unknown): number | undefined {
  if (!isFiniteNumber(value)) return undefined;
  // Arredonda PRIMEIRO e só então limita a 0..100 (99,6 → 100 ✓; 100,4 → 100 ✓; 100,6 → 101 ✗; −0,4 → 0 ✓).
  const normalized = zeroSafe(Math.round(value));
  return within(normalized, VEHICLE_TELEMETRY_BOUNDS.batteryLevel) ? normalized : undefined;
}

const exactBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

/** As 7 chaves do Traccar que a allowlist lê de `position.attributes`. Nada mais entra. */
export const VEHICLE_TELEMETRY_ATTRIBUTE_KEYS = [
  "ignition",
  "motion",
  "odometer",
  "totalDistance",
  "hours",
  "power",
  "batteryLevel",
] as const;

/**
 * Lê as 7 chaves allowlisted de `position.attributes` e devolve a amostra normalizada (ou `undefined` se nenhuma passou)
 * e quantos atributos allowlisted PRESENTES foram descartados por forma ou faixa. Chave reservada dentro de `attributes`
 * não é procurada (regra do B-TRC-01) e NÃO influencia nada: só estas 7 chaves são lidas.
 */
export function normalizeVehicleTelemetry(attributes: Record<string, unknown>): {
  readonly sample: VehicleTelemetrySample | undefined;
  readonly discarded: number;
} {
  const read = {
    ignition: exactBoolean(attributes.ignition),
    motion: exactBoolean(attributes.motion),
    odometerM: meters(attributes.odometer, VEHICLE_TELEMETRY_BOUNDS.odometer),
    totalDistanceM: meters(attributes.totalDistance, VEHICLE_TELEMETRY_BOUNDS.totalDistance),
    engineHoursS: engineSeconds(attributes.hours),
    powerMv: powerMillivolts(attributes.power),
    batteryLevelPct: batteryPercent(attributes.batteryLevel),
  };
  let discarded = 0;
  for (const key of VEHICLE_TELEMETRY_ATTRIBUTE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) discarded += 1;
  }
  const sample: Record<string, number | boolean> = {};
  for (const [column, value] of Object.entries(read)) {
    if (value !== undefined) {
      sample[column] = value;
      discarded -= 1;
    }
  }
  return {
    sample: Object.keys(sample).length > 0 ? (sample as VehicleTelemetrySample) : undefined,
    discarded,
  };
}

/** O mesmo predicado do CHECK, para uma amostra já normalizada (fallback de H-10; nunca substitui o banco). */
export function vehicleTelemetrySampleWithinDomain(sample: VehicleTelemetrySample): boolean {
  const domain = VEHICLE_TELEMETRY_COLUMN_DOMAIN;
  const ok = (value: number | undefined, range: { readonly min: number; readonly max: number }) =>
    value === undefined || (Number.isInteger(value) && within(value, range));
  return (
    ok(sample.odometerM, domain.odometer_m) &&
    ok(sample.totalDistanceM, domain.total_distance_m) &&
    ok(sample.engineHoursS, domain.engine_hours_s) &&
    ok(sample.powerMv, domain.power_mv) &&
    ok(sample.batteryLevelPct, domain.battery_level_pct)
  );
}
