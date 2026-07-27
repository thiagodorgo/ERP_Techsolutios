import { useState } from "react";

import { Alert, Button, Modal } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { vacateSpot } from "../processes.service";
import type { ProcessesApiContext } from "../processes.types";

// Liberação da vaga (impound:allocate) — ação destrutiva → CONFIRMAÇÃO (§11). DELETE /:id/spot. Mantém o
// processo; só desocupa a vaga (a custódia segue). Delega o estado válido ao backend (409/422).
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" } as const;

export function VacateSpotModal({
  processId,
  spotId,
  spotCode,
  context,
  onClose,
  onDone,
}: {
  readonly processId: string;
  readonly spotId: string;
  readonly spotCode?: string;
  readonly context: ProcessesApiContext;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setSaving(true);
    try {
      await vacateSpot(context, processId, spotId);
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Liberar a vaga" open onClose={onClose}>
      {error ? (
        <Alert title="Não foi possível liberar" tone="danger">
          {error}
        </Alert>
      ) : null}

      <p style={{ fontSize: 14, color: "#334155" }}>
        Confirma liberar a vaga{spotCode ? ` ${spotCode}` : ""}? O processo permanece em custódia — apenas a vaga é
        desocupada. A ação é registrada na cadeia de eventos.
      </p>

      <footer style={footerStyle}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" onClick={() => void handleConfirm()} disabled={saving}>
          {saving ? "Liberando…" : "Liberar vaga"}
        </Button>
      </footer>
    </Modal>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "A vaga já não está ocupada por este processo. Recarregue e tente novamente.";
    if (err.status === 422) return "Liberação não permitida para o estado atual do processo.";
    return err.safeMessage;
  }
  return err instanceof Error ? err.message : "Não foi possível liberar a vaga.";
}

export default VacateSpotModal;
