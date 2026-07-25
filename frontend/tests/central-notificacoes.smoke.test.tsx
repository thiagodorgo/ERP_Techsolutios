import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptCentral } from "../src/modules/notifications/scheduled-notification.adapter";
import {
  CentralNotificacoesView,
  type CentralNotificacoesViewProps,
} from "../src/modules/notifications/pages/CentralNotificacoesPage";
import type { CentralScheduledNotificationView } from "../src/modules/notifications/scheduled-notification.types";

// Ω4C PR-20 (D-Ω4C-NOTIF-CENTRAL-SPLIT) — Central de Notificações (tenant-wide). Cobre: render + colunas da
// lista densa (PT-BR), filtros situação+período, empty honesto (D-007), acesso não permitido (403), §2.8
// (injeção de campos sensíveis ausente no DOM), Excluir só em pendente, botão "Cadastrar notificação"
// (gating por notifications:create), PT-BR de negócio (§3/§11) e o gate real do backend (PermissionGuard).

// ── View pura: dados injetados (SSR-testável, como CreateNotificationForm) ────────
const PENDING_MINE: CentralScheduledNotificationView = {
  id: "aaaaaaaa-1111-4111-8111-111111111111",
  title: "Revisão dos 10.000 km",
  message: "Agendar revisão da viatura ABC-1D34",
  notifyAt: "2026-08-01T13:00:00.000Z",
  remindBeforeMinutes: 60,
  visibility: "public",
  status: "pending",
  sourceType: "maintenance_item",
  createdAt: "2026-07-20T00:00:00.000Z",
  mine: true,
};

const FIRED_OTHER: CentralScheduledNotificationView = {
  id: "bbbbbbbb-1111-4111-8111-111111111111",
  title: "Vencimento de multa",
  message: "Multa do veículo XYZ-9K88 vence amanhã",
  notifyAt: "2026-07-15T09:00:00.000Z",
  remindBeforeMinutes: null,
  visibility: "private",
  status: "fired",
  sourceType: "fine",
  createdAt: "2026-07-10T00:00:00.000Z",
  mine: false,
};

const CANCELLED_OTHER: CentralScheduledNotificationView = {
  ...FIRED_OTHER,
  id: "cccccccc-1111-4111-8111-111111111111",
  title: "Renovação de seguro",
  status: "cancelled",
  sourceType: "insurance_policy",
};

function renderView(overrides: Partial<CentralNotificacoesViewProps> = {}): string {
  const base: CentralNotificacoesViewProps = {
    items: [],
    loading: false,
    isRefreshing: false,
    forbidden: false,
    error: null,
    feedback: null,
    statusFilter: "all",
    from: "",
    to: "",
    canCreate: true,
    cancelingId: null,
    onStatusFilterChange: () => {},
    onFromChange: () => {},
    onToChange: () => {},
    onCreateClick: () => {},
    onCancelItem: () => {},
    onRetry: () => {},
  };
  return renderToString(<CentralNotificacoesView {...base} {...overrides} />);
}

test("render: cabeçalho + colunas da lista densa com rótulos PT-BR (Origem/Situação/Tipo)", () => {
  const html = renderView({ items: [PENDING_MINE, FIRED_OTHER] });

  assert.match(html, /Central de Notificações/);
  // Colunas da dense-list.
  assert.match(html, /Título/);
  assert.match(html, /Data-alvo/);
  assert.match(html, /Antecedência/);
  assert.match(html, />Tipo</);
  assert.match(html, /Origem/);
  assert.match(html, /Situação/);
  assert.match(html, /Ações/);
  // Conteúdo das linhas.
  assert.match(html, /Revisão dos 10\.000 km/);
  assert.match(html, /Vencimento de multa/);
  // Rótulos PT-BR de NEGÓCIO (nunca o enum cru).
  assert.match(html, /Pendente/);
  assert.match(html, /Disparada/);
  assert.match(html, /Pública/);
  assert.match(html, /Privada/);
  assert.match(html, /Manutenção/);
  assert.match(html, />Multa</);
  // Chip "Você" quando mine=true.
  assert.match(html, /Você/);
  // Antecedência formatada (60 min → "1 hora antes"); ausência → "—".
  assert.match(html, /1 hora antes/);
});

test("filtros: situação (Todas/Pendentes/Disparadas/Canceladas) + período De/Até + Cadastrar à direita", () => {
  const html = renderView();

  assert.match(html, /Situação/);
  assert.match(html, /Todas/);
  assert.match(html, /Pendentes/);
  assert.match(html, /Disparadas/);
  assert.match(html, /Canceladas/);
  // Período com Input type=date (De/Até).
  assert.match(html, />De</);
  assert.match(html, />Até</);
  assert.match(html, /type="date"/);
  // Ação primária à direita (§11.4).
  assert.match(html, /Cadastrar notificação/);
});

test("empty honesto (D-007): sem linhas → 'Nenhuma notificação cadastrada', nada fabricado", () => {
  const html = renderView({ items: [], loading: false });

  assert.match(html, /Nenhuma notificação cadastrada/);
  assert.doesNotMatch(html, /Revisão dos 10\.000 km/);
});

test("acesso não permitido (403): estado dedicado, sem lista nem empty", () => {
  const html = renderView({ forbidden: true, items: [PENDING_MINE] });

  assert.match(html, /Acesso não permitido/);
  // A lista/empty NÃO aparecem quando o backend nega (a autoridade é o backend).
  assert.doesNotMatch(html, /Nenhuma notificação cadastrada/);
  assert.doesNotMatch(html, /Revisão dos 10\.000 km/);
});

test("§2.8: adaptCentral descarta campos sensíveis e nada vaza no DOM (defesa em 2 camadas, PR-14)", () => {
  // O backend PODE mandar campos sensíveis (inclusive p/ mine=true). O adapter lê SÓ o allowlist.
  const view = adaptCentral({
    id: "dddddddd-1111-4111-8111-111111111111",
    title: "Aviso sensível",
    message: "Corpo do aviso",
    notifyAt: "2026-08-10T12:00:00.000Z",
    remindBeforeMinutes: 30,
    visibility: "custom",
    status: "pending",
    sourceType: "financial_title",
    createdAt: "2026-07-22T00:00:00.000Z",
    mine: true,
    // Campos que a UI NUNCA deve carregar/renderizar:
    tenantId: "ten-secreto-xyz",
    createdBy: "usr-secreto-abc",
    clientActionId: "cli-cru-123",
    customRecipientIds: ["rcpt-secreto-1", "rcpt-secreto-2"],
    sourceId: "src-cru-999",
  });

  assert.ok(view);
  // A view não carrega nenhum campo proibido.
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /ten-secreto-xyz|tenantId/i);
  assert.doesNotMatch(serialized, /usr-secreto-abc|createdBy/i);
  assert.doesNotMatch(serialized, /cli-cru-123|clientActionId/i);
  assert.doesNotMatch(serialized, /rcpt-secreto|customRecipientIds/i);
  assert.doesNotMatch(serialized, /src-cru-999|sourceId/i);

  // E nada sensível chega ao DOM renderizado.
  const html = renderView({ items: [view] });
  assert.match(html, /Aviso sensível/); // o conteúdo legítimo aparece
  assert.doesNotMatch(html, /ten-secreto-xyz/);
  assert.doesNotMatch(html, /usr-secreto-abc/);
  assert.doesNotMatch(html, /cli-cru-123/);
  assert.doesNotMatch(html, /rcpt-secreto/);
  assert.doesNotMatch(html, /src-cru-999/);
});

test("Excluir: só em PENDENTE (fired/cancelada não exibem a ação; RN-NOTIFCEN-04)", () => {
  const pendingHtml = renderView({ items: [PENDING_MINE] });
  assert.match(pendingHtml, /Excluir/);
  // Rótulo acessível na ação de ícone (a11y).
  assert.match(pendingHtml, /Excluir notificação: Revisão dos 10\.000 km/);

  const firedHtml = renderView({ items: [FIRED_OTHER] });
  assert.doesNotMatch(firedHtml, /Excluir/);

  const cancelledHtml = renderView({ items: [CANCELLED_OTHER] });
  assert.doesNotMatch(cancelledHtml, /Excluir/);
});

test("gating de criação na view: 'Cadastrar notificação' só com canCreate", () => {
  assert.match(renderView({ canCreate: true }), /Cadastrar notificação/);
  assert.doesNotMatch(renderView({ canCreate: false }), /Cadastrar notificação/);
});

test("PT-BR de negócio (§3/§11): acentuação correta, sem 'Tenant', sem andaime de dev, sem enum cru", () => {
  const html = renderView({ items: [PENDING_MINE, CANCELLED_OTHER] });

  assert.match(html, /Notificações/);
  assert.match(html, /Situação/);
  assert.match(html, /Antecedência/);
  assert.match(html, /Origem/);
  // §3 — nunca o termo técnico "Tenant".
  assert.doesNotMatch(html, /Tenant/i);
  // §11.2 — sem andaime de dev (badge de status/código de tela/rota como subtítulo).
  assert.doesNotMatch(html, /PLANNED|TODO|WIP/);
  assert.doesNotMatch(html, /\/controle\/notificacoes/);
  // §3 — enums internos nunca viram texto na UI.
  assert.doesNotMatch(html, />pending<|>fired<|>cancelled</);
  assert.doesNotMatch(html, />maintenance_item<|>insurance_policy<|>financial_title</);
});

// ── Gate real do backend: PermissionGuard (notifications:create) + montagem do container ──
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
    confirm: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
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
      enabledModules: ["dashboard", "work-orders", "notifications"],
      scope: "branch",
    }),
  );
}

async function renderGuarded(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PermissionGuard } = await import("../src/guards/PermissionGuard");
  const { CentralNotificacoesPage } = await import("../src/modules/notifications/pages/CentralNotificacoesPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/controle/notificacoes"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PermissionGuard permissions={["notifications:create"]}>
              <CentralNotificacoesPage />
            </PermissionGuard>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("gate backend: sem notifications:create → PermissionGuard barra (acesso não autorizado)", async () => {
  const html = await renderGuarded(["notifications:read"]);

  assert.doesNotMatch(html, /Central de Notificações/);
  assert.match(html, /Acesso nao autorizado|Acesso não autorizado/);
});

test("gate backend: com notifications:create → a Central monta (empty honesto no mock, D-007)", async () => {
  const html = await renderGuarded(["notifications:read", "notifications:create"]);

  assert.match(html, /Central de Notificações/);
  assert.match(html, /Cadastrar notificação/);
});

test("sidebar: 'Central de Notificações' visível para admin; ausente do menu de finance", async () => {
  const { buildSidebarNav } = await import("../src/layouts/appSidebarNav");

  const adminGroups = buildSidebarNav(["Administrador"]);
  const adminItems = adminGroups.flatMap((group) => group.items);
  assert.ok(adminItems.some((item) => item.path === "/controle/notificacoes"));
  assert.ok(adminItems.some((item) => item.label === "Central de Notificações"));

  const financeItems = buildSidebarNav(["Financeiro"]).flatMap((group) => group.items);
  assert.equal(
    financeItems.some((item) => item.path === "/controle/notificacoes"),
    false,
  );
});
