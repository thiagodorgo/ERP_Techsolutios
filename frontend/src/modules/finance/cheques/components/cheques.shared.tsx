import { ArrowDownRight, ArrowUpRight, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { DenseTable } from "../../../../components/dense-list";
import type { DenseColumn } from "../../../../components/dense-list/types";
import { StatusPill, TablePager } from "../../../../components/patterns";
import type { FinancialAccount } from "../../accounts/financial-accounts.types";
import type { FinancialSummary } from "../../dashboard/financial-summary.types";
import { CHEQUE_ACTION_LABELS, CHEQUE_STATUS_LABELS, CHEQUE_STATUS_TONES, directionLabel } from "../cheque-actions";
import { formatMoney } from "../cheque-cash-impact";
import type { Cheque, ChequeAction, ChequeStatus } from "../cheques.types";
import type { AccountPendingCounts, ChequeCounts, ChequeList, ChequeListFilter } from "../useCheques";

// B-SAN3-24 (24a) — peças das 3 aparências da tela de Cheques (referência aprovada `screen-refs/cheques-3opcoes`), no
// padrão `D-PADRAO-BLOCOS-CLICAVEIS` da tela-modelo `FinanceiroPage`: blocos que filtram a lista, linha de UMA altura sem
// botão, clique na linha abre o detalhe logo abaixo (um por vez) com as propriedades e as ações. Só composição: nenhuma
// consulta, nenhuma regra de permissão e nenhuma soma de dinheiro nascem aqui (as ações vêm de `chequeActionsFor`, o
// sentido do caixa de `cashImpactFor`, os valores do servidor).

export type ChequeTitleInfo = { readonly document: string | null; readonly partyName: string; readonly amount: number; readonly paidAmount: number; readonly status: string };

export type ChequeDetailState = {
  readonly loading: boolean;
  /** O cheque relido do detalhe (`GET /cheques/:id`, que traz o motivo da devolução). */
  readonly cheque: Cheque | null;
  readonly title: ChequeTitleInfo | null;
  readonly failed: boolean;
};

export type ChequesViewModel = {
  readonly summary: FinancialSummary["cheques"] | null;
  readonly summaryLoading: boolean;
  /** J-547 C3-08 — o resumo da releitura falhou e a tela mostra o último resumo bom (com a faixa de desatualizado). */
  readonly summaryStale: boolean;
  readonly list: ChequeList;
  readonly filter: ChequeListFilter;
  readonly onFilter: (next: ChequeListFilter) => void;
  readonly page: { readonly offset: number; readonly limit: number };
  readonly onPage: (offset: number) => void;
  readonly counts: ChequeCounts;
  /** J-547 C3-07 — as contagens por situação ainda não voltaram do servidor (esqueleto, nunca "indisponível"). */
  readonly countsLoading: boolean;
  readonly accounts: readonly FinancialAccount[];
  /** J-547 C3-05 — as contas ainda estão carregando: o nome da conta é um marcador, nunca "Conta não listada". */
  readonly accountsLoading: boolean;
  readonly accountCounts: AccountPendingCounts;
  /** Aparência C: os pendentes (registrados + depositados), para a agenda e a mesa de hoje. */
  readonly pending: ChequeList | null;
  readonly canRegister: boolean;
  readonly actionsFor: (cheque: Cheque) => readonly ChequeAction[];
  readonly details: Readonly<Record<string, ChequeDetailState>>;
  readonly onOpen: (cheque: Cheque) => void;
  readonly onAction: (cheque: Cheque, action: ChequeAction) => void;
  readonly onRegister: () => void;
  readonly onRetry: () => void;
  readonly message: { readonly tone: "error" | "info"; readonly text: string } | null;
  readonly onDismissMessage: () => void;
};

/**
 * O nome da conta do cheque. J-547 C3-05: enquanto as contas carregam, devolve `null` (a tela mostra um marcador de
 * carregando e a confirmação diz "na conta do cheque"); "Conta não listada" só depois de carregar, quando a conta de
 * fato não está na lista.
 */
export function accountNameOf(accounts: readonly FinancialAccount[], id: string, loading = false): string | null {
  const found = accounts.find((account) => account.id === id)?.name;
  if (found) return found;
  return loading ? null : "Conta não listada";
}

/** O nome da conta, ou o marcador de carregando (esqueleto com rótulo acessível). */
export function AccountName({ accounts, id, loading }: { readonly accounts: readonly FinancialAccount[]; readonly id: string; readonly loading: boolean }) {
  const name = accountNameOf(accounts, id, loading);
  if (name !== null) return <>{name}</>;
  return <span className="pat-skel" role="status" aria-label="Carregando a conta" data-state="loading" style={{ display: "inline-block", width: 96, height: 11, verticalAlign: "middle" }} />;
}

/** `AAAA-MM-DD` → dias até hoje (data de calendário de São Paulo); negativo = já passou. */
export function daysUntilDue(dueDate: string | null, today: Date = new Date()): number | null {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(today);
  const due = Date.UTC(Number(dueDate.slice(0, 4)), Number(dueDate.slice(5, 7)) - 1, Number(dueDate.slice(8, 10)));
  const now = Date.UTC(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)) - 1, Number(todayKey.slice(8, 10)));
  return Math.round((due - now) / 86_400_000);
}

export function formatDay(dueDate: string | null): string {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "—";
  return `${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)}`;
}

function dueTag(cheque: Cheque): { readonly text: string; readonly color: string } | null {
  if (cheque.status !== "registered") return null;
  const days = daysUntilDue(cheque.dueDate);
  if (days === null) return null;
  if (days < 0) return { text: `passou · ${-days} d`, color: "#B91C1C" };
  if (days === 0) return { text: "hoje", color: "#B45309" };
  return { text: `em ${days} d`, color: "#334155" };
}

export function StatusChip({ status }: { readonly status: ChequeStatus }) {
  const tone = CHEQUE_STATUS_TONES[status];
  return <StatusPill sm label={CHEQUE_STATUS_LABELS[status]} bg={tone.bg} fg={tone.fg} />;
}

export function DirectionIcon({ cheque }: { readonly cheque: Cheque }) {
  const incoming = cheque.direction === "received";
  const Icon = incoming ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={incoming ? "financeiro-bc__dir financeiro-bc__dir--in" : "financeiro-bc__dir financeiro-bc__dir--out"} title={directionLabel(cheque.direction)}>
      <Icon size={13} aria-label={directionLabel(cheque.direction)} />
    </span>
  );
}

/** A lista de uma linha por cheque; clicar (ou Enter/Espaço) abre o detalhe logo abaixo. */
export function ChequesTable({
  rows,
  accounts,
  accountsLoading = false,
  openKey,
  onToggle,
  renderDetail,
  withDirection,
}: {
  readonly rows: readonly Cheque[];
  readonly accounts: readonly FinancialAccount[];
  readonly accountsLoading?: boolean;
  readonly openKey: string | null;
  readonly onToggle: (cheque: Cheque) => void;
  readonly renderDetail: (cheque: Cheque) => ReactNode;
  readonly withDirection: boolean;
}) {
  const columns: DenseColumn<Cheque>[] = [
    {
      key: "number",
      header: "Nº · BANCO",
      width: "20%",
      render: (c) => (
        <>
          {withDirection ? <DirectionIcon cheque={c} /> : null}
          <b style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{c.chequeNumber}</b>{" "}
          <span className="pat-cell-muted" style={{ fontSize: 11 }}>
            {c.bank}
          </span>
        </>
      ),
    },
    {
      key: "title",
      header: "TÍTULO",
      render: (c) =>
        c.titleId ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#1D4ED8" }}>
            <Link2 size={13} aria-hidden="true" />
            Vinculado a título
          </span>
        ) : (
          <span className="pat-cell-muted">Sem título</span>
        ),
    },
    {
      key: "due",
      header: "BOM PARA",
      width: "14%",
      render: (c) => {
        const tag = dueTag(c);
        return (
          <>
            {formatDay(c.dueDate)}
            {tag ? <span style={{ fontSize: 10.5, fontWeight: 800, color: tag.color, marginLeft: 6 }}>{tag.text}</span> : null}
          </>
        );
      },
    },
    { key: "account", header: "CONTA", width: "16%", render: (c) => <AccountName accounts={accounts} id={c.accountId} loading={accountsLoading} /> },
    {
      key: "amount",
      header: "VALOR",
      width: "13%",
      align: "right",
      tabular: true,
      render: (c) => <b style={{ color: c.direction === "received" ? "#059669" : "#B91C1C" }}>{formatMoney(c.amount)}</b>,
    },
    { key: "status", header: "SITUAÇÃO", width: "13%", render: (c) => <StatusChip status={c.status} /> },
  ];
  return (
    <DenseTable
      columns={columns}
      rows={rows}
      keyForRow={(c) => c.id}
      sort={null}
      onSort={() => undefined}
      onRowClick={onToggle}
      expandedKey={openKey}
      renderDetail={renderDetail}
      cellTitle={(c, key) => (key === "account" ? (accountNameOf(accounts, c.accountId, accountsLoading) ?? undefined) : key === "number" ? `${c.chequeNumber} · ${c.bank}` : undefined)}
    />
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

const ACTION_ORDER: readonly ChequeAction[] = ["deposit", "clear", "bounce", "edit", "cancel", "delete"];

/** O detalhe do cheque: propriedades, o aviso do vínculo e as ações que o servidor aceita (`chequeActionsFor`). */
export function ChequeDetail({ model, cheque }: { readonly model: ChequesViewModel; readonly cheque: Cheque }) {
  const state = model.details[cheque.id];
  const fresh = state?.cheque ?? cheque;
  const title = state?.title ?? null;
  const actions = model.actionsFor(fresh);
  const tab = fresh.direction === "received" ? "rec" : "pag";
  return (
    <div className="pat-ab-detail-content" data-detalhe-de={cheque.id}>
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          <Prop label="Cheque">{`${fresh.chequeNumber} · ${fresh.bank}`}</Prop>
          <Prop label="Direção">{directionLabel(fresh.direction)}</Prop>
          <Prop label="Valor">{formatMoney(fresh.amount)}</Prop>
          <Prop label="Conta">
            <AccountName accounts={model.accounts} id={fresh.accountId} loading={model.accountsLoading} />
          </Prop>
          <Prop label="Bom para">{fresh.dueDate ? formatDay(fresh.dueDate) : "sem data"}</Prop>
        </div>
        <div className="pat-ab-detail-col">
          <Prop label="Situação">
            <StatusChip status={fresh.status} />
          </Prop>
          <Prop label="Título">
            {fresh.titleId ? (title ? `${title.document ?? "sem documento"} · ${title.partyName}` : state?.loading ? "carregando…" : "vinculado") : "sem título"}
          </Prop>
          {fresh.status === "bounced" ? <Prop label="Motivo da devolução">{fresh.bounceReason ?? (state?.loading ? "carregando…" : "não informado")}</Prop> : null}
          <Prop label="Observações">{fresh.notes ?? "—"}</Prop>
        </div>
      </div>
      {fresh.titleId && (fresh.status === "registered" || fresh.status === "deposited") ? (
        <p className="pat-ab-detail-note" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#1E3A8A", margin: "8px 0 0" }}>
          <Link2 size={13} aria-hidden="true" />
          <span>
            {`Vinculado ao título ${title?.document ?? ""}`.trim()}. Para cancelar, um administrador desvincula no título, no{" "}
            <Link className="pat-link" to={`/finance?aba=${tab}`}>
              Financeiro
            </Link>
            .
          </span>
        </p>
      ) : null}
      {actions.length > 0 ? (
        <div className="pat-ab-detail-actions">
          {ACTION_ORDER.filter((action) => actions.includes(action)).map((action) => (
            <button
              key={action}
              type="button"
              className={action === "clear" || (action === "deposit" && !actions.includes("clear")) ? "pat-btn pat-btn--primary" : "pat-btn"}
              onClick={() => model.onAction(fresh, action)}
            >
              {CHEQUE_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      ) : (
        <p className="pat-cell-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          {fresh.status === "bounced" || fresh.status === "cancelled" ? "Cheque encerrado: nenhuma ação." : "Seu perfil só consulta este cheque."}
        </p>
      )}
    </div>
  );
}

/** Paginação do SERVIDOR (offset/limit ≤ 100), com a biblioteca (`TablePager`). */
export function ServerPager({ model, shown }: { readonly model: ChequesViewModel; readonly shown: number }) {
  const total = model.list.total ?? shown;
  const start = total === 0 ? 0 : model.page.offset + 1;
  const end = model.page.offset + shown;
  return (
    <TablePager
      pageSize={model.page.limit}
      onPageSize={() => model.onPage(0)}
      pageSizeOptions={[model.page.limit]}
      rangeLabel={`${start}–${end} de ${total} cheques`}
      onPrev={() => model.onPage(Math.max(0, model.page.offset - model.page.limit))}
      onNext={() => model.onPage(model.page.offset + model.page.limit)}
      canPrev={model.page.offset > 0}
      canNext={end < total}
    />
  );
}

/** O que a lista mostra quando o filtro é "pendentes" (duas consultas) ou "vinculados" (sobre os carregados). */
export function PendingCaption({ list, filter }: { readonly list: ChequeList; readonly filter: ChequeListFilter }) {
  if (filter.status !== "pending" || !list.pendingTotals) return null;
  return (
    <p className="financeiro-bc__note" style={{ margin: "8px 18px 0", fontSize: 12, color: "#475569" }}>
      {`Pendentes: ${list.pendingTotals.registered} registrados e ${list.pendingTotals.deposited} depositados.`}
      {filter.link === "linked" ? " Mostrando só os vinculados a título entre eles." : filter.link === "unlinked" ? " Mostrando só os sem título entre eles." : ""}
      {list.complete ? "" : " A lista mostra os 100 primeiros de cada situação."}
    </p>
  );
}

export function filterLabel(filter: ChequeListFilter): string | null {
  const parts: string[] = [];
  if (filter.direction) parts.push(directionLabel(filter.direction).toLocaleLowerCase("pt-BR"));
  if (filter.status === "pending") parts.push(filter.link === "linked" ? "pendentes vinculados a título" : filter.link === "unlinked" ? "pendentes sem título" : "pendentes");
  else if (filter.status) parts.push(CHEQUE_STATUS_LABELS[filter.status].toLocaleLowerCase("pt-BR"));
  else if (filter.link === "linked") parts.push("vinculados a título");
  else if (filter.link === "unlinked") parts.push("sem título");
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Um indicador em esqueleto (§7 "carregando"): nenhum número nem frase de fato enquanto o servidor não respondeu. */
export function KpiSkeleton() {
  return (
    <div className="pat-kpi" aria-hidden="true" data-state="loading">
      <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
      <div className="pat-skel" style={{ width: "70%", height: 22, marginTop: 12 }} />
      <div className="pat-skel" style={{ width: "50%", height: 10, marginTop: 8 }} />
    </div>
  );
}

/** Uma contagem em esqueleto, para blocos e cabeçalhos de lista. */
export function CountSkeleton({ width = 18 }: { readonly width?: number }) {
  return <span className="pat-skel" aria-hidden="true" data-state="loading" style={{ display: "inline-block", width, height: 11, verticalAlign: "middle" }} />;
}

export function ListStates({ model, children, emptyText }: { readonly model: ChequesViewModel; readonly children: ReactNode; readonly emptyText: string }) {
  const { list } = model;
  if (list.loading) {
    return (
      <div aria-busy="true" aria-label="Carregando">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} style={{ display: "flex", gap: 14, padding: "12px 18px", borderBottom: "1px solid #F1F5F9" }}>
            {Array.from({ length: 6 }).map((__, col) => (
              <span key={col} className="pat-skel" style={{ width: col === 1 ? "30%" : "12%", height: 12 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (list.items.length === 0) {
    return (
      <p data-state="empty" style={{ padding: "28px 18px", textAlign: "center", color: "#64748B", fontSize: 13, margin: 0 }}>
        {emptyText}
      </p>
    );
  }
  return <>{children}</>;
}
