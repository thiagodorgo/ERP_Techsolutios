import { useCallback, useRef, useState } from "react";

import {
  bounceCheque,
  cancelRegisteredCheque,
  clearCheque,
  deleteCheque,
  depositCheque,
  editCheque,
  getCheque,
  registerCheque,
} from "./cheques.service";
import type { Cheque, ChequeAction, ChequesApiContext, EditChequePayload, RegisterChequePayload } from "./cheques.types";

// B-SAN3-24 (24a, P-SEM-DUPLO-EFEITO-PELA-TELA) — as escritas da tela de Cheques, as mesmas nas 3 aparências. Um pedido
// por vez: com um pedido em voo, o segundo clique não sai (o servidor também faz o flip condicional, mas a tela não
// manda o mesmo pedido duas vezes). O resultado devolve o cheque que o SERVIDOR gravou, ou o erro com o `reason`.

export type ChequeRunResult = { readonly ok: true; readonly cheque: Cheque } | { readonly ok: false; readonly error: unknown };

export type StateAction = Exclude<ChequeAction, "edit">;

export function useChequeActions(context: ChequesApiContext) {
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const guarded = useCallback(async (work: () => Promise<Cheque>): Promise<ChequeRunResult | undefined> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      return { ok: true, cheque: await work() };
    } catch (error) {
      return { ok: false, error };
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, []);

  /** Depositar, compensar, devolver, cancelar ou excluir. `reason` só vale na devolução. */
  const run = useCallback(
    (cheque: Cheque, action: StateAction, reason = "") =>
      guarded(() => {
        if (action === "deposit") return depositCheque(context, cheque.id);
        if (action === "clear") return clearCheque(context, cheque.id);
        if (action === "bounce") return bounceCheque(context, cheque.id, reason.trim());
        if (action === "cancel") return cancelRegisteredCheque(context, cheque.id);
        return deleteCheque(context, cheque.id);
      }),
    [context, guarded],
  );

  const register = useCallback((payload: RegisterChequePayload) => guarded(() => registerCheque(context, payload)), [context, guarded]);
  const edit = useCallback((chequeId: string, payload: EditChequePayload) => guarded(() => editCheque(context, chequeId, payload)), [context, guarded]);
  const reread = useCallback((chequeId: string) => getCheque(context, chequeId), [context]);

  return { busy, run, register, edit, reread };
}
