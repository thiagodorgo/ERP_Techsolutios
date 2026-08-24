import { Route } from "lucide-react";
import { useMemo } from "react";
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
  // Padrão "linha clicável" (2026-08-24): a linha abre o detalhe da OS — "Ver detalhes" saiu por ser o
  // duplicado desse clique. A coluna "Ações" só sobrevive enquanto restar ação secundária real.
  const columns = useMemo(
    () => [
      { key: "code", header: "Código", render: (item: WorkOrderListItem) => <strong>{item.code}</strong> },
      { key: "title", header: "Título", render: (item: WorkOrderListItem) => item.title },
      { key: "customer", header: "Cliente", render: (item: WorkOrderListItem) => item.customerName ?? "Não informado" },
      { key: "status", header: "Status", render: (item: WorkOrderListItem) => <WorkOrderStatusBadge status={item.status} /> },
      { key: "priority", header: "Prioridade", render: (item: WorkOrderListItem) => <WorkOrderPriorityBadge priority={item.priority} /> },
      {
        key: "operator",
        header: "Operador",
        render: (item: WorkOrderListItem) => item.assignedOperatorId ?? item.assignedUserId ?? "Não atribuído",
      },
      { key: "scheduled", header: "Agendada para", render: (item: WorkOrderListItem) => formatWorkOrderDate(item.scheduledFor) },
      { key: "created", header: "Criada em", render: (item: WorkOrderListItem) => formatWorkOrderDate(item.createdAt) },
      ...(canChangeStatus
        ? [
            {
              key: "actions",
              header: "Ações",
              render: (item: WorkOrderListItem) => (
                <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onQuickStatus(item)}>
                    <Route size={14} /> Alterar status
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canChangeStatus, onQuickStatus],
  );

  return (
    <Card title="Ordens de Serviço">
      <Table
        rows={items}
        keyForRow={(item) => item.id}
        onRowClick={(item) => navigate(`/work-orders/${item.id}`)}
        rowLabel={(item) => `Abrir a ordem de serviço ${item.code}`}
        columns={columns}
      />
      <div className="work-orders-mobile-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="work-orders-mobile-card"
            aria-label={`Abrir a ordem de serviço ${item.code}`}
            onClick={() => navigate(`/work-orders/${item.id}`)}
          >
            <header>
              <div>
                <strong>{item.code}</strong>
                <span>{item.title}</span>
              </div>
              <WorkOrderPriorityBadge priority={item.priority} />
            </header>
            <p>{item.customerName ?? "Cliente não informado"}</p>
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
