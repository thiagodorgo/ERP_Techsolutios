import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { getOperationalApproval, rejectOperationalApproval } from "../src/modules/work-orders/approval.service";
import type { OperationalApproval } from "../src/modules/work-orders/approval.types";
import { loadApprovalsQueue } from "../src/modules/work-orders/useApprovalsQueue";
import { ApprovalsQueueContent, formatPendingAge } from "../src/modules/work-orders/pages/ApprovalsPage";
import { ApprovalDetailView } from "../src/modules/work-orders/pages/ApprovalDetailPage";

// Onda 1 — a "Fila de Aprovações" e o detalhe agora consomem a fonte REAL (GET /api/v1/approvals/pending
// e /approvals/:approvalId) em vez de FABRICAR (violava D-007). Este teste prova: (a) modo mock → estado
// honesto; (b) AUSÊNCIA dos fabricados antigos (R$, "APR-0040", nome inventado, "acima da alçada",
// "Diretoria", "Solicitar revisão"); (c) gating — sem work_orders:cancel/approve não vê Aprovar/Recusar
// (mostra "sem permissão"), com → vê; (d) vazio → EmptyState "Sem aprovações pendentes"; (e) 403 → acesso
// não permitido; (f) o detalhe lê :approvalId via useParams; (g) recusa sem motivo é bloqueada
// client-side; (h) a idade "Pendente há X" vem do requested_at REAL.

const NOW = new Date("2026-07-21T12:00:00Z");

function sampleApproval(overrides: Partial<OperationalApproval> = {}): OperationalApproval {
  return {
    id: "apr-real-1",
    entityType: "work_order",
    entityId: "wo-real-1",
    workOrderId: "wo-real-1",
    status: "pending_approval",
    requestedBy: "usr-solicitante-01",
    requestedAt: new Date(NOW.getTime() - 2 * 3_600_000).toISOString(), // 2 h atrás
    pendingReason: "Ordem de serviço concluída e pronta para validação operacional.",
    safeMessage: "Aprovação pendente.",
    ...overrides,
  };
}

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
}

const browser = installBrowserTestGlobals();

// ── Marcadores dos dados FABRICADOS antigos — devem SUMIR de qualquer render (D-007) ────────────────
function assertNoFabricated(html: string) {
  assert.doesNotMatch(html, /R\$/); // valor em R$
  assert.doesNotMatch(html, /APR-00\d\d/); // código "APR-00xx"
  assert.doesNotMatch(html, /Bruno Lima|Carla Mendes|Rafael Silva/); // nome inventado do solicitante
  assert.doesNotMatch(html, /acima da alçada|alçada/i); // threshold/alçada
  assert.doesNotMatch(html, /Diretoria/); // trilha de 3 passos
  assert.doesNotMatch(html, /Solicitar revisão/); // botão fabricado
  assert.doesNotMatch(html, /Centro de custo|Itens do pedido|Trilha de aprovação/); // seções fabricadas
}

// ── (b/c/h) render do card com dado real: chips honestos, idade real, gating ─────────────────────────
function renderQueue(items: OperationalApproval[], canDecide: boolean): string {
  return renderToString(
    <MemoryRouter initialEntries={["/approvals"]}>
      <ApprovalsQueueContent items={items} loading={false} forbidden={false} source="api" canDecide={canDecide} context={{}} onChanged={() => {}} now={NOW} />
    </MemoryRouter>,
  );
}

test("(c) gating — COM work_orders:cancel/approve o card mostra Aprovar e Recusar", () => {
  const html = renderQueue([sampleApproval()], true);
  assert.match(html, /Aprovar/);
  assert.match(html, /Recusar/);
  // §3 PT-BR — rótulo do tipo, não o enum cru; solicitante é o UUID honesto (sem nome inventado).
  assert.match(html, /Ordem de serviço/);
  assert.match(html, /usr-solicitante-01/);
  assertNoFabricated(html);
});

test("(c) gating — SEM permissão o card esconde Aprovar/Recusar e mostra 'sem permissão'", () => {
  const html = renderQueue([sampleApproval()], false);
  assert.doesNotMatch(html, /Aprovar<|>Aprovar|Recusar/);
  assert.match(html, /não tem permissão para decidir/);
  assertNoFabricated(html);
});

test("(h) idade — 'Pendente há X' vem do requested_at REAL (tempo decorrido, não um prazo)", () => {
  // 2 h atrás → "Pendente há 2 h" (tom normal); > 24 h → tom de atenção (âmbar).
  const recent = formatPendingAge(new Date(NOW.getTime() - 2 * 3_600_000).toISOString(), NOW);
  assert.equal(recent.label, "Pendente há 2 h");
  assert.equal(recent.tone, "normal");

  const old = formatPendingAge(new Date(NOW.getTime() - 30 * 3_600_000).toISOString(), NOW);
  assert.match(old.label, /^Pendente há 1 dia/);
  assert.equal(old.tone, "warn");

  // aparece no render do card
  const html = renderQueue([sampleApproval()], true);
  assert.match(html, /Pendente há/);
});

// ── (d) vazio → EmptyState honesto ──────────────────────────────────────────────────────────────────
test("(d) vazio — sem aprovações a fila mostra o EmptyState honesto (nada fabricado)", () => {
  const html = renderQueue([], true);
  assert.match(html, /Fila de Aprovações/);
  assert.match(html, /Sem aprovações pendentes/);
  assertNoFabricated(html);
});

// ── (e) 403 → ErrorState "Acesso não permitido" (render) + camada de dados (loader) ─────────────────
test("(e) forbidden — 403 do gate work_orders:read mostra 'Acesso não permitido'", () => {
  const html = renderToString(
    <MemoryRouter initialEntries={["/approvals"]}>
      <ApprovalsQueueContent items={[]} loading={false} forbidden source="fallback" canDecide context={{}} onChanged={() => {}} />
    </MemoryRouter>,
  );
  assert.match(html, /Acesso não permitido/);
  assertNoFabricated(html);
});

test("(e) loader — loadApprovalsQueue com 403 → forbidden=true, source 'fallback', sem item", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const result = await loadApprovalsQueue({});
    assert.equal(result.forbidden, true);
    assert.equal(result.source, "fallback");
    assert.equal(result.items.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("loader — erro de sistema (500) → fallback SEM forbidden (auto-refresh tenta de novo)", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
  try {
    const result = await loadApprovalsQueue({});
    assert.equal(result.forbidden, false);
    assert.equal(result.source, "fallback");
    assert.equal(result.items.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("(a) loader — modo mock → source 'mock', só campos reais do DTO (nada fabricado)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const result = await loadApprovalsQueue({});
    assert.equal(result.source, "mock");
    assert.doesNotMatch(JSON.stringify(result), /R\$|APR-00\d\d|acima da alçada|Diretoria/);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (g) recusa sem motivo é bloqueada ANTES da rede (o backend responde 400 sem `reason`) ───────────
test("(g) recusa sem motivo é bloqueada client-side (rejectOperationalApproval lança sem chamar a rede)", async () => {
  let fetched = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  process.env.VITE_USE_MOCKS = "";
  try {
    await assert.rejects(() => rejectOperationalApproval({}, "apr-real-1", "   "), /approval_rejection_reason_required/);
    assert.equal(fetched, false); // nunca tocou a rede — bloqueio client-side
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (f) detalhe: lê :approvalId via useParams; render honesto do painel de decisão ──────────────────
test("(f) getOperationalApproval em modo mock devolve a aprovação da id pedida (fluxo do :approvalId)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const approval = await getOperationalApproval({}, "apr-da-rota-42");
    assert.equal(approval.id, "apr-da-rota-42");
    assert.equal(approval.status, "pending_approval");
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("(f) o detalhe monta na rota /approvals/:approvalId e não renderiza nada fabricado", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ApprovalDetailPage } = await import("../src/modules/work-orders/pages/ApprovalDetailPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: "ten-industrial-01", tenantName: "Techsolutions Industrial", tenantStatus: "active", branchId: "fil-sp-01", branchName: "Sao Paulo", role: "Gestor Operacional", permissions: ["work_orders:read", "work_orders:cancel"], enabledModules: ["work-orders"], scope: "branch" }),
  );

  const html = renderToString(
    <MemoryRouter initialEntries={["/approvals/apr-da-rota-42"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Routes>
              <Route path="/approvals/:approvalId" element={<ApprovalDetailPage />} />
            </Routes>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  assert.match(html, /Voltar à fila/); // a página montou na rota do :approvalId
  assertNoFabricated(html);
  process.env.VITE_USE_MOCKS = "";
});

test("(f/b/c) ApprovalDetailView com dado real: painel de decisão honesto, sem fabricados, gating", () => {
  const withDecide = renderToString(
    <MemoryRouter initialEntries={["/approvals/apr-real-1"]}>
      <ApprovalDetailView approval={sampleApproval()} context={{}} canDecide now={NOW} />
    </MemoryRouter>,
  );
  assert.match(withDecide, /Aprovação operacional/);
  assert.match(withDecide, /Ordem de serviço/); // rótulo PT-BR do tipo
  assert.match(withDecide, /usr-solicitante-01/); // solicitante = UUID honesto
  assert.match(withDecide, /Pendente há 2 h/); // idade real
  assert.match(withDecide, /Aprovar/);
  assert.match(withDecide, /Recusar/);
  assertNoFabricated(withDecide);

  const noDecide = renderToString(
    <MemoryRouter initialEntries={["/approvals/apr-real-1"]}>
      <ApprovalDetailView approval={sampleApproval()} context={{}} canDecide={false} now={NOW} />
    </MemoryRouter>,
  );
  assert.match(noDecide, /não tem permissão para decidir/);
  assert.doesNotMatch(noDecide, />Aprovar<|>Recusar</);
});

// ── (a) render da página completa em modo mock → estado honesto ─────────────────────────────────────
test("(a) a Fila em modo mock mostra o estado honesto e NÃO fabrica aprovações", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ApprovalsPage } = await import("../src/modules/work-orders/pages/ApprovalsPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: "ten-industrial-01", tenantName: "Techsolutions Industrial", tenantStatus: "active", branchId: "fil-sp-01", branchName: "Sao Paulo", role: "Gestor Operacional", permissions: ["work_orders:read", "work_orders:cancel"], enabledModules: ["work-orders"], scope: "branch" }),
  );

  const html = renderToString(
    <MemoryRouter initialEntries={["/approvals"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <ApprovalsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  assert.match(html, /Fila de Aprovações/);
  assert.match(html, /Sem aprovações pendentes/); // 1ª carga honesta (efeito de dados roda no cliente)
  assertNoFabricated(html);
  process.env.VITE_USE_MOCKS = "";
});
