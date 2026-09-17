import { AlertTriangle } from "lucide-react";

// B-SAN3-01 — estado §7 "dados desatualizados": há dado na tela, mas a última atualização em segundo plano
// falhou. A tela NÃO é trocada pelo erro (o que o operador está vendo continua válido até prova em contrário);
// a faixa diz quando foi a última atualização boa e oferece tentar de novo. Compartilhada pela lista e pelo
// detalhe da OS.

export function formatClockTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StaleDataBanner({ lastUpdatedAt, onRetry }: { readonly lastUpdatedAt: string | null; readonly onRetry: () => void }) {
  const at = formatClockTime(lastUpdatedAt);
  return (
    <div role="status" data-state="stale" className="pat-banner pat-banner--warning">
      <AlertTriangle size={14} aria-hidden="true" />
      <span>Dados desatualizados{at ? ` — última atualização às ${at}` : ""}</span>
      <button type="button" className="pat-link" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
