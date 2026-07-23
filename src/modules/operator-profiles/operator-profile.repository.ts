import { randomUUID } from "node:crypto";

import type {
  OperatorProfile,
  CreateOperatorProfileInput,
  ListOperatorProfileInput,
  ListOperatorProfileResult,
  UpdateOperatorProfileInput,
} from "./operator-profile.types.js";
import { OperatorProfileError } from "./operator-profile.types.js";

export interface OperatorProfileRepository {
  create(input: CreateOperatorProfileInput): Promise<OperatorProfile>;
  list(input: ListOperatorProfileInput): Promise<ListOperatorProfileResult>;
  findById(tenantId: string, profileId: string): Promise<OperatorProfile | undefined>;
  // Ω4C PR-10 — ponte payee(User) → operator_profile (a folha). 1:1 pela unique (tenant_id, user_id). Leitura
  // tenant-scoped; undefined = usuário sem perfil profissional (usado pela liquidação de Remunerações).
  findByUserId(tenantId: string, userId: string): Promise<OperatorProfile | undefined>;
  update(input: UpdateOperatorProfileInput): Promise<OperatorProfile | undefined>;
  reset?(): void;
}

export class InMemoryOperatorProfileRepository implements OperatorProfileRepository {
  private readonly profiles = new Map<string, OperatorProfile>();

  async create(input: CreateOperatorProfileInput): Promise<OperatorProfile> {
    // Relação 1-1: um perfil por usuário (espelha a unique (tenant_id,user_id) do Postgres).
    if (this.hasUser(input.tenantId, input.userId)) {
      throw new OperatorProfileError(409, "OPERATOR_PROFILE_CONFLICT", "duplicate_profile", "This user already has an operator profile.");
    }

    const now = new Date();
    const profile: OperatorProfile = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  async list(input: ListOperatorProfileInput): Promise<ListOperatorProfileResult> {
    const filtered = this.sorted()
      .filter((profile) => profile.tenantId === input.tenantId)
      .filter((profile) => input.isActive === undefined || profile.isActive === input.isActive)
      .filter((profile) => input.hasConsent === undefined || profile.trackingConsent === input.hasConsent)
      .filter((profile) => matchesSearch(profile, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, profileId: string): Promise<OperatorProfile | undefined> {
    const profile = this.profiles.get(profileId);
    return profile?.tenantId === tenantId ? profile : undefined;
  }

  async findByUserId(tenantId: string, userId: string): Promise<OperatorProfile | undefined> {
    return [...this.profiles.values()].find(
      (profile) => profile.tenantId === tenantId && profile.userId === userId,
    );
  }

  async update(input: UpdateOperatorProfileInput): Promise<OperatorProfile | undefined> {
    const current = await this.findById(input.tenantId, input.profileId);
    if (!current) return undefined;

    const updated: OperatorProfile = {
      ...current,
      ...definedFields(input),
      // Consentimento LGPD: null limpa o carimbo de data; undefined preserva o valor atual.
      trackingConsentAt:
        input.trackingConsentAt === undefined ? current.trackingConsentAt : (input.trackingConsentAt ?? undefined),
      updatedAt: new Date(),
    };
    this.profiles.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.profiles.clear();
  }

  private hasUser(tenantId: string, userId: string): boolean {
    return [...this.profiles.values()].some((profile) => profile.tenantId === tenantId && profile.userId === userId);
  }

  private sorted(): OperatorProfile[] {
    return [...this.profiles.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(profile: OperatorProfile, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [profile.fullName, profile.cnhNumber]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
