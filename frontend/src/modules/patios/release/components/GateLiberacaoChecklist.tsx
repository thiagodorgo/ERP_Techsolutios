import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Button, Card, EmptyState } from "../../../../components/ui";
import { isConsumeEnabled, pendingGateCount } from "../release.adapter";
import type { ReleaseGatePrecondition } from "../release.types";

// §11 — gate I5 como CHECKLIST VISUAL: cada pré-condição mostra check verde (satisfeita) ou pendente âmbar (o que
// FALTA), nunca um erro genérico. Espelho de guardReleaseGate; o botão "Consumar liberação" só habilita com as 5
// satisfeitas — a UI é hint, o backend RE-VERIFICA sob lock (409 IMPOUND_GUARD_FAILED → PT-BR + recarrega).
const rowStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid #F1F5F9" };
const labelStyle: CSSProperties = { fontSize: 14, fontWeight: 600, color: "#0F172A" };
const detailStyle: CSSProperties = { fontSize: 12, color: "#64748B", margin: 0 };

export function GateLiberacaoChecklist({
  preconditions,
  canConsume,
  busy,
  error,
  onConsume,
}: {
  readonly preconditions: readonly ReleaseGatePrecondition[];
  readonly canConsume: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onConsume: () => void;
}) {
  const enabled = isConsumeEnabled(preconditions);
  const pending = pendingGateCount(preconditions);

  return (
    <Card title="Pré-condições da liberação (gate)">
      {error ? (
        <Alert title="Não foi possível consumar a liberação" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 6px" }}>
        {enabled
          ? "Todas as pré-condições estão satisfeitas. A liberação pode ser consumada."
          : `${pending} ${pending === 1 ? "pré-condição pendente" : "pré-condições pendentes"} — resolva os itens abaixo para habilitar a consumação.`}
      </p>

      <div role="list">
        {preconditions.map((precondition) => (
          <div key={precondition.key} style={rowStyle} role="listitem">
            {precondition.satisfied ? (
              <CheckCircle2 size={18} aria-hidden color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
            ) : (
              <Clock size={18} aria-hidden color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={labelStyle}>
                {precondition.label}
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: precondition.satisfied ? "#16A34A" : "#B45309" }}>
                  {precondition.satisfied ? "OK" : "Pendente"}
                </span>
              </span>
              <p style={detailStyle}>{precondition.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {canConsume ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <Button type="button" onClick={onConsume} disabled={!enabled || busy} aria-label="Consumar liberação">
            <ShieldCheck size={15} aria-hidden /> {busy ? "Consumando…" : "Consumar liberação"}
          </Button>
        </div>
      ) : (
        <EmptyState
          title="Somente leitura"
          detail="Você não tem permissão para consumar a liberação. As pré-condições acima são exibidas apenas para acompanhamento."
        />
      )}
    </Card>
  );
}

export default GateLiberacaoChecklist;
