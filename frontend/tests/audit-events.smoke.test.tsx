import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptAuditEvents } from "../src/modules/audit/audit-events.adapter";
import { getAuditEvents } from "../src/modules/audit/audit-events.service";

// PR-SCALE-3 — a tela "Auditoria da organização" agora consome GET /api/v1/audit-events (gate backend
// `audit.read`) em vez de FABRICAR dados (violava D-007). Este teste prova: (a) o adapter defensivo
// (descarte de item inválido, tenant_id NUNCA no view §2.8, ordenação desc); (b) modo mock → lista
// vazia honesta (source "mock"); (c) 403 → forbidden (source "fallback"); (d) o render da página em
// modo mock mostra o estado honesto — SEM os dados fabricados antigos (Carla Mendes / "312" /
// "Concluiu OS-2891").

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

// ── (a) adapter defensivo ─────────────────────────────────────────────────────────────────────────
test("adaptAuditEvents: descarta item sem id/action e NUNCA expõe tenant_id no view (§2.8, D-007)", () => {
  const views = adaptAuditEvents([
    { id: "e1", action: "user.login", actor_user_id: "usr-1", tenant_id: "ten-secreto-01", timestamp: "2026-07-15T12:00:00Z" },
    { action: "sem.id", actor_user_id: "usr-2", timestamp: "2026-07-15T12:01:00Z" }, // sem id → descartado
    { id: "e3", actor_user_id: "usr-3", timestamp: "2026-07-15T12:02:00Z" }, // sem action → descartado
    "lixo", // não-objeto → descartado
    null,
  ]);

  assert.equal(views.length, 1);
  const [only] = views;
  assert.equal(only.id, "e1");
  assert.equal(only.actor, "usr-1"); // actor_user_id honesto, sem nome inventado
  assert.equal(only.action, "user.login");
  // §2.8: o view não tem o campo tenant_id e o valor secreto não vaza em nenhuma serialização.
  assert.equal("tenant_id" in only, false);
  assert.doesNotMatch(JSON.stringify(views), /ten-secreto-01/);
});

test("adaptAuditEvents: ordena por instante DESC (mais recente primeiro); ausência de ator → 'Sistema'", () => {
  const views = adaptAuditEvents([
    { id: "antigo", action: "a.old", actor_user_id: "usr-1", timestamp: "2026-07-15T08:00:00Z" },
    { id: "recente", action: "a.new", timestamp: "2026-07-15T09:00:00Z" }, // sem actor_user_id
    { id: "meio", action: "a.mid", actor_user_id: "usr-2", timestamp: "2026-07-15T08:30:00Z" },
  ]);

  assert.deepEqual(views.map((v) => v.id), ["recente", "meio", "antigo"]);
  assert.equal(views[0].actor, "Sistema"); // sem ator humano → rótulo, não nome inventado
  assert.match(views[0].whenIso, /^2026-07-15T09:00:00/);
});

// ── (a2) presenter (PR-C TELAS PADRONIZADAS) — rótulos PT-BR, agrupamento por dia e KPIs ─────────
test("presenter: action real → rótulo PT-BR humanizado; desconhecida → genérico honesto (nunca a string técnica)", async () => {
  const { auditActionMeta } = await import("../src/modules/audit/audit-events.presenter");

  assert.equal(auditActionMeta("auth.login.success").label, "Entrou no sistema");
  assert.equal(auditActionMeta("auth.refresh.success").label, "Sessão renovada");
  assert.equal(auditActionMeta("auth.session.revoked").label, "Sessão encerrada pelo sistema");
  assert.equal(auditActionMeta("auth.login.failed").label, "Tentativa de acesso recusada");
  // Humanização genérica entidade.verbo (com gênero correto — PT-BR de negócio).
  assert.equal(auditActionMeta("work_order.created").label, "Ordem de serviço criada");
  assert.equal(auditActionMeta("customer.created").label, "Cliente criado");
  // Ação fora do dicionário → rótulo genérico honesto, jamais a chave técnica crua.
  const unknown = auditActionMeta("acao.super_exotica");
  assert.equal(unknown.label, "Atividade registrada no sistema");
  assert.doesNotMatch(unknown.label, /acao\.super_exotica/);
});

test("presenter: agrupa por dia (America/Sao_Paulo) com HOJE/ONTEM e deriva KPIs só dos eventos reais", async () => {
  const { computeAuditKpis, groupAuditEventsByDay, auditActorPresentation } = await import(
    "../src/modules/audit/audit-events.presenter"
  );
  const { adaptAuditEvents } = await import("../src/modules/audit/audit-events.adapter");

  // "Agora" fixo (12:00 UTC = 09:00 em São Paulo) para rótulos determinísticos.
  const now = new Date("2026-08-04T12:00:00Z");
  const events = adaptAuditEvents([
    { id: "e1", action: "auth.login.success", actor_user_id: "usr-1", timestamp: "2026-08-04T11:00:00Z" },
    { id: "e2", action: "auth.session.revoked", actor_user_id: "usr-1", timestamp: "2026-08-04T10:00:00Z" },
    { id: "e3", action: "auth.login.failed", timestamp: "2026-08-03T10:00:00Z" },
    { id: "e4", action: "auth.logout", actor_user_id: "usr-2", timestamp: "2026-08-01T10:00:00Z" },
  ]);

  const groups = groupAuditEventsByDay(events, now);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].label, "HOJE · 4 DE AGOSTO");
  assert.equal(groups[1].label, "ONTEM · 3 DE AGOSTO");
  assert.equal(groups[2].label, "1 DE AGOSTO");
  assert.deepEqual(groups[0].events.map((event) => event.id), ["e1", "e2"]);

  const kpis = computeAuditKpis(events);
  assert.equal(kpis.total, 4);
  assert.equal(kpis.logins, 1);
  assert.equal(kpis.loginActors, 1);
  assert.equal(kpis.ended, 2); // logout + revogada pelo sistema
  assert.equal(kpis.endedBySystem, 1);
  assert.equal(kpis.denied, 1);

  // QUEM sem nome no DTO (§2.8): apresentação "Usuário" com cor determinística — NUNCA UUID cru;
  // ator ausente → "Sistema" (rótulo do adapter preservado).
  const human = auditActorPresentation("usr-1");
  assert.equal(human.name, "Usuário");
  assert.equal(human.isSystem, false);
  assert.deepEqual(auditActorPresentation("usr-1"), human); // determinístico por ator
  assert.equal(auditActorPresentation("Sistema").isSystem, true);
});

// ── (b) service em modo mock ──────────────────────────────────────────────────────────────────────
test("getAuditEvents em modo mock: source 'mock', lista vazia (não fabrica evento)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getAuditEvents({});
    assert.equal(data.source, "mock");
    assert.equal(data.events.length, 0);
    assert.equal(data.forbidden, false);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (c) service com 403 do gate ───────────────────────────────────────────────────────────────────
test("getAuditEvents com 403: forbidden=true, source 'fallback' (gate audit.read)", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getAuditEvents({});
    assert.equal(data.forbidden, true);
    assert.equal(data.source, "fallback");
    assert.equal(data.events.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (d) render da página em modo mock ─────────────────────────────────────────────────────────────
async function renderAudit(email = "auditor.web@techsolutions.example"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { AuditTenantPage } = await import("../src/modules/audit/pages/AuditTenantPage");

  setStoredAuthSession(mockSessionForEmail(email));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Auditor",
      permissions: ["audit:view"],
      enabledModules: ["dashboard"],
      scope: "branch",
    }),
  );

  return renderToString(
    <MemoryRouter initialEntries={["/audit"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <AuditTenantPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("auditoria: em modo mock mostra o estado honesto e NÃO fabrica eventos", async () => {
  const html = await renderAudit();

  // cabeçalho honesto presente
  assert.match(html, /Auditoria/);
  // estado vazio honesto (modo demonstração não tem auditoria real)
  assert.match(html, /Sem eventos de auditoria/);

  // AUSÊNCIA dos dados fabricados antigos (atores, ações e KPIs inventados)
  assert.doesNotMatch(html, /Carla Mendes|Bruno Lima|Helena Castro/);
  assert.doesNotMatch(html, /Concluiu OS-2891|Publicou checklist v4/);
  assert.doesNotMatch(html, /312|84 logins/);
  process.env.VITE_USE_MOCKS = "";
});
