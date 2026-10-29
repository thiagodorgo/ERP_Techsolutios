import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Modal } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../appearance";
import { NovaContaModal } from "../accounts/components/NovaContaModal";
import { useFinancialAccounts } from "../accounts/useFinancialAccounts";
import { useFinancialSummary } from "../dashboard/useFinancialSummary";
import { BaixaForm } from "../entries/components/BaixaForm";
import { ConciliarForm } from "../entries/components/ConciliarForm";
import { financeErrorMessage, financeErrorReason } from "../entries/finance-errors";
import type { EntriesAggregateQuery, FinancialEntry } from "../entries/financial-entries.types";
import { useEntriesAggregate } from "../entries/useEntriesAggregate";
import { reconcilePayloadFor, useFinanceActions } from "../entries/useFinanceActions";
import { useFinancialEntries } from "../entries/useFinancialEntries";
import { useReconciliationPolicy } from "../entries/useReconciliationPolicy";
import type { FinancialTitle } from "../titles/financial-titles.types";
import { useFinancialTitles } from "../titles/useFinancialTitles";
import { entriesFiltersFor, financeStateSearch, readFinanceState, sixMonthRange, useLastGood, type FinanceState } from "./financeiro.state";
import { AGGREGATE_KEYS, FinanceiroViewA, type FinanceiroViewModel } from "./views/FinanceiroViewA";

const SITUATION_QUERIES: Readonly<Record<string, EntriesAggregateQuery>> = {
  [AGGREGATE_KEYS.pending]: { groupBy: "none", reconciled: false },
  [AGGREGATE_KEYS.reconciled]: { groupBy: "none", reconciled: true },
  [AGGREGATE_KEYS.value]: { groupBy: "none", reconciled: true, divergenceType: "value" },
  [AGGREGATE_KEYS.date]: { groupBy: "none", reconciled: true, divergenceType: "date" },
};

// B-SAN3-12b — o Financeiro em `/finance`: BAIXA do título, CONTAS com extrato e saldo, e CONCILIAÇÃO (plano B-SAN3-12,
// referência aprovada `screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html`). Esta página é o
// CONTÊINER das aparências (D-APARENCIA-POR-USUARIO; `useScreenAppearance("financeiro")`): chama UMA vez cada rota
// (resumo, contas e saldos, títulos a receber e a pagar, extrato, agregados, política — F14), guarda o estado navegável
// na querystring (`?aba=…&conta=…&filtro=…`) e entrega dados e ações a uma view PURA. Neste bloco existe só a A ("Abas
// do Financeiro"); a B e a C chegam no B-SAN3-12c sobre esta mesma camada — até lá toda escolha cai na A, e a tela não
// entra no menu de aparência (`appearance.registry.ts` só lista tela com as 3 prontas). O painel de resumo que vivia
// aqui foi absorvido pela A (indicadores e fluxo de 6 meses). Estados §7: carregando, vazio, erro, acesso não permitido
// (rota guardada por `financial_entries:read`; abas guardadas pela leitura de títulos/contas) e dados desatualizados.

export function FinanceiroPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  useScreenAppearance("financeiro");
  const state = readFinanceState(location.search);

  const access = {
    readEntries: can("financial_entries:read"),
    readTitles: can("financial_titles:read"),
    readAccounts: can("financial_accounts:read"),
    pay: can("financial_entries:create"),
    reconcile: can("financial_entries:update"),
    createAccount: can("financial_accounts:create"),
    unlinkCheque: can("cheques:unlink_title"),
    // E2/R5: cancelar o cheque já desvinculado — o gate exato da rota POST /cheques/:id/cancel.
    cancelCheque: can("cheques:update"),
  };

  const summary = useFinancialSummary();
  const accounts = useFinancialAccounts({ enabled: access.readAccounts });
  const receivables = useFinancialTitles("receivable");
  const payables = useFinancialTitles("payable");
  const filters = useMemo(() => entriesFiltersFor({ tab: state.tab, accountId: state.accountId, target: state.target }), [state.tab, state.accountId, state.target]);
  const entries = useFinancialEntries(filters, { enabled: access.readEntries });
  const { policy, refresh: refreshPolicy } = useReconciliationPolicy({ enabled: access.readEntries });

  const accountKey = accounts.items
    .filter((account) => account.active)
    .map((account) => account.id)
    .join(",");
  const accountQueries = useMemo(() => {
    const queries: Record<string, EntriesAggregateQuery> = {};
    for (const id of accountKey ? accountKey.split(",") : []) queries[AGGREGATE_KEYS.account(id)] = { groupBy: "none", reconciled: false, accountId: id };
    return queries;
  }, [accountKey]);
  const situationAggregates = useEntriesAggregate(SITUATION_QUERIES, { enabled: access.readEntries });
  const accountAggregates = useEntriesAggregate(accountQueries, { enabled: access.readEntries });
  const focusedQueries = useMemo(() => {
    if (!state.accountId) return {};
    const accountId = state.accountId;
    const range = sixMonthRange();
    return {
      [AGGREGATE_KEYS.accountReconciled(accountId)]: { groupBy: "none", reconciled: true, accountId },
      [AGGREGATE_KEYS.accountValue(accountId)]: { groupBy: "none", reconciled: true, divergenceType: "value", accountId },
      [AGGREGATE_KEYS.accountDate(accountId)]: { groupBy: "none", reconciled: true, divergenceType: "date", accountId },
      [AGGREGATE_KEYS.accountMonths(accountId)]: { groupBy: "month", accountId, from: range.from, to: range.to },
    } satisfies Readonly<Record<string, EntriesAggregateQuery>>;
  }, [state.accountId]);
  const focusedAggregates = useEntriesAggregate(focusedQueries, { enabled: access.readEntries });

  const summaryView = useLastGood(summary.data, !summary.loading && summary.data.source !== "fallback");
  const receivablesView = useLastGood(receivables.items, !receivables.loading && receivables.source !== "fallback");
  const payablesView = useLastGood(payables.items, !payables.loading && payables.source !== "fallback");

  const actions = useFinanceActions(accounts.context);
  const [payTitle, setPayTitle] = useState<FinancialTitle | null>(null);
  const [reconcileEntry, setReconcileEntry] = useState<FinancialEntry | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [entryBusyId, setEntryBusyId] = useState<string | null>(null);
  const [entryMessage, setEntryMessage] = useState<{ entryId: string; text: string } | null>(null);

  const refreshSummary = summary.refresh;
  const refreshAccounts = accounts.refresh;
  const refreshReceivables = receivables.refresh;
  const refreshPayables = payables.refresh;
  const refreshEntries = entries.refresh;
  const refreshSituationAggregates = situationAggregates.refresh;
  const refreshAccountAggregates = accountAggregates.refresh;
  const refreshFocusedAggregates = focusedAggregates.refresh;
  const refreshAggregates = useCallback(
    async (background = false) => {
      await Promise.all([refreshSituationAggregates(background), refreshAccountAggregates(background), refreshFocusedAggregates(background)]);
    },
    [refreshSituationAggregates, refreshAccountAggregates, refreshFocusedAggregates],
  );
  const refreshAll = useCallback(
    async (background = false) => {
      await Promise.all([
        refreshSummary(background),
        refreshAccounts(background),
        refreshReceivables(background),
        refreshPayables(background),
        refreshEntries(background),
        refreshAggregates(background),
        refreshPolicy(),
      ]);
    },
    [refreshSummary, refreshAccounts, refreshReceivables, refreshPayables, refreshEntries, refreshAggregates, refreshPolicy],
  );
  useAutoRefresh(refreshAll, { enabled: access.readEntries });

  const onState = (next: FinanceState) => navigate({ search: financeStateSearch(next) });

  async function unreconcile(entry: FinancialEntry) {
    setEntryBusyId(entry.id);
    setEntryMessage(null);
    try {
      entries.replaceItem(await actions.reconcile(entry.id, reconcilePayloadFor(entry, { reconciled: false, divergence: "none", ref: "" })));
      void Promise.all([refreshEntries(true), refreshAggregates(true)]);
    } catch (error) {
      setEntryMessage({ entryId: entry.id, text: financeErrorMessage(error) });
      if (financeErrorReason(error) === "reconciliation_stale") {
        try {
          entries.replaceItem(await actions.rereadEntry(entry.id));
        } catch {
          // a mensagem já pede para recarregar
        }
      }
    } finally {
      setEntryBusyId(null);
    }
  }

  const summaryFailed = !summary.loading && summary.data.source === "fallback" && !summaryView.stale;
  const accountsFailed = access.readAccounts && !accounts.loading && accounts.source === "fallback";
  const stale = summaryView.stale || receivablesView.stale || payablesView.stale || accounts.stale || entries.stale;

  const model: FinanceiroViewModel = {
    state,
    onState,
    summary: summaryView.value,
    summaryLoading: summary.loading && !summaryView.stale,
    accounts: { items: accounts.items, loading: accounts.loading, failed: accountsFailed, total: accounts.pagination.total },
    balances: accounts.balances,
    receivables: {
      items: receivablesView.value,
      loading: receivables.loading && !receivablesView.stale,
      failed: !receivables.loading && receivables.source === "fallback" && !receivablesView.stale,
      total: receivables.total,
      hasMore: receivables.hasMore,
      loadingMore: receivables.loadingMore,
      loadMore: receivables.loadMore,
    },
    payables: {
      items: payablesView.value,
      loading: payables.loading && !payablesView.stale,
      failed: !payables.loading && payables.source === "fallback" && !payablesView.stale,
      total: payables.total,
      hasMore: payables.hasMore,
      loadingMore: payables.loadingMore,
      loadMore: payables.loadMore,
    },
    entries: { items: entries.items, loading: entries.loading, failed: !entries.loading && entries.source === "fallback", total: entries.pagination.total },
    aggregates: { ...situationAggregates.data, ...accountAggregates.data, ...focusedAggregates.data },
    policy,
    access,
    failed: summaryFailed || accountsFailed,
    stale,
    lastUpdatedAt: accounts.lastUpdatedAt ?? entries.lastUpdatedAt,
    entryBusyId,
    entryMessage,
    onRetry: () => void refreshAll(false),
    onNewAccount: () => setNewAccountOpen(true),
    onPay: (title) => setPayTitle(title),
    onReconcile: (entry) => setReconcileEntry(entry),
    onUnreconcile: (entry) => void unreconcile(entry),
  };

  const receivable = payTitle?.direction !== "payable";
  return (
    <>
      <FinanceiroViewA {...model} />

      {payTitle ? (
        <Modal title={receivable ? "Registrar recebimento" : "Registrar pagamento"} open onClose={() => setPayTitle(null)}>
          <BaixaForm
            key={payTitle.id}
            title={payTitle}
            accounts={accounts.items}
            canUnlinkCheque={access.unlinkCheque}
            canCancelCheque={access.cancelCheque}
            actions={actions}
            onDone={() => void refreshAll(true)}
            onClose={() => setPayTitle(null)}
          />
        </Modal>
      ) : null}

      {reconcileEntry ? (
        <Modal title="Conciliar com o extrato do banco" open onClose={() => setReconcileEntry(null)}>
          <ConciliarForm
            key={reconcileEntry.id}
            entry={reconcileEntry}
            actions={actions}
            onDone={(updated) => {
              entries.replaceItem(updated);
              setReconcileEntry(null);
              void Promise.all([refreshEntries(true), refreshAggregates(true)]);
            }}
            onReread={(fresh) => entries.replaceItem(fresh)}
            onClose={() => setReconcileEntry(null)}
          />
        </Modal>
      ) : null}

      {newAccountOpen ? (
        <NovaContaModal
          onClose={() => setNewAccountOpen(false)}
          onCreate={actions.createAccount}
          onCreated={() => {
            setNewAccountOpen(false);
            void Promise.all([refreshAccounts(true), refreshSummary(true), refreshAggregates(true)]);
          }}
        />
      ) : null}
    </>
  );
}

export default FinanceiroPage;
