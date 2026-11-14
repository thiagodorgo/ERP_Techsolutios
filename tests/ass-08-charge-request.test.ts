// B-ASS-08 — conserto J-522 (C3-01 / R-CHG-2, D1): um `/charge` por demonstrativo, decidido ANTES de enfileirar, na
// transação com o demonstrativo travado (`requestChargeCreate`). T-CHG-5/6.
// 2º conserto do #522 (E8, plano `B-ASS-08-conserto-c2.md` §2.4): o pedido é UMA transação por UMA porta
// (`ChargeIntentRepository`) — trava, elegibilidade, `seq` calculado sob a trava, índice e linha. `ChargeRequestInput`
// perdeu o `seq`; `created = false` → 409 `charge_intent_conflict`, nunca "ok". T-CHG-5/6 religados a `{ intents }`
// (asserções iguais); T-CHG-7 (o `seq` sai sob a trava) e T-CHG-7b (fail-closed no conflito) novos.
// Vermelho-controle: no objeto `807deb7e` não existe `charges/charge-intent.repository.ts` — o arquivo inteiro falha por
// import (`ERR_MODULE_NOT_FOUND`).
// Mutações literais do plano (§3, critério 1): M1a (sem `chargeCreateEligibility` em `enqueueChargeCreateInTx`) → T-CHG-5
// e T-CHG-6 vermelhos; M1d (`seq` fixo em 1) → T-CHG-7 vermelho (409); M1e (devolver a linha existente quando
// `created = false`) → T-CHG-7b vermelho.

import assert from "node:assert/strict";
import test from "node:test";

import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InMemoryChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.repository.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryOutboxRepository, leaseOf, type InMemoryOutboxOptions } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { chargeCreateClaimVerdict, runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import type { BillingOutboxRow, NewOutboxRow } from "../src/modules/subscription-billing/outbox/outbox.types.js";
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
  async listChargesByExternalReference() { return []; }
  async cancelCharge(id: string) { return { chargeId: id, status: "cancelled" as const }; }
  async refund(id: string) { return { chargeId: id, status: "refunded" as const }; }
  async registerWebhook() { return { externalId: "h" }; }
  async verifyWebhook() { return { ok: false }; }
  supportedMethods(): readonly PaymentMethod[] { return ["pix", "credit_card", "debit_card"]; }
  describe() { return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const }; }
}

/** T-CHG-7b: uma fila cujo `enqueue` responde `created: false` — o conflito que a trava torna impossível no Prisma. */
class ConflictingOutbox extends InMemoryOutboxRepository {
  async enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }> {
    const { row } = await super.enqueue(input, now);
    return { row, created: false };
  }
}

type Harness = {
  readonly statements: InMemoryStatementRepository;
  readonly charges: InMemoryStatementChargeRepository;
  readonly outbox: InMemoryOutboxRepository;
  readonly refs: InMemoryStatementRefRepository;
  readonly intents: InMemoryChargeIntentRepository;
  readonly statementId: string;
};

/** Demonstrativo no estado dado (R$ 100) + portas ligadas ao estado REAL (demonstrativo + cobranças). */
async function harness(status: StatementStatus, t0: Date, makeOutbox: (options: InMemoryOutboxOptions) => InMemoryOutboxRepository = (o) => new InMemoryOutboxRepository(o)): Promise<Harness> {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const outbox = makeOutbox({
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
  const intents = new InMemoryChargeIntentRepository({ statements, charges, outbox, refs });
  return { statements, charges, outbox, refs, intents, statementId: statement.id };
}

function request(h: Harness, now: Date, payload: Readonly<Record<string, unknown>> = { amountCents: 10000, dueDate: "2026-12-10", method: "pix" }) {
  return requestChargeCreate({ intents: h.intents }, { tenantId: TENANT, statementId: h.statementId, provider: "asaas", payload, now });
}

const rejects422 = (reason: string) => (error: unknown) =>
  error instanceof StatementError && error.statusCode === 422 && error.reason === reason;

test("R-CHG-2 2º /charge com a 1ª SENT → 422 charge_already_exists, 1 linha, 1 chamada ao provedor (T-CHG-5)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const h = await harness("closed", t0);

  const first = await request(h, t0);
  assert.equal(first.status, "PENDING");
  assert.equal((await h.refs.resolve(h.statementId))?.tenantId, TENANT, "o índice de ids nasce junto da intenção");

  const port = new RecordingPort();
  const run = await runDispatchOutbox({ repo: h.outbox, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus_1" }), now: () => t0 });
  assert.equal(run.outcomes.sent, 1);
  assert.equal(port.created.length, 1, "a 1ª intenção vira exatamente 1 POST /payments");
  assert.equal((await h.outbox.findById(TENANT, first.id))?.status, "SENT");

  await assert.rejects(request(h, new Date(t0.getTime() + 60_000)), rejects422("charge_already_exists"), "a 2ª intenção é recusada ANTES de enfileirar");
  assert.equal((await h.outbox.listByStatement(TENANT, h.statementId)).length, 1, "nada novo na fila");
  assert.equal(port.created.length, 1, "o provedor continua com 1 cobrança — nunca 2 (D1)");
});

test("R-CHG-2 /charge fora de closed → 422 statement_not_closed; cobrança viva já gravada → 422 charge_already_exists (T-CHG-6)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  for (const status of ["paid", "cancelled", "open", "reopened"] as const) {
    const h = await harness(status, t0);
    await assert.rejects(request(h, t0), rejects422("statement_not_closed"), `/charge em ${status} é recusado`);
    assert.equal((await h.outbox.listByStatement(TENANT, h.statementId)).length, 0, `nada enfileirado em ${status}`);
  }

  // Cobrança viva (`pending`) já na tabela, SEM linha na outbox: a elegibilidade lê a TABELA, não só a fila.
  const live = await harness("closed", t0);
  await live.charges.insert({ tenantId: TENANT, statementId: live.statementId, provider: "asaas", externalChargeId: "pay_live", status: "pending", payUrl: "https://pay/x", dueDate: "2026-12-10" }, t0);
  await assert.rejects(request(live, t0), rejects422("charge_already_exists"));
  assert.equal((await live.outbox.listByStatement(TENANT, live.statementId)).length, 0);

  // E a linha NEEDS_REVIEW também segura o 2º pedido (a lista de estados vivos inclui NEEDS_REVIEW).
  const review = await harness("closed", t0);
  const row = await request(review, t0);
  {
    const setup = await review.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "setup", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
    assert.equal(setup?.kind, "claimed", "montagem: posse");
    assert.equal(await review.outbox.markNeedsReview(TENANT, row.id, "orphan_recovery_not_found", t0, leaseOf(setup.row)), true, "montagem com posse");
  }
  await assert.rejects(request(review, t0), rejects422("charge_already_exists"), "linha em revisão ainda é intenção viva");

  // Controle positivo: `closed` limpo passa, e o verdict do claim (R-OBX-5) concorda com a elegibilidade.
  const ok = await harness("closed", t0);
  const created = await request(ok, t0);
  const claimed = await ok.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "t", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
  assert.equal(claimed?.kind, "claimed");
  assert.equal(claimed?.row.id, created.id);
});

test("E8: o seq sai SOB a trava — FAILED seq 1 → o novo pedido nasce seq 2; SKIPPED seq 1 e 2 → seq 3; o payload gravado nunca tem customerId (T-CHG-7)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const withCustomer = { customerId: "cus_do_payload", amountCents: 10000, dueDate: "2026-12-10", method: "pix" };

  // ATK-5 da síntese, braço FAILED: a 1ª intenção falhou de vez; um novo pedido é elegível (FAILED não é viva no D1) e
  // nasce com a chave seguinte — nunca "ok" sem linha nova.
  const h = await harness("closed", t0);
  const first = await request(h, t0, withCustomer);
  assert.equal(first.idempotencyKey, `charge_create:${h.statementId}:1`);
  assert.equal("customerId" in first.payload, false, "R-PRF-1: o customerId do payload é descartado");
  {
    const setup = await h.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "setup", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
    assert.equal(setup?.kind, "claimed", "montagem: posse");
    assert.equal(await h.outbox.markFailed(TENANT, first.id, "boom", t0, leaseOf(setup.row)), true, "montagem com posse");
  }
  const second = await request(h, t1, withCustomer);
  assert.notEqual(second.id, first.id, "linha NOVA, não a FAILED devolvida");
  assert.equal(second.idempotencyKey, `charge_create:${h.statementId}:2`, "seq = 1 + maior seq do demonstrativo");
  assert.equal(second.status, "PENDING");
  assert.equal("customerId" in second.payload, false);
  assert.equal((await h.outbox.listByStatement(TENANT, h.statementId)).length, 2);

  // Braço SKIPPED: seq 1 e 2 puladas (reabertura) → a 3ª intenção é seq 3.
  const s = await harness("closed", t0);
  const a = await request(s, t0);
  {
    const setup = await s.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "setup", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
    assert.equal(setup?.kind, "claimed", "montagem: posse");
    assert.equal(await s.outbox.markSkipped(TENANT, a.id, "statement_reopened", t0, leaseOf(setup.row)), true, "montagem com posse");
  }
  const b = await request(s, t0);
  assert.equal(b.idempotencyKey, `charge_create:${s.statementId}:2`);
  {
    const setup = await s.outbox.claimNext({ enabledProviders: ["asaas"], now: t0, claimedBy: "setup", orphanMs: 600_000, verdict: chargeCreateClaimVerdict });
    assert.equal(setup?.kind, "claimed", "montagem: posse");
    assert.equal(await s.outbox.markSkipped(TENANT, b.id, "statement_reopened", t0, leaseOf(setup.row)), true, "montagem com posse");
  }
  const c = await request(s, t1);
  assert.equal(c.idempotencyKey, `charge_create:${s.statementId}:3`);
  assert.equal(c.status, "PENDING");
  assert.equal((await s.outbox.listByStatement(TENANT, s.statementId)).length, 3);
});

test("E8: created = false no enfileiramento → 409 charge_intent_conflict, NUNCA ok (T-CHG-7b)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const h = await harness("closed", t0, (options) => new ConflictingOutbox(options));
  await assert.rejects(
    request(h, t0),
    (error: unknown) => error instanceof StatementError && error.statusCode === 409 && error.reason === "charge_intent_conflict",
    "conflito de chave sob a trava é impossível; se acontecer, falha fechado",
  );
});
