import { Activity, AlertTriangle, Clock, LocateFixed, Navigation, UserRound } from "lucide-react";

import { Card, Chip } from "../../../../components/ui";
import type { FieldLocationStatus, OperationsMapSummary } from "../operations-map.types";

type StatusFilter = FieldLocationStatus | "all";

type KpiCard = {
  readonly label: string;
  readonly value: number;
  readonly tone: "info" | "success" | "pending" | "warning" | "danger";
  readonly icon: typeof UserRound;
  readonly filterStatus?: StatusFilter;
  readonly toggleStale?: boolean;
};

/**
 * Ω1 — faixa de KPIs do Mapa Operacional. Cada card com semântica de filtro vira botão clicável
 * que molda o mapa (status ou "localização antiga"). Sem handlers, permanece informativo.
 */
export function OperationsMapSummaryCards({
  summary,
  activeStatus,
  staleOnly,
  onFilterStatus,
  onToggleStale,
}: {
  summary: OperationsMapSummary;
  activeStatus?: StatusFilter;
  staleOnly?: boolean;
  onFilterStatus?: (status: StatusFilter) => void;
  onToggleStale?: () => void;
}) {
  const interactive = Boolean(onFilterStatus && onToggleStale);
  const cards: readonly KpiCard[] = [
    { label: "Operadores com localização", value: summary.total, tone: "info", icon: UserRound, filterStatus: "all" },
    { label: "Disponíveis", value: summary.available, tone: "success", icon: LocateFixed, filterStatus: "available" },
    { label: "Em deslocamento", value: summary.onRoute, tone: "info", icon: Navigation, filterStatus: "on_route" },
    // "Em atendimento" e "Offline/bloqueados" são contagens COMPOSTAS (in_service+on_site / offline+blocked).
    // O filtro do mapa é de status único, então esses cards ficam informativos — clicá-los aplicaria um
    // recorte mais estreito que o número exibido (contradição pega pela junta Ω1). Filtre pela combo Status.
    { label: "Em atendimento", value: summary.inService, tone: "pending", icon: Activity },
    {
      label: "Localizações antigas",
      value: summary.stale,
      tone: summary.stale ? "warning" : "success",
      icon: Clock,
      toggleStale: true,
    },
    {
      label: "Offline/bloqueados",
      value: summary.offlineOrBlocked,
      tone: summary.offlineOrBlocked ? "danger" : "success",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="operations-map-kpis">
      {cards.map((card) => {
        const Icon = card.icon;
        const cardInteractive = interactive && (card.filterStatus !== undefined || Boolean(card.toggleStale));
        const isActive = card.toggleStale
          ? Boolean(staleOnly)
          : card.filterStatus !== undefined && activeStatus === card.filterStatus && !staleOnly;

        const inner = (
          <div className="operations-map-kpi">
            <Icon size={18} />
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <Chip tone={card.tone}>agora</Chip>
          </div>
        );

        if (!cardInteractive) {
          return <Card key={card.label}>{inner}</Card>;
        }

        const handleClick = () => {
          if (card.toggleStale) {
            onToggleStale?.();
          } else if (card.filterStatus !== undefined) {
            onFilterStatus?.(card.filterStatus);
          }
        };

        return (
          <button
            key={card.label}
            type="button"
            className={`ui-card operations-map-kpi-card ${isActive ? "is-active" : ""}`}
            aria-pressed={isActive}
            onClick={handleClick}
            title={card.toggleStale ? "Filtrar por localização antiga" : `Filtrar por ${card.label.toLowerCase()}`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
