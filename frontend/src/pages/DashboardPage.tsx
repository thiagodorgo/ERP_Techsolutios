import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AlertPanel, ERPSearchBar, FilterBar, KpiCard, MapPanel, TimelineRow, WorkOrderGrid } from "../components/erp";
import { Card, Skeleton } from "../components/ui";
import { getOperationalDashboard } from "../modules/dashboard/repository";
import type { OperationalAlert, OperationalKpi } from "../modules/dashboard/types";
import type { DomainEvent } from "../modules/events/types";
import type { WorkOrder } from "../modules/work-orders/types";
import { mockAssets } from "../mocks/logistics/logistics";
import { useEvents } from "../providers/EventProvider";

export function DashboardPage() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    kpis: OperationalKpi[];
    alerts: OperationalAlert[];
    criticalWorkOrders: WorkOrder[];
    recentEvents: DomainEvent[];
  } | null>(null);

  useEffect(() => {
    getOperationalDashboard().then((dashboard) => {
      setData(dashboard);
      setLoading(false);
    });
  }, []);

  const workOrders = data?.criticalWorkOrders.filter((item) => `${item.code} ${item.customer} ${item.team}`.toLowerCase().includes(query.toLowerCase())) ?? [];

  return (
    <section className="page-stack">
      <header className="page-heading">
        <span>W02 Dashboard Operacional</span>
        <h1>Controle operacional por SLA, despacho e bloqueios</h1>
      </header>
      <FilterBar>
        <ERPSearchBar value={query} onChange={setQuery} />
      </FilterBar>
      {loading || !data ? <Skeleton lines={6} /> : null}
      {data ? (
        <>
          <section className="kpi-grid">
            {data.kpis.map((kpi) => (
              <KpiCard key={kpi.id} {...kpi} />
            ))}
          </section>
          <section className="dashboard-grid">
            <div className="dashboard-main">
              <Card title="Fila critica">
                <WorkOrderGrid workOrders={workOrders} onOpen={(workOrder) => navigate(`/work-orders/${workOrder.id}`)} />
              </Card>
              <Card title="Eventos recentes">
                <div className="erp-timeline">
                  {[...events, ...data.recentEvents].slice(0, 6).map((event, index) => (
                    <TimelineRow key={`${event.id}-${event.occurredAt}-${index}`} item={event} />
                  ))}
                </div>
              </Card>
            </div>
            <aside className="dashboard-aside">
              <AlertPanel alerts={data.alerts} />
              <MapPanel assets={mockAssets} />
            </aside>
          </section>
        </>
      ) : null}
    </section>
  );
}
