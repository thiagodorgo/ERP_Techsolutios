import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { ApiError } from "../../services/api/client";
import { listAllPendingApprovals } from "./approval.service";
import type { ApprovalApiContext, OperationalApproval } from "./approval.types";

// Onda 1 — hook da "Fila de Aprovações" da organização ativa (GET /api/v1/approvals/pending). Espelha
// useAuditEvents: monta o `context` da sessão/organização, faz a 1ª carga no mount, auto-refresh em
// segundo plano (desligado após 403 do gate) e expõe {items, loading, forbidden, source, refresh}. As
// aprovações vêm do backend — o front NUNCA fabrica item nem número (D-007). Em modo demonstração a
// fonte é o service mock (um approval honesto, só os campos reais do DTO).

export type ApprovalsQueueSource = "api" | "mock" | "fallback";

export type ApprovalsQueueResult = {
  readonly items: OperationalApproval[];
  readonly source: ApprovalsQueueSource;
  readonly forbidden: boolean;
};

// Contexto de API derivado da sessão + organização ativa. Compartilhado pela fila e pela tela de
// detalhe, para não duplicar a montagem do `context`.
export function useApprovalContext(): ApprovalApiContext {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  return useMemo<ApprovalApiContext>(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );
}

// Loader testável (espelha getAuditEvents): mock → itens do service mock, source "mock"; 403 do gate
// `work_orders:read` → forbidden + fallback (não é falha de sistema); qualquer outro erro (5xx/rede) →
// fallback vazio. NUNCA fabrica item; a UI mostra o estado honesto e o auto-refresh tenta de novo.
export async function loadApprovalsQueue(context: ApprovalApiContext): Promise<ApprovalsQueueResult> {
  if (isMockMode()) {
    return { items: await listAllPendingApprovals(context), source: "mock", forbidden: false };
  }

  try {
    return { items: await listAllPendingApprovals(context), source: "api", forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return { items: [], source: "fallback", forbidden: true };
    }
    return { items: [], source: "fallback", forbidden: false };
  }
}

export function useApprovalsQueue() {
  const { activeContext } = useTenantContext();
  const context = useApprovalContext();
  const [items, setItems] = useState<OperationalApproval[]>([]);
  const [source, setSource] = useState<ApprovalsQueueSource>(isMockMode() ? "mock" : "api");
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(!isMockMode());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém a fila visível,
  // sem flicker no auto-refresh); só a 1ª carga usa `loading`.
  const refresh = useCallback(
    async (background = false) => {
      if (!activeContext) return;
      if (background) setIsRefreshing(true);
      else setLoading(true);
      const result = await loadApprovalsQueue(context);
      setItems(result.items);
      setSource(result.source);
      setForbidden(result.forbidden);
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling depois do 403 (gate `work_orders:read`): mantém a mensagem de acesso negado sem
  // martelar o endpoint proibido a cada ciclo.
  useAutoRefresh(refresh, { enabled: !forbidden });

  return { items, loading, isRefreshing, forbidden, source, refresh, context };
}
