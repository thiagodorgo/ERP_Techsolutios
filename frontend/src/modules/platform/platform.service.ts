import { buildTenantModules, mockPlatformTenants } from "./platform.mock";
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
import type {
  CreateTenantAdminInput,
  CreateTenantInput,
  PlatformTenant,
  PlatformTenantStatus,
  UpdateTenantInput,
} from "./platform.types";

const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";
let tenants = [...mockPlatformTenants];

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  if (!useMocks) return listPlatformTenantsFromApi();
  await wait();
  return tenants;
}

export async function getPlatformTenantById(tenantId: string): Promise<PlatformTenant> {
  if (!useMocks) return getPlatformTenantByIdFromApi(tenantId);
  await wait();
  return findTenant(tenantId);
}

export async function createPlatformTenant(input: CreateTenantInput): Promise<PlatformTenant> {
  if (!useMocks) return createPlatformTenantFromApi(input);
  await wait();
  const tenant: PlatformTenant = {
    id: `pten-${input.slug}`,
    name: input.name,
    slug: input.slug,
    plan: input.plan,
    status: input.status ?? "pending",
    activeUsers: input.adminEmail ? 1 : 0,
    enabledModules: ["dashboard", "users", "tenant-admin"],
    createdAt: new Date().toISOString(),
    adminUser: input.adminEmail
      ? {
          id: `adm-${input.slug}`,
          name: input.adminName ?? "Administrador",
          email: input.adminEmail,
        }
      : undefined,
    usageSummary: {
      workOrders: 0,
      storageGb: 0,
      apiCalls: 0,
    },
  };
  tenants = [tenant, ...tenants];
  return tenant;
}

export async function updatePlatformTenant(tenantId: string, input: UpdateTenantInput): Promise<PlatformTenant> {
  if (!useMocks) return updatePlatformTenantFromApi(tenantId, input);
  await wait();
  tenants = tenants.map((tenant) => (tenant.id === tenantId ? { ...tenant, ...input } : tenant));
  return findTenant(tenantId);
}

export async function updatePlatformTenantStatus(tenantId: string, status: PlatformTenantStatus): Promise<PlatformTenant> {
  if (!useMocks) return updatePlatformTenantStatusFromApi(tenantId, status);
  return updatePlatformTenant(tenantId, { status });
}

export async function listPlatformTenantModules(tenantId: string) {
  if (!useMocks) return listPlatformTenantModulesFromApi(tenantId);
  await wait();
  return buildTenantModules(findTenant(tenantId));
}

export async function updatePlatformTenantModules(tenantId: string, enabledModules: string[]) {
  if (!useMocks) return updatePlatformTenantModulesFromApi(tenantId, enabledModules);
  await wait();
  tenants = tenants.map((tenant) => (tenant.id === tenantId ? { ...tenant, enabledModules } : tenant));
  return buildTenantModules(findTenant(tenantId));
}

export async function createTenantAdminUser(tenantId: string, input: CreateTenantAdminInput): Promise<PlatformTenant> {
  if (!useMocks) return createTenantAdminUserFromApi(tenantId, input);
  await wait();
  tenants = tenants.map((tenant) =>
    tenant.id === tenantId
      ? {
          ...tenant,
          activeUsers: Math.max(tenant.activeUsers, 1),
          adminUser: {
            id: `adm-${tenant.slug}`,
            name: input.name,
            email: input.email,
          },
        }
      : tenant,
  );
  return findTenant(tenantId);
}

function findTenant(tenantId: string): PlatformTenant {
  const tenant = tenants.find((item) => item.id === tenantId);

  if (!tenant) {
    throw new Error("Tenant nao encontrado.");
  }

  return tenant;
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}
