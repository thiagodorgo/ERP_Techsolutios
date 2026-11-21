import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10c-OPERACAO · R-SEGREDO — conserto da junta J-612, achado C1-02 (GRAVE). O segredo da janela "Trocar credencial"
// sai do estado e do valor do campo LOGO depois de QUALQUER resposta do servidor (recusa 4xx, erro 5xx, erro de rede) e
// não só depois do sucesso ou ao fechar. Vale para os 3 ramos que recebem segredo: a chave de acesso, o segredo do aviso
// automático e o certificado digital com a senha. Antes do conserto, a recusa deixava o segredo no campo até a janela
// fechar (sonda `probe-secret-after-refusal.mjs` → `not ok T-SEG-3`).

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
const fixture = await import("./helpers/billing-ops.fixture");

type Access = import("../src/modules/platform/billing-operations/billing-ops.access").BillingOpsAccess;
type Route = import("./helpers/billing-ops.fixture").Route;
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
const secretField = (container: MiniDomElement) => field(container, (el) => el.getAttribute("data-campo") === "segredo");
const confirmButton = (container: MiniDomElement) => field(container, (el) => el.localName === "button" && el.hasAttribute("data-confirmar"));
async function click(el: MiniDomElement | undefined) {
  assert.ok(el, "botão ausente");
  await act(async () => {
    if (propsOf(el).disabled === true) return;
    (propsOf(el).onClick as () => void)();
  });
  await settle();
}
async function change(el: MiniDomElement | undefined, currentTarget: Record<string, unknown>) {
  assert.ok(el, "campo ausente");
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget, target: currentTarget }));
}
const SECRET = "SEGREDO-DE-TESTE-123";
/** Tudo o que a janela guarda e mostra: o HTML serializado e os valores e props dos campos. */
const everything = (container: MiniDomElement) => serialize(container) + JSON.stringify(elements(container, (el) => el.localName === "input").map((el) => ({ value: propsOf(el).value, stored: (el as unknown as { value: string }).value })));

// ---- os 3 ramos que recebem segredo ----------------------------------------------------------------------------------------
type Branch = { readonly name: string; readonly provider: import("../src/modules/platform/billing-operations/billing-ops.types").Provider; readonly webhook: boolean; readonly kind?: string; readonly expectedBody: Record<string, unknown> };
const CERT_BYTES = new Uint8Array([1, 2, 3, 4]);
const BRANCHES: readonly Branch[] = [
  { name: "chave de acesso", provider: fixture.provider(), webhook: false, expectedBody: { kind: "api_token", secret: SECRET } },
  { name: "segredo do aviso automático", provider: fixture.provider(), webhook: true, expectedBody: { kind: "webhook_secret", secret: SECRET } },
  {
    name: "certificado digital e a senha",
    provider: fixture.provider({ provider: "focusnfe", label: "Focus NFe", kind: "invoice", credentials: [] }),
    webhook: false,
    kind: "certificate",
    expectedBody: { kind: "certificate", pfxBase64: Buffer.from(CERT_BYTES).toString("base64"), password: SECRET },
  },
];

// ---- as respostas que não são sucesso --------------------------------------------------------------------------------------
const networkError: Route = (call) => {
  if (call.method === "PUT" && call.url.includes("/credentials")) throw new TypeError("Failed to fetch");
  return undefined;
};
const OUTCOMES: readonly { readonly name: string; readonly route: Route; readonly notice: RegExp }[] = [
  { name: "recusa 4xx", route: on("PUT", "/credentials", { status: 400, reason: "credential_kind_not_supported" }), notice: /O servidor recusou\. Nada foi salvo\./ },
  { name: "erro 5xx", route: on("PUT", "/credentials", { status: 500, reason: "erro" }), notice: /Nada foi salvo\./ },
  { name: "erro de rede", route: networkError, notice: /Nada foi salvo\./ },
];

/** Monta a janela, escolhe o ramo e preenche o segredo (e o arquivo, no certificado). */
async function openAndFill(branch: Branch, file: unknown = new File([CERT_BYTES], "certificado.pfx")) {
  const view = await mount(React.createElement(CredentialDialog, { provider: branch.provider, webhook: branch.webhook, actions: billingOpsActions(FULL), onClose: () => undefined, onDone: () => undefined }));
  if (branch.kind) await change(field(view.container, (el) => el.localName === "select"), { value: branch.kind });
  if (branch.kind === "certificate") await change(field(view.container, (el) => el.localName === "input" && propsOf(el).type === "file"), { files: [file] });
  await change(secretField(view.container), { value: SECRET });
  assert.match(everything(view.container), new RegExp(SECRET), "controle: antes do envio, o segredo está no campo");
  assert.notEqual(confirmButton(view.container)?.getAttribute("aria-disabled"), "true", "controle: com o segredo preenchido, o envio está habilitado");
  return view;
}

for (const branch of BRANCHES) {
  for (const outcome of OUTCOMES) {
    test(`T-SEG-6 ${branch.name} · ${outcome.name}: o segredo sai do estado e do campo logo depois da resposta, com a janela aberta`, async () => {
      server.serve(outcome.route);
      const view = await openAndFill(branch);
      try {
        await click(confirmButton(view.container));
        assert.deepEqual(server.writes().map((call) => call.body), [branch.expectedBody], "o envio levou o segredo do ramo");
        assert.match(text(view.container), outcome.notice, "a janela continua aberta, com o aviso");
        assert.doesNotMatch(everything(view.container), new RegExp(SECRET), "depois da resposta, o segredo não está em lugar nenhum da janela");
        assert.equal(propsOf(secretField(view.container)!).value, "", "o campo do segredo ficou vazio");
        assert.equal(confirmButton(view.container)?.getAttribute("aria-disabled"), "true", "sem segredo (nem arquivo), o envio fica desabilitado");
        const writes = server.writes().length;
        await click(confirmButton(view.container));
        assert.equal(server.writes().length, writes, "um segundo clique não reenvia nada: o estado foi limpo");
      } finally {
        await view.unmount();
      }
    });
  }
}

test("T-SEG-7 certificado · sucesso: a senha e o arquivo saem do estado", async () => {
  server.serve(on("PUT", "/providers/focusnfe/credentials", { data: { provider: "focusnfe", environment: "sandbox", kind: "certificate", fingerprint: "ab", last4: "-123", createdAt: "x", keyVersion: 1 } }));
  const branch = BRANCHES[2]!;
  const view = await openAndFill(branch);
  try {
    await click(confirmButton(view.container));
    assert.deepEqual(server.writes().map((call) => call.body), [branch.expectedBody]);
    assert.match(text(view.container), /Credencial salva/);
    assert.doesNotMatch(everything(view.container), new RegExp(SECRET));
    await change(secretField(view.container), { value: "outra-senha" });
    assert.equal(confirmButton(view.container)?.getAttribute("aria-disabled"), "true", "sem o arquivo (que foi limpo), o envio fica desabilitado");
  } finally {
    await view.unmount();
  }
});

test("T-SEG-8 certificado · falha ao ler o arquivo: nada é enviado, o segredo sai da janela e o aviso aparece", async () => {
  server.serve(on("PUT", "/credentials", { data: {} }));
  const unreadable = { name: "certificado.pfx", arrayBuffer: async () => Promise.reject(new Error("arquivo ilegível")) };
  const view = await openAndFill(BRANCHES[2]!, unreadable);
  try {
    await click(confirmButton(view.container));
    assert.equal(server.writes().length, 0, "nada foi enviado");
    assert.match(text(view.container), /Nada foi salvo\./);
    assert.doesNotMatch(everything(view.container), new RegExp(SECRET));
    assert.doesNotMatch(text(view.container), /Enviando…/, "a janela não fica presa em 'Enviando…'");
  } finally {
    await view.unmount();
  }
});
