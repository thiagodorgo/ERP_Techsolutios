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

  if (event.name === "checklist_run.completed") {
    // Junta PR-03 (ALTA): a CONCLUSÃO é metric-key faturada e entra na base de rateio
    // (`cloud-cost-allocation.rules` → basisMetricKeys). Uma vistoria REABERTA é a correção de um
    // trabalho já cobrado, não trabalho novo — contá-la de novo dobraria a base e cobraria o
    // cliente pelo conserto. A reabertura é registrada com quantidade ZERO: some na trilha (o
    // auditor vê que houve), sem somar na conta.
    const isReopenedRun = event.payload.isReopenedRun === true;

    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.completed",
      quantity: isReopenedRun ? 0 : 1,
      unit: "count",
      ...(isReopenedRun ? { idempotencyKey: `${event.id}:checklist_run.completed:reopened` } : {}),
    });
  }

  if (event.name === "checklist_run.created") {
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.created",
      quantity: 1,
      unit: "count",
    });
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_runs_count",
      quantity: 1,
      unit: "count",
      idempotencyKey: `${event.id}:checklist_runs_count`,
    });
  }

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
