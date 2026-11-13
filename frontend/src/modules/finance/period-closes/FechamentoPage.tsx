import { useCallback, useMemo, useRef, useState } from "react";

import { Modal } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../appearance";
import type { CashFlowPoint } from "../dashboard/financial-summary.types";
import { useFinancialSummary } from "../dashboard/useFinancialSummary";
import { FechamentoViewA } from "./components/FechamentoViewA";
import { FechamentoViewB } from "./components/FechamentoViewB";
import { FechamentoViewC } from "./components/FechamentoViewC";
import type { FechamentoViewModel, PeriodFilter } from "./components/fechamento.shared";
import { PeriodCloseConfirm } from "./components/PeriodCloseConfirm";
import { periodActionsFor, type PermissionSet } from "./period-actions";
import type { PeriodAction } from "./period-closes.types";
import { isPeriodConflict, periodErrorMessage } from "./period-errors";
import { periodLabel, periodName, previousPeriodKey } from "./period-keys";
import { usePeriodActions } from "./usePeriodActions";
import { usePeriodDetails, usePeriods } from "./usePeriods";

// B-SAN3-24 (24b) — a tela de Fechamento do mês em `/finance/fechamento` (referência aprovada
// `screen-refs/fechamento-periodo-3opcoes.reference.html`). CONTÊINER das 3 aparências (`useScreenAppearance("fechamento")`),
// no molde da tela-modelo `FinanceiroPage`: lê as competências e o detalhe de cada uma (checklist ao vivo), e entrega dados
// e ações a uma view PURA. Fechar e reabrir passam pela MESMA confirmação de 2 passos (`PeriodCloseConfirm`) nas 3
// aparências. Depois de toda escrita a tela relê a lista e a competência. Estados §7: carregando, vazio (nenhum mês
// fechado), erro, acesso não permitido (rota guardada por `financial_period:read`; 403 do servidor) e desatualizado.

/**
 * Aparência B com as entradas e saídas AO VIVO dos meses não fechados (J-547 C3-03): `summary.cashFlow` (6 meses), lido
 * só quando a B está na tela. Numa releitura que falha, fica o último fluxo bom (§7, desatualizado sem trocar a tela).
 */
function FechamentoViewBLive({ model, enabled }: { readonly model: FechamentoViewModel; readonly enabled: boolean }) {
  const summary = useFinancialSummary();
  useAutoRefresh(summary.refresh, { enabled });
  const lastGood = useRef<readonly CashFlowPoint[] | null>(null);
  if (!summary.loading && summary.data.source !== "fallback") lastGood.current = summary.data.cashFlow;
  return <FechamentoViewB {...model} liveCashFlow={lastGood.current} liveLoading={summary.loading && lastGood.current === null} />;
}

export function FechamentoPage() {
  const { can } = usePermissions();
  const { appearance } = useScreenAppearance("fechamento");
  const perms: PermissionSet = useMemo(() => ({ has: (permission: string) => can(permission) }), [can]);
  const canRead = can("financial_period:read");
  const periods = usePeriods({ enabled: canRead });
  const { rows, currentKey } = periods.list;

  const previous = previousPeriodKey(currentKey);
  const previousRow = rows.find((row) => row.period === previous);
  const monthToClose = previousRow && previousRow.status !== "closed" ? previous : currentKey;
  const wanted = useMemo(() => {
    const keys = new Set<string>([monthToClose]);
    if (appearance === "B") for (const row of rows.filter((item) => item.status === "closed" || item.status === "reopened").slice(0, 12)) keys.add(row.period);
    return [...keys];
  }, [appearance, monthToClose, rows]);
  const details = usePeriodDetails(wanted, { enabled: canRead });

  const [filter, setFilter] = useState<PeriodFilter>("all");
  const [confirm, setConfirm] = useState<{ readonly period: string; readonly action: PeriodAction; readonly message: string | null } | null>(null);
  const [message, setMessage] = useState<FechamentoViewModel["message"]>(null);
  const confirmPeriod = useRef<string | null>(null);
  confirmPeriod.current = confirm?.period ?? null;

  const loadDetail = details.load;
  const reloadConfirmPeriod = useCallback(async () => {
    if (confirmPeriod.current) await loadDetail(confirmPeriod.current);
  }, [loadDetail]);
  const actions = usePeriodActions(periods.context, reloadConfirmPeriod);

  const refreshPeriods = periods.refresh;
  const refreshWanted = details.refreshWanted;
  const refreshAll = useCallback(
    async (background = false) => {
      await Promise.all([refreshPeriods(background), refreshWanted()]);
    },
    [refreshPeriods, refreshWanted],
  );
  useAutoRefresh(refreshAll, { enabled: canRead });

  const afterWrite = (period: string) => {
    void loadDetail(period);
    void refreshAll(true);
  };

  async function confirmAction(forcing: boolean, reason: string) {
    if (!confirm) return;
    const { period, action } = confirm;
    const result = action === "close" ? await actions.close(period, forcing, reason) : await actions.reopen(period, reason);
    if (!result) return;
    if (result.ok) {
      setConfirm(null);
      setMessage({ tone: "info", text: action === "close" ? `${periodName(period)} fechado. Nada mais é lançado em ${periodLabel(period)}.` : `${periodName(period)} reaberto.` });
      afterWrite(period);
      return;
    }
    const text = periodErrorMessage(result.error, period);
    if (isPeriodConflict(result.error)) {
      setConfirm(null);
      setMessage({ tone: "error", text });
      afterWrite(period);
      return;
    }
    // 422 `pending_items_block_close`: o hook já releu a competência; a confirmação passa ao caminho forçado.
    setConfirm((current) => (current ? { ...current, message: text } : current));
  }

  const model: FechamentoViewModel = {
    list: periods.list,
    details: details.details,
    monthToClose,
    filter,
    onFilter: setFilter,
    onFocusMonth: (period) => {
      setFilter(`month:${period}`);
      void loadDetail(period);
    },
    liveCashFlow: null,
    liveLoading: false,
    actionsFor: (period) => periodActionsFor(period, perms),
    onOpen: (period) => void loadDetail(period),
    onAction: (period, action) => {
      setMessage(null);
      setConfirm({ period, action, message: null });
      if (!details.details[period]?.detail) void loadDetail(period);
    },
    onRetry: () => void refreshAll(false),
    message,
    onDismissMessage: () => setMessage(null),
  };

  const confirmDetail = confirm ? (details.details[confirm.period]?.detail ?? null) : null;
  return (
    <>
      {appearance === "B" ? <FechamentoViewBLive model={model} enabled={canRead} /> : appearance === "C" ? <FechamentoViewC {...model} /> : <FechamentoViewA {...model} />}
      {confirm ? (
        <Modal title={confirm.action === "close" ? `Fechar ${periodName(confirm.period).toLocaleLowerCase("pt-BR")}` : `Reabrir ${periodName(confirm.period).toLocaleLowerCase("pt-BR")}`} open onClose={() => setConfirm(null)}>
          {confirmDetail ? (
            <PeriodCloseConfirm
              key={`${confirm.period}:${confirm.action}`}
              action={confirm.action}
              detail={confirmDetail}
              sending={actions.sending}
              message={confirm.message}
              onConfirm={(forcing, reason) => void confirmAction(forcing, reason)}
              onCancel={() => setConfirm(null)}
            />
          ) : (
            <p aria-busy="true" style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Lendo as pendências da competência…
            </p>
          )}
        </Modal>
      ) : null}
    </>
  );
}

export default FechamentoPage;
