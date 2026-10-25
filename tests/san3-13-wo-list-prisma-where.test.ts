import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { PrismaWorkOrderRepository } from "../src/modules/work-orders/work-order-prisma.repository.js";

// B-SAN3-13 — B12 (CA-6): a FORMA do `where` que o repositório Prisma manda ao banco, com um executor FALSO que só
// registra os argumentos (o construtor aceita qualquer executor). Prova duas propriedades que o repositório de
// memória não consegue exibir:
//  · CRIT-1 — nenhuma cláusula com `OR` fica no topo (em objeto JS a segunda chave `OR` apaga a primeira; o escopo
//    do ator e o `search` lado a lado vazavam a organização inteira); o `openOnly` não é chave simples (apagaria o
//    `?status=` do chamador);
//  · CRIT-10 — o `count` usa o MESMO `where` dos itens (um `count` sem escopo daria `total` da organização).

type Captured = { findMany: Record<string, unknown>[]; count: Record<string, unknown>[] };

function fakeExecutor(): { executor: never; captured: Captured } {
  const captured: Captured = { findMany: [], count: [] };
  const executor = {
    workOrder: {
      findMany: async (args: Record<string, unknown>) => {
        captured.findMany.push(args);
        return [];
      },
      count: async (args: Record<string, unknown>) => {
        captured.count.push(args);
        return 0;
      },
    },
  };
  return { executor: executor as never, captured };
}

const base = { tenantId: randomUUID(), limit: 20, offset: 0 } as const;

test("B12 (CA-6) — search + escopo + openOnly: nenhum OR no topo, AND com 3 elementos, count com o mesmo where", async () => {
  const { executor, captured } = fakeExecutor();
  const userId = randomUUID();
  const operatorProfileId = randomUUID();
  await new PrismaWorkOrderRepository(executor).list({
    ...base,
    status: "in_progress",
    search: "bomba",
    assignedToActor: { userId, operatorProfileId },
    openOnly: true,
  });

  const where = captured.findMany[0]?.where as Record<string, unknown> & { AND: Record<string, unknown>[] };
  assert.equal(where.OR, undefined, "OR no topo é o CRIT-1");
  assert.equal(where.tenant_id, base.tenantId);
  assert.equal(where.status, "in_progress", "o status do chamador continua chave simples");
  assert.equal(where.AND.length, 3, "search, escopo e openOnly — um elemento cada");
  const [search, escopo, abertas] = where.AND as [
    { OR: unknown[] },
    { OR: { assigned_operator_id: string }[] },
    { status: { notIn: string[] } },
  ];
  assert.equal(search.OR.length, 8, "as 8 colunas do search");
  assert.deepEqual(escopo.OR, [{ assigned_operator_id: userId }, { assigned_operator_id: operatorProfileId }]);
  assert.deepEqual([...abertas.status.notIn].sort(), ["cancelled", "completed", "rejected"]);
  assert.deepEqual(captured.count[0]?.where, where, "count com o MESMO where (CRIT-10)");
});

test("B12 (CA-6) — sem perfil: o OR do escopo tem 1 elemento, nenhum undefined; sem search o AND só tem o escopo", async () => {
  const { executor, captured } = fakeExecutor();
  const userId = randomUUID();
  await new PrismaWorkOrderRepository(executor).list({ ...base, assignedToActor: { userId } });

  const where = captured.findMany[0]?.where as { OR?: unknown; AND: { OR: unknown[] }[] };
  assert.equal(where.OR, undefined);
  assert.equal(where.AND.length, 1);
  assert.deepEqual(where.AND[0]?.OR, [{ assigned_operator_id: userId }]);
  assert.equal(JSON.stringify(where).includes("undefined"), false);
  assert.equal(
    where.AND[0]?.OR.every((element) => Object.values(element as object).every((value) => value !== undefined)),
    true,
  );
});

test("B12 (CA-6) — sem filtros novos o where é o de antes (a web não muda): sem AND", async () => {
  const { executor, captured } = fakeExecutor();
  await new PrismaWorkOrderRepository(executor).list({ ...base });
  assert.deepEqual(captured.findMany[0]?.where, { tenant_id: base.tenantId });
});

test("B12 (R2-N3) — ator escopado sem id com forma de UUID: resposta vazia SEM consultar (OR: [] não é falso no Prisma 7)", async () => {
  const { executor, captured } = fakeExecutor();
  const result = await new PrismaWorkOrderRepository(executor).list({ ...base, assignedToActor: { userId: "tecnico.demo" } });
  assert.deepEqual(result.items, []);
  assert.equal(result.total, 0);
  assert.equal(captured.findMany.length, 0);
  assert.equal(captured.count.length, 0);
});
