export type PlatformTenantStatus = "active" | "suspended" | "pending";

export type PlatformPlan = "starter" | "professional" | "enterprise";

export type PlatformModuleCategory = "MVP" | "Fase 2" | "Enterprise";

export type PlatformModuleStatus = "enabled" | "disabled" | "blocked_by_plan";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  plan: PlatformPlan;
  status: PlatformTenantStatus;
  activeUsers: number;
  enabledModules: string[];
  createdAt: string;
  lastActivityAt?: string;
  adminUser?: {
    id: string;
    name: string;
    email: string;
  };
  usageSummary?: {
    workOrders: number;
    storageGb: number;
    apiCalls: number;
  };
};

export type PlatformModule = {
  key: string;
  name: string;
  description: string;
  status: PlatformModuleStatus;
  availableInPlan: boolean;
  category: PlatformModuleCategory;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  plan: PlatformPlan;
  status?: PlatformTenantStatus;
  adminName?: string;
  adminEmail?: string;
};

export type UpdateTenantInput = {
  name?: string;
  plan?: PlatformPlan;
  status?: PlatformTenantStatus;
};

export type CreateTenantAdminInput = {
  name: string;
  email: string;
};
