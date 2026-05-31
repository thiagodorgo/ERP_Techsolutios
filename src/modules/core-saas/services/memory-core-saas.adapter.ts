import type { RoleDefinition } from "../permissions/catalog.js";
import type {
  AuditEvent,
  AuthenticatedActor,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  Tenant,
  User,
} from "../types/core-saas.types.js";
import { CoreSaasRegistry } from "./core-saas.service.js";
import type { ICoreSaasService } from "./core-saas-service.interface.js";

export class MemoryCoreSaasAdapter implements ICoreSaasService {
  constructor(private readonly registry: CoreSaasRegistry) {}

  async createTenant(input: CreateTenantInput, actor?: AuthenticatedActor): Promise<Tenant> {
    return this.registry.createTenant(input, actor);
  }

  async listTenantsForTenant(tenantId: string, options?: ListTenantOptions): Promise<Tenant[]> {
    return this.registry.listTenantsForTenant(tenantId, options);
  }

  async getTenantForActor(tenantId: string, actorTenantId: string): Promise<Tenant> {
    return this.registry.getTenantForActor(tenantId, actorTenantId);
  }

  async createUser(input: CreateUserInput, actor?: AuthenticatedActor): Promise<User> {
    return this.registry.createUser(input, actor);
  }

  async listUsersForTenant(tenantId: string): Promise<User[]> {
    return this.registry.listUsersForTenant(tenantId);
  }

  async getUserForTenant(userId: string, tenantId: string): Promise<User> {
    return this.registry.getUserForTenant(userId, tenantId);
  }

  async listRoles(): Promise<RoleDefinition[]> {
    return this.registry.listRoles();
  }

  async getRoleDefinition(role: string): Promise<RoleDefinition> {
    return this.registry.getRoleDefinition(role);
  }

  async getAuditEventsForTenant(tenantId: string): Promise<AuditEvent[]> {
    return this.registry.getAuditEventsForTenant(tenantId);
  }
}
