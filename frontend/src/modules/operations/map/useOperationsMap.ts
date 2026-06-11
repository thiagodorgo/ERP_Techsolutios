import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isMockMode } from "../../../config/env";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getMockOperationsMapData } from "./operations-map.mock";
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
  const initialData = useMemo(
    () => (isMockMode() ? getMockOperationsMapData("mock") : { locations: [], source: "api" as const }),
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
    setState((current) => ({
      ...data,
      loading: false,
      isRefreshing: false,
      error: data.source === "fallback" ? data.fallbackReason : undefined,
      refreshedAt: new Date().toISOString(),
      realtime: current.realtime,
    }));
    refreshingRef.current = false;
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      void refresh(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

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
      detail: detail ?? "Realtime degradado; polling de 30s permanece ativo.",
      fallbackPolling: true,
      retryCount,
      ...timestamps,
    };
  }

  if (status === "fallback") {
    return {
      status,
      label: "Fallback polling ativo",
      detail: detail ?? "A tela esta operando com polling local ou mock sem SSE.",
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
