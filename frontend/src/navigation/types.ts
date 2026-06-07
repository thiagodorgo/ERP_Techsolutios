export type NavigationScope = "platform" | "tenant";

export type NavigationItem = {
  label: string;
  path: string;
  module: string;
  permissions: string[];
  scope: NavigationScope;
  disabled?: boolean;
};

export type NavigationSession = {
  permissions: string[];
  enabledModules?: string[];
  tenantStatus?: "active" | "blocked";
};

export function canShowNavigationItem(item: NavigationItem, session: NavigationSession): boolean {
  if (item.scope === "platform") {
    return item.permissions.length === 0 || item.permissions.some((permission) => session.permissions.includes(permission));
  }

  if (session.tenantStatus && session.tenantStatus !== "active") {
    return false;
  }

  if (session.enabledModules && !session.enabledModules.includes(item.module)) {
    return false;
  }

  if (item.permissions.length === 0) {
    return true;
  }

  return item.permissions.some((permission) => session.permissions.includes(permission));
}
