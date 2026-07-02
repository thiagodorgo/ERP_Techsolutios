import type {
  AuditEvent,
  ListTenantOptions,
  Tenant,
  User,
} from "../types/core-saas.types.js";

export type CoreSaasStore = {
  saveTenant(tenant: Tenant): Tenant;
  findTenantById(tenantId: string): Tenant | undefined;
  listTenants(options?: ListTenantOptions): Tenant[];
  saveUser(user: User): User;
  findUserById(userId: string): User | undefined;
  listUsersByTenant(tenantId: string): User[];
  listUsersByEmail(email: string): User[];
  saveAuditEvent(event: AuditEvent): AuditEvent;
  listAuditEventsByTenant(tenantId: string): AuditEvent[];
  clear(): void;
};

export class InMemoryCoreSaasStore implements CoreSaasStore {
  private readonly tenants = new Map<string, Tenant>();
  private readonly users = new Map<string, User>();
  private readonly auditEvents = new Map<string, AuditEvent>();

  saveTenant(tenant: Tenant): Tenant {
    this.tenants.set(tenant.id, cloneTenant(tenant));

    return cloneTenant(tenant);
  }

  findTenantById(tenantId: string): Tenant | undefined {
    const tenant = this.tenants.get(tenantId);

    return tenant ? cloneTenant(tenant) : undefined;
  }

  listTenants(options: ListTenantOptions = {}): Tenant[] {
    return [...this.tenants.values()]
      .filter((tenant) => !options.status || tenant.status === options.status)
      .map(cloneTenant);
  }

  saveUser(user: User): User {
    this.users.set(user.id, cloneUser(user));

    return cloneUser(user);
  }

  findUserById(userId: string): User | undefined {
    const user = this.users.get(userId);

    return user ? cloneUser(user) : undefined;
  }

  listUsersByTenant(tenantId: string): User[] {
    return [...this.users.values()]
      .filter((user) => user.tenantId === tenantId)
      .map(cloneUser);
  }

  listUsersByEmail(email: string): User[] {
    const normalized = email.trim().toLowerCase();

    return [...this.users.values()]
      .filter((user) => user.email === normalized)
      .map(cloneUser);
  }

  saveAuditEvent(event: AuditEvent): AuditEvent {
    this.auditEvents.set(event.id, cloneAuditEvent(event));

    return cloneAuditEvent(event);
  }

  listAuditEventsByTenant(tenantId: string): AuditEvent[] {
    return [...this.auditEvents.values()]
      .filter((event) => event.tenant_id === tenantId)
      .map(cloneAuditEvent);
  }

  clear(): void {
    this.tenants.clear();
    this.users.clear();
    this.auditEvents.clear();
  }
}

function cloneTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    modules: [...tenant.modules],
    createdAt: new Date(tenant.createdAt),
  };
}

function cloneUser(user: User): User {
  return {
    ...user,
    roles: [...user.roles],
    branchIds: [...user.branchIds],
    createdAt: new Date(user.createdAt),
  };
}

function cloneAuditEvent(event: AuditEvent): AuditEvent {
  return {
    ...event,
    timestamp: new Date(event.timestamp),
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}
