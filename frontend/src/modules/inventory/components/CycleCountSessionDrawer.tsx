import { AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, Button, Chip, Drawer, EmptyState, Skeleton } from "../../../components/ui";
import {
  computeVariance,
  getCycleCountClassLabel,
  getCycleCountStatusLabel,
  getCycleCountStatusTone,
  interpretCycleCountError,
  isCycleCountEditable,
} from "../cycle-counts.adapter";
import { cancelCycleCount, closeCycleCount, getCycleCount, updateCycleCountEntry } from "../cycle-counts.service";
import type { CycleCount, CycleCountEntry, VarianceReport } from "../cycle-counts.types";
import { formatQuantity, formatSignedQuantity, parsePtBrNumber } from "../inventory.adapter";
import type { InventoryApiContext, InventoryItem } from "../inventory.types";

// F7b — sessão de contagem cíclica (R7.6): lista as entradas (saldo do sistema ×
// contado), computa variância e permite fechar (gera ajustes + relatório) ou cancelar.
// Concluída/cancelada → somente leitura. Optei por um DRAWER (não rota) para manter
// a Contagem autocontida na aba, reaproveitando o overlay do design system.
const POSITIVE_QTY_COLOR = "#059669";
const NEGATIVE_QTY_COLOR = "#DC2626";
const mono = "'JetBrains Mono', monospace";

const scrollAreaStyle: CSSProperties = { maxHeight: "calc(100vh - 210px)", overflowY: "auto", marginTop: 12 };
const summaryRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const entryRowStyle: CSSProperties = { padding: "10px 0", borderBottom: "1px solid #F1F5F9" };
const entryGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end", marginTop: 6 };
const smallLabelStyle: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em", textTransform: "uppercase" };
const valueStyle: CSSProperties = { fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: 14, flexWrap: "wrap" };
const reportCardStyle: CSSProperties = {
  border: "1px solid #BBF7D0",
  background: "#F0FDF4",
  borderRadius: 12,
  padding: 14,
  marginTop: 12,
};

type SessionState = {
  readonly cycleCount: CycleCount | null;
  readonly loading: boolean;
  readonly error: string | null;
};

function toInputValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function CycleCountSessionDrawer({
  cycleCountId,
  context,
  itemById,
  canManage,
  onClose,
  onChanged,
}: {
  readonly cycleCountId: string;
  readonly context: InventoryApiContext;
  readonly itemById: ReadonlyMap<string, InventoryItem>;
  readonly canManage: boolean;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  const [state, setState] = useState<SessionState>({ cycleCount: null, loading: false, error: null });
  const [entries, setEntries] = useState<CycleCountEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [report, setReport] = useState<VarianceReport | null>(null);
  const [pendingAction, setPendingAction] = useState<"close" | "cancel" | null>(null);
  const [working, setWorking] = useState(false);

  const seedEntries = useCallback((cc: CycleCount | null) => {
    const nextEntries = cc?.entries ?? [];
    setEntries(nextEntries);
    setDrafts(Object.fromEntries(nextEntries.map((entry) => [entry.id, toInputValue(entry.countedQuantity)])));
  }, []);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const cc = await getCycleCount(context, cycleCountId);
      setState({ cycleCount: cc, loading: false, error: null });
      seedEntries(cc);
    } catch {
      setState({ cycleCount: null, loading: false, error: "Não foi possível carregar a contagem." });
    }
  }, [context, cycleCountId, seedEntries]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycleCount = state.cycleCount;
  const editable = cycleCount ? isCycleCountEditable(cycleCount.status) : false;
  const canEdit = editable && canManage && !report;

  const countedTotal = useMemo(() => entries.filter((entry) => entry.countedQuantity !== null).length, [entries]);

  async function commitEntry(entry: CycleCountEntry) {
    if (!canEdit) return;
    const parsed = parsePtBrNumber(drafts[entry.id] ?? "");
    if (parsed === undefined) return; // vazio/ inválido → ignora (mantém estado)
    if (entry.countedQuantity !== null && parsed === entry.countedQuantity) return; // sem mudança

    setBusyEntryId(entry.id);
    setActionError(null);
    try {
      const updated = await updateCycleCountEntry(context, cycleCountId, entry.id, parsed);
      setEntries((prev) =>
        prev.map((current) => {
          if (current.id !== entry.id) return current;
          if (updated) return { ...current, ...updated };
          return { ...current, countedQuantity: parsed, variance: computeVariance(current.systemQuantity, parsed) };
        }),
      );
    } catch (error) {
      setActionError(interpretCycleCountError(error).message);
    } finally {
      setBusyEntryId(null);
    }
  }

  async function confirmClose() {
    setWorking(true);
    setActionError(null);
    try {
      const result = await closeCycleCount(context, cycleCountId);
      setState((prev) => ({ ...prev, cycleCount: result.cycleCount }));
      if (result.cycleCount.entries.length > 0) seedEntries(result.cycleCount);
      setReport(result.report);
      setPendingAction(null);
      onChanged();
    } catch (error) {
      setActionError(interpretCycleCountError(error).message);
    } finally {
      setWorking(false);
    }
  }

  async function confirmCancel() {
    setWorking(true);
    setActionError(null);
    try {
      const cc = await cancelCycleCount(context, cycleCountId);
      if (cc) {
        setState((prev) => ({ ...prev, cycleCount: cc }));
        seedEntries(cc);
      }
      setPendingAction(null);
      onChanged();
    } catch (error) {
      setActionError(interpretCycleCountError(error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Drawer title="Contagem cíclica" open onClose={onClose}>
      {/* estado: carregando */}
      {state.loading && !cycleCount ? <Skeleton lines={6} /> : null}

      {/* estado: erro ao carregar (com retry) */}
      {state.error ? (
        <Alert title="Não foi possível carregar a contagem" tone="warning">
          {state.error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {cycleCount ? (
        <>
          <div style={summaryRowStyle}>
            <Chip tone={getCycleCountStatusTone(cycleCount.status)}>{getCycleCountStatusLabel(cycleCount.status)}</Chip>
            <Chip tone="default">Classe {getCycleCountClassLabel(cycleCount.abcClass)}</Chip>
            <span style={mutedStyle}>
              {countedTotal}/{entries.length} contados
            </span>
          </div>

          {!editable && !report ? (
            <p style={{ ...mutedStyle, display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={14} aria-hidden /> Contagem {getCycleCountStatusLabel(cycleCount.status).toLowerCase()} — somente leitura.
            </p>
          ) : null}

          {actionError ? (
            <Alert title="Ação não concluída" tone="danger">
              {actionError}
            </Alert>
          ) : null}

          {/* relatório de variância (após fechar) */}
          {report ? (
            <div style={reportCardStyle} role="status">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={18} style={{ color: POSITIVE_QTY_COLOR }} aria-hidden />
                <strong style={{ fontSize: 14 }}>Relatório de variância</strong>
              </div>
              {report.lines.length === 0 ? (
                <p style={mutedStyle}>Nenhuma variância — os saldos contados conferem com o sistema.</p>
              ) : (
                <div>
                  {report.lines.map((line) => {
                    const item = itemById.get(line.itemId);
                    return (
                      <div key={line.entryId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", fontSize: 13 }}>
                        <span>{item ? `${item.sku} — ${item.name}` : line.itemId}</span>
                        <strong style={{ color: line.variance >= 0 ? POSITIVE_QTY_COLOR : NEGATIVE_QTY_COLOR, fontVariantNumeric: "tabular-nums" }}>
                          {formatSignedQuantity(line.variance, item?.unit)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #BBF7D0", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>Variância total</span>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatSignedQuantity(report.totalVariance)}</strong>
              </div>
              <p style={{ ...mutedStyle, marginTop: 4 }}>{report.adjustmentsGenerated.toLocaleString("pt-BR")} ajuste(s) gerado(s).</p>
            </div>
          ) : null}

          {/* estado: vazio (sem itens na sessão) */}
          {!state.loading && entries.length === 0 ? (
            <EmptyState title="Sessão sem itens" detail="Nenhum item foi fotografado para esta classe. Cancele a contagem e abra outra." />
          ) : null}

          {/* entradas da sessão */}
          {entries.length > 0 ? (
            <div style={scrollAreaStyle}>
              {entries.map((entry) => {
                const item = itemById.get(entry.itemId);
                const variance = entry.variance;
                return (
                  <div key={entry.id} style={entryRowStyle}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                      {item?.name ?? entry.itemId}
                      {item ? <span style={{ ...mutedStyle, fontFamily: mono, marginLeft: 6 }}>{item.sku}</span> : null}
                    </div>
                    <div style={entryGridStyle}>
                      <div>
                        <div style={smallLabelStyle}>Sistema</div>
                        <div style={valueStyle}>{formatQuantity(entry.systemQuantity, item?.unit)}</div>
                      </div>
                      <div>
                        <label htmlFor={`cc-entry-${entry.id}`} style={smallLabelStyle}>
                          Contado
                        </label>
                        {canEdit ? (
                          <input
                            id={`cc-entry-${entry.id}`}
                            className="ui-input"
                            style={inputStyle}
                            inputMode="decimal"
                            maxLength={16}
                            defaultValue={drafts[entry.id] ?? ""}
                            aria-label={`Quantidade contada de ${item?.sku ?? entry.itemId}`}
                            disabled={busyEntryId === entry.id}
                            onChange={(event) => setDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                            onBlur={() => void commitEntry(entry)}
                          />
                        ) : (
                          <div style={valueStyle}>{entry.countedQuantity !== null ? formatQuantity(entry.countedQuantity, item?.unit) : "—"}</div>
                        )}
                      </div>
                      <div>
                        <div style={smallLabelStyle}>Variância</div>
                        <div
                          style={{
                            ...valueStyle,
                            color: variance === null ? "#94A3B8" : variance >= 0 ? POSITIVE_QTY_COLOR : NEGATIVE_QTY_COLOR,
                          }}
                        >
                          {variance === null ? "—" : formatSignedQuantity(variance, item?.unit)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* ações (só quando editável e com permissão) */}
          {canEdit ? (
            pendingAction ? (
              <div style={{ ...footerStyle, alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ ...mutedStyle, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={14} aria-hidden />
                  {pendingAction === "close"
                    ? "Fechar gera os ajustes das variâncias. Confirmar?"
                    : "Cancelar descarta a contagem sem gerar ajustes. Confirmar?"}
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPendingAction(null)} disabled={working}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={pendingAction === "cancel" ? "danger" : "primary"}
                    onClick={() => void (pendingAction === "close" ? confirmClose() : confirmCancel())}
                    disabled={working}
                  >
                    {working ? "Processando…" : pendingAction === "close" ? "Confirmar fechamento" : "Confirmar cancelamento"}
                  </Button>
                </span>
              </div>
            ) : (
              <div style={footerStyle}>
                <Button type="button" variant="ghost" onClick={() => setPendingAction("cancel")}>
                  Cancelar contagem
                </Button>
                <Button type="button" onClick={() => setPendingAction("close")}>
                  <CheckCircle2 size={15} aria-hidden /> Fechar contagem
                </Button>
              </div>
            )
          ) : null}
        </>
      ) : null}
    </Drawer>
  );
}
