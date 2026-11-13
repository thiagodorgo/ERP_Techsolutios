import { useCallback, useRef, useState } from "react";

import { closePeriod, reopenPeriod } from "./period-closes.service";
import type { PeriodDetail, PeriodsApiContext } from "./period-closes.types";

// B-SAN3-24 (24b) — fechar e reabrir, as mesmas nas 3 aparências. Um pedido por vez. O corpo do fechamento é `{}` no
// caminho comum e `{ force: true, reason }` SÓ no 2º passo do "fechar mesmo assim" (R-DISPUTA-DO-GET, R-AUDIT-FORCADO).
// Se o `POST` sem `force` voltar 422 `pending_items_block_close` (alguém pôs um título em contestação no meio), o hook
// RELÊ a competência (`GET /financial-periods/:period`) para a tela passar ao caminho forçado com a contagem nova (A-02:
// o cliente HTTP não traz o `details` do erro).

export type PeriodRunResult = { readonly ok: true; readonly detail: PeriodDetail } | { readonly ok: false; readonly error: unknown };

export function usePeriodActions(context: PeriodsApiContext, reloadPeriod: () => Promise<void>) {
  const inFlightRef = useRef(false);
  const [sending, setSending] = useState(false);

  const close = useCallback(
    async (period: string, forcing: boolean, reason: string): Promise<PeriodRunResult | undefined> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setSending(true);
      try {
        return { ok: true, detail: await closePeriod(context, period, { body: forcing ? { force: true, reason: reason.trim() } : {} }) };
      } catch (caught) {
        const error = caught as { readonly reason?: string };
        if (error.reason === "pending_items_block_close") await reloadPeriod();
        return { ok: false, error: caught };
      } finally {
        inFlightRef.current = false;
        setSending(false);
      }
    },
    [context, reloadPeriod],
  );

  const reopen = useCallback(
    async (period: string, reason: string): Promise<PeriodRunResult | undefined> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setSending(true);
      try {
        return { ok: true, detail: await reopenPeriod(context, period, reason.trim()) };
      } catch (caught) {
        return { ok: false, error: caught };
      } finally {
        inFlightRef.current = false;
        setSending(false);
      }
    },
    [context],
  );

  return { sending, close, reopen };
}
