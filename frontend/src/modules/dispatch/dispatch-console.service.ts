import { isMockMode } from "../../config/env";
import { ApiError, apiData, apiRequest } from "../../services/api/client";
import { parseDashboardSummary, type DashboardSummaryModel } from "../dashboard/dashboard.adapter";
import { listDispatchesFromApi } from "../operations/dispatches/dispatches.service";
import type { DispatchListItem } from "../operations/dispatches/dispatches.types";
import {
  adaptFieldLocationsResponse,
  attachDispatchesToFieldLocations,
  attachWorkOrdersToFieldLocations,
} from "../operations/map/operations-map.adapter";
import type { FieldLocationItem, OperationsMapApiContext } from "../operations/map/operations-map.types";
import { adaptWorkOrdersResponse, hasWorkOrdersList } from "../work-orders/work-orders.adapter";
import type { WorkOrderListItem } from "../work-orders/work-orders.types";

// B-SAN3-06a (D-TELAS-SAN3-06a) — as leituras do Console Dispatcher. Só GET que JÁ existem no servidor; nenhuma escrita,
// nenhum endpoint novo. Cada fonte é pedida SÓ com a permissão do próprio endpoint (`can`): sem ela, a requisição não
// sai e o bloco nasce "acesso não permitido" (o técnico de campo tem `field_dispatch:read` e não tem
// `field_location:read` — catálogo, `src/modules/core-saas/permissions/catalog.ts`). O 403 da fonte é separado do erro
// de sistema, e nenhum ramo de falha fabrica dado (D-007): ou é o que o servidor mandou, ou é um estado.
//
// Por que não os serviços prontos (declarado no relatório do dev): `getLatestFieldLocations` engole o 403 como falha
// genérica e, com dado, refaz por dentro `GET /work-orders?limit=100` e `GET /operations/dispatches`; `useDashboardData`,
// `useFieldOperators` e `useOperationsMap` pedem `/field-locations/latest` sem gate; `getOperationalDashboard` engole o
// 403 e devolve rótulos prontos em vez das contagens. Aqui se reusam os ADAPTERS desses módulos, não se reescreve
// nenhum.

/** Permissão do endpoint de cada fonte — a mesma do `requirePermission` do backend. */
export const DISPATCH_CONSOLE_SOURCE_PERMISSION = {
  summary: "dashboard:read",
  workOrders: "work_orders:read",
  locations: "field_location:read",
  dispatches: "field_dispatch:read",
} as const;

/** Teto de OS lidas por ciclo — o mesmo do Mapa Operacional (`operations-map.service.ts`, teto da API). */
export const DISPATCH_CONSOLE_WORK_ORDERS_LIMIT = 100;

export type ConsoleSourceResult<T> =
  | { readonly kind: "ok"; readonly data: T }
  /** `requested: false` = a permissão não existe e a requisição nem saiu; `true` = o servidor respondeu 403. */
  | { readonly kind: "forbidden"; readonly requested: boolean }
  | { readonly kind: "error"; readonly message: string };

export type ConsoleWorkOrders = {
  readonly items: readonly WorkOrderListItem[];
  /** Total do servidor (paginação); maior que `items.length` quando há OS além do teto lido. */
  readonly total: number;
};

export type DispatchConsoleSnapshot = {
  readonly summary: ConsoleSourceResult<DashboardSummaryModel>;
  readonly workOrders: ConsoleSourceResult<ConsoleWorkOrders>;
  readonly locations: ConsoleSourceResult<readonly FieldLocationItem[]>;
};

const SUMMARY_ERROR = "Não foi possível consultar o resumo da operação.";
const WORK_ORDERS_ERROR = "Não foi possível consultar as ordens de serviço.";
const LOCATIONS_ERROR = "Não foi possível consultar a localização da equipe de campo.";

const NOT_REQUESTED: ConsoleSourceResult<never> = { kind: "forbidden", requested: false };

function failure(err: unknown, message: string): ConsoleSourceResult<never> {
  if (err instanceof ApiError && err.status === 403) return { kind: "forbidden", requested: true };
  return { kind: "error", message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 2xx sem o bloco `workOrders` não é "zero OS": é falha (o desconhecido cai no erro, nunca vira número). */
function hasSummaryWorkOrders(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  const container = isRecord(raw.data) ? raw.data : raw;
  return isRecord(container.workOrders) || isRecord(container.work_orders);
}

async function readSummary(context: OperationsMapApiContext): Promise<ConsoleSourceResult<DashboardSummaryModel>> {
  try {
    const raw = await apiData<unknown>("/dashboard/summary", context);
    if (!hasSummaryWorkOrders(raw)) return { kind: "error", message: SUMMARY_ERROR };
    return { kind: "ok", data: parseDashboardSummary(raw) };
  } catch (err) {
    return failure(err, SUMMARY_ERROR);
  }
}

async function readWorkOrders(context: OperationsMapApiContext): Promise<ConsoleSourceResult<ConsoleWorkOrders>> {
  try {
    const response = await apiRequest<unknown>(`/work-orders?limit=${DISPATCH_CONSOLE_WORK_ORDERS_LIMIT}`, context);
    if (!hasWorkOrdersList(response)) return { kind: "error", message: WORK_ORDERS_ERROR };
    const adapted = adaptWorkOrdersResponse(response, "api");
    return { kind: "ok", data: { items: adapted.items, total: Math.max(adapted.pagination.total, adapted.items.length) } };
  } catch (err) {
    return failure(err, WORK_ORDERS_ERROR);
  }
}

async function readLocations(context: OperationsMapApiContext): Promise<ConsoleSourceResult<readonly FieldLocationItem[]>> {
  try {
    const response = await apiRequest<unknown>("/field-locations/latest", context);
    return { kind: "ok", data: adaptFieldLocationsResponse(response) };
  } catch (err) {
    return failure(err, LOCATIONS_ERROR);
  }
}

/** Fonte AUXILIAR: só resolve o técnico do despacho ativo. Real ou vazia — nunca um estado de bloco. */
async function readDispatches(context: OperationsMapApiContext): Promise<readonly DispatchListItem[]> {
  const data = await listDispatchesFromApi(context, {}, { enrich: false });
  return data.source === "api" ? data.items : [];
}

/**
 * As quatro leituras do Console, em paralelo, cada uma só com a sua permissão. Em modo de demonstração
 * (`VITE_USE_MOCKS=true`) nenhuma requisição sai e todo bloco nasce VAZIO — o console não tem conjunto de demonstração
 * e não inventa um (D-007).
 */
export async function loadDispatchConsole(
  context: OperationsMapApiContext,
  can: (permission: string) => boolean,
): Promise<DispatchConsoleSnapshot> {
  if (isMockMode()) {
    return {
      summary: { kind: "ok", data: parseDashboardSummary({ workOrders: {} }) },
      workOrders: { kind: "ok", data: { items: [], total: 0 } },
      locations: { kind: "ok", data: [] },
    };
  }

  const [summary, workOrders, locations, dispatches] = await Promise.all([
    can(DISPATCH_CONSOLE_SOURCE_PERMISSION.summary) ? readSummary(context) : Promise.resolve(NOT_REQUESTED),
    can(DISPATCH_CONSOLE_SOURCE_PERMISSION.workOrders) ? readWorkOrders(context) : Promise.resolve(NOT_REQUESTED),
    can(DISPATCH_CONSOLE_SOURCE_PERMISSION.locations) ? readLocations(context) : Promise.resolve(NOT_REQUESTED),
    can(DISPATCH_CONSOLE_SOURCE_PERMISSION.dispatches) ? readDispatches(context) : Promise.resolve<readonly DispatchListItem[]>([]),
  ]);

  // A OS atual e o despacho de cada técnico vêm das MESMAS listas já lidas (sem pedido extra) — os adapters do Mapa.
  const composedLocations: ConsoleSourceResult<readonly FieldLocationItem[]> =
    locations.kind === "ok"
      ? {
          kind: "ok",
          data: attachDispatchesToFieldLocations(
            attachWorkOrdersToFieldLocations(locations.data, workOrders.kind === "ok" ? workOrders.data.items : []),
            dispatches,
          ),
        }
      : locations;

  return { summary, workOrders, locations: composedLocations };
}
