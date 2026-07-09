import type { Role } from "../permissions/catalog.js";
import type {
  AuditEvent,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  Tenant,
  User,
  UserStatus,
} from "../types/core-saas.types.js";

export type CreatePersistentAuditEventInput = Omit<AuditEvent, "id" | "timestamp">;

// Persistence-facing shape: the service already validated fields and resolved the
// user tenant-scoped, so roles arrive as canonical Role values and status as the union.
export type UpdateUserPersistenceInput = {
  readonly userId: string;
  readonly tenantId: string;
  readonly name?: string;
  readonly roles?: readonly Role[];
  readonly status?: UserStatus;
  readonly actorUserId?: string;
};

export type AsyncCoreSaasStore = {
  createTenant(input: CreateTenantInput): Promise<Tenant>;
  findTenantById(tenantId: string): Promise<Tenant | undefined>;
  listTenants(options?: ListTenantOptions): Promise<Tenant[]>;
  listTenantsForTenant(tenantId: string, options?: ListTenantOptions): Promise<Tenant[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(input: UpdateUserPersistenceInput): Promise<User>;
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
