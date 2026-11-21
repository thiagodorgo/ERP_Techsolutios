import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10c-OPERACAO · as escritas da tela (§3.2 do plano; emenda 1, E2): R-CORPO (o corpo de cada ação tem EXATAMENTE as
// chaves da §3.2 — a de cobrança nunca leva valor), R-PERM (sem a chave, zero requisição), R-ORG (o `tenantId` é o da
// organização da linha), R-UMA (duplo clique = 1 chamada), R-CONF (a caixa da nota só depois do 422 e marcada), R-RELE
// (depois do sucesso a tela relê) e a confirmação forte de Emitir e Desligar (F-CONFIRMA). As janelas são montadas no
// mini-DOM do repositório, com o `fetch` como único dublê.

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
const { NO_BILLING_OPS_ACCESS } = await import("../src/modules/platform/billing-operations/billing-ops.access");
const { BillingOpsDialogs } = await import("../src/modules/platform/billing-operations/components/BillingOpsDialogs");
const { MemoryRouter } = await import("react-router-dom");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { PlatformBillingOpsPage } = await import("../src/modules/platform/billing-operations/pages/PlatformBillingOpsPage");
const { asMoney, formatBRL } = await import("../src/modules/platform/billing-operations/billing-ops.money");
const fixture = await import("./helpers/billing-ops.fixture");

type Access = import("../src/modules/platform/billing-operations/billing-ops.access").BillingOpsAccess;
type DialogAction = import("../src/modules/platform/billing-operations/components/BillingOpsDialogs").DialogAction;
type Row = import("../src/modules/platform/billing-operations/billing-ops.state").Row;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const FULL: Access = { read: true, readTenants: true, settle: true, manageProviders: true };
const server = fixture.installFakeServer();
const { on } = fixture;

const model = fixture.fixtureModel();
const rowOf = (statementId: string): Row => {
  const row = model.allRows.find((item) => item.statement.id === statementId);
  assert.ok(row, statementId);
  return row;
};
const LIT = rowOf("st-lit-10");
const VALE = rowOf("st-vale-10");
const PATIO = rowOf("st-patio-10");

// ---- montagem das janelas -------------------------------------------------------------------------------------------
type Mounted = { readonly container: MiniDomElement; readonly done: string[]; readonly unmount: () => Promise<void> };
async function openDialog(dialog: DialogAction, access: Access = FULL): Promise<Mounted> {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  const done: string[] = [];
  await act(async () => {
    root.render(
      React.createElement(BillingOpsDialogs, {
        dialog,
        actions: billingOpsActions(access),
        today: fixture.TODAY,
        channelOff: true,
        invoiceOff: true,
        serverOff: null,
        onClose: () => done.push("fechou"),
        onStatementDone: (row: Row) => done.push(`releu:${row.org.id}:${row.statement.id}`),
        onProviderDone: () => done.push("releu-canal"),
        onSeeChannel: () => done.push("ver-canal"),
        onOpen: (next: DialogAction) => done.push(`abriu:${next.kind}`),
      }),
    );
  });
  await settle();
  return {
    container,
    done,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const button = (container: MiniDomElement, label: RegExp) => elements(container, (el) => el.localName === "button" && label.test(text(el)))[0];
/** Clique como o navegador: botão DESABILITADO não dispara (R-UMA). */
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
async function check(el: MiniDomElement | undefined, checked = true) {
  assert.ok(el, "caixa ausente");
  await act(async () => (propsOf(el).onChange as (event: unknown) => void)({ currentTarget: { checked }, target: { checked } }));
}
const field = (container: MiniDomElement, match: (el: MiniDomElement) => boolean) => elements(container, match)[0];
const textarea = (container: MiniDomElement) => field(container, (el) => el.localName === "textarea");
const checkbox = (container: MiniDomElement) => field(container, (el) => el.localName === "input" && propsOf(el).type === "checkbox");
const confirmButton = (container: MiniDomElement) => field(container, (el) => el.localName === "button" && el.hasAttribute("data-confirmar"));
const writes = () => server.writes().map((call) => [call.method, call.url.replace("/api/v1/platform/billing", ""), call.body]);

// ---- R-PERM: sem a chave, zero requisição ---------------------------------------------------------------------------
test("T-PERM-2 sem a chave, cada ação chamada direto faz ZERO requisição e responde sem_permissao", async () => {
  server.serve(() => ({ data: {} }));
  const actions = billingOpsActions(NO_BILLING_OPS_ACCESS);
  const ref = { tenantId: "org-litoral", statementId: "st-lit-10" };
  const line = { ...fixture.FAILED_LINE, tenantId: "org-litoral" };
  const results = [
    await actions.requestCharge(ref, { method: "pix" }),
    await actions.cancelCharge(ref, "motivo com dez letras"),
    await actions.cancelUnknownCharge(ref, "pay_123", "motivo com dez letras"),
    await actions.confirmCancelled(line, "pay_123", "motivo com dez letras"),
    await actions.registerPayment(ref, { amount: "10.00" }),
    await actions.reversePayment(ref, "pg-1", { reason: "motivo com dez letras" }),
    await actions.requestInvoice(ref),
    await actions.resolveQueueLine(line, "motivo com dez letras"),
    await actions.retryQueueLine(line),
    await actions.saveProviderSettings("asaas", { environment: "sandbox", settings: {} }),
    await actions.saveCredential("asaas", { kind: "api_token", secret: "SEGREDO-DE-TESTE-123" }),
    await actions.testConnection("asaas"),
    await actions.registerWebhook("asaas"),
    await actions.enableProvider("asaas", "asaas:sandbox"),
    await actions.disableProvider("asaas"),
  ];
  assert.equal(server.state.calls.length, 0, "nenhuma requisição sem permissão");
  for (const result of results) assert.deepEqual(result, { ok: false, reason: "sem_permissao" });
});

test("T-PERM-3 cada grupo de ações tem a PRÓPRIA chave: settle não liga o canal, e o canal não emite cobrança", async () => {
  server.serve(() => ({ data: {} }));
  const settleOnly = billingOpsActions({ ...FULL, manageProviders: false });
  const channelOnly = billingOpsActions({ ...FULL, settle: false });
  assert.deepEqual(await settleOnly.enableProvider("asaas", "asaas:sandbox"), { ok: false, reason: "sem_permissao" });
  assert.deepEqual(await channelOnly.registerPayment({ tenantId: "org-litoral", statementId: "st-lit-10" }, { amount: "10.00" }), { ok: false, reason: "sem_permissao" });
  assert.equal(server.state.calls.length, 0);
});

test("T-PERM-4 o 403 de permissão de plataforma vira o texto de permissão na janela, nunca o código", async () => {
  server.serve(on("POST", "/statements/st-patio-10/invoice", { status: 403, reason: "platform_permission_required" }));
  const view = await openDialog({ kind: "invoice", row: PATIO });
  try {
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Seu perfil não tem permissão para esta ação/);
    assert.doesNotMatch(text(view.container), /platform_permission_required|_/);
  } finally {
    await view.unmount();
  }
});

// ---- R-CORPO: um teste por ação (o corpo EXATO da §3.2) ----------------------------------------------------------------
test("T-ACT-1 emitir cobrança: { tenantId, method } (dueDate só com vencimento passado); NUNCA valor", async () => {
  server.serve(() => ({ status: 201, data: {} }));
  const actions = billingOpsActions(FULL);
  await actions.requestCharge({ tenantId: "org-litoral", statementId: "st-lit-10" }, { method: "boleto" });
  await actions.requestCharge({ tenantId: "org-vale", statementId: "st-vale-10" }, { method: "pix", dueDate: "2026-12-01" });
  assert.deepEqual(writes(), [
    ["POST", "/statements/st-lit-10/charge", { tenantId: "org-litoral", method: "boleto" }],
    ["POST", "/statements/st-vale-10/charge", { tenantId: "org-vale", method: "pix", dueDate: "2026-12-01" }],
  ]);
});

test("T-ACT-2..9 o corpo de cada escrita do demonstrativo e da fila é exatamente o da §3.2", async () => {
  server.serve(() => ({ data: {} }));
  const actions = billingOpsActions(FULL);
  const ref = { tenantId: "org-vale", statementId: "st-vale-10" };
  const line = { ...fixture.REVIEW_LINE, tenantId: "org-vale" };
  await actions.cancelCharge(ref, "boleto com endereço errado");
  await actions.cancelUnknownCharge(ref, "pay_8KD21QX", "vi no painel do provedor");
  await actions.confirmCancelled(line, "pay_8KD21QX", "cancelada no painel dele");
  await actions.registerPayment(ref, { amount: "1020.00", method: "Pix na conta", note: "comprovante no e-mail" });
  await actions.registerPayment(ref, { amount: "10.00" });
  await actions.reversePayment(ref, "pg-1", { reason: "baixa lançada errada" });
  await actions.reversePayment(ref, "pg-1", { reason: "baixa lançada errada", confirmInvoiceCancel: true });
  await actions.requestInvoice(ref);
  await actions.resolveQueueLine(line, "conferido no painel dele");
  await actions.retryQueueLine({ ...fixture.FAILED_LINE, tenantId: "org-litoral" });
  await actions.retryQueueLine({ ...fixture.FAILED_LINE, tenantId: "org-litoral" }, "2026-12-01");
  assert.deepEqual(writes(), [
    ["POST", "/statements/st-vale-10/charge/cancel", { tenantId: "org-vale", reason: "boleto com endereço errado" }],
    ["POST", "/statements/st-vale-10/charge/cancel-unknown", { tenantId: "org-vale", chargeId: "pay_8KD21QX", reason: "vi no painel do provedor" }],
    ["POST", `/outbox/${fixture.REVIEW_LINE.id}/confirm-cancelled`, { tenantId: "org-vale", chargeId: "pay_8KD21QX", reason: "cancelada no painel dele" }],
    ["POST", "/statements/st-vale-10/payments", { tenantId: "org-vale", amount: "1020.00", method: "Pix na conta", note: "comprovante no e-mail" }],
    ["POST", "/statements/st-vale-10/payments", { tenantId: "org-vale", amount: "10.00" }],
    ["POST", "/statements/st-vale-10/payments/pg-1/reverse", { tenantId: "org-vale", reason: "baixa lançada errada" }],
    ["POST", "/statements/st-vale-10/payments/pg-1/reverse", { tenantId: "org-vale", reason: "baixa lançada errada", confirmInvoiceCancel: true }],
    ["POST", "/statements/st-vale-10/invoice", { tenantId: "org-vale" }],
    ["POST", `/outbox/${fixture.REVIEW_LINE.id}/resolve`, { tenantId: "org-vale", reason: "conferido no painel dele" }],
    ["POST", `/outbox/${fixture.FAILED_LINE.id}/retry`, { tenantId: "org-litoral" }],
    ["POST", `/outbox/${fixture.FAILED_LINE.id}/retry`, { tenantId: "org-litoral", dueDate: "2026-12-01" }],
  ]);
});

test("T-ACT-10..14 o corpo de cada escrita do canal é exatamente o da §3.2 (ligar = { confirm })", async () => {
  server.serve(() => ({ data: {} }));
  const actions = billingOpsActions(FULL);
  await actions.saveProviderSettings("focusnfe", { environment: "sandbox", settings: { cnpj: "12345678000190" } });
  await actions.saveCredential("asaas", { kind: "api_token", secret: "SEGREDO-DE-TESTE-123" });
  await actions.saveCredential("focusnfe", { kind: "certificate", pfxBase64: "QUJD", password: "senha-do-pfx" });
  await actions.testConnection("asaas");
  await actions.registerWebhook("asaas");
  await actions.enableProvider("asaas", "asaas:sandbox");
  await actions.disableProvider("asaas");
  assert.deepEqual(writes(), [
    ["PUT", "/providers/focusnfe", { environment: "sandbox", settings: { cnpj: "12345678000190" } }],
    ["PUT", "/providers/asaas/credentials", { kind: "api_token", secret: "SEGREDO-DE-TESTE-123" }],
    ["PUT", "/providers/focusnfe/credentials", { kind: "certificate", pfxBase64: "QUJD", password: "senha-do-pfx" }],
    ["POST", "/providers/asaas/test-connection", {}],
    ["POST", "/providers/asaas/register-webhook", {}],
    ["POST", "/providers/asaas/enable", { confirm: "asaas:sandbox" }],
    ["POST", "/providers/asaas/disable", {}],
  ]);
});

// ---- R-ORG -------------------------------------------------------------------------------------------------------------------
test("T-ORG-1 a linha da fila da 2ª organização manda o tenantId DELA (não o da 1ª)", async () => {
  server.serve(() => ({ data: {} }));
  const view = await openDialog({ kind: "resolve", row: VALE, line: fixture.REVIEW_LINE });
  try {
    await type(textarea(view.container), "conferido no painel do provedor");
    await click(confirmButton(view.container));
    assert.deepEqual(writes(), [["POST", `/outbox/${fixture.REVIEW_LINE.id}/resolve`, { tenantId: "org-vale", reason: "conferido no painel do provedor" }]]);
    assert.deepEqual(view.done, ["releu:org-vale:st-vale-10"], "relê a organização da linha");
  } finally {
    await view.unmount();
  }
});

// ---- R-UMA ----------------------------------------------------------------------------------------------------------------------
test("T-UMA-1 duplo clique no confirmar = UMA chamada (o botão fica desabilitado enquanto envia)", async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.serve(on("POST", "/invoice", { data: { statementId: "st-patio-10", seq: 1, providerDisabled: true }, gate }));
  const view = await openDialog({ kind: "invoice", row: PATIO });
  try {
    await click(confirmButton(view.container));
    const sending = confirmButton(view.container);
    assert.ok(sending, "o confirmar continua na tela enquanto envia");
    assert.equal(propsOf(sending).disabled, true, "desabilitado enquanto envia");
    await click(sending);
    await click(confirmButton(view.container));
    release();
    await settle();
    assert.equal(server.writes().length, 1, "uma requisição só");
    assert.match(text(view.container), /A nota fica na fila até o provedor de nota ser ligado/);
  } finally {
    await view.unmount();
  }
});

// ---- R-VALOR na janela -------------------------------------------------------------------------------------------------------
test("T-VAL-8 a baixa: '1,234' mostra erro no campo e não envia; '1.020,00' revisa e envia amount '1020.00'; a tela relê", async () => {
  server.serve(on("POST", "/statements/st-lit-10/payments", { status: 201, data: { notice: null } }));
  const view = await openDialog({ kind: "payment", row: LIT });
  try {
    const amount = field(view.container, (el) => el.getAttribute("data-campo") === "valor");
    await type(amount, "1,234");
    assert.match(text(view.container), /Valor ambíguo/);
    await click(confirmButton(view.container));
    assert.equal(server.writes().length, 0, "valor inválido: zero chamada");
    await type(field(view.container, (el) => el.getAttribute("data-campo") === "valor"), "1.020,00");
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Passo 2 de 2 · nada foi enviado ainda/);
    assert.match(text(view.container).replace(/\s/g, " "), /Registrar o recebimento de R\$ 1\.020,00/);
    assert.equal(server.writes().length, 0, "a revisão ainda não envia");
    await click(confirmButton(view.container));
    assert.deepEqual(writes(), [["POST", "/statements/st-lit-10/payments", { tenantId: "org-litoral", amount: "1020.00" }]]);
    assert.deepEqual(view.done, ["releu:org-litoral:st-lit-10"], "R-RELE: depois do sucesso a tela relê");
    assert.match(text(view.container), /novo saldo|saldo do servidor/);
  } finally {
    await view.unmount();
  }
});

test("T-RELE-2 a baixa com cobrança cheia aberta avisa e oferece 'Cancelar cobrança' (sem prever saldo)", async () => {
  server.serve(on("POST", "/payments", { status: 201, data: { notice: "full_amount_charge_open" } }));
  const view = await openDialog({ kind: "payment", row: VALE });
  try {
    await type(field(view.container, (el) => el.getAttribute("data-campo") === "valor"), "100,00");
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Ainda há cobrança do valor cheio aberta no provedor/);
    await click(button(view.container, /^Cancelar cobrança$/));
    assert.ok(view.done.includes("abriu:cancel"));
    assert.doesNotMatch(text(view.container), /saldo agora/i, "a janela não calcula o saldo novo");
  } finally {
    await view.unmount();
  }
});

// ---- R-CONF --------------------------------------------------------------------------------------------------------------------
test("T-CONF-1 o estorno NUNCA manda confirmInvoiceCancel na 1ª tentativa; depois do 422 pede a caixa", async () => {
  let attempt = 0;
  server.serve(on("POST", "/reverse", () => (++attempt === 1 ? { status: 422, reason: "invoice_cancel_confirmation_required" } : { data: { invoice: "cancel_requested" } })));
  const payment = { id: "pg-1", source: "manual" as const, amount: "1020.00" as never, reversedAmount: null, reversed: false, paidAt: "2026-11-15", method: "Pix", note: null };
  const view = await openDialog({ kind: "reverse", row: PATIO, payment });
  try {
    await type(textarea(view.container), "baixa lançada na organização errada");
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.deepEqual(writes(), [["POST", "/statements/st-patio-10/payments/pg-1/reverse", { tenantId: "org-patio", reason: "baixa lançada na organização errada" }]]);
    assert.match(text(view.container), /Cancelar também a nota fiscal deste mês/);
    // sem marcar a caixa, não segue
    await click(confirmButton(view.container));
    assert.equal(server.writes().length, 1, "sem a caixa marcada, nada sai");
    await check(checkbox(view.container));
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.deepEqual(writes()[1], ["POST", "/statements/st-patio-10/payments/pg-1/reverse", { tenantId: "org-patio", reason: "baixa lançada na organização errada", confirmInvoiceCancel: true }]);
    assert.match(text(view.container), /A nota fiscal entrou em cancelamento/);
  } finally {
    await view.unmount();
  }
});

test("T-CONF-2 a recusa comum do estorno (pelo provedor) vira o texto da lista, sem a caixa da nota", async () => {
  server.serve(on("POST", "/reverse", { status: 422, reason: "use_refund" }));
  const payment = { id: "pg-2", source: "manual" as const, amount: "50.00" as never, reversedAmount: null, reversed: false, paidAt: "2026-11-15", method: null, note: null };
  const view = await openDialog({ kind: "reverse", row: PATIO, payment });
  try {
    await type(textarea(view.container), "estorno pedido pelo cliente");
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.match(text(view.container), /o estorno é feito por lá/);
    assert.doesNotMatch(text(view.container), /Cancelar também a nota fiscal/);
    assert.equal(server.writes().length, 1);
  } finally {
    await view.unmount();
  }
});

// ---- confirmação forte (emenda 1, E2) ------------------------------------------------------------------------------------------
test("F-CONFIRMA-EMITIR sem marcar que conferiu a organização e o saldo, nenhuma chamada sai; marcando, sai uma", async () => {
  server.serve(on("POST", "/charge", { status: 201, data: {} }));
  const view = await openDialog({ kind: "charge", row: LIT });
  try {
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Conferi a organização e o saldo/);
    assert.match(text(view.container).replace(/\s/g, " "), /Guinchos Litoral Norte.*R\$ 1\.890,00/);
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.equal(server.writes().length, 0, "sem conferir, nada sai");
    assert.equal(propsOf(confirmButton(view.container)).disabled === true || propsOf(confirmButton(view.container))["aria-disabled"] === "true", true);
    await check(checkbox(view.container));
    await click(confirmButton(view.container));
    assert.deepEqual(writes(), [["POST", "/statements/st-lit-10/charge", { tenantId: "org-litoral", method: "pix" }]]);
  } finally {
    await view.unmount();
  }
});

test("F-CONFIRMA-EMITIR (recusa) canal desligado: o texto da lista e 'Ver o canal'", async () => {
  server.serve(on("POST", "/charge", { status: 422, reason: "payment_provider_disabled" }));
  const view = await openDialog({ kind: "charge", row: LIT });
  try {
    await click(confirmButton(view.container));
    await check(checkbox(view.container));
    await click(confirmButton(view.container));
    assert.match(text(view.container), /Nenhum provedor de pagamento está ligado/);
    await click(button(view.container, /Ver o canal/));
    assert.ok(view.done.includes("ver-canal"));
  } finally {
    await view.unmount();
  }
});

test("F-CONFIRMA-DESLIGAR sem marcar que conferiu o provedor, nada sai; marcando, sai { } e relê o canal", async () => {
  server.serve(on("POST", "/disable", { data: { provider: "asaas", environment: "sandbox", disabledAt: "x" } }));
  const view = await openDialog({ kind: "disable", provider: fixture.provider({ enabled: true }) });
  try {
    assert.match(text(view.container), /Asaas/);
    await click(confirmButton(view.container));
    await click(confirmButton(view.container));
    assert.equal(server.writes().length, 0, "sem conferir, nada sai");
    await check(checkbox(view.container));
    await click(confirmButton(view.container));
    assert.deepEqual(writes(), [["POST", "/providers/asaas/disable", {}]]);
    assert.deepEqual(view.done, ["releu-canal"]);
  } finally {
    await view.unmount();
  }
});

test("T-ACT-15 cancelar cobrança vista no provedor: o código inválido é erro no campo e trava o envio", async () => {
  server.serve(on("POST", "/cancel-unknown", { data: {} }));
  const view = await openDialog({ kind: "cancel-unknown", row: LIT });
  try {
    const code = field(view.container, (el) => el.localName === "input" && el.hasAttribute("data-autofoco"));
    await type(code, "pay 123!");
    await type(textarea(view.container), "vi no painel do provedor");
    assert.match(text(view.container), /letras, números, hífen ou sublinhado/);
    await click(confirmButton(view.container));
    assert.doesNotMatch(text(view.container), /Passo 2 de 2/);
    assert.equal(server.writes().length, 0);
  } finally {
    await view.unmount();
  }
});

// ---- R5 do porteiro do #608: o estorno de só uma parte, pela Q1 (b) ---------------------------------------------------------
test("T-R5-2 o estorno de só uma parte diz que a nota fica e que o contador é avisado; o que zera diz que a nota entrou em cancelamento", async () => {
  const outcomes: [string, RegExp, RegExp][] = [
    ["kept_partial_reversal", /A nota fiscal fica: ainda há valor pago neste mês, e o contador é avisado/, /entrou em cancelamento/],
    ["cancel_requested", /A nota fiscal entrou em cancelamento/, /A nota fiscal fica/],
    ["none", /Estorno registrado\. A tela vai reler o demonstrativo/, /A nota fiscal (fica|entrou)/],
  ];
  for (const [invoice, says, never] of outcomes) {
    server.serve(on("POST", "/reverse", { data: { invoice } }));
    const payment = { id: "pg-1", source: "manual" as const, amount: "500.00" as never, reversedAmount: null, reversed: false, paidAt: "2026-11-15", method: "Pix", note: null };
    const view = await openDialog({ kind: "reverse", row: PATIO, payment });
    try {
      await type(textarea(view.container), "baixa lançada em dobro");
      await click(confirmButton(view.container));
      await click(confirmButton(view.container));
      assert.equal(server.writes().length, 1, invoice);
      assert.match(text(view.container), says, invoice);
      assert.doesNotMatch(text(view.container), never, invoice);
    } finally {
      await view.unmount();
    }
  }
});

// ---- R-RELE na tela inteira -------------------------------------------------------------------------------------------------
// A página REAL (leitura, janela e releitura), com a sessão do console e o `fetch` como único dublê. A escrita devolve um
// demonstrativo com um saldo que o servidor NUNCA lê de volta (999,99): se a tela usasse o que a própria escrita devolveu, ou
// não relesse, o saldo da tela não seria o da releitura (870,00).
test("T-RELE-1 depois da baixa, a tela relê o demonstrativo (GET depois do POST) e mostra o saldo da releitura, nunca o da escrita", async () => {
  // Os saldos numa fonte só: o que o servidor falso devolve é o que a tela tem de mostrar (sem número literal na asserção).
  const BEFORE = "1890.00";
  const AFTER = "870.00";
  const BAIT = "999.99";
  const brl = (decimal: string) => formatBRL(asMoney(decimal));
  let paid = false;
  const litoral = () => fixture.statementJson("st-lit-10", fixture.MONTH, paid ? { paidAmount: "1020.00", balance: AFTER } : { balance: BEFORE });
  server.serve(
    on("GET", /\/platform\/tenants$/, { data: fixture.ORGS.map((org) => ({ ...org, slug: org.id, plan: "pro", status: "active", activeUsers: 1, enabledModules: [], createdAt: "2026-01-01" })) }),
    on("GET", "/statements/st-lit-10/charges?", { data: { charges: [] } }),
    on("GET", "/statements/st-lit-10?", () => ({ data: { ...litoral(), payments: [], credits: [] } })),
    on("GET", "/statements?tenantId=org-litoral", () => ({ data: [litoral()] })),
    on("GET", "/statements?", { data: [] }),
    on("GET", "/outbox?", { data: [] }),
    on("GET", "/invoices/backlog", { data: [] }),
    on("GET", "/billing-profile", { data: { complete: true, missing: [] } }),
    on("GET", "/providers", { data: [] }),
    on("POST", "/statements/st-lit-10/payments", () => {
      paid = true;
      return { status: 201, data: { notice: null, statement: fixture.statementJson("st-lit-10", fixture.MONTH, { paidAmount: "1020.00", balance: BAIT }) } };
    }),
  );
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:billing:read", "platform:tenants:read", "platform:billing:settle"] } });
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/platform/billing?org=org-litoral&mes=${fixture.MONTH}`] },
        React.createElement(AuthProvider, null, React.createElement(TenantProvider, null, React.createElement(PermissionProvider, null, React.createElement(PlatformBillingOpsPage)))),
      ),
    );
  });
  try {
    await settle();
    const row = elements(container, (el) => el.localName === "tr" && el.getAttribute("class") === "pat-ab-row" && /Guinchos Litoral Norte/.test(text(el)))[0];
    assert.ok(row, "a linha do demonstrativo da organização");
    await act(async () => (propsOf(row).onClick as () => void)());
    await settle();
    assert.ok(text(container).includes(brl(BEFORE)), `antes: o saldo lido (${brl(BEFORE)})`);
    await click(button(container, /^Registrar baixa manual/));
    await type(field(container, (el) => el.getAttribute("data-campo") === "valor"), "1.020,00");
    await click(confirmButton(container));
    await click(confirmButton(container));
    await settle();
    const calls = server.state.calls.map((call) => `${call.method} ${call.url.replace("/api/v1/platform/billing", "")}`);
    const post = calls.indexOf("POST /statements/st-lit-10/payments");
    assert.ok(post >= 0, `a baixa saiu: ${JSON.stringify(calls)}`);
    assert.deepEqual(writes(), [["POST", "/statements/st-lit-10/payments", { tenantId: "org-litoral", amount: "1020.00" }]]);
    const after = calls.slice(post + 1);
    assert.ok(after.includes("GET /statements/st-lit-10?tenantId=org-litoral"), `R-RELE: o GET do demonstrativo depois do POST: ${JSON.stringify(after)}`);
    assert.ok(after.includes("GET /statements?tenantId=org-litoral"), `R-RELE: a lista da organização relida depois do POST: ${JSON.stringify(after)}`);
    const shown = text(container);
    assert.ok(shown.includes(brl(AFTER)), `o saldo da releitura (${brl(AFTER)})`);
    assert.ok(!shown.includes(brl(BAIT)), `nunca o saldo que a escrita devolveu (${brl(BAIT)})`);
  } finally {
    await act(async () => root.unmount());
    dom.doc.body.removeChild(container);
  }
});
