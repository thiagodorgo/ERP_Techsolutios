// P-SAN3-08-LIMPEZA-VARRE-TABELAS-ALHEIAS: a limpeza escopada à organização não pode reprovar quando a tabela de uma
// suíte irmã some entre a leitura do catálogo e o DELETE (o caso medido nos jobs `backend` de #537, #539 e #540, em que o
// san3-08 viu as `s305_c4_*` do san3-05). Sem banco: o cliente é um dublê que reproduz as duas formas do erro.
import assert from "node:assert/strict";
import test from "node:test";
import { isUndefinedTable, sqlStateOf, sweepTenant, SWEEP_MAX_PASSES, type SweepAdminClient } from "./helpers/sweep-tenant.js";

const TENANT = "00000000-0000-4000-8000-000000000001";

/** Erro na forma do Prisma com driver adapter (P2010 com o SQLSTATE no `meta`), como medido pela crit-09-em3. */
function prismaAdapterError(sqlState: string, message: string): Error {
  return Object.assign(new Error(message), {
    code: "P2010",
    meta: { driverAdapterError: { cause: { originalCode: sqlState, kind: "postgres" } } },
  });
}

function fakeClient(tables: string[], failures: Record<string, () => Error>) {
  const deleted: string[] = [];
  const client: SweepAdminClient = {
    async $queryRawUnsafe<T>(): Promise<T> {
      return tables.map((table_name) => ({ table_name })) as T;
    },
    async $executeRawUnsafe(query: string): Promise<number> {
      const match = /^DELETE FROM "?([a-z0-9_]+)"?/.exec(query);
      if (match && failures[match[1]]) {
        throw failures[match[1]]();
      }
      deleted.push(match ? match[1] : query);
      return 0;
    },
  };
  return { client, deleted };
}

test("sqlStateOf lê o SQLSTATE do Prisma com adapter, do motor e do pg", () => {
  assert.equal(sqlStateOf(prismaAdapterError("42P01", "x")), "42P01");
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "P2010", meta: { code: "23503" } })), "23503");
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "40P01" })), "40P01");
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "P2010" })), undefined, "P2010 não é SQLSTATE");
  assert.equal(sqlStateOf(null), undefined);
});

test("isUndefinedTable reconhece 42P01 pelo código e, sem código, pela mensagem do Postgres", () => {
  assert.equal(isUndefinedTable(prismaAdapterError("42P01", "qualquer")), true);
  assert.equal(isUndefinedTable(new Error('relation "s305_c4_t_ab12" does not exist')), true);
  assert.equal(isUndefinedTable(prismaAdapterError("23503", "violates foreign key constraint")), false);
  assert.equal(isUndefinedTable(new Error("permission denied for table work_orders")), false);
});

// rev-541-api A1: SQLSTATE presente e diferente de 42P01 nunca é "tabela sumida", nem que a mensagem pareça; e um 42P01
// que cita OUTRA relação (ex.: um gatilho que lê uma tabela derrubada) é defeito a mostrar.
test("isUndefinedTable recusa SQLSTATE diferente com mensagem parecida e 42P01 de outra relação", () => {
  const outroCodigo = prismaAdapterError("23503", 'insert or update violates … relation "a" does not exist');
  assert.equal(isUndefinedTable(outroCodigo, "a"), false, "o SQLSTATE manda sobre a mensagem");
  const deGatilho = prismaAdapterError("42P01", 'relation "auditoria_apagada" does not exist');
  assert.equal(isUndefinedTable(deGatilho, "work_orders"), false, "42P01 de outra relação não é a tabela do DELETE");
  assert.equal(isUndefinedTable(deGatilho, "auditoria_apagada"), true);
  assert.equal(isUndefinedTable(new Error('relation "public.zz" does not exist'), "zz"), true, "o esquema public. é ignorado");
  assert.equal(isUndefinedTable(new Error('relation "outra" does not exist'), "zz"), false);
});

test("tabela de suíte irmã que sumiu no meio da limpeza NÃO reprova, e o resto é apagado", async () => {
  const { client, deleted } = fakeClient(["work_orders", "s305_c4_t_ab12", "s305_c4_n_cd34", "users"], {
    s305_c4_t_ab12: () => prismaAdapterError("42P01", 'relation "s305_c4_t_ab12" does not exist'),
    s305_c4_n_cd34: () => new Error('relation "s305_c4_n_cd34" does not exist'),
  });
  await sweepTenant(client, TENANT, []);
  assert.deepEqual(deleted, ["work_orders", "users", "tenants"], "apaga as tabelas que existem e, por fim, a organização");
});

test("erro que não é de tabela sumida e persiste continua reprovando a limpeza (o resíduo nunca passa calado)", async () => {
  let calls = 0;
  const { client, deleted } = fakeClient(["work_orders", "travada"], {
    travada: () => {
      calls += 1;
      return prismaAdapterError("23503", 'update or delete on table "travada" violates foreign key constraint');
    },
  });
  await assert.rejects(sweepTenant(client, TENANT, []), /limpeza da organização do teste não terminou.*travada/);
  // rev-541-api A2: o número de passadas é travado pelo LITERAL da função antiga (12), não pela própria constante.
  assert.equal(SWEEP_MAX_PASSES, 12, "o teto de passadas é o da função antiga");
  assert.equal(calls, 12, "tenta em todas as 12 passadas antes de reprovar");
  assert.ok(!deleted.includes("tenants"), "a organização não é apagada com resíduo");
});

// conf-541-api N1: no nível do sweepTenant, um 42P01 que cita OUTRA relação (ex.: gatilho) na tabela que EXISTE não sai
// da fila calado; a limpeza reprova e a organização fica (a mutação M-A1c, chamar isUndefinedTable sem a tabela, morre aqui).
test("42P01 de outra relação durante o DELETE de uma tabela que existe reprova a limpeza", async () => {
  const deGatilho = () => prismaAdapterError("42P01", 'relation "auditoria_apagada" does not exist');
  const { client, deleted } = fakeClient(["work_orders"], { work_orders: deGatilho });
  await assert.rejects(sweepTenant(client, TENANT, []), /limpeza da organização do teste não terminou.*work_orders/);
  assert.ok(!deleted.includes("tenants"), "a organização não é apagada com resíduo");
});

// rev-541-api A3: no erro real do Prisma a mensagem começa com "\n"; a reprovação tem de carregar o motivo, não "tabela: ".
test("a reprovação carrega o motivo do erro real do Prisma (a mensagem que começa com quebra de linha)", async () => {
  const real = Object.assign(
    new Error('\nInvalid `prisma.$executeRawUnsafe()` invocation:\n\n\nRaw query failed. Code: `23503`. Message: `update or delete on table "travada" violates foreign key constraint`'),
    { code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "23503" } } } },
  );
  const { client } = fakeClient(["travada"], { travada: () => real });
  await assert.rejects(sweepTenant(client, TENANT, []), /travada: Raw query failed\. Code: `23503`/);
});
