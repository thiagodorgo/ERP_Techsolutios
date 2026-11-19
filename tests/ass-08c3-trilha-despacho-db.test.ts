import assert from "node:assert/strict";
import test from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, paymentPort, source } from "./helpers/ass-08c3-test-kit.js";

test("TD1: NEEDS_REVIEW chega ao sink com tenant, statement, kind e code allowlisted", async () => {
  const repo = memoryOutbox();
  await enqueue(repo, { payload: { amountCents: 10_000, dueDate: "2000-01-01" } });
  const events: unknown[] = [];
  const { port } = paymentPort();
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => NOW, onAudit: async (event) => { events.push(event); } });
  assert.deepEqual(events, [{ tenantId: TENANT_A, statementId: "10000000-0000-4000-8000-000000000001", kind: "charge_create", action: "billing_outbox.needs_review", code: "due_date_past" }]);
});

test("TD2: failed, lease_lost, record_failed e orphan_recheck_failed pertencem ao contrato do evento", () => {
  const text = source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts");
  for (const action of ["billing_outbox.failed", "billing_outbox.lease_lost", "billing_outbox.record_failed", "billing_outbox.orphan_recheck_failed"]) assert.match(text, new RegExp(action.replaceAll(".", "\\.")));
});

test("TD3: invoice_sweep_failed é limitado por tenant+code durante uma hora", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  assert.equal(text.split("[TRILHA-THROTTLE]").length - 1, 1);
  assert.match(text, /event\.tenantId \?\? "platform"/);
  assert.match(text, /now - last < HOUR_MS/);
});

test("TD4: falha de persistência é capturada e apenas registrada no logger", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  assert.match(text, /try \{[\s\S]*\} catch \{[\s\S]*logger\.warn/);
});

test("TD-X: metadata persistida é allowlist e não contém payload/external_id/url/resposta", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  const metadata = [...text.matchAll(/metadata:\s*\{([^}]*)\}/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(metadata, /payload|external|url|response|token|secret/i);
  assert.match(metadata, /statementId|kind|code/);
});

test("M-TD1/M-TD3/M-TD4: repasse, throttle e catch têm âncoras verificáveis", () => {
  const jobs = source("src/modules/subscription-billing/outbox/channel.jobs.ts");
  assert.equal(jobs.split("[TRILHA-01]").length - 1, 1);
  assert.match(jobs, /onAudit:\s*deps\.onAudit,\s*\/\/ \[TRILHA-01\]/);
  assert.equal(source("src/modules/subscription-billing/outbox/dispatch-audit.ts").split("[TRILHA-THROTTLE]").length - 1, 1);
  assert.match(source("src/modules/subscription-billing/outbox/dispatch-audit.ts"), /catch \{/);
});

