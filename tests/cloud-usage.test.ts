import assert from "node:assert/strict";
import test from "node:test";

import {
  CloudUsageService,
  InMemoryCloudUsageRepository,
  sanitizeCloudUsageMetadata,
} from "../src/modules/cloud-usage/index.js";

test("recordUsageEvent cria evento com unit bytes", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());
  const event = await service.recordUsageEvent({
    tenantId: "tenant-a",
    sourceType: "checklist_attachment",
    sourceId: "att-1",
    metricKey: "checklist_attachment.uploaded.bytes",
    quantity: 2048,
    unit: "bytes",
    idempotencyKey: "att-1:uploaded.bytes",
    metadata: {
      mimeType: "image/jpeg",
    },
  });

  assert.equal(event.tenantId, "tenant-a");
  assert.equal(event.metricKey, "checklist_attachment.uploaded.bytes");
  assert.equal(event.quantity, 2048);
  assert.equal(event.unit, "bytes");
});

test("idempotencyKey evita duplicidade", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());
  const input = {
    tenantId: "tenant-a",
    sourceType: "notification",
    sourceId: "notif-1",
    metricKey: "notification.created" as const,
    quantity: 1,
    unit: "count" as const,
    idempotencyKey: "notif-1:notification.created",
  };

  const first = await service.recordUsageEvent(input);
  const second = await service.recordUsageEvent(input);
  const summary = await service.getTenantUsageSummary("tenant-a");

  assert.equal(first.id, second.id);
  assert.deepEqual(summary.metrics, [
    {
      metricKey: "notification.created",
      quantity: 1,
      unit: "count",
      sourceType: "notification",
    },
  ]);
});

test("metadata sensivel e sanitizada", () => {
  const metadata = sanitizeCloudUsageMetadata({
    Authorization: "Bearer token",
    storageKey: "tenant/private/file.pdf",
    nested: {
      refreshToken: "secret",
      safe: "ok",
    },
  });

  assert.deepEqual(metadata, {
    Authorization: "[REDACTED]",
    storageKey: "[REDACTED]",
    nested: {
      refreshToken: "[REDACTED]",
      safe: "ok",
    },
  });
});

test("quantity invalida falha", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());

  await assert.rejects(
    () =>
      service.recordUsageEvent({
        tenantId: "tenant-a",
        sourceType: "api",
        metricKey: "api_request.count",
        quantity: -1,
        unit: "count",
      }),
    (error: { reason?: string }) => error.reason === "quantity_invalid",
  );
});

test("aggregateDailyUsage soma por tenant, metrica, unit e sourceType", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());
  const occurredAt = new Date("2026-06-08T12:00:00.000Z");

  await service.recordManyUsageEvents([
    {
      tenantId: "tenant-a",
      sourceType: "checklist_attachment",
      metricKey: "checklist_attachment.downloaded.bytes",
      quantity: 100,
      unit: "bytes",
      occurredAt,
    },
    {
      tenantId: "tenant-a",
      sourceType: "checklist_attachment",
      metricKey: "checklist_attachment.downloaded.bytes",
      quantity: 50,
      unit: "bytes",
      occurredAt,
    },
    {
      tenantId: "tenant-b",
      sourceType: "checklist_attachment",
      metricKey: "checklist_attachment.downloaded.bytes",
      quantity: 25,
      unit: "bytes",
      occurredAt,
    },
  ]);

  const aggregates = await service.aggregateDailyUsage(occurredAt);

  assert.equal(aggregates.length, 2);
  assert.equal(aggregates.find((item) => item.tenantId === "tenant-a")?.quantity, 150);
  assert.equal(aggregates.find((item) => item.tenantId === "tenant-b")?.quantity, 25);
});

test("eventos cross-tenant permanecem isolados no summary tenant", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());

  await service.recordUsageEvent({
    tenantId: "tenant-a",
    sourceType: "checklist_run",
    metricKey: "checklist_run.completed",
    quantity: 1,
    unit: "count",
  });
  await service.recordUsageEvent({
    tenantId: "tenant-b",
    sourceType: "checklist_run",
    metricKey: "checklist_run.completed",
    quantity: 9,
    unit: "count",
  });

  const summary = await service.getTenantUsageSummary("tenant-a");

  assert.equal(summary.tenantId, "tenant-a");
  assert.equal(summary.metrics[0]?.quantity, 1);
});

test("metrica count usa unit count", async () => {
  const service = new CloudUsageService(new InMemoryCloudUsageRepository());
  const event = await service.recordUsageEvent({
    tenantId: "tenant-a",
    sourceType: "job",
    metricKey: "job.executed",
    quantity: 1,
    unit: "count",
  });

  assert.equal(event.unit, "count");
});
