import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, useLocation, useSearchParams } = await import("react-router-dom");
const { PlatformTenantsPage, PlatformTenantsView } = await import("../src/modules/platform/pages/PlatformTenantsPage");
const { composePlatformOrganizations } = await import("../src/modules/platform/platform-organizations.state");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { ORGANIZATION_A, ORGANIZATION_SYSTEM } = await import("./helpers/plat-org.fixture");

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
  const write = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next); };
  return createElement(React.Fragment, null,
    createElement("output", { "data-location": true }, `${location.pathname}${location.search}`),
    createElement(PlatformTenantsView, {
      rows,
      query,
      groupId,
      statusFilter,
      onQueryChange: (value: string) => write("q", value),
      onGroupChange: (value: string) => write("grupo", value),
      onStatusFilterChange: (value: string) => write("situacao", value === "all" ? "" : value),
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
  for (const [label, expected, query] of [["Organizações ativas", 2, "active"], ["Organizações suspensas", 1, "suspended"], ["Cadastros incompletos", 1, "incomplete"]] as const) {
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
  for (const label of ["Organizações ativas", "Organizações suspensas", "Cadastros incompletos"]) {
    const button = buttonByText(page.container, label);
    const value = text(button).match(/\d+/)?.[0];
    assert.match(String(propsOf(button)["aria-label"]), new RegExp(`${label}: ${value}\\.`));
  }
  assert.equal(propsOf(buttonByText(page.container, "Tirar o filtro Ativas"))["aria-label"], "Tirar o filtro Ativas");
  await page.unmount();
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
