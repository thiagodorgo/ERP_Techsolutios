import { apiRequest } from "../../services/api/client";
import type {
  CreateTenantAdminInput,
  CreateTenantInput,
  PlatformModule,
  PlatformTenant,
  PlatformTenantStatus,
  UpdateTenantInput,
} from "./platform.types";

type ApiResponse<T> = {
  data: T;
};

export function listPlatformTenantsFromApi() {
  return apiRequest<ApiResponse<PlatformTenant[]>>("/platform/tenants").then((response) => response.data);
}

export function getPlatformTenantByIdFromApi(tenantId: string) {
  return apiRequest<ApiResponse<PlatformTenant>>(`/platform/tenants/${tenantId}`).then((response) => response.data);
}

export function createPlatformTenantFromApi(input: CreateTenantInput) {
  return apiRequest<ApiResponse<PlatformTenant>>("/platform/tenants", {
    method: "POST",
    body: input,
  }).then((response) => response.data);
}

export function updatePlatformTenantFromApi(tenantId: string, input: UpdateTenantInput) {
  return apiRequest<ApiResponse<PlatformTenant>>(`/platform/tenants/${tenantId}`, {
    method: "PATCH",
    body: input,
  }).then((response) => response.data);
}

export function updatePlatformTenantStatusFromApi(tenantId: string, status: PlatformTenantStatus) {
  return apiRequest<ApiResponse<PlatformTenant>>(`/platform/tenants/${tenantId}/status`, {
    method: "PATCH",
    body: { status },
  }).then((response) => response.data);
}

export function listPlatformTenantModulesFromApi(tenantId: string) {
  return apiRequest<ApiResponse<PlatformModule[]>>(`/platform/tenants/${tenantId}/modules`).then((response) => response.data);
}

export function updatePlatformTenantModulesFromApi(tenantId: string, enabledModules: string[]) {
  return apiRequest<ApiResponse<PlatformModule[]>>(`/platform/tenants/${tenantId}/modules`, {
    method: "PATCH",
    body: { enabledModules },
  }).then((response) => response.data);
}

export function createTenantAdminUserFromApi(tenantId: string, input: CreateTenantAdminInput) {
  return apiRequest<ApiResponse<PlatformTenant>>(`/platform/tenants/${tenantId}/admin-user`, {
    method: "POST",
    body: input,
  }).then((response) => response.data);
}
