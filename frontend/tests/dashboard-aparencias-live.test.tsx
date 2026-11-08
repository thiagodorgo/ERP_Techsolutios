import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";
import { APPROVALS_DTO, LOCATIONS_DTO, SERIES_POINTS, SUMMARY_DTO } from "./helpers/dashboard-aparencias.fixture";

// B-APAR-DASH — Dashboard REAL (`DashboardPage`, o contêiner) montado com o menu de aparência REAL (`AppearanceChoices`),
// os provedores reais e os hooks reais (`useDashboardData`, `useWorkOrderTimeseries`), no DOM mínimo compartilhado da trilha
// (`tests/helpers/mini-dom.ts`). A rede é o único dublê: responde com os bytes do backend (os dados da referência aprovada);
// rota não prevista responde 404 (as fontes auxiliares degradam sem fabricar). Prende por comportamento executado (§2.4):
//   (1) sem nada guardado abre na A (padrão); o menu oferece "Dashboard" com os nomes da referência;
//   (2) o menu troca A → B → C na página aberta, grava em `techsol.aparencia.<org>.<usuário>`, e o resumo e a série são
//       pedidos UMA vez em toda a troca;
//   (3) as aprovações pendentes (extra da C) só são pedidas quando a C abre, e não de novo ao voltar a ela;
//   (4) B: a linha crítica pede `GET /work-orders/:id` só ao abrir, e abrir de novo não repete;
//   (5) o cartão abre o painel (não navega); o botão do painel leva à lista de OS já filtrada (`/work-orders?aba=em-campo`);
//       "Abrir OS" leva à página da OS com a volta ao Dashboard no estado da navegação.
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route, useLocation } = await import("react-router-dom");
const { DashboardPage } = await import("../src/pages/DashboardPage");
const { AppearanceChoices } = await import("../src/modules/appearance");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const TENANT_ID = "org-aparencia-dash";
const PERMISSIONS = ["dashboard:read", "work_orders:read", "work_orders:create", "field_dispatch:read", "field_location:read", "customers:read"];
const DISPATCHES_DTO = [
  { id: "d1", workOrderId: "wo-0415", workOrderCode: "OS-2026-0415", workOrderTitle: "Reboque de caminhão baú", operatorUserId: "u-carlos", status: "on_route", priority: "high", createdAt: SUMMARY_DTO.recentEvents[2].createdAt },
];
const DETAIL = { id: "wo-0418", code: "OS-2026-0418", title: "Remoção de veículo leve", status: "assigned", priority: "urgent", service_address: "Av. Industrial, 1.240", service_city: "Santo André", service_state: "SP", assigned_operator_id: "u-pedro", created_at: SUMMARY_DTO.recentEvents[0].createdAt };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const calls: string[] = [];

function installFetch() {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (/^\/dashboard\/summary(\?|$)/.test(url)) return json(200, { data: SUMMARY_DTO });
    if (/^\/operations\/work-orders-timeseries/.test(url)) return json(200, { data: { from: SERIES_POINTS[0].date, to: SERIES_POINTS[29].date, points: SERIES_POINTS } });
    if (/^\/operations\/dispatches(\?|$)/.test(url)) return json(200, { data: DISPATCHES_DTO });
    if (/^\/field-locations\/latest/.test(url)) return json(200, { data: LOCATIONS_DTO });
    if (/^\/approvals\/pending/.test(url)) return json(200, { data: APPROVALS_DTO });
    if (/^\/work-orders\/wo-0418(\?|$)/.test(url)) return json(200, { data: DETAIL });
    if (/^\/work-orders(\?|$)/.test(url)) return json(200, { items: [], pagination: { limit: 100, offset: 0, total: 0 } });
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seedSessionAndContext() {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, permissions: [...PERMISSIONS] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Organização de Teste", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Gestor Operacional", permissions: PERMISSIONS, enabledModules: ["dashboard", "work-orders", "field_operations"], scope: "tenant" }),
  );
}

const appearanceKey = () => `techsol.aparencia.${TENANT_ID}.${mockSession.user.id}`;
let currentLocation = "";
let currentState: unknown = null;

function LocationProbe() {
  const location = useLocation();
  currentLocation = `${location.pathname}${location.search}`;
  currentState = location.state;
  return null;
}

async function press(el: MiniDomElement | undefined) {
  assert.ok(el, "elemento a acionar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });
  });
  await settle();
}

const pageRoot = (container: MiniDomNode) => elements(container, (el) => el.hasAttribute("data-aparencia"))[0];
const row = (container: MiniDomNode, key: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === key)[0];
const detailRows = (container: MiniDomNode) => elements(container, (el) => el.localName === "tr" && hasClass(el, "pat-ab-detail-row"));
const buttonText = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && text(el).trim() === label)[0];
const buttonLabel = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && el.getAttribute("aria-label") === label)[0];
const menuItem = (container: MiniDomNode, label: string) =>
  elements(container, (el) => el.getAttribute("role") === "group" && el.getAttribute("aria-labelledby") === "aparencia-dashboard")
    .flatMap((group) => elements(group, (el) => el.getAttribute("role") === "menuitemradio" && text(el).includes(label)))[0];
const countCalls = (pattern: RegExp) => calls.filter((call) => pattern.test(call)).length;

async function mount(entry = "/dashboard") {
  seedSessionAndContext();
  installFetch();
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: [entry] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null,
              h("div", { "data-menu": "" }, h(AppearanceChoices, { onChosen: () => undefined })),
              h(LocationProbe),
              h(Routes, null,
                h(Route, { path: "/dashboard", element: h(DashboardPage) }),
                h(Route, { path: "/work-orders", element: h("p", null, "lista de OS") }),
                h(Route, { path: "/work-orders/:id", element: h("p", null, "página do detalhe") })))))),
    );
  });
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

test("[DL1] sem nada guardado abre na A (padrão); o menu oferece Dashboard com os nomes da referência", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A", serialize(container).slice(0, 300));
    assert.equal(menuItem(container, "A · Padrão fiel")?.getAttribute("aria-checked"), "true");
    assert.ok(menuItem(container, "B · Analítica"));
    assert.ok(menuItem(container, "C · Central de prioridades"));
    assert.ok(buttonLabel(container, "OS abertas: 18 — ver detalhes"), "os números do agregado na tela");
    assert.equal(dom.storage.has(appearanceKey()), false, "abrir não grava nada");
  } finally {
    await unmount();
  }
});

test("[DL2] o menu troca A → B → C → A na página aberta, grava na chave da organização e do usuário; resumo e série pedidos UMA vez", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(countCalls(/^GET \/dashboard\/summary/), 1, JSON.stringify(calls));
    assert.equal(countCalls(/^GET \/operations\/work-orders-timeseries\?days=30/), 1, JSON.stringify(calls));
    await press(menuItem(container, "B · Analítica"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "B");
    assert.deepEqual(JSON.parse(dom.storage.get(appearanceKey()) ?? "{}"), { dashboard: "B" });
    assert.ok(buttonLabel(container, "Aberta: 9 OS — filtrar a lista"), "a B recorta da MESMA série/resumo");
    await press(menuItem(container, "C · Central de prioridades"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "C");
    await press(menuItem(container, "A · Padrão fiel"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A");
    assert.equal(countCalls(/^GET \/dashboard\/summary/), 1, "trocar de aparência não pede o resumo de novo");
    assert.equal(countCalls(/^GET \/operations\/work-orders-timeseries/), 1, "nem a série");
  } finally {
    await unmount();
  }
});

test("[DL3] os extras da C (aprovações pendentes) só são pedidos quando a C abre, e não de novo ao voltar a ela", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(countCalls(/^GET \/approvals\/pending/), 0, "a A não pede aprovações");
    await press(menuItem(container, "B · Analítica"));
    assert.equal(countCalls(/^GET \/approvals\/pending/), 0, "a B também não");
    await press(menuItem(container, "C · Central de prioridades"));
    assert.equal(countCalls(/^GET \/approvals\/pending/), 1);
    assert.ok(row(container, "fila:approval-ap1"), "a aprovação entra na fila única");
    await press(menuItem(container, "A · Padrão fiel"));
    await press(menuItem(container, "C · Central de prioridades"));
    assert.equal(countCalls(/^GET \/approvals\/pending/), 1, "voltar à C não pede de novo (guardado no contêiner)");
  } finally {
    await unmount();
  }
});

test("[DL4] B: a linha crítica pede GET /work-orders/:id só ao abrir; abrir de novo não repete", async () => {
  const { container, unmount } = await mount();
  try {
    await press(menuItem(container, "B · Analítica"));
    assert.equal(countCalls(/^GET \/work-orders\/wo-0418/), 0, "nada pedido antes de abrir");
    await press(row(container, "crit:OS-2026-0418"));
    assert.equal(detailRows(container).length, 1);
    assert.equal(countCalls(/^GET \/work-orders\/wo-0418/), 1);
    assert.match(text(detailRows(container)[0]), /Av\. Industrial, 1\.240 — Santo André\/SP/);
    await press(row(container, "crit:OS-2026-0418"));
    assert.equal(detailRows(container).length, 0, "fechou");
    await press(row(container, "crit:OS-2026-0418"));
    assert.equal(countCalls(/^GET \/work-orders\/wo-0418/), 1, "reabrir usa o guardado");
    assert.match(currentLocation, /linha=crit%3AOS-2026-0418|linha=crit:OS-2026-0418/, "a linha aberta fica na URL, pelo código");
  } finally {
    await unmount();
  }
});

test("[DL5] o cartão abre o painel (não navega); o botão do painel abre a lista já filtrada; 'Abrir OS' leva à página com a volta", async () => {
  const { container, unmount } = await mount();
  try {
    await press(buttonLabel(container, "Em andamento: 17 — ver detalhes"));
    assert.match(currentLocation, /^\/dashboard\?cartao=in_progress$/, "o cartão fica na página");
    assert.equal(buttonLabel(container, "Em andamento: 17 — ver detalhes")?.getAttribute("aria-pressed"), "true");
    await press(buttonText(container, "Ver ordens de serviço"));
    assert.equal(currentLocation, "/work-orders?aba=em-campo", "o recorte da lista é o mesmo do cartão");
  } finally {
    await unmount();
  }
  const second = await mount("/dashboard?linha=crit:OS-2026-0418");
  try {
    assert.equal(detailRows(second.container).length, 1, "a linha vinda da URL abre");
    await press(buttonText(second.container, "Abrir OS"));
    assert.equal(currentLocation, "/work-orders/wo-0418");
    assert.deepEqual(currentState, { from: "/dashboard?linha=crit:OS-2026-0418" });
  } finally {
    await second.unmount();
  }
});
