import { EmptyState } from "../../../components/ui";
import type { NotificationItem } from "../notification.types";
import { NotificationCard } from "./NotificationCard";

export function NotificationList({
  notifications,
  onArchive,
  onMarkRead,
  onOpen,
}: {
  notifications: NotificationItem[];
  onArchive: (notification: NotificationItem) => void;
  onMarkRead: (notification: NotificationItem) => void;
  onOpen: (notification: NotificationItem) => void;
}) {
  if (notifications.length === 0) {
    return <EmptyState title="Nenhuma notificação encontrada" detail="A central exibirá eventos relevantes da sua organização aqui." />;
  }

  return (
    <section className="notification-list">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onArchive={onArchive}
          onMarkRead={onMarkRead}
          onOpen={onOpen}
        />
      ))}
    </section>
  );
}
