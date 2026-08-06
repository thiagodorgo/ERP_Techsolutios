import { useEffect, useMemo, useState, type DragEvent } from "react";

import {
  computeDistanceKm,
  estimateTravelMinutes,
  etaToneForMinutes,
  formatCompactKm,
  formatCompactMinutes,
  formatCompletionRate,
  operatorUserIdOf,
  type Coordinate,
} from "../allocation";
import { formatLastSeen } from "../operations-map.adapter";
import { canDropOnTechnician, readDraggedWorkOrderId } from "../map/dnd";
import { getFieldLocationGroup, getFieldLocationGroupColor, TECH_STALE_HEX } from "../map/mapMarkers";
import type { FieldLocationItem } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D5) — painel "Técnicos de campo" no formato trow VERBATIM do
 * protótipo: dot de status (cor do grupo; âmbar quando antiga), nome, selo "antiga", célula de
 * ETA (visto → "~km · ~min" quando há OS selecionada; good ≤15 min / mid ≤40 min sobre a NOSSA
 * estimativa honesta de 28 km/h) e botão "Alocar" visível SÓ com OS selecionada (os-selected).
 * Substitui a tabela + cartões do M-3.
 *
 * Filtros do painel: fchips Todos/Ativos/Fora de serviço + select Distância/Tempo/Nome/Status
 * (+ "Índice de conclusão", adição registrada — feature J-MAPAS-7 preservada, visível só para
 * quem pode alocar). Selecionar uma OS salta a ordenação para "Distância" (regra do protótipo).
 *
 * DnD nativo: a linha é droptarget do card de OS arrastado (payload "text/os"); linha "off" não
 * aceita. Gating: sem field_dispatch:create não há botão Alocar nem drop. Clique na linha abre o
 * detail popover do técnico. LGPD §12: nenhuma coordenada crua — só ~km/~min derivados.
 */

export type OperatorPanelFilter = "todos" | "ativo" | "off";
export type OperatorPanelSort = "dist" | "tempo" | "nome" | "status" | "indice";

type RowMetrics = { readonly km: number; readonly min: number } | null;

export function OperationsOperatorList({
  locations,
  selectedCallId,
  selectedCallCoordinate,
  canAllocate = false,
  completionByOperator,
  onAllocate,
  onDropAllocate,
  onOpenDetail,
  onHoverDetail,
  now,
}: {
  readonly locations: readonly FieldLocationItem[];
  readonly selectedCallId?: string;
  readonly selectedCallCoordinate?: Coordinate | null;
  readonly canAllocate?: boolean;
  readonly completionByOperator?: ReadonlyMap<string, number | null>;
  readonly onAllocate?: (location: FieldLocationItem) => void;
  readonly onDropAllocate?: (workOrderId: string, location: FieldLocationItem) => void;
  readonly onOpenDetail: (location: FieldLocationItem) => void;
  /** Hover na linha: detalhe efêmero (some ao sair). Diretiva do dono (2026-08-06). */
  readonly onHoverDetail?: (location: FieldLocationItem | null) => void;
  readonly now?: Date;
}) {
  const [filtro, setFiltro] = useState<OperatorPanelFilter>("todos");
  const [ordem, setOrdem] = useState<OperatorPanelSort>("dist");
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const reference = now ?? new Date();

  // Regra do protótipo: selecionar uma OS salta a ordenação para "Distância" (exceto "Tempo").
  useEffect(() => {
    if (selectedCallId) {
      setOrdem((current) => (current === "tempo" ? current : "dist"));
    }
  }, [selectedCallId]);

  const rows = useMemo(() => {
    const withMetrics = locations.map((location) => {
      const km = selectedCallCoordinate ? computeDistanceKm(location, selectedCallCoordinate) : null;
      const metrics: RowMetrics = km === null ? null : { km, min: Math.max(1, Math.round(estimateTravelMinutes(km))) };
      return { location, metrics, group: getFieldLocationGroup(location.status) };
    });

    const filtered =
      filtro === "ativo"
        ? withMetrics.filter((row) => row.group !== "off")
        : filtro === "off"
          ? withMetrics.filter((row) => row.group === "off")
          : withMetrics;

    return [...filtered].sort((a, b) => {
      if (ordem === "nome") return a.location.displayName.localeCompare(b.location.displayName, "pt-BR");
      if (ordem === "status") return a.group.localeCompare(b.group);
      if (ordem === "indice") {
        const rateA = completionByOperator?.get(operatorUserIdOf(a.location)) ?? null;
        const rateB = completionByOperator?.get(operatorUserIdOf(b.location)) ?? null;
        if (rateA === null && rateB === null) return a.location.displayName.localeCompare(b.location.displayName, "pt-BR");
        if (rateA === null) return 1;
        if (rateB === null) return -1;
        return rateB - rateA;
      }
      // dist/tempo: sem métrica (sem OS selecionada/sem coordenada) preserva a ordem de chegada.
      if (!a.metrics || !b.metrics) return 0;
      return ordem === "tempo" ? a.metrics.min - b.metrics.min : a.metrics.km - b.metrics.km;
    });
  }, [locations, filtro, ordem, selectedCallCoordinate, completionByOperator]);

  const dropEnabled = canAllocate && Boolean(onDropAllocate);

  const handleDragOver = (event: DragEvent<HTMLElement>, location: FieldLocationItem, group: "disp" | "rota" | "atend" | "off") => {
    if (!canDropOnTechnician(group, dropEnabled)) return; // linha "off" não aceita (protótipo)
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(location.id);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, location: FieldLocationItem, group: "disp" | "rota" | "atend" | "off") => {
    if (!canDropOnTechnician(group, dropEnabled)) return;
    event.preventDefault();
    setDropTargetId(null);
    const workOrderId = readDraggedWorkOrderId(event.dataTransfer);
    if (workOrderId) onDropAllocate?.(workOrderId, location);
  };

  return (
    <>
      <div className="opmap-filters">
        {(
          [
            ["todos", "Todos"],
            ["ativo", "Ativos"],
            ["off", "Fora de serviço"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`opmap-fchip${filtro === key ? " on" : ""}`}
            aria-pressed={filtro === key}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
        <select
          className="opmap-sort"
          aria-label="Ordenar técnicos"
          value={ordem}
          onChange={(event) => setOrdem(event.target.value as OperatorPanelSort)}
        >
          <option value="dist">Distância</option>
          <option value="tempo">Tempo</option>
          <option value="nome">Nome</option>
          <option value="status">Status</option>
          {canAllocate ? <option value="indice">Índice de conclusão</option> : null}
        </select>
      </div>
      {rows.length === 0 ? (
        <div className="opmap-empty">Nenhum técnico neste filtro</div>
      ) : (
        <ul className="opmap-trows" aria-label="Técnicos de campo">
          {rows.map(({ location, metrics, group }) => {
            const isOff = group === "off";
            const dotColor = location.isStale ? TECH_STALE_HEX : getFieldLocationGroupColor(location.status);
            const completion = completionByOperator?.get(operatorUserIdOf(location)) ?? null;
            const etaTone = metrics ? etaToneForMinutes(metrics.min) : "far";
            return (
              <li key={location.id}>
                <div
                  className={`opmap-trow${isOff ? " off" : ""}${dropTargetId === location.id ? " droptarget" : ""}`}
                  data-tec={location.id}
                  onDragOver={(event) => handleDragOver(event, location, group)}
                  onDragLeave={() => setDropTargetId((current) => (current === location.id ? null : current))}
                  onDrop={(event) => handleDrop(event, location, group)}
                  onMouseEnter={() => onHoverDetail?.(location)}
                  onMouseLeave={() => onHoverDetail?.(null)}
                  onFocus={() => onHoverDetail?.(location)}
                  onBlur={() => onHoverDetail?.(null)}
                >
                  <button
                    type="button"
                    className="opmap-trow__hit"
                    aria-label={`Abrir detalhes de ${location.displayName}`}
                    onClick={() => onOpenDetail(location)}
                  >
                    <span className="opmap-trow__dot" style={{ background: dotColor }} aria-hidden="true" />
                    <span className="opmap-trow__nm">{location.displayName}</span>
                    {location.isStale ? <span className="opmap-trow__old">antiga</span> : null}
                    {ordem === "indice" ? (
                      <span className="opmap-trow__eta">
                        <b>{formatCompletionRate(completion)}</b>
                      </span>
                    ) : metrics ? (
                      <span className={`opmap-trow__eta ${etaTone === "far" ? "" : etaTone}`.trim()}>
                        <b>{formatCompactKm(metrics.km)}</b> · <b>{formatCompactMinutes(metrics.km)}</b>
                      </span>
                    ) : (
                      <span className="opmap-trow__eta">{formatLastSeen(location.capturedAt, reference)}</span>
                    )}
                  </button>
                  {canAllocate && selectedCallId ? (
                    <button
                      type="button"
                      className="opmap-trow__go"
                      disabled={isOff}
                      aria-label={`Alocar chamado selecionado para ${location.displayName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAllocate?.(location);
                      }}
                    >
                      Alocar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
