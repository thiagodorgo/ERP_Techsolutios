import { useCallback, useMemo, useState } from "react";

import {
  MAP_LEGEND_FILTER_ITEMS,
  getFieldLocationGroup,
  getWorkOrderLegendGroup,
  type LegendGroupKey,
  type MapLegendFilterItem,
} from "../map/mapMarkers";
import type {
  FieldLocationItem,
  OperationsMapWorkOrderPin,
} from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D6) — LEGENDA-FILTRO do rodapé: 8 toggles (verbatim do protótipo)
 * com contagem REAL no tooltip. Arquitetura "paridade de graça": o filtro é aplicado NA PÁGINA
 * (filtra os arrays antes de entregá-los ao canvas) — MapLibre, Google e o fallback esquemático
 * obedecem sem código de canvas. Estado LOCAL (não vai para a URL — regra do protótipo preservada).
 *
 * Regra de visibilidade do técnico (verbatim): grupo de status ON **e** (não-antiga OU "antiga" ON).
 * OS: some com o grupo de prioridade OFF; a ROTA segue o grupo da própria OS (o filtro de pins já
 * derruba a rota, porque a página monta as rotas a partir dos pins visíveis).
 *
 * D-007: contagens = length das listas REAIS completas (nunca fabricadas, nunca das filtradas).
 */

export type LegendFilterState = Readonly<Record<LegendGroupKey, boolean>>;

export const LEGEND_FILTER_ALL_ON: LegendFilterState = {
  disp: true,
  rota: true,
  atend: true,
  antiga: true,
  off: true,
  urg: true,
  alta: true,
  mb: true,
};

export type LegendFilterEntry = MapLegendFilterItem & {
  readonly count: number;
  readonly active: boolean;
  // Tooltip verbatim: "{n} {sufixo}" (ex.: "3 disponíveis", "1 OS urgentes").
  readonly tip: string;
};

/** Técnico visível = grupo de status ON e (posição fresca OU toggle "antiga" ON). */
export function isTechnicianVisibleInLegend(
  location: Pick<FieldLocationItem, "status" | "isStale">,
  state: LegendFilterState,
): boolean {
  const group = getFieldLocationGroup(location.status);
  return state[group] && (!location.isStale || state.antiga);
}

export function filterLocationsByLegend(
  locations: readonly FieldLocationItem[],
  state: LegendFilterState,
): FieldLocationItem[] {
  return locations.filter((location) => isTechnicianVisibleInLegend(location, state));
}

export function filterPinsByLegend(
  pins: readonly OperationsMapWorkOrderPin[],
  state: LegendFilterState,
): OperationsMapWorkOrderPin[] {
  return pins.filter((pin) => state[getWorkOrderLegendGroup(pin.priority)]);
}

/** Contagens REAIS por grupo (das listas completas): técnicos por grupo/antiga + OS por prioridade. */
export function countLegendGroups(
  locations: readonly FieldLocationItem[],
  workOrders: readonly Pick<OperationsMapWorkOrderPin, "priority">[],
): Record<LegendGroupKey, number> {
  const counts: Record<LegendGroupKey, number> = {
    disp: 0,
    rota: 0,
    atend: 0,
    antiga: 0,
    off: 0,
    urg: 0,
    alta: 0,
    mb: 0,
  };
  for (const location of locations) {
    counts[getFieldLocationGroup(location.status)] += 1;
    if (location.isStale) counts.antiga += 1;
  }
  for (const workOrder of workOrders) {
    counts[getWorkOrderLegendGroup(workOrder.priority)] += 1;
  }
  return counts;
}

export function buildLegendFilterEntries(
  state: LegendFilterState,
  counts: Record<LegendGroupKey, number>,
): LegendFilterEntry[] {
  return MAP_LEGEND_FILTER_ITEMS.map((item) => ({
    ...item,
    count: counts[item.key],
    active: state[item.key],
    tip: `${counts[item.key]} ${item.tipSuffix}`,
  }));
}

export function useLegendFilter(
  locations: readonly FieldLocationItem[],
  workOrderPins: readonly OperationsMapWorkOrderPin[],
) {
  const [state, setState] = useState<LegendFilterState>(LEGEND_FILTER_ALL_ON);

  const toggle = useCallback((key: LegendGroupKey) => {
    setState((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const counts = useMemo(() => countLegendGroups(locations, workOrderPins), [locations, workOrderPins]);
  const entries = useMemo(() => buildLegendFilterEntries(state, counts), [state, counts]);
  const visibleLocations = useMemo(() => filterLocationsByLegend(locations, state), [locations, state]);
  const visibleWorkOrderPins = useMemo(() => filterPinsByLegend(workOrderPins, state), [workOrderPins, state]);

  return { state, toggle, counts, entries, visibleLocations, visibleWorkOrderPins } as const;
}
