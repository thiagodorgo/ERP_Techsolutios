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

async function renderPerfis(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PerfisPage } = await import("../src/modules/patios/profiles/pages/PerfisPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/perfis"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PerfisPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("perfis normativos renderiza cabeçalho, filtro de escopo, ação de criar e estado vazio honesto (D-007)", async () => {
  const html = await renderPerfis(["jurisdiction:read", "jurisdiction:create", "jurisdiction:update"]);

  assert.match(html, /Perfis Normativos/);
  assert.match(html, /prazos, modelo e teto de diária/);
  assert.match(html, /Novo perfil/);
  assert.match(html, /Nenhum perfil normativo cadastrado/);
  // Filtro de escopo em PT-BR de negócio (white-label; nunca "tenant"/"polícia").
  assert.match(html, /Convênio público/);
  assert.match(html, /Contrato privado/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("perfis normativos esconde 'Novo perfil' sem a permissão jurisdiction:create", async () => {
  const html = await renderPerfis(["jurisdiction:read"]);

  assert.match(html, /Perfis Normativos/);
  assert.match(html, /Nenhum perfil normativo cadastrado/);
  assert.doesNotMatch(html, /Novo perfil/);
});

test("modal de novo perfil: labels PT-BR de escopo/diária/teto + pré-preenchimento federal 10/30/60/15", async () => {
  const { PerfilFormModal } = await import("../src/modules/patios/profiles/components/PerfilFormModal");
  const html = renderToString(<PerfilFormModal profile={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo perfil normativo/);
  // Escopo / modelo / teto de diária em PT-BR.
  assert.match(html, /Convênio público/);
  assert.match(html, /Contrato privado/);
  assert.match(html, /Modelo de diária/);
  assert.match(html, /24 horas corridas/);
  assert.match(html, /Dia-calendário/);
  assert.match(html, /Teto de estada/);
  assert.match(html, /6 meses/);
  assert.match(html, /Ilimitado/);
  // Prazos legais federais pré-preenchidos (GET /jurisdiction-defaults; mock → baseline federal local).
  assert.match(html, /Notificação ao proprietário/);
  assert.match(html, /Elegível a leilão/);
  assert.match(html, /value="10"/);
  assert.match(html, /value="30"/);
  assert.match(html, /value="60"/);
  assert.match(html, /value="15"/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("modal de novo perfil: editor de exigências de liberação (baseline federal + adicionar), coluna nasce vazia", async () => {
  const { PerfilFormModal } = await import("../src/modules/patios/profiles/components/PerfilFormModal");
  const html = renderToString(<PerfilFormModal profile={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Exigências de liberação/);
  assert.match(html, /Usar baseline federal/);
  assert.match(html, /Adicionar exigência/);
  // D-Ω5P-JUR-04 — a coluna nasce vazia (documentos variam por órgão).
  assert.match(html, /Nenhuma exigência definida/);
});

test("modal de edição desabilita o nome (chave natural imutável — lição veto B2)", async () => {
  const { PerfilFormModal } = await import("../src/modules/patios/profiles/components/PerfilFormModal");
  const detail = {
    id: "prof-1",
    name: "Convênio Estadual",
    scope: "PUBLIC_AGREEMENT" as const,
    scopeLabel: "Convênio público",
    dailyModel: "ROLLING_24H" as const,
    dailyCap: "SIX_MONTHS" as const,
    dailyCapLabel: "6 meses (art. 271 §10)",
    dailyModelLabel: "24 horas corridas",
    active: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    ownerNotifDays: 10,
    noticeEdictDay: 30,
    auctionEligibleDay: 60,
    auctionEdictBusinessDays: 15,
    releaseRequirements: [],
    notes: null,
  };
  const html = renderToString(<PerfilFormModal profile={detail} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar perfil normativo/);
  assert.match(html, /Fixo após a criação/);
  // Só o input de nome sai desabilitado.
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 1);
});
