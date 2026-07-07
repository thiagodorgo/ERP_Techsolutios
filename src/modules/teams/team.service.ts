import { env } from "../../config/env.js";
import {
  InMemoryTeamRepository,
  type TeamRepository,
} from "./team.repository.js";
import type {
  ListTeamsInput,
  ListTeamsResult,
  Team,
  TeamActorContext,
  TeamMember,
  UpdateTeamInput,
} from "./team.types.js";
import { TeamError } from "./team.types.js";
import {
  parseLimit,
  parseMemberUserId,
  parseName,
  parseOffset,
  parseOptionalLeaderUserId,
  parseOptionalNotes,
  parseOptionalRoleInTeam,
  parseOptionalSearch,
  parseOptionalStatus,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./team.validators.js";

type RawRecord = Record<string, unknown>;

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  async list(actor: TeamActorContext, query: RawRecord): Promise<ListTeamsResult> {
    const input: ListTeamsInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: TeamActorContext, body: RawRecord): Promise<Team> {
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      leaderUserId: parseOptionalLeaderUserId(body.leader_user_id ?? body.leaderUserId),
      status: parseOptionalStatus(body.status) ?? "active",
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: TeamActorContext, teamId: string): Promise<Team> {
    const team = await this.repository.findById(actor.tenantId, parseRequiredUuid(teamId, "teamId"));

    if (!team) {
      throw new TeamError(404, "TEAM_NOT_FOUND", "not_found", "Team was not found.");
    }

    return team;
  }

  async update(actor: TeamActorContext, teamId: string, body: RawRecord): Promise<Team> {
    await this.get(actor, teamId);
    const input: UpdateTeamInput = {
      tenantId: actor.tenantId,
      teamId: parseRequiredUuid(teamId, "teamId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      leaderUserId: parseOptionalLeaderUserId(body.leader_user_id ?? body.leaderUserId),
      status: parseOptionalStatus(body.status),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new TeamError(404, "TEAM_NOT_FOUND", "not_found", "Team was not found.");
    }

    return updated;
  }

  async addMember(actor: TeamActorContext, teamId: string, body: RawRecord): Promise<TeamMember> {
    await this.get(actor, teamId);

    return this.repository.addMember({
      tenantId: actor.tenantId,
      teamId: parseRequiredUuid(teamId, "teamId"),
      userId: parseMemberUserId(body.user_id ?? body.userId),
      roleInTeam: parseOptionalRoleInTeam(body.role_in_team ?? body.roleInTeam),
      createdBy: actor.userId,
    });
  }

  async removeMember(actor: TeamActorContext, teamId: string, userId: string): Promise<void> {
    await this.get(actor, teamId);
    const removed = await this.repository.removeMember(
      actor.tenantId,
      parseRequiredUuid(teamId, "teamId"),
      parseMemberUserId(userId),
    );

    if (!removed) {
      throw new TeamError(404, "TEAM_MEMBER_NOT_FOUND", "member_not_found", "Team member was not found.");
    }
  }
}

const memoryRepository = new InMemoryTeamRepository();
let defaultServicePromise: Promise<TeamService> | undefined;

export function createMemoryTeamService(): TeamService {
  return new TeamService(memoryRepository);
}

export function getMemoryTeamRepositoryForTests(): InMemoryTeamRepository {
  return memoryRepository;
}

export async function createDefaultTeamService(): Promise<TeamService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTeamService();
  }

  defaultServicePromise ??= createPrismaTeamService();

  return defaultServicePromise;
}

export function resetTeamRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTeamService(): Promise<TeamService> {
  const { createPrismaTeamRepository } = await import("./team-prisma.repository.js");
  const repository = await createPrismaTeamRepository();

  return new TeamService(repository);
}
