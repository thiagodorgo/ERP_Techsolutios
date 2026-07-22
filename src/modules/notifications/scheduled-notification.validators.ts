import { parseBusinessDate } from "../../config/business-time.js";
import {
  SCHEDULED_NOTIFICATION_SOURCE_TYPES,
  SCHEDULED_NOTIFICATION_VISIBILITIES,
  ScheduledNotificationError,
} from "./scheduled-notification.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VISIBILITY_ALLOWLIST = new Set<string>(SCHEDULED_NOTIFICATION_VISIBILITIES);
const SOURCE_TYPE_ALLOWLIST = new Set<string>(SCHEDULED_NOTIFICATION_SOURCE_TYPES);
// Antecedência do lembrete: 1 minuto .. 1 ano (guarda contra valor absurdo). remind_before é OPCIONAL.
const MAX_REMIND_BEFORE_MINUTES = 525_600;
// Teto de destinatários CUSTOM por definição (guarda contra broadcast disfarçado de "personalizada").
const MAX_CUSTOM_RECIPIENTS = 500;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// title/message OBRIGATÓRIOS. Máx. configurável (title 200, message 2000).
export function parseRequiredText(value: unknown, field: string, maxLength: number): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", `${field}_required`, `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// notify_at OBRIGATÓRIO. Entrada naïve "YYYY-MM-DDTHH:mm" é ancorada ao FUSO DE NEGÓCIO (parseBusinessDate,
// America/Sao_Paulo) → instante absoluto; entrada com Z/offset é respeitada como está. Inválida → 400.
export function parseNotifyAt(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "notify_at_required", "notify_at is required.");
  }
  const date = value instanceof Date ? value : parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_notify_at", "notify_at must be a valid date.");
  }
  return date;
}

// remind_before_minutes OPCIONAL: int em 1..525600. Ausente → undefined (sem lembrete). Fora de range → 400.
export function parseRemindBeforeMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_REMIND_BEFORE_MINUTES) {
    throw new ScheduledNotificationError(
      400,
      "SCHEDULED_NOTIFICATION_INVALID",
      "invalid_remind_before_minutes",
      `remind_before_minutes must be an integer between 1 and ${MAX_REMIND_BEFORE_MINUTES}.`,
    );
  }
  return parsed;
}

// visibility OBRIGATÓRIO ∈ {private,public,custom}.
export function parseVisibility(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !VISIBILITY_ALLOWLIST.has(normalized)) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_visibility", "visibility must be one of private, public, custom.");
  }
  return normalized;
}

// custom_recipient_ids: obrigatório e não-vazio SÓ quando visibility=custom (uuids únicos). Fora do custom é
// ignorado (retorna []). Cada id deve ser uuid; duplicados são deduplicados; array vazio no custom → 400.
export function parseCustomRecipientIds(value: unknown, visibility: string): string[] {
  if (visibility !== "custom") return [];
  if (!Array.isArray(value)) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "custom_recipient_ids_required", "custom_recipient_ids must be a non-empty array of user ids for a custom notification.");
  }
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const normalized = optionalString(raw);
    if (normalized === undefined || !uuidPattern.test(normalized)) {
      throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_custom_recipient_id", "each custom recipient id must be a valid UUID.");
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  if (unique.length === 0) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "custom_recipient_ids_required", "custom_recipient_ids must be a non-empty array of user ids for a custom notification.");
  }
  if (unique.length > MAX_CUSTOM_RECIPIENTS) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "too_many_custom_recipients", `custom_recipient_ids must have at most ${MAX_CUSTOM_RECIPIENTS} entries.`);
  }
  return unique;
}

// source_type OPCIONAL ∈ allowlist; ausente → 'manual' (avulsa). Contrato foundation p/ consumidores futuros.
export function parseSourceType(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined) return "manual";
  if (!SOURCE_TYPE_ALLOWLIST.has(normalized)) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_source_type", "source_type is invalid.");
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!uuidPattern.test(normalized)) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ScheduledNotificationError(400, "SCHEDULED_NOTIFICATION_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// reminder_at DERIVADO server-side = notify_at − remind_before (RN-NOTIF-04). Sem antecedência → sem lembrete.
export function deriveReminderAt(notifyAt: Date, remindBeforeMinutes: number | undefined): Date | undefined {
  if (remindBeforeMinutes === undefined) return undefined;
  return new Date(notifyAt.getTime() - remindBeforeMinutes * 60_000);
}
