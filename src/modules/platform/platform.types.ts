import type { BillingProfileInput } from "../subscription-billing/billing-profile/billing-profile.js";

export type PlatformTenantStatus = "active" | "suspended" | "pending";
export type PlatformPlan = "starter" | "professional" | "business" | "enterprise";
// B-PLANOS-MODULOS (D-PLANOS-MODULOS-PORTA-REAL): "plano" de organização, no sistema, É a assinatura. O mapa de
// código `modulesByPlan` saiu; o que a leitura do painel precisa saber é se a organização tem assinatura em vigor
// (quem manda nos módulos dela é o plano contratado) ou não (a plataforma liga e desliga área pela porta real).
export type PlatformTenant = { readonly enabledModules: readonly string[]; readonly managedBySubscription: boolean };
export type PlatformModuleCategory = "MVP" | "Fase 2" | "Enterprise";
export type PlatformModuleStatus = "enabled" | "disabled" | "blocked_by_plan";
export type PlatformOrganizationRecord = { readonly id: string; readonly name: string; readonly slug: string; readonly status: string; readonly modules: readonly string[]; readonly createdAt: Date; readonly updatedAt: Date };
export type PlatformOrganization = {
  readonly id: string; readonly name: string; readonly slug: string; readonly status: PlatformTenantStatus;
  readonly createdAt: string; readonly system: boolean;
  readonly group: { readonly id: string; readonly name: string } | null;
  readonly setup: { readonly complete: boolean; readonly missing: readonly string[] };
};
export type CreatePlatformTenantDto = {
  readonly name: string; readonly group: { readonly id: string } | { readonly name: string };
  readonly profile?: BillingProfileInput; readonly plan?: { readonly code: PlatformPlan };
  readonly admin?: { readonly name: string; readonly email: string };
};
export type UpdatePlatformTenantDto = { readonly name: string };
export type UpdateTenantStatusDto = { readonly status: "active" | "suspended"; readonly reason: "nonpayment" | "customer_request" | "security" | "other" };
export type UpdatePlatformTenantModulesDto = { readonly enabledModules: readonly string[] };
export type CreateTenantAdminDto = { readonly name: string; readonly email: string };
export type PlatformModule = { readonly key: string; readonly name: string; readonly description: string; readonly status: PlatformModuleStatus; readonly availableInPlan: boolean; readonly category: PlatformModuleCategory };
export type ProvisioningStep = { readonly status: "done" | "skipped" | "failed"; readonly reason?: string };
export type CreatePlatformOrganizationResult = {
  readonly organization: PlatformOrganization;
  readonly provisioning: { readonly group: ProvisioningStep; readonly profile: ProvisioningStep; readonly subscription: ProvisioningStep; readonly admin: ProvisioningStep };
  readonly temporaryPassword?: string;
};
