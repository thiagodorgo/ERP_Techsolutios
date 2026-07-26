import { randomUUID } from "node:crypto";

import type {
  CreateJurisdictionProfileInput,
  JurisdictionProfile,
  ListJurisdictionProfileInput,
  ListJurisdictionProfileResult,
  UpdateJurisdictionProfileInput,
} from "./jurisdiction.types.js";
import { JurisdictionError } from "./jurisdiction.types.js";

export interface JurisdictionRepository {
  createProfile(input: CreateJurisdictionProfileInput): Promise<JurisdictionProfile>;
  listProfiles(input: ListJurisdictionProfileInput): Promise<ListJurisdictionProfileResult>;
  findProfileById(tenantId: string, profileId: string): Promise<JurisdictionProfile | undefined>;
  updateProfile(input: UpdateJurisdictionProfileInput): Promise<JurisdictionProfile | undefined>;

  reset?(): void;
}

export class InMemoryJurisdictionRepository implements JurisdictionRepository {
  private readonly profiles = new Map<string, JurisdictionProfile>();

  async createProfile(input: CreateJurisdictionProfileInput): Promise<JurisdictionProfile> {
    // Chave natural (D-Ω5P-JUR-01): nome único por tenant. Guard app-level espelha o índice do Postgres.
    if (this.hasName(input.tenantId, input.name)) {
      throw new JurisdictionError(409, "JURISDICTION_CONFLICT", "duplicate_name", "A jurisdiction profile with this name already exists.");
    }
    const now = new Date();
    const profile: JurisdictionProfile = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      scope: input.scope,
      ownerNotifDays: input.ownerNotifDays,
      noticeEdictDay: input.noticeEdictDay,
      auctionEligibleDay: input.auctionEligibleDay,
      auctionEdictBusinessDays: input.auctionEdictBusinessDays,
      dailyModel: input.dailyModel,
      dailyCap: input.dailyCap,
      releaseRequirements: input.releaseRequirements,
      notes: input.notes,
      active: input.active ?? true,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async listProfiles(input: ListJurisdictionProfileInput): Promise<ListJurisdictionProfileResult> {
    const filtered = [...this.profiles.values()]
      .filter((profile) => profile.tenantId === input.tenantId)
      .filter((profile) => input.scope === undefined || profile.scope === input.scope)
      .filter((profile) => input.active === undefined || profile.active === input.active)
      .filter((profile) => matchesSearch(profile, input.search))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findProfileById(tenantId: string, profileId: string): Promise<JurisdictionProfile | undefined> {
    const profile = this.profiles.get(profileId);
    return profile?.tenantId === tenantId ? profile : undefined;
  }

  async updateProfile(input: UpdateJurisdictionProfileInput): Promise<JurisdictionProfile | undefined> {
    const current = await this.findProfileById(input.tenantId, input.profileId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name) {
      if (this.hasName(current.tenantId, input.name)) {
        throw new JurisdictionError(409, "JURISDICTION_CONFLICT", "duplicate_name", "A jurisdiction profile with this name already exists.");
      }
    }

    const updated: JurisdictionProfile = {
      ...current,
      name: input.name ?? current.name,
      scope: input.scope ?? current.scope,
      ownerNotifDays: input.ownerNotifDays ?? current.ownerNotifDays,
      noticeEdictDay: input.noticeEdictDay ?? current.noticeEdictDay,
      auctionEligibleDay: input.auctionEligibleDay ?? current.auctionEligibleDay,
      auctionEdictBusinessDays: input.auctionEdictBusinessDays ?? current.auctionEdictBusinessDays,
      dailyModel: input.dailyModel ?? current.dailyModel,
      dailyCap: input.dailyCap ?? current.dailyCap,
      releaseRequirements: input.releaseRequirements ?? current.releaseRequirements,
      notes: input.notes === undefined ? current.notes : input.notes ?? undefined,
      active: input.active ?? current.active,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.profiles.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.profiles.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.profiles.values()].some(
      (profile) => profile.tenantId === tenantId && profile.name === name,
    );
  }
}

function matchesSearch(profile: JurisdictionProfile, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [profile.name, profile.notes ?? ""].some((value) => value.toLowerCase().includes(normalized));
}
