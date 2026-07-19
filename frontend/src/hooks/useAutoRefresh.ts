import { useEffect, useRef } from "react";

/** WS-UI-REFRESH — cadência padrão de auto-atualização (espelha POLL_INTERVAL_MS do mapa operacional). */
export const DEFAULT_AUTO_REFRESH_MS = 30_000;

type RefreshFn = (background?: boolean) => void | Promise<void>;

type UseAutoRefreshOptions = {
  readonly intervalMs?: number;
  /** Desliga o polling (ex.: sem permissão / contexto ausente). Default: ligado. */
  readonly enabled?: boolean;
  /** Pausa quando a aba está oculta (document.hidden), para não gastar rede à toa. Default: pausa. */
  readonly pauseWhenHidden?: boolean;
};

/**
 * WS-UI-REFRESH — auto-atualização periódica em SEGUNDO PLANO, substituindo o botão "Atualizar" manual
 * (o sistema recarrega sozinho). Chama `refresh(true)` a cada `intervalMs`. O argumento `background=true`
 * sinaliza ao hook de dados que NÃO deve mostrar o skeleton de carregamento (mantém o dado atual visível,
 * sem flicker) — o contrato-irmão de cada `useX().refresh(background?)`.
 *
 * Usa uma ref para o callback: o timer NÃO é recriado quando a identidade de `refresh` muda a cada render
 * (deps de `useCallback` como filtros/contexto), evitando resetar o intervalo continuamente. Pausa quando a
 * aba está oculta. Espelha o padrão-ouro de `useOperationsMap`.
 */
export function useAutoRefresh(refresh: RefreshFn, options?: UseAutoRefreshOptions): void {
  const { intervalMs = DEFAULT_AUTO_REFRESH_MS, enabled = true, pauseWhenHidden = true } = options ?? {};
  const savedRefresh = useRef(refresh);
  savedRefresh.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) return;
      void savedRefresh.current(true);
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, pauseWhenHidden]);
}
