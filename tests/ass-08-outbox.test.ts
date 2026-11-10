// B-ASS-08 · F1 — outbox + dispatcher (claim–chamada–registro). R-OBX-1..4 (plano §4.8, §3.8).
// Vermelho-controle: o módulo `outbox/**` não existe em origin/main (B-ASS-07 é o head). Tudo em memória, zero rede.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { InMemoryOutboxRepository, type StatementClaimReader } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { chargeCreateClaimVerdict, runDispatchOutbox, type DispatchAuditEvent } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, type OutboxStatementGuard } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementError } from "../src/modules/subscription-billing/statements/statement.types.js";
import { ProviderRateLimitedError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentMethod,
  PaymentProviderPort,
} from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";

const STMT = "11111111-1111-1111-1111-111111111111";
const STMT_2 = "11111111-1111-1111-1111-222222222222";
const TENANT = "22222222-2222-2222-2222-222222222222";

/** Leitor do demonstrativo para os testes que NÃO medem R-OBX-5: um `closed` sem cobrança viva — stub EXPLÍCITO (o dublê
 * exige o leitor por construção; não há default permissivo). Os T-OBX-13..16 ligam o `StatementService` real. */
const alwaysClosed: StatementClaimReader = async () => ({ status: "closed", reopenedAt: null, hasLiveCharge: false });

/** Resolver de cliente para os testes que NÃO medem R-PRF-1 (o dispatcher o exige por construção — C3-02); os T-PRF-2/3
 * de `ass-08-charges-profile.test.ts` ligam o `profileCustomerResolver` real. */
const okResolver = async () => ({ ok: true as const, customerId: "cus_1" });

/** Porta de pagamento falsa que grava cada chamada (o equivalente ao `recorded[]` do servidor falso, sem rede). */
class RecordingPort implements PaymentProviderPort {
  readonly created: CreateChargeInput[] = [];
  readonly lookups: string[] = [];
  existingByRef: { chargeId: string; status: ChargeResult["status"] } | null = null;
  nextError: Error | null = null;

  async ensureCustomer() {
    return { customerId: "cus_1" };
  }
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.created.push(input);
    if (this.nextError) {
      const error = this.nextError;
      throw error;
    }
    return { chargeId: `pay_${this.created.length}`, status: "pending", payUrl: "https://pay.example/x" };
  }
  async getCharge() {
    return { status: "pending" as const, raw: {} };
  }
  async findChargeByExternalReference(ref: string) {
    this.lookups.push(ref);
    return this.existingByRef;
  }
  async cancelCharge(chargeId: string) {
    return { chargeId, status: "cancelled" as const };
  }
  async refund(chargeId: string) {
    return { chargeId, status: "refunded" as const };
  }
  async registerWebhook() {
    return { externalId: "hook_1" };
  }
  async verifyWebhook() {
    return { ok: false };
  }
  supportedMethods(): readonly PaymentMethod[] {
    return ["pix", "credit_card", "debit_card"];
  }
  describe() {
    return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const };
  }
}

function enqueueCharge(repo: InMemoryOutboxRepository, now: Date, seq = 1, provider = "asaas") {
  return repo.enqueue(
    {
      tenantId: TENANT,
      statementId: STMT,
      kind: "charge_create",
      provider,
      seq,
      payload: { customerId: "cus_1", amountCents: 19990, dueDate: "2026-12-10", method: "pix" },
    },
    now,
  );
}

test("R-OBX-1 durável e idempotente: enqueue repetido = 1 linha; dispatch cria a cobrança 1×", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const first = await enqueueCharge(repo, now);
  const second = await enqueueCharge(repo, now); // mesma idempotency_key
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.row.id, second.row.id);

  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
  assert.equal(port.created.length, 1); // uma cobrança, não duas
  const row = await repo.findById(TENANT, first.row.id);
  assert.equal(row?.status, "SENT");
  assert.equal(row?.externalId, "pay_1");

  // Rodar de novo não cria 2ª cobrança (linha já SENT não é reclamada).
  await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(port.created.length, 1);
});

test("R-OBX-1 crash entre chamada e registro: linha PROCESSING órfã reconsulta ANTES de repetir (T-OBX-11)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => start });
  const { row } = await enqueueCharge(repo, start);

  // Simula o crash: a 1ª chamada ao provedor foi feita, a cobrança nasceu no provedor, mas o registro não gravou.
  const port = new RecordingPort();
  port.nextError = new Error("socket hangup"); // a chamada "cai" depois de criar no provedor
  await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => start });
  // 1ª passada: erro transitório → reschedule PENDING (attempts 1).
  let current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "PENDING");

  // Força o estado de órfã: a linha estava PROCESSING quando o processo morreu.
  // Reproduzimos reclamando e NÃO registrando: deixa PROCESSING com attemptStartedAt antigo.
  port.nextError = null;
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  // claim fresco (reschedule pôs nextAttemptAt futuro? reschedule usa backoff; vamos reconsultar com relógio adiante)
  // A cobrança JÁ existe no provedor: findChargeByExternalReference a encontra.
  port.existingByRef = { chargeId: "pay_crashed", status: "pending" };
  // Marca a linha como PROCESSING órfã manualmente via um claim seguido de nada.
  const claimed = await repo.claimNext({ enabledProviders: ["asaas"], now: new Date(start.getTime() + 60_000), claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict });
  assert.ok(claimed);
  assert.equal(claimed.kind, "claimed");
  assert.equal(claimed.row.status, "PROCESSING");

  const before = port.created.length;
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => later, orphanMs: OUTBOX_ORPHAN_MS });
  assert.equal(result.outcomes.recovered, 1);
  assert.equal(port.created.length, before, "reconsulta não cria 2ª cobrança");
  assert.deepEqual(port.lookups, [STMT]);
  current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "SENT");
  assert.equal(current?.externalId, "pay_crashed");
});

test("R-OBX-1 crash + reconsulta vazia → NEEDS_REVIEW (nunca repete às cegas)", async () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => start });
  const { row } = await enqueueCharge(repo, start);
  const port = new RecordingPort();
  port.existingByRef = null; // reconsulta não acha
  await repo.claimNext({ enabledProviders: ["asaas"], now: start, claimedBy: "t", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict });
  const later = new Date(start.getTime() + OUTBOX_ORPHAN_MS + 60_000);
  const audits: DispatchAuditEvent[] = [];
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => later, onAudit: async (e) => void audits.push(e) });
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal(port.created.length, 0);
  const current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "NEEDS_REVIEW");
  assert.equal(audits[0]?.action, "billing_outbox.needs_review");
});

test("R-OBX-2 backoff e FAILED na 8ª falha + trilha (T-OBX-7..8)", async () => {
  let clock = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => clock });
  const { row } = await enqueueCharge(repo, clock);
  const port = new RecordingPort();
  port.nextError = new Error("boom");
  const audits: DispatchAuditEvent[] = [];

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => clock, onAudit: async (e) => void audits.push(e) });
    const current = await repo.findById(TENANT, row.id);
    if (attempt < 8) {
      assert.equal(current?.status, "PENDING", `tentativa ${attempt} volta a PENDING`);
      assert.ok((current?.nextAttemptAt?.getTime() ?? 0) > clock.getTime(), "nextAttemptAt futuro (backoff)");
      assert.equal(result.outcomes.retry, 1);
      // avança o relógio para além da janela de backoff
      clock = new Date((current?.nextAttemptAt?.getTime() ?? clock.getTime()) + 1000);
    } else {
      assert.equal(result.outcomes.failed, 1);
      assert.equal(current?.status, "FAILED");
    }
  }
  assert.equal(audits.at(-1)?.action, "billing_outbox.failed");
});

test("R-OBX-2 retry reabre FAILED → PENDING e dispatch volta a tentar (T-OBX-9)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  await repo.markFailed(TENANT, row.id, "boom", now);
  const reopened = await repo.retry(TENANT, row.id, now);
  assert.equal(reopened?.status, "PENDING");
  assert.equal(reopened?.attempts, 0);
  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.sent, 1);
});

test("R-OBX-3 canal desligado: dispatcher não roda, linha segue PENDING (T-OBX-10)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  // Nenhum provedor ligado → ports vazio.
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: {}, now: () => now });
  assert.equal(result.processed, 0);
  const current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "PENDING");
});

test("R-OBX-4 provedor desligado NÃO é alcançado (T-OBX-12): 0 chamada ao Asaas, linha PENDING com skip_reason", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row: asaasRow } = await enqueueCharge(repo, now, 1, "asaas"); // Asaas DESLIGADO
  // 2º conserto (E4): a linha do Mercado Pago vai para OUTRO demonstrativo — duas `charge_create` vivas do MESMO
  // demonstrativo violam o D1 e iriam as duas a revisão; o teste mede R-OBX-4, não o par proibido.
  const { row: focusRow } = await repo.enqueue(
    { tenantId: TENANT, statementId: STMT_2, kind: "charge_create", provider: "mercadopago", seq: 2, payload: { customerId: "c", amountCents: 100, dueDate: "2026-12-10", method: "pix" } },
    now,
  );
  const mp = new RecordingPort();
  // ports só tem mercadopago ligado; Asaas nem existe no mapa → impossível alcançá-lo.
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { mercadopago: mp }, now: () => now });
  assert.equal(result.outcomes.sent, 1); // só o ligado

  const asaas = await repo.findById(TENANT, asaasRow.id);
  assert.equal(asaas?.status, "PENDING");
  assert.equal(asaas?.skipReason, "provider_disabled");
  const focus = await repo.findById(TENANT, focusRow.id);
  assert.equal(focus?.status, "SENT");
});

test("E4 (critério 2): duas charge_create PENDING do MESMO demonstrativo → as DUAS vão a NEEDS_REVIEW charge_already_exists, com attempts 0, e 0 createCharge (T-OBX-18)", async () => {
  // O par proibido do D1. Antes do 2º conserto a irmã viva era só SENT/PROCESSING: a 1ª linha saía (a irmã PENDING não
  // contava) e a 2ª ia a revisão só DEPOIS da 1ª cobrança — no Postgres, dois workers davam 2 `createCharge`.
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row: first } = await enqueueCharge(repo, now, 1);
  const { row: second } = await enqueueCharge(repo, now, 2);
  const port = new RecordingPort();
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver, ports: { asaas: port }, now: () => now });
  assert.equal(port.created.length, 0, "duas vivas do mesmo demonstrativo: NENHUMA cobrança sai");
  assert.equal(result.outcomes.needs_review, 2);
  for (const id of [first.id, second.id]) {
    const row = await repo.findById(TENANT, id);
    assert.deepEqual([row?.status, row?.lastError, row?.attempts], ["NEEDS_REVIEW", "charge_already_exists", 0], `linha ${id}`);
  }
});

test("429 → reschedule com next_attempt_at = now + retryAfter, sem FAILED", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const repo = new InMemoryOutboxRepository({ readStatement: alwaysClosed, clock: () => now });
  const { row } = await enqueueCharge(repo, now);
  const port = new RecordingPort();
  port.nextError = new ProviderRateLimitedError(2000);
  const result = await runDispatchOutbox({ repo, resolveCustomer: okResolver,ports: { asaas: port }, now: () => now });
  assert.equal(result.outcomes.rate_limited, 1);
  const current = await repo.findById(TENANT, row.id);
  assert.equal(current?.status, "PENDING");
  assert.equal(current?.nextAttemptAt?.getTime(), now.getTime() + 2000);
});

test("R-OBX-1 guard de texto: o dispatcher NÃO abre transação em volta da chamada ao provedor", () => {
  const path = fileURLToPath(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url));
  // Só linhas de código (sem comentários), e a FORMA de chamada: um `fetch` dentro de transação exigiria abrir
  // `withTenantRls(` ou `.$transaction(` neste arquivo — não há (claim e registro são ops atômicas separadas).
  const code = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  assert.ok(!/withTenantRls\s*\(/.test(code), "o fetch nunca roda dentro de withTenantRls(...)");
  assert.ok(!/\$transaction\s*\(/.test(code), "o fetch nunca roda dentro de $transaction(...)");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-OBX-5 (D2) — conserto J-522 (achado C2-01): cobrança parada NUNCA sai de demonstrativo que mudou. Forma comum dos
// quatro: demonstrativo `closed` R$ 100 com `chargeStatus: "none"` (ao fechar, a cobrança ainda não existe); outbox ligada
// ao demonstrativo REAL (`findStatement`) e à tabela de cobranças (`findLive`); `enqueue charge_create seq 1`; o
// demonstrativo MUDA pelo `StatementService` real; o dispatcher roda com a porta que grava chamadas.
// Vermelho-controle: no objeto `92d644db` (claim sem releitura) os quatro cobram — `createCharge` 1× e linha SENT.
// Mutação literal do plano: `chargeCreateClaimVerdict` devolvendo `eligible` sempre → 13, 14, 15 e a metade "cobrança
// viva" do 16 vermelhos; `reopen()` sem o guard → 16 vermelho; sem a linha `reopenedAt > occurredAt` → o braço
// "refechado" do 15 vermelho.
// ---------------------------------------------------------------------------------------------------------------------

const ACTOR = "33333333-3333-3333-3333-333333333333";
const inputsStub = { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) };

type Obx5Harness = {
  readonly statements: InMemoryStatementRepository;
  readonly charges: InMemoryStatementChargeRepository;
  readonly service: StatementService;
  readonly outbox: InMemoryOutboxRepository;
  readonly statementId: string;
  readonly rowId: string;
  readonly port: RecordingPort;
  readonly audits: DispatchAuditEvent[];
};

/** Demonstrativo `closed` R$ 100 + linha `charge_create` PENDING enfileirada em `t0`, tudo ligado ao serviço REAL. */
async function obx5Harness(t0: Date): Promise<Obx5Harness> {
  const statements = new InMemoryStatementRepository(() => t0);
  const charges = new InMemoryStatementChargeRepository();
  const outbox = new InMemoryOutboxRepository({
    readStatement: async (tenantId, statementId) => {
      const current = await statements.findStatement(tenantId, statementId);
      return current && { status: current.status, reopenedAt: current.reopenedAt, hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined };
    },
    clock: () => t0,
  });
  // D2 (iv): o guard que `reopen()` consulta — adaptador trivial sobre `listByStatement` (em produção, a 08b liga o Prisma).
  const guard: OutboxStatementGuard = {
    hasNeedsReview: async (tenantId, statementId) => (await outbox.listByStatement(tenantId, statementId)).some((row) => row.status === "NEEDS_REVIEW"),
  };
  const service = new StatementService(statements, inputsStub, { record: async () => {} }, guard);
  const statement = await statements.transaction(TENANT, async (tx) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({ ...fresh, status: "closed", chargeStatus: "none", totalCents: 10000, dueDate: "2026-12-10", closedAt: t0 });
  });
  const { row } = await outbox.enqueue(
    { tenantId: TENANT, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { customerId: "cus_1", amountCents: 10000, dueDate: "2026-12-10", method: "pix" } },
    t0,
  );
  return { statements, charges, service, outbox, statementId: statement.id, rowId: row.id, port: new RecordingPort(), audits: [] };
}

function dispatch(h: Obx5Harness, now: Date) {
  return runDispatchOutbox({ repo: h.outbox, ports: { asaas: h.port }, resolveCustomer: okResolver, now: () => now, onAudit: async (event) => void h.audits.push(event) });
}

test("R-OBX-5 baixa manual TOTAL depois de enfileirada → SKIPPED statement_paid, 0 chamadas; o retry revalida igual (T-OBX-13)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const h = await obx5Harness(t0);
  const { statement } = await h.service.recordManualPayment({ tenantId: TENANT, statementId: h.statementId, amountCents: 10000, method: "pix", note: null, actorId: ACTOR, now: t1 });
  assert.equal(statement.status, "paid");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo pago: NENHUMA cobrança sai para o provedor");
  assert.equal(result.outcomes.skipped, 1);
  assert.equal(result.outcomes.sent, 0);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_paid");
  assert.equal(row?.attempts, 0, "pulada pela política: não conta tentativa");
  assert.equal(row?.claimedAt, null, "pulada pela política: nunca foi reclamada");

  // Braço do retry — D2 (ii): "o retry revalida como o claim". FAILED → retry → PENDING em demonstrativo pago → não sai.
  const r = await obx5Harness(t0);
  await r.outbox.markFailed(TENANT, r.rowId, "boom", t0);
  await r.service.recordManualPayment({ tenantId: TENANT, statementId: r.statementId, amountCents: 10000, method: "pix", note: null, actorId: ACTOR, now: t1 });
  assert.equal((await r.outbox.retry(TENANT, r.rowId, t1))?.status, "PENDING");
  const retried = await dispatch(r, t1);
  assert.equal(r.port.created.length, 0, "retry em demonstrativo pago: 0 chamadas");
  assert.equal(retried.outcomes.skipped, 1);
  assert.equal((await r.outbox.findById(TENANT, r.rowId))?.skipReason, "statement_paid");
});

test("R-OBX-5 cancelamento depois de enfileirada → SKIPPED statement_cancelled, 0 chamadas (T-OBX-14)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const h = await obx5Harness(t0);
  const cancelled = await h.service.cancel({ tenantId: TENANT, statementId: h.statementId, reason: "cliente encerrou o contrato", actorId: ACTOR, now: t1 });
  assert.equal(cancelled.status, "cancelled");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo cancelado: NENHUMA cobrança sai");
  assert.equal(result.outcomes.skipped, 1);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_cancelled");
});

test("R-OBX-5 reabertura depois de enfileirada → SKIPPED statement_reopened; REFECHADO com total novo → ainda não sai (T-OBX-15)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);
  const t2 = new Date(t0.getTime() + 120_000);
  const h = await obx5Harness(t0);
  const reopened = await h.service.reopen({ tenantId: TENANT, statementId: h.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 });
  assert.equal(reopened.status, "reopened");

  const result = await dispatch(h, t1);
  assert.equal(h.port.created.length, 0, "demonstrativo reaberto: NENHUMA cobrança sai");
  assert.equal(result.outcomes.skipped, 1);
  const row = await h.outbox.findById(TENANT, h.rowId);
  assert.equal(row?.status, "SKIPPED");
  assert.equal(row?.skipReason, "statement_reopened");

  // Braço do refechamento: reopen (t1) → refechado `closed` com total NOVO (t2); `reopenedAt` é preservado pelo fechamento.
  // A linha antiga carrega o `amountCents` do fechamento desfeito: `reopened_at > occurred_at` → não sai (payload velho).
  const r = await obx5Harness(t0);
  await r.service.reopen({ tenantId: TENANT, statementId: r.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 });
  const reclosed = await r.statements.transaction(TENANT, async (tx) => {
    const current = (await tx.lockById(r.statementId))!;
    return tx.saveStatement({ ...current, status: "closed", totalCents: 8000, closedAt: t2 });
  });
  assert.equal(reclosed.status, "closed");
  assert.equal(reclosed.reopenedAt?.getTime(), t1.getTime(), "o fechamento preserva reopened_at");
  const reclosedRun = await dispatch(r, t2);
  assert.equal(r.port.created.length, 0, "refechado com total novo: a linha VELHA (R$ 100) nunca sai");
  assert.equal(reclosedRun.outcomes.skipped, 1);
  assert.equal((await r.outbox.findById(TENANT, r.rowId))?.skipReason, "statement_reopened");
});

test("R-OBX-5 linha NEEDS_REVIEW → reopen recusa 422 outbox_needs_review; cobrança VIVA → NEEDS_REVIEW charge_already_exists, 0 chamadas (T-OBX-16)", async () => {
  const t0 = new Date("2026-12-01T12:00:00Z");
  const t1 = new Date(t0.getTime() + 60_000);

  // D2 (iv): a linha está em revisão → reabrir é recusado; o demonstrativo continua `closed`.
  const h = await obx5Harness(t0);
  await h.outbox.markNeedsReview(TENANT, h.rowId, "orphan_recovery_not_found", t0);
  await assert.rejects(
    h.service.reopen({ tenantId: TENANT, statementId: h.statementId, reason: "recalcular o uso do mês", actorId: ACTOR, now: t1 }),
    (error: unknown) => error instanceof StatementError && error.statusCode === 422 && error.reason === "outbox_needs_review",
  );
  assert.equal((await h.statements.findStatement(TENANT, h.statementId))?.status, "closed");

  // Cobrança viva já existente (E3): não é SKIPPED (a M5 não tem motivo para isso) — vai a NEEDS_REVIEW com last_error, sem rede.
  const c = await obx5Harness(t0);
  await c.charges.insert({ tenantId: TENANT, statementId: c.statementId, provider: "asaas", externalChargeId: "pay_live", status: "pending", payUrl: "https://pay.example/live", dueDate: "2026-12-10" }, t0);
  const result = await dispatch(c, t1);
  assert.equal(c.port.created.length, 0, "cobrança viva: NENHUMA segunda cobrança sai");
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal(result.outcomes.sent, 0);
  const row = await c.outbox.findById(TENANT, c.rowId);
  assert.equal(row?.status, "NEEDS_REVIEW");
  assert.equal(row?.lastError, "charge_already_exists");
  assert.equal(row?.skipReason, null, "sem skip_reason novo: a lista da M5 é fechada");
  assert.deepEqual(c.audits.map((event) => [event.action, event.code]), [["billing_outbox.needs_review", "charge_already_exists"]]);
});
