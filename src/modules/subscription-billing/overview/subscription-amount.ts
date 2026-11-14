// B-ASS-09 · F3 — a assinatura do período de cada organização (plano v2 §3 P3; §6 C3: R-SUB-1..7). Só LÊ o demonstrativo do
// `B-ASS-04` pelo runtime dele; a projeção usa as mesmas funções puras do fechamento e **nunca grava** nada.
//
// BASE (Q5 = RECOMENDAÇÃO, D-DONO-1311-RECOMENDACOES, decisão do dono de 13/11 ~23:20 SP; troca o padrão D-9 do plano v2): a
// assinatura do mês é o valor do demonstrativo ANTES de abater o crédito (`totalCents + creditsAppliedCents`). O crédito é
// dinheiro já recebido a mais num mês anterior; contado no mês que ele paga, a soma dos meses bate com o contratado e com o
// caixa. O total do demonstrativo e o crédito usado vêm SEPARADOS. **Nunca** se usa o valor pago (o caixa).
//
// Fontes (P3): `closed`/`paid` → o demonstrativo (`statement`); `reopened` → o mesmo, com estimativa (`statement_reopened`);
// `cancelled` → 0 (`cancelled`); sem linha ou linha `open` → projeção (`projection`, estimativa, sem o crédito ainda não
// aplicado); organização sem assinatura ou plano sem preço → `null` (`none`, com o motivo).
//
// As expressões canônicas são o alvo das mutações literais do plano (§6, §C7 11(3)): não reescrever sem emenda.

import { deriveCompetencia } from "../../../config/business-time.js";
import { computeStatement, daysInPeriod } from "../statements/statement.engine.js";
import type { StatementRuntime } from "../statements/statement.factory.js";
import type { SubscriptionStatement } from "../statements/statement.types.js";
import { SUBSCRIPTION_BASIS, type SubscriptionAmount, type SubscriptionSkipReason, type SubscriptionSource } from "./overview.types.js";

/** O que a assinatura do período lê do runtime do demonstrativo (memória ou Prisma sob `withTenantRls`). */
export type SubscriptionAmountRuntime = Pick<StatementRuntime, "repository" | "inputs" | "service">;

export class SubscriptionAmountError extends Error {
  constructor(
    readonly reason: "invalid_period" | "period_in_future" | "statement_open",
    message: string,
  ) {
    super(`${reason}: ${message}`);
    this.name = "SubscriptionAmountError";
  }
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * A assinatura de `tenantId` no mês `period` (`AAAA-MM`, mês de negócio de São Paulo). `now` é o relógio do pedido: um mês
 * depois do corrente (SP) não tem assinatura a mostrar, e é recusado antes de qualquer leitura.
 */
export async function subscriptionAmountOf(
  runtime: SubscriptionAmountRuntime,
  input: { readonly tenantId: string; readonly period: string; readonly now: Date },
): Promise<SubscriptionAmount> {
  const { tenantId, period, now } = input;
  if (!PERIOD_PATTERN.test(period)) throw new SubscriptionAmountError("invalid_period", "o período tem de ser AAAA-MM.");
  if (period > deriveCompetencia(now)) {
    throw new SubscriptionAmountError("period_in_future", "o período é depois do mês corrente (America/Sao_Paulo).");
  }
  const statement = (await runtime.repository.listStatements(tenantId)).find((row) => row.period === period);
  if (statement && statement.status !== "open") return fromStatement(statement);
  return projectAmount(runtime, tenantId, period);
}

/** A assinatura que um demonstrativo gravado diz (todo status menos `open`, que se projeta). */
export function fromStatement(statement: SubscriptionStatement): SubscriptionAmount {
  switch (statement.status) {
    case "closed":
    case "paid":
      return statementAmount(statement, { source: "statement", estimate: false });
    case "reopened":
      return statementAmount(statement, { source: "statement_reopened", estimate: true });
    case "cancelled":
      return cancelledAmount(statement);
    case "open":
      throw new SubscriptionAmountError("statement_open", "o demonstrativo aberto não tem valor gravado: projeta-se.");
  }
}

/** O ramo único dos demonstrativos gravados (Emenda 2 §9.2): a assinatura antes do crédito, e o total e o crédito separados. */
function statementAmount(
  statement: SubscriptionStatement,
  how: { readonly source: Extract<SubscriptionSource, "statement" | "statement_reopened" | "cancelled">; readonly estimate: boolean },
): SubscriptionAmount {
  return {
    subscriptionAmountCents: BigInt(statement.totalCents + statement.creditsAppliedCents),
    statementTotalCents: BigInt(statement.totalCents),
    creditsAppliedCents: BigInt(statement.creditsAppliedCents),
    subscriptionBasis: SUBSCRIPTION_BASIS,
    source: how.source,
    skipReason: null,
    estimate: how.estimate,
  };
}

/** Cancelado não paga nada no mês; o total e o crédito gravados na linha seguem à vista (os do ramo único). */
function cancelledAmount(statement: SubscriptionStatement): SubscriptionAmount {
  return { ...statementAmount(statement, { source: "cancelled", estimate: false }), subscriptionAmountCents: 0n };
}

/**
 * Projeção, sem gravar: a mesma montagem do fechamento (`inputs.resolve` com `pin: null` e `computeStatement`), sem ajuste
 * e sem crédito (o crédito ainda não aplicado não entra, declarado: K17).
 */
async function projectAmount(runtime: SubscriptionAmountRuntime, tenantId: string, period: string): Promise<SubscriptionAmount> {
  const resolved = await runtime.inputs.resolve(tenantId, period, { pin: null });
  if (resolved.kind === "skip") return noneAmount(resolved.reason);
  const computation = computeStatement({
    ...resolved.computation,
    daysInMonth: daysInPeriod(period),
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
  });
  return {
    subscriptionAmountCents: BigInt(computation.totalCents),
    statementTotalCents: null,
    creditsAppliedCents: null,
    subscriptionBasis: SUBSCRIPTION_BASIS,
    source: "projection",
    skipReason: null,
    estimate: true,
  };
}

/** Sem assinatura: `null`, nunca 0 — o alerta é `no_subscription`, nunca `critical` (D-6). */
function noneAmount(reason: SubscriptionSkipReason): SubscriptionAmount {
  return {
    subscriptionAmountCents: null,
    statementTotalCents: null,
    creditsAppliedCents: null,
    subscriptionBasis: SUBSCRIPTION_BASIS,
    source: "none",
    skipReason: reason,
    estimate: false,
  };
}
