import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { FieldOpsBroadcaster } from "../src/infra/broadcaster/field-ops.broadcaster.js";
import type { DomainEventEnvelope, DomainEventName } from "../src/infra/events/domain-event.types.js";
import { attachAuthenticatedActor } from "../src/modules/auth/index.js";
import { createFieldOpsSseRouter } from "../src/modules/field-ops/index.js";

// Fixed tenant / user IDs shared across tests
const T_A = randomUUID();
const T_B = randomUUID();
const U_MANAGER_A = randomUUID();
const U_OPERATOR_A = randomUUID(); // role=operator: field_dispatch:read + work_orders:read, NO field_location:read
const U_FINANCE_A = randomUUID();  // role=finance: NO field ops permissions

function authHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return { "x-tenant-id": tenantId, "x-user-id": userId, "x-role": role };
}

function makeEvent(name: DomainEventName, payload: Record<string, unknown>, tenantId: string): DomainEventEnvelope {
  return {
    id: randomUUID(),
    name,
    tenantId,
    actorId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload,
  };
}

// ---------------------------------------------------------------------------
// SSE stream reader helpers
// ---------------------------------------------------------------------------

type SseBlock =
  | { readonly kind: "event"; readonly type: string; readonly data: string }
  | { readonly kind: "comment"; readonly text: string };

async function readSseBlocks(
  body: ReadableStream<Uint8Array>,
  options: { maxBlocks: number; timeoutMs: number; includeComments?: boolean },
): Promise<SseBlock[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const blocks: SseBlock[] = [];
  let buffer = "";
  const deadline = Date.now() + options.timeoutMs;

  try {
    while (blocks.length < options.maxBlocks && Date.now() < deadline) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const timedOut = new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining));
      const chunk = await Promise.race([reader.read(), timedOut]);

      if (chunk === null || chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith(":")) {
          if (options.includeComments) {
            blocks.push({ kind: "comment", text: trimmed.slice(1).trim() });
          }
          continue;
        }

        let type = "message";
        let data = "";
        for (const line of trimmed.split("\n")) {
          if (line.startsWith("event: ")) type = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6);
        }
        blocks.push({ kind: "event", type, data });
      }
    }
  } finally {
    reader.releaseLock();
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

type SseApiContext = {
  readonly baseUrl: string;
  readonly broadcaster: FieldOpsBroadcaster;
};

async function withSseApi(
  options: { readonly heartbeatIntervalMs?: number },
  callback: (ctx: SseApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const broadcaster = new FieldOpsBroadcaster();
  const app = express();
  app.use(express.json());
  app.use("/api/v1", attachAuthenticatedActor(), createFieldOpsSseRouter({ broadcaster, ...options }));

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, broadcaster });
  } finally {
    await closeServer(server);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("SSE_01: 403 when no auth headers", async () => {
  await withSseApi({}, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`);

    assert.equal(response.status, 403);
  });
});

test("SSE_02: 403 when role has no field ops permissions", async () => {
  await withSseApi({}, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_FINANCE_A, "finance"),
    });

    assert.equal(response.status, 403);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "FORBIDDEN");
  });
});

test("SSE_03: 200 with correct SSE headers when manager connects", async () => {
  await withSseApi({}, async ({ baseUrl }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });

    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type")?.includes("text/event-stream"));
    assert.equal(response.headers.get("cache-control"), "no-cache");

    ac.abort();
  });
});

test("SSE_04: delivers field_dispatch.created to manager subscriber", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    const entityId = randomUUID();
    const event = makeEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: entityId, status: "assigned" }, T_A);

    // Small delay to ensure subscription is registered before publishing
    await sleep(20);
    broadcaster.publish(T_A, event);

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 1, timeoutMs: 1000 });
    ac.abort();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, "event");
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    assert.equal(block.type, "field_dispatch.created");
    const parsed = JSON.parse(block.data) as Record<string, unknown>;
    assert.equal(parsed.eventName, "field_dispatch.created");
    assert.equal(parsed.tenantId, T_A);
    const payload = parsed.payload as Record<string, unknown>;
    assert.equal(payload.entity_id, entityId);
  });
});

test("SSE_05: delivers field_location.updated to manager subscriber", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    const operatorId = randomUUID();
    const event = makeEvent("field_location.updated", { entity_type: "field_operator_location", operator_user_id: operatorId, source: "mobile" }, T_A);

    await sleep(20);
    broadcaster.publish(T_A, event);

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 1, timeoutMs: 1000 });
    ac.abort();

    assert.equal(blocks.length, 1);
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    assert.equal(block.type, "field_location.updated");
    const parsed = JSON.parse(block.data) as Record<string, unknown>;
    assert.equal(parsed.eventName, "field_location.updated");
    const payload = parsed.payload as Record<string, unknown>;
    assert.equal(payload.operator_user_id, operatorId);
  });
});

test("SSE_06: delivers work_order.status_changed to manager subscriber", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    const workOrderId = randomUUID();
    const event = makeEvent("work_order.status_changed", { entity_type: "work_order", entity_id: workOrderId, from_status: "open", to_status: "in_progress" }, T_A);

    await sleep(20);
    broadcaster.publish(T_A, event);

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 1, timeoutMs: 1000 });
    ac.abort();

    assert.equal(blocks.length, 1);
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    assert.equal(block.type, "work_order.status_changed");
    const parsed = JSON.parse(block.data) as Record<string, unknown>;
    const payload = parsed.payload as Record<string, unknown>;
    assert.equal(payload.entity_id, workOrderId);
    assert.equal(payload.from_status, "open");
    assert.equal(payload.to_status, "in_progress");
  });
});

test("SSE_07: strips latitude, longitude, lat, lng from field_location.updated payload", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    const operatorId = randomUUID();
    const event = makeEvent("field_location.updated", {
      entity_type: "field_operator_location",
      operator_user_id: operatorId,
      source: "mobile",
      latitude: -23.5505,
      longitude: -46.6333,
      lat: -23.5505,
      lng: -46.6333,
      accuracy: 10,
    }, T_A);

    await sleep(20);
    broadcaster.publish(T_A, event);

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 1, timeoutMs: 1000 });
    ac.abort();

    assert.equal(blocks.length, 1);
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    const parsed = JSON.parse(block.data) as Record<string, unknown>;
    const payload = parsed.payload as Record<string, unknown>;

    assert.ok(!("latitude" in payload), "latitude must be stripped");
    assert.ok(!("longitude" in payload), "longitude must be stripped");
    assert.ok(!("lat" in payload), "lat must be stripped");
    assert.ok(!("lng" in payload), "lng must be stripped");
    assert.equal(payload.operator_user_id, operatorId);
    assert.equal(payload.accuracy, 10);
  });
});

test("SSE_08: cross-tenant — tenant B subscriber does not receive tenant A events", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const acB = new AbortController();
    const responseB = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_B, U_MANAGER_A, "manager"),
      signal: acB.signal,
    });
    assert.equal(responseB.status, 200);

    await sleep(20);

    // Publish only to tenant A
    const eventA = makeEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: randomUUID() }, T_A);
    broadcaster.publish(T_A, eventA);

    // Also publish to tenant B to confirm the stream works, then assert order
    const entityB = randomUUID();
    const eventB = makeEvent("work_order.status_changed", { entity_type: "work_order", entity_id: entityB, from_status: "open", to_status: "closed" }, T_B);
    broadcaster.publish(T_B, eventB);

    // Tenant B stream should only receive the tenant B event
    const blocks = await readSseBlocks(responseB.body!, { maxBlocks: 2, timeoutMs: 500 });
    acB.abort();

    assert.equal(blocks.length, 1, "Tenant B subscriber must receive exactly 1 event (its own), not tenant A event");
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    const parsed = JSON.parse(block.data) as Record<string, unknown>;
    assert.equal(parsed.tenantId, T_B);
    const payload = parsed.payload as Record<string, unknown>;
    assert.equal(payload.entity_id, entityB);
  });
});

test("SSE_09: RBAC filter — operator receives field_dispatch event but not field_location event", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    // operator role: field_dispatch:read + work_orders:read, NO field_location:read
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_OPERATOR_A, "operator"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    await sleep(20);

    // Publish location first (should be filtered), then dispatch (should arrive)
    broadcaster.publish(T_A, makeEvent("field_location.updated", { entity_type: "field_operator_location", operator_user_id: randomUUID(), source: "mobile" }, T_A));
    broadcaster.publish(T_A, makeEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: randomUUID(), status: "assigned" }, T_A));

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 2, timeoutMs: 500 });
    ac.abort();

    // Only dispatch event should arrive; location was filtered
    assert.equal(blocks.length, 1, "operator should receive only field_dispatch event, not location event");
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    assert.equal(block.type, "field_dispatch.created");
  });
});

test("SSE_10: RBAC filter — operator receives work_order event but not field_location event", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_OPERATOR_A, "operator"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    await sleep(20);

    broadcaster.publish(T_A, makeEvent("field_location.updated", { entity_type: "field_operator_location", operator_user_id: randomUUID(), source: "mobile" }, T_A));
    broadcaster.publish(T_A, makeEvent("work_order.status_changed", { entity_type: "work_order", entity_id: randomUUID(), from_status: "open", to_status: "in_progress" }, T_A));

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 2, timeoutMs: 500 });
    ac.abort();

    assert.equal(blocks.length, 1, "operator should receive only work_order event, not location event");
    const block = blocks[0] as { kind: "event"; type: string; data: string };
    assert.equal(block.type, "work_order.status_changed");
  });
});

test("SSE_11: multiple sequential events delivered to same subscriber", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    await sleep(20);

    const id1 = randomUUID();
    const id2 = randomUUID();
    const id3 = randomUUID();

    broadcaster.publish(T_A, makeEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: id1 }, T_A));
    broadcaster.publish(T_A, makeEvent("field_dispatch.status_changed", { entity_type: "field_dispatch", entity_id: id2, from_status: "assigned", to_status: "on_route" }, T_A));
    broadcaster.publish(T_A, makeEvent("work_order.status_changed", { entity_type: "work_order", entity_id: id3, from_status: "open", to_status: "in_progress" }, T_A));

    const blocks = await readSseBlocks(response.body!, { maxBlocks: 3, timeoutMs: 1000 });
    ac.abort();

    assert.equal(blocks.length, 3);
    assert.equal((blocks[0] as { kind: "event"; type: string }).type, "field_dispatch.created");
    assert.equal((blocks[1] as { kind: "event"; type: string }).type, "field_dispatch.status_changed");
    assert.equal((blocks[2] as { kind: "event"; type: string }).type, "work_order.status_changed");

    const parsed0 = JSON.parse((blocks[0] as { data: string }).data) as Record<string, unknown>;
    const parsed1 = JSON.parse((blocks[1] as { data: string }).data) as Record<string, unknown>;
    const parsed2 = JSON.parse((blocks[2] as { data: string }).data) as Record<string, unknown>;

    assert.equal((parsed0.payload as Record<string, unknown>).entity_id, id1);
    assert.equal((parsed1.payload as Record<string, unknown>).entity_id, id2);
    assert.equal((parsed2.payload as Record<string, unknown>).entity_id, id3);
  });
});

test("SSE_12: heartbeat comment is sent at configured interval", async () => {
  await withSseApi({ heartbeatIntervalMs: 50 }, async ({ baseUrl }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    const blocks = await readSseBlocks(response.body!, {
      maxBlocks: 1,
      timeoutMs: 500,
      includeComments: true,
    });
    ac.abort();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, "comment");
    assert.equal((blocks[0] as { kind: "comment"; text: string }).text, "heartbeat");
  });
});

test("SSE_13: two concurrent subscribers on same tenant both receive the same event", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac1 = new AbortController();
    const ac2 = new AbortController();

    const [response1, response2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/operations/events/stream`, { headers: authHeaders(T_A, U_MANAGER_A, "manager"), signal: ac1.signal }),
      fetch(`${baseUrl}/api/v1/operations/events/stream`, { headers: authHeaders(T_A, U_OPERATOR_A, "operator"), signal: ac2.signal }),
    ]);

    assert.equal(response1.status, 200);
    assert.equal(response2.status, 200);

    await sleep(20);

    const entityId = randomUUID();
    broadcaster.publish(T_A, makeEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: entityId, status: "assigned" }, T_A));

    const [blocks1, blocks2] = await Promise.all([
      readSseBlocks(response1.body!, { maxBlocks: 1, timeoutMs: 1000 }),
      readSseBlocks(response2.body!, { maxBlocks: 1, timeoutMs: 1000 }),
    ]);

    ac1.abort();
    ac2.abort();

    assert.equal(blocks1.length, 1);
    assert.equal(blocks2.length, 1);
    assert.equal((blocks1[0] as { kind: "event"; type: string }).type, "field_dispatch.created");
    assert.equal((blocks2[0] as { kind: "event"; type: string }).type, "field_dispatch.created");

    const parsed1 = JSON.parse((blocks1[0] as { data: string }).data) as Record<string, unknown>;
    const parsed2 = JSON.parse((blocks2[0] as { data: string }).data) as Record<string, unknown>;
    assert.equal((parsed1.payload as Record<string, unknown>).entity_id, entityId);
    assert.equal((parsed2.payload as Record<string, unknown>).entity_id, entityId);
  });
});

test("SSE_14: subscription is cleaned up after client disconnects", async () => {
  await withSseApi({}, async ({ baseUrl, broadcaster }) => {
    const ac = new AbortController();
    const response = await fetch(`${baseUrl}/api/v1/operations/events/stream`, {
      headers: authHeaders(T_A, U_MANAGER_A, "manager"),
      signal: ac.signal,
    });
    assert.equal(response.status, 200);

    await sleep(20);
    assert.equal(broadcaster.listenerCount(T_A), 1, "one listener after connect");

    // Abort the client connection
    ac.abort();

    // Wait for the server-side "close" event to fire and clean up
    await sleep(100);

    assert.equal(broadcaster.listenerCount(T_A), 0, "listener must be removed after client disconnects");
  });
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBaseUrl(server: Server): Promise<string> {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) { reject(error); return; }
      resolve();
    });
  });
}
