/**
 * AUDITORIA VISUAL — FONTE ÚNICA de formatação de dinheiro (BRL) do portal.
 *
 * `formatBRL` era o formatador DE FATO do app inteiro (financeiro, remunerações, frota, estoque…), mas
 * morava em `modules/registry/service-catalog/service-catalog.adapter.ts` e era reexportado por 9 módulos —
 * um utilitário transversal escondido dentro de um módulo de domínio. Quem não conhecia a cadeia de
 * reexports escrevia `toLocaleString` cru no componente, e o número saía com outra forma na mesma tela.
 *
 * Agora mora aqui, em `lib/`, que é onde um utilitário sem domínio pertence. Os pontos antigos seguem
 * reexportando (nenhum import existente quebra) e passam a ser apenas ATALHOS para esta definição.
 */

/**
 * Valor monetário em Real, no formato pt-BR (`R$ 1.234,56`).
 *
 * Ausência de valor NÃO é zero: `null`/`undefined`/não-finito devolvem o travessão `—`, para a tela não
 * afirmar "R$ 0,00" onde o dado simplesmente não veio (D-007 — o painel não inventa número).
 */
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
