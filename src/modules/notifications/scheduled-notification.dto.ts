import type { ScheduledNotification } from "./scheduled-notification.types.js";

// §2.8/LGPD — a resposta OMITE tenant_id (resolvido pelo ator), client_action_id e deleted_at. NUNCA segredo/
// dado sensível. visibility/status/sourceType são valores de NEGÓCIO (não segredo/UUID) → OK expor. sourceId
// e customRecipientIds são ids do PRÓPRIO tenant e a lista é SEMPRE do próprio criador (rotas creator-scoped),
// então expor de volta é como o campo "para" de um agendamento do próprio usuário — nunca chega a não-criador.
export function toScheduledNotificationDto(entry: ScheduledNotification) {
  return {
    id: entry.id,
    title: entry.title,
    message: entry.message,
    notifyAt: entry.notifyAt.toISOString(),
    remindBeforeMinutes: entry.remindBeforeMinutes ?? null,
    reminderAt: entry.reminderAt?.toISOString() ?? null,
    visibility: entry.visibility,
    customRecipientIds: [...entry.customRecipientIds],
    sourceType: entry.sourceType ?? null,
    sourceId: entry.sourceId ?? null,
    status: entry.status,
    reminderFiredAt: entry.reminderFiredAt?.toISOString() ?? null,
    firedAt: entry.firedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function toScheduledNotificationListDto(input: {
  readonly items: readonly ScheduledNotification[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
}) {
  return {
    data: input.items.map(toScheduledNotificationDto),
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total: input.total,
    },
  };
}
