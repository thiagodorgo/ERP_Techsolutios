import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildCsv } from "../src/lib/csv";
import { buildCommandDestinations } from "../src/components/command-palette/logic";
import { buildSidebarNav } from "../src/layouts/appSidebarNav";
import {
  adaptAccess,
  adaptDevices,
  adaptKm,
  adaptRefusals,
  formatKm,
  formatLastSeen,
  formatPoints,
  formatTelemetryDay,
  getAccessTone,
} from "../src/modules/telemetry/telemetry.adapter";
import {
  buildTelemetryQuery,
  getTelemetryAccess,
  getTelemetryDevices,
  getTelemetryKm,
  getTelemetryRefusals,
} from "../src/modules/telemetry/telemetry.service";

// Ω4C PR-14 — Telemetria WEB (Quilometragem · Acessos · Recusas · Dispositivos), SEM o mapa. Prova:
// (a) §2.8/LGPD — NENHUMA das 4 telas surfacea lat/lng/IP/tenant_id/sdk_int, no DOM nem no CSV (a coordenada
// crua é exclusiva do mapa/PR-15, aqui proibido); (b) seletor de profissional obrigatório em km/acessos/
// recusas (sem seleção → estado honesto, endpoint NÃO chamado); (c) período default 24h + 422 window_too_large
// tratado honesto; (d) km 0 honesto/empty honesto; (e) gating por telemetry:read (menu/paleta); (f) rótulos
// PT-BR + breadcrumb desambiguando "Acessos" (Telemetria) de Controle·Usuários·Acessos (login web).

// ── (a) §2.8 — o adapter descarta coordenada/IP mesmo se o backend vazar (defensivo) ──────────────────────
test("km: §2.8 — adapter descarta lat/lng/accuracy/ip/tenant_id/sdk_int (LGPD)", () => {
  const rows = adaptKm([
    {
      professionalLabel: "Ana Motorista",
      day: "2026-07-24",
      kmTotal: 12.3,
      pointsUsed: 42,
      // campos que o backend NUNCA envia nesta view — se vazarem, o adapter não os propaga:
      lat: -23.55052,
      lng: -46.633308,
      accuracyM: 8,
      ip_address: "203.0.113.7",
      tenant_id: "ten-secreto-01",
      sdk_int: 34,
    },
  ]);

  assert.equal(rows.length, 1);
  const [only] = rows;
  assert.equal(only.kmTotal, 12.3);
  assert.equal(only.pointsUsed, 42);
  assert.ok(!("lat" in only));
  assert.ok(!("lng" in only));
  assert.ok(!("ip_address" in only));
  assert.ok(!("tenant_id" in only));
  assert.ok(!("sdk_int" in only));
  const serialized = JSON.stringify(rows);
  assert.doesNotMatch(serialized, /-23\.55052|-46\.633308/);
  assert.doesNotMatch(serialized, /203\.0\.113\.7/);
  assert.doesNotMatch(serialized, /ten-secreto-01/);
});

test("km: km 0 é honesto (sem trajeto) e o dia é obrigatório (descarta linha sem dia)", () => {
  const rows = adaptKm([
    { professionalLabel: "Ana", day: "2026-07-24", kmTotal: 0, pointsUsed: 0 },
    { professionalLabel: "sem-dia", kmTotal: 9, pointsUsed: 3 }, // sem day → descartado
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kmTotal, 0);
  assert.equal(formatKm(0), "0,0 km");
  assert.equal(formatKm(12.3), "12,3 km");
  assert.equal(formatPoints(0), "0");
});

test("km: ordena por dia DESC (mais recente primeiro)", () => {
  const rows = adaptKm([
    { professionalLabel: "Ana", day: "2026-07-20", kmTotal: 1, pointsUsed: 1 },
    { professionalLabel: "Ana", day: "2026-07-24", kmTotal: 2, pointsUsed: 1 },
    { professionalLabel: "Ana", day: "2026-07-22", kmTotal: 3, pointsUsed: 1 },
  ]);
  assert.deepEqual(rows.map((r) => r.day), ["2026-07-24", "2026-07-22", "2026-07-20"]);
});

test("acessos: §2.8 defensivo + badge (verde conectou / cinza desconectou)", () => {
  const rows = adaptAccess([
    { professionalLabel: "Ana", event: "conectou", when: "24/07 08:12", ip_address: "10.0.0.9", lat: -23.5 },
    { professionalLabel: "Ana", event: "desconectou", when: "24/07 18:00" },
    { professionalLabel: "sem-evento", when: "24/07 09:00" }, // sem event → descartado
  ]);
  assert.equal(rows.length, 2);
  assert.equal(getAccessTone("conectou"), "success");
  assert.equal(getAccessTone("desconectou"), "default");
  assert.ok(rows.every((r) => !("ip_address" in r) && !("lat" in r)));
  assert.doesNotMatch(JSON.stringify(rows), /10\.0\.0\.9|-23\.5/);
});

test("recusas: §2.8 + null honesto (workOrderRef/reason)", () => {
  const rows = adaptRefusals([
    { id: "r1", when: "24/07 10:00", professionalLabel: "Ana", reason: "Fora de área", workOrderRef: "OS-2891", lat: -23.5, ip_address: "10.0.0.1" },
    { id: "r2", when: "24/07 11:00", professionalLabel: "Ana", reason: null, workOrderRef: null },
    { when: "24/07 12:00", professionalLabel: "Ana" }, // sem id → descartado
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].workOrderRef, "OS-2891");
  assert.equal(rows[1].workOrderRef, null);
  assert.equal(rows[1].reason, null);
  assert.ok(rows.every((r) => !("lat" in r) && !("ip_address" in r)));
  assert.doesNotMatch(JSON.stringify(rows), /-23\.5|10\.0\.0\.1/);
});

test("dispositivos: §2.8 — rótulo grosseiro, sem sdk_int cru/IP; appVersion null honesto", () => {
  const rows = adaptDevices([
    { professionalLabel: "Ana", deviceLabel: "Moto G", appVersion: "1.4.0", lastSeenAt: "2026-07-24T11:00:00Z", sdk_int: 34, ip_address: "10.0.0.2", lat: -23.5 },
    { professionalLabel: "Bruno", deviceLabel: "Dispositivo", appVersion: null, lastSeenAt: "2026-07-24T09:00:00Z" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].deviceLabel, "Moto G");
  assert.equal(rows[1].appVersion, null);
  assert.ok(rows.every((r) => !("sdk_int" in r) && !("ip_address" in r) && !("lat" in r)));
  assert.doesNotMatch(JSON.stringify(rows), /"sdk_int"|10\.0\.0\.2|-23\.5/);
});

test("formatação: dia PT-BR (UTC) e lastSeen honesto para instante inválido", () => {
  assert.equal(formatTelemetryDay("2026-07-24"), "24/07/2026");
  assert.match(formatLastSeen("2026-07-24T11:00:00Z"), /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  assert.equal(formatLastSeen(""), "—");
  assert.equal(formatLastSeen("nao-e-data"), "—");
});

// ── (a2) §2.8 no CSV — o CSV construído a partir de views adaptadas nunca carrega coordenada/IP ────────────
test("csv §2.8: a exportação da Quilometragem (via adapter) não carrega lat/lng/IP", () => {
  const rows = adaptKm([{ professionalLabel: "Ana", day: "2026-07-24", kmTotal: 12.3, pointsUsed: 42, lat: -23.55, lng: -46.63, ip_address: "203.0.113.7" }]);
  const csv = buildCsv(
    ["Profissional", "Dia", "Quilometragem", "Pontos usados"],
    rows.map((r) => [r.professionalLabel, formatTelemetryDay(r.day), formatKm(r.kmTotal), formatPoints(r.pointsUsed)]),
  );
  assert.match(csv, /Ana;24\/07\/2026;12,3 km;42/);
  assert.doesNotMatch(csv, /-23\.55|-46\.63|203\.0\.113\.7/);
});

// ── (b/c) service: querystring, mock/403/422, e nunca /telemetry/track ────────────────────────────────────
test("query: período vazio (default 24h) não serializa from/to; professionalId/from/to entram quando presentes", () => {
  // Sem período selecionado → backend aplica as últimas 24h (nenhum from/to na URL).
  assert.equal(buildTelemetryQuery({}), "");
  assert.equal(buildTelemetryQuery({ professionalId: "p-1" }), "?professionalId=p-1");
  const withWindow = buildTelemetryQuery({ professionalId: "p-1", period: { from: "2026-07-01", to: "2026-07-24" } });
  assert.match(withWindow, /professionalId=p-1/);
  assert.match(withWindow, /from=2026-07-01/);
  assert.match(withWindow, /to=2026-07-24/);
});

test("service: km/access/refusals/devices em modo mock → lista VAZIA honesta (D-007, sem fetch)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    for (const data of [
      await getTelemetryKm({}, { professionalId: "p-1" }),
      await getTelemetryAccess({}, { professionalId: "p-1" }),
      await getTelemetryRefusals({}, { professionalId: "p-1" }),
      await getTelemetryDevices({}, {}),
    ]) {
      assert.equal(data.source, "mock");
      assert.equal(data.items.length, 0);
    }
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("service: km consome /telemetry/km (com professionalId) e NUNCA /telemetry/track", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  let seenUrl = "";
  globalThis.fetch = (async (url: string) => {
    seenUrl = String(url);
    return new Response(JSON.stringify({ data: [{ professionalLabel: "Ana", day: "2026-07-24", kmTotal: 5.5, pointsUsed: 10 }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const data = await getTelemetryKm({}, { professionalId: "p-1", period: { from: "2026-07-23", to: "2026-07-24" } });
    assert.match(seenUrl, /\/telemetry\/km\?/);
    assert.match(seenUrl, /professionalId=p-1/);
    assert.doesNotMatch(seenUrl, /\/telemetry\/track/);
    assert.equal(data.source, "api");
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].kmTotal, 5.5);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("service: 403 → forbidden (acesso não permitido); 422 → invalid_window (janela) honesto", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;

  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getTelemetryKm({}, { professionalId: "p-1" });
    assert.equal(data.source, "forbidden");
    assert.equal(data.items.length, 0);
  } finally {
    globalThis.fetch = original;
  }

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { reason: "window_too_large" } }), { status: 422, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  try {
    const data = await getTelemetryKm({}, { professionalId: "p-1", period: { from: "2026-01-01", to: "2026-07-24" } });
    assert.equal(data.source, "invalid_window");
    assert.equal(data.items.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (e) gating por telemetry:read — sidebar + paleta de comandos ───────────────────────────────────────────
test("nav: o grupo TELEMETRIA (5 itens PT-BR, inclui Rastreamento/PR-15) aparece para o gestor", () => {
  const nav = buildSidebarNav(["Gestor Operacional"]);
  const group = nav.find((g) => g.label === "TELEMETRIA");
  assert.ok(group, "grupo TELEMETRIA presente");
  // Ω4C PR-15 (Junta de Mapas) somou o 5º item "Rastreamento" (mapa do trajeto, GET /telemetry/track).
  assert.deepEqual(
    group?.items.map((i) => i.label),
    ["Quilometragem", "Acessos", "Recusas", "Dispositivos", "Rastreamento"],
  );
  assert.deepEqual(
    group?.items.map((i) => i.path),
    ["/telemetria/quilometragem", "/telemetria/acessos", "/telemetria/recusas", "/telemetria/dispositivos", "/telemetria/rastreamento"],
  );
});

test("gating: a paleta de comandos só oferece Telemetria a quem tem telemetry:read", () => {
  const withPerm = buildCommandDestinations(["Gestor Operacional"], (permission) => permission === "telemetry:read");
  assert.ok(withPerm.some((d) => d.path === "/telemetria/quilometragem"));

  const withoutPerm = buildCommandDestinations(["Gestor Operacional"], () => false);
  assert.ok(!withoutPerm.some((d) => d.path.startsWith("/telemetria/")));
});

// ── (d/f) render (SSR) — estados §7, PT-BR, §2.8 no DOM, disambiguação de "Acessos" ───────────────────────
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

async function renderPage(component: "quilometragem" | "acessos" | "recusas" | "dispositivos", permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  const Page =
    component === "quilometragem"
      ? (await import("../src/modules/telemetry/pages/QuilometragemPage")).QuilometragemPage
      : component === "acessos"
        ? (await import("../src/modules/telemetry/pages/AcessosTelemetriaPage")).AcessosTelemetriaPage
        : component === "recusas"
          ? (await import("../src/modules/telemetry/pages/RecusasPage")).RecusasPage
          : (await import("../src/modules/telemetry/pages/DispositivosPage")).DispositivosPage;

  const html = renderToString(
    <MemoryRouter initialEntries={[`/telemetria/${component}`]}>
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

test("quilometragem (render): PT-BR, breadcrumb Telemetria, seletor + período 24h, sem coordenada", async () => {
  const html = await renderPage("quilometragem", ["telemetry:read"]);
  assert.match(html, /Quilometragem/);
  assert.match(html, /Controle/);
  assert.match(html, /Telemetria/);
  // Seletor de profissional obrigatório → sem seleção, estado honesto (endpoint não chamado).
  assert.match(html, /Selecione um profissional/);
  // Período: par De/Até + nota do default de 24 horas.
  assert.match(html, /24 horas/);
  // §2.8 — nada de coordenada/IP/tenant no DOM.
  assert.doesNotMatch(html, /latitude|longitude|\blat\b|\blng\b/i);
  assert.doesNotMatch(html, /ip_address/i);
  assert.doesNotMatch(html, /\btenant_id\b/i);
});

test("acessos (render): DISAMBIG — é a Telemetria (app), não Controle·Usuários·Acessos (login web)", async () => {
  const html = await renderPage("acessos", ["telemetry:read"]);
  assert.match(html, /Acessos/);
  assert.match(html, /Telemetria/);
  // Não deve confundir com o breadcrumb "Controle · Usuários" da tela de sessões/login web.
  assert.doesNotMatch(html, /Usuários/);
  assert.match(html, /Selecione um profissional/);
  assert.doesNotMatch(html, /ip_address/i);
});

test("recusas (render): PT-BR + seletor de profissional obrigatório", async () => {
  const html = await renderPage("recusas", ["telemetry:read"]);
  assert.match(html, /Recusas/);
  assert.match(html, /Telemetria/);
  assert.match(html, /Selecione um profissional/);
  assert.doesNotMatch(html, /\blat\b|\blng\b/i);
});

test("dispositivos (render): SEM seletor de profissional; empty honesto; sem fingerprint/IP", async () => {
  const html = await renderPage("dispositivos", ["telemetry:read"]);
  assert.match(html, /Dispositivos/);
  assert.match(html, /Telemetria/);
  // Não exige profissional → nunca mostra o "Selecione um profissional".
  assert.doesNotMatch(html, /Selecione um profissional/);
  // Empty honesto (mock não fabrica dispositivo — D-007).
  assert.match(html, /Sem dispositivos no período/);
  assert.doesNotMatch(html, /sdk_int/i);
  assert.doesNotMatch(html, /ip_address/i);
});
