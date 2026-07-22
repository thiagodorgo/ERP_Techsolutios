import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { FuelLog } from "../src/modules/fleet/fuel/fuel-logs.types";

// Ω4C PR-05 — Abastecimento (posto interno/externo, fornecedor condicional, km/L honesto). Recria o
// COMPORTAMENTO do AutEM (seletor Posto → Fornecedor quando externo; "desconsiderar último KM"; consumo
// derivado) no visual do ERP. Cobre: render do modal (seletor Posto + Fornecedor só em EXTERNO), validação
// espelhando o backend (externo sem fornecedor bloqueia), km/L "—" honesto (null/0/negativo), rótulos
// PT-BR (§3) e §2.8 (nunca tenant_id; fornecedor só como nome/label).

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

function makeLog(partial: Partial<FuelLog> & Pick<FuelLog, "id" | "vehicleId">): FuelLog {
  return {
    operatorId: null,
    workOrderId: null,
    fueledAt: "2026-06-01T10:00:00.000Z",
    fuelType: "diesel",
    liters: 40,
    totalValue: 260,
    odometer: 120500,
    station: null,
    stationType: "external",
    supplierId: null,
    supplierName: null,
    notes: null,
    isActive: true,
    kmPerLiter: null,
    distanceKm: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

async function renderModal(log: FuelLog | null): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FuelLogFormModal } = await import("../src/modules/fleet/fuel/components/FuelLogFormModal");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(["fuel_logs:read", "fuel_logs:create", "fuel_logs:update", "financial_titles:create", "financial_titles:update"]);

  return renderToString(
    <MemoryRouter initialEntries={["/fleet/fuel"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FuelLogFormModal log={log} vehicles={[]} context={{}} canLaunchPayable canRemovePayable onClose={() => {}} onSaved={() => {}} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// ── Render: seletor Posto + condicionais ─────────────────────────────────────
test("modal (novo): seletor Posto (Interno/Externo), Fornecedor no default externo, Valor unitário e 'Desconsiderar último KM'", async () => {
  const html = await renderModal(null);

  // Seção titulada + seletor Posto com rótulos PT-BR (§3).
  assert.match(html, /Posto e fornecedor/);
  assert.match(html, /Interno \(posto próprio\)/);
  assert.match(html, /Externo/);
  // Default externo → seletor de Fornecedor visível (obrigatório).
  assert.match(html, /Selecione o fornecedor/);
  // Consumo derivado exibido (Valor unitário R$/L) + override do odômetro.
  assert.match(html, /Valor unitário/);
  assert.match(html, /Desconsiderar último KM/);
  // Posto texto-livre coexiste como identificação opcional.
  assert.match(html, /Identificação do posto/);
  // §3/§2.8 — sem termo técnico visível nem tenant.
  assert.doesNotMatch(html, /Tenant/i);
  assert.doesNotMatch(html, /tenant_id/i);
});

test("modal (edição INTERNO): sem seletor de Fornecedor — some quando o posto é interno", async () => {
  const html = await renderModal(makeLog({ id: "fl-int", vehicleId: "veh-1", stationType: "internal", supplierId: null, supplierName: null }));

  // O seletor de fornecedor não aparece no modo interno.
  assert.doesNotMatch(html, /Selecione o fornecedor/);
  // Em vez dele, a nota honesta do posto próprio (baixa de estoque deferida à custódia).
  assert.match(html, /Posto próprio da base/);
  assert.match(html, /Interno \(posto próprio\)/);
});

test("modal (edição EXTERNO): seletor de Fornecedor presente e obrigatório", async () => {
  const html = await renderModal(makeLog({ id: "fl-ext", vehicleId: "veh-1", stationType: "external", supplierId: "sup-1", supplierName: "Posto Central" }));

  assert.match(html, /Fornecedor \*/);
  assert.match(html, /Selecione o fornecedor/);
  // O fornecedor já vinculado aparece como opção (label §2.8), mesmo fora da janela de ativos.
  assert.match(html, /Posto Central/);
});

// ── Validação client (espelha o backend RN-ABA-01/02) ────────────────────────
test("validação: EXTERNO sem fornecedor bloqueia; com fornecedor libera; INTERNO nunca exige fornecedor", async () => {
  const { validateFuelLog } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const base = { vehicleId: "veh-1", fueledAt: "2026-06-01T10:00:00.000Z", fuelType: "diesel", liters: 40, totalValue: 260, odometer: 120500 };

  const externoSemFornecedor = validateFuelLog({ ...base, stationType: "external" });
  assert.ok(externoSemFornecedor.some((error) => error.field === "supplierId"));

  const externoComFornecedor = validateFuelLog({ ...base, stationType: "external", supplierId: "sup-1" });
  assert.equal(externoComFornecedor.some((error) => error.field === "supplierId"), false);

  const interno = validateFuelLog({ ...base, stationType: "internal" });
  assert.equal(interno.some((error) => error.field === "supplierId"), false);
});

// ── km/L honesto: "—" para null, zero e negativo (RN-ABA-04, nunca fabricar) ─
test("km/L honesto: '—' para null, 0 e negativo; valor real formatado em pt-BR", async () => {
  const { formatKmPerLiter } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  assert.equal(formatKmPerLiter(null), "—");
  assert.equal(formatKmPerLiter(undefined), "—");
  assert.equal(formatKmPerLiter(0), "—"); // consumo zerado fabricado nunca aparece
  assert.equal(formatKmPerLiter(-3.2), "—"); // Δodômetro ≤ 0 → honesto "—"
  assert.match(formatKmPerLiter(9.8), /9,80/);
});

// ── Rótulos PT-BR (§3) + Valor Unitário derivado ─────────────────────────────
test("rótulos PT-BR: stationType → Interno/Externo; Valor Unitário derivado de valor ÷ litros", async () => {
  const { getStationTypeLabel, formatUnitValue, STATION_TYPE_OPTIONS } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  assert.equal(getStationTypeLabel("internal"), "Interno");
  assert.equal(getStationTypeLabel("external"), "Externo");
  assert.equal(getStationTypeLabel(null), "—");
  assert.deepEqual(
    STATION_TYPE_OPTIONS.map((option) => option.label),
    ["Externo", "Interno (posto próprio)"],
  );

  assert.match(formatUnitValue(312.9, 58.5), /R\$/);
  assert.match(formatUnitValue(312.9, 58.5), /\/L/);
  assert.equal(formatUnitValue(100, 0), "—"); // sem litros → não divide por zero
  assert.equal(formatUnitValue(null, 10), "—");
});

// ── §2.8: adapter projeta stationType/supplierId/supplierName; nunca tenant_id ─
test("§2.8: adapter mapeia posto/fornecedor (nome como label) e nunca projeta tenant_id", async () => {
  const { adaptFuelLogResponse } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const external = adaptFuelLogResponse({
    data: {
      id: "fl-1",
      vehicle_id: "veh-1",
      station_type: "external",
      supplier_id: "sup-9",
      supplier_name: "Posto Central",
      tenant_id: "ten-secret",
    },
  });
  assert.ok(external);
  assert.equal(external.stationType, "external");
  assert.equal(external.supplierId, "sup-9");
  assert.equal(external.supplierName, "Posto Central");
  const serialized = JSON.stringify(external);
  assert.doesNotMatch(serialized, /tenant_id|ten-secret/i);

  // Interno: sem fornecedor; default external quando o termo vem ausente (compat legado).
  const internal = adaptFuelLogResponse({ data: { id: "fl-2", vehicleId: "veh-1", stationType: "internal" } });
  assert.equal(internal?.stationType, "internal");
  assert.equal(internal?.supplierId, null);
  assert.equal(internal?.supplierName, null);

  const legacy = adaptFuelLogResponse({ data: { id: "fl-3", vehicleId: "veh-1" } });
  assert.equal(legacy?.stationType, "external");
});
