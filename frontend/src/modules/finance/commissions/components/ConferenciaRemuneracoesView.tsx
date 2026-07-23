import { ExternalLink, FileDown, Filter, Printer, RefreshCw, Settings, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DENSE_LIST_FETCH_LIMIT } from "../../../../components/dense-list";
import { Alert, Button, Card, Checkbox, Chip, EmptyState, Input, Modal, Skeleton } from "../../../../components/ui";
import { downloadCsv } from "../../../../lib/csv";
import {
  buildRemuneracoesCsv,
  describeCommissionOrigin,
  describeSettlementResult,
  formatBRL,
  formatCommissionCount,
  formatCommissionDate,
  formatPeriodLabel,
  getSettlementLabel,
  getSettlementTone,
  isCalculationSettled,
} from "../commissions.adapter";
import { fetchCommissionCalculations, settleCommissions } from "../commissions.service";
import type { CommissionCalculation, CommissionsApiContext, ConferenceProfessional } from "../commissions.types";
import { PrintRemuneracoesModal } from "./PrintRemuneracoesModal";

// Ω4C PR-10 (RN-REM-01/02/03/07) — conferência das remunerações de UM profissional no período: grid com
// bolinha de liquidação, seleção múltipla, seletor de colunas, engrenagem de ação em massa (Liquidar),
// totalizadores derivados, Exportar CSV (util compartilhado) e impressão client-side. D-007: mostra SÓ as
// linhas reais (tenant sem linhas → grid VAZIO honesto, nunca fabricado). §2.8: profissional só por nome.

type ColumnKey = "data" | "origem" | "valor" | "extrato";
type ColumnVisibility = Record<ColumnKey, boolean>;

const COLUMN_LABELS: Record<ColumnKey, string> = {
  data: "Data",
  origem: "Origem",
  valor: "Valor da remuneração",
  extrato: "Extrato",
};

const toolbarStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const actionsStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-10)", marginBottom: "var(--space-12)" };
const totalCardStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-10)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 10px)" };
const totalLabelStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const totalValueStyle: CSSProperties = { fontSize: "var(--text-2xl, 22px)", fontWeight: 800, fontVariantNumeric: "tabular-nums" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const columnsPanelStyle: CSSProperties = { display: "flex", gap: "var(--space-12)", flexWrap: "wrap", padding: "var(--space-10)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 10px)", marginBottom: "var(--space-10)" };
const checkboxCellStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, cursor: "pointer" };
const dotBaseStyle: CSSProperties = { display: "inline-block", width: 10, height: 10, borderRadius: "50%", verticalAlign: "middle" };
const scrollAreaStyle: CSSProperties = { maxHeight: "calc(100vh - 320px)", overflowY: "auto", marginTop: "var(--space-8)" };
const modalFieldStyle: CSSProperties = { marginBottom: "var(--space-12)" };
const modalFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

type LoadState = {
  readonly items: CommissionCalculation[];
  readonly loading: boolean;
  readonly error: string | null;
};

type Feedback = { readonly ok: boolean; readonly message: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Bolinha de liquidação — verde = liquidado; vermelho = pendente (ANALISE:237). A11y: role/aria-label.
function StatusDot({ settled }: { readonly settled: boolean }) {
  const label = getSettlementLabel(settled);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ ...dotBaseStyle, background: settled ? "#16A34A" : "#DC2626" }}
    />
  );
}

export function ConferenciaRemuneracoesView({
  professional,
  from,
  to,
  context,
  canSettle,
  onReopenFilter,
  onBackToSummary,
}: {
  readonly professional: ConferenceProfessional;
  readonly from: string;
  readonly to: string;
  readonly context: CommissionsApiContext;
  readonly canSettle: boolean;
  readonly onReopenFilter: () => void;
  readonly onBackToSummary: () => void;
}) {
  // loading inicia false (como useStatement) → o estado vazio honesto é o render inicial (SSR/D-007);
  // a 1ª carga liga o skeleton no cliente. Sem fabricar linha em nenhum momento.
  const [state, setState] = useState<LoadState>({ items: [], loading: false, error: null });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [columns, setColumns] = useState<ColumnVisibility>({ data: true, origem: true, valor: true, extrato: true });
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementDate, setSettlementDate] = useState(todayIso);
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const data = await fetchCommissionCalculations(context, {
      payeeId: professional.userId,
      from: from || undefined,
      to: to || undefined,
      limit: DENSE_LIST_FETCH_LIMIT,
    });
    if (data.source === "fallback") {
      setState({ items: [], loading: false, error: data.fallbackReason ?? "Não foi possível carregar as remunerações." });
      return;
    }
    setState({ items: data.items, loading: false, error: null });
  }, [context, professional.userId, from, to]);

  useEffect(() => {
    setSelected(new Set());
    setFeedback(null);
    void load();
  }, [load]);

  const periodLabel = useMemo(() => formatPeriodLabel(from, to), [from, to]);

  // Totalizadores DERIVADOS (RN-REM-01) — total a pagar = soma dos amounts pendentes; liquidado = soma dos
  // liquidados; serviços = contagem. Nunca recalculado no backend nem fabricado.
  const totals = useMemo(() => {
    let toPay = 0;
    let settledTotal = 0;
    let settledCount = 0;
    for (const calc of state.items) {
      const amount = Number.isFinite(calc.amount) ? calc.amount : 0;
      if (isCalculationSettled(calc)) {
        settledTotal += amount;
        settledCount += 1;
      } else {
        toPay += amount;
      }
    }
    return { toPay, settledTotal, settledCount, count: state.items.length };
  }, [state.items]);

  const selectedItems = useMemo(() => state.items.filter((calc) => selected.has(calc.id)), [state.items, selected]);
  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, calc) => sum + (Number.isFinite(calc.amount) ? calc.amount : 0), 0),
    [selectedItems],
  );

  const allSelected = state.items.length > 0 && selected.size === state.items.length;

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === state.items.length ? new Set<string>() : new Set(state.items.map((calc) => calc.id))));
  }, [state.items]);

  const toggleColumn = useCallback((key: ColumnKey) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  function handleExportCsv() {
    const { header, rows } = buildRemuneracoesCsv(professional.name, state.items);
    downloadCsv("remuneracoes.csv", header, rows);
  }

  async function handleSettle() {
    if (settling || selected.size === 0) return;
    setSettling(true);
    const outcome = await settleCommissions(context, {
      calculationIds: [...selected],
      settlementDate: settlementDate || undefined,
      description: description.trim() || undefined,
    });
    setSettling(false);
    setSettleOpen(false);
    if (outcome.kind === "ok") {
      setFeedback({ ok: true, message: describeSettlementResult(outcome.result) });
      setSelected(new Set());
      setDescription("");
      await load();
      return;
    }
    setFeedback({ ok: false, message: outcome.message });
    // 404 (linha desatualizada) → recarrega para refletir o estado real.
    if (outcome.kind === "not_found") await load();
  }

  const statementHref = `/fleet/statement/${professional.profileId}`;
  const activeColumns = (Object.keys(COLUMN_LABELS) as ColumnKey[]).filter((key) => columns[key]);

  return (
    <Card
      title={`Conferência — ${professional.name}`}
      action={
        <div style={actionsStyle}>
          <Button type="button" size="sm" variant="ghost" onClick={onReopenFilter} aria-label="Trocar filtro de período e profissional">
            <Filter size={14} aria-hidden /> Trocar filtro
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onBackToSummary} aria-label="Ver resumo por operador">
            <Users size={14} aria-hidden /> Ver resumo
          </Button>
        </div>
      }
    >
      <p style={mutedStyle}>Remunerações do profissional no período {periodLabel}.</p>

      {feedback ? (
        <div role="status" style={{ margin: "var(--space-10) 0" }}>
          <Chip tone={feedback.ok ? "success" : "danger"}>{feedback.ok ? "Liquidação concluída" : "Não concluído"}</Chip>{" "}
          <span style={mutedStyle}>{feedback.message}</span>
        </div>
      ) : null}

      {/* Totalizadores derivados */}
      <div style={totalsGridStyle}>
        <div style={totalCardStyle}>
          <span style={totalLabelStyle}>Total a pagar</span>
          <strong style={totalValueStyle}>{formatBRL(totals.toPay)}</strong>
        </div>
        <div style={totalCardStyle}>
          <span style={totalLabelStyle}>Liquidado</span>
          <strong style={totalValueStyle}>{formatBRL(totals.settledTotal)}</strong>
        </div>
        <div style={totalCardStyle}>
          <span style={totalLabelStyle}>Serviços</span>
          <strong style={totalValueStyle}>{formatCommissionCount(totals.count)}</strong>
        </div>
      </div>

      {/* Barra de ações: seletor de colunas · CSV · imprimir · engrenagem (liquidar em lote) */}
      <div style={toolbarStyle}>
        <div style={actionsStyle}>
          <Button type="button" size="sm" variant="secondary" onClick={() => setColumnsPanelOpen((open) => !open)} aria-expanded={columnsPanelOpen} aria-label="Selecionar colunas visíveis">
            Colunas
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={handleExportCsv} disabled={state.items.length === 0} aria-label="Exportar remunerações em CSV">
            <FileDown size={14} aria-hidden /> Exportar CSV
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPrintOpen(true)} disabled={state.items.length === 0} aria-label="Imprimir remunerações">
            <Printer size={14} aria-hidden /> Imprimir
          </Button>
        </div>
        <div style={actionsStyle}>
          {selected.size > 0 ? (
            <span style={mutedStyle}>
              {formatCommissionCount(selected.size)} selecionada(s) · {formatBRL(selectedTotal)}
            </span>
          ) : null}
          {canSettle ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setSettleOpen(true)}
              disabled={selected.size === 0 || settling}
              aria-label="Liquidar remunerações selecionadas"
              title={selected.size === 0 ? "Selecione ao menos uma remuneração" : "Liquidar selecionadas"}
            >
              <Settings size={14} aria-hidden /> Liquidar
            </Button>
          ) : null}
        </div>
      </div>

      {columnsPanelOpen ? (
        <div style={columnsPanelStyle} role="group" aria-label="Colunas visíveis">
          {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
            <Checkbox key={key} label={COLUMN_LABELS[key]} checked={columns[key]} onChange={() => toggleColumn(key)} />
          ))}
        </div>
      ) : null}

      {/* Estados §7 */}
      {state.loading ? <Skeleton lines={5} /> : null}

      {!state.loading && state.error ? (
        <Alert title="Não foi possível carregar as remunerações" tone="warning">
          {state.error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {!state.loading && !state.error && state.items.length === 0 ? (
        <EmptyState
          title="Sem remunerações no período"
          detail="Nenhuma remuneração foi calculada para este profissional no período selecionado. Ajuste o filtro para consultar outro intervalo."
        />
      ) : null}

      {!state.loading && !state.error && state.items.length > 0 ? (
        <div style={scrollAreaStyle}>
          <table className="ui-table dense-table">
            <thead>
              <tr>
                <th scope="col">
                  <span style={checkboxCellStyle}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Selecionar todas as remunerações"
                    />
                  </span>
                </th>
                <th scope="col">Situação</th>
                {columns.data ? <th scope="col">Data</th> : null}
                {columns.origem ? <th scope="col">Origem</th> : null}
                {columns.valor ? (
                  <th scope="col" className="dense-col-right dense-col-tabular">
                    Valor da remuneração
                  </th>
                ) : null}
                {columns.extrato ? <th scope="col">Extrato</th> : null}
              </tr>
            </thead>
            <tbody>
              {state.items.map((calc) => {
                const settled = isCalculationSettled(calc);
                return (
                  <tr key={calc.id}>
                    <td>
                      <label style={checkboxCellStyle}>
                        <input
                          type="checkbox"
                          checked={selected.has(calc.id)}
                          onChange={() => toggleRow(calc.id)}
                          aria-label={`Selecionar remuneração de ${formatCommissionDate(calc.createdAt)}`}
                        />
                      </label>
                    </td>
                    <td>
                      <StatusDot settled={settled} />{" "}
                      <Chip tone={getSettlementTone(settled)}>{getSettlementLabel(settled)}</Chip>
                    </td>
                    {columns.data ? <td style={tabularStyle}>{formatCommissionDate(calc.createdAt)}</td> : null}
                    {columns.origem ? (
                      <td>
                        <OriginCell sourceType={calc.sourceType} sourceId={calc.sourceId} />
                      </td>
                    ) : null}
                    {columns.valor ? <td className="dense-col-right dense-col-tabular">{formatBRL(calc.amount)}</td> : null}
                    {columns.extrato ? (
                      <td>
                        {settled ? (
                          <Link to={statementHref} aria-label="Ver lançamento no extrato do profissional">
                            <ExternalLink size={13} aria-hidden /> Ver no extrato
                          </Link>
                        ) : (
                          <span style={mutedStyle}>—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeColumns.length === 0 ? <p style={mutedStyle}>Nenhuma coluna adicional visível.</p> : null}
        </div>
      ) : null}

      {settleOpen ? (
        <Modal title="Liquidar remunerações" open onClose={() => setSettleOpen(false)}>
          <p style={mutedStyle}>
            {formatCommissionCount(selected.size)} remuneração(ões) selecionada(s) · total {formatBRL(selectedTotal)}. Cada
            uma gera um crédito no extrato do profissional.
          </p>
          <div style={{ marginTop: "var(--space-14)" }}>
            <div style={modalFieldStyle}>
              <Input
                label="Data da liquidação"
                type="date"
                value={settlementDate}
                onChange={(event) => setSettlementDate(event.target.value)}
                aria-label="Data da liquidação"
              />
            </div>
            <div style={modalFieldStyle}>
              <Input
                label="Descrição (opcional)"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-label="Descrição da liquidação"
                maxLength={2000}
              />
            </div>
          </div>
          <footer style={modalFooterStyle}>
            <Button type="button" variant="ghost" onClick={() => setSettleOpen(false)} disabled={settling}>
              Voltar
            </Button>
            <Button type="button" onClick={() => void handleSettle()} disabled={settling}>
              {settling ? "Liquidando…" : "Confirmar liquidação"}
            </Button>
          </footer>
        </Modal>
      ) : null}

      {printOpen ? (
        <PrintRemuneracoesModal
          professionalName={professional.name}
          periodLabel={periodLabel}
          calculations={state.items}
          total={totals.toPay}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </Card>
  );
}

// Célula "Origem" — delega ao descritor puro: OS (work_order) com id → link; demais → rótulo PT-BR; sem tipo → "—".
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
  return <span>{origin.label}</span>;
}

export default ConferenciaRemuneracoesView;
