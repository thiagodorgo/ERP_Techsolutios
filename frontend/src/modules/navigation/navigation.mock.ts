import { platformNavigation } from "../../navigation/platformNavigation";
import { tenantNavigation } from "../../navigation/tenantNavigation";
import type { NavigationItem, NavigationScope } from "../../navigation/types";
import { resolveNavigationIcon } from "./navigation.adapter";
import type { BackendNavigationMenuResponse } from "./navigation.types";

export function getMockNavigationMenu(scope?: NavigationScope): BackendNavigationMenuResponse {
  const items = getFallbackNavigationItems(scope).map((item, index) => ({
    id: item.id,
    label: item.label,
    path: item.path,
    icon: item.icon ?? item.moduleKey ?? "Circle",
    group: item.scope,
    order: item.order ?? index,
    status: item.status ?? "implemented",
    requiredPermissions: item.requiredPermissions,
    requiredModules: item.moduleKey ? [item.moduleKey] : undefined,
    children: item.children?.map((child, childIndex) => ({
      id: child.id,
      label: child.label,
      path: child.path,
      icon: child.icon ?? child.moduleKey ?? "Circle",
      group: child.scope,
      order: child.order ?? childIndex,
      status: child.status ?? "implemented",
      requiredPermissions: child.requiredPermissions,
      requiredModules: child.moduleKey ? [child.moduleKey] : undefined,
    })),
  }));

  return {
    data: items,
    metadata: {
      ...(scope ? { scope } : {}),
      groups: [...new Set(items.map((item) => item.group))],
    },
  };
}

export function getFallbackNavigationItems(scope?: NavigationScope): NavigationItem[] {
  const source = scope === "platform" ? platformNavigation : tenantNavigation;

  return source.map((item) => ({
    ...item,
    iconComponent: resolveNavigationIcon(item.icon ?? item.moduleKey),
    fromBackend: false,
  }));
}
