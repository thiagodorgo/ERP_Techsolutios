import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Route, UserRound, XCircle } from "lucide-react";

import { ClickableKpiCard, type KpiSourceTag } from "../../../../components/kpi";
import { Card } from "../../../../components/ui";
import { buildDispatchesKpiDetails } from "../dispatches-kpi-detail";
import type { DispatchesSummary } from "../dispatches.types";

const cards = [
  { key: "total", label: "Total", icon: ClipboardList },
  { key: "assigned", label: "Atribuidos", icon: UserRound },
  { key: "inRoute", label: "Em rota", icon: Route },
  { key: "inService", label: "Em atendimento", icon: Clock },
  { key: "completed", label: "Concluidos", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelados", icon: XCircle },
  { key: "urgent", label: "Urgentes", icon: AlertTriangle },
] as const;

// WS-CARDS-CHARTS-F2 (PR2a) — cada card abre um pop-up com a composição/participação a partir dos MESMOS
// números já exibidos (D-007). `source` é opcional (só molda o selo do modal; breakdown nunca é suprimido).
export function DispatchesSummaryCards({
  summary,
  source = "api",
}: {
  readonly summary: DispatchesSummary;
  readonly source?: KpiSourceTag;
}) {
  const details = buildDispatchesKpiDetails(summary, source);
  return (
    <section className="work-orders-kpis dispatches-kpis">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <ClickableKpiCard key={card.key} detail={details[card.key]}>
            <Card>
              <div className="work-orders-kpi dispatches-kpi">
                <Icon size={20} />
                <span>{card.label}</span>
                <strong>{summary[card.key]}</strong>
              </div>
            </Card>
          </ClickableKpiCard>
        );
      })}
    </section>
  );
}
