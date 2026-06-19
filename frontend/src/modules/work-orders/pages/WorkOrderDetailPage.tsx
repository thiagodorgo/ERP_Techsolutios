import { ArrowLeft, ClipboardList, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, Button, Card, Chip, Skeleton } from "../../../components/ui";
import { usePermissions } from "../../../providers/PermissionProvider";
import { assignWorkOrder, updateWorkOrderStatus } from "../work-orders.service";
import { formatWorkOrderDate } from "../work-orders.adapter";
import { useWorkOrderDetail } from "../useWorkOrderDetail";
import { WorkOrderAssignForm } from "../components/WorkOrderAssignForm";
import { OperationalApprovalCard } from "../components/OperationalApprovalCard";
import { WorkOrderDetailPanel } from "../components/WorkOrderDetailPanel";
import { WorkOrderPriorityBadge } from "../components/WorkOrderPriorityBadge";
import { WorkOrderStatusActions } from "../components/WorkOrderStatusActions";
import { WorkOrderStatusBadge } from "../components/WorkOrderStatusBadge";
import { WorkOrderTimeline } from "../components/WorkOrderTimeline";

export function WorkOrderDetailPage() {
  const navigate = useNavigate();
  const { workOrderId } = useParams();
  const { can } = usePermissions();
  const { workOrder, timeline, source, fallbackReason, loading, refresh, context } = useWorkOrderDetail(workOrderId);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !workOrder) return <Skeleton lines={8} />;
  if (!workOrder || !workOrderId) {
    return (
      <section className="page-stack">
        <Alert title="OS nao encontrada" tone="warning">Nao foi possivel carregar o detalhe solicitado.</Alert>
      </section>
    );
  }

  return (
    <section className="page-stack work-orders-page">
      <header className="work-order-detail-header">
        <div>
          <span><ClipboardList size={16} /> {workOrder.code}</span>
          <h1>{workOrder.title}</h1>
          <div className="work-orders-actions">
            <WorkOrderStatusBadge status={workOrder.status} />
            <WorkOrderPriorityBadge priority={workOrder.priority} />
            <Chip tone={source === "api" ? "success" : source === "fallback" ? "warning" : "info"}>
              {source === "api" ? "API real" : source === "fallback" ? "Fallback local" : "Dados demonstrativos"}
            </Chip>
          </div>
        </div>
        <div className="work-orders-actions">
          <Button type="button" variant="secondary" onClick={() => navigate("/work-orders")}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </header>

      {fallbackReason ? <Alert title="Dados demonstrativos" tone="warning">{fallbackReason}</Alert> : null}
      {actionError ? <Alert title="Acao nao concluida" tone="warning">{actionError}</Alert> : null}

      <section className="work-order-detail-layout">
        <div className="work-order-detail-main">
          <WorkOrderDetailPanel workOrder={workOrder} />
          <WorkOrderTimeline events={timeline} />
        </div>
        <aside className="work-order-detail-side">
          <OperationalApprovalCard
            context={context}
            workOrderId={workOrder.id}
            canDecide={can("work_orders:update")}
          />
          <Card title="Datas importantes">
            <div className="work-order-date-grid">
              <span>Agendada: {formatWorkOrderDate(workOrder.scheduledFor)}</span>
              <span>Iniciada: {formatWorkOrderDate(workOrder.startedAt)}</span>
              <span>No local: {formatWorkOrderDate(workOrder.arrivedAt)}</span>
              <span>Concluida: {formatWorkOrderDate(workOrder.completedAt)}</span>
            </div>
          </Card>
          <Card title="Alterar status">
            {can("work_orders:status") ? (
              <WorkOrderStatusActions
                currentStatus={workOrder.status}
                onSubmit={async (payload) => {
                  setActionError(null);
                  try {
                    await updateWorkOrderStatus(context, workOrder.id, payload);
                    await refresh();
                  } catch {
                    setActionError("Nao foi possivel alterar o status.");
                  }
                }}
              />
            ) : (
              <p className="work-order-helper">Seu usuario nao possui `work_orders:status`.</p>
            )}
          </Card>
          <Card title="Atribuir operador">
            {can("work_orders:assign") ? (
              <WorkOrderAssignForm
                onSubmit={async (payload) => {
                  setActionError(null);
                  try {
                    await assignWorkOrder(context, workOrder.id, payload);
                    await refresh();
                  } catch {
                    setActionError("Nao foi possivel atribuir operador.");
                  }
                }}
              />
            ) : (
              <p className="work-order-helper">Seu usuario nao possui `work_orders:assign`.</p>
            )}
          </Card>
          <Alert title="Integracoes operacionais" tone="info">
            A aprovacao conecta OS concluida, checklist e evidencia por contrato tenant-scoped. Workflow configuravel e assinatura legal permanecem fora deste MVP.
          </Alert>
        </aside>
      </section>
    </section>
  );
}
