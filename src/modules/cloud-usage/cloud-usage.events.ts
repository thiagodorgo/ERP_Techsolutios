import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import { recordCloudUsageBestEffort } from "./cloud-usage.service.js";

export function recordCloudUsageForDomainEvent(event: DomainEventEnvelope): void {
  if (!event.tenantId) return;

  const base = {
    tenantId: event.tenantId,
    occurredAt: new Date(event.occurredAt),
    sourceId: readString(event.payload.runId) ?? event.id,
    idempotencyKey: `${event.id}:cloud-usage`,
    metadata: {
      eventId: event.id,
      eventName: event.name,
      correlationId: event.correlationId,
      actorId: event.actorId,
    },
  };

  // B-O6R-06 (Ω6R-DIN-005) — OS RAMOS `checklist_run.created` E `checklist_run.completed` SAÍRAM DAQUI.
  //
  // Eles gravavam a unidade FATURADA da vistoria por este caminho: pós-commit da run, fire-and-forget,
  // com `.catch(warn)` engolindo a falha, e chave de idempotência derivada do `event.id`
  // (`randomUUID()` a cada emissão). Uma falha entre o commit e a medição perdia a unidade para
  // sempre — e o replay da `client_run_key` devolve `created:false`, então o serviço nem republicava.
  //
  // Agora as duas nascem DENTRO da transação que insere/conclui a run, com chave derivada da RUN
  // (`cloud-usage.capture.ts` → `appendChecklistRunUsageInTx`, chamado por
  // `checklist-prisma.repository.ts`). Restaurar qualquer um dos dois ramos aqui gravaria uma SEGUNDA
  // linha por vistoria (chave por emissão não colide com a chave estável) e DOBRARIA a base de rateio
  // `checklists` — é a mutação M-6, e o censo `tests/o6r06-billing-census.test.ts` (C1) a mata.

  if (event.name === "checklist_run.attachment_uploaded") {
    const sizeBytes = readNumber(event.payload.sizeBytes);
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_attachment",
      sourceId: readString(event.payload.attachmentId) ?? event.id,
      metricKey: "checklist_attachment.uploaded.count",
      quantity: 1,
      unit: "count",
    });
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_attachment",
      sourceId: readString(event.payload.attachmentId) ?? event.id,
      metricKey: "s3_put_requests",
      quantity: 1,
      unit: "count",
      idempotencyKey: `${event.id}:s3_put_requests`,
    });
    if (sizeBytes !== undefined) {
      recordCloudUsageBestEffort({
        ...base,
        sourceType: "checklist_attachment",
        sourceId: readString(event.payload.attachmentId) ?? event.id,
        metricKey: "checklist_attachment.uploaded.bytes",
        quantity: sizeBytes,
        unit: "bytes",
        idempotencyKey: `${event.id}:checklist_attachment.uploaded.bytes`,
      });
    }
  }

  if (event.name === "checklist_run.attachment_downloaded") {
    const sizeBytes = readNumber(event.payload.sizeBytes);
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_attachment",
      sourceId: readString(event.payload.attachmentId) ?? event.id,
      metricKey: "checklist_attachment.downloaded.count",
      quantity: 1,
      unit: "count",
    });
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_attachment",
      sourceId: readString(event.payload.attachmentId) ?? event.id,
      metricKey: "s3_get_requests",
      quantity: 1,
      unit: "count",
      idempotencyKey: `${event.id}:s3_get_requests`,
    });
    if (sizeBytes !== undefined) {
      recordCloudUsageBestEffort({
        ...base,
        sourceType: "checklist_attachment",
        sourceId: readString(event.payload.attachmentId) ?? event.id,
        metricKey: "checklist_attachment.downloaded.bytes",
        quantity: sizeBytes,
        unit: "bytes",
        idempotencyKey: `${event.id}:checklist_attachment.downloaded.bytes`,
      });
    }
  }

  if (event.name === "checklist_run.divergence_reported") {
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.divergence_reported",
      quantity: 1,
      unit: "count",
    });
  }

  if (event.name === "checklist_run.acknowledgement_created") {
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.acknowledgement_created",
      quantity: 1,
      unit: "count",
    });
  }
}

function readString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}
