import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptFieldOperators, summarizeFieldOperatorStatuses } from "../src/modules/dispatch/field-operators.adapter";
import type { FieldLocationItem, FieldLocationStatus } from "../src/modules/operations/map/operations-map.types";

// PR-SCALE-4 — a tela "Operadores de Campo" agora consome a MESMA fonte real do Mapa
// (getLatestFieldLocations) em vez de FABRICAR operadores (violava D-007). Este teste prova: (a) o
// adapter mapeia location→row reusando os helpers do Mapa, currentOs="—" sem OS, e — LGPD §12 — a linha
// NUNCA carrega latitude/longitude mesmo que o location tenha coordenada; (b) o render da página em modo
// mock mostra o estado honesto — SEM os dados fabricados antigos (Carla Mendes / "há 2 min" / OS-2891 /
// "8 em campo"); (c) os KPIs são contagens derivadas só da lista, por categoria real do enum.

const NOW = new Date("2026-07-20T12:00:00Z");

function makeLocation(overrides: Partial<FieldLocationItem> & { status: FieldLocationStatus }): FieldLocationItem {
  return {
    id: `loc-${overrides.status}`,
    operatorId: `op-${overrides.status}`,
    displayName: "Operador Real",
    status: overrides.status,
    latitude: -23.55052,
    longitude: -46.63331,
    capturedAt: new Date(NOW.getTime() - 2 * 60_000).toISOString(),
    isStale: false,
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

// ── (a) adapter: mapeia, "—" sem OS, e NUNCA vaza coordenada (LGPD §12) ────────────────────────────
test("adaptFieldOperators: mapeia location→row via helpers do Mapa; ordena disponível antes de engajado", () => {
  const rows = adaptFieldOperators(
    [
      makeLocation({ status: "in_service", displayName: "Ana Engajada", teamName: "Guincho SP", currentWorkOrder: { id: "wo-1", code: "OS-2891", title: "Reboque", status: "in_progress", priority: "high" } }),
      makeLocation({ status: "available", displayName: "Bruno Livre", teamName: null }),
    ],
    NOW,
  );

  assert.equal(rows.length, 2);
  // ordem operacional: disponível (available) antes de engajado (in_service).
  assert.equal(rows[0].statusLabel, "Disponível");
  assert.equal(rows[0].team, "Sem equipe"); // teamName null → rótulo honesto
  assert.equal(rows[0].currentOs, "—"); // sem OS vinculada → "—"

  const engaged = rows.find((row) => row.name === "Ana Engajada");
  assert.ok(engaged);
  assert.equal(engaged.currentOs, "OS-2891"); // código humano da OS vinculada
  assert.equal(engaged.team, "Guincho SP");
  assert.equal(engaged.statusLabel, "Em atendimento");
  assert.equal(engaged.statusTone, "pending");
  assert.equal(engaged.lastSeen, "há 2 min"); // frescor via formatLastSeen (nunca a coordenada)
});

test("adaptFieldOperators: LGPD §12 — a linha NUNCA inclui latitude/longitude, mesmo com coordenada no location", () => {
  const rows = adaptFieldOperators([makeLocation({ status: "on_route", latitude: -23.55052, longitude: -46.63331 })], NOW);
  const serialized = JSON.stringify(rows);

  assert.doesNotMatch(serialized, /latitude|longitude|"lat"|"lng"/i);
  assert.doesNotMatch(serialized, /-23\.55052|-46\.63331/); // os valores das coordenadas também não vazam
  // sanidade: a chave de coordenada não existe no objeto da linha
  assert.equal("latitude" in rows[0], false);
  assert.equal("longitude" in rows[0], false);
});

// ── (c) KPIs: contagem por categoria REAL do enum, derivada só da lista ─────────────────────────────
test("summarizeFieldOperatorStatuses: contagens honestas por categoria real (nada fabricado)", () => {
  const statuses: FieldLocationStatus[] = ["available", "available", "on_route", "on_site", "in_service", "paused", "offline", "blocked", "unknown"];
  const summary = summarizeFieldOperatorStatuses(statuses.map((status) => ({ status })));

  assert.equal(summary.total, 9);
  assert.equal(summary.available, 2); // available
  assert.equal(summary.engaged, 3); // on_route + on_site + in_service
  assert.equal(summary.paused, 1); // paused
  assert.equal(summary.offDuty, 3); // offline + blocked + unknown
});

// ── (b) render da página em modo mock: estado honesto, sem dados fabricados ─────────────────────────
async function renderFieldOperators(email = "dispatcher.web@techsolutions.example"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FieldOperatorsPage } = await import("../src/modules/dispatch/pages/FieldOperatorsPage");

  setStoredAuthSession(mockSessionForEmail(email));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Operador Logistico",
      permissions: ["field_dispatch:read", "field_location:read"],
      enabledModules: ["logistics"],
      scope: "branch",
    }),
  );

  return renderToString(
    <MemoryRouter initialEntries={["/field-operators"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FieldOperatorsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("operadores de campo: em modo mock mostra o estado honesto e NÃO fabrica operadores", async () => {
  const html = await renderFieldOperators();

  // cabeçalho honesto presente
  assert.match(html, /Operadores de Campo/);
  // estado vazio honesto (modo demonstração não tem posição real da equipe)
  assert.match(html, /Sem operadores em campo/);

  // AUSÊNCIA dos dados fabricados antigos (nomes, OS e frescor inventados)
  assert.doesNotMatch(html, /Carla Mendes|João Reis|Pedro Anhaia|Marcos Vieira/);
  assert.doesNotMatch(html, /OS-2891|OS-2892|OS-2884/);
  assert.doesNotMatch(html, /há 2 min|há 5 min|há 12 min/);
  process.env.VITE_USE_MOCKS = "";
});

// ═════════════════════ B-SAN3-06a (D-TELAS-SAN3-06a) — Console Dispatcher ligado aos dados reais ═════════════════════
// O console era 100% literal ("Techsolutions Industrial", 14/3/8/5, OS-2901, Pedro Anhaia, botões sem ação). Agora lê
// GET /dashboard/summary, GET /work-orders, GET /field-locations/latest e GET /operations/dispatches — cada um só com a
// permissão do próprio endpoint — e cada bloco tem os cinco estados do §7. Os casos abaixo provam, pela borda de rede
// (`fetch`, único dublê) e pelo render SSR da view: C4 (dados da organização A, nunca o literal), C5 (cinco estados por
// bloco; 403 ≠ vazio; `isStale` respeitado), C6 (todo <button> tem handler, por AST) e C7 (sem field_location:read não
// sai requisição a /field-locations/latest). As mutações que derrubam cada um estão executadas no relatório do dev.

type ConsoleFetchCall = { readonly url: string };
type ConsoleRoute = { readonly status: number; readonly body: unknown };

const CONSOLE_ORG_A = "Organização Alfa de Teste";
const consoleIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

function consoleApiA(): Record<string, ConsoleRoute> {
  return {
    "/api/v1/dashboard/summary": {
      status: 200,
      body: {
        data: {
          workOrders: {
            total: 19,
            byStatus: { open: 5, assigned: 1, accepted: 1, on_route: 2, on_site: 0, in_progress: 1, paused: 0, completed: 9, cancelled: 0, rejected: 0 },
            createdToday: 2,
            createdThisWeek: 6,
            overdue: 4,
          },
          registry: { customers: 3, vehicles: 2, teams: 1, services: 4 },
          criticalWorkOrders: [],
          recentEvents: [],
        },
      },
    },
    "/api/v1/work-orders?limit=100": {
      status: 200,
      body: {
        data: [
          { id: "wo-a1", code: "OS-A-101", title: "Troca de bomba", status: "open", priority: "urgent", customerName: "Cliente Alfa A", slaDueAt: consoleIso(10 * 60_000), createdAt: consoleIso(-3_600_000) },
          { id: "wo-a2", code: "OS-A-102", title: "Reparo elétrico", status: "in_progress", priority: "high", customerName: "Cliente Beta A", assignedUserId: "user-a1", createdAt: consoleIso(-7_200_000) },
          { id: "wo-a3", code: "OS-A-103", title: "Vistoria", status: "completed", priority: "low", customerName: "Cliente Gama A", createdAt: consoleIso(-9_000_000) },
        ],
        pagination: { limit: 100, offset: 0, total: 3 },
      },
    },
    "/api/v1/field-locations/latest": {
      status: 200,
      body: {
        data: [
          { id: "loc-a1", operatorUserId: "user-a1", displayName: "Técnica Ana A", teamName: "Equipe Norte A", status: "in_service", latitude: -23.5, longitude: -46.6, capturedAt: consoleIso(-2 * 60_000) },
          { id: "loc-a2", operatorUserId: "user-a2", displayName: "Técnico Bruno A", status: "available", latitude: -23.6, longitude: -46.7, capturedAt: consoleIso(-60 * 60_000), isStale: true },
          { id: "loc-a3", operatorUserId: "user-a3", displayName: "Técnica Carla A", status: "available", latitude: -23.7, longitude: -46.8, capturedAt: consoleIso(-60_000) },
        ],
      },
    },
    "/api/v1/operations/dispatches": { status: 200, body: { data: [], pagination: { limit: 20, offset: 0, total: 0 } } },
  };
}

function consoleApiEmpty(): Record<string, ConsoleRoute> {
  return {
    "/api/v1/dashboard/summary": { status: 200, body: { data: { workOrders: { total: 0, byStatus: {}, overdue: 0 }, registry: {} } } },
    "/api/v1/work-orders?limit=100": { status: 200, body: { data: [], pagination: { limit: 100, offset: 0, total: 0 } } },
    "/api/v1/field-locations/latest": { status: 200, body: { data: [] } },
    "/api/v1/operations/dispatches": { status: 200, body: { data: [] } },
  };
}

/** Instala o `fetch` dublê; rota não prevista LANÇA — nenhum caso passa por acidente. Devolve as chamadas feitas. */
function installConsoleFetch(routes: Record<string, ConsoleRoute>): ConsoleFetchCall[] {
  const calls: ConsoleFetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push({ url });
    const route = routes[url];
    if (!route) throw new Error(`rota não prevista no dublê de fetch: ${url}`);
    return new Response(JSON.stringify(route.body), { status: route.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

const ALL_CONSOLE_PERMISSIONS = new Set(["dashboard:read", "work_orders:read", "field_location:read", "field_dispatch:read", "field_dispatch:create"]);
const canFrom = (permissions: ReadonlySet<string>) => (permission: string) => permissions.has(permission);

async function loadConsole(routes: Record<string, ConsoleRoute>, permissions: ReadonlySet<string> = ALL_CONSOLE_PERMISSIONS) {
  process.env.VITE_USE_MOCKS = "false";
  const calls = installConsoleFetch(routes);
  const { loadDispatchConsole } = await import("../src/modules/dispatch/dispatch-console.service");
  const snapshot = await loadDispatchConsole({ token: "t", tenantId: "org-a" }, canFrom(permissions));
  return { calls, snapshot };
}

async function renderConsole(
  snapshotRoutes: Record<string, ConsoleRoute>,
  options: { readonly tenantName?: string | null; readonly permissions?: ReadonlySet<string> } = {},
): Promise<string> {
  const { snapshot } = await loadConsole(snapshotRoutes, options.permissions);
  const { initialBlockState, isLocationsEmpty, isQueueEmpty, isSummaryEmpty, nextBlockState } = await import("../src/modules/dispatch/dispatch-console.logic");
  const { DispatchConsoleView } = await import("../src/modules/dispatch/pages/DispatchConsolePage");
  const permissions = options.permissions ?? ALL_CONSOLE_PERMISSIONS;
  return renderToString(
    <MemoryRouter>
      <DispatchConsoleView
        tenantName={options.tenantName === undefined ? CONSOLE_ORG_A : options.tenantName}
        summary={nextBlockState(initialBlockState(), snapshot.summary, false, isSummaryEmpty)}
        workOrders={nextBlockState(initialBlockState(), snapshot.workOrders, false, isQueueEmpty)}
        locations={nextBlockState(initialBlockState(), snapshot.locations, false, isLocationsEmpty)}
        now={new Date()}
        can={canFrom(permissions)}
        onRetry={() => undefined}
        onNavigate={() => undefined}
      />
    </MemoryRouter>,
  );
}

/** Só o texto visível (sem tags nem atributos de estilo — "14" do `border-radius:14px` não é número da tela). */
const visibleText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|\s+/g, " ");
const blockStateOf = (html: string, block: string) => html.match(new RegExp(`data-block="${block}" data-state="([a-z]+)"`))?.[1];
const kpiValueOf = (html: string, block: string) =>
  html.match(new RegExp(`data-block="${block}" data-state="[a-z]+"[^]*?class="pat-kpi__value">([^<]*)<`))?.[1];

const CONSOLE_FICTION = /Techsolutions Industrial|OS-2901|OS-2898|Indústria Alfa|Pedro Anhaia|Carlos Mendes|Equipe Sul|Reforço solicitado|Alocar reforço/;

test("[06a·C7] sem field_location:read NÃO sai requisição a /field-locations/latest; com ela, sai", async () => {
  const withoutLocation = new Set([...ALL_CONSOLE_PERMISSIONS].filter((permission) => permission !== "field_location:read"));
  const denied = await loadConsole(consoleApiA(), withoutLocation);
  assert.equal(denied.calls.some((call) => call.url.includes("/field-locations/")), false, JSON.stringify(denied.calls));
  assert.deepEqual(denied.snapshot.locations, { kind: "forbidden", requested: false });
  assert.equal(denied.snapshot.workOrders.kind, "ok", "as outras fontes seguem sendo lidas");

  const allowed = await loadConsole(consoleApiA());
  assert.equal(allowed.calls.filter((call) => call.url === "/api/v1/field-locations/latest").length, 1);

  // Cada fonte só com a SUA permissão: sem nenhuma, nenhuma requisição sai e todo bloco é "acesso não permitido".
  const none = await loadConsole(consoleApiA(), new Set());
  assert.deepEqual(none.calls, []);
  for (const source of [none.snapshot.summary, none.snapshot.workOrders, none.snapshot.locations]) assert.equal(source.kind, "forbidden");
  process.env.VITE_USE_MOCKS = "";
});

test("[06a·C5] 403 da fonte é 'acesso não permitido' (nunca vazio); 5xx é erro; 2xx sem o bloco do resumo é erro", async () => {
  const routes = consoleApiA();
  routes["/api/v1/work-orders?limit=100"] = { status: 403, body: { error: { code: "forbidden", reason: "missing_permission" } } };
  routes["/api/v1/field-locations/latest"] = { status: 500, body: { error: { code: "internal_error" } } };
  routes["/api/v1/dashboard/summary"] = { status: 200, body: { data: { qualquer: true } } };
  const { snapshot } = await loadConsole(routes);
  assert.deepEqual(snapshot.workOrders, { kind: "forbidden", requested: true });
  assert.equal(snapshot.locations.kind, "error");
  assert.equal(snapshot.summary.kind, "error", "2xx sem `workOrders` não vira zero OS");
  process.env.VITE_USE_MOCKS = "";
});

test("[06a·C4] com a API da organização A o console mostra os dados de A — e com a API vazia, nenhum literal", async () => {
  const html = await renderConsole(consoleApiA());
  const text = visibleText(html);
  assert.match(text, new RegExp(CONSOLE_ORG_A), "a organização vem do contexto ativo");
  // KPIs do resumo: na fila = 5+1+1 = 7 · em atendimento = 2+0+1+0 = 3 · atrasadas = 4; disponíveis (posições) = 2.
  for (const [block, value] of [["kpi-queued", "7"], ["kpi-in-field", "3"], ["kpi-overdue", "4"], ["kpi-available", "2"]] as const) {
    assert.equal(kpiValueOf(html, block), value, `${block} = ${value}`);
  }
  // Fila: as duas OS em aberto de A (a concluída não entra), com cliente, técnico resolvido pela posição e prazo real.
  assert.match(text, /OS-A-101/);
  assert.match(text, /Cliente Alfa A/);
  assert.match(text, /OS-A-102/);
  assert.match(text, /Técnica Ana A/);
  assert.doesNotMatch(text, /OS-A-103/, "OS concluída não está na fila");
  assert.match(text, /vence em \d+ min/, "prazo REAL (slaDueAt) vira contagem regressiva");
  // Alertas: SLA crítico (vence em < 30 min, sem técnico) e técnico parado (posição antiga).
  assert.match(html, /data-alert="sla"/);
  assert.match(text, /SLA crítico OS-A-101 · Cliente Alfa A — vence em \d+ min sem técnico atribuído/);
  assert.match(html, /data-alert="stale-technician"/);
  assert.match(text, /Técnico parado Técnico Bruno A — localização não atualizada há 1 h/);
  assert.doesNotMatch(text, CONSOLE_FICTION);

  const empty = visibleText(await renderConsole(consoleApiEmpty(), { tenantName: null }));
  assert.doesNotMatch(empty, CONSOLE_FICTION);
  assert.doesNotMatch(empty, /\b14\b/, "o '14 na fila' literal não aparece");
  assert.match(empty, /Nenhuma OS na fila/);
  assert.match(empty, /Sem técnicos em campo/);
});

test("[06a·C5] os cinco estados por bloco: carregando · vazio · erro · acesso não permitido · desatualizado", async () => {
  const { initialBlockState, isLocationsEmpty, isQueueEmpty, isSummaryEmpty, nextBlockState } = await import("../src/modules/dispatch/dispatch-console.logic");
  const { DispatchConsoleView } = await import("../src/modules/dispatch/pages/DispatchConsolePage");
  const render = (blocks: { readonly summary: unknown; readonly workOrders: unknown; readonly locations: unknown }) =>
    renderToString(
      <MemoryRouter>
        <DispatchConsoleView
          tenantName={CONSOLE_ORG_A}
          summary={blocks.summary as never}
          workOrders={blocks.workOrders as never}
          locations={blocks.locations as never}
          now={new Date()}
          can={canFrom(ALL_CONSOLE_PERMISSIONS)}
          onRetry={() => undefined}
          onNavigate={() => undefined}
        />
      </MemoryRouter>,
    );
  const BLOCKS = ["kpi-queued", "kpi-overdue", "kpi-in-field", "kpi-available", "queue", "technicians"];

  // carregando
  const loading = render({ summary: initialBlockState(), workOrders: initialBlockState(), locations: initialBlockState() });
  for (const block of BLOCKS) assert.equal(blockStateOf(loading, block), "loading", `${block} carregando`);
  assert.doesNotMatch(visibleText(loading), CONSOLE_FICTION);

  const { snapshot: a } = await loadConsole(consoleApiA());
  const { snapshot: vazio } = await loadConsole(consoleApiEmpty());
  const ok = {
    summary: nextBlockState(initialBlockState(), a.summary, false, isSummaryEmpty),
    workOrders: nextBlockState(initialBlockState(), a.workOrders, false, isQueueEmpty),
    locations: nextBlockState(initialBlockState(), a.locations, false, isLocationsEmpty),
  };

  // vazio
  const emptyHtml = render({
    summary: nextBlockState(initialBlockState(), vazio.summary, false, isSummaryEmpty) as never,
    workOrders: nextBlockState(initialBlockState(), vazio.workOrders, false, isQueueEmpty) as never,
    locations: nextBlockState(initialBlockState(), vazio.locations, false, isLocationsEmpty) as never,
  });
  for (const block of BLOCKS) assert.equal(blockStateOf(emptyHtml, block), "empty", `${block} vazio`);

  // erro (primeira carga): o painel de erro com "Tentar novamente"; KPI vira "—", nunca número
  const error = { kind: "error", message: "falhou" } as const;
  const errorHtml = render({
    summary: nextBlockState(initialBlockState(), error, false, () => false) as never,
    workOrders: nextBlockState(initialBlockState(), error, false, () => false) as never,
    locations: nextBlockState(initialBlockState(), error, false, () => false) as never,
  });
  for (const block of BLOCKS) assert.equal(blockStateOf(errorHtml, block), "error", `${block} erro`);
  assert.match(errorHtml, /data-state="error"[^>]*>[\s\S]*Tentar novamente/);

  // acesso não permitido: 403 (requested:true) e permissão ausente (requested:false) — ambos "forbidden", nunca "empty"
  const forbiddenHtml = render({
    summary: nextBlockState(initialBlockState(), { kind: "forbidden", requested: true }, false, () => false) as never,
    workOrders: nextBlockState(initialBlockState(), { kind: "forbidden", requested: true }, false, () => false) as never,
    locations: nextBlockState(initialBlockState(), { kind: "forbidden", requested: false }, false, () => false) as never,
  });
  for (const block of BLOCKS) assert.equal(blockStateOf(forbiddenHtml, block), "forbidden", `${block} sem acesso`);
  assert.match(visibleText(forbiddenHtml), /Sem permissão para ver as ordens de serviço/);
  assert.match(visibleText(forbiddenHtml), /Sem permissão para ver a equipe em campo/);

  // desatualizado: falha em SEGUNDO PLANO com dado na tela mantém o dado, marca e mostra a hora da última leitura
  const staleHtml = render({
    summary: nextBlockState(ok.summary, error, true, () => false) as never,
    workOrders: nextBlockState(ok.workOrders, error, true, isQueueEmpty) as never,
    locations: nextBlockState(ok.locations, error, true, () => false) as never,
  });
  for (const block of BLOCKS) assert.equal(blockStateOf(staleHtml, block), "stale", `${block} desatualizado`);
  assert.match(visibleText(staleHtml), /Dados desatualizados — última atualização às \d\d:\d\d/);
  assert.match(visibleText(staleHtml), /OS-A-101/, "o dado continua na tela");

  // frescor da posição (isStale, 15 min): a linha do técnico diz "Localização antiga", em texto e não só em cor
  const okHtml = render(ok);
  assert.match(okHtml, /data-row="technician" data-stale="true"/);
  assert.match(visibleText(okHtml), /Técnico Bruno A [^]*Localização antiga/);
  assert.match(visibleText(okHtml), /atualizado às \d\d:\d\d/, "a hora da última busca aparece");
  process.env.VITE_USE_MOCKS = "";
});

test("[06a·C6] todo <button> do console tem handler (AST) e as ações sem destino saíram", async () => {
  const ts = (await import("typescript")).default;
  const { readFileSync } = await import("node:fs");
  const file = new URL("../src/modules/dispatch/pages/DispatchConsolePage.tsx", import.meta.url);
  const sourceText = readFileSync(file, "utf8");
  const source = ts.createSourceFile("DispatchConsolePage.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const withoutHandler: string[] = [];
  const texts: string[] = [];
  const identifiers = new Set<string>();
  let buttons = 0;
  const visit = (node: import("typescript").Node): void => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && opening.tagName.getText(source) === "button") {
      buttons += 1;
      const hasClick = opening.attributes.properties.some((attr) => ts.isJsxAttribute(attr) && attr.name.getText(source) === "onClick" && attr.initializer !== undefined);
      if (!hasClick) withoutHandler.push(`l.${source.getLineAndCharacterOfPosition(opening.getStart(source)).line + 1}`);
    }
    // Texto que a tela pode mostrar (JSX e literais) e nomes declarados — os comentários não contam.
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) texts.push(node.text);
    if (ts.isTemplateExpression(node)) texts.push(node.head.text, ...node.templateSpans.map((span) => span.literal.text));
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(buttons >= 8, `contagem de <button> suspeita: ${buttons}`);
  assert.deepEqual(withoutHandler, [], "button sem onClick");
  for (const removed of ["Alocar reforço", "Reforço solicitado", "Ver rota", "Atribuir OS", "Prioridade", "Filtrar", "Techsolutions Industrial", "OS-2901"]) {
    assert.equal(texts.some((text) => text.trim() === removed || text.includes(removed)), false, `"${removed}" ainda é texto do console`);
  }
  for (const removed of ["SlidersHorizontal", "TENANT_NAME", "KPIS", "QUEUE", "TECHS", "ALERTS"]) {
    assert.equal(identifiers.has(removed), false, `identificador ${removed} ainda existe no console`);
  }
});

test("[06a·C4] a página real, com os provedores, nasce carregando — nunca com o painel literal", async () => {
  process.env.VITE_USE_MOCKS = "false";
  browser.clear();
  installConsoleFetch({});
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { DispatchConsolePage } = await import("../src/modules/dispatch/pages/DispatchConsolePage");
  setStoredAuthSession(mockSessionForEmail("dispatcher.web@techsolutions.example"));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "org-a",
      tenantName: CONSOLE_ORG_A,
      tenantStatus: "active",
      branchId: "fil-a",
      branchName: "Filial A",
      role: "Operação de Campo",
      permissions: [...ALL_CONSOLE_PERMISSIONS],
      scope: "branch",
    }),
  );
  const html = renderToString(
    <MemoryRouter initialEntries={["/dispatch/console"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <DispatchConsolePage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  assert.match(visibleText(html), new RegExp(CONSOLE_ORG_A));
  for (const block of ["kpi-queued", "queue", "technicians"]) assert.equal(blockStateOf(html, block), "loading");
  assert.doesNotMatch(visibleText(html), CONSOLE_FICTION);
  process.env.VITE_USE_MOCKS = "";
});
