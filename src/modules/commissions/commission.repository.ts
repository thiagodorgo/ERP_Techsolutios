import { randomUUID } from "node:crypto";

import type {
  CommissionBasisEvent,
  CommissionCalculation,
  CommissionCalculationStatus,
  CommissionJsonRecord,
  CommissionPayeeSummary,
  CommissionPolicy,
  CommissionPolicyRule,
  CommissionStatement,
  CreateCommissionBasisEventInput,
  CreateCommissionPolicyInput,
  ListCommissionBasisEventsInput,
  ListCommissionCalculationsInput,
  ListCommissionPoliciesInput,
  ListCommissionStatementsInput,
  ListResult,
  SummarizeCalculationsByPayeeInput,
} from "./commission.types.js";
import {
  evaluateWorkOrderCommissionEligibility,
  InMemoryWorkOrderCancellationGate,
  isWorkOrderSourceType,
  resolveBasisEventStatusForVerdict,
} from "./work-order-cancellation.gate.js";

export interface CommissionRepository {
  createPolicy(input: CreateCommissionPolicyInput): Promise<CommissionPolicy>;
  listPolicies(input: ListCommissionPoliciesInput): Promise<ListResult<CommissionPolicy>>;
  createBasisEvent(input: CreateCommissionBasisEventInput): Promise<CommissionBasisEvent>;
  listBasisEvents(input: ListCommissionBasisEventsInput): Promise<ListResult<CommissionBasisEvent>>;
  listCalculations(input: ListCommissionCalculationsInput): Promise<ListResult<CommissionCalculation>>;
  summarizeCalculationsByPayee(input: SummarizeCalculationsByPayeeInput): Promise<CommissionPayeeSummary>;
  listStatements(input: ListCommissionStatementsInput): Promise<ListResult<CommissionStatement>>;
  // Ω4C PR-10 — carrega as calculations tenant-scoped por id (para a conferência/liquidação em lote). O que
  // não pertence ao tenant simplesmente não volta → 404 no serviço (isolamento multi-tenant).
  findCalculationsByIds(tenantId: string, ids: readonly string[]): Promise<CommissionCalculation[]>;
  // Ω4C PR-10 — marca o calculation como liquidado (settled_at/settlement_ref). Guarda `settled_at IS NULL`
  // (dupla-guarda de idempotência): já liquidada → undefined (0 linhas), nunca re-marca.
  markSettled(
    tenantId: string,
    calculationId: string,
    settledAt: Date,
    settlementRef: string,
  ): Promise<CommissionCalculation | undefined>;
  reset?(): void;
}

export type SeedCommissionCalculationInput = {
  readonly tenantId: string;
  readonly payeeId?: string;
  readonly amount: number;
  readonly id?: string;
  readonly basisEventId?: string;
  readonly policyId?: string;
  readonly eligibleUserId?: string;
  readonly currency?: string;
  readonly status?: CommissionCalculationStatus;
  readonly calculationSnapshot?: CommissionJsonRecord;
  readonly idempotencyKey?: string;
  readonly createdAt?: Date;
  // Ω4C PR-10 — semear linha JÁ liquidada (prova do skip idempotente `already_settled`). O compute é test-only.
  readonly settledAt?: Date;
  readonly settlementRef?: string;
};

export class InMemoryCommissionRepository implements CommissionRepository {
  private readonly policies = new Map<string, CommissionPolicy>();
  private readonly basisEvents = new Map<string, CommissionBasisEvent>();
  private readonly calculations = new Map<string, CommissionCalculation>();
  private readonly statements = new Map<string, CommissionStatement>();
  // Dublê do estado de cancelamento da OS (WS-SCALE-COMISSAO). Semeável nos testes para provar a
  // supressão; sem estado, `resolve` devolve null (OS não-encontrada → elegível).
  readonly workOrderGate = new InMemoryWorkOrderCancellationGate();

  async createPolicy(input: CreateCommissionPolicyInput): Promise<CommissionPolicy> {
    const now = new Date();
    const policyId = randomUUID();
    const rules: CommissionPolicyRule[] = input.rules.map((rule) => ({
      id: randomUUID(),
      tenantId: input.tenantId,
      policyId,
      ruleType: rule.ruleType,
      basisType: rule.basisType,
      rateType: rule.rateType,
      rateValue: rule.rateValue,
      conditions: rule.conditions,
      priority: rule.priority,
      active: rule.active,
      createdAt: now,
      updatedAt: now,
    }));
    const policy: CommissionPolicy = {
      id: policyId,
      tenantId: input.tenantId,
      name: input.name,
      scope: input.scope,
      vertical: input.vertical,
      status: input.status,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      version: input.version,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      rules,
    };

    this.policies.set(policy.id, policy);

    return policy;
  }

  async listPolicies(input: ListCommissionPoliciesInput): Promise<ListResult<CommissionPolicy>> {
    const items = this.sortedPolicies()
      .filter((policy) => policy.tenantId === input.tenantId)
      .filter((policy) => !input.status || policy.status === input.status)
      .filter((policy) => !input.vertical || policy.vertical === input.vertical);

    return paginate(items, input.limit, input.offset);
  }

  async createBasisEvent(input: CreateCommissionBasisEventInput): Promise<CommissionBasisEvent> {
    const existing = [...this.basisEvents.values()].find(
      (event) => event.tenantId === input.tenantId && event.idempotencyKey === input.idempotencyKey,
    );
    // Idempotência PRIMEIRO: replay devolve o existente sem re-gatear (estado da OS pode ter mudado
    // depois — o resultado do replay deve ser estável).
    if (existing) return existing;

    const status = await this.resolveBasisEventStatus(input);

    const event: CommissionBasisEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceEventName: input.sourceEventName,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      occurredAt: input.occurredAt,
      status,
      policyId: input.policyId,
      createdAt: new Date(),
    };

    this.basisEvents.set(event.id, event);

    return event;
  }

  // WS-SCALE-COMISSAO — para basis events de OS, honra a decisão de cancelamento da OS: `ineligible`
  // (suprime) / `pending_review` (segura) / mantém o status pedido (elegível). Espelha exatamente o
  // ramo do repositório Prisma (mesma regra pura).
  private async resolveBasisEventStatus(
    input: CreateCommissionBasisEventInput,
  ): Promise<CommissionBasisEvent["status"]> {
    if (!isWorkOrderSourceType(input.sourceType)) return input.status;

    const state = await this.workOrderGate.resolve(input.tenantId, input.sourceId);
    const verdict = evaluateWorkOrderCommissionEligibility(state);

    return resolveBasisEventStatusForVerdict(input.status, verdict);
  }

  async listBasisEvents(input: ListCommissionBasisEventsInput): Promise<ListResult<CommissionBasisEvent>> {
    const items = this.sortedBasisEvents()
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => !input.sourceType || event.sourceType === input.sourceType)
      .filter((event) => !input.sourceId || event.sourceId === input.sourceId)
      .filter((event) => !input.status || event.status === input.status);

    return paginate(items, input.limit, input.offset);
  }

  async listCalculations(input: ListCommissionCalculationsInput): Promise<ListResult<CommissionCalculation>> {
    const items = this.sortedCalculations()
      .filter((calculation) => calculation.tenantId === input.tenantId)
      .filter((calculation) => !input.status || calculation.status === input.status)
      .filter((calculation) => !input.payeeId || calculation.payeeId === input.payeeId)
      .filter((calculation) => withinRange(calculation.createdAt, input.from, input.to));
    const page = paginate(items, input.limit, input.offset);

    return { ...page, items: this.attachBasisOrigin(page.items, input.tenantId) };
  }

  // Drill-down enrichment: resolve each calculation's basis origin (source_type/source_id)
  // from its linked basis event via a single lookup pass (no per-row query).
  private attachBasisOrigin(calculations: readonly CommissionCalculation[], tenantId: string): CommissionCalculation[] {
    return calculations.map((calculation) => {
      const event = this.basisEvents.get(calculation.basisEventId);

      if (!event || event.tenantId !== tenantId) return calculation;

      return { ...calculation, sourceType: event.sourceType, sourceId: event.sourceId };
    });
  }

  async summarizeCalculationsByPayee(input: SummarizeCalculationsByPayeeInput): Promise<CommissionPayeeSummary> {
    const totals = new Map<string, { total: number; count: number }>();

    for (const calculation of this.calculations.values()) {
      if (calculation.tenantId !== input.tenantId) continue;
      if (!calculation.payeeId) continue;
      if (input.payeeId && calculation.payeeId !== input.payeeId) continue;
      if (!withinRange(calculation.createdAt, input.from, input.to)) continue;

      const current = totals.get(calculation.payeeId) ?? { total: 0, count: 0 };
      totals.set(calculation.payeeId, {
        total: current.total + calculation.amount,
        count: current.count + 1,
      });
    }

    const items = [...totals.entries()]
      .map(([payeeId, aggregate]) => ({ payeeId, total: aggregate.total, count: aggregate.count }))
      .sort((left, right) => right.total - left.total);
    const total = items.reduce((sum, item) => sum + item.total, 0);

    return { items, total };
  }

  seedCalculationForTests(input: SeedCommissionCalculationInput): CommissionCalculation {
    const now = input.createdAt ?? new Date();
    const calculation: CommissionCalculation = {
      id: input.id ?? randomUUID(),
      tenantId: input.tenantId,
      basisEventId: input.basisEventId ?? randomUUID(),
      policyId: input.policyId ?? randomUUID(),
      eligibleUserId: input.eligibleUserId,
      payeeId: input.payeeId,
      amount: input.amount,
      currency: input.currency ?? "BRL",
      status: input.status ?? "calculated",
      calculationSnapshot: input.calculationSnapshot ?? {},
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      settledAt: input.settledAt,
      settlementRef: input.settlementRef,
      createdAt: now,
      updatedAt: now,
    };

    this.calculations.set(calculation.id, calculation);

    return calculation;
  }

  // Ω4C PR-10 — carrega calculations tenant-scoped por id (dedupe já feito no validator). Não enriquece
  // basis origin (a liquidação não precisa de source_type — usa amount + payee).
  async findCalculationsByIds(tenantId: string, ids: readonly string[]): Promise<CommissionCalculation[]> {
    const idSet = new Set(ids);
    return [...this.calculations.values()].filter(
      (calculation) => calculation.tenantId === tenantId && idSet.has(calculation.id),
    );
  }

  // Ω4C PR-10 — marca liquidado só se ainda não liquidado (dupla-guarda). Já liquidado → undefined (no-op).
  async markSettled(
    tenantId: string,
    calculationId: string,
    settledAt: Date,
    settlementRef: string,
  ): Promise<CommissionCalculation | undefined> {
    const current = this.calculations.get(calculationId);
    if (!current || current.tenantId !== tenantId || current.settledAt) return undefined;
    const updated: CommissionCalculation = { ...current, settledAt, settlementRef, updatedAt: new Date() };
    this.calculations.set(calculationId, updated);
    return updated;
  }

  async listStatements(input: ListCommissionStatementsInput): Promise<ListResult<CommissionStatement>> {
    const items = this.sortedStatements()
      .filter((statement) => statement.tenantId === input.tenantId)
      .filter((statement) => !input.status || statement.status === input.status)
      .filter((statement) => !input.payeeId || statement.payeeId === input.payeeId);

    return paginate(items, input.limit, input.offset);
  }

  reset(): void {
    this.policies.clear();
    this.basisEvents.clear();
    this.calculations.clear();
    this.statements.clear();
    this.workOrderGate.reset();
  }

  private sortedPolicies(): CommissionPolicy[] {
    return [...this.policies.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private sortedBasisEvents(): CommissionBasisEvent[] {
    return [...this.basisEvents.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private sortedCalculations(): CommissionCalculation[] {
    return [...this.calculations.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private sortedStatements(): CommissionStatement[] {
    return [...this.statements.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function paginate<T>(items: readonly T[], limit: number, offset: number): ListResult<T> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}

function withinRange(value: Date, from?: Date, to?: Date): boolean {
  const timestamp = value.getTime();

  if (from && timestamp < from.getTime()) return false;
  if (to && timestamp > to.getTime()) return false;

  return true;
}
