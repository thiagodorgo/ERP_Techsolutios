// Ω3F-1 — Registro das abas do Hub da OS (spec §1.3: 11 abas). Cada bloco seguinte "acende" a sua
// com o flip de `visible` (1 linha), sem tocar o shell (hotspot de merge — refinamento do estrategista).
//
// C2 (junta J-Ω3F-0, vinculante): REVELAÇÃO PROGRESSIVA — só abas `visible: true` APARECEM no menu.
// As não-entregues ficam no registro com `visible: false` = AUSENTES (nunca "em breve"/PLANNED, §11).

export type WorkOrderTabSlug =
  | "informacoes-gerais"
  | "financeiro"
  | "orcamento"
  | "estoque"
  | "comentarios"
  | "arquivos"
  | "mobile"
  | "quilometragem"
  | "base"
  | "mapa"
  | "logs";

export interface WorkOrderTabDef {
  readonly slug: WorkOrderTabSlug;
  /** Rótulo PT-BR de negócio, acentuado (§11). O slug (kebab ASCII) fica na URL `?aba=`. */
  readonly label: string;
  /** C2: só `true` aparece no menu. O bloco dono vira para `true` ao entregar a aba. */
  readonly visible: boolean;
  /** Permissão exigida (opcional). Aba visível sem permissão → estado "acesso não permitido" (§7). */
  readonly requiredPermission?: string;
  /** Bloco Ω3F que entrega a aba (rastreabilidade da revelação progressiva). */
  readonly deliveredBy: string;
}

export const DEFAULT_TAB: WorkOrderTabSlug = "informacoes-gerais";

// Ordem EXATA da spec §1.3 (não reordenar). Fase 1 (Ω3F-1): só "Informações gerais" nasce visível.
export const WORK_ORDER_TABS: readonly WorkOrderTabDef[] = [
  { slug: "informacoes-gerais", label: "Informações gerais", visible: true, deliveredBy: "Ω3F-1" },
  { slug: "financeiro", label: "Financeiro", visible: true, requiredPermission: "work_order_financials:read", deliveredBy: "Ω3F-3" },
  { slug: "orcamento", label: "Orçamento", visible: true, requiredPermission: "service_quotes:read", deliveredBy: "Ω3F-4" },
  { slug: "estoque", label: "Estoque", visible: false, deliveredBy: "Ω3F-10 (Fase 2)" },
  { slug: "comentarios", label: "Comentários", visible: true, requiredPermission: "work_orders:read", deliveredBy: "Ω3F-5" },
  { slug: "arquivos", label: "Arquivos", visible: true, requiredPermission: "work_orders:read", deliveredBy: "Ω3F-5" },
  { slug: "mobile", label: "Mobile", visible: false, deliveredBy: "Ω3F-7" },
  { slug: "quilometragem", label: "Quilometragem", visible: false, deliveredBy: "Ω3F-7" },
  { slug: "base", label: "Base", visible: false, deliveredBy: "Ω3F-13 (Fase 2)" },
  { slug: "mapa", label: "Mapa", visible: false, deliveredBy: "Ω3F-8" },
  { slug: "logs", label: "Logs", visible: false, deliveredBy: "Ω3F-8" },
];

/** Abas que aparecem no menu lateral interno (C2: só as `visible`). */
export function visibleTabs(): readonly WorkOrderTabDef[] {
  return WORK_ORDER_TABS.filter((tab) => tab.visible);
}

/** Uma aba visível é acessível se não exige permissão OU o ator a possui (§7). */
export function canAccessTab(tab: WorkOrderTabDef, permissions: readonly string[]): boolean {
  return !tab.requiredPermission || permissions.includes(tab.requiredPermission);
}

/**
 * Resolve a aba ativa a partir do `?aba=`. Slug inexistente OU oculto (flag OFF) → cai em
 * "Informações gerais" (nunca 404 — fid-analista Q6; precedente EstoquePage). Permissão NÃO causa
 * fallback aqui: aba visível-sem-permissão fica ativa e o shell renderiza "acesso não permitido" (§7).
 */
export function resolveActiveTab(slug: string | null | undefined): WorkOrderTabSlug {
  const found = WORK_ORDER_TABS.find((tab) => tab.slug === slug);
  if (!found || !found.visible) return DEFAULT_TAB;
  return found.slug;
}

export function findTab(slug: WorkOrderTabSlug): WorkOrderTabDef {
  return WORK_ORDER_TABS.find((tab) => tab.slug === slug) ?? WORK_ORDER_TABS[0];
}
