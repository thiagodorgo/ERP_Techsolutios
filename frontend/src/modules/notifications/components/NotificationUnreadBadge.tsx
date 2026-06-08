export function NotificationUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="notification-unread-badge" aria-label={`${count} notificacoes nao lidas`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
