// B-GRUPO-GESTOR (1a, F1) — somar o dinheiro do grupo sem errar e sem mentir (plano-base §3.4, Emenda 1 §1.1 E4).
//
// - A soma é de CENTAVOS INTEIROS: cada valor de pátio vira centavos pela máquina monetária do repositório (`roundMoney`,
//   a mesma do resumo financeiro), a soma é de inteiros e o total volta a reais por `roundMoney`. O total do grupo é igual
//   à soma dos pátios, ao centavo. Não nasce regra nova de arredondamento.
// - Quem decide se o total sai é o serviço (`coverage.complete`); aqui só se soma o que entrou.
//
// A linha marcada "âncora" é o alvo da MUT-7: não reescrever sem emenda.

import { roundMoney } from "../financial-titles/index.js";
import type { FinancialSummary } from "../financial-summary/financial-summary.types.js";
import type { ConsolidatedFinance } from "./group-panel.types.js";

/** Reais → centavos inteiros. */
export function toCents(value: number): number {
  // âncora (MUT-7)
  return Math.round(roundMoney(value) * 100);
}

/** Centavos inteiros → reais. */
export function fromCents(cents: number): number {
  return roundMoney(cents / 100);
}

/** Soma de valores em reais, por centavos inteiros. */
export function sumMoney(values: readonly number[]): number {
  let cents = 0;
  for (const value of values) cents += toCents(value);
  return fromCents(cents);
}

/**
 * Emenda 1 §5.2: variação do mês corrente sobre o anterior, em pontos percentuais inteiros, a partir do `cashFlow`
 * (o último ponto é o mês corrente). Nulo quando o mês anterior é zero, ou quando não há os dois meses.
 */
export function variationPct(currentValue: number, previousValue: number): number | null {
  const previousCents = toCents(previousValue);
  if (previousCents === 0) return null;
  return Math.round(((toCents(currentValue) - previousCents) / previousCents) * 100);
}

export type CashFlowLike = readonly { readonly competencia: string; readonly inflow: number; readonly outflow: number }[];

/** Variação de recebido (`inflow`) e de pago (`outflow`) do último mês do fluxo sobre o penúltimo. */
export function cashFlowVariations(cashFlow: CashFlowLike): { readonly received: number | null; readonly paid: number | null } {
  if (cashFlow.length < 2) return { received: null, paid: null };
  const current = cashFlow[cashFlow.length - 1]!;
  const previous = cashFlow[cashFlow.length - 2]!;
  return { received: variationPct(current.inflow, previous.inflow), paid: variationPct(current.outflow, previous.outflow) };
}

/** As moedas dos pátios que entraram: mais de uma, e o total não sai (§3.4). */
export function currenciesOf(summaries: readonly FinancialSummary[]): readonly string[] {
  return [...new Set(summaries.map((summary) => summary.cash.currency))];
}

/** A soma do grupo dos pátios com o financeiro `ok`. A lista vazia dá zeros (o serviço decide se publica). */
export function consolidate(okBlocks: readonly FinancialSummary[]): ConsolidatedFinance {
  const sum = (pick: (summary: FinancialSummary) => number) => sumMoney(okBlocks.map(pick));
  const count = (pick: (summary: FinancialSummary) => number) => okBlocks.reduce((total, summary) => total + pick(summary), 0);

  // O fluxo do grupo é por competência; todos os pátios foram lidos com o mesmo `now`, então as competências coincidem.
  // Mesmo assim soma-se pela chave, na ordem em que aparecem.
  const flowOrder: string[] = [];
  const flowCents = new Map<string, { inflow: number; outflow: number }>();
  for (const summary of okBlocks) {
    for (const point of summary.cashFlow) {
      let bucket = flowCents.get(point.competencia);
      if (!bucket) {
        bucket = { inflow: 0, outflow: 0 };
        flowCents.set(point.competencia, bucket);
        flowOrder.push(point.competencia);
      }
      bucket.inflow += toCents(point.inflow);
      bucket.outflow += toCents(point.outflow);
    }
  }
  flowOrder.sort();
  const cashFlow = flowOrder.map((competencia) => {
    const bucket = flowCents.get(competencia)!;
    return { competencia, inflow: fromCents(bucket.inflow), outflow: fromCents(bucket.outflow) };
  });
  const variations = cashFlowVariations(cashFlow);

  return {
    receivableOpen: sum((s) => s.receivable.openAmount),
    receivableOpenCount: count((s) => s.receivable.openCount),
    receivableOverdue: sum((s) => s.receivable.overdueAmount),
    receivableOverdueCount: count((s) => s.receivable.overdueCount),
    payableOpen: sum((s) => s.payable.openAmount),
    payableOpenCount: count((s) => s.payable.openCount),
    payableOverdue: sum((s) => s.payable.overdueAmount),
    payableOverdueCount: count((s) => s.payable.overdueCount),
    receivedThisMonth: sum((s) => s.settledThisMonth.inflow),
    paidThisMonth: sum((s) => s.settledThisMonth.outflow),
    competencia: okBlocks[0]?.settledThisMonth.competencia ?? "",
    cashBalance: sum((s) => s.cash.totalBalance),
    accountCount: count((s) => s.cash.accountCount),
    cashFlow,
    receivedVariationPct: variations.received,
    paidVariationPct: variations.paid,
  };
}
