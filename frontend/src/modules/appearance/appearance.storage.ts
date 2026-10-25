// B-APARENCIA-USUARIO — guarda da aparência escolhida por cada usuário (D-APARENCIA-RESPOSTAS (a)).
// v1 no navegador: uma chave por ORGANIZAÇÃO e USUÁRIO (`techsol.aparencia.<tenantId>.<userId>`), valor
// `{ "<tela>": "A" | "B" | "C" }`. O servidor vem depois, junto da AWS.
// Modelo da guarda: `modules/operations/map/hooks/useMapViewMemory.ts` (chave com sufixo de organização e todo
// acesso ao localStorage dentro de try/catch — aba anônima, cota cheia ou SSR não derrubam a tela).
// §2.8: a chave usa os identificadores só como chave local; nenhum deles é renderizado.

export const APPEARANCES = ["A", "B", "C"] as const;
export type Appearance = (typeof APPEARANCES)[number];

export const APPEARANCE_STORAGE_PREFIX = "techsol.aparencia";

/** Padrão por tela (D-APARENCIA-RESPOSTAS (b)): B em Pátios, A nas demais até o dono escolher. */
export const SCREEN_DEFAULT_APPEARANCE: Readonly<Record<string, Appearance>> = Object.freeze({ patios: "B" });

export type AppearancePrefs = Readonly<Record<string, Appearance>>;

const SCREEN_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isAppearance(value: unknown): value is Appearance {
  return typeof value === "string" && (APPEARANCES as readonly string[]).includes(value);
}

export function defaultAppearanceFor(screenKey: string): Appearance {
  return Object.prototype.hasOwnProperty.call(SCREEN_DEFAULT_APPEARANCE, screenKey) ? SCREEN_DEFAULT_APPEARANCE[screenKey] : "A";
}

/** Sem organização ou sem usuário não há chave: nada é gravado e a tela fica no padrão. */
export function appearanceStorageKey(tenantId?: string | null, userId?: string | null): string | null {
  if (!tenantId || !userId) return null;
  return `${APPEARANCE_STORAGE_PREFIX}.${tenantId}.${userId}`;
}

/** Só pares válidos sobrevivem: tela com nome bem-formado e valor A/B/C. Todo o resto é descartado. */
export function sanitizeAppearancePrefs(raw: unknown): AppearancePrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const clean: Record<string, Appearance> = {};
  for (const [screen, value] of Object.entries(raw as Record<string, unknown>)) {
    if (SCREEN_KEY_PATTERN.test(screen) && isAppearance(value)) clean[screen] = value;
  }
  return clean;
}

// Cópia em memória por chave: se o navegador recusa a gravação (aba anônima, cota), a escolha vale na sessão.
const memory = new Map<string, AppearancePrefs>();

function browserStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAppearancePrefs(key: string | null): AppearancePrefs {
  if (!key) return {};
  const storage = browserStorage();
  let raw: string | null = null;
  if (storage) {
    try {
      raw = storage.getItem(key);
    } catch {
      raw = null; // leitura recusada: vale a cópia em memória desta sessão.
    }
  }
  if (raw === null) return memory.get(key) ?? {};
  try {
    return sanitizeAppearancePrefs(JSON.parse(raw));
  } catch {
    return {}; // JSON corrompido: a tela volta ao padrão.
  }
}

export function resolveAppearance(prefs: AppearancePrefs, screenKey: string): Appearance {
  const stored = Object.prototype.hasOwnProperty.call(prefs, screenKey) ? prefs[screenKey] : undefined;
  return isAppearance(stored) ? stored : defaultAppearanceFor(screenKey);
}

export function readScreenAppearance(key: string | null, screenKey: string): Appearance {
  return resolveAppearance(readAppearancePrefs(key), screenKey);
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Assinatura para `useSyncExternalStore`: mudanças desta aba e de outras abas (evento `storage`). */
export function subscribeAppearance(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key;
    if (key === null || key === undefined || key.startsWith(`${APPEARANCE_STORAGE_PREFIX}.`)) listener();
  };
  try {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("storage", onStorage);
  } catch {
    // Sem window (SSR/teste): só as mudanças desta aba notificam.
  }
  return () => {
    listeners.delete(listener);
    try {
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") window.removeEventListener("storage", onStorage);
    } catch {
      // idem
    }
  };
}

/**
 * Grava a escolha da tela. Devolve `true` quando ficou no navegador; `false` quando não há chave (sem organização
 * ou sem usuário: nada muda) ou quando o navegador recusou (a escolha vale só nesta sessão, pela cópia em memória).
 */
export function writeScreenAppearance(key: string | null, screenKey: string, appearance: Appearance): boolean {
  if (!key || !SCREEN_KEY_PATTERN.test(screenKey) || !isAppearance(appearance)) return false;
  const next: AppearancePrefs = { ...readAppearancePrefs(key), [screenKey]: appearance };
  memory.set(key, next);
  let persisted = false;
  const storage = browserStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(next));
      persisted = true;
    } catch {
      persisted = false;
    }
  }
  notify();
  return persisted;
}
