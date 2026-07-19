import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";

import { TrendChart } from "../charts";
import type { KpiDetail } from "./kpi-detail.types";

// WS-UI-CARDS+CHARTS — pop-up "sobre o tema do card". Dialog a11y-completo (o Modal genérico do DS é
// incompleto): focus trap, Esc, clique no backdrop, retorno de foco ao card que abriu, aria-labelledby.
// Renderiza o corpo por variante (chart|breakdown|explain) — nunca fabrica série.

const SOURCE_LABEL: Record<NonNullable<KpiDetail["source"]>, string | null> = {
  api: null,
  mock: "Dados de exemplo",
  fallback: "Não foi possível consultar — exibindo o último dado local",
};

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function KpiDetailModal({ detail, open, onClose }: { detail: KpiDetail | null; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = focusableWithin(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    // Foca o primeiro elemento do dialog após montar.
    const id = window.setTimeout(() => {
      const focusables = focusableWithin(dialogRef.current);
      (focusables[0] ?? dialogRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      // Devolve o foco ao card que abriu (senão o teclado "cai no topo").
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open || !detail) return null;

  const sourceNote = detail.source ? SOURCE_LABEL[detail.source] : null;

  return (
    <div className="ui-overlay ui-overlay--center kpi-detail-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="ui-modal kpi-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{ maxWidth: 460, width: "100%" }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <h2 id={titleId} style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0 }}>{detail.title}</h2>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{detail.value}</div>
            {detail.caption ? <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{detail.caption}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 4, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </header>

        {sourceNote ? (
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#a96b00", background: "#FEF9EC", border: "1px solid #F5E6C8", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>
            {sourceNote}
          </div>
        ) : null}

        <KpiDetailBodyView detail={detail} suppressChart={detail.source === "mock" || detail.source === "fallback"} />

        {detail.cta ? (
          <div style={{ marginTop: 16 }}>
            <Link to={detail.cta.to} onClick={onClose} className="ui-button ui-button--secondary" style={{ textDecoration: "none" }}>
              {detail.cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KpiDetailBodyView({ detail, suppressChart }: { detail: KpiDetail; suppressChart: boolean }) {
  const body = detail.body;

  // Fonte não-confiável (mock/fallback) → suprime o gráfico e explica (coerente com D-007).
  if (body.kind === "chart" && suppressChart) {
    return <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: 0 }}>A série temporal fica indisponível enquanto os dados não vêm do servidor.</p>;
  }

  if (body.kind === "chart") {
    return (
      <TrendChart
        series={body.series}
        labels={body.labels}
        type={body.chartType ?? "bar"}
        height={140}
        valueFormat={body.valueFormat}
        showLegend={body.series.length > 1}
      />
    );
  }

  if (body.kind === "breakdown") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {body.parts.map((part) => (
          <div key={part.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{part.label}</span>
              {part.hint ? <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{part.hint}</div> : null}
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: toneColor(part.tone), whiteSpace: "nowrap" }}>{part.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: 0 }}>{body.text}</p>;
}

function toneColor(tone?: string): string {
  switch (tone) {
    case "success": return "#1f8a5b";
    case "warning": return "#a96b00";
    case "danger": return "#DC2626";
    case "info": return "#206bc4";
    case "pending": return "#7652b7";
    default: return "#0F172A";
  }
}
