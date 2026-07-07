import { randomUUID } from "node:crypto";

import type {
  AddTeamMemberInput,
  CreateTeamInput,
  ListTeamsInput,
  ListTeamsResult,
  Team,
  TeamMember,
  UpdateTeamInput,
} from "./team.types.js";
import { TeamError } from "./team.types.js";

export interface TeamRepository {
  create(input: CreateTeamInput): Promise<Team>;
  list(input: ListTeamsInput): Promise<ListTeamsResult>;
  findById(tenantId: string, teamId: string): Promise<Team | undefined>;
  update(input: UpdateTeamInput): Promise<Team | undefined>;
  addMember(input: AddTeamMemberInput): Promise<TeamMember>;
  removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean>;
  reset?(): void;
}

type StoredTeam = {
  id: string;
  tenantId: string;
  name: string;
  leaderUserId?: string;
  status: string;
  notes?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export class InMemoryTeamRepository implements TeamRepository {
  private readonly teams = new Map<string, StoredTeam>();
  private readonly members = new Map<string, TeamMember>();

  async create(input: CreateTeamInput): Promise<Team> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new TeamError(409, "TEAM_CONFLICT", "duplicate_name", "A team with this name already exists.");
    }

    const now = new Date();
    const stored: StoredTeam = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      leaderUserId: input.leaderUserId,
      status: input.status || "active",
      notes: input.notes,
      isActive: input.isActive ?? true,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.set(stored.id, stored);

    return this.toTeam(stored, false);
  }

  async list(input: ListTeamsInput): Promise<ListTeamsResult> {
    const filtered = this.sortedTeams()
      .filter((team) => team.tenantId === input.tenantId)
      .filter((team) => input.isActive === undefined || team.isActive === input.isActive)
      .filter((team) => matchesSearch(team, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit).map((team) => this.toTeam(team, false)),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, teamId: string): Promise<Team | undefined> {
    const stored = this.teams.get(teamId);

    return stored?.tenantId === tenantId ? this.toTeam(stored, true) : undefined;
  }

  async update(input: UpdateTeamInput): Promise<Team | undefined> {
    const current = this.teams.get(input.teamId);
    if (!current || current.tenantId !== input.tenantId) return undefined;

    const updated: StoredTeam = {
      ...current,
      ...definedFields({
        name: input.name,
        leaderUserId: input.leaderUserId,
        status: input.status,
        notes: input.notes,
        isActive: input.isActive,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.teams.set(updated.id, updated);

    return this.toTeam(updated, false);
  }

  async addMember(input: AddTeamMemberInput): Promise<TeamMember> {
    if (this.hasMember(input.tenantId, input.teamId, input.userId)) {
      throw new TeamError(409, "TEAM_MEMBER_CONFLICT", "duplicate_member", "This user is already a member of the team.");
    }

    const now = new Date();
    const member: TeamMember = {
      id: randomUUID(),
      tenantId: input.tenantId,
      teamId: input.teamId,
      userId: input.userId,
      roleInTeam: input.roleInTeam,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.members.set(member.id, member);

    return member;
  }

  async removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean> {
    const match = [...this.members.values()].find(
      (member) => member.tenantId === tenantId && member.teamId === teamId && member.userId === userId,
    );

    if (!match) return false;

    this.members.delete(match.id);

    return true;
  }

  reset(): void {
    this.teams.clear();
    this.members.clear();
  }

  private toTeam(stored: StoredTeam, includeMembers: boolean): Team {
    const teamMembers = this.membersOf(stored.tenantId, stored.id);

    return {
      id: stored.id,
      tenantId: stored.tenantId,
      name: stored.name,
      leaderUserId: stored.leaderUserId,
      status: stored.status,
      notes: stored.notes,
      isActive: stored.isActive,
      memberCount: teamMembers.length,
      members: includeMembers ? teamMembers : undefined,
      createdBy: stored.createdBy,
      updatedBy: stored.updatedBy,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  private membersOf(tenantId: string, teamId: string): TeamMember[] {
    return [...this.members.values()]
      .filter((member) => member.tenantId === tenantId && member.teamId === teamId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.teams.values()].some((team) => team.tenantId === tenantId && team.name === name);
  }

  private hasMember(tenantId: string, teamId: string, userId: string): boolean {
    return [...this.members.values()].some(
      (member) => member.tenantId === tenantId && member.teamId === teamId && member.userId === userId,
    );
  }

  private sortedTeams(): StoredTeam[] {
    return [...this.teams.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(team: StoredTeam, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [team.name, team.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
