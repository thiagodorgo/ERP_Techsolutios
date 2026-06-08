import { AlertTriangle, CheckCircle2, MapPin, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, Button, Checkbox, Select } from "../../../components/ui";
import { downloadChecklistAttachment } from "../checklist-attachments.service";
import {
  readAcknowledgementValue,
  readConfiguredMessage,
  requiresAcknowledgementObservation,
} from "../checklist-runtime.validation";
import type {
  ChecklistApiContext,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRunComparison,
  ChecklistRunStatus,
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
  allAttachments,
  markers,
  runStatus,
  comparison,
  comparisonLoading,
  validationError,
  disabled,
  onChange,
  onAttachmentUploaded,
  onAddMarker,
  onRemoveMarker,
  onReportDivergence,
  onAcknowledgeRun,
}: {
  readonly context: ChecklistApiContext;
  readonly runId?: string;
  readonly component: ChecklistRuntimeComponent;
  readonly value: unknown;
  readonly attachments: readonly ChecklistAttachment[];
  readonly allAttachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly runStatus?: ChecklistRunStatus;
  readonly comparison?: ChecklistRunComparison | null;
  readonly comparisonLoading?: boolean;
  readonly validationError?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: unknown) => void;
  readonly onAttachmentUploaded: (attachment: ChecklistAttachment) => void;
  readonly onAddMarker: (input: CreateChecklistMarkerInput) => Promise<void>;
  readonly onRemoveMarker: (markerId: string) => void;
  readonly onReportDivergence: (componentId: string, observation: string, attachment: ChecklistAttachment) => Promise<void>;
  readonly onAcknowledgeRun: (message: string, observation?: string) => Promise<void>;
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
      {validationError ? <p className="checklist-runtime-field-error">{validationError}</p> : null}
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
      const acknowledgement = readAcknowledgementValue(value);
      const requireObservation = requiresAcknowledgementObservation(component);
      const message = readConfiguredMessage(component, "Declaro ciencia das informacoes registradas nesta execucao.");

      return (
        <div className="checklist-runtime-acknowledgement">
          <Checkbox
            label={message}
            checked={acknowledgement.accepted}
            disabled={disabled}
            onChange={(event) => onChange({ ...acknowledgement, accepted: event.currentTarget.checked })}
          />
          {requireObservation ? (
            <label className="ui-field">
              <span>Observacao da ciencia</span>
              <textarea
                className="ui-input checklist-runtime-textarea"
                value={acknowledgement.observation}
                disabled={disabled}
                onChange={(event) => onChange({ ...acknowledgement, observation: event.target.value })}
              />
            </label>
          ) : null}
          {runStatus === "pending_acknowledgement" && !disabled ? (
            <AcknowledgeRunAction
              message={message}
              observation={acknowledgement.observation}
              accepted={acknowledgement.accepted}
              requireObservation={requireObservation}
              onAcknowledgeRun={onAcknowledgeRun}
            />
          ) : null}
        </div>
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
          onRemoveMarker={onRemoveMarker}
        />
      );
    }

    if (component.type === "comparison") {
      return (
        <ComparisonField
          componentId={component.id}
          comparison={comparison}
          loading={comparisonLoading}
          allAttachments={allAttachments}
          disabled={disabled}
          onReportDivergence={onReportDivergence}
        />
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
  onRemoveMarker,
}: {
  readonly componentId: string;
  readonly markers: readonly ChecklistMarker[];
  readonly disabled?: boolean;
  readonly onAddMarker: (input: CreateChecklistMarkerInput) => Promise<void>;
  readonly onRemoveMarker: (markerId: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [markerType, setMarkerType] = useState("damage");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markerCount = useMemo(() => markers.length, [markers.length]);

  async function handleAddMarker() {
    if (!description.trim()) {
      setError("Informe uma descricao para o marcador.");
      return;
    }

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
              <div>
                <strong>{marker.markerType}</strong>
                <span>{marker.description ?? "Sem descricao"}</span>
              </div>
              {!disabled ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveMarker(marker.id)}>
                  <Trash2 size={14} />
                  Remover
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ComparisonField({
  componentId,
  comparison,
  loading,
  allAttachments,
  disabled,
  onReportDivergence,
}: {
  readonly componentId: string;
  readonly comparison?: ChecklistRunComparison | null;
  readonly loading?: boolean;
  readonly allAttachments: readonly ChecklistAttachment[];
  readonly disabled?: boolean;
  readonly onReportDivergence: (componentId: string, observation: string, attachment: ChecklistAttachment) => Promise<void>;
}) {
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evidence = allAttachments[0];

  async function handleReportDivergence() {
    if (!observation.trim()) {
      setError("Informe uma observacao para registrar divergencia.");
      return;
    }

    if (!evidence) {
      setError("Anexe ao menos uma foto ou evidencia antes de registrar divergencia.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onReportDivergence(componentId, observation.trim(), evidence);
      setObservation("");
    } catch {
      setError("Nao foi possivel registrar a divergencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checklist-runtime-comparison">
      <Alert title="Comparacao operacional" tone="info">
        {loading
          ? "Carregando comparacao da execucao."
          : "O resumo abaixo vem do endpoint de comparacao quando houver dados para esta execucao."}
      </Alert>

      {comparison ? (
        <div className="checklist-runtime-comparison-grid">
          <article>
            <strong>Status comparado</strong>
            <span>{comparison.comparison.status}</span>
          </article>
          <article>
            <strong>Divergencia</strong>
            <span>{comparison.comparison.divergence ? "Sim" : "Nao registrada"}</span>
          </article>
          <article>
            <strong>Dados avaliados</strong>
            <span>
              {comparison.answers.length} respostas · {comparison.attachments.length} evidencias · {comparison.markers.length} marcadores
            </span>
          </article>
        </div>
      ) : (
        <Alert title="Comparacao ainda indisponivel" tone="warning">
          O runtime permanece ativo, mas a API/mock nao retornou dados comparativos para esta execucao.
        </Alert>
      )}

      {!disabled ? (
        <div className="checklist-runtime-divergence">
          <label className="ui-field">
            <span>Observacao da divergencia</span>
            <textarea
              className="ui-input checklist-runtime-textarea"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
            <small>Use evidencia ja anexada ao run; o backend registra a divergencia e exige ciencia quando aplicavel.</small>
          </label>
          {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
          <Button type="button" variant="secondary" onClick={handleReportDivergence} disabled={submitting}>
            <AlertTriangle size={16} />
            {submitting ? "Registrando..." : "Registrar divergencia"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AcknowledgeRunAction({
  message,
  observation,
  accepted,
  requireObservation,
  onAcknowledgeRun,
}: {
  readonly message: string;
  readonly observation: string;
  readonly accepted: boolean;
  readonly requireObservation: boolean;
  readonly onAcknowledgeRun: (message: string, observation?: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAcknowledge() {
    if (!accepted) {
      setError("Confirme a ciencia antes de registrar.");
      return;
    }
    if (requireObservation && !observation.trim()) {
      setError("Informe a observacao obrigatoria da ciencia.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAcknowledgeRun(message, observation.trim() || undefined);
    } catch {
      setError("Nao foi possivel registrar a ciencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checklist-runtime-acknowledgement-action">
      {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
      <Button type="button" variant="secondary" onClick={handleAcknowledge} disabled={submitting}>
        <CheckCircle2 size={16} />
        {submitting ? "Registrando..." : "Registrar ciencia"}
      </Button>
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
