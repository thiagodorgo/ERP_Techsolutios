import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
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
import type { TeamRepository } from "./team.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type TeamScalarRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly leader_user_id: string | null;
  readonly status: string;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type TeamMemberScalarRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly team_id: string;
  readonly user_id: string;
  readonly role_in_team: string | null;
  readonly created_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly user?: { readonly name: string } | null;
};

export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateTeamInput): Promise<Team> {
    try {
      const team = await this.client.team.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          leader_user_id: input.leaderUserId ?? null,
          status: input.status || "active",
          notes: input.notes ?? null,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapTeamRecord(team, 0);
    } catch (error) {
      throw translateTeamWriteError(error);
    }
  }

  async list(input: ListTeamsInput): Promise<ListTeamsResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.team.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
        include: { _count: { select: { members: true } } },
      }),
      this.client.team.count({ where }),
    ]);

    return {
      items: items.map((item) => mapTeamRecord(item, item._count.members)),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, teamId: string): Promise<Team | undefined> {
    const team = await this.client.team.findFirst({
      where: { tenant_id: tenantId, id: teamId },
      include: {
        members: {
          orderBy: [{ created_at: "asc" }],
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!team) return undefined;

    return mapTeamRecord(team, team.members.length, team.members.map(mapMemberRecord));
  }

  async update(input: UpdateTeamInput): Promise<Team | undefined> {
    try {
      const updated = await this.client.team.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.teamId },
        data: compactRecord({
          name: input.name,
          leader_user_id: nullable(input.leaderUserId),
          status: input.status,
          notes: nullable(input.notes),
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });

      if (!updated[0]) return undefined;

      const memberCount = await this.client.teamMember.count({
        where: { tenant_id: input.tenantId, team_id: input.teamId },
      });

      return mapTeamRecord(updated[0], memberCount);
    } catch (error) {
      throw translateTeamWriteError(error);
    }
  }

  async addMember(input: AddTeamMemberInput): Promise<TeamMember> {
    try {
      const member = await this.client.teamMember.create({
        data: {
          tenant_id: input.tenantId,
          team_id: input.teamId,
          user_id: input.userId,
          role_in_team: input.roleInTeam ?? null,
          created_by: input.createdBy ?? null,
        },
        include: { user: { select: { name: true } } },
      });

      return mapMemberRecord(member);
    } catch (error) {
      throw translateMemberWriteError(error);
    }
  }

  async removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean> {
    const deleted = await this.client.teamMember.deleteMany({
      where: { tenant_id: tenantId, team_id: teamId, user_id: userId },
    });

    return deleted.count > 0;
  }
}

export class RlsPrismaTeamRepository implements TeamRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateTeamInput): Promise<Team> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTeamRepository(tx).create(input));
  }

  list(input: ListTeamsInput): Promise<ListTeamsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTeamRepository(tx).list(input));
  }

  findById(tenantId: string, teamId: string): Promise<Team | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTeamRepository(tx).findById(tenantId, teamId));
  }

  update(input: UpdateTeamInput): Promise<Team | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTeamRepository(tx).update(input));
  }

  addMember(input: AddTeamMemberInput): Promise<TeamMember> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTeamRepository(tx).addMember(input));
  }

  removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaTeamRepository(tx).removeMember(tenantId, teamId, userId),
    );
  }
}

export async function createPrismaTeamRepository(): Promise<RlsPrismaTeamRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaTeamRepository(prisma);
}

function buildWhere(input: ListTeamsInput): Prisma.TeamWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { status: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapTeamRecord(record: TeamScalarRecord, memberCount: number, members?: TeamMember[]): Team {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    leaderUserId: record.leader_user_id ?? undefined,
    status: record.status,
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    memberCount,
    members,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapMemberRecord(record: TeamMemberScalarRecord): TeamMember {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    teamId: record.team_id,
    userId: record.user_id,
    userName: record.user?.name ?? undefined,
    roleInTeam: record.role_in_team ?? undefined,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function translateTeamWriteError(error: unknown): unknown {
  if (isPrismaErrorCode(error, "P2002")) {
    return new TeamError(409, "TEAM_CONFLICT", "duplicate_name", "A team with this name already exists.");
  }

  if (isPrismaErrorCode(error, "P2003")) {
    return new TeamError(400, "TEAM_INVALID", "invalid_leader", "The informed leader is not a valid user of this organization.");
  }

  return error;
}

function translateMemberWriteError(error: unknown): unknown {
  if (isPrismaErrorCode(error, "P2002")) {
    return new TeamError(409, "TEAM_MEMBER_CONFLICT", "duplicate_member", "This user is already a member of the team.");
  }

  if (isPrismaErrorCode(error, "P2003")) {
    return new TeamError(400, "TEAM_INVALID", "invalid_user", "The informed user is not a valid member of this organization.");
  }

  return error;
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === code
  );
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
