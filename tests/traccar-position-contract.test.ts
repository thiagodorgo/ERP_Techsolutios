import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildTraccarPositionCommand,
  fixQuarantineReason,
  parseTraccarPositionEnvelope,
  TraccarPayloadError,
} from "../src/integrations/traccar/index.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · contrato do forward JSON do Traccar 6.16.0 (plano v2.1 §4.4, §8.2, §8.6; P-01, P-02, P-03, A2-10).
// A fixture é o corpo REAL capturado em dev (scripts/traccar-capture-fixture.mjs), com os valores pessoais trocados.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = JSON.parse(
  readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
) as { position: Record<string, unknown>; device: Record<string, unknown> };

const INSTANCE = "erp-dev";
const RECEIVED_AT = new Date("2026-10-11T21:00:00.000Z");

function fixture(): { position: Record<string, unknown>; device: Record<string, unknown> } {
  return structuredClone(FIXTURE);
}

function command(body: unknown) {
  return buildTraccarPositionCommand(parseTraccarPositionEnvelope(body), { instanceKey: INSTANCE, receivedAt: RECEIVED_AT });
}

function assert422(body: unknown, label: string): void {
  assert.throws(
    () => parseTraccarPositionEnvelope(body),
    (error: unknown) => error instanceof TraccarPayloadError && error.statusCode === 422 && error.code === "invalid_payload",
    label,
  );
}

test("contrato: a fixture 6.16.0 é {position, device} e vira o comando canônico", { timeout: 30_000 }, () => {
  const body = fixture();
  assert.deepEqual(Object.keys(body).sort(), ["device", "position"]);
  const cmd = command(body);
  assert.equal(cmd.instanceKey, INSTANCE);
  assert.equal(cmd.externalDeviceKey, "trcdemo01");
  assert.equal(cmd.traccarDeviceId, String(body.position.deviceId));
  assert.equal(cmd.fixedAt.toISOString(), new Date(String(body.position.fixTime)).toISOString());
  assert.equal(cmd.latitude, body.position.latitude);
  assert.equal(cmd.longitude, body.position.longitude);
  assert.equal(cmd.valid, true);
  assert.equal(cmd.receivedAt, RECEIVED_AT);
  assert.match(cmd.externalEventKey, /^[0-9a-f]{64}$/);
  assert.match(cmd.payloadDigest, /^[0-9a-f]{64}$/);
});

test("contrato: `position.id` ausente, 0 ou > 0 (primeira entrega × retry) gera a mesma chave e o mesmo digest", { timeout: 30_000 }, () => {
  const first = fixture();
  delete first.position.id;
  const zero = fixture();
  zero.position.id = 0;
  const retry = fixture();
  retry.position.id = 98765;
  const a = command(first);
  const b = command(zero);
  const c = command(retry);
  assert.equal(a.externalEventKey, b.externalEventKey);
  assert.equal(a.externalEventKey, c.externalEventKey);
  assert.equal(a.payloadDigest, b.payloadDigest);
  assert.equal(a.payloadDigest, c.payloadDigest);
});

test("contrato: `device.name`, `phone`, `contact` e `model` não chegam ao comando", { timeout: 30_000 }, () => {
  const body = fixture();
  body.device.name = "SENTINELA-NOME";
  body.device.phone = "SENTINELA-FONE";
  body.device.contact = "SENTINELA-CONTATO";
  body.device.model = "SENTINELA-MODELO";
  const serialized = JSON.stringify(command(body));
  for (const sentinel of ["SENTINELA-NOME", "SENTINELA-FONE", "SENTINELA-CONTATO", "SENTINELA-MODELO"]) {
    assert.ok(!serialized.includes(sentinel), `${sentinel} vazou para o comando`);
  }
  assert.equal(command(body).payloadDigest, command(fixture()).payloadDigest, "campos pessoais não entram no digest");
});

test("contrato: `attributes` é ignorado por inteiro (nem chave reservada lá dentro conta)", { timeout: 30_000 }, () => {
  const body = fixture();
  body.position.attributes = { tenantId: "00000000-0000-0000-0000-00000000000b", ignition: true, odometer: 99 };
  const cmd = command(body);
  assert.equal(cmd.externalEventKey, command(fixture()).externalEventKey);
  assert.equal(cmd.payloadDigest, command(fixture()).payloadDigest);
  assert.ok(!JSON.stringify(cmd).includes("00000000-0000-0000-0000-00000000000b"));
});

test("contrato: chave reservada no ENVELOPE dá 422", { timeout: 30_000 }, () => {
  for (const key of ["tenantId", "tenant_id", "token", "secret", "authorization", "path", "bucket", "storageKey"]) {
    const body = fixture() as Record<string, unknown>;
    body[key] = "x";
    assert422(body, `envelope.${key}`);
  }
});

test("contrato: chave reservada em `position` dá 422", { timeout: 30_000 }, () => {
  for (const key of ["tenantId", "tenant_id", "token", "secret", "Authorization", "path", "bucket", "storageKey"]) {
    const body = fixture();
    body.position[key] = "x";
    assert422(body, `position.${key}`);
  }
});

test("contrato: chave reservada em `device` dá 422", { timeout: 30_000 }, () => {
  for (const key of ["tenantId", "tenant_id", "TOKEN", "secret", "authorization", "path", "bucket", "storageKey"]) {
    const body = fixture();
    body.device[key] = "x";
    assert422(body, `device.${key}`);
  }
});

test("contrato: 10 nós viram 5,1444 m/s", { timeout: 30_000 }, () => {
  const body = fixture();
  body.position.speed = 10;
  const cmd = command(body);
  assert.ok(cmd.speedMetersPerSecond !== undefined);
  assert.ok(Math.abs(cmd.speedMetersPerSecond - 5.1444) < 0.0001, `veio ${cmd.speedMetersPerSecond}`);
});

test("contrato: mesma identidade → mesma chave; latitude diferente → outra chave", { timeout: 30_000 }, () => {
  assert.equal(command(fixture()).externalEventKey, command(fixture()).externalEventKey);
  const other = fixture();
  other.position.latitude = Number(other.position.latitude) + 0.0001;
  assert.notEqual(command(other).externalEventKey, command(fixture()).externalEventKey);
  const otherInstance = buildTraccarPositionCommand(parseTraccarPositionEnvelope(fixture()), {
    instanceKey: "erp-outra",
    receivedAt: RECEIVED_AT,
  });
  assert.notEqual(otherInstance.externalEventKey, command(fixture()).externalEventKey);
});

test("contrato: mesma identidade com velocidade diferente mantém a chave e muda o digest", { timeout: 30_000 }, () => {
  const base = command(fixture());
  const faster = fixture();
  faster.position.speed = Number(faster.position.speed ?? 0) + 7;
  const cmd = command(faster);
  assert.equal(cmd.externalEventKey, base.externalEventKey);
  assert.notEqual(cmd.payloadDigest, base.payloadDigest);
});

test("contrato: `serverTime` não muda nem a chave nem o digest", { timeout: 30_000 }, () => {
  const base = command(fixture());
  const later = fixture();
  later.position.serverTime = "2030-01-01T00:00:00.000+00:00";
  const cmd = command(later);
  assert.equal(cmd.externalEventKey, base.externalEventKey);
  assert.equal(cmd.payloadDigest, base.payloadDigest);
});

test("contrato: coordenada fora da faixa, data inválida ou `uniqueId` inválido dão 422", { timeout: 30_000 }, () => {
  const lat = fixture();
  lat.position.latitude = 90.0001;
  assert422(lat, "latitude > 90");
  const lon = fixture();
  lon.position.longitude = -180.5;
  assert422(lon, "longitude < -180");
  const nan = fixture();
  nan.position.latitude = "abc";
  assert422(nan, "latitude não numérica");
  const date = fixture();
  date.position.fixTime = "ontem";
  assert422(date, "fixTime inválido");
  const noZone = fixture();
  noZone.position.fixTime = "2026-10-11T20:17:03.000";
  assert422(noZone, "fixTime sem fuso");
  const unique = fixture();
  unique.device.uniqueId = "trc demo/01";
  assert422(unique, "uniqueId com espaço e barra");
  const missing = fixture();
  delete missing.device.uniqueId;
  assert422(missing, "uniqueId ausente");
  assert422([fixture()], "envelope em array");
  assert422({ position: fixture().position }, "sem device");
});

test("contrato: `fixTime` além de agora + 5 min dá `fix_in_future`; `valid=false` dá `invalid_fix`", { timeout: 30_000 }, () => {
  const now = new Date("2026-10-11T21:00:00.000Z");
  const future = fixture();
  future.position.fixTime = "2026-10-11T21:05:01.000+00:00";
  assert.equal(fixQuarantineReason(command(future), now), "fix_in_future");
  const edge = fixture();
  edge.position.fixTime = "2026-10-11T21:05:00.000+00:00";
  assert.equal(fixQuarantineReason(command(edge), now), null);
  const invalid = fixture();
  invalid.position.valid = false;
  assert.equal(fixQuarantineReason(command(invalid), now), "invalid_fix");
  assert.equal(fixQuarantineReason(command(fixture()), now), null);
});
