import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { DomainEventEnvelope } from "../src/infra/events/domain-event.types.js";
import { publishDomainEvent } from "../src/infra/events/domain-event.publisher.js";
import type { JobQueue } from "../src/infra/jobs/job.queue.js";
import type { JobEnvelope, JobName, JobPayload } from "../src/infra/jobs/job.types.js";
import { createFieldOpsEventFanoutJobHandler } from "../src/modules/field-dispatch/field-ops-event-fanout.jobs.js";
import {
  fieldOpsRealtimeBroker,
  type FieldOpsRealtimeEvent,
} from "../src/modules/field-ops-realtime/index.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("field ops SSE endpoint requires field_location:read", async () => {
  await withFieldOpsRealtimeApi(async ({ baseUrl, seed }) => {
    const forbidden = await fetch(`${baseUrl}/api/v1/operations/field-events/stream`, {
      headers: {
        ...authHeaders(seed.tenantA, seed.viewerA, "manager"),
        "x-permissions": "work_orders:read",
      },
    });

    assert.equal(forbidden.status, 403);
    assert.match(await forbidden.text(), /field_location:read|permission_required/);
  });
});

test("field ops SSE streams only tenant-scoped sanitized events", async () => {
  await withFieldOpsRealtimeApi(async ({ baseUrl, seed }) => {
    const streamAController = new AbortController();
    const streamBController = new AbortController();
    const streamA = await openSseStream(baseUrl, seed.tenantA, seed.managerA, streamAController);
    const streamB = await openSseStream(baseUrl, seed.tenantB, seed.managerB, streamBController);

    assert.equal(streamA.status, 200);
    assert.equal(streamB.status, 200);
    assert.match(streamA.headers.get("content-type") ?? "", /text\/event-stream/);

    await waitFor(() => fieldOpsRealtimeBroker.subscriberCount(seed.tenantA.id) === 1);
    await waitFor(() => fieldOpsRealtimeBroker.subscriberCount(seed.tenantB.id) === 1);

    const tenantAEvent = readNextFieldOpsEvent(streamA).catch(() => null);
    const tenantBEvent = readNextFieldOpsEvent(streamB).catch(() => null);
    const { queue } = makeCapturingQueue();

    await publishDomainEvent(
      "field_location.updated",
      {
        entity_type: "field_operator_location",
        entity_id: randomUUID(),
        operator_user_id: seed.managerA.id,
        source: "mobile",
        latitude: -23.55,
        longitude: -46.63,
        nested: {
          lat: -23.55,
          lng: -46.63,
        },
      },
      { tenantId: seed.tenantA.id, actorId: seed.managerA.id },
      { queue },
    );

    const eventA = await tenantAEvent;
    const eventB = await Promise.race([tenantBEvent, delay(250).then(() => null)]);

    streamAController.abort();
    streamBController.abort();

    assert.ok(eventA);
    assert.equal(eventA.tenantId, seed.tenantA.id);
    assert.equal(eventA.name, "field_location.updated");
    assert.ok(!("latitude" in eventA.payload));
    assert.ok(!("longitude" in eventA.payload));
    assert.ok(!("lat" in ((eventA.payload.nested as Record<string, unknown> | undefined) ?? {})));
    assert.ok(!("lng" in ((eventA.payload.nested as Record<string, unknown> | undefined) ?? {})));
    assert.equal(eventB, null);
  });
});

test("field ops fanout job publishes sanitized events once", async () => {
  fieldOpsRealtimeBroker.resetForTests();
  const tenantId = randomUUID();
  const received: FieldOpsRealtimeEvent[] = [];
  const unsubscribe = fieldOpsRealtimeBroker.subscribe(tenantId, (event) => received.push(event));
  const handler = createFieldOpsEventFanoutJobHandler();
  const event: DomainEventEnvelope = {
    id: randomUUID(),
    name: "field_dispatch.created",
    tenantId,
    actorId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload: {
      entity_type: "field_dispatch",
      entity_id: randomUUID(),
      work_order_id: randomUUID(),
      operator_user_id: randomUUID(),
      latitude: -23.55,
    },
  };

  await handler({ event }, {} as JobEnvelope);
  await handler({ event }, {} as JobEnvelope);
  unsubscribe();

  assert.equal(received.length, 1);
  assert.equal(received[0]?.id, event.id);
  assert.ok(!("latitude" in (received[0]?.payload ?? {})));
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly viewerA: User;
};

type FieldOpsRealtimeApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFieldOpsRealtimeApi(callback: (context: FieldOpsRealtimeApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  fieldOpsRealtimeBroker.resetForTests();

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    fieldOpsRealtimeBroker.resetForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Realtime A",
    modules: ["dashboard", "work_orders", "field_operations"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Realtime B",
    modules: ["dashboard", "work_orders", "field_operations"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Realtime Manager A",
    email: "field-realtime-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Realtime Manager B",
    email: "field-realtime-manager-b@example.com",
    roles: ["manager"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Realtime Viewer A",
    email: "field-realtime-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, managerA, managerB, viewerA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

function openSseStream(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  controller: AbortController,
): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/operations/field-events/stream`, {
    headers: authHeaders(tenant, user, "manager"),
    signal: controller.signal,
  });
}

async function readNextFieldOpsEvent(response: Response): Promise<FieldOpsRealtimeEvent | null> {
  const reader = response.body?.getReader();
  assert.ok(reader);

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) return null;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split(/\r?\n\r?\n/);
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const parsed = parseSseMessage(message);
      if (parsed.eventName === "field_ops_event" && parsed.data) {
        return JSON.parse(parsed.data) as FieldOpsRealtimeEvent;
      }
    }
  }
}

function parseSseMessage(message: string): { eventName: string; data: string } {
  let eventName = "message";
  const data: string[] = [];

  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  return { eventName, data: data.join("\n") };
}

function makeCapturingQueue(): { queue: JobQueue } {
  const queue = {
    async enqueue(name: JobName, payload: JobPayload, options: { tenantId?: string; userId?: string; correlationId?: string } = {}): Promise<JobEnvelope> {
      return {
        id: randomUUID(),
        name,
        payload,
        status: "queued",
        attempts: 0,
        maxAttempts: 3,
        backoffMs: 1000,
        tenantId: options.tenantId,
        userId: options.userId,
        correlationId: options.correlationId ?? randomUUID(),
        runAfter: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  } as unknown as JobQueue;

  return { queue };
}

async function waitFor(condition: () => boolean, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await delay(10);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
