import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRlsBudget } from "../src/database/rls.js";

test("RLS com orçamento: setter do tenant é a primeira instrução e os limites são locais à transação", async () => {
  const sequence: Array<{ sql: string; values: readonly unknown[] } | { sql: "work"; values: readonly unknown[] }> = [];
  let transactionOptions: unknown;
  let transactions = 0;
  const tx = {
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      sequence.push({ sql: strings.join("?"), values });
      return 1;
    },
  } as unknown as Prisma.TransactionClient;
  const client = {
    $transaction: async <T>(
      work: (transaction: Prisma.TransactionClient) => Promise<T>,
      options?: unknown,
    ): Promise<T> => {
      transactions += 1;
      transactionOptions = options;
      return work(tx);
    },
  } as unknown as PrismaClient;
  const tenantId = "11111111-1111-4111-8111-111111111111";

  const result = await withTenantRlsBudget(
    client,
    tenantId,
    { maxWait: 250, timeout: 1_750 },
    async () => {
      sequence.push({ sql: "work", values: [] });
      return "ok";
    },
  );

  assert.equal(result, "ok");
  assert.deepEqual(sequence, [
    { sql: "SELECT set_config('app.current_tenant_id', ?, true)", values: [tenantId] },
    { sql: "SELECT set_config('lock_timeout', ?, true)", values: ["1000ms"] },
    { sql: "SELECT set_config('statement_timeout', ?, true)", values: ["1500ms"] },
    { sql: "work", values: [] },
  ]);
  assert.deepEqual(transactionOptions, { maxWait: 250, timeout: 1_750 });

  await assert.rejects(
    withTenantRlsBudget(client, tenantId, { maxWait: 250, timeout: 1_750, lockTimeoutMs: 0 }, async () => undefined),
    /inteiro positivo/,
  );
  assert.equal(transactions, 1, "timeout inválido falha antes de abrir uma transação");

  await assert.rejects(
    withTenantRlsBudget(client, "   ", { maxWait: 250, timeout: 1_750 }, async () => undefined),
    /Tenant id is required/,
  );
  assert.equal(sequence.length, 4, "tenant inválido falha no setter, antes de qualquer instrução SQL");
});
