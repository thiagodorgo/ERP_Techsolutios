import { AlertTriangle, Building2, CalendarDays, Clock, Cloud, DollarSign, Layers, Play, Plus, Receipt, RefreshCw, Scale, Search, Server, TrendingUp, Upload, Users, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { MonthSeriesChart, ProportionBar, ProportionBars, type MonthSeriesPoint, type ProportionBarItem } from "../../../../components/charts";
import { DenseTable, type DenseColumn } from "../../../../components/dense-list";
import { KpiStatCard, StatusPill } from "../../../../components/patterns";
import type { CloudBillingAccess } from "../cloud-billing.access";
import {
  ALERT_LABEL,
  ALERT_RULE,
  ALERT_TONE,
  COST_STATUS_LABEL,
  SOURCE_LABEL,
  alertLabelOf,
  capitalize,
  formatDateTime,
  formatDay,
  monthLabel,
  monthName,
  monthShort,
  reasonAction,
  reasonLabel,
  shortAlertLabel,
} from "../cloud-billing.labels";
import { compareMoney, formatBRL, formatBRLCompact, formatCount, formatOriginal, formatPct, formatRate, geometryNumber, isNegative, marginBandOf, type Money, type Pct } from "../cloud-billing.money";
import type { CloudBillingView, GroupRow, ListMode, Parcel, SeriesPoint, TenantSeriesPoint } from "../cloud-billing.state";
import type { AlertKind, TenantLineJson } from "../cloud-billing.types";

// B-ASS-10b (T5) — as peças comuns às 3 aparências da tela de custo e margem (A · Fiel à referência, B · Analítica,
// C · Fechamento e grupos; referência `screen-refs/platform-cloud-billing-3opcoes.reference.html`). Só composição: as
// views recebem o MESMO `CloudBillingView` (o modelo único) e não importam adapter, service nem hook (T-UI-1 (a)).
// Nenhum valor de dinheiro é calculado aqui (R-T5-DIN): cada valor exibido é o literal formatado de um campo do servidor;
// proporção e eixo nascem nos componentes da biblioteca, que recebem só geometria (L8).

export type CloudBillingAction =
  | { readonly kind: "import" }
  | { readonly kind: "run" }
  | { readonly kind: "fx" }
  | { readonly kind: "imports" }
  | { readonly kind: "group-new" }
  | { readonly kind: "group-rename"; readonly groupId: string }
  | { readonly kind: "group-members"; readonly groupId: string }
  | { readonly kind: "group-history"; readonly groupId: string }
  | { readonly kind: "group-delete"; readonly groupId: string }
  | { readonly kind: "move"; readonly tenantId: string }
  | { readonly kind: "open-org"; readonly tenantId: string }
  | { readonly kind: "retry" };

export type CloudBillingViewProps = {
  readonly model: CloudBillingView;
  readonly access: CloudBillingAccess;
  /** Clicar num bloco que filtra a lista (indicador, barra, ponto, item do painel). */
  readonly onTarget: (key: string) => void;
  readonly onToggleRow: (rowId: string) => void;
  readonly onClearTarget: () => void;
  readonly onMode: (modo: ListMode) => void;
  readonly onSearch: (text: string) => void;
  /** Trocar o mês da tela (seletor ou mês do gráfico). */
  readonly onMonth: (month: string) => void;
  readonly onAction: (action: CloudBillingAction) => void;
  readonly onRetrySeries: () => void;
};

const NBSP = /\s/g;
/** O texto como o leitor vê (o `Intl` separa "R$" do número com espaço não separável). */
export const plain = (text: string) => text.replace(NBSP, " ");

// ---- cabeçalho -------------------------------------------------------------------------------------------------------
export function MonthSelect({ model, onMonth }: { readonly model: CloudBillingView; readonly onMonth: (month: string) => void }) {
  return (
    <label className="cb-month-select">
      <CalendarDays size={14} aria-hidden="true" />
      <span className="sr-only">Mês de referência</span>
      <select aria-label="Mês de referência" value={model.month} onChange={(event) => onMonth(event.target.value)}>
        {model.monthOptions.map((option) => (
          <option key={option} value={option}>
            {capitalize(monthLabel(option))}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CloudBillingHeader({ model, access, onMonth, onAction }: Pick<CloudBillingViewProps, "model" | "access" | "onMonth" | "onAction">) {
  const updated = model.lastCompletedRun ? `atualizado em ${formatDateTime(model.lastCompletedRun.completedAt ?? model.lastCompletedRun.createdAt)}` : "sem rateio concluído";
  return (
    <div className="pat-page-header">
      <div className="pat-page-header__lead">
        <div className="pat-page-header__kicker">Plataforma · custo e margem</div>
        <h1 className="pat-page-header__title">Cloud Billing</h1>
        <p className="pat-page-header__subtitle">
          Custo da nuvem e margem por organização · {monthLabel(model.month)} · {updated}
        </p>
      </div>
      <div className="pat-page-header__actions">
        <MonthSelect model={model} onMonth={onMonth} />
        <button type="button" className="pat-btn" onClick={() => onAction({ kind: "fx" })}>
          <DollarSign size={14} aria-hidden="true" />
          Dólar do mês <b className="pat-mono">{formatRate(model.fx?.rate ?? null, 4)}</b>
        </button>
        {access.runAllocation ? (
          <button type="button" className="pat-btn" onClick={() => onAction({ kind: "run" })}>
            <Play size={13} aria-hidden="true" />
            Rodar rateio do mês
          </button>
        ) : null}
        {access.importCosts ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => onAction({ kind: "import" })}>
            <Upload size={14} aria-hidden="true" />
            Importar arquivo de custo
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---- avisos do mês (estados do custo, §6.5) ----------------------------------------------------------------------------
function Banner({ tone, icon: Icon, children, action }: { readonly tone: "warning" | "info" | "error"; readonly icon: LucideIcon; readonly children: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className={`pat-banner pat-banner--${tone}`} role="status">
      <Icon size={16} aria-hidden="true" />
      <span>{children}</span>
      {action}
    </div>
  );
}

export function CloudBillingBanners({ model, access, onAction }: Pick<CloudBillingViewProps, "model" | "access" | "onAction">) {
  const month = monthLabel(model.month);
  const importButton = access.importCosts ? (
    <button type="button" className="pat-btn" onClick={() => onAction({ kind: "import" })}>
      Importar arquivo de custo
    </button>
  ) : null;
  const runButton = access.runAllocation ? (
    <button type="button" className="pat-btn" onClick={() => onAction({ kind: "run" })}>
      Rodar rateio do mês
    </button>
  ) : null;
  const out: ReactNode[] = [];
  if (model.pendingRun) {
    out.push(
      <Banner key="run" tone="warning" icon={Clock} action={runButton}>
        <b>O rateio de {month} está em processamento desde {formatDateTime(model.pendingRun.startedAt ?? model.pendingRun.createdAt)}.</b> Custo e margem ficam em branco até um rateio concluir. Se não terminar, rode o rateio de novo.
      </Banner>,
    );
  }
  if (model.status === "no_run" && !model.pendingRun) {
    out.push(
      <Banner key="no_run" tone="warning" icon={AlertTriangle} action={model.isCurrentMonth ? null : importButton}>
        <b>{capitalize(month)} ainda não tem rateio.</b>{" "}
        {model.isCurrentMonth
          ? "O arquivo de custo da AWS chega depois que o mês fecha. Até lá, as assinaturas aparecem como projeção e custo e margem ficam em branco."
          : "Importe o arquivo de custo do mês: o rateio roda sozinho em seguida. Custo e margem ficam em branco até lá, nunca zero."}
      </Banner>,
    );
  }
  if (model.status === "no_import") {
    out.push(
      <Banner key="no_import" tone="warning" icon={AlertTriangle} action={importButton}>
        <b>O rateio de {month} rodou sem arquivo de custo e ficou vazio.</b> Importe o arquivo completo do mês; o rateio roda de novo sozinho.
      </Banner>,
    );
  }
  if (model.status === "legacy_unscoped") {
    out.push(
      <Banner key="legacy" tone="info" icon={AlertTriangle} action={runButton}>
        <b>Rateio antigo.</b> Este rateio foi feito antes de guardar de qual arquivo veio. Os valores aparecem, mas rode o rateio de novo para confirmar.
      </Banner>,
    );
  }
  if (model.status === "fx_missing") {
    out.push(
      <Banner
        key="fx"
        tone="warning"
        icon={DollarSign}
        action={
          access.manageBilling ? (
            <button type="button" className="pat-btn" onClick={() => onAction({ kind: "fx" })}>
              Digitar o dólar do mês
            </button>
          ) : null
        }
      >
        <b>Falta o dólar de {month}.</b> Sem a taxa do mês, custo e margem em reais ficam em branco. Importado no mês:{" "}
        <b className="pat-mono">{formatOriginal(model.global?.original.totalImportedCost ?? null, model.originalCurrency)}</b>.
      </Banner>,
    );
  }
  if (model.status === "currency_unknown") {
    out.push(
      <Banner key="currency" tone="error" icon={AlertTriangle} action={importButton}>
        <b>O arquivo de {month} não informa a moeda.</b> Custo e margem ficam em branco até importar um arquivo com a moeda.
      </Banner>,
    );
  }
  if (model.warnings.includes("multiple_imports_in_month")) {
    out.push(
      <Banner
        key="multi"
        tone="info"
        icon={Layers}
        action={
          access.readImports ? (
            <button type="button" className="pat-btn" onClick={() => onAction({ kind: "imports" })}>
              Ver importações do mês
            </button>
          ) : null
        }
      >
        <b>{capitalize(month)} tem mais de um arquivo de custo importado.</b> A tela usa o mais recente e não soma os arquivos. Se um deles for só parte do mês, importe o arquivo completo.
      </Banner>,
    );
  }
  return out.length ? <div className="cb-banners">{out}</div> : null;
}

// ---- indicadores ---------------------------------------------------------------------------------------------------
export type KpiKey = "custo" | "plat" | "nr" | "res" | "sub" | "margem" | "alerta" | "semass";
export type KpiModel = {
  readonly alvo: KpiKey;
  readonly icon: LucideIcon;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly tag?: { readonly label: string; readonly bg: string; readonly fg: string };
};

function previousHint(model: CloudBillingView, pick: (point: SeriesPoint) => string | null): string {
  const previous = model.previous;
  if (!previous || previous.state !== "ok") return "";
  const value = pick(previous);
  return value === null ? "" : ` · ${capitalize(monthName(previous.month))}: ${value}`;
}

const nonZero = (value: Money | null) => value !== null && /[1-9]/.test(value);
const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

export function buildKpis(model: CloudBillingView): Readonly<Record<KpiKey, KpiModel>> {
  const global = model.global;
  const counts = model.counts;
  const statusTag = { label: COST_STATUS_LABEL[model.status], bg: "#F1F5F9", fg: "#64748B" };
  const reasons = (global?.unallocatedByReason ?? []).map((item) => reasonLabel(item.reason).toLocaleLowerCase("pt-BR"));
  const alertTone = ALERT_TONE[global?.alert ?? "unknown"];
  return {
    custo: {
      alvo: "custo",
      icon: Cloud,
      iconColor: "#2563eb",
      iconBg: "#eff6ff",
      label: "Custo total do mês",
      value: formatBRL(global?.totalCost ?? null),
      tag: model.costValid && model.fx ? { label: `dólar v${model.fx.version}`, bg: "#EFF6FF", fg: "#2563EB" } : statusTag,
      hint: model.originalKnown
        ? `${formatOriginal(global?.original.totalImportedCost ?? null, model.originalCurrency)}${model.costValid ? previousHint(model, (point) => (point.cost === null ? null : formatBRLCompact(point.cost))) : ""}`
        : "sem custo importado",
    },
    plat: {
      alvo: "plat",
      icon: Server,
      iconColor: "#7c3aed",
      iconBg: "#f5f3ff",
      label: "Custo da plataforma",
      value: formatBRL(global?.platformOwnCost ?? null),
      tag: { label: "linha própria", bg: "#F5F3FF", fg: "#7C3AED" },
      hint: model.costValid ? `fora do não rateado${previousHint(model, () => null)}` : formatOriginal(global?.original.platformOwnCost ?? null, model.originalCurrency),
    },
    nr: {
      alvo: "nr",
      icon: AlertTriangle,
      iconColor: "#b45309",
      iconBg: "#fffbeb",
      label: "Não rateado",
      value: formatBRL(global?.unallocatedOther ?? null),
      tag: reasons.length ? { label: plural(reasons.length, "motivo", "motivos"), bg: "#FFFBEB", fg: "#B45309" } : undefined,
      hint: reasons.join(" · ") || "nada sem rateio",
    },
    res: {
      alvo: "res",
      icon: Scale,
      iconColor: "#475569",
      iconBg: "#f1f5f9",
      label: "Resíduo de arredondamento",
      value: formatBRL(global?.roundingResidualCost ?? null),
      tag: model.costValid ? { label: `conversão ${formatBRL(global?.conversionResidualCost ?? null)}`, bg: "#F1F5F9", fg: "#475569" } : undefined,
      hint: "centavos do rateio e do câmbio",
    },
    sub: {
      alvo: "sub",
      icon: Receipt,
      iconColor: "#047857",
      iconBg: "#ecfdf5",
      label: "Assinaturas do mês",
      value: formatBRL(global?.subscriptionTotal ?? null),
      tag: counts.estimateCount ? { label: plural(counts.estimateCount, "estimativa", "estimativas"), bg: "#FFFBEB", fg: "#B45309" } : { label: "fechadas", bg: "#ECFDF5", fg: "#047857" },
      hint: "antes do crédito aplicado",
    },
    margem: {
      alvo: "margem",
      icon: TrendingUp,
      iconColor: "#15803d",
      iconBg: "#ecfdf5",
      label: "Margem global",
      value: global?.marginPct ? `${formatBRL(global.margin)} · ${formatPct(global.marginPct)}` : formatBRL(global?.margin ?? null),
      tag: { label: ALERT_LABEL[global?.alert ?? "unknown"], bg: alertTone.bg, fg: alertTone.fg },
      hint: model.costValid ? `assinaturas menos o custo total${previousHint(model, (point) => (point.marginPct === null ? null : formatPct(point.marginPct)))}` : "sem custo, sem margem",
    },
    alerta: {
      alvo: "alerta",
      icon: AlertTriangle,
      iconColor: "#b91c1c",
      iconBg: "#fef2f2",
      label: "Organizações em alerta",
      value: model.costValid ? formatCount(counts.criticalCount + counts.warningCount) : "—",
      tag: !model.costValid
        ? { label: "sem custo", bg: "#F1F5F9", fg: "#64748B" }
        : counts.criticalCount
          ? { label: plural(counts.criticalCount, "crítica", "críticas"), bg: "#FEF2F2", fg: "#B91C1C" }
          : counts.warningCount
            ? { label: "atenção", bg: "#FFFBEB", fg: "#B45309" }
            : { label: "nenhuma", bg: "#ECFDF5", fg: "#047857" },
      hint: `${formatCount(counts.criticalCount)} crítica · ${formatCount(counts.warningCount)} em atenção · regra 80 % e 100 %`,
    },
    semass: {
      alvo: "semass",
      icon: Building2,
      iconColor: "#475569",
      iconBg: "#f1f5f9",
      label: "Sem assinatura própria",
      value: formatCount(counts.withoutSubscriptionCount),
      tag: { label: "a matriz assina", bg: "#EFF6FF", fg: "#2563EB" },
      hint: "filiais de grupo e plano sem preço",
    },
  };
}

/** O indicador que filtra (`KpiStatCard` da biblioteca, com `aria-pressed`), marcado com o `data-alvo` do bloco. */
export function KpiBlock({ kpi, pressed, onTarget, footer }: { readonly kpi: KpiModel; readonly pressed: boolean; readonly onTarget: (key: string) => void; readonly footer?: ReactNode }) {
  return (
    <div className="cb-alvo" data-alvo={kpi.alvo}>
      <KpiStatCard
        icon={kpi.icon}
        iconColor={kpi.iconColor}
        iconBg={kpi.iconBg}
        value={kpi.value}
        label={kpi.label}
        hint={kpi.hint}
        tag={kpi.tag}
        pressed={pressed}
        ariaLabel={`${kpi.label}: ${plain(kpi.value)} — filtrar a lista`}
        onClick={() => onTarget(kpi.alvo)}
        footer={footer}
      />
    </div>
  );
}

// ---- gráficos ------------------------------------------------------------------------------------------------------
export const PARCEL_COLOR: Readonly<Record<Parcel["tone"], string>> = { orgs: "#2563eb", plat: "#7c3aed", nr: "#f59e0b", arr: "#94a3b8", conv: "#cbd5e1" };

/** "Para onde vai o custo": as 5 parcelas do custo total (`global`), cada uma filtra a lista na visão global. */
export function CostShareBars({ model, onTarget, short = false }: { readonly model: CloudBillingView; readonly onTarget: (key: string) => void; readonly short?: boolean }) {
  const global = model.global;
  const items: ProportionBarItem[] = [
    { key: "orgs", label: "Organizações", value: geometryNumber(global?.tenantsCost ?? null), displayValue: formatBRL(global?.tenantsCost ?? null), color: PARCEL_COLOR.orgs },
    { key: "plat", label: short ? "Plataforma" : "Custo da plataforma", value: geometryNumber(global?.platformOwnCost ?? null), displayValue: formatBRL(global?.platformOwnCost ?? null), color: PARCEL_COLOR.plat },
    { key: "nr", label: "Não rateado", value: geometryNumber(global?.unallocatedOther ?? null), displayValue: formatBRL(global?.unallocatedOther ?? null), color: PARCEL_COLOR.nr },
    { key: "arr", label: "Arredondamento", value: geometryNumber(global?.roundingResidualCost ?? null), displayValue: formatBRL(global?.roundingResidualCost ?? null), color: PARCEL_COLOR.arr },
    { key: "conv", label: "Conversão", value: geometryNumber(global?.conversionResidualCost ?? null), displayValue: formatBRL(global?.conversionResidualCost ?? null), color: PARCEL_COLOR.conv },
  ];
  return <ProportionBars items={items} ariaLabel="Para onde vai o custo do mês" pressedKey={model.ui.alvo} onSelect={onTarget} />;
}

/** "Maior custo por organização": as 5 maiores do mês; a cor é a situação da margem (o `alert` do servidor). */
export function TopCostBars({ model, onTarget }: { readonly model: CloudBillingView; readonly onTarget: (key: string) => void }) {
  if (!model.topCost.length) return <div className="pat-table__empty-detail">Sem custo em reais neste mês.</div>;
  const items: ProportionBarItem[] = model.topCost.map((line) => ({
    key: `org:${line.tenantId}`,
    label: line.tenantName,
    value: geometryNumber(line.allocatedCost),
    displayValue: formatBRL(line.allocatedCost),
    color: ALERT_TONE[line.alert].dot,
  }));
  return <ProportionBars items={items} ariaLabel="Maior custo por organização no mês" pressedKey={model.ui.alvo} onSelect={onTarget} />;
}

function seriesAria(point: SeriesPoint): string {
  const month = capitalize(monthLabel(point.month));
  if (point.state === "loading") return `${month}: carregando`;
  if (point.state === "error") return `${month}: não foi possível carregar`;
  if (point.subscription === null && point.cost === null) return `${month}: sem dados`;
  return `${month}: assinaturas ${plain(formatBRL(point.subscription))}, custo ${plain(formatBRL(point.cost))}, margem ${plain(formatBRL(point.margin))}`;
}

/** Os 6 meses no formato do componente da biblioteca (a regra da maquete, §6.5.1): todo mês aparece e é clicável. */
export function seriesPoints(series: readonly SeriesPoint[]): MonthSeriesPoint[] {
  return series.map((point) => ({
    key: point.month,
    label: monthShort(point.month),
    sublabel: point.state === "ok" ? formatPct(point.marginPct) : "—",
    sublabelTone: point.marginPct === null ? "muted" : isNegative(point.margin) ? "negative" : "positive",
    a: point.state === "ok" ? geometryNumber(point.subscription) : null,
    b: point.state === "ok" ? geometryNumber(point.cost) : null,
    state: point.state === "ok" ? (point.subscription === null && point.cost === null ? "empty" : "ok") : point.state,
    ariaLabel: seriesAria(point),
  }));
}

/** "Não foi possível carregar <meses>." com "Tentar de novo"; esqueleto enquanto a série carrega. */
export function SeriesStatus({ model, onRetrySeries }: { readonly model: CloudBillingView; readonly onRetrySeries: () => void }) {
  const loading = model.series.some((point) => point.state === "loading");
  if (model.seriesFailed.length) {
    return (
      <div className="cb-series-note" role="status">
        Não foi possível carregar {model.seriesFailed.map((month) => monthShort(month)).join(", ")}.{" "}
        <button type="button" className="cb-link" onClick={onRetrySeries}>
          <RefreshCw size={12} aria-hidden="true" /> Tentar de novo
        </button>
      </div>
    );
  }
  return loading ? (
    <div className="cb-series-note cb-series-note--loading" aria-busy="true">
      Carregando os meses anteriores…
    </div>
  ) : null;
}

export function SixMonthsChart({ model, mode, onMonth, onRetrySeries }: { readonly model: CloudBillingView; readonly mode: "lines" | "bars"; readonly onMonth: (month: string) => void; readonly onRetrySeries: () => void }) {
  return (
    <>
      <MonthSeriesChart mode={mode} points={seriesPoints(model.series)} pressedKey={model.month} onSelect={onMonth} ariaLabel="Assinaturas e custo total dos últimos 6 meses" />
      <SeriesStatus model={model} onRetrySeries={onRetrySeries} />
    </>
  );
}

export function ChartLegend({ items }: { readonly items: readonly { readonly label: string; readonly color: string }[] }) {
  return (
    <div className="cb-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function Card({ title, hint, legend, className, children }: { readonly title: string; readonly hint?: string; readonly legend?: ReactNode; readonly className?: string; readonly children: ReactNode }) {
  return (
    <section className={className ? `cb-card ${className}` : "cb-card"} aria-label={title}>
      <div className="cb-card__head">
        <div>
          <h2 className="cb-card__title">{title}</h2>
          {hint ? <div className="cb-card__hint">{hint}</div> : null}
        </div>
        {legend}
      </div>
      {children}
    </section>
  );
}

// ---- a lista (as três visões) ---------------------------------------------------------------------------------------
export function AlertPill({ alert, label }: { readonly alert: AlertKind; readonly label?: string }) {
  const tone = ALERT_TONE[alert];
  return <StatusPill sm label={label ?? ALERT_LABEL[alert]} bg={tone.bg} fg={tone.fg} dot={tone.fg} />;
}

const ESTIMATE = (
  <span className="cb-estimate" title="Estimativa: o demonstrativo do mês está em aberto ou reaberto" aria-label="estimativa">
    <Clock size={12} aria-hidden="true" />
  </span>
);

function MoneyCell({ value, negativeTone = false }: { readonly value: Money | null; readonly negativeTone?: boolean }) {
  if (value === null) return <span className="cb-muted">—</span>;
  return <span className={negativeTone && isNegative(value) ? "cb-val cb-val--neg" : "cb-val"}>{formatBRL(value)}</span>;
}

function CostCell({ value, original, currency }: { readonly value: Money | null; readonly original: Money | null; readonly currency: string | null }) {
  return (
    <>
      {value === null ? (
        <span className="cb-muted" title="Sem custo em reais neste mês">
          —
        </span>
      ) : (
        <span className="cb-val">{formatBRL(value)}</span>
      )}
      {original !== null ? <span className="cb-usd">{formatOriginal(original, currency)}</span> : null}
    </>
  );
}

const BAND_COLOR = { neg: "#ef4444", "0": "#f59e0b", "20": "#10b981", "50": "#10b981" } as const;
function PctCell({ pct, withBar }: { readonly pct: Pct | null; readonly withBar: boolean }) {
  if (pct === null) return <span className="cb-muted">—</span>;
  const band = marginBandOf(pct);
  return (
    <span className="cb-pct">
      {withBar ? <ProportionBar value={geometryNumber(pct)} max={100} color={band ? BAND_COLOR[band] : "#94a3b8"} label={formatPct(pct)} /> : null}
      <span className={band === "neg" ? "cb-val--neg" : undefined}>{formatPct(pct)}</span>
    </span>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

function TenantMiniSeries({ points, onMonth }: { readonly points: readonly TenantSeriesPoint[]; readonly onMonth: (month: string) => void }) {
  const chartPoints: MonthSeriesPoint[] = points.map((point) => ({
    key: point.month,
    label: monthShort(point.month),
    sublabel: "",
    a: point.state === "ok" ? geometryNumber(point.subscription) : null,
    b: point.state === "ok" ? geometryNumber(point.cost) : null,
    state: point.state === "ok" ? (point.subscription === null && point.cost === null ? "empty" : "ok") : point.state,
    ariaLabel:
      point.state === "ok"
        ? `${capitalize(monthLabel(point.month))}: assinatura ${plain(formatBRL(point.subscription))}, custo ${plain(formatBRL(point.cost))}`
        : `${capitalize(monthLabel(point.month))}: ${point.state === "loading" ? "carregando" : "não foi possível carregar"}`,
  }));
  return (
    <div className="cb-mini-series">
      <MonthSeriesChart mode="lines" points={chartPoints} onSelect={onMonth} ariaLabel="Assinatura e custo desta organização nos últimos 6 meses" />
      <ChartLegend items={[{ label: "assinatura", color: "#2563eb" }, { label: "custo", color: "#ef4444" }]} />
    </div>
  );
}

function Composition({ model, line }: { readonly model: CloudBillingView; readonly line: TenantLineJson }) {
  const read = model.composition[line.tenantId];
  if (!model.originalKnown) return <div className="pat-ab-detail-note">Sem composição: o mês não tem custo importado.</div>;
  if (!read || read.state === "loading") return <div className="pat-ab-detail-note" aria-busy="true">Carregando a composição…</div>;
  if (read.state === "error") return <div className="pat-ab-detail-note">Não foi possível carregar a composição por serviço.</div>;
  if (!read.value.length) return <div className="pat-ab-detail-note">O rateio não tem linhas desta organização no mês.</div>;
  return (
    <div className="cb-serv">
      {read.value.map((item, index) => (
        <div key={`${item.serviceCode}-${item.costCategory ?? ""}-${index}`}>
          <span title={item.costCategory ?? undefined}>{item.serviceCode}</span>
          <small>{item.costCategory ?? "—"}</small>
          <em>{formatOriginal(item.allocatedCostOriginal, item.currency)}</em>
        </div>
      ))}
    </div>
  );
}

export function TenantDetail({ model, line, access, onAction, onMonth }: { readonly model: CloudBillingView; readonly line: TenantLineJson; readonly access: CloudBillingAccess; readonly onAction: (action: CloudBillingAction) => void; readonly onMonth: (month: string) => void }) {
  const groupMembers = line.groupId ? model.lines.filter((item) => item.groupId === line.groupId) : [];
  const payers = groupMembers.filter((item) => item.subscriptionAmount !== null);
  const groupText = line.groupId
    ? `${line.groupName ?? "Grupo sem nome"} · ${line.subscriptionAmount !== null ? "assina pelo grupo" : `filial; quem assina: ${payers.length ? payers.map((item) => item.tenantName).join(", ") : "ninguém neste mês"}`}`
    : "sem grupo";
  const note =
    line.alert === "critical"
      ? "O custo passou da assinatura: revise o plano desta organização ou o uso dela."
      : line.alert === "warning"
        ? "O custo já passou de 80 % da assinatura."
        : line.alert === "no_subscription" && line.groupId
          ? "A matriz assina pelo grupo; a margem do cliente está na linha do grupo."
          : "A margem é a assinatura do mês menos o custo rateado.";
  return (
    <div className="pat-ab-detail-content" data-detalhe={`t:${line.tenantId}`}>
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <h4>Assinatura do mês</h4>
          <Field label="Assinatura">
            {line.subscriptionAmount === null ? (
              line.subscriptionSkipReason === "plan_without_price" ? "plano sem preço cadastrado" : "sem assinatura própria"
            ) : (
              <>
                <b className="pat-mono">{formatBRL(line.subscriptionAmount)}</b> <span className="cb-muted">antes do crédito</span>
              </>
            )}
          </Field>
          <Field label="Total do demonstrativo">{formatBRL(line.statementTotal)}</Field>
          <Field label="Crédito aplicado">{formatBRL(line.creditsApplied)}</Field>
          <Field label="Origem">
            {SOURCE_LABEL[line.subscriptionSource]} {line.estimate ? <StatusPill sm label="Estimativa" bg="#FFFBEB" fg="#B45309" /> : null}
          </Field>
          <Field label="Grupo">{groupText}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4>Custo e margem</h4>
          <Field label="Custo em reais">{line.allocatedCost === null ? `em branco (${COST_STATUS_LABEL[model.status].toLocaleLowerCase("pt-BR")})` : <b className="pat-mono">{formatBRL(line.allocatedCost)}</b>}</Field>
          <Field label="Custo na moeda do arquivo">{line.allocatedCostOriginal === null ? "—" : <span className="pat-mono">{formatOriginal(line.allocatedCostOriginal, model.originalCurrency)}</span>}</Field>
          <Field label="Dólar usado">
            {model.fx && model.costValid ? (
              <>
                <span className="pat-mono">{formatRate(model.fx.rate, 6)}</span> (versão {model.fx.version})
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Margem">
            {line.margin === null ? (
              "—"
            ) : (
              <>
                <b className={isNegative(line.margin) ? "pat-mono cb-val--neg" : "pat-mono cb-val--pos"}>{formatBRL(line.margin)}</b> · {formatPct(line.marginPct)}
              </>
            )}
          </Field>
          <Field label="Situação">
            <AlertPill alert={line.alert} label={alertLabelOf(line)} /> <span className="cb-muted">{ALERT_RULE[line.alert]}</span>
          </Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4>Assinatura × custo · 6 meses</h4>
          <TenantMiniSeries points={model.tenantSeries[line.tenantId] ?? []} onMonth={onMonth} />
          <h4>Composição por serviço · moeda do arquivo</h4>
          <Composition model={model} line={line} />
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        <button type="button" className="pat-btn" onClick={() => onAction({ kind: "open-org", tenantId: line.tenantId })}>
          <Building2 size={14} aria-hidden="true" />
          Abrir organização
        </button>
        {access.manageBilling ? (
          <button type="button" className="pat-btn" onClick={() => onAction({ kind: "move", tenantId: line.tenantId })}>
            <Users size={14} aria-hidden="true" />
            Mudar de grupo
          </button>
        ) : null}
        <span className="pat-ab-detail-note">{note}</span>
      </div>
    </div>
  );
}

export function GroupDetail({ model, row, access, onAction, onMode }: { readonly model: CloudBillingView; readonly row: GroupRow; readonly access: CloudBillingAccess; readonly onAction: (action: CloudBillingAction) => void; readonly onMode: (modo: ListMode) => void }) {
  const line = row.line;
  const withoutGroup = line.groupId === null;
  const groupId = line.groupId;
  return (
    <div className="pat-ab-detail-content" data-detalhe={row.rowId}>
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <h4>{withoutGroup ? "Organizações sem grupo" : "Assinatura do grupo"}</h4>
          <Field label="Assinatura">
            {line.subscriptionAmount === null ? (
              "nenhum membro assina"
            ) : (
              <>
                <b className="pat-mono">{formatBRL(line.subscriptionAmount)}</b> <span className="cb-muted">antes do crédito</span>
              </>
            )}
          </Field>
          <Field label="Crédito aplicado">{formatBRL(line.creditsApplied)}</Field>
          {withoutGroup ? (
            <Field label="Leitura">soma das organizações avulsas; não é um cliente, e por isso não tem situação</Field>
          ) : (
            <Field label="Quem assina">{row.payers.length ? `${row.payers.map((item) => item.tenantName).join(", ")}${row.payers.length === 1 ? " (matriz)" : ""}` : "ninguém neste mês"}</Field>
          )}
          <Field label="Sem assinatura própria">{plural(line.membersWithoutSubscription, "organização", "organizações")}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <h4>Custo e margem</h4>
          <Field label="Custo">{line.allocatedCost === null ? "em branco" : <b className="pat-mono">{formatBRL(line.allocatedCost)}</b>}</Field>
          <Field label="Margem">
            {line.margin === null ? (
              "—"
            ) : (
              <>
                <b className={isNegative(line.margin) ? "pat-mono cb-val--neg" : "pat-mono cb-val--pos"}>{formatBRL(line.margin)}</b> · {formatPct(line.marginPct)}
              </>
            )}
          </Field>
          <Field label="Situação">
            {line.alert === null ? (
              <span className="cb-muted">sem situação: não é um cliente</span>
            ) : (
              <>
                <AlertPill alert={line.alert} /> <span className="cb-muted">{ALERT_RULE[line.alert]}</span>
              </>
            )}
          </Field>
          {withoutGroup ? null : row.scheduled === null ? (
            <Field label="Agendado">Não foi possível carregar os agendamentos.</Field>
          ) : row.scheduled.length ? (
            <Field label="Agendado">{row.scheduled.map((item) => `${item.tenantName} entra em ${formatDay(item.validFrom)}`).join("; ")}</Field>
          ) : null}
        </div>
        <div className="pat-ab-detail-col">
          <h4>Organizações no fim de {monthName(model.month)}</h4>
          <div className="cb-members">
            {row.members.map((member) => (
              <div key={member.tenantId} className="cb-member">
                <span>
                  <b>{member.tenantName}</b>
                  <small>
                    {withoutGroup ? "sem grupo" : row.memberSince[member.tenantId] ? `desde ${formatDay(row.memberSince[member.tenantId])}` : "desde —"} ·{" "}
                    {member.subscriptionAmount !== null ? `assina ${formatBRL(member.subscriptionAmount)}` : "sem assinatura própria"}
                  </small>
                </span>
                <span className="cb-val">{formatBRL(member.allocatedCost)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        {withoutGroup || groupId === null ? (
          access.manageBilling ? (
            <button type="button" className="pat-btn" onClick={() => onAction({ kind: "group-new" })}>
              <Plus size={14} aria-hidden="true" />
              Novo grupo
            </button>
          ) : (
            <button type="button" className="pat-btn" onClick={() => onMode("tenant")}>
              Ver por organização
            </button>
          )
        ) : (
          <>
            {access.manageBilling ? (
              <button type="button" className="pat-btn" onClick={() => onAction({ kind: "group-members", groupId })}>
                <Users size={14} aria-hidden="true" />
                Editar membros
              </button>
            ) : null}
            <button type="button" className="pat-btn" onClick={() => onAction({ kind: "group-history", groupId })}>
              <Clock size={14} aria-hidden="true" />
              Histórico
            </button>
            {access.manageBilling ? (
              <>
                <button type="button" className="pat-btn" onClick={() => onAction({ kind: "group-rename", groupId })}>
                  Renomear
                </button>
                <button type="button" className="pat-btn cb-btn--danger" onClick={() => onAction({ kind: "group-delete", groupId })}>
                  Excluir grupo
                </button>
              </>
            ) : null}
          </>
        )}
        <span className="pat-ab-detail-note">O grupo serve para cobrança e para a visão de custo da plataforma. Ele não dá a uma filial acesso aos dados de outra.</span>
      </div>
    </div>
  );
}

function parcelLabel(parcel: Parcel, count: number): string {
  if (parcel.key === "orgs") return `Organizações (${formatCount(count)})`;
  if (parcel.key === "plat") return "Custo da plataforma";
  if (parcel.key === "arr") return "Resíduo de arredondamento";
  if (parcel.key === "conv") return "Resíduo de conversão";
  return `Não rateado · ${reasonLabel(parcel.reason ?? "").toLocaleLowerCase("pt-BR")}`;
}

export function ParcelDetail({ model, parcel, access, onAction, onMode }: { readonly model: CloudBillingView; readonly parcel: Parcel; readonly access: CloudBillingAccess; readonly onAction: (action: CloudBillingAction) => void; readonly onMode: (modo: ListMode) => void }) {
  const value = (
    <>
      <b className="pat-mono">{formatBRL(parcel.cost)}</b>
      {parcel.original !== null ? ` · ${formatOriginal(parcel.original, model.originalCurrency)}` : ""}
    </>
  );
  let first: ReactNode;
  let second: ReactNode;
  if (parcel.key === "orgs") {
    first = (
      <>
        <Field label="O que é">o custo rateado entre as organizações pelo uso de cada uma (regras do rateio)</Field>
        <Field label="Valor">{value}</Field>
      </>
    );
    second = (
      <>
        <h4>As 3 maiores</h4>
        {model.topCost.slice(0, 3).map((line) => (
          <Field key={line.tenantId} label={line.tenantName}>
            <span className="pat-mono">{formatBRL(line.allocatedCost)}</span>
          </Field>
        ))}
      </>
    );
  } else if (parcel.key === "plat") {
    first = (
      <>
        <Field label="O que é">o custo que fica com a plataforma: a organização da própria plataforma e os atos de plataforma. É linha própria, fora do não rateado.</Field>
        <Field label="Valor">{value}</Field>
      </>
    );
    second = (
      <>
        <h4>Por que aparece</h4>
        <div className="pat-ab-detail-note">O que a plataforma usa para funcionar não é cobrado de nenhuma organização.</div>
      </>
    );
  } else if (parcel.tone === "nr") {
    first = (
      <>
        <Field label="Motivo">{reasonLabel(parcel.reason ?? "")}</Field>
        <Field label="Valor">{value}</Field>
      </>
    );
    second = (
      <>
        <h4>O que fazer</h4>
        <div className="pat-ab-detail-note">{reasonAction(parcel.reason ?? "")}</div>
      </>
    );
  } else if (parcel.key === "arr") {
    first = (
      <>
        <Field label="O que é">a diferença de centavos que o rateio deixa ao dividir o custo; vem com sinal</Field>
        <Field label="Valor">{value}</Field>
      </>
    );
    second = (
      <>
        <h4>Por que aparece</h4>
        <div className="pat-ab-detail-note">Dividir um custo em várias organizações sempre sobra fração de centavo. A soma das parcelas fecha exato no custo total.</div>
      </>
    );
  } else {
    first = (
      <>
        <Field label="O que é">a diferença de centavos da conversão de cada parcela de dólar para reais</Field>
        <Field label="Valor">{value}</Field>
      </>
    );
    second = (
      <>
        <h4>Por que aparece</h4>
        <div className="pat-ab-detail-note">Cada parcela é convertida com o dólar do mês e arredondada; o que sobra fica aqui, para o total fechar exato.</div>
      </>
    );
  }
  return (
    <div className="pat-ab-detail-content" data-detalhe={`p:${parcel.key}`}>
      <div className="pat-ab-detail-grid cb-detail-grid--two">
        <div className="pat-ab-detail-col">
          <h4>{parcelLabel(parcel, model.counts.lineCount)}</h4>
          {first}
        </div>
        <div className="pat-ab-detail-col">{second}</div>
      </div>
      <div className="pat-ab-detail-actions">
        {parcel.key === "orgs" ? (
          <button type="button" className="pat-btn" onClick={() => onMode("tenant")}>
            <Building2 size={14} aria-hidden="true" />
            Ver por organização
          </button>
        ) : access.readImports ? (
          <button type="button" className="pat-btn" onClick={() => onAction({ kind: "imports" })}>
            <Layers size={14} aria-hidden="true" />
            Ver importações do mês
          </button>
        ) : null}
        <span className="pat-ab-detail-note">As parcelas somam o custo total do mês, sem sobra (o servidor garante).</span>
      </div>
    </div>
  );
}

const tenantTitle = (line: TenantLineJson) => `${line.tenantName}${line.groupName ? ` · ${line.groupName}` : ""} · ${alertLabelOf(line)}`;

function tenantColumns(model: CloudBillingView, showGroup: boolean, pctBar: boolean): DenseColumn<TenantLineJson>[] {
  const columns: DenseColumn<TenantLineJson>[] = [{ key: "nome", header: "Organização", render: (line) => <b>{line.tenantName}</b> }];
  if (showGroup) columns.push({ key: "grupo", header: "Grupo", width: 110, render: (line) => (line.groupName ? line.groupName : <span className="cb-muted">—</span>) });
  columns.push(
    {
      key: "assinatura",
      header: "Assinatura",
      align: "right",
      tabular: true,
      width: 118,
      render: (line) => (
        <>
          <MoneyCell value={line.subscriptionAmount} />
          {line.estimate ? ESTIMATE : null}
        </>
      ),
    },
    { key: "custo", header: "Custo", align: "right", tabular: true, width: 168, render: (line) => <CostCell value={line.allocatedCost} original={line.allocatedCostOriginal} currency={model.originalCurrency} /> },
    { key: "margem", header: "Margem", align: "right", tabular: true, width: 110, render: (line) => <MoneyCell value={line.margin} negativeTone /> },
    { key: "pct", header: "%", align: "right", tabular: true, width: pctBar ? 110 : 76, render: (line) => <PctCell pct={line.marginPct} withBar={pctBar} /> },
    { key: "situacao", header: "Situação", width: 124, render: (line) => <AlertPill alert={line.alert} label={shortAlertLabel(line)} /> },
  );
  return columns;
}

const groupColumns = (pctBar: boolean): DenseColumn<GroupRow>[] => [
  { key: "grupo", header: "Grupo", render: (row) => <b>{row.line.groupName ?? "Sem grupo"}</b> },
  { key: "orgs", header: "Organizações", width: 120, render: (row) => plural(row.line.memberCount, "organização", "organizações") },
  {
    key: "assinatura",
    header: "Assinatura",
    align: "right",
    tabular: true,
    width: 118,
    render: (row) => (
      <>
        <MoneyCell value={row.line.subscriptionAmount} />
        {row.line.estimate ? ESTIMATE : null}
      </>
    ),
  },
  { key: "custo", header: "Custo", align: "right", tabular: true, width: 118, render: (row) => <MoneyCell value={row.line.allocatedCost} /> },
  { key: "margem", header: "Margem", align: "right", tabular: true, width: 110, render: (row) => <MoneyCell value={row.line.margin} negativeTone /> },
  { key: "pct", header: "%", align: "right", tabular: true, width: pctBar ? 110 : 76, render: (row) => <PctCell pct={row.line.marginPct} withBar={pctBar} /> },
  { key: "situacao", header: "Situação", width: 104, render: (row) => (row.line.alert === null ? <span className="cb-muted">—</span> : <AlertPill alert={row.line.alert} />) },
];

function parcelColumns(model: CloudBillingView): DenseColumn<Parcel>[] {
  // a referência da barra é a MAIOR parcela (escolhida por comparação, sem conta); a proporção nasce no componente
  const largest = [...model.parcels].sort((a, b) => compareMoney(b.cost, a.cost))[0];
  const peak = geometryNumber(largest?.cost ?? null) ?? 0;
  return [
    { key: "parcela", header: "Parcela do custo", render: (parcel) => <b>{parcelLabel(parcel, model.counts.lineCount)}</b> },
    { key: "valor", header: "Valor", align: "right", tabular: true, width: "18%", render: (parcel) => <MoneyCell value={parcel.cost} negativeTone /> },
    { key: "original", header: "Original", align: "right", tabular: true, width: "18%", render: (parcel) => <span className="cb-usd cb-usd--inline">{formatOriginal(parcel.original, model.originalCurrency)}</span> },
    { key: "peso", header: "Peso no custo", width: "24%", render: (parcel) => <ProportionBar value={geometryNumber(parcel.cost)} max={peak} color={PARCEL_COLOR[parcel.tone]} label={formatBRL(parcel.cost)} /> },
  ];
}

export function ListPanel({ model, access, onTarget, onToggleRow, onClearTarget, onMode, onSearch, onAction, onMonth, showGroupColumn, pctBar }: CloudBillingViewProps & { readonly showGroupColumn: boolean; readonly pctBar: boolean }) {
  const ui = model.ui;
  void onTarget;
  const tabs: { readonly id: ListMode; readonly label: string; readonly rowCount?: number }[] = [
    { id: "tenant", label: "Por organização", rowCount: model.lines.length },
    { id: "group", label: "Por grupo", rowCount: model.groupRows.length },
    { id: "global", label: "Visão global" },
  ];
  const count =
    ui.modo === "tenant"
      ? plural(model.tenantRows.length, "organização", "organizações")
      : ui.modo === "group"
        ? plural(model.groupRows.length, "linha", "linhas")
        : plural(model.parcelRows.length, "parcela", "parcelas");
  let body: ReactNode;
  let footer: ReactNode;
  if (ui.modo === "tenant") {
    body = model.tenantRows.length ? (
      <DenseTable
        columns={tenantColumns(model, showGroupColumn, pctBar)}
        rows={model.tenantRows}
        keyForRow={(line) => `t:${line.tenantId}`}
        sort={null}
        onSort={() => undefined}
        expandedKey={ui.aberta}
        onRowClick={(line) => onToggleRow(`t:${line.tenantId}`)}
        cellTitle={(line) => tenantTitle(line)}
        renderDetail={(line) => <TenantDetail model={model} line={line} access={access} onAction={onAction} onMonth={onMonth} />}
      />
    ) : (
      <div className="pat-table__empty">
        <div className="pat-table__empty-title">Nenhuma organização neste filtro</div>
        <div className="pat-table__empty-detail">Tire o filtro acima ou troque o mês.</div>
      </div>
    );
    footer = (
      <>
        <span>Total do mês</span>
        <span>
          Assinaturas <b>{formatBRL(model.tenantTotals?.subscriptionAmount ?? null)}</b>
        </span>
        <span>
          Custo das organizações <b>{formatBRL(model.tenantTotals?.allocatedCost ?? null)}</b>
        </span>
        <span>
          Margem <b>{formatBRL(model.tenantTotals?.margin ?? null)}</b>
        </span>
      </>
    );
  } else if (ui.modo === "group") {
    body = model.groupRows.length ? (
      <DenseTable
        columns={groupColumns(pctBar)}
        rows={model.groupRows}
        keyForRow={(row) => row.rowId}
        sort={null}
        onSort={() => undefined}
        expandedKey={ui.aberta}
        onRowClick={(row) => onToggleRow(row.rowId)}
        cellTitle={(row) => `${row.line.groupName ?? "Sem grupo"}${row.line.groupId ? ` · assina: ${row.payers.length ? row.payers.map((item) => item.tenantName).join(", ") : "ninguém"}` : ""}`}
        renderDetail={(row) => <GroupDetail model={model} row={row} access={access} onAction={onAction} onMode={onMode} />}
      />
    ) : (
      <div className="pat-table__empty">
        <div className="pat-table__empty-title">Nenhum grupo neste mês</div>
        <div className="pat-table__empty-detail">As organizações sem grupo aparecem na linha "Sem grupo" quando o mês tiver dados.</div>
      </div>
    );
    footer = <span>Uma organização fica em um grupo só, e mudança de grupo vale de hoje em diante.</span>;
  } else {
    body = (
      <DenseTable
        columns={parcelColumns(model)}
        rows={model.parcelRows}
        keyForRow={(parcel) => `p:${parcel.key}`}
        sort={null}
        onSort={() => undefined}
        expandedKey={ui.aberta}
        onRowClick={(parcel) => onToggleRow(`p:${parcel.key}`)}
        cellTitle={(parcel) => parcelLabel(parcel, model.counts.lineCount)}
        renderDetail={(parcel) => <ParcelDetail model={model} parcel={parcel} access={access} onAction={onAction} onMode={onMode} />}
      />
    );
    footer = (
      <>
        <span>
          Assinaturas <b>{formatBRL(model.global?.subscriptionTotal ?? null)}</b>
        </span>
        <span>
          − Custo total <b>{formatBRL(model.global?.totalCost ?? null)}</b>
        </span>
        <span>
          = Margem <b>{formatBRL(model.global?.margin ?? null)}</b>
          {model.global?.marginPct ? ` (${formatPct(model.global.marginPct)})` : ""}
        </span>
      </>
    );
  }
  return (
    <section className="cb-panel" aria-label="Lista de custo e margem" data-lista={ui.modo}>
      <div className="cb-panel__toolbar">
        <div className="pat-os-tabs" role="tablist" aria-label="Agrupar a lista">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={ui.modo === tab.id} className={ui.modo === tab.id ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"} onClick={() => onMode(tab.id)}>
              {tab.label}
              {tab.rowCount !== undefined ? <span className="cb-tab-count">{formatCount(tab.rowCount)}</span> : null}
            </button>
          ))}
        </div>
        <label className="pat-os-search">
          <Search size={14} aria-hidden="true" />
          <span className="sr-only">Buscar organização ou grupo</span>
          <input type="search" value={ui.busca} placeholder="Buscar organização ou grupo" onChange={(event) => onSearch(event.currentTarget.value)} />
        </label>
        {ui.modo === "group" && access.manageBilling ? (
          <button type="button" className="pat-btn cb-btn--compact" onClick={() => onAction({ kind: "group-new" })}>
            <Plus size={13} aria-hidden="true" />
            Novo grupo
          </button>
        ) : null}
        <span className="pat-os-count">{count}</span>
      </div>
      {model.filterLabel ? (
        <div className="pat-filtro-chip-bar">
          <span className="pat-filtro-chip">
            {model.filterLabel}
            <button type="button" aria-label="Tirar o filtro" onClick={onClearTarget}>
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
      {body}
      <div className="cb-panel__totals">{footer}</div>
    </section>
  );
}
