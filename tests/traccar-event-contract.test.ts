import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildTraccarEventCommand,
  computeTraccarEventKey,
  eventQuarantineReason,
  type TraccarEventCommand,
} from "../src/integrations/traccar/traccar-event.adapter.js";
import { parseTraccarEventEnvelope } from "../src/integrations/traccar/traccar-event.schema.js";
import { TRACCAR_ALARM_CODES, TRACCAR_IGNORED_EVENT_TYPES } from "../src/integrations/traccar/traccar-telemetry-catalog.js";
import { TraccarPayloadError } from "../src/integrations/traccar/traccar-position.schema.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte A — contrato do `event.forward` do Traccar 6.16.0 (plano v2 §5.2, §6.2, §6.5; A-07). Sem banco.
// As fixtures são as REAIS capturadas no passo 3 (a `offline` é sintética e diz isso no próprio arquivo).
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0");
const INSTANCE = "erp-test";
const RECEIVED_AT = new Date("2026-10-19T12:00:00Z");

type Body = Record<string, unknown> & {
  event: Record<string, unknown> & { attributes?: Record<string, unknown> };
  device: Record<string, unknown>;
  position?: Record<string, unknown>;
};
const fixture = (name: string): Body => JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as Body;

function build(body: unknown) {
  return buildTraccarEventCommand(parseTraccarEventEnvelope(body), { instanceKey: INSTANCE, receivedAt: RECEIVED_AT });
}
function commandOf(body: unknown): TraccarEventCommand {
  const result = build(body);
  assert.equal(result.kind, "command", `esperava comando, veio ${JSON.stringify(result)}`);
  return (result as { kind: "command"; command: TraccarEventCommand }).command;
}
function rejects(body: unknown, reason?: string) {
  assert.throws(
    () => parseTraccarEventEnvelope(body),
    (error: unknown) => error instanceof TraccarPayloadError && error.statusCode === 422 && (reason === undefined || error.reason === reason),
  );
}

test("evento: a fixture REAL ignitionOn vira o comando canônico (kind, instante, chave de 64 hex)", () => {
  const body = fixture("event-ignition-on.json");
  const cmd = commandOf(body);
  assert.equal(cmd.kind, "ignition_on");
  assert.equal(cmd.alarmCode, undefined);
  assert.equal(cmd.occurredAt.toISOString(), new Date(String(body.event.eventTime)).toISOString());
  assert.match(cmd.externalEventKey, /^[0-9a-f]{64}$/);
  assert.match(cmd.payloadDigest, /^[0-9a-f]{64}$/);
  assert.equal(cmd.externalDeviceKey, "trcdemo01");
  assert.equal(cmd.source, "forward");
  assert.equal(cmd.traccarEventId, "2");
  assert.equal(cmd.traccarPositionId, "2");
});

test("evento: position é opcional — a fixture REAL deviceOnline (sem position) é aceita", () => {
  const body = fixture("event-device-online.json");
  assert.equal(body.position, undefined);
  assert.equal(commandOf(body).kind, "device_online");
});

test("evento: event.id ausente, 0 ou > 0 → mesma chave e mesmo digest", () => {
  const base = fixture("event-ignition-on.json");
  const variants = [undefined, 0, 2, 987654321].map((id) => {
    const body = structuredClone(base);
    if (id === undefined) delete body.event.id;
    else body.event.id = id;
    return commandOf(body);
  });
  for (const cmd of variants) {
    assert.equal(cmd.externalEventKey, variants[0]!.externalEventKey);
    assert.equal(cmd.payloadDigest, variants[0]!.payloadDigest);
  }
});

test("evento: positionId e position.id ficam fora da chave e do digest", () => {
  const base = fixture("event-alarm-sos.json");
  const other = structuredClone(base);
  other.event.positionId = 99;
  other.position!.id = 99;
  assert.equal(commandOf(other).externalEventKey, commandOf(base).externalEventKey);
  assert.equal(commandOf(other).payloadDigest, commandOf(base).payloadDigest);
});

test("evento: tipo fora do catálogo → ignored (geofenceEnter, commandResult, inventado)", () => {
  assert.equal(TRACCAR_IGNORED_EVENT_TYPES.length, 14, "os 14 tipos da tag que o bloco ignora");
  for (const type of ["geofenceEnter", "commandResult", "tipoInventado", ...TRACCAR_IGNORED_EVENT_TYPES]) {
    const body = fixture("event-device-online.json");
    body.event.type = type;
    assert.deepEqual(build(body), { kind: "ignored", reason: "unknown_type" }, type);
  }
});

test("evento: alarme do catálogo → alarmCode; fora → ignored; sem attributes.alarm → 422", () => {
  assert.equal(TRACCAR_ALARM_CODES.length, 38, "os 38 ALARM_* de Position.java:116-153 (Q3 = SIM)");
  for (const code of TRACCAR_ALARM_CODES) {
    const body = fixture("event-alarm-sos.json");
    body.event.attributes = { alarm: code };
    const cmd = commandOf(body);
    assert.equal(cmd.kind, "alarm");
    assert.equal(cmd.alarmCode, code);
  }
  for (const code of ["naoExiste", "sos,powerCut", ""]) {
    const body = fixture("event-alarm-sos.json");
    body.event.attributes = { alarm: code };
    if (code === "") rejects(body, "alarm_missing");
    else assert.deepEqual(build(body), { kind: "ignored", reason: "unknown_alarm" }, code);
  }
  const missing = fixture("event-alarm-sos.json");
  missing.event.attributes = {};
  rejects(missing, "alarm_missing");
});

const RESERVED = ["tenantId", "tenant_id", "token", "secret", "authorization", "path", "bucket", "storageKey"];

test("evento: chave reservada no envelope, em event, em device ou em position → 422", () => {
  for (const key of RESERVED) {
    for (const level of ["envelope", "event", "device", "position"] as const) {
      const body = fixture("event-ignition-on.json");
      const target = level === "envelope" ? body : (body[level] as Record<string, unknown>);
      target[key] = "00000000-0000-0000-0000-000000000000";
      rejects(body, "reserved_key");
    }
  }
});

test("evento: chave reservada DENTRO de event.attributes ou position.attributes não dá 422", () => {
  const body = fixture("event-ignition-on.json");
  body.event.attributes = { tenantId: "x", token: "y" };
  (body.position!.attributes as Record<string, unknown>).tenantId = "z";
  assert.equal(commandOf(body).kind, "ignition_on");
});

test("evento: dado pessoal, coordenada, geofence e maintenance não chegam ao comando (só hashes)", () => {
  const body = fixture("event-ignition-on.json");
  body.device.name = "SENTINELA-NOME";
  body.device.phone = "SENTINELA-FONE";
  body.device.contact = "SENTINELA-CONTATO";
  body.device.model = "SENTINELA-MODELO";
  body.geofence = { name: "SENTINELA-CERCA" };
  body.maintenance = { name: "SENTINELA-MANUTENCAO" };
  body.position!.latitude = -23.5512345;
  const cmd = commandOf(body);
  const text = JSON.stringify(cmd);
  for (const sentinel of ["SENTINELA", "-23.5512345", "-23.551234"]) assert.ok(!text.includes(sentinel), sentinel);
  assert.ok(!("latitude" in cmd) && !("longitude" in cmd), "o comando de evento não carrega coordenada como campo");
});

test("evento: deviceId ≠ device.id, uniqueId inválido, eventTime sem fuso e type fora do padrão → 422", () => {
  const mismatch = fixture("event-ignition-on.json");
  mismatch.event.deviceId = 7;
  rejects(mismatch, "device_id_mismatch");
  const unique = fixture("event-ignition-on.json");
  unique.device.uniqueId = "com espaço";
  rejects(unique, "unique_id_invalid");
  const zone = fixture("event-ignition-on.json");
  zone.event.eventTime = "2026-10-19T10:34:05";
  rejects(zone, "date_invalid");
  for (const type of ["ignition-on", "x".repeat(33), "", 42]) {
    const body = fixture("event-ignition-on.json");
    body.event.type = type;
    rejects(body, "type_invalid");
  }
  const noEvent = fixture("event-ignition-on.json");
  delete (noEvent as Record<string, unknown>).event;
  rejects(noEvent, "event_missing");
});

test("evento: eventTime diferente → chave diferente; mesmo instante com alarme diferente → chave diferente", () => {
  const a = fixture("event-ignition-on.json");
  const b = structuredClone(a);
  b.event.eventTime = "2026-10-19T10:34:05.001+00:00";
  assert.notEqual(commandOf(a).externalEventKey, commandOf(b).externalEventKey);
  const sos = fixture("event-alarm-sos.json");
  const cut = structuredClone(sos);
  cut.event.attributes = { alarm: "powerCut" };
  assert.notEqual(commandOf(sos).externalEventKey, commandOf(cut).externalEventKey);
});

test("evento: digest = SHA-256 do JSON canônico de chaves ordenadas, sem ids", () => {
  const body = fixture("event-alarm-sos.json");
  const canonical = {
    alarm: "sos",
    eventTime: new Date(String(body.event.eventTime)).toISOString(),
    latitude: Number(body.position!.latitude).toFixed(7),
    longitude: Number(body.position!.longitude).toFixed(7),
    positionFixTime: new Date(String(body.position!.fixTime)).toISOString(),
    traccarDeviceId: "1",
    type: "alarm",
    uniqueId: "trcdemo01",
  };
  const expected = createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
  assert.equal(commandOf(body).payloadDigest, expected);
});

test("evento: deviceOnline, deviceUnknown e deviceOffline (sintética) → device_online/unknown/offline", () => {
  assert.equal(commandOf(fixture("event-device-online.json")).kind, "device_online");
  assert.equal(commandOf(fixture("event-device-unknown.json")).kind, "device_unknown");
  const offline = fixture("event-device-offline.json");
  assert.match(String(offline._sintetica), /SINTÉTICA/);
  assert.equal(commandOf(offline).kind, "device_offline");
});

test("evento: eventTime além de agora + 5 min → fix_in_future; dentro → nenhum motivo", () => {
  const body = fixture("event-ignition-on.json");
  const cmd = commandOf(body);
  assert.equal(eventQuarantineReason(cmd, new Date(cmd.occurredAt.getTime() - 6 * 60_000)), "fix_in_future");
  assert.equal(eventQuarantineReason(cmd, new Date(cmd.occurredAt.getTime() - 4 * 60_000)), null);
});

test("evento: dois ignitionOn no MESMO ms com coordenadas diferentes → chaves diferentes (relógio travado, A-07)", () => {
  const a = fixture("event-ignition-on.json");
  const b = structuredClone(a);
  b.position!.latitude = Number(a.position!.latitude) + 0.001;
  assert.equal(a.event.eventTime, b.event.eventTime);
  assert.notEqual(commandOf(a).externalEventKey, commandOf(b).externalEventKey);
});

test("evento: dois ignitionOn idênticos (mesmo ms, mesmo ponto) → mesma chave e mesmo digest (duplicata por conteúdo)", () => {
  const a = fixture("event-ignition-on.json");
  const b = structuredClone(a);
  b.event.id = 777;
  b.position!.id = 778;
  assert.equal(commandOf(a).externalEventKey, commandOf(b).externalEventKey);
  assert.equal(commandOf(a).payloadDigest, commandOf(b).payloadDigest);
});

test("evento: sem position (status) → componentes de coordenada vazios; coordenada inválida → tratada como ausente", () => {
  const online = fixture("event-device-online.json");
  const cmd = commandOf(online);
  const expected = computeTraccarEventKey(INSTANCE, {
    uniqueId: "trcdemo01",
    type: "deviceOnline",
    eventTimeMs: new Date(String(online.event.eventTime)).getTime(),
  });
  assert.equal(cmd.externalEventKey, expected);
  const manual = createHash("sha256")
    .update(["v1", INSTANCE, "trcdemo01", "deviceOnline", String(new Date(String(online.event.eventTime)).getTime()), "", "", ""].join("|"), "utf8")
    .digest("hex");
  assert.equal(expected, manual, "a chave é a do §6.5, com os três componentes finais vazios");
  for (const latitude of [Number.NaN, 200]) {
    const body = fixture("event-ignition-on.json");
    body.position!.latitude = latitude;
    const ignition = commandOf(body);
    const noPosition = computeTraccarEventKey(INSTANCE, {
      uniqueId: "trcdemo01",
      type: "ignitionOn",
      eventTimeMs: new Date(String(body.event.eventTime)).getTime(),
    });
    assert.equal(ignition.externalEventKey, noPosition, `latitude ${latitude} → tratada como ausente`);
  }
});
