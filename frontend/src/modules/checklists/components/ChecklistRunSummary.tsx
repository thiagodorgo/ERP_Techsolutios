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
    <Card title="Resumo da execução">
      <div className="checklist-runtime-summary">
        <article>
          <ClipboardCheck size={18} />
          <div>
            <strong>{schema.name}</strong>
            <span>
              {schema.type} · versão {schema.version}
            </span>
          </div>
        </article>
        <article>
          <ShieldCheck size={18} />
          <div>
            <strong>Status</strong>
            {run ? <ChecklistRunStatusBadge status={run.status} /> : <span>Preparando execução</span>}
          </div>
        </article>
        <article>
          <Paperclip size={18} />
          <div>
            <strong>Evidências</strong>
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
                {progress.requiredCompleted}/{progress.requiredTotal} obrigatórios · {progress.percent}%
              </span>
            </div>
          </article>
        ) : null}
        {comparison ? (
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>Comparação</strong>
              <span>{comparison.comparison.divergence ? "Divergência registrada" : "Sem divergência registrada"}</span>
            </div>
          </article>
        ) : null}
      </div>
    </Card>
  );
}
