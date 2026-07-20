import type { KpiDetail, KpiSourceTag } from "../../components/kpi";
import type { InventoryTotals } from "./inventory.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 4 cards de indicador do Estoque. Todos os números
// já estão nos próprios cards (computeInventoryTotals sobre a janela carregada); aqui só RE-APRESENTAMOS os
// mesmos valores — nada é somado nem fabricado (D-007). Os 3 primeiros cards refletem a fonte dos ITENS
// (itemsSource); o card de Movimentações reflete a fonte das MOVIMENTAÇÕES (movementsSource). Como a página
// não carrega série temporal real fora do Dashboard, nenhum corpo usa gráfico.
//
// InventorySource ("api"|"mock"|"fallback") é idêntico a KpiSourceTag → passthrough direto (sem mapSource).

export type InventoryKpiKey = "activeItems" | "belowMin" | "needsReorder" | "movements";

const nf = (value: number) => value.toLocaleString("pt-BR");

/**
 * `can(permission)` gateia o ÚNICO cta cross-route desta superfície (Precisam repor → /purchase-orders,
 * gateado por `purchase_orders:read`, a permissão exata do PermissionGuard da rota em App.tsx). Sem a
 * permissão o botão é omitido — o pop-up fica sem cta, nunca oferecendo uma rota que cairia no guard.
 * Os demais cards ficam na própria tela do usuário (/inventory), então não recebem cta.
 */
export function buildInventoryKpiDetails(
  totals: InventoryTotals,
  itemsCount: number,
  movementsTotal: number,
  itemsSource: KpiSourceTag,
  movementsSource: KpiSourceTag,
  can: (permission: string) => boolean,
): Record<InventoryKpiKey, KpiDetail> {
  return {
    activeItems: {
      title: "Itens ativos",
      value: nf(totals.activeItems),
      caption: "no estoque · janela carregada",
      source: itemsSource,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Ativos", value: nf(totals.activeItems), tone: "success" },
          { label: "Na janela", value: nf(itemsCount), tone: "info", hint: "itens carregados" },
          { label: "Abaixo do mínimo", value: nf(totals.belowMinItems), tone: "warning" },
          { label: "Precisam repor", value: nf(totals.needsReorderItems), tone: "danger" },
        ],
      },
    },
    belowMin: {
      title: "Abaixo do mínimo",
      value: nf(totals.belowMinItems),
      caption: "itens · janela carregada",
      source: itemsSource,
      body: {
        kind: "explain",
        text: 'Itens cujo saldo está abaixo da quantidade mínima na janela carregada. Use o filtro "Abaixo do mínimo" na aba Itens para listar exatamente esses itens.',
      },
      cta: { label: "Filtrar abaixo do mínimo", to: "/inventory?below_min=true" },
    },
    needsReorder: {
      title: "Precisam repor",
      value: nf(totals.needsReorderItems),
      caption: "itens no ponto de pedido",
      source: itemsSource,
      body: {
        kind: "explain",
        text: "Itens que atingiram o ponto de pedido e precisam de reposição. A sugestão de reposição não automatiza a compra.",
      },
      cta: can("purchase_orders:read") ? { label: "Ver pedidos de compra", to: "/purchase-orders" } : undefined,
    },
    movements: {
      title: "Movimentações no período",
      value: nf(totals.movementsCount),
      caption: `${nf(totals.movementsCount)} de ${nf(movementsTotal)} no servidor`,
      source: movementsSource,
      body: {
        kind: "explain",
        text: "Movimentações de estoque (entrada, saída, consumo e ajuste) na janela carregada. O total do servidor pode ser maior que a janela exibida.",
      },
    },
  };
}
