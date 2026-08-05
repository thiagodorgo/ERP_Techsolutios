import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

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

async function renderPatios(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PatiosPage } = await import("../src/modules/patios/yards/pages/PatiosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/patios"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PatiosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("pátios renderiza cabeçalho, tabs de situação, ação de criar e estado vazio honesto (D-007)", async () => {
  const html = await renderPatios(["yard:read", "yard:create", "yard:update"]);

  assert.match(html, /Pátios/);
  // TELAS PR-D — padrão do protótipo: kicker + subtítulo novo (locais de guarda).
  assert.match(html, /Locais de guarda da organização/);
  assert.match(html, /Novo pátio/);
  assert.match(html, /Nenhum pátio encontrado/);
  // KPIs de decisão (contagens reais; janela vazia → zeros honestos, nunca fabricação).
  assert.match(html, /Pátios ativos/);
  // Sem impound:read no teste, os KPIs de custódia/ocupação DEGRADAM honestamente para o cadastro.
  assert.match(html, /Capacidade prevista/);
  assert.match(html, /sem acesso à custódia/);
  // A coluna acompanha a degradação (sem resumo de ocupação → capacidade prevista).
  assert.match(html, /CAPACIDADE PREVISTA/);
  // Situação em PT-BR de negócio (linguagem white-label).
  assert.match(html, /Ativos/);
  assert.match(html, /Inativos/);
  // D-007: modo mock não fabrica linhas.
  assert.doesNotMatch(html, /Pátio Central|yard-1/);
});

test("pátios esconde 'Novo pátio' sem a permissão yard:create", async () => {
  const html = await renderPatios(["yard:read"]);

  assert.match(html, /Pátios/);
  assert.match(html, /Nenhum pátio encontrado/);
  // Esconde-fino: sem yard:create não há botão no header NEM no convite honesto (o backend é a autoridade).
  assert.doesNotMatch(html, /Novo pátio/);
});

test("pátios: linguagem white-label — nunca 'tenant' nem 'polícia'; §allowlist não vaza tenant_id/branchId", async () => {
  const html = await renderPatios(["yard:read", "yard:create", "yard:update"]);

  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  // §2.8 allowlist: o identificador técnico do tenant/filial nunca é renderizado como dado.
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});

test("modal de novo pátio traz o fuso horário padrão America/Sao_Paulo", async () => {
  const { YardFormModal } = await import("../src/modules/patios/yards/components/YardFormModal");
  const html = renderToString(<YardFormModal yard={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo pátio/);
  assert.match(html, /America\/Sao_Paulo/);
  assert.match(html, /Fuso horário/);
  assert.doesNotMatch(html, /\btenant\b/i);
});

// TELAS PR-D (junta) — funções puras da tela: KPIs do cadastro, faixa de ocupação e o gate do convite honesto.
test("PR-D: computeYardKpis deriva só do que existe; shouldShowInvite exige 1 pátio REAL, sem filtro e com permissão", async () => {
  const { computeYardKpis, shouldShowInvite, occupancyTone } = await import("../src/modules/patios/yards/pages/PatiosPage");

  const kpis = computeYardKpis([
    { id: "a", name: "A", address: "", capacityHint: 40, timezone: "America/Sao_Paulo", active: true, createdAt: "", updatedAt: "" },
    { id: "b", name: "B", address: "", capacityHint: null, timezone: "America/Sao_Paulo", active: true, createdAt: "", updatedAt: "" },
    { id: "c", name: "C", address: "", capacityHint: 10, timezone: "America/Sao_Paulo", active: false, createdAt: "", updatedAt: "" },
  ]);
  assert.equal(kpis.total, 3);
  assert.equal(kpis.ativos, 2);
  assert.equal(kpis.inativos, 1);
  assert.equal(kpis.capacidadePrevista, 40, "soma só a capacidade dos ATIVOS informados");
  assert.equal(kpis.semCapacidade, 1);

  const base = { canCreate: true, loading: false, error: null, serverTotal: 1, hasActiveFilters: false };
  assert.equal(shouldShowInvite(base), true);
  assert.equal(shouldShowInvite({ ...base, canCreate: false }), false, "sem yard:create o convite não vira beco sem saída");
  assert.equal(shouldShowInvite({ ...base, serverTotal: 12 }), false, "usa o total do SERVIDOR, não o da janela");
  assert.equal(shouldShowInvite({ ...base, hasActiveFilters: true }), false);
  assert.equal(shouldShowInvite({ ...base, error: "falhou" }), false);

  // Faixas do protótipo: saudável < 60 ≤ atenção ≤ 85 < crítica.
  assert.equal(occupancyTone(35).bar, "#22C55E");
  assert.equal(occupancyTone(70).bar, "#F59E0B");
  assert.equal(occupancyTone(92).bar, "#DC2626");
});
