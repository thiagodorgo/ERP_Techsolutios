import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import { PlatformModulesService } from "./platform-modules.service.js";
import { PlatformTenantsRepository } from "./platform-tenants.repository.js";
import type {
  CreatePlatformTenantDto,
  CreateTenantAdminDto,
  PlatformModule,
  PlatformTenant,
  PlatformTenantStatus,
  UpdatePlatformTenantDto,
  UpdatePlatformTenantModulesDto,
} from "./platform.types.js";

export class PlatformTenantsService {
  constructor(
    private readonly tenants = new PlatformTenantsRepository(),
    private readonly modules = new PlatformModulesService(),
  ) {}

  listTenants(): PlatformTenant[] {
    return this.tenants.list();
  }

  getTenant(tenantId: string): PlatformTenant {
    return this.requireTenant(tenantId);
  }

  createTenant(input: CreatePlatformTenantDto): PlatformTenant {
    return this.tenants.create(input);
  }

  updateTenant(tenantId: string, input: UpdatePlatformTenantDto): PlatformTenant {
    const tenant = this.tenants.update(tenantId, input);

    if (!tenant) {
      throw notFound(tenantId);
    }

    return tenant;
  }

  updateTenantStatus(tenantId: string, status: PlatformTenantStatus): PlatformTenant {
    const tenant = this.tenants.updateStatus(tenantId, status);

    if (!tenant) {
      throw notFound(tenantId);
    }

    return tenant;
  }

  listTenantModules(tenantId: string): PlatformModule[] {
    return this.modules.listForTenant(this.requireTenant(tenantId));
  }

  updateTenantModules(tenantId: string, input: UpdatePlatformTenantModulesDto): PlatformModule[] {
    const tenant = this.tenants.updateModules(tenantId, input.enabledModules);

    if (!tenant) {
      throw notFound(tenantId);
    }

    return this.modules.listForTenant(tenant);
  }

  createTenantAdminUser(tenantId: string, input: CreateTenantAdminDto): PlatformTenant {
    const tenant = this.tenants.createAdminUser(tenantId, input);

    if (!tenant) {
      throw notFound(tenantId);
    }

    return tenant;
  }

  private requireTenant(tenantId: string): PlatformTenant {
    const tenant = this.tenants.findById(tenantId);

    if (!tenant) {
      throw notFound(tenantId);
    }

    return tenant;
  }
}

function notFound(tenantId: string): CoreSaasError {
  return new CoreSaasError(404, "NOT_FOUND", "platform_tenant_not_found", `Platform tenant not found: ${tenantId}`);
}
