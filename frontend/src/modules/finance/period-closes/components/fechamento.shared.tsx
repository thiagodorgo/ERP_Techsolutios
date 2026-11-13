import { CheckCircle2, ClipboardList, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { DenseTable } from "../../../../components/dense-list";
import type { DenseColumn } from "../../../../components/dense-list/types";
import { PageHeader, StatusPill } from "../../../../components/patterns";
import { StaleDataBanner } from "../../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../../work-orders/components/StatePanel";
import type { CashFlowPoint } from "../../dashboard/financial-summary.types";
import { PERIOD_STATUS_LABELS, PERIOD_STATUS_TONES } from "../period-actions";
import type { PeriodAction, PeriodRow, PeriodStatus } from "../period-closes.types";
import { periodName } from "../period-keys";
import { closeTimeText, daysOpen, daysToClose, endedAndNotClosed, SLOW_CLOSE_DAYS } from "../period-rows";
import type { PeriodDetailState, PeriodsList } from "../usePeriods";

// B-SAN3-24 (24b) — peças das 3 aparências do Fechamento do mês (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`), no padrão `D-PADRAO-BLOCOS-CLICAVEIS` da tela-modelo
// `FinanceiroPage`. Só composição: as ações vêm de `periodActionsFor`, os números do servidor (retrato congelado e
// checklist ao vivo); nenhuma soma de dinheiro nasce aqui.

/** Os recortes da lista. `slow` = fechou mais de 5 dias depois do fim do mês; `month:AAAA-MM` = um mês aberto pelo gráfico. */
export type PeriodFilter = "all" | "closed" | "ended-open" | "reopened" | "slow" | `month:${string}`;

/** O mês focado pelo gráfico ou pela exceção (`month:AAAA-MM`), ou `null`. */
export function focusedMonth(filter: PeriodFilter): string | null {
  return filter.startsWith("month:") ? filter.slice("month:".length) : null;
}

export type FechamentoViewModel = {
  readonly list: PeriodsList;
  readonly details: Readonly<Record<string, PeriodDetailState>>;
  /** A competência que deveria ser fechada agora: a anterior, se não está fechada; senão a corrente. */
  readonly monthToClose: string;
  readonly filter: PeriodFilter;
  readonly onFilter: (next: PeriodFilter) => void;
  /** J-547 C3-10 — o gráfico e as exceções abrem o mês: a lista mostra só ele, com o detalhe aberto. */
  readonly onFocusMonth: (period: string) => void;
  /** J-547 C3-03 — entradas e saídas AO VIVO por competência (`summary.cashFlow`, 6 meses), para os meses não fechados. */
  readonly liveCashFlow: readonly CashFlowPoint[] | null;
  readonly liveLoading: boolean;
  readonly actionsFor: (period: { readonly status: PeriodStatus }) => readonly PeriodAction[];
  readonly onOpen: (period: string) => void;
  readonly onAction: (period: string, action: PeriodAction) => void;
  readonly onRetry: () => void;
  readonly message: { readonly tone: "error" | "info"; readonly text: string } | null;
  readonly onDismissMessage: () => void;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (value: number) => BRL.format(value);

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function rowMatches(row: PeriodRow, filter: PeriodFilter, currentKey: string): boolean {
  if (filter === "closed") return row.status === "closed";
  if (filter === "reopened") return row.status === "reopened";
  if (filter === "ended-open") return endedAndNotClosed(row, currentKey);
  if (filter === "slow") return row.status === "closed" && (daysToClose(row.period, row.closedAt) ?? 0) > SLOW_CLOSE_DAYS;
  const month = focusedMonth(filter);
  if (month) return row.period === month;
  return true;
}

export function countRows(list: PeriodsList, filter: PeriodFilter): number {
  return list.rows.filter((row) => rowMatches(row, filter, list.currentKey)).length;
}

export const FILTER_LABELS = {
  closed: "Fechados",
  "ended-open": "Terminaram e não estão fechados",
  reopened: "Reabertos",
} as const satisfies Readonly<Record<string, string>>;

export type BlockFilter = keyof typeof FILTER_LABELS;

/** O texto do filtro ativo, para a pílula acima da lista. */
export function filterChipLabel(filter: PeriodFilter): string | null {
  if (filter === "all") return null;
  if (filter === "slow") return `fecharam mais de ${SLOW_CLOSE_DAYS} dias depois do fim do mês`;
  const month = focusedMonth(filter);
  if (month) return periodName(month);
  return FILTER_LABELS[filter as BlockFilter].toLocaleLowerCase("pt-BR");
}

/** Um indicador em esqueleto (§7 "carregando"). */
export function KpiSkeleton() {
  return (
    <div className="pat-kpi" aria-hidden="true" data-state="loading">
      <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
      <div className="pat-skel" style={{ width: "70%", height: 22, marginTop: 12 }} />
      <div className="pat-skel" style={{ width: "50%", height: 10, marginTop: 8 }} />
    </div>
  );
}

/** Um bloco de esqueleto (gráfico, cartão), sem afirmar nada enquanto carrega. */
export function BlockSkeleton({ height }: { readonly height: number }) {
  return <span className="pat-skel" aria-hidden="true" data-state="loading" style={{ display: "block", width: "100%", height, borderRadius: 10 }} />;
}

export function PeriodStatusChip({ status }: { readonly status: PeriodStatus }) {
  const tone = PERIOD_STATUS_TONES[status];
  return <StatusPill sm label={PERIOD_STATUS_LABELS[status]} bg={tone.bg} fg={tone.fg} />;
}

export function FechamentoHeader() {
  return (
    <PageHeader
      kicker="FINANCEIRO"
      title="Fechamento do mês"
      subtitle="Feche cada competência quando o mês terminar: depois de fechado, nada mais é lançado nela. Só um administrador reabre."
      actions={
        <Link className="pat-btn" to="/finance">
          <Landmark size={15} aria-hidden="true" />
          Ir ao Financeiro
        </Link>
      }
    />
  );
}

export function FechamentoStates({ model }: { readonly model: FechamentoViewModel }) {
  return (
    <>
      {model.message ? (
        <div role={model.message.tone === "error" ? "alert" : "status"} className={model.message.tone === "error" ? "pat-banner pat-banner--error" : "pat-banner pat-banner--info"} style={{ marginBottom: 12 }}>
          <span>{model.message.text}</span>
          <button type="button" className="pat-link" onClick={model.onDismissMessage}>
            Fechar aviso
          </button>
        </div>
      ) : null}
      {model.list.stale ? <StaleDataBanner lastUpdatedAt={model.list.lastUpdatedAt} onRetry={model.onRetry} /> : null}
    </>
  );
}

/** Erro sem dado anterior ou acesso não permitido: a tela inteira vira o painel (estados §7). */
export function FechamentoBlocking({ model }: { readonly model: FechamentoViewModel }) {
  if (model.list.forbidden) {
    return <StatePanel tone="forbidden" title="Acesso não permitido" detail="Seu perfil não pode consultar o fechamento das competências. Fale com o administrador da sua organização." />;
  }
  return (
    <StatePanel
      tone="error"
      title="Não foi possível carregar as competências"
      detail="A consulta ao servidor falhou. Nada foi alterado. Tente de novo em instantes."
      actions={<StatePanelAction label="Tentar novamente" onClick={model.onRetry} />}
    />
  );
}

export function isBlocking(model: FechamentoViewModel): boolean {
  return model.list.forbidden || (model.list.failed && !model.list.stale);
}

/** Aviso do mês que terminou e não foi fechado, com o atalho para fechar (se o perfil pode). */
export function MonthToCloseBanner({ model }: { readonly model: FechamentoViewModel }) {
  const key = model.monthToClose;
  const row = model.list.rows.find((item) => item.period === key);
  if (!row || row.status === "closed" || key === model.list.currentKey) return null;
  const detail = model.details[key]?.detail;
  const disputes = detail?.checklist?.inDisputeTitles ?? null;
  const canClose = model.actionsFor(row).includes("close");
  return (
    <div role="status" className="pat-banner pat-banner--info" style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span>
        <b>{periodName(key)}</b>
        {` terminou e ainda está ${row.status === "reopened" ? "reaberto" : "aberto"}`}
        {disputes === null ? "." : disputes > 0 ? `: ${disputes} ${disputes === 1 ? "título em contestação impede" : "títulos em contestação impedem"} o fechamento.` : ": nada impede o fechamento."}
      </span>
      {canClose ? (
        <button type="button" className="pat-link" onClick={() => model.onAction(key, "close")}>
          {`Fechar ${periodName(key).toLocaleLowerCase("pt-BR")}`}
        </button>
      ) : null}
    </div>
  );
}

function Prop({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

function detailCloseTime(period: string, closedAt: string | null, status: PeriodStatus, currentKey: string): string {
  const days = daysToClose(period, closedAt);
  if (days !== null && (status === "closed" || status === "reopened")) return `${days} ${days === 1 ? "dia" : "dias"} depois do fim do mês`;
  if (period === currentKey) return "o mês ainda não terminou";
  if (period > currentKey) return "—";
  const open = daysOpen(period) ?? 0;
  return `ainda não fechado · ${open} ${open === 1 ? "dia" : "dias"} depois do fim do mês`;
}

/** O detalhe da competência: situação, retrato congelado, checklist ao vivo e as ações de `periodActionsFor`. */
export function PeriodDetailPanel({ model, row }: { readonly model: FechamentoViewModel; readonly row: PeriodRow }) {
  const state = model.details[row.period];
  const detail = state?.detail ?? null;
  const status = detail?.status ?? row.status;
  const actions = model.actionsFor({ status });
  const snapshot = detail?.snapshot ?? null;
  const checklist = detail?.checklist ?? null;
  return (
    <div className="pat-ab-detail-content" data-detalhe-de={row.period}>
      {state?.loading && !detail ? <p className="pat-cell-muted" style={{ margin: 0, fontSize: 12 }}>Carregando a competência…</p> : null}
      {state?.failed && !detail ? <p className="pat-banner pat-banner--error" style={{ margin: 0 }}>Não foi possível ler esta competência.</p> : null}
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          <Prop label="Situação">
            <PeriodStatusChip status={status} />
          </Prop>
          <Prop label="Fechado em">{formatDate(detail?.closedAt ?? row.closedAt)}</Prop>
          <Prop label="Tempo para fechar">{detailCloseTime(row.period, detail?.closedAt ?? row.closedAt, status, model.list.currentKey)}</Prop>
          {status === "reopened" ? <Prop label="Reaberto em">{formatDate(detail?.reopenedAt ?? row.reopenedAt)}</Prop> : null}
          {status === "reopened" && detail?.reopenReason ? <Prop label="Motivo da reabertura">{detail.reopenReason}</Prop> : null}
          {detail && detail.closeCount > 1 ? <Prop label="Fechamentos">{`${detail.closeCount} vezes`}</Prop> : null}
          {snapshot?.forced ? <Prop label="Fechado mesmo assim">{snapshot.forcedReason ?? "motivo não registrado"}</Prop> : null}
        </div>
        <div className="pat-ab-detail-col">
          {snapshot ? (
            <>
              <Prop label="Entradas no fechamento">{`${formatBRL(snapshot.entriesIn.sumAmount)} (${snapshot.entriesIn.count})`}</Prop>
              <Prop label="Saídas no fechamento">{`${formatBRL(snapshot.entriesOut.sumAmount)} (${snapshot.entriesOut.count})`}</Prop>
              <Prop label="Resultado">{formatBRL(snapshot.net)}</Prop>
              <Prop label="Títulos">{`${snapshot.receivable.count} a receber · ${snapshot.payable.count} a pagar`}</Prop>
            </>
          ) : (
            <Prop label="Retrato">{status === "closed" ? "—" : "sem fechamento ainda"}</Prop>
          )}
        </div>
      </div>
      {checklist ? (
        <ul aria-label="Pendências agora" style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 12.5 }}>
          <li style={{ color: checklist.inDisputeTitles > 0 ? "#B91C1C" : "#047857", fontWeight: 700 }}>
            {checklist.inDisputeTitles > 0 ? `${checklist.inDisputeTitles} em contestação — impede` : "Nenhum título em contestação — nada impede"}
          </li>
          <li style={{ color: "#475569" }}>
            <ClipboardList size={12} aria-hidden="true" /> {`${checklist.unpaidTitles} títulos não liquidados — não impede`}
          </li>
          <li style={{ color: "#475569" }}>
            <CheckCircle2 size={12} aria-hidden="true" /> {`${checklist.unreconciledEntries} lançamentos a conciliar — não impede`}
          </li>
        </ul>
      ) : null}
      {status === "closing" ? <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#B45309", fontWeight: 700 }}>Fechamento em andamento.</p> : null}
      {actions.length > 0 ? (
        <div className="pat-ab-detail-actions">
          {actions.map((action) => (
            <button key={action} type="button" className="pat-btn pat-btn--primary" onClick={() => model.onAction(row.period, action)}>
              {action === "close" ? `Fechar ${periodName(row.period).toLocaleLowerCase("pt-BR")}` : `Reabrir ${periodName(row.period).toLocaleLowerCase("pt-BR")}`}
            </button>
          ))}
        </div>
      ) : status !== "closing" ? (
        <p className="pat-cell-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          {status === "closed" ? "Só um administrador reabre." : "Seu perfil só consulta esta competência."}
        </p>
      ) : null}
    </div>
  );
}

export function PeriodsTable({
  model,
  rows,
  openKey,
  onToggle,
}: {
  readonly model: FechamentoViewModel;
  readonly rows: readonly PeriodRow[];
  readonly openKey: string | null;
  readonly onToggle: (row: PeriodRow) => void;
}) {
  const columns: DenseColumn<PeriodRow>[] = [
    {
      key: "period",
      header: "COMPETÊNCIA",
      width: "20%",
      render: (row) => (
        <>
          <b>{periodName(row.period)}</b>
          {row.period === model.list.currentKey ? <span className="pat-cell-muted" style={{ fontSize: 11 }}>{" · corrente"}</span> : null}
        </>
      ),
    },
    { key: "status", header: "SITUAÇÃO", width: "15%", render: (row) => <PeriodStatusChip status={row.status} /> },
    { key: "closed", header: "FECHADO EM", width: "13%", render: (row) => (row.status === "closed" ? formatDate(row.closedAt) : "—") },
    {
      // J-547 C3-01 — o tempo para fechar (`closedAt` menos o fim da competência), nas 3 aparências.
      key: "close-time",
      header: "TEMPO PARA FECHAR",
      width: "15%",
      render: (row) => {
        const time = closeTimeText(row, model.list.currentKey);
        if (time.tone === "done") return <b>{time.text}</b>;
        if (time.tone === "slow")
          return (
            <>
              <b>{time.text}</b> <span style={{ fontSize: 10.5, fontWeight: 800, color: "#B45309" }}>lento</span>
            </>
          );
        if (time.tone === "late") return <span style={{ color: "#B91C1C", fontWeight: 700 }}>{time.text}</span>;
        return <span className="pat-cell-muted">{time.text}</span>;
      },
    },
    { key: "reopened", header: "REABERTO EM", width: "13%", render: (row) => (row.status === "reopened" ? formatDate(row.reopenedAt) : "—") },
    {
      key: "pending",
      header: "PENDÊNCIAS AGORA",
      render: (row) => {
        const checklist = model.details[row.period]?.detail?.checklist;
        if (row.status === "closed") return <span className="pat-cell-muted">mês fechado</span>;
        if (!checklist) return <span className="pat-cell-muted">abrir para ver</span>;
        return checklist.inDisputeTitles > 0 ? (
          <b style={{ color: "#B91C1C" }}>{`${checklist.inDisputeTitles} impede`}</b>
        ) : (
          <b style={{ color: "#047857" }}>nada impede</b>
        );
      },
    },
  ];
  return (
    <DenseTable
      columns={columns}
      rows={rows}
      keyForRow={(row) => row.period}
      sort={null}
      onSort={() => undefined}
      onRowClick={onToggle}
      expandedKey={openKey}
      renderDetail={(row) => <PeriodDetailPanel model={model} row={row} />}
      cellTitle={(row, key) => (key === "period" ? periodName(row.period) : undefined)}
    />
  );
}

/**
 * Os blocos por situação. J-547 C3-11: o bloco da biblioteca (`financeiro-bc__block`, 36 px com borda, foco e
 * pressionado do sistema), como a `conc-chip` da referência. J-547 C3-07: esqueleto enquanto a lista carrega.
 */
export function FilterBlocks({ model, framed = false }: { readonly model: FechamentoViewModel; readonly framed?: boolean }) {
  return (
    <div className="financeiro-bc__blocks" role="group" aria-label="Situação da competência" style={framed ? undefined : { padding: 0, borderBottom: 0 }}>
      {(Object.keys(FILTER_LABELS) as BlockFilter[]).map((filter) => {
        const pressed = model.filter === filter;
        const count = model.list.loading ? null : countRows(model.list, filter);
        return (
          <button
            key={filter}
            type="button"
            className="financeiro-bc__block"
            aria-pressed={pressed}
            aria-label={`${FILTER_LABELS[filter]}: ${count ?? "carregando"} — filtrar a lista`}
            onClick={() => model.onFilter(pressed ? "all" : filter)}
          >
            {FILTER_LABELS[filter]}
            {count !== null ? <b>{count}</b> : <span className="pat-skel" aria-hidden="true" data-state="loading" style={{ display: "inline-block", width: 16, height: 11 }} />}
          </button>
        );
      })}
    </div>
  );
}

/** A pílula do filtro ativo, acima da lista, que sai com um clique. */
export function FilterChip({ model }: { readonly model: FechamentoViewModel }) {
  const label = filterChipLabel(model.filter);
  if (!label) return null;
  return (
    <div className="pat-filtro-chip-bar" style={{ padding: "10px 18px 0" }}>
      <span className="pat-filtro-chip">
        {`Filtro: ${label}`}
        <button type="button" onClick={() => model.onFilter("all")} aria-label="Limpar o filtro da lista">
          ✕
        </button>
      </span>
    </div>
  );
}

export function PeriodsListState({ model, children }: { readonly model: FechamentoViewModel; readonly children: ReactNode }) {
  if (model.list.loading) {
    return (
      <div aria-busy="true" aria-label="Carregando">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} style={{ display: "flex", gap: 14, padding: "12px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <span className="pat-skel" style={{ width: "24%", height: 12 }} />
            <span className="pat-skel" style={{ width: "16%", height: 12 }} />
            <span className="pat-skel" style={{ width: "16%", height: 12 }} />
          </div>
        ))}
      </div>
    );
  }
  return <>{children}</>;
}
