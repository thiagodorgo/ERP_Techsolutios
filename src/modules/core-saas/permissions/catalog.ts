export const PERMISSION_CATALOG = [
  "platform:cloud-charge-rules:read",
  "platform:cloud-charge-rules:write",
  "platform:cloud-charges:read",
  "platform:cloud-charges:calculate",
  "platform:cloud-cost-allocation:read",
  "platform:cloud-cost-allocation:run",
  "platform:cloud-costs:read",
  "platform:cloud-costs:import",
  "platform:cloud-usage:read",
  "platform:dashboard:read",
  "platform:tenants:read",
  "platform:audit:read",
  "tenant.manage",
  "users.manage",
  "users.read",
  "users:read",
  "roles.manage",
  "audit.read",
  "audit:read",
  "dashboard:read",
  "tenant_settings:read",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:assign",
  "work_orders:status",
  "work_orders:cancel",
  "work_orders:delete",
  "field_location:read",
  "field_location:send",
  "field_location:history",
  "field_operator:read",
  "field_operator:action",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:update",
  "field_dispatch:cancel",
  "field_dispatch:reassign",
  "logistics:read",
  "logistics_routes:read",
  "billing:read",
  "invoices:read",
  "payments:read",
  "commissions:read",
  "commissions:read_own",
  "commissions:manage_policy",
  "commissions:calculate",
  "commissions:approve",
  "commissions:adjust",
  "commissions:settle",
  "commissions:audit",
  "expense_report:read",
  "expense_report:read_own",
  "expense_report:create",
  "expense_report:update",
  "expense_report:submit",
  "expense_report:approve_manager",
  "expense_report:approve_finance",
  "expense_report:return",
  "expense_report:reject",
  "expense_report:pay",
  "expense_policy:read",
  "expense_policy:manage",
  "expense_receipt:attach",
  "expense_sync:write",
  "expense_audit:read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
  "finance:read",
  "notifications:read",
  "notifications:update",
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
  "checklist_runs:create",
  "checklist_runs:update",
  "checklist_runs:complete",
  "checklist_runs:acknowledge",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const STANDARD_ROLES = [
  "super_admin",
  "tenant_admin",
  "manager",
  "field_dispatcher",
  "technician",
  "viewer",
] as const;

const LEGACY_ROLES = [
  "platform_admin",
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "auditor",
  "support",
] as const;

export const DEFAULT_ROLES = [...STANDARD_ROLES, ...LEGACY_ROLES] as const;

export type Role = (typeof DEFAULT_ROLES)[number];

export type RoleDefinition = {
  readonly role: Role;
  readonly permissions: readonly Permission[];
};

const TENANT_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(
  (permission) => !permission.startsWith("platform:"),
) as Permission[];

export const ROLE_PERMISSIONS = {
  super_admin: PERMISSION_CATALOG,
  tenant_admin: TENANT_ADMIN_PERMISSIONS,
  manager: [
    "dashboard:read",
    "users.read",
    "audit.read",
    "audit:read",
    "os.manage",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "notifications:update",
    "work_orders:read",
    "work_orders:create",
    "work_orders:update",
    "work_orders:assign",
    "work_orders:status",
    "work_orders:cancel",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_dispatch:read",
    "field_dispatch:create",
    "field_dispatch:update",
    "field_dispatch:cancel",
    "field_dispatch:reassign",
    "commissions:read",
    "commissions:manage_policy",
    "commissions:calculate",
    "commissions:approve",
    "expense_report:read",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_report:approve_manager",
    "expense_report:return",
    "expense_policy:read",
    "expense_receipt:attach",
    "expense_sync:write",
    "tenant_checklists:read",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
  ],
  technician: [
    "dashboard:read",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    "work_orders:read",
    "work_orders:update",
    "work_orders:status",
    "field_location:send",
    "commissions:read_own",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_receipt:attach",
    "expense_sync:write",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
  ],
  field_dispatcher: [
    "dashboard:read",
    "os.read",
    "work_orders:read",
    "work_orders:create",
    "work_orders:assign",
    "work_orders:status",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_operator:action",
    "field_dispatch:read",
    "field_dispatch:create",
    "field_dispatch:update",
    "field_dispatch:cancel",
    "field_dispatch:reassign",
    "notifications:read",
    "notifications:update",
  ],
  viewer: [
    "dashboard:read",
    "users.read",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "work_orders:read",
    "field_location:read",
    "field_operator:read",
    "field_dispatch:read",
    "tenant_checklists:read",
    "checklist_runs:read",
  ],
  platform_admin: PERMISSION_CATALOG,
  operator: [
    "dashboard:read",
    "os.manage",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    "work_orders:read",
    "work_orders:update",
    "work_orders:status",
    "field_location:send",
    "field_dispatch:read",
    "field_dispatch:update",
    "commissions:read_own",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_receipt:attach",
    "expense_sync:write",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
  ],
  finance: [
    "finance.manage",
    "finance.read",
    "os.read",
    "notifications:read",
    "notifications:update",
    "commissions:read",
    "commissions:calculate",
    "commissions:approve",
    "commissions:adjust",
    "commissions:settle",
    "commissions:audit",
    "expense_report:read",
    "expense_report:approve_finance",
    "expense_report:return",
    "expense_report:reject",
    "expense_report:pay",
    "expense_policy:read",
    "expense_audit:read",
  ],
  inventory: ["inventory.manage", "inventory.read", "os.read", "notifications:read", "notifications:update"],
  field_technician: [
    "dashboard:read",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    "work_orders:read",
    "work_orders:update",
    "work_orders:status",
    "field_location:send",
    "field_dispatch:read",
    "field_dispatch:update",
    "commissions:read_own",
  ],
  auditor: [
    "dashboard:read",
    "users.read",
    "audit.read",
    "audit:read",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "work_orders:read",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_dispatch:read",
    "commissions:read",
    "commissions:audit",
    "expense_report:read",
    "expense_policy:read",
    "expense_audit:read",
    "tenant_checklists:read",
    "checklist_runs:read",
  ],
  support: ["dashboard:read", "users.read", "audit.read", "audit:read", "os.read", "notifications:read", "tenant_checklists:read", "checklist_runs:read"],
} as const satisfies Record<Role, readonly Permission[]>;

const permissionCatalog = new Set<string>(PERMISSION_CATALOG);
const roleCatalog = new Set<string>(DEFAULT_ROLES);

export function listRoleDefinitions(): RoleDefinition[] {
  return DEFAULT_ROLES.map((role) => ({
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
  }));
}

export function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

export function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

export function isValidRole(role: string): role is Role {
  return roleCatalog.has(normalizeRole(role));
}

export function validateRole(role: string): Role {
  const normalizedRole = normalizeRole(role);

  if (!roleCatalog.has(normalizedRole)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return normalizedRole as Role;
}

export function isValidPermission(permission: string): permission is Permission {
  return permissionCatalog.has(normalizePermission(permission));
}

export function validatePermission(permission: string): Permission {
  const normalizedPermission = normalizePermission(permission);

  if (!permissionCatalog.has(normalizedPermission)) {
    throw new Error(`Invalid permission: ${permission}`);
  }

  return normalizedPermission as Permission;
}

export function getRolePermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function resolvePermissionsForRoles(
  roles: readonly Role[],
): Permission[] {
  return uniquePermissions(
    roles.flatMap((role) => [...ROLE_PERMISSIONS[role]]),
  );
}

export function uniquePermissions(
  permissions: readonly Permission[],
): Permission[] {
  return [...new Set(permissions)];
}
