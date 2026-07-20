import { CalendarClock, Clock, MapPin, Users } from "lucide-react";
import { useId, useMemo, useState, type CSSProperties } from "react";

import { Alert, Chip } from "../../../../components/ui";
import { getWorkOrderPriorityLabel, getWorkOrderPriorityTone } from "../../../work-orders/work-orders.adapter";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import {
  buildAllocationCandidates,
  formatCompletionRate,
  formatStraightLineKm,
  rankAllocationCandidates,
  type AllocationSort,
  type Coordinate,
} from "../allocation";
import { formatIncomingCallSlaProxy, getFieldLocationStatusLabel, getFieldLocationStatusTone } from "../operations-map.adapter";
import { getWorkOrderPriorityColor } from "../map/mapMarkers";
import type { FieldLocationItem, OperationsIncomingCall } from "../operations-map.types";
import { useAllocateDispatch } from "../hooks/useAllocateDispatch";
import { MapAllocationDialog } from "./MapAllocationDialog";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO · D) — popup do rail de CHAMADOS. Passo 1 = DETALHE honesto do chamado
 * (cliente/endereço/prioridade/SLA-proxy — NUNCA "vence em"); passo 2 (só se o papel pode alocar) =
 * "Alocar técnico" → LISTA RANQUEADA de técnicos com filtros (Disponível / Mais próximo / Maior índice de
 * conclusão). Cada linha: técnico + status + distância "~X km (linha reta)" + índice ("%"/"—") + selo "já
 * em despacho" + "Alocar" (createDispatch com {workOrderId: chamado, operatorUserId: técnico}).
 *
 * LGPD §12: o popup NUNCA renderiza latitude/longitude cru — só a distância derivada ("~X km"). O endereço
 * textual do serviço é operacional (o despachante precisa dele), não coordenada.
 */
export function OperationsCallAllocationPopup({
  call,
  serviceAddress,
  callCoordinate,
  technicians,
  completionByOperator,
  performanceUnavailable = false,
  canCreateDispatch,
  context,
  onClose,
  onAllocated,
  now,
  initialView = "detail",
}: {
  readonly call: OperationsIncomingCall;
  readonly serviceAddress?: string | null;
  readonly callCoordinate: Coordinate | null;
  readonly technicians: readonly FieldLocationItem[];
  readonly completionByOperator: ReadonlyMap<string, number | null>;
  readonly performanceUnavailable?: boolean;
  readonly canCreateDispatch: boolean;
  readonly context: DispatchesApiContext;
  readonly onClose: () => void;
  readonly onAllocated: () => void | Promise<void>;
  readonly now?: Date;
  // Passo inicial ("detail" por padrão); "ranking" permite abrir direto na lista (e é o seam de teste SSR).
  readonly initialView?: "detail" | "ranking";
}) {
  const titleId = useId();
  const reference = now ?? new Date();
  const [view, setView] = useState<"detail" | "ranking">(initialView);
  const [availableOnly, setAvailableOnly] = useState(false);
  // Sem coordenada do chamado, "Mais próximo" não ordena de fato → começa em "Maior índice de conclusão".
  const [sort, setSort] = useState<AllocationSort>(callCoordinate ? "nearest" : "completion");
  const { allocate, pendingOperatorUserId, feedback } = useAllocateDispatch(context, onAllocated);

  const sla = formatIncomingCallSlaProxy(call, reference);
  const priorityLabel = getWorkOrderPriorityLabel(call.priority);

  const candidates = useMemo(
    () => buildAllocationCandidates(technicians, callCoordinate, completionByOperator, reference.getTime()),
    [technicians, callCoordinate, completionByOperator, reference],
  );
  const ranked = useMemo(
    () => rankAllocationCandidates(candidates, sort, availableOnly),
    [candidates, sort, availableOnly],
  );

  return (
    <MapAllocationDialog open onClose={onClose} labelledBy={titleId} anchor="left" title={`chamado ${call.code}`}>
      <header className="operations-alloc__header">
        <div className="operations-alloc__title-row">
          <h2
            id={titleId}
            className="operations-alloc__title"
            style={{ "--call-priority": getWorkOrderPriorityColor(call.priority) } as CSSProperties}
          >
            {call.code}
          </h2>
          <Chip tone={getWorkOrderPriorityTone(call.priority)}>{priorityLabel}</Chip>
        </div>
        <p className="operations-alloc__subtitle">{call.customerName ?? "Cliente não informado"}</p>
      </header>

      {view === "detail" ? (
        <div className="operations-alloc__body">
          <dl className="operations-alloc__facts">
            <div>
              <dt><Users size={14} aria-hidden="true" /> Cliente</dt>
              <dd>{call.customerName ?? "Cliente não informado"}</dd>
            </div>
            <div>
              <dt><MapPin size={14} aria-hidden="true" /> Endereço</dt>
              <dd>{serviceAddress?.trim() ? serviceAddress : call.hasLocation ? "Endereço não informado" : "Sem localização no mapa"}</dd>
            </div>
            <div>
              <dt>{sla.kind === "scheduled" ? <CalendarClock size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />} Situação</dt>
              <dd data-kind={sla.kind}>{sla.label}</dd>
            </div>
          </dl>

          {canCreateDispatch ? (
            <button type="button" className="operations-alloc__primary" onClick={() => setView("ranking")}>
              <Users size={16} aria-hidden="true" /> Alocar técnico
            </button>
          ) : (
            <Alert title="Sem permissão para alocar" tone="info">
              Seu perfil pode consultar o chamado, mas não pode criar despachos pelo mapa.
            </Alert>
          )}
        </div>
      ) : (
        <div className="operations-alloc__body">
          <div className="operations-alloc__filters" role="group" aria-label="Filtros de alocação">
            <button
              type="button"
              className={`operations-alloc__chip${availableOnly ? " is-active" : ""}`}
              aria-pressed={availableOnly}
              onClick={() => setAvailableOnly((value) => !value)}
            >
              Disponível
            </button>
            <div className="operations-alloc__sort" role="group" aria-label="Ordenar técnicos por">
              <button
                type="button"
                className={`operations-alloc__chip${sort === "nearest" ? " is-active" : ""}`}
                aria-pressed={sort === "nearest"}
                onClick={() => setSort("nearest")}
              >
                Mais próximo
              </button>
              <button
                type="button"
                className={`operations-alloc__chip${sort === "completion" ? " is-active" : ""}`}
                aria-pressed={sort === "completion"}
                onClick={() => setSort("completion")}
              >
                Maior índice de conclusão
              </button>
            </div>
          </div>

          {!callCoordinate ? (
            <p className="operations-alloc__note">Chamado sem localização no mapa — a distância em linha reta fica indisponível.</p>
          ) : null}
          {performanceUnavailable ? (
            <p className="operations-alloc__note">Índice de conclusão indisponível agora — exibido como "—".</p>
          ) : null}

          {feedback ? (
            <div
              className={`operations-alloc__feedback operations-alloc__feedback--${feedback.kind}`}
              role={feedback.kind === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </div>
          ) : null}

          {ranked.length === 0 ? (
            <p className="operations-alloc__note">
              {availableOnly ? "Nenhum técnico disponível neste momento." : "Nenhum técnico no filtro atual."}
            </p>
          ) : (
            <ul className="operations-alloc__list" aria-label="Técnicos para alocação">
              {ranked.map((candidate) => {
                const isPending = pendingOperatorUserId === candidate.operatorUserId;
                return (
                  <li key={candidate.location.id} className="operations-alloc__row">
                    <div className="operations-alloc__row-main">
                      <strong className="operations-alloc__row-name">{candidate.location.displayName}</strong>
                      <span className="operations-alloc__row-tags">
                        <Chip tone={getFieldLocationStatusTone(candidate.location.status, candidate.location.isStale)}>
                          {candidate.location.isStale ? "Localização antiga" : getFieldLocationStatusLabel(candidate.location.status)}
                        </Chip>
                        {candidate.hasActiveDispatch ? <Chip tone="warning">Já em despacho</Chip> : null}
                      </span>
                    </div>
                    <div className="operations-alloc__row-metrics">
                      <span className="operations-alloc__metric">{formatStraightLineKm(candidate.distanceKm)}</span>
                      <span className="operations-alloc__metric">Índice de conclusão: {formatCompletionRate(candidate.completionRate)}</span>
                    </div>
                    <button
                      type="button"
                      className="operations-alloc__allocate"
                      disabled={isPending || Boolean(pendingOperatorUserId)}
                      onClick={() =>
                        allocate(
                          { workOrderId: call.id, operatorUserId: candidate.operatorUserId },
                          candidate.location.displayName,
                        )
                      }
                    >
                      {isPending ? "Alocando..." : "Alocar"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button type="button" className="operations-alloc__link" onClick={() => setView("detail")}>
            ← Voltar ao detalhe do chamado
          </button>
        </div>
      )}
    </MapAllocationDialog>
  );
}
