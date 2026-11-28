import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import { parseBillingProfileInput } from "../subscription-billing/billing-profile/billing-profile.js";
import { CANONICAL_MODULE_KEYS } from "./platform-modules.service.js";
import type { CreatePlatformTenantDto, CreateTenantAdminDto, PlatformPlan, UpdatePlatformTenantDto, UpdatePlatformTenantModulesDto, UpdateTenantStatusDto } from "./platform.types.js";

const PLANS = new Set<PlatformPlan>(["starter", "professional", "business", "enterprise"]);
const MODULES_MAX = 50;
const CANONICAL_MODULES: ReadonlySet<string> = new Set(CANONICAL_MODULE_KEYS);
const CREATE_FIELDS = new Set(["name", "group", "profile", "plan", "admin"]);
const STATUS_REASONS = new Set<UpdateTenantStatusDto["reason"]>(["nonpayment", "customer_request", "security", "other"]);

export function parseCreatePlatformTenantDto(body: Record<string, unknown>): CreatePlatformTenantDto {
  assertKnownFields(body, CREATE_FIELDS);
  const name = requiredText(body.name, "name");
  const groupBody = object(body.group, "group");
  assertKnownFields(groupBody, new Set(["id", "name"]));
  const groupId = optionalText(groupBody.id);
  const groupName = optionalText(groupBody.name);
  if ((groupId ? 1 : 0) + (groupName ? 1 : 0) !== 1) bad("invalid_group", "group must contain exactly id or name.");
  const profileBody = body.profile === undefined ? undefined : object(body.profile, "profile");
  const planBody = body.plan === undefined ? undefined : object(body.plan, "plan");
  const adminBody = body.admin === undefined ? undefined : object(body.admin, "admin");
  const planCode = planBody ? requiredText(planBody.code, "plan.code") : undefined;
  if (planCode && !PLANS.has(planCode as PlatformPlan)) bad("invalid_plan", "plan.code is invalid.");
  const admin = adminBody ? { name: requiredText(adminBody.name, "admin.name"), email: requiredText(adminBody.email, "admin.email") } : undefined;
  if (admin) assertEmail(admin.email);
  return { name, group: groupId ? { id: groupId } : { name: groupName! }, ...(profileBody ? { profile: parseBillingProfileInput(profileBody) } : {}), ...(planCode ? { plan: { code: planCode as PlatformPlan } } : {}), ...(admin ? { admin } : {}) };
}
export function parseUpdatePlatformTenantDto(body: Record<string, unknown>): UpdatePlatformTenantDto {
  const forbidden = Object.keys(body).find((key) => key !== "name");
  if (forbidden) throw new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "field_not_editable_here", `Field ${forbidden} is not editable here.`);
  return { name: requiredText(body.name, "name") };
}
export function parseUpdateTenantStatusDto(body: Record<string, unknown>): UpdateTenantStatusDto {
  assertKnownFields(body, new Set(["status", "reason"]));
  const status = requiredText(body.status, "status");
  const reason = requiredText(body.reason, "reason");
  if (status !== "active" && status !== "suspended") bad("invalid_status_transition", "status must be active or suspended.", 422);
  if (!STATUS_REASONS.has(reason as UpdateTenantStatusDto["reason"])) bad("reason_required", "reason is required.");
  return { status, reason: reason as UpdateTenantStatusDto["reason"] };
}
// B-PLANOS-MODULOS — a lista é o estado FINAL das áreas da organização e substitui a atual. Lista fechada: corpo fora
// da forma (ausente, não lista, item que não é texto, mais de 50 itens) é 400 `invalid_field`, e chave que não é
// canônica do catálogo, inclusive apelido (`work-orders`, `checklists`), é 422 `module_unknown`. Nunca vira lista
// vazia: a lista vazia desliga tudo, então só a lista vazia ENVIADA pode fazer isso. Repetidos valem uma vez; a saída
// vem na ordem do catálogo.
export function parseUpdatePlatformTenantModulesDto(body: Record<string, unknown>): UpdatePlatformTenantModulesDto {
  assertKnownFields(body, new Set(["enabledModules"]));
  const list: unknown = body.enabledModules;
  if (!Array.isArray(list) || list.length > MODULES_MAX) bad("invalid_field", `enabledModules must be a list of up to ${MODULES_MAX} module keys.`);
  if (!list.every((item): item is string => typeof item === "string")) bad("invalid_field", "enabledModules must contain only module keys.");
  const wanted = new Set(list);
  if ([...wanted].some((key) => !CANONICAL_MODULES.has(key))) bad("module_unknown", "enabledModules has a key outside the module catalog.", 422);
  return { enabledModules: CANONICAL_MODULE_KEYS.filter((key) => wanted.has(key)) };
}
export function parseCreateTenantAdminDto(body: Record<string, unknown>): CreateTenantAdminDto {
  assertKnownFields(body, new Set(["name", "email"]));
  const result = { name: requiredText(body.name, "name"), email: requiredText(body.email, "email") };
  assertEmail(result.email); return result;
}
function assertKnownFields(body: Record<string, unknown>, fields: ReadonlySet<string>): void { const unknown = Object.keys(body).find((key) => !fields.has(key)); if (unknown) bad("unknown_field", `Unknown field: ${unknown}.`); }
function object(value: unknown, field: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) bad("invalid_field", `${field} must be an object.`); return value as Record<string, unknown>; }
function requiredText(value: unknown, field: string): string { const text = optionalText(value); if (!text) bad("invalid_field", `${field} is required.`); return text!; }
function optionalText(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function assertEmail(value: string): void { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) bad("invalid_field", "email is invalid."); }
function bad(reason: string, message: string, status = 400): never { throw new CoreSaasError(status, status === 422 ? "UNPROCESSABLE_ENTITY" : "BAD_REQUEST", reason, message); }
