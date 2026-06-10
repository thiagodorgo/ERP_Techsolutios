import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Route, UserRound, XCircle } from "lucide-react";

import { Card } from "../../../../components/ui";
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

export function DispatchesSummaryCards({ summary }: { readonly summary: DispatchesSummary }) {
  return (
    <section className="work-orders-kpis dispatches-kpis">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <div className="work-orders-kpi dispatches-kpi">
              <Icon size={20} />
              <span>{card.label}</span>
              <strong>{summary[card.key]}</strong>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
