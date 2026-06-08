import { Archive, Check, ExternalLink } from "lucide-react";

import { Button, Card, Chip } from "../../../components/ui";
import type { NotificationItem } from "../notification.types";
import { NotificationSeverityBadge } from "./NotificationSeverityBadge";
import { NotificationStatusBadge } from "./NotificationStatusBadge";

export function NotificationCard({
  notification,
  onArchive,
  onMarkRead,
  onOpen,
}: {
  notification: NotificationItem;
  onArchive: (notification: NotificationItem) => void;
  onMarkRead: (notification: NotificationItem) => void;
  onOpen: (notification: NotificationItem) => void;
}) {
  const canOpen = isSafeInternalActionUrl(notification.actionUrl);

  return (
    <Card>
      <article className={`notification-card ${notification.status === "unread" ? "is-unread" : ""}`}>
        <header>
          <div>
            <div className="notification-card__badges">
              <NotificationSeverityBadge severity={notification.severity} />
              <NotificationStatusBadge status={notification.status} />
              {notification.sourceType ? <Chip tone="audit">{sourceLabel(notification.sourceType)}</Chip> : null}
            </div>
            <h2>{notification.title}</h2>
          </div>
          <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString("pt-BR")}</time>
        </header>

        <p>{notification.message}</p>

        <footer>
          {canOpen ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpen(notification)}>
              <ExternalLink size={15} />
              Abrir
            </Button>
          ) : null}
          {notification.status === "unread" ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onMarkRead(notification)}>
              <Check size={15} />
              Marcar como lida
            </Button>
          ) : null}
          {notification.status !== "archived" ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onArchive(notification)}>
              <Archive size={15} />
              Arquivar
            </Button>
          ) : null}
        </footer>
      </article>
    </Card>
  );
}

function isSafeInternalActionUrl(actionUrl: string | undefined): boolean {
  return Boolean(actionUrl?.startsWith("/") && !actionUrl.startsWith("//"));
}

function sourceLabel(sourceType: string): string {
  if (sourceType === "checklist_run") return "Checklist";
  if (sourceType === "audit_log") return "Auditoria";
  if (sourceType === "auth") return "Acesso";
  if (sourceType === "system") return "Sistema";
  return sourceType.replace("_", " ");
}
