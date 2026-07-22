import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateFineInput,
  Fine,
  FineStatus,
  ListFinesInput,
  ListFinesResult,
  UpdateFineInput,
} from "./fine.types.js";
import { FineError } from "./fine.types.js";
import { FINE_FINAL_NOTIFICATION_STATUSES, type FineRepository } from "./fine.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFineRepository implements FineRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFineInput): Promise<Fine> {
    try {
      const fine = await this.client.fine.create({
        data: {
          tenant_id: input.tenantId,
          vehicle_id: input.vehicleId,
          driver_id: input.driverId ?? null,
          responsible_operator_profile_id: input.responsibleOperatorProfileId ?? null,
          numero_auto: input.numeroAuto,
          data_infracao: input.dataInfracao,
          orgao: input.orgao,
          descricao: input.descricao ?? null,
          valor: input.valor,
          pontos: input.pontos ?? 0,
          prazo_recurso: input.prazoRecurso ?? null,
          prazo_pagamento: input.prazoPagamento ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapFineRecord(fine);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateNumeroAuto();
      }
      if (isForeignKeyViolation(error)) {
        throw invalidResponsibleReference();
      }

      throw error;
    }
  }

  async list(input: ListFinesInput): Promise<ListFinesResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.fine.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.fine.count({ where }),
    ]);

    return {
      items: items.map(mapFineRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, fineId: string): Promise<Fine | undefined> {
    const fine = await this.client.fine.findFirst({
      where: {
        tenant_id: tenantId,
        id: fineId,
      },
    });

    return fine ? mapFineRecord(fine) : undefined;
  }

  async update(input: UpdateFineInput): Promise<Fine | undefined> {
    try {
      const updated = await this.client.fine.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.fineId,
        },
        data: compactRecord({
          vehicle_id: input.vehicleId,
          driver_id: nullable(input.driverId),
          responsible_operator_profile_id: nullable(input.responsibleOperatorProfileId),
          numero_auto: input.numeroAuto,
          data_infracao: input.dataInfracao,
          orgao: input.orgao,
          descricao: nullable(input.descricao),
          valor: input.valor,
          pontos: input.pontos,
          prazo_recurso: nullable(input.prazoRecurso),
          prazo_pagamento: nullable(input.prazoPagamento),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapFineRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateNumeroAuto();
      }
      if (isForeignKeyViolation(error)) {
        throw invalidResponsibleReference();
      }

      throw error;
    }
  }

  async listDue(tenantId: string, now: Date, until: Date): Promise<Fine[]> {
    const items = await this.client.fine.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        status: { notIn: [...FINE_FINAL_NOTIFICATION_STATUSES] },
        OR: [
          { prazo_recurso: { gte: now, lte: until } },
          { prazo_pagamento: { gte: now, lte: until } },
        ],
      },
      orderBy: [{ prazo_pagamento: "asc" }, { prazo_recurso: "asc" }, { created_at: "asc" }],
    });

    return items.map(mapFineRecord);
  }
}

export class RlsPrismaFineRepository implements FineRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFineInput): Promise<Fine> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFineRepository(tx).create(input));
  }

  list(input: ListFinesInput): Promise<ListFinesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFineRepository(tx).list(input));
  }

  findById(tenantId: string, fineId: string): Promise<Fine | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFineRepository(tx).findById(tenantId, fineId));
  }

  update(input: UpdateFineInput): Promise<Fine | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFineRepository(tx).update(input));
  }

  listDue(tenantId: string, now: Date, until: Date): Promise<Fine[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFineRepository(tx).listDue(tenantId, now, until));
  }
}

export async function createPrismaFineRepository(): Promise<RlsPrismaFineRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaFineRepository(prisma);
}

function buildWhere(input: ListFinesInput): Prisma.FineWhereInput {
  const prazoFilters: Prisma.FineWhereInput[] = [];
  if (input.prazoFrom) {
    prazoFilters.push({
      OR: [
        { prazo_recurso: { gte: input.prazoFrom } },
        { prazo_pagamento: { gte: input.prazoFrom } },
      ],
    });
  }
  if (input.prazoTo) {
    prazoFilters.push({
      OR: [
        { prazo_recurso: { lte: input.prazoTo } },
        { prazo_pagamento: { lte: input.prazoTo } },
      ],
    });
  }

  return {
    tenant_id: input.tenantId,
    ...(input.vehicleId ? { vehicle_id: input.vehicleId } : {}),
    ...(input.driverId ? { driver_id: input.driverId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(prazoFilters.length > 0 ? { AND: prazoFilters } : {}),
    ...(input.search
      ? {
          OR: [
            { numero_auto: { contains: input.search, mode: "insensitive" } },
            { orgao: { contains: input.search, mode: "insensitive" } },
            { descricao: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapFineRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_id: string;
  readonly driver_id: string | null;
  readonly responsible_operator_profile_id: string | null;
  readonly numero_auto: string;
  readonly data_infracao: Date;
  readonly orgao: string;
  readonly descricao: string | null;
  readonly valor: unknown;
  readonly pontos: number;
  readonly prazo_recurso: Date | null;
  readonly prazo_pagamento: Date | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Fine {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehicleId: record.vehicle_id,
    driverId: record.driver_id ?? undefined,
    responsibleOperatorProfileId: record.responsible_operator_profile_id ?? undefined,
    numeroAuto: record.numero_auto,
    dataInfracao: record.data_infracao,
    orgao: record.orgao,
    descricao: record.descricao ?? undefined,
    valor: decimalToNumber(record.valor),
    pontos: record.pontos,
    prazoRecurso: record.prazo_recurso ?? undefined,
    prazoPagamento: record.prazo_pagamento ?? undefined,
    status: record.status as FineStatus,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isUniqueViolation(error: unknown): boolean {
  return isPrismaError(error, "P2002");
}

// P2003 — a FK composta (tenant_id, responsible_operator_profile_id) → operator_profiles falhou: o perfil
// não existe / é de outro tenant. O serviço já pré-valida (400), então este é o backstop do banco.
function isForeignKeyViolation(error: unknown): boolean {
  return isPrismaError(error, "P2003");
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === code
  );
}

function duplicateNumeroAuto(): FineError {
  return new FineError(409, "FINE_CONFLICT", "duplicate_numero_auto", "A fine with this numeroAuto already exists in this organization.");
}

function invalidResponsibleReference(): FineError {
  return new FineError(
    400,
    "FINE_INVALID",
    "invalid_operator_profile_reference",
    "responsibleOperatorProfileId does not reference a professional in this organization.",
  );
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
