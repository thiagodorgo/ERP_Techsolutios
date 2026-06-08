import { Badge } from "../../../components/ui";
import type { NotificationSeverity } from "../notification.types";

const labels: Record<NotificationSeverity, string> = {
  info: "Informativa",
  success: "Sucesso",
  warning: "Atencao",
  critical: "Critica",
};

const tones: Record<NotificationSeverity, "info" | "success" | "warning" | "danger"> = {
  info: "info",
  success: "success",
  warning: "warning",
  critical: "danger",
};

export function NotificationSeverityBadge({ severity }: { severity: NotificationSeverity }) {
  return <Badge tone={tones[severity]}>{labels[severity]}</Badge>;
}
