// B-ASS-03 — payload do job `subscription.measure-daily`. SEM `date` e sem catch-up: o job mede o dia
// de hoje (SP) e nunca preenche dia passado (R-F / G3). Qualquer campo estranho é 400 `unknown_field`.

import { MeteringError } from "./metering.types.js";

export const MEASURE_DAILY_ALLOWED_PAYLOAD_KEYS = [] as const;

export function assertMeasureDailyPayload(payload: unknown): asserts payload is Record<string, never> {
  if (payload === null || payload === undefined) return;
  if (typeof payload !== "object" || Array.isArray(payload)) {
    throw new MeteringError(400, "unknown_field", "unknown_field", "unknown_field: payload do job measure-daily inválido.");
  }
  for (const key of Object.keys(payload)) {
    throw new MeteringError(400, "unknown_field", "unknown_field", `unknown_field: chave não suportada no job measure-daily: ${key}`);
  }
}
