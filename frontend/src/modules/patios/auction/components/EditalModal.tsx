import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal } from "../../../../components/ui";
import type { EdictInput } from "../auction.types";

// Registro do edital da rodada (impound:transition). edict_reference OBRIGATÓRIA (piso de designação REAL — barra
// o "edital vazio"). §2.8: auctioneer_ref é minimizado (rótulo/máscara, nunca PII completa) — o backend mascara na
// leitura. business_days é o prazo em dias úteis (venda exige >= 15, Lei 14.133). O backend valida e é a autoridade.
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" } as const;

export function EditalModal({
  defaultRound,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  readonly defaultRound: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onSubmit: (input: EdictInput) => void;
}) {
  const [round, setRound] = useState(String(defaultRound > 0 ? defaultRound : 1));
  const [edictReference, setEdictReference] = useState("");
  const [edictPlatform, setEdictPlatform] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [businessDays, setBusinessDays] = useState("15");
  const [pncpUrl, setPncpUrl] = useState("");
  const [auctioneerRef, setAuctioneerRef] = useState("");
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
    if (!edictReference.trim()) {
      setLocalError("Informe a referência do edital (uma designação real, não uma rodada vazia).");
      return;
    }
    const parsedDays = businessDays.trim() ? Number(businessDays) : undefined;
    if (parsedDays !== undefined && (!Number.isInteger(parsedDays) || parsedDays < 1)) {
      setLocalError("O prazo do edital deve ser um número inteiro de dias úteis (a venda exige ao menos 15).");
      return;
    }

    onSubmit({
      roundNumber,
      edictReference: edictReference.trim(),
      edictPlatform: edictPlatform.trim() || undefined,
      publishedAt: publishedAt.trim() || undefined,
      businessDays: parsedDays,
      pncpUrl: pncpUrl.trim() || undefined,
      auctioneerRef: auctioneerRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal title="Registrar edital da rodada" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error || localError ? (
          <Alert title="Não foi possível registrar o edital" tone="danger">
            {localError ?? error}
          </Alert>
        ) : null}

        <Input label="Rodada *" value={round} onChange={(event) => setRound(event.target.value)} inputMode="numeric" required />
        <Input
          label="Referência do edital *"
          value={edictReference}
          onChange={(event) => setEdictReference(event.target.value)}
          maxLength={200}
          placeholder="Ex.: Edital 12/2026"
          required
        />
        <Input label="Plataforma / portal" value={edictPlatform} onChange={(event) => setEdictPlatform(event.target.value)} maxLength={200} />
        <Input label="Data de publicação" type="date" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
        <Input
          label="Prazo do edital (dias úteis)"
          value={businessDays}
          onChange={(event) => setBusinessDays(event.target.value)}
          inputMode="numeric"
          helper="A venda exige ao menos 15 dias úteis (Lei 14.133)."
        />
        <Input label="URL no PNCP" value={pncpUrl} onChange={(event) => setPncpUrl(event.target.value)} maxLength={500} />
        <Input
          label="Referência do leiloeiro"
          value={auctioneerRef}
          onChange={(event) => setAuctioneerRef(event.target.value)}
          maxLength={200}
          helper="Use um rótulo/referência, não dados pessoais completos."
        />
        <label className="ui-field">
          <span>Observações</span>
          <textarea className="ui-input" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={1000} />
        </label>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Registrando…" : "Registrar edital"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default EditalModal;
