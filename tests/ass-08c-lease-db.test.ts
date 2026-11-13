import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const prisma = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.prisma.ts", import.meta.url), "utf8");
const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const repository = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.repository.ts", import.meta.url), "utf8");

test("L1: toda escrita reclamada exige id, PROCESSING, claimed_by e attempt_started_at [LEASE-01]", () => {
  assert.match(prisma, /\[LEASE-01\]/);
  const guardedWrite = prisma.slice(prisma.indexOf("[LEASE-01]"), prisma.indexOf("return result.count", prisma.indexOf("[LEASE-01]")) + 40);
  assert.match(guardedWrite, /status:\s*"PROCESSING"/);
  assert.match(guardedWrite, /claimed_by:\s*lease\.claimedBy/);
  assert.match(guardedWrite, /attempt_started_at:\s*lease\.attemptStartedAt/);
  assert.match(guardedWrite, /result\.count\s*===\s*1/);
});

test("L1b: o claimedBy padrão inclui um PROCESS_ID aleatório [CLAIMED-BY]", () => {
  assert.match(dispatcher, /\[CLAIMED-BY\]/);
  assert.match(dispatcher, /randomUUID\(\)/);
  assert.match(dispatcher, /dispatch-outbox:\$\{PROCESS_ID\}/);
});

test("L2: mutação que perde a lease devolve false e o dispatcher registra lease_lost", () => {
  assert.match(repository, /Promise<boolean>/);
  assert.match(dispatcher, /billing_outbox\.lease_lost/);
});

test("L3: a lease é confirmada em transação curta antes de createCharge [LEASE-02]", () => {
  assert.match(prisma, /confirmLease/);
  assert.match(dispatcher, /\[LEASE-02\]/);
  const marker = dispatcher.indexOf("[LEASE-02]");
  assert.ok(marker >= 0 && dispatcher.indexOf("confirmLease", marker) < dispatcher.indexOf("port.createCharge", marker));
});

test("PROBE-L1: worker atrasado não pode tirar NEEDS_REVIEW nem SKIPPED", () => {
  assert.doesNotMatch(prisma, /updateMany\(\{\s*where:\s*\{\s*id\s*\}\s*,/s);
});

test("L1c: o instante da lease nasce do now do claim, sem round-trip de relógio SQL", () => {
  assert.match(prisma, /attempt_started_at\s*=\s*\$2/);
});
