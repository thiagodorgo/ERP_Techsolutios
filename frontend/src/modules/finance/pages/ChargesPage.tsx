import { TitlesListView } from "../titles/components/TitlesListView";

// "Cobranças" (sc_charges) — títulos a RECEBER, dados reais do backend financial-titles (Ω4-2a).
// Alvo visual: screen-refs/web/cobrancas.png. Toda a lógica mora na view compartilhada por direction.
export function ChargesPage() {
  return <TitlesListView direction="receivable" />;
}

export default ChargesPage;
