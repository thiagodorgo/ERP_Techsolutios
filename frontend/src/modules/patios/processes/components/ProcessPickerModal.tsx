import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Alert, Button, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { getVehicleLabel } from "../processes.adapter";
import { allocateSpot, listProcessesFromApi } from "../processes.service";
import type { ProcessesApiContext, ProcessListItem } from "../processes.types";

// Alocação a partir do MAPA (spot-centric): escolhe qual processo colocar na vaga LIVRE selecionada → POST /:id/spot.
// A UI oferta os processos do tenant; o backend enforce o estado válido (409 se já estacionado / 422 se estado
// não permite). `excludeProcessIds` esconde os já estacionados no pátio atual (redução de conflito óbvio).
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" } as const;

export function ProcessPickerModal({
  spotId,
  spotCode,
  context,
  excludeProcessIds,
  onClose,
  onDone,
}: {
  readonly spotId: string;
  readonly spotCode: string;
  readonly context: ProcessesApiContext;
  readonly excludeProcessIds?: ReadonlySet<string>;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const [processes, setProcesses] = useState<ProcessListItem[]>([]);
  const [processId, setProcessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listProcessesFromApi(context, { limit: 200 })
      .then((data) => {
        if (!active) return;
        const exclude = excludeProcessIds ?? new Set<string>();
        setProcesses(data.items.filter((process) => !exclude.has(process.id)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context, excludeProcessIds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!processId) {
      setError("Selecione o processo a alocar.");
      return;
    }
    setSaving(true);
    try {
      await allocateSpot(context, processId, spotId);
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Alocar processo na vaga ${spotCode}`} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error ? (
          <Alert title="Não foi possível alocar" tone="danger">
            {error}
          </Alert>
        ) : null}

        <Select label="Processo de custódia *" value={processId} onChange={(event) => setProcessId(event.target.value)} required disabled={loading}>
          <option value="">{loading ? "Carregando processos…" : "Selecione o processo…"}</option>
          {processes.map((process) => (
            <option key={process.id} value={process.id}>
              {getVehicleLabel(process)} · {process.statusLabel} · {process.originAuthority}
            </option>
          ))}
        </Select>

        {!loading && processes.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 8 }}>Nenhum processo disponível para alocação neste momento.</p>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !processId}>
            {saving ? "Alocando…" : "Alocar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "A vaga não está mais livre ou o processo já está estacionado. Recarregue e tente novamente.";
    if (err.status === 422) return "Alocação não permitida para o estado atual do processo.";
    return err.safeMessage;
  }
  return err instanceof Error ? err.message : "Não foi possível alocar o processo.";
}

export default ProcessPickerModal;
