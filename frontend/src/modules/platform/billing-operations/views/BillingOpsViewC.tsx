import { AlertTriangle, CheckCircle2, Clock, UserX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DenseTable, type DenseColumn } from "../../../../components/dense-list";
import { StatusPill } from "../../../../components/patterns";
import { capitalize, monthLabel, monthShort } from "../billing-ops.labels";
import { formatBRL, hasValue } from "../billing-ops.money";
import { FILTERS, type Row } from "../billing-ops.state";
import {
  BillingOpsBanners,
  BillingOpsHeader,
  BucketLegend,
  Card,
  ChargeCell,
  FilterChip,
  InvoiceCell,
  MonthsChart,
  NotLoadedRows,
  rowTitle,
  SearchBox,
  StatementDetail,
  StatementPill,
  TotalsNote,
  type BillingOpsViewProps,
} from "./billingOps.shared";

// B-ASS-10c-OPERACAO — aparência C · Por organização (a maquete aprovada, `viewC`): a rotina do mês (cada passo filtra a
// lista) ao lado dos demonstrativos por mês; depois, uma linha por organização com o demonstrativo do mês escolhido e os
// meses com saldo em aberto; o detalhe traz os meses da organização e o demonstrativo.

function Step({ target, ok, title, sub, right, pressed, onTarget }: { readonly target: string; readonly ok: boolean; readonly title: string; readonly sub: string; readonly right: ReactNode; readonly pressed: boolean; readonly onTarget: (key: string) => void }) {
  const Icon: LucideIcon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <button type="button" className="cb-check" data-alvo={target} aria-pressed={pressed} onClick={() => onTarget(target)}>
      <span className={`cb-check__icon cb-check__icon--${ok ? "ok" : "atencao"}`} aria-hidden="true">
        <Icon size={15} />
      </span>
      <span className="cb-check__text">
        {title}
        <small>{sub}</small>
      </span>
      <span className="cb-check__count">{right}</span>
    </button>
  );
}

function orgColumns(): DenseColumn<Row>[] {
  return [
    {
      key: "org",
      header: "Organização",
      render: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.org.name}</b>
          {row.review.length + row.failed.length > 0 ? <AlertTriangle size={12} color="#b45309" aria-label="Fila de envio pede ação" /> : null}
        </span>
      ),
    },
    {
      key: "perfil",
      header: "Perfil",
      width: 116,
      render: (row) =>
        row.profile === null ? (
          <span style={{ color: "#94a3b8" }}>—</span>
        ) : row.profile.complete ? (
          <StatusPill sm label="Completo" bg="#ECFDF5" fg="#047857" dot="#047857" />
        ) : (
          <StatusPill sm label={`Faltam ${row.profile.missing.length}`} bg="#FFFBEB" fg="#B45309" icon={<UserX size={11} />} />
        ),
    },
    { key: "situacao", header: "Situação", width: 128, render: (row) => <StatementPill row={row} /> },
    { key: "cobranca", header: "Cobrança", width: 176, render: (row) => <ChargeCell row={row} /> },
    { key: "nota", header: "Nota", width: 146, render: (row) => <InvoiceCell row={row} /> },
    {
      key: "saldo",
      header: "Saldo",
      width: 108,
      align: "right",
      tabular: true,
      render: (row) => (
        <span className="pat-mono" style={{ fontWeight: 700, color: hasValue(row.statement.balance) ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap" }}>
          {formatBRL(row.statement.balance)}
        </span>
      ),
    },
    {
      key: "meses",
      header: "Meses abertos",
      width: 118,
      align: "right",
      tabular: true,
      render: (row) => (
        <b className="pat-mono" style={{ color: row.openMonths ? "#b45309" : "#94a3b8" }}>
          {row.openMonths}
        </b>
      ),
    },
  ];
}

const MONTH_STATE = (row: Row) =>
  row.statement.status === "open" || row.statement.status === "reopened"
    ? "em aberto"
    : row.statement.status === "paid"
      ? "pago"
      : row.statement.status === "cancelled"
        ? "cancelado"
        : row.partiallyPaid
          ? "pago em parte"
          : "fechado";

function OrgMonths({ row, model }: { readonly row: Row; readonly model: BillingOpsViewProps["model"] }) {
  const months = model.allRows.filter((item) => item.org.id === row.org.id && model.months.some((bar) => bar.month === item.statement.period)).sort((a, b) => a.statement.period.localeCompare(b.statement.period));
  return (
    <div className="pat-ab-detail-actions" style={{ flexWrap: "wrap" }} data-meses-org="">
      <span className="pat-ab-detail-label">Meses de {row.org.name}</span>
      {months.map((item) => {
        const current = item.statement.period === model.month;
        const Icon = item.statement.status === "paid" ? CheckCircle2 : item.statement.status === "open" || item.statement.status === "reopened" ? Clock : AlertTriangle;
        return (
          <span key={item.key} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: current ? 800 : 600, padding: "3px 8px", borderRadius: 99, background: current ? "#eff6ff" : "#f8fafc", color: current ? "#1d4ed8" : "#475569", border: "1px solid #e2e8f0" }}>
            <Icon size={11} aria-hidden="true" />
            {capitalize(monthShort(item.statement.period))} · {MONTH_STATE(item)}
          </span>
        );
      })}
    </div>
  );
}

export function BillingOpsViewC(props: BillingOpsViewProps) {
  const { model, access, details, onTarget, onMonth, onRefresh, onToggleRow, onDialog, onOpenOrg, onRetryDetail, channelPanel } = props;
  const rows = model.monthRows;
  const value = (text: string) => (model.partial ? "—" : text);
  const closed = rows.filter((row) => row.statement.status !== "open" && row.statement.status !== "reopened").length;
  const profileMissing = rows.filter(FILTERS.perfil).length;
  const toCharge = rows.filter(FILTERS.acobrar).length;
  const charged = rows.filter(FILTERS.emitidas).length;
  const overdue = rows.filter(FILTERS.atraso).length;
  const queue = rows.reduce((acc, row) => acc + row.review.length + row.failed.length, 0);
  const notes = rows.filter(FILTERS.notas).length;
  const liveOnUnpaid = rows.filter((row) => row.backlog === "live_on_unpaid").length;
  const alvo = model.ui.alvo;
  return (
    <div className="cb-view" data-aparencia="C">
      <BillingOpsHeader model={model} onMonth={onMonth} onRefresh={onRefresh} />
      <BillingOpsBanners model={model} onRefresh={onRefresh} onTarget={onTarget} />
      <div className="cb-charts-a" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <Card title={`Rotina de ${monthLabel(model.month)}`} hint="Cada passo filtra a lista de organizações">
          <div className="cb-checks">
            <Step target="todos" ok={rows.length > 0 && closed === rows.length} title="Demonstrativos fechados" sub={model.month === model.currentMonth ? "o mês ainda está em aberto" : "fechamento do mês"} right={value(`${closed} de ${rows.length}`)} pressed={alvo === null} onTarget={onTarget} />
            <Step target="perfil" ok={profileMissing === 0} title="Perfis de cobrança completos" sub={profileMissing ? "sem perfil a cobrança não sai" : "todas podem ser cobradas"} right={value(`${rows.length - profileMissing} de ${rows.length}`)} pressed={alvo === "perfil"} onTarget={onTarget} />
            <Step target="acobrar" ok={toCharge === 0} title="Cobranças emitidas" sub={`falta emitir: ${value(String(toCharge))}`} right={<em style={{ fontStyle: "normal" }}>{value(String(charged))} aguardando</em>} pressed={alvo === "acobrar"} onTarget={onTarget} />
            <Step target="atraso" ok={overdue === 0} title="Pagamentos em dia" sub={overdue ? "vencimento passou, com saldo" : "nenhum em atraso"} right={`${value(String(overdue))} em atraso`} pressed={alvo === "atraso"} onTarget={onTarget} />
            <Step target="fila" ok={queue === 0} title="Fila de envio sem pendência" sub="em revisão ou com falha" right={`${value(String(queue))} ${queue === 1 ? "linha" : "linhas"}`} pressed={alvo === "fila"} onTarget={onTarget} />
            <Step target="notas" ok={notes === 0} title="Notas emitidas" sub={liveOnUnpaid ? `${liveOnUnpaid} ${liveOnUnpaid === 1 ? "emitida" : "emitidas"} sem pagamento` : "a emitir, na fila ou com falha"} right={`${value(String(notes))} pendentes`} pressed={alvo === "notas"} onTarget={onTarget} />
            <Step target="canal" ok={model.channel.state === "ok" && model.channel.on} title="Canal de cobrança" sub={model.channel.hint} right={model.channel.value} pressed={model.ui.canal} onTarget={onTarget} />
          </div>
        </Card>
        <Card title="Demonstrativos por mês" hint="Quantidade por situação · clique num mês">
          <MonthsChart model={model} onMonth={onMonth} height={190} />
          <BucketLegend model={model} onTarget={onTarget} />
        </Card>
      </div>
      {model.ui.canal ? channelPanel : null}
      <section className="cb-panel" aria-label={`Organizações · ${monthLabel(model.month)}`} data-lista="">
        <div className="cb-panel__toolbar">
          <b style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Organizações · {monthLabel(model.month)}</b>
          <SearchBox model={model} onSearch={props.onSearch} />
          <span className="pat-os-count">
            {model.rows.length} de {model.monthRows.length}
          </span>
        </div>
        <FilterChip model={model} onClearTarget={props.onClearTarget} />
        <NotLoadedRows model={model} onRefresh={onRefresh} />
        {model.rows.length ? (
          <DenseTable
            columns={orgColumns()}
            rows={model.rows}
            keyForRow={(row) => row.key}
            sort={null}
            onSort={() => undefined}
            expandedKey={model.ui.aberta}
            onRowClick={(row) => onToggleRow(row.key)}
            cellTitle={(row) => rowTitle(row)}
            renderDetail={(row) => (
              <div>
                <OrgMonths row={row} model={model} />
                <StatementDetail row={row} reading={details[row.statement.id]} access={access} onDialog={onDialog} onOpenOrg={onOpenOrg} onRetry={() => onRetryDetail(row)} />
              </div>
            )}
          />
        ) : (
          <div className="pat-table__empty">
            <div className="pat-table__empty-title">{model.monthRows.length ? "Nenhuma organização neste filtro" : `Nenhum demonstrativo em ${monthLabel(model.month)}`}</div>
            <div className="pat-table__empty-detail">{model.monthRows.length ? "Tire o filtro acima ou troque o mês." : "Escolha outro mês no seletor acima."}</div>
          </div>
        )}
        <TotalsNote>Uma linha por organização, com o demonstrativo do mês escolhido.</TotalsNote>
      </section>
    </div>
  );
}
