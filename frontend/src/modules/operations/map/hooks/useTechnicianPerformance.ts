import { useEffect, useMemo, useRef, useState } from "react";

import type { OperationsMapApiContext } from "../operations-map.types";
import {
  fetchTechnicianPerformance,
  toCompletionRateByOperator,
  type TechnicianPerformanceItem,
} from "../technician-performance.service";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO) — busca o índice de conclusão de OS por técnico (ranking tenant-wide) UMA vez
 * quando habilitado (`enabled` = o papel pode alocar, pois o endpoint é gateado por `field_dispatch:create`).
 * Sem polling: o índice é gerencial e muda devagar; recarrega quando o contexto de tenant muda.
 *
 * D-007/honestidade: em mock ou erro a lista vem vazia → o `byOperator` fica vazio → a UI mostra "—" para
 * todo mundo (nunca 0% fabricado). `source` deixa a UI explicar quando o índice não pôde ser carregado.
 */
export function useTechnicianPerformance(context: OperationsMapApiContext, enabled: boolean) {
  const [items, setItems] = useState<readonly TechnicianPerformanceItem[]>([]);
  const [source, setSource] = useState<"api" | "mock" | "fallback" | "idle">("idle");
  const [loading, setLoading] = useState(false);
  // Recarrega quando muda o tenant/token/permissão efetivos, não a cada render.
  const contextKey = `${context.tenantId ?? ""}|${context.branchId ?? ""}|${context.token ?? ""}|${enabled}`;
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setSource("idle");
      lastKeyRef.current = contextKey;
      return undefined;
    }
    if (lastKeyRef.current === contextKey) return undefined;
    lastKeyRef.current = contextKey;

    let active = true;
    setLoading(true);
    void fetchTechnicianPerformance(context)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setSource(result.source);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context, contextKey, enabled]);

  const byOperator = useMemo(() => toCompletionRateByOperator(items), [items]);

  return { byOperator, source, loading } as const;
}
