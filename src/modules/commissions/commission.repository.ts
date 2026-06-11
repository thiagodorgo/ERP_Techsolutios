import { randomUUID } from "node:crypto";

import type {
  CommissionBasisEvent,
  CommissionCalculation,
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
} from "./commission.types.js";

export interface CommissionRepository {
  createPolicy(input: CreateCommissionPolicyInput): Promise<CommissionPolicy>;
  listPolicies(input: ListCommissionPoliciesInput): Promise<ListResult<CommissionPolicy>>;
  createBasisEvent(input: CreateCommissionBasisEventInput): Promise<CommissionBasisEvent>;
  listBasisEvents(input: ListCommissionBasisEventsInput): Promise<ListResult<CommissionBasisEvent>>;
  listCalculations(input: ListCommissionCalculationsInput): Promise<ListResult<CommissionCalculation>>;
  listStatements(input: ListCommissionStatementsInput): Promise<ListResult<CommissionStatement>>;
  reset?(): void;
}

export class InMemoryCommissionRepository implements CommissionRepository {
  private readonly policies = new Map<string, CommissionPolicy>();
  private readonly basisEvents = new Map<string, CommissionBasisEvent>();
  private readonly calculations = new Map<string, CommissionCalculation>();
  private readonly statements = new Map<string, CommissionStatement>();

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
    if (existing) return existing;

    const event: CommissionBasisEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceEventName: input.sourceEventName,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      occurredAt: input.occurredAt,
      status: input.status,
      policyId: input.policyId,
      createdAt: new Date(),
    };

    this.basisEvents.set(event.id, event);

    return event;
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
      .filter((calculation) => !input.payeeId || calculation.payeeId === input.payeeId);

    return paginate(items, input.limit, input.offset);
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
