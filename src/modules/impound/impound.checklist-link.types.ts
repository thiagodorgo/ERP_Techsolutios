// Ω-VID PR-04 (§Parte D) — vínculo dossiê↔checklist do guincho. Tabela NOVA "impound_process_checklist_links"
// (migration 20260855000000), FK dura tenant-first RESTRICT nos 2 lados (NÃO polimórfico — achado do
// crítico-adversarial, docs/juntas/J-OMEGA-VID.md §3). link_source distingue AUTO (sweep, PR-05, ainda não
// implementado) de MANUAL (este PR — POST /impound-processes/:id/link-checklist-run).
export const CHECKLIST_LINK_SOURCES = ["AUTO", "MANUAL"] as const;
export type ChecklistLinkSource = (typeof CHECKLIST_LINK_SOURCES)[number];

export type ImpoundProcessChecklistLink = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly checklistRunId: string;
  readonly linkSource: ChecklistLinkSource;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type CreateChecklistLinkInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly checklistRunId: string;
  readonly linkSource: ChecklistLinkSource;
  readonly createdBy?: string;
};

// Resumo ESTREITO do ChecklistRun (não depende do módulo checklists — evita acoplamento cruzado; só os campos
// necessários para a aba "Checklist do Guincho" do dossiê, PR-08/09 futuros).
export type ChecklistRunSummary = {
  readonly id: string;
  readonly tenantId: string;
  readonly templateId: string;
  // Ω-VID PR-08 (junta cognição-visual) — NOME do template (rótulo do formulário) para a linha da aba "Checklist
  // do Guincho" do dossiê ter identidade real, em vez de repetir "Checklist do guincho" em toda run. §allowlist: o
  // nome é rótulo público que o guincheiro já vê no app (não é PII/hash/tenant). Opcional (undefined se ausente).
  readonly templateName?: string;
  readonly templateVersion: number;
  readonly status: string;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  // CHECKLIST P1 PR-03 (junta, MÉDIA) — o vínculo do dossiê aponta para a vistoria ORIGINAL. Quando ela é
  // reaberta, a versão vigente é OUTRA run, e o dossiê mostrava a substituída como se fosse a atual —
  // numa aba que é prova do estado do veículo. Estes dois campos dizem a verdade sobre a versão:
  // de onde ela veio e por quem foi substituída. §allowlist: são ids de vistoria do próprio tenant.
  readonly reopenedFromRunId?: string;
  readonly supersededByRunId?: string;
};

export class ImpoundChecklistLinkError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ImpoundChecklistLinkError";
  }
}
