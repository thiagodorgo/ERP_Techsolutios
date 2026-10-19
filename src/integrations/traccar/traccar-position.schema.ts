// B-TRC-01 · parser ESTRITO do forward JSON do Traccar 6.16.0 (plano v2.1 §8.2; P-01, P-02, P-03, A2-10).
//
// O corpo é `{position, device}` (`PositionData.java:23-35`). A allowlist lê só:
//   position: id (aceito ausente, 0 ou > 0 e IGNORADO), deviceId, protocol, fixTime, deviceTime, serverTime (só
//             métrica), valid, latitude, longitude, speed (nós), course, accuracy;
//   device:   id e uniqueId.
// Todo o resto — device.name/phone/contact/model/attributes, position.attributes/network/address/geofenceIds — é
// ignorado e NUNCA lido para o domínio. Chave reservada (tenantId, tenant_id, token, secret, authorization, path,
// bucket, storageKey) no envelope, em `position` ou em `device` dá 422 — a organização NUNCA vem do payload. Dentro
// de `attributes` não se procura: o objeto é ignorado por inteiro.

export const TRACCAR_RESERVED_KEYS = [
  "tenantid",
  "tenant_id",
  "token",
  "secret",
  "authorization",
  "path",
  "bucket",
  "storagekey",
] as const;

const RESERVED = new Set<string>(TRACCAR_RESERVED_KEYS);
const UNIQUE_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;
const PROTOCOL_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export type TraccarPayloadErrorReason =
  | "envelope_not_object"
  | "reserved_key"
  | "position_missing"
  | "device_missing"
  | "unique_id_invalid"
  | "device_id_invalid"
  | "device_id_mismatch"
  | "position_id_invalid"
  | "coordinate_invalid"
  | "date_invalid"
  | "valid_missing"
  | "number_invalid"
  | "protocol_invalid";

// A resposta pública é SEMPRE `{"error":{"code":"invalid_payload"}}`: o motivo (`reason`) fica só no processo,
// para teste e métrica — nunca no corpo da resposta nem no log com o payload.
export class TraccarPayloadError extends Error {
  readonly statusCode = 422;
  readonly code = "invalid_payload";

  constructor(readonly reason: TraccarPayloadErrorReason) {
    super(`traccar payload rejected: ${reason}`);
    this.name = "TraccarPayloadError";
  }
}

export type ParsedTraccarPosition = {
  readonly uniqueId: string;
  readonly traccarDeviceId: string;
  readonly protocol?: string;
  readonly fixTime: Date;
  readonly deviceTime?: Date;
  readonly serverTime?: Date;
  readonly valid: boolean;
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKnots?: number;
  readonly course?: number;
  readonly accuracy?: number;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoReservedKeys(object: JsonObject): void {
  for (const key of Object.keys(object)) {
    if (RESERVED.has(key.toLowerCase())) {
      throw new TraccarPayloadError("reserved_key");
    }
  }
}

function present(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function finiteNumber(value: unknown, reason: TraccarPayloadErrorReason): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TraccarPayloadError(reason);
  }
  return value;
}

function optionalNonNegative(value: unknown): number | undefined {
  if (!present(value)) return undefined;
  const parsed = finiteNumber(value, "number_invalid");
  if (parsed < 0) throw new TraccarPayloadError("number_invalid");
  return parsed;
}

function optionalCourse(value: unknown): number | undefined {
  if (!present(value)) return undefined;
  const parsed = finiteNumber(value, "number_invalid");
  if (parsed < 0 || parsed > 360) throw new TraccarPayloadError("number_invalid");
  return parsed;
}

function isoDate(value: unknown): Date {
  if (typeof value !== "string" || !ISO_WITH_ZONE.test(value)) {
    throw new TraccarPayloadError("date_invalid");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TraccarPayloadError("date_invalid");
  return parsed;
}

function optionalIsoDate(value: unknown): Date | undefined {
  return present(value) ? isoDate(value) : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TraccarPayloadError("device_id_invalid");
  }
  return value;
}

export function parseTraccarPositionEnvelope(body: unknown): ParsedTraccarPosition {
  if (!isObject(body)) throw new TraccarPayloadError("envelope_not_object");
  assertNoReservedKeys(body);

  const position = body.position;
  const device = body.device;
  if (!isObject(position)) throw new TraccarPayloadError("position_missing");
  if (!isObject(device)) throw new TraccarPayloadError("device_missing");
  assertNoReservedKeys(position);
  assertNoReservedKeys(device);

  // A2-10 — `position.id` é aceito ausente, 0 ou > 0 e IGNORADO (não entra na chave nem no digest).
  if (present(position.id)) {
    const id = position.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) {
      throw new TraccarPayloadError("position_id_invalid");
    }
  }

  const uniqueId = device.uniqueId;
  if (typeof uniqueId !== "string" || !UNIQUE_ID_PATTERN.test(uniqueId)) {
    throw new TraccarPayloadError("unique_id_invalid");
  }

  const positionDeviceId = positiveInteger(position.deviceId);
  const deviceId = positiveInteger(device.id);
  if (positionDeviceId !== undefined && deviceId !== undefined && positionDeviceId !== deviceId) {
    throw new TraccarPayloadError("device_id_mismatch");
  }
  const traccarDeviceId = positionDeviceId ?? deviceId;
  if (traccarDeviceId === undefined) throw new TraccarPayloadError("device_id_invalid");

  let protocol: string | undefined;
  if (present(position.protocol)) {
    if (typeof position.protocol !== "string" || !PROTOCOL_PATTERN.test(position.protocol)) {
      throw new TraccarPayloadError("protocol_invalid");
    }
    protocol = position.protocol;
  }

  const latitude = finiteNumber(position.latitude, "coordinate_invalid");
  const longitude = finiteNumber(position.longitude, "coordinate_invalid");
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new TraccarPayloadError("coordinate_invalid");
  }

  if (typeof position.valid !== "boolean") throw new TraccarPayloadError("valid_missing");

  return {
    uniqueId,
    traccarDeviceId: String(traccarDeviceId),
    protocol,
    fixTime: isoDate(position.fixTime),
    deviceTime: optionalIsoDate(position.deviceTime),
    serverTime: optionalIsoDate(position.serverTime),
    valid: position.valid,
    latitude,
    longitude,
    speedKnots: optionalNonNegative(position.speed),
    course: optionalCourse(position.course),
    accuracy: optionalNonNegative(position.accuracy),
  };
}
