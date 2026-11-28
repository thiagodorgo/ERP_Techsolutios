import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { PlatformTenantsPage } = await import("../src/modules/platform/pages/PlatformTenantsPage");
const { PlatformTenantDetailPage } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
const { PlatformTenantModulesPage } = await import("../src/modules/platform/pages/PlatformTenantModulesPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DETAIL_A, ORGANIZATION_A } = await import("./helpers/plat-org.fixture");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const createElement = React.createElement;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settle = async () => {
  for (let step = 0; step < 10; step += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const overview = {
  activeOrgs: 1,
  totalOrgs: 1,
  totalUsers: 3,
  orgs: [{ id: ORGANIZATION_A.id, name: ORGANIZATION_A.name, status: "active", userCount: 3, moduleCount: 1, createdAt: ORGANIZATION_A.createdAt }],
};

const MODULES = [{ key: "work_orders", name: "Ordens de Serviço", description: "OS.", category: "MVP", status: "enabled", availableInPlan: true }];

let writes: string[] = [];
let cleanup: (() => Promise<void>) | null = null;
after(async () => {
  if (cleanup) await cleanup();
});

function installFetch() {
  writes = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const json = (status: number, data: unknown) => new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });
    if (method !== "GET") {
      writes.push(`${method} ${url}`);
      return json(200, {});
    }
    if (/\/platform\/overview(?:\?|$)/.test(url)) return json(200, overview);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/modules`)) return json(200, MODULES);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/detail`)) return json(200, DETAIL_A);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) return json(200, ORGANIZATION_A);
    if (/\/platform\/tenants(?:\?|$)/.test(url)) return json(200, [ORGANIZATION_A]);
    return json(599, { error: { code: "sem_fixture" } });
  }) as typeof fetch;
}

async function mount(route: "list" | "detail" | "modules", permissions: readonly string[]) {
  if (cleanup) await cleanup();
  setStoredAuthSession({
    ...mockSession,
    user: { ...mockSession.user, roles: ["Super Admin"], permissions: [...permissions] },
  });
  installFetch();
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  const path = route === "list" ? "/platform/tenants" : route === "detail" ? `/platform/tenants/${ORGANIZATION_A.id}` : `/platform/tenants/${ORGANIZATION_A.id}/modules`;
  const page = route === "list" ? createElement(PlatformTenantsPage) : route === "detail" ? createElement(PlatformTenantDetailPage) : createElement(PlatformTenantModulesPage);
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [path] },
      createElement(AuthProvider, null,
        createElement(TenantProvider, null,
          createElement(PermissionProvider, null,
            createElement(Routes, null, createElement(Route, { path: route === "list" ? "/platform/tenants" : route === "detail" ? "/platform/tenants/:tenantId" : "/platform/tenants/:tenantId/modules", element: page })))))));
  });
  await settle();
  const unmount = async () => {
    cleanup = null;
    await act(async () => root.unmount());
    container.parentNode?.removeChild(container);
  };
  cleanup = unmount;
  return { container, unmount };
}

const buttonTexts = (container: MiniDomElement) => elements(container, (element) => element.localName === "button").map((element) => text(element).trim()).filter(Boolean);

async function openListPanel(container: MiniDomElement) {
  const row = elements(container, (element) => element.localName === "tr" && hasClass(element, "pat-ab-row"))[0];
  assert.ok(row, "linha da organização");
  await act(async () => row.click());
  await settle();
}

test("PM1 só leitura não vê ação", async () => {
  const list = await mount("list", ["platform:tenants:read", "platform:billing:read"]);
  await openListPanel(list.container);
  const listActions = buttonTexts(list.container);
  const detail = await mount("detail", ["platform:tenants:read", "platform:billing:read"]);
  const detailActions = buttonTexts(detail.container);
  console.log(`MEDIDA PM1 lista=${JSON.stringify(listActions)} detalhe=${JSON.stringify(detailActions)} writes=${writes.length}`);
  for (const label of ["Nova organização", "Editar nome", "Suspender", "Reativar", "Criar administrador", "Escolher plano", "Preencher"]) {
    assert.equal(listActions.includes(label), false, `${label} não aparece na lista/painel`);
    assert.equal(detailActions.includes(label), false, `${label} não aparece na página direta`);
  }
  assert.equal(writes.length, 0);
  await detail.unmount();
});

test("PM2 cada chave liga só a sua ação", async () => {
  const cases = [
    ["platform:tenants:create", ["Nova organização"]],
    ["platform:tenants:update", ["Editar nome"]],
    ["platform:tenants:suspend", ["Suspender"]],
    ["platform:users:create_admin", ["Criar administrador", "Criar administrador"]],
    ["platform:billing:manage", ["Escolher plano", "Preencher"]],
  ] as const;
  const known = cases.flatMap((entry) => entry[1]);
  for (const [permission, expected] of cases) {
    const permissions = ["platform:tenants:read", ...(permission === "platform:billing:manage" ? ["platform:billing:read"] : []), permission];
    const page = await mount("list", permissions);
    await openListPanel(page.container);
    const actions = buttonTexts(page.container).filter((label) => known.includes(label as (typeof known)[number]));
    console.log(`MEDIDA PM2 ${permission}=${JSON.stringify(actions)}`);
    assert.deepEqual(actions, expected);
  }
});

test("PM3 quem tem tudo vê tudo", async () => {
  const permissions = ["platform:tenants:read", "platform:tenants:create", "platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin", "platform:billing:read", "platform:billing:manage"];
  const list = await mount("list", permissions);
  await openListPanel(list.container);
  const listActions = buttonTexts(list.container);
  for (const label of ["Nova organização", "Editar nome", "Suspender", "Criar administrador", "Escolher plano", "Preencher"]) assert.equal(listActions.includes(label), true, `${label} na lista/painel`);
  const detail = await mount("detail", permissions);
  const detailActions = buttonTexts(detail.container);
  for (const label of ["Editar nome", "Suspender", "Criar administrador", "Escolher plano", "Preencher"]) assert.equal(detailActions.includes(label), true, `${label} na página direta`);
  await detail.unmount();
});

test("PM4 módulos sem a chave", async () => {
  const page = await mount("modules", ["platform:tenants:read"]);
  const before = text(page.container);
  const save = elements(page.container, (element) => element.localName === "button" && text(element).includes("Salvar alterações"));
  const input = elements(page.container, (element) => element.localName === "input")[0] as MiniDomElement;
  assert.ok(input, "chave do módulo");
  const disabled = propsOf(input).disabled;
  await act(async () => {
    (propsOf(input).onChange as (event: unknown) => void)({ target: input, currentTarget: input });
  });
  await settle();
  const afterForcedChange = propsOf(input).checked;
  console.log(`MEDIDA PM4 save=${save.length} disabled=${String(disabled)} checkedDepois=${String(afterForcedChange)} writes=${writes.length}`);
  assert.equal(save.length, 0);
  assert.equal(disabled, true);
  assert.equal(afterForcedChange, true, "clique forçado não altera a chave");
  assert.match(before, /Seu perfil só consulta os módulos desta organização\./);
  assert.equal(writes.length, 0);
});
