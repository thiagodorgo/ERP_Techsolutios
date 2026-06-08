import assert from "node:assert/strict";
import test from "node:test";

import {
  EnterpriseAuditLogService,
  sanitizeAuditMetadata,
  type AuditLogWriter,
} from "../src/modules/core-saas/audit/audit-log.service.js";

test("enterprise audit service sanitizes metadata and publishes audit_log.created", async () => {
  const writes: Parameters<AuditLogWriter["create"]>[0][] = [];
  const publishedEvents: string[] = [];
  const writer: AuditLogWriter = {
    async create(data) {
      writes.push(data);

      return {
        id: "11111111-1111-4111-8111-111111111111",
        tenant_id: data.tenant_id,
        actor_user_id: data.actor_user_id ?? null,
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id ?? null,
        metadata: data.metadata ?? null,
        created_at: new Date("2026-06-08T12:00:00.000Z"),
      };
    },
  };
  const service = new EnterpriseAuditLogService(writer, {
    publishDomainEvent: async (name, payload, context) => {
      publishedEvents.push(`${name}:${context.tenantId}:${payload.auditLogId}`);

      return {
        event: {
          id: "evt_1",
          name,
          payload,
          tenantId: context.tenantId,
          actorId: context.actorId,
          correlationId: context.correlationId ?? "corr_1",
          occurredAt: "2026-06-08T12:00:00.000Z",
        },
        published: true,
      };
    },
  });

  const audit = await service.record({
    tenantId: "tenant_a",
    actorId: "user_a",
    actorEmail: "admin@example.com",
    action: "auth.login.success",
    resourceType: "auth_session",
    resourceId: "session_a",
    correlationId: "corr_123",
    requestId: "req_123",
    ipAddress: "127.0.0.1",
    userAgent: "node:test",
    metadata: {
      accessToken: "must-not-leak",
      nested: {
        refresh_token: "must-not-leak",
      },
      safe: "value",
    },
  });

  assert.equal(audit.action, "auth.login.success");
  assert.equal(audit.correlationId, "corr_123");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].tenant_id, "tenant_a");
  assert.equal(writes[0].actor_user_id, "user_a");
  assert.equal(writes[0].entity, "auth_session");
  assert.equal(writes[0].entity_id, "session_a");

  const metadata = writes[0].metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.severity, "info");
  assert.equal(metadata.correlationId, "corr_123");
  assert.equal(metadata.accessToken, "[REDACTED]");
  assert.equal((metadata.nested as Record<string, unknown>).refresh_token, "[REDACTED]");
  assert.equal(JSON.stringify(metadata).includes("must-not-leak"), false);
  assert.deepEqual(publishedEvents, [
    "audit_log.created:tenant_a:11111111-1111-4111-8111-111111111111",
  ]);
});

test("sanitizeAuditMetadata redacts sensitive keys recursively", () => {
  const metadata = sanitizeAuditMetadata({
    password: "secret",
    authorization: "Bearer secret",
    headers: {
      Authorization: "Bearer nested",
      "x-safe": "ok",
    },
    array: [
      {
        refreshToken: "secret",
      },
    ],
  });

  assert.equal(metadata.password, "[REDACTED]");
  assert.equal(metadata.authorization, "[REDACTED]");
  assert.equal((metadata.headers as Record<string, unknown>).Authorization, "[REDACTED]");
  assert.equal((metadata.headers as Record<string, unknown>)["x-safe"], "ok");
  assert.equal(((metadata.array as Record<string, unknown>[])[0]).refreshToken, "[REDACTED]");
  assert.equal(JSON.stringify(metadata).includes("secret"), false);
});
