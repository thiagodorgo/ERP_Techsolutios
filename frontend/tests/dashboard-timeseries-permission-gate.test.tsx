import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import type { WorkOrderTimeseriesData } from "../src/modules/dashboard/work-order-timeseries.types";

// WS-CARDS-CHARTS-F2 (PR2a) — CORREÇÃO 1 (MEDIA, acesso): o hook de série diária foi levantado ao topo do
// DashboardPage e é compartilhado pelo card grande e pelos pop-ups. Sem `work_orders:read` (enabled=false)
// ele NÃO pode disparar GET /operations/work-orders-timeseries — nem na montagem, nem no auto-refresh —
// evitando 403 repetido; já nasce em estado "acesso não permitido" (forbidden=true) para a UI degradar
// honesta (D-007). Com a permissão (enabled=true) o comportamento atual é preservado.

const TENANT_KEY = "erp-techsolutions.active-context";

function installBrowserGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  return { storage, localStorage };
}

const browser = installBrowserGlobals();

// Organização ativa presente de propósito: assim o único freio do fetch é o gate `enabled`, não a falta de
// contexto (o refresh também aborta quando não há organização ativa).
function seedContext() {
  browser.localStorage.setItem(
    TENANT_KEY,
    JSON.stringify({
      tenantId: "ten-1",
      tenantName: "Organização",
      tenantStatus: "active",
      branchId: "br-1",
      branchName: "Filial",
      role: "Financeiro",
      permissions: ["dashboard:read"], // SEM work_orders:read (perfil finance/inventory/support)
      enabledModules: ["dashboard"],
      scope: "branch",
    }),
  );
}

type Captured = {
  data?: WorkOrderTimeseriesData;
  loading?: boolean;
  refresh?: (background?: boolean) => Promise<void>;
};

async function renderProbe(enabled: boolean): Promise<Captured> {
  const { useWorkOrderTimeseries } = await import("../src/modules/dashboard/useWorkOrderTimeseries");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");

  const cap: Captured = {};
  function Probe() {
    const ts = useWorkOrderTimeseries(30, enabled);
    cap.data = ts.data;
    cap.loading = ts.loading;
    cap.refresh = ts.refresh;
    return null;
  }

  renderToString(
    <AuthProvider>
      <TenantProvider>
        <Probe />
      </TenantProvider>
    </AuthProvider>,
  );
  return cap;
}

test("enabled=false: nasce forbidden + loading=false e refresh é no-op — nenhum fetch (mesmo com organização ativa)", async () => {
  seedContext();
  process.env.VITE_USE_MOCKS = "";
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ data: { from: "", to: "", points: [] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const cap = await renderProbe(false);
    // Estado inicial honesto: acesso não permitido, sem skeleton preso.
    assert.equal(cap.data?.forbidden, true);
    assert.equal(cap.data?.source, "fallback");
    assert.equal(cap.loading, false);
    // refresh em foreground E em background NÃO dispara fetch algum (o gate vence, mesmo com contexto ativo).
    await cap.refresh?.(false);
    await cap.refresh?.(true);
    assert.equal(fetchCount, 0, "sem work_orders:read não pode haver GET da série (nem no auto-refresh)");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("enabled=true: preserva o comportamento atual — estado inicial busca (source api, loading, não forbidden)", async () => {
  seedContext();
  const cap = await renderProbe(true);
  assert.equal(cap.data?.forbidden, false);
  assert.equal(cap.data?.source, "api");
  assert.equal(cap.loading, true);
});
