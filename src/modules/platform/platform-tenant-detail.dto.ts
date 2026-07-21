import type {
  PlatformTenantDetail,
  PlatformTenantDetailModule,
  PlatformTenantDetailUser,
} from "./platform-tenant-detail.types.js";

export type PlatformTenantDetailModuleDto = {
  readonly key: string;
  readonly label: string;
  readonly enabled: boolean;
};

export type PlatformTenantDetailUserDto = {
  readonly name: string;
  readonly email: string;
  readonly roleLabel?: string;
  readonly status: string;
};

export type PlatformTenantDetailDto = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly createdAt: string;
  readonly moduleCount: number;
  readonly modules: readonly PlatformTenantDetailModuleDto[];
  readonly users: readonly PlatformTenantDetailUserDto[];
};

// Rótulo PT-BR canônico dos papéis (CLAUDE.md §3 / docs/actor-flows.md). Fronteira de tradução: o
// domínio carrega o papel TÉCNICO; a UI nunca exibe termo técnico. Papel sem mapa cai na própria chave
// (nunca some da tela) — mesmo comportamento do roleLabel do frontend.
const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Admin Plataforma",
  super_admin: "Admin Plataforma",
  tenant_admin: "Administrador",
  manager: "Gestor Operacional",
  operator: "Operador",
  finance: "Financeiro",
  inventory: "Estoque",
  field_technician: "Técnico de Campo",
  field_dispatcher: "Operação de Campo",
  auditor: "Auditor",
  support: "Suporte",
};

// §2.8 (allowlist): o DTO expõe SÓ metadados da org (id/name/slug/status/createdAt) + catálogo de
// módulos (key/label/enabled) + usuários DELA (name/email/roleLabel/status — PII by-design p/ o
// platform_admin que administra a org). NUNCA token/path/bucket/storage key/base64/binário, nem
// tenant_id de terceiros. SEM mrr/uptime/health — não têm fonte, então OMITIDOS (não zerados-fingindo).
export function toPlatformTenantDetailDto(detail: PlatformTenantDetail): PlatformTenantDetailDto {
  return {
    id: detail.id,
    name: detail.name,
    ...(detail.slug ? { slug: detail.slug } : {}),
    status: detail.status,
    createdAt: detail.createdAt,
    moduleCount: detail.moduleCount,
    modules: detail.modules.map(toModuleDto),
    users: detail.users.map(toUserDto),
  };
}

function toModuleDto(module: PlatformTenantDetailModule): PlatformTenantDetailModuleDto {
  return {
    key: module.key,
    label: module.label,
    enabled: module.enabled,
  };
}

function toUserDto(user: PlatformTenantDetailUser): PlatformTenantDetailUserDto {
  const roleLabel = formatRoleLabel(user.roles);

  return {
    name: user.name,
    email: user.email,
    ...(roleLabel ? { roleLabel } : {}),
    status: user.status,
  };
}

function formatRoleLabel(roles: readonly string[]): string | undefined {
  if (roles.length === 0) {
    return undefined;
  }

  const labels = [
    ...new Set(roles.map((role) => ROLE_LABELS[role.trim().toLowerCase()] ?? role.trim())),
  ].filter((label) => label.length > 0);

  return labels.length > 0 ? labels.join(" · ") : undefined;
}
