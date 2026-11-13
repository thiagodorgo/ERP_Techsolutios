import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const jobs = readFileSync(new URL("../src/modules/subscription-billing/outbox/channel.jobs.ts", import.meta.url), "utf8");
const port = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/payment-provider.port.ts", import.meta.url), "utf8");

test("R1: a cobrança recuperada passa por recordChargeOutcome, não por markSent", () => {
  assert.match(dispatcher, /recordChargeOutcome/);
  assert.doesNotMatch(dispatcher, /decision === "adopt"[\s\S]{0,300}markSent/);
});

test("R1: ChargeLookup carrega os campos públicos recuperáveis", () => {
  for (const field of ["payUrl", "pixCopyPaste", "boletoLine", "boletoUrl", "dueDate"]) {
    assert.match(port, new RegExp(`readonly ${field}\\?`));
  }
});

test("R1: o job não mantém o registro legado em três transações", () => {
  assert.doesNotMatch(jobs, /onChargeCreated:/);
});
