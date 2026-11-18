// B-ASS-08c2 (item 60) · `P-BILLING-P2028-COMO-400` (plano §4.14, §5.5): a falha de banco do movimento do demonstrativo vira
// 409 `statement_busy` (repetível), o precedente do PRÓPRIO módulo (o pedido de cobrança). PB-1: puro, sobre um cliente Prisma
// falso cujo `$transaction` lança — a transação interativa expirada (P2028) e a trava não obtida (55P03) viram 409; a de INÍCIO de
// transação (pool esgotado) continua a mesma (o `infra_down` da casa); um erro de regra atravessa igual.
import assert from "node:assert/strict";
import test from "node:test";

import { PrismaStatementRepository } from "../src/modules/subscription-billing/statements/statement.prisma-runtime.js";
import { StatementError } from "../src/modules/subscription-billing/statements/statement.types.js";
import { TRANSACTION_START_TIMEOUT_PHRASE } from "../src/infra/logging/public-error.js";

const TENANT = "00000000-0000-4000-8000-0000000000c2";

function repositoryThrowing(error: unknown): PrismaStatementRepository {
  const client = { $transaction: async () => { throw error; } };
  return new PrismaStatementRepository(client as never);
}

async function caught(error: unknown): Promise<unknown> {
  try {
    await repositoryThrowing(error).transaction(TENANT, async () => "nunca");
  } catch (thrown) {
    return thrown;
  }
  assert.fail("a transação tinha de lançar");
}

test("PB-1: P2028 (transação expirada) e 55P03 (trava) → 409 statement_busy; P2028 de início de transação e o erro de regra atravessam iguais", async () => {
  const expired = Object.assign(new Error("Transaction already closed: A query cannot be executed on an expired transaction."), { code: "P2028" });
  const busy = await caught(expired);
  assert.ok(busy instanceof StatementError, `P2028 → StatementError (veio ${String(busy)})`);
  assert.equal(busy.statusCode, 409);
  assert.equal(busy.reason, "statement_busy");

  const lockTimeout = Object.assign(new Error("canceling statement due to lock timeout"), { meta: { driverAdapterError: { cause: { originalCode: "55P03" } } } });
  const locked = await caught(lockTimeout);
  assert.ok(locked instanceof StatementError, `55P03 → StatementError (veio ${String(locked)})`);
  assert.equal(locked.statusCode, 409);
  assert.equal(locked.reason, "statement_busy");

  const startTimeout = Object.assign(new Error(`Transaction API error: ${TRANSACTION_START_TIMEOUT_PHRASE}.`), { code: "P2028" });
  assert.equal(await caught(startTimeout), startTimeout, "o P2028 de início de transação (pool) atravessa o MESMO objeto");

  const rule = new StatementError(422, "statement_not_closed", "Payments are recorded only on closed statements.");
  assert.equal(await caught(rule), rule, "o erro de regra atravessa o MESMO objeto");

  const other = Object.assign(new Error("duplicate key"), { code: "P2002" });
  assert.equal(await caught(other), other, "outro erro do Prisma atravessa igual");
});
