import type { CreatePlatformTenantDto, PlatformTenant, PlatformTenantStatus, UpdatePlatformTenantDto } from "./platform.types.js";

const initialTenants: PlatformTenant[] = [
  {
    id: "pten-industrial-01",
    name: "Techsolutions Industrial",
    slug: "techsolutions-industrial",
    plan: "professional",
    status: "active",
    activeUsers: 84,
    enabledModules: ["dashboard", "users", "tenant-admin", "inventory", "approvals", "finance", "mobile"],
    createdAt: "2026-01-10T12:00:00.000Z",
    lastActivityAt: "2026-06-02T09:40:00.000Z",
    adminUser: {
      id: "adm-industrial-01",
      name: "Carlos Almeida",
      email: "carlos.almeida@techsolutions.example",
    },
    usageSummary: {
      workOrders: 1248,
      storageGb: 84,
      apiCalls: 39240,
    },
  },
  {
    id: "pten-mining-02",
    name: "Minas Norte Service",
    slug: "minas-norte-service",
    plan: "starter",
    status: "suspended",
    activeUsers: 18,
    enabledModules: ["dashboard", "users", "tenant-admin", "inventory"],
    createdAt: "2026-02-18T10:20:00.000Z",
    lastActivityAt: "2026-05-31T17:10:00.000Z",
    adminUser: {
      id: "adm-mining-02",
      name: "Renata Borges",
      email: "renata.borges@minasnorte.example",
    },
    usageSummary: {
      workOrders: 206,
      storageGb: 12,
      apiCalls: 8320,
    },
  },
];

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
