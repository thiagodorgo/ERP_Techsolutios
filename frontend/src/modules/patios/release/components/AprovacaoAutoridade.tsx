import { Gavel, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "../../../../components/ui";
import { formatDateTime } from "../../processes/processes.adapter";
import type { ApproveInput, ReleaseDto } from "../release.types";

// Ato da autoridade solicitante (release:approve, D-Ω5P-12) — idempotente. §2.8: o selo mostra SÓ o instante do
// ato ("Autorizada em…") — a referência/nota do ato (texto sensível) renderiza APENAS no comprovante art. 24.
// White-label: "autoridade solicitante", NUNCA "polícia".
const sealBox: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 12 };

export function AprovacaoAutoridade({
  release,
  canApprove,
  busy,
  error,
  onApprove,
}: {
  readonly release: ReleaseDto;
  readonly canApprove: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onApprove: (input: ApproveInput) => void;
}) {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const approved = Boolean(release.authorityApprovedAt);

  return (
    <Card title="Autorização da autoridade">
      {error ? (
        <Alert title="Não foi possível registrar a autorização" tone="danger">
          {error}
        </Alert>
      ) : null}

      {approved ? (
        <div style={sealBox}>
          <ShieldCheck size={18} aria-hidden color="#16A34A" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <strong style={{ fontSize: 14, color: "#166534" }}>Autorização registrada</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>Autorizada pela autoridade solicitante em {formatDateTime(release.authorityApprovedAt)}.</span>
          </div>
          <Badge tone="success">Autorizada</Badge>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>
          Registre o ato da autoridade solicitante que autoriza a restituição do veículo (art. 24).
        </p>
      )}

      {canApprove ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="ui-field" htmlFor="release-authority-reference">
            <span>Referência do ato (ofício, processo)</span>
            <input
              id="release-authority-reference"
              className="ui-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={120}
              placeholder="Ex.: Ofício nº 1234/2026 — Autoridade solicitante"
            />
          </label>
          <label className="ui-field" htmlFor="release-authority-note">
            <span>Observação (opcional)</span>
            <textarea
              id="release-authority-note"
              className="ui-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Observação do ato de autorização."
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="button"
              variant={approved ? "secondary" : "primary"}
              onClick={() => onApprove({ authorityReference: reference, authorityNote: note })}
              disabled={busy}
              aria-label={approved ? "Atualizar autorização da autoridade" : "Registrar autorização da autoridade"}
            >
              <Gavel size={15} aria-hidden /> {busy ? "Registrando…" : approved ? "Atualizar autorização" : "Registrar autorização"}
            </Button>
          </div>
        </div>
      ) : !approved ? (
        <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Aguardando a autorização da autoridade solicitante (você não tem permissão para registrá-la).</p>
      ) : null}
    </Card>
  );
}

export default AprovacaoAutoridade;
