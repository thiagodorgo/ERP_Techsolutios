import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes, useLocation, useSearchParams } = await import("react-router-dom");
const { PlatformTenantsPage, PlatformTenantsView } = await import("../src/modules/platform/pages/PlatformTenantsPage");
const { PlatformTenantDetailPage } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
const { OrganizationDetailPanelView } = await import("../src/modules/platform/components/OrganizationDetailPanel");
const { composePlatformOrganizations } = await import("../src/modules/platform/platform-organizations.state");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DETAIL_A, ORGANIZATION_A, ORGANIZATION_SYSTEM, userClick } = await import("./helpers/plat-org.fixture");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const createElement = React.createElement;
const settle = async () => {
  for (let step = 0; step < 8; step += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
};

const ORGANIZATION_B = { ...ORGANIZATION_A, id: "44444444-4444-4444-8444-444444444444", name: "Organização B", slug: "organizacao-b", status: "suspended" as const, setup: { complete: true, missing: [] } };
const ORGANIZATION_C = { ...ORGANIZATION_A, id: "55555555-5555-4555-8555-555555555555", name: "Organização C", slug: "organizacao-c", group: { id: "66666666-6666-4666-8666-666666666666", name: "Grupo Outro" }, setup: { complete: true, missing: [] } };
const overview = {
  activeOrgs: 3,
  totalOrgs: 4,
  totalUsers: 14,
  source: "api" as const,
  forbidden: false,
  stale: false,
  orgs: [ORGANIZATION_SYSTEM, ORGANIZATION_A, ORGANIZATION_B, ORGANIZATION_C].map((organization) => ({ id: organization.id, name: organization.name, status: organization.status, userCount: 1, moduleCount: 1, createdAt: organization.createdAt })),
};
const rows = composePlatformOrganizations([ORGANIZATION_SYSTEM, ORGANIZATION_A, ORGANIZATION_B, ORGANIZATION_C], overview);

let cleanup: (() => Promise<void>) | null = null;
after(async () => { if (cleanup) await cleanup(); });

function Harness() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const query = params.get("q") ?? "";
  const groupId = params.get("grupo") ?? "";
  const rawStatus = params.get("situacao");
  const statusFilter = rawStatus === "active" || rawStatus === "suspended" || rawStatus === "incomplete" ? rawStatus : "all";
  const order = params.get("ordem") === "usuarios" ? "usuarios" : null;
  const write = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next); };
  return createElement(React.Fragment, null,
    createElement("output", { "data-location": true }, `${location.pathname}${location.search}`),
    createElement(PlatformTenantsView, {
      rows,
      query,
      groupId,
      statusFilter,
      order,
      onQueryChange: (value: string) => write("q", value),
      onGroupChange: (value: string) => write("grupo", value),
      onStatusFilterChange: (value: string) => write("situacao", value === "all" ? "" : value),
      onOrderChange: (value: string | null) => write("ordem", value ?? ""),
    }),
  );
}

async function mount(initialEntry = "/platform/tenants") {
  if (cleanup) await cleanup();
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(Harness))));
  await settle();
  const unmount = async () => { cleanup = null; await act(async () => root.unmount()); container.parentNode?.removeChild(container); };
  cleanup = unmount;
  return { container, unmount };
}

const buttons = (root: MiniDomElement) => elements(root, (element) => element.localName === "button");
const buttonByText = (root: MiniDomElement, label: string) => {
  const button = buttons(root).find((element) => text(element).includes(label) || propsOf(element)["aria-label"] === label);
  assert.ok(button, `botão ${label}`);
  return button;
};
const rowCount = (root: MiniDomElement) => elements(root, (element) => element.localName === "tr" && hasClass(element, "pat-ab-row") && !hasClass(element, "pat-ab-row--static")).length;

test("LK1 cada indicador filtra a lista e mantém a contagem do recorte", async () => {
  const page = await mount();
  for (const [label, expected, query] of [["Organizações ativas", 2, "active"], ["Organizações suspensas", 1, "suspended"], ["Cadastro incompleto", 1, "incomplete"]] as const) {
    const button = buttonByText(page.container, label);
    const value = Number(text(button).match(/\d+/)?.[0]);
    await act(async () => button.click());
    await settle();
    assert.equal(propsOf(buttonByText(page.container, label))["aria-pressed"], true);
    assert.equal(rowCount(page.container), value);
    assert.equal(value, expected);
    assert.match(text(page.container), new RegExp(`situacao=${query}`));
  }
  await page.unmount();
});

test("LK2 o chip tira só a situação e preserva busca e grupo", async () => {
  const page = await mount("/platform/tenants?q=Organiza%C3%A7%C3%A3o&grupo=22222222-2222-4222-8222-222222222222&situacao=active");
  const chip = buttonByText(page.container, "Tirar o filtro Ativas");
  await act(async () => chip.click());
  await settle();
  const location = text(elements(page.container, (element) => element.getAttribute("data-location") === "true")[0] as MiniDomElement);
  assert.doesNotMatch(location, /situacao=/);
  assert.match(location, /q=Organiza/);
  assert.match(location, /grupo=22222222/);
  assert.equal(rowCount(page.container), 2);
  await page.unmount();
});

test("LK3 nomes acessíveis dos indicadores incluem o número e o chip nomeia a remoção", async () => {
  const page = await mount("/platform/tenants?situacao=active");
  for (const label of ["Organizações ativas", "Organizações suspensas", "Cadastro incompleto"]) {
    const button = buttonByText(page.container, label);
    const value = text(button).match(/\d+/)?.[0];
    assert.match(String(propsOf(button)["aria-label"]), new RegExp(`${label}: ${value}\\.`));
  }
  assert.equal(propsOf(buttonByText(page.container, "Tirar o filtro Ativas"))["aria-label"], "Tirar o filtro Ativas");
  await page.unmount();
});

test("LK4 Usuários totais ordena, publica a ordem e não inventa soma parcial", async () => {
  const orderedRows = rows.map((row) => row.id === ORGANIZATION_A.id
    ? { ...row, userCount: 7 }
    : row.id === ORGANIZATION_B.id
      ? { ...row, userCount: 3 }
      : row.id === ORGANIZATION_C.id
        ? { ...row, userCount: 5 }
        : row);
  if (cleanup) await cleanup();
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  function OrderedHarness() {
    const [params, setParams] = useSearchParams();
    const order = params.get("ordem") === "usuarios" ? "usuarios" : null;
    const writeOrder = (value: string | null) => {
      const next = new URLSearchParams(params);
      value ? next.set("ordem", value) : next.delete("ordem");
      setParams(next);
    };
    return createElement(React.Fragment, null,
      createElement("output", { "data-location": true }, params.toString()),
      createElement(PlatformTenantsView, { rows: orderedRows, order, onOrderChange: writeOrder }),
    );
  }
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(OrderedHarness))));
  await settle();
  const card = buttonByText(container, "Usuários totais");
  assert.match(text(card), /15/);
  await act(async () => card.click());
  await settle();
  const names = elements(container, (element) => hasClass(element, "platform-organizations__name")).map(text);
  assert.deepEqual(names.slice(0, 3), ["Organização A", "Organização C", "Organização B"]);
  assert.equal(propsOf(buttonByText(container, "Usuários totais"))["aria-pressed"], true);
  assert.match(text(container), /Ordenado por: usuários/);
  assert.match(text(elements(container, (element) => element.getAttribute("data-location") === "true")[0] as MiniDomElement), /ordem=usuarios/);
  await act(async () => buttonByText(container, "Tirar a ordem por usuários").click());
  await settle();
  assert.doesNotMatch(text(container), /Ordenado por: usuários/);
  await act(async () => root.render(createElement(MemoryRouter, null,
    createElement(PlatformTenantsView, { rows: orderedRows.map((row) => row.id === ORGANIZATION_C.id ? { ...row, userCount: null } : row) }),
  )));
  await settle();
  assert.match(text(buttonByText(container, "Usuários totais")), /—/);
  await act(async () => root.unmount());
  container.parentNode?.removeChild(container);
});

test("LE1 a linha pedida no endereço sobrevive à carga e abre quando a lista chega", async () => {
  if (cleanup) await cleanup();
  const changes: Array<string | null> = [];
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(createElement(MemoryRouter, null,
    createElement(PlatformTenantsView, {
      rows: [],
      status: "loading",
      expandedId: ORGANIZATION_A.id,
      onExpandedIdChange: (value: string | null) => changes.push(value),
    }),
  )));
  await settle();
  assert.deepEqual(changes, [], "a carga não pode apagar o org do endereço");
  await act(async () => root.render(createElement(MemoryRouter, null,
    createElement(PlatformTenantsView, {
      rows,
      status: "ready",
      expandedId: ORGANIZATION_A.id,
      onExpandedIdChange: (value: string | null) => changes.push(value),
      renderDetail: () => createElement("div", null, "PAINEL-DEPOIS-DA-CARGA"),
    }),
  )));
  await settle();
  assert.match(text(container), /PAINEL-DEPOIS-DA-CARGA/);
  await act(async () => root.unmount());
  container.parentNode?.removeChild(container);
});

test("LE2 organização de sistema pedida no endereço não abre nenhuma linha", async () => {
  if (cleanup) await cleanup();
  setStoredAuthSession({
    ...mockSession,
    user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read"] },
  });
  const json = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (/\/platform\/overview(?:\?|$)/.test(url)) return json(overview);
    if (/\/platform\/tenants(?:\?|$)/.test(url)) return json([ORGANIZATION_SYSTEM, ORGANIZATION_A, ORGANIZATION_B, ORGANIZATION_C]);
    return new Response(JSON.stringify({ error: { code: "sem_fixture" } }), { status: 599, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [`/platform/tenants?org=${ORGANIZATION_SYSTEM.id}`] },
    createElement(AuthProvider, null, createElement(TenantProvider, null, createElement(PermissionProvider, null, createElement(PlatformTenantsPage)))),
  )));
  await settle();
  assert.equal(elements(container, (element) => hasClass(element, "pat-ab-detail-row")).length, 0);
  assert.equal(elements(container, (element) => hasClass(element, "pat-ab-row") && propsOf(element)["aria-expanded"] === true).length, 0);
  assert.match(text(container), /Plataforma/);
  await act(async () => root.unmount());
  container.parentNode?.removeChild(container);
});

test("LE3 Ver detalhes completos preserva a SPA e os filtros", async () => {
  if (cleanup) await cleanup();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", "platform:tenants:update"] } });
  globalThis.fetch = (async (input: RequestInfo | URL) => String(input).endsWith("/detail")
    ? new Response(JSON.stringify({ data: DETAIL_A }), { status: 200, headers: { "content-type": "application/json" } })
    : new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  function LocationProbe() { const location = useLocation(); return createElement("output", { "data-location": true }, `${location.pathname}${location.search}`); }
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ["/platform/tenants?situacao=active"] },
    createElement(AuthProvider, null, createElement(TenantProvider, null, createElement(PermissionProvider, null,
      createElement(React.Fragment, null,
        createElement(LocationProbe),
        createElement(Routes, null,
          createElement(Route, { path: "/platform/tenants", element: createElement(OrganizationDetailPanelView, { organization: ORGANIZATION_A, data: { detail: DETAIL_A, source: "api", forbidden: false, notFound: false }, returnSearch: "?situacao=active" }) }),
          createElement(Route, { path: "/platform/tenants/:tenantId", element: createElement(PlatformTenantDetailPage) }),
        ),
      ),
    ))),
  )));
  await settle();
  const link = elements(container, (element) => element.localName === "a" && text(element) === "Ver detalhes completos")[0];
  assert.ok(link);
  await act(async () => userClick(link));
  await settle();
  const location = text(elements(container, (element) => element.getAttribute("data-location") === "true")[0] as MiniDomElement);
  assert.equal(location, `/platform/tenants/${ORGANIZATION_A.id}?situacao=active`);
  assert.match(text(container), /Receita e disponibilidade/);
  await act(async () => root.unmount());
  container.parentNode?.removeChild(container);
});

type RefreshFailure = "tenants-403" | "overview-403" | "background-500" | "initial-500";

async function mountHookPage(failure: RefreshFailure) {
  if (cleanup) await cleanup();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", "platform:tenants:create"] } });
  let tenantCalls = 0;
  let overviewCalls = 0;
  const json = (status: number, data: unknown) => new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (/\/platform\/overview(?:\?|$)/.test(url)) {
      overviewCalls += 1;
      if ((failure === "overview-403" && overviewCalls === 2)) return json(403, { error: { code: "FORBIDDEN" } });
      if (failure === "background-500" && overviewCalls === 2) return json(500, { error: { code: "INTERNAL_ERROR" } });
      return json(200, overview);
    }
    if (/\/platform\/tenants(?:\?|$)/.test(url)) {
      tenantCalls += 1;
      if (failure === "initial-500" && tenantCalls === 1) return json(500, { error: { code: "INTERNAL_ERROR" } });
      if (failure === "tenants-403" && tenantCalls === 2) return json(403, { error: { code: "FORBIDDEN" } });
      return json(200, [ORGANIZATION_SYSTEM, ORGANIZATION_A, ORGANIZATION_B, ORGANIZATION_C]);
    }
    return json(599, { error: { code: "sem_fixture" } });
  }) as typeof fetch;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(createElement(MemoryRouter, null,
    createElement(AuthProvider, null, createElement(TenantProvider, null, createElement(PermissionProvider, null, createElement(PlatformTenantsPage)))),
  )));
  await settle();
  const tick = async () => {
    const interval = [...dom.intervals].reverse().find((item) => item.fn !== null);
    assert.ok(interval?.fn, "intervalo de atualização ativo");
    await act(async () => interval.fn?.());
    await settle();
  };
  const unmount = async () => { cleanup = null; await act(async () => root.unmount()); container.parentNode?.removeChild(container); };
  cleanup = unmount;
  return { container, tick, calls: () => tenantCalls + overviewCalls, unmount };
}

test("LH1 403 em /tenants tira os dados e para a atualização", async () => {
  const page = await mountHookPage("tenants-403");
  assert.match(text(page.container), /Organização A/);
  await page.tick();
  assert.match(text(page.container), /Acesso não permitido/);
  assert.doesNotMatch(text(page.container), /Organização A|Nova organização/);
  const calls = page.calls();
  assert.equal([...dom.intervals].reverse().find((item) => item.fn !== null), undefined);
  assert.equal(page.calls(), calls);
  await page.unmount();
});

test("LH2 403 em /overview tira os dados e para a atualização", async () => {
  const page = await mountHookPage("overview-403");
  await page.tick();
  assert.match(text(page.container), /Acesso não permitido/);
  assert.doesNotMatch(text(page.container), /Organização A|Nova organização/);
  assert.equal([...dom.intervals].reverse().find((item) => item.fn !== null), undefined);
  await page.unmount();
});

test("LH3 falha em segundo plano mantém o último par completo", async () => {
  const page = await mountHookPage("background-500");
  await page.tick();
  assert.match(text(page.container), /Dados desatualizados/);
  assert.match(text(page.container), /Organização A/);
  await page.unmount();
});

test("LH4 primeira carga que falha é erro, não dado desatualizado", async () => {
  const page = await mountHookPage("initial-500");
  assert.match(text(page.container), /Não foi possível carregar as organizações|Tentar novamente/);
  assert.doesNotMatch(text(page.container), /Organização A|Dados desatualizados/);
  await page.unmount();
});
