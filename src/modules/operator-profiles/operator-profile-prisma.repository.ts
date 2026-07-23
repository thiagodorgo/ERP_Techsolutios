import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  OperatorProfile,
  CreateOperatorProfileInput,
  ListOperatorProfileInput,
  ListOperatorProfileResult,
  UpdateOperatorProfileInput,
} from "./operator-profile.types.js";
import { OperatorProfileError } from "./operator-profile.types.js";
import type { OperatorProfileRepository } from "./operator-profile.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaOperatorProfileRepository implements OperatorProfileRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateOperatorProfileInput): Promise<OperatorProfile> {
    try {
      const profile = await this.client.operatorProfile.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          full_name: input.fullName ?? null,
          cnh_number: input.cnhNumber ?? null,
          cnh_category: input.cnhCategory ?? null,
          cnh_expires_at: input.cnhExpiresAt ?? null,
          tracking_consent: input.trackingConsent,
          tracking_consent_at: input.trackingConsentAt ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapOperatorProfileRecord(profile);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListOperatorProfileInput): Promise<ListOperatorProfileResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.operatorProfile.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.operatorProfile.count({ where }),
    ]);
    return { items: items.map(mapOperatorProfileRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, profileId: string): Promise<OperatorProfile | undefined> {
    const profile = await this.client.operatorProfile.findFirst({ where: { tenant_id: tenantId, id: profileId } });
    return profile ? mapOperatorProfileRecord(profile) : undefined;
  }

  async findByUserId(tenantId: string, userId: string): Promise<OperatorProfile | undefined> {
    const profile = await this.client.operatorProfile.findFirst({ where: { tenant_id: tenantId, user_id: userId } });
    return profile ? mapOperatorProfileRecord(profile) : undefined;
  }

  async update(input: UpdateOperatorProfileInput): Promise<OperatorProfile | undefined> {
    try {
      // user_id NÃO é atualizado — vínculo imutável (referência estável 1-1).
      const updated = await this.client.operatorProfile.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.profileId },
        data: compactRecord({
          full_name: nullable(input.fullName),
          cnh_number: nullable(input.cnhNumber),
          cnh_category: nullable(input.cnhCategory),
          cnh_expires_at: nullable(input.cnhExpiresAt),
          tracking_consent: input.trackingConsent,
          tracking_consent_at: input.trackingConsentAt,
          phone: nullable(input.phone),
          notes: nullable(input.notes),
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapOperatorProfileRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}

export class RlsPrismaOperatorProfileRepository implements OperatorProfileRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateOperatorProfileInput): Promise<OperatorProfile> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaOperatorProfileRepository(tx).create(input));
  }

  list(input: ListOperatorProfileInput): Promise<ListOperatorProfileResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaOperatorProfileRepository(tx).list(input));
  }

  findById(tenantId: string, profileId: string): Promise<OperatorProfile | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaOperatorProfileRepository(tx).findById(tenantId, profileId));
  }

  findByUserId(tenantId: string, userId: string): Promise<OperatorProfile | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaOperatorProfileRepository(tx).findByUserId(tenantId, userId));
  }

  update(input: UpdateOperatorProfileInput): Promise<OperatorProfile | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaOperatorProfileRepository(tx).update(input));
  }
}

export async function createPrismaOperatorProfileRepository(): Promise<RlsPrismaOperatorProfileRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaOperatorProfileRepository(prisma);
}

function buildWhere(input: ListOperatorProfileInput): Prisma.OperatorProfileWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.hasConsent !== undefined ? { tracking_consent: input.hasConsent } : {}),
    ...(input.search
      ? {
          OR: [
            { full_name: { contains: input.search, mode: "insensitive" } },
            { cnh_number: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapOperatorProfileRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly full_name: string | null;
  readonly cnh_number: string | null;
  readonly cnh_category: string | null;
  readonly cnh_expires_at: Date | null;
  readonly tracking_consent: boolean;
  readonly tracking_consent_at: Date | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): OperatorProfile {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    userId: record.user_id,
    fullName: record.full_name ?? undefined,
    cnhNumber: record.cnh_number ?? undefined,
    cnhCategory: record.cnh_category ?? undefined,
    cnhExpiresAt: record.cnh_expires_at ?? undefined,
    trackingConsent: record.tracking_consent,
    trackingConsentAt: record.tracking_consent_at ?? undefined,
    phone: record.phone ?? undefined,
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (unique (tenant_id,user_id)) → 409 duplicate_profile (relação 1-1). P2003 (FK composta inválida —
// user inexistente ou de outro tenant) → 400 invalid_user_reference. Espelha o tratamento de FK do tariffs.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return new OperatorProfileError(409, "OPERATOR_PROFILE_CONFLICT", "duplicate_profile", "This user already has an operator profile.");
  }
  if (isPrismaError(error, "P2003")) {
    return new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", "invalid_user_reference", "The referenced user does not exist for this tenant.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
