import type { CreatePlatformTenantDto, PlatformTenant, PlatformTenantStatus, UpdatePlatformTenantDto } from "./platform.types.js";

// O dublê começa vazio: cadastros de demonstração não são fonte de verdade do produto.
const initialTenants: PlatformTenant[] = [];

export class PlatformTenantsRepository {
  private tenants = [...initialTenants];

  list(): PlatformTenant[] {
    return this.tenants;
  }

  findById(tenantId: string): PlatformTenant | undefined {
    return this.tenants.find((tenant) => tenant.id === tenantId);
  }

  create(input: CreatePlatformTenantDto): PlatformTenant {
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

    this.tenants = [tenant, ...this.tenants];

    return tenant;
  }

  update(tenantId: string, input: UpdatePlatformTenantDto): PlatformTenant | undefined {
    this.tenants = this.tenants.map((tenant) => (tenant.id === tenantId ? { ...tenant, ...input } : tenant));

    return this.findById(tenantId);
  }

  updateStatus(tenantId: string, status: PlatformTenantStatus): PlatformTenant | undefined {
    return this.update(tenantId, { status });
  }

  updateModules(tenantId: string, enabledModules: readonly string[]): PlatformTenant | undefined {
    this.tenants = this.tenants.map((tenant) => (tenant.id === tenantId ? { ...tenant, enabledModules: [...enabledModules] } : tenant));

    return this.findById(tenantId);
  }

  createAdminUser(tenantId: string, input: { readonly name: string; readonly email: string }): PlatformTenant | undefined {
    this.tenants = this.tenants.map((tenant) =>
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

    return this.findById(tenantId);
  }
}
