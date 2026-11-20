import {
  AlertTriangle,
  Ban,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Plug,
  Power,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Undo2,
  UserX,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { ColumnBars, ProportionBars, type ColumnBarTone, type ColumnBarsItem, type ProportionBarItem } from "../../../../components/charts";
import { DenseTable, type DenseColumn } from "../../../../components/dense-list";
import { KpiStatCard, StatusPill } from "../../../../components/patterns";
import type { BillingOpsAccess } from "../billing-ops.access";
import { errorText } from "../billing-ops.errors";
import {
  BACKLOG_LABEL,
  BACKLOG_TONE,
  CANCEL_IN_REVIEW,
  CHARGE_TONE,
  INVOICE_TONE,
  QUEUE_KIND_LABEL,
  capitalize,
  chargeRowTone,
  creditReasonLabel,
  creditStatusLabel,
  formatDateTime,
  formatDay,
  formatTime,
  historyLabel,
  monthLabel,
  monthName,
  monthShort,
  paymentMethodLabel,
  profileFieldLabel,
  statementTone,
  type Tone,
} from "../billing-ops.labels";
import { formatBRL, hasValue, type Money } from "../billing-ops.money";
import { BUCKET_COLOR, BUCKET_LABEL, BUCKETS, FILTERS, type BillingOpsView, type Bucket, type Kpi, type KpiKey, type Row } from "../billing-ops.state";
import type { DialogAction } from "../components/BillingOpsDialogs";
import { queueReason } from "../components/queueText";
import type { DetailReading } from "../useBillingOps";

// B-ASS-10c-OPERACAO — as peças comuns às 3 aparências da tela de operação da cobrança (A · Fiel ao console, B · Mesa de
// revisão, C · Por organização; maquete aprovada `cob-op-3opcoes.reference.html`). Só composição: as views recebem o
// MESMO `BillingOpsView` (o modelo único, R-APAR) e não importam adapter, service nem hook. Nenhum valor de dinheiro é
// calculado aqui (R-T5-DIN): cada valor exibido é o texto do servidor, formatado por `formatBRL`.

export type BillingOpsViewProps = {
  readonly model: BillingOpsView;
  readonly access: BillingOpsAccess;
  readonly details: Readonly<Record<string, DetailReading>>;
  /** O painel do canal, já montado pela página (aparece logo abaixo dos indicadores quando aberto). */
  readonly channelPanel: ReactNode;
  readonly onTarget: (key: string) => void;
  readonly onToggleRow: (key: string) => void;
  readonly onClearTarget: () => void;
  readonly onSearch: (text: string) => void;
  readonly onMonth: (month: string) => void;
  readonly onRefresh: () => void;
  readonly onRetryDetail: (row: Row) => void;
  readonly onDialog: (dialog: DialogAction) => void;
  readonly onOpenOrg: (orgId: string) => void;
};

const NBSP = /\s/g;
export const plain = (text: string) => text.replace(NBSP, " ");

// ---- cabeçalho e faixas -------------------------------------------------------------------------------------------------
export function MonthSelect({ model, onMonth }: Pick<BillingOpsViewProps, "model" | "onMonth">) {
  return (
    <label className="cb-month-select">
      <CalendarDays size={14} aria-hidden="true" />
      <span className="sr-only">Mês dos demonstrativos</span>
      <select aria-label="Mês dos demonstrativos" value={model.month} onChange={(event) => onMonth(event.currentTarget.value)}>
        {(model.monthOptions.includes(model.month) ? model.monthOptions : [model.month, ...model.monthOptions]).map((option) => (
          <option key={option} value={option}>
            {capitalize(monthLabel(option))}
            {option === model.currentMonth ? " (em aberto)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BillingOpsHeader({ model, onMonth, onRefresh }: Pick<BillingOpsViewProps, "model" | "onMonth" | "onRefresh">) {
  return (
    <div className="pat-page-header">
      <div className="pat-page-header__lead">
        <div className="pat-page-header__kicker">Plataforma · cobrança das organizações</div>
        <h1 className="pat-page-header__title">Cobrança</h1>
        <p className="pat-page-header__subtitle">Demonstrativos, cobranças, notas e canal das organizações</p>
      </div>
      <div className="pat-page-header__actions">
        <MonthSelect model={model} onMonth={onMonth} />
        <button type="button" className="pat-btn" onClick={onRefresh}>
          <RefreshCw size={14} aria-hidden="true" />
          Atualizar
        </button>
      </div>
    </div>
  );
}

function Banner({ tone, icon: Icon, children, action }: { readonly tone: "warning" | "error"; readonly icon: LucideIcon; readonly children: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className={`pat-banner pat-banner--${tone}`} role="status" style={{ marginBottom: 12 }}>
      <Icon size={16} aria-hidden="true" />
      <span>{children}</span>
      {action}
    </div>
  );
}

/** As faixas da tela: organizações que não carregaram e o canal desligado (o desatualizado vem da página). */
export function BillingOpsBanners({ model, onRefresh, onTarget }: Pick<BillingOpsViewProps, "model" | "onRefresh" | "onTarget">) {
  const failed = model.orgFailed;
  return (
    <>
      {failed.length ? (
        <Banner
          tone="warning"
          icon={AlertTriangle}
          action={
            <button type="button" className="pat-btn" onClick={onRefresh}>
              <RefreshCw size={14} aria-hidden="true" />
              Tentar de novo
            </button>
          }
        >
          <b>
            {failed.length} de {model.orgTotal} {model.orgTotal === 1 ? "organização" : "organizações"} não {failed.length === 1 ? "carregou" : "carregaram"}
          </b>{" "}
          ({failed.map((org) => org.name).join(", ")}). Os indicadores ficam em “—” até {failed.length === 1 ? "ela carregar" : "elas carregarem"}; nada é contado como zero.
        </Banner>
      ) : null}
      {model.channel.state === "ok" && !model.channel.on ? (
        <Banner
          tone="error"
          icon={Power}
          action={
            <button type="button" className="pat-btn" onClick={() => onTarget("canal")}>
              <Plug size={14} aria-hidden="true" />
              Ver o canal
            </button>
          }
        >
          <b>Canal de cobrança desligado.</b> Nenhuma cobrança nem nota sai para o provedor, e emitir cobrança é recusado até o canal ser ligado.
          {model.channel.serverOff ? " Hoje o servidor está com a cobrança desligada: só a configuração do servidor libera." : ""}
        </Banner>
      ) : null}
    </>
  );
}

// ---- indicadores ----------------------------------------------------------------------------------------------------------
type KpiStyle = { readonly icon: LucideIcon; readonly bg: string; readonly fg: string; readonly alertTag?: string };
export const KPI_STYLE: Readonly<Record<KpiKey, KpiStyle>> = {
  todos: { icon: Receipt, bg: "#EFF6FF", fg: "#2563EB" },
  acobrar: { icon: Send, bg: "#FFFBEB", fg: "#B45309" },
  emitidas: { icon: Banknote, bg: "#EFF6FF", fg: "#1D4ED8" },
  pagos: { icon: CheckCircle2, bg: "#ECFDF5", fg: "#047857" },
  atraso: { icon: Clock, bg: "#FEF2F2", fg: "#B91C1C" },
  revisao: { icon: AlertTriangle, bg: "#FFFBEB", fg: "#B45309" },
  falha: { icon: XCircle, bg: "#FEF2F2", fg: "#B91C1C" },
  notas: { icon: FileText, bg: "#F5F3FF", fg: "#6D28D9" },
  perfil: { icon: UserX, bg: "#F1F5F9", fg: "#475569" },
};

export function KpiBlock({ kpi, pressed, onTarget }: { readonly kpi: Kpi; readonly pressed: boolean; readonly onTarget: (key: string) => void }) {
  const style = KPI_STYLE[kpi.key];
  return (
    <div className="cb-alvo" data-alvo={kpi.key}>
      <KpiStatCard
        icon={style.icon}
        iconColor={style.fg}
        iconBg={style.bg}
        value={kpi.value}
        label={kpi.label}
        hint={kpi.hint}
        tag={kpi.alert ? { label: "pede ação", bg: style.bg, fg: style.fg } : undefined}
        border={kpi.alert ? "#FCA5A5" : undefined}
        pressed={pressed}
        ariaLabel={`${kpi.label}: ${kpi.value} · ${kpi.hint} — filtrar a lista`}
        onClick={() => onTarget(kpi.key)}
      />
    </div>
  );
}

/** O bloco "Canal de cobrança": abre o painel de provedores logo abaixo (não filtra). */
export function ChannelBlock({ model, onTarget }: Pick<BillingOpsViewProps, "model" | "onTarget">) {
  const channel = model.channel;
  const tone = channel.state !== "ok" ? { bg: "#F1F5F9", fg: "#64748B" } : channel.on ? { bg: "#ECFDF5", fg: "#047857" } : { bg: "#FEF2F2", fg: "#B91C1C" };
  return (
    <div className="cb-alvo" data-alvo="canal">
      <KpiStatCard
        icon={Power}
        iconColor={tone.fg}
        iconBg={tone.bg}
        value={<span style={{ color: tone.fg }}>{channel.value}</span>}
        label="Canal de cobrança"
        hint={channel.hint}
        pressed={model.ui.canal}
        ariaLabel={`Canal de cobrança: ${channel.value} · ${channel.hint} — abre o painel do canal`}
        onClick={() => onTarget("canal")}
      />
    </div>
  );
}

export function isPressed(model: BillingOpsView, key: KpiKey): boolean {
  return key === "todos" ? model.ui.alvo === null : model.ui.alvo === key;
}

// ---- gráficos (CONTAM demonstrativos; cada mês e cada barra é um botão) --------------------------------------------------
const BUCKET_TONE: Readonly<Record<Bucket, ColumnBarTone>> = { pago: "inflow", enviada: "agenda-today", semcobr: "agenda-soon", aberto: "agenda-none" };

export function MonthsChart({ model, onMonth, height = 150 }: Pick<BillingOpsViewProps, "model" | "onMonth"> & { readonly height?: number }) {
  const items: ColumnBarsItem[] = model.months.map((bar) => ({
    key: bar.month,
    label: monthShort(bar.month),
    value: bar.total,
    ariaLabel:
      bar.counts === null
        ? `${capitalize(monthLabel(bar.month))}: organização sem carregar — abrir este mês`
        : `${capitalize(monthLabel(bar.month))}: ${bar.total} demonstrativos (${BUCKETS.filter((bucket) => bar.counts![bucket] > 0)
            .map((bucket) => `${BUCKET_LABEL[bucket].toLocaleLowerCase("pt-BR")} ${bar.counts![bucket]}`)
            .join(", ")}). Abrir este mês`,
    // A faixa sem demonstrativo não desenha toco (zero não é barra); o número do mês fica acima da coluna.
    bars: BUCKETS.map((bucket) => ({ tone: BUCKET_TONE[bucket], value: bar.counts === null || bar.counts[bucket] === 0 ? null : bar.counts[bucket] })),
  }));
  return <ColumnBars items={items} ariaLabel="Demonstrativos por mês e situação" pressedKey={model.month} onSelect={onMonth} height={height} barHeight={height - 44} />;
}

export function BucketLegend({ model, onTarget }: Pick<BillingOpsViewProps, "model" | "onTarget">) {
  const counts = model.months.find((bar) => bar.month === model.month)?.counts ?? null;
  return (
    <div className="cb-legend" style={{ marginTop: 8 }}>
      {BUCKETS.map((bucket) => (
        <button
          key={bucket}
          type="button"
          className="pat-btn"
          style={{ minHeight: 30, padding: "3px 9px", fontSize: 11.5 }}
          aria-pressed={model.ui.alvo === `b:${bucket}`}
          onClick={() => onTarget(`b:${bucket}`)}
        >
          <i style={{ background: BUCKET_COLOR[bucket], width: 9, height: 9, borderRadius: 3, display: "inline-block" }} aria-hidden="true" />
          {BUCKET_LABEL[bucket]} <b>{counts === null ? "—" : counts[bucket]}</b>
        </button>
      ))}
    </div>
  );
}

/** "Situação de <mês>": quantidade por situação, cada barra filtra a lista. */
export function SituationBars({ model, onTarget }: Pick<BillingOpsViewProps, "model" | "onTarget">) {
  const rows = model.monthRows;
  const count = (predicate: (row: Row) => boolean) => (model.partial ? null : rows.filter(predicate).length);
  const items: ProportionBarItem[] = [
    { key: "b:pago", label: "Pago", value: count((row) => row.bucket === "pago"), displayValue: String(count((row) => row.bucket === "pago") ?? "—"), color: "#10b981" },
    { key: "b:enviada", label: "Cobrança enviada", value: count((row) => row.bucket === "enviada"), displayValue: String(count((row) => row.bucket === "enviada") ?? "—"), color: "#2563eb" },
    { key: "b:semcobr", label: "Sem cobrança", value: count((row) => row.bucket === "semcobr"), displayValue: String(count((row) => row.bucket === "semcobr") ?? "—"), color: "#f59e0b" },
    { key: "atraso", label: "Em atraso", value: count(FILTERS.atraso), displayValue: String(count(FILTERS.atraso) ?? "—"), color: "#dc2626" },
    { key: "notas", label: "Nota pendente", value: count(FILTERS.notas), displayValue: String(count(FILTERS.notas) ?? "—"), color: "#7c3aed" },
  ];
  return <ProportionBars items={items} ariaLabel={`Situação dos demonstrativos de ${monthName(model.month)}`} pressedKey={model.ui.alvo} onSelect={onTarget} />;
}

export function Card({ title, hint, side, children }: { readonly title: string; readonly hint?: string; readonly side?: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="cb-card" aria-label={title}>
      <div className="cb-card__head">
        <div>
          <h2 className="cb-card__title">{title}</h2>
          {hint ? <div className="cb-card__hint">{hint}</div> : null}
        </div>
        {side}
      </div>
      {children}
    </section>
  );
}

/** O selo do que o servidor ainda não fornece (a maquete: "falta no backend"), com a pendência dona no texto completo. */
export function MissingTag({ title }: { readonly title: string }) {
  return (
    <span title={title} style={{ fontSize: 10.5, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px dashed #f59e0b", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>
      ainda não vem do servidor
    </span>
  );
}

// ---- células da lista -------------------------------------------------------------------------------------------------------
function Pill({ tone, icon }: { readonly tone: Tone; readonly icon?: ReactNode }) {
  return <StatusPill sm label={tone.label} bg={tone.bg} fg={tone.fg} dot={icon ? undefined : tone.fg} icon={icon} />;
}

export function StatementPill({ row }: { readonly row: Row }) {
  return <Pill tone={statementTone(row.statement.status, row.partiallyPaid)} />;
}

export function ChargeCell({ row }: { readonly row: Row }) {
  if (row.statement.status === "open" || row.statement.status === "reopened") return <span className="pat-muted">—</span>;
  if (row.cancelInReview) return <Pill tone={CANCEL_IN_REVIEW} />;
  if (row.statement.chargeStatus === "none") return <span style={{ color: "#64748b" }}>Sem cobrança</span>;
  return <Pill tone={CHARGE_TONE[row.statement.chargeStatus]} />;
}

export function InvoiceCell({ row }: { readonly row: Row }) {
  if (row.backlog) return <Pill tone={BACKLOG_TONE[row.backlog]} icon={row.backlog === "live_on_unpaid" ? <AlertTriangle size={11} /> : undefined} />;
  if (row.statement.invoiceStatus === "none") return <span style={{ color: "#94a3b8" }}>—</span>;
  return <Pill tone={INVOICE_TONE[row.statement.invoiceStatus]} />;
}

function MoneyCell({ value, muted = false }: { readonly value: Money | null; readonly muted?: boolean }) {
  return (
    <span className="pat-mono" style={{ fontWeight: 700, color: muted ? "#94a3b8" : "#0f172a", whiteSpace: "nowrap" }}>
      {formatBRL(value)}
    </span>
  );
}

function DueCell({ row }: { readonly row: Row }) {
  if (!row.statement.dueDate) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span style={row.overdue ? { color: "#b91c1c", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 } : undefined}>
      {formatDay(row.statement.dueDate)}
      {row.overdue ? <Clock size={12} aria-label="Em atraso" /> : null}
    </span>
  );
}

function OrgCell({ row }: { readonly row: Row }) {
  const attention = row.review.length + row.failed.length > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.org.name}</b>
      {attention ? <AlertTriangle size={12} color="#b45309" aria-label="Fila de envio pede ação" /> : null}
    </span>
  );
}

export const rowTitle = (row: Row) =>
  `${row.org.name} · ${monthLabel(row.statement.period)} · saldo ${plain(formatBRL(row.statement.balance))}${row.review.length ? " · fila em revisão" : row.failed.length ? " · fila com falha" : ""}`;

/** As colunas da lista larga (A) e da estreita (B). */
export function statementColumns(wide: boolean): DenseColumn<Row>[] {
  const columns: DenseColumn<Row>[] = [
    { key: "org", header: "Organização", render: (row) => <OrgCell row={row} /> },
    { key: "situacao", header: "Situação", width: wide ? 132 : 126, render: (row) => <StatementPill row={row} /> },
    { key: "cobranca", header: "Cobrança", width: wide ? 186 : 150, render: (row) => <ChargeCell row={row} /> },
  ];
  if (wide) {
    columns.push({ key: "nota", header: "Nota", width: 170, render: (row) => <InvoiceCell row={row} /> });
    columns.push({ key: "total", header: "Total", width: 112, align: "right", tabular: true, render: (row) => <MoneyCell value={row.statement.totalAmount} /> });
  }
  columns.push({ key: "saldo", header: "Saldo", width: wide ? 112 : 104, align: "right", tabular: true, render: (row) => <MoneyCell value={row.statement.balance} muted={!hasValue(row.statement.balance)} /> });
  columns.push({ key: "venc", header: "Vencimento", width: wide ? 112 : 96, tabular: true, render: (row) => <DueCell row={row} /> });
  return columns;
}

// ---- detalhe do demonstrativo (propriedades e ações; o servidor decide se a ação vale) -----------------------------------
function ActionButton({ icon: Icon, label, primary = false, danger = false, blocked, onClick }: { readonly icon: LucideIcon; readonly label: string; readonly primary?: boolean; readonly danger?: boolean; readonly blocked?: string | null; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      className={primary ? "pat-btn pat-btn--primary" : "pat-btn"}
      style={danger ? { color: "#b91c1c" } : blocked ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
      aria-disabled={blocked ? "true" : undefined}
      title={blocked ?? undefined}
      onClick={blocked ? () => undefined : onClick}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

/** Por que "Emitir cobrança" está travado (a maquete, `acoes`); `null` = a situação permite. Quem decide é o servidor. */
export function chargeBlocked(row: Row): string | null {
  if (row.chargeAlive) return "Já existe cobrança enviada";
  if (row.partiallyPaid) return "Com pagamento parcial, registre a baixa do restante";
  if (row.review.length + row.failed.length > 0) return "Resolva a linha da fila antes";
  if (row.cancelInReview) return "O cancelamento anterior está em revisão";
  if (row.profile && !row.profile.complete) return "Complete o perfil de cobrança antes";
  return null;
}

function DetailActions({ row, access, onDialog, onOpenOrg }: { readonly row: Row; readonly access: BillingOpsAccess; readonly onDialog: (dialog: DialogAction) => void; readonly onOpenOrg: (orgId: string) => void }) {
  const openOrg = (
    <button type="button" className="pat-btn" onClick={() => onOpenOrg(row.org.id)}>
      <ExternalLink size={14} aria-hidden="true" />
      Abrir a organização
    </button>
  );
  if (!access.settle) {
    return (
      <>
        <span className="pat-ab-detail-note">Seu perfil só consulta a cobrança.</span>
        {openOrg}
      </>
    );
  }
  const status = row.statement.status;
  if (status === "open" || status === "reopened") {
    return (
      <>
        <span className="pat-ab-detail-note">Sem ação até o fechamento do mês.</span>
        {openOrg}
      </>
    );
  }
  if (status === "cancelled") {
    return (
      <>
        <span className="pat-ab-detail-note">Demonstrativo cancelado: sem ação de cobrança.</span>
        {openOrg}
      </>
    );
  }
  const busy = row.chargeAlive || row.review.length + row.failed.length > 0;
  return (
    <>
      {status === "closed" ? (
        <>
          <ActionButton icon={Send} label="Emitir cobrança…" primary blocked={chargeBlocked(row)} onClick={() => onDialog({ kind: "charge", row })} />
          {row.chargeAlive ? <ActionButton icon={Ban} label="Cancelar cobrança…" danger onClick={() => onDialog({ kind: "cancel", row })} /> : null}
          <ActionButton icon={Wallet} label="Registrar baixa manual…" onClick={() => onDialog({ kind: "payment", row })} />
          <ActionButton icon={Ban} label="Cancelar cobrança vista só no provedor…" onClick={() => onDialog({ kind: "cancel-unknown", row })} />
        </>
      ) : null}
      {status === "paid" ? (
        <ActionButton icon={FileText} label={row.statement.invoiceStatus === "authorized" ? "Reemitir nota…" : "Emitir nota…"} primary={row.backlog !== null} onClick={() => onDialog({ kind: "invoice", row })} />
      ) : null}
      <span className="pat-ab-detail-note">
        {busy ? "O botão mostra se a situação permite; quem decide é o servidor, e a recusa dele aparece na janela." : "Cada ação pede confirmação na janela antes de ir ao servidor."}
      </span>
    </>
  );
}

function DetailItem({ tone = "neutral", children }: { readonly tone?: "neutral" | "warning" | "danger"; readonly children: ReactNode }) {
  const style = tone === "warning" ? { background: "#fffbeb", borderColor: "#fde68a" } : tone === "danger" ? { background: "#fef2f2", borderColor: "#fecaca" } : undefined;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", border: "1px solid #f1f5f9", borderRadius: 9, fontSize: 12.5, color: "#334155", flexWrap: "wrap", ...style }}>
      {children}
    </div>
  );
}

/** Nota dentro de uma coluna do detalhe (a `.pat-ab-detail-note` cresce como item de linha; aqui ela não pode crescer). */
const NOTE = { margin: 0, fontSize: 12, color: "#64748b" } as const;

function CompositionLine({ label, value, strong = false }: { readonly label: string; readonly value: Money | null; readonly strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, color: strong ? "#0f172a" : "#334155", fontWeight: strong ? 800 : 500 }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
        {label}
      </span>
      <span className="pat-mono" style={{ fontWeight: strong ? 800 : 700, whiteSpace: "nowrap" }}>
        {formatBRL(value)}
      </span>
    </div>
  );
}

export function StatementDetail({ row, reading, access, onDialog, onOpenOrg, onRetry }: { readonly row: Row; readonly reading: DetailReading | undefined; readonly access: BillingOpsAccess; readonly onDialog: (dialog: DialogAction) => void; readonly onOpenOrg: (orgId: string) => void; readonly onRetry: () => void }) {
  const s = row.statement;
  const detail = reading?.state === "ok" ? reading.detail : null;
  const charges = reading?.state === "ok" ? reading.charges : null;
  const lines = [...row.review, ...row.failed];
  return (
    <div className="pat-ab-detail-content" data-detalhe={row.key}>
      {row.backlog === "live_on_unpaid" ? (
        <DetailItem tone="danger">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            <b>Nota emitida sem pagamento.</b> A nota deste mês saiu antes do pagamento total. Se o restante não entrar, ela precisa ser cancelada.
          </span>
        </DetailItem>
      ) : null}
      {row.overdue ? (
        <DetailItem tone="warning">
          <Clock size={14} aria-hidden="true" />
          <span>
            <b>Em atraso:</b> venceu em {formatDay(s.dueDate)} com saldo de {formatBRL(s.balance)}.
          </span>
        </DetailItem>
      ) : null}
      {s.status === "open" || s.status === "reopened" ? (
        <DetailItem>
          <Clock size={14} aria-hidden="true" />
          <span>Mês em aberto: até o fechamento não há total, cobrança nem baixa.</span>
        </DetailItem>
      ) : null}
      {charges?.fullAmountChargeOpen ? (
        <DetailItem tone="warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Ainda há cobrança do valor cheio aberta no provedor. Cancele-a para não cobrar duas vezes.</span>
          {access.settle ? (
            <button type="button" className="pat-btn" style={{ marginLeft: "auto", color: "#b91c1c" }} onClick={() => onDialog({ kind: "cancel", row })}>
              <Ban size={13} aria-hidden="true" />
              Cancelar cobrança
            </button>
          ) : null}
        </DetailItem>
      ) : null}
      {reading?.state === "failed" ? (
        <DetailItem tone="warning">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{reading.notFound ? errorText("statement_not_found") : "Não foi possível ler as cobranças e os pagamentos deste demonstrativo."}</span>
          {!reading.notFound ? (
            <button type="button" className="pat-btn" style={{ marginLeft: "auto" }} onClick={onRetry}>
              <RefreshCw size={13} aria-hidden="true" />
              Tentar de novo
            </button>
          ) : null}
        </DetailItem>
      ) : null}
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <h4>Composição · {monthLabel(s.period)}</h4>
          {s.totalAmount === null ? (
            <p style={NOTE}>Sem composição até o fechamento.</p>
          ) : (
            <>
              <CompositionLine label="Plano" value={s.baseAmount} />
              <CompositionLine label={`Usuários extras${s.usersExtra ? ` (${s.usersExtra})` : ""}`} value={s.usersExtraAmount} />
              <CompositionLine label="Armazenamento extra" value={s.storageExtraAmount} />
              <CompositionLine label={`Rastreamento${s.trackingBilledVehicles ? ` (${s.trackingBilledVehicles} ${s.trackingBilledVehicles === 1 ? "veículo" : "veículos"})` : ""}`} value={s.trackingAmount} />
              {hasValue(s.adjustmentsAmount) ? <CompositionLine label="Ajuste combinado" value={s.adjustmentsAmount} /> : null}
              {hasValue(s.creditsAppliedAmount) ? <CompositionLine label="Crédito aplicado" value={s.creditsAppliedAmount} /> : null}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                <CompositionLine label="Total" value={s.totalAmount} strong />
                <CompositionLine label="Pago" value={s.paidAmount} />
                <CompositionLine label="Saldo" value={s.balance} strong />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, color: "#334155" }}>
                  <span>Vencimento</span>
                  <span className="pat-mono" style={{ fontWeight: 700 }}>
                    {formatDay(s.dueDate)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="pat-ab-detail-col">
          <h4>Cobrança</h4>
          {reading?.state === "loading" || !reading ? (
            <p style={NOTE} aria-busy="true">
              Carregando…
            </p>
          ) : charges && charges.charges.length ? (
            charges.charges.map((charge) => (
              <DetailItem key={charge.id}>
                <Pill tone={chargeRowTone(charge.status)} />
                <span>vence {formatDay(charge.dueDate)}</span>
                {charge.payUrl ? (
                  <a className="pat-btn" style={{ marginLeft: "auto" }} href={charge.payUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={13} aria-hidden="true" />
                    Link de pagamento
                  </a>
                ) : null}
              </DetailItem>
            ))
          ) : (
            <p style={NOTE}>Nenhuma cobrança{s.status === "closed" ? " emitida" : ""}.</p>
          )}
          <h4 style={{ marginTop: 8 }}>Pagamentos</h4>
          {detail && detail.payments.length ? (
            detail.payments.map((payment) => (
              <DetailItem key={payment.id}>
                <b className="pat-mono">{formatBRL(payment.amount)}</b>
                <span>
                  {formatDay(payment.paidAt)}
                  {paymentMethodLabel(payment.method) ? ` · ${paymentMethodLabel(payment.method)}` : ""}
                  {payment.source === "manual" ? " · baixa manual" : " · pelo provedor"}
                  {payment.note ? ` · “${payment.note}”` : ""}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  {payment.reversed ? (
                    <Pill tone={{ label: "Estornado", bg: "#F1F5F9", fg: "#64748B" }} />
                  ) : payment.source === "manual" ? (
                    access.settle ? (
                      <ActionButton icon={Undo2} label="Estornar" danger onClick={() => onDialog({ kind: "reverse", row, payment })} />
                    ) : null
                  ) : (
                    <span style={{ fontSize: 11, color: "#64748b" }}>o estorno é feito no provedor</span>
                  )}
                </span>
              </DetailItem>
            ))
          ) : reading?.state === "ok" ? (
            <p style={NOTE}>Nenhum pagamento.</p>
          ) : null}
          {detail && detail.credits.length ? (
            <>
              <h4 style={{ marginTop: 8 }}>Créditos</h4>
              {detail.credits.map((credit) => (
                <DetailItem key={credit.id}>
                  <b className="pat-mono">{formatBRL(credit.amount)}</b>
                  <span>
                    {creditReasonLabel(credit.reason)} · {creditStatusLabel(credit.status)}
                  </span>
                </DetailItem>
              ))}
            </>
          ) : null}
          <h4 style={{ marginTop: 8 }}>Perfil de cobrança</h4>
          {row.profile === null ? (
            <p style={NOTE}>Sem leitura do perfil.</p>
          ) : row.profile.complete ? (
            <DetailItem>
              <Pill tone={{ label: "Completo", bg: "#ECFDF5", fg: "#047857" }} />
              <span>Dados de cobrança completos.</span>
            </DetailItem>
          ) : (
            <DetailItem tone="warning">
              <UserX size={14} aria-hidden="true" />
              <span>Faltam: {row.profile.missing.map(profileFieldLabel).join(", ")}. Sem isso a cobrança não sai.</span>
            </DetailItem>
          )}
        </div>
        <div className="pat-ab-detail-col">
          <h4>Nota fiscal</h4>
          <DetailItem tone={row.backlog === "live_on_unpaid" ? "danger" : "neutral"}>
            <InvoiceCell row={row} />
            <span>{row.backlog ? BACKLOG_LABEL[row.backlog] : s.invoiceStatus === "none" ? "A nota sai depois do pagamento." : "Sem pendência."}</span>
          </DetailItem>
          <h4 style={{ marginTop: 8 }}>Fila de envio</h4>
          {lines.length ? (
            lines.map((line) => (
              <DetailItem key={line.id} tone={line.status === "NEEDS_REVIEW" ? "warning" : "danger"}>
                <Pill tone={line.status === "NEEDS_REVIEW" ? { label: "Em revisão", bg: "#FFFBEB", fg: "#B45309" } : { label: "Com falha", bg: "#FEF2F2", fg: "#B91C1C" }} />
                <span style={{ flex: "1 1 220px" }}>
                  <b>{QUEUE_KIND_LABEL[line.kind]}</b> · {formatDateTime(line.updatedAt ?? line.occurredAt)}
                  <br />
                  {queueReason(line)}
                </span>
                {access.settle ? (
                  <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                    {line.status === "NEEDS_REVIEW" && line.kind === "charge_cancel" ? (
                      <ActionButton icon={CheckCircle2} label="Confirmar cancelamento" onClick={() => onDialog({ kind: "confirm-cancelled", row, line })} />
                    ) : null}
                    {line.status === "NEEDS_REVIEW" ? <ActionButton icon={CheckCircle2} label="Resolver" onClick={() => onDialog({ kind: "resolve", row, line })} /> : null}
                    {line.status === "FAILED" ? <ActionButton icon={RefreshCw} label="Reprocessar" onClick={() => onDialog({ kind: "retry", row, line })} /> : null}
                  </span>
                ) : null}
              </DetailItem>
            ))
          ) : (
            <p style={NOTE}>Nada pendente na fila de envio.</p>
          )}
          <h4 style={{ marginTop: 8 }}>Histórico</h4>
          {s.history.length ? (
            s.history.slice(-4).map((entry, index) => (
              <DetailItem key={`${entry.at}-${index}`}>
                <b className="pat-mono" style={{ fontSize: 11 }}>
                  {formatDateTime(entry.at)}
                </b>
                <span>
                  {historyLabel(entry.event)}
                  {entry.note ? `: “${entry.note}”` : ""}
                </span>
              </DetailItem>
            ))
          ) : (
            <p style={NOTE}>Sem histórico.</p>
          )}
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        <DetailActions row={row} access={access} onDialog={onDialog} onOpenOrg={onOpenOrg} />
      </div>
    </div>
  );
}

// ---- a lista ---------------------------------------------------------------------------------------------------------------------
export function NotLoadedRows({ model, onRefresh }: Pick<BillingOpsViewProps, "model" | "onRefresh">) {
  if (!model.orgFailed.length) return null;
  return (
    <div style={{ padding: "8px 16px 0", display: "grid", gap: 6 }}>
      {model.orgFailed.map((org) => (
        <div key={org.id} className="pat-banner pat-banner--warning" data-nao-carregou="" style={{ margin: 0 }}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            <b>{org.name}</b> não carregou. Os números dela ficam fora até carregar.
          </span>
          <button type="button" className="pat-btn" onClick={onRefresh}>
            <RefreshCw size={13} aria-hidden="true" />
            Tentar de novo
          </button>
        </div>
      ))}
    </div>
  );
}

export function FilterChip({ model, onClearTarget }: Pick<BillingOpsViewProps, "model" | "onClearTarget">) {
  if (!model.filterLabel) return null;
  return (
    <div className="pat-filtro-chip-bar">
      <span className="pat-filtro-chip">
        Filtro: {model.filterLabel}
        <button type="button" aria-label={`Tirar o filtro ${model.filterLabel}`} onClick={onClearTarget}>
          <X size={12} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export function SearchBox({ model, onSearch }: Pick<BillingOpsViewProps, "model" | "onSearch">) {
  return (
    <label className="pat-os-search">
      <Search size={14} aria-hidden="true" />
      <span className="sr-only">Buscar organização</span>
      <input type="search" value={model.ui.busca} placeholder="Buscar organização" onChange={(event) => onSearch(event.currentTarget.value)} />
    </label>
  );
}

export function TotalsNote({ children }: { readonly children: ReactNode }) {
  return (
    <div className="cb-panel__totals">
      <span>
        {children} Soma em reais entre organizações <MissingTag title="A soma em reais entre organizações depende de uma rota de resumo no servidor (pendência P-ASS10C-RESUMO-ENTRE-ORGANIZACOES)." />
      </span>
    </div>
  );
}

export function StatementList(props: BillingOpsViewProps & { readonly wide: boolean }) {
  const { model, access, details, onToggleRow, onRefresh, onDialog, onOpenOrg, onRetryDetail, wide } = props;
  return (
    <section className="cb-panel" aria-label={`Demonstrativos de ${monthLabel(model.month)}`} data-lista="">
      <div className="cb-panel__toolbar">
        <b style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Demonstrativos de {monthLabel(model.month)}</b>
        <SearchBox model={model} onSearch={props.onSearch} />
        <span className="pat-os-count">
          {model.rows.length} de {model.monthRows.length}
        </span>
      </div>
      <FilterChip model={model} onClearTarget={props.onClearTarget} />
      <NotLoadedRows model={model} onRefresh={onRefresh} />
      {model.rows.length ? (
        <DenseTable
          columns={statementColumns(wide)}
          rows={model.rows}
          keyForRow={(row) => row.key}
          sort={null}
          onSort={() => undefined}
          expandedKey={model.ui.aberta}
          onRowClick={(row) => onToggleRow(row.key)}
          cellTitle={(row) => rowTitle(row)}
          renderDetail={(row) => <StatementDetail row={row} reading={details[row.statement.id]} access={access} onDialog={onDialog} onOpenOrg={onOpenOrg} onRetry={() => onRetryDetail(row)} />}
        />
      ) : (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">{model.monthRows.length ? "Nenhum demonstrativo neste filtro" : `Nenhum demonstrativo em ${monthLabel(model.month)}`}</div>
          <div className="pat-table__empty-detail">{model.monthRows.length ? "Tire o filtro acima ou troque o mês." : "Escolha outro mês no seletor acima."}</div>
        </div>
      )}
      <TotalsNote>Cada valor é o do demonstrativo, como o servidor manda.</TotalsNote>
    </section>
  );
}

/** "Lido às 10:31" para o aviso de desatualizado. */
export const readAtLabel = (iso: string | null) => (iso ? formatTime(iso) : "—");
