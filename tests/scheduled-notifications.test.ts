import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { NotificationRecipientCandidate } from "../src/modules/notifications/notification.types.js";
import type { ScheduledNotificationService } from "../src/modules/notifications/scheduled-notification.service.js";
import type {
  InMemoryScheduledNotificationRepository,
} from "../src/modules/notifications/scheduled-notification.repository.js";

// Ω4C PR-04 — motor de notificações agendáveis. CRUD da definição (201), disparo INLINE imediato (worker OFF),
// idempotência do disparo (RN-NOTIF-01), visibilidade private/public/custom (RN-NOTIF-02), fuso de negócio
// (RN-NOTIF-03), remind_before/lembrete (RN-NOTIF-04), soft-cancel para-futuras (RN-NOTIF-09), 404 cross-tenant/
// cross-criador, §2.8 (DTO sem tenant_id/client_action_id), RBAC (notifications:create — gestão/operação).

const SECRET_TOKEN = "sk_live_scheduled_must_not_leak";

test("POST /notifications/scheduled cria a definição (201) — §2.8: DTO sem tenant_id/client_action_id/segredo", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, randomUUID(), "manager"),
      body: {
        title: "Vistoria agendada",
        message: "Lembrar de vistoriar o guincho.",
        notify_at: "2999-01-10T09:00",
        visibility: "private",
        client_action_id: `cai-${randomUUID()}`,
        source_type: "maintenance_item",
        source_id: randomUUID(),
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.visibility, "private");
    assert.equal(created.body.data.status, "pending");
    assert.equal(created.body.data.sourceType, "maintenance_item");
    assert.equal(created.body.data.remindBeforeMinutes, null);
    assert.equal(created.body.data.reminderAt, null);

    const serialized = JSON.stringify(created.body);
    assert.equal(serialized.includes("tenant_id"), false);
    assert.equal(serialized.includes("tenantId"), false);
    assert.equal(serialized.includes("client_action_id"), false);
    assert.equal(serialized.includes("clientActionId"), false);
    assert.equal(serialized.includes(SECRET_TOKEN), false);
  });
});

test("[NOTIF-03] notify_at naïve é ancorado ao fuso de negócio (America/Sao_Paulo, UTC-3)", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, randomUUID(), "manager"),
      body: { title: "T", message: "M", notify_at: "2027-01-15T10:30", visibility: "private" },
    });
    assert.equal(created.status, 201);
    // 10:30 BR-local (−03:00) → 13:30 UTC.
    assert.equal(created.body.data.notifyAt, "2027-01-15T13:30:00.000Z");
    assert.equal(created.body.data.status, "pending");
  });
});

test("dispara INLINE quando notify_at<=now (worker OFF) → cai no inbox do criador; status fired", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const creator = randomUUID();
    const past = new Date(Date.now() - 60_000).toISOString();
    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, creator, "manager"),
      body: { title: "Imediata", message: "Agora", notify_at: past, visibility: "private" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "fired");
    assert.notEqual(created.body.data.firedAt, null);

    const inbox = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, creator, "manager") });
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.data.length, 1);
    assert.equal(inbox.body.data[0].type, "scheduled.notification");
    assert.equal(inbox.body.data[0].title, "Imediata");
  });
});

test("[NOTIF-02] PRIVATE — só o criador recebe; outro usuário do tenant não", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const creator = randomUUID();
    const other = randomUUID();
    const past = new Date(Date.now() - 60_000).toISOString();

    await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, creator, "manager"),
      body: { title: "Privada", message: "Só eu", notify_at: past, visibility: "private" },
    });

    const creatorInbox = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, creator, "manager") });
    const otherInbox = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, other, "manager") });
    assert.equal(creatorInbox.body.data.length, 1);
    assert.equal(otherInbox.body.data.length, 0);
  });
});

test("[NOTIF-02] PUBLIC — todos os ATIVOS do tenant recebem; inativo não", async () => {
  await withScheduledApi(async ({ baseUrl, notificationRepo }) => {
    const tenant = randomUUID();
    const u1 = randomUUID();
    const u2 = randomUUID();
    const u3 = randomUUID();
    const inactive = randomUUID();
    notificationRepo.setRecipientCandidatesForTests(tenant, [
      candidate(u1),
      candidate(u2),
      candidate(u3),
      candidate(inactive, "inactive"),
    ]);
    const past = new Date(Date.now() - 60_000).toISOString();

    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, randomUUID(), "manager"),
      body: { title: "Pública", message: "Todos", notify_at: past, visibility: "public" },
    });
    assert.equal(created.status, 201);

    for (const userId of [u1, u2, u3]) {
      const inbox = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, userId, "manager") });
      assert.equal(inbox.body.data.length, 1, `active user ${userId} receives the public notification`);
    }
    const inactiveInbox = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, inactive, "manager") });
    assert.equal(inactiveInbox.body.data.length, 0, "inactive user must NOT receive");
  });
});

test("[NOTIF-02] CUSTOM — só recipients ∩ ativos; stale/não-alvo descartado", async () => {
  await withScheduledApi(async ({ baseUrl, notificationRepo }) => {
    const tenant = randomUUID();
    const u1 = randomUUID();
    const u2 = randomUUID();
    const u3 = randomUUID();
    const stale = randomUUID(); // uuid válido, mas não é candidato ativo → descartado no disparo
    notificationRepo.setRecipientCandidatesForTests(tenant, [candidate(u1), candidate(u2), candidate(u3)]);
    const past = new Date(Date.now() - 60_000).toISOString();

    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, randomUUID(), "manager"),
      body: { title: "Personalizada", message: "Alguns", notify_at: past, visibility: "custom", custom_recipient_ids: [u1, u3, stale] },
    });
    assert.equal(created.status, 201);

    const inbox1 = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, u1, "manager") });
    const inbox2 = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, u2, "manager") });
    const inbox3 = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, u3, "manager") });
    const inboxStale = await requestJson(baseUrl, "/api/v1/notifications", { headers: authHeaders(tenant, stale, "manager") });
    assert.equal(inbox1.body.data.length, 1);
    assert.equal(inbox2.body.data.length, 0, "non-target active user does not receive");
    assert.equal(inbox3.body.data.length, 1);
    assert.equal(inboxStale.body.data.length, 0, "stale (non-candidate) recipient discarded");
  });
});

test("[NOTIF-01] fireDue 2× com o MESMO now → mesmas entregas (guarda de idempotência)", async () => {
  await withScheduledApi(async ({ scheduledRepo, scheduledService, notificationRepo }) => {
    const tenant = randomUUID();
    const u1 = randomUUID();
    const u2 = randomUUID();
    notificationRepo.setRecipientCandidatesForTests(tenant, [candidate(u1), candidate(u2)]);
    const now = new Date("2026-05-01T12:00:00.000Z");

    // Definição PÚBLICA vencida inserida direto no repo (sem inline fire) para provar o fireDue puro.
    const def = await scheduledRepo.create({
      tenantId: tenant,
      title: "Scan",
      message: "Devida",
      notifyAt: new Date(now.getTime() - 60_000),
      visibility: "public",
      customRecipientIds: [],
      createdBy: randomUUID(),
    });

    const first = await scheduledService.fireDue({ tenantId: tenant, now });
    const second = await scheduledService.fireDue({ tenantId: tenant, now });

    assert.deepEqual(first, { reminders: 0, main: 1, deliveries: 2 });
    assert.deepEqual(second, { reminders: 0, main: 0, deliveries: 0 }, "2nd scan sees fired guard → nothing to do");

    const inbox1 = await notificationRepo.listByRecipient({ tenantId: tenant, recipientUserId: u1, filters: {} });
    const inbox2 = await notificationRepo.listByRecipient({ tenantId: tenant, recipientUserId: u2, filters: {} });
    assert.equal(inbox1.length, 1);
    assert.equal(inbox2.length, 1);

    const refreshed = await scheduledRepo.findById(tenant, def.id);
    assert.equal(refreshed?.status, "fired");
  });
});

test("[NOTIF-01] backstop DURO — mesmo re-varrendo (guarda limpo), a idempotencyKey não duplica a entrega", async () => {
  await withScheduledApi(async ({ scheduledRepo, scheduledService, notificationRepo }) => {
    const tenant = randomUUID();
    const u1 = randomUUID();
    notificationRepo.setRecipientCandidatesForTests(tenant, [candidate(u1)]);
    const now = new Date("2026-05-02T12:00:00.000Z");

    const def = await scheduledRepo.create({
      tenantId: tenant,
      title: "Backstop",
      message: "Uma vez só",
      notifyAt: new Date(now.getTime() - 60_000),
      visibility: "public",
      customRecipientIds: [],
      createdBy: randomUUID(),
    });

    await scheduledService.fireDue({ tenantId: tenant, now });
    // Simula um re-scan que escapou do guarda (crash entre criar entrega e marcar fired).
    assert.equal(scheduledRepo.clearFiredGuardsForTests(tenant, def.id), true);
    const reScan = await scheduledService.fireDue({ tenantId: tenant, now });

    // A ocorrência é re-processada, mas a entrega já existe (idempotencyKey) → inbox permanece com 1.
    assert.equal(reScan.main, 1);
    const inbox1 = await notificationRepo.listByRecipient({ tenantId: tenant, recipientUserId: u1, filters: {} });
    assert.equal(inbox1.length, 1, "no duplicate delivery — deduped by sched:<id>:main idempotency key");
  });
});

test("[NOTIF-04] remind_before gera ocorrência de LEMBRETE independente; main dispara depois; sem re-disparo", async () => {
  await withScheduledApi(async ({ scheduledRepo, scheduledService, notificationRepo }) => {
    const tenant = randomUUID();
    const creator = randomUUID();
    const base = new Date("2026-06-01T12:00:00.000Z");
    const notifyAt = new Date(base.getTime() + 3_600_000); // +1h
    const reminderAt = new Date(base.getTime() - 3_600_000); // −1h (já vencido em `base`)

    await scheduledRepo.create({
      tenantId: tenant,
      title: "Com lembrete",
      message: "Antecedência",
      notifyAt,
      remindBeforeMinutes: 120,
      reminderAt,
      visibility: "private",
      customRecipientIds: [],
      createdBy: creator,
    });

    // Em `base`: lembrete vencido dispara; principal (futuro) não.
    const atBase = await scheduledService.fireDue({ tenantId: tenant, now: base });
    assert.deepEqual(atBase, { reminders: 1, main: 0, deliveries: 1 });
    // Re-scan no mesmo `base` → nada (guarda de lembrete).
    assert.deepEqual(await scheduledService.fireDue({ tenantId: tenant, now: base }), { reminders: 0, main: 0, deliveries: 0 });

    // Passado o notify_at: principal dispara; lembrete NÃO re-dispara.
    const later = new Date(notifyAt.getTime() + 60_000);
    assert.deepEqual(await scheduledService.fireDue({ tenantId: tenant, now: later }), { reminders: 0, main: 1, deliveries: 1 });

    const inbox = await notificationRepo.listByRecipient({ tenantId: tenant, recipientUserId: creator, filters: {} });
    assert.equal(inbox.length, 2);
    const types = new Set(inbox.map((n: { type: string }) => n.type));
    assert.ok(types.has("scheduled.reminder"));
    assert.ok(types.has("scheduled.notification"));
  });
});

test("[NOTIF-09] DELETE = soft-cancel para ocorrências FUTURAS; entregues permanecem; GET/:id → 404", async () => {
  await withScheduledApi(async ({ baseUrl, scheduledService }) => {
    const tenant = randomUUID();
    const creator = randomUUID();
    const notifyAt = new Date(Date.now() + 3_600_000).toISOString();
    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, creator, "manager"),
      body: { title: "Cancelável", message: "Futura", notify_at: notifyAt, visibility: "private" },
    });
    const id = created.body.data.id as string;

    const cancelled = await requestJson(baseUrl, `/api/v1/notifications/scheduled/${id}`, {
      method: "DELETE",
      headers: authHeaders(tenant, creator, "manager"),
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "cancelled");

    // GET/:id após cancelar → 404 (deleted_at setado).
    const gone = await requestJson(baseUrl, `/api/v1/notifications/scheduled/${id}`, { headers: authHeaders(tenant, creator, "manager") });
    assert.equal(gone.status, 404);

    // fireDue depois do notify_at → não dispara (cancelada não é mais pending).
    const fired = await scheduledService.fireDue({ tenantId: tenant, now: new Date(Date.now() + 7_200_000) });
    assert.deepEqual(fired, { reminders: 0, main: 0, deliveries: 0 });
  });
});

test("[NOTIF-06] cross-tenant e cross-criador → 404 (§2.8: não vaza a definição de outro)", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const creator = randomUUID();
    const otherCreator = randomUUID();
    const created = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenantA, creator, "manager"),
      body: { title: "Do A", message: "M", notify_at: "2999-01-01T09:00", visibility: "private" },
    });
    const id = created.body.data.id as string;

    const crossTenant = await requestJson(baseUrl, `/api/v1/notifications/scheduled/${id}`, { headers: authHeaders(tenantB, randomUUID(), "manager") });
    assert.equal(crossTenant.status, 404);

    const crossCreator = await requestJson(baseUrl, `/api/v1/notifications/scheduled/${id}`, { headers: authHeaders(tenantA, otherCreator, "manager") });
    assert.equal(crossCreator.status, 404);

    const crossDelete = await requestJson(baseUrl, `/api/v1/notifications/scheduled/${id}`, { method: "DELETE", headers: authHeaders(tenantA, otherCreator, "manager") });
    assert.equal(crossDelete.status, 404);
  });
});

test("GET /notifications/scheduled lista SÓ as do próprio criador (foundation)", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const creator = randomUUID();
    const other = randomUUID();
    for (let i = 0; i < 2; i += 1) {
      await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
        method: "POST",
        headers: authHeaders(tenant, creator, "manager"),
        body: { title: `Minha ${i}`, message: "M", notify_at: "2999-01-01T09:00", visibility: "private" },
      });
    }
    await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers: authHeaders(tenant, other, "manager"),
      body: { title: "De outro", message: "M", notify_at: "2999-01-01T09:00", visibility: "private" },
    });

    const mine = await requestJson(baseUrl, "/api/v1/notifications/scheduled", { headers: authHeaders(tenant, creator, "manager") });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.length, 2);
    assert.equal(mine.body.pagination.total, 2);
  });
});

test("[NOTIF-08] RBAC — só gestão/operação cria; campo/finance/auditor/viewer → 403; anônimo → 403", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const body = { title: "T", message: "M", notify_at: "2999-01-01T09:00", visibility: "private" };

    for (const role of ["manager", "operator", "field_dispatcher", "tenant_admin"] as const) {
      const ok = await requestJson(baseUrl, "/api/v1/notifications/scheduled", { method: "POST", headers: authHeaders(tenant, randomUUID(), role), body });
      assert.equal(ok.status, 201, `POST as ${role} must be 201`);
    }

    for (const role of ["viewer", "finance", "field_technician", "technician", "auditor", "support", "inventory"] as const) {
      const denied = await requestJson(baseUrl, "/api/v1/notifications/scheduled", { method: "POST", headers: authHeaders(tenant, randomUUID(), role), body });
      assert.equal(denied.status, 403, `POST as ${role} must be 403`);
      assert.equal(denied.body.error.reason, "permission_required");
      // e a LISTA agendada idem (sub-recurso 100% atrás de notifications:create).
      const listDenied = await requestJson(baseUrl, "/api/v1/notifications/scheduled", { headers: authHeaders(tenant, randomUUID(), role) });
      assert.equal(listDenied.status, 403, `GET scheduled as ${role} must be 403`);
    }

    const anon = await requestJson(baseUrl, "/api/v1/notifications/scheduled", { method: "POST", body });
    assert.equal(anon.status, 403);
  });
});

test("validação — notify_at ausente/inválido, visibility inválida, custom sem recipients → 400", async () => {
  await withScheduledApi(async ({ baseUrl }) => {
    const tenant = randomUUID();
    const headers = authHeaders(tenant, randomUUID(), "manager");

    const noNotifyAt = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers,
      body: { title: "T", message: "M", visibility: "private" },
    });
    assert.equal(noNotifyAt.status, 400);
    assert.equal(noNotifyAt.body.error.reason, "notify_at_required");

    const badVisibility = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers,
      body: { title: "T", message: "M", notify_at: "2999-01-01T09:00", visibility: "everyone" },
    });
    assert.equal(badVisibility.status, 400);
    assert.equal(badVisibility.body.error.reason, "invalid_visibility");

    const emptyCustom = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers,
      body: { title: "T", message: "M", notify_at: "2999-01-01T09:00", visibility: "custom", custom_recipient_ids: [] },
    });
    assert.equal(emptyCustom.status, 400);
    assert.equal(emptyCustom.body.error.reason, "custom_recipient_ids_required");

    const missingTitle = await requestJson(baseUrl, "/api/v1/notifications/scheduled", {
      method: "POST",
      headers,
      body: { message: "M", notify_at: "2999-01-01T09:00", visibility: "private" },
    });
    assert.equal(missingTitle.status, 400);
    assert.equal(missingTitle.body.error.reason, "title_required");
  });
});

// ---------------------------------------------------------------------------
// Harness (espelho de tests/fleet-alerts-notifications.test.ts)
// ---------------------------------------------------------------------------

type ScheduledApiContext = {
  readonly baseUrl: string;
  readonly scheduledService: ScheduledNotificationService;
  readonly scheduledRepo: InMemoryScheduledNotificationRepository;
  readonly notificationRepo: {
    setRecipientCandidatesForTests(tenantId: string, candidates: readonly NotificationRecipientCandidate[]): void;
    listByRecipient(input: { tenantId: string; recipientUserId: string; filters?: Record<string, unknown> }): Promise<readonly { type: string }[]>;
  };
};

async function withScheduledApi(callback: (context: ScheduledApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    notifications,
    scheduled,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/notifications/scheduled-notification.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  notifications.resetNotificationRuntimeForTests();
  scheduled.resetScheduledNotificationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      scheduledService: scheduled.createMemoryScheduledNotificationService(),
      scheduledRepo: scheduled.getMemoryScheduledNotificationRepositoryForTests(),
      notificationRepo: notifications.getMemoryNotificationRepositoryForTests() as unknown as ScheduledApiContext["notificationRepo"],
    });
  } finally {
    await closeServer(server);
    notifications.resetNotificationRuntimeForTests();
    scheduled.resetScheduledNotificationRuntimeForTests();
  }
}

function candidate(userId: string, status = "active"): NotificationRecipientCandidate {
  return { userId, status, roles: [], permissions: [] };
}

function authHeaders(tenantId: string, userId: string, role: string, permissions?: readonly string[]): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
