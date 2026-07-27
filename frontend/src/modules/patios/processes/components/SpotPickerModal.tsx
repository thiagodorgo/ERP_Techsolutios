import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { getYardOccupancy, listYardsFromApi } from "../../yards/yards.service";
import type { YardItem, YardSpotItem } from "../../yards/yards.types";
import { allocateSpot, moveSpot } from "../processes.service";
import type { ProcessesApiContext } from "../processes.types";

// Movimentação de vaga (impound:allocate) a partir do DOSSIÊ (process-centric): escolhe pátio + vaga LIVRE.
// mode="allocate" → POST /:id/spot; mode="move" → POST /:id/spot/move (backend classifica intra vs cross-pátio).
// A UI só molda/valida a escolha; a atomicidade (I1) e as regras (409/422) vivem no backend.
const footerStyle = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" } as const;

export function SpotPickerModal({
  processId,
  mode,
  fromSpotId,
  context,
  onClose,
  onDone,
}: {
  readonly processId: string;
  readonly mode: "allocate" | "move";
  readonly fromSpotId?: string | null;
  readonly context: ProcessesApiContext;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const [yards, setYards] = useState<YardItem[]>([]);
  const [yardId, setYardId] = useState("");
  const [spots, setSpots] = useState<YardSpotItem[]>([]);
  const [spotId, setSpotId] = useState("");
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listYardsFromApi(context, { limit: 100 }).then((data) => {
      if (active) setYards(data.items);
    });
    return () => {
      active = false;
    };
  }, [context]);

  useEffect(() => {
    if (!yardId) {
      setSpots([]);
      setSpotId("");
      return;
    }
    let active = true;
    setLoadingSpots(true);
    void getYardOccupancy(context, yardId)
      .then((occ) => {
        if (!active) return;
        // Só vagas LIVRES são destino válido (a vaga de origem não aparece).
        setSpots(occ.items.filter((spot) => spot.status === "FREE" && spot.id !== fromSpotId));
      })
      .finally(() => {
        if (active) setLoadingSpots(false);
      });
    return () => {
      active = false;
    };
  }, [yardId, context, fromSpotId]);

  const freeSpots = useMemo(() => spots, [spots]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!spotId) {
      setError("Selecione a vaga de destino.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "move") {
        if (!fromSpotId) {
          setError("Vaga de origem não identificada. Recarregue o processo.");
          setSaving(false);
          return;
        }
        await moveSpot(context, processId, fromSpotId, spotId);
      } else {
        await allocateSpot(context, processId, spotId);
      }
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "move" ? "Mover o processo de vaga" : "Alocar o processo em uma vaga";

  return (
    <Modal title={title} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error ? (
          <Alert title="Não foi possível concluir" tone="danger">
            {error}
          </Alert>
        ) : null}

        <Select label="Pátio de destino *" value={yardId} onChange={(event) => setYardId(event.target.value)} required>
          <option value="">Selecione o pátio…</option>
          {yards.map((yard) => (
            <option key={yard.id} value={yard.id}>
              {yard.name}
            </option>
          ))}
        </Select>

        <Select label="Vaga livre *" value={spotId} onChange={(event) => setSpotId(event.target.value)} required disabled={!yardId || loadingSpots}>
          <option value="">{loadingSpots ? "Carregando vagas…" : "Selecione a vaga…"}</option>
          {freeSpots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.code} · {spot.vehicleClassLabel}
              {spot.covered ? " · Coberta" : ""}
            </option>
          ))}
        </Select>

        {yardId && !loadingSpots && freeSpots.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 8 }}>Nenhuma vaga livre neste pátio. Escolha outro pátio ou libere uma vaga.</p>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !spotId}>
            {saving ? "Salvando…" : mode === "move" ? "Mover" : "Alocar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "A vaga não está mais livre ou o processo já está estacionado. Recarregue e tente novamente.";
    if (err.status === 422) return "Movimentação não permitida para o estado atual do processo.";
    return err.safeMessage;
  }
  return err instanceof Error ? err.message : "Não foi possível concluir a movimentação.";
}

export default SpotPickerModal;
