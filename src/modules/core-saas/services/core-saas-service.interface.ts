import type { RoleDefinition } from "../permissions/catalog.js";
import type {
  AuditEvent,
  AuthenticatedActor,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  Tenant,
  TenantMembership,
  User,
} from "../types/core-saas.types.js";

export type ICoreSaasService = {
  createTenant(input: CreateTenantInput, actor?: AuthenticatedActor): Promise<Tenant>;
  listTenantsForTenant(tenantId: string, options?: ListTenantOptions): Promise<Tenant[]>;
  getTenantForActor(tenantId: string, actorTenantId: string): Promise<Tenant>;

  createUser(input: CreateUserInput, actor?: AuthenticatedActor): Promise<User>;
  listUsersForTenant(tenantId: string): Promise<User[]>;
  getUserForTenant(userId: string, tenantId: string): Promise<User>;

  listRoles(): Promise<RoleDefinition[]>;
  getRoleDefinition(role: string): Promise<RoleDefinition>;

  listTenantsForUserEmail(email: string): Promise<TenantMembership[]>;

  getAuditEventsForTenant(tenantId: string): Promise<AuditEvent[]>;
};
