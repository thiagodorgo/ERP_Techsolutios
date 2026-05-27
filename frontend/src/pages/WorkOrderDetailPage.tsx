import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  ApprovalPanel,
  AuditMetric,
  BlockedBanner,
  EvidencePanel,
  StickyActionBar,
  TimelineRow,
  WorkOrderHeader,
} from "../components/erp";
import { Accordion, Button, Card, Skeleton } from "../components/ui";
import { getWorkOrder } from "../modules/work-orders/repository";
import type { WorkOrder, WorkOrderEvidence, WorkOrderTimelineItem } from "../modules/work-orders/types";

export function WorkOrderDetailPage() {
  const { workOrderId = "wo-10021" } = useParams();
  const [data, setData] = useState<{
    workOrder: WorkOrder;
    timeline: WorkOrderTimelineItem[];
    evidence: WorkOrderEvidence[];
  } | null>(null);

  useEffect(() => {
    getWorkOrder(workOrderId).then(setData);
  }, [workOrderId]);

  if (!data) return <Skeleton lines={8} />;

  const { workOrder, timeline, evidence } = data;

  return (
    <section className="page-stack detail-page">
      <WorkOrderHeader workOrder={workOrder} />
      {workOrder.blockReason ? <BlockedBanner reason={workOrder.blockReason} /> : null}
      <section className="detail-grid">
        <div className="detail-main">
          <Card title="Resumo tecnico">
            <div className="metric-grid">
              <AuditMetric label="Lead time" value="4h 12m" />
              <AuditMetric label="Checklist" value={`${workOrder.checklistProgress}%`} />
              <AuditMetric label="Custo estimado" value={workOrder.estimatedCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <AuditMetric label="Valor faturavel" value={workOrder.billableValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
            </div>
          </Card>
          <Card title="Timeline auditavel">
            <div className="erp-timeline">
              {timeline.map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </div>
          </Card>
          <Accordion title="Checklist, estoque e logs financeiros" defaultOpen>
            <div className="accordion-grid">
              <span>Checklist pendente: pressao final e assinatura tecnica</span>
              <span>Estoque reservado: filtro, sensor, fluido refrigerante</span>
              <span>Financeiro: aguardando aprovacao acima de limite</span>
            </div>
          </Accordion>
        </div>
        <aside className="detail-aside">
          <ApprovalPanel state={workOrder.approvalState} />
          <EvidencePanel evidence={evidence} />
        </aside>
      </section>
      <StickyActionBar>
        <Button variant="secondary">Anexar evidencia</Button>
        <Button variant="secondary">Solicitar aprovacao</Button>
        <Button>Atualizar status</Button>
      </StickyActionBar>
    </section>
  );
}
