import { PainelPatiosView } from "../components/PainelPatiosView";
import { usePatiosDashboardSummary } from "../usePatiosDashboardSummary";

// Ω5P PR-20 — painel gerencial dos Pátios (/patios/painel). SÓ leitura/agregação sobre GET
// /patios/dashboard/summary (impound:read, reusada). Page = fiação do hook; a apresentação (5 estados
// obrigatórios §7, KPIs, tabelas) vive em PainelPatiosView (props-driven, mesmo padrão de GuiaDebitos —
// testável por props sem depender de efeitos assíncronos). White-label: "autoridade solicitante / pátio",
// nunca "polícia"/"tenant".
export function PainelPatiosPage() {
  const { summary, loading, error, denied, stale, updatedAt, reload } = usePatiosDashboardSummary();

  return (
    <PainelPatiosView
      summary={summary}
      loading={loading}
      error={error}
      denied={denied}
      stale={stale}
      updatedAt={updatedAt}
      onReload={() => void reload()}
    />
  );
}

export default PainelPatiosPage;
