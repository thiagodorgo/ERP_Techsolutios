import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { ApiError } from "../../services/api/client";
import { getPlatformOverview } from "./platform-overview.service";
import { composePlatformOrganizations, type PlatformOrganizationRow } from "./platform-organizations.state";
import { listPlatformTenants } from "./platform.service";

export type PlatformOrganizationsStatus = "loading" | "ready" | "empty" | "error" | "forbidden";

type State = {
  readonly rows: readonly PlatformOrganizationRow[];
  readonly status: PlatformOrganizationsStatus;
  readonly stale: boolean;
  readonly error: string | null;
};

const INITIAL: State = { rows: [], status: "loading", stale: false, error: null };

export function usePlatformOrganizations() {
  const { session } = useAuth();
  const [state, setState] = useState<State>(() => isMockMode() ? { ...INITIAL, status: "empty" } : INITIAL);
  const generation = useRef(0);

  const context = useMemo(() => ({
    token: session?.accessToken,
    tenantId: session?.tenant?.id,
    role: session?.user.roles[0],
    permissions: session?.user.permissions,
  }), [session]);

  const refresh = useCallback(async (background = false) => {
    const current = ++generation.current;
    if (!background) setState((previous) => ({ ...previous, status: previous.rows.length ? previous.status : "loading", error: null }));
    try {
      const [organizations, overview] = await Promise.all([listPlatformTenants(), getPlatformOverview(context)]);
      if (current !== generation.current) return;
      if (overview.forbidden) {
        setState({ rows: [], status: "forbidden", stale: false, error: "Seu perfil não tem permissão para consultar as organizações." });
        return;
      }
      if (overview.source === "fallback") throw new Error("overview_unavailable");
      const rows = composePlatformOrganizations(organizations, overview);
      setState({ rows, status: rows.length ? "ready" : "empty", stale: false, error: null });
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof ApiError && error.status === 403) {
        setState({ rows: [], status: "forbidden", stale: false, error: error.safeMessage });
      } else if (background) {
        setState((previous) => previous.rows.length ? { ...previous, stale: true, error: "A atualização mais recente falhou." } : { rows: [], status: "error", stale: false, error: "Não foi possível carregar as organizações." });
      } else {
        setState({ rows: [], status: "error", stale: false, error: "Não foi possível carregar as organizações." });
      }
    }
  }, [context]);

  useEffect(() => {
    generation.current += 1;
    if (isMockMode()) {
      setState({ rows: [], status: "empty", stale: false, error: null });
      return;
    }
    void refresh(false);
    return () => { generation.current += 1; };
  }, [refresh]);

  useAutoRefresh(refresh, { enabled: state.status !== "forbidden" && !isMockMode() });

  return { ...state, loading: state.status === "loading", refresh };
}
