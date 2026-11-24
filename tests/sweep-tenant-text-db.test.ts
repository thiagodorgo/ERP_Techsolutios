import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { sweepTenant } from "./helpers/sweep-tenant.js";

// P-L11A-TEARDOWN-POR-PROPRIEDADE: o sweepTenant varre o information_schema e lista toda tabela de public com coluna
// tenant_id. Sem o filtro data_type='uuid', uma tabela de teste irmã com tenant_id text (criada por outra suíte em
// paralelo) entra na lista e o DELETE ... WHERE tenant_id = $1::uuid quebra com 42883 (operator does not exist:
// text = uuid). Este caso cria a tabela text ANTES do sweep e espera que o sweep NÃO quebre (e não toque na tabela);
// antes do conserto, fica vermelho com 42883; depois, verde.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("sweep-tenant ignora tabela tenant_id text exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar a suíte -db.",
  });
} else {
  const { createPrismaClient } = await import("../src/database/pg-connection.js");

  const client = createPrismaClient(connectionString);

  after(async () => {
    await client.$disconnect();
  });

  test("sweepTenant ignora tabela de teste irmã com tenant_id text (não uuid)", async () => {
    const suffix = `txt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toLowerCase();
    const guardTable = `sweep_guard_text_${suffix}`;
    await client.$executeRawUnsafe(`CREATE TABLE "${guardTable}" (tenant_id text NOT NULL)`);
    try {
      await sweepTenant(client, randomUUID(), []);
      const rows = await client.$queryRawUnsafe<Array<{ n: number }>>(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        guardTable,
      );
      assert.equal(rows[0]?.n ?? 0, 1, "o sweep não apaga nem quebra com a tabela tenant_id text");
    } finally {
      await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "${guardTable}"`);
    }
  });
}
