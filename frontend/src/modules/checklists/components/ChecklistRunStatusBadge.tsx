import { Chip } from "../../../components/ui";
import type { ChecklistRunStatus } from "../types";

const statusLabel: Record<ChecklistRunStatus, string> = {
  in_progress: "Em andamento",
  completed: "Concluido",
  completed_with_divergence: "Concluido com divergencia",
  pending_acknowledgement: "Pendente de ciencia",
  cancelled: "Cancelado",
};

const statusTone: Record<ChecklistRunStatus, "default" | "success" | "warning" | "danger" | "info" | "pending"> = {
  in_progress: "info",
  completed: "success",
  completed_with_divergence: "warning",
  pending_acknowledgement: "pending",
  cancelled: "default",
};

export function ChecklistRunStatusBadge({ status }: { readonly status: ChecklistRunStatus }) {
  return <Chip tone={statusTone[status]}>{statusLabel[status]}</Chip>;
}

export function checklistRunStatusLabel(status: ChecklistRunStatus): string {
  return statusLabel[status];
}
