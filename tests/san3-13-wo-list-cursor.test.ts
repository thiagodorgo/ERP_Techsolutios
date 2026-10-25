import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-13 — paginação por cursor no repositório de MEMÓRIA (plano v3 §3 + Emenda E2): B10, B13, B16, B19.
//
// A caminhada do app (`paginate=cursor` em toda página, `cursor` da 2ª em diante) tem de entregar TODAS as OS do
// técnico, mesmo com reatribuição entre páginas (CRIT-11: com `offset`, tudo deslizava uma posição e a OS da
// fronteira nunca vinha). A prova no Postgres (µs × ms) está em `san3-13-wo-list-cursor-db.test.ts`.

type Harness = Awaited<ReturnType<typeof montar>>;

async function montar(quantidade: number) {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ WorkOrderService }, { InMemoryWorkOrderRepository }] = await Promise.all([
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order.repository.js"),
  ]);
  const tenantId = randomUUID();
  const tecnicoA = randomUUID();
  const tecnicoB = randomUUID();
  const repository = new InMemoryWorkOrderRepository();
  const ids: string[] = [];
  for (let index = 0; index < quantidade; index += 1) {
    const created = await repository.create({
      tenantId, code: `OS-${index}`, title: `OS ${index}`, priority: "medium", status: "assigned", assignedOperatorId: tecnicoA,
    } as never);
    ids.push(created.id);
  }
  const service = new WorkOrderService(repository, { resolveActorOperatorProfileIdStrict: async () => undefined });
  const ator = { tenantId, userId: tecnicoA, roles: ["field_technician"], permissions: [] } as never;
  const mapa = (repository as unknown as { workOrders: Map<string, { assignedOperatorId?: string }> }).workOrders;
  const reatribuir = (id: string) => {
    const atual = mapa.get(id);
    assert.ok(atual);
    mapa.set(id, { ...atual, assignedOperatorId: tecnicoB });
  };
  return { service, ator, ids, reatribuir };
}

async function pagina(h: Harness, query: Record<string, string>) {
  return h.service.list(h.ator, { paginate: "cursor", ...query });
}

test("B10 — 150 OS: paginate=cursor limit=100 → 100 + 50, nextCursor null no fim, nenhuma repetida", async () => {
  const h = await montar(150);
  const p1 = await pagina(h, { limit: "100" });
  assert.equal(p1.items.length, 100);
  assert.equal(p1.nextCursor, p1.items[99]?.id);
  assert.equal(p1.total, 150);
  const p2 = await pagina(h, { limit: "100", cursor: String(p1.nextCursor) });
  assert.equal(p2.items.length, 50);
  assert.equal(p2.nextCursor, null);
  const vistos = [...p1.items, ...p2.items].map((item) => item.id);
  assert.equal(new Set(vistos).size, 150);
  assert.deepEqual([...vistos].sort(), [...h.ids].sort());
  assert.deepEqual(vistos, [...vistos].sort().reverse(), "ordem id desc em toda a caminhada");
});

test("B13 (CA-3) — cursor+offset, cursor malformado, cursor sem paginate e paginate inválido → 400", async () => {
  const h = await montar(3);
  const [qualquer] = h.ids;
  for (const [query, reason] of [
    [{ paginate: "cursor", cursor: String(qualquer), offset: "20" }, "invalid_cursor_offset"],
    [{ paginate: "cursor", offset: "1" }, "invalid_cursor_offset"],
    [{ paginate: "cursor", cursor: "lixo" }, "invalid_cursor"],
    [{ paginate: "cursor", cursor: "00000000-0000-0000-0000-000000000000" }, "invalid_cursor"],
    [{ cursor: String(qualquer) }, "invalid_cursor_mode"],
    [{ paginate: "xyz" }, "invalid_paginate"],
    [{ paginate: "CURSOR" }, "invalid_paginate"],
  ] as const) {
    await assert.rejects(() => h.service.list(h.ator, query), (error: { statusCode: number; code: string; reason: string }) => {
      assert.equal(error.statusCode, 400, JSON.stringify(query));
      assert.equal(error.code, "WORK_ORDER_FILTER_INVALID");
      assert.equal(error.reason, reason, JSON.stringify(query));
      return true;
    });
  }
  // offset=0 explícito com paginate=cursor é aceito (o modo cursor é "offset ausente ou 0").
  assert.equal((await pagina(h, { offset: "0" })).items.length, 3);
});

test("B16 (CRIT-11) — reatribuição ENTRE páginas: a união = todas as que ainda são de A (nenhuma pulada)", async () => {
  const h = await montar(150);
  const p1 = await pagina(h, { limit: "100" });
  // Entre a página 1 e a 2: uma OS da página 1 e uma da futura página 2 deixam de ser de A.
  const daPagina1 = p1.items[10]?.id as string;
  const restantes = h.ids.filter((id) => !p1.items.some((item) => item.id === id));
  const daPagina2 = restantes[0] as string;
  h.reatribuir(daPagina1);
  h.reatribuir(daPagina2);
  const p2 = await pagina(h, { limit: "100", cursor: String(p1.nextCursor) });
  assert.equal(p2.nextCursor, null);

  const trazidas = new Set([...p1.items, ...p2.items].map((item) => item.id));
  const aindaDeA = h.ids.filter((id) => id !== daPagina1 && id !== daPagina2);
  const naoTrazidas = aindaDeA.filter((id) => !trazidas.has(id));
  assert.deepEqual(naoTrazidas, [], `OS_ainda_de_A_que_o_pull_nao_trouxe=${naoTrazidas.length}`);
  assert.equal(trazidas.has(daPagina2), false, "a reatribuída antes da sua página não vem");
});

test("B19 (E2) — o modo vem de paginate: 1ª página sem cursor já em id desc; modo offset sempre nextCursor null", async () => {
  const h = await montar(5);
  const cursor = await pagina(h, { limit: "2" });
  const desc = [...h.ids].sort().reverse();
  assert.deepEqual(cursor.items.map((item) => item.id), desc.slice(0, 2));
  assert.equal(cursor.nextCursor, desc[1]);
  assert.equal(cursor.offset, 0);

  const offsetCheio = await h.service.list(h.ator, { limit: "2" });
  assert.equal(offsetCheio.items.length, 2);
  assert.equal(offsetCheio.nextCursor, null, "modo offset nunca devolve nextCursor, nem com a página cheia");
  // Ordem do modo offset inalterada: created_at desc (estável na inserção), não id.
  const offsetTudo = await h.service.list(h.ator, { limit: "100" });
  assert.equal(offsetTudo.nextCursor, null);
  assert.equal(offsetTudo.items.length, 5);
});
