import { CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StickyActionBar } from "../../../components/erp";
import { Alert, Button, ErrorState, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import {
  acknowledgeRun,
  addMarker,
  completeChecklistRun,
  createChecklistRun,
  getRunComparison,
  renderChecklist,
  reportDivergence,
  updateChecklistRun,
} from "../checklist-runtime.service";
import {
  calculateChecklistRuntimeProgress,
  toRunAnswers,
  validateChecklistRuntime,
  type ChecklistRuntimeAnswers,
  type ChecklistRuntimeValidationError,
} from "../checklist-runtime.validation";
import { ChecklistRunSummary } from "../components/ChecklistRunSummary";
import { ChecklistRuntimeRenderer } from "../components/ChecklistRuntimeRenderer";
import type {
  ChecklistAttachment,
  ChecklistMarker,
  ChecklistRenderSchema,
  ChecklistRun,
  ChecklistRunComparison,
  CreateChecklistMarkerInput,
} from "../types";
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
  const [comparison, setComparison] = useState<ChecklistRunComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ChecklistRuntimeValidationError[]>([]);
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
        setAttachments(createdRun.attachments ?? []);
        setMarkers(createdRun.markers ?? []);

        if (hasComparisonComponent(rendered)) {
          void refreshComparison(createdRun.id, active);
        }
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
  const progress = schema ? calculateChecklistRuntimeProgress(schema, answers, attachments, markers) : null;

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
      if (schema && hasComparisonComponent(schema)) {
        void refreshComparison(details.run.id);
      }
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

    const validation = validateChecklistRuntime(schema, answers, attachments, markers);
    setValidationErrors(validation);
    if (validation.length > 0) {
      setError(validation[0].message);
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
      if (hasComparisonComponent(schema)) {
        void refreshComparison(details.run.id);
      }
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
    setValidationErrors((current) => current.filter((item) => item.componentId !== input.componentId));
  }

  function handleRemoveMarker(markerId: string) {
    setMarkers((current) => current.filter((marker) => marker.id !== markerId));
  }

  async function handleReportDivergence(componentId: string, observation: string, attachment: ChecklistAttachment) {
    if (!context || !run) return;

    const details = await reportDivergence(context, run.id, {
      componentId,
      fileUrl: attachment.fileUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      observation,
      metadata: {
        sourceAttachmentId: attachment.id,
      },
    });
    setRun(details.run);
    setAttachments(details.attachments);
    setMarkers(details.markers);
    await refreshComparison(details.run.id);
    setMessage("Divergencia registrada. A execucao ficou pendente de ciencia quando exigido pelo backend.");
  }

  async function handleAcknowledgeRun(message: string, observation?: string) {
    if (!context || !run) return;

    const { run: details } = await acknowledgeRun(context, run.id, {
      message,
      observation,
    });
    setRun(details.run);
    setAttachments(details.attachments);
    setMarkers(details.markers);
    await refreshComparison(details.run.id);
    setMessage("Ciencia registrada com sucesso.");
  }

  async function refreshComparison(runId: string, active = true) {
    if (!context) return;

    setComparisonLoading(true);
    try {
      const nextComparison = await getRunComparison(context, runId);
      if (active) setComparison(nextComparison);
    } catch {
      if (active) setComparison(null);
    } finally {
      if (active) setComparisonLoading(false);
    }
  }

  function handleAnswerChange(componentId: string, value: unknown) {
    setAnswers((current) => ({ ...current, [componentId]: value }));
    setValidationErrors((current) => current.filter((item) => item.componentId !== componentId));
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
      {error ? (
        <Alert title="Atencao operacional" tone="danger">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert title="Sucesso" tone="info">
          {message}
        </Alert>
      ) : null}

      {schema && progress ? (
        <section className="checklist-runtime-progress" aria-label="Progresso de preenchimento">
          <div>
            <strong>{progress.percent}% preenchido</strong>
            <span>
              {progress.requiredCompleted} de {progress.requiredTotal} obrigatorios completos · {typeHelpText(schema.type)}
            </span>
          </div>
          <progress max={100} value={progress.percent} />
          {progress.missingLabels.length > 0 ? (
            <small>Pendentes: {progress.missingLabels.join(", ")}</small>
          ) : (
            <small>Obrigatorios basicos prontos para validacao final do backend.</small>
          )}
        </section>
      ) : null}

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
            comparison={comparison}
            comparisonLoading={comparisonLoading}
            validationErrors={validationErrors}
            saving={saving}
            completed={completed}
            onAnswerChange={handleAnswerChange}
            onSave={handleSave}
            onAttachmentUploaded={(attachment) => {
              setAttachments((current) => [...current, attachment]);
              setValidationErrors((current) => current.filter((item) => item.componentId !== attachment.componentId));
            }}
            onAddMarker={handleAddMarker}
            onRemoveMarker={handleRemoveMarker}
            onReportDivergence={handleReportDivergence}
            onAcknowledgeRun={handleAcknowledgeRun}
          />
          <ChecklistRunSummary
            schema={schema}
            run={run}
            answers={toRunAnswers(answers)}
            attachments={attachments}
            markers={markers}
            comparison={comparison}
            progress={progress}
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

function hasComparisonComponent(schema: ChecklistRenderSchema): boolean {
  return schema.components.some((component) => component.type === "comparison");
}

function typeHelpText(type: ChecklistRenderSchema["type"]): string {
  if (type === "towing_collection") return "Coleta/reboque: veiculo, avarias e fotos conforme schema.";
  if (type === "towing_delivery") return "Entrega/reboque: comparacao, divergencia e ciencia quando vierem no schema.";
  if (type === "technical_evidence") return "Evidencia tecnica: antes/depois, fotos e observacoes conforme schema.";
  return "Checklist customizado orientado pelo schema publicado.";
}
