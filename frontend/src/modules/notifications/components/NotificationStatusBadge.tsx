import { Badge } from "../../../components/ui";
import type { NotificationStatus } from "../notification.types";

const labels: Record<NotificationStatus, string> = {
  unread: "Nao lida",
  read: "Lida",
  archived: "Arquivada",
};

const tones: Record<NotificationStatus, "pending" | "success" | "default"> = {
  unread: "pending",
  read: "success",
  archived: "default",
};

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
