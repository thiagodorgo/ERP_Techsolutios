import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10c-OPERACAO · R-PARCIAL — conserto da junta J-612, achado C2-01. O "Tentar de novo" da linha "não carregou" relê
// SÓ a organização que falhou: as 5 leituras dela, e nenhuma da lista de organizações nem das outras. Antes, o botão
// chamava a releitura da tela inteira (`reload`), que relia todas. A página é a REAL (leitura e botão), com a sessão do
// console e o `fetch` como único dublê.

process.env.VITE_USE_MOCKS = "false";
process.env.VITE_API_BASE_URL = "/api/v1";
const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { PlatformBillingOpsPage } = await import("../src/modules/platform/billing-operations/pages/PlatformBillingOpsPage");
const fixture = await import("./helpers/billing-ops.fixture");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};
const server = fixture.installFakeServer();
const { on } = fixture;

const PATIO = fixture.ORGS.find((org) => org.id === "org-patio")!;
const notLoaded = (container: MiniDomElement) => elements(container, (el) => el.hasAttribute("data-nao-carregou"));
const retryOf = (row: MiniDomElement) => elements(row, (el) => el.localName === "button" && /Tentar de novo/.test(text(el)))[0];

test("T-PAR-4 o 'Tentar de novo' da linha 'não carregou' relê só a organização que falhou", async () => {
  let patioFails = true;
  server.serve(
    on("GET", /\/platform\/tenants$/, { data: fixture.ORGS.map((org) => ({ ...org, slug: org.id, plan: "pro", status: "active", activeUsers: 1, enabledModules: [], createdAt: "2026-01-01" })) }),
    (call) => (patioFails && call.url.includes("/statements?tenantId=org-patio") ? { status: 500, reason: "erro" } : undefined),
    on("GET", "/statements?", { data: [] }),
    on("GET", "/outbox?", { data: [] }),
    on("GET", "/invoices/backlog", { data: [] }),
    on("GET", "/billing-profile", { data: { complete: true, missing: [] } }),
    on("GET", "/providers", { data: [] }),
  );
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:billing:read", "platform:tenants:read"] } });
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/platform/billing?mes=${fixture.MONTH}`] },
        React.createElement(AuthProvider, null, React.createElement(TenantProvider, null, React.createElement(PermissionProvider, null, React.createElement(PlatformBillingOpsPage)))),
      ),
    );
  });
  try {
    await settle();
    const rows = notLoaded(container);
    assert.equal(rows.length, 1, "controle: só a organização que falhou aparece como 'não carregou'");
    assert.match(text(rows[0]!), new RegExp(PATIO.name));
    const before = server.state.calls.length;
    assert.ok(server.reads().some((call) => /\/platform\/tenants$/.test(call.url)), "controle: a abertura leu a lista de organizações");

    patioFails = false;
    await click(retryOf(rows[0]!));
    const retried = server.state.calls.slice(before).map((call) => `${call.method} ${call.url.replace("/api/v1/platform/billing", "")}`);
    assert.equal(retried.some((url) => /\/platform\/tenants$/.test(url)), false, `a lista de organizações não é relida: ${JSON.stringify(retried)}`);
    assert.deepEqual(
      retried.filter((url) => !url.includes(PATIO.id)),
      [],
      `nenhuma leitura de outra organização: ${JSON.stringify(retried)}`,
    );
    assert.equal(retried.length, 5, `as 5 leituras da organização que falhou: ${JSON.stringify(retried)}`);
    assert.equal(notLoaded(container).length, 0, "depois da releitura que deu certo, a linha 'não carregou' some");
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
  }
});

async function click(el: MiniDomElement | undefined) {
  assert.ok(el, "botão ausente");
  await act(async () => {
    if (propsOf(el).disabled === true) return;
    (propsOf(el).onClick as () => void)();
  });
  await settle();
}
