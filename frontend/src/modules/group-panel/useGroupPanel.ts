import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { listAvailableContexts, switchTenantContext } from "../context/repository";
import { getGroupPanelScope, getGroupPanelSummary } from "./group-panel.service";
import { groupPanelStateFrom, type GroupPanelGood, type GroupPanelState } from "./group-panel.state";

// B-GRUPO-GESTOR-1b — carrega o Painel do grupo ao abrir e no botão Atualizar. SEM consulta periódica (plano §3.5: cada
// leitura do resumo grava uma linha na trilha de cada pátio). Estados §7 como união discriminada; "dados desatualizados"
// = a atualização falhou depois de uma leitura boa, e a tela continua com a leitura boa (molde do `useLastGood`).

export function useGroupPanel() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [state, setState] = useState<GroupPanelState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const lastGood = useRef<GroupPanelGood | null>(null);
  const requestId = useRef(0);

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

  const load = useCallback(
    async (background: boolean) => {
      if (!activeContext) return;
      const id = ++requestId.current;
      if (background) setRefreshing(true);
      else setState({ status: "loading" });
      const [summary, scope] = await Promise.all([getGroupPanelSummary(context), getGroupPanelScope(context)]);
      // Resposta atrasada de uma leitura anterior nunca sobrescreve a mais nova.
      if (id !== requestId.current) return;
      const next = groupPanelStateFrom({ summary, scope, lastGood: background ? lastGood.current : null, now: new Date().toISOString() });
      lastGood.current = next.good;
      setState(next.state);
      setRefreshing(false);
    },
    [activeContext, context],
  );

  useEffect(() => {
    lastGood.current = null;
    void load(false);
  }, [load]);

  return { state, refreshing, refresh: () => void load(lastGood.current !== null) };
}

const SHORTCUT_PATHS = { finance: "/finance", "work-orders": "/work-orders", users: "/users" } as const;

/**
 * "Abrir o Financeiro deste pátio" (plano §4.4): troca a organização ativa pelo `POST /auth/active-tenant` que já existe
 * (só passa com vínculo de identidade; o servidor decide) e leva à tela. Molde do `ContextSelectionPage`.
 */
export function useGroupPanelShortcut() {
  const { session } = useAuth();
  const { setActiveContext } = useTenantContext();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ readonly organizationId: string; readonly text: string } | null>(null);

  const open = useCallback(
    async (organizationId: string, destination: keyof typeof SHORTCUT_PATHS) => {
      setBusyId(organizationId);
      setMessage(null);
      try {
        const contexts = await listAvailableContexts();
        const target = contexts.find((context) => context.tenantId === organizationId);
        if (!target) throw new Error("Você não tem mais conta ativa neste pátio.");
        const nextSession = organizationId !== session?.tenant?.id ? await switchTenantContext(organizationId) : session;
        if (!nextSession) throw new Error("Sessão não encontrada. Faça login novamente.");
        setActiveContext({ ...target, permissions: nextSession.user.permissions });
        navigate(SHORTCUT_PATHS[destination]);
      } catch {
        setMessage({ organizationId, text: "Não foi possível abrir este pátio agora. Tente de novo." });
      } finally {
        setBusyId(null);
      }
    },
    [navigate, session, setActiveContext],
  );

  return { busyId, message, open };
}
