import { ClipboardCheck, Paperclip, ShieldCheck } from "lucide-react";

import { Card } from "../../../components/ui";
import type { ChecklistAttachment, ChecklistMarker, ChecklistRenderSchema, ChecklistRun, ChecklistRunAnswer } from "../types";
import { ChecklistRunStatusBadge } from "./ChecklistRunStatusBadge";

export function ChecklistRunSummary({
  schema,
  run,
  answers,
  attachments,
  markers,
}: {
  readonly schema: ChecklistRenderSchema;
  readonly run: ChecklistRun | null;
  readonly answers: readonly ChecklistRunAnswer[];
  readonly attachments: readonly ChecklistAttachment[];
  readonly markers: readonly ChecklistMarker[];
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
      </div>
    </Card>
  );
}
