// B-TRC-02 · envelope de EVENTO do Traccar → comando interno canônico (plano v2 §5.2, §6.5; emenda v2.1). Sem banco.
//
// Chave de identidade (A-07; nunca `event.id`, `positionId`, `position.id` nem `receivedAt`):
//   external_event_key = SHA-256 hex de "v1|<instance_key>|<uniqueId>|<type>|<eventTime ms UTC>|<alarm ou vazio>|<lat7 ou vazio>|<lon7 ou vazio>"
//   com lat7/lon7 = a coordenada da posição ANEXADA em 7 casas (a mesma `coordinate()` da posição) quando ela existe e é
//   válida; vazias nos eventos de status. Só colidem dois eventos de conteúdo idêntico (mesmo dispositivo, tipo, ms, alarme e
//   ponto) — e esses são a mesma entrega: `duplicate` por desenho, declarado.
// Digest: SHA-256 hex do JSON canônico (chaves ordenadas) de {type, eventTime, uniqueId, traccarDeviceId, alarm, latitude,
//   longitude, positionFixTime} — `null` onde ausente; sem ids. Mesma chave com digest diferente = 409.
// Tipo ou código fora do catálogo (`traccar-telemetry-catalog.ts`) → `ignored`: nada é gravado.

import { createHash } from "node:crypto";

import type { VehicleTelemetryEventKind, VehicleTelemetrySource } from "../../modules/telemetry/vehicle-telemetry.types.js";
import type { ParsedTraccarEvent } from "./traccar-event.schema.js";
import { coordinate, FIX_FUTURE_TOLERANCE_MS } from "./traccar-position.adapter.js";
import { classifyTraccarEvent, type TraccarEventIgnoredReason } from "./traccar-telemetry-catalog.js";

export type TraccarEventCommand = {
  readonly messageKind: "event";
  readonly instanceKey: string; // TRACCAR_INSTANCE_KEY, nunca do corpo
  readonly externalDeviceKey: string; // device.uniqueId
  readonly traccarDeviceId: string;
  readonly traccarEventId?: string; // só para reconciliação; fora da chave e do digest
  readonly traccarPositionId?: string;
  readonly externalEventKey: string;
  readonly payloadDigest: string;
  readonly kind: VehicleTelemetryEventKind;
  readonly alarmCode?: string;
  readonly occurredAt: Date; // event.eventTime
  readonly receivedAt: Date; // relógio do ERP
  readonly source: VehicleTelemetrySource;
  /** Reservado ao B-TRC-03 (reconciliação): o forward NUNCA traz dica de organização — a organização nasce do vínculo. */
  readonly hintTenantId?: string;
};

export type TraccarEventBuildResult =
  | { readonly kind: "command"; readonly command: TraccarEventCommand }
  | { readonly kind: "ignored"; readonly reason: TraccarEventIgnoredReason };

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export type TraccarEventKeyInput = {
  readonly uniqueId: string;
  readonly type: string;
  readonly eventTimeMs: number;
  readonly alarm?: string;
  readonly latitude?: number;
  readonly longitude?: number;
};

const validCoordinates = (latitude: number | undefined, longitude: number | undefined): boolean =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

/** Função pura e determinística (o B-TRC-03 a reusa na reconciliação — H-11). */
export function computeTraccarEventKey(instanceKey: string, input: TraccarEventKeyInput): string {
  const hasPoint = validCoordinates(input.latitude, input.longitude);
  const lat7 = hasPoint ? coordinate(input.latitude!) : "";
  const lon7 = hasPoint ? coordinate(input.longitude!) : "";
  const parts = ["v1", instanceKey, input.uniqueId, input.type, String(input.eventTimeMs), input.alarm ?? "", lat7, lon7].join("|");
  return sha256Hex(parts);
}

export function computeTraccarEventDigest(parsed: ParsedTraccarEvent): string {
  const point = parsed.position;
  const hasPoint = validCoordinates(point?.latitude, point?.longitude);
  const canonical: Record<string, string | null> = {
    alarm: parsed.alarm ?? null,
    eventTime: parsed.eventTime.toISOString(),
    latitude: hasPoint ? coordinate(point!.latitude!) : null,
    longitude: hasPoint ? coordinate(point!.longitude!) : null,
    positionFixTime: point?.fixTime ? point.fixTime.toISOString() : null,
    traccarDeviceId: parsed.traccarDeviceId,
    type: parsed.type,
    uniqueId: parsed.uniqueId,
  };
  const ordered = Object.keys(canonical)
    .sort()
    .map((key) => [key, canonical[key]] as const);
  return sha256Hex(JSON.stringify(Object.fromEntries(ordered)));
}

export function buildTraccarEventCommand(
  parsed: ParsedTraccarEvent,
  context: { readonly instanceKey: string; readonly receivedAt: Date; readonly source?: VehicleTelemetrySource },
): TraccarEventBuildResult {
  const classification = classifyTraccarEvent(parsed.type, parsed.alarm);
  if (classification.kind === "ignored") return { kind: "ignored", reason: classification.reason };
  return {
    kind: "command",
    command: {
      messageKind: "event",
      instanceKey: context.instanceKey,
      externalDeviceKey: parsed.uniqueId,
      traccarDeviceId: parsed.traccarDeviceId,
      traccarEventId: parsed.traccarEventId,
      traccarPositionId: parsed.traccarPositionId,
      externalEventKey: computeTraccarEventKey(context.instanceKey, {
        uniqueId: parsed.uniqueId,
        type: parsed.type,
        eventTimeMs: parsed.eventTime.getTime(),
        alarm: parsed.alarm,
        latitude: parsed.position?.latitude,
        longitude: parsed.position?.longitude,
      }),
      payloadDigest: computeTraccarEventDigest(parsed),
      kind: classification.eventKind,
      alarmCode: classification.alarmCode,
      occurredAt: parsed.eventTime,
      receivedAt: context.receivedAt,
      source: context.source ?? "forward",
      hintTenantId: undefined,
    },
  };
}

export function isTraccarEventCommand(command: { readonly messageKind?: string }): command is TraccarEventCommand {
  return command.messageKind === "event";
}

/** Fase 2, passo 3 do evento (a parte que não depende do vínculo): instante além de agora + 5 min não vale. */
export function eventQuarantineReason(command: TraccarEventCommand, now: Date): "fix_in_future" | null {
  return command.occurredAt.getTime() > now.getTime() + FIX_FUTURE_TOLERANCE_MS ? "fix_in_future" : null;
}
