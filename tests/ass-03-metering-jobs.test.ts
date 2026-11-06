// B-ASS-03 · F5 — helpers de janela/fuso do job `subscription.measure-daily`. Sem Postgres: só a
// aritmética de relógio-de-parede em America/Sao_Paulo (UTC-3, sem DST desde 2019).
import assert from "node:assert/strict";
import test from "node:test";

import {
  computeNextMeasureDailyDelayMs,
  measureDailyDateKey,
  measureDailyDay,
} from "../src/modules/subscription-billing/subscription-billing.jobs.js";

const HORA = 60 * 60 * 1_000;

test("T-MED-16 · delay até a próxima janela 12:00/23:30 SP", () => {
  // 10:00 SP (13:00Z) → 12:00 SP (15:00Z) = 2 h.
  assert.equal(computeNextMeasureDailyDelayMs(new Date("2026-11-06T13:00:00.000Z")), 2 * HORA);

  // Exatamente 12:00 SP → a janela corrente é passado estrito; próxima = 23:30 SP (02:30Z do dia 07).
  assert.equal(computeNextMeasureDailyDelayMs(new Date("2026-11-06T15:00:00.000Z")), 11.5 * HORA);

  // 15:00 SP (18:00Z) → 23:30 SP (02:30Z do dia 07) = 8 h 30 min.
  assert.equal(computeNextMeasureDailyDelayMs(new Date("2026-11-06T18:00:00.000Z")), 8.5 * HORA);

  // 23:31 SP (02:31Z do dia 07) → 12:00 SP do dia 07 (15:00Z) = 12 h 29 min.
  assert.equal(computeNextMeasureDailyDelayMs(new Date("2026-11-07T02:31:00.000Z")), (12 * HORA) + (29 * 60 * 1_000));
});

test("T-MED-17 · a data e o dia de medição são os locais de São Paulo", () => {
  // 23:59:59 SP do dia 05 ainda é 05 local; 00:00 SP do dia 06 já é 06.
  assert.equal(measureDailyDateKey(new Date("2026-11-06T02:59:59.000Z")), "2026-11-05");
  assert.equal(measureDailyDateKey(new Date("2026-11-06T03:00:00.000Z")), "2026-11-06");

  const day = measureDailyDay(new Date("2026-11-06T15:00:00.000Z"));
  assert.equal(day.date, "2026-11-06");
  assert.equal(day.start.toISOString(), "2026-11-06T03:00:00.000Z");
  assert.equal(day.end.toISOString(), "2026-11-07T02:59:59.999Z");
});
