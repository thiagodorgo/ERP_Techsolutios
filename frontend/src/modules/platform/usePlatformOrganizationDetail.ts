import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { getPlatformTenantDetail } from "./platform-tenant-detail.service";
import { emptyTenantDetail, type PlatformTenantDetailData } from "./platform-tenant-detail.types";
import { getPlatformTenantById } from "./platform.service";
import type { PlatformOrganization } from "./platform.types";

export type PlatformOrganizationDetailState = {
  readonly organization: PlatformOrganization | null;
  readonly data: PlatformTenantDetailData;
  readonly loading: boolean;
  readonly stale: boolean;
};

export function usePlatformOrganizationDetail(organizationId: string | undefined, initialOrganization?: PlatformOrganization) {
  const { session } = useAuth();
  const generation = useRef(0);
  const [state, setState] = useState<PlatformOrganizationDetailState>({
    organization: initialOrganization ?? null,
    data: emptyTenantDetail("api"),
    loading: true,
    stale: false,
  });
  const context = useMemo(() => ({
    token: session?.accessToken,
    tenantId: session?.tenant?.id,
    role: session?.user.roles[0],
    permissions: session?.user.permissions,
  }), [session]);
  const identity = `${session?.user.id ?? "anonymous"}:${organizationId ?? "missing"}`;

  const refresh = useCallback(async (background = false): Promise<PlatformOrganizationDetailState> => {
    const cycle = ++generation.current;
    if (!organizationId) {
      const next = { organization: null, data: { ...emptyTenantDetail("api"), notFound: true }, loading: false, stale: false };
      setState(next);
      return next;
    }
    if (!background) setState((current) => ({ ...current, loading: true, stale: false }));
    try {
      const [organization, data] = await Promise.all([
        initialOrganization ? Promise.resolve(initialOrganization) : getPlatformTenantById(organizationId),
        getPlatformTenantDetail(organizationId, context),
      ]);
      if (cycle !== generation.current) return state;
      if (data.forbidden || data.notFound) {
        const next = { organization: data.forbidden ? null : organization, data, loading: false, stale: false };
        setState(next);
        return next;
      }
      if (data.source === "fallback") {
        let next = state;
        setState((current) => {
          next = background && current.data.detail ? { ...current, loading: false, stale: true } : { organization, data, loading: false, stale: false };
          return next;
        });
        return next;
      }
      const next = { organization, data, loading: false, stale: false };
      setState(next);
      return next;
    } catch {
      let next = state;
      if (cycle === generation.current) {
        setState((current) => {
          next = background && current.data.detail ? { ...current, loading: false, stale: true } : { organization: null, data: emptyTenantDetail("fallback"), loading: false, stale: false };
          return next;
        });
      }
      return next;
    }
  }, [context, initialOrganization, organizationId, state]);

  useEffect(() => {
    generation.current += 1;
    setState({ organization: initialOrganization ?? null, data: emptyTenantDetail("api"), loading: true, stale: false });
    void refresh(false);
    return () => { generation.current += 1; };
  }, [identity]);

  const autoRefresh = useCallback(async (background?: boolean) => { await refresh(background); }, [refresh]);
  useAutoRefresh(autoRefresh, { enabled: !state.data.forbidden && !state.data.notFound });
  return { ...state, refresh };
}
