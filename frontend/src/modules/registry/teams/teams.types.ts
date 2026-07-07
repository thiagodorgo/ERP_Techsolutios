export type TeamMember = {
  readonly id: string;
  readonly userId: string;
  readonly userName: string | null;
  readonly roleInTeam: string | null;
};

export type Team = {
  readonly id: string;
  readonly name: string;
  readonly leaderUserId: string | null;
  readonly status: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly memberCount: number | null;
  readonly members: TeamMember[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TeamsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type TeamsSource = "api" | "mock" | "fallback";

export type TeamsData = {
  readonly items: Team[];
  readonly pagination: TeamsPagination;
  readonly source: TeamsSource;
  readonly fallbackReason?: string;
};

export type TeamsStatusFilter = "all" | "active" | "inactive";

export type TeamsFilters = {
  readonly search: string;
  readonly isActive: TeamsStatusFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type TeamsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type TeamCreatePayload = {
  readonly name: string;
  readonly leaderUserId?: string;
  readonly status?: string;
  readonly notes?: string;
  readonly isActive?: boolean;
};

export type TeamUpdatePayload = Partial<TeamCreatePayload>;

export type TeamField = keyof TeamCreatePayload;

export type TeamFieldError = {
  readonly field: TeamField;
  readonly message: string;
};

export type TeamMemberPayload = {
  readonly userId: string;
  readonly roleInTeam?: string;
};

// Usuário da organização usado apenas para popular os seletores de líder e membros.
export type TenantUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly roles: string[];
  readonly status: string | null;
};
