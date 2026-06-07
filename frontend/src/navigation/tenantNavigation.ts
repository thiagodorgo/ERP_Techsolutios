import type { NavigationItem } from "./types";

export const tenantNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    module: "dashboard",
    permissions: ["dashboard:view"],
    scope: "tenant",
  },
  {
    label: "Ordens de Servico",
    path: "/work-orders",
    module: "work-orders",
    permissions: ["work-orders:view", "work-orders:create", "work-orders:update"],
    scope: "tenant",
  },
  {
    label: "Painel Logistico",
    path: "/logistics",
    module: "logistics",
    permissions: ["logistics:dispatch"],
    scope: "tenant",
  },
  {
    label: "Usuarios",
    path: "/users",
    module: "users",
    permissions: ["users:read"],
    scope: "tenant",
    disabled: true,
  },
  {
    label: "Administrador",
    path: "/administrator",
    module: "tenant-admin",
    permissions: ["tenant:manage", "roles:manage"],
    scope: "tenant",
    disabled: true,
  },
];
