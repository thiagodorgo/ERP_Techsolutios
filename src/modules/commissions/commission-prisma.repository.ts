import { Prisma, type PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { decimalTextToCents, normalizeRateValueText } from "./commission-engine.js";
import {
  CommissionError,
  type CommissionBasisEvent,
  type CommissionBasisEventStatus,
  type CommissionCalculation,
  type CommissionCalculationStatus,
  type CommissionJsonRecord,
  type CommissionPayeeRateRecord,
  type CommissionPayeeSummary,
  type CommissionPolicy,
  type CommissionPolicyRule,
  type CommissionPolicyStatus,
  type CommissionRateType,
  type CommissionStatement,
  type CommissionStatementStatus,
  type CommissionUnit,
  type CreateCommissionBasisEventInput,
  type CreateCommissionPolicyInput,
  type EngineFinancialItemRow,
  type EnginePolicyInfo,
  type EngineRecalcCandidate,
  type EngineReconcileScope,
  type EngineReleaseCandidate,
  type EngineWorkOrderCandidate,
  type EngineWorkOrderSnapshot,
  type ListCommissionBasisEventsInput,
  type ListCommissionCalculationsInput,
  type ListCommissionPoliciesInput,
  type ListCommissionStatementsInput,
  type ListResult,
  type SummarizeCalculationsByPayeeInput,
  type UpsertPayeeCommissionRateInput,
} from "./commission.types.js";
import { commissionCents, commissionCentsOfSum } from "./commission-money.js";
import type { CommissionRepository } from "./commission.repository.js";
import {
  evaluateWorkOrderCommissionEligibility,
  isWorkOrderSourceType,
  readWorkOrderCancellationPrisma,
  resolveBasisEventStatusForVerdict,
} from "./work-order-cancellation.gate.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCommissionRepository implements CommissionRepository, CommissionUnit {
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
        totalCents: commissionCents(row._sum.amount),
        count: row._count,
      }))
      .sort((left, right) => right.total - left.total);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    // B-APP-ORG-2S (S2e) — o total geral em centavos sai da soma EXATA no `Decimal` do banco, arredondada uma vez.
    const totalCents = commissionCentsOfSum(grouped.filter((row) => row.payee_id !== null).map((row) => row._sum.amount));
    return { items, total, totalCents };
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

  async evaluateCalculationWorkOrderEligibility(
    tenantId: string,
    calculation: CommissionCalculation,
  ): Promise<"eligible" | "ineligible" | "pending_review"> {
    const evt = await this.client.commissionBasisEvent.findFirst({
      where: { tenant_id: tenantId, id: calculation.basisEventId },
      select: { source_type: true, source_id: true },
    });
    const snapWoId =
      typeof calculation.calculationSnapshot.workOrderId === "string"
        ? calculation.calculationSnapshot.workOrderId
        : undefined;
    const workOrderId = (evt && isWorkOrderSourceType(evt.source_type) ? evt.source_id : undefined) ?? snapWoId;
    if (!workOrderId) return "eligible";

    const state = await readWorkOrderCancellationPrisma(this.client, tenantId, workOrderId);
    return evaluateWorkOrderCommissionEligibility(state);
  }

  async runCommissionUnit<T>(_tenantId: string, work: (unit: CommissionUnit) => Promise<T>): Promise<T> {
    return work(this);
  }

  async ensureEnginePolicy(tenantId: string, actorUserId: string): Promise<void> {
    await this.client.$executeRaw`INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from, created_by) VALUES (${tenantId}::uuid, 'Comissão da organização', 'engine', 'field_services', 'active', now(), ${actorUserId}::uuid) ON CONFLICT (tenant_id) WHERE scope = 'engine' DO NOTHING /* commission_engine_policy_ensure */`; // B-COMISSAO:cria-politica
  }

  async lockCommissionRate(tenantId: string): Promise<string> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`SELECT id FROM commission_policies WHERE tenant_id = ${tenantId}::uuid AND scope = 'engine' FOR NO KEY UPDATE /* commission_rate_lock */`; // B-COMISSAO:trava-organizacao
    if (rows.length !== 1) throw commissionLockMissingError();
    return rows[0]!.id;
  }

  async lockCommissionPayee(tenantId: string, payeeUserId: string): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`SELECT id FROM operator_profiles WHERE tenant_id = ${tenantId}::uuid AND user_id = ${payeeUserId}::uuid FOR NO KEY UPDATE /* commission_payee_lock */`; // B-COMISSAO:trava-guincheiro
    return rows.length === 1; // B-COMISSAO:trava-devolve-existencia
  }

  async userExistsInTenant(tenantId: string, userId: string): Promise<boolean> {
    // B-COMISSAO:fora-da-organizacao
    const row = await this.client.user.findFirst({
      where: { tenant_id: tenantId, id: userId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findCurrentPayeeRate(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord | null> {
    const rows = await this.client.$queryRaw<PayeeRuleQueryRow[]>`
      SELECT r.id, r.tenant_id, r.policy_id, r.rule_type, r.basis_type, r.rate_type, r.rate_value::text AS rate_value_text, r.conditions, r.active, r.created_at
      FROM commission_policy_rules r
      JOIN commission_policies p ON p.tenant_id = r.tenant_id AND p.id = r.policy_id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND p.scope = 'engine'
        AND r.rule_type = 'engine_payee'
        AND r.active = true
        AND (r.conditions ->> 'payeeUserId') = ${payeeUserId}
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    return rows[0] ? mapPayeeRuleRow(rows[0]) : null;
  }

  async replacePayeeRate(
    policyId: string,
    input: UpsertPayeeCommissionRateInput,
    previousRuleId: string | null,
    now: Date,
  ): Promise<CommissionPayeeRateRecord> {
    const nowIso = now.toISOString();
    if (previousRuleId) {
      const prev = await this.client.commissionPolicyRule.findFirst({
        where: { tenant_id: input.tenantId, id: previousRuleId },
      });
      const prevConditions = isRecord(prev?.conditions) ? prev.conditions : {};
      await this.client.commissionPolicyRule.updateMany({
        where: { tenant_id: input.tenantId, id: previousRuleId, active: true },
        data: {
          active: false,
          conditions: toJsonObject({
            ...prevConditions,
            effectiveTo: nowIso,
          }),
          updated_at: now,
        },
      });
    }

    const conditions: Record<string, unknown> = {
      payeeUserId: input.payeeUserId,
      rateValueText: input.rateValueText,
      effectiveFrom: nowIso,
      effectiveTo: null,
      reason: input.reason,
      changedBy: input.actorUserId,
      // B-COMISSAO:marca-propria
      selfChange: input.selfChange,
    };

    const created = await this.client.commissionPolicyRule.create({
      data: {
        tenant_id: input.tenantId,
        policy_id: policyId,
        rule_type: "engine_payee",
        basis_type: "work_order_total",
        rate_type: input.rateType,
        rate_value: new Prisma.Decimal(input.rateValueText),
        conditions: toJsonObject(conditions),
        priority: 10,
        active: true,
        created_at: now,
        updated_at: now,
      },
    });

    return mapPayeeRuleRow({
      id: created.id,
      tenant_id: created.tenant_id,
      policy_id: created.policy_id,
      rule_type: created.rule_type,
      basis_type: created.basis_type,
      rate_type: created.rate_type,
      rate_value_text: input.rateValueText,
      conditions: created.conditions,
      active: created.active,
      created_at: created.created_at,
    });
  }

  async listCurrentPayeeRates(tenantId: string): Promise<CommissionPayeeRateRecord[]> {
    const rows = await this.client.$queryRaw<PayeeRuleQueryRow[]>`
      SELECT r.id, r.tenant_id, r.policy_id, r.rule_type, r.basis_type, r.rate_type, r.rate_value::text AS rate_value_text, r.conditions, r.active, r.created_at
      FROM commission_policy_rules r
      JOIN commission_policies p ON p.tenant_id = r.tenant_id AND p.id = r.policy_id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND p.scope = 'engine'
        AND r.rule_type = 'engine_payee'
        AND r.active = true
      ORDER BY r.created_at DESC
    `;
    return rows.map(mapPayeeRuleRow);
  }

  async listPayeeRateHistory(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord[] | null> {
    const exists = await this.userExistsInTenant(tenantId, payeeUserId);
    if (!exists) return null;
    const rows = await this.client.$queryRaw<PayeeRuleQueryRow[]>`
      SELECT r.id, r.tenant_id, r.policy_id, r.rule_type, r.basis_type, r.rate_type, r.rate_value::text AS rate_value_text, r.conditions, r.active, r.created_at
      FROM commission_policy_rules r
      JOIN commission_policies p ON p.tenant_id = r.tenant_id AND p.id = r.policy_id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND p.scope = 'engine'
        AND r.rule_type = 'engine_payee'
        AND (r.conditions ->> 'payeeUserId') = ${payeeUserId}
      ORDER BY r.created_at DESC, r.active DESC
    `;
    return rows.map(mapPayeeRuleRow);
  }

  async findEnginePolicies(tenantId: string): Promise<EnginePolicyInfo[]> {
    // B-COMISSAO:so-le-reservado
    const rows = await this.client.commissionPolicy.findMany({
      where: { tenant_id: tenantId, scope: "engine", status: "active" },
      select: { id: true, effective_from: true },
      orderBy: { created_at: "asc" },
    });
    return rows.map((r) => ({ id: r.id, effectiveFrom: r.effective_from }));
  }

  async listEngineCandidatesForReconcile(
    tenantId: string,
    policyEffectiveFrom: Date,
  ): Promise<EngineWorkOrderCandidate[]> {
    // Candidatas do passo 1 (plano §3.4): OS concluída, ou cancelada com "manter cobrança", desde o início da
    // política, sem o evento-base de chave canônica; até 500 por volta, da mais antiga para a mais nova. O instante
    // da OS é a conclusão; na cancelada, o cancelamento (`updated_at` só se a coluna vier nula, linha antiga).
    // B-COMISSAO:tenant-explicito — M23: a linha `WHERE wo.tenant_id = ${tenantId}::uuid` (predicado explícito da
    //   organização, Emenda 1 §E1.7, além do `withTenantRls`); a subconsulta do evento também casa por `tenant_id`.
    // B-COMISSAO:base-do-banco — M6: o evento que exclui a OS é só o do espaço reservado, pela chave canônica
    //   `engine:wo:<id>:v1` (Emenda 1 §E1.3); evento à mão, de outra chave, nunca conta como o evento do motor.
    const rows = await this.client.$queryRaw<
      Array<{
        id: string;
        code: string;
        status: string;
        occurred_at: Date;
        financial_cancellation_decision: string | null;
      }>
    >`
      SELECT wo.id, wo.code, wo.status, wo.financial_cancellation_decision,
             COALESCE(CASE WHEN wo.status = 'cancelled' THEN wo.cancelled_at ELSE wo.completed_at END, wo.updated_at) AS occurred_at
      FROM work_orders wo
      WHERE wo.tenant_id = ${tenantId}::uuid
        AND (wo.status = 'completed' OR (wo.status = 'cancelled' AND wo.financial_cancellation_decision = 'keep'))
        AND COALESCE(CASE WHEN wo.status = 'cancelled' THEN wo.cancelled_at ELSE wo.completed_at END, wo.updated_at) >= ${policyEffectiveFrom}
        AND NOT EXISTS (
          SELECT 1 FROM commission_basis_events evt
          WHERE evt.tenant_id = wo.tenant_id
            AND evt.idempotency_key = 'engine:wo:' || wo.id::text || ':v1'
        )
      ORDER BY occurred_at ASC, wo.id ASC
      LIMIT 500
    `;
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      completedAt: r.occurred_at,
      financialDecision: r.financial_cancellation_decision,
    }));
  }

  async readReconcileScope(tenantId: string): Promise<EngineReconcileScope> {
    const policies = await this.findEnginePolicies(tenantId);
    if (policies.length === 0) return { policies, candidates: [], releaseCandidates: [], recalcCandidates: [] };
    const [candidates, releaseCandidates, recalcCandidates] = await Promise.all([
      this.listEngineCandidatesForReconcile(tenantId, policies[0]!.effectiveFrom),
      this.listEngineReleaseCandidates(tenantId),
      this.listEngineRecalcCandidates(tenantId),
    ]);
    return { policies, candidates, releaseCandidates, recalcCandidates };
  }

  private async listEngineReleaseCandidates(tenantId: string): Promise<EngineReleaseCandidate[]> {
    const rows = await this.client.$queryRaw<Array<{ calculation_id: string; work_order_id: string }>>`
      SELECT c.id AS calculation_id, e.source_id AS work_order_id
      FROM commission_calculations c
      JOIN commission_basis_events e ON e.tenant_id = c.tenant_id AND e.id = c.basis_event_id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.idempotency_key LIKE 'engine:calc:%'
        AND c.status = 'calculated'
        AND c.settled_at IS NULL
        AND e.source_type = 'work_order'
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT 500
    `;
    return rows.map((r) => ({ calculationId: r.calculation_id, workOrderId: r.work_order_id }));
  }

  private async listEngineRecalcCandidates(tenantId: string): Promise<EngineRecalcCandidate[]> {
    // B-COMISSAO:pago-congela
    const rows = await this.client.$queryRaw<
      Array<{
        calculation_id: string;
        basis_event_id: string;
        policy_id: string;
        work_order_id: string;
        event_idempotency_key: string;
        status: string;
        settled_at: Date | null;
        calculation_snapshot: unknown;
      }>
    >`
      SELECT c.id AS calculation_id, c.basis_event_id, c.policy_id, e.source_id AS work_order_id,
             e.idempotency_key AS event_idempotency_key, c.status, c.settled_at, c.calculation_snapshot
      FROM commission_calculations c
      JOIN commission_basis_events e ON e.tenant_id = c.tenant_id AND e.id = c.basis_event_id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.idempotency_key LIKE 'engine:calc:%'
        AND c.status IN ('calculated', 'approved')
        AND c.settled_at IS NULL
        AND e.source_type = 'work_order'
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT 500
    `;
    return rows.map((r) => ({
      calculationId: r.calculation_id,
      basisEventId: r.basis_event_id,
      policyId: r.policy_id,
      workOrderId: r.work_order_id,
      eventIdempotencyKey: r.event_idempotency_key,
      status: r.status as CommissionCalculationStatus,
      settledAt: r.settled_at,
      snapshot: isRecord(r.calculation_snapshot) ? r.calculation_snapshot : {},
    }));
  }

  async lockAndReadWorkOrderForCommission(
    tenantId: string,
    workOrderId: string,
  ): Promise<EngineWorkOrderSnapshot | null> {
    const rows = await this.client.$queryRaw<
      Array<{
        id: string;
        code: string;
        status: string;
        assigned_user_id: string | null;
        service_catalog_id: string | null;
        occurred_at: Date;
        financial_cancellation_decision: string | null;
      }>
    >`
      SELECT id, code, status, assigned_user_id, service_catalog_id, financial_cancellation_decision,
             COALESCE(CASE WHEN status = 'cancelled' THEN cancelled_at ELSE completed_at END, updated_at) AS occurred_at
      FROM work_orders
      WHERE tenant_id = ${tenantId}::uuid AND id = ${workOrderId}::uuid
      FOR UPDATE /* commission_wo_lock */
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      assignedUserId: row.assigned_user_id,
      serviceCatalogId: row.service_catalog_id,
      completedAt: row.occurred_at,
      financialDecision: row.financial_cancellation_decision,
    };
  }

  async hasLiveEngineBasisEvent(tenantId: string, workOrderId: string): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM commission_basis_events
      WHERE tenant_id = ${tenantId}::uuid
        AND source_id = ${workOrderId}
        AND idempotency_key LIKE 'engine:wo:%'
        AND status <> 'superseded'
      LIMIT 1
    `;
    return rows.length > 0;
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
    const payloadJson = JSON.stringify(input.payload);
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      INSERT INTO commission_basis_events (
        tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id
      )
      VALUES (
        ${input.tenantId}::uuid,
        'work_order',
        ${input.workOrderId},
        ${input.sourceEventName},
        ${input.idempotencyKey},
        ${payloadJson}::jsonb,
        ${input.occurredAt},
        ${input.status},
        ${input.policyId}::uuid
      )
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  }

  async updateEngineBasisEventOutcome(
    tenantId: string,
    eventId: string,
    status: CommissionBasisEventStatus,
    payload: CommissionJsonRecord,
  ): Promise<void> {
    await this.client.commissionBasisEvent.updateMany({
      where: { tenant_id: tenantId, id: eventId },
      data: {
        status,
        payload: toJsonObject(payload),
      },
    });
  }

  async listActiveWorkOrderFinancialItems(
    tenantId: string,
    workOrderId: string,
  ): Promise<EngineFinancialItemRow[]> {
    const rows = await this.client.$queryRaw<Array<{ total_amount_text: string; currency: string }>>`
      SELECT total_amount::text AS total_amount_text, currency
      FROM work_order_financial_items
      WHERE tenant_id = ${tenantId}::uuid
        AND work_order_id = ${workOrderId}::uuid
        AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
    `;
    return rows.map((r) => ({ totalAmountText: r.total_amount_text, currency: r.currency }));
  }

  async listEngineRulesForPolicy(tenantId: string, policyId: string): Promise<CommissionPolicyRule[]> {
    const rows = await this.client.commissionPolicyRule.findMany({
      where: {
        tenant_id: tenantId,
        policy_id: policyId,
        rule_type: { startsWith: "engine_" },
      },
      orderBy: [{ priority: "asc" }, { created_at: "asc" }],
    });
    return rows.map(mapPolicyRuleRecord);
  }

  async hasLivePrimaryCalculationForEvent(tenantId: string, basisEventId: string): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM commission_calculations
      WHERE tenant_id = ${tenantId}::uuid
        AND basis_event_id = ${basisEventId}::uuid
        AND idempotency_key LIKE 'engine:calc:%'
        AND status <> 'reversed'
      LIMIT 1
    `;
    return rows.length > 0;
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
    const snapJson = JSON.stringify(input.calculationSnapshot);
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      INSERT INTO commission_calculations (
        tenant_id, basis_event_id, policy_id, eligible_user_id, payee_id, amount, currency, status, calculation_snapshot, idempotency_key
      )
      VALUES (
        ${input.tenantId}::uuid,
        ${input.basisEventId}::uuid,
        ${input.policyId}::uuid,
        ${input.payeeUserId}::uuid,
        ${input.payeeUserId}::uuid,
        ${input.amountDecimalText}::numeric,
        'BRL',
        ${input.status},
        ${snapJson}::jsonb,
        ${input.idempotencyKey}
      )
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  }

  async findLatestWorkOrderApprovalStatus(
    tenantId: string,
    workOrderId: string,
  ): Promise<"pending_approval" | "approved" | "rejected" | null> {
    const rows = await this.client.$queryRaw<Array<{ status: string }>>`
      SELECT status
      FROM operational_approvals
      WHERE tenant_id = ${tenantId}::uuid
        AND entity_type = 'work_order'
        AND work_order_id = ${workOrderId}::uuid
      ORDER BY requested_at DESC, id DESC
      LIMIT 1
    `;
    const status = rows[0]?.status;
    if (status === "pending_approval" || status === "approved" || status === "rejected") {
      return status;
    }
    return null;
  }

  async transitionCalculatedCommissionStatus(
    tenantId: string,
    calculationId: string,
    nextStatus: "approved" | "rejected",
  ): Promise<boolean> {
    const updated = await this.client.commissionCalculation.updateMany({
      where: {
        tenant_id: tenantId,
        id: calculationId,
        status: "calculated",
        settled_at: null,
      },
      data: {
        status: nextStatus,
        updated_at: new Date(),
      },
    });
    return updated.count === 1;
  }

  async lockAndReadEngineCalculationForRecalc(
    tenantId: string,
    calculationId: string,
  ): Promise<EngineRecalcCandidate | null> {
    const rows = await this.client.$queryRaw<
      Array<{
        calculation_id: string;
        basis_event_id: string;
        policy_id: string;
        work_order_id: string;
        event_idempotency_key: string;
        status: string;
        settled_at: Date | null;
        calculation_snapshot: unknown;
      }>
    >`
      SELECT c.id AS calculation_id, c.basis_event_id, c.policy_id, e.source_id AS work_order_id,
             e.idempotency_key AS event_idempotency_key, c.status, c.settled_at, c.calculation_snapshot
      FROM commission_calculations c
      JOIN commission_basis_events e ON e.tenant_id = c.tenant_id AND e.id = c.basis_event_id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.id = ${calculationId}::uuid
        AND c.idempotency_key LIKE 'engine:calc:%'
        AND c.status IN ('calculated', 'approved')
      FOR UPDATE OF c
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      calculationId: r.calculation_id,
      basisEventId: r.basis_event_id,
      policyId: r.policy_id,
      workOrderId: r.work_order_id,
      eventIdempotencyKey: r.event_idempotency_key,
      status: r.status as CommissionCalculationStatus,
      settledAt: r.settled_at,
      snapshot: isRecord(r.calculation_snapshot) ? r.calculation_snapshot : {},
    };
  }

  async markEngineBasisEventSuperseded(tenantId: string, basisEventId: string): Promise<boolean> {
    const updated = await this.client.commissionBasisEvent.updateMany({
      where: {
        tenant_id: tenantId,
        id: basisEventId,
        status: { not: "superseded" },
      },
      data: {
        status: "superseded",
      },
    });
    return updated.count === 1;
  }

  async markEngineCalculationReversed(tenantId: string, calculationId: string): Promise<boolean> {
    const updated = await this.client.commissionCalculation.updateMany({
      where: {
        tenant_id: tenantId,
        id: calculationId,
        status: { in: ["calculated", "approved"] },
      },
      data: {
        status: "reversed",
        updated_at: new Date(),
      },
    });
    return updated.count === 1;
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

  evaluateCalculationWorkOrderEligibility(
    tenantId: string,
    calculation: CommissionCalculation,
  ): Promise<"eligible" | "ineligible" | "pending_review"> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCommissionRepository(tx).evaluateCalculationWorkOrderEligibility(tenantId, calculation),
    );
  }

  runCommissionUnit<T>(tenantId: string, work: (unit: CommissionUnit) => Promise<T>): Promise<T> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => work(new PrismaCommissionRepository(tx)));
  }

  readReconcileScope(tenantId: string): Promise<EngineReconcileScope> {
    // B-COMISSAO:rls-varredura — M8: a leitura das políticas e das candidatas roda na transação do `withTenantRls`;
    //   a mutação a troca por `new PrismaCommissionRepository(this.prismaClient).readReconcileScope(tenantId)`.
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaCommissionRepository(tx).readReconcileScope(tenantId));
  }

  listCurrentPayeeRates(tenantId: string): Promise<CommissionPayeeRateRecord[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaCommissionRepository(tx).listCurrentPayeeRates(tenantId));
  }

  listPayeeRateHistory(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord[] | null> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCommissionRepository(tx).listPayeeRateHistory(tenantId, payeeUserId),
    );
  }

  findCurrentPayeeRate(tenantId: string, payeeUserId: string): Promise<CommissionPayeeRateRecord | null> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCommissionRepository(tx).findCurrentPayeeRate(tenantId, payeeUserId),
    );
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
    // B-APP-ORG-2S (S2e; Emenda 1.8.3.5 §1, D-DONO-2111-TELA-COMISSOES) / B-COMISSAO-MOTOR (R9, M18): o resumo não conta recusada nem estornada.
    status: { notIn: ["rejected", "reversed"] }, // B-COMISSAO:total-sem-estorno
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
    amountCents: commissionCents(record.amount),
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
  readonly amount: Prisma.Decimal;
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

type PayeeRuleQueryRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly policy_id: string;
  readonly rule_type: string;
  readonly basis_type: string;
  readonly rate_type: string;
  readonly rate_value_text: string;
  readonly conditions: unknown;
  readonly active: boolean;
  readonly created_at: Date;
};

function mapPayeeRuleRow(row: PayeeRuleQueryRow): CommissionPayeeRateRecord {
  const cond = isRecord(row.conditions) ? row.conditions : {};
  const rateType: CommissionRateType = row.rate_type === "fixed" ? "fixed" : "percent";
  const rawText = typeof cond.rateValueText === "string" ? cond.rateValueText : row.rate_value_text;
  const rateValue = normalizeRateValueText(rateType, rawText);
  const effectiveFrom = typeof cond.effectiveFrom === "string" ? new Date(cond.effectiveFrom) : row.created_at;
  const effectiveTo =
    typeof cond.effectiveTo === "string" && cond.effectiveTo.length > 0 ? new Date(cond.effectiveTo) : undefined;
  return {
    ruleId: row.id,
    policyId: row.policy_id,
    tenantId: row.tenant_id,
    payeeUserId: String(cond.payeeUserId ?? ""),
    rateType,
    rateValue,
    ...(rateType === "fixed" ? { rateValueCents: decimalTextToCents(rateValue).toString() } : {}),
    effectiveFrom,
    effectiveTo,
    active: row.active,
    reason: typeof cond.reason === "string" ? cond.reason : undefined,
    changedBy: typeof cond.changedBy === "string" ? cond.changedBy : undefined,
    selfChange: cond.selfChange === true,
    createdAt: row.created_at,
  };
}

function commissionLockMissingError(): CommissionError {
  return new CommissionError(
    500,
    "COMMISSION_LOCK_MISSING",
    "commission_lock_missing",
    "Engine commission policy lock row could not be acquired.",
  );
}
