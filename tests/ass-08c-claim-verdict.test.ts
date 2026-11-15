// B-ASS-08c1c (plano §4.5, Emenda 1 §3) — o veredito do claim, PURO, e as guardas de texto do bloco (GC1 a GC3).
//
// O claim relê o demonstrativo e decide, na ordem: as regras de hoje (pago, cancelado, reaberto, refechado → pular;
// demonstrativo ausente → revisão), a cobrança viva (`charge_already_exists`), o pagamento parcial (`[CLAIM-PARTIAL]`,
// `statement_partially_paid`) e a idade (`[STALE-REENABLE]`, `stale_on_reenable`, 7 dias; a linha reaberta pelo operador conta
// da decisão dele, `[STALE-OPERATOR]`/`[STALE-SINCE]`). Os mesmos casos rodam no banco em `ass-08c-close-enqueue-db.test.ts`.
//
// Mutações donas (Emenda 1 §3 e §4): M-A11b (apagar `[STALE-REENABLE]`) → CL4/CL5; M-R2-07 (só `provider_disabled`) → CL5;
// M-CL7 (`operatorReopened = false`) → CL7/CL7b; M-CL7c (isenção sem idade) → CL7c; M-ORDER (os 3 antes das regras de hoje)
// → CL6b; M-CLP (apagar `[CLAIM-PARTIAL]`) → CL8; M-CORE (o registro grava o `charge_cancel` direto) → GC1.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chargeCreateClaimVerdict } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { STALE_REENABLE_MS, type BillingOutboxRow, type StatementClaimSnapshot } from "../src/modules/subscription-billing/outbox/outbox.types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = new Date("2026-12-01T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function line(patch: Partial<BillingOutboxRow> = {}): BillingOutboxRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tenantId: "t",
    statementId: "s",
    kind: "charge_create",
    provider: "asaas",
    idempotencyKey: "charge_create:s:1",
    providerIdempotencyKey: "k",
    payload: { amountCents: 10000, dueDate: "2026-12-20", method: "pix" },
    status: "PENDING",
    skipReason: null,
    claimedAt: null,
    claimedBy: null,
    attemptStartedAt: null,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    externalId: null,
    occurredAt: new Date(NOW.getTime() - DAY),
    createdAt: new Date(NOW.getTime() - DAY),
    updatedAt: new Date(NOW.getTime() - DAY),
    ...patch,
  };
}

const closed: StatementClaimSnapshot = { status: "closed", reopenedAt: null, hasLiveCharge: false, paidCents: 0 };
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

test("STALE_REENABLE_MS é 7 dias", () => {
  assert.equal(STALE_REENABLE_MS, 7 * DAY);
});

test("CL4 (puro): PENDING `provider_disabled` de 8 dias → needs_review stale_on_reenable", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line({ skipReason: "provider_disabled", occurredAt: ago(8) }), closed, NOW), { kind: "needs_review", code: "stale_on_reenable" });
});

test("CL5 (puro): PENDING com `skip_reason` NULO e 8 dias (o desligamento pelo env, R2-07) → stale_on_reenable", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line({ skipReason: null, occurredAt: ago(8) }), closed, NOW), { kind: "needs_review", code: "stale_on_reenable" });
});

test("CL6 (puro): PENDING de 6 dias e conta paga → skip statement_paid; a de 6 dias com a conta aberta sai", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line({ occurredAt: ago(6) }), { ...closed, status: "paid" }, NOW), { kind: "skip", skipReason: "statement_paid" });
  assert.deepEqual(chargeCreateClaimVerdict(line({ occurredAt: ago(6) }), closed, NOW), { kind: "eligible" });
});

test("CL6b (puro): PENDING de 8 dias e conta paga → skip statement_paid, NÃO stale_on_reenable (a ordem)", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line({ occurredAt: ago(8) }), { ...closed, status: "paid" }, NOW), { kind: "skip", skipReason: "statement_paid" });
  assert.deepEqual(chargeCreateClaimVerdict(line({ occurredAt: ago(8) }), { ...closed, status: "cancelled" }, NOW), { kind: "skip", skipReason: "statement_cancelled" });
  assert.deepEqual(chargeCreateClaimVerdict(line({ occurredAt: ago(8) }), { ...closed, status: "reopened" }, NOW), { kind: "skip", skipReason: "statement_reopened" });
});

test("CL7 (puro): a linha reaberta pelo operador (attempts 0, last_error, next_attempt_at do retry) há 1 dia sai, mesmo nascida há 30", () => {
  const reopened = line({ occurredAt: ago(30), attempts: 0, lastError: "stale_on_reenable", nextAttemptAt: ago(1) });
  assert.deepEqual(chargeCreateClaimVerdict(reopened, closed, NOW), { kind: "eligible" });
});

test("CL7b (puro): a FAILED de 10 dias reaberta pelo /retry agora sai", () => {
  const retried = line({ occurredAt: ago(10), attempts: 0, lastError: "provider_timeout", nextAttemptAt: NOW });
  assert.deepEqual(chargeCreateClaimVerdict(retried, closed, NOW), { kind: "eligible" });
});

test("CL7c (puro): reaberta pelo operador há 30 dias (o canal ficou desligado) → stale_on_reenable", () => {
  const retriedLongAgo = line({ occurredAt: ago(40), attempts: 0, lastError: "provider_timeout", nextAttemptAt: ago(30) });
  assert.deepEqual(chargeCreateClaimVerdict(retriedLongAgo, closed, NOW), { kind: "needs_review", code: "stale_on_reenable" });
});

test("CL8 (puro): PENDING de conta `closed` com pagamento parcial → needs_review statement_partially_paid; sem paidCents conta como sem pagamento", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line(), { ...closed, paidCents: 5000 }, NOW), { kind: "needs_review", code: "statement_partially_paid" });
  assert.deepEqual(chargeCreateClaimVerdict(line(), { status: "closed", reopenedAt: null, hasLiveCharge: false }, NOW), { kind: "eligible" });
});

test("os outros tipos passam sem idade (o veredito é só da charge_create)", () => {
  assert.deepEqual(chargeCreateClaimVerdict(line({ kind: "invoice_issue", occurredAt: ago(90) }), undefined, NOW), { kind: "eligible" });
});

// ---------------------------------------------------------------------------------------------- guardas de texto (§5.5)
type Hit = { readonly file: string; readonly line: number; readonly text: string };

function grep(needle: string | RegExp): Hit[] {
  const hits: Hit[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        readFileSync(full, "utf8").split(/\r?\n/).forEach((text, index) => {
          if (typeof needle === "string" ? text.includes(needle) : needle.test(text)) hits.push({ file: path.relative(ROOT, full).replaceAll("\\", "/"), line: index + 1, text });
        });
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return hits;
}

const REQUEST = "src/modules/subscription-billing/charges/charge-request.service.ts";

test('GC1: `kind: "charge_cancel"` em src só 2 vezes, as duas no serviço do pedido (o CANCEL-CORE e o cancel-unknown)', () => {
  const hits = grep('kind: "charge_cancel"');
  assert.deepEqual(hits.map((hit) => hit.file), [REQUEST, REQUEST], JSON.stringify(hits));
});

test('GC2: `kind: "charge_create"` em src só no serviço do pedido (a obrigação (1): o fechamento não grava a linha direto)', () => {
  assert.deepEqual(grep('kind: "charge_create"').filter((hit) => hit.file !== REQUEST), []);
});

test("GC3: `enqueueChargeCreateInTx(` em src só no serviço do pedido e no CLOSE-ENQ (2 chamadores)", () => {
  const hits = grep("enqueueChargeCreateInTx(");
  const callers = hits.filter((hit) => !/export async function enqueueChargeCreateInTx\(/.test(hit.text));
  assert.deepEqual([...new Set(hits.map((hit) => hit.file))].sort(), [REQUEST, "src/modules/subscription-billing/statements/statement.service.ts"]);
  assert.equal(callers.length, 2, JSON.stringify(callers));
  assert.equal(callers.filter((hit) => hit.text.includes("// [CLOSE-ENQ]")).length, 1);
});
