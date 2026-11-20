import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10c-OPERACAO — o canal e a leitura: R-SEGREDO (o segredo é campo de senha, sem preenchimento automático, e SOME
// do estado e do HTML depois do sucesso e ao fechar), R-LIGAR (o botão só habilita com o texto IDÊNTICO; o corpo é
// { confirm }; a recusa vira checklist; em produção, o aviso forte) e R-PARCIAL no hook (no máximo 3 requisições ao
// mesmo tempo; organização que falha fica "não carregou").

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
const { billingOpsActions } = await import("../src/modules/platform/billing-operations/useBillingOpsActions");
const { CredentialDialog } = await import("../src/modules/platform/billing-operations/components/CredentialDialog");
const { EnableDialog, derivedEnableFailures } = await import("../src/modules/platform/billing-operations/components/EnableDialog");
const { useBillingOps } = await import("../src/modules/platform/billing-operations/useBillingOps");
const fixture = await import("./helpers/billing-ops.fixture");

type Access = import("../src/modules/platform/billing-operations/billing-ops.access").BillingOpsAccess;
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
const FULL: Access = { read: true, readTenants: true, settle: true, manageProviders: true };
const server = fixture.installFakeServer();
const { on } = fixture;

async function mount(node: unknown) {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(node as never));
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}
const field = (container: MiniDomElement, match: (el: MiniDomElement) => boolean) => elements(container, match)[0];
const confirmButton = (container: MiniDomElement) => field(container, (el) => el.localName === "button" && el.hasAttribute("data-confirmar"));
async function click(el: MiniDomElement | undefined) {
  assert.ok(el, "botão ausente");
  await act(async () => {
    if (propsOf(el).disabled === true) return;
    (propsOf(el).onClick as () => void)();
  });
  await settle();
}
async function type(el: MiniDomElement | undefined, value: string) {
  assert.ok(el, "campo ausente");
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget: { value }, target: { value } }));
}
const SECRET = "SEGREDO-DE-TESTE-123";
/** Tudo o que a janela guarda e mostra: o HTML serializado e os valores e props dos campos. */
const everything = (container: MiniDomElement) => serialize(container) + JSON.stringify(elements(container, (el) => el.localName === "input").map((el) => ({ value: propsOf(el).value, stored: (el as unknown as { value: string }).value })));

// ---- R-SEGREDO -------------------------------------------------------------------------------------------------------------
test("T-SEG-1 depois do sucesso, o segredo some do campo e do HTML (a janela fica aberta, limpa)", async () => {
  server.serve(on("PUT", "/providers/asaas/credentials", { data: { provider: "asaas", environment: "sandbox", kind: "api_token", fingerprint: "ab", last4: "-123", createdAt: "x", keyVersion: 1 } }));
  const done: string[] = [];
  const view = await mount(React.createElement(CredentialDialog, { provider: fixture.provider(), webhook: false, actions: billingOpsActions(FULL), onClose: () => done.push("fechou"), onDone: () => done.push("releu") }));
  try {
    const input = field(view.container, (el) => el.getAttribute("data-campo") === "segredo");
    await type(input, SECRET);
    assert.match(everything(view.container), new RegExp(SECRET), "controle: enquanto digita, o segredo está no campo");
    await click(confirmButton(view.container));
    assert.deepEqual(server.writes().map((call) => call.body), [{ kind: "api_token", secret: SECRET }]);
    assert.doesNotMatch(everything(view.container), new RegExp(SECRET), "depois do sucesso, o segredo não está em lugar nenhum da janela");
    assert.match(text(view.container), /Credencial salva/);
    assert.deepEqual(done, ["releu"]);
  } finally {
    await view.unmount();
  }
});

test("T-SEG-2 o campo do segredo é de senha (type=password) e sem preenchimento automático", async () => {
  server.serve();
  const view = await mount(React.createElement(CredentialDialog, { provider: fixture.provider(), webhook: true, actions: billingOpsActions(FULL), onClose: () => undefined, onDone: () => undefined }));
  try {
    const input = field(view.container, (el) => el.getAttribute("data-campo") === "segredo");
    assert.ok(input);
    assert.equal(propsOf(input).type, "password");
    assert.equal(propsOf(input).autoComplete, "off");
    assert.match(text(view.container), /Segredo do aviso automático/);
  } finally {
    await view.unmount();
  }
});

test("T-SEG-3 recusa do servidor: nada salvo, o texto da lista, e o segredo some ao fechar", async () => {
  server.serve(on("PUT", "/credentials", { status: 400, reason: "credential_kind_not_supported" }));
  const closed: string[] = [];
  const view = await mount(React.createElement(CredentialDialog, { provider: fixture.provider(), webhook: false, actions: billingOpsActions(FULL), onClose: () => closed.push("fechou"), onDone: () => undefined }));
  try {
    await type(field(view.container, (el) => el.getAttribute("data-campo") === "segredo"), SECRET);
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Este provedor não usa este tipo de credencial/);
    await click(elements(view.container, (el) => el.localName === "button" && text(el) === "Fechar")[0]);
    assert.doesNotMatch(everything(view.container), new RegExp(SECRET), "fechar limpa o segredo");
    assert.deepEqual(closed, ["fechou"]);
  } finally {
    await view.unmount();
  }
});

test("T-SEG-5 segredo curto (menos de 8) não envia", async () => {
  server.serve(() => ({ data: {} }));
  const view = await mount(React.createElement(CredentialDialog, { provider: fixture.provider(), webhook: false, actions: billingOpsActions(FULL), onClose: () => undefined, onDone: () => undefined }));
  try {
    await type(field(view.container, (el) => el.getAttribute("data-campo") === "segredo"), "curto");
    await click(confirmButton(view.container));
    assert.equal(server.state.calls.length, 0);
  } finally {
    await view.unmount();
  }
});

// ---- R-LIGAR -----------------------------------------------------------------------------------------------------------------
async function openEnable(provider = fixture.provider(), serverOff: boolean | null = null) {
  const done: string[] = [];
  const view = await mount(React.createElement(EnableDialog, { provider, actions: billingOpsActions(FULL), serverOff, now: new Date("2026-11-20T13:00:00.000Z"), onClose: () => undefined, onDone: () => done.push("releu") }));
  return { ...view, done };
}

test("T-LIG-1 Ligar só envia com o texto IDÊNTICO (sem aparar espaço, sem ignorar caixa); o corpo é { confirm }", async () => {
  server.serve(on("POST", "/providers/asaas/enable", { data: { provider: "asaas", environment: "sandbox", enabledAt: "x", enabledBy: "y" } }));
  const view = await openEnable();
  try {
    const input = () => field(view.container, (el) => el.getAttribute("data-campo") === "confirma");
    for (const wrong of ["ASAAS:sandbox", "asaas:sandbox ", " asaas:sandbox", "asaas:Sandbox", "asaas", ""]) {
      await type(input(), wrong);
      assert.equal(propsOf(confirmButton(view.container))["aria-disabled"], "true", JSON.stringify(wrong));
      await click(confirmButton(view.container));
      assert.equal(server.writes().length, 0, `não envia com ${JSON.stringify(wrong)}`);
    }
    await type(input(), "asaas:sandbox");
    await click(confirmButton(view.container));
    assert.deepEqual(server.writes().map((call) => call.body), [{ confirm: "asaas:sandbox" }]);
    assert.deepEqual(view.done, ["releu"], "relê o canal");
  } finally {
    await view.unmount();
  }
});

test("T-LIG-2 a recusa de precondições vira o checklist do que falta, e NADA liga", async () => {
  server.serve(on("POST", "/enable", { status: 422, reason: "enable_preconditions_failed" }));
  const view = await openEnable(fixture.provider(), true);
  try {
    await type(field(view.container, (el) => el.getAttribute("data-campo") === "confirma"), "asaas:sandbox");
    await click(confirmButton(view.container));
    const list = text(field(view.container, (el) => el.hasAttribute("data-checklist"))!);
    assert.match(list, /O servidor não ligou/);
    assert.match(list, /só a configuração do servidor liga/);
    assert.match(list, /Falta testar a conexão/);
    assert.match(list, /aviso automático não está registrado/);
    assert.doesNotMatch(text(view.container), /ligado\. A tela/, "nada liga");
  } finally {
    await view.unmount();
  }
});

test("T-LIG-2 (derivação) as condições que a tela confere no que leu do canal", () => {
  const now = new Date("2026-11-20T13:00:00.000Z");
  assert.deepEqual(derivedEnableFailures(fixture.provider(), null, now), ["last_test_required", "webhook_not_registered_for_environment"]);
  const ready = fixture.provider({ lastTest: { at: "2026-11-20T12:50:00.000Z", ok: true, environment: "sandbox" }, credentials: [{ kind: "api_token", last4: "1", createdAt: null }, { kind: "webhook_secret", last4: "2", createdAt: null }] });
  assert.deepEqual(derivedEnableFailures(ready, null, now), []);
  assert.deepEqual(derivedEnableFailures({ ...ready, lastTest: { at: "2026-11-20T12:00:00.000Z", ok: true, environment: "sandbox" } }, null, now), ["last_test_expired"]);
  assert.deepEqual(derivedEnableFailures({ ...ready, lastTest: { at: "2026-11-20T12:50:00.000Z", ok: true, environment: "production" } }, null, now), ["last_test_environment_mismatch"]);
  assert.deepEqual(derivedEnableFailures(ready, true, now), ["channel_disabled_by_env"]);
});

test("T-LIG-4 em produção, a janela de Ligar mostra o aviso forte 'Isto passa a cobrar clientes de verdade'", async () => {
  server.serve();
  const prod = await openEnable(fixture.provider({ environment: "production" }));
  const sandbox = await openEnable(fixture.provider());
  try {
    assert.match(text(prod.container), /Isto passa a cobrar clientes de verdade/);
    assert.match(text(prod.container), /asaas:production/);
    assert.doesNotMatch(text(sandbox.container), /clientes de verdade/, "controle: em sandbox, sem o aviso");
  } finally {
    await prod.unmount();
    await sandbox.unmount();
  }
});

// ---- R-PARCIAL no hook -------------------------------------------------------------------------------------------------------------
function Probe({ access, sink }: { readonly access: Access; readonly sink: (value: ReturnType<typeof useBillingOps>) => void }) {
  sink(useBillingOps(access));
  return null;
}

test("T-PAR-1 ao abrir, no máximo 3 requisições ao mesmo tempo; 5 leituras por organização; organização que falha fica 'não carregou'", async () => {
  const gates: (() => void)[] = [];
  const held = (data: unknown) => () => ({ data, gate: new Promise<void>((resolve) => gates.push(resolve)) });
  server.serve(
    on("GET", /\/platform\/tenants$/, { data: fixture.ORGS.map((org) => ({ ...org, slug: org.id, plan: "pro", status: "active", activeUsers: 1, enabledModules: [], createdAt: "2026-01-01" })) }),
    (call) => (call.url.includes("tenantId=org-patio") && call.url.includes("/statements") ? { status: 500, reason: "erro" } : undefined),
    on("GET", "/statements?", held([])),
    on("GET", "/outbox?", held([])),
    on("GET", "/invoices/backlog", held([])),
    on("GET", "/billing-profile", held({ complete: true, missing: [] })),
    on("GET", "/providers", { data: [] }),
  );
  let latest: ReturnType<typeof useBillingOps> | null = null;
  const view = await mount(React.createElement(Probe, { access: { ...FULL, manageProviders: false }, sink: (value) => (latest = value) }));
  try {
    for (let round = 0; round < 40 && gates.length + server.state.calls.length > 0; round++) {
      const open = gates.splice(0);
      if (!open.length) break;
      for (const release of open) release();
      await settle();
    }
    await settle();
    const reads = server.reads().filter((call) => /tenantId=|billing-profile/.test(call.url));
    assert.equal(reads.length, 15, "5 leituras × 3 organizações");
    assert.ok(server.state.maxInFlight <= 3, `concorrência máxima observada: ${server.state.maxInFlight}`);
    assert.ok(server.state.maxInFlight >= 2, "controle: as leituras correm em paralelo");
    assert.equal(server.state.calls.some((call) => call.url.includes("/providers")), false, "sem a chave do canal, nenhuma leitura de provedores");
    const data = (latest as ReturnType<typeof useBillingOps> | null)!.data;
    assert.equal(data.readings["org-patio"]?.state, "failed");
    assert.equal(data.readings["org-vale"]?.state, "ok");
    assert.deepEqual(data.providers, { state: "forbidden" });
  } finally {
    await view.unmount();
  }
});
