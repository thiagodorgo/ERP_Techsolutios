import type { TelemetryEvent } from "./telemetry.types.js";

// Ω4C PR-12 §2.8 — allowlists ESTRITAS de projeção (LGPD, crítico da fatia). A coordenada crua SÓ aparece
// no TrackView (Rastreamento), gated forte por telemetry:read; NENHUMA outra view carrega lat/lng, IP,
// tenant_id, operator_profile_id externo, client_action_id, sdk_int cru nem device fingerprint.

const SAO_PAULO_TZ = "America/Sao_Paulo";

// {professionalLabel, day, kmTotal, pointsUsed} — SEM coord crua. kmTotal = 1 casa (Decimal(10,1)).
export type TelemetryKmView = {
  readonly professionalLabel: string;
  readonly day: string;
  readonly kmTotal: number;
  readonly pointsUsed: number;
};

// {capturedAt, lat, lng, accuracyM} — coord crua SÓ aqui. Proibido tenant_id/profile/client_action_id/IP/device.
export type TrackView = {
  readonly capturedAt: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number | null;
};

// {id, when(dd/mm HH:mm SP), professionalLabel, workOrderRef?, reason} — SEM coord/IP/tenant_id.
export type RefusalView = {
  readonly id: string;
  readonly when: string;
  readonly professionalLabel: string;
  readonly workOrderRef: string | null;
  readonly reason: string | null;
};

// {professionalLabel, event(conectou/desconectou), when} — SEM coord/IP.
export type AccessView = {
  readonly professionalLabel: string;
  readonly event: string;
  readonly when: string;
};

// {professionalLabel, deviceLabel(modelo grosseiro), appVersion, lastSeenAt} — SEM sdk_int cru/IP/tenant_id.
export type DeviceView = {
  readonly professionalLabel: string;
  readonly deviceLabel: string;
  readonly appVersion: string | null;
  readonly lastSeenAt: string;
};

export function toTrackView(event: TelemetryEvent): TrackView {
  return {
    capturedAt: event.capturedAt.toISOString(),
    // O caminho só chega aqui para heartbeat consentido (lat/lng presentes); o ?? 0 é defensivo.
    lat: event.lat ?? 0,
    lng: event.lng ?? 0,
    accuracyM: event.accuracyM ?? null,
  };
}

export function toRefusalView(event: TelemetryEvent, professionalLabel: string): RefusalView {
  return {
    id: event.id,
    when: formatSaoPauloDateTime(event.capturedAt),
    professionalLabel,
    workOrderRef: event.workOrderId ?? null,
    reason: event.refusalReason ?? null,
  };
}

export function toAccessView(event: TelemetryEvent, professionalLabel: string): AccessView {
  return {
    professionalLabel,
    event: event.eventType === "app_connect" ? "conectou" : "desconectou",
    when: formatSaoPauloDateTime(event.capturedAt),
  };
}

export function toDeviceView(event: TelemetryEvent, professionalLabel: string): DeviceView {
  return {
    professionalLabel,
    // Rótulo GROSSEIRO do aparelho (anti-fingerprint): modelo cru sem sdk_int, sem IP, sem identificador.
    deviceLabel: event.deviceModel ?? "Dispositivo",
    appVersion: event.appVersion ?? null,
    lastSeenAt: event.capturedAt.toISOString(),
  };
}

// "YYYY-MM-DD" no fuso de negócio (America/Sao_Paulo) — mesmo fuso da competência financeira.
export function toSaoPauloDay(date: Date): string {
  const parts = dayFormatter.formatToParts(date);
  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  return `${year}-${month}-${day}`;
}

// "dd/mm HH:mm" no fuso America/Sao_Paulo.
export function formatSaoPauloDateTime(date: Date): string {
  const parts = dateTimeFormatter.formatToParts(date);
  const day = partValue(parts, "day");
  const month = partValue(parts, "month");
  const hour = partValue(parts, "hour");
  const minute = partValue(parts, "minute");
  return `${day}/${month} ${hour}:${minute}`;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAO_PAULO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}
