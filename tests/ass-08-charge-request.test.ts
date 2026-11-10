// B-ASS-08 — conserto J-522 (C3-01 / R-CHG-2, D1): um `/charge` por demonstrativo, decidido ANTES de enfileirar, na
// transação com o demonstrativo travado (`requestChargeCreate`). T-CHG-5/6.
// Vermelho-controle: no objeto `92d644db` nem `requestChargeCreate` nem `chargeCreateEligibility` existem
// (`git grep 'charge_already_exists' -- src tests` → 0) — o arquivo inteiro falha por import.
// Mutação literal do plano (D1: "tirar a checagem → vermelho"): `requestChargeCreate` sem `chargeCreateEligibility`
// (sempre elegível) → T-CHG-5 e T-CHG-6 vermelhos.

import assert from "node:assert/strict";
import test from "node:test";

import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { chargeCreateClaimVerdict, runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementError, type StatementStatus } from "../src/modules/subscription-billing/statements/statement.types.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import type { ChargeResult, CreateChargeInput, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

class RecordingPort implements PaymentProviderPort {
  readonly created: CreateChargeInput[] = [];
  async ensureCustomer() { return { customerId: "cus_ensured" }; }
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.created.push(input);
    return { chargeId: `pay_${this.created.length}`, status: "pending", payUrl: "https://pay.example/x" };
  }
  async getCharge() { return { status: "pending" as const, raw: {} }; }
  async findChargeByExternalReference() { return null; }
  async cancelCharge(id: string) { return { chargeId: id, status: "cancelled" as const }; }
  async refund(id: string) { return { chargeId: id, status: "refunded" as const }; }
  async registerWebhook() { return { externalId: "h" }; }
  async verifyWebhook() { return { ok: false }; }
  supportedMethods(): readonly PaymentMethod[] { return ["pix", "credit_card", "debit_card"]; }
  describe() { return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const }; }
}

type Harness = {
  readonly statements: InMemoryStatementRepository;
  readonly charges: InMemoryStatementChargeRepository;
  readonly outbox: InMemoryOutboxRepository;
  readonly refs: InMemoryStatementRefRepository;
  readonly statementId: string;
};

/** Demonstrativo no estado dado (R$ 100) + portas ligadas ao estado REAL (demonstrativo + cobranças). */
async function harness(status: StatementStatus, t0: Date): Promise<Harness> {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const outbox = new InMemoryOutboxRepository({
    readStatement: async (tenantId, statementId) => {
      const current = await statements.findStatement(tenantId, statementId);
      return current && { status: current.status, reopenedAt: current.reopenedAt, hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined };
    },
    clock: () => t0,
  });
  const refs = new InMemoryStatementRefRepository();
  const statement = await statements.transaction(TENANT, async (tx) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({
      ...fresh,
      status,
      totalCents: 10000,
      dueDate: status === "open" ? null : "2026-12-10",
      closedAt: status === "open" || status === "reopened" ? null : t0,
    });
  });
  return { statements, charges, outbox, refs, statementId: statement.id };
}

function request(h: Harness, seq: number, now: Date) {
  return requestChargeCreate(
    { statements: h.statements, charges: h.charges, outbox: h.outbox, refs: h.refs },
    { tenantId: TENANT, statementId: h.statementId, provider: "asaas", seq, payload: { amountCents: 10000, dueDate: "2026-12-10", method: "pix" }, now },
  );
}

const rejects422 = (reason: string) => (error: unknown) =>
  error instanceof StatementError && error.statusCode === 422 && error.reason === reason;

test("R-CHG-2 2º /charge com a 1ª SENT → 422 charge_already_exists, 1 linha, 1 chamada ao provedor (T-CHG-5)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const h = await harness("closed", t0);

  const first = await request(h, 1, t0);
  assert.equal(first.status, "PENDING");
  assert.equal((await h.refs.resolve(h.statementId))?.tenantId, TENANT, "o índice de ids nasce junto da intenção");

  const port = new RecordingPort();
  const run = await runDispatchOutbox({ repo: h.outbox, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus_1" }), now: () => t0 });
  assert.equal(run.outcomes.sent, 1);
  assert.equal(port.created.length, 1, "a 1ª intenção vira exatamente 1 POST /payments");
  assert.equal((await h.outbox.findById(TENANT, first.id))?.status, "SENT");

  await assert.rejects(request(h, 2, new Date(t0.getTime() + 60_000)), rejects422("charge_already_exists"), "a 2ª intenção é recusada ANTES de enfileirar");
  assert.equal((await h.outbox.listByStatement(TENANT, h.statementId)).length, 1, "nada novo na fila");
  assert.equal(port.created.length, 1, "o provedor continua com 1 cobrança — nunca 2 (D1)");
});

test("R-CHG-2 /charge fora de closed → 422 statement_not_closed; cobrança viva já gravada → 422 charge_already_exists (T-CHG-6)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  for (const status of ["paid", "cancelled", "open", "reopened"] as const) {
    const h = await harness(status, t0);
    await assert.rejects(request(h, 1, t0), rejects422("statement_not_closed"), `/charge em ${status} é recusado`);
    assert.equal((await h.outbox.listByStatement(TENANT, h.statementId)).length, 0, `nada enfileirado em ${status}`);
  }

  // Cobrança viva (`pending`) já na tabela, SEM linha na outbox: a elegibilidade lê a TABELA, não só a fila.
  const live = await harness("closed", t0);
  await live.charges.insert({ tenantId: TENANT, statementId: live.statementId, provider: "asaas", externalChargeId: "pay_live", status: "pending", payUrl: "https://pay/x", dueDate: "2026-12-10" }, t0);
  await assert.rejects(request(live, 1, t0), rejects422("charge_already_exists"));
  assert.equal((await live.outbox.listByStatement(TENANT, live.statementId)).length, 0);

  // E a linha NEEDS_REVIEW também segura o 2º pedido (a lista de estados vivos inclui NEEDS_REVIEW).
  const review = await harness("closed", t0);
  const row = await request(review, 1, t0);
  await review.outbox.markNeedsReview(TENANT, row.id, "orphan_recovery_not_found", t0);
  await assert.rejects(request(review, 2, t0), rejects422("charge_already_exists"), "linha em revisão ainda é intenção viva");

  // Controle positivo: `closed` limpo passa, e o verdict do claim (R-OBX-5) concorda com a elegibilidade.
  const ok = await harness("closed", t0);
  const created = await request(ok, 1, t0);
  const claimed = await ok.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "t", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
  assert.equal(claimed?.kind, "claimed");
  assert.equal(claimed?.row.id, created.id);
});
