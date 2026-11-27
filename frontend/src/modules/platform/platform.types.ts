export type PlatformTenantStatus = "active" | "suspended" | "pending";
export type WritablePlatformTenantStatus = Extract<PlatformTenantStatus, "active" | "suspended">;
export type PlatformStatusReason = "nonpayment" | "customer_request" | "security" | "other";
export type PlatformPlan = "starter" | "professional" | "business" | "enterprise";
export type PlatformModuleCategory = "MVP" | "Fase 2" | "Enterprise";
export type PlatformModuleStatus = "enabled" | "disabled" | "blocked_by_plan";
export type PlatformSetupMissing = "plan" | "admin" | "profile";

export type PlatformOrganization = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: PlatformTenantStatus;
  readonly createdAt: string;
  readonly system: boolean;
  readonly group: { readonly id: string; readonly name: string } | null;
  readonly setup: { readonly complete: boolean; readonly missing: readonly PlatformSetupMissing[] };
};

/** Nome legado mantido somente como alias, sem campos fictícios. */
export type PlatformTenant = PlatformOrganization;

export type PlatformModule = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly status: PlatformModuleStatus;
  readonly availableInPlan: boolean;
  readonly category: PlatformModuleCategory;
};

export type PlatformBillingAddress = {
  readonly postalCode: string | null;
  readonly street: string | null;
  readonly number: string | null;
  readonly district: string | null;
  readonly city: string | null;
  readonly cityIbge: string | null;
  readonly state: string | null;
};

export type PlatformBillingProfileInput = {
  readonly legalName: string | null;
  readonly document: string | null;
  readonly email: string | null;
  readonly address: PlatformBillingAddress;
  readonly paymentMethod: "pix" | "boleto" | "credit_card" | "debit_card" | "undefined";
};

export type CreateTenantInput = {
  readonly name: string;
  readonly group: { readonly id: string } | { readonly name: string };
  readonly profile?: PlatformBillingProfileInput;
  readonly plan?: { readonly code: PlatformPlan };
  readonly admin?: CreateTenantAdminInput;
};

export type UpdateTenantInput = { readonly name: string };
export type UpdateTenantStatusInput = { readonly status: WritablePlatformTenantStatus; readonly reason: PlatformStatusReason };
export type CreateTenantAdminInput = { readonly name: string; readonly email: string };
export type ProvisioningStep = { readonly status: "done" | "skipped" | "failed"; readonly reason?: string };

export type CreatePlatformOrganizationResult = {
  readonly organization: PlatformOrganization;
  readonly provisioning: {
    readonly group: ProvisioningStep;
    readonly profile: ProvisioningStep;
    readonly subscription: ProvisioningStep;
    readonly admin: ProvisioningStep;
  };
  readonly temporaryPassword?: string;
};

export type CreateTenantAdminResult = {
  readonly user: { readonly id: string; readonly name: string; readonly email: string };
  readonly temporaryPassword?: string;
};

export type PlatformCatalogPlan = {
  readonly id: string;
  readonly code: PlatformPlan;
  readonly name: string;
  readonly active: boolean;
  readonly currentVersion: { readonly version: number; readonly validFrom: string } | null;
};

export type PlatformEconomicGroup = { readonly id: string; readonly name: string; readonly memberCount: number };
export type PlatformBillingProfile = PlatformBillingProfileInput & { readonly complete: boolean; readonly missing: readonly string[] };
