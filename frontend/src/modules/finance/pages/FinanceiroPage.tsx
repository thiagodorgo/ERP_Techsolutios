import { AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import type { CSSProperties, ComponentType } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useTenantContext } from "../../../providers/TenantProvider";
import {
  formatBRL,
  formatCompactBRL,
  formatDueDate,
  getDirectionLabel,
  getTitleStatusLabel,
  getTitleStatusTone,
} from "../titles/financial-titles.adapter";
import type { FinancialTitleDirection, FinancialTitleStatus } from "../titles/financial-titles.types";
import { useFinancialSummary } from "../dashboard/useFinancialSummary";
import type { RecentTitle } from "../dashboard/financial-summary.types";

// "Financeiro" (sc_financeiro). Alvo: screen-refs/web/financeiro.png. Ω4-8b — dados REAIS de GET
// /financial-summary (agregados somados no backend; o front nunca soma). D-007: sem dados → vazio honesto.

type IconType = ComponentType<{ size?: number }>;
type KpiTone = { iconBg: string; iconColor: string };

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const gridCols = "2fr 1fr 1fr 1.2fr";
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const TONE_RECEIVABLE: KpiTone = { iconBg: "#ECFDF5", iconColor: "#059669" };
const TONE_PAYABLE: KpiTone = { iconBg: "#FEF2F2", iconColor: "#DC2626" };
const TONE_CASH: KpiTone = { iconBg: "#EFF6FF", iconColor: "#2563EB" };
const TONE_OVERDUE: KpiTone = { iconBg: "#FFFBEB", iconColor: "#D97706" };

function monthLabel(competencia: string): string {
  const month = Number(competencia.split("-")[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? MONTHS_SHORT[month - 1] : competencia;
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}

export function FinanceiroPage() {
  const { activeContext } = useTenantContext();
  const { data, loading, refresh } = useFinancialSummary();
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const { receivable, payable, cash, cashFlow, recentTitles } = data;

  const kpis: Array<{ label: string; value: string; sub: string; Icon: IconType; tone: KpiTone }> = [
    {
      label: "A receber (aberto)",
      value: formatCompactBRL(receivable.openAmount),
      sub: `${receivable.openCount} ${receivable.openCount === 1 ? "título" : "títulos"}`,
      Icon: ArrowUpRight,
      tone: TONE_RECEIVABLE,
    },
    {
      label: "A pagar (aberto)",
      value: formatCompactBRL(payable.openAmount),
      sub: `${payable.openCount} ${payable.openCount === 1 ? "título" : "títulos"}`,
      Icon: ArrowDownRight,
      tone: TONE_PAYABLE,
    },
    {
      label: "Saldo em caixa",
      value: formatCompactBRL(cash.totalBalance),
      sub: `${cash.accountCount} ${cash.accountCount === 1 ? "conta" : "contas"}`,
      Icon: Wallet,
      tone: TONE_CASH,
    },
    {
      label: "Inadimplência",
      value: percent(receivable.overdueAmount, receivable.openAmount),
      sub: `${formatCompactBRL(receivable.overdueAmount)} vencido`,
      Icon: AlertTriangle,
      tone: TONE_OVERDUE,
    },
  ];

  const chartMax = Math.max(1, ...cashFlow.flatMap((point) => [point.inflow, point.outflow]));

  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Financeiro</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Contas a pagar e receber · fluxo de caixa</div>
        </div>
      </div>

      {data.source === "fallback" && (
        <div role="alert" style={{ ...card, borderColor: "#FED7AA", background: "#FFF7ED", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#9A3412", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} />
          {data.fallbackReason ?? "Não foi possível consultar o resumo financeiro."}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: k.tone.iconBg, color: k.tone.iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <k.Icon size={20} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", whiteSpace: "nowrap" }}>{loading ? "—" : k.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 1 }}>{k.label}</div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 5 }}>{loading ? "carregando…" : k.sub}</div>
          </div>
        ))}
      </div>

      {/* chart + table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
        {/* fluxo de caixa */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Fluxo de caixa</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Entradas vs saídas · 6 meses</div>
          {cashFlow.length === 0 ? (
            <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "#94A3B8" }}>
              {loading ? "Carregando…" : "Sem lançamentos no período."}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, height: 150 }}>
              {cashFlow.map((point) => (
                <div key={point.competencia} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: "100%", justifyContent: "center" }}>
                    <div title={`Entradas ${formatBRL(point.inflow)}`} style={{ width: "40%", background: "#10B981", borderRadius: "3px 3px 0 0", height: `${(point.inflow / chartMax) * 100}%` }} />
                    <div title={`Saídas ${formatBRL(point.outflow)}`} style={{ width: "40%", background: "#F87171", borderRadius: "3px 3px 0 0", height: `${(point.outflow / chartMax) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{monthLabel(point.competencia)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#10B981" }} />Entradas</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#F87171" }} />Saídas</span>
          </div>
        </div>

        {/* títulos recentes */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Títulos recentes</div>
          <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
            <span>PARTE</span>
            <span>VALOR</span>
            <span>VENC.</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>
          {recentTitles.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
              {loading ? "Carregando…" : "Nenhum título recente."}
            </div>
          ) : (
            recentTitles.map((title) => <RecentTitleRow key={title.id} title={title} />)
          )}
        </div>
      </div>
    </div>
  );
}

function RecentTitleRow({ title }: { title: RecentTitle }) {
  const tone = title.overdue
    ? { bg: "#FEF2F2", color: "#DC2626" }
    : getTitleStatusTone(title.status as FinancialTitleStatus);
  const statusText = title.overdue ? "Vencido" : getTitleStatusLabel(title.status as FinancialTitleStatus);
  return (
    <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "12px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{title.partyName}</div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>{getDirectionLabel(title.direction as FinancialTitleDirection)}</div>
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{formatBRL(title.amount)}</span>
      <span style={{ fontSize: 12.5, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{formatDueDate(title.dueDate)}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{statusText}</span>
      </span>
    </div>
  );
}

export default FinanceiroPage;
