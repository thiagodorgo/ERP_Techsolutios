// B-TRC-02 · parser ESTRITO do `event.forward` JSON do Traccar 6.16.0 (plano v2 §5.2; S-E1, S-E5). Reusa a régua do
// parser de posição (`TraccarPayloadError`, chaves reservadas, data ISO com fuso, ids inteiros).
//
// O corpo é `{event, position?, device, geofence?, maintenance?}`. A allowlist lê só:
//   event:    id (aceito ausente, 0 ou > 0; fora da chave e do digest; guardado como `traccar_event_id`), type
//             (`^[A-Za-z]{1,32}$`), eventTime (ISO com fuso), deviceId (= device.id quando os dois existem), positionId
//             (≥ 0, opcional) e `attributes.alarm` (string, só com type = "alarm");
//   device:   id e uniqueId;
//   position: latitude, longitude e fixTime — lidos SÓ para a chave e o digest (§6.5); nunca viram campo do comando nem do
//             banco. Coordenada ausente ou inválida = posição sem coordenada (o evento continua aceito).
// `geofence` e `maintenance` são ignorados. Chave reservada no envelope, em `event`, em `device` ou em `position` → 422; dentro
// de `attributes` não se procura (regra do B-TRC-01) e nada de lá influencia a organização.

import {
  assertNoReservedKeys,
  isObject,
  isoDate,
  positiveInteger,
  present,
  TraccarPayloadError,
  UNIQUE_ID_PATTERN,
} from "./traccar-position.schema.js";

const EVENT_TYPE_PATTERN = /^[A-Za-z]{1,32}$/;

export type ParsedTraccarEventPosition = {
  /** `undefined` quando ausente ou inválida (fora de faixa, não finita). */
  readonly latitude?: number;
  readonly longitude?: number;
  readonly fixTime?: Date;
};

export type ParsedTraccarEvent = {
  readonly uniqueId: string;
  readonly traccarDeviceId: string;
  readonly traccarEventId?: string;
  readonly traccarPositionId?: string;
  readonly type: string;
  readonly eventTime: Date;
  /** Só com type = "alarm" (o código cru; o catálogo decide se é conhecido). */
  readonly alarm?: string;
  readonly position?: ParsedTraccarEventPosition;
};

function optionalNonNegativeId(value: unknown, reason: "event_id_invalid" | "position_id_invalid"): string | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TraccarPayloadError(reason);
  }
  return value > 0 ? String(value) : undefined;
}

function coordinateOrUndefined(value: unknown, limit: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= -limit && value <= limit ? value : undefined;
}

function readPosition(position: Record<string, unknown>): ParsedTraccarEventPosition {
  const latitude = coordinateOrUndefined(position.latitude, 90);
  const longitude = coordinateOrUndefined(position.longitude, 180);
  let fixTime: Date | undefined;
  try {
    fixTime = present(position.fixTime) ? isoDate(position.fixTime) : undefined;
  } catch {
    fixTime = undefined;
  }
  // Uma coordenada só vale com a outra: meia coordenada é coordenada ausente.
  return latitude !== undefined && longitude !== undefined ? { latitude, longitude, fixTime } : { fixTime };
}

export function parseTraccarEventEnvelope(body: unknown): ParsedTraccarEvent {
  if (!isObject(body)) throw new TraccarPayloadError("envelope_not_object");
  assertNoReservedKeys(body);

  const event = body.event;
  const device = body.device;
  if (!isObject(event)) throw new TraccarPayloadError("event_missing");
  if (!isObject(device)) throw new TraccarPayloadError("device_missing");
  assertNoReservedKeys(event);
  assertNoReservedKeys(device);
  const position = isObject(body.position) ? body.position : undefined;
  if (position) assertNoReservedKeys(position);

  const traccarEventId = optionalNonNegativeId(event.id, "event_id_invalid");
  const traccarPositionId = optionalNonNegativeId(event.positionId, "position_id_invalid");

  const uniqueId = device.uniqueId;
  if (typeof uniqueId !== "string" || !UNIQUE_ID_PATTERN.test(uniqueId)) {
    throw new TraccarPayloadError("unique_id_invalid");
  }

  const eventDeviceId = positiveInteger(event.deviceId);
  const deviceId = positiveInteger(device.id);
  if (eventDeviceId !== undefined && deviceId !== undefined && eventDeviceId !== deviceId) {
    throw new TraccarPayloadError("device_id_mismatch");
  }
  const traccarDeviceId = eventDeviceId ?? deviceId;
  if (traccarDeviceId === undefined) throw new TraccarPayloadError("device_id_invalid");

  const type = event.type;
  if (typeof type !== "string" || !EVENT_TYPE_PATTERN.test(type)) throw new TraccarPayloadError("type_invalid");

  let alarm: string | undefined;
  if (type === "alarm") {
    const attributes = isObject(event.attributes) ? event.attributes : {};
    if (typeof attributes.alarm !== "string" || attributes.alarm.length === 0) {
      throw new TraccarPayloadError("alarm_missing");
    }
    alarm = attributes.alarm;
  }

  return {
    uniqueId,
    traccarDeviceId: String(traccarDeviceId),
    traccarEventId,
    traccarPositionId,
    type,
    eventTime: isoDate(event.eventTime),
    alarm,
    position: position ? readPosition(position) : undefined,
  };
}
