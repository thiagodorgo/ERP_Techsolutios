import { TitlesListView } from "../titles/components/TitlesListView";

// "Pagamentos" (sc_payments) — títulos a PAGAR, dados reais do backend financial-titles (Ω4-2a).
// Alvo visual: screen-refs/web/pagamentos.png. Toda a lógica mora na view compartilhada por direction.
export function PaymentsPage() {
  return <TitlesListView direction="payable" />;
}

export default PaymentsPage;
