import { Calendar, MapPin, Navigation, Phone, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, Card } from "../../../components/ui";
import { formatWorkOrderDate } from "../work-orders.adapter";
import type { WorkOrderDetail } from "../work-orders.types";

export function WorkOrderDetailPanel({ workOrder }: { readonly workOrder: WorkOrderDetail }) {
  const navigate = useNavigate();
  const hasCoordinates = typeof workOrder.serviceLatitude === "number" && typeof workOrder.serviceLongitude === "number";

  return (
    <Card title="Informacoes da OS">
      <dl className="work-order-detail-list">
        <div>
          <dt><UserRound size={16} /> Cliente</dt>
          <dd>{workOrder.customerName ?? "Nao informado"}</dd>
        </div>
        <div>
          <dt><Phone size={16} /> Telefone</dt>
          <dd>{workOrder.customerPhone ?? "Nao informado"}</dd>
        </div>
        <div>
          <dt><MapPin size={16} /> Endereco</dt>
          <dd>{[workOrder.serviceAddress, workOrder.serviceCity, workOrder.serviceState].filter(Boolean).join(" - ") || "Nao informado"}</dd>
        </div>
        <div>
          <dt><Navigation size={16} /> Coordenadas</dt>
          <dd>{hasCoordinates ? `${workOrder.serviceLatitude}, ${workOrder.serviceLongitude}` : "Nao informadas"}</dd>
        </div>
        <div>
          <dt><Calendar size={16} /> Agendamento</dt>
          <dd>{formatWorkOrderDate(workOrder.scheduledFor)}</dd>
        </div>
        <div>
          <dt><UserRound size={16} /> Operador</dt>
          <dd>{workOrder.assignedOperatorId ?? workOrder.assignedUserId ?? "Nao atribuido"}</dd>
        </div>
      </dl>
      <div className="work-order-date-grid">
        <span>Criada: {formatWorkOrderDate(workOrder.createdAt)}</span>
        <span>Inicio: {formatWorkOrderDate(workOrder.startedAt)}</span>
        <span>Chegada: {formatWorkOrderDate(workOrder.arrivedAt)}</span>
        <span>Conclusao: {formatWorkOrderDate(workOrder.completedAt)}</span>
      </div>
      {workOrder.description ? <p className="work-order-description">{workOrder.description}</p> : null}
      {hasCoordinates ? (
        <Button type="button" variant="secondary" onClick={() => navigate("/operations/map")}>
          <MapPin size={16} /> Ver localizacao no mapa operacional
        </Button>
      ) : null}
    </Card>
  );
}
