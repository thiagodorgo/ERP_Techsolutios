import { Filter, Search } from "lucide-react";
import type { CSSProperties } from "react";

// Renderizador genérico de "tela de lista" — espelha o template do protótipo
// (ERP Web.dc.html · isTablePage). Usado por Relatórios, Usuários, Auditoria,
// Operadores de Campo, Faturas, Pagamentos.

// Paleta de chips (mesma do protótipo): [bg, cor de texto].
export const CH = {
  ok: { bg: "#ECFDF5", color: "#059669" },
  warn: { bg: "#FFFBEB", color: "#D97706" },
  err: { bg: "#FEF2F2", color: "#DC2626" },
  info: { bg: "#EFF6FF", color: "#2563EB" },
  purple: { bg: "#F5F3FF", color: "#7C3AED" },
  gray: { bg: "#F1F5F9", color: "#475569" },
} as const;

export type TableKpi = { label: string; value: string; color?: string };
export type TableCol = { label: string; flex?: number };

export type TableCell =
  | { kind: "strong"; text: string; flex?: number }
  | { kind: "text"; text: string; flex?: number }
  | { kind: "mono"; text: string; flex?: number }
  | { kind: "two"; text: string; sub: string; flex?: number }
  | { kind: "chip"; text: string; bg: string; color: string; flex?: number };

export type TableRow = { cells: TableCell[]; onClick?: () => void };

export type TablePageProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
  kpis: TableKpi[];
  columns: TableCol[];
  rows: TableRow[];
  searchPlaceholder?: string;
};

const RIGHT_ALIGNED = new Set(["STATUS", "SEVERIDADE", "RESULTADO", "AÇÃO"]);

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" };
const colLabel: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" };

function Cell({ cell }: { cell: TableCell }) {
  switch (cell.kind) {
    case "strong":
      return <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{cell.text}</span>;
    case "text":
      return <span style={{ fontSize: 13, color: "#475569" }}>{cell.text}</span>;
    case "mono":
      return <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{cell.text}</span>;
    case "two":
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell.text}</div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell.sub}</div>
        </div>
      );
    case "chip":
      return <span style={{ background: cell.bg, color: cell.color, fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 99, whiteSpace: "nowrap" }}>{cell.text}</span>;
  }
}

export function TablePage({ title, subtitle, actionLabel, onAction, kpis, columns, rows, searchPlaceholder = "Buscar…" }: TablePageProps) {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{title}</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" style={{ padding: "9px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>
            Exportar
          </button>
          <button type="button" onClick={onAction} style={{ padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            {actionLabel}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 15 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color ?? "#0F172A", whiteSpace: "nowrap" }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* table */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, width: 300, padding: "8px 12px", background: "#F1F5F9", borderRadius: 9 }}>
            <Search size={15} style={{ color: "#94A3B8" }} />
            <span style={{ fontSize: 13, color: "#94A3B8" }}>{searchPlaceholder}</span>
          </div>
          <button type="button" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
            <Filter size={14} />Filtros
          </button>
        </div>

        <div style={{ display: "flex", padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
          {columns.map((c) => (
            <span key={c.label} style={{ ...colLabel, flex: c.flex ?? 1, textAlign: RIGHT_ALIGNED.has(c.label) ? "right" : "left" }}>{c.label}</span>
          ))}
        </div>

        {rows.map((r, i) => (
          <div
            key={i}
            onClick={r.onClick}
            className="rowh"
            style={{ display: "flex", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid #F1F5F9", cursor: r.onClick ? "pointer" : "default" }}
          >
            {r.cells.map((cell, j) => (
              <div key={j} style={{ flex: cell.flex ?? 1, display: "flex", justifyContent: cell.kind === "chip" ? "flex-end" : "flex-start", minWidth: 0 }}>
                <Cell cell={cell} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TablePage;
