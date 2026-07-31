import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { VehicleIdentityRepository } from "./vehicle-identity.repository.js";
import type {
  ConfidenceLevel,
  CreateVehicleIdentityInput,
  ListVehicleIdentityInput,
  ListVehicleIdentityResult,
  UpdateVehicleIdentityInput,
  VehicleIdentity,
} from "./vehicle-identity.types.js";
import { VehicleIdentityError } from "./vehicle-identity.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaVehicleIdentityRepository implements VehicleIdentityRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    try {
      const created = await this.client.thirdPartyVehicleIdentity.create({
        data: {
          tenant_id: input.tenantId,
          plate_raw: input.plateRaw ?? null,
          plate_key: input.plateKey ?? null,
          chassis: input.chassis ?? null,
          renavam_key: input.renavamKey ?? null,
          brand: input.brand ?? null,
          model: input.model ?? null,
          color: input.color ?? null,
          year: input.year ?? null,
          unidentified: input.unidentified,
          unidentified_reason: input.unidentifiedReason ?? null,
          confidence: input.confidence ?? "PROVISIONAL",
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapIdentity(created);
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }

  async listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    const where = buildIdentityWhere(input);
    const [items, total] = await Promise.all([
      this.client.thirdPartyVehicleIdentity.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.thirdPartyVehicleIdentity.count({ where }),
    ]);
    return { items: items.map(mapIdentity), total, limit: input.limit, offset: input.offset };
  }

  async findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    const identity = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: tenantId, id: identityId } });
    return identity ? mapIdentity(identity) : undefined;
  }

  async updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    try {
      const updated = await this.client.thirdPartyVehicleIdentity.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.identityId },
        data: compact({
          plate_raw: input.plateRaw,
          plate_key: input.plateKey,
          chassis: input.chassis,
          renavam_key: input.renavamKey,
          brand: input.brand,
          model: input.model,
          color: input.color,
          year: input.year,
          unidentified: input.unidentified,
          unidentified_reason: input.unidentifiedReason,
          confidence: input.confidence,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapIdentity(updated[0]) : undefined;
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }
}

// Wrapper RLS: cada método abre uma transação com o contexto app.current_tenant_id (setTenantRlsContext) —
// mesmo padrão de RlsPrismaJurisdictionRepository.
export class RlsPrismaVehicleIdentityRepository implements VehicleIdentityRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).createIdentity(input));
  }

  listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).listIdentities(input));
  }

  findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).findIdentityById(tenantId, identityId));
  }

  updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).updateIdentity(input));
  }
}

export async function createPrismaVehicleIdentityRepository(): Promise<RlsPrismaVehicleIdentityRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaVehicleIdentityRepository(prisma);
}

function buildIdentityWhere(input: ListVehicleIdentityInput): Prisma.ThirdPartyVehicleIdentityWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.plateKey !== undefined ? { plate_key: input.plateKey } : {}),
    ...(input.search
      ? {
          OR: [
            { plate_raw: { contains: input.search, mode: "insensitive" } },
            { chassis: { contains: input.search, mode: "insensitive" } },
            { brand: { contains: input.search, mode: "insensitive" } },
            { model: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapIdentity(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly plate_raw: string | null;
  readonly plate_key: string | null;
  readonly chassis: string | null;
  readonly renavam_key: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly color: string | null;
  readonly year: number | null;
  readonly unidentified: boolean;
  readonly unidentified_reason: string | null;
  readonly confidence: string;
  readonly canonical_identity_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): VehicleIdentity {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    plateRaw: record.plate_raw ?? undefined,
    plateKey: record.plate_key ?? undefined,
    chassis: record.chassis ?? undefined,
    renavamKey: record.renavam_key ?? undefined,
    brand: record.brand ?? undefined,
    model: record.model ?? undefined,
    color: record.color ?? undefined,
    year: record.year ?? undefined,
    unidentified: record.unidentified,
    unidentifiedReason: record.unidentified_reason ?? undefined,
    confidence: record.confidence as ConfidenceLevel,
    canonicalIdentityId: record.canonical_identity_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (unique) não se aplica hoje (sem unique natural exposta neste CRUD — o índice de placa ativa é NÃO-único
// por desenho, D-Ω-VID-01). P2003 (FK) cobre um canonical_identity_id/identity_id de outro tenant ou inexistente
// — não alcançável por este módulo (não expõe esses campos), mas mantido por defesa em profundidade. CHECKs do
// banco (identity_chk/confidence_chk/merge_chk) chegam como P2010/23514 — traduzidos para 400 com o motivo.
function translateVehicleIdentityError(error: unknown): unknown {
  if (isPrismaError(error, "P2003")) {
    return new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  if (isCheckViolation(error)) {
    return new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "check_violation", "The identity data violates a database integrity rule.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

// Prisma reporta CHECK violations do Postgres (23514) como P2010 (raw failed) OU embutido na mensagem, a
// depender do caminho (client extension x driver adapter) — checagem defensiva pela mensagem.
function isCheckViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const message = "message" in error ? String((error as { readonly message?: unknown }).message ?? "") : "";
  return message.includes("23514") || message.toLowerCase().includes("violates check constraint");
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
