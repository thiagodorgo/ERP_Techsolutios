import { requireAnyPermission, requirePermission } from "../core-saas/middleware/rbac.middleware.js";

export const CHECKLIST_PERMISSIONS = {
  readTemplates: "tenant_checklists:read",
  createTemplates: "tenant_checklists:create",
  updateTemplates: "tenant_checklists:update",
  publishTemplates: "tenant_checklists:publish",
  readRuns: "checklist_runs:read",
  createRuns: "checklist_runs:create",
  updateRuns: "checklist_runs:update",
  completeRuns: "checklist_runs:complete",
  acknowledgeRuns: "checklist_runs:acknowledge",
  // CHECKLIST P1 PR-03 (D-CHK-P1-REOPEN-RBAC) — REABRIR uma vistoria concluída é ato de GESTÃO sobre prova
  // jurídica, não continuação do preenchimento. Por isso NÃO reusa `checklist_runs:update`: o guincheiro
  // (field_technician/technician) tem `update` e não pode destravar a própria assinatura. Distribuição:
  // super_admin, platform_admin, tenant_admin (herança do catálogo) + manager (gestão da operação).
  // Espelha a disciplina de `financial_period:reopen` (reabrir o que já foi fechado é permissão à parte).
  reopenRuns: "checklist_runs:reopen",
} as const;

export const requireChecklistPermission = requirePermission;
export const requireAnyChecklistPermission = requireAnyPermission;
