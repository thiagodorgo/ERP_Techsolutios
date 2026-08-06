import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
} from "../map/mapStyle";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D4) — MEMÓRIA DA VISÃO do operador (comportamento desenhado pelo
 * dono no protótipo). Ordem de câmera no mount: visão SALVA > default BRASIL z4 ("Brasil — só até
 * o operador focar em outra área"). Cada moveend salva a CÂMERA no localStorage e acende o
 * savenote "✓ Visão do mapa salva" (fade ~1.2s).
 *
 * LGPD §12/plano §6(e): o localStorage guarda SOMENTE a câmera escolhida pelo operador
 * ({lat, lng, z} do CENTRO do mapa) — NUNCA posição de técnico. A chave ganha sufixo de tenant
 * (divergência 11 registrada) para multi-org não vazar enquadramento entre organizações.
 * SSR/teste-safe: todo acesso a localStorage é guardado por try/catch (o protótipo já fazia).
 */

export type MapViewState = {
  readonly lat: number;
  readonly lng: number;
  readonly z: number;
};

// Prefixo verbatim do protótipo; o sufixo `.<tenantId>` é a divergência 11 (isolamento multi-org).
export const MAP_VIEW_MEMORY_KEY_PREFIX = "techsol.mapaOp.view";

// Default Brasil (verbatim: setView([-15.5, -52.5], 4)) — derivado das constantes únicas do estilo.
export const MAP_VIEW_DEFAULT: MapViewState = {
  lat: OPERATIONAL_MAP_DEFAULT_CENTER[1],
  lng: OPERATIONAL_MAP_DEFAULT_CENTER[0],
  z: OPERATIONAL_MAP_DEFAULT_ZOOM,
};

export const MAP_VIEW_SAVENOTE_MS = 1200;

export function mapViewMemoryKey(tenantId?: string): string {
  return tenantId ? `${MAP_VIEW_MEMORY_KEY_PREFIX}.${tenantId}` : MAP_VIEW_MEMORY_KEY_PREFIX;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Lê a visão salva; qualquer valor ausente/corrompido/não-numérico → null (cai no default). */
export function readSavedMapView(storage: StorageLike | null, key: string): MapViewState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapViewState> | null;
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.z !== "number" ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng) ||
      !Number.isFinite(parsed.z)
    ) {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng, z: parsed.z };
  } catch {
    return null;
  }
}

/** Persiste a CÂMERA (e só ela). Falha de quota/privacidade é silenciosa (memória é conveniência). */
export function writeSavedMapView(storage: StorageLike | null, key: string, view: MapViewState): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ lat: view.lat, lng: view.lng, z: view.z }));
  } catch {
    // sem quota/modo privado → segue sem memória (nunca quebra o mapa)
  }
}

export function useMapViewMemory(tenantId?: string, storageOverride?: StorageLike | null) {
  const storage = storageOverride === undefined ? defaultStorage() : storageOverride;
  const key = mapViewMemoryKey(tenantId);
  // Visão inicial resolvida UMA vez por chave (salva > Brasil). Não é reativa a writes seguintes:
  // a câmera viva pertence ao mapa; isto só decide o mount.
  const initialView = useMemo<MapViewState>(
    () => readSavedMapView(storage, key) ?? MAP_VIEW_DEFAULT,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const [savenoteVisible, setSavenoteVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const keyRef = useRef(key);
  keyRef.current = key;

  const handleMoveEnd = useCallback((view: MapViewState) => {
    writeSavedMapView(storageRef.current, keyRef.current, view);
    setSavenoteVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSavenoteVisible(false), MAP_VIEW_SAVENOTE_MS);
  }, []);

  // Parada garantida: o timer do savenote morre no unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { initialView, handleMoveEnd, savenoteVisible } as const;
}
