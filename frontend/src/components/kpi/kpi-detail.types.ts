import type { ChartTone, TrendSeries } from "../charts";

// WS-UI-CARDS+CHARTS — descriptor do pop-up de um card de KPI. A VARIANTE do corpo é ditada pelo dado que
// EXISTE, nunca inventada (anti-fabricação, D-007):
//  - `chart`     → há série temporal REAL (ex.: fluxo de caixa mensal);
//  - `breakdown` → o número tem decomposição real já carregada (aberto/vencido/em disputa; por status);
//  - `explain`   → snapshot puro: valor + o que a métrica significa + CTA para a tela cheia.

export type KpiSourceTag = "api" | "mock" | "fallback";

export type KpiChartBody = {
  readonly kind: "chart";
  readonly series: readonly TrendSeries[];
  readonly labels?: readonly string[];
  readonly chartType?: "line" | "area" | "bar";
  readonly valueFormat?: (value: number) => string;
};

export type KpiBreakdownPart = {
  readonly label: string;
  readonly value: string;
  readonly tone?: ChartTone;
  readonly hint?: string;
};

export type KpiBreakdownBody = {
  readonly kind: "breakdown";
  readonly parts: readonly KpiBreakdownPart[];
};

export type KpiExplainBody = {
  readonly kind: "explain";
  readonly text: string;
};

export type KpiDetailBody = KpiChartBody | KpiBreakdownBody | KpiExplainBody;

export type KpiDetail = {
  readonly title: string; // = o tema do card (mesma cópia PT-BR, §11)
  readonly value: string; // valor já formatado (o front nunca soma — D-007)
  readonly caption?: string;
  readonly source?: KpiSourceTag;
  readonly body: KpiDetailBody;
  readonly cta?: { readonly label: string; readonly to: string };
};
