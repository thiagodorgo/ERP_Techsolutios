import type { UserRole } from "../modules/auth/types";
import type { TenantContext } from "../modules/context/types";

export type NavigationScope = "platform" | "tenant";
export type NavigationMode = "platform" | "tenant_admin" | "operation";
export type NavigationItemStatus = "active" | "planned";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  scope: NavigationScope;
  mode: NavigationMode;
  requiredPermissions: string[];
  allowedRoles?: UserRole[];
  children?: NavigationItem[];
  status?: NavigationItemStatus;
  icon?: string;
  moduleKey?: string;
  featureKey?: string;
};

export type NavigationAccessContext = {
  roles: UserRole[];
  permissions: string[];
  mode: NavigationMode;
  scope: NavigationScope;
  tenantStatus?: TenantContext["tenantStatus"];
  enabledModules?: string[];
};

export function canAccessNavigationItem(context: NavigationAccessContext, item: NavigationItem): boolean {
  if (item.status === "planned") {
    return false;
  }

  if (context.scope !== item.scope) {
    return false;
  }

  if (item.scope === "tenant" && context.tenantStatus && context.tenantStatus !== "active") {
    return false;
  }

  const modeAllowed =
    context.mode === item.mode ||
    (context.mode === "tenant_admin" && item.mode === "operation") ||
    isPlatformAdmin(context);

  if (!modeAllowed) {
    return false;
  }

  if (item.moduleKey && context.enabledModules && !context.enabledModules.includes(item.moduleKey) && !isPlatformAdmin(context)) {
    return false;
  }

  const roleAllowed = !item.allowedRoles?.length || item.allowedRoles.some((role) => context.roles.includes(role));
  const permissionAllowed =
    item.requiredPermissions.length === 0 ||
    item.requiredPermissions.some((permission) => context.permissions.includes(permission));

  if (isPlatformAdmin(context)) {
    return item.scope === "platform" || context.scope === "tenant";
  }

  return roleAllowed && permissionAllowed;
}

export function filterNavigationItems(context: NavigationAccessContext, items: readonly NavigationItem[]): NavigationItem[] {
  return items
    .map((item) => {
      if (item.status === "planned") {
        return null;
      }

      const children = item.children ? filterNavigationItems(context, item.children) : undefined;
      const nextItem = children ? { ...item, children } : item;
      const ownAccess = canAccessNavigationItem(context, nextItem);

      if (!ownAccess && (!children || children.length === 0)) {
        return null;
      }

      return nextItem;
    })
    .filter((item): item is NavigationItem => item !== null);
}

export function isPlatformAdmin(context: Pick<NavigationAccessContext, "roles" | "permissions">): boolean {
  return (
    context.roles.includes("Super Admin") ||
    context.permissions.includes("platform:tenants:read")
  );
}
