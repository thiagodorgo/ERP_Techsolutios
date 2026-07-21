// Agregado REAL de plataforma (cross-tenant, platform_admin). Substitui a fabricação in-memory
// (activeUsers:84 / usageSummary) por CONTAGENS reais. Só expõe metadados de organização — §2.8.
export type PlatformOverviewOrg = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly moduleCount: number;
  readonly userCount: number;
  readonly createdAt: string;
};

export type PlatformOverview = {
  readonly activeOrgs: number;
  readonly totalOrgs: number;
  readonly totalUsers: number;
  readonly orgs: readonly PlatformOverviewOrg[];
};
