import { apiData } from "../../services/api/client";
import type {
  CreatePlatformOrganizationResult,
  CreateTenantAdminInput,
  CreateTenantAdminResult,
  CreateTenantInput,
  PlatformBillingProfile,
  PlatformBillingProfileInput,
  PlatformCatalogPlan,
  PlatformEconomicGroup,
  PlatformModule,
  PlatformOrganization,
  UpdateTenantInput,
  UpdateTenantStatusInput,
} from "./platform.types";

export function listPlatformTenantsFromApi() { return apiData<PlatformOrganization[]>("/platform/tenants"); }
export function getPlatformTenantByIdFromApi(tenantId: string) { return apiData<PlatformOrganization>(`/platform/tenants/${encodeURIComponent(tenantId)}`); }

export function createPlatformTenantFromApi(input: CreateTenantInput) {
  return apiData<CreatePlatformOrganizationResult>("/platform/tenants", { method: "POST", body: input });
}

export function updatePlatformTenantFromApi(tenantId: string, input: UpdateTenantInput) {
  return apiData<PlatformOrganization>(`/platform/tenants/${encodeURIComponent(tenantId)}`, { method: "PATCH", body: input });
}

export function updatePlatformTenantStatusFromApi(tenantId: string, input: UpdateTenantStatusInput) {
  return apiData<PlatformOrganization>(`/platform/tenants/${encodeURIComponent(tenantId)}/status`, { method: "PATCH", body: input });
}

export function listPlatformTenantModulesFromApi(tenantId: string) { return apiData<PlatformModule[]>(`/platform/tenants/${encodeURIComponent(tenantId)}/modules`); }
export function updatePlatformTenantModulesFromApi(tenantId: string, enabledModules: string[]) { return apiData<PlatformModule[]>(`/platform/tenants/${encodeURIComponent(tenantId)}/modules`, { method: "PATCH", body: { enabledModules } }); }
export function createTenantAdminUserFromApi(tenantId: string, input: CreateTenantAdminInput) { return apiData<CreateTenantAdminResult>(`/platform/tenants/${encodeURIComponent(tenantId)}/admin-user`, { method: "POST", body: input }); }
export function listPlatformEconomicGroupsFromApi() { return apiData<PlatformEconomicGroup[]>("/platform/billing/economic-groups"); }
export function listPlatformPlansFromApi() { return apiData<PlatformCatalogPlan[]>("/platform/billing/plans"); }
export function putPlatformSubscriptionFromApi(tenantId: string, input: { readonly planCode: string; readonly validFrom: string }) { return apiData<unknown>(`/platform/billing/tenants/${encodeURIComponent(tenantId)}/subscription`, { method: "PUT", body: input }); }
export function getPlatformBillingProfileFromApi(tenantId: string) { return apiData<PlatformBillingProfile>(`/platform/billing/tenants/${encodeURIComponent(tenantId)}/billing-profile`); }
export function putPlatformBillingProfileFromApi(tenantId: string, input: PlatformBillingProfileInput) { return apiData<PlatformBillingProfile>(`/platform/billing/tenants/${encodeURIComponent(tenantId)}/billing-profile`, { method: "PUT", body: input }); }
