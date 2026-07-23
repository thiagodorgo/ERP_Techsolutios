import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CommissionBasisEvent,
  CommissionBasisEventStatus,
  CommissionCalculation,
  CommissionCalculationStatus,
  CommissionPayeeSummary,
  CommissionPolicy,
  CommissionPolicyRule,
  CommissionPolicyStatus,
  CommissionStatement,
  CommissionStatementStatus,
  CreateCommissionBasisEventInput,
  CreateCommissionPolicyInput,
  ListCommissionBasisEventsInput,
  ListCommissionCalculationsInput,
  ListCommissionPoliciesInput,
  ListCommissionStatementsInput,
  ListResult,
  SummarizeCalculationsByPayeeInput,
} from "./commission.types.js";
import type { CommissionRepository } from "./commission.repository.js";
import {
  evaluateWorkOrderCommissionEligibility,
  isWorkOrderSourceType,
  readWorkOrderCancellationPrisma,
  resolveBasisEventStatusForVerdict,
} from "./work-order-cancellation.gate.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCommissionRepository implements CommissionRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createPolicy(input: CreateCommissionPolicyInput): Promise<CommissionPolicy> {
    const policy = await this.client.commissionPolicy.create({
      data: {
        tenant_id: input.tenantId,
        name: input.name,
        scope: input.scope,
        vertical: input.vertical,
        status: input.status,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        version: input.version,
        created_by: input.createdBy ?? null,
      },
    });

    if (input.rules.length > 0) {
      await this.client.commissionPolicyRule.createMany({
        data: input.rules.map((rule) => ({
          tenant_id: input.tenantId,
          policy_id: policy.id,
          rule_type: rule.ruleType,
          basis_type: rule.basisType,
          rate_type: rule.rateType,
          rate_value: rule.rateValue,
          conditions: toJsonObject(rule.conditions),
          priority: rule.priority,
          active: rule.active,
        })),
      });
    }

    const persisted = await this.client.commissionPolicy.findFirst({
      where: {
        tenant_id: input.tenantId,
        id: policy.id,
      },
      include: policyInclude,
    });

    return mapPolicyRecord(persisted ?? { ...policy, rules: [] });
  }

  async listPolicies(input: ListCommissionPoliciesInput): Promise<ListResult<CommissionPolicy>> {
    const where = buildPolicyWhere(input);
    const [items, total] = await Promise.all([
      this.client.commissionPolicy.findMany({
        where,
        include: policyInclude,
        orderBy: [
          { created_at: "desc" },
          { name: "asc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.commissionPolicy.count({ where }),
    ]);

    return {
      items: items.map(mapPolicyRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async createBasisEvent(input: CreateCommissionBasisEventInput): Promise<CommissionBasisEvent> {
    const existing = await this.client.commissionBasisEvent.findUnique({
      where: {
        tenant_id_idempotency_key: {
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        },
      },
    });
    // Idempotência PRIMEIRO: replay devolve o existente sem re-gatear (estado da OS pode ter mudado
    // depois — o resultado do replay deve ser estável).
    if (existing) return mapBasisEventRecord(existing);

    // WS-SCALE-COMISSAO — a supressão roda AQUI, dentro da tx `withTenantRls` (o RlsPrismaCommissionRepository
    // embrulha esta chamada): `this.client` é a tx com `app.current_tenant_id` setado, então o read de
    // `work_orders` respeita a policy FORCE RLS (fora dela, o read voltaria vazio → fail-open).
    const status = await this.resolveBasisEventStatus(input);

    const event = await this.client.commissionBasisEvent.create({
      data: {
        tenant_id: input.tenantId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        source_event_name: input.sourceEventName,
        idempotency_key: input.idempotencyKey,
        payload: toJsonObject(input.payload),
        occurred_at: input.occurredAt,
        status,
        policy_id: input.policyId ?? null,
      },
    });

    return mapBasisEventRecord(event);
  }

  // WS-SCALE-COMISSAO — para basis events de OS, honra a decisão de cancelamento: `ineligible` (suprime),
  // `pending_review` (segura) ou mantém o status pedido (elegível). Roda dentro da tx RLS (this.client é a tx).
  private async resolveBasisEventStatus(
    input: CreateCommissionBasisEventInput,
  ): Promise<CommissionBasisEvent["status"]> {
    if (!isWorkOrderSourceType(input.sourceType)) return input.status;

    const state = await readWorkOrderCancellationPrisma(this.client, input.tenantId, input.sourceId);
    const verdict = evaluateWorkOrderCommissionEligibility(state);

    return resolveBasisEventStatusForVerdict(input.status, verdict);
  }

  async listBasisEvents(input: ListCommissionBasisEventsInput): Promise<ListResult<CommissionBasisEvent>> {
    const where = buildBasisEventWhere(input);
    const [items, total] = await Promise.all([
      this.client.commissionBasisEvent.findMany({
        where,
        orderBy: [
          { created_at: "desc" },
          { occurred_at: "desc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.commissionBasisEvent.count({ where }),
    ]);

    return {
      items: items.map(mapBasisEventRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async listCalculations(input: ListCommissionCalculationsInput): Promise<ListResult<CommissionCalculation>> {
    const where = buildCalculationWhere(input);
    const [items, total] = await Promise.all([
      this.client.commissionCalculation.findMany({
        where,
        orderBy: [
          { created_at: "desc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.commissionCalculation.count({ where }),
    ]);

    return {
      items: await this.attachBasisOrigin(items.map(mapCalculationRecord), input.tenantId),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  // Drill-down enrichment: resolve the page's basis events in ONE query (batch, no N+1)
  // and pass through each calculation's real source_type/source_id.
  private async attachBasisOrigin(
    calculations: readonly CommissionCalculation[],
    tenantId: string,
  ): Promise<CommissionCalculation[]> {
    const basisEventIds = [...new Set(calculations.map((calculation) => calculation.basisEventId))];

    if (basisEventIds.length === 0) {
      return [...calculations];
    }

    const events = await this.client.commissionBasisEvent.findMany({
      where: { tenant_id: tenantId, id: { in: basisEventIds } },
      select: { id: true, source_type: true, source_id: true },
    });
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return calculations.map((calculation) => {
      const event = eventsById.get(calculation.basisEventId);

      if (!event) return calculation;

      return { ...calculation, sourceType: event.source_type, sourceId: event.source_id };
    });
  }

  // Ω4C PR-10 — carrega calculations tenant-scoped por id para a conferência/liquidação. O que não é do tenant
  // não volta (a policy RLS + o filtro tenant_id o garantem) → 404 no serviço.
  async findCalculationsByIds(tenantId: string, ids: readonly string[]): Promise<CommissionCalculation[]> {
    if (ids.length === 0) return [];
    const items = await this.client.commissionCalculation.findMany({
      where: { tenant_id: tenantId, id: { in: [...ids] } },
    });
    return items.map(mapCalculationRecord);
  }

  // Ω4C PR-10 — marca liquidado com guarda DURO `settled_at: null` (idempotência no banco): re-liquidar não
  // re-marca (0 linhas → undefined). settlement_ref = o group_id do crédito no extrato (deep-link).
  async markSettled(
    tenantId: string,
    calculationId: string,
    settledAt: Date,
    settlementRef: string,
  ): Promise<CommissionCalculation | undefined> {
    const updated = await this.client.commissionCalculation.updateManyAndReturn({
      where: { tenant_id: tenantId, id: calculationId, settled_at: null },
      data: { settled_at: settledAt, settlement_ref: settlementRef },
    });
    return updated[0] ? mapCalculationRecord(updated[0]) : undefined;
  }

  async summarizeCalculationsByPayee(input: SummarizeCalculationsByPayeeInput): Promise<CommissionPayeeSummary> {
    const grouped = await this.client.commissionCalculation.groupBy({
      by: ["payee_id"],
      where: buildSummaryWhere(input),
      _sum: { amount: true },
      _count: true,
    });

    const items = grouped
      .filter((row): row is typeof row & { payee_id: string } => row.payee_id !== null)
      .map((row) => ({
        payeeId: row.payee_id,
        total: decimalToNumber(row._sum.amount),
        count: row._count,
      }))
      .sort((left, right) => right.total - left.total);
    const total = items.reduce((sum, item) => sum + item.total, 0);

    return { items, total };
  }

  async listStatements(input: ListCommissionStatementsInput): Promise<ListResult<CommissionStatement>> {
    const where = buildStatementWhere(input);
    const [items, total] = await Promise.all([
      this.client.commissionStatement.findMany({
        where,
        orderBy: [
          { period_start: "desc" },
          { created_at: "desc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.commissionStatement.count({ where }),
    ]);

    return {
      items: items.map(mapStatementRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }
}

export class RlsPrismaCommissionRepository implements CommissionRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createPolicy(input: CreateCommissionPolicyInput): Promise<CommissionPolicy> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).createPolicy(input));
  }

  listPolicies(input: ListCommissionPoliciesInput): Promise<ListResult<CommissionPolicy>> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).listPolicies(input));
  }

  createBasisEvent(input: CreateCommissionBasisEventInput): Promise<CommissionBasisEvent> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).createBasisEvent(input));
  }

  listBasisEvents(input: ListCommissionBasisEventsInput): Promise<ListResult<CommissionBasisEvent>> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).listBasisEvents(input));
  }

  listCalculations(input: ListCommissionCalculationsInput): Promise<ListResult<CommissionCalculation>> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).listCalculations(input));
  }

  findCalculationsByIds(tenantId: string, ids: readonly string[]): Promise<CommissionCalculation[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaCommissionRepository(tx).findCalculationsByIds(tenantId, ids));
  }

  markSettled(
    tenantId: string,
    calculationId: string,
    settledAt: Date,
    settlementRef: string,
  ): Promise<CommissionCalculation | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCommissionRepository(tx).markSettled(tenantId, calculationId, settledAt, settlementRef),
    );
  }

  summarizeCalculationsByPayee(input: SummarizeCalculationsByPayeeInput): Promise<CommissionPayeeSummary> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).summarizeCalculationsByPayee(input));
  }

  listStatements(input: ListCommissionStatementsInput): Promise<ListResult<CommissionStatement>> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCommissionRepository(tx).listStatements(input));
  }
}

export async function createPrismaCommissionRepository(): Promise<RlsPrismaCommissionRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaCommissionRepository(prisma);
}

const policyInclude = {
  rules: {
    orderBy: [
      { priority: "asc" },
      { created_at: "asc" },
    ],
  },
} satisfies Prisma.CommissionPolicyInclude;

function buildPolicyWhere(input: ListCommissionPoliciesInput): Prisma.CommissionPolicyWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.vertical ? { vertical: input.vertical } : {}),
  };
}

function buildBasisEventWhere(input: ListCommissionBasisEventsInput): Prisma.CommissionBasisEventWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.sourceType ? { source_type: input.sourceType } : {}),
    ...(input.sourceId ? { source_id: input.sourceId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

function buildCalculationWhere(input: ListCommissionCalculationsInput): Prisma.CommissionCalculationWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.payeeId ? { payee_id: input.payeeId } : {}),
    ...buildCreatedAtRange(input.from, input.to),
  };
}

function buildSummaryWhere(input: SummarizeCalculationsByPayeeInput): Prisma.CommissionCalculationWhereInput {
  return {
    tenant_id: input.tenantId,
    payee_id: input.payeeId ? input.payeeId : { not: null },
    ...buildCreatedAtRange(input.from, input.to),
  };
}

function buildCreatedAtRange(from?: Date, to?: Date): Prisma.CommissionCalculationWhereInput {
  if (!from && !to) return {};

  return {
    created_at: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

function buildStatementWhere(input: ListCommissionStatementsInput): Prisma.CommissionStatementWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.payeeId ? { payee_id: input.payeeId } : {}),
  };
}

function mapPolicyRecord(record: PolicyRecord): CommissionPolicy {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    scope: record.scope,
    vertical: record.vertical,
    status: record.status as CommissionPolicyStatus,
    effectiveFrom: record.effective_from,
    effectiveTo: record.effective_to ?? undefined,
    version: record.version,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    rules: (record.rules ?? []).map(mapPolicyRuleRecord),
  };
}

function mapPolicyRuleRecord(record: PolicyRuleRecord): CommissionPolicyRule {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    policyId: record.policy_id,
    ruleType: record.rule_type,
    basisType: record.basis_type,
    rateType: record.rate_type,
    rateValue: decimalToNumber(record.rate_value),
    conditions: isRecord(record.conditions) ? record.conditions : {},
    priority: record.priority,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapBasisEventRecord(record: BasisEventRecord): CommissionBasisEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    sourceType: record.source_type,
    sourceId: record.source_id,
    sourceEventName: record.source_event_name,
    idempotencyKey: record.idempotency_key,
    payload: isRecord(record.payload) ? record.payload : {},
    occurredAt: record.occurred_at,
    status: record.status as CommissionBasisEventStatus,
    policyId: record.policy_id ?? undefined,
    createdAt: record.created_at,
  };
}

function mapCalculationRecord(record: CalculationRecord): CommissionCalculation {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    basisEventId: record.basis_event_id,
    policyId: record.policy_id,
    eligibleUserId: record.eligible_user_id ?? undefined,
    payeeId: record.payee_id ?? undefined,
    amount: decimalToNumber(record.amount),
    currency: record.currency,
    status: record.status as CommissionCalculationStatus,
    calculationSnapshot: isRecord(record.calculation_snapshot) ? record.calculation_snapshot : {},
    idempotencyKey: record.idempotency_key,
    settledAt: record.settled_at ?? undefined,
    settlementRef: record.settlement_ref ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapStatementRecord(record: StatementRecord): CommissionStatement {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    payeeId: record.payee_id,
    periodStart: record.period_start,
    periodEnd: record.period_end,
    status: record.status as CommissionStatementStatus,
    totalAmount: decimalToNumber(record.total_amount),
    currency: record.currency,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type PolicyRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly scope: string;
  readonly vertical: string;
  readonly status: string;
  readonly effective_from: Date;
  readonly effective_to: Date | null;
  readonly version: number;
  readonly created_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly rules?: readonly PolicyRuleRecord[];
};

type PolicyRuleRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly policy_id: string;
  readonly rule_type: string;
  readonly basis_type: string;
  readonly rate_type: string;
  readonly rate_value: unknown;
  readonly conditions: unknown;
  readonly priority: number;
  readonly active: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type BasisEventRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly source_type: string;
  readonly source_id: string;
  readonly source_event_name: string;
  readonly idempotency_key: string;
  readonly payload: unknown;
  readonly occurred_at: Date;
  readonly status: string;
  readonly policy_id: string | null;
  readonly created_at: Date;
};

type CalculationRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly basis_event_id: string;
  readonly policy_id: string;
  readonly eligible_user_id: string | null;
  readonly payee_id: string | null;
  readonly amount: unknown;
  readonly currency: string;
  readonly status: string;
  readonly calculation_snapshot: unknown;
  readonly idempotency_key: string;
  readonly settled_at: Date | null;
  readonly settlement_ref: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type StatementRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly payee_id: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly status: string;
  readonly total_amount: unknown;
  readonly currency: string;
  readonly created_at: Date;
  readonly updated_at: Date;
};
