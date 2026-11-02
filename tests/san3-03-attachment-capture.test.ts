import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appendCloudUsageInMemory,
  buildAttachmentDownloadUsageEvents,
  buildAttachmentUploadUsageEvents,
  createMemoryCloudUsageService,
  drainCloudUsageBestEffortForTests,
  recordCloudUsageForDomainEvent,
  resetCloudUsageRuntimeForTests,
} from "../src/modules/cloud-usage/index.js";

test("T-UP-1 · upload gera count, bytes e put com chave da entidade", () => {
  const attachment = source(2048);
  const events = buildAttachmentUploadUsageEvents(attachment);
  assert.deepEqual(events.map((event) => event.metricKey), [
    "checklist_attachment.uploaded.count",
    "s3_put_requests",
    "checklist_attachment.uploaded.bytes",
  ]);
  assert.deepEqual(events.map((event) => event.quantity), [1, 1, 2048]);
  assert.ok(events.every((event) => event.idempotencyKey?.includes(attachment.id)));
});

test("T-UP-2 · tamanho ausente não fabrica bytes", () => {
  const events = buildAttachmentUploadUsageEvents(source());
  assert.deepEqual(events.map((event) => event.metricKey), [
    "checklist_attachment.uploaded.count",
    "s3_put_requests",
  ]);
});

test("T-UP-3 · replay do mesmo anexo não duplica unidade", async () => {
  resetCloudUsageRuntimeForTests();
  const attachment = source(512);
  const events = buildAttachmentUploadUsageEvents(attachment);
  await appendCloudUsageInMemory(events);
  await appendCloudUsageInMemory(buildAttachmentUploadUsageEvents(attachment));
  const summary = await createMemoryCloudUsageService().getTenantUsageSummary(attachment.tenantId);
  assert.deepEqual(summary.metrics.map((metric) => metric.quantity).sort((a, b) => a - b), [1, 1, 512]);
  resetCloudUsageRuntimeForTests();
});

test("T-UP-4 · evento de domínio de upload não cria segunda medição", async () => {
  resetCloudUsageRuntimeForTests();
  const attachment = source(256);
  recordCloudUsageForDomainEvent({
    id: randomUUID(),
    name: "checklist_run.attachment_uploaded",
    occurredAt: new Date().toISOString(),
    tenantId: attachment.tenantId,
    payload: { runId: attachment.runId, attachmentId: attachment.id, sizeBytes: attachment.sizeBytes },
  });
  await drainCloudUsageBestEffortForTests();
  const summary = await createMemoryCloudUsageService().getTenantUsageSummary(attachment.tenantId);
  assert.deepEqual(summary.metrics, []);
  resetCloudUsageRuntimeForTests();
});

test("T-DOWN-1 · concessão gera count, bytes e GET", () => {
  const attachment = source(1024);
  const events = buildAttachmentDownloadUsageEvents({ ...attachment, grantId: "grant-1" });
  assert.deepEqual(events.map((event) => event.metricKey), [
    "checklist_attachment.downloaded.count",
    "s3_get_requests",
    "checklist_attachment.downloaded.bytes",
  ]);
});

test("T-DOWN-2 · tamanho ausente não fabrica bytes de download", () => {
  const events = buildAttachmentDownloadUsageEvents({ ...source(), grantId: "grant-2" });
  assert.equal(events.length, 2);
});

test("T-DOWN-3 · replay da mesma concessão não duplica", async () => {
  resetCloudUsageRuntimeForTests();
  const attachment = { ...source(128), grantId: "grant-stable" };
  await appendCloudUsageInMemory(buildAttachmentDownloadUsageEvents(attachment));
  await appendCloudUsageInMemory(buildAttachmentDownloadUsageEvents(attachment));
  const summary = await createMemoryCloudUsageService().getTenantUsageSummary(attachment.tenantId);
  assert.deepEqual(summary.metrics.map((metric) => metric.quantity).sort((a, b) => a - b), [1, 1, 128]);
  resetCloudUsageRuntimeForTests();
});

test("T-DOWN-4 · evento de domínio de download não cria segunda medição", async () => {
  resetCloudUsageRuntimeForTests();
  const attachment = source(256);
  recordCloudUsageForDomainEvent({
    id: randomUUID(),
    name: "checklist_run.attachment_downloaded",
    occurredAt: new Date().toISOString(),
    tenantId: attachment.tenantId,
    payload: { runId: attachment.runId, attachmentId: attachment.id, sizeBytes: attachment.sizeBytes },
  });
  await drainCloudUsageBestEffortForTests();
  assert.deepEqual((await createMemoryCloudUsageService().getTenantUsageSummary(attachment.tenantId)).metrics, []);
  const sourceCode = await readFile(new URL("../src/modules/checklists/checklist.service.ts", import.meta.url), "utf8");
  assert.match(sourceCode, /await this\.repository\.recordAttachmentDownload\(/, "a concessão aguarda a captura");
  resetCloudUsageRuntimeForTests();
});

function source(sizeBytes?: number) {
  return {
    id: randomUUID(),
    tenantId: randomUUID(),
    runId: randomUUID(),
    sizeBytes,
    createdAt: new Date(),
  };
}
