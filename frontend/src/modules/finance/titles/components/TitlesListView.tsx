import { AlertTriangle, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { ApiError } from "../../../../services/api/client";
import {
  canCreateTitle,
  computeTitleKpis,
  formatBRL,
  formatCompactBRL,
  formatDueDate,
  getPartyColumnLabel,
  getTitleStatusLabel,
  getTitleStatusTone,
} from "../financial-titles.adapter";
import { changeFinancialTitleStatus } from "../financial-titles.service";
import type {
  FinancialTitle,
  FinancialTitleDirection,
  FinancialTitleStatus,
  FinancialTitleStatusTarget,
} from "../financial-titles.types";
import { useFinancialTitles } from "../useFinancialTitles";
import { TitleFormModal } from "./TitleFormModal";
import { TitleOverdueBadge } from "./TitleOverdueBadge";
import { TitleRowActions } from "./TitleRowActions";

// Ω4-2b — view compartilhada de Títulos financeiros, parametrizada por direction. Cobranças (receivable) e
// Pagamentos (payable) são espelho: mesma grade/estados; os rótulos PT-BR (Cliente vs Fornecedor; Nova
// cobrança vs Agendar pagamento) e os KPIs/tabs mudam por direção. Dados REAIS do backend financial-titles
// (Ω4-2a). KPIs SOMADOS dos dados (o front nunca inventa número). §3/§11.2: sem enum cru/UUID/competência crua.

type TabKey = "all" | "open" | "scheduled" | "overdue" | "paid" | "in_dispute";
type Tab = { key: TabKey; label: string; match: (title: FinancialTitle) => boolean };

const TABS: Record<FinancialTitleDirection, Tab[]> = {
  receivable: [
    { key: "all", label: "Todas", match: () => true },
    { key: "open", label: "Em aberto", match: (t) => t.status === "open" },
    { key: "overdue", label: "Vencidas", match: (t) => t.overdue },
    { key: "paid", label: "Recebidas", match: (t) => t.status === "paid" },
    { key: "in_dispute", label: "Em contestação", match: (t) => t.status === "in_dispute" },
  ],
  payable: [
    { key: "all", label: "Todas", match: () => true },
    { key: "open", label: "A pagar", match: (t) => t.status === "open" },
    { key: "scheduled", label: "Agendados", match: (t) => t.status === "scheduled" },
    { key: "overdue", label: "Vencendo", match: (t) => t.overdue },
    { key: "paid", label: "Pagos", match: (t) => t.status === "paid" },
  ],
};

type Copy = { title: string; subtitle: string; primary: string; docHeader: string };
const COPY: Record<FinancialTitleDirection, Copy> = {
  receivable: {
    title: "Cobranças",
    subtitle: "cobranças a clientes, vencimentos e adimplência",
    primary: "Nova cobrança",
    docHeader: "COBRANÇA",
  },
  payable: {
    title: "Pagamentos",
    subtitle: "contas a pagar, agendamentos e fluxo de saída",
    primary: "Agendar pagamento",
    docHeader: "DOC",
  },
};

type KpiSpec = { label: string; color: string; value: number };

function buildKpis(direction: FinancialTitleDirection, items: readonly FinancialTitle[], now?: number): KpiSpec[] {
  const k = computeTitleKpis(items, now);
  if (direction === "receivable") {
    return [
      { label: "Em aberto", color: "#2563EB", value: k.open },
      { label: "Vencidas", color: "#DC2626", value: k.overdue },
      { label: "Recebidas (mês)", color: "#059669", value: k.settledThisMonth },
      { label: "Em contestação", color: "#D97706", value: k.inDispute },
    ];
  }
  return [
    { label: "A pagar", color: "#2563EB", value: k.open },
    { label: "Agendados", color: "#7C3AED", value: k.scheduled },
    { label: "Pagos (mês)", color: "#059669", value: k.settledThisMonth },
    { label: "Vencendo", color: "#D97706", value: k.overdue },
  ];
}

const GRID = "1fr 1.9fr 1fr 0.9fr 1fr 1.1fr 0.7fr";
const th: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function TitlesListView({ direction }: { direction: FinancialTitleDirection }) {
  const copy = COPY[direction];
  const { permissions } = usePermissions();
  const { items, pagination, loading, source, fallbackReason, refresh, context } = useFinancialTitles(direction);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(context.tenantId) });

  const [tab, setTab] = useState<TabKey>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [cancelTarget, setCancelTarget] = useState<FinancialTitle | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canCreate = canCreateTitle(permissions);
  const kpis = useMemo(() => buildKpis(direction, items), [direction, items]);
  const tabs = TABS[direction];
  const activeMatch = (tabs.find((t) => t.key === tab) ?? tabs[0]).match;
  const rows = items.filter(activeMatch);

  // Retorna null no sucesso, ou a mensagem de erro (para quem chamou decidir ONDE mostrar — na linha ou no
  // modal de cancelamento). Assim a razão real da falha não fica presa numa linha atrás do modal (pós-análise M4).
  const applyStatus = useCallback(
    async (title: FinancialTitle, target: FinancialTitleStatusTarget, reason?: string): Promise<string | null> => {
      setRowBusy((map) => ({ ...map, [title.id]: true }));
      setRowError((map) => ({ ...map, [title.id]: null }));
      try {
        await changeFinancialTitleStatus(context, title.id, reason ? { status: target, reason } : { status: target });
        await refresh();
        return null;
      } catch (error) {
        const message = error instanceof ApiError ? error.safeMessage : "Não foi possível atualizar o status.";
        setRowError((map) => ({ ...map, [title.id]: message }));
        return message;
      } finally {
        setRowBusy((map) => ({ ...map, [title.id]: false }));
      }
    },
    [context, refresh],
  );

  const handleSelect = useCallback(
    (title: FinancialTitle, target: FinancialTitleStatusTarget) => {
      if (target === "cancelled") {
        setCancelReason("");
        setCancelError(null);
        setCancelTarget(title);
        return;
      }
      void applyStatus(title, target);
    },
    [applyStatus],
  );

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    const error = await applyStatus(cancelTarget, "cancelled", cancelReason.trim() || undefined);
    setCancelBusy(false);
    if (error) setCancelError(error); // a razão REAL do backend, no modal que o usuário está olhando
    else setCancelTarget(null);
  }, [applyStatus, cancelReason, cancelTarget]);

  return (
    <div style={{ color: "#0F172A" }}>
      {/* page header — título + subtítulo + ações à direita */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>{copy.title}</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>{copy.subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canCreate ? (
            <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={14} aria-hidden /> {copy.primary}
            </button>
          ) : null}
        </div>
      </div>

      {/* KPIs computados dos dados reais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, letterSpacing: "-.4px" }} title={formatBRL(kpi.value)}>
              {formatCompactBRL(kpi.value)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginTop: 3 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {source === "fallback" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#92400E" }}>
          <AlertTriangle size={14} aria-hidden /> {fallbackReason ?? "Sem conexão com a API."}
        </div>
      ) : null}

      {/* Honestidade (pós-análise): os KPIs/tabs somam sobre as linhas carregadas. Se a base tem mais que o
          carregado, avisa — o headline financeiro NUNCA se apresenta como total sem ressalva (P-Ω4-2B-KPI-AGREGADO). */}
      {pagination.total > items.length ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#1E40AF" }}>
          <AlertTriangle size={14} aria-hidden /> Somando os {items.length} títulos carregados de {pagination.total}. Os totais podem não refletir toda a base.
        </div>
      ) : null}

      {/* tab bar */}
      <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 4, marginBottom: 18, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ padding: "7px 16px", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: active ? "#2563EB" : "transparent", color: active ? "#fff" : "#64748B" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
          <span style={th}>{copy.docHeader}</span>
          <span style={th}>{getPartyColumnLabel(direction).toUpperCase()}</span>
          <span style={th}>VALOR</span>
          <span style={th}>VENC.</span>
          <span style={th}>CATEGORIA</span>
          <span style={th}>STATUS</span>
          <span style={{ ...th, textAlign: "right" }}>AÇÃO</span>
        </div>

        {loading ? (
          [0, 1, 2, 3].map((row) => (
            <div key={row} style={{ display: "grid", gridTemplateColumns: GRID, padding: "13px 18px", borderBottom: "1px solid #F8FAFC", gap: 8, alignItems: "center" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                <div key={cell} style={{ height: 12, background: "#F1F5F9", borderRadius: 6 }} />
              ))}
            </div>
          ))
        ) : rows.length === 0 ? (
          <div style={{ padding: "48px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              {direction === "receivable" ? "Nenhuma cobrança" : "Nenhum pagamento"}
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>
              {tab !== "all"
                ? "Ajuste o filtro para ver outros títulos."
                : direction === "receivable"
                  ? "Os títulos a receber da sua organização aparecem aqui."
                  : "Os títulos a pagar da sua organização aparecem aqui."}
            </div>
          </div>
        ) : (
          rows.map((title) => {
            const tone = getTitleStatusTone(title.status);
            return (
              <div key={title.id} style={{ display: "grid", gridTemplateColumns: GRID, padding: "13px 18px", borderBottom: "1px solid #F8FAFC", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: title.document ? "#2563EB" : "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                  {title.document ?? "—"}
                </span>
                <span style={{ fontSize: 13, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title.partyName}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{formatBRL(title.amount)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: title.overdue ? "#DC2626" : "#475569", fontWeight: title.overdue ? 700 : 500, fontFamily: "'JetBrains Mono', monospace" }}>{formatDueDate(title.dueDate)}</span>
                  <TitleOverdueBadge overdue={title.overdue} dueDate={title.dueDate} />
                </span>
                <span style={{ fontSize: 12, color: title.category ? "#475569" : "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title.category ?? "—"}</span>
                <span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: tone.bg, color: tone.color, whiteSpace: "nowrap" }}>
                    {getTitleStatusLabel(title.status)}
                  </span>
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <TitleRowActions
                    status={title.status as FinancialTitleStatus}
                    permissions={permissions}
                    busy={rowBusy[title.id] ?? false}
                    error={rowError[title.id] ?? null}
                    onSelect={(target) => handleSelect(title, target)}
                  />
                </span>
              </div>
            );
          })
        )}
      </div>

      {showCreate ? (
        <TitleFormModal
          direction={direction}
          context={context}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      ) : null}

      {cancelTarget ? (
        <TitleCancelPrompt
          partyName={cancelTarget.partyName}
          reason={cancelReason}
          submitting={cancelBusy}
          error={cancelError}
          onReasonChange={setCancelReason}
          onConfirm={() => void confirmCancel()}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
}

// Confirmação protegida do cancelamento (destrutivo/terminal). Motivo é OPCIONAL (o backend aceita `reason?`).
function TitleCancelPrompt({
  partyName,
  reason,
  submitting,
  error,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  partyName: string;
  reason: string;
  submitting: boolean;
  error: string | null;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cancelar título"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}
    >
      <div onClick={(event) => event.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(15,23,42,.24)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Cancelar título?</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>
            O título de <strong>{partyName}</strong> será cancelado. Esta ação é definitiva.
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "14px 0 5px", display: "block" }} htmlFor="title-cancel-reason">
            Motivo (opcional)
          </label>
          <textarea
            id="title-cancel-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Ex.: título duplicado"
            style={{ width: "100%", minHeight: 64, padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          />
          {error ? <div role="alert" style={{ fontSize: 12, color: "#B91C1C", fontWeight: 600, marginTop: 8 }}>{error}</div> : null}
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "9px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
            Voltar
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} style={{ padding: "9px 16px", background: submitting ? "#FCA5A5" : "#DC2626", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: submitting ? "default" : "pointer", fontFamily: "inherit" }}>
            {submitting ? "Cancelando…" : "Cancelar título"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitlesListView;
