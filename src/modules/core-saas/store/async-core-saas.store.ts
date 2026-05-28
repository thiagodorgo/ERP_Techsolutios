import type { Role } from "../permissions/catalog.js";
import type {
  AuditEvent,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  Tenant,
  User,
} from "../types/core-saas.types.js";

export type CreatePersistentAuditEventInput = Omit<AuditEvent, "id" | "timestamp">;

export type AsyncCoreSaasStore = {
  createTenant(input: CreateTenantInput): Promise<Tenant>;
  findTenantById(tenantId: string): Promise<Tenant | undefined>;
  listTenants(options?: ListTenantOptions): Promise<Tenant[]>;
  listTenantsForTenant(tenantId: string, options?: ListTenantOptions): Promise<Tenant[]>;
  createUser(input: CreateUserInput): Promise<User>;
  findUserByIdForTenant(userId: string, tenantId: string): Promise<User | undefined>;
  listUsersByTenant(tenantId: string): Promise<User[]>;
  listRolesByUserForTenant(userId: string, tenantId: string): Promise<Role[]>;
  assignRoleToUser(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly role: Role;
    readonly branchId?: string | null;
  }): Promise<void>;
  saveAuditEvent(input: CreatePersistentAuditEventInput): Promise<AuditEvent>;
  listAuditEventsByTenant(tenantId: string): Promise<AuditEvent[]>;
};
