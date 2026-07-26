import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateSpotCode } from "../yards.adapter";
import { createYardSpot, updateYardSpot } from "../yards.service";
import type { YardSpotItem, YardSpotOperationalStatus, YardVehicleClass, YardsApiContext } from "../yards.types";

const VEHICLE_CLASS_OPTIONS: readonly { value: YardVehicleClass; label: string }[] = [
  { value: "ANY", label: "Qualquer veículo" },
  { value: "MOTORCYCLE", label: "Motocicleta" },
  { value: "HEAVY", label: "Pesado" },
];

// Só bloqueio operacional na UI: FREE⇄BLOCKED. OCCUPIED é READ-ONLY (alocação por processo = PR-06/08).
const STATUS_OPTIONS: readonly { value: YardSpotOperationalStatus; label: string }[] = [
  { value: "FREE", label: "Livre" },
  { value: "BLOCKED", label: "Bloqueada" },
];

const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const fieldStackStyle: CSSProperties = { display: "grid", gap: "var(--space-12)" };

export function YardSpotFormModal({
  areaId,
  spot,
  context,
  onClose,
  onSaved,
}: {
  readonly areaId: string;
  readonly spot: YardSpotItem | null;
  readonly context: YardsApiContext;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const isEdit = Boolean(spot);
  const isOccupied = spot?.status === "OCCUPIED";
  const [code, setCode] = useState(spot?.code ?? "");
  const [covered, setCovered] = useState(spot?.covered ?? false);
  const [vehicleClass, setVehicleClass] = useState<YardVehicleClass>(spot?.vehicleClass ?? "ANY");
  const [status, setStatus] = useState<YardSpotOperationalStatus>(spot?.status === "BLOCKED" ? "BLOCKED" : "FREE");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const error = validateSpotCode(code);
    if (error) {
      setCodeError(error);
      return;
    }
    setCodeError(null);

    setSaving(true);
    try {
      if (isEdit && spot) {
        // Vaga OCUPADA: nunca envia status (a liberação da vaga é por processo, PR-06). Só config muda.
        await updateYardSpot(context, spot.id, {
          code: code.trim().toUpperCase(),
          covered,
          vehicleClass,
          ...(isOccupied ? {} : { status }),
        });
      } else {
        await createYardSpot(context, areaId, { code: code.trim().toUpperCase(), covered, vehicleClass });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError("Já existe uma vaga com este código nesta área. Informe outro código.");
      } else {
        setServerError(err instanceof Error ? err.message : "Não foi possível salvar a vaga.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar vaga" : "Nova vaga"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        {isOccupied ? (
          <Alert title="Vaga ocupada" tone="info">
            A situação de uma vaga ocupada é definida pelo processo em custódia — a liberação da vaga não é feita por aqui.
          </Alert>
        ) : null}

        <div style={fieldStackStyle}>
          <div>
            <Input
              id="yard-spot-field-code"
              label="Código da vaga *"
              value={code}
              maxLength={40}
              autoComplete="off"
              helper="Identificador único da vaga na área. Ex.: A-12"
              aria-invalid={codeError ? true : undefined}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            {codeError ? <small className="form-error">{codeError}</small> : null}
          </div>

          <Select id="yard-spot-field-class" label="Classe de veículo" value={vehicleClass} onChange={(event) => setVehicleClass(event.target.value as YardVehicleClass)}>
            {VEHICLE_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {isEdit && !isOccupied ? (
            <Select id="yard-spot-field-status" label="Situação da vaga" value={status} onChange={(event) => setStatus(event.target.value as YardSpotOperationalStatus)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : null}

          <Checkbox label="Vaga coberta" checked={covered} onChange={(event) => setCovered(event.target.checked)} />
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar vaga"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
