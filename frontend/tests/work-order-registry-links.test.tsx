import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildRegistryLinksPayload } from "../src/modules/work-orders/work-orders.adapter";

// --- Unit: recorte snake_case do payload de vinculos (B1 OS integrada) ---

test("buildRegistryLinksPayload inclui todos os vinculos quando selecionados", () => {
  const payload = buildRegistryLinksPayload({
    customerId: "cus-1",
    vehicleId: "veh-1",
    teamId: "team-1",
    serviceCatalogId: "svc-1",
  });

  assert.deepEqual(payload, {
    customer_id: "cus-1",
    vehicle_id: "veh-1",
    team_id: "team-1",
    service_catalog_id: "svc-1",
  });
});

test("buildRegistryLinksPayload omite vinculos vazios", () => {
  assert.deepEqual(buildRegistryLinksPayload({}), {});
  assert.deepEqual(buildRegistryLinksPayload({ customerId: "", vehicleId: "   " }), {});

  const partial = buildRegistryLinksPayload({ customerId: "cus-9" });
  assert.deepEqual(partial, { customer_id: "cus-9" });
  assert.equal("vehicle_id" in partial, false);
  assert.equal("team_id" in partial, false);
  assert.equal("service_catalog_id" in partial, false);
});

// --- SSR: seletores de vinculo renderizam com as opcoes "Sem ..." (D-007) ---

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

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderCreatePage(): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { WorkOrderCreatePage } = await import("../src/modules/work-orders/pages/WorkOrderCreatePage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(["work_orders:read", "work_orders:create"]);

  return renderToString(
    <MemoryRouter initialEntries={["/work-orders/new"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <WorkOrderCreatePage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("form de OS renderiza secao de vinculos com as opcoes 'Sem ...' (D-007)", async () => {
  const html = await renderCreatePage();

  assert.match(html, /Vínculos de cadastro/);
  assert.match(html, /Sem cliente vinculado/);
  assert.match(html, /Sem viatura/);
  assert.match(html, /Sem equipe/);
  assert.match(html, /Sem serviço/);
  // Aditivo: os campos livres de cliente seguem disponiveis quando nada esta vinculado.
  assert.match(html, /Nome do cliente/);
  // D-007: modo mock nao fabrica cadastros; sem termo tecnico "Tenant" na UI.
  assert.doesNotMatch(html, /cus-1|veh-1|Tenant/);
});
