import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { mockSession } from "../src/mocks/auth/context";

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit;
};

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();

  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: (event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener: (event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowStub,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({
        click() {},
        set href(_value: string) {},
        set download(_value: string) {},
        set rel(_value: string) {},
      }),
    },
  });

  return {
    clear: () => storage.clear(),
    localStorage,
  };
}

function installFetchJson(payload: unknown, status = 200) {
  const calls: FetchCall[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(payload), {
        status,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  return calls;
}

function installFetchSequence(responses: readonly { payload: unknown; status?: number }[]) {
  const calls: FetchCall[] = [];
  let index = 0;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;

      return new Response(JSON.stringify(response.payload), {
        status: response.status ?? 200,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  return calls;
}

function sessionPayload() {
  return {
    data: {
      authenticated: true,
      access_token: "jwt-test-token",
      accessToken: "jwt-test-token",
      token_type: "Bearer",
      tokenType: "Bearer",
      expires_in: 3600,
      expiresIn: 3600,
      refresh_token: "refresh-test-token",
      refreshToken: "refresh-test-token",
      refresh_expires_at: "2026-06-14T00:00:00.000Z",
      refreshExpiresAt: "2026-06-14T00:00:00.000Z",
      session_id: "session-test-id",
      sessionId: "session-test-id",
      user: {
        id: "usr-test",
        tenant_id: "11111111-1111-4111-8111-111111111111",
        email: "admin@example.com",
        name: "Admin Test",
        status: "active",
      },
      tenant: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Tenant Test",
      },
      roles: [
        {
          id: "role-admin",
          key: "tenant_admin",
          name: "Tenant Admin",
        },
      ],
    },
  };
}

const browser = installBrowserTestGlobals();

test("auth.storage salva, le e limpa sessao e token", async () => {
  process.env.VITE_USE_MOCKS = "false";
  browser.clear();
  const {
    clearStoredAuthSession,
    getStoredAuthSession,
    getStoredRefreshToken,
    getStoredToken,
    setStoredAuthSession,
  } = await import("../src/modules/auth/auth.storage");

  setStoredAuthSession(mockSession);
  assert.equal(getStoredToken(), mockSession.accessToken);
  assert.equal(getStoredRefreshToken(), mockSession.refreshToken);
  assert.equal(getStoredAuthSession()?.user.email, mockSession.user.email);

  clearStoredAuthSession();
  assert.equal(getStoredToken(), null);
  assert.equal(getStoredRefreshToken(), null);
  assert.equal(getStoredAuthSession(), null);
});

test("auth.service usa mock quando VITE_USE_MOCKS=true", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { login, getCurrentAuthState } = await import("../src/modules/auth/auth.service");

  const session = await login({
    tenantId: "ten-industrial-01",
    email: "marina.costa@techsolutions.example",
    password: "operacao-demo",
  });

  assert.equal(session.provider, "mock");
  assert.equal(getCurrentAuthState()?.accessToken, mockSession.accessToken);
});

test("auth.service chama login real quando VITE_USE_MOCKS=false", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchJson(sessionPayload());
  const { login } = await import("../src/modules/auth/auth.service");

  const session = await login({
    tenantId: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    password: "ChangeMe123!",
  });

  assert.equal(calls[0].url, "/api/v1/auth/login");
  assert.equal(JSON.parse(String(calls[0].init.body)).tenantId, "11111111-1111-4111-8111-111111111111");
  assert.equal(session.provider, "local-jwt");
  assert.equal(session.accessToken, "jwt-test-token");
  assert.equal(session.refreshToken, "refresh-test-token");
  assert.equal(session.sessionId, "session-test-id");
  assert.equal(session.user.permissions.includes("tenant_checklists:read"), true);
});

test("api client envia Bearer e bloqueia headers legados no modo real", async () => {
  process.env.VITE_USE_MOCKS = "false";
  browser.clear();
  const calls = installFetchJson({ data: { ok: true } });
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { apiRequest } = await import("../src/services/api/client");

  setStoredAuthSession({
    ...mockSession,
    accessToken: "jwt-real",
    provider: "local-jwt",
  });
  await apiRequest("/tenant/checklists", {
    tenantId: "tenant-a",
    role: "tenant_admin",
    permissions: ["tenant_checklists:read"],
  });

  const headers = new Headers(calls[0].init.headers as HeadersInit);
  assert.equal(headers.get("Authorization"), "Bearer jwt-real");
  assert.equal(headers.get("X-Tenant-Id"), null);
  assert.equal(headers.get("X-Role"), null);
  assert.equal(headers.get("X-Permissions"), null);
});

test("api client renova access token uma vez em 401 e repete a chamada", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchSequence([
    { status: 401, payload: { error: { code: "INVALID_TOKEN" } } },
    {
      payload: {
        data: {
          access_token: "jwt-refreshed",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "refresh-rotated",
          refresh_expires_at: "2026-06-14T00:00:00.000Z",
          session_id: "session-test-id",
        },
      },
    },
    { payload: { data: { ok: true } } },
  ]);
  const { getStoredAuthSession, setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { apiRequest } = await import("../src/services/api/client");

  setStoredAuthSession({
    ...mockSession,
    accessToken: "jwt-expired",
    refreshToken: "refresh-current",
    provider: "local-jwt",
  });

  const result = await apiRequest<{ data: { ok: boolean } }>("/tenant/checklists");

  assert.equal(result.data.ok, true);
  assert.equal(calls[0].url, "/api/v1/tenant/checklists");
  assert.equal(calls[1].url, "/api/v1/auth/refresh");
  assert.equal(JSON.parse(String(calls[1].init.body)).refreshToken, "refresh-current");
  assert.equal(calls[2].url, "/api/v1/tenant/checklists");
  assert.equal(new Headers(calls[0].init.headers as HeadersInit).get("Authorization"), "Bearer jwt-expired");
  assert.equal(new Headers(calls[2].init.headers as HeadersInit).get("Authorization"), "Bearer jwt-refreshed");
  assert.equal(getStoredAuthSession()?.refreshToken, "refresh-rotated");
});

test("api client preserva headers mock e FormData para anexos", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const calls = installFetchJson({ data: { ok: true } });
  const { apiFormDataRequest } = await import("../src/services/api/client");
  const body = new FormData();
  body.set("componentId", "component-1");
  body.set("file", new File(["evidence"], "evidence.jpg", { type: "image/jpeg" }));

  await apiFormDataRequest("/mobile/checklist-runs/run-1/attachments", {
    method: "POST",
    body,
    tenantId: "tenant-a",
    role: "tenant_admin",
    permissions: ["checklist_runs:update"],
  });

  const headers = new Headers(calls[0].init.headers as HeadersInit);
  assert.equal(calls[0].init.body, body);
  assert.equal(headers.get("Content-Type"), null);
  assert.equal(headers.get("X-Tenant-Id"), "tenant-a");
  assert.equal(headers.get("X-Role"), "tenant_admin");
});

test("navegacao RBAC filtra W02A, W03 e Platform Console por perfil", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");
  const { platformNavigation } = await import("../src/navigation/platformNavigation");

  const operatorTenantItems = filterNavigationItems(
    {
      roles: ["Operador Logistico"],
      permissions: ["dashboard:view", "work-orders:view", "checklist_runs:create", "notifications:read"],
      mode: "operation",
      scope: "tenant",
      tenantStatus: "active",
      enabledModules: ["dashboard", "work-orders", "tenant_checklist", "tenant-admin", "notifications"],
    },
    tenantNavigation,
  );
  const adminTenantItems = filterNavigationItems(
    {
      roles: ["Administrador"],
      permissions: ["dashboard:view", "tenant_checklists:read", "tenant:manage"],
      mode: "tenant_admin",
      scope: "tenant",
      tenantStatus: "active",
      enabledModules: ["dashboard", "tenant_checklist", "tenant-admin"],
    },
    tenantNavigation,
  );
  const tenantAdminPlatformItems = filterNavigationItems(
    {
      roles: ["Administrador"],
      permissions: ["dashboard:view"],
      mode: "platform",
      scope: "platform",
    },
    platformNavigation,
  );
  const platformAdminItems = filterNavigationItems(
    {
      roles: ["Super Admin"],
      permissions: [
        "platform:tenants:read",
        "platform:modules:manage",
        "platform:cloud-usage:read",
        "platform:cloud-costs:read",
        "platform:cloud-cost-allocation:read",
        "platform:cloud-charges:read",
        "platform:cloud-charge-rules:read",
      ],
      mode: "platform",
      scope: "platform",
    },
    platformNavigation,
  );
  const withoutNotificationsItems = filterNavigationItems(
    {
      roles: ["Operador Logistico"],
      permissions: ["dashboard:view", "work-orders:view"],
      mode: "operation",
      scope: "tenant",
      tenantStatus: "active",
      enabledModules: ["dashboard", "work-orders"],
    },
    tenantNavigation,
  );

  const operatorPaths = flattenPaths(operatorTenantItems);
  const adminPaths = flattenPaths(adminTenantItems);
  const withoutNotificationsPaths = flattenPaths(withoutNotificationsItems);
  assert.equal(operatorPaths.includes("/operations/checklists"), true);
  assert.equal(operatorPaths.includes("/notifications"), true);
  assert.equal(operatorPaths.includes("/administrator/checklists"), false);
  assert.equal(operatorPaths.includes("/administrator/settings"), false);
  assert.equal(withoutNotificationsPaths.includes("/notifications"), false);
  assert.equal(adminPaths.includes("/administrator/checklists"), true);
  assert.equal(adminPaths.includes("/administrator/settings"), true);
  assert.equal(tenantAdminPlatformItems.length, 0);
  assert.equal(platformAdminItems.some((item) => item.path === "/platform/tenants"), true);
  assert.equal(platformAdminItems.some((item) => item.path === "/platform/cloud-billing"), true);
  assert.deepEqual(flattenPaths(adminTenantItems), flattenPaths(adminTenantItems));
});

test("navigation adapter ordena, preserva status e usa icone fallback", async () => {
  const { adaptBackendNavigationMenu } = await import("../src/modules/navigation/navigation.adapter");
  const items = adaptBackendNavigationMenu({
    data: [
      {
        id: "tenant.future",
        label: "Futuro",
        path: "/future",
        icon: "IconeInexistente",
        group: "finance",
        order: 20,
        status: "future",
        requiredPermissions: ["finance:read"],
      },
      {
        id: "tenant.checklists",
        label: "Checklists",
        path: "/administrator/checklists",
        icon: "ClipboardCheck",
        group: "tenant",
        order: 10,
        status: "implemented",
        requiredPermissions: ["tenant_checklists:read"],
      },
    ],
  });

  assert.deepEqual(items.map((item) => item.id), ["tenant.checklists", "tenant.future"]);
  assert.equal(items[0].backendStatus, "implemented");
  assert.equal(items[1].backendStatus, "future");
  assert.ok(items[1].iconComponent);
});

test("navigation service consome endpoint backend com scope e mock fallback local", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchJson({
    data: [
      {
        id: "platform.cloudBilling",
        label: "Billing Cloud",
        path: "/platform/cloud-billing",
        icon: "Receipt",
        group: "platform",
        order: 30,
        status: "implemented",
        requiredPermissions: ["platform:cloud-charges:read"],
      },
    ],
  });
  const { getNavigationMenu } = await import("../src/modules/navigation/navigation.service");

  const response = await getNavigationMenu("platform");

  assert.equal(calls[0].url, "/api/v1/navigation/menu?scope=platform");
  assert.equal(response.data?.[0]?.id, "platform.cloudBilling");

  process.env.VITE_USE_MOCKS = "true";
  const mockResponse = await getNavigationMenu("tenant");
  assert.equal(mockResponse.data?.some((item) => item.path === "/administrator/checklists"), true);
});

test("cloud billing adapter consome endpoints Platform e normaliza DTOs", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchSequence([
    { payload: { data: { metrics: [{ metricKey: "notification.created", quantity: 4 }], generatedAt: "2026-06-08T00:00:00.000Z" } } },
    {
      payload: {
        data: [
          {
            id: "import-1",
            provider: "aws",
            status: "completed",
            periodStart: "2026-06-01T00:00:00.000Z",
            importedAt: "2026-06-08T00:00:00.000Z",
            sourceUri: "aws-cur.csv",
            rowCount: 2,
          },
        ],
      },
    },
    { payload: { data: { totalUnblendedCost: 12.75, currency: "BRL", tenants: [] } } },
    {
      payload: {
        data: [
          {
            id: "allocation-run-1",
            status: "completed",
            periodStart: "2026-06-01T00:00:00.000Z",
            totalAllocatedCost: 12,
            totalUnallocatedCost: 0,
            startedAt: "2026-06-08T00:00:00.000Z",
          },
        ],
      },
    },
    { payload: { data: { totalAllocatedCost: 12, totalUnallocatedCost: 0, tenants: [{ tenantId: "tenant-a", totalAllocatedCost: 12 }] } } },
    {
      payload: {
        data: [
          {
            id: "charge-run-1",
            status: "completed",
            periodStart: "2026-06-01T00:00:00.000Z",
            totalChargeAmount: 18,
            totalAllocatedCost: 12,
            startedAt: "2026-06-08T00:00:00.000Z",
          },
        ],
      },
    },
    { payload: { data: { totalChargeAmount: 18, totalAllocatedCost: 12, tenants: [{ tenantId: "tenant-a", totalChargeAmount: 18, totalAllocatedCost: 12 }] } } },
    {
      payload: {
        data: [
          {
            id: "rule-1",
            name: "Default",
            isActive: true,
            markupValue: 50,
            updatedAt: "2026-06-08T00:00:00.000Z",
          },
        ],
      },
    },
    { payload: { data: { id: "allocation-run-2", status: "completed", periodStart: "2026-06-01T00:00:00.000Z", totalAllocatedCost: 12 } } },
    { payload: { data: { id: "charge-run-2", status: "completed", periodStart: "2026-06-01T00:00:00.000Z", totalChargeAmount: 18, totalAllocatedCost: 12 } } },
    { payload: { data: { id: "rule-2", name: "Nova", isActive: true, markupValue: 25, updatedAt: "2026-06-08T00:00:00.000Z" } } },
    { payload: { data: { id: "rule-2", name: "Nova editada", isActive: false, markupValue: 30, updatedAt: "2026-06-08T00:00:00.000Z" } } },
  ]);
  const {
    calculateCloudChargesFromApi,
    createCloudChargeRuleFromApi,
    getCloudAllocationSummaryFromApi,
    getCloudChargeSummaryFromApi,
    getCloudCostSummaryFromApi,
    getCloudUsageSummaryFromApi,
    listCloudAllocationRunsFromApi,
    listCloudChargeRulesFromApi,
    listCloudChargeRunsFromApi,
    listCloudCostImportsFromApi,
    runCloudAllocationFromApi,
    updateCloudChargeRuleFromApi,
  } = await import("../src/modules/platform/cloud-billing/cloud-billing.adapter");

  const usage = await getCloudUsageSummaryFromApi();
  const imports = await listCloudCostImportsFromApi();
  const costs = await getCloudCostSummaryFromApi();
  const allocationRuns = await listCloudAllocationRunsFromApi();
  const allocation = await getCloudAllocationSummaryFromApi();
  const chargeRuns = await listCloudChargeRunsFromApi();
  const charges = await getCloudChargeSummaryFromApi();
  const rules = await listCloudChargeRulesFromApi();
  const allocationRun = await runCloudAllocationFromApi();
  const chargeRun = await calculateCloudChargesFromApi("allocation-run-2");
  const createdRule = await createCloudChargeRuleFromApi({
    name: "Nova",
    provider: "aws",
    metric: "allocated_cost",
    markupPercent: 25,
    active: true,
  });
  const updatedRule = await updateCloudChargeRuleFromApi("rule-2", {
    name: "Nova editada",
    provider: "aws",
    metric: "allocated_cost",
    markupPercent: 30,
    active: false,
  });

  assert.equal(calls[0].url, "/api/v1/platform/cloud-usage/summary");
  assert.equal(calls[1].url, "/api/v1/platform/cloud-costs/imports");
  assert.equal(calls[2].url, "/api/v1/platform/cloud-costs/summary");
  assert.equal(calls[3].url, "/api/v1/platform/cloud-cost-allocations/runs");
  assert.equal(calls[4].url, "/api/v1/platform/cloud-cost-allocations/summary");
  assert.equal(calls[5].url, "/api/v1/platform/cloud-charges/calculation-runs");
  assert.equal(calls[6].url, "/api/v1/platform/cloud-charges/summary");
  assert.equal(calls[7].url, "/api/v1/platform/cloud-charge-rules");
  assert.equal(calls[8].url, "/api/v1/platform/cloud-cost-allocations/runs");
  assert.equal(calls[9].url, "/api/v1/platform/cloud-charges/calculation-runs");
  assert.equal(JSON.parse(String(calls[9].init.body)).sourceAllocationRunId, "allocation-run-2");
  assert.equal(calls[10].url, "/api/v1/platform/cloud-charge-rules");
  assert.equal(calls[11].url, "/api/v1/platform/cloud-charge-rules/rule-2");
  assert.equal(usage.totalRequests, 4);
  assert.equal(imports[0].records, 2);
  assert.equal(costs.totalCost, 12.75);
  assert.equal(allocationRuns[0].allocatedCost, 12);
  assert.equal(allocation.tenants[0].allocatedCost, 12);
  assert.equal(chargeRuns[0].grossAmount, 18);
  assert.equal(charges.tenants[0].amount, 18);
  assert.equal(rules[0].markupPercent, 50);
  assert.equal(allocationRun.allocatedCost, 12);
  assert.equal(chargeRun.grossAmount, 18);
  assert.equal(createdRule.name, "Nova");
  assert.equal(updatedRule.active, false);
});

test("notifications service cobre endpoints, mocks e actionUrl interno", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { NotificationCard } = await import("../src/modules/notifications/components/NotificationCard");
  const { resetMockNotificationsForTests } = await import("../src/modules/notifications/notification.mock");
  const {
    archiveNotification,
    getUnreadNotificationCount,
    listNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
  } = await import("../src/modules/notifications/notification.service");
  const context = {
    tenantId: "tenant-a",
    role: "tenant_admin",
    permissions: ["notifications:read", "notifications:update"],
  };

  resetMockNotificationsForTests();
  const initial = await listNotifications(context);
  assert.equal(initial.length, 6);
  assert.equal(initial.every((notification) => !notification.actionUrl || notification.actionUrl.startsWith("/")), true);
  assert.equal((await getUnreadNotificationCount(context)).count, 4);

  const read = await markNotificationAsRead(context, "notif-divergence");
  assert.equal(read.status, "read");
  assert.equal((await getUnreadNotificationCount(context)).count, 3);

  const archived = await archiveNotification(context, "notif-read");
  assert.equal(archived.status, "archived");
  assert.equal((await listNotifications(context, { status: "archived" })).some((notification) => notification.id === "notif-read"), true);

  await markAllNotificationsAsRead(context);
  assert.equal((await getUnreadNotificationCount(context)).count, 0);

  const safeHtml = renderToString(
    <NotificationCard
      notification={initial[0]}
      onArchive={() => undefined}
      onMarkRead={() => undefined}
      onOpen={() => undefined}
    />,
  );
  const unsafeHtml = renderToString(
    <NotificationCard
      notification={{ ...initial[0], id: "external", actionUrl: "https://example.com" }}
      onArchive={() => undefined}
      onMarkRead={() => undefined}
      onOpen={() => undefined}
    />,
  );
  assert.match(safeHtml, /Abrir/);
  assert.doesNotMatch(unsafeHtml, /Abrir/);
});

test("notifications adapter usa contrato da API interna", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchSequence([
    {
      payload: {
        data: [
          {
            id: "notif-1",
            type: "checklist_run.completed",
            title: "Checklist concluido",
            message: "Execucao finalizada.",
            severity: "success",
            status: "unread",
            source_type: "checklist_run",
            source_id: "run-1",
            action_url: "/operations/checklists",
            metadata: { source: "test" },
            read_at: null,
            created_at: "2026-06-08T10:00:00.000Z",
            updated_at: "2026-06-08T10:00:00.000Z",
          },
        ],
      },
    },
    { payload: { data: { count: 1 } } },
    {
      payload: {
        data: {
          id: "notif-1",
          type: "checklist_run.completed",
          title: "Checklist concluido",
          message: "Execucao finalizada.",
          severity: "success",
          status: "read",
          created_at: "2026-06-08T10:00:00.000Z",
          updated_at: "2026-06-08T10:05:00.000Z",
        },
      },
    },
    { payload: { data: { count: 0 } } },
    {
      payload: {
        data: {
          id: "notif-1",
          type: "checklist_run.completed",
          title: "Checklist concluido",
          message: "Execucao finalizada.",
          severity: "success",
          status: "archived",
          created_at: "2026-06-08T10:00:00.000Z",
          updated_at: "2026-06-08T10:06:00.000Z",
        },
      },
    },
  ]);
  const {
    archiveNotificationFromApi,
    getUnreadNotificationCountFromApi,
    listNotificationsFromApi,
    markAllNotificationsAsReadFromApi,
    markNotificationAsReadFromApi,
  } = await import("../src/modules/notifications/notification.adapter");
  const context = {
    tenantId: "tenant-a",
    role: "tenant_admin",
    permissions: ["notifications:read", "notifications:update"],
  };

  const list = await listNotificationsFromApi(context, { status: "unread", limit: 20 });
  const count = await getUnreadNotificationCountFromApi(context);
  const read = await markNotificationAsReadFromApi(context, "notif-1");
  const readAll = await markAllNotificationsAsReadFromApi(context);
  const archived = await archiveNotificationFromApi(context, "notif-1");

  assert.equal(calls[0].url, "/api/v1/notifications?status=unread&limit=20");
  assert.equal(calls[1].url, "/api/v1/notifications/unread-count");
  assert.equal(calls[2].url, "/api/v1/notifications/notif-1/read");
  assert.equal(calls[3].url, "/api/v1/notifications/read-all");
  assert.equal(calls[4].url, "/api/v1/notifications/notif-1/archive");
  assert.equal(list[0].sourceType, "checklist_run");
  assert.equal(list[0].actionUrl, "/operations/checklists");
  assert.equal(count.count, 1);
  assert.equal(read.status, "read");
  assert.equal(readAll.count, 0);
  assert.equal(archived.status, "archived");
});

test("checklist runtime service chama endpoints operacionais compartilhados", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  browser.clear();
  const calls = installFetchSequence([
    {
      payload: {
        data: [
          {
            id: "chk-1",
            tenantId: "tenant-a",
            name: "Checklist publicado",
            type: "custom",
            status: "published",
            version: 1,
            schema: {},
            components: [],
            updatedAt: "2026-06-08T00:00:00.000Z",
          },
        ],
      },
    },
    {
      payload: {
        data: {
          id: "chk-1",
          name: "Checklist publicado",
          type: "custom",
          version: 1,
          schema: {},
          components: [],
        },
      },
    },
    {
      payload: {
        data: {
          id: "run-1",
          tenantId: "tenant-a",
          templateId: "chk-1",
          templateVersion: 1,
          status: "in_progress",
          startedAt: "2026-06-08T00:00:00.000Z",
        },
      },
    },
    {
      payload: {
        data: {
          id: "marker-1",
          tenantId: "tenant-a",
          runId: "run-1",
          componentId: "cmp-damage",
          markerType: "damage",
          description: "Risco lateral",
          x: 0.5,
          y: 0.5,
          metadata: {},
          createdAt: "2026-06-08T00:00:00.000Z",
        },
      },
    },
    {
      payload: {
        data: {
          run: {
            id: "run-1",
            templateId: "chk-1",
            templateVersion: 1,
            status: "in_progress",
            startedAt: "2026-06-08T00:00:00.000Z",
          },
          answers: [],
          attachments: [],
          markers: [],
          comparison: {
            status: "in_progress",
            divergence: false,
          },
        },
      },
    },
    {
      payload: {
        data: {
          run: {
            id: "run-1",
            templateId: "chk-1",
            templateVersion: 1,
            status: "pending_acknowledgement",
            startedAt: "2026-06-08T00:00:00.000Z",
          },
          answers: [],
          attachments: [],
          markers: [],
          acknowledgements: [],
        },
      },
    },
    {
      payload: {
        data: {
          acknowledgement: {
            id: "ack-1",
            runId: "run-1",
            message: "Ciencia configurada",
            acknowledgedAt: "2026-06-08T00:00:00.000Z",
          },
          run: {
            run: {
              id: "run-1",
              templateId: "chk-1",
              templateVersion: 1,
              status: "completed_with_divergence",
              startedAt: "2026-06-08T00:00:00.000Z",
            },
            answers: [],
            attachments: [],
            markers: [],
            acknowledgements: [],
          },
        },
      },
    },
    {
      payload: {
        data: {
          run: {
            id: "run-1",
            templateId: "chk-1",
            templateVersion: 1,
            status: "in_progress",
            startedAt: "2026-06-08T00:00:00.000Z",
          },
          answers: [],
          attachments: [],
          markers: [],
          acknowledgements: [],
        },
      },
    },
    {
      payload: {
        data: {
          run: {
            id: "run-1",
            templateId: "chk-1",
            templateVersion: 1,
            status: "completed",
            startedAt: "2026-06-08T00:00:00.000Z",
          },
          answers: [],
          attachments: [],
          markers: [],
          acknowledgements: [],
        },
      },
    },
  ]);
  const {
    acknowledgeRun,
    addMarker,
    completeChecklistRun,
    createChecklistRun,
    getRunComparison,
    listAvailableChecklists,
    reportDivergence,
    renderChecklist,
    updateChecklistRun,
  } = await import("../src/modules/checklists/checklist-runtime.service");
  const context = {
    tenantId: "tenant-a",
    role: "operator",
    permissions: ["checklist_runs:read", "checklist_runs:create", "checklist_runs:update", "checklist_runs:complete", "checklist_runs:acknowledge"],
  };

  await listAvailableChecklists(context);
  await renderChecklist(context, "chk-1");
  await createChecklistRun(context, { checklistId: "chk-1", answers: [] });
  await updateChecklistRun(context, "run-1", { answers: [] });
  await addMarker(context, "run-1", {
    componentId: "cmp-damage",
    markerType: "damage",
    description: "Risco lateral",
    x: 0.5,
    y: 0.5,
  });
  await getRunComparison(context, "run-1");
  await reportDivergence(context, "run-1", {
    componentId: "cmp-comparison",
    fileUrl: "/evidence.jpg",
    fileName: "evidence.jpg",
    mimeType: "image/jpeg",
    observation: "Divergencia encontrada",
  });
  await acknowledgeRun(context, "run-1", {
    message: "Ciencia configurada",
  });
  await completeChecklistRun(context, "run-1");

  assert.equal(calls[0].url, "/api/v1/mobile/checklists/available");
  assert.equal(calls[1].url, "/api/v1/mobile/checklists/chk-1/render");
  assert.equal(calls[2].url, "/api/v1/mobile/checklist-runs");
  assert.equal(JSON.parse(String(calls[2].init.body)).checklistId, "chk-1");
  assert.equal(calls[3].url, "/api/v1/mobile/checklist-runs/run-1");
  assert.equal(calls[4].url, "/api/v1/mobile/checklist-runs/run-1/markers");
  assert.equal(calls[5].url, "/api/v1/mobile/checklist-runs/run-1/comparison");
  assert.equal(calls[6].url, "/api/v1/mobile/checklist-runs/run-1/divergence");
  assert.equal(JSON.parse(String(calls[6].init.body)).observation, "Divergencia encontrada");
  assert.equal(calls[7].url, "/api/v1/mobile/checklist-runs/run-1/acknowledgement");
  assert.equal(calls[8].url, "/api/v1/mobile/checklist-runs/run-1/complete");
});

test("checklist runtime valida obrigatorios por schema", async () => {
  const { calculateChecklistRuntimeProgress, validateChecklistRuntime } = await import(
    "../src/modules/checklists/checklist-runtime.validation"
  );
  const schema = {
    id: "chk-validation",
    name: "Checklist de validacao",
    type: "technical_evidence" as const,
    version: 1,
    schema: {},
    components: [
      {
        id: "cmp-before-after",
        componentKey: "before_after",
        label: "Antes e depois",
        type: "before_after" as const,
        required: true,
        orderIndex: 0,
        config: { requireBothStages: true },
        validationRules: {},
        visibilityRules: {},
      },
      {
        id: "cmp-ack",
        componentKey: "acknowledgement",
        label: "Ciencia",
        type: "acknowledgement" as const,
        required: true,
        orderIndex: 1,
        config: { requireObservation: true },
        validationRules: {},
        visibilityRules: {},
      },
    ],
  };
  const beforeAttachment = {
    id: "att-before",
    runId: "run-1",
    componentId: "cmp-before-after",
    fileUrl: "/before.jpg",
    metadata: { stage: "before" },
    createdAt: "2026-06-08T00:00:00.000Z",
  };

  const missing = validateChecklistRuntime(schema, { "cmp-ack": { accepted: true } }, [beforeAttachment], []);
  assert.equal(missing.length, 2);
  assert.match(missing[0].message, /antes e depois/i);
  assert.match(missing[1].message, /observacao obrigatoria/i);

  const progress = calculateChecklistRuntimeProgress(schema, { "cmp-ack": { accepted: true } }, [beforeAttachment], []);
  assert.equal(progress.requiredTotal, 2);
  assert.equal(progress.requiredCompleted, 0);
});

test("smoke renderiza /login, W02A, W03, runtime e Platform Console", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { LoginPage } = await import("../src/pages/LoginPage");
  const { ChecklistRuntimePage } = await import("../src/modules/checklists/pages/ChecklistRuntimePage");
  const { ChecklistRunsPage } = await import("../src/modules/checklists/pages/ChecklistRunsPage");
  const { TenantChecklistsPage } = await import("../src/modules/checklists/pages/TenantChecklistsPage");
  const { NotificationsPage } = await import("../src/modules/notifications/pages/NotificationsPage");
  const { TenantSettingsPage } = await import("../src/modules/settings/pages/TenantSettingsPage");
  const { PlatformCloudBillingPage } = await import("../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage");
  const { PlatformTenantsPage } = await import("../src/modules/platform/pages/PlatformTenantsPage");
  setStoredAuthSession(mockSession);
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions: ["checklist_runs:read", "checklist_runs:create", "tenant_checklists:read", "tenant:manage", "notifications:read", "notifications:update"],
      enabledModules: ["dashboard", "tenant_checklist", "tenant-admin", "notifications"],
      scope: "branch",
    }),
  );

  const loginHtml = renderToString(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  const protectedHtml = renderToString(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <ChecklistRunsPage />
            <TenantChecklistsPage />
            <NotificationsPage />
            <TenantSettingsPage />
            <PlatformTenantsPage />
            <PlatformCloudBillingPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  const runtimeHtml = renderToString(
    <MemoryRouter initialEntries={["/operations/checklists/chk_towing_collection/run"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route path="/operations/checklists/:checklistId/run" element={<ChecklistRuntimePage />} />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  assert.match(loginHtml, /W01 Login/);
  assert.match(protectedHtml, /Checklists Operacionais/);
  assert.match(protectedHtml, /Notificacoes/);
  assert.match(runtimeHtml, /Executar checklist|Runtime operacional/);
  assert.match(protectedHtml, /Checklists|Selecione um contexto/);
  assert.match(protectedHtml, /Configurações/);
  assert.match(protectedHtml, /Tenants|tenant/i);
  assert.match(protectedHtml, /Cloud Billing/);
});

test("anexos frontend validam ausente, renderizam lista e preview", async () => {
  const { uploadChecklistAttachmentToApi, downloadChecklistAttachmentFromApi } = await import(
    "../src/modules/checklists/checklist-attachments.adapter"
  );
  const { ChecklistAttachmentUploader } = await import("../src/modules/checklists/components/ChecklistAttachmentUploader");
  const { ChecklistAttachmentList } = await import("../src/modules/checklists/components/ChecklistAttachmentList");
  const { ChecklistEvidencePreview } = await import("../src/modules/checklists/components/ChecklistEvidencePreview");
  const attachment = {
    id: "att-1",
    tenantId: "tenant-a",
    runId: "run-1",
    componentId: "component-1",
    fileUrl: "/api/v1/mobile/checklist-runs/run-1/attachments/att-1/download",
    fileName: "evidence.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    metadata: {},
    createdAt: "2026-06-07T00:00:00.000Z",
  };
  const context = {
    tenantId: "tenant-a",
    role: "tenant_admin",
    permissions: ["checklist_runs:update", "checklist_runs:read"],
  };

  await assert.rejects(
    () =>
      uploadChecklistAttachmentToApi({
        context,
        runId: "run-1",
        componentId: "component-1",
        file: null as unknown as File,
      }),
    /Arquivo obrigatorio/,
  );

  const listEmptyHtml = renderToString(<ChecklistAttachmentList attachments={[]} onDownload={async () => downloadResult()} />);
  const listItemHtml = renderToString(<ChecklistAttachmentList attachments={[attachment]} onDownload={async () => downloadResult()} />);
  const imagePreviewHtml = renderToString(<ChecklistEvidencePreview attachment={attachment} onDownload={async () => downloadResult()} />);
  const pdfPreviewHtml = renderToString(
    <ChecklistEvidencePreview attachment={{ ...attachment, id: "att-2", fileName: "evidence.pdf", mimeType: "application/pdf" }} onDownload={async () => downloadResult()} />,
  );
  const genericPreviewHtml = renderToString(
    <ChecklistEvidencePreview attachment={{ ...attachment, id: "att-3", fileName: "evidence.bin", mimeType: "application/octet-stream" }} onDownload={async () => downloadResult()} />,
  );
  const uploaderHtml = renderToString(<ChecklistAttachmentUploader context={context} runId="run-1" componentId="component-1" />);

  assert.match(listEmptyHtml, /Nenhuma evidencia anexada/);
  assert.match(listItemHtml, /evidence\.jpg/);
  assert.match(imagePreviewHtml, /evidence\.jpg/);
  assert.match(pdfPreviewHtml, /evidence\.pdf/);
  assert.match(genericPreviewHtml, /Arquivo disponivel para download protegido/);
  assert.match(uploaderHtml, /Enviar evidencia/);

  const calls = installFetchJson({
    data: {
      ...attachment,
      metadata: {
        checksumSha256: "abc",
      },
    },
  });
  await uploadChecklistAttachmentToApi({
    context,
    runId: "run-1",
    componentId: "component-1",
    file: new File(["image"], "evidence.jpg", { type: "image/jpeg" }),
    metadata: {
      source: "smoke-test",
    },
  });

  assert.equal(calls[0].url, "/api/v1/mobile/checklist-runs/run-1/attachments");
  assert.equal(calls[0].init.body instanceof FormData, true);

  const downloadCalls = installFetchBlob(new Blob(["pdf"], { type: "application/pdf" }));
  const download = await downloadChecklistAttachmentFromApi(context, "run-1", "att-1");
  assert.equal(downloadCalls[0].url, "/api/v1/mobile/checklist-runs/run-1/attachments/att-1/download");
  assert.equal(download.fileName, "evidence.pdf");
});

function flattenPaths(items: readonly { path: string; children?: readonly { path: string }[] }[]): string[] {
  return items.flatMap((item) => [item.path, ...(item.children?.map((child) => child.path) ?? [])]);
}

function downloadResult() {
  return {
    blob: new Blob(["evidence"]),
    objectUrl: "blob:smoke",
    fileName: "evidence.jpg",
    mimeType: "image/jpeg",
  };
}

function installFetchBlob(blob: Blob) {
  const calls: FetchCall[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return new Response(blob, {
        status: 200,
        headers: {
          "content-disposition": "attachment; filename=\"evidence.pdf\"",
          "content-type": blob.type,
        },
      });
    },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:download",
  });

  return calls;
}
