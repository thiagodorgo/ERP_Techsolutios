import { MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, Button, Checkbox, Select } from "../../../components/ui";
import { downloadChecklistAttachment } from "../checklist-attachments.service";
import type {
  ChecklistApiContext,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRuntimeComponent,
  CreateChecklistMarkerInput,
} from "../types";
import { ChecklistAttachmentList } from "./ChecklistAttachmentList";
import { ChecklistAttachmentUploader } from "./ChecklistAttachmentUploader";

export function ChecklistRuntimeField({
  context,
  runId,
  component,
  value,
  attachments,
  markers,
  disabled,
  onChange,
  onAttachmentUploaded,
  onAddMarker,
}: {
  readonly context: ChecklistApiContext;
  readonly runId?: string;
  readonly component: ChecklistRuntimeComponent;
  readonly value: unknown;
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly disabled?: boolean;
  readonly onChange: (value: unknown) => void;
  readonly onAttachmentUploaded: (attachment: ChecklistAttachment) => void;
  readonly onAddMarker: (input: CreateChecklistMarkerInput) => Promise<void>;
}) {
  const title = `${component.label}${component.required ? " *" : ""}`;

  return (
    <section className="checklist-runtime-field">
      <header>
        <div>
          <strong>{title}</strong>
          <span>{component.type}</span>
        </div>
      </header>
      {renderField()}
    </section>
  );

  function renderField() {
    if (component.type === "observation") {
      return (
        <label className="ui-field">
          <span>Observacao operacional</span>
          <textarea
            className="ui-input checklist-runtime-textarea"
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      );
    }

    if (component.type === "vehicle_selector") {
      const options = readVehicleOptions(component.config);

      return (
        <Select label="Tipo de veiculo" value={typeof value === "string" ? value : ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          <option value="">Selecione</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }

    if (component.type === "acknowledgement") {
      return (
        <Checkbox
          label={readString(component.config.message) ?? "Declaro ciencia das informacoes registradas nesta execucao."}
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      );
    }

    if (component.type === "photo_upload") {
      return (
        <EvidenceBlock
          context={context}
          runId={runId}
          componentId={component.id}
          attachments={attachments}
          disabled={disabled}
          onAttachmentUploaded={onAttachmentUploaded}
        />
      );
    }

    if (component.type === "before_after") {
      return (
        <div className="checklist-runtime-evidence-grid">
          <EvidenceBlock
            title="Antes"
            context={context}
            runId={runId}
            componentId={component.id}
            attachments={attachments.filter((attachment) => attachment.metadata?.stage === "before")}
            disabled={disabled}
            metadata={{ stage: "before" }}
            onAttachmentUploaded={onAttachmentUploaded}
          />
          <EvidenceBlock
            title="Depois"
            context={context}
            runId={runId}
            componentId={component.id}
            attachments={attachments.filter((attachment) => attachment.metadata?.stage === "after")}
            disabled={disabled}
            metadata={{ stage: "after" }}
            onAttachmentUploaded={onAttachmentUploaded}
          />
        </div>
      );
    }

    if (component.type === "damage_map") {
      return (
        <DamageMapField
          componentId={component.id}
          markers={markers}
          disabled={disabled}
          onAddMarker={onAddMarker}
        />
      );
    }

    if (component.type === "comparison") {
      return (
        <Alert title="Comparacao operacional" tone="info">
          Este componente esta configurado no schema. A comparacao avancada usa o endpoint de comparacao quando houver execucao relacionada estavel.
        </Alert>
      );
    }

    return (
      <Alert title="Componente configurado" tone="info">
        Execucao avancada pendente para este componente. O schema foi renderizado sem bloquear o checklist.
      </Alert>
    );
  }
}

function EvidenceBlock({
  title = "Evidencias",
  context,
  runId,
  componentId,
  attachments,
  disabled,
  metadata,
  onAttachmentUploaded,
}: {
  readonly title?: string;
  readonly context: ChecklistApiContext;
  readonly runId?: string;
  readonly componentId: string;
  readonly attachments: readonly ChecklistAttachment[];
  readonly disabled?: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly onAttachmentUploaded: (attachment: ChecklistAttachment) => void;
}) {
  return (
    <div className="checklist-runtime-evidence-block">
      <strong>{title}</strong>
      {!runId ? (
        <Alert title="Execucao em preparacao" tone="info">
          A evidencia podera ser enviada assim que a execucao for iniciada.
        </Alert>
      ) : disabled ? null : (
        <ChecklistAttachmentUploader
          context={context}
          runId={runId}
          componentId={componentId}
          metadata={metadata}
          onUploaded={onAttachmentUploaded}
        />
      )}
      {runId ? (
        <ChecklistAttachmentList
          attachments={attachments}
          onDownload={(attachment) => downloadChecklistAttachment(context, runId, attachment.id)}
        />
      ) : null}
    </div>
  );
}

function DamageMapField({
  componentId,
  markers,
  disabled,
  onAddMarker,
}: {
  readonly componentId: string;
  readonly markers: readonly ChecklistMarker[];
  readonly disabled?: boolean;
  readonly onAddMarker: (input: CreateChecklistMarkerInput) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [markerType, setMarkerType] = useState("damage");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markerCount = useMemo(() => markers.length, [markers.length]);

  async function handleAddMarker() {
    setSaving(true);
    setError(null);

    try {
      await onAddMarker({
        componentId,
        x: 0.5,
        y: 0.5,
        markerType,
        description: description.trim() || undefined,
      });
      setDescription("");
    } catch {
      setError("Nao foi possivel registrar o marcador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="checklist-runtime-damage">
      <div className="checklist-runtime-damage__surface">
        <MapPin size={22} />
        <strong>{markerCount}</strong>
        <span>marcadores registrados</span>
      </div>
      {disabled ? null : (
        <div className="checklist-runtime-marker-form">
          <Select label="Tipo" value={markerType} onChange={(event) => setMarkerType(event.target.value)}>
            <option value="damage">Avaria</option>
            <option value="scratch">Risco</option>
            <option value="dent">Amassado</option>
            <option value="attention">Atencao</option>
          </Select>
          <label className="ui-field">
            <span>Descricao</span>
            <input className="ui-input" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <Button type="button" variant="secondary" onClick={handleAddMarker} disabled={saving}>
            <Plus size={16} />
            {saving ? "Registrando..." : "Adicionar marcador"}
          </Button>
        </div>
      )}
      {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
      {markers.length > 0 ? (
        <ul className="checklist-runtime-marker-list">
          {markers.map((marker) => (
            <li key={marker.id}>
              <strong>{marker.markerType}</strong>
              <span>{marker.description ?? "Sem descricao"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function readVehicleOptions(config: Record<string, unknown>): Array<{ value: string; label: string }> {
  const source = Array.isArray(config.options) ? config.options : Array.isArray(config.vehicleTypes) ? config.vehicleTypes : [];
  const options = source
    .map((item) => {
      if (typeof item === "string") return { value: item, label: labelFromValue(item) };
      if (isRecord(item)) {
        const value = readString(item.value) ?? readString(item.id) ?? readString(item.type);
        const label = readString(item.label) ?? readString(item.name) ?? value;
        return value ? { value, label: label ?? value } : null;
      }
      return null;
    })
    .filter((item): item is { value: string; label: string } => item !== null);

  return options.length > 0
    ? options
    : [
        { value: "car", label: "Carro" },
        { value: "motorcycle", label: "Moto" },
        { value: "truck", label: "Caminhao" },
        { value: "van", label: "Utilitario" },
      ];
}

function labelFromValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
