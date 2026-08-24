import { Archive, Check } from "lucide-react";

import { Button, Card, Chip, rowClickProps } from "../../../components/ui";
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
  const showMarkRead = notification.status === "unread";
  const showArchive = notification.status !== "archived";

  return (
    <Card>
      {/* Padrão "linha clicável" (2026-08-24): o cartão inteiro abre a notificação — era o que o botão
          "Abrir" fazia, e ele saiu. A abertura continua passando pelo `onOpen` da página, que revalida a
          URL do backend (nunca navegamos com o valor cru). FAIL-HONESTO: notificação sem destino interno
          seguro não tem o que abrir e o cartão fica estático — sem cursor, realce ou foco por teclado. */}
      <article
        {...rowClickProps({
          className: `notification-card ${notification.status === "unread" ? "is-unread" : ""}`,
          onOpen: canOpen ? () => onOpen(notification) : null,
          label: `Abrir ${notification.title}`,
        })}
      >
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

        {showMarkRead || showArchive ? (
          <footer>
            {showMarkRead ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onMarkRead(notification)}>
                <Check size={15} />
                Marcar como lida
              </Button>
            ) : null}
            {showArchive ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onArchive(notification)}>
                <Archive size={15} />
                Arquivar
              </Button>
            ) : null}
          </footer>
        ) : null}
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
