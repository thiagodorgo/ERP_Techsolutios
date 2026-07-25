import type {
  TelemetryAccessView,
  TelemetryDeviceView,
  TelemetryKmView,
  TelemetryRefusalView,
} from "./telemetry.types";

// Ω4C PR-14 — normalização DEFENSIVA das 4 views de Telemetria. NUNCA fabrica linha (D-007): só reconstrói o
// que o backend enviou. §2.8/LGPD (crítico): o adapter só copia o allowlist de cada DTO — se lat/lng/IP/
// tenant_id/client_action_id/sdk_int vierem no corpo por acidente, NÃO entram no objeto retornado. A
// coordenada crua é exclusiva do mapa (/telemetry/track), deferido ao PR-15.

const SAO_PAULO_TZ = "America/Sao_Paulo";

// "dd/mm/aa HH:mm" (SP) — para o lastSeenAt dos Dispositivos, que chega como ISO. Instante inválido → "—".
const LAST_SEEN_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Dia (YYYY-MM-DD) → "dd/mm/aaaa" em UTC (não desloca o dia pelo fuso — o dia já veio no fuso de negócio).
const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Formata km (Decimal(10,1)) em PT-BR: "12,3 km". 1 casa sempre — "0,0 km" é honesto (sem trajeto).
export function formatKm(km: number): string {
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatPoints(points: number): string {
  return String(Math.max(0, Math.trunc(points)));
}

export function formatTelemetryDay(day: string): string {
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? day : DAY_FORMATTER.format(parsed);
}

export function formatLastSeen(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const parts = LAST_SEEN_FORMATTER.formatToParts(parsed);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

// Tom do badge de Acessos: verde "conectou" · cinza "desconectou".
export function getAccessTone(event: string): "success" | "default" {
  return event === "conectou" ? "success" : "default";
}

// ── Quilometragem ────────────────────────────────────────────────────────────────────────────────────────
function adaptKmRow(raw: unknown): TelemetryKmView | null {
  if (!isRecord(raw)) return null;
  const day = nonEmptyString(raw.day);
  if (!day) return null;
  return {
    professionalLabel: nonEmptyString(raw.professionalLabel) ?? "Profissional",
    day,
    kmTotal: Math.max(0, toNumber(raw.kmTotal)),
    pointsUsed: Math.max(0, Math.trunc(toNumber(raw.pointsUsed))),
  };
}

export function adaptKm(raw: unknown): TelemetryKmView[] {
  if (!Array.isArray(raw)) return [];
  const rows: TelemetryKmView[] = [];
  for (const entry of raw) {
    const row = adaptKmRow(entry);
    if (row) rows.push(row);
  }
  // Mais recentes primeiro (dia é ordenável lexicograficamente por ser YYYY-MM-DD).
  return rows.sort((left, right) => right.day.localeCompare(left.day));
}

// ── Acessos ──────────────────────────────────────────────────────────────────────────────────────────────
function adaptAccessRow(raw: unknown): TelemetryAccessView | null {
  if (!isRecord(raw)) return null;
  const event = nonEmptyString(raw.event);
  const when = nonEmptyString(raw.when);
  if (!event || !when) return null;
  return {
    professionalLabel: nonEmptyString(raw.professionalLabel) ?? "Profissional",
    event,
    when,
  };
}

export function adaptAccess(raw: unknown): TelemetryAccessView[] {
  if (!Array.isArray(raw)) return [];
  const rows: TelemetryAccessView[] = [];
  for (const entry of raw) {
    const row = adaptAccessRow(entry);
    if (row) rows.push(row);
  }
  return rows;
}

// ── Recusas ──────────────────────────────────────────────────────────────────────────────────────────────
function adaptRefusalRow(raw: unknown): TelemetryRefusalView | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id);
  const when = nonEmptyString(raw.when);
  if (!id || !when) return null;
  return {
    id,
    when,
    professionalLabel: nonEmptyString(raw.professionalLabel) ?? "Profissional",
    workOrderRef: nonEmptyString(raw.workOrderRef),
    reason: nonEmptyString(raw.reason),
  };
}

export function adaptRefusals(raw: unknown): TelemetryRefusalView[] {
  if (!Array.isArray(raw)) return [];
  const rows: TelemetryRefusalView[] = [];
  for (const entry of raw) {
    const row = adaptRefusalRow(entry);
    if (row) rows.push(row);
  }
  return rows;
}

// ── Dispositivos ─────────────────────────────────────────────────────────────────────────────────────────
function adaptDeviceRow(raw: unknown): TelemetryDeviceView | null {
  if (!isRecord(raw)) return null;
  const lastSeenAt = nonEmptyString(raw.lastSeenAt);
  if (!lastSeenAt) return null;
  return {
    professionalLabel: nonEmptyString(raw.professionalLabel) ?? "Profissional",
    // Rótulo GROSSEIRO do aparelho (anti-fingerprint) — o DTO já não traz sdk_int cru/IP.
    deviceLabel: nonEmptyString(raw.deviceLabel) ?? "Dispositivo",
    appVersion: nonEmptyString(raw.appVersion),
    lastSeenAt,
  };
}

export function adaptDevices(raw: unknown): TelemetryDeviceView[] {
  if (!Array.isArray(raw)) return [];
  const rows: TelemetryDeviceView[] = [];
  for (const entry of raw) {
    const row = adaptDeviceRow(entry);
    if (row) rows.push(row);
  }
  return rows;
}
