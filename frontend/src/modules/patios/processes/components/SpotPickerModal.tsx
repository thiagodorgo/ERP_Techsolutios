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

export function SpotPickerSelectors({
  yards,
  yardId,
  spots,
  spotId,
  loadingYards,
  loadingSpots,
  yardsError,
  spotsError,
  onYardChange,
  onSpotChange,
  onRetryYards,
  onRetrySpots,
}: {
  readonly yards: readonly YardItem[];
  readonly yardId: string;
  readonly spots: readonly YardSpotItem[];
  readonly spotId: string;
  readonly loadingYards: boolean;
  readonly loadingSpots: boolean;
  readonly yardsError: string | null;
  readonly spotsError: string | null;
  readonly onYardChange: (yardId: string) => void;
  readonly onSpotChange: (spotId: string) => void;
  readonly onRetryYards: () => void;
  readonly onRetrySpots: () => void;
}) {
  return (
    <>
      <Select
        label="Pátio de destino *"
        value={yardId}
        onChange={(event) => onYardChange(event.target.value)}
        required
        disabled={loadingYards || Boolean(yardsError)}
      >
        <option value="">{loadingYards ? "Carregando pátios…" : "Selecione o pátio…"}</option>
        {yards.map((yard) => (
          <option key={yard.id} value={yard.id}>
            {yard.name}
          </option>
        ))}
      </Select>

      {yardsError ? (
        <div role="alert">
          <Alert title="Não foi possível carregar os pátios" tone="warning">
            {yardsError}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={onRetryYards}>
              Tentar de novo
            </Button>
          </Alert>
        </div>
      ) : null}

      <Select
        label="Vaga livre *"
        value={spotId}
        onChange={(event) => onSpotChange(event.target.value)}
        required
        disabled={!yardId || loadingSpots || Boolean(spotsError)}
      >
        <option value="">{loadingSpots ? "Carregando vagas…" : "Selecione a vaga…"}</option>
        {spots.map((spot) => (
          <option key={spot.id} value={spot.id}>
            {spot.code} · {spot.vehicleClassLabel}
            {spot.covered ? " · Coberta" : ""}
          </option>
        ))}
      </Select>

      {spotsError ? (
        <div role="alert">
          <Alert title="Não foi possível carregar as vagas" tone="warning">
            {spotsError}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={onRetrySpots}>
              Tentar de novo
            </Button>
          </Alert>
        </div>
      ) : null}
    </>
  );
}

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
  const [loadingYards, setLoadingYards] = useState(true);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [yardsError, setYardsError] = useState<string | null>(null);
  const [spotsError, setSpotsError] = useState<string | null>(null);
  const [yardsReload, setYardsReload] = useState(0);
  const [spotsReload, setSpotsReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingYards(true);
    setYardsError(null);
    void listYardsFromApi(context, { limit: 100 })
      .then((data) => {
        if (active) setYards(data.items);
      })
      .catch(() => {
        if (!active) return;
        setYards([]);
        setYardsError("Tente novamente para consultar os pátios disponíveis.");
      })
      .finally(() => {
        if (active) setLoadingYards(false);
      });
    return () => {
      active = false;
    };
  }, [context, yardsReload]);

  useEffect(() => {
    if (!yardId) {
      setSpots([]);
      setSpotId("");
      setSpotsError(null);
      return;
    }
    let active = true;
    setLoadingSpots(true);
    setSpotsError(null);
    void getYardOccupancy(context, yardId)
      .then((occ) => {
        if (!active) return;
        // Só vagas LIVRES são destino válido (a vaga de origem não aparece).
        setSpots(occ.items.filter((spot) => spot.status === "FREE" && spot.id !== fromSpotId));
      })
      .catch(() => {
        if (!active) return;
        setSpots([]);
        setSpotsError("Tente novamente para consultar as vagas livres.");
      })
      .finally(() => {
        if (active) setLoadingSpots(false);
      });
    return () => {
      active = false;
    };
  }, [yardId, context, fromSpotId, spotsReload]);

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

        <SpotPickerSelectors
          yards={yards}
          yardId={yardId}
          spots={freeSpots}
          spotId={spotId}
          loadingYards={loadingYards}
          loadingSpots={loadingSpots}
          yardsError={yardsError}
          spotsError={spotsError}
          onYardChange={(nextYardId) => {
            // Já no mesmo quadro: sem vagas antigas e sem "Nenhuma vaga livre" antes de a consulta começar.
            setYardId(nextYardId);
            setSpotId("");
            setSpots([]);
            setSpotsError(null);
            setLoadingSpots(Boolean(nextYardId));
          }}
          onSpotChange={setSpotId}
          onRetryYards={() => setYardsReload((value) => value + 1)}
          onRetrySpots={() => setSpotsReload((value) => value + 1)}
        />

        {yardId && !loadingSpots && !spotsError && freeSpots.length === 0 ? (
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
