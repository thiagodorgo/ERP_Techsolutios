import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type TeamActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type TeamMember = {
  readonly id: string;
  readonly tenantId: string;
  readonly teamId: string;
  readonly userId: string;
  readonly userName?: string;
  readonly roleInTeam?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Team = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly leaderUserId?: string;
  readonly status: string;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly memberCount: number;
  readonly members?: readonly TeamMember[];
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListTeamsInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListTeamsResult = {
  readonly items: readonly Team[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateTeamInput = {
  readonly tenantId: string;
  readonly name: string;
  readonly leaderUserId?: string;
  readonly status: string;
  readonly notes?: string;
  readonly isActive?: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateTeamInput = {
  readonly tenantId: string;
  readonly teamId: string;
  readonly name?: string;
  readonly leaderUserId?: string;
  readonly status?: string;
  readonly notes?: string;
  readonly isActive?: boolean;
  readonly updatedBy?: string;
};

export type AddTeamMemberInput = {
  readonly tenantId: string;
  readonly teamId: string;
  readonly userId: string;
  readonly roleInTeam?: string;
  readonly createdBy?: string;
};

export class TeamError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TeamError";
  }
}
