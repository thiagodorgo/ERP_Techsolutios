import { NAVIGATION_REGISTRY } from "./navigation.registry.js";
import type { NavigationItem, NavigationMenuContext, NavigationScope } from "./navigation.types.js";

const platformRoles = new Set(["super_admin", "platform_admin"]);
const sensitiveMetadataKeys = new Set(["secret", "token", "password", "authorization", "credential", "storageKey"]);

export function getMenuForCurrentUser(context: NavigationMenuContext): NavigationItem[] {
  return filterNavigationByScope(
    filterNavigationByTenantModules(
      filterNavigationByPermissions(
        filterNavigationByActorBoundary(NAVIGATION_REGISTRY, context),
        context.permissions,
      ),
      context.enabledModules,
    ),
    context.scope,
  );
}

export function filterNavigationByPermissions(
  items: readonly NavigationItem[],
  permissions: readonly string[],
): NavigationItem[] {
  const permissionSet = new Set(permissions);

  return sortItems(items)
    .map((item) => filterItemChildren(item, (child) => hasPermission(child, permissionSet)))
    .filter((item): item is NavigationItem => item !== null)
    .filter((item) => hasPermission(item, permissionSet) || Boolean(item.children?.length))
    .map(sanitizeNavigationItem);
}

export function filterNavigationByTenantModules(
  items: readonly NavigationItem[],
  enabledModules?: readonly string[],
): NavigationItem[] {
  if (!enabledModules) {
    return items.map(sanitizeNavigationItem);
  }

  const moduleSet = new Set(enabledModules);

  return sortItems(items)
    .map((item) => filterItemChildren(item, (child) => hasModule(child, moduleSet)))
    .filter((item): item is NavigationItem => item !== null)
    .filter((item) => hasModule(item, moduleSet) || Boolean(item.children?.length))
    .map(sanitizeNavigationItem);
}

export function filterNavigationByScope(
  items: readonly NavigationItem[],
  scope?: NavigationScope,
): NavigationItem[] {
  if (!scope) {
    return items.map(sanitizeNavigationItem);
  }

  return sortItems(items)
    .map((item) => filterItemChildren(item, (child) => child.group === scope))
    .filter((item): item is NavigationItem => item !== null)
    .filter((item) => item.group === scope || Boolean(item.children?.length))
    .map(sanitizeNavigationItem);
}

export function isNavigationScope(value: string): value is NavigationScope {
  return value === "platform" || value === "tenant" || value === "operations" || value === "logistics" || value === "finance";
}

// Ω-ACESSO — todos os paths GOVERNADOS pelo registry (recursivo). O frontend usa este conjunto para
// gating dinâmico: um item cujo path é governado mas NÃO veio no menu do tenant (feature/permissão não
// provisionada) é escondido do sidebar. Paths fora deste conjunto seguem a regra de papel do frontend.
export function getGovernedNavigationPaths(): string[] {
  const paths = new Set<string>();
  const walk = (items: readonly NavigationItem[]): void => {
    for (const item of items) {
      paths.add(item.path);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(NAVIGATION_REGISTRY);
  return [...paths];
}

function filterNavigationByActorBoundary(
  items: readonly NavigationItem[],
  context: NavigationMenuContext,
): NavigationItem[] {
  const platformActor = isPlatformActor(context);

  return sortItems(items)
    .map((item) =>
      filterItemChildren(item, (child) => {
        if (child.platformOnly && !platformActor) return false;
        if (child.tenantOnly && platformActor && !context.tenantId) return false;
        return true;
      }),
    )
    .filter((item): item is NavigationItem => item !== null)
    .filter((item) => {
      if (item.platformOnly && !platformActor) return false;
      if (item.tenantOnly && platformActor && !context.tenantId) return false;
      return true;
    });
}

function isPlatformActor(context: NavigationMenuContext): boolean {
  return context.roles.map((role) => role.trim().toLowerCase()).some((role) => platformRoles.has(role));
}

function hasPermission(item: NavigationItem, permissions: ReadonlySet<string>): boolean {
  return item.requiredPermissions.length === 0 || item.requiredPermissions.some((permission) => permissions.has(permission));
}

function hasModule(item: NavigationItem, enabledModules: ReadonlySet<string>): boolean {
  return !item.requiredModules?.length || item.requiredModules.some((moduleKey) => enabledModules.has(moduleKey));
}

function filterItemChildren(
  item: NavigationItem,
  predicate: (item: NavigationItem) => boolean,
): NavigationItem | null {
  const children = item.children
    ?.map((child) => filterItemChildren(child, predicate))
    .filter((child): child is NavigationItem => child !== null);

  if (!predicate(item) && (!children || children.length === 0)) {
    return null;
  }

  return {
    ...item,
    ...(children ? { children } : {}),
  };
}

function sortItems(items: readonly NavigationItem[]): NavigationItem[] {
  return [...items].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function sanitizeNavigationItem(item: NavigationItem): NavigationItem {
  const metadata = sanitizeMetadata(item.metadata);
  const children = item.children?.map(sanitizeNavigationItem);

  return {
    id: item.id,
    label: item.label,
    ...(item.description ? { description: item.description } : {}),
    path: item.path,
    icon: item.icon,
    group: item.group,
    order: item.order,
    status: item.status,
    requiredPermissions: [...item.requiredPermissions],
    ...(item.requiredModules ? { requiredModules: [...item.requiredModules] } : {}),
    ...(item.platformOnly ? { platformOnly: true } : {}),
    ...(item.tenantOnly ? { tenantOnly: true } : {}),
    ...(children?.length ? { children } : {}),
    ...(item.relatedEndpoints ? { relatedEndpoints: [...item.relatedEndpoints] } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function sanitizeMetadata(metadata: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !sensitiveMetadataKeys.has(key.trim().toLowerCase())),
  );

  return Object.keys(sanitized).length ? sanitized : undefined;
}
