import { isMockMode } from "../../config/env";
import {
  createPlatformTenantFromApi,
  createTenantAdminUserFromApi,
  getPlatformTenantByIdFromApi,
  listPlatformTenantModulesFromApi,
  listPlatformTenantsFromApi,
  updatePlatformTenantFromApi,
  updatePlatformTenantModulesFromApi,
  updatePlatformTenantStatusFromApi,
} from "./platform.adapter";
import type { CreateTenantAdminInput, CreateTenantInput, PlatformTenant, PlatformTenantStatus, UpdateTenantInput } from "./platform.types";

function unavailable(): never { throw new Error("Ação indisponível no modo demonstração."); }

export async function listPlatformTenants(): Promise<PlatformTenant[]> { return isMockMode() ? [] : listPlatformTenantsFromApi(); }
export async function getPlatformTenantById(tenantId: string): Promise<PlatformTenant> { if (isMockMode()) throw new Error("Organização indisponível no modo demonstração."); return getPlatformTenantByIdFromApi(tenantId); }
export async function createPlatformTenant(input: CreateTenantInput): Promise<PlatformTenant> { if (isMockMode()) return unavailable(); return createPlatformTenantFromApi(input); }
export async function updatePlatformTenant(tenantId: string, input: UpdateTenantInput): Promise<PlatformTenant> { if (isMockMode()) return unavailable(); return updatePlatformTenantFromApi(tenantId, input); }
export async function updatePlatformTenantStatus(tenantId: string, status: PlatformTenantStatus): Promise<PlatformTenant> { if (isMockMode()) return unavailable(); return updatePlatformTenantStatusFromApi(tenantId, status); }
export async function listPlatformTenantModules(tenantId: string) { return isMockMode() ? [] : listPlatformTenantModulesFromApi(tenantId); }
export async function updatePlatformTenantModules(tenantId: string, enabledModules: string[]) { if (isMockMode()) return unavailable(); return updatePlatformTenantModulesFromApi(tenantId, enabledModules); }
export async function createTenantAdminUser(tenantId: string, input: CreateTenantAdminInput): Promise<PlatformTenant> { if (isMockMode()) return unavailable(); return createTenantAdminUserFromApi(tenantId, input); }
