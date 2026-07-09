import type { FleetAlertsRunResult, NotificationItem, NotificationListFilters, NotificationUnreadCount } from "./notification.types";

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-checklist-completed",
    type: "checklist_run.completed",
    title: "Checklist concluído",
    message: "A coleta do veículo foi concluída e ficou disponível para acompanhamento operacional.",
    severity: "success",
    status: "unread",
    sourceType: "checklist_run",
    sourceId: "run-collection-01",
    actionUrl: "/operations/checklists",
    metadata: { checklistType: "towing_collection" },
    readAt: null,
    createdAt: "2026-06-08T10:15:00.000Z",
    updatedAt: "2026-06-08T10:15:00.000Z",
  },
  {
    id: "notif-divergence",
    type: "checklist_run.divergence_reported",
    title: "Divergência registrada na entrega",
    message: "A entrega possui divergência em relação à coleta e requer acompanhamento do gestor.",
    severity: "warning",
    status: "unread",
    sourceType: "checklist_run",
    sourceId: "run-delivery-02",
    actionUrl: "/operations/checklists",
    metadata: { checklistType: "towing_delivery", requiresAcknowledgement: true },
    readAt: null,
    createdAt: "2026-06-08T09:40:00.000Z",
    updatedAt: "2026-06-08T09:40:00.000Z",
  },
  {
    id: "notif-ack",
    type: "checklist_run.acknowledgement_created",
    title: "Ciência pendente",
    message: "Uma execução aguarda ciência de responsabilidade antes de encerrar o fluxo.",
    severity: "info",
    status: "unread",
    sourceType: "checklist_run",
    sourceId: "run-delivery-03",
    actionUrl: "/operations/checklists",
    metadata: { acknowledgement: "pending" },
    readAt: null,
    createdAt: "2026-06-08T08:20:00.000Z",
    updatedAt: "2026-06-08T08:20:00.000Z",
  },
  {
    id: "notif-critical",
    type: "system.critical",
    title: "Falha crítica em processamento",
    message: "Um processamento operacional falhou após retentativas e precisa de revisão.",
    severity: "critical",
    status: "unread",
    sourceType: "system",
    actionUrl: "/dashboard",
    metadata: { queue: "notification-dispatch" },
    readAt: null,
    createdAt: "2026-06-07T21:10:00.000Z",
    updatedAt: "2026-06-07T21:10:00.000Z",
  },
  {
    id: "notif-read",
    type: "checklist_run.completed",
    title: "Evidência técnica concluída",
    message: "O registro antes/depois foi concluído e auditado.",
    severity: "success",
    status: "read",
    sourceType: "checklist_run",
    sourceId: "run-technical-04",
    actionUrl: "/operations/checklists",
    metadata: { checklistType: "technical_evidence" },
    readAt: "2026-06-07T18:15:00.000Z",
    createdAt: "2026-06-07T18:00:00.000Z",
    updatedAt: "2026-06-07T18:15:00.000Z",
  },
  {
    id: "notif-archived",
    type: "checklist_run.completed",
    title: "Notificação arquivada",
    message: "Item mantido apenas para validar o filtro de arquivadas.",
    severity: "info",
    status: "archived",
    sourceType: "checklist_run",
    sourceId: "run-archived-05",
    actionUrl: "/operations/checklists",
    metadata: { archived: true },
    readAt: "2026-06-06T15:00:00.000Z",
    createdAt: "2026-06-06T14:20:00.000Z",
    updatedAt: "2026-06-06T15:00:00.000Z",
  },
];

let notifications = [...initialNotifications];

export async function listMockNotifications(filters: NotificationListFilters = {}): Promise<NotificationItem[]> {
  await wait();
  return notifications
    .filter((notification) => !filters.status || notification.status === filters.status)
    .filter((notification) => !filters.severity || notification.severity === filters.severity)
    .filter((notification) => !filters.type || notification.type === filters.type)
    .filter((notification) => !filters.sourceType || notification.sourceType === filters.sourceType)
    .slice(0, filters.limit ?? notifications.length);
}

export async function getMockUnreadNotificationCount(): Promise<NotificationUnreadCount> {
  await wait();
  return { count: unreadCount() };
}

export async function markMockNotificationAsRead(notificationId: string): Promise<NotificationItem> {
  await wait();
  const now = new Date().toISOString();
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? {
          ...notification,
          status: "read",
          readAt: notification.readAt ?? now,
          updatedAt: now,
        }
      : notification,
  );
  return findNotification(notificationId);
}

export async function markAllMockNotificationsAsRead(): Promise<NotificationUnreadCount> {
  await wait();
  const now = new Date().toISOString();
  notifications = notifications.map((notification) =>
    notification.status === "unread"
      ? {
          ...notification,
          status: "read",
          readAt: notification.readAt ?? now,
          updatedAt: now,
        }
      : notification,
  );
  return { count: unreadCount() };
}

export async function archiveMockNotification(notificationId: string): Promise<NotificationItem> {
  await wait();
  const now = new Date().toISOString();
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? {
          ...notification,
          status: "archived",
          updatedAt: now,
        }
      : notification,
  );
  return findNotification(notificationId);
}

export async function runMockFleetAlerts(): Promise<FleetAlertsRunResult> {
  await wait();
  // Sem produtores de domínio no modo mock — execução idempotente e vazia.
  return { maintenance: 0, fines: 0, insurance: 0, reorder: 0, ranAt: new Date().toISOString() };
}

export function resetMockNotificationsForTests(): void {
  notifications = initialNotifications.map((notification) => ({ ...notification }));
}

function findNotification(notificationId: string): NotificationItem {
  const notification = notifications.find((item) => item.id === notificationId);
  if (!notification) throw new Error("Notificação não encontrada.");
  return notification;
}

function unreadCount(): number {
  return notifications.filter((notification) => notification.status === "unread").length;
}

function wait(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 120));
}
