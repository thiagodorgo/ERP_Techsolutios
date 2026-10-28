import { useCallback, useEffect, useState } from "react";

import { useFinanceApiContext } from "../accounts/useFinancialAccounts";
import { getReconciliationPolicy } from "./financial-entries.service";
import type { ReconciliationPolicy } from "./financial-entries.types";

// B-SAN3-12b — política de desfazer conciliação PARA O ATOR (GET /financial-entries/reconciliation-policy, §4.4): a tela
// mostra "Desfazer conciliação" só com `canUnreconcile`. É moldagem: o servidor recusa de qualquer forma (403
// unreconcile_forbidden vira mensagem honesta). Até a resposta chegar, e se ela falhar, vale "não pode" (fail-closed).

const CLOSED: ReconciliationPolicy = { canUnreconcile: false, delegatedToFinance: false };

export function useReconciliationPolicy(options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [policy, setPolicy] = useState<ReconciliationPolicy>(CLOSED);

  const refresh = useCallback(async () => {
    if (!ready || !options.enabled) return;
    setPolicy(await getReconciliationPolicy(context));
  }, [context, ready, options.enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { policy, refresh };
}
