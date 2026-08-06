import { Chip } from "../../../components/ui";
import { runStatusLabel } from "../checklist.constants";
import type { ChecklistRunStatus } from "../types";

// Junta PR-02a: a copy vivia duplicada AQUI sem acento ("Concluido", "divergencia", "ciencia") —
// a correção transversal de rótulos só valia se os consumidores duplicados importassem o mapa.
const statusLabel: Record<ChecklistRunStatus, string> = {
  ...runStatusLabel,
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
