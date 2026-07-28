import { Gavel, Recycle, ShieldCheck } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Card, EmptyState, Modal, Select } from "../../../../components/ui";
import type { UnrecoverableInput } from "../auction.types";

// ACTIVE_CUSTODY — entrada do rito de leilão: (1) "Marcar elegível a leilão" (o backend resolve as 6 pré-condições
// REAIS: convênio público, prazo >= 60d, trilha de notificações, notificação inicial ao proprietário, cadeia I2,
// sem liberação em curso — a UI NÃO as deriva, só as lista como "verificado no servidor"); (2) "Reciclar por
// inservibilidade" (§§16-18: sucata/inservível + fundamento) — IRREVERSÍVEL → CONFIRMAÇÃO explícita.
const hintRow: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#64748B", padding: "4px 0" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

const SERVER_PRECONDITIONS = [
  "Pátio sob convênio público (art. 328).",
  "Prazo de elegibilidade atingido (a partir de 60 dias da entrada).",
  "Trilha de notificações legais completa.",
  "Notificação inicial ao proprietário emitida (ou dispensada).",
  "Cadeia de integridade da custódia verificada (I2).",
  "Sem liberação em andamento.",
];

export function EligibilityPanel({
  canTransition,
  busy,
  error,
  onMarkEligible,
  onRecycleUnrecoverable,
}: {
  readonly canTransition: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onMarkEligible: () => void;
  readonly onRecycleUnrecoverable: (input: UnrecoverableInput) => void;
}) {
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [classification, setClassification] = useState<UnrecoverableInput["classification"]>("UNRECOVERABLE");
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleRecycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setLocalError(null);
    if (!reason.trim()) {
      setLocalError("Informe o fundamento da inservibilidade (art. §§16-18).");
      return;
    }
    setRecycleOpen(false);
    onRecycleUnrecoverable({ classification, reason: reason.trim() });
  }

  return (
    <Card title="Leilão">
      {error ? (
        <Alert title="Não foi possível concluir" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
        Torne o processo elegível a leilão quando o rito administrativo estiver cumprido, ou recicle diretamente um bem
        inservível (§§16-18).
      </p>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", margin: "0 0 4px" }}>Pré-condições (verificadas no servidor)</p>
        {SERVER_PRECONDITIONS.map((precondition) => (
          <p key={precondition} style={hintRow}>
            <ShieldCheck size={14} aria-hidden color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} /> {precondition}
          </p>
        ))}
      </div>

      {canTransition ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button type="button" onClick={onMarkEligible} disabled={busy} aria-label="Marcar elegível a leilão">
            <Gavel size={15} aria-hidden /> {busy ? "Processando…" : "Marcar elegível a leilão"}
          </Button>
          <Button type="button" variant="danger" onClick={() => setRecycleOpen(true)} disabled={busy} aria-label="Reciclar por inservibilidade">
            <Recycle size={15} aria-hidden /> Reciclar por inservibilidade
          </Button>
        </div>
      ) : (
        <EmptyState title="Somente leitura" detail="Você não tem permissão para conduzir o leilão deste processo." />
      )}

      <Modal title="Reciclar por inservibilidade" open={recycleOpen} onClose={() => setRecycleOpen(false)}>
        <form onSubmit={handleRecycle} noValidate>
          {localError ? (
            <Alert title="Não foi possível reciclar" tone="danger">
              {localError}
            </Alert>
          ) : null}
          <p style={{ fontSize: 14, color: "#334155" }}>
            A reciclagem direta é <strong>IRREVERSÍVEL</strong>: o veículo segue para baixa no Renavam. Informe a
            classificação e o fundamento do ato (§§16-18).
          </p>
          <Select label="Classificação *" value={classification} onChange={(event) => setClassification(event.target.value as UnrecoverableInput["classification"])} required>
            <option value="UNRECOVERABLE">Inservível</option>
            <option value="SCRAP">Sucata</option>
          </Select>
          <label className="ui-field">
            <span>Fundamento *</span>
            <textarea
              className="ui-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Fundamento da inservibilidade (ex.: laudo técnico)."
            />
          </label>
          <footer style={footerStyle}>
            <Button type="button" variant="ghost" onClick={() => setRecycleOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? "Reciclando…" : "Confirmar reciclagem"}
            </Button>
          </footer>
        </form>
      </Modal>
    </Card>
  );
}

export default EligibilityPanel;
