import { isMockMode } from "../../config/env";
import {
  createPlatformTenantFromApi,
  createTenantAdminUserFromApi,
  getPlatformBillingProfileFromApi,
  getPlatformTenantByIdFromApi,
  listPlatformEconomicGroupsFromApi,
  listPlatformPlansFromApi,
  listPlatformTenantModulesFromApi,
  listPlatformTenantsFromApi,
  putPlatformBillingProfileFromApi,
  putPlatformSubscriptionFromApi,
  updatePlatformTenantFromApi,
  updatePlatformTenantModulesFromApi,
  updatePlatformTenantStatusFromApi,
} from "./platform.adapter";
import type { CreateTenantAdminInput, CreateTenantInput, PlatformBillingProfileInput, UpdateTenantInput, UpdateTenantStatusInput } from "./platform.types";

function unavailable(): never { throw new Error("Ação indisponível no modo demonstração."); }

export async function listPlatformTenants() { return isMockMode() ? [] : listPlatformTenantsFromApi(); }
export async function getPlatformTenantById(tenantId: string) { if (isMockMode()) return unavailable(); return getPlatformTenantByIdFromApi(tenantId); }
export async function createPlatformTenant(input: CreateTenantInput) { if (isMockMode()) return unavailable(); return createPlatformTenantFromApi(input); }
export async function updatePlatformTenant(tenantId: string, input: UpdateTenantInput) { if (isMockMode()) return unavailable(); return updatePlatformTenantFromApi(tenantId, input); }
export async function updatePlatformTenantStatus(tenantId: string, input: UpdateTenantStatusInput) { if (isMockMode()) return unavailable(); return updatePlatformTenantStatusFromApi(tenantId, input); }
export async function listPlatformTenantModules(tenantId: string) { return isMockMode() ? [] : listPlatformTenantModulesFromApi(tenantId); }
export async function updatePlatformTenantModules(tenantId: string, enabledModules: string[]) { if (isMockMode()) return unavailable(); return updatePlatformTenantModulesFromApi(tenantId, enabledModules); }
export async function createTenantAdminUser(tenantId: string, input: CreateTenantAdminInput) { if (isMockMode()) return unavailable(); return createTenantAdminUserFromApi(tenantId, input); }
export async function listPlatformEconomicGroups() { return isMockMode() ? [] : listPlatformEconomicGroupsFromApi(); }
export async function listPlatformPlans() { return isMockMode() ? [] : listPlatformPlansFromApi(); }
export async function putPlatformSubscription(tenantId: string, planCode: string, validFrom: string) { if (isMockMode()) return unavailable(); return putPlatformSubscriptionFromApi(tenantId, { planCode, validFrom }); }
export async function getPlatformBillingProfile(tenantId: string) { if (isMockMode()) return unavailable(); return getPlatformBillingProfileFromApi(tenantId); }
export async function putPlatformBillingProfile(tenantId: string, input: PlatformBillingProfileInput) { if (isMockMode()) return unavailable(); return putPlatformBillingProfileFromApi(tenantId, input); }
