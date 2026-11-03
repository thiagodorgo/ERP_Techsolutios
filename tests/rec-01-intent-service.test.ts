import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { TenantRowsLeakError } from "../src/database/rls.js";
import { createMemoryChargeService, getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import {
  InMemoryImpoundPaymentRepository,
  type ImpoundPaymentRepository,
} from "../src/modules/impound-payments/impound-payment.repository.js";
import {
  ImpoundPaymentService,
  ONLINE_PAYMENT_TTL_MS,
  createMemoryImpoundPaymentService,
  getMemoryImpoundPaymentRepositoryForTests,
  resetImpoundPaymentRuntimeForTests,
} from "../src/modules/impound-payments/impound-payment.service.js";
import {
  PAYMENT_METHODS,
  PAYMENT_RESOLVER_REASONS,
  type ImpoundPaymentActorContext,
  type ImpoundPaymentIntent,
  type IntentStatus,
  type PaymentConnectionPort,
} from "../src/modules/impound-payments/impound-payment.types.js";
import type { DailyCap } from "../src/modules/jurisdiction/jurisdiction.types.js";
import { createMemoryReleaseService, getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";

// B-PATIO-REC-01 F2 — regras de criação (a)-(h) da v3 §5.2, o devido capado ao teto (§5.1, N8) e o canário R-ISO
// (emenda §10.1). Ambiente [SB]: tudo em memória.

const MS_PER_DAY = 86_400_000;
const CPF = "529.982.247-25";
const BODY = { payerName: "Maria da Silva", payerDocument: CPF };
const OPEN = { isEnabled: async () => true };

function actor(tenantId: string): ImpoundPaymentActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] };
}

function orgPort(methods = PAYMENT_METHODS): PaymentConnectionPort {
  const connectionId = randomUUID();
  return { resolve: async () => ({ ok: true, account: { scope: "organization", connectionId }, provider: "asaas", methods }) };
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return (error as { reason?: string }).reason ?? String(error);
  }
}

function resetAll(): void {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetImpoundPaymentRuntimeForTests();
}

// Processo em ACTIVE_CUSTODY (molde de tests/release.test.ts) com perfil no charging.
async function activeProcess(tenantId: string, t0: Date, cap: DailyCap): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: t0,
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap,
    dailyServiceCatalogId: randomUUID(),
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  return process.id;
}

async function addRemoval(tenantId: string, processId: string, amount: string): Promise<void> {
  await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId,
    processId,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: amount,
    totalAmount: amount,
    currency: "BRL",
    occurredAt: new Date(),
  });
}

async function accrueDailies(tenantId: string, processId: string, count: number, unit: string): Promise<void> {
  const repo = getMemoryChargeRepositoryForTests();
  for (let seq = 1; seq <= count; seq += 1) {
    await repo.accrueDailyCharge({
      tenantId,
      processId,
      periodSeq: seq,
      refDate: `2024-01-${String((seq % 28) + 1).padStart(2, "0")}`,
      unitAmount: unit,
      currency: "BRL",
      occurredAt: new Date(),
    });
  }
}

// N8: R$ 50 de remoção + 33 diárias de R$ 10 com teto de 30 → ledger R$ 380, devido capado R$ 350.
async function overAccruedReleaseInProgress(tenantId: string): Promise<string> {
  const processId = await activeProcess(tenantId, new Date(Date.now() - 40 * MS_PER_DAY), "THIRTY_DAYS_LEGACY");
  await addRemoval(tenantId, processId, "50.00");
  await accrueDailies(tenantId, processId, 33, "10.00");
  await createMemoryReleaseService().start(actor(tenantId), processId, { recipient_name: "R" });
  return processId;
}

function fakeRepository(state: { processStatus: string; activeReleaseKind?: "STANDARD" | "FOR_REPAIR" } | undefined, dueCents = 35_000) {
  return new InMemoryImpoundPaymentRepository({
    processState: async () => state,
    settleableDue: async () => ({ dueCents, overAccruedUnreconciled: false, currency: "BRL" }),
  });
}

const IN_RELEASE = { processStatus: "RELEASE_IN_PROGRESS", activeReleaseKind: "STANDARD" as const };

function intentFixture(tenantId: string, processId: string, status: IntentStatus): ImpoundPaymentIntent {
  const money: Record<IntentStatus, Partial<ImpoundPaymentIntent>> = {
    pending: {},
    cancel_requested: { cancelReason: "cancel" },
    cancelled: { cancelReason: "cancel" },
    expired: { cancelReason: "expire" },
    settled: { paidCents: 35_000, appliedCents: 35_000 },
    funds_held: { paidCents: 20_000, heldCents: 20_000, heldReason: "amount_short" },
    disputed: { paidCents: 35_000, heldCents: 35_000, heldReason: "chargeback_disputed" },
    reversed: { paidCents: 35_000, refundedCents: 35_000 },
  };
  return {
    id: randomUUID(),
    tenantId,
    processId,
    status,
    currency: "BRL",
    amountCents: 35_000,
    paidCents: 0,
    appliedCents: 0,
    heldCents: 0,
    refundedCents: 0,
    methods: PAYMENT_METHODS,
    payerName: "Maria",
    payerDocument: "52998224725",
    provider: "asaas",
    account: { scope: "organization", connectionId: randomUUID() },
    expiresAt: new Date(),
    settledChargeIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...money[status],
  };
}

test("T-DOM-7 · (a) canal desligado por PADRÃO → 422 channel_disabled; nada gravado", async () => {
  resetAll();
  const tenantId = randomUUID();
  const repository = fakeRepository(IN_RELEASE);
  const service = new ImpoundPaymentService(repository, orgPort());
  assert.equal(await reasonOf(service.create(actor(tenantId), randomUUID(), BODY)), "channel_disabled");
  assert.equal(repository.allIntentsForTests().length, 0);
  assert.equal(repository.outboxForTests().length, 0);
});

test("T-DOM-8 · (b) cada recusa do resolvedor vira 422 com o motivo, sem gravar nada", async () => {
  for (const refusal of PAYMENT_RESOLVER_REASONS) {
    const repository = fakeRepository(IN_RELEASE);
    const service = new ImpoundPaymentService(repository, { resolve: async () => ({ ok: false, reason: refusal }) }, OPEN);
    assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), refusal);
    assert.equal(repository.allIntentsForTests().length, 0, `${refusal} gravou intenção`);
  }
});

test("T-DOM-9 · P-REC-11b: a porta de conexão PADRÃO recusa com payment_mode_unset (sem modo, só baixa manual)", async () => {
  const repository = fakeRepository(IN_RELEASE);
  const service = new ImpoundPaymentService(repository, undefined, OPEN);
  assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), "payment_mode_unset");
  assert.equal(repository.allIntentsForTests().length, 0);
});

test("T-DOM-10 · (c) só com o processo em liberação STANDARD; processo de outra organização ou inexistente → 404", async () => {
  for (const state of [{ processStatus: "ACTIVE_CUSTODY" }, { processStatus: "RELEASE_IN_PROGRESS", activeReleaseKind: "FOR_REPAIR" as const }, { processStatus: "RELEASE_IN_PROGRESS" }]) {
    const service = new ImpoundPaymentService(fakeRepository(state), orgPort(), OPEN);
    assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), "release_not_started", JSON.stringify(state));
  }
  const service = new ImpoundPaymentService(fakeRepository(undefined), orgPort(), OPEN);
  assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), "process_not_found");
});

test("T-DOM-11 · (e) intenção viva: link aberto → 409 payment_already_pending; dinheiro retido ou disputa → 409 held_funds_pending; as demais não bloqueiam", async () => {
  const expected: Record<IntentStatus, string> = {
    pending: "payment_already_pending",
    cancel_requested: "payment_already_pending",
    funds_held: "held_funds_pending",
    disputed: "held_funds_pending",
    cancelled: "resolved",
    expired: "resolved",
    settled: "resolved",
    reversed: "resolved",
  };
  for (const [status, outcome] of Object.entries(expected) as Array<[IntentStatus, string]>) {
    const tenantId = randomUUID();
    const processId = randomUUID();
    const repository = fakeRepository(IN_RELEASE);
    repository.seedIntentForTests(intentFixture(tenantId, processId, status));
    const service = new ImpoundPaymentService(repository, orgPort(), OPEN);
    assert.equal(await reasonOf(service.create(actor(tenantId), processId, BODY)), outcome, `irmã em ${status}`);
  }
});

test("T-DOM-12 · (f) conta sem os três meios → 422 payment_methods_insufficient", async () => {
  const repository = fakeRepository(IN_RELEASE);
  const service = new ImpoundPaymentService(repository, orgPort(["pix", "credit_card"]), OPEN);
  assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), "payment_methods_insufficient");
  assert.equal(repository.allIntentsForTests().length, 0);
});

test("T-DOM-12b · (d) nada devido → 422 nothing_due", async () => {
  const service = new ImpoundPaymentService(fakeRepository(IN_RELEASE, 0), orgPort(), OPEN);
  assert.equal(await reasonOf(service.create(actor(randomUUID()), randomUUID(), BODY)), "nothing_due");
});

test("T-DOM-12c · (g)/(h) com o runtime de memória: intenção pending no valor devido, referência open e linha de fila patio:<id> sem split", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await activeProcess(tenantId, new Date(Date.now() - 10 * MS_PER_DAY), "SIX_MONTHS");
  await addRemoval(tenantId, processId, "150.00");
  await accrueDailies(tenantId, processId, 5, "10.00");
  await createMemoryReleaseService().start(actor(tenantId), processId, { recipient_name: "R" });
  const now = new Date("2026-11-03T12:00:00.000Z");
  const service = createMemoryImpoundPaymentService({ connections: orgPort(), gate: OPEN, clock: () => now });

  const intent = await service.create(actor(tenantId), processId, { ...BODY, methods: ["pix"] });
  assert.equal(intent.status, "pending");
  assert.equal(intent.amountCents, 20_000);
  assert.deepEqual(intent.methods, ["pix"]);
  assert.equal(intent.account.scope, "organization");
  assert.equal(intent.expiresAt.getTime(), now.getTime() + ONLINE_PAYMENT_TTL_MS);
  const repository = getMemoryImpoundPaymentRepositoryForTests();
  assert.deepEqual(repository.allRefsForTests().map((ref) => [ref.intentId, ref.tenantId, ref.watch]), [[intent.id, tenantId, "open"]]);
  const outbox = repository.outboxForTests();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0]!.reference, `patio:${intent.id}`);
  assert.doesNotMatch(JSON.stringify(outbox), /split|wallet|token|secret/i);
  assert.equal((await service.getLive(actor(tenantId), processId))?.id, intent.id);
});

test("T-DOM-24 · N8: o devido capado ao teto exclui a diária sobre-acumulada não reconciliada; o resumo público não muda", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await overAccruedReleaseInProgress(tenantId);
  const charges = createMemoryChargeService();
  const due = await charges.getSettleableDueCents(tenantId, processId);
  assert.equal(due?.dueCents, 35_000, `expected 35000, got ${due?.dueCents}`);
  assert.equal(due?.overAccruedUnreconciled, true);
  assert.equal((await charges.getPublicSummary(tenantId, processId)).totalDueCents, 38_000, "getPublicSummary mudou");
});

test("T-DOM-25 · L16: criar com diária acima do teto não reconciliada → 422 reconciliation_pending", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await overAccruedReleaseInProgress(tenantId);
  const service = createMemoryImpoundPaymentService({ connections: orgPort(), gate: OPEN });
  assert.equal(await reasonOf(service.create(actor(tenantId), processId, BODY)), "reconciliation_pending");
  assert.equal(getMemoryImpoundPaymentRepositoryForTests().allIntentsForTests().length, 0);
});

test("T-ISO-1 · R-ISO: o serviço lança TenantRowsLeakError quando o repositório devolve linha de outra organização", async () => {
  const tenantA = randomUUID();
  const processId = randomUUID();
  const rowOfB = intentFixture(randomUUID(), processId, "cancelled");
  const leaking: ImpoundPaymentRepository = {
    processExists: async () => true,
    findById: async () => undefined,
    listByProcess: async () => [rowOfB],
    findLiveByProcess: async () => undefined,
    withProcessLock: async (_tenantId, _processId, work) =>
      work({
        loadReleaseState: async () => IN_RELEASE,
        settleableDue: async () => ({ dueCents: 35_000, overAccruedUnreconciled: false, currency: "BRL" }),
        listByProcess: async () => [rowOfB],
        insertIntent: async () => {
          throw new Error("não deveria gravar");
        },
        insertRef: async () => undefined,
        enqueue: async () => undefined,
      }),
  };
  const service = new ImpoundPaymentService(leaking, orgPort(), OPEN);
  await assert.rejects(service.list(actor(tenantA), processId), TenantRowsLeakError, "list devolveu a linha de B");
  await assert.rejects(service.getLive(actor(tenantA), processId), TenantRowsLeakError, "getLive devolveu a linha de B");
  await assert.rejects(service.create(actor(tenantA), processId, BODY), TenantRowsLeakError, "create leu a irmã de B");
});
