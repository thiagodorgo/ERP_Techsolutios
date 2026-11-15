import assert from "node:assert/strict";
import test from "node:test";

import { toClientPaymentView } from "../../src/modules/subscription-billing/charges/charge-view";
import type { TenantSubscriptionView } from "../../src/modules/subscription-billing/statements/subscription-view";
import { adaptMySubscriptionResponse, httpsOrNull } from "../src/modules/settings/subscription/my-subscription.adapter";
import { buildMySubscriptionScreen, dateBR } from "../src/modules/settings/subscription/my-subscription.state";
import type { MySubscription } from "../src/modules/settings/subscription/my-subscription.types";

// B-ASS-11 (F2, Emenda 1 §8.1 e Emenda 1.1 §5.1) — o adapter da tela lê a resposta de `GET /billing/subscription` por
// ALLOWLIST, um nível por função (T-A1, em 8 níveis), aceita as duas formas do "sem meio" (T-A2), só `https:` e
// normalizado (T-A3, T-A3b), `data: null` → sem assinatura (T-A4), forma errada → `invalid` (T-A5), datas por corte de
// texto (T-A6) e três tolerâncias: em atraso sem data (T-A7), plano sem nome (T-A8) e fatura sem vencimento (T-A9).

/** A resposta REAL da rota do cliente (forma de `subscription-view.ts`), com fatura em aberto e os 4 meios nulos. */
function realView(): TenantSubscriptionView {
  return {
    period: "2026-11",
    plan: { code: "plus", name: "Plus" },
    usage: {
      users: { used: 18, included: 20, overLimit: false },
      storageGb: { used: 42.3, included: 50, overLimit: false, measuredAt: "2026-11-13", estimate: true },
    },
    status: { inGoodStanding: false, overdueSince: "2026-10-11", nextDueDate: "2026-10-11" },
    payment: { statementId: "stm-exemplo", dueDate: "2026-10-11", payUrl: null, pixCopyPaste: null, boletoLine: null, boletoUrl: null, invoicePdfAvailable: false },
  };
}

type Json = Record<string, unknown>;
const clone = <T>(input: T): T => JSON.parse(JSON.stringify(input)) as T;

function ready(response: unknown): MySubscription {
  const parsed = adaptMySubscriptionResponse(response);
  assert.equal(parsed.kind, "ready", `esperado "ready": ${JSON.stringify(parsed)}`);
  return (parsed as { subscription: MySubscription }).subscription;
}

function keyPaths(input: unknown, prefix = ""): string[] {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return [];
  return Object.entries(input as Json).flatMap(([key, child]) => {
    const here = prefix ? `${prefix}.${key}` : key;
    return [here, ...keyPaths(child, here)];
  });
}

const EXACT_PATHS = [
  "payment",
  "payment.boletoLine",
  "payment.boletoUrl",
  "payment.dueDate",
  "payment.payUrl",
  "payment.pixCopyPaste",
  "period",
  "planName",
  "status",
  "status.inGoodStanding",
  "status.nextDueDate",
  "status.overdueSince",
  "storageGb",
  "storageGb.included",
  "storageGb.measuredAt",
  "storageGb.overLimit",
  "storageGb.used",
  "users",
  "users.included",
  "users.overLimit",
  "users.used",
];
const FORBIDDEN_KEY = /(price|amount|cost|total|margin|value|cents|modules|addons|tracked|tenant|statement)/i;
const EXTRAS = { totalCents: 98700, amount: 987, price: 990, modules: ["frota"], addons: ["rastreamento"], trackedVehicles: 12, tenantId: "org-outra", margin: 0.31, costCents: 41000, value: 987 };
const LEVELS = ["data", "plan", "usage", "usage.users", "usage.storageGb", "status", "payment"] as const;

function withExtras(view: Json, level: string): Json {
  if (level === "data") return Object.assign(view, EXTRAS);
  const target = level.split(".").reduce<Json>((node, key) => node[key] as Json, view);
  Object.assign(target, EXTRAS);
  return view;
}

for (const level of [...LEVELS, "todos"] as const) {
  test(`T-A1 allowlist por conjunto exato — chaves extras no nível "${level}"`, () => {
    const view = clone(realView()) as unknown as Json;
    for (const target of level === "todos" ? LEVELS : [level]) withExtras(view, target);
    const paths = keyPaths(ready({ data: view })).sort();
    assert.deepEqual(paths, EXACT_PATHS, `caminhos do estado com extras em "${level}"`);
    assert.deepEqual(paths.filter((path) => FORBIDDEN_KEY.test(path)), [], "nenhum caminho de dinheiro, módulo, veículo, organização ou demonstrativo");
  });
}

test("T-A1 sem extras, a resposta real já sai no conjunto exato (o identificador do demonstrativo e a nota não entram)", () => {
  assert.deepEqual(keyPaths(ready({ data: realView() })).sort(), EXACT_PATHS);
});

test("T-A2 o \"sem meio\" nas duas formas do servidor (meios null e meios ausentes de toClientPaymentView) dá o mesmo; com payUrl, só Pagar", () => {
  const nullForm = realView();
  const statement = { id: "stm-exemplo", status: "closed", totalCents: 98700, paidCents: 0, dueDate: "2026-10-11", invoiceStatus: "pending" } as unknown as Parameters<typeof toClientPaymentView>[0];
  const charge = { status: "pending", dueDate: "2026-10-11" } as unknown as Parameters<typeof toClientPaymentView>[1];
  const absentForm = { ...realView(), payment: toClientPaymentView(statement, charge) };
  assert.deepEqual(Object.keys(absentForm.payment ?? {}).sort(), ["dueDate", "invoicePdfAvailable", "statementId"], "a função real omite os meios");
  const fromNull = ready({ data: nullForm }).payment;
  const fromAbsent = ready({ data: absentForm }).payment;
  assert.deepEqual(fromNull, fromAbsent);
  assert.deepEqual(fromNull, { dueDate: "2026-10-11", payUrl: null, pixCopyPaste: null, boletoLine: null, boletoUrl: null });
  assert.deepEqual(buildMySubscriptionScreen(ready({ data: nullForm }), "2026-11-14", "Organização").invoice?.means, []);

  const chargeWithLink = { status: "pending", dueDate: "2026-10-11", payUrl: "https://pagamento.exemplo/fatura" } as unknown as Parameters<typeof toClientPaymentView>[1];
  const linkOnly = ready({ data: { ...realView(), payment: toClientPaymentView(statement, chargeWithLink) } });
  const invoice = buildMySubscriptionScreen(linkOnly, "2026-11-14", "Organização").invoice;
  assert.deepEqual(invoice?.means, ["payUrl"], "só o meio que veio");
  assert.equal(invoice?.hasPaymentMean, true);
});

test("T-A3 javascript:, http:, //… e data: são descartados; https:// é mantido", () => {
  for (const bad of ["javascript:alert(1)", "http://pagamento.exemplo/fatura", "//pagamento.exemplo/fatura", "data:text/html,oi", "pagamento.exemplo/fatura", "", 42, null]) {
    assert.equal(httpsOrNull(bad), null, `descartar ${JSON.stringify(bad)}`);
    const view = realView() as unknown as { payment: Json };
    view.payment.payUrl = bad;
    view.payment.boletoUrl = bad;
    const payment = ready({ data: view }).payment;
    assert.equal(payment?.payUrl, null);
    assert.equal(payment?.boletoUrl, null);
  }
  assert.equal(httpsOrNull("https://pagamento.exemplo/fatura"), "https://pagamento.exemplo/fatura");
  const view = realView() as unknown as { payment: Json };
  view.payment.payUrl = "https://pagamento.exemplo/fatura";
  assert.equal(ready({ data: view }).payment?.payUrl, "https://pagamento.exemplo/fatura");
});

test("T-A3b \" https://x.exemplo/a \" sai normalizado: \"https://x.exemplo/a\", nunca o texto cru", () => {
  assert.equal(httpsOrNull(" https://x.exemplo/a "), "https://x.exemplo/a");
  const view = realView() as unknown as { payment: Json };
  view.payment.payUrl = " https://x.exemplo/a ";
  view.payment.boletoUrl = "\thttps://x.exemplo/b\n";
  const payment = ready({ data: view }).payment;
  assert.equal(payment?.payUrl, "https://x.exemplo/a");
  assert.equal(payment?.boletoUrl, "https://x.exemplo/b");
});

test("T-A4 data: null → sem assinatura (none)", () => {
  assert.deepEqual(adaptMySubscriptionResponse({ data: null }), { kind: "none" });
});

test("T-A5 número negativo, NaN, data fora de AAAA-MM-DD ou usage ausente → invalid", () => {
  const cases: Array<[string, (view: Json) => void]> = [
    ["usuários negativos", (view) => (((view.usage as Json).users as Json).used = -1)],
    ["limite NaN", (view) => (((view.usage as Json).users as Json).included = Number.NaN)],
    ["espaço infinito", (view) => (((view.usage as Json).storageGb as Json).used = Number.POSITIVE_INFINITY)],
    ["número em texto", (view) => (((view.usage as Json).storageGb as Json).included = "50")],
    ["medição fora de AAAA-MM-DD", (view) => (((view.usage as Json).storageGb as Json).measuredAt = "13/11/2026")],
    ["atraso fora de AAAA-MM-DD", (view) => ((view.status as Json).overdueSince = "2026-10-11T03:00:00Z")],
    ["vencimento fora de AAAA-MM-DD", (view) => ((view.payment as Json).dueDate = "2026-10")],
    ["período fora de AAAA-MM", (view) => (view.period = "novembro")],
    ["usage ausente", (view) => delete view.usage],
    ["status ausente", (view) => delete view.status],
    ["inGoodStanding em texto", (view) => ((view.status as Json).inGoodStanding = "true")],
  ];
  for (const [name, change] of cases) {
    const view = realView() as unknown as Json;
    change(view);
    assert.deepEqual(adaptMySubscriptionResponse({ data: view }), { kind: "invalid" }, name);
  }
  for (const envelope of [null, undefined, [], "texto", { items: [] }, { data: [] }, { data: "x" }]) {
    assert.deepEqual(adaptMySubscriptionResponse(envelope), { kind: "invalid" }, `envelope ${JSON.stringify(envelope)}`);
  }
});

test("T-A6 \"2026-01-01\" → \"01/01/2026\" (corte de texto, sem new Date)", () => {
  assert.equal(dateBR("2026-01-01"), "01/01/2026");
  assert.equal(dateBR("2026-12-31"), "31/12/2026");
  const screen = buildMySubscriptionScreen(ready({ data: { ...realView(), status: { inGoodStanding: false, overdueSince: "2026-01-01", nextDueDate: "2026-01-01" } } }), "2026-02-01", null);
  assert.equal(screen.situationTitle, "Em atraso desde 01/01/2026");
});

test("T-A7 inGoodStanding false com overdueSince null → pronto, \"Em atraso\" (nunca invalid nem \"desde\")", () => {
  const subscription = ready({ data: { ...realView(), status: { inGoodStanding: false, overdueSince: null, nextDueDate: "2026-11-11" } } });
  assert.equal(subscription.status.overdueSince, null);
  const screen = buildMySubscriptionScreen(subscription, "2026-11-14", null);
  assert.equal(screen.overdue, true);
  assert.equal(screen.situationTitle, "Em atraso");
});

test("T-A8 plan.name vazio → pronto, planName null (nunca invalid)", () => {
  assert.equal(ready({ data: { ...realView(), plan: { code: "plus", name: "" } } }).planName, null);
  assert.equal(ready({ data: { ...realView(), plan: { code: "plus", name: "   " } } }).planName, null);
});

test("T-A9 payment.dueDate null → pronto, fatura em aberto sem data", () => {
  const view = realView();
  const subscription = ready({ data: { ...view, payment: { ...view.payment!, dueDate: null } } });
  assert.equal(subscription.payment?.dueDate, null);
  const invoice = buildMySubscriptionScreen(subscription, "2026-11-14", "Organização").invoice;
  assert.equal(invoice?.title, "Fatura em aberto");
  assert.equal(invoice?.dueCaption, "Sem data de vencimento");
  assert.equal(invoice?.copyText, "Organização · fatura em aberto · sem data de vencimento");
});
