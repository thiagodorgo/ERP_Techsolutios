import { isMockMode } from "../../config/env";
import {
  createTenantChecklistFromApi,
  getTenantChecklistFromApi,
  listTenantChecklistComponentsFromApi,
  listTenantChecklistsFromApi,
  publishTenantChecklistFromApi,
  updateTenantChecklistFromApi,
} from "./checklist.adapter";
import {
  createMockTenantChecklist,
  getMockTenantChecklist,
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

export function listTenantChecklists(context: ChecklistApiContext): Promise<TenantChecklist[]> {
  if (isMockMode()) return listMockTenantChecklists();
  return listTenantChecklistsFromApi(context);
}

/** CHECKLIST P1 PR-02b — carga do editor por deep-link (um modelo, sem depender da lista). */
export function getTenantChecklist(context: ChecklistApiContext, checklistId: string): Promise<TenantChecklist> {
  if (isMockMode()) return getMockTenantChecklist(checklistId);
  return getTenantChecklistFromApi(context, checklistId);
}

export function listTenantChecklistComponents(context: ChecklistApiContext): Promise<TenantChecklistComponentCatalogItem[]> {
  if (isMockMode()) return listMockTenantChecklistComponents();
  return listTenantChecklistComponentsFromApi(context);
}

export function createTenantChecklist(context: ChecklistApiContext, input: CreateTenantChecklistInput): Promise<TenantChecklist> {
  if (isMockMode()) return createMockTenantChecklist(input);
  return createTenantChecklistFromApi(context, input);
}

export function updateTenantChecklist(
  context: ChecklistApiContext,
  checklistId: string,
  input: UpdateTenantChecklistInput,
): Promise<TenantChecklist> {
  if (isMockMode()) return updateMockTenantChecklist(checklistId, input);
  return updateTenantChecklistFromApi(context, checklistId, input);
}

export function publishTenantChecklist(context: ChecklistApiContext, checklistId: string): Promise<TenantChecklist> {
  if (isMockMode()) return publishMockTenantChecklist(checklistId);
  return publishTenantChecklistFromApi(context, checklistId);
}
