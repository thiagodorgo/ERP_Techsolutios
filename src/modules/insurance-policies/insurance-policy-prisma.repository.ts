import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateInsurancePolicyInput,
  InsurancePolicy,
  InsuranceStoredStatus,
  ListInsurancePoliciesInput,
  ListInsurancePoliciesResult,
  UpdateInsurancePolicyInput,
} from "./insurance-policy.types.js";
import { duplicateNumeroApolice, type InsurancePolicyRepository } from "./insurance-policy.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaInsurancePolicyRepository implements InsurancePolicyRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateInsurancePolicyInput): Promise<InsurancePolicy> {
    try {
      const policy = await this.client.insurancePolicy.create({
        data: {
          tenant_id: input.tenantId,
          vehicle_id: input.vehicleId,
          seguradora: input.seguradora,
          numero_apolice: input.numeroApolice,
          vigencia_inicio: input.vigenciaInicio,
          vigencia_fim: input.vigenciaFim,
          valor: input.valor,
          cobertura: input.cobertura ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapInsurancePolicyRecord(policy);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateNumeroApolice();
      }

      throw error;
    }
  }

  async list(input: ListInsurancePoliciesInput): Promise<ListInsurancePoliciesResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.insurancePolicy.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.insurancePolicy.count({ where }),
    ]);

    return {
      items: items.map(mapInsurancePolicyRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, insurancePolicyId: string): Promise<InsurancePolicy | undefined> {
    const policy = await this.client.insurancePolicy.findFirst({
      where: {
        tenant_id: tenantId,
        id: insurancePolicyId,
      },
    });

    return policy ? mapInsurancePolicyRecord(policy) : undefined;
  }

  async update(input: UpdateInsurancePolicyInput): Promise<InsurancePolicy | undefined> {
    try {
      const updated = await this.client.insurancePolicy.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.insurancePolicyId,
        },
        data: compactRecord({
          vehicle_id: input.vehicleId,
          seguradora: input.seguradora,
          numero_apolice: input.numeroApolice,
          vigencia_inicio: input.vigenciaInicio,
          vigencia_fim: input.vigenciaFim,
          valor: input.valor,
          cobertura: nullable(input.cobertura),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapInsurancePolicyRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateNumeroApolice();
      }

      throw error;
    }
  }

  async listExpiringVigente(tenantId: string, now: Date, until: Date): Promise<InsurancePolicy[]> {
    const items = await this.client.insurancePolicy.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        status: "vigente",
        vigencia_fim: { gt: now, lte: until },
      },
      orderBy: [{ vigencia_fim: "asc" }, { created_at: "asc" }],
    });

    return items.map(mapInsurancePolicyRecord);
  }
}

export class RlsPrismaInsurancePolicyRepository implements InsurancePolicyRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateInsurancePolicyInput): Promise<InsurancePolicy> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInsurancePolicyRepository(tx).create(input));
  }

  list(input: ListInsurancePoliciesInput): Promise<ListInsurancePoliciesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInsurancePolicyRepository(tx).list(input));
  }

  findById(tenantId: string, insurancePolicyId: string): Promise<InsurancePolicy | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInsurancePolicyRepository(tx).findById(tenantId, insurancePolicyId),
    );
  }

  update(input: UpdateInsurancePolicyInput): Promise<InsurancePolicy | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInsurancePolicyRepository(tx).update(input));
  }

  listExpiringVigente(tenantId: string, now: Date, until: Date): Promise<InsurancePolicy[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInsurancePolicyRepository(tx).listExpiringVigente(tenantId, now, until),
    );
  }
}

export async function createPrismaInsurancePolicyRepository(): Promise<RlsPrismaInsurancePolicyRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaInsurancePolicyRepository(prisma);
}

function buildWhere(input: ListInsurancePoliciesInput): Prisma.InsurancePolicyWhereInput {
  const vigenciaFim: Prisma.DateTimeFilter = {};
  if (input.vigenciaFimGte) vigenciaFim.gte = input.vigenciaFimGte;
  if (input.vigenciaFimLt) vigenciaFim.lt = input.vigenciaFimLt;
  if (input.vigenciaFimLte) vigenciaFim.lte = input.vigenciaFimLte;

  return {
    tenant_id: input.tenantId,
    ...(input.vehicleId ? { vehicle_id: input.vehicleId } : {}),
    ...(input.storedStatus ? { status: input.storedStatus } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(Object.keys(vigenciaFim).length > 0 ? { vigencia_fim: vigenciaFim } : {}),
    ...(input.search
      ? {
          OR: [
            { seguradora: { contains: input.search, mode: "insensitive" } },
            { numero_apolice: { contains: input.search, mode: "insensitive" } },
            { cobertura: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapInsurancePolicyRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_id: string;
  readonly seguradora: string;
  readonly numero_apolice: string;
  readonly vigencia_inicio: Date;
  readonly vigencia_fim: Date;
  readonly valor: unknown;
  readonly cobertura: string | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): InsurancePolicy {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehicleId: record.vehicle_id,
    seguradora: record.seguradora,
    numeroApolice: record.numero_apolice,
    vigenciaInicio: record.vigencia_inicio,
    vigenciaFim: record.vigencia_fim,
    valor: decimalToNumber(record.valor),
    cobertura: record.cobertura ?? undefined,
    status: record.status as InsuranceStoredStatus,
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
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "P2002"
  );
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
