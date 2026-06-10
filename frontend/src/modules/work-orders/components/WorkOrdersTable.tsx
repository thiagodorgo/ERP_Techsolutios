import { Eye, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, Card, Table } from "../../../components/ui";
import { formatWorkOrderDate } from "../work-orders.adapter";
import type { WorkOrderListItem } from "../work-orders.types";
import { WorkOrderPriorityBadge } from "./WorkOrderPriorityBadge";
import { WorkOrderStatusBadge } from "./WorkOrderStatusBadge";

export function WorkOrdersTable({
  items,
  canChangeStatus,
  onQuickStatus,
}: {
  readonly items: WorkOrderListItem[];
  readonly canChangeStatus: boolean;
  readonly onQuickStatus: (workOrder: WorkOrderListItem) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card title="Ordens de Servico">
      <Table
        rows={items}
        keyForRow={(item) => item.id}
        onRowClick={(item) => navigate(`/work-orders/${item.id}`)}
        columns={[
          { key: "code", header: "Codigo", render: (item) => <strong>{item.code}</strong> },
          { key: "title", header: "Titulo", render: (item) => item.title },
          { key: "customer", header: "Cliente", render: (item) => item.customerName ?? "Nao informado" },
          { key: "status", header: "Status", render: (item) => <WorkOrderStatusBadge status={item.status} /> },
          { key: "priority", header: "Prioridade", render: (item) => <WorkOrderPriorityBadge priority={item.priority} /> },
          { key: "operator", header: "Operador", render: (item) => item.assignedOperatorId ?? item.assignedUserId ?? "Nao atribuido" },
          { key: "scheduled", header: "Agendada para", render: (item) => formatWorkOrderDate(item.scheduledFor) },
          { key: "created", header: "Criada em", render: (item) => formatWorkOrderDate(item.createdAt) },
          {
            key: "actions",
            header: "Acoes",
            render: (item) => (
              <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
                <Button type="button" size="sm" variant="secondary" onClick={() => navigate(`/work-orders/${item.id}`)}>
                  <Eye size={14} /> Ver detalhes
                </Button>
                {canChangeStatus ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onQuickStatus(item)}>
                    <Route size={14} /> Alterar status
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      <div className="work-orders-mobile-list">
        {items.map((item) => (
          <button key={item.id} type="button" className="work-orders-mobile-card" onClick={() => navigate(`/work-orders/${item.id}`)}>
            <header>
              <div>
                <strong>{item.code}</strong>
                <span>{item.title}</span>
              </div>
              <WorkOrderPriorityBadge priority={item.priority} />
            </header>
            <p>{item.customerName ?? "Cliente nao informado"}</p>
            <footer>
              <WorkOrderStatusBadge status={item.status} />
              <span>{formatWorkOrderDate(item.scheduledFor)}</span>
            </footer>
          </button>
        ))}
      </div>
    </Card>
  );
}
