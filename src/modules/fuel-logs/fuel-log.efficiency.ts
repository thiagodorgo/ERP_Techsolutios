import type { FuelLog, FuelLogEfficiency } from "./fuel-log.types.js";

const NO_EFFICIENCY: FuelLogEfficiency = { kmPerLiter: null, distanceKm: null };

/**
 * Chronological order of a vehicle's fuel logs: by fueled_at, then created_at,
 * then id as a stable tie-breaker. The "previous" log of a target is the one
 * immediately before it in this order (R1.1).
 */
function compareChronologically(left: FuelLog, right: FuelLog): number {
  const byFueledAt = left.fueledAt.getTime() - right.fueledAt.getTime();
  if (byFueledAt !== 0) return byFueledAt;

  const byCreatedAt = left.createdAt.getTime() - right.createdAt.getTime();
  if (byCreatedAt !== 0) return byCreatedAt;

  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function sortChronologically(logs: readonly FuelLog[]): FuelLog[] {
  return [...logs].sort(compareChronologically);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/**
 * Derives km/L and distance for a single target log against the vehicle's ordered
 * history (R1.1). `history` must be every log of the SAME vehicle (active or not),
 * so a soft-deleted predecessor still anchors the distance. The target's previous
 * log is the closest one strictly before it chronologically; the vehicle's first
 * log has no predecessor and returns baseline (null/null). km/L is NEVER stored.
 */
export function computeEfficiency(target: FuelLog, history: readonly FuelLog[]): FuelLogEfficiency {
  const ordered = sortChronologically(history);
  const index = ordered.findIndex((log) => log.id === target.id);

  const predecessor =
    index > 0
      ? ordered[index - 1]
      : index === -1
        ? [...ordered].reverse().find((log) => compareChronologically(log, target) < 0)
        : undefined;

  if (!predecessor) return NO_EFFICIENCY;

  const distanceKm = target.odometer - predecessor.odometer;
  const kmPerLiter = target.liters > 0 ? roundTo(distanceKm / target.liters, 2) : null;

  return { distanceKm, kmPerLiter };
}
