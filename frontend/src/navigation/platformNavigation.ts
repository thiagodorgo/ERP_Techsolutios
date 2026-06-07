import type { NavigationItem } from "./types";

export const platformNavigation: NavigationItem[] = [
  {
    label: "Visao Geral",
    path: "/platform/overview",
    module: "platform-overview",
    permissions: ["platform:health:read"],
    scope: "platform",
    disabled: true,
  },
  {
    label: "Tenants",
    path: "/platform/tenants",
    module: "platform-tenants",
    permissions: ["platform:tenants:read"],
    scope: "platform",
  },
  {
    label: "Planos e Modulos",
    path: "/platform/plans-modules",
    module: "platform-modules",
    permissions: ["platform:modules:manage"],
    scope: "platform",
    disabled: true,
  },
  {
    label: "Auditoria Global",
    path: "/platform/audit",
    module: "platform-audit",
    permissions: ["platform:audit:read"],
    scope: "platform",
    disabled: true,
  },
  {
    label: "Health do Sistema",
    path: "/platform/health",
    module: "platform-health",
    permissions: ["platform:health:read"],
    scope: "platform",
    disabled: true,
  },
  {
    label: "Configuracoes",
    path: "/platform/settings",
    module: "platform-settings",
    permissions: ["platform:tenants:update"],
    scope: "platform",
    disabled: true,
  },
];
