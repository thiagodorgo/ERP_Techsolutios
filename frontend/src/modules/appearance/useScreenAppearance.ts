import { useCallback, useSyncExternalStore } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import {
  appearanceStorageKey,
  readScreenAppearance,
  subscribeAppearance,
  writeScreenAppearance,
  type Appearance,
} from "./appearance.storage";

export type ScreenAppearance = {
  readonly appearance: Appearance;
  readonly setAppearance: (next: Appearance) => void;
};

/**
 * Contrato (decisão do dono de 25/10, consumido pelo B-SAN3-22): a aparência PESSOAL do usuário para a tela
 * `screenKey`, na organização ativa. Padrão por tela (`patios` → B; as demais → A); valor inválido cai no padrão.
 * Sem organização ou sem usuário, a tela fica no padrão e `setAppearance` não grava nada.
 */
export function useScreenAppearance(screenKey: string): ScreenAppearance {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const key = appearanceStorageKey(activeContext?.tenantId, session?.user?.id);

  const getSnapshot = useCallback(() => readScreenAppearance(key, screenKey), [key, screenKey]);
  const appearance = useSyncExternalStore(subscribeAppearance, getSnapshot, getSnapshot);

  const setAppearance = useCallback(
    (next: Appearance) => {
      writeScreenAppearance(key, screenKey, next);
    },
    [key, screenKey],
  );

  return { appearance, setAppearance };
}
