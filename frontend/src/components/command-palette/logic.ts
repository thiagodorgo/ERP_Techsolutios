import { buildSidebarNav } from "../../layouts/appSidebarNav";
import { tenantNavigation } from "../../navigation/tenantNavigation";

// Destino navegável da paleta (Ctrl+K): rótulo PT-BR + rota real + grupo (seção) PT-BR.
export type CommandDestination = { label: string; path: string; group: string };

// Mapa rota → permissões exigidas, extraído de tenantNavigation (a fonte RBAC do
// front espelha a autoridade do backend). A paleta NUNCA fabrica destino: só usa
// rotas que já existem na navegação.
const PATH_PERMISSIONS: ReadonlyMap<string, readonly string[]> = new Map(
  tenantNavigation.map((item) => [item.path, item.requiredPermissions ?? []]),
);

// Destinos visíveis para o papel = mesmos itens da sidebar (buildSidebarNav já molda
// por papel + allowlist MVP) filtrados AINDA pela permissão real (can). Assim a paleta
// mostra exatamente o que o usuário pode ver — igual à sidebar — sem duplicar regra.
export function buildCommandDestinations(
  roles: readonly string[],
  can: (permission: string) => boolean,
): CommandDestination[] {
  const seen = new Set<string>();
  const destinations: CommandDestination[] = [];

  for (const group of buildSidebarNav(roles)) {
    for (const item of group.items) {
      if (seen.has(item.path)) continue;
      const required = PATH_PERMISSIONS.get(item.path);
      // Com mapa de permissão: exige ao menos uma concedida (backend é autoridade).
      // Sem mapa: já foi filtrado por papel pela sidebar, então mantém.
      if (required && required.length > 0 && !required.some((permission) => can(permission))) continue;
      seen.add(item.path);
      destinations.push({ label: item.label, path: item.path, group: group.label });
    }
  }

  return destinations;
}

// Normaliza para busca insensível a acento e caixa (NFD decompõe o acento em marca
// diacrítica combinante, depois removida via \p{Diacritic}).
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Filtra destinos por texto digitado (match no rótulo, sem acento-sensível).
// Query vazia → todos os destinos permitidos.
export function filterDestinations(
  destinations: readonly CommandDestination[],
  query: string,
): CommandDestination[] {
  const normalized = normalizeText(query);
  if (!normalized) return [...destinations];
  return destinations.filter((destination) => normalizeText(destination.label).includes(normalized));
}

// Detecta o atalho de abertura: Ctrl+K (Win/Linux) ou ⌘K (macOS).
export function isOpenShortcut(event: { ctrlKey?: boolean; metaKey?: boolean; key?: string }): boolean {
  return Boolean((event.ctrlKey || event.metaKey) && (event.key ?? "").toLowerCase() === "k");
}

// Move a seleção com rolagem circular dentro de [0, length).
export function nextIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (current + delta + length) % length;
}

// Ação resolvida a partir de uma tecla na paleta aberta (input em foco).
export type PaletteKeyAction =
  | { type: "close" }
  | { type: "navigate"; path: string }
  | { type: "move"; index: number }
  | { type: "none" };

// Traduz a tecla em ação pura (testável): Esc fecha, setas movem, Enter navega ao
// destino selecionado. Demais teclas seguem para o input (digitação → filtro).
export function resolvePaletteKey(
  key: string,
  results: readonly CommandDestination[],
  activeIndex: number,
): PaletteKeyAction {
  switch (key) {
    case "Escape":
      return { type: "close" };
    case "ArrowDown":
      return { type: "move", index: nextIndex(activeIndex, 1, results.length) };
    case "ArrowUp":
      return { type: "move", index: nextIndex(activeIndex, -1, results.length) };
    case "Enter": {
      const destination = results[activeIndex];
      return destination ? { type: "navigate", path: destination.path } : { type: "none" };
    }
    default:
      return { type: "none" };
  }
}

// Id estável de cada opção (para aria-activedescendant / aria-selected).
export function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}
