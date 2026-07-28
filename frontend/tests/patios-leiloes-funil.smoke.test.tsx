import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { ProcessDetail } from "../src/modules/patios/processes/processes.types";

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

const TENANT_ID = "ten-industrial-01";
const BRANCH_ID = "fil-sp-01";

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: BRANCH_ID,
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderLeiloes(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { LeiloesPage } = await import("../src/modules/patios/auction/pages/LeiloesPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/leiloes"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <LeiloesPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function buildProcess(): ProcessDetail {
  return {
    id: "proc-1",
    vehiclePlate: "ABC1D23",
    vehicleUnidentified: false,
    yardId: "yard-1",
    profileId: "prof-1",
    status: "AUCTION_ELIGIBLE",
    statusLabel: "Elegível a leilão",
    enteredAt: "2026-04-01T08:00:00.000Z",
    frozenAt: null,
    originAuthority: "Autoridade solicitante municipal",
    custodySeqHead: 5,
    createdAt: "2026-04-01T08:00:00.000Z",
    vehicleChassis: null,
    vehicleRenavam: null,
    vehicleBrand: "Fiat",
    vehicleModel: "Uno",
    vehicleColor: null,
    vehicleYear: null,
    unidentifiedReason: null,
    originAgentName: null,
    authorityCaseNumber: null,
    incidentReportNumber: null,
    legalBasis: null,
    serviceOrderId: null,
    custodyHashHead: null,
    updatedAt: "2026-04-01T08:00:00.000Z",
  };
}

async function renderPanel(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { AuctionPanel } = await import("../src/modules/patios/auction/components/AuctionPanel");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/processos/proc-1"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <AuctionPanel process={buildProcess()} context={{ tenantId: TENANT_ID, branchId: BRANCH_ID, permissions: [...permissions] }} onDone={() => {}} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// ── Funil /patios/leiloes ────────────────────────────────────────────────────────────────────────────────────────
test("leilões: cabeçalho + subtítulo + busca + os 6 cards do funil (§11 page-header, funil vivo)", async () => {
  const html = await renderLeiloes(["impound:read"]);
  assert.match(html, /Leilões/);
  assert.match(html, /Funil do leilão administrativo/);
  assert.match(html, /Buscar por placa ou autoridade/);
  // Os 6 selos semânticos do funil.
  assert.match(html, /Elegíveis/);
  assert.match(html, /Em preparação/);
  assert.match(html, /Loteados/);
  assert.match(html, /Arrematados/);
  assert.match(html, /Encerrados/);
  assert.match(html, /Reciclagem/);
});

test("leilões: estado vazio honesto (D-007) — modo mock não fabrica processos em leilão", async () => {
  const html = await renderLeiloes(["impound:read"]);
  assert.match(html, /Nenhum processo em leilão/);
  assert.doesNotMatch(html, /ABC-?1234|proc-1/);
});

test("leilões: white-label — nunca 'tenant' nem 'polícia'; §allowlist não vaza tenant_id/branchId", async () => {
  const html = await renderLeiloes(["impound:read"]);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});

// ── AuctionPanel no dossiê — estados denied/indisponível + white-label ───────────────────────────────────────────
test("painel: acesso-negado (sem impound:read) mostra 'Sem acesso ao leilão'", async () => {
  const html = await renderPanel([]);
  assert.match(html, /Sem acesso ao leilão/);
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("painel: com impound:read em modo mock — empty honesto (D-007: não fabrica leilão)", async () => {
  const html = await renderPanel(["impound:read"]);
  assert.match(html, /Leilão indisponível/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
});
