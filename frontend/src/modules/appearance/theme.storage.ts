// B-MARCA-LOGIN-SIDEBAR (fatia L) — as 3 cores do sistema: Grafite (a de fábrica), Branca e Preta
// (D-DONO-2711-LOGIN-APROVADO-GRAFITE-CARTAO-BRANCO, D-DONO-2711-LOGIN-MAIS-BRANCA-E-PRETA, D-DONO-2511-MARCA-APARENCIA-PADRAO-C).
// A cor vive no atributo `data-tema` do elemento raiz, e os tokens `--ps-*` de `styles/tokens/tokens.css` trocam por ele.
//
// Duas guardas, só no navegador (guardar no servidor é bloco posterior):
//   - a do APARELHO, `techsol.tema.dispositivo`: é a que o login lê, porque antes de entrar não há usuário (`theme.boot.ts`);
//   - a PESSOAL, `techsol.tema.<id do usuário>`: ao entrar, se existir, vale e é copiada para a do aparelho, para o login
//     abrir na última cor usada naquele navegador. Sem chave pessoal, nada é gravado.
// Valor inválido ou ausente = Grafite. A cor NÃO mora em `techsol.aparencia.` (essa é a aparência A, B ou C de cada tela).
// Molde da guarda: `appearance.storage.ts` (todo acesso ao localStorage dentro de try/catch e cópia em memória).
// §2.8: o id do usuário só compõe a chave local; nunca é renderizado.

export const THEME_COLORS = ["grafite", "branca", "preta"] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

/** A cor de fábrica (D-DONO-2511-MARCA-APARENCIA-PADRAO-C). */
export const DEFAULT_THEME_COLOR: ThemeColor = "grafite";

/** Os rótulos do seletor, sem "(aprovada)" (resposta `login-v2-q1` = "sem"). */
export const THEME_COLOR_LABELS: Readonly<Record<ThemeColor, string>> = Object.freeze({ grafite: "Grafite", branca: "Branca", preta: "Preta" });

export const THEME_STORAGE_PREFIX = "techsol.tema";
export const DEVICE_THEME_KEY = `${THEME_STORAGE_PREFIX}.dispositivo`;

/** O atributo do elemento raiz que os tokens `--ps-*` leem. */
export const THEME_ATTRIBUTE = "data-tema";

export function isThemeColor(value: unknown): value is ThemeColor {
  return typeof value === "string" && (THEME_COLORS as readonly string[]).includes(value);
}

/** Valor inválido ou ausente = a cor de fábrica. */
export function sanitizeThemeColor(value: unknown): ThemeColor {
  return isThemeColor(value) ? value : DEFAULT_THEME_COLOR;
}

/** Sem usuário não há chave pessoal. */
export function personalThemeKey(userId?: string | null): string | null {
  if (!userId) return null;
  return `${THEME_STORAGE_PREFIX}.${userId}`;
}

// Cópia em memória: vale para a chave cuja gravação o navegador recusou (aba anônima, cota) ou quando não há
// localStorage. Gravação que deu certo tira a chave da cópia em memória: o navegador volta a ser a fonte.
const memory = new Map<string, string>();

function browserStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** O valor cru guardado na chave, ou `null` quando não há nada guardado. */
function readThemeRaw(key: string | null): string | null {
  if (!key) return null;
  if (memory.has(key)) return memory.get(key) ?? null;
  const storage = browserStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null; // leitura recusada: como se nada estivesse guardado.
  }
}

function writeThemeRaw(key: string, color: ThemeColor): void {
  const storage = browserStorage();
  if (storage) {
    try {
      storage.setItem(key, color);
      memory.delete(key);
      return;
    } catch {
      // gravação recusada: a escolha vale nesta sessão, pela cópia em memória.
    }
  }
  memory.set(key, color);
}

/** A cor do aparelho (a que o login usa). Inválida ou ausente = Grafite. */
export function readDeviceThemeColor(): ThemeColor {
  return sanitizeThemeColor(readThemeRaw(DEVICE_THEME_KEY));
}

/** A cor pessoal guardada, ou `null` quando não há chave pessoal (sem usuário, ou nada guardado). */
export function readPersonalThemeColor(userId?: string | null): ThemeColor | null {
  const raw = readThemeRaw(personalThemeKey(userId));
  return raw === null ? null : sanitizeThemeColor(raw);
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Assinatura para `useSyncExternalStore`: a cor aplicada mudou nesta aba. */
export function subscribeThemeColor(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function rootElement(): { getAttribute(name: string): string | null; setAttribute(name: string, value: string): void } | null {
  try {
    if (typeof document === "undefined" || !document.documentElement) return null;
    return document.documentElement;
  } catch {
    return null;
  }
}

/** Põe a cor no `data-tema` do elemento raiz. Sem documento (SSR, teste sem DOM), não faz nada. */
export function applyThemeColor(color: ThemeColor): void {
  const root = rootElement();
  if (root) {
    try {
      root.setAttribute(THEME_ATTRIBUTE, color);
    } catch {
      // documento recusou: a tela fica na cor que já estava.
    }
  }
  listeners.forEach((listener) => listener());
}

/** A cor aplicada agora (o `data-tema` do elemento raiz); sem documento, a do aparelho. */
export function readAppliedThemeColor(): ThemeColor {
  const root = rootElement();
  const attribute = root ? root.getAttribute(THEME_ATTRIBUTE) : null;
  return attribute === null ? readDeviceThemeColor() : sanitizeThemeColor(attribute);
}

/** A escolha no menu: grava a chave do aparelho e a pessoal (se houver usuário) e aplica. */
export function chooseThemeColor(userId: string | null | undefined, color: ThemeColor): ThemeColor {
  const chosen = sanitizeThemeColor(color);
  writeThemeRaw(DEVICE_THEME_KEY, chosen);
  const personal = personalThemeKey(userId);
  if (personal) writeThemeRaw(personal, chosen);
  applyThemeColor(chosen);
  return chosen;
}

/**
 * Ao montar o menu de aparência (os dois shells, depois de entrar): a escolha pessoal vale. SÓ SE existir chave pessoal,
 * a cor dela é aplicada e copiada para a do aparelho; sem chave pessoal, nada é gravado e nada muda.
 */
export function syncPersonalThemeColor(userId?: string | null): ThemeColor | null {
  const personalRaw = readThemeRaw(personalThemeKey(userId));
  if (personalRaw === null) return null; // sem chave pessoal: nada é gravado
  const color = sanitizeThemeColor(personalRaw);
  writeThemeRaw(DEVICE_THEME_KEY, color);
  applyThemeColor(color);
  return color;
}
