import { CheckCircle2, Clock, Recycle } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Button, Card, EmptyState, Modal } from "../../../../components/ui";
import { isScrapGateSatisfied, pendingScrapCount } from "../auction.adapter";
import type { ScrapGatePrecondition } from "../auction.types";

// §11 — gate de SUCATA (2 strikes edital-backed, I8) como CHECKLIST VISUAL: cada pré-condição mostra check verde
// (satisfeita) ou pendente âmbar (o que FALTA). Espelho de evaluateScrapEdictGate; o botão "Reciclar a sucata" só
// habilita com as 3 derivadas satisfeitas — a UI é HINT, o backend RE-VERIFICA sob lock (inclui a cadeia I2) e é a
// AUTORIDADE (409 → PT-BR + recarrega). A sucata é IRREVERSÍVEL (destrói patrimônio de 3º) → CONFIRMAÇÃO explícita.
const rowStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid #F1F5F9" };
const labelStyle: CSSProperties = { fontSize: 14, fontWeight: 600, color: "#0F172A" };
const detailStyle: CSSProperties = { fontSize: 12, color: "#64748B", margin: 0 };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function ScrapGateChecklist({
  preconditions,
  canReclassify,
  busy,
  error,
  onReclassify,
}: {
  readonly preconditions: readonly ScrapGatePrecondition[];
  readonly canReclassify: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onReclassify: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const enabled = isScrapGateSatisfied(preconditions);
  const pending = pendingScrapCount(preconditions);

  return (
    <Card title="Reciclagem a sucata (2 rodadas desertas)">
      {error ? (
        <Alert title="Não foi possível reciclar a sucata" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 6px" }}>
        {enabled
          ? "As pré-condições do certame deserto estão satisfeitas. A reciclagem a sucata é IRREVERSÍVEL."
          : `${pending} ${pending === 1 ? "pré-condição pendente" : "pré-condições pendentes"} — resolva os itens abaixo para habilitar a reciclagem.`}
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

      <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>A integridade da cadeia de custódia (I2) é verificada no servidor no momento da reciclagem.</p>

      {canReclassify ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={!enabled || busy}
            aria-label="Reciclar a sucata"
          >
            <Recycle size={15} aria-hidden /> {busy ? "Reciclando…" : "Reciclar a sucata"}
          </Button>
        </div>
      ) : (
        <EmptyState
          title="Somente leitura"
          detail="Você não tem permissão para reciclar o veículo. As pré-condições acima são exibidas apenas para acompanhamento."
        />
      )}

      <Modal title="Confirmar reciclagem a sucata" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p style={{ fontSize: 14, color: "#334155" }}>
          A reciclagem a sucata é <strong>IRREVERSÍVEL</strong>: o veículo deixa de retornar à circulação e segue para
          baixa no Renavam. Confirma reciclar após as 2 rodadas desertas do certame?
        </p>
        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => {
              setConfirmOpen(false);
              onReclassify();
            }}
          >
            {busy ? "Reciclando…" : "Confirmar reciclagem"}
          </Button>
        </footer>
      </Modal>
    </Card>
  );
}

export default ScrapGateChecklist;
