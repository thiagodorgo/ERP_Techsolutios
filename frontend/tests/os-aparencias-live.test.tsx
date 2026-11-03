import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, hasClass, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";
import { OS_FIXTURE, toListDto } from "./helpers/os-aparencias.fixture";

// B-APAR-OS — Ordens de Serviço REAL (`WorkOrdersPage`, o contêiner) montada com o menu de aparência REAL
// (`AppearanceChoices`), os provedores reais e o hook real (`useWorkOrders` → `listWorkOrdersFromApi` → `fetch`), no DOM
// mínimo compartilhado da trilha (`tests/helpers/mini-dom.ts`). A rede é o único dublê: responde com os BYTES do backend
// (`toWorkOrderListDto`, as 24 OS da referência aprovada); rota não prevista responde 404 e o caso que dependesse dela
// falha. Prende por comportamento executado:
//   (1) sem nada guardado a tela abre na A (padrão, D-APARENCIA-RESPOSTAS (b)); o menu oferece "Ordens de Serviço" com os
//       nomes da referência;
//   (2) a escolha no menu troca A → B → C na página aberta, grava em `techsol.aparencia.<org>.<usuário>` e a lista é
//       pedida UMA vez em toda a troca (trocar de aparência não refaz requisição);
//   (3) `?aba=sem-tecnico` vindo da URL abre a lista já recortada (o "Ver fila" do Dashboard);
//   (4) B: a linha abre o resumo; "Abrir OS" abre a JANELA (`?os=`) e só então pede `GET /work-orders/:id`; Escape fecha
//       a janela e o resumo da linha continua aberto; A: "Abrir OS" vai à página `/work-orders/:id`.
// A volta do foco à linha depende de seletor e foco reais: é prova do navegador (Edge), no relatório do dev.
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
const { WorkOrdersPage } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
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
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const TENANT_ID = "org-aparencia-os";
const PERMISSIONS = ["work_orders:read", "work_orders:create", "work_orders:status", "field_dispatch:read", "field_dispatch:create", "field_dispatch:cancel"];
const DETAIL = { ...toListDto(OS_FIXTURE[1]), description: "Socorro na rodovia." };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const calls: string[] = [];

function installFetch() {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (/^\/work-orders(\?|$)/.test(url)) return json(200, { items: OS_FIXTURE.map(toListDto), pagination: { limit: 20, offset: 0, total: OS_FIXTURE.length } });
    if (/^\/work-orders\/os-102\/timeline/.test(url)) return json(200, { data: [] });
    if (/^\/work-orders\/os-102(\?|$)/.test(url)) return json(200, { data: DETAIL });
    if (/^\/approvals\/pending/.test(url)) return json(200, { data: [] });
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seedSessionAndContext() {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, permissions: [...PERMISSIONS] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Organização de Teste", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Gestor Operacional", permissions: PERMISSIONS, enabledModules: ["work-orders"], scope: "tenant" }),
  );
}

const appearanceKey = () => `techsol.aparencia.${TENANT_ID}.${mockSession.user.id}`;
let currentLocation = "";

function LocationProbe() {
  const location = useLocation();
  currentLocation = `${location.pathname}${location.search}`;
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

async function documentKey(key: string) {
  await act(async () => {
    for (const listener of [...(dom.doc.listeners.get("keydown") ?? [])]) listener({ key, shiftKey: false, preventDefault() {}, stopPropagation() {} });
  });
  await settle();
}

const pageRoot = (container: MiniDomNode) => elements(container, (el) => el.hasAttribute("data-aparencia"))[0];
const rows = (container: MiniDomNode) => elements(container, (el) => el.localName === "tr" && hasClass(el, "pat-ab-row") && el.hasAttribute("data-row-key"));
const row = (container: MiniDomNode, id: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === id)[0];
const detailRows = (container: MiniDomNode) => elements(container, (el) => el.localName === "tr" && hasClass(el, "pat-ab-detail-row"));
const buttonText = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && text(el).trim() === label)[0];
const dialogs = (container: MiniDomNode) => elements(container, (el) => el.getAttribute("role") === "dialog");
const menuItem = (container: MiniDomNode, label: string) =>
  elements(container, (el) => el.getAttribute("role") === "group" && el.getAttribute("aria-labelledby") === "aparencia-ordens-de-servico")
    .flatMap((group) => elements(group, (el) => el.getAttribute("role") === "menuitemradio" && text(el).includes(label)))[0];
const countCalls = (pattern: RegExp) => calls.filter((call) => pattern.test(call)).length;

async function mount(entry = "/work-orders") {
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
              h(Routes, null, h(Route, { path: "/work-orders", element: h(WorkOrdersPage) }), h(Route, { path: "/work-orders/:id", element: h("p", null, "página do detalhe") })))))),
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

test("[L1] sem nada guardado abre na A (padrão); o menu oferece Ordens de Serviço com os nomes da referência", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A", serialize(container).slice(0, 300));
    assert.equal(menuItem(container, "A · Padrão fiel")?.getAttribute("aria-checked"), "true");
    assert.ok(menuItem(container, "B · Analítica"), "B · Analítica no menu");
    assert.ok(menuItem(container, "C · Fila por agenda"), "C · Fila por agenda no menu");
    assert.match(text(menuItem(container, "A · Padrão fiel")!), /padrão/);
    assert.equal(rows(container).length, 20);
    assert.equal(dom.storage.has(appearanceKey()), false, "abrir não grava nada");
  } finally {
    await unmount();
  }
});

test("[L2] a escolha no menu troca A → B → C na página aberta, grava na chave da organização e do usuário, e a lista é pedida UMA vez", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(countCalls(/^GET \/work-orders(\?|$)/), 1, `chamadas: ${JSON.stringify(calls)}`);
    await press(menuItem(container, "B · Analítica"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "B");
    assert.deepEqual(JSON.parse(dom.storage.get(appearanceKey()) ?? "{}"), { "ordens-de-servico": "B" });
    await press(menuItem(container, "C · Fila por agenda"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "C");
    await press(menuItem(container, "A · Padrão fiel"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A");
    assert.equal(countCalls(/^GET \/work-orders(\?|$)/), 1, "trocar de aparência não refaz a requisição da lista");
  } finally {
    await unmount();
  }
});

test("[L3] ?aba=sem-tecnico vindo da URL abre a lista já recortada; o indicador filtra e o filtro vai para ?alvo=", async () => {
  const { container, unmount } = await mount("/work-orders?aba=sem-tecnico");
  try {
    await press(menuItem(container, "A · Padrão fiel"));
    assert.deepEqual(rows(container).map((el) => el.getAttribute("data-row-key")).sort(), ["os-102", "os-107", "os-111", "os-118", "os-123"]);
    const active = elements(container, (el) => hasClass(el, "pat-os-tab--active"))[0];
    assert.equal(text(active!), "Sem técnico");
    const atrasadas = elements(container, (el) => el.localName === "button" && (el.getAttribute("aria-label") ?? "").startsWith("Atrasadas:"))[0];
    await press(atrasadas);
    assert.match(currentLocation, /alvo=atrasadas/);
    // o relógio é o real (a referência é de 14/10/2026): "atrasada" = agenda no passado e não finalizada, medido agora
    const expected = OS_FIXTURE.filter((o) => ["os-102", "os-107", "os-111", "os-118", "os-123"].includes(o.id) && o.scheduledFor && new Date(o.scheduledFor).getTime() < Date.now()).map((o) => o.id);
    assert.ok(expected.length > 0, "denominador: há OS sem técnico com agenda vencida");
    assert.deepEqual(rows(container).map((el) => el.getAttribute("data-row-key")).sort(), expected.sort(), "sem técnico E atrasada");
  } finally {
    await unmount();
  }
});

test("[L4] B: a linha abre o resumo (um por vez); 'Abrir OS' abre a janela (?os=) e só então pede a OS; Escape fecha e o resumo fica", async () => {
  const { container, unmount } = await mount();
  try {
    await press(menuItem(container, "B · Analítica"));
    assert.equal(countCalls(/^GET \/work-orders\/os-/), 0, "nenhuma chamada por linha");
    await press(row(container, "os-102"));
    assert.equal(detailRows(container).length, 1);
    await press(row(container, "os-103"));
    assert.equal(detailRows(container).length, 1, "um resumo por vez");
    assert.equal(row(container, "os-103")?.getAttribute("aria-expanded"), "true");
    await press(row(container, "os-102"));
    await press(buttonText(container, "Abrir OS"));
    assert.match(currentLocation, /^\/work-orders\?os=os-102$/);
    assert.equal(dialogs(container).length, 1, "a janela fixa abriu");
    assert.equal(countCalls(/^GET \/work-orders\/os-102(\?|$)/), 1, "a OS é pedida ao abrir a janela");
    assert.match(serialize(dialogs(container)[0]), /OS-000102/);
    assert.doesNotMatch(serialize(dialogs(container)[0]), /Voltar às ordens<\/button>/, "na janela não há o link de voltar (a janela fecha)");
    await documentKey("Escape");
    assert.equal(dialogs(container).length, 0, "Escape fechou a janela");
    assert.equal(currentLocation, "/work-orders");
    assert.equal(row(container, "os-102")?.getAttribute("aria-expanded"), "true", "o resumo da linha continua aberto");
    assert.equal(countCalls(/^GET \/work-orders(\?|$)/), 1, "abrir e fechar a janela não pede a lista de novo");
  } finally {
    await unmount();
  }
});

test("[L5] A: 'Abrir OS' do resumo leva à página do detalhe, como hoje (sem janela)", async () => {
  const { container, unmount } = await mount();
  try {
    // a aparência tem cópia em memória (appearance.storage) que sobrevive ao caso anterior: escolhe a A explicitamente
    await press(menuItem(container, "A · Padrão fiel"));
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A");
    await press(row(container, "os-102"));
    await press(buttonText(container, "Abrir OS"));
    assert.equal(currentLocation, "/work-orders/os-102");
    assert.equal(dialogs(container).length, 0);
  } finally {
    await unmount();
  }
});

test("[L6] B: OS aberta por endereço (?os=) — fechar a janela abre o resumo daquela linha (referência `fecharOS`)", async () => {
  const { container, unmount } = await mount("/work-orders?os=os-102");
  try {
    await press(menuItem(container, "B · Analítica"));
    assert.equal(dialogs(container).length, 1, "o endereço abre a janela");
    assert.equal(detailRows(container).length, 0, "nenhum resumo aberto antes");
    await documentKey("Escape");
    assert.equal(dialogs(container).length, 0);
    assert.equal(row(container, "os-102")?.getAttribute("aria-expanded"), "true", "a linha da OS fechada fica com o resumo aberto");
  } finally {
    await unmount();
  }
});
