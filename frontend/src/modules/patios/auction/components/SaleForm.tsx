import { Gavel } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Card, Input } from "../../../../components/ui";
import { normalizeMoneyInput } from "../../charges/charges.adapter";
import type { SaleInput } from "../auction.types";

// Registro do ARREMATE (LOTTED→AUCTIONED, impound:transition). Gate no backend: winner + sold>=min_bid (sigiloso) +
// nota (art. 34). §2.8: winner_ref é minimizado (rótulo/máscara, nunca PII completa) — o backend mascara na leitura.
// O valor arrematado é público (base de I7); dinheiro normalizado à string canônica "0.00".
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 } as const;
const footerStyle = { display: "flex", justifyContent: "flex-end", marginTop: 12 } as const;

export function SaleForm({
  defaultRound,
  busy,
  error,
  onSubmit,
}: {
  readonly defaultRound: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (input: SaleInput) => void;
}) {
  const [round, setRound] = useState(String(defaultRound > 0 ? defaultRound : 1));
  const [winnerRef, setWinnerRef] = useState("");
  const [soldAmount, setSoldAmount] = useState("");
  const [saleNoteReference, setSaleNoteReference] = useState("");
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
    if (!winnerRef.trim()) {
      setLocalError("Informe a referência do arrematante.");
      return;
    }
    const soldCanonical = soldAmount.trim() ? normalizeMoneyInput(soldAmount) : null;
    if (soldCanonical === null) {
      setLocalError("Informe o valor arrematado (ex.: 8.500,00).");
      return;
    }
    if (!saleNoteReference.trim()) {
      setLocalError("Informe a referência da nota do leilão (art. 34).");
      return;
    }

    onSubmit({ roundNumber, winnerRef: winnerRef.trim(), soldAmount: soldCanonical, saleNoteReference: saleNoteReference.trim() });
  }

  return (
    <Card title="Registrar arremate">
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Gavel size={14} aria-hidden color="#2563EB" /> O valor arrematado precisa alcançar o lance mínimo da rodada
        lotada (verificado no servidor).
      </p>

      {error || localError ? (
        <Alert title="Não foi possível registrar o arremate" tone="danger">
          {localError ?? error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <div style={gridStyle}>
          <Input label="Rodada *" value={round} onChange={(event) => setRound(event.target.value)} inputMode="numeric" required />
          <Input
            label="Arrematante *"
            value={winnerRef}
            onChange={(event) => setWinnerRef(event.target.value)}
            maxLength={200}
            helper="Rótulo/referência, não dados pessoais completos."
            required
          />
          <Input label="Valor arrematado (R$) *" value={soldAmount} onChange={(event) => setSoldAmount(event.target.value)} inputMode="decimal" placeholder="0,00" required />
          <Input label="Nota do leilão (art. 34) *" value={saleNoteReference} onChange={(event) => setSaleNoteReference(event.target.value)} maxLength={200} required />
        </div>
        <div style={footerStyle}>
          <Button type="submit" disabled={busy} aria-label="Registrar arremate">
            {busy ? "Registrando…" : "Registrar arremate"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default SaleForm;
