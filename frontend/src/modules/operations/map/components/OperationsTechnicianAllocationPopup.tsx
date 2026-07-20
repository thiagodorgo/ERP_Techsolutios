import { Clock, Route, Timer, Users } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Alert, Chip } from "../../../../components/ui";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import {
  computeDistanceKm,
  formatCompletionRate,
  formatEstimatedMinutes,
  formatStraightLineKm,
  operatorUserIdOf,
} from "../allocation";
import { formatLastSeen, getFieldLocationStatusLabel, getFieldLocationStatusTone } from "../operations-map.adapter";
import type { Coordinate } from "../allocation";
import type { FieldLocationItem, OperationsIncomingCall } from "../operations-map.types";
import { useAllocateDispatch } from "../hooks/useAllocateDispatch";
import { MapAllocationDialog } from "./MapAllocationDialog";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO · E) — popup do rail de TÉCNICOS. Mostra os dados do técnico (status, frescor
 * "há X min", equipe, OS/despacho atual — NUNCA lat/lng cru, LGPD §12) + um SELETOR de chamado. Ao escolher
 * o chamado, calcula o PAR: distância "~X km (linha reta)" (haversine) e tempo "~Y min (estimado, sem
 * trânsito)" (distância ÷ velocidade média) com disclaimer VISÍVEL — NÃO é "ETA de chegada". "Alocar" usa a
 * MESMA payload de D (createDispatch {workOrderId, operatorUserId}), fechando o fluxo reverso.
 */
export function OperationsTechnicianAllocationPopup({
  technician,
  calls,
  resolveCallCoordinate,
  completionRate,
  canCreateDispatch,
  context,
  onClose,
  onAllocated,
  now,
  initialCallId = "",
}: {
  readonly technician: FieldLocationItem;
  readonly calls: readonly OperationsIncomingCall[];
  readonly resolveCallCoordinate: (callId: string) => Coordinate | null;
  readonly completionRate: number | null;
  readonly canCreateDispatch: boolean;
  readonly context: DispatchesApiContext;
  readonly onClose: () => void;
  readonly onAllocated: () => void | Promise<void>;
  readonly now?: Date;
  // Chamado pré-selecionado (vazio por padrão); seam de teste SSR para exercitar distância/tempo do par.
  readonly initialCallId?: string;
}) {
  const titleId = useId();
  const selectId = useId();
  const reference = now ?? new Date();
  const [selectedCallId, setSelectedCallId] = useState<string>(initialCallId);
  const { allocate, pendingOperatorUserId, feedback } = useAllocateDispatch(context, onAllocated);

  const selectedCall = calls.find((call) => call.id === selectedCallId) ?? null;
  const distanceKm = useMemo(
    () => (selectedCall ? computeDistanceKm(technician, resolveCallCoordinate(selectedCall.id)) : null),
    [selectedCall, technician, resolveCallCoordinate],
  );

  const operatorUserId = operatorUserIdOf(technician);
  const isPending = pendingOperatorUserId === operatorUserId;

  return (
    <MapAllocationDialog open onClose={onClose} labelledBy={titleId} anchor="right" title={`técnico ${technician.displayName}`}>
      <header className="operations-alloc__header">
        <div className="operations-alloc__title-row">
          <h2 id={titleId} className="operations-alloc__title">{technician.displayName}</h2>
          <Chip tone={getFieldLocationStatusTone(technician.status, technician.isStale)}>
            {technician.isStale ? "Localização antiga" : getFieldLocationStatusLabel(technician.status)}
          </Chip>
        </div>
        <p className="operations-alloc__subtitle">
          {/* Frescor relativo, NUNCA coordenada (LGPD §12). */}
          <Clock size={13} aria-hidden="true" /> Visto {formatLastSeen(technician.capturedAt, reference)}
        </p>
      </header>

      <div className="operations-alloc__body">
        <dl className="operations-alloc__facts">
          <div>
            <dt><Users size={14} aria-hidden="true" /> Equipe</dt>
            <dd>{technician.teamName ?? "Sem equipe"}</dd>
          </div>
          <div>
            <dt>OS atual</dt>
            <dd>{technician.currentWorkOrder ? technician.currentWorkOrder.code : "Sem OS vinculada"}</dd>
          </div>
          <div>
            <dt>Índice de conclusão</dt>
            <dd>{formatCompletionRate(completionRate)}</dd>
          </div>
        </dl>

        <label className="operations-alloc__field" htmlFor={selectId}>
          <span>Chamado para alocar</span>
          <select
            id={selectId}
            className="operations-alloc__select"
            value={selectedCallId}
            onChange={(event) => setSelectedCallId(event.target.value)}
          >
            <option value="">Selecione um chamado…</option>
            {calls.map((call) => (
              <option key={call.id} value={call.id}>
                {call.code}
                {call.customerName ? ` — ${call.customerName}` : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedCall ? (
          <div className="operations-alloc__pair" aria-live="polite">
            <span className="operations-alloc__metric"><Route size={14} aria-hidden="true" /> {formatStraightLineKm(distanceKm)}</span>
            <span className="operations-alloc__metric"><Timer size={14} aria-hidden="true" /> {formatEstimatedMinutes(distanceKm)}</span>
            <p className="operations-alloc__disclaimer">
              Estimativa a partir da distância em linha reta e de uma velocidade urbana média — não considera
              trânsito nem rota real. Não é uma previsão de chegada.
            </p>
          </div>
        ) : null}

        {feedback ? (
          <div
            className={`operations-alloc__feedback operations-alloc__feedback--${feedback.kind}`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </div>
        ) : null}

        {canCreateDispatch ? (
          <button
            type="button"
            className="operations-alloc__primary"
            disabled={!selectedCall || isPending}
            onClick={() =>
              selectedCall
                ? allocate({ workOrderId: selectedCall.id, operatorUserId }, technician.displayName)
                : undefined
            }
          >
            {isPending ? "Alocando..." : "Alocar"}
          </button>
        ) : (
          <Alert title="Sem permissão para alocar" tone="info">
            Seu perfil pode consultar o técnico, mas não pode criar despachos pelo mapa.
          </Alert>
        )}
      </div>
    </MapAllocationDialog>
  );
}
