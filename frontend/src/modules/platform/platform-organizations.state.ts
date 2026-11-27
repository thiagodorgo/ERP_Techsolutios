import type { PlatformOverviewData } from "./platform-overview.types";
import type { PlatformOrganization } from "./platform.types";

export type PlatformOrganizationRow = PlatformOrganization & {
  readonly userCount: number | null;
  readonly moduleCount: number | null;
  readonly countsStale: boolean;
};

export type OrganizationStatusFilter = "all" | "active" | "suspended" | "incomplete";

export function composePlatformOrganizations(
  organizations: readonly PlatformOrganization[],
  overview: PlatformOverviewData,
): readonly PlatformOrganizationRow[] {
  const counts = new Map(overview.orgs.map((row) => [row.id, row] as const));
  return organizations.map((organization) => {
    const overviewRow = counts.get(organization.id);
    const validUserCount = overviewRow && Number.isFinite(overviewRow.userCount) && overviewRow.userCount >= 0 ? Math.trunc(overviewRow.userCount) : null;
    const validModuleCount = overviewRow && Number.isFinite(overviewRow.moduleCount) && overviewRow.moduleCount >= 0 ? Math.trunc(overviewRow.moduleCount) : null;
    return {
      ...organization,
      userCount: validUserCount,
      moduleCount: validModuleCount,
      countsStale: Boolean(overviewRow && overviewRow.status !== organization.status),
    };
  });
}

export function filterPlatformOrganizations(
  rows: readonly PlatformOrganizationRow[],
  input: { readonly query: string; readonly groupId: string; readonly status: OrganizationStatusFilter },
): readonly PlatformOrganizationRow[] {
  const query = input.query.trim().toLocaleLowerCase("pt-BR");
  return rows.filter((row) => {
    if (input.groupId && row.group?.id !== input.groupId) return false;
    if (input.status === "incomplete" && row.setup.complete) return false;
    if (input.status !== "all" && input.status !== "incomplete" && row.status !== input.status) return false;
    return !query || `${row.name} ${row.group?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query);
  });
}
