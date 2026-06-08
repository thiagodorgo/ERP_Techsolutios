import { ClipboardCheck, Paperclip, ShieldCheck } from "lucide-react";

import { Card } from "../../../components/ui";
import type { ChecklistRuntimeProgress } from "../checklist-runtime.validation";
import type { ChecklistAttachment, ChecklistMarker, ChecklistRenderSchema, ChecklistRun, ChecklistRunAnswer, ChecklistRunComparison } from "../types";
import { ChecklistRunStatusBadge } from "./ChecklistRunStatusBadge";

export function ChecklistRunSummary({
  schema,
  run,
  answers,
  attachments,
  markers,
  comparison,
  progress,
}: {
  readonly schema: ChecklistRenderSchema;
  readonly run: ChecklistRun | null;
  readonly answers: readonly ChecklistRunAnswer[];
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
  readonly comparison?: ChecklistRunComparison | null;
  readonly progress?: ChecklistRuntimeProgress | null;
}) {
  return (
    <Card title="Resumo da execucao">
      <div className="checklist-runtime-summary">
        <article>
          <ClipboardCheck size={18} />
          <div>
            <strong>{schema.name}</strong>
            <span>
              {schema.type} · versao {schema.version}
            </span>
          </div>
        </article>
        <article>
          <ShieldCheck size={18} />
          <div>
            <strong>Status</strong>
            {run ? <ChecklistRunStatusBadge status={run.status} /> : <span>Preparando execucao</span>}
          </div>
        </article>
        <article>
          <Paperclip size={18} />
          <div>
            <strong>Evidencias</strong>
            <span>
              {attachments.length} anexos · {markers.length} marcadores · {answers.length} respostas
            </span>
          </div>
        </article>
        {progress ? (
          <article>
            <ClipboardCheck size={18} />
            <div>
              <strong>Preenchimento</strong>
              <span>
                {progress.requiredCompleted}/{progress.requiredTotal} obrigatorios · {progress.percent}%
              </span>
            </div>
          </article>
        ) : null}
        {comparison ? (
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>Comparacao</strong>
              <span>{comparison.comparison.divergence ? "Divergencia registrada" : "Sem divergencia registrada"}</span>
            </div>
          </article>
        ) : null}
      </div>
    </Card>
  );
}
