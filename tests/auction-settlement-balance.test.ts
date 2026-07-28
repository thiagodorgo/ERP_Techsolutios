import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import type { CustodyEvent, ImpoundStatus } from "../src/modules/impound/impound.types.js";
import {
  getMemoryImpoundRepositoryForTests,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import { resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import { resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { resolveBalanceCycleTransition } from "../src/modules/auction/auction.settlement.repository.js";
import {
  AuctionSettlementService,
  getMemoryAuctionSettlementRepositoryForTests,
  resetAuctionSettlementRuntimeForTests,
  type SettlementAuctionStatePort,
  type SettlementCascadeClaimPort,
} from "../src/modules/auction/auction.settlement.service.js";
import type { AuctionAttempt } from "../src/modules/auction/auction.types.js";

// Ω5P PR-14b — CICLO do SALDO ao ex-proprietário (§12; completa o I7), InMemory. É financeiro (mudança de estado do
// saldo) mas NÃO redistribui: as settlement_allocations e a Σ==hammer do 14a permanecem INTOCADAS. Cobre: (a) claim
// dentro do prazo → BALANCE_CLAIMED + AUCTION_SETTLEMENT{CLAIM}; (b) claim bloqueado (saldo zero / fora do prazo /
// estado errado); (c) revert após o prazo → BALANCE_REVERTED_FUNSET + AUCTION_SETTLEMENT{FUNSET_REVERSION}; (d) revert
// bloqueado antes do prazo; (e) mutuamente exclusivo (claim×funset); (f) 2º claim idempotente (409, sem duplicar
// evento); (g) Σ allocations intacto após o ciclo; (h) verifyChain valid + §2.8 (payload sem PII do ex-dono).

const MS_PER_DAY = 86_400_000;
const actor = { tenantId: "", userId: randomUUID() };

function reset(): string {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  resetAuctionSettlementRuntimeForTests();
  resetChargeRuntimeForTests();
  return randomUUID();
}

// Dirige um processo REAL até AUCTION_CLOSED (frozen no AUCTIONED) via applyTransition — a cadeia hash é REAL (genesis
// + STATUS_CHANGE) p/ os testes de cadeia/§2.8.
async function makeClosedProcess(tenantId: string): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId: randomUUID(),
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(Date.now() - 120 * MS_PER_DAY),
    actorId: undefined,
  });
  const steps: Array<[ImpoundStatus, ImpoundStatus, boolean]> = [
    ["RECEPTION", "ACTIVE_CUSTODY", false],
    ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE", false],
    ["AUCTION_ELIGIBLE", "AUCTION_PREP", false],
    ["AUCTION_PREP", "LOTTED", false],
    ["LOTTED", "AUCTIONED", true],
    ["AUCTIONED", "AUCTION_CLOSED", false],
  ];
  for (const [from, to, setFrozenAt] of steps) {
    await impound.applyTransition({
      tenantId,
      processId: process.id,
      expectedFrom: from,
      to,
      setEnteredAt: false,
      setFrozenAt,
      event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date(), actorId: undefined },
    });
  }
  return process.id;
}

function makeAttempt(tenantId: string, processId: string, over: Partial<AuctionAttempt> & Pick<AuctionAttempt, "roundNumber" | "outcome">): AuctionAttempt {
  const now = new Date();
  return { id: randomUUID(), tenantId, processId, createdAt: now, updatedAt: now, ...over };
}

function stubAuction(attempts: readonly AuctionAttempt[]): SettlementAuctionStatePort {
  return { getState: async () => ({ status: "AUCTION_CLOSED", attempts, edicts: [] }) };
}

const zeroClaim: SettlementCascadeClaimPort = async () => ({ claimCents: 0, currency: "BRL" });

function makeService(attempts: readonly AuctionAttempt[]): AuctionSettlementService {
  return new AuctionSettlementService(
    getMemoryAuctionSettlementRepositoryForTests(),
    getMemoryImpoundRepositoryForTests(),
    stubAuction(attempts),
    zeroClaim,
  );
}

// Distribui uma liquidação (14a) com um saldo residual controlado. Sem claims no corpo ⇒ ownerBalance = hammer.
async function seedDistributed(tenantId: string, soldAmount: string, body: Record<string, unknown> = {}) {
  const processId = await makeClosedProcess(tenantId);
  const service = makeService([makeAttempt(tenantId, processId, { roundNumber: 1, outcome: "SOLD", soldAmount })]);
  const result = await service.distribute(actor, processId, body);
  return { processId, service, settlement: result.settlement, allocations: result.allocations };
}

const is409 = (reason: string) => (error: unknown) =>
  (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === reason;

function cents(money: string): number {
  return Math.round(Number(money) * 100);
}

async function settlementEvents(tenantId: string, processId: string): Promise<CustodyEvent[]> {
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, processId);
  return events.filter((event) => event.type === "AUCTION_SETTLEMENT");
}

function phaseOf(event: CustodyEvent): unknown {
  return (event.payload as Record<string, unknown>).phase;
}

async function assertChainValid(tenantId: string, processId: string): Promise<void> {
  const snap = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  assert.ok(snap);
  const verified = verifyChain({ tenantId, processId, events: snap!.events, head: snap!.head, crossAnchors: snap!.crossAnchors });
  assert.equal(verified.valid, true, "verifyChain.valid pós-ciclo do saldo");
}

const repo = () => getMemoryAuctionSettlementRepositoryForTests();

// ── (a) claim dentro do prazo → BALANCE_CLAIMED + AUCTION_SETTLEMENT{CLAIM}; grava quem/quando; Σ intacto ──────────
test("(a) claim-balance com DISTRIBUTED + saldo>0 + dentro do prazo → BALANCE_CLAIMED + evento{CLAIM}", async () => {
  actor.tenantId = reset();
  const { processId, service, settlement, allocations } = await seedDistributed(actor.tenantId, "9500.00");
  assert.equal(settlement.status, "DISTRIBUTED");
  assert.equal(settlement.ownerBalanceAmount, "9500.00", "saldo residual = hammer (sem claims)");
  const sumBefore = allocations.reduce((acc, a) => acc + cents(a.amount), 0);

  const result = await service.claimBalance(actor, processId, { claim_recipient_ref: "…9F3A" });
  assert.equal(result.phase, "CLAIM");
  assert.equal(result.settlement.status, "BALANCE_CLAIMED");
  assert.equal(result.settlement.claimedBy, actor.userId, "ator interno que registrou a retirada");
  assert.ok(result.settlement.claimedAt instanceof Date, "claimed_at gravado");
  assert.equal(result.settlement.claimRecipientRef, "…9F3A", "recebedor mascarado gravado na tabela");
  assert.equal(result.settlement.ownerBalanceAmount, "9500.00", "saldo NÃO muda (state-change, não redistribui)");

  // Σ das allocations INTACTO (o ciclo não redistribui) + mesma contagem/valores.
  const sumAfter = result.allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  assert.equal(sumAfter, sumBefore, "Σ allocations == hammer (intacto pós-claim)");
  assert.equal(sumAfter, cents("9500.00"));
  assert.equal(result.allocations.length, allocations.length, "nenhuma allocation adicionada/removida");

  // Exatamente 1 AUCTION_SETTLEMENT{CLAIM} (além do evento de distribuição, que NÃO tem phase).
  const events = await settlementEvents(actor.tenantId, processId);
  assert.equal(events.filter((e) => phaseOf(e) === "CLAIM").length, 1, "1 evento de retirada");
  assert.equal(events.filter((e) => phaseOf(e) === undefined).length, 1, "1 evento de distribuição (14a, sem phase)");
  await assertChainValid(actor.tenantId, processId);
});

// ── (b) claim bloqueado: saldo zero / fora do prazo / estado errado ─────────────────────────────────────────────
test("(b) claim bloqueado: saldo=0 → 409 balance_zero; fora do prazo → 409 balance_claim_expired; estado errado → 409", async () => {
  // saldo zero: distribui exaurindo o hammer (auction_cost = hammer) ⇒ ownerBalance 0.
  actor.tenantId = reset();
  const zero = await seedDistributed(actor.tenantId, "9500.00", { auction_cost: "9500.00" });
  assert.equal(zero.settlement.ownerBalanceAmount, "0.00", "saldo exaurido");
  await assert.rejects(() => zero.service.claimBalance(actor, zero.processId, {}), is409("balance_zero"));
  assert.equal((await settlementEvents(actor.tenantId, zero.processId)).filter((e) => phaseOf(e) === "CLAIM").length, 0, "nenhum evento de retirada");

  // fora do prazo: now >= owner_claim_expires_at (via repo, com now controlado no futuro).
  actor.tenantId = reset();
  const late = await seedDistributed(actor.tenantId, "9500.00");
  const past = new Date(late.settlement.ownerClaimExpiresAt!.getTime() + MS_PER_DAY);
  await assert.rejects(
    () => repo().transitionBalanceAtomic("CLAIM", { tenantId: actor.tenantId, processId: late.processId, actorId: actor.userId, now: past, occurredAt: past }),
    is409("balance_claim_expired"),
  );

  // estado errado: uma liquidação já BALANCE_CLAIMED não aceita novo claim (coberto em (f)); aqui, revertida → wrong_state.
  actor.tenantId = reset();
  const seeded = await seedDistributed(actor.tenantId, "9500.00");
  const afterExpiry = new Date(seeded.settlement.ownerClaimExpiresAt!.getTime() + MS_PER_DAY);
  await repo().transitionBalanceAtomic("FUNSET_REVERSION", { tenantId: actor.tenantId, processId: seeded.processId, actorId: actor.userId, now: afterExpiry, occurredAt: afterExpiry });
  await assert.rejects(() => seeded.service.claimBalance(actor, seeded.processId, {}), is409("balance_claim_wrong_state"));
});

// ── (c) revert após o prazo → BALANCE_REVERTED_FUNSET + AUCTION_SETTLEMENT{FUNSET_REVERSION}; Σ intacto ───────────
test("(c) revert-funset com DISTRIBUTED + saldo>0 + prazo vencido → BALANCE_REVERTED_FUNSET + evento{FUNSET_REVERSION}", async () => {
  actor.tenantId = reset();
  const { processId, settlement, allocations } = await seedDistributed(actor.tenantId, "9500.00");
  const sumBefore = allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  const afterExpiry = new Date(settlement.ownerClaimExpiresAt!.getTime() + MS_PER_DAY);

  const result = await repo().transitionBalanceAtomic("FUNSET_REVERSION", {
    tenantId: actor.tenantId, processId, actorId: actor.userId, now: afterExpiry, occurredAt: afterExpiry,
  });
  assert.equal(result.phase, "FUNSET_REVERSION");
  assert.equal(result.settlement.status, "BALANCE_REVERTED_FUNSET");
  assert.ok(result.settlement.revertedAt instanceof Date, "reverted_at gravado");
  assert.equal(result.settlement.ownerBalanceAmount, "9500.00", "saldo NÃO muda (não redistribui)");

  const sumAfter = result.allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  assert.equal(sumAfter, sumBefore, "Σ allocations intacto pós-revert");
  assert.equal(sumAfter, cents("9500.00"));

  const events = await settlementEvents(actor.tenantId, processId);
  assert.equal(events.filter((e) => phaseOf(e) === "FUNSET_REVERSION").length, 1, "1 evento de reversão");
  const payload = events.find((e) => phaseOf(e) === "FUNSET_REVERSION")!.payload as Record<string, unknown>;
  assert.equal(payload.event, "auction_settlement");
  assert.equal(payload.settlementId, settlement.id, "settlementId correlaciona o evento à liquidação");
  await assertChainValid(actor.tenantId, processId);
});

// ── (d) revert bloqueado antes do prazo → 409 funset_not_yet_due (exercita o SERVICE, now=real < expires) ────────
test("(d) revert-funset antes do prazo (now < owner_claim_expires_at) → 409 funset_not_yet_due", async () => {
  actor.tenantId = reset();
  const { processId, service } = await seedDistributed(actor.tenantId, "9500.00");
  await assert.rejects(() => service.revertToFunset(actor, processId), is409("funset_not_yet_due"));
  assert.equal((await settlementEvents(actor.tenantId, processId)).filter((e) => phaseOf(e) === "FUNSET_REVERSION").length, 0, "nenhuma reversão");
});

// ── (e) mutuamente exclusivo: BALANCE_CLAIMED não reverte; BALANCE_REVERTED_FUNSET não é reclamado ──────────────
test("(e) mutuamente exclusivo: claimed→revert = 409 funset_wrong_state; reverted→claim = 409 balance_claim_wrong_state", async () => {
  // claimed → revert bloqueado.
  actor.tenantId = reset();
  const claimed = await seedDistributed(actor.tenantId, "9500.00");
  await claimed.service.claimBalance(actor, claimed.processId, {});
  const afterExpiryC = new Date(claimed.settlement.ownerClaimExpiresAt!.getTime() + MS_PER_DAY);
  await assert.rejects(
    () => repo().transitionBalanceAtomic("FUNSET_REVERSION", { tenantId: actor.tenantId, processId: claimed.processId, actorId: actor.userId, now: afterExpiryC, occurredAt: afterExpiryC }),
    is409("funset_wrong_state"),
  );

  // reverted → claim bloqueado (mesmo dentro da janela: o gate de estado precede o de prazo).
  actor.tenantId = reset();
  const reverted = await seedDistributed(actor.tenantId, "9500.00");
  const afterExpiryR = new Date(reverted.settlement.ownerClaimExpiresAt!.getTime() + MS_PER_DAY);
  await repo().transitionBalanceAtomic("FUNSET_REVERSION", { tenantId: actor.tenantId, processId: reverted.processId, actorId: actor.userId, now: afterExpiryR, occurredAt: afterExpiryR });
  await assert.rejects(() => reverted.service.claimBalance(actor, reverted.processId, {}), is409("balance_claim_wrong_state"));

  // Nenhuma liquidação terminou com AMBOS os eventos (state-change terminal, mutuamente exclusivo).
  const eventsC = await settlementEvents(actor.tenantId, reverted.processId);
  assert.equal(eventsC.filter((e) => phaseOf(e) === "CLAIM").length, 0, "reverted nunca recebeu CLAIM");
});

// ── (f) 2º claim idempotente: 409 balance_claim_wrong_state, NÃO duplica o evento ───────────────────────────────
test("(f) 2º claim de um settlement já BALANCE_CLAIMED → 409 balance_claim_wrong_state; NÃO duplica o evento", async () => {
  actor.tenantId = reset();
  const { processId, service } = await seedDistributed(actor.tenantId, "9500.00");
  const first = await service.claimBalance(actor, processId, { claim_recipient_ref: "…1111" });
  assert.equal(first.settlement.status, "BALANCE_CLAIMED");
  await assert.rejects(() => service.claimBalance(actor, processId, { claim_recipient_ref: "…2222" }), is409("balance_claim_wrong_state"));

  const events = await settlementEvents(actor.tenantId, processId);
  assert.equal(events.filter((e) => phaseOf(e) === "CLAIM").length, 1, "exatamente 1 evento de retirada (idempotente)");
  // O recebedor do 1º claim não foi sobrescrito pelo 2º corpo.
  const view = await service.get(actor, processId);
  assert.equal(view.settlement.claimRecipientRef, "…1111", "recebedor NÃO sobrescrito pelo 2º claim");
});

// ── (g) Σ das allocations INTACTO após o ciclo (não redistribui) — leitura via GET ──────────────────────────────
test("(g) Σ allocations == hammer permanece após claim (GET reflete status + campos do ciclo, allocations intactas)", async () => {
  actor.tenantId = reset();
  const { processId, service, allocations } = await seedDistributed(actor.tenantId, "9500.00", { auction_cost: "1000.00", removal_storage: "0.00" });
  const before = allocations.map((a) => ({ kind: a.beneficiaryKind, amount: a.amount, seq: a.orderSeq }));
  await service.claimBalance(actor, processId, { claim_recipient_ref: "…ABCD" });

  const view = await service.get(actor, processId);
  assert.equal(view.settlement.status, "BALANCE_CLAIMED", "GET reflete o status atual");
  assert.ok(view.settlement.claimRecipientRef, "GET reflete o recebedor minimizado");
  assert.ok(view.settlement.claimedAt instanceof Date, "GET reflete claimed_at");
  assert.ok(view.settlement.ownerClaimExpiresAt instanceof Date, "GET reflete owner_claim_expires_at");
  // Allocations byte-idênticas (nada redistribuído).
  const after = view.allocations.map((a) => ({ kind: a.beneficiaryKind, amount: a.amount, seq: a.orderSeq }));
  assert.deepEqual(after, before, "allocations intactas (mesma ordem/kind/amount)");
  const sum = view.allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  assert.equal(sum, cents("9500.00"), "Σ allocations == hammer");
});

// ── (h/§2.8) payload do ciclo sem PII do ex-dono: { event, phase, settlementId } — sem recipientRef/tenant/process ─
test("(h) §2.8: AUCTION_SETTLEMENT{phase} não vaza recipientRef/tenant_id/process_id; só {event,phase,settlementId}", async () => {
  actor.tenantId = reset();
  const { processId, service, settlement } = await seedDistributed(actor.tenantId, "9500.00");
  const secret = "RECEBEDOR-SIGILOSO-XYZ";
  await service.claimBalance(actor, processId, { claim_recipient_ref: secret });

  const events = await settlementEvents(actor.tenantId, processId);
  const claim = events.find((e) => phaseOf(e) === "CLAIM")!;
  const payload = claim.payload as Record<string, unknown>;
  assert.deepEqual(Object.keys(payload).sort(), ["event", "phase", "settlementId"], "payload = só {event, phase, settlementId}");
  assert.equal(payload.event, "auction_settlement");
  assert.equal(payload.phase, "CLAIM");
  assert.equal(payload.settlementId, settlement.id);
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes(secret), false, "recebedor (potencial PII) NUNCA na cadeia");
  assert.equal(serialized.includes(actor.tenantId), false, "sem tenant_id na cadeia");
  assert.equal(serialized.includes(processId), false, "sem process_id cru na cadeia");
});

// ── gate PURO (matriz de precedência): estado → saldo → prazo, reasons distintos por fase ───────────────────────
test("resolveBalanceCycleTransition: precedência estado>saldo>prazo + reasons distintos por fase", () => {
  const base = { status: "DISTRIBUTED" as const, ownerBalanceAmount: "100.00", ownerClaimExpiresAt: new Date(Date.now() + MS_PER_DAY) };
  const now = new Date();
  // Feliz.
  assert.equal(resolveBalanceCycleTransition("CLAIM", base, now), "BALANCE_CLAIMED");
  assert.equal(resolveBalanceCycleTransition("FUNSET_REVERSION", { ...base, ownerClaimExpiresAt: new Date(Date.now() - MS_PER_DAY) }, now), "BALANCE_REVERTED_FUNSET");
  // Estado precede saldo e prazo.
  assert.throws(() => resolveBalanceCycleTransition("CLAIM", { ...base, status: "BALANCE_CLAIMED", ownerBalanceAmount: "0.00" }, now), is409("balance_claim_wrong_state"));
  assert.throws(() => resolveBalanceCycleTransition("FUNSET_REVERSION", { ...base, status: "BALANCE_REVERTED_FUNSET" }, now), is409("funset_wrong_state"));
  // Saldo precede prazo.
  assert.throws(() => resolveBalanceCycleTransition("CLAIM", { ...base, ownerBalanceAmount: "0.00", ownerClaimExpiresAt: new Date(Date.now() - MS_PER_DAY) }, now), is409("balance_zero"));
  assert.throws(() => resolveBalanceCycleTransition("FUNSET_REVERSION", { ...base, ownerBalanceAmount: "0.00" }, now), is409("balance_zero"));
  // Prazo.
  assert.throws(() => resolveBalanceCycleTransition("CLAIM", { ...base, ownerClaimExpiresAt: new Date(Date.now() - MS_PER_DAY) }, now), is409("balance_claim_expired"));
  assert.throws(() => resolveBalanceCycleTransition("FUNSET_REVERSION", base, now), is409("funset_not_yet_due"));
});
