// B-SAN3-06b A1 (revisão do PR 411) — o dinheiro exibido é sempre do período rotulado. Regra pura, fora do hook, para
// ser testável sem React (espelho de `../refresh-state.ts`). Uma resposta de um período que já não é o selecionado é
// descartada; a resposta do período novo nunca herda o dado do período anterior como "desatualizado"; e a tela trata
// dado de outro período como carregando, nunca o exibe sob o rótulo do mês selecionado. Nada aqui calcula valor.

import { nextRefreshState } from "../refresh-state";
import { periodForMonth } from "./cloud-billing.service";
import type { CloudBillingData, CloudBillingPeriod } from "./cloud-billing.types";

export function isSamePeriod(left: CloudBillingPeriod, right: CloudBillingPeriod): boolean {
  return left.start === right.start && left.end === right.end;
}

export function isPeriodOfMonth(period: CloudBillingPeriod, month: string): boolean {
  try {
    return isSamePeriod(period, periodForMonth(month));
  } catch {
    return false;
  }
}

export function nextCloudBillingState(current: CloudBillingData, next: CloudBillingData, background: boolean, selected: CloudBillingPeriod): CloudBillingData {
  if (!isSamePeriod(next.period, selected)) return current;
  if (!isSamePeriod(current.period, next.period)) return { ...next, stale: false };
  return nextRefreshState(current, next, background);
}
