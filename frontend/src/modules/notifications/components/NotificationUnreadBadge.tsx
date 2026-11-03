export function NotificationUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="notification-unread-badge" aria-label={`${count} notificações não lidas`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
