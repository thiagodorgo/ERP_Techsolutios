import type { OperationalKpi } from "./types";
import type { WorkOrderListItem, WorkOrdersData } from "../work-orders/work-orders.types";

const OPEN_STATUSES: ReadonlySet<string> = new Set([
  "open",
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
  "paused",
]);

/** KPIs operacionais derivados das OS reais (função pura, testável). */
export function deriveDashboardKpis(data: WorkOrdersData): OperationalKpi[] {
  const items = data.items;
  const open = items.filter((w) => OPEN_STATUSES.has(w.status)).length;
  const critical = items.filter((w) => w.priority === "urgent" || w.priority === "high").length;
  const inProgress = items.filter((w) => w.status === "in_progress").length;
  const completed = items.filter((w) => w.status === "completed").length;

  return [
    { id: "open", label: "OS abertas", value: String(open), delta: `${items.length} no total`, tone: "info" },
    {
      id: "critical",
      label: "Prioridade alta/urgente",
      value: String(critical),
      delta: critical > 0 ? "requer atencao" : "sob controle",
      tone: critical > 0 ? "danger" : "success",
    },
    { id: "in_progress", label: "Em atendimento", value: String(inProgress), delta: "agora", tone: "warning" },
    { id: "completed", label: "Concluidas", value: String(completed), delta: "no periodo", tone: "success" },
  ];
}

/** OS críticas (urgente/alta) para o painel, limitadas a `limit`. */
export function pickCriticalWorkOrders(data: WorkOrdersData, limit = 5): WorkOrderListItem[] {
  return data.items
    .filter((w) => w.priority === "urgent" || w.priority === "high")
    .slice(0, limit);
}
