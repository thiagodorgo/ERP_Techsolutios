import { ExternalLink, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DENSE_LIST_FETCH_LIMIT } from "../../../../components/dense-list";
import { Alert, Button, Chip, Drawer, EmptyState, Skeleton } from "../../../../components/ui";
import {
  describeCommissionOrigin,
  formatBRL,
  formatCommissionCount,
  formatCommissionDate,
  formatPeriodLabel,
  getCommissionStatusLabel,
  getCommissionStatusTone,
} from "../commissions.adapter";
import { fetchCommissionCalculations, fetchMyCommissionCalculations } from "../commissions.service";
import type { CommissionCalculation, CommissionSummaryScope, CommissionsApiContext } from "../commissions.types";

const subtitleStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-2)" };
const summaryRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", margin: "var(--space-12) 0" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const scrollAreaStyle: CSSProperties = { maxHeight: "calc(100vh - 240px)", overflowY: "auto", marginTop: "var(--space-8)" };

type DrillState = {
  readonly items: CommissionCalculation[];
  readonly total: number;
  readonly loading: boolean;
  readonly error: string | null;
};

// F8 — detalhamento por origem: lista os cálculos individuais (origem · valor · situação) de
// um operador no período. Optei por um DRAWER (não rota) para manter o extrato autocontido,
// reaproveitando o overlay do design system. D-007: modo mock/erro → vazio, sem fabricar.
// O `scope` decide o endpoint (o backend é a autoridade final):
//   `own` (operador, read_own) → /calculations/mine (sem payee_id — servidor fixa o autor)
//   `all` (finance/admin, read) → /calculations?payee_id=… (filtra pelo operador da linha)
export function CommissionDetailDrawer({
  scope,
  payeeId,
  payeeName,
  from,
  to,
  context,
  onClose,
}: {
  readonly scope: CommissionSummaryScope;
  readonly payeeId?: string;
  readonly payeeName: string;
  readonly from: string;
  readonly to: string;
  readonly context: CommissionsApiContext;
  readonly onClose: () => void;
}) {
  const [state, setState] = useState<DrillState>({ items: [], total: 0, loading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const data =
      scope === "own"
        ? await fetchMyCommissionCalculations(context, { from: from || undefined, to: to || undefined, limit: DENSE_LIST_FETCH_LIMIT })
        : await fetchCommissionCalculations(context, {
            payeeId: payeeId || undefined,
            from: from || undefined,
            to: to || undefined,
            limit: DENSE_LIST_FETCH_LIMIT,
          });
    if (data.source === "fallback") {
      setState({ items: [], total: 0, loading: false, error: data.fallbackReason ?? "Não foi possível carregar o detalhamento." });
      return;
    }
    setState({ items: data.items, total: data.pagination.total, loading: false, error: null });
  }, [context, scope, payeeId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const amountTotal = useMemo(() => state.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0), [state.items]);

  return (
    <Drawer title="Detalhamento por OS" open onClose={onClose}>
      <p style={subtitleStyle}>
        {payeeName} · {formatPeriodLabel(from, to)}
      </p>

      {/* estado: carregando */}
      {state.loading ? <Skeleton lines={5} /> : null}

      {/* estado: erro (com retry) */}
      {!state.loading && state.error ? (
        <Alert title="Não foi possível carregar o detalhamento" tone="warning">
          {state.error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {/* estado: vazio */}
      {!state.loading && !state.error && state.items.length === 0 ? (
        <EmptyState title="Sem comissões no período" detail="Nenhuma comissão foi calculada para este operador no período selecionado." />
      ) : null}

      {/* estado: populado */}
      {!state.loading && !state.error && state.items.length > 0 ? (
        <>
          <div style={summaryRowStyle}>
            <Chip tone="success">{formatBRL(amountTotal)}</Chip>
            <span style={mutedStyle}>{formatCommissionCount(state.items.length)} comissão(ões)</span>
          </div>

          <div style={scrollAreaStyle}>
            <table className="ui-table dense-table">
              <thead>
                <tr>
                  <th scope="col">Origem</th>
                  <th scope="col">Data</th>
                  <th scope="col" className="dense-col-right dense-col-tabular">
                    Valor
                  </th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((calc) => (
                  <tr key={calc.id}>
                    <td>
                      <OriginCell sourceType={calc.sourceType} sourceId={calc.sourceId} />
                    </td>
                    <td style={tabularStyle}>{formatCommissionDate(calc.createdAt)}</td>
                    <td className="dense-col-right dense-col-tabular">{formatBRL(calc.amount)}</td>
                    <td>
                      <Chip tone={getCommissionStatusTone(calc.status)}>{getCommissionStatusLabel(calc.status)}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" }}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </footer>
    </Drawer>
  );
}

// Célula "Origem": delega a decisão de exibição ao descritor puro (fonte única):
//   OS (work_order) com id → link navegável; demais origens → só o rótulo PT-BR; sem tipo → "—".
function OriginCell({ sourceType, sourceId }: { readonly sourceType: string | null; readonly sourceId: string | null }) {
  const origin = describeCommissionOrigin(sourceType, sourceId);

  if (origin.kind === "none") return <span style={mutedStyle}>—</span>;

  if (origin.kind === "link") {
    return (
      <Link to={origin.href} aria-label={`Abrir ordem de serviço ${sourceId}`}>
        <ExternalLink size={13} aria-hidden /> {origin.label}
      </Link>
    );
  }

  // Origem não-OS (ou OS sem id): apenas o rótulo, sem expor fragmento de id.
  return <span>{origin.label}</span>;
}

export default CommissionDetailDrawer;
