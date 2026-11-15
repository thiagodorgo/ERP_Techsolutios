import { AlertTriangle, Building2, Clock, DollarSign, Layers, TrendingUp, type LucideIcon } from "lucide-react";

import { formatCount, formatBRL, formatRate } from "../cloud-billing.money";
import { monthName, reasonLabel } from "../cloud-billing.labels";
import type { CloudBillingView } from "../cloud-billing.state";
import { buildKpis, Card, ChartLegend, CloudBillingBanners, CloudBillingHeader, CostShareBars, KpiBlock, ListPanel, SixMonthsChart, TopCostBars, type CloudBillingAction, type CloudBillingViewProps, type KpiKey } from "./cloudBilling.shared";

// B-ASS-10b (T5) — aparência A · Fiel à referência (o padrão-ouro `Cloud Billing.reference.html`): 8 indicadores em 4 × 2;
// "Assinaturas × custo · 6 meses", "Para onde vai o custo" e "Maior custo por organização"; o painel "O que pede atenção"
// (regras do mês, sem IA) ao lado da lista. Os blocos filtram a lista; a linha abre o detalhe logo abaixo.

const KPI_ORDER: readonly KpiKey[] = ["custo", "plat", "nr", "res", "sub", "margem", "alerta", "semass"];

type AttentionItem = {
  readonly key: string;
  readonly kind: "alvo" | "acao";
  readonly action?: CloudBillingAction;
  readonly icon: LucideIcon;
  readonly bg: string;
  readonly fg: string;
  readonly title: string;
  readonly text: string;
};

const nonZero = (value: string | null) => value !== null && /[1-9]/.test(value);

/** "O que pede atenção": as regras do mês (a maquete, `renderA`). O item "Comparação" não é desenhado (B1). */
export function attentionItems(model: CloudBillingView): AttentionItem[] {
  const counts = model.counts;
  const items: AttentionItem[] = [];
  for (const line of model.lines.filter((item) => item.alert === "critical")) {
    items.push({
      key: `org:${line.tenantId}`,
      kind: "alvo",
      icon: TrendingUp,
      bg: "#FEF2F2",
      fg: "#DC2626",
      title: "Crítico",
      text:
        line.subscriptionSource === "cancelled"
          ? `${line.tenantName}: demonstrativo do mês cancelado, e o custo de ${formatBRL(line.allocatedCost)} continua.`
          : `${line.tenantName}: custo de ${formatBRL(line.allocatedCost)} passou da assinatura de ${formatBRL(line.subscriptionAmount)}.`,
    });
  }
  if (counts.warningCount) {
    items.push({ key: "alert:warning", kind: "alvo", icon: AlertTriangle, bg: "#FFFBEB", fg: "#D97706", title: "Atenção", text: `${formatCount(counts.warningCount)} ${counts.warningCount === 1 ? "organização com custo" : "organizações com custo"} em 80 % da assinatura ou mais.` });
  }
  if (counts.withoutSubscriptionCount) {
    items.push({ key: "semass", kind: "alvo", icon: Building2, bg: "#EFF6FF", fg: "#2563EB", title: "Grupos", text: `${formatCount(counts.withoutSubscriptionCount)} sem assinatura própria: filiais em que a matriz assina, e plano sem preço.` });
  }
  if (model.global && nonZero(model.global.unallocatedOther)) {
    const reasons = model.global.unallocatedByReason.map((item) => reasonLabel(item.reason).toLocaleLowerCase("pt-BR"));
    items.push({
      key: "nr",
      kind: "alvo",
      icon: Layers,
      bg: "#FFFBEB",
      fg: "#D97706",
      title: "Não rateado",
      text: `${formatBRL(model.global.unallocatedOther)} sem dono neste mês${reasons.length ? `: ${reasons.join(" e ")}` : ""}.`,
    });
  }
  if (counts.estimateCount) {
    items.push({ key: "est", kind: "alvo", icon: Clock, bg: "#F5F3FF", fg: "#7C3AED", title: "Estimativa", text: `${formatCount(counts.estimateCount)} ${counts.estimateCount === 1 ? "assinatura é estimativa" : "assinaturas são estimativa"}: demonstrativo do mês em aberto ou reaberto.` });
  }
  if (model.fx && model.fx.version > 1) {
    items.push({ key: "acao:fx", kind: "acao", action: { kind: "fx" }, icon: DollarSign, bg: "#F1F5F9", fg: "#475569", title: "Dólar", text: `O dólar de ${monthName(model.month)} foi corrigido: versão ${model.fx.version} (${formatRate(model.fx.rate, 4)}).` });
  }
  return items;
}

function AttentionPanel({ model, onTarget, onAction }: Pick<CloudBillingViewProps, "model" | "onTarget" | "onAction">) {
  const items = attentionItems(model);
  return (
    <aside className="cb-att" aria-label="O que pede atenção">
      <div className="cb-att__head">
        <AlertTriangle size={16} aria-hidden="true" />
        <b>O que pede atenção</b>
        <span>regras do mês</span>
      </div>
      {items.length ? (
        items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="cb-att__item"
              data-alvo={item.kind === "alvo" ? item.key : undefined}
              aria-pressed={item.kind === "alvo" ? model.ui.alvo === item.key : undefined}
              onClick={() => (item.kind === "alvo" ? onTarget(item.key) : item.action ? onAction(item.action) : undefined)}
            >
              <span className="cb-att__icon" style={{ background: item.bg, color: item.fg }} aria-hidden="true">
                <Icon size={14} />
              </span>
              <span>
                <span className="cb-att__kind" style={{ color: item.fg }}>
                  {item.title}
                </span>
                <span className="cb-att__text">{item.text}</span>
              </span>
            </button>
          );
        })
      ) : (
        <div className="cb-att__empty">Nada pede atenção neste mês.</div>
      )}
    </aside>
  );
}

export function CloudBillingViewA(props: CloudBillingViewProps) {
  const { model, access, onTarget, onMonth, onAction, onRetrySeries } = props;
  const kpis = buildKpis(model);
  return (
    <div className="cb-view" data-aparencia="A">
      <CloudBillingHeader model={model} access={access} onMonth={onMonth} onAction={onAction} />
      <CloudBillingBanners model={model} access={access} onAction={onAction} />
      <div className="cb-kpis">
        {KPI_ORDER.map((key) => (
          <KpiBlock key={key} kpi={kpis[key]} pressed={model.ui.alvo === key} onTarget={onTarget} />
        ))}
      </div>
      <div className="cb-charts-a">
        <Card
          title="Assinaturas × custo · 6 meses"
          hint="clique no mês para trocar o mês da tela · faixa verde = margem"
          legend={
            <ChartLegend
              items={[
                { label: "Assinaturas", color: "#2563eb" },
                { label: "Custo total", color: "#ef4444" },
              ]}
            />
          }
        >
          <SixMonthsChart model={model} mode="lines" onMonth={onMonth} onRetrySeries={onRetrySeries} />
        </Card>
        <Card title="Para onde vai o custo" hint="as 5 parcelas fecham o custo total">
          <CostShareBars model={model} onTarget={onTarget} />
        </Card>
        <Card title="Maior custo por organização" hint="cor = situação da margem">
          <TopCostBars model={model} onTarget={onTarget} />
        </Card>
      </div>
      <div className="cb-base-a">
        <AttentionPanel model={model} onTarget={onTarget} onAction={onAction} />
        <ListPanel {...props} showGroupColumn={false} pctBar={false} />
      </div>
    </div>
  );
}
