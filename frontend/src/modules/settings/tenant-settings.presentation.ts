import { Building2, Globe2, Palette, Settings2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────────────────────
// PRESENTAÇÃO — NÃO É FONTE DE DADOS. (Ω2-e, sucessor honesto do antigo `settings.mock.ts`.)
// Os PARÂMETROS e VALORES vêm de `GET /api/v1/tenant-settings`. Este arquivo só DECORA a lista:
//   • título/ícone/ordem por CATEGORIA (para agrupar visualmente);
//   • rótulo PT-BR por CHAVE conhecida (decoração; chave desconhecida → humanização da key);
//   • tipo de editor (texto/seleção) por chave.
// Categoria/chave desconhecida cai num fallback — a tela NUNCA depende deste mapa para existir.
// ────────────────────────────────────────────────────────────────────────────────────────────

export type TenantSettingsCategoryPresentation = {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly order: number;
};

// Mapa category → apresentação. Chaves esperadas do seed (`organization.*`) e categorias vizinhas.
export const TENANT_SETTINGS_CATEGORY_PRESENTATION: Record<string, TenantSettingsCategoryPresentation> = {
  organization: { title: "Organização", icon: Building2, order: 1 },
  general: { title: "Geral", icon: Building2, order: 1 },
  appearance: { title: "Aparência", icon: Palette, order: 2 },
  localization: { title: "Regionalização", icon: Globe2, order: 3 },
  regional: { title: "Regionalização", icon: Globe2, order: 3 },
  security: { title: "Segurança", icon: ShieldCheck, order: 4 },
};

export const TENANT_SETTINGS_FALLBACK_ICON: LucideIcon = Settings2;

// Grupo dos parâmetros sem categoria (category === null no contrato).
export const TENANT_SETTINGS_UNCATEGORIZED = {
  title: "Outros parâmetros",
  order: 99,
} as const;

// Rótulo PT-BR curado por chave conhecida (decoração). Chave desconhecida → humanização da key.
export const TENANT_SETTINGS_KEY_LABELS: Record<string, string> = {
  "organization.business_name": "Razão social",
  "organization.currency": "Moeda",
  "organization.timezone": "Fuso horário",
  "organization.theme": "Tema visual",
};

// Opções do parâmetro `organization.theme`. Antes era `tenantSettingsThemes` (mock de ESTADO);
// agora é só a LISTA DE OPÇÕES do <select> — o valor selecionado vem sempre da API.
export type TenantSettingsThemeOption = { readonly value: string; readonly label: string };

export const TENANT_SETTINGS_THEME_OPTIONS: readonly TenantSettingsThemeOption[] = [
  { value: "enterprise_blue", label: "Enterprise Blue — corporativo e limpo" },
  { value: "tech_dark", label: "Tech Dark — técnico e de alto contraste" },
  { value: "green_operations", label: "Green Operations — operacional e prático" },
];

// Editor por chave — texto por padrão; `organization.theme` vira um <select> das opções acima.
// Registro extensível (OCP): novas chaves com editor especial entram aqui sem tocar na página.
export type TenantSettingEditor =
  | { readonly kind: "text" }
  | { readonly kind: "select"; readonly options: readonly TenantSettingsThemeOption[] };

const TENANT_SETTINGS_EDITORS: Record<string, TenantSettingEditor> = {
  "organization.theme": { kind: "select", options: TENANT_SETTINGS_THEME_OPTIONS },
};

export function resolveTenantSettingEditor(key: string): TenantSettingEditor {
  return TENANT_SETTINGS_EDITORS[key] ?? { kind: "text" };
}
