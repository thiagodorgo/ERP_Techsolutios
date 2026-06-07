import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";

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
} as const;

export const requireChecklistPermission = requirePermission;
