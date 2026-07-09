import { isMockMode } from "../../config/env";
import {
  archiveNotificationFromApi,
  getUnreadNotificationCountFromApi,
  listNotificationsFromApi,
  markAllNotificationsAsReadFromApi,
  markNotificationAsReadFromApi,
  runFleetAlertsFromApi,
} from "./notification.adapter";
import {
  archiveMockNotification,
  getMockUnreadNotificationCount,
  listMockNotifications,
  markAllMockNotificationsAsRead,
  markMockNotificationAsRead,
  runMockFleetAlerts,
} from "./notification.mock";
import type {
  FleetAlertsRunResult,
  NotificationApiContext,
  NotificationItem,
  NotificationListFilters,
  NotificationUnreadCount,
} from "./notification.types";

export function listNotifications(context: NotificationApiContext, filters: NotificationListFilters = {}): Promise<NotificationItem[]> {
  if (isMockMode()) return listMockNotifications(filters);
  return listNotificationsFromApi(context, filters);
}

export function getUnreadNotificationCount(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  if (isMockMode()) return getMockUnreadNotificationCount();
  return getUnreadNotificationCountFromApi(context);
}

export function markNotificationAsRead(context: NotificationApiContext, notificationId: string): Promise<NotificationItem> {
  if (isMockMode()) return markMockNotificationAsRead(notificationId);
  return markNotificationAsReadFromApi(context, notificationId);
}

export function markAllNotificationsAsRead(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  if (isMockMode()) return markAllMockNotificationsAsRead();
  return markAllNotificationsAsReadFromApi(context);
}

export function archiveNotification(context: NotificationApiContext, notificationId: string): Promise<NotificationItem> {
  if (isMockMode()) return archiveMockNotification(notificationId);
  return archiveNotificationFromApi(context, notificationId);
}

export function runFleetAlerts(context: NotificationApiContext): Promise<FleetAlertsRunResult> {
  if (isMockMode()) return runMockFleetAlerts();
  return runFleetAlertsFromApi(context);
}
