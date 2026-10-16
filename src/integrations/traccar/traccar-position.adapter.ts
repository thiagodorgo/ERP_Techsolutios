// B-TRC-01 · envelope do Traccar → comando interno canônico (plano v2.1 §4.4, §8.2). Sem banco.
//
// Chave de identidade (P-01: no 6.16.0 o forward sai ANTES de a posição ganhar `id`, então `position.id` não serve):
//   external_event_key = SHA-256 hex de "v1|<instance_key>|<uniqueId>|<fixTime ms UTC>|<lat 7 casas>|<lon 7 casas>"
// Digest do conteúdo permitido (tudo que a allowlist lê, sem `serverTime` e sem `attributes`):
//   payload_digest = SHA-256 hex do JSON canônico (chaves ordenadas) de
//   uniqueId, traccarDeviceId, protocol, fixTime, deviceTime, valid, latitude/longitude (7 casas), speedKnots, course,
//   accuracy.
// Mesma identidade com velocidade, rumo, precisão ou validade diferentes é CONFLITO (409), não reenvio (§4.4).
// Velocidade: o Traccar manda em NÓS (`Position.java:267`); o ERP grava m/s = nós × 1852 / 3600.

import { createHash } from "node:crypto";

import type { ParsedTraccarPosition } from "./traccar-position.schema.js";

export type TraccarPositionCommand = {
  readonly instanceKey: string; // TRACCAR_INSTANCE_KEY, nunca do corpo
  readonly externalDeviceKey: string; // device.uniqueId
  readonly traccarDeviceId: string; // position.deviceId / device.id, só para reconciliação
  readonly externalEventKey: string;
  readonly payloadDigest: string;
  readonly fixedAt: Date;
  readonly deviceAt?: Date;
  readonly serverAt?: Date; // só para a métrica de atraso; fora da chave e do digest
  readonly receivedAt: Date; // relógio do ERP
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters?: number;
  readonly headingDegrees?: number;
  readonly speedMetersPerSecond?: number;
  readonly valid: boolean;
};

export type TraccarFixQuarantineReason = "invalid_fix" | "fix_in_future";

export const KNOT_TO_METERS_PER_SECOND = 1852 / 3600;
export const FIX_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function coordinate(value: number): string {
  return value.toFixed(7);
}

export function computeExternalEventKey(instanceKey: string, parsed: ParsedTraccarPosition): string {
  return sha256Hex(
    [
      "v1",
      instanceKey,
      parsed.uniqueId,
      String(parsed.fixTime.getTime()),
      coordinate(parsed.latitude),
      coordinate(parsed.longitude),
    ].join("|"),
  );
}

export function computePayloadDigest(parsed: ParsedTraccarPosition): string {
  const canonical: Record<string, string | number | boolean | null> = {
    accuracy: parsed.accuracy ?? null,
    course: parsed.course ?? null,
    deviceTime: parsed.deviceTime ? parsed.deviceTime.toISOString() : null,
    fixTime: parsed.fixTime.toISOString(),
    latitude: coordinate(parsed.latitude),
    longitude: coordinate(parsed.longitude),
    protocol: parsed.protocol ?? null,
    speedKnots: parsed.speedKnots ?? null,
    traccarDeviceId: parsed.traccarDeviceId,
    uniqueId: parsed.uniqueId,
    valid: parsed.valid,
  };
  const ordered = Object.keys(canonical)
    .sort()
    .map((key) => [key, canonical[key]] as const);
  return sha256Hex(JSON.stringify(Object.fromEntries(ordered)));
}

export function buildTraccarPositionCommand(
  parsed: ParsedTraccarPosition,
  context: { readonly instanceKey: string; readonly receivedAt: Date },
): TraccarPositionCommand {
  return {
    instanceKey: context.instanceKey,
    externalDeviceKey: parsed.uniqueId,
    traccarDeviceId: parsed.traccarDeviceId,
    externalEventKey: computeExternalEventKey(context.instanceKey, parsed),
    payloadDigest: computePayloadDigest(parsed),
    fixedAt: parsed.fixTime,
    deviceAt: parsed.deviceTime,
    serverAt: parsed.serverTime,
    receivedAt: context.receivedAt,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    accuracyMeters: parsed.accuracy,
    headingDegrees: parsed.course,
    speedMetersPerSecond:
      parsed.speedKnots === undefined ? undefined : parsed.speedKnots * KNOT_TO_METERS_PER_SECOND,
    valid: parsed.valid,
  };
}

// Fase 2, passo 3 (a parte que não depende do vínculo): fix sem GPS válido, ou além de agora + 5 min, não vai ao mapa.
export function fixQuarantineReason(command: TraccarPositionCommand, now: Date): TraccarFixQuarantineReason | null {
  if (!command.valid) return "invalid_fix";
  if (command.fixedAt.getTime() > now.getTime() + FIX_FUTURE_TOLERANCE_MS) return "fix_in_future";
  return null;
}
