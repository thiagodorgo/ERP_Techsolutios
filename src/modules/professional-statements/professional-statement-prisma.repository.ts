import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateProfessionalStatementGroupInput,
  OperatorProfileLookup,
  ProfessionalStatementEntry,
  ProfessionalStatementLedgerQuery,
} from "./professional-statement.types.js";
import {
  invalidOperatorProfileReferenceError,
  sourceAlreadyLaunchedError,
  type ProfessionalStatementRepository,
} from "./professional-statement.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaProfessionalStatementRepository implements ProfessionalStatementRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createGroup(input: CreateProfessionalStatementGroupInput): Promise<ProfessionalStatementEntry[]> {
    try {
      const created = await this.client.professionalStatementEntry.createManyAndReturn({
        data: input.installments.map((installment) => ({
          tenant_id: input.tenantId,
          operator_profile_id: input.operatorProfileId,
          group_id: input.groupId,
          entry_type: input.entryType,
          direction: input.direction,
          description: input.description ?? null,
          amount: installment.amount,
          currency: input.currency,
          installment_number: installment.installmentNumber,
          installment_total: installment.installmentTotal,
          due_date: installment.dueDate,
          competencia: installment.competencia,
          status: "pending",
          source_type: input.sourceType ?? null,
          source_id: input.sourceId ?? null,
          client_action_id: input.clientActionId ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        })),
      });
      return created.map(mapRecord).sort((left, right) => left.installmentNumber - right.installmentNumber);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async findLedger(query: ProfessionalStatementLedgerQuery): Promise<ProfessionalStatementEntry[]> {
    const items = await this.client.professionalStatementEntry.findMany({
      where: {
        tenant_id: query.tenantId,
        operator_profile_id: query.operatorProfileId,
        deleted_at: null,
        ...(query.entryType !== undefined ? { entry_type: query.entryType } : {}),
        ...(query.from !== undefined || query.to !== undefined
          ? {
              due_date: {
                ...(query.from !== undefined ? { gte: query.from } : {}),
                ...(query.to !== undefined ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ due_date: "asc" }, { created_at: "asc" }, { id: "asc" }],
    });
    return items.map(mapRecord);
  }

  async findGroup(tenantId: string, groupId: string): Promise<ProfessionalStatementEntry[]> {
    const items = await this.client.professionalStatementEntry.findMany({
      where: { tenant_id: tenantId, group_id: groupId, deleted_at: null },
      orderBy: [{ installment_number: "asc" }],
    });
    return items.map(mapRecord);
  }

  async findActiveBySource(tenantId: string, sourceType: string, sourceId: string): Promise<ProfessionalStatementEntry[]> {
    const items = await this.client.professionalStatementEntry.findMany({
      where: { tenant_id: tenantId, source_type: sourceType, source_id: sourceId, deleted_at: null },
      orderBy: [{ installment_number: "asc" }],
    });
    return items.map(mapRecord);
  }

  async updateGroupDescription(
    tenantId: string,
    groupId: string,
    description: string,
    updatedBy?: string,
  ): Promise<ProfessionalStatementEntry[] | undefined> {
    const updated = await this.client.professionalStatementEntry.updateManyAndReturn({
      where: { tenant_id: tenantId, group_id: groupId, deleted_at: null },
      data: compactRecord({ description, updated_by: updatedBy }),
    });
    if (updated.length === 0) return undefined;
    return updated.map(mapRecord).sort((left, right) => left.installmentNumber - right.installmentNumber);
  }

  async softDeleteGroup(tenantId: string, groupId: string, deletedBy?: string): Promise<ProfessionalStatementEntry[] | undefined> {
    const removed = await this.client.professionalStatementEntry.updateManyAndReturn({
      where: { tenant_id: tenantId, group_id: groupId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    if (removed.length === 0) return undefined;
    return removed.map(mapRecord).sort((left, right) => left.installmentNumber - right.installmentNumber);
  }
}

// withTenantRls por operação: a transação carrega app.current_tenant_id → a policy USING/WITH CHECK escopa
// tudo por tenant. createGroup roda as N parcelas numa ÚNICA tx (atômico); o soft-delete do grupo idem.
export class RlsPrismaProfessionalStatementRepository implements ProfessionalStatementRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createGroup(input: CreateProfessionalStatementGroupInput): Promise<ProfessionalStatementEntry[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).createGroup(input));
  }
  findLedger(query: ProfessionalStatementLedgerQuery): Promise<ProfessionalStatementEntry[]> {
    return withTenantRls(this.prismaClient, query.tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).findLedger(query));
  }
  findGroup(tenantId: string, groupId: string): Promise<ProfessionalStatementEntry[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).findGroup(tenantId, groupId));
  }
  findActiveBySource(tenantId: string, sourceType: string, sourceId: string): Promise<ProfessionalStatementEntry[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).findActiveBySource(tenantId, sourceType, sourceId));
  }
  updateGroupDescription(tenantId: string, groupId: string, description: string, updatedBy?: string): Promise<ProfessionalStatementEntry[] | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).updateGroupDescription(tenantId, groupId, description, updatedBy));
  }
  softDeleteGroup(tenantId: string, groupId: string, deletedBy?: string): Promise<ProfessionalStatementEntry[] | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaProfessionalStatementRepository(tx).softDeleteGroup(tenantId, groupId, deletedBy));
  }
}

export async function createPrismaProfessionalStatementRepository(): Promise<RlsPrismaProfessionalStatementRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaProfessionalStatementRepository(prisma);
}

// Lookup Prisma do profissional: valida posse no tenant (dentro da RLS) e devolve SÓ o full_name como label
// (§2.8/LGPD — nunca CNH). undefined → o serviço traduz para 404 cross-tenant.
export async function createPrismaOperatorProfileLookup(): Promise<OperatorProfileLookup> {
  const { prisma } = await import("../../database/prisma.js");
  return (tenantId, operatorProfileId) =>
    withTenantRls(prisma, tenantId, async (tx) => {
      const profile = await tx.operatorProfile.findFirst({
        where: { tenant_id: tenantId, id: operatorProfileId },
        select: { full_name: true },
      });
      return profile ? { fullName: profile.full_name ?? undefined } : undefined;
    });
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly operator_profile_id: string;
  readonly group_id: string;
  readonly entry_type: string;
  readonly direction: string;
  readonly description: string | null;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly installment_number: number;
  readonly installment_total: number;
  readonly due_date: Date;
  readonly competencia: string;
  readonly status: string;
  readonly settled_at: Date | null;
  readonly settlement_ref: string | null;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): ProfessionalStatementEntry {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    operatorProfileId: record.operator_profile_id,
    groupId: record.group_id,
    entryType: record.entry_type,
    direction: record.direction,
    description: record.description ?? undefined,
    amount: Number(record.amount),
    currency: record.currency,
    installmentNumber: record.installment_number,
    installmentTotal: record.installment_total,
    dueDate: record.due_date,
    competencia: record.competencia,
    status: record.status,
    settledAt: record.settled_at ?? undefined,
    settlementRef: record.settlement_ref ?? undefined,
    sourceType: record.source_type ?? undefined,
    sourceId: record.source_id ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2002 (índice parcial de idempotência de origem) → 409 source_already_launched (reservado às integrações;
// o AJUSTE tem source_id NULL, nunca colide). P2003 (FK composta operator_profile inválida — perfil de outro
// tenant/inexistente) → 400 invalid_operator_profile_reference (backstop; o pré-check do serviço já dá 404).
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return sourceAlreadyLaunchedError();
  }
  if (isPrismaError(error, "P2003")) {
    return invalidOperatorProfileReferenceError();
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
