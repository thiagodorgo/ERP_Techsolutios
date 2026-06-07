export type PlatformTenantStatus = "active" | "suspended" | "pending";

export type PlatformPlan = "starter" | "professional" | "enterprise";

export type PlatformModuleCategory = "MVP" | "Fase 2" | "Enterprise";

export type PlatformModuleStatus = "enabled" | "disabled" | "blocked_by_plan";

export type PlatformTenant = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: PlatformPlan;
  readonly status: PlatformTenantStatus;
  readonly activeUsers: number;
  readonly enabledModules: readonly string[];
  readonly createdAt: string;
  readonly lastActivityAt?: string;
  readonly adminUser?: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
  };
  readonly usageSummary?: {
    readonly workOrders: number;
    readonly storageGb: number;
    readonly apiCalls: number;
  };
};

export type PlatformModule = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly status: PlatformModuleStatus;
  readonly availableInPlan: boolean;
  readonly category: PlatformModuleCategory;
};

export type CreatePlatformTenantDto = {
  readonly name: string;
  readonly slug: string;
  readonly plan: PlatformPlan;
  readonly status?: PlatformTenantStatus;
  readonly adminName?: string;
  readonly adminEmail?: string;
};

export type UpdatePlatformTenantDto = {
  readonly name?: string;
  readonly plan?: PlatformPlan;
  readonly status?: PlatformTenantStatus;
};

export type UpdatePlatformTenantModulesDto = {
  readonly enabledModules: readonly string[];
};

export type CreateTenantAdminDto = {
  readonly name: string;
  readonly email: string;
};
