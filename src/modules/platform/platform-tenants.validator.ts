import type {
  CreatePlatformTenantDto,
  CreateTenantAdminDto,
  PlatformPlan,
  PlatformTenantStatus,
  UpdatePlatformTenantDto,
  UpdatePlatformTenantModulesDto,
} from "./platform.types.js";

const validPlans = new Set<PlatformPlan>(["starter", "professional", "enterprise"]);
const validStatuses = new Set<PlatformTenantStatus>(["active", "suspended", "pending"]);

export function parseCreatePlatformTenantDto(body: Record<string, unknown>): CreatePlatformTenantDto {
  const name = readRequiredString(body.name, "name");
  const slug = readRequiredString(body.slug, "slug");
  const plan = readPlan(body.plan);
  const status = body.status === undefined ? undefined : readStatus(body.status);
  const adminName = readOptionalString(body.adminName);
  const adminEmail = readOptionalString(body.adminEmail);

  assertSlug(slug);

  if (adminEmail) {
    assertEmail(adminEmail);
  }

  return {
    name,
    slug,
    plan,
    ...(status ? { status } : {}),
    ...(adminName ? { adminName } : {}),
    ...(adminEmail ? { adminEmail } : {}),
  };
}

export function parseUpdatePlatformTenantDto(body: Record<string, unknown>): UpdatePlatformTenantDto {
  const name = readOptionalString(body.name);
  const plan = body.plan === undefined ? undefined : readPlan(body.plan);
  const status = body.status === undefined ? undefined : readStatus(body.status);

  return {
    ...(name ? { name } : {}),
    ...(plan ? { plan } : {}),
    ...(status ? { status } : {}),
  };
}

export function parseUpdateTenantStatusDto(body: Record<string, unknown>): PlatformTenantStatus {
  return readStatus(body.status);
}

export function parseUpdatePlatformTenantModulesDto(body: Record<string, unknown>): UpdatePlatformTenantModulesDto {
  const enabledModules = Array.isArray(body.enabledModules)
    ? body.enabledModules.filter((item): item is string => typeof item === "string")
    : [];

  return {
    enabledModules,
  };
}

export function parseCreateTenantAdminDto(body: Record<string, unknown>): CreateTenantAdminDto {
  const name = readRequiredString(body.name, "name");
  const email = readRequiredString(body.email, "email");

  assertEmail(email);

  return {
    name,
    email,
  };
}

function readRequiredString(value: unknown, field: string): string {
  const normalized = readOptionalString(value);

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPlan(value: unknown): PlatformPlan {
  if (typeof value === "string" && validPlans.has(value as PlatformPlan)) {
    return value as PlatformPlan;
  }

  throw new Error("Invalid platform plan.");
}

function readStatus(value: unknown): PlatformTenantStatus {
  if (typeof value === "string" && validStatuses.has(value as PlatformTenantStatus)) {
    return value as PlatformTenantStatus;
  }

  throw new Error("Invalid tenant status.");
}

function assertSlug(value: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error("slug must use lowercase letters, numbers and hyphens.");
  }
}

function assertEmail(value: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("email is invalid.");
  }
}
