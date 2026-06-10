import type { FieldLocationItem, OperationsMapData } from "./operations-map.types";
import { attachWorkOrdersToFieldLocations } from "./operations-map.adapter";
import { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";

const now = Date.now();

export const mockFieldLocations: FieldLocationItem[] = [
  {
    id: "loc-marina",
    operatorId: "usr-ops-01",
    userId: "usr-ops-01",
    displayName: "Marina Costa",
    operatorName: "Marina Costa",
    teamName: "Equipe Norte",
    status: "available",
    latitude: -23.55052,
    longitude: -46.633308,
    accuracyMeters: 8,
    speed: 0,
    heading: 45,
    batteryLevel: 86,
    capturedAt: new Date(now - 4 * 60 * 1000).toISOString(),
    receivedAt: new Date(now - 3 * 60 * 1000).toISOString(),
    isStale: false,
  },
  {
    id: "loc-roberto",
    operatorId: "usr-ops-02",
    userId: "usr-ops-02",
    displayName: "Roberto Lima",
    operatorName: "Roberto Lima",
    teamName: "Equipe Guincho",
    status: "on_route",
    latitude: -23.5742,
    longitude: -46.6891,
    accuracyMeters: 12,
    speed: 7.4,
    heading: 120,
    batteryLevel: 64,
    capturedAt: new Date(now - 9 * 60 * 1000).toISOString(),
    receivedAt: new Date(now - 8 * 60 * 1000).toISOString(),
    isStale: false,
  },
  {
    id: "loc-ana",
    operatorId: "usr-ops-03",
    userId: "usr-ops-03",
    displayName: "Ana Martins",
    operatorName: "Ana Martins",
    teamName: "Equipe Sul",
    status: "in_service",
    latitude: -23.6127,
    longitude: -46.702,
    accuracyMeters: 18,
    speed: 0,
    heading: 220,
    batteryLevel: 41,
    capturedAt: new Date(now - 18 * 60 * 1000).toISOString(),
    receivedAt: new Date(now - 17 * 60 * 1000).toISOString(),
    isStale: true,
  },
  {
    id: "loc-caio",
    operatorId: "usr-ops-04",
    userId: "usr-ops-04",
    displayName: "Caio Nunes",
    operatorName: "Caio Nunes",
    teamName: "Equipe Manutencao",
    status: "offline",
    latitude: -23.5331,
    longitude: -46.5668,
    accuracyMeters: 35,
    speed: 0,
    heading: 0,
    batteryLevel: 18,
    capturedAt: new Date(now - 33 * 60 * 1000).toISOString(),
    receivedAt: new Date(now - 32 * 60 * 1000).toISOString(),
    isStale: true,
  },
];

export function getMockOperationsMapData(source: OperationsMapData["source"] = "mock", fallbackReason?: string): OperationsMapData {
  return {
    locations: attachWorkOrdersToFieldLocations(mockFieldLocations, getMockWorkOrdersData(source).items),
    source,
    fallbackReason,
  };
}
