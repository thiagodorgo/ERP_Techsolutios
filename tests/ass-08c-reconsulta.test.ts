// B-ASS-08c1a · Emendas 2, 2.1 e 2.2 — a regra de adoção por tentativa (D-1′), a lista completa (D-2′), a removida sem
// pagamento (D-2.1) e o falso que carimba o dia de São Paulo (D-6′). Em memória e PELO DESPACHO REAL
// (`runDispatchOutbox`, `InMemoryOutboxRepository`, `requestChargeCreate` e o claim reais), salvo onde o título diz
// "adaptador": aí é o `AsaasPaymentAdapter` sobre o falso do Asaas (127.0.0.1:0, nenhuma chamada a host real).
// A régua: cobra uma vez; nunca duas; nunca adota a cobrança de outra intenção.

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.repository.js";
import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { chargeCandidateDecision, runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import type { BillingOutboxRow } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import type { ChargeStatus, ExternalChargeCandidate, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { startAsaasFake, type AsaasFake } from "./helpers/fake-providers/asaas.js";

const TENANT = "22222222-2222-2222-2222-222222222222";
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const T0 = new Date("2026-12-01T12:00:00Z");
const min = (base: Date, n: number) => new Date(base.getTime() + n * 60_000);

type Stored = { chargeId: string; ref: string; amountCents: number; status: ChargeStatus; createdAt: string };
const failure = (code: string) => Object.assign(new Error(code), { code });

/** Porta roteirizada (sem rede): `stored` é o que existe no provedor; `createScript` ("lost" cria e PERDE a resposta;
 * "5xx" não cria) e `lookupScript` ("5xx" falha a reconsulta). O relógio da porta segue o do despacho (`run`). */
class ScriptedPort {
  created: Array<{ externalReference: string; amountCents: number }> = [];
  stored: Stored[] = [];
  createScript: string[] = [];
  lookupScript: string[] = [];
  clock: () => Date = () => new Date();
  async ensureCustomer() { return { customerId: "cus_1" }; }
  async createCharge(input: { externalReference: string; amountCents: number }) {
    this.created.push(input);
    const step = this.createScript.shift() ?? "ok";
    if (step === "5xx") throw failure("provider_unavailable");
    const chargeId = `pay_${this.stored.length + 1}`;
    this.stored.push({ chargeId, ref: input.externalReference, amountCents: input.amountCents, status: "pending", createdAt: SP_DAY.format(this.clock()) });
    if (step === "lost") throw failure("provider_timeout");
    return { chargeId, status: "pending" as const, payUrl: "https://pay.example/x" };
  }
  async getCharge(id: string) { return { status: this.stored.find((charge) => charge.chargeId === id)?.status ?? "unknown", raw: {} }; }
  async listChargesByExternalReference(ref: string): Promise<readonly ExternalChargeCandidate[]> {
    if (this.lookupScript.shift() === "5xx") throw failure("provider_unavailable");
    return this.stored.filter((charge) => charge.ref === ref).map((charge) => ({ chargeId: charge.chargeId, status: charge.status, amountCents: charge.amountCents, createdAt: charge.createdAt }));
  }
  async cancelCharge(chargeId: string) { return { chargeId, status: "cancelled" as const }; }
  async refund(chargeId: string) { return { chargeId, status: "refunded" as const }; }
  async registerWebhook() { return { externalId: "hook_1" }; }
  async verifyWebhook() { return { ok: false as const }; }
  supportedMethods() { return ["pix" as const]; }
  describe() { return { provider: "asaas", supportedMethods: ["pix" as const], pendingHomologation: [], webhookRegistration: "api" as const }; }
}

/** O demonstrativo `closed` (o total em `totalCents`) com a fila, a cobrança, o índice e o pedido reais, em memória. */
async function arm(t0: Date, totalCents = 10_000, port: unknown = new ScriptedPort()) {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const refs = new InMemoryStatementRefRepository();
  const outbox = new InMemoryOutboxRepository({
    readStatement: async (tenantId, statementId) => {
      const statement = await statements.findStatement(tenantId, statementId);
      return statement && {
        status: statement.status,
        reopenedAt: statement.reopenedAt,
        hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined,
        totalCents: statement.totalCents,
      };
    },
    clock: () => t0,
  });
  const statement = await statements.transaction(TENANT, async (tx: any) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({ ...fresh, status: "closed", chargeStatus: "none", totalCents, dueDate: "2026-12-10", closedAt: t0 });
  });
  const intents = new InMemoryChargeIntentRepository({ statements, charges, outbox, refs });
  return { statements, outbox, intents, statementId: statement.id as string, port: port as ScriptedPort };
}
type Arm = Awaited<ReturnType<typeof arm>>;

const request = (a: Arm, now: Date, amountCents: number) =>
  requestChargeCreate({ intents: a.intents }, { tenantId: TENANT, statementId: a.statementId, provider: "asaas", payload: { amountCents, dueDate: "2026-12-10", method: "pix" }, now });
const run = (a: Arm, now: Date) => {
  if (a.port instanceof ScriptedPort) a.port.clock = () => now;
  return runDispatchOutbox({ repo: a.outbox, ports: { asaas: a.port as unknown as PaymentProviderPort }, resolveCustomer: async () => ({ ok: true, customerId: "cus_1" }), now: () => now });
};
const setStatement = (a: Arm, patch: object) =>
  a.statements.transaction(TENANT, async (tx: any) => tx.saveStatement({ ...(await tx.lockById(a.statementId)), ...patch }));
const rowOf = async (a: Arm, id: string) => (await a.outbox.findById(TENANT, id))!;

// ------------------------------------------------------------------ o despacho real (Emenda 2, sem mudança)

test("RV2 (C12): viva de OUTRO valor, intenção única, 1ª tentativa → revisão charge_found_no_candidate, 0 POST", async () => {
  const a = await arm(T0);
  const r = await request(a, T0, 10_000);
  a.port.stored.push({ chargeId: "pay_manual", ref: a.statementId, amountCents: 9_999, status: "pending", createdAt: "2026-12-01" });
  await run(a, T0);
  const f = await rowOf(a, r.id);
  assert.deepEqual([f.status, f.lastError, f.externalId, a.port.created.length], ["NEEDS_REVIEW", "charge_found_no_candidate", null, 0]);
});

test("RV2b (C13): retentativa com viva de OUTRO valor → nunca adota o valor errado nem recria", async () => {
  const a = await arm(T0);
  const r = await request(a, T0, 10_000);
  a.port.lookupScript.push("5xx");
  await run(a, T0);
  a.port.stored.push({ chargeId: "pay_manual", ref: a.statementId, amountCents: 9_999, status: "pending", createdAt: "2026-12-01" });
  await run(a, min(T0, 2));
  const f = await rowOf(a, r.id);
  assert.deepEqual([f.status, f.lastError, f.externalId, a.port.created.length], ["NEEDS_REVIEW", "charge_found_no_candidate", null, 0]);
});

test("RV3 (C7): duas candidatas → charge_found_multiple_candidates, 0 POST", async () => {
  const a = await arm(T0);
  const r = await request(a, T0, 10_000);
  a.port.lookupScript.push("5xx");
  await run(a, T0);
  for (const chargeId of ["pay_x", "pay_y"]) a.port.stored.push({ chargeId, ref: a.statementId, amountCents: 10_000, status: "pending", createdAt: "2026-12-01" });
  await run(a, min(T0, 2));
  const f = await rowOf(a, r.id);
  assert.deepEqual([f.status, f.lastError, f.externalId, a.port.created.length], ["NEEDS_REVIEW", "charge_found_multiple_candidates", null, 0]);
});

test("RV5 (C6): fantasma de MESMO valor e dia do fechamento desfeito × retentativa de R1 → charge_found_for_previous_intent, nunca adota", async () => {
  const a = await arm(T0, 15_000);
  await request(a, T0, 15_000);
  a.port.createScript.push("lost");
  await run(a, T0);
  await setStatement(a, { status: "reopened", reopenedAt: min(T0, 2) });
  await run(a, min(T0, 3));
  await setStatement(a, { status: "closed", totalCents: 15_000, closedAt: min(T0, 4) });
  const r1 = await request(a, min(T0, 5), 15_000);
  a.port.lookupScript.push("5xx");
  await run(a, min(T0, 5));
  await run(a, min(T0, 7));
  const f = await rowOf(a, r1.id);
  assert.deepEqual([f.status, f.lastError, f.externalId, a.port.created.length], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null, 1]);
});

test("RV-DIA (C14): a PRÓPRIA cobrança criada no dia seguinte (SP) ao occurred_at é adotada na retentativa", async () => {
  const enqueued = new Date("2026-12-01T02:50:00Z"); // 23:50 SP de 30/11
  const a = await arm(enqueued);
  const r = await request(a, enqueued, 10_000);
  a.port.createScript.push("lost");
  await run(a, new Date("2026-12-01T03:10:00Z")); // criada às 00:10 SP de 01/12
  const result = await run(a, new Date("2026-12-01T03:12:00Z"));
  const f = await rowOf(a, r.id);
  assert.deepEqual([result.outcomes.recovered, f.status, f.externalId, a.port.created.length], [1, "SENT", "pay_1", 1]);
});

test("RV-ESTADO (C15): desconhecida ESTORNADA de mesmo valor não é candidata → a retentativa adota a própria", async () => {
  const a = await arm(T0);
  const r = await request(a, T0, 10_000);
  a.port.createScript.push("lost");
  await run(a, T0);
  a.port.stored.push({ chargeId: "pay_old", ref: a.statementId, amountCents: 10_000, status: "refunded", createdAt: "2026-12-01" });
  const result = await run(a, min(T0, 2));
  const f = await rowOf(a, r.id);
  assert.deepEqual([result.outcomes.recovered, f.status, f.externalId, a.port.created.length], [1, "SENT", "pay_1", 1]);
});

// ------------------------------------------------------------------ Emenda 2.1

test("RV-DIA-SP (D-6′): a própria criada às 23:55 SP (02:55Z) para o occurred_at das 23:50 SP (02:50Z) é adotada — dia de SP, nunca o UTC", async () => {
  const enqueued = new Date("2026-12-01T02:50:00Z");
  const a = await arm(enqueued);
  const r = await request(a, enqueued, 10_000);
  a.port.createScript.push("lost");
  await run(a, new Date("2026-12-01T02:55:00Z"));
  const result = await run(a, new Date("2026-12-01T02:57:00Z"));
  const f = await rowOf(a, r.id);
  assert.deepEqual([result.outcomes.recovered, f.status, f.externalId, a.port.created.length], [1, "SENT", "pay_1", 1]);
});

test("RV-PURA (D-1′): só a cancelada (removida sem pagamento) deixa de bloquear; a identidade nunca libera a criação", () => {
  const row = {
    id: "00000000-0000-0000-0000-000000000001",
    tenantId: TENANT,
    statementId: "00000000-0000-0000-0000-000000000003",
    kind: "charge_create",
    provider: "asaas",
    payload: { amountCents: 15_000 },
    attempts: 2,
    lastError: "provider_timeout",
    occurredAt: new Date("2026-12-01T12:00:00Z"),
  } as unknown as BillingOutboxRow;
  const otherIntent = { otherIntents: 1 };
  const alone = { otherIntents: 0 };
  const listed = (status: ChargeStatus, amountCents = 10_000, createdAt = "2026-12-01"): ExternalChargeCandidate => ({ chargeId: "pay_1", status, amountCents, createdAt });

  assert.deepEqual(chargeCandidateDecision(row, [listed("cancelled")], otherIntent, false), { kind: "create" }, "C8: a de R0 removida → cria");
  assert.deepEqual(chargeCandidateDecision(row, [listed("cancelled")], otherIntent, true), { kind: "review", code: "orphan_recovery_not_found" }, "órfã com só a removida → nunca cria");
  assert.deepEqual(chargeCandidateDecision(row, [listed("cancelled", 15_000)], alone, false), { kind: "create" }, "C18: desconhecida cancelada de mesmo valor → cria");
  for (const status of ["pending", "overdue", "paid", "partially_paid", "unknown", "refunded", "partially_refunded", "chargeback_disputed", "charged_back"] as const) {
    assert.deepEqual(chargeCandidateDecision(row, [listed(status)], otherIntent, false), { kind: "review", code: "charge_found_for_previous_intent" }, `R0 ${status} bloqueia (linha nova)`);
    assert.deepEqual(chargeCandidateDecision(row, [listed(status)], otherIntent, true), { kind: "review", code: "orphan_found_previous_intent" }, `R0 ${status} bloqueia (órfã)`);
    assert.deepEqual(chargeCandidateDecision(row, [listed(status)], alone, false), { kind: "review", code: "charge_found_no_candidate" }, `desconhecida ${status} bloqueia`);
  }
  for (const status of ["unknown", "refunded", "partially_refunded", "chargeback_disputed", "charged_back"] as const) {
    assert.deepEqual(chargeCandidateDecision(row, [listed(status, 15_000)], alone, false), { kind: "review", code: "charge_found_no_candidate" }, `C16: ${status} de mesmo valor nunca é candidata e bloqueia`);
  }
  const own = listed("pending", 15_000);
  assert.deepEqual(chargeCandidateDecision(row, [own], alone, false), { kind: "adopt", candidate: own }, "1 candidata → adoptionDecision");
  assert.deepEqual(chargeCandidateDecision(row, [own, { ...own, chargeId: "pay_2" }], alone, false), { kind: "review", code: "charge_found_multiple_candidates" }, "2 candidatas → revisão");
  assert.deepEqual(chargeCandidateDecision(row, [listed("pending", Number.NaN)], alone, false), { kind: "review", code: "charge_found_no_candidate" }, "C17: valor ausente → revisão");
  assert.deepEqual(chargeCandidateDecision(row, [listed("pending", 15_000, "")], alone, false), { kind: "review", code: "charge_found_no_candidate" }, "C17: data ausente → revisão");
});

for (const phantom of ["pending", "overdue", "paid", "partially_paid", "unknown", "refunded", "chargeback_disputed", "cancelled"] as const) {
  test(`RV-VIVA-PROVEDOR (C22): fantasma de R0 (R$ 100) ${phantom} no provedor, visão interna sem viva, R1 (R$ 150)`, async () => {
    const a = await arm(T0, 10_000);
    await request(a, T0, 10_000);
    a.port.createScript.push("lost");
    await run(a, T0);
    await setStatement(a, { status: "reopened", reopenedAt: min(T0, 2) });
    await run(a, min(T0, 3)); // o claim pula R0 (statement_reopened)
    await setStatement(a, { status: "closed", totalCents: 15_000, closedAt: min(T0, 4) });
    a.port.stored[0]!.status = phantom;
    const r1 = await request(a, min(T0, 5), 15_000);
    await run(a, min(T0, 5));
    const f = await rowOf(a, r1.id);
    if (phantom === "cancelled") assert.deepEqual([f.status, a.port.created.length], ["SENT", 2], "controle: só a cancelada libera a criação");
    else assert.deepEqual([f.status, f.lastError, f.externalId, a.port.created.length], ["NEEDS_REVIEW", "charge_found_for_previous_intent", null, 1]);
  });
}

// ------------------------------------------------------------------ o adaptador real sobre o falso do Asaas

const STATEMENT = "11111111-2222-3333-4444-555555555555";

async function adapterOver(options: Parameters<typeof startAsaasFake>[1] = {}): Promise<{ server: AsaasFake; adapter: AsaasPaymentAdapter }> {
  const server = await startAsaasFake("ok", options);
  const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3` });
  return { server, adapter: new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE")) };
}
const charge = (amountCents: number, externalReference = STATEMENT) =>
  ({ customerId: "cus_0001", amountCents, dueDate: "2026-12-10", description: "Assinatura", externalReference, method: "pix" as const });

test("RV3-ASAAS (adaptador): duas cobranças da mesma referência → a lista traz as 2, com valor e dia", async () => {
  const { server, adapter } = await adapterOver({ now: () => T0 });
  try {
    const first = await adapter.createCharge(charge(10_000));
    const second = await adapter.createCharge(charge(15_000));
    await adapter.createCharge(charge(20_000, "outra-referencia"));
    assert.deepEqual(await adapter.listChargesByExternalReference(STATEMENT), [
      { chargeId: first.chargeId, status: "pending", amountCents: 10_000, createdAt: "2026-12-01" },
      { chargeId: second.chargeId, status: "pending", amountCents: 15_000, createdAt: "2026-12-01" },
    ]);
  } finally {
    await server.close();
  }
});

const LIST_MAP: ReadonlyArray<{ readonly label: string; readonly apply: (server: AsaasFake, adapter: AsaasPaymentAdapter, id: string) => Promise<void>; readonly expected: ChargeStatus }> = [
  { label: "(a) DELETE → cancelled", apply: async (_s, adapter, id) => { await adapter.cancelCharge(id); }, expected: "cancelled" },
  { label: "(b) deleted: true com status PENDING → cancelled", apply: async (server, _a, id) => { server.patchPayment(id, { deleted: true }); }, expected: "cancelled" },
  { label: "(c) DELETED com paymentDate → unknown, nunca cancelled", apply: async (server, _a, id) => { server.patchPayment(id, { status: "DELETED", paymentDate: "2026-12-01" }); }, expected: "unknown" },
  { label: "(d) DELETED com confirmedDate → unknown, nunca cancelled", apply: async (server, _a, id) => { server.patchPayment(id, { status: "DELETED", confirmedDate: "2026-12-01" }); }, expected: "unknown" },
  { label: "(e) DELETED com clientPaymentDate → unknown, nunca cancelled", apply: async (server, _a, id) => { server.patchPayment(id, { status: "DELETED", clientPaymentDate: "2026-12-01" }); }, expected: "unknown" },
  { label: "(f) REFUND_IN_PROGRESS → unknown", apply: async (server, _a, id) => { server.setPaymentStatus(id, "REFUND_IN_PROGRESS"); }, expected: "unknown" },
  { label: "(g) RECEIVED → paid", apply: async (server, _a, id) => { server.setPaymentStatus(id, "RECEIVED"); }, expected: "paid" },
];

for (const line of LIST_MAP) {
  test(`RV-LISTA-MAPA (adaptador, D-2.1) ${line.label}`, async () => {
    const { server, adapter } = await adapterOver({ now: () => T0 });
    try {
      const created = await adapter.createCharge(charge(10_000));
      await line.apply(server, adapter, created.chargeId);
      const listed = await adapter.listChargesByExternalReference(STATEMENT);
      assert.deepEqual(listed.map((candidate) => [candidate.chargeId, candidate.status]), [[created.chargeId, line.expected]]);
    } finally {
      await server.close();
    }
  });
}

for (const shape of ["has_more", "no_meta", "no_total", "no_has_more", "total_mismatch"] as const) {
  test(`RV-PAG (adaptador, D-2′): a página ${shape} não prova que está completa → provider_list_incomplete`, async () => {
    const { server, adapter } = await adapterOver({ now: () => T0, listShape: shape });
    try {
      await adapter.createCharge(charge(10_000));
      await assert.rejects(adapter.listChargesByExternalReference(STATEMENT), (error: unknown) => (error as { code?: unknown }).code === "provider_list_incomplete");
    } finally {
      await server.close();
    }
  });
}

test("RV-PAG (adaptador, D-2′): a página complete devolve a lista, pedida com offset=0&limit=100", async () => {
  const { server, adapter } = await adapterOver({ now: () => T0, listShape: "complete" });
  try {
    const created = await adapter.createCharge(charge(10_000));
    assert.deepEqual(await adapter.listChargesByExternalReference(STATEMENT), [{ chargeId: created.chargeId, status: "pending", amountCents: 10_000, createdAt: "2026-12-01" }]);
    const list = server.recorded.filter((recorded) => recorded.method === "GET" && recorded.path.startsWith("/v3/payments?"));
    assert.deepEqual(list.map((recorded) => new URL(recorded.path, "http://fake").searchParams.toString()), [`externalReference=${STATEMENT}&offset=0&limit=100`]);
  } finally {
    await server.close();
  }
});

test("RV-PAG-DESPACHO (D-2′): pelo despacho real, a lista sem metadados reagenda a linha nova com provider_list_incomplete e 0 POST /v3/payments", async () => {
  const { server, adapter } = await adapterOver({ now: () => T0, listShape: "no_meta" });
  try {
    const a = await arm(T0, 10_000, adapter);
    const r = await request(a, T0, 10_000);
    const result = await run(a, T0);
    const f = await rowOf(a, r.id);
    assert.deepEqual([result.outcomes.retry, f.status, f.lastError, f.externalId], [1, "PENDING", "provider_list_incomplete", null]);
    assert.equal(server.recorded.filter((recorded) => recorded.method === "POST" && recorded.path === "/v3/payments").length, 0, "0 POST /v3/payments");
  } finally {
    await server.close();
  }
});

for (const [instant, day] of [["2026-12-01T02:50:00Z", "2026-11-30"], ["2026-12-01T03:10:00Z", "2026-12-01"]] as const) {
  test(`RV-FALSO (D-6′): o falso com o relógio em ${instant} carimba o dia de São Paulo ${day}`, async () => {
    const { server, adapter } = await adapterOver({ now: () => new Date(instant) });
    try {
      await adapter.createCharge(charge(10_000));
      assert.deepEqual((await adapter.listChargesByExternalReference(STATEMENT)).map((candidate) => candidate.createdAt), [day]);
    } finally {
      await server.close();
    }
  });
}
