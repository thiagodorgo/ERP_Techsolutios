import { useEffect, useState } from "react";

import { DispatchPanel, LogisticsKpiStrip, MapPanel, QueueAccordion } from "../components/erp";
import { Card, Skeleton } from "../components/ui";
import { getLogisticsPanel } from "../modules/logistics/repository";
import type { DispatchQueue, LogisticsAsset } from "../modules/logistics/types";
import type { WorkOrder } from "../modules/work-orders/types";

export function LogisticsPage() {
  const [data, setData] = useState<{
    assets: LogisticsAsset[];
    queues: DispatchQueue[];
    workOrders: WorkOrder[];
  } | null>(null);

  useEffect(() => {
    getLogisticsPanel().then(setData);
  }, []);

  return (
    <section className="page-stack">
      <header className="page-heading">
        <span>LOGÍSTICA</span>
        <h1>Despacho, filas e acompanhamento em tempo real</h1>
      </header>
      {!data ? <Skeleton lines={7} /> : null}
      {data ? (
        <>
          <LogisticsKpiStrip assets={data.assets} />
          <section className="logistics-grid">
            <div className="logistics-map">
              <MapPanel assets={data.assets} />
            </div>
            <aside className="logistics-side">
              <DispatchPanel workOrders={data.workOrders} />
              <Card title="Filas de despacho">
                <div className="queue-stack">
                  {data.queues.map((queue) => (
                    <QueueAccordion key={queue.id} title={queue.title} count={queue.count} items={queue.items} />
                  ))}
                </div>
              </Card>
            </aside>
          </section>
        </>
      ) : null}
    </section>
  );
}
