import { apiRequest } from "../../services/api/client";
import type {
  ChecklistApiContext,
  CreateTenantChecklistInput,
  TenantChecklist,
  TenantChecklistComponentCatalogItem,
  UpdateTenantChecklistInput,
} from "./types";

type ApiResponse<T> = {
  data: T;
};

export function listTenantChecklistsFromApi(context: ChecklistApiContext): Promise<TenantChecklist[]> {
  return apiRequest<ApiResponse<TenantChecklist[]>>("/tenant/checklists", toRequestOptions(context)).then((response) => response.data);
}

export function listTenantChecklistComponentsFromApi(context: ChecklistApiContext): Promise<TenantChecklistComponentCatalogItem[]> {
  return apiRequest<ApiResponse<TenantChecklistComponentCatalogItem[]>>("/tenant/checklist-components", toRequestOptions(context)).then(
    (response) => response.data,
  );
}

export function createTenantChecklistFromApi(
  context: ChecklistApiContext,
  input: CreateTenantChecklistInput,
): Promise<TenantChecklist> {
  return apiRequest<ApiResponse<TenantChecklist>>("/tenant/checklists", {
    ...toRequestOptions(context),
    method: "POST",
    body: input,
  }).then((response) => response.data);
}

export function updateTenantChecklistFromApi(
  context: ChecklistApiContext,
  checklistId: string,
  input: UpdateTenantChecklistInput,
): Promise<TenantChecklist> {
  return apiRequest<ApiResponse<TenantChecklist>>(`/tenant/checklists/${checklistId}`, {
    ...toRequestOptions(context),
    method: "PATCH",
    body: input,
  }).then((response) => response.data);
}

export function publishTenantChecklistFromApi(context: ChecklistApiContext, checklistId: string): Promise<TenantChecklist> {
  return apiRequest<ApiResponse<TenantChecklist>>(`/tenant/checklists/${checklistId}/publish`, {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => response.data);
}

export function deleteTenantChecklistFromApi(context: ChecklistApiContext, checklistId: string): Promise<void> {
  return apiRequest<void>(`/tenant/checklists/${checklistId}`, {
    ...toRequestOptions(context),
    method: "DELETE",
  });
}

function toRequestOptions(context: ChecklistApiContext) {
  return {
    token: context.token,
    tenantId: context.tenantId,
    branchId: context.branchId,
    role: context.role,
    permissions: context.permissions,
  };
}
