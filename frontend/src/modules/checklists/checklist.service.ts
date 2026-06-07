import {
  createTenantChecklistFromApi,
  listTenantChecklistComponentsFromApi,
  listTenantChecklistsFromApi,
  publishTenantChecklistFromApi,
  updateTenantChecklistFromApi,
} from "./checklist.adapter";
import {
  createMockTenantChecklist,
  listMockTenantChecklistComponents,
  listMockTenantChecklists,
  publishMockTenantChecklist,
  updateMockTenantChecklist,
} from "./checklist.mock";
import type {
  ChecklistApiContext,
  CreateTenantChecklistInput,
  TenantChecklist,
  TenantChecklistComponentCatalogItem,
  UpdateTenantChecklistInput,
} from "./types";

const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

export function listTenantChecklists(context: ChecklistApiContext): Promise<TenantChecklist[]> {
  if (useMocks) return listMockTenantChecklists();
  return listTenantChecklistsFromApi(context);
}

export function listTenantChecklistComponents(context: ChecklistApiContext): Promise<TenantChecklistComponentCatalogItem[]> {
  if (useMocks) return listMockTenantChecklistComponents();
  return listTenantChecklistComponentsFromApi(context);
}

export function createTenantChecklist(context: ChecklistApiContext, input: CreateTenantChecklistInput): Promise<TenantChecklist> {
  if (useMocks) return createMockTenantChecklist(input);
  return createTenantChecklistFromApi(context, input);
}

export function updateTenantChecklist(
  context: ChecklistApiContext,
  checklistId: string,
  input: UpdateTenantChecklistInput,
): Promise<TenantChecklist> {
  if (useMocks) return updateMockTenantChecklist(checklistId, input);
  return updateTenantChecklistFromApi(context, checklistId, input);
}

export function publishTenantChecklist(context: ChecklistApiContext, checklistId: string): Promise<TenantChecklist> {
  if (useMocks) return publishMockTenantChecklist(checklistId);
  return publishTenantChecklistFromApi(context, checklistId);
}
