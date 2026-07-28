import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import type { ImpoundStatus } from "../src/modules/impound/impound.types.js";
import {
  getMemoryImpoundRepositoryForTests,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import { resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import {
  getMemoryChargeRepositoryForTests,
  resetChargeRuntimeForTests,
} from "../src/modules/charging/charge.service.js";
import { distributeCascade } from "../src/modules/auction/auction.settlement.repository.js";
import {
  AuctionSettlementService,
  getMemoryAuctionSettlementRepositoryForTests,
  resetAuctionSettlementRuntimeForTests,
  type SettlementAuctionStatePort,
  type SettlementCascadeClaimPort,
} from "../src/modules/auction/auction.settlement.service.js";
import {
  CASCADE_TIER_ORDER,
  type CascadeClaim,
  type SettlementBeneficiaryKind,
} from "../src/modules/auction/auction.settlement.types.js";
import type { AuctionAttempt } from "../src/modules/auction/auction.types.js";

// Ω5P PR-14a — LIQUIDAÇÃO em cascata §6º (núcleo I7), InMemory. INVARIANTE FINANCEIRO FORTE: dinheiro em CENTAVOS
// INTEIROS EXATOS, ZERO float. Cobre: (1) Σ=arremate exato property-based; (2) cascata na ordem legal (waterfall);
// (3) base=SOLD efetiva (findActiveSoldRound, não Σ); (4) saldo=resíduo/shortfall; (5) claim item I capado sem
// dupla-conta (process_charges intocado); (6) idempotência; (8) cadeia valid + payload sem PII; (10) gate FSM.

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

// PRNG determinístico (mulberry32) — property-based sem dependência nova (fast-check = junta-5).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cria um processo REAL e o dirige até AUCTION_CLOSED via applyTransition (a máquina de VENDA não é o objeto do teste;
// a cadeia hash é REAL — genesis + STATUS_CHANGE — p/ os testes de idempotência/cadeia/gate). frozen_at é setado no
// passo AUCTIONED (T_stop §5).
async function makeClosedProcess(tenantId: string, opts: { enteredDaysAgo?: number } = {}): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId: randomUUID(),
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(Date.now() - (opts.enteredDaysAgo ?? 120) * MS_PER_DAY),
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

function stubAuction(status: ImpoundStatus, attempts: readonly AuctionAttempt[]): SettlementAuctionStatePort {
  return { getState: async () => ({ status, attempts, edicts: [] }) };
}

const zeroClaim: SettlementCascadeClaimPort = async () => ({ claimCents: 0, currency: "BRL" });

// Serviço com portas controladas (attempts do leilão + claim item I), sobre o repo de settlement + impound de MEMÓRIA
// REAIS (a cadeia hash é real). Isola a LÓGICA da distribuição; a corrida/atomicidade REAL = teste DB-gated.
function makeService(status: ImpoundStatus, attempts: readonly AuctionAttempt[], cascadeClaim: SettlementCascadeClaimPort = zeroClaim): AuctionSettlementService {
  return new AuctionSettlementService(
    getMemoryAuctionSettlementRepositoryForTests(),
    getMemoryImpoundRepositoryForTests(),
    stubAuction(status, attempts),
    cascadeClaim,
  );
}

const is409 = (reason: string) => (error: unknown) =>
  (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === reason;

function cents(money: string): number {
  return Math.round(Number(money) * 100);
}

// ── (1) Σ = arremate EXATO em centavos (property-based ∀hammer≥0 ∀claims≥0) ─────────────────────────────────────
test("(1) I7: Σ allocations + ownerBalance == hammer EXATO em centavos (property-based + bordas)", () => {
  const rand = mulberry32(0x5e77_1e00);
  const tiers = CASCADE_TIER_ORDER;
  // 2000 casos aleatórios + bordas explícitas (1 centavo, R$0,00, 999999.99).
  const hammers = [0, 1, 100, 99_999_999, ...Array.from({ length: 2000 }, () => Math.floor(rand() * 50_000_000))];
  for (const hammerCents of hammers) {
    const claims: CascadeClaim[] = tiers.map((kind) => ({ kind, claimCents: Math.floor(rand() * 20_000_000) }));
    const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(hammerCents, claims);
    const sum = allocations.reduce((acc, a) => acc + a.amountCents, 0) + ownerBalanceCents;
    assert.equal(sum, hammerCents, `Σ deve == hammer (${hammerCents})`);
    // Cada alocação é inteira, ≥0 e ≤ o claim (nunca aloca mais do que reclamado nem que o disponível).
    for (const a of allocations) {
      assert.ok(Number.isInteger(a.amountCents) && a.amountCents >= 0 && a.amountCents <= a.claimCents, "alloc inteira, 0..claim");
    }
    assert.ok(Number.isInteger(ownerBalanceCents) && ownerBalanceCents >= 0, "ownerBalance inteiro ≥0");
    const totalClaims = claims.reduce((acc, c) => acc + c.claimCents, 0);
    assert.equal(shortfallCents, Math.max(0, totalClaims - hammerCents), "shortfall = max(0, Σclaims − hammer)");
  }
});

// ── (2) cascata na ORDEM legal — waterfall (tier inferior só após exaurir o superior) ───────────────────────────
test("(2) waterfall §6º: tier inferior só recebe após EXAURIR o superior", () => {
  // hammer 1000; AUCTION_COST 300, REMOVAL_STORAGE 400, VEHICLE_TAXES 500 (o resto 0). Sobra p/ VEHICLE_TAXES só 300.
  const claims: CascadeClaim[] = [
    { kind: "AUCTION_COST", claimCents: 30000 },
    { kind: "REMOVAL_STORAGE", claimCents: 40000 },
    { kind: "VEHICLE_TAXES", claimCents: 50000 },
    { kind: "PRIORITY_CREDITORS", claimCents: 10000 },
    { kind: "REALIZING_AGENCY_FINES", claimCents: 10000 },
    { kind: "OTHER_SNT_FINES", claimCents: 10000 },
    { kind: "OTHER_DEBITS", claimCents: 10000 },
  ];
  const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(100000, claims);
  const byKind = new Map(allocations.map((a) => [a.kind, a.amountCents]));
  assert.equal(byKind.get("AUCTION_COST"), 30000, "topo pago integralmente");
  assert.equal(byKind.get("REMOVAL_STORAGE"), 40000, "item I pago integralmente");
  assert.equal(byKind.get("VEHICLE_TAXES"), 30000, "item II PARCIAL (só a sobra 300)");
  assert.equal(byKind.get("PRIORITY_CREDITORS"), 0, "tier inferior NÃO recebe (superior não exaurido)");
  assert.equal(byKind.get("OTHER_DEBITS"), 0, "tier mais inferior 0");
  assert.equal(ownerBalanceCents, 0, "sem saldo (hammer < Σclaims)");
  // Σclaims = 300+400+500+100+100+100+100 = 1600; shortfall = 1600 − 1000 = 600.
  assert.equal(shortfallCents, 60000, "shortfall = Σclaims(1600) − hammer(1000) = 600");
});

// ── (4) saldo = resíduo (=0 na insuficiência; shortfall correto) + saldo POSITIVO ──────────────────────────────
test("(4) saldo ao ex-dono = resíduo; =0 na insuficiência; positivo quando sobra", () => {
  // Sobra: hammer 10000, claims somam 3000 → ownerBalance 7000, shortfall 0.
  const surplus = distributeCascade(1_000_000, [
    { kind: "AUCTION_COST", claimCents: 100000 },
    { kind: "REMOVAL_STORAGE", claimCents: 200000 },
    { kind: "VEHICLE_TAXES", claimCents: 0 },
    { kind: "PRIORITY_CREDITORS", claimCents: 0 },
    { kind: "REALIZING_AGENCY_FINES", claimCents: 0 },
    { kind: "OTHER_SNT_FINES", claimCents: 0 },
    { kind: "OTHER_DEBITS", claimCents: 0 },
  ]);
  assert.equal(surplus.ownerBalanceCents, 700000, "resíduo = 10000 − 3000 = 7000");
  assert.equal(surplus.shortfallCents, 0, "sem shortfall");
  // Insuficiência: hammer 100, claims 5000 → ownerBalance 0, shortfall 4900.
  const deficit = distributeCascade(10000, [{ kind: "AUCTION_COST", claimCents: 500000 }]);
  assert.equal(deficit.ownerBalanceCents, 0, "insuficiência ⇒ saldo 0");
  assert.equal(deficit.shortfallCents, 490000, "shortfall = 5000 − 100 = 4900");
});

// ── (3) base = SOLD EFETIVA (findActiveSoldRound) — NUNCA a soma da revenda ──────────────────────────────────────
test("(3) hammer = SOLD efetiva (SOLD r1 → NO_PAYMENT r2 → revenda SOLD r3): hammer=r3, NUNCA r1 nem r1+r3", async () => {
  actor.tenantId = reset();
  const processId = await makeClosedProcess(actor.tenantId);
  // SOLD r1 (5000) superada por NO_PAYMENT r2 (defaultedSaleRound=1); revenda SOLD r3 (7000) = a efetiva.
  const attempts = [
    makeAttempt(actor.tenantId, processId, { roundNumber: 1, outcome: "SOLD", soldAmount: "5000.00" }),
    makeAttempt(actor.tenantId, processId, { roundNumber: 2, outcome: "NO_PAYMENT", defaultedSaleRound: 1 }),
    makeAttempt(actor.tenantId, processId, { roundNumber: 3, outcome: "SOLD", soldAmount: "7000.00" }),
  ];
  const service = makeService("AUCTION_CLOSED", attempts);
  const result = await service.distribute(actor, processId, {});
  assert.equal(result.settlement.soldRound, 3, "base = a revenda r3 (SOLD efetiva)");
  assert.equal(result.settlement.hammerAmount, "7000.00", "hammer = r3 (NUNCA r1=5000 nem r1+r3=12000)");
  assert.equal(result.settlement.ownerBalanceAmount, "7000.00", "sem claims → saldo = hammer");
  // I7 no banco de memória: Σ allocations == hammer.
  const sum = result.allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  assert.equal(sum, cents("7000.00"), "Σ allocations == hammer");
});

// ── (5) claim item I CAPADO (over-accrued não infla) + process_charges INTOCADO (sem dupla-conta) ───────────────
test("(5) item I capado ao teto I4: over-accrued NÃO infla o claim; process_charges intocado (sem settled/ADJUSTMENT)", async () => {
  actor.tenantId = reset();
  const processId = await makeClosedProcess(actor.tenantId);
  const chargeRepo = getMemoryChargeRepositoryForTests();
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(actor.tenantId, processId);
  // Teto legado 30 diárias; entered 120d atrás ⇒ nAccrue capa em 30 (as 10 excedentes são over-accrued).
  chargeRepo.setProfileForTests(actor.tenantId, process!.profileId, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "THIRTY_DAYS_LEGACY" });
  await chargeRepo.createManualCharge({
    tenantId: actor.tenantId, processId, kind: "REMOVAL", description: "Remoção",
    quantity: "1.00", unitAmount: "150.00", totalAmount: "150.00", currency: "BRL", actorId: undefined, occurredAt: new Date(),
  });
  for (let period = 1; period <= 40; period += 1) {
    await chargeRepo.accrueDailyCharge({
      tenantId: actor.tenantId, processId, periodSeq: period, refDate: "2026-01-01",
      unitAmount: "50.00", currency: "BRL", actorId: undefined, occurredAt: new Date(),
    });
  }
  const before = await chargeRepo.listCharges({ tenantId: actor.tenantId, processId });

  const { createMemoryChargeService } = await import("../src/modules/charging/charge.service.js");
  const cascadeClaim: SettlementCascadeClaimPort = (t, p) => createMemoryChargeService().getCascadeExpenseClaim(t, p);
  const attempts = [makeAttempt(actor.tenantId, processId, { roundNumber: 1, outcome: "SOLD", soldAmount: "9500.00" })];
  const service = makeService("AUCTION_CLOSED", attempts, cascadeClaim);
  const result = await service.distribute(actor, processId, { auction_cost: "200.00", vehicle_taxes: "100.00" });

  // Claim item I = removal(150) + 30 diárias capadas(1500) = 1650 — NÃO 2150 (as 10 over-accrued NÃO inflam).
  assert.equal(result.settlement.removalStorageClaim, "1650.00", "item I capado ao teto (over-accrued excluído)");
  const removalAlloc = result.allocations.find((a) => a.beneficiaryKind === "REMOVAL_STORAGE");
  assert.equal(removalAlloc?.amount, "1650.00", "allocation REMOVAL_STORAGE = claim capado");
  assert.equal(removalAlloc?.claimAmount, "1650.00", "claim_amount capado registrado");
  // Σ = hammer.
  const sum = result.allocations.reduce((acc, a) => acc + cents(a.amount), 0);
  assert.equal(sum, cents("9500.00"), "Σ allocations == hammer");

  // process_charges INTOCADO: nenhuma linha carimbada settled_at; nenhum ADJUSTMENT criado; mesma contagem.
  const after = await chargeRepo.listCharges({ tenantId: actor.tenantId, processId });
  assert.equal(after.length, before.length, "nenhuma linha nova (nenhum ADJUSTMENT de estorno)");
  assert.equal(after.filter((c) => c.kind === "ADJUSTMENT").length, 0, "settlement NÃO posta ADJUSTMENT (dono é charging)");
  assert.equal(after.filter((c) => c.settledAt !== undefined).length, 0, "settlement NÃO carimba settled_at");
});

// ── (6) idempotência: 2ª distribuição NÃO distribui 2×; devolve a existente; 1 único AUCTION_SETTLEMENT ─────────
test("(6) idempotência: 2º POST devolve a existente (created:false), 1 único AUCTION_SETTLEMENT, saldo NÃO dobra", async () => {
  actor.tenantId = reset();
  const processId = await makeClosedProcess(actor.tenantId);
  const attempts = [makeAttempt(actor.tenantId, processId, { roundNumber: 1, outcome: "SOLD", soldAmount: "9500.00" })];
  const service = makeService("AUCTION_CLOSED", attempts);

  const first = await service.distribute(actor, processId, { auction_cost: "500.00" });
  assert.equal(first.created, true);
  const second = await service.distribute(actor, processId, { auction_cost: "999999.99" });
  assert.equal(second.created, false, "2ª distribuição devolve a existente");
  assert.equal(second.settlement.id, first.settlement.id, "mesma liquidação");
  assert.equal(second.settlement.ownerBalanceAmount, first.settlement.ownerBalanceAmount, "saldo NÃO redistribui (ignora o 2º corpo)");

  const events = await getMemoryImpoundRepositoryForTests().listEvents(actor.tenantId, processId);
  assert.equal(events.filter((e) => e.type === "AUCTION_SETTLEMENT").length, 1, "exatamente 1 AUCTION_SETTLEMENT");
  // GET devolve a mesma liquidação.
  const view = await service.get(actor, processId);
  assert.equal(view.settlement.id, first.settlement.id);
  assert.equal(view.allocations.length, 8, "7 tiers + OWNER_BALANCE");
});

// ── (8) cadeia valid pós-settle; payload sem PII, dinheiro STRING, ordenado ──────────────────────────────────────
test("(8) AUCTION_SETTLEMENT na cadeia: payload {event,soldRound,hammer,breakdown,ownerBalance} sem PII; verifyChain.valid", async () => {
  actor.tenantId = reset();
  const processId = await makeClosedProcess(actor.tenantId);
  const attempts = [makeAttempt(actor.tenantId, processId, { roundNumber: 2, outcome: "SOLD", soldAmount: "9500.00" })];
  const service = makeService("AUCTION_CLOSED", attempts);
  await service.distribute(actor, processId, { auction_cost: "300.00", priority_creditors: "150.00" });

  const events = await getMemoryImpoundRepositoryForTests().listEvents(actor.tenantId, processId);
  const settle = events.find((e) => e.type === "AUCTION_SETTLEMENT");
  assert.ok(settle, "AUCTION_SETTLEMENT encadeado");
  const payload = settle!.payload as Record<string, unknown>;
  assert.equal(payload.event, "auction_settlement");
  assert.equal(payload.soldRound, 2);
  assert.equal(payload.hammer, "9500.00");
  assert.equal(typeof payload.hammer, "string", "dinheiro é STRING (canonicalJson)");
  assert.equal(payload.ownerBalance, "9050.00");
  const breakdown = payload.breakdown as Array<{ kind: string; amount: string }>;
  assert.equal(breakdown.length, 7, "os 7 tiers no breakdown (ordem §6º)");
  assert.equal(breakdown[0].kind, "AUCTION_COST");
  assert.equal(breakdown[0].amount, "300.00");
  assert.equal(typeof breakdown[0].amount, "string");
  // §2.8: sem UUID cru (tenant/process/id) no payload.
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes(actor.tenantId), false, "sem tenant_id na cadeia");
  assert.equal(serialized.includes(processId), false, "sem process_id cru na cadeia");

  // A cadeia continua ÍNTEGRA pós-append.
  const snap = await getMemoryImpoundRepositoryForTests().readChainSnapshot(actor.tenantId, processId);
  assert.ok(snap);
  const verified = verifyChain({ tenantId: actor.tenantId, processId, events: snap!.events, head: snap!.head, crossAnchors: snap!.crossAnchors });
  assert.equal(verified.valid, true, "verifyChain.valid pós-settle");
});

// ── (10) gate FSM: só AUCTION_CLOSED liquida; ACTIVE_CUSTODY/AUCTIONED/DIRECT_RECYCLING → 409 settlement_wrong_state ─
test("(10) gate FSM: liquidar em ACTIVE_CUSTODY/AUCTIONED/DIRECT_RECYCLING → 409 settlement_wrong_state; só AUCTION_CLOSED passa", async () => {
  for (const status of ["ACTIVE_CUSTODY", "AUCTIONED", "DIRECT_RECYCLING"] as const) {
    actor.tenantId = reset();
    // Cria o processo e o posiciona no status errado (via applyTransition direto — a máquina não é o objeto).
    const impound = getMemoryImpoundRepositoryForTests();
    const process = await impound.openFromRemovalAtomic({
      tenantId: actor.tenantId, serviceOrderId: randomUUID(), profileId: randomUUID(),
      originAuthority: "A", unidentifiedReason: "r", completedAt: new Date(Date.now() - 120 * MS_PER_DAY), actorId: undefined,
    });
    await impound.applyTransition({
      tenantId: actor.tenantId, processId: process.id, expectedFrom: "RECEPTION", to: status,
      setEnteredAt: false, setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: status, reason: null }, occurredAt: new Date(), actorId: undefined },
    });
    const attempts = [makeAttempt(actor.tenantId, process.id, { roundNumber: 1, outcome: "SOLD", soldAmount: "9500.00" })];
    const service = makeService(status, attempts);
    await assert.rejects(() => service.distribute(actor, process.id, {}), is409("settlement_wrong_state"), `status ${status} bloqueia`);
  }

  // AUCTION_CLOSED sem SOLD efetiva → 409 settlement_sale_missing (consumação sem venda não distribui produto).
  actor.tenantId = reset();
  const noSale = await makeClosedProcess(actor.tenantId);
  const noSaleService = makeService("AUCTION_CLOSED", []);
  await assert.rejects(() => noSaleService.distribute(actor, noSale, {}), is409("settlement_sale_missing"));

  // AUCTION_CLOSED com SOLD efetiva → PASSA.
  actor.tenantId = reset();
  const ok = await makeClosedProcess(actor.tenantId);
  const okService = makeService("AUCTION_CLOSED", [makeAttempt(actor.tenantId, ok, { roundNumber: 1, outcome: "SOLD", soldAmount: "9500.00" })]);
  const result = await okService.distribute(actor, ok, {});
  assert.equal(result.created, true);
  assert.equal(result.settlement.status, "DISTRIBUTED");
});
