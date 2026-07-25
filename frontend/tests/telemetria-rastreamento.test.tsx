import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildCommandDestinations } from "../src/components/command-palette/logic";
import { buildSidebarNav } from "../src/layouts/appSidebarNav";
import { OPERATIONAL_MAP_STYLE } from "../src/modules/operations/map/map/mapStyle";
import { adaptTrack } from "../src/modules/telemetry/telemetry.adapter";
import { buildTelemetryQuery, getTelemetryTrack } from "../src/modules/telemetry/telemetry.service";
import { classifyTrackDisplay, TRACK_EMPTY_MESSAGE } from "../src/modules/telemetry/pages/RastreamentoPage";

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Rastreamento (mapa do trajeto, GET /telemetry/track). Prova:
// (a) §2.8/LGPD — a coordenada crua é exibida SÓ no mapa; o adapter projeta o allowlist {capturedAt,lat,lng,
//     accuracyM} e DESCARTA ip/tenant_id/sdk_int/speedKmh/client_action_id/device (no objeto E no JSON);
// (b) service consome /telemetry/track (com professionalId) e NUNCA /km|/access|/refusals|/devices; 403→
//     forbidden; 422 window_too_large→invalid_window honesto; mock→vazio (D-007);
// (c) empty HONESTO — count 0 → "empty" ("Sem pontos no período"), nunca trajeto fabricado; needs_professional
//     não chama o endpoint;
// (d) gating telemetry:read (sidebar + paleta); (e) reuso de MapLibre US$ 0 (OPERATIONAL_MAP_STYLE OpenFreeMap
//     keyless) + canvas SSR-safe (sem WebGL); (f) render PT-BR sem coordenada no DOM.

// ── (a) §2.8 — o adapter descarta coordenada-extra/IP/tenant_id/sdk_int/speed mesmo se o backend vazar ──────
test("adaptTrack: §2.8 — projeta SÓ {capturedAt,lat,lng,accuracyM}; descarta ip/tenant_id/sdk_int/speed/device", () => {
  const points = adaptTrack([
    {
      capturedAt: "2026-07-24T12:00:00.000Z",
      lat: -23.55052,
      lng: -46.633308,
      accuracyM: 8,
      // campos que NUNCA devem sair nesta view — se vazarem, o adapter não os propaga:
      ip_address: "203.0.113.7",
      tenant_id: "ten-secreto-01",
      sdk_int: 34,
      speedKmh: 47,
      client_action_id: "act-123",
      operator_profile_id: "op-externo-9",
      deviceModel: "Moto G",
    },
  ]);

  assert.equal(points.length, 1);
  const [only] = points;
  assert.deepEqual(Object.keys(only).sort(), ["accuracyM", "capturedAt", "lat", "lng"]);
  assert.equal(only.lat, -23.55052);
  assert.equal(only.lng, -46.633308);
  assert.equal(only.accuracyM, 8);
  assert.ok(!("ip_address" in only));
  assert.ok(!("tenant_id" in only));
  assert.ok(!("sdk_int" in only));
  assert.ok(!("speedKmh" in only));
  assert.ok(!("client_action_id" in only));
  assert.ok(!("deviceModel" in only));
  const serialized = JSON.stringify(points);
  assert.doesNotMatch(serialized, /203\.0\.113\.7/);
  assert.doesNotMatch(serialized, /ten-secreto-01/);
  assert.doesNotMatch(serialized, /"sdk_int"|"speedKmh"|"client_action_id"|"deviceModel"|op-externo-9/);
});

test("adaptTrack: descarta ponto sem coordenada finita ou sem capturedAt (nunca fabrica — D-007)", () => {
  const points = adaptTrack([
    { capturedAt: "2026-07-24T12:00:00Z", lat: -23.55, lng: -46.63, accuracyM: 5 },
    { lat: -23.55, lng: -46.63 }, // sem capturedAt → descarta
    { capturedAt: "2026-07-24T12:01:00Z", lat: null, lng: -46.63 }, // sem lat → descarta
    { capturedAt: "2026-07-24T12:02:00Z", lat: 999, lng: -46.63 }, // fora do globo → descarta
  ]);
  assert.equal(points.length, 1);
  assert.equal(points[0].accuracyM, 5);
  // accuracyM ausente → null honesto.
  const noAcc = adaptTrack([{ capturedAt: "2026-07-24T12:00:00Z", lat: -23.5, lng: -46.6 }]);
  assert.equal(noAcc[0].accuracyM, null);
  // Entrada não-array → [] (defensivo).
  assert.deepEqual(adaptTrack(null), []);
});

// ── (b) service — querystring, endpoint correto, 403/422, mock ──────────────────────────────────────────────
test("service: getTelemetryTrack consome /telemetry/track (com professionalId) e NUNCA outro endpoint", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  let seenUrl = "";
  globalThis.fetch = (async (url: string) => {
    seenUrl = String(url);
    return new Response(
      JSON.stringify({ data: [{ capturedAt: "2026-07-24T12:00:00Z", lat: -23.55, lng: -46.63, accuracyM: 9 }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const data = await getTelemetryTrack({}, { professionalId: "p-1", period: { from: "2026-07-23", to: "2026-07-24" } });
    assert.match(seenUrl, /\/telemetry\/track\?/);
    assert.match(seenUrl, /professionalId=p-1/);
    assert.doesNotMatch(seenUrl, /\/telemetry\/(km|access|refusals|devices)/);
    assert.equal(data.source, "api");
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].lat, -23.55);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("service: período vazio (default 24h) não serializa from/to; 403→forbidden; 422 window_too_large→invalid_window", async () => {
  assert.equal(buildTelemetryQuery({ professionalId: "p-1" }), "?professionalId=p-1");

  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;

  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getTelemetryTrack({}, { professionalId: "p-1" });
    assert.equal(data.source, "forbidden");
    assert.equal(data.items.length, 0);
  } finally {
    globalThis.fetch = original;
  }

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { reason: "window_too_large" } }), { status: 422, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  try {
    const data = await getTelemetryTrack({}, { professionalId: "p-1", period: { from: "2026-01-01", to: "2026-07-24" } });
    assert.equal(data.source, "invalid_window");
    assert.equal(data.items.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("service: modo mock → lista VAZIA honesta (D-007, sem fetch)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getTelemetryTrack({}, { professionalId: "p-1" });
    assert.equal(data.source, "mock");
    assert.equal(data.items.length, 0);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (c) empty HONESTO / classificação de estado §7 (puro — sem fabricar trajeto) ───────────────────────────
test("classifyTrackDisplay: count 0 → empty honesto; count>0 → track; nunca 'track' com 0 pontos", () => {
  assert.equal(classifyTrackDisplay("api", 0, false), "empty");
  assert.equal(classifyTrackDisplay("mock", 0, false), "empty");
  assert.equal(classifyTrackDisplay("api", 3, false), "track");
  assert.equal(classifyTrackDisplay("needs_professional", 0, false), "needs_professional");
  assert.equal(classifyTrackDisplay("invalid_window", 0, false), "invalid_window");
  assert.equal(classifyTrackDisplay("fallback", 0, false), "fallback");
  assert.equal(classifyTrackDisplay("forbidden", 0, false), "forbidden");
  assert.equal(classifyTrackDisplay("api", 0, true), "loading");
  // Mensagem de vazio honesta (não distingue "sem consentimento" de "sem movimento").
  assert.equal(TRACK_EMPTY_MESSAGE, "Sem pontos de localização no período");
  assert.doesNotMatch(TRACK_EMPTY_MESSAGE, /consent|permiss/i);
});

// ── (d) gating telemetry:read — sidebar + paleta de comandos ───────────────────────────────────────────────
test("nav: o grupo TELEMETRIA inclui Rastreamento como 5º item (para o gestor)", () => {
  const group = buildSidebarNav(["Gestor Operacional"]).find((g) => g.label === "TELEMETRIA");
  assert.ok(group);
  const rastreamento = group?.items.find((i) => i.path === "/telemetria/rastreamento");
  assert.ok(rastreamento, "Rastreamento presente no grupo TELEMETRIA");
  assert.equal(rastreamento?.label, "Rastreamento");
});

test("gating: a paleta só oferece Rastreamento a quem tem telemetry:read", () => {
  const withPerm = buildCommandDestinations(["Gestor Operacional"], (permission) => permission === "telemetry:read");
  assert.ok(withPerm.some((d) => d.path === "/telemetria/rastreamento"));

  const withoutPerm = buildCommandDestinations(["Gestor Operacional"], () => false);
  assert.ok(!withoutPerm.some((d) => d.path === "/telemetria/rastreamento"));
});

// ── (e) reuso de MapLibre US$ 0 — style OpenFreeMap keyless + canvas SSR-safe (sem WebGL) ───────────────────
test("provedor: o Rastreamento reusa OPERATIONAL_MAP_STYLE (OpenFreeMap keyless, sem Google/Mapbox/chave)", () => {
  const source = OPERATIONAL_MAP_STYLE.sources.openmaptiles as { type: string; url?: string };
  assert.equal(source.url, "https://tiles.openfreemap.org/planet");
  const serialized = JSON.stringify(OPERATIONAL_MAP_STYLE);
  assert.doesNotMatch(serialized, /googleapis|mapbox|api_key|access_token/i);
});

test("TrackMapCanvas: SSR renderiza container + loading SEM instanciar WebGL (fallback honesto)", async () => {
  const { TrackMapCanvas } = await import("../src/modules/telemetry/components/TrackMapCanvas");
  const html = renderToString(createElement(TrackMapCanvas, { points: [] }));
  assert.match(html, /telemetry-track-map__canvas/);
  assert.match(html, /Carregando mapa de rastreamento/);
  // Sem WebGL o SSR não desenha coordenada: nada de lat/lng no HTML.
  assert.doesNotMatch(html, /latitude|longitude/i);
});

// ── (f) render (SSR) — PT-BR, breadcrumb Telemetria, seletor obrigatório, §2.8 no DOM ──────────────────────
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

async function renderRastreamento(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { RastreamentoPage } = await import("../src/modules/telemetry/pages/RastreamentoPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  const html = renderToString(
    <MemoryRouter initialEntries={["/telemetria/rastreamento"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <RastreamentoPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  process.env.VITE_USE_MOCKS = "";
  return html;
}

test("rastreamento (render): PT-BR, breadcrumb Telemetria, seletor obrigatório, sem coordenada no DOM", async () => {
  const html = await renderRastreamento(["telemetry:read"]);
  assert.match(html, /Rastreamento/);
  assert.match(html, /Controle/);
  assert.match(html, /Telemetria/);
  // Seletor de profissional obrigatório → sem seleção, estado honesto (endpoint não chamado).
  assert.match(html, /Selecione um profissional/);
  // Período: nota do default de 24 horas.
  assert.match(html, /24 horas/);
  // §2.8 — nenhuma coordenada/IP/tenant no DOM (a coordenada só existe na polyline do mapa, não montado no SSR).
  assert.doesNotMatch(html, /latitude|longitude|ip_address/i);
  assert.doesNotMatch(html, /\btenant_id\b/i);
  // Sem seleção o mapa NÃO é montado (needs_professional) → nem trajeto nem "Sem pontos".
  assert.doesNotMatch(html, /Sem pontos de localização/);
});
