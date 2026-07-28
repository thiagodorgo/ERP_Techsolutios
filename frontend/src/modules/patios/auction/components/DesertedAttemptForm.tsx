import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input } from "../../../../components/ui";
import type { DesertedAttemptInput } from "../auction.types";

// Fecho de rodada DESERTA (strike I8, impound:transition). Exige um edital REGISTRADO para a rodada (o backend
// recusa com auction_edict_missing). É append-only e idempotente por rodada. §2.8: notes é dado de domínio (sem PII).
const rowStyle = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" } as const;

export function DesertedAttemptForm({
  defaultRound,
  busy,
  error,
  onSubmit,
}: {
  readonly defaultRound: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (input: DesertedAttemptInput) => void;
}) {
  const [round, setRound] = useState(String(defaultRound > 0 ? defaultRound : 1));
  const [notes, setNotes] = useState("");
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
    onSubmit({ roundNumber, notes: notes.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error || localError ? (
        <Alert title="Não foi possível registrar a rodada deserta" tone="danger">
          {localError ?? error}
        </Alert>
      ) : null}
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>
        Registre a rodada como deserta (sem arremate). É necessário um edital registrado para a rodada.
      </p>
      <div style={rowStyle}>
        <Input label="Rodada *" value={round} onChange={(event) => setRound(event.target.value)} inputMode="numeric" required />
        <Input label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} />
        <Button type="submit" disabled={busy} aria-label="Registrar rodada deserta">
          {busy ? "Registrando…" : "Registrar rodada deserta"}
        </Button>
      </div>
    </form>
  );
}

export default DesertedAttemptForm;
