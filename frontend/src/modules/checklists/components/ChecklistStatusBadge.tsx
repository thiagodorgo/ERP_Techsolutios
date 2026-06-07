import { Chip } from "../../../components/ui";
import { checklistStatusLabel } from "../checklist.constants";
import type { TenantChecklistStatus, TenantChecklistUiState } from "../types";

export function ChecklistStatusBadge({
  status,
  uiState,
}: {
  readonly status: TenantChecklistStatus;
  readonly uiState?: TenantChecklistUiState;
}) {
  if (uiState === "pending_changes") {
    return <Chip tone="warning">Alteracoes pendentes</Chip>;
  }

  const tone = status === "published" ? "success" : status === "inactive" || status === "archived" ? "default" : "pending";

  return <Chip tone={tone}>{checklistStatusLabel[status]}</Chip>;
}
