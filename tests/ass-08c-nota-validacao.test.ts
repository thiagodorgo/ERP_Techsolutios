// B-ASS-08c2 (plano §4.11, §5.5) — o erro de VALIDAÇÃO na emissão da nota (NOTA-VAL): a nota fica `rejected` com o CÓDIGO
// (nunca o texto do provedor) e a linha vai a `NEEDS_REVIEW`, visível; o demonstrativo pago aparece no backlog para a
// reemissão pelo `/invoice`. O catch do `beginIssue` NÃO marca a nota (NV2: a guarda do A6). Puro, em memória.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InMemoryStatementInvoiceRepository, StatementNotPaidError, type StatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.repository.js";
import { InvoiceOutboxHandler, taxProfileFromSettings } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { ProviderValidationError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import { InvoiceProviderError } from "../src/modules/subscription-billing/providers/invoice/invoice-errors.js";
import type { InvoiceProviderPort } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import type { StatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

const TENANT = randomUUID();
const NOW = new Date("2026-11-17T12:00:00Z");

function paidStatement(): SubscriptionStatement {
  return { id: randomUUID(), tenantId: TENANT, period: "2026-10", status: "paid", totalCents: 10_000 } as unknown as SubscriptionStatement;
}

/** Um provedor de nota falso cujo `issue` lança o erro dado; o `getInvoice` nunca acha nada (a 1ª tentativa não reconsulta). */
function portThatThrows(error: Error): InvoiceProviderPort & { readonly posts: number } {
  const state = { posts: 0 };
  return {
    get posts() {
      return state.posts;
    },
    issue: async () => {
      state.posts += 1;
      throw error;
    },
    getInvoice: async () => ({ status: "unknown" as const }),
  } as unknown as InvoiceProviderPort & { readonly posts: number };
}

function world(statement: SubscriptionStatement, port: InvoiceProviderPort, invoices: StatementInvoiceRepository) {
  const outbox = new InMemoryOutboxRepository({ readStatement: async () => ({ status: "paid", reopenedAt: null, totalCents: statement.totalCents }), clock: () => NOW });
  const handler = new InvoiceOutboxHandler({
    ports: { focusnfe: port },
    invoices,
    statements: { findStatement: async () => statement },
    resolveIssueContext: async () => ({
      environment: "sandbox",
      serie: 7,
      emitter: { cnpj: "11222333000181" },
      borrower: { document: "99888777000166", name: "Organização Tomadora", municipalityCode: "3550308" },
      taxProfile: taxProfileFromSettings({}),
      serviceDescription: "Assinatura — competência 2026-10",
    }),
  });
  const dispatch = () =>
    runDispatchOutbox({
      repo: outbox,
      ports: {},
      resolveCustomer: async () => {
        throw new Error("a perna de cobrança não roda neste teste");
      },
      invoices: handler,
      now: () => NOW,
    });
  return { outbox, dispatch };
}

for (const [label, error, code] of [
  ["InvoiceProviderError(fiscal_data_incomplete)", new InvoiceProviderError("fiscal_data_incomplete", "Faltam dados fiscais.", { missing: ["regimeTributario"] }), "fiscal_data_incomplete"],
  ["ProviderValidationError", new ProviderValidationError("O provedor recusou: texto livre do provedor que não pode ir ao banco"), "provider_validation"],
] as const) {
  test(`NV1: o port.issue lança ${label} → nota rejected com error = ${code}, linha NEEDS_REVIEW ${code}`, async () => {
    const statement = paidStatement();
    const port = portThatThrows(error);
    const invoices = new InMemoryStatementInvoiceRepository();
    const w = world(statement, port, invoices);
    await w.outbox.enqueue({ tenantId: TENANT, statementId: statement.id, kind: "invoice_issue", provider: "focusnfe", seq: 1, payload: { seq: 1 } }, NOW);

    const run = await w.dispatch();
    assert.equal(port.posts, 1, "1 POST de emissão");
    assert.equal(run.outcomes.needs_review, 1, JSON.stringify(run.outcomes));
    const [line] = (await w.outbox.listByStatement(TENANT, statement.id)).filter((row) => row.kind === "invoice_issue");
    assert.deepEqual([line?.status, line?.lastError], ["NEEDS_REVIEW", code], "a linha visível, com o código");
    const notes = await invoices.listByStatement(TENANT, statement.id);
    assert.deepEqual(notes.map((note) => [note.seq, note.status, note.error]), [[1, "rejected", code]], "a nota rejeitada pelo CÓDIGO, nunca pelo texto");
  });
}

test("NV2: o beginIssue lança StatementNotPaidError → markRejected NÃO é chamado (espião); linha NEEDS_REVIEW statement_not_paid", async () => {
  const statement = paidStatement();
  const port = portThatThrows(new Error("nunca chamado"));
  // O caminho rápido lê `paid`; sob a trava do `beginIssue` o demonstrativo já não está pago (a corrida que o A6 guarda).
  const inner = new InMemoryStatementInvoiceRepository({ findStatement: async () => ({ ...statement, status: "closed" }) } as unknown as StatementRepository);
  const rejected: unknown[][] = [];
  const invoices = new Proxy(inner, {
    get(target, key, receiver) {
      if (key === "markRejected") return async (...args: unknown[]) => void rejected.push(args);
      const value = Reflect.get(target, key, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as StatementInvoiceRepository;
  await assert.rejects(() => inner.beginIssue({ tenantId: TENANT, statementId: statement.id, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, NOW), StatementNotPaidError, "controle: o dublê lança mesmo");

  const w = world(statement, port, invoices);
  await w.outbox.enqueue({ tenantId: TENANT, statementId: statement.id, kind: "invoice_issue", provider: "focusnfe", seq: 1, payload: { seq: 1 } }, NOW);
  await w.dispatch();
  assert.equal(port.posts, 0, "0 POST");
  assert.deepEqual(rejected, [], "o markRejected não foi chamado");
  const [line] = (await w.outbox.listByStatement(TENANT, statement.id)).filter((row) => row.kind === "invoice_issue");
  assert.deepEqual([line?.status, line?.lastError], ["NEEDS_REVIEW", "statement_not_paid"]);
});
