import { Lock } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Card, Input } from "../../../../components/ui";
import { normalizeMoneyInput } from "../../charges/charges.adapter";
import type { AppraisalInput } from "../auction.types";

// SIGILO art. 28 — AVALIAÇÃO SIGILOSA (auction:appraise). Este formulário e os campos de valor SÓ são renderizados
// pelo AuctionPanel quando can("auction:appraise"); o backend guarda a rota com a MESMA permissão e OMITE os valores
// no DTO de quem não a tem. A UI NUNCA fabrica/infere um valor. Dinheiro normalizado à string canônica "0.00".
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 } as const;
const footerStyle = { display: "flex", justifyContent: "flex-end", marginTop: 12 } as const;

export function AppraisalForm({
  defaultRound,
  appraisalAmount,
  minBidAmount,
  busy,
  error,
  onSubmit,
}: {
  readonly defaultRound: number;
  readonly appraisalAmount: string | null;
  readonly minBidAmount: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (input: AppraisalInput) => void;
}) {
  const [round, setRound] = useState(String(defaultRound > 0 ? defaultRound : 1));
  const [appraisal, setAppraisal] = useState("");
  const [minBid, setMinBid] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setLocalError(null);

    const roundNumber = Number(round);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      setLocalError("Informe uma rodada válida (número inteiro a partir de 1).");
      return;
    }
    const appraisalCanonical = appraisal.trim() ? normalizeMoneyInput(appraisal) : undefined;
    const minBidCanonical = minBid.trim() ? normalizeMoneyInput(minBid) : undefined;
    if (appraisal.trim() && appraisalCanonical === null) {
      setLocalError("Informe um valor de avaliação válido (ex.: 12.000,00).");
      return;
    }
    if (minBid.trim() && minBidCanonical === null) {
      setLocalError("Informe um lance mínimo válido (ex.: 6.000,00).");
      return;
    }
    if (!appraisalCanonical && !minBidCanonical) {
      setLocalError("Informe a avaliação e/ou o lance mínimo.");
      return;
    }

    onSubmit({ roundNumber, appraisalAmount: appraisalCanonical ?? undefined, minBidAmount: minBidCanonical ?? undefined });
  }

  return (
    <Card title="Avaliação sigilosa (art. 28)">
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Lock size={14} aria-hidden color="#B45309" /> A avaliação e o lance mínimo são sigilosos e visíveis apenas a
        perfis habilitados. Registrar libera a preparação e o loteamento.
      </p>

      {error || localError ? (
        <Alert title="Não foi possível registrar a avaliação" tone="danger">
          {localError ?? error}
        </Alert>
      ) : null}

      {appraisalAmount || minBidAmount ? (
        <p style={{ fontSize: 12, color: "#166534", margin: "0 0 10px" }}>Avaliação registrada para esta rodada. Envie novos valores para atualizá-los.</p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <div style={gridStyle}>
          <Input label="Rodada *" value={round} onChange={(event) => setRound(event.target.value)} inputMode="numeric" required />
          <Input label="Avaliação (R$)" value={appraisal} onChange={(event) => setAppraisal(event.target.value)} inputMode="decimal" placeholder="0,00" />
          <Input label="Lance mínimo (R$)" value={minBid} onChange={(event) => setMinBid(event.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <div style={footerStyle}>
          <Button type="submit" disabled={busy} aria-label="Registrar avaliação">
            {busy ? "Registrando…" : "Registrar avaliação"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default AppraisalForm;
