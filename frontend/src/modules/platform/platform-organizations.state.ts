import type { PlatformOverviewData } from "./platform-overview.types";
import type { PlatformOrganization } from "./platform.types";

export type PlatformOrganizationRow = PlatformOrganization & {
  readonly userCount: number | null;
  readonly moduleCount: number | null;
  readonly countsStale: boolean;
};

export type OrganizationStatusFilter = "all" | "active" | "suspended" | "incomplete";

export type OrganizationsTableDensity = "full" | "medium" | "narrow";

export function organizationsTableDensity(width: number): OrganizationsTableDensity {
  if (width <= 600) return "narrow";
  if (width <= 860) return "medium";
  return "full";
}

export function sortByUsersDesc(rows: readonly PlatformOrganizationRow[]): readonly PlatformOrganizationRow[] {
  return [...rows].sort((left, right) => {
    if (left.userCount === null) return right.userCount === null ? 0 : 1;
    if (right.userCount === null) return -1;
    return right.userCount - left.userCount;
  });
}

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
    if (input.groupId === "__sem" && row.group) return false;
    if (input.groupId && input.groupId !== "__sem" && row.group?.id !== input.groupId) return false;
    if (input.status !== "all" && row.system) return false;
    if (input.status === "incomplete" && row.setup.complete) return false;
    if (input.status !== "all" && input.status !== "incomplete" && row.status !== input.status) return false;
    return !query || `${row.name} ${row.group?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query);
  });
}
