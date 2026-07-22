import { useCustodySummary } from "../useCustodySummary";
import type { InventoryItem } from "../inventory.types";
import { CustodySummaryPanel } from "./CustodySummaryPanel";

// Ω4C PR-08 — container da aba Resumo: busca os saldos por custódia e delega a exibição ao painel.
export function ItemResumoTab({ item }: { readonly item: InventoryItem }) {
  const { summary, loading, error, refresh } = useCustodySummary(item.id, true);

  return <CustodySummaryPanel item={item} summary={summary} loading={loading} error={error} onRetry={() => void refresh()} />;
}

export default ItemResumoTab;
