import type { ListTeamsResult, Team, TeamMember } from "./team.types.js";

export function toTeamMemberDto(member: TeamMember) {
  return {
    id: member.id,
    userId: member.userId,
    userName: member.userName ?? null,
    roleInTeam: member.roleInTeam ?? null,
  };
}

export function toTeamDto(team: Team) {
  return {
    id: team.id,
    name: team.name,
    leaderUserId: team.leaderUserId ?? null,
    status: team.status,
    notes: team.notes ?? null,
    isActive: team.isActive,
    memberCount: team.memberCount,
    members: (team.members ?? []).map(toTeamMemberDto),
    createdBy: team.createdBy ?? null,
    updatedBy: team.updatedBy ?? null,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export function toTeamListDto(result: ListTeamsResult) {
  return {
    items: result.items.map((team) => ({
      id: team.id,
      name: team.name,
      leaderUserId: team.leaderUserId ?? null,
      status: team.status,
      isActive: team.isActive,
      memberCount: team.memberCount,
      createdAt: team.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
