import type { Prisma, PrismaClient } from "@prisma/client";

import type { WorkOrderFinancialCancellationDecision } from "../work-orders/work-order.types.js";

/**
 * WS-SCALE-COMISSAO (P-Ω3F6-COMISSAO) — a decisão financeira gravada na OS ao cancelar
 * (`work_orders.financial_cancellation_decision`) é a FONTE DE VERDADE que o módulo de comissões
 * honra: uma OS cancelada com `zero`/`keep_unpaid` NÃO deve remunerar o profissional; `keep` remunera
 * (serviço prestado); cancelada SEM decisão (legado, PATCH /status bypass) é AMBÍGUA e nunca pode ser
 * lida como `keep` (requisito crítico J-Ω3F-6A) → segura para revisão.
 *
 * Este gate é o "leitor" do estado de cancelamento da OS; a REGRA (verdict) é a função pura
 * `evaluateWorkOrderCommissionEligibility`, reusada pela futura engine de cálculo (dual-gate,
 * P-Ω3F6-COMISSAO-REVERSAL).
 */

export type WorkOrderCancellationState = {
  readonly status: string;
  readonly financialDecision: WorkOrderFinancialCancellationDecision | null;
};

/**
 * Veredito de elegibilidade — mapeia 1:1 para um `CommissionBasisEventStatus`:
 *  - `eligible`       → segue o fluxo normal (comissão pode nascer);
 *  - `ineligible`     → suprimida (OS cancelada com `zero`/`keep_unpaid`);
 *  - `pending_review` → segurada (OS cancelada sem decisão explícita — ambígua).
 */
export type CommissionEligibilityVerdict = "eligible" | "ineligible" | "pending_review";

// sourceTypes que referenciam uma OS. Comparação canônica (trim + lowercase) para não deixar o gate
// ser derrotado por variação de caixa/espaço do produtor do evento (fail-open por string).
const WORK_ORDER_SOURCE_TYPES = new Set(["work_order"]);

export function isWorkOrderSourceType(sourceType: string): boolean {
  return WORK_ORDER_SOURCE_TYPES.has(sourceType.trim().toLowerCase());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * REGRA PURA de supressão. Trata `null` E `undefined` de decisão como AMBÍGUO (nunca `keep`); qualquer
 * decisão desconhecida futura numa OS cancelada também cai em `pending_review` (segura por padrão — nunca
 * paga por engano). OS não-cancelada ou não-encontrada → `eligible` (não é papel deste gate barrar isso).
 */
export function evaluateWorkOrderCommissionEligibility(
  state: WorkOrderCancellationState | null,
): CommissionEligibilityVerdict {
  if (!state || state.status !== "cancelled") return "eligible";

  const decision = state.financialDecision;
  if (decision === "keep") return "eligible";
  if (decision === "keep_unpaid" || decision === "zero") return "ineligible";

  // null / undefined / valor desconhecido numa OS cancelada → segurar (J-Ω3F-6A).
  return "pending_review";
}

/**
 * Contrato do leitor de estado de cancelamento da OS. A implementação Prisma DEVE rodar dentro do
 * contexto RLS do tenant (executor vindo de `withTenantRls`) — senão a policy FORCE RLS de `work_orders`
 * filtra a linha para fora, o read volta vazio e a supressão nunca dispara (fail-open).
 */
export interface WorkOrderCancellationGate {
  resolve(tenantId: string, workOrderId: string): Promise<WorkOrderCancellationState | null>;
}

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * Leitor Prisma — read estreito (só `status` + decisão), tenant-scoped. `executor` DEVE ser a tx do
 * `withTenantRls` do repositório de comissões (mesma transação da criação do basis event → atômico +
 * RLS satisfeito). `workOrderId` malformado (não-UUID) → retorna `null` sem crashar (evita P2023).
 */
export async function readWorkOrderCancellationPrisma(
  executor: PrismaExecutor,
  tenantId: string,
  workOrderId: string,
): Promise<WorkOrderCancellationState | null> {
  if (!isUuid(workOrderId)) return null;

  const row = await executor.workOrder.findFirst({
    where: { tenant_id: tenantId, id: workOrderId },
    select: { status: true, financial_cancellation_decision: true },
  });
  if (!row) return null;

  return {
    status: row.status,
    financialDecision: (row.financial_cancellation_decision as WorkOrderFinancialCancellationDecision | null) ?? null,
  };
}

/**
 * Gate em memória — dublê determinístico para a persistência `memory` e para os testes. Sem estado
 * semeado, `resolve` devolve `null` (OS não-encontrada → elegível), preservando o contrato atual dos
 * testes que criam basis events `work_order` com `sourceId` arbitrário.
 */
export class InMemoryWorkOrderCancellationGate implements WorkOrderCancellationGate {
  private readonly states = new Map<string, WorkOrderCancellationState>();

  private key(tenantId: string, workOrderId: string): string {
    return `${tenantId}:${workOrderId}`;
  }

  setState(tenantId: string, workOrderId: string, state: WorkOrderCancellationState): void {
    this.states.set(this.key(tenantId, workOrderId), state);
  }

  reset(): void {
    this.states.clear();
  }

  async resolve(tenantId: string, workOrderId: string): Promise<WorkOrderCancellationState | null> {
    return this.states.get(this.key(tenantId, workOrderId)) ?? null;
  }
}

/**
 * Deriva o status final do basis event a partir do estado da OS. `eligible` preserva o status pedido
 * pelo chamador (default `received`); supressão/hold SOBRESCREVEM o status pedido (uma OS cancelada
 * marca o evento independentemente do que o produtor pediu).
 */
export function resolveBasisEventStatusForVerdict<T extends string>(
  requestedStatus: T,
  verdict: CommissionEligibilityVerdict,
): T | "ineligible" | "pending_review" {
  return verdict === "eligible" ? requestedStatus : verdict;
}
