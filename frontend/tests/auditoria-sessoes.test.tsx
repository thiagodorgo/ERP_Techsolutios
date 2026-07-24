import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildCsv } from "../src/lib/csv";
import { getAuditEvents } from "../src/modules/audit/audit-events.service";
import {
  SESSION_REVOKE_CAVEAT,
  adaptAccesses,
  adaptSessions,
  formatWhen,
  getSessionStatusLabel,
  interpretRevokeError,
  shouldOfferRevoke,
} from "../src/modules/sessions/sessions.adapter";
import { getActiveSessions, revokeSession } from "../src/modules/sessions/sessions.service";

// Ω4C PR-11 — Auditoria global (Logs com filtros/paginação server-side) + Sessões com revogação REAL +
// Acessos. Prova: (a) §2.8/LGPD — o front NUNCA carrega refresh_token_hash/ip_address/tenant_id/token;
// (b) filtros/paginação server-side de Logs; (c) CSV exporta só o dado real (util compartilhado);
// (d) gating do botão "Revogar" por sessions:revoke (auditor sem botão); (e) caveat honesto do JWT de 15 min;
// (f) rótulos PT-BR e estados §7 honestos.

// ── (a) §2.8 — adapter de Sessões nunca surfacea campo sensível, mesmo se o backend vazar ──────────────
test("sessões: §2.8 — adapter descarta refresh_token_hash/ip_address/tenant_id/user_id (LGPD)", () => {
  const sessions = adaptSessions([
    {
      id: "sess-1",
      userLabel: "maria@techsolutions.example",
      loginAt: "2026-07-20T12:00:00Z",
      lastActivityAt: "2026-07-20T13:00:00Z",
      deviceLabel: "Chrome · Windows",
      status: "active",
      // campos que o backend NUNCA deve enviar — se vazarem, o adapter não os propaga:
      refresh_token_hash: "hash-secreto-xyz",
      ip_address: "203.0.113.42",
      tenant_id: "ten-secreto-01",
      user_id: "usr-cru-99",
      user_agent: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120",
    },
  ]);

  assert.equal(sessions.length, 1);
  const [only] = sessions;
  assert.equal(only.id, "sess-1");
  assert.equal(only.deviceLabel, "Chrome · Windows");
  assert.ok(!("refresh_token_hash" in only));
  assert.ok(!("ip_address" in only));
  assert.ok(!("tenant_id" in only));
  assert.ok(!("user_id" in only));
  assert.ok(!("user_agent" in only));
  // Nem em nenhuma serialização o segredo/ip vaza.
  const serialized = JSON.stringify(sessions);
  assert.doesNotMatch(serialized, /hash-secreto-xyz/);
  assert.doesNotMatch(serialized, /203\.0\.113\.42/);
  assert.doesNotMatch(serialized, /ten-secreto-01/);
  assert.doesNotMatch(serialized, /Mozilla\/5\.0/);
});

test("sessões: adapter defensivo — descarta item sem id e ordena por último acesso DESC", () => {
  const sessions = adaptSessions([
    { id: "old", userLabel: "a", lastActivityAt: "2026-07-20T08:00:00Z", status: "active" },
    { userLabel: "sem-id", lastActivityAt: "2026-07-20T09:00:00Z", status: "active" }, // sem id → descartado
    { id: "new", userLabel: "b", lastActivityAt: "2026-07-20T10:00:00Z", status: "revoked" },
  ]);
  assert.deepEqual(sessions.map((s) => s.id), ["new", "old"]);
});

test("sessões: rótulos PT-BR de situação (§3)", () => {
  assert.equal(getSessionStatusLabel("active"), "Ativa");
  assert.equal(getSessionStatusLabel("revoked"), "Revogada");
  assert.equal(getSessionStatusLabel("expired"), "Expirada");
  assert.equal(getSessionStatusLabel("weird"), "—");
});

test("sessões: formatWhen determinístico e honesto para instante ausente", () => {
  assert.match(formatWhen("2026-07-20T15:30:00Z"), /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  assert.equal(formatWhen(""), "—");
  assert.equal(formatWhen(undefined), "—");
});

// ── (d) gating do "Revogar" (RN-SESS-05) — pure predicate: auditor NUNCA recebe o botão ────────────────
test("sessões: shouldOfferRevoke — só com sessions:revoke E sessão ativa (auditor sem botão)", () => {
  assert.equal(shouldOfferRevoke(true, "active"), true); // admin sobre sessão ativa
  assert.equal(shouldOfferRevoke(true, "revoked"), false); // já encerrada
  assert.equal(shouldOfferRevoke(false, "active"), false); // auditor (sem sessions:revoke) → sem botão
  assert.equal(shouldOfferRevoke(false, "revoked"), false);
});

// ── (e) caveat honesto do JWT de 15 min ────────────────────────────────────────────────────────────────
test("sessões: caveat honesto — 15 min, sem prometer logout instantâneo (D-Ω4C-SESS-REVOKE-REAL)", () => {
  assert.match(SESSION_REVOKE_CAVEAT, /15 minutos/);
  assert.doesNotMatch(SESSION_REVOKE_CAVEAT, /instant/i);
});

test("sessões: interpretRevokeError mapeia 403/404/erro genérico com mensagem honesta", () => {
  assert.match(interpretRevokeError({ status: 403 }), /permissão para revogar/);
  assert.match(interpretRevokeError({ status: 404 }), /não existe mais|já foi encerrada/);
  assert.match(interpretRevokeError(new Error("boom")), /Não foi possível revogar/);
});

// ── Acessos: §2.8 + defensivo ──────────────────────────────────────────────────────────────────────────
test("acessos: adapter só carrega usuário/quando (sem ip/tenant) e ordena DESC", () => {
  const accesses = adaptAccesses([
    { userLabel: "a@x", lastAccessAt: "2026-07-20T08:00:00Z", ip_address: "10.0.0.1" },
    { userLabel: "b@x", lastAccessAt: "2026-07-20T10:00:00Z" },
    { lastAccessAt: "2026-07-20T09:00:00Z" }, // sem userLabel → descartado
  ]);
  assert.deepEqual(accesses.map((a) => a.userLabel), ["b@x", "a@x"]);
  assert.ok(accesses.every((a) => !("ip_address" in a)));
  assert.doesNotMatch(JSON.stringify(accesses), /10\.0\.0\.1/);
});

// ── (c) CSV exporta só o dado real (util compartilhado) ────────────────────────────────────────────────
test("logs/acessos: CSV compartilhado serializa cabeçalho + linhas com separador `;`", () => {
  const csv = buildCsv(["Usuário", "Último acesso"], [["maria@x", "20/07/26 13:00"]]);
  assert.equal(csv, "Usuário;Último acesso\r\nmaria@x;20/07/26 13:00");
});

// ── (b) Logs: service em modo mock / 403 / filtros+paginação server-side ──────────────────────────────
test("logs: getAuditEvents em modo mock → lista vazia honesta (D-007)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getAuditEvents({});
    assert.equal(data.source, "mock");
    assert.equal(data.events.length, 0);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("logs: getAuditEvents envia filtros server-side e lê nextOffset do envelope", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  let seenUrl = "";
  globalThis.fetch = (async (url: string) => {
    seenUrl = String(url);
    return new Response(
      JSON.stringify({ data: [{ id: "e1", action: "auth.login.success", actor_user_id: "usr-1", timestamp: "2026-07-20T12:00:00Z" }], nextOffset: 50 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const data = await getAuditEvents({}, { action: "auth.login.success", actorId: "usr-1", from: "2026-07-01", to: "2026-07-20", limit: 50 });
    assert.match(seenUrl, /action=auth\.login\.success/);
    assert.match(seenUrl, /actorId=usr-1/);
    assert.match(seenUrl, /from=2026-07-01/);
    assert.match(seenUrl, /limit=50/);
    assert.equal(data.source, "api");
    assert.equal(data.events.length, 1);
    assert.equal(data.nextOffset, 50); // há mais → "Carregar mais" honesto
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── Sessões: service mock/403/revoke ──────────────────────────────────────────────────────────────────
test("sessões: getActiveSessions mock → vazio; 403 → forbidden (§7)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const mock = await getActiveSessions({});
    assert.equal(mock.source, "mock");
    assert.equal(mock.sessions.length, 0);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }

  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const forbidden = await getActiveSessions({});
    assert.equal(forbidden.source, "forbidden");
    assert.equal(forbidden.sessions.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("sessões: revokeSession faz POST /sessions/:id/revoke e devolve {revoked}", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  let seenUrl = "";
  let seenMethod = "";
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    seenUrl = String(url);
    seenMethod = init?.method ?? "GET";
    return new Response(JSON.stringify({ data: { revoked: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await revokeSession({}, "11111111-1111-4111-8111-111111111111");
    assert.match(seenUrl, /\/sessions\/11111111-1111-4111-8111-111111111111\/revoke$/);
    assert.equal(seenMethod, "POST");
    assert.equal(result.revoked, true);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (f) Render (SSR) — estados §7, PT-BR, gating do "Revogar" ──────────────────────────────────────────
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
      const set = listeners.get(event) ?? new Set<EventListener>();
      set.add(listener);
      listeners.set(event, set);
    },
    removeEventListener: (event: string, listener: EventListener) => listeners.get(event)?.delete(listener),
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[], role = "Gestor Operacional") {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role,
      permissions,
      enabledModules: ["dashboard"],
      scope: "branch",
    }),
  );
}

async function renderPage(component: "sessoes" | "acessos" | "auditoria", permissions: readonly string[], role?: string): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions, role);

  const Page =
    component === "sessoes"
      ? (await import("../src/modules/sessions/pages/SessoesPage")).SessoesPage
      : component === "acessos"
        ? (await import("../src/modules/sessions/pages/AcessosPage")).AcessosPage
        : (await import("../src/modules/audit/pages/AuditTenantPage")).AuditTenantPage;

  const html = renderToString(
    <MemoryRouter initialEntries={["/controle/usuarios"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Page />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  process.env.VITE_USE_MOCKS = "";
  return html;
}

test("sessões (render): auditor (sessions:read) vê a lista mas NÃO a ação de revogar", async () => {
  const html = await renderPage("sessoes", ["sessions:read"], "Auditor");
  assert.match(html, /Sessões/);
  // §7 empty honesto (mock não fabrica sessão).
  assert.match(html, /Nenhuma sessão ativa/);
  // Auditor: nota de restrição presente; nunca prometemos revogar.
  assert.match(html, /revogação é restrita a administradores/);
  // §2.8 — nada de token/ip/tenant no HTML.
  assert.doesNotMatch(html, /refresh_token_hash/i);
  assert.doesNotMatch(html, /ip_address/i);
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("sessões (render): admin (sessions:revoke) não vê a nota de restrição", async () => {
  const html = await renderPage("sessoes", ["sessions:read", "sessions:revoke"], "Gestor Operacional");
  assert.match(html, /Sessões/);
  assert.doesNotMatch(html, /revogação é restrita a administradores/);
});

test("acessos (render): título PT-BR + estado vazio honesto (D-007)", async () => {
  const html = await renderPage("acessos", ["audit.read"], "Auditor");
  assert.match(html, /Acessos/);
  assert.match(html, /Sem acessos registrados/);
  assert.doesNotMatch(html, /ip_address/i);
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("sessões (render): diálogo de confirmação mostra o caveat honesto de ~15 min e o dispositivo (sem IP)", async () => {
  const { RevokeSessionDialog } = await import("../src/modules/sessions/components/RevokeSessionDialog");
  const html = renderToString(
    <RevokeSessionDialog
      session={{ id: "sess-1", userLabel: "maria@techsolutions.example", loginAt: "", lastActivityAt: "", deviceLabel: "Chrome · Windows", status: "active" }}
      busy={false}
      onConfirm={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Revogar sessão/);
  assert.match(html, /Chrome · Windows/);
  assert.match(html, /15 minutos/); // caveat honesto do JWT stateless
  assert.match(html, /Cancelar/); // confirmação antes de revogar
  assert.doesNotMatch(html, /ip_address|refresh_token_hash/i);
});

test("auditoria (render): filtros server-side + estado vazio honesto (não fabrica evento)", async () => {
  const html = await renderPage("auditoria", ["audit.read"], "Auditor");
  assert.match(html, /Auditoria/);
  assert.match(html, /Filtros/);
  assert.match(html, /Ação/);
  assert.match(html, /Ator/);
  // §7 empty honesto — a cópia original preservada.
  assert.match(html, /Sem eventos de auditoria/);
  // Sem dados fabricados legados.
  assert.doesNotMatch(html, /Carla Mendes|Concluiu OS-2891/);
});
