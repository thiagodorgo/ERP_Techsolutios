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
  TenantChecklistComponent,
  TenantChecklistComponentType,
  TenantChecklistStatus,
  TenantChecklistType,
  UpdateChecklistRunInput,
} from "./types";

type ApiResponse<T> = {
  data: T;
};

// Contrato real de GET /mobile/checklists/available (toMobileChecklistTemplateDto no backend,
// src/modules/checklists/checklist.dto.ts) — desenhado para o cliente Flutter (snake_case,
// `category`/`items`, status "active"), NÃO o mesmo shape de TenantChecklist (usado pelo
// builder web em /tenant/checklists). Sem esta tradução a tela operacional quebra em runtime
// (item.components é undefined) assim que sai do modo mock.
type MobileChecklistTemplateItemDto = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
};

type MobileChecklistTemplateDto = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  title: string;
  description: string | null;
  version: number;
  schema_version: string;
  status: string;
  is_required: boolean;
  category: string;
  work_order_type: string;
  linked_work_order_type: string;
  module: string;
  updated_at: string;
  items: MobileChecklistTemplateItemDto[];
};

function mapMobileChecklistTemplateItemToComponent(
  item: MobileChecklistTemplateItemDto,
  templateId: string,
  tenantId: string,
): TenantChecklistComponent {
  return {
    id: item.id,
    tenantId,
    templateId,
    componentKey: item.id,
    label: item.label,
    type: item.type as TenantChecklistComponentType,
    required: item.required,
    orderIndex: item.order,
    config: {},
    validationRules: {},
    visibilityRules: {},
  };
}

function mapMobileChecklistTemplateStatus(status: string): TenantChecklistStatus {
  // toMobileChecklistTemplateStatus (backend) só normaliza "published" -> "active"; as demais
  // passam intactas (draft/inactive/archived já batem com TenantChecklistStatus).
  return status === "active" ? "published" : (status as TenantChecklistStatus);
}

function mapMobileChecklistTemplateToTenantChecklist(dto: MobileChecklistTemplateDto): TenantChecklist {
  return {
    id: dto.id,
    tenantId: dto.tenant_id,
    name: dto.name,
    description: dto.description ?? undefined,
    type: dto.category as TenantChecklistType,
    status: mapMobileChecklistTemplateStatus(dto.status),
    version: dto.version,
    schema: {},
    components: dto.items.map((item) => mapMobileChecklistTemplateItemToComponent(item, dto.id, dto.tenant_id)),
    updatedAt: dto.updated_at,
  };
}

export function listAvailableChecklistsFromApi(context: ChecklistApiContext): Promise<ChecklistAvailableItem[]> {
  return apiRequest<ApiResponse<MobileChecklistTemplateDto[]>>("/mobile/checklists/available", toRequestOptions(context)).then(
    (response) => response.data.map(mapMobileChecklistTemplateToTenantChecklist),
  );
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
