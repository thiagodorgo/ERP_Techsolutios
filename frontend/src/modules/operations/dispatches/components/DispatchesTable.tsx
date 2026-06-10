import { Eye, Route, UserRound } from "lucide-react";

import { Button, Card, Table } from "../../../../components/ui";
import { formatDispatchDate } from "../dispatches.adapter";
import type { DispatchListItem } from "../dispatches.types";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

export function DispatchesTable({
  items,
  canChangeStatus,
  canReassign,
  canCancel,
  onDetail,
  onQuickStatus,
  onReassign,
}: {
  readonly items: DispatchListItem[];
  readonly canChangeStatus: boolean;
  readonly canReassign: boolean;
  readonly canCancel: boolean;
  readonly onDetail: (dispatch: DispatchListItem) => void;
  readonly onQuickStatus: (dispatch: DispatchListItem) => void;
  readonly onReassign: (dispatch: DispatchListItem) => void;
}) {
  return (
    <Card title="Despachos Operacionais">
      <Table
        rows={items}
        keyForRow={(item) => item.id}
        onRowClick={onDetail}
        columns={[
          { key: "workOrder", header: "OS", render: (item) => <strong>{item.workOrderCode ?? item.workOrderId}</strong> },
          { key: "title", header: "Titulo", render: (item) => item.workOrderTitle ?? "OS sem titulo local" },
          { key: "status", header: "Status", render: (item) => <DispatchStatusBadge status={item.status} /> },
          { key: "priority", header: "Prioridade", render: (item) => <DispatchPriorityBadge priority={item.priority} /> },
          { key: "operator", header: "Operador", render: (item) => item.operatorUserId },
          { key: "created", header: "Criado em", render: (item) => formatDispatchDate(item.createdAt) },
          {
            key: "actions",
            header: "Acoes",
            render: (item) => (
              <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
                <Button type="button" size="sm" variant="secondary" onClick={() => onDetail(item)}>
                  <Eye size={14} /> Detalhe
                </Button>
                {canChangeStatus || canCancel ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onQuickStatus(item)}>
                    <Route size={14} /> Status
                  </Button>
                ) : null}
                {canReassign ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onReassign(item)}>
                    <UserRound size={14} /> Reatribuir
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      <div className="work-orders-mobile-list dispatches-mobile-list">
        {items.map((item) => (
          <button key={item.id} type="button" className="work-orders-mobile-card" onClick={() => onDetail(item)}>
            <header>
              <div>
                <strong>{item.workOrderCode ?? item.workOrderId}</strong>
                <span>{item.workOrderTitle ?? item.id}</span>
              </div>
              <DispatchPriorityBadge priority={item.priority} />
            </header>
            <p>{item.operatorUserId}</p>
            <footer>
              <DispatchStatusBadge status={item.status} />
              <span>{formatDispatchDate(item.createdAt)}</span>
            </footer>
          </button>
        ))}
      </div>
    </Card>
  );
}
