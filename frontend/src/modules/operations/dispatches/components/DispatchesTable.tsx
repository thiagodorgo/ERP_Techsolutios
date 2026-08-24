import { Route, UserRound } from "lucide-react";
import { useMemo } from "react";

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
  // Padrão "linha clicável" (2026-08-24): clicar na linha abre o painel de detalhe do envio — o que o
  // botão "Detalhe" fazia. A coluna "Ações" só existe se sobrar ação secundária REAL (Status/Reatribuir);
  // sem nenhum gate, some com o cabeçalho junto — nada de coluna fantasma.
  const hasRowActions = canChangeStatus || canCancel || canReassign;
  const columns = useMemo(
    () => [
      { key: "workOrder", header: "OS", render: (item: DispatchListItem) => <strong>{item.workOrderCode ?? item.workOrderId}</strong> },
      { key: "title", header: "Título", render: (item: DispatchListItem) => item.workOrderTitle ?? "OS sem título local" },
      { key: "status", header: "Status", render: (item: DispatchListItem) => <DispatchStatusBadge status={item.status} /> },
      { key: "priority", header: "Prioridade", render: (item: DispatchListItem) => <DispatchPriorityBadge priority={item.priority} /> },
      { key: "operator", header: "Operador", render: (item: DispatchListItem) => item.operatorUserId },
      { key: "created", header: "Criado em", render: (item: DispatchListItem) => formatDispatchDate(item.createdAt) },
      ...(hasRowActions
        ? [
            {
              key: "actions",
              header: "Ações",
              render: (item: DispatchListItem) => (
                <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
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
          ]
        : []),
    ],
    [canCancel, canChangeStatus, canReassign, hasRowActions, onQuickStatus, onReassign],
  );

  return (
    <Card title="Despachos Operacionais">
      <Table
        rows={items}
        keyForRow={(item) => item.id}
        onRowClick={onDetail}
        rowLabel={(item) => `Abrir os detalhes do envio da OS ${item.workOrderCode ?? item.workOrderId}`}
        columns={columns}
      />
      <div className="work-orders-mobile-list dispatches-mobile-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="work-orders-mobile-card"
            aria-label={`Abrir detalhes do despacho ${item.workOrderCode ?? item.id}`}
            onClick={() => onDetail(item)}
          >
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
