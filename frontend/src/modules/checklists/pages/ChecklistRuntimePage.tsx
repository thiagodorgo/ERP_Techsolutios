import { CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, Button, ErrorState, Skeleton } from "../../../components/ui";
import { StickyActionBar } from "../../../components/erp";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import {
  addMarker,
  completeChecklistRun,
  createChecklistRun,
  renderChecklist,
  updateChecklistRun,
} from "../checklist-runtime.service";
import type {
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRun,
  CreateChecklistMarkerInput,
} from "../types";
import { ChecklistRunSummary } from "../components/ChecklistRunSummary";
import { ChecklistRuntimeRenderer, toRunAnswers, type ChecklistRuntimeAnswers } from "../components/ChecklistRuntimeRenderer";
import { buildChecklistContext } from "./ChecklistRunsPage";

export function ChecklistRuntimePage() {
  const navigate = useNavigate();
  const { checklistId } = useParams();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const context = useMemo(() => buildChecklistContext(session?.accessToken, activeContext), [activeContext, session?.accessToken]);
  const [schema, setSchema] = useState<ChecklistRenderSchema | null>(null);
  const [run, setRun] = useState<ChecklistRun | null>(null);
  const [answers, setAnswers] = useState<ChecklistRuntimeAnswers>({});
  const [attachments, setAttachments] = useState<ChecklistAttachment[]>([]);
  const [markers, setMarkers] = useState<ChecklistMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!context || !checklistId) return;

      setLoading(true);
      setError(null);

      try {
        const rendered = await renderChecklist(context, checklistId);
        const createdRun = await createChecklistRun(context, {
          checklistId,
          answers: [],
        });

        if (!active) return;
        setSchema(rendered);
        setRun(createdRun);
      } catch {
        if (active) setError("Nao foi possivel iniciar a execucao do checklist.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [checklistId, context]);

  if (!context) {
    return <ErrorState title="Contexto operacional indisponivel" detail="Selecione um tenant antes de executar checklists." />;
  }

  if (!checklistId) {
    return <ErrorState title="Checklist invalido" detail="Informe um checklist publicado para iniciar execucao." />;
  }

  const completed = run?.status === "completed" || run?.status === "completed_with_divergence";

  async function handleSave(): Promise<boolean> {
    if (!context || !run) return false;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const details = await updateChecklistRun(context, run.id, {
        answers: toRunAnswers(answers),
      });
      setRun(details.run);
      setAttachments(details.attachments);
      setMarkers(details.markers);
      setMessage("Rascunho salvo com sucesso.");
      return true;
    } catch {
      setError("Nao foi possivel salvar o rascunho.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!context || !run || !schema) return;

    const validation = validateRequiredFields(schema, answers, attachments, markers);
    if (validation) {
      setError(validation);
      return;
    }

    setCompleting(true);
    setError(null);
    setMessage(null);

    try {
      const saved = await handleSave();
      if (!saved) return;
      const details = await completeChecklistRun(context, run.id);
      setRun(details.run);
      setAttachments(details.attachments);
      setMarkers(details.markers);
      setMessage("Checklist concluido com sucesso.");
    } catch {
      setError("Nao foi possivel concluir o checklist.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleAddMarker(input: CreateChecklistMarkerInput) {
    if (!context || !run) return;

    const marker = await addMarker(context, run.id, input);
    setMarkers((current) => [...current, marker]);
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>Runtime operacional</span>
          <h1>{schema?.name ?? "Executar checklist"}</h1>
          <p>Execucao web schema-driven para checklists publicados do tenant.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate("/operations/checklists")}>
          <RotateCcw size={16} />
          Voltar
        </Button>
      </header>

      {loading ? <Skeleton lines={5} /> : null}
      {error ? <Alert title="Atencao operacional" tone="danger">{error}</Alert> : null}
      {message ? <Alert title="Sucesso" tone="info">{message}</Alert> : null}

      {!loading && !schema ? (
        <ErrorState title="Schema indisponivel" detail="O checklist publicado nao retornou schema para execucao." />
      ) : null}

      {schema ? (
        <div className="checklist-runtime-layout">
          <ChecklistRuntimeRenderer
            context={context}
            schema={schema}
            run={run}
            answers={answers}
            attachments={attachments}
            markers={markers}
            saving={saving}
            completed={completed}
            onAnswerChange={(componentId, value) => setAnswers((current) => ({ ...current, [componentId]: value }))}
            onSave={handleSave}
            onAttachmentUploaded={(attachment) => setAttachments((current) => [...current, attachment])}
            onAddMarker={handleAddMarker}
          />
          <ChecklistRunSummary
            schema={schema}
            run={run}
            answers={toRunAnswers(answers)}
            attachments={attachments}
            markers={markers}
          />
        </div>
      ) : null}

      {schema && run ? (
        <StickyActionBar>
          <Button type="button" variant="secondary" onClick={handleSave} disabled={saving || completed}>
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button type="button" onClick={handleComplete} disabled={completing || completed}>
            <CheckCircle2 size={16} />
            {completing ? "Concluindo..." : "Concluir checklist"}
          </Button>
        </StickyActionBar>
      ) : null}
    </div>
  );
}

function validateRequiredFields(
  schema: ChecklistRenderSchema,
  answers: ChecklistRuntimeAnswers,
  attachments: readonly ChecklistAttachment[],
  markers: readonly ChecklistMarker[],
): string | null {
  for (const component of schema.components) {
    if (!component.required) continue;

    if (component.type === "photo_upload" && !attachments.some((attachment) => attachment.componentId === component.id)) {
      return `Envie ao menos uma evidencia para ${component.label}.`;
    }

    if (component.type === "before_after") {
      const before = attachments.some((attachment) => attachment.componentId === component.id && attachment.metadata?.stage === "before");
      const after = attachments.some((attachment) => attachment.componentId === component.id && attachment.metadata?.stage === "after");
      if (!before || !after) return `Envie evidencias antes e depois para ${component.label}.`;
    }

    if (component.type === "damage_map" && !markers.some((marker) => marker.componentId === component.id)) {
      return `Registre ao menos um marcador em ${component.label}.`;
    }

    if (["observation", "vehicle_selector", "acknowledgement"].includes(component.type)) {
      const value = answers[component.id];
      if (value === undefined || value === null || value === "" || value === false) {
        return `Preencha o campo obrigatorio ${component.label}.`;
      }
    }
  }

  return null;
}
