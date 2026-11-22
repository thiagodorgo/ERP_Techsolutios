import { useEffect, useRef, useState } from "react";

import { getGroupPanelScope } from "./group-panel.service";
import type { GroupPanelApiContext } from "./group-panel.types";

// B-GRUPO-GESTOR-1b (Emenda 1b §2.3 item 6) — quantos pátios o `GET /group-panel/scope` devolve, para o menu lateral
// decidir se mostra o Painel do grupo. Chamado UMA vez no AppShell (o layout que fica montado durante a navegação), no
// molde do contador de Aprovações: lê no `useEffect`, uma vez ao entrar e outra quando a organização ativa ou o token
// mudam, nunca por render. O contexto mais recente fica num `useRef`, para a dependência do efeito ser só
// `[tenantId, token]`; resposta atrasada de uma organização anterior é descartada (`alive`, molde do GroupMembersDialog).
// Fail-closed: antes da resposta, erro, 403 e resposta inválida dão `null` (o item fica escondido). Contexto `null`
// (sem `financial_entries:read` na organização ativa) não faz a leitura. O `/scope` não grava trilha.
export function useGroupPanelMenuScope(context: GroupPanelApiContext | null): number | null {
  const [organizations, setOrganizations] = useState<number | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;
  // `null` (sem contexto) é diferente de qualquer organização: ganhar ou perder o contexto também relê ou esconde.
  const tenantId = context ? (context.tenantId ?? "") : null;
  const token = context?.token ?? null;

  useEffect(() => {
    const current = contextRef.current;
    setOrganizations(null);
    if (!current) return undefined;
    let alive = true;
    void (async () => {
      const result = await getGroupPanelScope(current);
      if (!alive) return;
      setOrganizations(result.ok ? result.data.organizations.length : null);
    })();
    return () => {
      alive = false;
    };
  }, [tenantId, token]);

  return organizations;
}
