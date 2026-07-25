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

// Ω4C PR-20 — DTO da CENTRAL tenant-wide (D-Ω4C-NOTIF-DTO-CENTRAL, o coração da fatia). A lista mostra as
// definições de QUALQUER criador do tenant, então §2.8 fica CONDICIONAL ao viewer: campos "para quem" (destino)
// só voltam ao PRÓPRIO criador (mine=true). Sempre expõe metadados de NEGÓCIO (visibility/status/sourceType são
// enums, não segredo/UUID) + o booleano `mine` (chip "Você" na UI). NUNCA vaza:
//  - tenant_id / client_action_id / deleted_at (allowlist §2.8, como o DTO base);
//  - createdBy CRU (só o derivado `mine` — sem revelar UUID de usuário de terceiros);
//  - customRecipientIds / sourceId a NÃO-criador (a "lista de destinatários"/origem de uma definição de outro).
// Defesa em 2 camadas: este DTO condicional no backend + descarte defensivo no adapter do front (padrão PR-14).
export function toCentralScheduledNotificationDto(entry: ScheduledNotification, viewerUserId: string) {
  const mine = entry.createdBy === viewerUserId;
  const base = {
    id: entry.id,
    title: entry.title,
    message: entry.message,
    notifyAt: entry.notifyAt.toISOString(),
    remindBeforeMinutes: entry.remindBeforeMinutes ?? null,
    visibility: entry.visibility,
    status: entry.status,
    sourceType: entry.sourceType ?? null,
    createdAt: entry.createdAt.toISOString(),
    mine,
  };
  if (!mine) {
    return base;
  }
  // Só o próprio criador vê a quem enviou (destinatários custom) e a origem (sourceId) do agendamento.
  return {
    ...base,
    customRecipientIds: [...entry.customRecipientIds],
    sourceId: entry.sourceId ?? null,
  };
}

export function toCentralScheduledNotificationListDto(input: {
  readonly items: readonly ScheduledNotification[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
  readonly viewerUserId: string;
}) {
  return {
    data: input.items.map((entry) => toCentralScheduledNotificationDto(entry, input.viewerUserId)),
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total: input.total,
    },
  };
}
