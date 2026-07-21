import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Blocks,
  BookUser,
  Building2,
  ChartNoAxesCombined,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  ConciergeBell,
  Contact,
  CreditCard,
  FileText,
  Fuel,
  Gavel,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Package,
  PlayCircle,
  Receipt,
  ReceiptText,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Split,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem, NavigationMode, NavigationScope } from "../../navigation/types";
import type { BackendNavigationItem, BackendNavigationMenuResponse } from "./navigation.types";

export const navigationGroupLabels: Record<NavigationScope, string> = {
  platform: "Platform",
  tenant: "Administração",
  operations: "Operação",
  logistics: "Logística",
  finance: "Financeiro",
  registry: "Cadastros",
  fleet: "Frota",
};

export const navigationIconMap: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Blocks,
  BookUser,
  Building2,
  ChartNoAxesCombined,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  ConciergeBell,
  Contact,
  CreditCard,
  FileText,
  Fuel,
  Gavel,
  LayoutDashboard,
  Map: MapIcon,
  MapPin,
  MapPinned,
  Package,
  PlayCircle,
  Receipt,
  ReceiptText,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Split,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  dashboard: LayoutDashboard,
  logistics: Truck,
  notifications: Bell,
  "platform-cloud-billing": Receipt,
  "platform-modules": SlidersHorizontal,
  "platform-overview": LayoutDashboard,
  "platform-tenants": Building2,
  "tenant-admin": ShieldCheck,
  tenant_checklist: ClipboardList,
  users: UsersRound,
  "work-orders": ClipboardList,
};

export function adaptBackendNavigationMenu(response: BackendNavigationMenuResponse): NavigationItem[] {
  return normalizeBackendItems(response.data ?? response.items ?? []);
}

export function normalizeBackendItems(items: readonly BackendNavigationItem[]): NavigationItem[] {
  return [...items]
    .filter((item) => Boolean(item.id?.trim()) && Boolean(item.path?.trim()))
    .sort(sortBackendItems)
    .map((item) => adaptBackendNavigationItem(item));
}

export function resolveNavigationIcon(iconName: string | undefined): LucideIcon {
  if (!iconName) return Circle;

  return navigationIconMap[iconName] ?? Circle;
}

export function groupNavigationItems(items: readonly NavigationItem[]): Array<{ scope: NavigationScope; label: string; items: NavigationItem[] }> {
  const groups = new Map<NavigationScope, NavigationItem[]>();

  for (const item of items) {
    const groupItems = groups.get(item.scope) ?? [];
    groupItems.push(item);
    groups.set(item.scope, groupItems);
  }

  return [...groups.entries()].map(([scope, groupItems]) => ({
    scope,
    label: navigationGroupLabels[scope],
    items: groupItems,
  }));
}

function adaptBackendNavigationItem(item: BackendNavigationItem): NavigationItem {
  return {
    id: item.id,
    label: item.label,
    path: item.path,
    scope: item.group,
    mode: modeForScope(item.group),
    requiredPermissions: [...(item.requiredPermissions ?? [])],
    children: item.children ? normalizeBackendItems(item.children) : undefined,
    status: item.status,
    backendStatus: item.status,
    icon: item.icon,
    iconComponent: resolveNavigationIcon(item.icon),
    moduleKey: item.requiredModules?.[0],
    order: item.order,
    groupLabel: navigationGroupLabels[item.group],
    relatedEndpoints: item.relatedEndpoints ? [...item.relatedEndpoints] : undefined,
    fromBackend: true,
  };
}

function modeForScope(scope: NavigationScope): NavigationMode {
  if (scope === "platform") return "platform";
  if (scope === "tenant") return "tenant_admin";

  return "operation";
}

function sortBackendItems(left: BackendNavigationItem, right: BackendNavigationItem): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}
