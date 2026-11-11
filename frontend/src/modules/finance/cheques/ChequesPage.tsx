import { useCallback, useMemo, useState } from "react";

import { Modal } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../appearance";
import { useFinancialAccounts } from "../accounts/useFinancialAccounts";
import { useFinancialSummary } from "../dashboard/useFinancialSummary";
import { getFinancialTitle } from "../titles/financial-titles.service";
import { canRegisterCheque, chequeActionsFor, type PermissionSet } from "./cheque-actions";
import { cashImpactFor } from "./cheque-cash-impact";
import { chequeErrorMessage, chequeErrorReason, isChequeConflict } from "./cheque-errors";
import type { Cheque, ChequeAction } from "./cheques.types";
import { ChequeClearConfirm, confirmTitle } from "./components/ChequeClearConfirm";
import { ChequeFormModal, type ChequeFormSubmit } from "./components/ChequeFormModal";
import { accountNameOf, type ChequeDetailState, type ChequesViewModel } from "./components/cheques.shared";
import { ChequesViewA } from "./components/ChequesViewA";
import { ChequesViewB } from "./components/ChequesViewB";
import { ChequesViewC } from "./components/ChequesViewC";
import { useChequeActions, type StateAction } from "./useChequeActions";
import { EMPTY_FILTER, useChequeAccountCounts, useCheques, useChequeCounts, type ChequeListFilter } from "./useCheques";

// B-SAN3-24 (24a) — a tela de Cheques em `/finance/cheques` (referência aprovada `screen-refs/cheques-3opcoes`). É o
// CONTÊINER das 3 aparências (`useScreenAppearance("cheques")`, D-APARENCIA-POR-USUARIO), no molde da tela-modelo
// `FinanceiroPage`: chama cada rota, guarda o filtro e entrega dados e ações a uma view PURA. As 3 aparências usam a MESMA
// camada de dados, a MESMA função de ações (`chequeActionsFor`) e a MESMA confirmação (`ChequeClearConfirm`, com o texto
// de `cashImpactFor`). Depois de toda escrita a tela relê a lista, as contagens e o resumo. Estados §7: carregando,
// vazio, erro, acesso não permitido (rota guardada por `cheques:read`; 403 do servidor) e dados desatualizados.

const DONE_MESSAGES: Readonly<Record<StateAction, string>> = {
  deposit: "Cheque depositado. Ele aguarda a compensação do banco.",
  clear: "Cheque compensado.",
  bounce: "Cheque devolvido.",
  cancel: "Cheque cancelado.",
  delete: "Cheque excluído.",
};

export function ChequesPage() {
  const { can } = usePermissions();
  const { appearance } = useScreenAppearance("cheques");
  const perms: PermissionSet = useMemo(() => ({ has: (permission: string) => can(permission) }), [can]);
  const canRead = can("cheques:read");

  const [filter, setFilter] = useState<ChequeListFilter>(EMPTY_FILTER);
  const limit = appearance === "C" ? 100 : 20;
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => ({ offset, limit }), [offset, limit]);

  const cheques = useCheques(filter, page, { enabled: canRead });
  const pending = useCheques({ ...EMPTY_FILTER, status: "pending", accountId: filter.accountId }, { offset: 0, limit: 100 }, { enabled: canRead && appearance === "C" });
  const counts = useChequeCounts(filter.direction, filter.accountId, { enabled: canRead });
  const summary = useFinancialSummary();
  const accounts = useFinancialAccounts({ enabled: can("financial_accounts:read") });
  const accountIds = useMemo(() => accounts.items.map((account) => account.id), [accounts.items]);
  const accountCounts = useChequeAccountCounts(accountIds, { enabled: canRead && appearance === "B" });
  const actions = useChequeActions(cheques.context);

  const [details, setDetails] = useState<Readonly<Record<string, ChequeDetailState>>>({});
  const [confirm, setConfirm] = useState<{ readonly cheque: Cheque; readonly action: StateAction; readonly message: string | null } | null>(null);
  const [form, setForm] = useState<{ readonly cheque: Cheque | null; readonly message: string | null } | null>(null);
  const [message, setMessage] = useState<ChequesViewModel["message"]>(null);

  const refreshList = cheques.refresh;
  const refreshPending = pending.refresh;
  const refreshCounts = counts.refresh;
  const refreshSummary = summary.refresh;
  const refreshAccountCounts = accountCounts.refresh;
  const refreshAll = useCallback(
    async (background = false) => {
      await Promise.all([refreshList(background), refreshPending(background), refreshCounts(), refreshSummary(background), refreshAccountCounts()]);
    },
    [refreshList, refreshPending, refreshCounts, refreshSummary, refreshAccountCounts],
  );
  useAutoRefresh(refreshAll, { enabled: canRead });

  const context = cheques.context;
  const loadDetail = useCallback(
    async (cheque: Cheque) => {
      setDetails((current) => ({ ...current, [cheque.id]: { loading: true, cheque: current[cheque.id]?.cheque ?? null, title: current[cheque.id]?.title ?? null, failed: false } }));
      try {
        const fresh = await actions.reread(cheque.id);
        let title: ChequeDetailState["title"] = null;
        if (fresh.titleId && can("financial_titles:read")) {
          try {
            const read = await getFinancialTitle(context, fresh.titleId);
            title = { document: read.document, partyName: read.partyName, amount: read.amount, paidAmount: read.paidAmount, status: read.status };
          } catch {
            title = null;
          }
        }
        setDetails((current) => ({ ...current, [cheque.id]: { loading: false, cheque: fresh, title, failed: false } }));
        cheques.replaceItem(fresh);
      } catch {
        setDetails((current) => ({ ...current, [cheque.id]: { loading: false, cheque: current[cheque.id]?.cheque ?? null, title: current[cheque.id]?.title ?? null, failed: true } }));
      }
    },
    [actions, can, context, cheques],
  );

  const afterWrite = useCallback(
    (cheque: Cheque | null) => {
      if (cheque) void loadDetail(cheque);
      void refreshAll(true);
    },
    [loadDetail, refreshAll],
  );

  async function confirmAction(reason: string) {
    if (!confirm) return;
    const { cheque, action } = confirm;
    const result = await actions.run(cheque, action, reason);
    if (!result) return;
    if (result.ok) {
      setConfirm(null);
      setMessage({ tone: "info", text: DONE_MESSAGES[action] });
      afterWrite(result.cheque);
      return;
    }
    const text = chequeErrorMessage(result.error);
    if (isChequeConflict(result.error) || chequeErrorReason(result.error) === "period_closed") {
      // O registro mudou (ou o mês está fechado): fecha a confirmação, avisa e relê o cheque, a lista e o resumo.
      setConfirm(null);
      setMessage({ tone: "error", text });
      afterWrite(cheque);
      return;
    }
    setConfirm((current) => (current ? { ...current, message: text } : current));
  }

  async function submitForm(submit: ChequeFormSubmit) {
    const result = submit.mode === "register" ? await actions.register(submit.payload) : await actions.edit(submit.chequeId, submit.payload);
    if (!result) return;
    if (result.ok) {
      setForm(null);
      setMessage({ tone: "info", text: submit.mode === "register" ? "Cheque registrado. Nenhum dinheiro se moveu." : "Cheque atualizado." });
      afterWrite(submit.mode === "edit" ? result.cheque : null);
      return;
    }
    setForm((current) => (current ? { ...current, message: chequeErrorMessage(result.error) } : current));
    if (isChequeConflict(result.error)) afterWrite(null);
  }

  const onAction = (cheque: Cheque, action: ChequeAction) => {
    setMessage(null);
    if (action === "edit") setForm({ cheque, message: null });
    else setConfirm({ cheque, action, message: null });
  };

  const summaryData = summary.data.source === "fallback" ? null : summary.data.cheques;
  const model: ChequesViewModel = {
    summary: summaryData,
    summaryLoading: summary.loading,
    list: cheques.list,
    filter,
    onFilter: (next) => {
      setOffset(0);
      setFilter(next);
    },
    page,
    onPage: setOffset,
    counts: counts.counts,
    accounts: accounts.items,
    accountCounts: accountCounts.counts,
    pending: appearance === "C" ? pending.list : null,
    canRegister: canRegisterCheque(perms),
    actionsFor: (cheque) => chequeActionsFor(cheque, perms),
    details,
    onOpen: (cheque) => void loadDetail(cheque),
    onAction,
    onRegister: () => {
      setMessage(null);
      setForm({ cheque: null, message: null });
    },
    onRetry: () => void refreshAll(false),
    message,
    onDismissMessage: () => setMessage(null),
  };

  const confirmTitleInfo = confirm ? (details[confirm.cheque.id]?.title ?? null) : null;
  const impact = confirm ? cashImpactFor(confirm.cheque, confirm.action, { accountName: accountNameOf(accounts.items, confirm.cheque.accountId), title: confirmTitleInfo }) : null;

  return (
    <>
      {appearance === "B" ? <ChequesViewB {...model} /> : appearance === "C" ? <ChequesViewC {...model} /> : <ChequesViewA {...model} />}

      {confirm && impact ? (
        <Modal title={confirmTitle(confirm.action)} open onClose={() => setConfirm(null)}>
          <ChequeClearConfirm
            key={`${confirm.cheque.id}:${confirm.action}`}
            cheque={confirm.cheque}
            action={confirm.action}
            impact={impact}
            busy={actions.busy}
            message={confirm.message}
            onConfirm={(reason) => void confirmAction(reason)}
            onCancel={() => setConfirm(null)}
          />
        </Modal>
      ) : null}

      {form ? (
        <Modal title={form.cheque ? "Editar cheque" : "Registrar cheque"} open onClose={() => setForm(null)}>
          <ChequeFormModal cheque={form.cheque} accounts={accounts.items} busy={actions.busy} message={form.message} onSubmit={(submit) => void submitForm(submit)} onCancel={() => setForm(null)} />
        </Modal>
      ) : null}
    </>
  );
}

export default ChequesPage;
