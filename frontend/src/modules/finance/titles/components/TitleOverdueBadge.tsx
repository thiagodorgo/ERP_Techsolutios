import type { CSSProperties } from "react";

import { overdueBadgeSeverity } from "../financial-titles.adapter";

// Ω4-2b — selo de atraso do Título, adaptado do WorkOrderDelayBadge (Ω3F-9). A VISIBILIDADE vem do
// `overdue` DERIVADO pelo backend (a UI não recalcula vencido); a SEVERIDADE (cor) é apresentação:
// âmbar por padrão, vermelho quando muito vencida. aria distingue o crítico (WCAG 1.4.1: cor não basta).

const TONE = {
  warn: { bg: "#FFFBEB", color: "#D97706" },
  critical: { bg: "#FEF2F2", color: "#DC2626" },
} as const;

export function TitleOverdueBadge({
  overdue,
  dueDate,
  now,
}: {
  overdue: boolean;
  dueDate: string | null | undefined;
  now?: number;
}) {
  const severity = overdueBadgeSeverity(overdue, dueDate, now);
  if (!severity) return null;

  const tone = TONE[severity];
  const style: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 99,
    background: tone.bg,
    color: tone.color,
    whiteSpace: "nowrap",
  };
  const label = severity === "critical" ? "Título vencido há mais de uma semana" : "Título vencido";
  return (
    <span style={style} aria-label={label}>
      Atrasada
    </span>
  );
}

export default TitleOverdueBadge;
