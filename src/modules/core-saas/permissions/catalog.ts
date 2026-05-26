export const PERMISSION_CATALOG = [
  "tenant.manage",
  "users.manage",
  "users.read",
  "roles.manage",
  "audit.read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const STANDARD_ROLES = [
  "super_admin",
  "tenant_admin",
  "manager",
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

export const ROLE_PERMISSIONS = {
  super_admin: PERMISSION_CATALOG,
  tenant_admin: PERMISSION_CATALOG,
  manager: [
    "users.read",
    "audit.read",
    "os.manage",
    "os.read",
    "inventory.read",
    "finance.read",
  ],
  technician: ["os.read", "inventory.read"],
  viewer: ["users.read", "os.read", "inventory.read", "finance.read"],
  platform_admin: PERMISSION_CATALOG,
  operator: ["os.manage", "os.read", "inventory.read"],
  finance: ["finance.manage", "finance.read", "os.read"],
  inventory: ["inventory.manage", "inventory.read", "os.read"],
  field_technician: ["os.read", "inventory.read"],
  auditor: [
    "users.read",
    "audit.read",
    "os.read",
    "inventory.read",
    "finance.read",
  ],
  support: ["users.read", "audit.read", "os.read"],
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
