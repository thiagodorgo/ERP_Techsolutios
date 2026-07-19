import { Card, EmptyState } from "../../../../components/ui";

// M-1 (J-MAPAS-6) — PLACEHOLDER HONESTO da coluna "Chamados que chegam".
// A lista real (prioridade + prazo/SLA-proxy) é o PR M-4; aqui NÃO se fabrica chamado, prioridade
// nem prazo. Enquanto isso, os chamados abertos aparecem como marcadores no mapa e no painel de detalhe.
export function OperationsIncomingCallsList() {
  return (
    <Card title="Chamados que chegam">
      <EmptyState
        title="Chega na próxima entrega"
        detail="A lista dos chamados que chegam — com prioridade e prazo — entra aqui em breve. Por enquanto, os chamados abertos aparecem como marcadores no mapa e no painel de detalhe."
      />
    </Card>
  );
}
