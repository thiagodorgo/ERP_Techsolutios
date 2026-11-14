import { AlertTriangle, Building2, Check, Clock, Cloud, Plus, Receipt, TrendingUp, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { MonthSeriesChart, StepBridge, type MonthSeriesPoint, type StepBridgeStep } from "../../../../components/charts";
import { ALERT_TONE, capitalize, formatDateTime, formatDay, monthLabel, monthName, monthShort } from "../cloud-billing.labels";
import { formatBRL, formatCount, formatOriginal, formatPct, formatRate, geometryNumber, isNegative } from "../cloud-billing.money";
import type { CloudBillingView, GroupRow, SeriesPoint } from "../cloud-billing.state";
import { AlertPill, Card, CloudBillingBanners, CloudBillingHeader, ListPanel, plain, SeriesStatus, type CloudBillingAction, type CloudBillingViewProps } from "./cloudBilling.shared";

// B-ASS-10b (T5, F6) — aparência C · Fechamento e grupos (referência `screen-refs/platform-cloud-billing-3opcoes.reference.html`,
// `renderC`): a rotina do mês e a margem do cliente pelo grupo (3.Q2). A ponte "da assinatura à margem" (7 degraus, o
// valor final é o literal `global.margin`), 3 indicadores pequenos (custo total, margem global, menor margem), a lista de
// fechamento do mês com a ação ao lado, a margem mês a mês com o dólar de cada mês, a lista (que abre por grupo) e o
// painel de grupos ao lado. Só composição sobre o MESMO `CloudBillingView` (T-UI-1 (a)); todo valor exibido é o literal
// formatado de um campo do servidor; proporção e escala nascem nos componentes da biblioteca (L8).

// ---- a ponte da assinatura à margem -----------------------------------------------------------------------------------
function bridgeSteps(model: CloudBillingView): StepBridgeStep[] {
  const g = model.global;
  const step = (key: string, label: string, value: Parameters<typeof formatBRL>[0], kind: StepBridgeStep["kind"], tone: StepBridgeStep["tone"]): StepBridgeStep => ({
    key,
    label,
    value: geometryNumber(value),
    kind,
    displayValue: formatBRL(value),
    tone,
  });
  return [
    step("sub", "Assinaturas", g?.subscriptionTotal ?? null, "start", "accent"),
    step("custo", "Organizações", g?.tenantsCost ?? null, "minus", "danger"),
    step("plat", "Plataforma", g?.platformOwnCost ?? null, "minus", "violet"),
    step("nr", "Não rateado", g?.unallocatedOther ?? null, "minus", "warning"),
    step("arr", "Arredonda-\nmento", g?.roundingResidualCost ?? null, "minus", "neutral"),
    step("conv", "Conversão", g?.conversionResidualCost ?? null, "minus", "muted"),
    { ...step("margem", "Margem", g?.margin ?? null, "end", isNegative(g?.margin ?? null) ? "danger" : "success"), note: g?.marginPct ? formatPct(g.marginPct) : undefined },
  ];
}

type MiniModel = { readonly alvo: string; readonly icon: LucideIcon; readonly iconColor: string; readonly iconBg: string; readonly label: string; readonly value: string; readonly hint: string };

function miniKpis(model: CloudBillingView): MiniModel[] {
  const g = model.global;
  const dollar = model.fx && model.costValid ? ` · dólar ${formatRate(model.fx.rate, 4)}` : "";
  const items: MiniModel[] = [
    {
      alvo: "custo",
      icon: Cloud,
      iconColor: "#2563eb",
      iconBg: "#eff6ff",
      label: "Custo total do mês",
      value: formatBRL(g?.totalCost ?? null),
      hint: model.originalKnown && g ? `${formatOriginal(g.original.totalImportedCost, model.originalCurrency)}${dollar}` : "sem custo importado",
    },
    {
      alvo: "margem",
      icon: TrendingUp,
      iconColor: "#15803d",
      iconBg: "#ecfdf5",
      label: "Margem global",
      value: formatBRL(g?.margin ?? null),
      hint: g?.marginPct ? `${formatPct(g.marginPct)} das assinaturas` : "sem custo, sem margem",
    },
  ];
  const min = model.minMarginLine;
  items.push(
    min
      ? { alvo: `org:${min.tenantId}`, icon: AlertTriangle, iconColor: "#b91c1c", iconBg: "#fef2f2", label: "Menor margem", value: formatPct(min.marginPct), hint: min.tenantName }
      : { alvo: "sub", icon: Receipt, iconColor: "#047857", iconBg: "#ecfdf5", label: "Assinaturas do mês", value: formatBRL(g?.subscriptionTotal ?? null), hint: "antes dos créditos" },
  );
  return items;
}

function MiniColumn({ item, pressed, onTarget }: { readonly item: MiniModel; readonly pressed: boolean; readonly onTarget: (key: string) => void }) {
  const Icon = item.icon;
  return (
    <div className="cb-alvo" data-alvo={item.alvo}>
      <button type="button" className="cb-mini cb-mini--col" aria-pressed={pressed} aria-label={`${item.label}: ${plain(item.value)} — filtrar a lista`} onClick={() => onTarget(item.alvo)}>
        <span className="pat-kpi__tile cb-mini__tile" style={{ background: item.iconBg, color: item.iconColor }} aria-hidden="true">
          <Icon size={14} />
        </span>
        <span className="cb-mini__text">
          {item.label}
          <b className="cb-mini__value">{item.value}</b>
          <small>{item.hint}</small>
        </span>
      </button>
    </div>
  );
}

function BridgeCard({ model, onTarget }: Pick<CloudBillingViewProps, "model" | "onTarget">) {
  const g = model.global;
  const tone = ALERT_TONE[g?.alert ?? "unknown"];
  return (
    <Card
      title={`Da assinatura à margem · ${monthName(model.month)}`}
      hint="cada degrau é um valor do mês; clique para ver na lista"
      legend={
        <span className="cb-tag" style={{ background: tone.bg, color: tone.fg }}>
          margem {formatPct(g?.marginPct ?? null)}
        </span>
      }
    >
      {model.costValid ? (
        <StepBridge steps={bridgeSteps(model)} pressedKey={model.ui.alvo} onSelect={onTarget} ariaLabel="Da assinatura à margem do mês" />
      ) : (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">Sem custo no mês</div>
          <div className="pat-table__empty-detail">
            A ponte aparece quando o mês tiver custo em reais. Assinaturas do mês: <b className="pat-mono">{formatBRL(g?.subscriptionTotal ?? null)}</b>.
          </div>
        </div>
      )}
      <div className="cb-mini-grid cb-mini-grid--3">
        {miniKpis(model).map((item) => (
          <MiniColumn key={item.alvo} item={item} pressed={model.ui.alvo === item.alvo} onTarget={onTarget} />
        ))}
      </div>
    </Card>
  );
}

// ---- o fechamento do mês --------------------------------------------------------------------------------------------
type CheckState = "ok" | "atencao" | "erro" | "neutro";
const CHECK_ICON: Readonly<Record<CheckState, LucideIcon>> = { ok: Check, atencao: AlertTriangle, erro: X, neutro: Clock };

type CheckItem = {
  readonly key: string;
  readonly state: CheckState;
  readonly title: string;
  readonly detail: string;
  /** Uma ação (abre a janela) ou um alvo (filtra a lista); sem nenhum, o item só informa. */
  readonly action?: { readonly label: string; readonly run: CloudBillingAction };
  readonly alvo?: { readonly key: string; readonly value: string };
};

function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

function closingItems(model: CloudBillingView, access: CloudBillingViewProps["access"]): CheckItem[] {
  const items: CheckItem[] = [];
  const counts = model.counts;
  const imports = model.imports;
  const seeImports = access.readImports ? { label: "Ver", run: { kind: "imports" } as const } : undefined;
  // 1. o arquivo de custo
  if (imports === null) {
    items.push({ key: "arquivo", state: "neutro", title: "Arquivo de custo do mês", detail: "seu perfil não consulta a lista de importações" });
  } else if (model.isCurrentMonth && imports.length === 0) {
    items.push({ key: "arquivo", state: "atencao", title: "Arquivo de custo ainda não chegou", detail: "a AWS fecha o mês e libera o arquivo nos primeiros dias do mês seguinte", action: seeImports });
  } else if (imports.length === 0) {
    items.push({
      key: "arquivo",
      state: "erro",
      title: "Arquivo de custo não importado",
      detail: "importe o arquivo completo do mês",
      action: access.importCosts ? { label: "Importar", run: { kind: "import" } } : seeImports,
    });
  } else if (imports.length > 1) {
    const latest = imports[0]!;
    items.push({ key: "arquivo", state: "atencao", title: `${formatCount(imports.length)} arquivos importados no mês`, detail: `vale o mais recente (${formatDateTime(latest.importedAt ?? latest.createdAt)}); nada é somado`, action: seeImports });
  } else {
    const only = imports[0]!;
    const unknown = model.status === "currency_unknown";
    items.push({
      key: "arquivo",
      state: unknown ? "erro" : "ok",
      title: unknown ? "Arquivo sem moeda" : "Arquivo de custo importado",
      detail: `${formatDateTime(only.importedAt ?? only.createdAt)} · ${plural(only.rowCount, "linha", "linhas")}${only.currency ? ` · ${only.currency}` : ""}`,
      action: seeImports,
    });
  }
  // 2. o rateio do mês
  const rerun = access.runAllocation ? { label: "Rodar de novo", run: { kind: "run" } as const } : undefined;
  if (model.pendingRun) {
    items.push({ key: "rateio", state: "atencao", title: "Rateio em processamento", detail: `em processamento desde ${formatDateTime(model.pendingRun.startedAt ?? model.pendingRun.createdAt)}`, action: rerun });
  } else if (model.status === "no_import") {
    items.push({ key: "rateio", state: "atencao", title: "Rateio vazio", detail: "rodou sem arquivo de custo", action: rerun });
  } else if (model.status === "legacy_unscoped") {
    items.push({ key: "rateio", state: "atencao", title: "Rateio antigo", detail: "feito antes de guardar o arquivo de origem", action: rerun });
  } else if (model.lastCompletedRun) {
    items.push({ key: "rateio", state: "ok", title: "Rateio do mês concluído", detail: formatDateTime(model.lastCompletedRun.completedAt ?? model.lastCompletedRun.createdAt), action: rerun });
  } else {
    items.push({ key: "rateio", state: "erro", title: "Sem rateio no mês", detail: "roda sozinho depois da importação", action: rerun });
  }
  // 3. o dólar do mês (a janela abre também para quem só lê: mostra o histórico, §6.4.3)
  if (model.fx && model.status !== "fx_missing") {
    items.push({
      key: "dolar",
      state: "ok",
      title: "Dólar do mês digitado",
      detail: `${formatRate(model.fx.rate, 6)} · versão ${model.fx.version} · ${formatDay(model.fx.createdAt)}`,
      action: { label: access.manageBilling ? "Corrigir" : "Ver", run: { kind: "fx" } },
    });
  } else {
    items.push({ key: "dolar", state: "erro", title: "Dólar do mês não digitado", detail: "sem a taxa, custo e margem em reais ficam em branco", action: { label: access.manageBilling ? "Digitar" : "Ver", run: { kind: "fx" } } });
  }
  // 4 a 6. as contagens das linhas do mês, que filtram a lista
  items.push({
    key: "assinaturas",
    state: counts.estimateCount ? "atencao" : "ok",
    title: "Assinaturas do mês",
    detail: `${formatCount(counts.closedCount)} em demonstrativo fechado, pago ou cancelado · ${plural(counts.estimateCount, "estimativa", "estimativas")}`,
    alvo: { key: "est", value: formatCount(counts.estimateCount) },
  });
  if (model.costValid) {
    items.push({
      key: "alerta",
      state: counts.criticalCount ? "erro" : counts.warningCount ? "atencao" : "ok",
      title: "Organizações em alerta",
      detail: `${formatCount(counts.criticalCount)} crítica · ${formatCount(counts.warningCount)} em atenção`,
      alvo: { key: "alerta", value: formatCount(counts.criticalCount + counts.warningCount) },
    });
  } else {
    items.push({ key: "alerta", state: "neutro", title: "Organizações em alerta", detail: "sem custo no mês, não há o que comparar", alvo: { key: "alerta", value: "—" } });
  }
  items.push({ key: "semass", state: "neutro", title: "Sem assinatura própria", detail: "filiais em que a matriz assina e plano sem preço", alvo: { key: "semass", value: formatCount(counts.withoutSubscriptionCount) } });
  return items;
}

function ClosingCard({ model, access, onTarget, onAction }: Pick<CloudBillingViewProps, "model" | "access" | "onTarget" | "onAction">) {
  return (
    <Card title={`Fechamento de ${monthName(model.month)}`} hint="o que precisa estar certo para a margem valer">
      <div className="cb-checks">
        {closingItems(model, access).map((item) => {
          const Icon = CHECK_ICON[item.state];
          const body: ReactNode = (
            <>
              <span className={`cb-check__icon cb-check__icon--${item.state}`} aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="cb-check__text">
                {item.title}
                <small>{item.detail}</small>
              </span>
            </>
          );
          if (item.alvo) {
            const alvo = item.alvo;
            return (
              <div key={item.key} className="cb-alvo" data-alvo={alvo.key}>
                <button type="button" className="cb-check" aria-pressed={model.ui.alvo === alvo.key} aria-label={`${item.title}: ${alvo.value} — filtrar a lista`} onClick={() => onTarget(alvo.key)}>
                  {body}
                  <b className="cb-check__count">{alvo.value}</b>
                </button>
              </div>
            );
          }
          if (item.action) {
            const action = item.action;
            return (
              <button key={item.key} type="button" className="cb-check" data-fechamento={item.key} aria-label={`${item.title}: ${action.label}`} onClick={() => onAction(action.run)}>
                {body}
                <em className="cb-check__action">{action.label}</em>
              </button>
            );
          }
          return (
            <div key={item.key} className="cb-check cb-check--static" data-fechamento={item.key}>
              {body}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---- a margem mês a mês (a regra da série do §6.5.1: nenhum mês sai; sem custo, tracejado; sem nada, "sem dados") -----
const isEmptyMonth = (point: SeriesPoint) => point.state === "ok" && point.subscription === null && point.cost === null;

function marginAria(point: SeriesPoint): string {
  const month = capitalize(monthLabel(point.month));
  if (point.state === "loading") return `${month}: carregando`;
  if (point.state === "error") return `${month}: não foi possível carregar`;
  if (isEmptyMonth(point)) return `${month}: sem dados`;
  if (point.margin === null) return `${month}: assinaturas ${plain(formatBRL(point.subscription))}, sem custo, margem —`;
  return `${month}: margem ${plain(formatBRL(point.margin))}`;
}

function marginPoints(model: CloudBillingView): MonthSeriesPoint[] {
  return model.series.map((point) => {
    const empty = isEmptyMonth(point);
    return {
      key: point.month,
      label: `${monthShort(point.month)} · dólar ${formatRate(point.fxRate, 4)}`,
      sublabel: "",
      a: point.state === "ok" ? geometryNumber(point.margin) : null,
      b: null,
      topLabel: point.state === "ok" ? formatBRL(point.margin) : "—",
      topSubLabel: point.state !== "ok" || empty ? "" : point.margin === null ? "sem custo" : formatPct(point.marginPct),
      state: empty ? "empty" : point.state,
      ariaLabel: marginAria(point),
    };
  });
}

// ---- o painel de grupos ----------------------------------------------------------------------------------------------
function groupSummary(row: GroupRow): string {
  const count = plural(row.line.memberCount, "organização", "organizações");
  if (row.line.groupId === null) return `${count} avulsas`;
  return `${count} · assina: ${row.payers.length ? row.payers.map((member) => member.tenantName).join(", ") : "ninguém"}`;
}

function GroupsPanel({ model, access, onTarget, onAction }: Pick<CloudBillingViewProps, "model" | "access" | "onTarget" | "onAction">) {
  const scheduled = model.scheduled;
  return (
    <aside className="cb-groups" aria-label="Grupos econômicos">
      <div className="cb-groups__head">
        <b>Grupos econômicos</b>
        {access.manageBilling ? (
          <button type="button" className="pat-btn cb-btn--compact" onClick={() => onAction({ kind: "group-new" })}>
            <Plus size={13} aria-hidden="true" />
            Novo grupo
          </button>
        ) : null}
      </div>
      {model.groupRows.map((row) => {
        const alvo = `grp:${row.line.groupId ?? "sem"}`;
        return (
          <div key={row.rowId} className="cb-alvo" data-alvo={alvo}>
            <button type="button" className="cb-group" aria-pressed={model.ui.modo === "group" && model.ui.aberta === row.rowId} onClick={() => onTarget(alvo)}>
              <span className="cb-group__line">
                <span className="cb-group__name">{row.line.groupName ?? "Sem grupo"}</span>
                {row.line.alert ? <AlertPill alert={row.line.alert} /> : null}
              </span>
              <span className="cb-group__sub">{groupSummary(row)}</span>
              <span className="cb-group__sub">
                margem {formatBRL(row.line.margin)}
                {row.line.marginPct ? ` · ${formatPct(row.line.marginPct)}` : ""}
              </span>
            </button>
          </div>
        );
      })}
      {model.emptyGroups.map((group) => (
        <div key={group.id} className="cb-group cb-group--static">
          <span className="cb-group__name">{group.name}</span>
          <span className="cb-group__sub">sem organizações em {monthName(model.month)}</span>
        </div>
      ))}
      {scheduled === null ? <div className="cb-groups__note">Não foi possível carregar os agendamentos.</div> : null}
      {Array.isArray(scheduled) && scheduled.length ? (
        <div className="cb-groups__note">
          <b>Agendado:</b> {scheduled.map((item) => `${item.tenantName} entra no ${item.groupName} em ${formatDay(item.validFrom)}`).join("; ")}.
        </div>
      ) : null}
      <div className="cb-groups__note">
        A matriz assina pelo grupo, e a margem do cliente é a do grupo. O grupo serve para cobrança e para a visão de custo da plataforma: não dá a uma filial acesso aos dados de outra.
      </div>
    </aside>
  );
}

// ---- a aparência ------------------------------------------------------------------------------------------------------
export function CloudBillingViewC(props: CloudBillingViewProps) {
  const { model, access, onTarget, onMonth, onAction, onRetrySeries } = props;
  return (
    <div className="cb-view cb-view--c" data-aparencia="C">
      <CloudBillingHeader model={model} access={access} onMonth={onMonth} onAction={onAction} />
      <CloudBillingBanners model={model} access={access} onAction={onAction} />
      <div className="cb-topo-c">
        <BridgeCard model={model} onTarget={onTarget} />
        <ClosingCard model={model} access={access} onTarget={onTarget} onAction={onAction} />
      </div>
      <div className="cb-meses-c">
        <Card title="Margem mês a mês" hint="com o dólar usado em cada mês · clique para trocar o mês da tela">
          <MonthSeriesChart mode="margin" points={marginPoints(model)} pressedKey={model.month} onSelect={onMonth} ariaLabel="Margem dos últimos 6 meses" />
          <SeriesStatus model={model} onRetrySeries={onRetrySeries} />
        </Card>
      </div>
      <div className="cb-base-c">
        <ListPanel {...props} showGroupColumn pctBar={false} />
        <GroupsPanel model={model} access={access} onTarget={onTarget} onAction={onAction} />
      </div>
    </div>
  );
}
