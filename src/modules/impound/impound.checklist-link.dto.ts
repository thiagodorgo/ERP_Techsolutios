import type { ChecklistRunSummary, ImpoundProcessChecklistLink } from "./impound.checklist-link.types.js";

// §allowlist: tenant_id NUNCA é exposto.
export function toChecklistLinkDto(link: ImpoundProcessChecklistLink) {
  return {
    id: link.id,
    processId: link.processId,
    checklistRunId: link.checklistRunId,
    linkSource: link.linkSource,
    createdBy: link.createdBy ?? null,
    createdAt: link.createdAt.toISOString(),
  };
}

export function toChecklistRunSummaryListDto(runs: readonly ChecklistRunSummary[]) {
  return {
    items: runs.map((run) => ({
      id: run.id,
      templateId: run.templateId,
      templateVersion: run.templateVersion,
      status: run.status,
      relatedEntityType: run.relatedEntityType ?? null,
      relatedEntityId: run.relatedEntityId ?? null,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    })),
  };
}
