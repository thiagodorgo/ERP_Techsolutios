import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getPayableForSource } from "./payable-source.service";
import type {
  PayableSourceApiContext,
  PayableSourceModule,
  PayableSourceSource,
  PayableTitleView,
} from "./payable-source.types";

// Ω4C PR-02 — hook do toggle de "Contas a Pagar por origem" (modo edição). Monta o context de auth+tenant
// a partir dos providers e carrega o título ATIVO da fonte (module,id). O service já é honesto (D-007):
// mock/erro devolvem "não lançado"; 403 → forbidden. `refresh` é reusado após Lançar/Retirar para o badge
// refletir o backend por DADO REAL (nunca por flag local).

export type UsePayableSource = {
  readonly title: PayableTitleView | null;
  readonly loading: boolean;
  readonly forbidden: boolean;
  readonly source: PayableSourceSource;
  readonly context: PayableSourceApiContext;
  readonly refresh: () => Promise<void>;
};

export function usePayableSource(module: PayableSourceModule, id: string): UsePayableSource {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  const context = useMemo<PayableSourceApiContext>(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const [title, setTitle] = useState<PayableTitleView | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [source, setSource] = useState<PayableSourceSource>("api");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayableForSource(context, module, id);
      setTitle(data.title);
      setForbidden(data.forbidden);
      setSource(data.source);
    } finally {
      setLoading(false);
    }
  }, [context, module, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { title, loading, forbidden, source, context, refresh };
}
