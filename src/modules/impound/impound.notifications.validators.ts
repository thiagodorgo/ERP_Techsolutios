import {
  NOTIFICATION_CHANNELS,
  NotificationError,
  type NotificationAttachmentInput,
  type NotificationChannel,
} from "./impound.notifications.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseNotificationChannel(value: unknown): NotificationChannel {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(NOTIFICATION_CHANNELS as readonly string[]).includes(normalized)) {
    throw new NotificationError(
      400,
      "NOTIFICATION_INVALID",
      "invalid_channel",
      `channel must be one of: ${NOTIFICATION_CHANNELS.join(", ")}.`,
    );
  }
  return normalized as NotificationChannel;
}

// Fundamento obrigatório (WAIVE). Texto livre (SEM PII — não fabricamos e não validamos conteúdo de proprietário).
export function parseRequiredReason(value: unknown, maxLength = 500): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new NotificationError(422, "NOTIFICATION_INVALID", "reason_required", "A waived notification requires a reason.");
  }
  if (normalized.length > maxLength) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "field_too_long", `reason must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// Destinatário MINIMIZADO (§2.8: rótulo/máscara curto, NUNCA endereço/PII completa). Limite baixo desencoraja
// colar PII; nunca entra no payload do evento nem no audit.
export function parseOptionalRecipientRef(value: unknown, maxLength = 120): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "recipient_ref_too_long", `recipientRef must be at most ${maxLength} characters (use a masked label, not full PII).`);
  }
  return normalized;
}

export function optionalString(value: unknown, maxLength = 500): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "field_too_long", `field must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// issued_at OPCIONAL (default = agora no serviço). ISO datetime.
export function parseOptionalDateTime(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = typeof value === "string" ? value.trim() : "";
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "invalid_date", `${field} must be a valid ISO datetime.`);
  }
  return new Date(ms);
}

// Comprovante OPCIONAL da emissão. Requer file_url quando presente; storage_key NUNCA é exposto (só armazenado).
export function parseOptionalAttachment(body: Record<string, unknown>): NotificationAttachmentInput | undefined {
  const fileUrl = body.file_url ?? body.fileUrl;
  if (fileUrl === undefined || fileUrl === null || fileUrl === "") return undefined;
  const url = typeof fileUrl === "string" ? fileUrl.trim() : "";
  if (!url) return undefined;
  if (url.length > 2000) {
    throw new NotificationError(400, "NOTIFICATION_INVALID", "invalid_file_url", "file_url must be at most 2000 characters.");
  }
  return {
    fileUrl: url,
    fileName: optionalString(body.file_name ?? body.fileName, 260),
    contentType: optionalString(body.content_type ?? body.contentType, 160),
    checksumSha256: optionalString(body.checksum_sha256 ?? body.checksumSha256, 128),
    storageProvider: optionalString(body.storage_provider ?? body.storageProvider, 80),
    storageKey: optionalString(body.storage_key ?? body.storageKey, 512),
  };
}
