import type { Feature, FeatureCollection, LineString } from "geojson";

import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../operations-map.types";
import { getWorkOrderLegendGroup, getWorkOrderPriorityColor, isValidMapCoordinate } from "./mapMarkers";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D2) — builder PURO do GeoJSON das ROTAS TRACEJADAS técnico→OS
 * (protótipo: L.polyline dash "6 7", 2.5px, #3b82f6, opacidade .8 — recriado como camada line
 * "wo-routes" no MapLibre com line-dasharray [2.4, 2.8], múltiplos da largura).
 *
 * HONESTIDADE (D-007): a linha SÓ existe quando o par (posição REAL do técnico atribuído,
 * coordenada REAL da OS) está completo nas MESMAS listas já lidas. Qualquer lado ausente →
 * sem feature (nunca inventa segmento). É uma linha RETA de vínculo, não uma rota calculada
 * (rota real = PD-006, junta-5, fora deste escopo).
 *
 * Puro e determinístico: sem Date.now, sem WebGL — roda em node --test.
 */

export const WORK_ORDER_ROUTES_SOURCE_ID = "wo-routes";

// Estilo verbatim do protótipo (linha tracejada azul).
export const WORK_ORDER_ROUTE_COLOR = "#3b82f6";
export const WORK_ORDER_ROUTE_WIDTH = 2.5;
export const WORK_ORDER_ROUTE_OPACITY = 0.8;
// Dash em múltiplos da largura (2.5px × [2.4, 2.8] ≈ o dash "6 7" do protótipo Leaflet).
export const WORK_ORDER_ROUTE_DASHARRAY: readonly [number, number] = [2.4, 2.8];

export type WorkOrderRouteProps = {
  readonly workOrderId: string;
  // Grupo de legenda da OS (urg/alta/mb): a rota SEGUE o grupo da própria OS no filtro (D6).
  readonly group: "urg" | "alta" | "mb";
  readonly priorityColor: string;
};

export type WorkOrderRouteFeatureCollection = FeatureCollection<LineString, WorkOrderRouteProps>;

/**
 * Resolve a LOCALIZAÇÃO do técnico atribuído à OS: casa assignedOperatorId/assignedUserId com
 * operatorId/userId das localizações; fallback = despacho ativo apontando para a OS
 * (currentDispatch.workOrderId). Sem par → null (sem linha, sem nome — nunca inventa).
 */
export function findAssignedLocation(
  workOrder: Pick<OperationsMapWorkOrderPin, "id" | "assignedOperatorId" | "assignedUserId">,
  locations: readonly FieldLocationItem[],
): FieldLocationItem | null {
  const assignedIds = new Set(
    [workOrder.assignedOperatorId, workOrder.assignedUserId].filter((id): id is string => Boolean(id)),
  );
  if (assignedIds.size > 0) {
    const byAssignment = locations.find(
      (location) => assignedIds.has(location.operatorId) || (location.userId ? assignedIds.has(location.userId) : false),
    );
    if (byAssignment) return byAssignment;
  }
  return locations.find((location) => location.currentDispatch?.workOrderId === workOrder.id) ?? null;
}

/**
 * Monta a FeatureCollection de rotas para as OS EM ATENDIMENTO. Cada feature é um LineString
 * [posição do técnico, coordenada da OS]; pares incompletos (técnico sem posição válida, OS sem
 * coordenada, nenhum técnico atribuído) são simplesmente omitidos.
 */
export function buildWorkOrderRouteFeatureCollection(
  inServicePins: readonly OperationsMapWorkOrderPin[],
  locations: readonly FieldLocationItem[],
): WorkOrderRouteFeatureCollection {
  const features: Feature<LineString, WorkOrderRouteProps>[] = [];

  for (const pin of inServicePins) {
    if (!isValidMapCoordinate(pin.latitude, pin.longitude)) continue;
    const technician = findAssignedLocation(pin, locations);
    if (!technician) continue;
    if (!isValidMapCoordinate(technician.latitude, technician.longitude)) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [technician.longitude, technician.latitude],
          [pin.longitude, pin.latitude],
        ],
      },
      properties: {
        workOrderId: pin.id,
        group: getWorkOrderLegendGroup(pin.priority),
        priorityColor: getWorkOrderPriorityColor(pin.priority),
      },
    });
  }

  return { type: "FeatureCollection", features };
}
