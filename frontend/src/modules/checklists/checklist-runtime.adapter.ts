import { apiRequest } from "../../services/api/client";
import type {
  ChecklistAcknowledgement,
  ChecklistApiContext,
  ChecklistAvailableItem,
  ChecklistDivergence,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRun,
  ChecklistRunComparison,
  ChecklistRunDetails,
  CreateChecklistAcknowledgementInput,
  CreateChecklistMarkerInput,
  CreateChecklistRunInput,
  TenantChecklist,
  UpdateChecklistRunInput,
} from "./types";

type ApiResponse<T> = {
  data: T;
};

export function listAvailableChecklistsFromApi(context: ChecklistApiContext): Promise<ChecklistAvailableItem[]> {
  return apiRequest<ApiResponse<TenantChecklist[]>>("/mobile/checklists/available", toRequestOptions(context)).then((response) => response.data);
}

export function renderChecklistFromApi(context: ChecklistApiContext, checklistId: string): Promise<ChecklistRenderSchema> {
  return apiRequest<ApiResponse<ChecklistRenderSchema>>(
    `/mobile/checklists/${encodeURIComponent(checklistId)}/render`,
    toRequestOptions(context),
  ).then((response) => response.data);
}

export function createChecklistRunFromApi(
  context: ChecklistApiContext,
  input: CreateChecklistRunInput,
): Promise<ChecklistRun> {
  return apiRequest<ApiResponse<ChecklistRun>>("/mobile/checklist-runs", {
    ...toRequestOptions(context),
    method: "POST",
    body: input,
  }).then((response) => response.data);
}

export function updateChecklistRunFromApi(
  context: ChecklistApiContext,
  runId: string,
  input: UpdateChecklistRunInput,
): Promise<ChecklistRunDetails> {
  return apiRequest<ApiResponse<ChecklistRunDetails>>(`/mobile/checklist-runs/${encodeURIComponent(runId)}`, {
    ...toRequestOptions(context),
    method: "PATCH",
    body: input,
  }).then((response) => response.data);
}

export function completeChecklistRunFromApi(context: ChecklistApiContext, runId: string): Promise<ChecklistRunDetails> {
  return apiRequest<ApiResponse<ChecklistRunDetails>>(`/mobile/checklist-runs/${encodeURIComponent(runId)}/complete`, {
    ...toRequestOptions(context),
    method: "POST",
    body: {
      hasDivergence: false,
    },
  }).then((response) => response.data);
}

export function addChecklistMarkerFromApi(
  context: ChecklistApiContext,
  runId: string,
  input: CreateChecklistMarkerInput,
): Promise<ChecklistMarker> {
  return apiRequest<ApiResponse<ChecklistMarker>>(`/mobile/checklist-runs/${encodeURIComponent(runId)}/markers`, {
    ...toRequestOptions(context),
    method: "POST",
    body: input,
  }).then((response) => response.data);
}

export function reportChecklistDivergenceFromApi(
  context: ChecklistApiContext,
  runId: string,
  input: ChecklistDivergence,
): Promise<ChecklistRunDetails> {
  return apiRequest<ApiResponse<ChecklistRunDetails>>(`/mobile/checklist-runs/${encodeURIComponent(runId)}/divergence`, {
    ...toRequestOptions(context),
    method: "POST",
    body: input,
  }).then((response) => response.data);
}

export function acknowledgeChecklistRunFromApi(
  context: ChecklistApiContext,
  runId: string,
  input: CreateChecklistAcknowledgementInput,
): Promise<{ acknowledgement: ChecklistAcknowledgement; run: ChecklistRunDetails }> {
  return apiRequest<ApiResponse<{ acknowledgement: ChecklistAcknowledgement; run: ChecklistRunDetails }>>(
    `/mobile/checklist-runs/${encodeURIComponent(runId)}/acknowledgement`,
    {
      ...toRequestOptions(context),
      method: "POST",
      body: input,
    },
  ).then((response) => response.data);
}

export function getChecklistRunComparisonFromApi(context: ChecklistApiContext, runId: string): Promise<ChecklistRunComparison> {
  return apiRequest<ApiResponse<ChecklistRunComparison>>(`/mobile/checklist-runs/${encodeURIComponent(runId)}/comparison`, toRequestOptions(context)).then(
    (response) => response.data,
  );
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
