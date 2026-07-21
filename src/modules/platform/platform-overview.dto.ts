import type { PlatformOverview, PlatformOverviewOrg } from "./platform-overview.types.js";

export type PlatformOverviewOrgDto = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly moduleCount: number;
  readonly userCount: number;
  readonly createdAt: string;
};

export type PlatformOverviewDto = {
  readonly activeOrgs: number;
  readonly totalOrgs: number;
  readonly totalUsers: number;
  readonly orgs: readonly PlatformOverviewOrgDto[];
};

// §2.8 (allowlist): o DTO expõe SÓ contagens + metadados de organização
// (id/name/slug/status/moduleCount/userCount/createdAt). NUNCA token/path/bucket/storage key/base64/
// binário/PII. O `id` da org é dado de plataforma by-design (necessário para o link ao detalhe) e a
// rota é gated platform-only. SEM mrr/uptime/apiCalls/storageGb — não têm fonte, então são OMITIDOS
// (não zerados-fingindo).
export function toPlatformOverviewDto(overview: PlatformOverview): PlatformOverviewDto {
  return {
    activeOrgs: overview.activeOrgs,
    totalOrgs: overview.totalOrgs,
    totalUsers: overview.totalUsers,
    orgs: overview.orgs.map(toOrgDto),
  };
}

function toOrgDto(org: PlatformOverviewOrg): PlatformOverviewOrgDto {
  return {
    id: org.id,
    name: org.name,
    ...(org.slug ? { slug: org.slug } : {}),
    status: org.status,
    moduleCount: org.moduleCount,
    userCount: org.userCount,
    createdAt: org.createdAt,
  };
}
