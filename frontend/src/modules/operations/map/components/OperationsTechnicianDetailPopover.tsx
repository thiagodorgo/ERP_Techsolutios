import { Link } from "react-router-dom";

import {
  formatAccuracy,
  formatBattery,
  formatLastSeen,
  getFieldLocationStatusLabel,
} from "../operations-map.adapter";
import { getAvatarColor, getFieldLocationGroupColor, getInitials, TECH_STALE_HEX } from "../map/mapMarkers";
import type { FieldLocationItem } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL) — DETAIL POPOVER do técnico (270px, right 372 / top 64), verbatim
 * do protótipo: header (avatar 34px na cor AVC + nome + "{equipe} · {status}"), aviso âmbar de
 * localização antiga e grade 2×3 — Status · Último visto · Bateria · Precisão · Coordenadas ·
 * OS atual.
 *
 * LGPD/plano §6(e): a COORDENADA NUMÉRICA aparece SOMENTE aqui (paridade com o protótipo do dono;
 * mesma superfície de permissão do pin — field_location:read). Nunca em log/console/lista/toast.
 * O rótulo de status é o REAL ("Pausado"/"Bloqueado"…, D-MAPA-PIXEL div. 3), colorido pelo grupo.
 * "OS atual" vira link para a própria OS (divergência 6 registrada: gestão de despacho mora na
 * tela Despachos).
 */
export function OperationsTechnicianDetailPopover({
  location,
  currentWorkOrder,
  onClose,
  now,
}: {
  readonly location: FieldLocationItem;
  // OS atual resolvida pela página (currentWorkOrder da localização ou match do painel atd); null → "—".
  readonly currentWorkOrder?: { readonly id: string; readonly code: string } | null;
  readonly onClose: () => void;
  readonly now?: Date;
}) {
  const reference = now ?? new Date();
  const statusLabel = getFieldLocationStatusLabel(location.status);
  const statusColor = location.isStale ? TECH_STALE_HEX : getFieldLocationGroupColor(location.status);
  const lastSeen = formatLastSeen(location.capturedAt, reference);

  return (
    <aside className="opmap-detail" role="dialog" aria-label={`Detalhes de ${location.displayName}`}>
      <header className="opmap-detail__dh">
        <span className="opmap-detail__av" style={{ background: getAvatarColor(location.id) }} aria-hidden="true">
          {getInitials(location.displayName)}
        </span>
        <span className="opmap-detail__id">
          <b>{location.displayName}</b>
          <span>
            {location.teamName ?? "Sem equipe"} · {statusLabel}
          </span>
        </span>
        <button type="button" className="opmap-detail__x" aria-label="Fechar detalhes do técnico" onClick={onClose}>
          ✕
        </button>
      </header>
      {location.isStale ? (
        <p className="opmap-detail__dwarn">
          ⚠ Localização antiga — última posição {lastSeen}. Confirme por despacho ou contato direto.
        </p>
      ) : null}
      <dl className="opmap-detail__dg">
        <div>
          <dt>Status</dt>
          <dd style={{ color: statusColor }}>{statusLabel}</dd>
        </div>
        <div>
          <dt>Último visto</dt>
          <dd>{lastSeen}</dd>
        </div>
        <div>
          <dt>Bateria</dt>
          <dd>{formatBattery(location.batteryLevel)}</dd>
        </div>
        <div>
          <dt>Precisão</dt>
          <dd>{formatAccuracy(location.accuracyMeters)}</dd>
        </div>
        <div>
          <dt>Coordenadas</dt>
          <dd className="opmap-detail__coords">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </dd>
        </div>
        <div>
          <dt>OS atual</dt>
          <dd>
            {currentWorkOrder ? (
              <Link to={`/work-orders/${currentWorkOrder.id}`} className="opmap-detail__os-link">
                {currentWorkOrder.code}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
