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
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.completed",
      quantity: 1,
      unit: "count",
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
