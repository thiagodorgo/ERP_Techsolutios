import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildTraccarPositionCommand } from "../src/integrations/traccar/traccar-position.adapter.js";
import { parseTraccarPositionEnvelope } from "../src/integrations/traccar/traccar-position.schema.js";
import {
  MAX_SAFE_TELEMETRY_INTEGER,
  normalizeVehicleTelemetry,
  VEHICLE_TELEMETRY_BOUNDS,
} from "../src/modules/telemetry/vehicle-telemetry.bounds.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte B — a allowlist de ATRIBUTOS da posição e o domínio FECHADO por coluna (plano v2 §6.3; A-02, A-16 iv).
// Sem banco. A tabela de borda (B9) é GERADA de `VEHICLE_TELEMETRY_BOUNDS`, a mesma fonte que a migração repete no CHECK.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };
const INSTANCE = "erp-test";

function envelope(attributes: Record<string, unknown> | undefined) {
  const body = structuredClone(FIXTURE);
  if (attributes === undefined) delete body.position.attributes;
  else body.position.attributes = attributes;
  return body;
}
function command(attributes: Record<string, unknown> | undefined) {
  return buildTraccarPositionCommand(parseTraccarPositionEnvelope(envelope(attributes)), {
    instanceKey: INSTANCE,
    receivedAt: new Date("2026-10-19T12:00:00Z"),
  });
}

test("amostra: os 7 atributos allowlisted viram telemetry normalizada", () => {
  const cmd = command({ ignition: true, motion: false, odometer: 1000.4, totalDistance: 2500, hours: 7_200_000, power: 13.8, batteryLevel: 87 });
  assert.deepEqual(cmd.telemetry, {
    ignition: true,
    motion: false,
    odometerM: 1000,
    totalDistanceM: 2500,
    engineHoursS: 7200,
    powerMv: 13800,
    batteryLevelPct: 87,
  });
});

test("amostra: sem atributo allowlisted → telemetry ausente", () => {
  assert.equal(command({ distance: 3, rpm: 900, battery: 12.1, fuel: 40 }).telemetry, undefined);
  assert.equal(command({}).telemetry, undefined);
  assert.equal(command(undefined).telemetry, undefined);
});

test("amostra: atributos desconhecidos ignorados e chave reservada dentro de attributes não dá 422", () => {
  const cmd = command({ ignition: false, tenantId: "00000000-0000-0000-0000-000000000000", token: "x", rpm: 3000 });
  assert.deepEqual(cmd.telemetry, { ignition: false });
});

test("amostra: forma/faixa errada descarta só o atributo; a posição continua aceita", () => {
  const cmd = command({ ignition: "yes", batteryLevel: 150, odometer: -1, motion: true });
  assert.deepEqual(cmd.telemetry, { motion: true });
  assert.ok(cmd.externalEventKey.length === 64);
});

test("amostra: chave e digest da POSIÇÃO não mudam com attributes (C-15)", () => {
  const plain = command(undefined);
  const rich = command({ ignition: true, odometer: 99, power: 12 });
  assert.equal(rich.externalEventKey, plain.externalEventKey);
  assert.equal(rich.payloadDigest, plain.payloadDigest);
});

test("amostra: odômetro arredonda para metro inteiro e acima de 2^53−1 é descartado", () => {
  assert.equal(command({ odometer: 12345.6 }).telemetry?.odometerM, 12346);
  assert.equal(command({ odometer: 1e16 }).telemetry, undefined);
});

test("amostra: a fixture REAL position-osmand.json → {motion:true, totalDistanceM:0}", () => {
  const cmd = buildTraccarPositionCommand(parseTraccarPositionEnvelope(structuredClone(FIXTURE)), {
    instanceKey: INSTANCE,
    receivedAt: new Date(),
  });
  assert.deepEqual(cmd.telemetry, { motion: true, totalDistanceM: 0 });
});

test("amostra: unidades — hours ms→s e power V→mV", () => {
  const cmd = command({ hours: 3_600_000, power: 12.6 });
  assert.equal(cmd.telemetry?.engineHoursS, 3600);
  assert.equal(cmd.telemetry?.powerMv, 12600);
});

type Border = { readonly key: string; readonly value: unknown; readonly accepted: boolean; readonly column: string };

/** B9 — a tabela de borda GERADA da fonte única, coluna a coluna. */
function borderTable(): Border[] {
  const b = VEHICLE_TELEMETRY_BOUNDS;
  const rows: Border[] = [];
  const numeric: Array<[string, string, number, number, (raw: number) => number]> = [
    ["odometer", "odometerM", b.odometer.min, b.odometer.max, (raw) => raw],
    ["totalDistance", "totalDistanceM", b.totalDistance.min, b.totalDistance.max, (raw) => raw],
    ["hours", "engineHoursS", b.hours.min * 1000, b.hours.max * 1000, (raw) => raw],
    ["power", "powerMv", b.power.minV, b.power.maxV, (raw) => raw],
    ["batteryLevel", "batteryLevelPct", b.batteryLevel.min, b.batteryLevel.max, (raw) => raw],
  ];
  for (const [key, column, min, max] of numeric) {
    const step = key === "power" ? 0.001 : key === "hours" ? 1000 : 1;
    rows.push({ key, column, value: min - step, accepted: false });
    rows.push({ key, column, value: min, accepted: true });
    rows.push({ key, column, value: max, accepted: true });
    rows.push({ key, column, value: key === "power" ? max + step * 1.001 : max + step * (key === "odometer" || key === "totalDistance" ? 2 : 1), accepted: false });
    rows.push({ key, column, value: Number.NaN, accepted: false });
    rows.push({ key, column, value: Number.POSITIVE_INFINITY, accepted: false });
    rows.push({ key, column, value: "12", accepted: false });
    rows.push({ key, column, value: true, accepted: false });
  }
  for (const key of ["ignition", "motion"]) {
    rows.push({ key, column: key, value: true, accepted: true });
    rows.push({ key, column: key, value: false, accepted: true });
    rows.push({ key, column: key, value: 1, accepted: false });
    rows.push({ key, column: key, value: "true", accepted: false });
  }
  // As bordas que a crítica A-02 nomeou, explícitas.
  rows.push({ key: "power", column: "powerMv", value: -1, accepted: false });
  rows.push({ key: "power", column: "powerMv", value: 1000, accepted: true });
  rows.push({ key: "power", column: "powerMv", value: 1000.001, accepted: false });
  rows.push({ key: "power", column: "powerMv", value: 3_000_000, accepted: false });
  rows.push({ key: "hours", column: "engineHoursS", value: 1e25, accepted: false });
  return rows;
}

test("amostra: tabela de borda gerada da fonte única — o parser aceita exatamente o domínio da coluna", () => {
  assert.equal(MAX_SAFE_TELEMETRY_INTEGER, 9007199254740991);
  const table = borderTable();
  assert.ok(table.length >= 48, `a tabela gerada tem ${table.length} linhas`);
  for (const row of table) {
    const { sample } = normalizeVehicleTelemetry({ [row.key]: row.value });
    const got = sample?.[row.column as keyof typeof sample];
    if (row.accepted) {
      assert.notEqual(got, undefined, `${row.key}=${String(row.value)} deveria ser ACEITO`);
    } else {
      assert.equal(got, undefined, `${row.key}=${String(row.value)} deveria ser DESCARTADO (veio ${String(got)})`);
    }
  }
  // O que o parser aceita cabe na coluna: inteiro e dentro da faixa normalizada.
  const accepted = normalizeVehicleTelemetry({ power: 1000, odometer: MAX_SAFE_TELEMETRY_INTEGER, batteryLevel: 100 }).sample;
  assert.deepEqual(accepted, { powerMv: 1_000_000, odometerM: MAX_SAFE_TELEMETRY_INTEGER, batteryLevelPct: 100 });
});

test("amostra: bateria arredonda e SÓ DEPOIS limita a 0..100", () => {
  const level = (value: number) => normalizeVehicleTelemetry({ batteryLevel: value }).sample?.batteryLevelPct;
  assert.equal(level(99.6), 100);
  assert.equal(level(100.4), 100);
  assert.equal(level(100.6), undefined);
  assert.equal(level(-0.4), 0);
});

test("amostra: -0 vira 0, null é descartado e o resto da amostra sobrevive ao descarte de um atributo", () => {
  const { sample, discarded } = normalizeVehicleTelemetry({ odometer: -0, power: null, ignition: true, batteryLevel: Number.NaN });
  assert.ok(Object.is(sample?.odometerM, 0), "-0 normaliza para 0");
  assert.equal(sample?.powerMv, undefined);
  assert.equal(sample?.ignition, true);
  assert.equal(discarded, 2, "power:null e batteryLevel:NaN contados como descartados");
});
