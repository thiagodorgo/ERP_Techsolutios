import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const prisma = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.prisma.ts", import.meta.url), "utf8");
const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const lockOrder = readFileSync(new URL("./ass-08-lock-order-db.test.ts", import.meta.url), "utf8");

test("RG1: cobrança, ref e SENT pertencem à mesma transação [REG-TX]", () => {
  assert.match(prisma, /\[REG-TX\]/);
  const body = prisma.slice(prisma.indexOf("recordChargeOutcome"));
  assert.match(body, /subscription_statements[\s\S]*FOR NO KEY UPDATE/);
  assert.match(body, /UPDATE billing_outbox[\s\S]*RETURNING id/);
  assert.match(body, /INSERT INTO subscription_statement_charges/);
  assert.match(body, /putRefInTx/);
});

test("RG2: lease perdida no registro faz rollback e gera lease_lost", () => {
  assert.match(prisma, /throw new LeaseLostError|LEASE_LOST/);
  assert.match(dispatcher, /billing_outbox\.lease_lost/);
});

test("RACE-6: falha de registro pós-provedor mantém PROCESSING e registra record_failed", () => {
  assert.match(dispatcher, /billing_outbox\.record_failed/);
  assert.doesNotMatch(dispatcher, /recordChargeOutcome[\s\S]{0,500}registerFailure/);
});

test("RG3: o mapeamento de estado da adotada é explícito e overdue vira pending", () => {
  assert.match(prisma, /overdue[\s\S]{0,120}pending/);
  assert.match(prisma, /unknown[\s\S]{0,120}needs_review/);
});

test("T-LOCK-2: recordChargeOutcome é cenário nomeado e trava demonstrativo antes da fila", () => {
  assert.match(lockOrder, /outbox\.recordChargeOutcome/);
  assert.ok(prisma.indexOf("subscription_statements") < prisma.indexOf("UPDATE billing_outbox", prisma.indexOf("recordChargeOutcome")));
});
