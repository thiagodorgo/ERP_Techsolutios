import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { JurisdictionRepository } from "./jurisdiction.repository.js";
import type {
  CreateJurisdictionProfileInput,
  DailyCap,
  DailyModel,
  JurisdictionProfile,
  ListJurisdictionProfileInput,
  ListJurisdictionProfileResult,
  ProfileScope,
  ReleaseRequirement,
  UpdateJurisdictionProfileInput,
} from "./jurisdiction.types.js";
import { JurisdictionError } from "./jurisdiction.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaJurisdictionRepository implements JurisdictionRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createProfile(input: CreateJurisdictionProfileInput): Promise<JurisdictionProfile> {
    try {
      const created = await this.client.jurisdictionProfile.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          scope: input.scope,
          owner_notif_days: input.ownerNotifDays,
          notice_edict_day: input.noticeEdictDay,
          auction_eligible_day: input.auctionEligibleDay,
          auction_edict_business_days: input.auctionEdictBusinessDays,
          daily_model: input.dailyModel,
          daily_cap: input.dailyCap,
          release_requirements: input.releaseRequirements as unknown as Prisma.InputJsonValue,
          notes: input.notes ?? null,
          active: input.active ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapProfile(created);
    } catch (error) {
      throw translateJurisdictionError(error);
    }
  }

  async listProfiles(input: ListJurisdictionProfileInput): Promise<ListJurisdictionProfileResult> {
    const where = buildProfileWhere(input);
    const [items, total] = await Promise.all([
      this.client.jurisdictionProfile.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.jurisdictionProfile.count({ where }),
    ]);
    return { items: items.map(mapProfile), total, limit: input.limit, offset: input.offset };
  }

  async findProfileById(tenantId: string, profileId: string): Promise<JurisdictionProfile | undefined> {
    const profile = await this.client.jurisdictionProfile.findFirst({ where: { tenant_id: tenantId, id: profileId } });
    return profile ? mapProfile(profile) : undefined;
  }

  async updateProfile(input: UpdateJurisdictionProfileInput): Promise<JurisdictionProfile | undefined> {
    try {
      const updated = await this.client.jurisdictionProfile.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.profileId },
        data: compact({
          name: input.name,
          scope: input.scope,
          owner_notif_days: input.ownerNotifDays,
          notice_edict_day: input.noticeEdictDay,
          auction_eligible_day: input.auctionEligibleDay,
          auction_edict_business_days: input.auctionEdictBusinessDays,
          daily_model: input.dailyModel,
          daily_cap: input.dailyCap,
          release_requirements:
            input.releaseRequirements === undefined
              ? undefined
              : (input.releaseRequirements as unknown as Prisma.InputJsonValue),
          notes: input.notes,
          active: input.active,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapProfile(updated[0]) : undefined;
    } catch (error) {
      throw translateJurisdictionError(error);
    }
  }
}

// Wrapper RLS: cada método abre uma transação com o contexto app.current_tenant_id (setTenantRlsContext).
export class RlsPrismaJurisdictionRepository implements JurisdictionRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createProfile(input: CreateJurisdictionProfileInput): Promise<JurisdictionProfile> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaJurisdictionRepository(tx).createProfile(input));
  }

  listProfiles(input: ListJurisdictionProfileInput): Promise<ListJurisdictionProfileResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaJurisdictionRepository(tx).listProfiles(input));
  }

  findProfileById(tenantId: string, profileId: string): Promise<JurisdictionProfile | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaJurisdictionRepository(tx).findProfileById(tenantId, profileId));
  }

  updateProfile(input: UpdateJurisdictionProfileInput): Promise<JurisdictionProfile | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaJurisdictionRepository(tx).updateProfile(input));
  }
}

export async function createPrismaJurisdictionRepository(): Promise<RlsPrismaJurisdictionRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaJurisdictionRepository(prisma);
}

function buildProfileWhere(input: ListJurisdictionProfileInput): Prisma.JurisdictionProfileWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.scope !== undefined ? { scope: input.scope } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { notes: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapProfile(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly scope: string;
  readonly owner_notif_days: number;
  readonly notice_edict_day: number;
  readonly auction_eligible_day: number;
  readonly auction_edict_business_days: number;
  readonly daily_model: string;
  readonly daily_cap: string;
  readonly release_requirements: Prisma.JsonValue;
  readonly notes: string | null;
  readonly active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): JurisdictionProfile {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    scope: record.scope as ProfileScope,
    ownerNotifDays: record.owner_notif_days,
    noticeEdictDay: record.notice_edict_day,
    auctionEligibleDay: record.auction_eligible_day,
    auctionEdictBusinessDays: record.auction_edict_business_days,
    dailyModel: record.daily_model as DailyModel,
    dailyCap: record.daily_cap as DailyCap,
    releaseRequirements: mapReleaseRequirements(record.release_requirements),
    notes: record.notes ?? undefined,
    active: record.active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// A coluna é validada na escrita (parseReleaseRequirements). Na leitura, coerção defensiva: só objetos com
// {code,label} entram; required default true.
function mapReleaseRequirements(value: Prisma.JsonValue): ReleaseRequirement[] {
  if (!Array.isArray(value)) return [];
  const items: ReleaseRequirement[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.code !== "string" || typeof item.label !== "string") continue;
    items.push({ code: item.code, label: item.label, required: item.required !== false });
  }
  return items;
}

// P2002 (unique) → 409 JURISDICTION_CONFLICT (chave natural (tenant, name)).
function translateJurisdictionError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return new JurisdictionError(409, "JURISDICTION_CONFLICT", "duplicate_name", "A jurisdiction profile with this name already exists.");
  }
  if (isPrismaError(error, "P2003")) {
    return new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
