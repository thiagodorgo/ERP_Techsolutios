import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkOrderPriority } from "../../../work-orders/work-orders.types";
import type { OperationsIncomingCall } from "../operations-map.types";

/**
 * M-5 (J-MAPAS-6) — Alerta visual de OS nova (requisito 3 do dono: "alerta visual ao chegar OS nova").
 *
 * DIFF 100% client-side sobre a fila `incomingCalls` já lida por poll+SSE (nenhum fetch novo, nada
 * fabricado): a cada refresh comparamos os ids atuais com os do ciclo anterior e sinalizamos SÓ os
 * NOVOS. Anti-alert-fatigue embutido:
 *   • dedup por id já visto (Set `seen`) — um id só alerta uma vez;
 *   • NÃO alerta na 1ª carga (baseline = tudo "já visto" no mount) — abrir a tela nunca dispara toast;
 *   • TETO de N por ciclo (`maxPerCycle`) — pico de OS não vira enxurrada de toasts;
 *   • cada toast/realce some sozinho após `toastTtlMs` (debounce natural).
 *
 * A regra é PURA em `reduceNewWorkOrders`/`resolvePulseIds` (testável sem efeitos/DOM); o hook só
 * segura o estado (seen ref, toasts, ids realçados) e os timers de expiração (limpos no unmount).
 *
 * LGPD §12: o item de alerta carrega SÓ id/código/prioridade — NUNCA coordenada (nem trafega, nem loga).
 * A11y: `pulseIds` (movimento no mapa) é ZERADO sob `prefers-reduced-motion`; o realce da lista/badge e o
 * toast (anúncio de status, estático) permanecem — quem pediu menos movimento ainda é avisado.
 */

export type NewWorkOrderAlertItem = {
  readonly id: string;
  readonly code: string;
  readonly priority: WorkOrderPriority;
};

export type NewWorkOrderToast = NewWorkOrderAlertItem & { readonly key: string };

export type UseNewWorkOrderAlertOptions = {
  readonly calls: readonly OperationsIncomingCall[];
  // Teto de novos por ciclo (anti-spam). Ids além do teto são marcados "vistos" (não re-alertam depois).
  readonly maxPerCycle?: number;
  // Tempo de vida do toast e do realce "novo" (ms) — some sozinho, sem clique.
  readonly toastTtlMs?: number;
  // Override do prefers-reduced-motion (para teste). Ausente → lê a media query do sistema.
  readonly reducedMotion?: boolean;
};

export type NewWorkOrderAlertState = {
  readonly toasts: readonly NewWorkOrderToast[];
  // Ids recém-chegados ainda em janela de realce (lista/badge). Realce ESTÁTICO — não é movimento.
  readonly newIds: ReadonlySet<string>;
  // Ids que devem PULSAR no mapa. = `newIds`, exceto sob reduced-motion (→ vazio: sem movimento).
  readonly pulseIds: ReadonlySet<string>;
  readonly dismissToast: (key: string) => void;
};

export const DEFAULT_NEW_WORK_ORDER_MAX_PER_CYCLE = 3;
export const DEFAULT_NEW_WORK_ORDER_TOAST_TTL_MS = 6000;

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();

export type ReduceNewWorkOrdersResult = {
  // Novos DENTRO do teto → viram toast/realce.
  readonly fresh: readonly NewWorkOrderAlertItem[];
  // Próximo baseline de "já vistos" (inclui TODOS os novos, mesmo os além do teto → dedup real).
  readonly seen: ReadonlySet<string>;
};

/**
 * Núcleo PURO do diff (sem React, sem Date.now, determinístico). `baseline` = 1ª carga: marca tudo como
 * visto e NÃO devolve nada (sem alerta no mount). Fora do baseline: `fresh` = ids não vistos, limitados
 * ao teto; `seen` acumula TODOS os novos (inclusive overflow) para nunca re-alertar o mesmo id.
 */
export function reduceNewWorkOrders(
  seen: ReadonlySet<string>,
  calls: readonly OperationsIncomingCall[],
  options: { readonly maxPerCycle: number; readonly baseline: boolean },
): ReduceNewWorkOrdersResult {
  const nextSeen = new Set(seen);
  if (options.baseline) {
    for (const call of calls) nextSeen.add(call.id);
    return { fresh: [], seen: nextSeen };
  }

  const freshAll = calls.filter((call) => !seen.has(call.id));
  for (const call of freshAll) nextSeen.add(call.id); // dedup: marca TODOS (mesmo além do teto)

  const cap = Math.max(0, options.maxPerCycle);
  const fresh = freshAll.slice(0, cap).map((call) => ({ id: call.id, code: call.code, priority: call.priority }));
  return { fresh, seen: nextSeen };
}

/**
 * Ids que pulsam no mapa: os recém-chegados, EXCETO sob prefers-reduced-motion (→ vazio, sem movimento).
 * O realce estático da lista/badge e o toast não passam por aqui — só o pulso (animação) é suprimido.
 */
export function resolvePulseIds(newIds: ReadonlySet<string>, reducedMotion: boolean): ReadonlySet<string> {
  return reducedMotion ? EMPTY_IDS : newIds;
}

function readSystemReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useNewWorkOrderAlert(options: UseNewWorkOrderAlertOptions): NewWorkOrderAlertState {
  const {
    calls,
    maxPerCycle = DEFAULT_NEW_WORK_ORDER_MAX_PER_CYCLE,
    toastTtlMs = DEFAULT_NEW_WORK_ORDER_TOAST_TTL_MS,
    reducedMotion,
  } = options;

  const [toasts, setToasts] = useState<readonly NewWorkOrderToast[]>([]);
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(EMPTY_IDS);
  const [systemReducedMotion, setSystemReducedMotion] = useState(readSystemReducedMotion);

  const seenRef = useRef<ReadonlySet<string>>(EMPTY_IDS);
  const initializedRef = useRef(false);
  const ttlRef = useRef(toastTtlMs);
  ttlRef.current = toastTtlMs;
  const keyCounterRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const dismissToast = useCallback((key: string) => {
    setToasts((current) => current.filter((toast) => toast.key !== key));
  }, []);

  // Acompanha a media query do sistema de forma reativa (e SSR-safe: `matches` falso sem window).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setSystemReducedMotion(query.matches);
    handler();
    query.addEventListener?.("change", handler);
    return () => query.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    const baseline = !initializedRef.current;
    initializedRef.current = true;

    const { fresh, seen } = reduceNewWorkOrders(seenRef.current, calls, { maxPerCycle, baseline });
    seenRef.current = seen;
    if (fresh.length === 0) return;

    const batch: NewWorkOrderToast[] = fresh.map((item) => {
      keyCounterRef.current += 1;
      return { key: `nwo-${keyCounterRef.current}`, id: item.id, code: item.code, priority: item.priority };
    });
    const batchIds = batch.map((toast) => toast.id);

    setToasts((current) => [...current, ...batch]);
    setNewIds((current) => {
      const next = new Set(current);
      for (const id of batchIds) next.add(id);
      return next;
    });

    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      const keys = new Set(batch.map((toast) => toast.key));
      setToasts((current) => current.filter((toast) => !keys.has(toast.key)));
      setNewIds((current) => {
        const next = new Set(current);
        for (const id of batchIds) next.delete(id);
        return next;
      });
    }, ttlRef.current);
    timersRef.current.add(timer);
    // toastTtlMs fica fora das deps de propósito (lido via ref) — mudá-lo não deve re-rodar o diff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls, maxPerCycle]);

  // Parada garantida: todos os timers de expiração são cancelados no unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const motionReduced = reducedMotion ?? systemReducedMotion;
  const pulseIds = resolvePulseIds(newIds, motionReduced);

  return { toasts, newIds, pulseIds, dismissToast };
}
