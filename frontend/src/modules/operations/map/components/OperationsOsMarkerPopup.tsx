import { formatCompactKm, formatCompactMinutes, type AllocationCandidate } from "../allocation";
import { getFieldLocationGroupColor, TECH_STALE_HEX } from "../map/mapMarkers";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsMapWorkOrderPin } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D5.2) — conteúdo React do POPUP do marker de OS (verbatim do
 * protótipo): título "{código} — {prioridade}", sub "{cliente} · {endereço}" e, para chamado
 * RECEBIDO, os 3 técnicos mais próximos (dot de status + nome + "~km · ~min" + Alocar); para OS
 * em atendimento, "Em atendimento por {nome}". Adição mínima registrada: ação "Abrir OS" (migra
 * do painel WorkOrderPinPanel removido).
 *
 * Candidatos = buildAllocationCandidates REAL sobre TODOS os técnicos (exclui grupo "off", km
 * asc, slice 3 — feito na página). "Alocar" gated por field_dispatch:create (sem permissão o
 * popup é só informativo). LGPD §12: NENHUMA coordenada crua — só ~km/~min derivados.
 * Navegação para a OS via handler da página (o popup vive fora do Router, num root próprio).
 */
export function OperationsOsMarkerPopup({
  pin,
  phase,
  technicianName,
  candidates,
  canAllocate,
  pendingOperatorUserId,
  onAllocate,
  onOpenWorkOrder,
}: {
  readonly pin: OperationsMapWorkOrderPin;
  readonly phase: "rec" | "atd";
  readonly technicianName?: string;
  readonly candidates: readonly AllocationCandidate[];
  readonly canAllocate: boolean;
  readonly pendingOperatorUserId?: string | null;
  readonly onAllocate: (candidate: AllocationCandidate) => void;
  readonly onOpenWorkOrder: (workOrderId: string) => void;
}) {
  return (
    <div className="opmap-pp">
      <b className="opmap-pp__title">
        {pin.code} — {getWorkOrderPriorityLabel(pin.priority)}
      </b>
      <div className="opmap-pp__sub">
        {pin.customerName ?? "Cliente não informado"}
        {pin.serviceAddress ? ` · ${pin.serviceAddress}` : ""}
      </div>
      {phase === "atd" ? (
        <div className="opmap-pp__prow">
          Em atendimento por <b className="opmap-pp__tech">{technicianName ?? "—"}</b>
        </div>
      ) : (
        candidates.map((candidate) => {
          const dotColor = candidate.location.isStale
            ? TECH_STALE_HEX
            : getFieldLocationGroupColor(candidate.location.status);
          return (
            <div key={candidate.location.id} className="opmap-pp__prow">
              <span className="opmap-pp__dot" style={{ background: dotColor }} aria-hidden="true" />
              <span className="opmap-pp__name">{candidate.location.displayName}</span>
              <span className="opmap-pp__eta">
                {formatCompactKm(candidate.distanceKm)} · {formatCompactMinutes(candidate.distanceKm)}
              </span>
              {canAllocate ? (
                <button
                  type="button"
                  className="opmap-pp__allocate"
                  disabled={pendingOperatorUserId === candidate.operatorUserId}
                  aria-label={`Alocar ${pin.code} para ${candidate.location.displayName}`}
                  onClick={() => onAllocate(candidate)}
                >
                  {pendingOperatorUserId === candidate.operatorUserId ? "Alocando…" : "Alocar"}
                </button>
              ) : null}
            </div>
          );
        })
      )}
      {phase === "rec" && candidates.length === 0 ? (
        <div className="opmap-pp__prow opmap-pp__prow--empty">Nenhum técnico em serviço por perto</div>
      ) : null}
      <div className="opmap-pp__prow">
        <button
          type="button"
          className="opmap-pp__open"
          aria-label={`Abrir a ordem de serviço ${pin.code}`}
          onClick={() => onOpenWorkOrder(pin.id)}
        >
          Abrir OS
        </button>
      </div>
    </div>
  );
}
