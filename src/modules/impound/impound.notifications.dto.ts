import type {
  NotificationChannel,
  NotificationKind,
  NotificationStatus,
  ProcessNotification,
} from "./impound.notifications.types.js";

// Labels PT-BR (neutralidade white-label: "proprietário/autoridade/órgão", NUNCA termo de público-alvo/"polícia").
const KIND_LABELS: Record<NotificationKind, string> = {
  OWNER_INITIAL: "Notificação inicial ao proprietário",
  COMPLEMENTARY_EDICT: "Edital complementar",
  AUCTION_EDICT: "Edital de leilão",
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  DUE: "Devida",
  ISSUED: "Emitida",
  WAIVED: "Dispensada",
  FAILED: "Falha",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  POSTAL: "Postal",
  SNE: "Sistema Nacional de Notificações Eletrônicas",
  EDICT: "Edital",
  IN_PERSON: "Pessoalmente",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). Superfície do CONSOLE AUTENTICADO
// (impound:read/notify) — recipient_ref já vem MINIMIZADO (rótulo/máscara). Sem storage_key/token/PII/endereço
// do proprietário. O portal público (owner-portal, PR posterior) usará DTO próprio ainda mais minimizado.
export function toProcessNotificationDto(notification: ProcessNotification) {
  return {
    id: notification.id,
    processId: notification.processId,
    kind: notification.kind,
    kindLabel: KIND_LABELS[notification.kind],
    status: notification.status,
    statusLabel: STATUS_LABELS[notification.status],
    dueAt: notification.dueAt.toISOString(),
    issuedAt: notification.issuedAt ? notification.issuedAt.toISOString() : null,
    channel: notification.channel ?? null,
    channelLabel: notification.channel ? CHANNEL_LABELS[notification.channel] : null,
    recipientRef: notification.recipientRef ?? null,
    reason: notification.reason ?? null,
    createdBy: notification.createdBy ?? null,
    updatedBy: notification.updatedBy ?? null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}

export function toProcessNotificationListDto(notifications: readonly ProcessNotification[]) {
  return { items: notifications.map(toProcessNotificationDto) };
}
