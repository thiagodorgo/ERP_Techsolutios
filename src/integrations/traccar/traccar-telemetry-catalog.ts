// B-TRC-02 · catálogo FECHADO dos eventos do Traccar 6.16.0 que o ERP conserva (plano v2 §6.2; Q3 = SIM). Única fonte.
//
// Tipos (`Event.java` da tag v6.16.0, l.42-72): status (online/sem sinal/offline), movimento, excesso de velocidade,
// ignição e alarme viram linha em `vehicle_telemetry_events`; `commandResult`, `queuedCommandSent`, `deviceInactive`,
// `deviceFuel*`, `geofence*`, `proximity*`, `unaccompaniedMotion`, `maintenance`, `driverChanged`, `media` e QUALQUER outro
// → `ignored` (204, nada gravado, contado na linha de log sem o `type` cru).
// Alarmes (`Position.java` da tag, l.116-153): os 38 `ALARM_*`, todos conservados. O que NOTIFICA é do B-TRC-05.

import type { VehicleTelemetryEventKind } from "../../modules/telemetry/vehicle-telemetry.types.js";

// Literal `as const` (e não `Object.freeze(...)`): o despacho por `type` fica ESTATICAMENTE enumerável pelo censo do 07c-a
// (tests/helpers/o6r07c-census.ts, T8 — "todo ponto de despacho por `type` resolve").
export const TRACCAR_EVENT_TYPE_TO_KIND = {
  deviceOnline: "device_online",
  deviceUnknown: "device_unknown",
  deviceOffline: "device_offline",
  deviceMoving: "device_moving",
  deviceStopped: "device_stopped",
  deviceOverspeed: "device_overspeed",
  ignitionOn: "ignition_on",
  ignitionOff: "ignition_off",
  alarm: "alarm",
} as const satisfies Readonly<Record<string, VehicleTelemetryEventKind>>;

/** Os tipos da tag que o bloco ignora de propósito (documentação e teste; o default de qualquer tipo fora é ignorar). */
export const TRACCAR_IGNORED_EVENT_TYPES = [
  "commandResult",
  "queuedCommandSent",
  "deviceInactive",
  "deviceFuelDrop",
  "deviceFuelIncrease",
  "geofenceEnter",
  "geofenceExit",
  "geofenceCrossed",
  "proximityEnter",
  "proximityExit",
  "unaccompaniedMotion",
  "maintenance",
  "driverChanged",
  "media",
] as const;

export const TRACCAR_ALARM_CODES = [
  "general",
  "sos",
  "vibration",
  "movement",
  "lowspeed",
  "overspeed",
  "fallDown",
  "lowPower",
  "lowBattery",
  "fault",
  "powerOff",
  "powerOn",
  "door",
  "lock",
  "unlock",
  "geofence",
  "geofenceEnter",
  "geofenceExit",
  "gpsAntennaCut",
  "accident",
  "tow",
  "idle",
  "highRpm",
  "hardAcceleration",
  "hardBraking",
  "hardCornering",
  "laneChange",
  "fatigueDriving",
  "powerCut",
  "powerRestored",
  "jamming",
  "temperature",
  "parking",
  "bonnet",
  "footBrake",
  "fuelLeak",
  "tampering",
  "removing",
] as const;

const ALARM_CODES: ReadonlySet<string> = new Set(TRACCAR_ALARM_CODES);

export type TraccarEventIgnoredReason = "unknown_type" | "unknown_alarm";

export type TraccarEventClassification =
  | { readonly kind: "keep"; readonly eventKind: VehicleTelemetryEventKind; readonly alarmCode?: string }
  | { readonly kind: "ignored"; readonly reason: TraccarEventIgnoredReason };

/** Tipo + código → o que o ERP guarda. Desconhecido nunca vira linha (falha fechada para "o que é isto?"). */
export function classifyTraccarEvent(type: string, alarm: string | undefined): TraccarEventClassification {
  const eventKind: VehicleTelemetryEventKind | undefined = Object.prototype.hasOwnProperty.call(TRACCAR_EVENT_TYPE_TO_KIND, type)
    ? TRACCAR_EVENT_TYPE_TO_KIND[type as keyof typeof TRACCAR_EVENT_TYPE_TO_KIND]
    : undefined;
  if (eventKind === undefined) {
    return { kind: "ignored", reason: "unknown_type" };
  }
  if (eventKind === "alarm") {
    return alarm !== undefined && ALARM_CODES.has(alarm)
      ? { kind: "keep", eventKind, alarmCode: alarm }
      : { kind: "ignored", reason: "unknown_alarm" };
  }
  return { kind: "keep", eventKind };
}
