import { Save } from "lucide-react";
import { useMemo } from "react";

import { Alert, Button, EmptyState } from "../../../components/ui";
import type {
  ChecklistApiContext,
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRun,
  ChecklistRunAnswer,
  CreateChecklistMarkerInput,
} from "../types";
import { ChecklistRuntimeField } from "./ChecklistRuntimeField";

export type ChecklistRuntimeAnswers = Record<string, unknown>;

export function ChecklistRuntimeRenderer({
  context,
  schema,
  run,
  answers,
  attachments,
  markers,
  saving,
  completed,
  onAnswerChange,
  onSave,
  onAttachmentUploaded,
  onAddMarker,
}: {
  readonly context: ChecklistApiContext;
  readonly schema: ChecklistRenderSchema;
  readonly run: ChecklistRun | null;
  readonly answers: ChecklistRuntimeAnswers;
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly saving?: boolean;
  readonly completed?: boolean;
  readonly onAnswerChange: (componentId: string, value: unknown) => void;
  readonly onSave: () => Promise<unknown>;
  readonly onAttachmentUploaded: (attachment: ChecklistAttachment) => void;
  readonly onAddMarker: (input: CreateChecklistMarkerInput) => Promise<void>;
}) {
  const orderedComponents = useMemo(
    () => [...schema.components].sort((left, right) => left.orderIndex - right.orderIndex),
    [schema.components],
  );

  if (orderedComponents.length === 0) {
    return <EmptyState title="Schema sem componentes" detail="Publique um checklist com componentes para habilitar execucao operacional." />;
  }

  return (
    <section className="checklist-runtime-renderer">
      <Alert title="Execucao orientada por schema" tone="info">
        Os campos abaixo vieram do template publicado pela API. M10, M11 e M12 devem usar este mesmo runtime, sem campos hardcoded.
      </Alert>
      {orderedComponents.map((component) => (
        <ChecklistRuntimeField
          key={component.id}
          context={context}
          runId={run?.id}
          component={component}
          value={answers[component.id]}
          attachments={attachments.filter((attachment) => attachment.componentId === component.id)}
          markers={markers.filter((marker) => marker.componentId === component.id)}
          disabled={completed}
          onChange={(value) => onAnswerChange(component.id, value)}
          onAttachmentUploaded={onAttachmentUploaded}
          onAddMarker={onAddMarker}
        />
      ))}
      <div className="checklist-runtime-actions">
        <Button type="button" variant="secondary" onClick={onSave} disabled={saving || completed || !run}>
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar rascunho"}
        </Button>
      </div>
    </section>
  );
}

export function toRunAnswers(answers: ChecklistRuntimeAnswers): ChecklistRunAnswer[] {
  return Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([componentId, value]) => ({
      componentId,
      value,
      metadata: {},
    }));
}
