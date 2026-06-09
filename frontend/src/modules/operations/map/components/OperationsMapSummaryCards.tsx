import { Activity, AlertTriangle, Clock, LocateFixed, Navigation, UserRound } from "lucide-react";

import { Card, Chip } from "../../../../components/ui";
import type { OperationsMapSummary } from "../operations-map.types";

export function OperationsMapSummaryCards({ summary }: { summary: OperationsMapSummary }) {
  const cards = [
    { label: "Operadores com localização", value: summary.total, tone: "info" as const, icon: UserRound },
    { label: "Disponíveis", value: summary.available, tone: "success" as const, icon: LocateFixed },
    { label: "Em deslocamento", value: summary.onRoute, tone: "info" as const, icon: Navigation },
    { label: "Em atendimento", value: summary.inService, tone: "pending" as const, icon: Activity },
    { label: "Localizações antigas", value: summary.stale, tone: summary.stale ? "warning" as const : "success" as const, icon: Clock },
    { label: "Offline/bloqueados", value: summary.offlineOrBlocked, tone: summary.offlineOrBlocked ? "danger" as const : "success" as const, icon: AlertTriangle },
  ];

  return (
    <div className="operations-map-kpis">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label}>
            <div className="operations-map-kpi">
              <Icon size={18} />
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <Chip tone={card.tone}>agora</Chip>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
