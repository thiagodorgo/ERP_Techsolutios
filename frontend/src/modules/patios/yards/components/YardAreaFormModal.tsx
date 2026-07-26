import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateAreaName } from "../yards.adapter";
import { createYardArea, updateYardArea } from "../yards.service";
import type { YardAreaItem, YardAreaKind, YardVehicleClass, YardsApiContext } from "../yards.types";

const KIND_OPTIONS: readonly { value: YardAreaKind; label: string }[] = [
  { value: "BLOCK", label: "Quadra" },
  { value: "CORRIDOR", label: "Corredor" },
  { value: "ROW", label: "Fileira" },
];

const VEHICLE_CLASS_OPTIONS: readonly { value: YardVehicleClass; label: string }[] = [
  { value: "ANY", label: "Qualquer veículo" },
  { value: "MOTORCYCLE", label: "Motocicleta" },
  { value: "HEAVY", label: "Pesado" },
];

const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const fieldStackStyle: CSSProperties = { display: "grid", gap: "var(--space-12)" };

export function YardAreaFormModal({
  yardId,
  area,
  areas,
  context,
  onClose,
  onSaved,
}: {
  readonly yardId: string;
  readonly area: YardAreaItem | null;
  readonly areas: readonly YardAreaItem[];
  readonly context: YardsApiContext;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const isEdit = Boolean(area);
  const [name, setName] = useState(area?.name ?? "");
  const [kind, setKind] = useState<YardAreaKind>(area?.kind ?? "BLOCK");
  const [covered, setCovered] = useState(area?.covered ?? false);
  const [vehicleClass, setVehicleClass] = useState<YardVehicleClass>(area?.vehicleClass ?? "ANY");
  const [parentId, setParentId] = useState<string>(area?.parentId ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Na edição, uma área não pode ser sua própria superior.
  const parentOptions = areas.filter((candidate) => candidate.id !== area?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const error = validateAreaName(name);
    if (error) {
      setNameError(error);
      return;
    }
    setNameError(null);

    setSaving(true);
    try {
      if (isEdit && area) {
        // Lição veto B2: kind e área superior definem a IDENTIDADE/posição na árvore e NÃO são aceitos pelo PATCH
        // do backend — ficam desabilitados na edição (nunca dar falso sucesso). Só nome/cobertura/classe mudam.
        await updateYardArea(context, area.id, { name: name.trim(), covered, vehicleClass });
      } else {
        await createYardArea(context, yardId, {
          name: name.trim(),
          kind,
          covered,
          vehicleClass,
          parentId: parentId || undefined,
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError("Já existe uma área com este nome sob a mesma área superior.");
      } else {
        setServerError(err instanceof Error ? err.message : "Não foi possível salvar a área.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar área" : "Nova área"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={fieldStackStyle}>
          <div>
            <Input
              id="yard-area-field-name"
              label="Nome *"
              value={name}
              maxLength={160}
              autoComplete="off"
              helper="Ex.: Quadra A · Corredor 3 · Fileira 12"
              aria-invalid={nameError ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <small className="form-error">{nameError}</small> : null}
          </div>

          <Select
            id="yard-area-field-kind"
            label="Tipo de área"
            value={kind}
            disabled={isEdit}
            onChange={(event) => setKind(event.target.value as YardAreaKind)}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {isEdit ? <small style={{ color: "var(--text-secondary)" }}>O tipo é fixo após a criação — define a posição da área na hierarquia.</small> : null}

          {!isEdit ? (
            <Select id="yard-area-field-parent" label="Área superior" value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">Sem área superior (topo)</option>
              {parentOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.kindLabel} · {candidate.name}
                </option>
              ))}
            </Select>
          ) : null}

          <Select id="yard-area-field-class" label="Classe de veículo" value={vehicleClass} onChange={(event) => setVehicleClass(event.target.value as YardVehicleClass)}>
            {VEHICLE_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Checkbox label="Área coberta" checked={covered} onChange={(event) => setCovered(event.target.checked)} />
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar área"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
