import { roundToDecimalPrecision } from "./inventory.calculations.js";
import type { InventoryAbcClass } from "./inventory.types.js";

/** R7.4 — the Pareto cut-offs (cumulative % of consumption value). */
export const ABC_A_THRESHOLD = 80;
export const ABC_B_THRESHOLD = 95;

/** One item with its consumption value over the ABC window (R7.4: Σ qtde × custo). */
export type AbcConsumption = {
  readonly id: string;
  readonly consumptionValue: number;
};

/** Summary returned by the recalc route: how many items landed in each class. */
export type AbcSummary = {
  readonly A: number;
  readonly B: number;
  readonly C: number;
};

/**
 * R7.4 — Pareto classification by consumption value (last 12 months):
 *
 * 1. items are ordered by consumption value DESC (ties broken by id, so the result
 *    is deterministic);
 * 2. a running cumulative is kept; an item is class **A** while the cumulative
 *    BEFORE it is under 80% of the total, class **B** while it is under 95%, and
 *    class **C** afterwards — i.e. A holds the items that TOGETHER make up ~80% of
 *    the value, B the next ~15%, C the rest;
 * 3. any item with zero (or negative) consumption is class **C**, and if the total
 *    value is zero every item is class **C**.
 *
 * The cumulative percentage is rounded to DECIMAL(20,6) precision before the
 * comparison so a value that lands EXACTLY on 80% / 95% falls into the higher
 * (less critical) class rather than tipping over on a float artefact.
 */
export function classifyAbc(items: readonly AbcConsumption[]): Map<string, InventoryAbcClass> {
  const result = new Map<string, InventoryAbcClass>();
  const total = items.reduce((sum, item) => sum + Math.max(0, item.consumptionValue), 0);

  if (total <= 0) {
    for (const item of items) {
      result.set(item.id, "C");
    }

    return result;
  }

  const ordered = [...items].sort((left, right) => {
    if (right.consumptionValue !== left.consumptionValue) {
      return right.consumptionValue - left.consumptionValue;
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  let cumulativeBefore = 0;

  for (const item of ordered) {
    const value = Math.max(0, item.consumptionValue);

    if (value <= 0) {
      result.set(item.id, "C");
      continue;
    }

    const pctBefore = roundToDecimalPrecision((cumulativeBefore / total) * 100);

    if (pctBefore < ABC_A_THRESHOLD) {
      result.set(item.id, "A");
    } else if (pctBefore < ABC_B_THRESHOLD) {
      result.set(item.id, "B");
    } else {
      result.set(item.id, "C");
    }

    cumulativeBefore += value;
  }

  return result;
}

/** Counts each class in a classification map (feeds the recalc summary). */
export function summarizeAbc(classes: ReadonlyMap<string, InventoryAbcClass>): AbcSummary {
  let A = 0;
  let B = 0;
  let C = 0;

  for (const value of classes.values()) {
    if (value === "A") A += 1;
    else if (value === "B") B += 1;
    else C += 1;
  }

  return { A, B, C };
}
