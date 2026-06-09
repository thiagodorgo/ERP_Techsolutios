import { AlertTriangle, CheckCircle2, Circle, ClipboardList, Clock, UserRound, XCircle } from "lucide-react";

import { Card } from "../../../components/ui";
import type { WorkOrdersSummary } from "../work-orders.types";

const cards = [
  { key: "total", label: "Total de OS", icon: ClipboardList },
  { key: "open", label: "Abertas", icon: Circle },
  { key: "assigned", label: "Atribuidas", icon: UserRound },
  { key: "inService", label: "Em atendimento", icon: Clock },
  { key: "completed", label: "Concluidas", icon: CheckCircle2 },
  { key: "cancelled", label: "Canceladas", icon: XCircle },
  { key: "urgent", label: "Urgentes", icon: AlertTriangle },
] as const;

export function WorkOrdersSummaryCards({ summary }: { readonly summary: WorkOrdersSummary }) {
  return (
    <section className="work-orders-kpis">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <div className="work-orders-kpi">
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
