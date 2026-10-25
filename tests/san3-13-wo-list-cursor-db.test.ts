import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-13 — A LISTA DE OS CONTRA O POSTGRES (job `backend-postgres`; plano v3 §7, B14-db..B18-db).
//
// Por que existe: a crítica r2 (R2-1) mediu, em Postgres real, que um cursor `created_at|code` PERDE OS — a coluna é
// `timestamptz(6)` (µs) e o `Date` do JS tem ms; a OS do mesmo milissegundo da fronteira, com µs menor, não era
// entregue e a caminhada terminava "completa". O app APAGA do aparelho o que a caminhada completa não trouxe (sem
// trabalho pendente), então "completa" tem de significar "tudo entregue". O repositório de memória não reproduz
// a classe (lá o `Date` é ms dos dois lados) — por isso a prova é aqui, com `created_at` gravado em µs por SQL.
//
// Espelho: tests/checklist-routes-db.test.ts (Prisma real sobre `DATABASE_URL`) + a guarda de
// tests/financial-title-status-cas-db.test.ts (sem `DATABASE_URL` → skip DECLARADO, nunca verde silencioso).
// O serviço é o de produção (`createDefaultWorkOrderService` em `CORE_SAAS_PERSISTENCE=prisma`), com o resolver
// estrito de perfil REAL (tabela `operator_profiles`); a lista sai pelo DTO real (`toWorkOrderListDto`).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("lista de OS (B-SAN3-13) contra o Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar esta suíte.",
  });
} else {
  const connection = connectionString;

  // ── B14-db (CA-9) — VERMELHO-CONTROLE NO HEAD: sem cursor, a caminhada não entrega as 6.
  test("B14-db (CA-9): 6 OS de A, 5 com created_at idêntico até µs e 1 no mesmo ms — limit=1 entrega todas e termina nextCursor=null", async () => {
    await withPostgresWorkOrders(connection, async (h) => {
      const deA: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        deA.push(await h.criarOs({ code: `B14-${index}`, operador: h.tecnicoA, createdAt: "2026-10-25T12:00:00.123456Z" }));
      }
      deA.push(await h.criarOs({ code: "B14-5", operador: h.tecnicoA, createdAt: "2026-10-25T12:00:00.123100Z" }));
      await h.criarOs({ code: "B14-B", operador: h.tecnicoB, createdAt: "2026-10-25T12:00:00.123456Z" });

      // A precisão gravada é µs mesmo (senão o teste não mede a classe do R2-1).
      const micros = await h.client.$queryRawUnsafe<{ us: string }[]>(
        "SELECT to_char(created_at AT TIME ZONE 'UTC', 'US') AS us FROM work_orders WHERE tenant_id = $1::uuid ORDER BY 1",
        h.tenantId,
      );
      assert.deepEqual([...new Set(micros.map((row) => row.us))].sort(), ["123100", "123456"]);

      // Emenda E2: a caminhada começa com `paginate=cursor` SEM `cursor` e o leva em TODA página.
      const caminhada = await h.caminhar(h.atorTecnico(h.tecnicoA), { paginate: "cursor", limit: "1" });
      const faltaram = deA.filter((id) => !caminhada.ids.includes(id));
      assert.deepEqual(faltaram, [], `FALTARAM=${JSON.stringify(faltaram)} paginas=${caminhada.paginas}`);
      assert.equal(caminhada.ids.length, 6, "nenhuma OS repetida nem de B");
      assert.equal(caminhada.paginasComItens, 6, "6 páginas com 1 OS cada");
      // A regra do `nextCursor` (último id se `items.length === limit`) faz a 6ª página cheia apontar para uma 7ª, vazia,
      // que fecha com `null`: 7 requisições, 6 páginas com OS.
      assert.equal(caminhada.paginas, 7);
      assert.equal(caminhada.terminouComNull, true, "a caminhada termina com nextCursor === null");
      assert.deepEqual(caminhada.ids, [...caminhada.ids].sort().reverse(), "a caminhada inteira sai em id desc");

      // A 1ª página (sem cursor) já vem em `id desc` — é o que a F-1 quebrava.
      const primeira = await h.listar(h.atorTecnico(h.tecnicoA), { paginate: "cursor", limit: "100" });
      const ids = primeira.items.map((item) => item.id);
      assert.deepEqual(ids, [...deA].sort().reverse(), "1ª página em id desc (uuid)");
      assert.equal(primeira.pagination.nextCursor, null, "6 < limit: acabou");
    });
  });

  // ── B15-db (CA-11) — a ordem do modo cursor é a MESMA na memória (string do uuid) e no Postgres (`uuid`).
  test("B15-db (CA-11): sequência de ids do modo cursor no Postgres == a do repositório de memória para o mesmo conjunto", async () => {
    await withPostgresWorkOrders(connection, async (h) => {
      for (let index = 0; index < 20; index += 1) {
        await h.criarOs({ code: `B15-${index}`, operador: h.tecnicoA });
      }
      const ator = h.atorTecnico(h.tecnicoA);
      const doBanco = (await h.caminhar(ator, { paginate: "cursor", limit: "3" })).ids;
      assert.equal(doBanco.length, 20);

      const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
      const memoria = new InMemoryWorkOrderRepository();
      const mapa = (memoria as unknown as { workOrders: Map<string, unknown> }).workOrders;
      // Mesmos ids, inseridos em ordem EMBARALHADA (a ordem de inserção não pode decidir nada).
      for (const id of [...doBanco].sort(() => Math.random() - 0.5)) {
        mapa.set(id, {
          id, tenantId: h.tenantId, code: id, title: id, priority: "medium", status: "assigned",
          assignedOperatorId: h.tecnicoA, createdAt: new Date(), updatedAt: new Date(),
        });
      }
      const daMemoria: string[] = [];
      let cursorId: string | undefined;
      for (let pagina = 0; pagina < 20; pagina += 1) {
        const resultado = await memoria.list({
          tenantId: h.tenantId, limit: 3, offset: 0, paginate: "cursor", ...(cursorId ? { cursorId } : {}),
        });
        daMemoria.push(...resultado.items.map((item) => item.id));
        if (!resultado.nextCursor) break;
        cursorId = resultado.nextCursor;
      }
      assert.deepEqual(daMemoria, doBanco, "memória e Postgres entregam a mesma sequência");
    });
  });

  // ── B19-db (E2) — o modo vem de `paginate`, nunca da presença de `cursor`; `nextCursor` só no modo cursor.
  test("B19-db (E2): paginate=cursor sem cursor → id desc + nextCursor; offset → nextCursor null e ordem created_at; erros 400", async () => {
    await withPostgresWorkOrders(connection, async (h) => {
      const antiga = await h.criarOs({ code: "B19-1", operador: h.tecnicoA, createdAt: "2026-10-20T10:00:00.000001Z" });
      const meio = await h.criarOs({ code: "B19-2", operador: h.tecnicoA, createdAt: "2026-10-21T10:00:00.000001Z" });
      const nova = await h.criarOs({ code: "B19-3", operador: h.tecnicoA, createdAt: "2026-10-22T10:00:00.000001Z" });
      const ator = h.atorTecnico(h.tecnicoA);

      const cursor1 = await h.listar(ator, { paginate: "cursor", limit: "2" });
      const esperado = [antiga, meio, nova].sort().reverse();
      assert.deepEqual(cursor1.items.map((item) => item.id), esperado.slice(0, 2));
      assert.equal(cursor1.pagination.nextCursor, esperado[1]);
      const cursor2 = await h.listar(ator, { paginate: "cursor", limit: "2", cursor: String(cursor1.pagination.nextCursor) });
      assert.deepEqual(cursor2.items.map((item) => item.id), esperado.slice(2));
      assert.equal(cursor2.pagination.nextCursor, null);
      assert.equal(cursor2.pagination.total, 3, "total sem a cláusula do cursor");

      const offset = await h.listar(ator, { limit: "2" });
      assert.deepEqual(offset.items.map((item) => item.id), [nova, meio], "modo offset: created_at desc, inalterado");
      assert.equal(offset.pagination.nextCursor, null, "modo offset nunca devolve nextCursor");

      for (const [query, reason] of [
        [{ paginate: "xyz" }, "invalid_paginate"],
        [{ cursor: nova }, "invalid_cursor_mode"],
        [{ paginate: "cursor", cursor: "lixo" }, "invalid_cursor"],
        [{ paginate: "cursor", offset: "20" }, "invalid_cursor_offset"],
      ] as const) {
        await assert.rejects(() => h.listar(ator, query), (error: { statusCode: number; reason: string }) => {
          assert.equal(error.statusCode, 400, JSON.stringify(query));
          assert.equal(error.reason, reason, JSON.stringify(query));
          return true;
        });
      }
    });
  });

  // ── B17-db (CA-2 no Postgres; CRIT-1) — `?search=` como técnico NÃO devolve a OS do colega. É no Postgres que o
  // `OR` do search e o `OR` do escopo colidiriam (no repositório de memória os filtros são em cadeia).
  test("B17-db (CA-2): search como técnico fica dentro das dele; perfil real nos dois ramos; sub não-UUID → 200 vazio", async () => {
    await withPostgresWorkOrders(connection, async (h) => {
      const perfilA = await h.criarPerfil(h.tecnicoA);
      const pelaPessoa = await h.criarOs({ code: "B17-1", operador: h.tecnicoA, title: "Bomba do tecnico A" });
      const peloPerfil = await h.criarOs({ code: "B17-2", operador: perfilA, title: "Bomba pelo perfil de A" });
      const doColega = await h.criarOs({ code: "B17-3", operador: h.tecnicoB, title: "Bomba do colega B" });
      const mista = await h.criarOs({ code: "B17-4", operador: h.tecnicoB, usuario: h.tecnicoA, title: "Bomba mista" });

      const comoA = await h.listar(h.atorTecnico(h.tecnicoA), { search: "Bomba", limit: "100" });
      assert.deepEqual(comoA.items.map((item) => item.id).sort(), [pelaPessoa, peloPerfil].sort());
      assert.equal(comoA.pagination.total, 2, "o count no Postgres usa o mesmo where (CRIT-10)");

      const gestor = await h.listar(h.atorGestor(), { search: "Bomba", limit: "100" });
      assert.deepEqual(gestor.items.map((item) => item.id).sort(), [pelaPessoa, peloPerfil, doColega, mista].sort());

      const naoUuid = await h.listar({ ...h.atorTecnico(h.tecnicoA), userId: "tecnico.demo" }, { limit: "100" });
      assert.deepEqual(naoUuid.items, [], "OR vazio é falso no Prisma: nunca a organização inteira");
      assert.equal(naoUuid.pagination.total, 0);
    });
  });

  // ── B18-db (CA-10 no Postgres; R2-2) — `openOnly` é `status notIn` DENTRO do AND: o `?status=` do chamador fica.
  test("B18-db (CA-10): openOnly + status=in_progress mantém o filtro do chamador; status=completed&openOnly=true → []", async () => {
    await withPostgresWorkOrders(connection, async (h) => {
      const emAndamento = await h.criarOs({ code: "B18-1", operador: h.tecnicoA, status: "in_progress" });
      const atribuida = await h.criarOs({ code: "B18-2", operador: h.tecnicoA, status: "assigned" });
      await h.criarOs({ code: "B18-3", operador: h.tecnicoA, status: "completed" });
      await h.criarOs({ code: "B18-4", operador: h.tecnicoA, status: "cancelled" });
      await h.criarOs({ code: "B18-5", operador: h.tecnicoA, status: "rejected" });
      const ator = h.atorTecnico(h.tecnicoA);

      const filtrada = await h.listar(ator, { status: "in_progress", openOnly: "true" });
      assert.deepEqual(filtrada.items.map((item) => item.id), [emAndamento]);
      const abertas = await h.listar(ator, { openOnly: "true", limit: "100" });
      assert.deepEqual(abertas.items.map((item) => item.id).sort(), [emAndamento, atribuida].sort());
      assert.equal(abertas.pagination.total, 2);
      assert.deepEqual((await h.listar(ator, { status: "completed", openOnly: "true" })).items, []);
      assert.equal((await h.listar(ator, { limit: "100" })).pagination.total, 5, "sem openOnly → todas as dele");
    });
  });
}

// ───────────────────────────── harness ─────────────────────────────

type Actor = { readonly tenantId: string; readonly userId: string; readonly roles: readonly string[]; readonly permissions: readonly string[] };
type Caminhada = {
  readonly ids: string[];
  readonly paginas: number;
  readonly paginasComItens: number;
  readonly terminouComNull: boolean;
};
type Harness = {
  readonly client: {
    $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T>;
    $executeRawUnsafe(sql: string, ...values: unknown[]): Promise<number>;
  };
  readonly tenantId: string;
  readonly tecnicoA: string;
  readonly tecnicoB: string;
  readonly gestor: string;
  atorTecnico(userId: string): Actor;
  atorGestor(): Actor;
  criarPerfil(userId: string): Promise<string>;
  criarOs(input: {
    readonly code: string;
    readonly operador?: string;
    readonly usuario?: string;
    readonly createdAt?: string;
    readonly status?: string;
    readonly title?: string;
  }): Promise<string>;
  listar(actor: Actor, query: Record<string, string>): Promise<{
    items: { id: string; code: string; status: string }[];
    pagination: { total: number; nextCursor?: string | null };
  }>;
  caminhar(actor: Actor, query: Record<string, string>): Promise<Caminhada>;
};

async function withPostgresWorkOrders(connection: string, callback: (harness: Harness) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  const [{ PrismaPg }, { PrismaClient }, workOrderModule, { toWorkOrderListDto }, { prisma: singleton }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order.dto.js"),
    import("../src/database/prisma.js"),
  ]);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const marca = randomUUID().slice(0, 8);
  let tenantId: string | undefined;
  workOrderModule.resetWorkOrderRuntimeForTests();

  try {
    const tenant = await client.tenant.create({ data: { name: `SAN3-13 DB ${marca}`, slug: `san3-13-db-${marca}` } });
    tenantId = tenant.id;
    const novoUsuario = async (nome: string) =>
      (await client.user.create({ data: { tenant_id: tenant.id, name: nome, email: `san3-13-${nome}-${marca}@example.com` } })).id;
    const tecnicoA = await novoUsuario("tecnico-a");
    const tecnicoB = await novoUsuario("tecnico-b");
    const gestor = await novoUsuario("gestor");
    const service = await workOrderModule.createDefaultWorkOrderService();

    const harness: Harness = {
      client: client as unknown as Harness["client"],
      tenantId: tenant.id,
      tecnicoA,
      tecnicoB,
      gestor,
      atorTecnico: (userId) => ({ tenantId: tenant.id, userId, roles: ["field_technician"], permissions: [] }),
      atorGestor: () => ({ tenantId: tenant.id, userId: gestor, roles: ["manager"], permissions: [] }),
      async criarPerfil(userId) {
        return (await client.operatorProfile.create({ data: { tenant_id: tenant.id, user_id: userId, full_name: "Perfil" } })).id;
      },
      async criarOs(input) {
        const created = await client.workOrder.create({
          data: {
            tenant_id: tenant.id,
            code: `${input.code}-${marca}`,
            title: input.title ?? `OS ${input.code}`,
            status: input.status ?? "assigned",
            assigned_operator_id: input.operador ?? null,
            assigned_user_id: input.usuario ?? null,
            // CHECK `work_orders_cancelled_decision_check`: OS cancelada exige a decisão financeira.
            ...(input.status === "cancelled" ? { financial_cancellation_decision: "keep" } : {}),
          },
        });
        if (input.createdAt) {
          await client.$executeRawUnsafe(
            "UPDATE work_orders SET created_at = $1::timestamptz WHERE id = $2::uuid",
            input.createdAt,
            created.id,
          );
        }
        return created.id;
      },
      async listar(actor, query) {
        const result = await service.list(actor as never, query);
        return toWorkOrderListDto(result) as never;
      },
      async caminhar(actor, query) {
        const ids: string[] = [];
        let cursor: string | null | undefined;
        let paginas = 0;
        let paginasComItens = 0;
        let terminouComNull = false;
        do {
          const pagina = await harness.listar(actor, { ...query, ...(cursor ? { cursor } : {}) });
          paginas += 1;
          if (pagina.items.length > 0) paginasComItens += 1;
          ids.push(...pagina.items.map((item) => item.id));
          cursor = pagina.pagination.nextCursor;
          terminouComNull = cursor === null;
        } while (cursor && paginas < 50);
        return { ids, paginas, paginasComItens, terminouComNull };
      },
    };

    await callback(harness);
  } finally {
    if (tenantId) {
      // Teardown ESCOPADO à organização criada por este teste (nunca DELETE em massa).
      await client.$executeRawUnsafe("DELETE FROM work_orders WHERE tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("DELETE FROM operator_profiles WHERE tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("DELETE FROM users WHERE tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
    }
    workOrderModule.resetWorkOrderRuntimeForTests();
    await client.$disconnect();
    await singleton.$disconnect();
  }
}
