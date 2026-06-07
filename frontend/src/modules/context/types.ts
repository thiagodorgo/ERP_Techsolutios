import type { UserRole } from "../auth/types";

export type TenantContext = {
  tenantId: string;
  tenantName: string;
  tenantStatus: "active" | "blocked";
  branchId: string;
  branchName: string;
  role: UserRole;
  permissions: string[];
  enabledModules?: string[];
  scope: "tenant" | "branch" | "team";
};
