import { Clock, FileText, Route, UserRound } from "lucide-react";

import { Card } from "../../../../components/ui";
import { formatDispatchDate } from "../dispatches.adapter";
import type { DispatchDetail, DispatchListItem } from "../dispatches.types";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

export function DispatchDetailPanel({ dispatch }: { readonly dispatch: DispatchDetail | DispatchListItem }) {
  const timeline = "timeline" in dispatch ? dispatch.timeline : [];

  return (
    <section className="work-order-detail-side dispatch-detail-panel">
      <Card title="Detalhe do despacho">
        <dl className="work-order-detail-list">
          <div>
            <dt><Route size={16} /> OS</dt>
            <dd>{dispatch.workOrderCode ?? dispatch.workOrderId}</dd>
          </div>
          <div>
            <dt><FileText size={16} /> Atendimento</dt>
            <dd>{dispatch.workOrderTitle ?? "Titulo nao carregado"}</dd>
          </div>
          <div>
            <dt><UserRound size={16} /> Operador</dt>
            <dd>{dispatch.operatorUserId}</dd>
          </div>
          <div>
            <dt><Clock size={16} /> Criado em</dt>
            <dd>{formatDispatchDate(dispatch.createdAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd><DispatchStatusBadge status={dispatch.status} /></dd>
          </div>
          <div>
            <dt>Prioridade</dt>
            <dd><DispatchPriorityBadge priority={dispatch.priority} /></dd>
          </div>
          <div>
            <dt>Observacao</dt>
            <dd>{dispatch.observation ?? "Sem observacao"}</dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{dispatch.reason ?? "Nao informado"}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Timeline">
        <div className="work-order-timeline">
          {timeline.length ? (
            timeline.map((event) => (
              <article key={event.id}>
                <span><Route size={15} /></span>
                <div>
                  <strong>{event.message}</strong>
                  <p>{event.eventType}</p>
                  <time>{formatDispatchDate(event.createdAt)}</time>
                  {event.actorUserId ? <small>{event.actorUserId}</small> : null}
                </div>
              </article>
            ))
          ) : (
            <p className="work-order-helper">Timeline carregada no detalhe da API quando disponivel.</p>
          )}
        </div>
      </Card>
    </section>
  );
}
