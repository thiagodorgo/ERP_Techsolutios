import type { CSSProperties } from "react";

import { isWorkOrderDelayed } from "../work-orders-row.logic";
import type { WorkOrderStatus } from "../work-orders.types";

// Ω3F-9 (D-Ω3F-9-BADGE) — selo de atraso DERIVADO de scheduled_for × status (sem campo de prazo real —
// P-Ω3F-9-SLA-FIELD). Reintroduz o sinal de SLA que o React havia perdido ao dropar a coluna do protótipo.
// Nunca mostra "Xh restantes" (exigiria deadline real). Sem termo técnico/UUID/coordenada.

const TONE: Record<"warn" | "critical", { bg: string; color: string }> = {
  warn: { bg: "#FFFBEB", color: "#D97706" },
  critical: { bg: "#FEF2F2", color: "#DC2626" },
};

export function WorkOrderDelayBadge({
  scheduledFor,
  status,
  now,
}: {
  scheduledFor?: string | null;
  status: WorkOrderStatus;
  now?: number;
}) {
  const { delayed, severity } = isWorkOrderDelayed(scheduledFor, status, now);
  if (!delayed || !severity) return null;

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
  // aria distingue crítico de atraso fresco (cor sozinha não basta — WCAG 1.4.1: leitor de tela/daltônico).
  const label = severity === "critical" ? "Ordem de serviço atrasada há mais de um dia" : "Ordem de serviço atrasada";
  return (
    <span style={style} aria-label={label}>
      Atrasada
    </span>
  );
}

export default WorkOrderDelayBadge;
