import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { getMemoryOperatorProfileRepositoryForTests } from "../operator-profiles/operator-profile.service.js";
import { decimalTextToCents, engineWorkOrderEventKey, normalizeRateValueText } from "./commission-engine.js";
import { commissionCents, commissionCentsOfSum } from "./commission-money.js";
import type {
  CommissionBasisEvent,
  CommissionBasisEventStatus,
  CommissionCalculation,
  CommissionCalculationStatus,
  CommissionJsonRecord,
  CommissionPayeeRateRecord,
  CommissionPayeeSummary,
  CommissionPolicy,
  CommissionPolicyRule,
  CommissionRateType,
  CommissionStatement,
  CommissionUnit,
  CreateCommissionBasisEventInput,
  CreateCommissionPolicyInput,
  EngineFinancialItemRow,
  EnginePolicyInfo,
  EngineReconcileScope,
  EngineWorkOrderCandidate,
  EngineWorkOrderSnapshot,
  ListCommissionBasisEventsInput,
  ListCommissionCalculationsInput,
  ListCommissionPoliciesInput,
  ListCommissionStatementsInput,
  ListResult,
  SummarizeCalculationsByPayeeInput,
  UpsertPayeeCommissionRateInput,
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
  runCommissionUnit<T>(tenantId: string, work: (unit: CommissionUnit) => Promise<T>): Promise<T>;
  // B-COMISSAO-MOTOR (F3) — o escopo da volta da varredura (políticas do motor + OS candidatas), lido no contexto
  // da organização. No Prisma, dentro de `withTenantRls` (M8); na memória, direto do dublê.
  readReconcileScope(tenantId: string): Promise<EngineReconcileScope>;
  listCurrentPayeeRates(tenantId: string): Promise<CommissionPayeeRateRecord[]>;
  listPayeeRateHistory(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord[] | null>;
  findCurrentPayeeRate(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord | null>;
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

export class InMemoryCommissionRepository implements CommissionRepository, CommissionUnit {
  private readonly policies = new Map<string, CommissionPolicy>();
  private readonly basisEvents = new Map<string, CommissionBasisEvent>();
  private readonly calculations = new Map<string, CommissionCalculation>();
  private readonly statements = new Map<string, CommissionStatement>();
  private readonly tenantUsers = new Map<string, Set<string>>();
  private userExistsChecker?: (tenantId: string, userId: string) => Promise<boolean>;
  // Dublê do estado de cancelamento da OS (WS-SCALE-COMISSAO). Semeável nos testes para provar a
  // supressão; sem estado, `resolve` devolve null (OS não-encontrada → elegível).
  readonly workOrderGate = new InMemoryWorkOrderCancellationGate();
  // B-COMISSAO-MOTOR (F3) — dublê das OS que o motor lê (situação, guincheiro, conclusão, itens). A memória não tem
  // `work_orders` nem itens; o teste semeia, no idioma do `workOrderGate`. Sem semente, nenhuma OS é candidata.
  readonly engineWorkOrders = new InMemoryEngineWorkOrderSource();

  setUserExistsChecker(checker: (tenantId: string, userId: string) => Promise<boolean>): void {
    this.userExistsChecker = checker;
  }

  registerTenantUserForTests(tenantId: string, userId: string): void {
    let set = this.tenantUsers.get(tenantId);
    if (!set) {
      set = new Set<string>();
      this.tenantUsers.set(tenantId, set);
    }
    set.add(userId);
  }

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
    // B-APP-ORG-2S (S2e) — o dublê em memória guarda `number`; os centavos saem do `Decimal` montado a partir dele
    // (não é o caminho de produção: o CS1, o CS2 e o CS2b rodam no Postgres).
    const totals = new Map<string, { total: number; totalDecimal: Prisma.Decimal; count: number }>();

    for (const calculation of this.calculations.values()) {
      if (calculation.tenantId !== input.tenantId) continue;
      if (!calculation.payeeId) continue;
      if (input.payeeId && calculation.payeeId !== input.payeeId) continue;
      if (!withinRange(calculation.createdAt, input.from, input.to)) continue;
      // Emenda 1.8.3.5 §1 — a mesma regra do Prisma: o resumo não conta recusada nem estornada.
      if (calculation.status === "rejected" || calculation.status === "reversed") continue;

      const current = totals.get(calculation.payeeId) ?? { total: 0, totalDecimal: new Prisma.Decimal(0), count: 0 };
      totals.set(calculation.payeeId, {
        total: current.total + calculation.amount,
        totalDecimal: current.totalDecimal.plus(new Prisma.Decimal(calculation.amount)),
        count: current.count + 1,
      });
    }

    const items = [...totals.entries()]
      .map(([payeeId, aggregate]) => ({
        payeeId,
        total: aggregate.total,
        totalCents: commissionCents(aggregate.totalDecimal),
        count: aggregate.count,
      }))
      .sort((left, right) => right.total - left.total);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const totalCents = commissionCentsOfSum([...totals.values()].map((aggregate) => aggregate.totalDecimal));

    return { items, total, totalCents };
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
      amountCents: commissionCents(new Prisma.Decimal(input.amount)),
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

  async runCommissionUnit<T>(_tenantId: string, work: (unit: CommissionUnit) => Promise<T>): Promise<T> {
    return work(this);
  }

  async ensureEnginePolicy(tenantId: string, actorUserId: string): Promise<void> {
    const existing = [...this.policies.values()].find((p) => p.tenantId === tenantId && p.scope === "engine");
    if (existing) return;
    const now = new Date();
    const policyId = randomUUID();
    this.policies.set(policyId, {
      id: policyId,
      tenantId,
      name: "Comissão da organização",
      scope: "engine",
      vertical: "field_services",
      status: "active",
      effectiveFrom: now,
      version: 1,
      createdBy: actorUserId,
      createdAt: now,
      updatedAt: now,
      rules: [],
    });
  }

  async lockCommissionRate(tenantId: string): Promise<string> {
    const existing = [...this.policies.values()].find((p) => p.tenantId === tenantId && p.scope === "engine");
    if (!existing) {
      throw new Error("Engine commission policy lock missing.");
    }
    return existing.id;
  }

  async lockCommissionPayee(tenantId: string, payeeUserId: string): Promise<boolean> {
    const profile = await getMemoryOperatorProfileRepositoryForTests().findByUserId(tenantId, payeeUserId);
    return Boolean(profile);
  }

  async userExistsInTenant(tenantId: string, userId: string): Promise<boolean> {
    if (this.tenantUsers.get(tenantId)?.has(userId)) {
      return true;
    }
    if (this.userExistsChecker) {
      return this.userExistsChecker(tenantId, userId);
    }
    return false;
  }

  async findCurrentPayeeRate(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord | null> {
    const policy = [...this.policies.values()].find((p) => p.tenantId === tenantId && p.scope === "engine");
    if (!policy) return null;
    const activeRule = policy.rules.find(
      (r) => r.ruleType === "engine_payee" && r.active && r.conditions.payeeUserId === payeeUserId,
    );
    return activeRule ? mapMemoryRuleToPayeeRate(activeRule) : null;
  }

  async replacePayeeRate(
    policyId: string,
    input: UpsertPayeeCommissionRateInput,
    previousRuleId: string | null,
    now: Date,
  ): Promise<CommissionPayeeRateRecord> {
    const policy = this.policies.get(policyId);
    if (!policy || policy.tenantId !== input.tenantId) {
      throw new Error("Engine policy not found in memory.");
    }
    const updatedRules: CommissionPolicyRule[] = policy.rules.map((r) => {
      if (previousRuleId && r.id === previousRuleId) {
        return {
          ...r,
          active: false,
          conditions: {
            ...r.conditions,
            effectiveTo: now.toISOString(),
          },
          updatedAt: now,
        };
      }
      return r;
    });

    const newRule: CommissionPolicyRule = {
      id: randomUUID(),
      tenantId: input.tenantId,
      policyId,
      ruleType: "engine_payee",
      basisType: "work_order_total",
      rateType: input.rateType,
      rateValue: Number(input.rateValueText),
      conditions: {
        payeeUserId: input.payeeUserId,
        rateValueText: input.rateValueText,
        effectiveFrom: now.toISOString(),
        effectiveTo: null,
        reason: input.reason,
        changedBy: input.actorUserId,
        // B-COMISSAO:marca-propria
        selfChange: input.selfChange,
      },
      priority: 10,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    updatedRules.push(newRule);
    this.policies.set(policyId, { ...policy, rules: updatedRules, updatedAt: now });
    return mapMemoryRuleToPayeeRate(newRule);
  }

  async listCurrentPayeeRates(tenantId: string): Promise<CommissionPayeeRateRecord[]> {
    const policy = [...this.policies.values()].find((p) => p.tenantId === tenantId && p.scope === "engine");
    if (!policy) return [];
    return policy.rules
      .filter((r) => r.ruleType === "engine_payee" && r.active && typeof r.conditions.payeeUserId === "string")
      .map(mapMemoryRuleToPayeeRate)
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  }

  async listPayeeRateHistory(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord[] | null> {
    const exists = await this.userExistsInTenant(tenantId, payeeUserId);
    if (!exists) return null;
    const policy = [...this.policies.values()].find((p) => p.tenantId === tenantId && p.scope === "engine");
    if (!policy) return [];
    return policy.rules
      .filter((r) => r.ruleType === "engine_payee" && r.conditions.payeeUserId === payeeUserId)
      .map(mapMemoryRuleToPayeeRate)
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime() || (b.active ? 1 : 0) - (a.active ? 1 : 0));
  }

  async findEnginePolicies(tenantId: string): Promise<EnginePolicyInfo[]> {
    return [...this.policies.values()]
      .filter((p) => p.tenantId === tenantId && p.scope === "engine" && p.status === "active")
      .map((p) => ({ id: p.id, effectiveFrom: p.effectiveFrom }));
  }

  async listEngineCandidatesForReconcile(
    tenantId: string,
    policyEffectiveFrom: Date,
  ): Promise<EngineWorkOrderCandidate[]> {
    // Mesma regra do repositório Prisma: concluída (ou cancelada com "manter cobrança") desde o início da política, e
    // sem o evento-base de chave canônica `engine:wo:<id>:v1`. Até 500, da mais antiga para a mais nova.
    return this.engineWorkOrders
      .listForTenant(tenantId)
      .filter((wo) => isEngineCandidateStatus(wo.status, wo.financialDecision))
      .filter((wo) => engineOccurrenceInstant(wo).getTime() >= policyEffectiveFrom.getTime())
      .filter(
        (wo) =>
          ![...this.basisEvents.values()].some(
            (e) => e.tenantId === tenantId && e.idempotencyKey === engineWorkOrderEventKey(wo.id, 1),
          ),
      )
      .sort((a, b) => engineOccurrenceInstant(a).getTime() - engineOccurrenceInstant(b).getTime() || a.id.localeCompare(b.id))
      .slice(0, 500)
      .map((wo) => ({
        id: wo.id,
        code: wo.code,
        status: wo.status,
        completedAt: engineOccurrenceInstant(wo),
        financialDecision: wo.financialDecision,
      }));
  }

  async lockAndReadWorkOrderForCommission(
    tenantId: string,
    workOrderId: string,
  ): Promise<EngineWorkOrderSnapshot | null> {
    // Na memória não há trava de linha: a prova da corrida é com banco (plano §6.2). Aqui só a leitura do dublê.
    const wo = this.engineWorkOrders.find(tenantId, workOrderId);
    if (!wo) return null;
    return {
      id: wo.id,
      code: wo.code,
      status: wo.status,
      assignedUserId: wo.assignedUserId,
      serviceCatalogId: wo.serviceCatalogId,
      completedAt: engineOccurrenceInstant(wo),
      financialDecision: wo.financialDecision,
    };
  }

  async readReconcileScope(tenantId: string): Promise<EngineReconcileScope> {
    const policies = await this.findEnginePolicies(tenantId);
    if (policies.length === 0) return { policies, candidates: [] };
    const candidates = await this.listEngineCandidatesForReconcile(tenantId, policies[0]!.effectiveFrom);
    return { policies, candidates };
  }

  async hasLiveEngineBasisEvent(tenantId: string, workOrderId: string): Promise<boolean> {
    return [...this.basisEvents.values()].some(
      (e) =>
        e.tenantId === tenantId &&
        e.sourceId === workOrderId &&
        e.idempotencyKey.startsWith("engine:wo:") &&
        e.status !== "superseded",
    );
  }

  async insertEngineBasisEventIfAbsent(input: {
    readonly tenantId: string;
    readonly policyId: string;
    readonly workOrderId: string;
    readonly sourceEventName: string;
    readonly idempotencyKey: string;
    readonly occurredAt: Date;
    readonly status: CommissionBasisEventStatus;
    readonly payload: CommissionJsonRecord;
  }): Promise<string | null> {
    const exists = [...this.basisEvents.values()].some(
      (e) => e.tenantId === input.tenantId && e.idempotencyKey === input.idempotencyKey,
    );
    if (exists) return null;
    const id = randomUUID();
    this.basisEvents.set(id, {
      id,
      tenantId: input.tenantId,
      sourceType: "work_order",
      sourceId: input.workOrderId,
      sourceEventName: input.sourceEventName,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      occurredAt: input.occurredAt,
      status: input.status,
      policyId: input.policyId,
      createdAt: new Date(),
    });
    return id;
  }

  async updateEngineBasisEventOutcome(
    tenantId: string,
    eventId: string,
    status: CommissionBasisEventStatus,
    payload: CommissionJsonRecord,
  ): Promise<void> {
    const existing = this.basisEvents.get(eventId);
    if (existing && existing.tenantId === tenantId) {
      this.basisEvents.set(eventId, { ...existing, status, payload });
    }
  }

  async listActiveWorkOrderFinancialItems(
    tenantId: string,
    workOrderId: string,
  ): Promise<EngineFinancialItemRow[]> {
    const wo = this.engineWorkOrders.find(tenantId, workOrderId);
    return wo ? wo.items.map((item) => ({ totalAmountText: item.totalAmountText, currency: item.currency })) : [];
  }

  async listEngineRulesForPolicy(tenantId: string, policyId: string): Promise<CommissionPolicyRule[]> {
    const policy = this.policies.get(policyId);
    if (!policy || policy.tenantId !== tenantId) return [];
    return policy.rules.filter((r) => r.ruleType.startsWith("engine_"));
  }

  async hasLivePrimaryCalculationForEvent(tenantId: string, basisEventId: string): Promise<boolean> {
    return [...this.calculations.values()].some(
      (c) =>
        c.tenantId === tenantId &&
        c.basisEventId === basisEventId &&
        c.idempotencyKey.startsWith("engine:calc:") &&
        c.status !== "reversed",
    );
  }

  async insertEnginePrimaryCalculationIfAbsent(input: {
    readonly tenantId: string;
    readonly basisEventId: string;
    readonly policyId: string;
    readonly payeeUserId: string;
    readonly amountDecimalText: string;
    readonly status: CommissionCalculationStatus;
    readonly calculationSnapshot: CommissionJsonRecord;
    readonly idempotencyKey: string;
  }): Promise<string | null> {
    const exists = [...this.calculations.values()].some(
      (c) => c.tenantId === input.tenantId && c.idempotencyKey === input.idempotencyKey,
    );
    if (exists) return null;
    const id = randomUUID();
    const now = new Date();
    const amountNum = Number(input.amountDecimalText);
    this.calculations.set(id, {
      id,
      tenantId: input.tenantId,
      basisEventId: input.basisEventId,
      policyId: input.policyId,
      eligibleUserId: input.payeeUserId,
      payeeId: input.payeeUserId,
      amount: amountNum,
      amountCents: commissionCents(new Prisma.Decimal(input.amountDecimalText)),
      currency: "BRL",
      status: input.status,
      calculationSnapshot: input.calculationSnapshot,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  reset(): void {
    this.policies.clear();
    this.basisEvents.clear();
    this.calculations.clear();
    this.statements.clear();
    this.tenantUsers.clear();
    this.workOrderGate.reset();
    this.engineWorkOrders.reset();
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

function mapMemoryRuleToPayeeRate(rule: CommissionPolicyRule): CommissionPayeeRateRecord {
  const rateType: CommissionRateType = rule.rateType === "fixed" ? "fixed" : "percent";
  const rawText = typeof rule.conditions.rateValueText === "string" ? rule.conditions.rateValueText : String(rule.rateValue);
  const rateValue = normalizeRateValueText(rateType, rawText);
  const effectiveFrom =
    typeof rule.conditions.effectiveFrom === "string" ? new Date(rule.conditions.effectiveFrom) : rule.createdAt;
  const effectiveTo =
    typeof rule.conditions.effectiveTo === "string" && rule.conditions.effectiveTo.length > 0
      ? new Date(rule.conditions.effectiveTo)
      : undefined;
  return {
    ruleId: rule.id,
    policyId: rule.policyId,
    tenantId: rule.tenantId,
    payeeUserId: String(rule.conditions.payeeUserId ?? ""),
    rateType,
    rateValue,
    ...(rateType === "fixed" ? { rateValueCents: decimalTextToCents(rateValue).toString() } : {}),
    effectiveFrom,
    effectiveTo,
    active: rule.active,
    reason: typeof rule.conditions.reason === "string" ? rule.conditions.reason : undefined,
    changedBy: typeof rule.conditions.changedBy === "string" ? rule.conditions.changedBy : undefined,
    selfChange: rule.conditions.selfChange === true,
    createdAt: rule.createdAt,
  };
}

/** B-COMISSAO-MOTOR (F3) — o que o teste semeia como OS que o motor lê, na memória. */
export type InMemoryEngineWorkOrderSeed = {
  readonly id: string;
  readonly code: string;
  readonly status: string;
  readonly assignedUserId: string | null;
  readonly serviceCatalogId?: string | null;
  readonly completedAt?: Date | null;
  readonly cancelledAt?: Date | null;
  readonly updatedAt?: Date;
  readonly financialDecision?: string | null;
  readonly items?: ReadonlyArray<{ readonly totalAmountText: string; readonly currency?: string }>;
};

type InMemoryEngineWorkOrderRow = {
  readonly tenantId: string;
  readonly id: string;
  readonly code: string;
  readonly status: string;
  readonly assignedUserId: string | null;
  readonly serviceCatalogId: string | null;
  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly updatedAt: Date;
  readonly financialDecision: string | null;
  readonly items: ReadonlyArray<{ readonly totalAmountText: string; readonly currency: string }>;
};

/** Dublê das OS do motor na memória (o idioma do `InMemoryWorkOrderCancellationGate`): só o que o teste semeia. */
export class InMemoryEngineWorkOrderSource {
  private readonly rows = new Map<string, InMemoryEngineWorkOrderRow>();

  seed(tenantId: string, seed: InMemoryEngineWorkOrderSeed): void {
    this.rows.set(`${tenantId}:${seed.id}`, {
      tenantId,
      id: seed.id,
      code: seed.code,
      status: seed.status,
      assignedUserId: seed.assignedUserId,
      serviceCatalogId: seed.serviceCatalogId ?? null,
      completedAt: seed.completedAt ?? null,
      cancelledAt: seed.cancelledAt ?? null,
      updatedAt: seed.updatedAt ?? new Date(),
      financialDecision: seed.financialDecision ?? null,
      items: (seed.items ?? []).map((item) => ({ totalAmountText: item.totalAmountText, currency: item.currency ?? "BRL" })),
    });
  }

  find(tenantId: string, workOrderId: string): InMemoryEngineWorkOrderRow | undefined {
    return this.rows.get(`${tenantId}:${workOrderId}`);
  }

  listForTenant(tenantId: string): InMemoryEngineWorkOrderRow[] {
    return [...this.rows.values()].filter((row) => row.tenantId === tenantId);
  }

  reset(): void {
    this.rows.clear();
  }
}

function isEngineCandidateStatus(status: string, financialDecision: string | null): boolean {
  return status === "completed" || (status === "cancelled" && financialDecision === "keep");
}

/** O instante da OS que decide a vigência: a conclusão; na cancelada com "manter cobrança", o cancelamento. */
function engineOccurrenceInstant(wo: InMemoryEngineWorkOrderRow): Date {
  return (wo.status === "cancelled" ? wo.cancelledAt : wo.completedAt) ?? wo.updatedAt;
}
