import assert from "node:assert/strict";
import test from "node:test";

import { CreditService } from "../src/modules/subscription-billing/credits/credit.service.js";
import { recompute } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { NOW, source } from "./helpers/ass-08c3-test-kit.js";

function scene() {
  const latest = {
    daysInMonth: 30,
    segments: [{ subscriptionId: "sub", planVersionId: "plan", fromDay: 1, toDay: 30, monthlyPriceCents: 10_000 }],
    terms: { includedUsers: 0, includedStorageMilliGb: 0, extraUserPriceCents: 0, extraGbPriceCents: 0 },
    measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 0 },
    perVehiclePriceCents: null,
    adjustmentsCents: 0,
    creditsAppliedCents: 3_800,
  } as const;
  const target: any = {
    id: "novembro",
    tenantId: "tenant",
    period: "2026-11",
    status: "paid",
    totalCents: 6_200,
    paidCents: 6_200,
    paidAt: NOW,
    creditsAppliedCents: 3_800,
    snapshot: { latest, history: [] },
  };
  const credit: any = { id: "credit-38", tenantId: "tenant", originStatementId: "outubro", amountCents: 3_800, status: "applied", appliedToStatementId: target.id, resolutionNote: null };
  const saved: { statement?: any; credit?: any } = {};
  const tx: any = {
    lockCredit: async () => credit,
    lockById: async () => target,
    saveStatement: async (value: any) => { saved.statement = value; return value; },
    saveCredit: async (value: any) => { saved.credit = value; return value; },
  };
  return { latest, target, credit, saved, tx };
}

test("CR-mem e CR1: crédito aplicado estornado recompõe R$100, reabre novembro e limpa paidAt", async () => {
  const s = scene();
  const result = await new CreditService().absorbReversal(s.tx, { ownCredit: s.credit, reversedCents: 3_800, now: NOW });
  assert.equal(result.creditReversed, true);
  assert.equal(s.saved.statement.totalCents, 10_000);
  assert.equal(s.saved.statement.paidCents, 6_200);
  assert.equal(s.saved.statement.status, "closed");
  assert.equal(s.saved.statement.paidAt, null);
  assert.equal(s.saved.credit.status, "written_off");
});

test("CR2: snapshot.latest recompõe exatamente o total salvo e histórico registra credit_reversed", async () => {
  const s = scene();
  await new CreditService().absorbReversal(s.tx, { ownCredit: s.credit, reversedCents: 3_800, now: NOW });
  assert.equal(recompute(s.saved.statement.snapshot.latest), s.saved.statement.totalCents);
  assert.equal(s.saved.statement.snapshot.history.at(-1)?.event, "credit_reversed");
});

test("CR3: a visão de custo conserva a guarda de integridade do snapshot", () => {
  const text = source("src/modules/subscription-billing/overview/subscription-amount.ts");
  assert.match(text, /statement_integrity_violation/);
});

test("CR4: trilha Prisma usa StatementTx.recordAudit e não charging().recordAudit", () => {
  const settlement = source("src/modules/subscription-billing/statements/statement-settlement.service.ts");
  assert.match(settlement, /subscription_statement\.credit_reversed/);
  assert.match(settlement, /tx\.recordAudit/);
  assert.doesNotMatch(settlement, /charging\(\)\.recordAudit/);
});

test("M-CR1 e M-CR-AUD: as âncoras são únicas", () => {
  assert.equal(source("src/modules/subscription-billing/credits/credit.service.ts").split("[CREDIT-RECOMPUTE]").length - 1, 1);
  assert.match(source("src/modules/subscription-billing/statements/statement-settlement.service.ts"), /effect\.creditReversed && tx\.recordAudit/);
});
