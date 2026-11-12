import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnAdvisoryWaiters,
  waitForOwnBlockedStatement,
  dropHarnessObjects,
  runHarnessDdl,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// B-O6R-09 (item 7 do portão; plano v2 §2.2 P3; crítica r1 A4; crítica r2 R2-02) — a CRIAÇÃO IDEMPOTENTE no Postgres:
// para a mesma organização, o mesmo usuário e a mesma `idempotencyKey`, no máximo um despacho, inclusive sob corrida.
//   [P3]           (T6)  a mesma chave 2× → 1 despacho, 1 field_dispatch_created, 1 work_order_assigned, o mesmo id;
//   [P3 · corrida] (T7)  2 pedidos com a mesma chave → 1 despacho, as duas respostas com o mesmo id, nenhuma 5xx —
//                        (i) com a 1ª presa NA ATRIBUIÇÃO; (ii) com a 1ª presa dentro da transação-mãe e a 2ª esperando
//                        no índice único da chave;
//   [P3 · conteúdo](T8)  a mesma chave com OUTRA OS → 422 FIELD_DISPATCH_IDEMPOTENCY_KEY_REUSED, 0 escrita;
//   [P3 · usuário] (T8b) a mesma chave por OUTRO despachante, em OUTRA OS → despacho próprio (A4: nunca a mesma OS e o
//                        mesmo técnico, `D-PORTAO-7`);
//   [P3 · andou]   (T8c) a mesma chave e o MESMO corpo depois de aceito, reatribuído ou rascunho ativado → o mesmo id,
//                        0 escrita (o 422 compara com o pedido ORIGINAL, nunca com a linha atual — R2-02).
//
// Nota de medição do T7 (i): com a 1ª presa na atribuição, a 2ª não chega ao índice: ela para antes, no UPDATE do
// congelamento da OS (`freezeChecklistSnapshot`), porque a atribuição da 1ª segura a linha de `work_orders`. A espera no
// índice único é provada pelo (ii), em que a 1ª está presa DEPOIS de a chave entrar no índice e ANTES da atribuição.

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-idempotency");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!baseConnection) {
  test("o B-O6R-09 no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = baseConnection;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
  });

  test("[arnês] o application_name da suíte chega ao backend", async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await assertApplicationNamePropagated(prisma, APP);
  });

  test("[P3] mesma chave 2× → 1 despacho, 1 field_dispatch_created, 1 work_order_assigned; a 2ª devolve o mesmo id", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const body = { workOrderId: os, operatorUserId: c.tecnicoA, idempotencyKey: novaChave() };
      const primeiro = await c.despachos.create(c.gestao, body);
      const segundo = await c.despachos.create(c.gestao, body);
      assert.equal(segundo.id, primeiro.id, "a repetição devolveu outro despacho");
      assert.equal(await c.contarDespachos(os), 1, "a repetição criou um 2º despacho");
      assert.equal(await c.contarEventos(os, "field_dispatch_created"), 1);
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), 1, "a repetição atribuiu a OS de novo");
    });
  });

  test("[P3 · corrida (i)] 2 pedidos com a mesma chave, a 1ª presa na atribuição → 1 despacho; o mesmo id nas duas; nenhuma 5xx", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const body = { workOrderId: os, operatorUserId: c.tecnicoA, idempotencyKey: novaChave() };
      const chave = `b-o6r-09-corrida-i-${randomUUID()}`;
      await c.comTrava("work_order_assignments", "true", chave, async (soltar) => {
        const primeira = captureSettled(c.despachos.create(c.gestao, body));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa na atribuição" });
        const segunda = captureSettled(c.despachos.create(c.gestao, body));
        await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: 'UPDATE "public"."work_orders"', label: "2ª esperando a linha da OS que a atribuição da 1ª segura" });
        await soltar();
        const [r1, r2] = await Promise.all([primeira, segunda]);
        assert.deepEqual([r1.status, r2.status], ["fulfilled", "fulfilled"], `houve falha: ${String((r1 as any).reason?.message ?? (r2 as any).reason?.message ?? "")}`);
        assert.equal((r2 as any).value.id, (r1 as any).value.id, "as duas respostas trazem despachos diferentes");
      });
      assert.equal(await c.contarDespachos(os), 1);
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), 1);
    });
  });

  test("[P3 · corrida (ii)] a 1ª presa dentro da transação-mãe, a 2ª bloqueada no índice da chave → 1 despacho; o mesmo id; nenhuma 5xx", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const body = { workOrderId: os, operatorUserId: c.tecnicoA, idempotencyKey: novaChave() };
      const chave = `b-o6r-09-corrida-ii-${randomUUID()}`;
      await c.comTrava("field_dispatch_events", "NEW.event_type = 'field_dispatch_created'", chave, async (soltar) => {
        const primeira = captureSettled(c.despachos.create(c.gestao, body));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa no evento de criação" });
        const segunda = captureSettled(c.despachos.create(c.gestao, body));
        await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: 'INSERT INTO "public"."field_dispatches"', label: "2ª esperando no índice da chave" });
        await soltar();
        const [r1, r2] = await Promise.all([primeira, segunda]);
        assert.deepEqual([r1.status, r2.status], ["fulfilled", "fulfilled"], `houve falha: ${String((r1 as any).reason?.message ?? (r2 as any).reason?.message ?? "")}`);
        assert.equal((r2 as any).value.id, (r1 as any).value.id, "as duas respostas trazem despachos diferentes");
      });
      assert.equal(await c.contarDespachos(os), 1);
      assert.equal(await c.contarEventos(os, "field_dispatch_created"), 1);
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), 1);
    });
  });

  test("[P3 · conteúdo] mesma chave, outra OS, mesmo despachante → 422 FIELD_DISPATCH_IDEMPOTENCY_KEY_REUSED, 0 escrita", async () => {
    await comCenario(connection, async (c) => {
      const os1 = await c.criarOs();
      const os2 = await c.criarOs();
      const idempotencyKey = novaChave();
      await c.despachos.create(c.gestao, { workOrderId: os1, operatorUserId: c.tecnicoA, idempotencyKey });
      await assert.rejects(
        c.despachos.create(c.gestao, { workOrderId: os2, operatorUserId: c.tecnicoA, idempotencyKey }),
        (error: any) => error.statusCode === 422 && error.code === "FIELD_DISPATCH_IDEMPOTENCY_KEY_REUSED",
      );
      assert.equal(await c.contarDespachos(os2), 0, "nasceu despacho na OS 2 com a chave já usada");
      assert.equal(await c.eventosDaOs(os2, "work_order_assigned"), 0);
      assert.equal(await c.contarDespachos(os1), 1);
    });
  });

  test("[P3 · usuário] mesma chave, outro despachante, OUTRA OS → despacho próprio, 201", async () => {
    await comCenario(connection, async (c) => {
      const os1 = await c.criarOs();
      const os2 = await c.criarOs();
      const idempotencyKey = novaChave();
      const meu = await c.despachos.create(c.gestao, { workOrderId: os1, operatorUserId: c.tecnicoA, idempotencyKey });
      const outro = await c.despachos.create(c.gestao2, { workOrderId: os2, operatorUserId: c.tecnicoA, idempotencyKey });
      assert.notEqual(outro.id, meu.id, "a chave de outro despachante devolveu o despacho alheio");
      assert.equal(outro.workOrderId, os2);
      assert.equal(await c.contarDespachos(os2), 1);
    });
  });

  for (const caso of ["aceito", "reatribuído", "rascunho ativado"] as const) {
    test(`[P3 · andou] mesma chave e mesmo corpo depois de ${caso} → o mesmo id, 0 escrita`, async () => {
      await comCenario(connection, async (c) => {
        const os = await c.criarOs();
        const status = caso === "rascunho ativado" ? "draft" : "assigned";
        const body = { workOrderId: os, operatorUserId: c.tecnicoA, status, idempotencyKey: novaChave() };
        const criado = await c.despachos.create(c.gestao, body);
        if (caso === "aceito") await c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" });
        if (caso === "reatribuído") await c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoC });
        if (caso === "rascunho ativado") await c.despachos.changeStatus(c.gestao, criado.id, { status: "assigned" });
        const antes = await c.totais(os);

        const repetido = await c.despachos.create(c.gestao, body);
        assert.equal(repetido.id, criado.id, "a repetição legítima não devolveu o despacho original");
        assert.deepEqual(await c.totais(os), antes, "a repetição escreveu alguma coisa");
      });
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------

function novaChave(): string {
  return `b-o6r-09-${randomUUID()}`;
}

async function montarCenario(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { resolvePermissionsForRoles }, wo, fd, { Client }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
    import("pg"),
  ]);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connection, `${APP}-adm`) }) });
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 idem ${sufixo}`, slug: `b-o6r-09-idem-${sufixo}` } });
  const tenantId = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-o6r-09-idem-${nome}-${sufixo}@example.com` } });
  const [gestor, gestor2, tecnicoA, tecnicoC] = [await usuario("gestor"), await usuario("gestor-2"), await usuario("tecnico-a"), await usuario("tecnico-c")];

  wo.resetWorkOrderRuntimeForTests();
  fd.resetFieldDispatchRuntimeForTests();
  const ordens = await wo.createDefaultWorkOrderService();
  const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
  const despachos = await fd.createDefaultFieldDispatchService(nucleo as never);
  const atorDe = (userId: string, role: "manager" | "field_technician") =>
    ({ tenantId, userId, roles: [role], permissions: resolvePermissionsForRoles([role]), explicitPermissions: true }) as never;
  const gestao = atorDe(gestor.id, "manager");
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);

  async function comTrava(
    tabela: "field_dispatch_events" | "work_order_assignments",
    quando: string,
    chave: string,
    corpo: (soltar: () => Promise<void>) => Promise<void>,
  ): Promise<void> {
    assert.match(tenantId, UUID);
    const trava = new Client({ connectionString: withApplicationName(connection, `${APP}-trava`) });
    await trava.connect();
    const nome = `b_o6r_09_trv_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    let solta = false;
    const soltar = async () => {
      if (solta) return;
      solta = true;
      await trava.query("SELECT pg_advisory_unlock(hashtext($1))", [chave]);
    };
    // Emenda 4 (R-ARN-2/R-ARN-3) — todo DDL de gatilho pelo `runHarnessDdl`; um esgotamento no DROP falha o caso e
    // preserva o erro do corpo. A trava é solta ANTES do DROP (um DROP com alguém preso no gatilho esperaria por ele).
    let erroDoCorpo: unknown;
    try {
      await trava.query("SELECT pg_advisory_lock(hashtext($1))", [chave]);
      await runHarnessDdl(
        admin,
        `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('${chave}')); RETURN NEW; END $f$`,
      );
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE INSERT ON ${tabela} FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid AND (${quando})) EXECUTE FUNCTION ${nome}()`,
      );
      await corpo(soltar);
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await soltar().catch(() => undefined);
      await trava.end();
      await dropHarnessObjects(admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON ${tabela}`, `DROP FUNCTION IF EXISTS ${nome}()`]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    const [{ funcoes }] = await sql("SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1", [nome]);
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${nome} sobrou no catálogo`);
  }

  return {
    admin,
    tenantId,
    despachos,
    gestao,
    gestao2: atorDe(gestor2.id, "manager"),
    tecnicoA: tecnicoA.id,
    tecnicoC: tecnicoC.id,
    campo: (userId: string) => atorDe(userId, "field_technician"),
    comTrava,
    criarOs: async (): Promise<string> => (await ordens.create(gestao, { title: "OS B-O6R-09 idempotência" })).id,
    async contarDespachos(workOrderId: string): Promise<number> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [tenantId, workOrderId]);
      return n;
    },
    async contarEventos(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM field_dispatch_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3",
        [tenantId, workOrderId, tipo],
      );
      return n;
    },
    async eventosDaOs(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3",
        [tenantId, workOrderId, tipo],
      );
      return n;
    },
    async totais(workOrderId: string): Promise<Record<string, unknown>> {
      const [linha] = await sql(
        `SELECT (SELECT count(*)::int FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid) AS despachos,
                (SELECT count(*)::int FROM field_dispatch_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid) AS eventos,
                (SELECT count(*)::int FROM work_order_assignments WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid) AS atribuicoes,
                (SELECT max(updated_at) FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid)::text AS ultima_escrita`,
        [tenantId, workOrderId],
      );
      return linha;
    },
  };
}

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function comCenario(connection: string, callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(connection);
  try {
    await callback(c);
  } finally {
    await teardown(c.admin, c.tenantId);
    await c.admin.$disconnect();
  }
}

async function teardown(client: { $queryRawUnsafe: any; $transaction: any }, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await client.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  await client.$transaction(async (tx: { $executeRawUnsafe: (sql: string, ...p: unknown[]) => Promise<number> }) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    for (const { table_name } of tabelas) {
      await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    }
    await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
  });
  for (const { table_name } of tabelas) {
    const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
