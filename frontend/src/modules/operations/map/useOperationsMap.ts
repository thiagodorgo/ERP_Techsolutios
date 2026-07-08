import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isMockMode } from "../../../config/env";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getLatestFieldLocations, subscribeOperationsMapEvents } from "./operations-map.service";
import type { OperationsMapData, OperationsMapRealtimeState, OperationsMapRealtimeStatus } from "./operations-map.types";

const POLL_INTERVAL_MS = 30_000;
const REALTIME_RECONNECT_MS = 10_000;

type OperationsMapHookState = OperationsMapData & {
  readonly loading: boolean;
  readonly isRefreshing: boolean;
  readonly error?: string;
  readonly refreshedAt?: string;
  readonly realtime: OperationsMapRealtimeState;
};

export function useOperationsMap() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  // D-007: estado inicial SEMPRE vazio — modo mock nunca semeia pins fabricados.
  const initialData = useMemo<OperationsMapData>(
    () => ({ locations: [], source: isMockMode() ? "mock" : "api" }),
    [],
  );
  const [state, setState] = useState<OperationsMapHookState>({
    ...initialData,
    loading: !isMockMode(),
    isRefreshing: false,
    refreshedAt: isMockMode() ? new Date().toISOString() : undefined,
    realtime: createRealtimeState(isMockMode() ? "fallback" : "unavailable"),
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const refreshingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;
    if (background && refreshingRef.current) return;

    refreshingRef.current = true;
    setState((current) => {
      const hasExistingData = current.locations.length > 0;
      return {
        ...current,
        loading: !background && !hasExistingData,
        isRefreshing: background || hasExistingData,
        error: undefined,
      };
    });

    const data = await getLatestFieldLocations(context);
    setState((current) => {
      const merged = mergeOperationsMapRefresh(current, data);
      const preservedExisting = merged !== data;
      return {
        ...merged,
        loading: false,
        isRefreshing: false,
        error: data.source === "fallback" ? data.fallbackReason : undefined,
        // Falha de atualização preserva o "Atualizado às HH:MM" verdadeiro do último dado real.
        refreshedAt: preservedExisting ? current.refreshedAt : new Date().toISOString(),
        realtime: current.realtime,
      };
    });
    refreshingRef.current = false;
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!shouldUseOperationsMapPollingFallback(autoRefresh, state.realtime.status)) return;

    const id = setInterval(() => {
      void refresh(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, refresh, state.realtime.status]);

  useEffect(() => {
    if (isMockMode()) {
      setState((current) => ({ ...current, realtime: createRealtimeState("fallback") }));
      return;
    }

    if (!activeContext || !context.permissions?.includes("field_location:read")) {
      setState((current) => ({
        ...current,
        realtime: createRealtimeState(
          "unavailable",
          !activeContext
            ? "Selecione um contexto para habilitar realtime."
            : "Permissao field_location:read necessaria para consumir realtime.",
        ),
      }));
      return;
    }

    let closed = false;

    setState((current) => ({
      ...current,
      realtime:
        current.realtime.status === "connected"
          ? current.realtime
          : createRealtimeState("degraded", "Tentando conectar ao SSE; polling de 30s segue ativo.", reconnectAttempt),
    }));

    const unsubscribe = subscribeOperationsMapEvents(context, {
      onOpen: () => {
        if (closed) return;

        setState((current) => ({
          ...current,
          realtime: createRealtimeState("connected", "SSE tenant-scoped conectado.", reconnectAttempt, {
            lastConnectedAt: new Date().toISOString(),
          }),
        }));
      },
      onEvent: () => {
        if (closed) return;

        setState((current) => ({
          ...current,
          realtime: {
            ...createRealtimeState("connected", "Evento realtime recebido; dados do mapa atualizados em segundo plano.", reconnectAttempt, {
              lastConnectedAt: current.realtime.lastConnectedAt,
              lastEventAt: new Date().toISOString(),
            }),
          },
        }));
        void refresh(true);
      },
      onError: () => {
        if (closed) return;

        setState((current) => ({
          ...current,
          realtime: createRealtimeState(
            "degraded",
            "SSE indisponivel; reconexao em andamento e polling de 30s ativo.",
            reconnectAttempt + 1,
            {
              lastConnectedAt: current.realtime.lastConnectedAt,
              lastEventAt: current.realtime.lastEventAt,
            },
          ),
        }));

        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempt((attempt) => attempt + 1);
        }, REALTIME_RECONNECT_MS);
      },
    });

    return () => {
      closed = true;
      unsubscribe();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [activeContext, context, reconnectAttempt, refresh]);

  return {
    ...state,
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}

// Estado "dados desatualizados" (CLAUDE.md §7) sem violar D-007: quando um refresh
// FALHA (source "fallback", sempre vazio por contrato) e a tela já exibe um dataset
// vindo da API real, preserva-se esse último dado bom — nada é fabricado, apenas não
// se apaga o que a fonte real já entregou. A UI sinaliza a fonte indisponível e que
// os dados podem estar desatualizados. Refresh bem-sucedido substitui tudo.
export function mergeOperationsMapRefresh(current: OperationsMapData, incoming: OperationsMapData): OperationsMapData {
  if (incoming.source === "fallback" && incoming.locations.length === 0 && current.locations.length > 0) {
    return {
      locations: current.locations,
      source: "fallback",
      fallbackReason: incoming.fallbackReason,
      maintenanceVehicleIds: current.maintenanceVehicleIds,
      insuredVehicleIds: current.insuredVehicleIds,
    };
  }

  return incoming;
}

export function shouldUseOperationsMapPollingFallback(
  autoRefresh: boolean,
  realtimeStatus: OperationsMapRealtimeStatus,
): boolean {
  return autoRefresh && realtimeStatus !== "connected";
}

function createRealtimeState(
  status: OperationsMapRealtimeStatus,
  detail?: string,
  retryCount = 0,
  timestamps: Pick<OperationsMapRealtimeState, "lastConnectedAt" | "lastEventAt"> = {},
): OperationsMapRealtimeState {
  if (status === "connected") {
    return {
      status,
      label: "Realtime conectado",
      detail: detail ?? "Eventos de operacao em campo chegam via SSE tenant-scoped.",
      fallbackPolling: false,
      retryCount,
      ...timestamps,
    };
  }

  if (status === "degraded") {
    return {
      status,
      label: "Realtime reconectando",
      detail: detail ?? "Atualização em tempo real degradada; usando atualização periódica de 30s.",
      fallbackPolling: true,
      retryCount,
      ...timestamps,
    };
  }

  if (status === "fallback") {
    return {
      status,
      label: "Atualização periódica",
      detail: detail ?? "A tela está usando atualização periódica em vez de tempo real.",
      fallbackPolling: true,
      retryCount,
      ...timestamps,
    };
  }

  return {
    status,
    label: "Realtime indisponivel",
    detail: detail ?? "Realtime nao esta disponivel neste contexto; polling de 30s permanece como fallback.",
    fallbackPolling: true,
    retryCount,
    ...timestamps,
  };
}
