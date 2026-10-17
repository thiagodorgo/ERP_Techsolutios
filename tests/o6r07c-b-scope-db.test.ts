import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-O6R-07c-b1 (Ω6R-SEC-002) — o que só existe no PostgreSQL REAL:
//   [atribuição]  `assignFromDispatch` pela composição de produção: transação Prisma (OS + linha de
//                 `work_order_assignments`) sob RLS, e o `resolveActorOperatorProfileId` real — o alvo COM perfil fica
//                 atribuído pelo PERFIL; SEM perfil, pelo user id. Evento na linha do tempo.
//   [ex-técnico]  `hasActorBeenAssigned` lido do banco: quem já teve linha cai em conflito (km pelo lote), quem nunca
//                 teve cai em `rejected`. O banco não muda.
//   [status]      OS fora de `open` mantém o status; OS encerrada recusa (409).
//   [despacho]    `deleteById` e `restoreState` (as compensações do create e do reassign) no banco.
//   [backfill P6] o corpo REAL da migração 20260877000000, escopado às organizações da fixture pela âncora
//                 `SELECT id FROM tenants ORDER BY id`: conta ANTES (coerentes / a preencher / divergentes), preenche
//                 só a OS sem atribuição com o alvo do despacho ativo MAIS RECENTE, não toca divergentes, é
//                 idempotente — e funciona sob papel NOSUPERUSER sem BYPASSRLS (FORCE RLS), porque seta o GUC por
//                 organização.
//
// Cada caso cria organizações DESCARTÁVEIS e as remove no `finally`, escopado pelo id que semeou (nunca curinga).
// Sem DATABASE_URL, o arquivo se declara pulado (forma canônica do runner).

const connectionString = process.env.DATABASE_URL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRACAO = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  "20260877000000_backfill_work_order_assignment_from_active_dispatches",
  "migration.sql",
);
const ANCORA = "SELECT id FROM tenants ORDER BY id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O corpo verbatim da migração com UMA cláusula de escopo injetada. Fail-closed: âncora ausente ou repetida reprova
// (o teste nunca roda o backfill sobre a base inteira, onde suítes irmãs semeiam em paralelo), e a ida-e-volta prova
// que o resto é byte-idêntico ao verbatim.
function backfillEscopado(tenantIds: readonly string[]): string {
  const verbatim = readFileSync(MIGRACAO, "utf8");
  for (const id of tenantIds) assert.match(id, UUID);
  assert.equal(verbatim.split(ANCORA).length - 1, 1, "a âncora do laço de organizações tem de existir exatamente uma vez");
  const escopo = `SELECT id FROM tenants WHERE id = ANY('{${tenantIds.join(",")}}'::uuid[]) ORDER BY id`;
  const escopado = verbatim.replace(ANCORA, escopo);
  assert.equal(escopado.replace(escopo, ANCORA), verbatim, "ida-e-volta: fora o escopo, o texto é o verbatim");
  return escopado;
}

if (!connectionString) {
  test("o 07c-b1 no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  after(async () => {
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
  });

  test("[modo] a composição de produção está em prisma", async () => {
    const { env } = await import("../src/config/env.js");
    assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  });

  test("[atribuição] despacho atribui pelo PERFIL (com perfil) e pelo user id (sem perfil), na mesma transação, com evento", async () => {
    await comCenario(connection, async (c) => {
      const os1 = await c.criarOs();
      const dispatchId = randomUUID();
      const atribuida = await c.ordens.assignFromDispatch(c.gestao as never, {
        workOrderId: os1,
        operatorUserId: c.tecnicoA,
        dispatchId,
        source: "field_dispatch",
      });
      assert.equal(atribuida.status, "assigned");
      const linha = await c.os(os1);
      assert.equal(linha.assigned_operator_id, c.perfilA, "com perfil, o operador é o PERFIL");
      assert.equal(linha.assigned_user_id, c.tecnicoA);
      assert.equal(linha.status, "assigned");
      const atribuicoes = await c.atribuicoes(os1);
      assert.equal(atribuicoes.length, 1);
      assert.equal(atribuicoes[0].operator_id, c.perfilA);
      assert.equal(atribuicoes[0].user_id, c.tecnicoA);
      assert.equal(atribuicoes[0].metadata.source, "field_dispatch");
      assert.equal(atribuicoes[0].metadata.dispatchId, dispatchId);
      assert.equal(await c.eventos(os1, "work_order_assigned"), 1);

      const os2 = await c.criarOs();
      await c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os2, operatorUserId: c.tecnicoC, dispatchId: randomUUID(), source: "field_dispatch" });
      assert.equal((await c.os(os2)).assigned_operator_id, c.tecnicoC, "sem perfil, o operador é o user id");

      // O atribuído escreve (km pelo lote) e o banco registra.
      const km = await c.km(c.tecnicoA, os1, 321);
      assert.equal(km.status, "accepted", `${km.status} ${km.reason}`);
      assert.equal(Number((await c.os(os1)).mileage_start), 321);
    });
  });

  test("[ex-técnico] quem já teve linha de atribuição cai em conflito; quem nunca teve, rejected — o banco não muda", async () => {
    await comCenario(connection, async (c) => {
      const os1 = await c.criarOs();
      await c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os1, operatorUserId: c.tecnicoA, dispatchId: randomUUID(), source: "field_dispatch" });
      await c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os1, operatorUserId: c.tecnicoC, dispatchId: randomUUID(), source: "field_dispatch_reassign" });

      const ex = await c.km(c.tecnicoA, os1, 777);
      assert.equal(ex.status, "conflict", `ex-técnico: ${ex.status} ${ex.reason}`);
      assert.equal(ex.conflictType, "assignment_changed_pending_review");
      assert.equal(ex.reason, "not_assigned_to_actor");
      const nunca = await c.km(c.tecnicoB, os1, 778);
      assert.equal(nunca.status, "rejected", `nunca técnico: ${nunca.status} ${nunca.reason}`);
      assert.equal(nunca.reason, "not_assigned_to_actor");
      assert.equal((await c.os(os1)).mileage_start, null, "a km de quem não é o técnico chegou ao banco");
      assert.equal((await c.atribuicoes(os1)).length, 2);
    });
  });

  test("[status] OS fora de open mantém o status ao ser reatribuída pelo despacho; OS encerrada recusa com 409", async () => {
    await comCenario(connection, async (c) => {
      const os1 = await c.criarOs();
      await c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os1, operatorUserId: c.tecnicoA, dispatchId: randomUUID(), source: "field_dispatch" });
      await c.ordens.changeStatus(c.campo(c.tecnicoA) as never, os1, { status: "accepted" });
      await c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os1, operatorUserId: c.tecnicoC, dispatchId: randomUUID(), source: "field_dispatch_reassign" });
      const linha = await c.os(os1);
      assert.equal(linha.status, "accepted");
      assert.equal(linha.assigned_user_id, c.tecnicoC);

      const os2 = await c.criarOs();
      await c.sql("UPDATE work_orders SET status = 'completed' WHERE tenant_id = $1::uuid AND id = $2::uuid", [c.tenantId, os2]);
      await assert.rejects(
        c.ordens.assignFromDispatch(c.gestao as never, { workOrderId: os2, operatorUserId: c.tecnicoA, dispatchId: randomUUID(), source: "field_dispatch" }),
        (e: any) => e.statusCode === 409 && e.reason === "invalid_status_transition",
      );
      assert.equal((await c.atribuicoes(os2)).length, 0);
    });
  });

  test("[despacho] as compensações no banco: deleteById apaga o despacho; restoreState devolve alvo e status", async () => {
    await comCenario(connection, async (c) => {
      const { RlsPrismaFieldDispatchRepository } = await import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js");
      const { prisma } = await import("../src/database/prisma.js");
      const repo = new RlsPrismaFieldDispatchRepository(prisma);
      const os1 = await c.criarOs();
      const criado = await repo.create({ tenantId: c.tenantId, workOrderId: os1, operatorUserId: c.tecnicoA, status: "assigned", metadata: {} });
      const reatribuido = await repo.reassign({ tenantId: c.tenantId, dispatchId: criado.id, operatorUserId: c.tecnicoC });
      assert.equal(reatribuido?.operatorUserId, c.tecnicoC);
      await repo.restoreState(c.tenantId, criado);
      const voltou = await repo.findById(c.tenantId, criado.id);
      assert.equal(voltou?.operatorUserId, c.tecnicoA);
      assert.equal(voltou?.status, "assigned");
      await repo.deleteById(c.tenantId, criado.id);
      assert.equal(await repo.findById(c.tenantId, criado.id), undefined);
    });
  });

  test("[backfill P6] conta antes, preenche só a OS sem atribuição pelo despacho ativo mais recente, não toca divergentes, é idempotente", async () => {
    await comCenario(connection, async (c) => {
      const fx = await c.fixtureBackfill();
      const avisos = await c.rodarBackfillComoAdmin([c.tenantId]);
      assert.deepEqual(
        avisos,
        ["B-O6R-07c-b1 backfill: despachos ativos coerentes=1, a_preencher=2, divergentes=2 (nao tocados); OS preenchidas=2"],
      );

      // (i) OS aberta sem atribuição, despacho ativo de A (com perfil) → atribuída ao perfil, `open → assigned`.
      const i = await c.os(fx.semAtribuicao);
      assert.equal(i.assigned_operator_id, c.perfilA);
      assert.equal(i.assigned_user_id, c.tecnicoA);
      assert.equal(i.status, "assigned");
      const linhasI = await c.atribuicoes(fx.semAtribuicao);
      assert.equal(linhasI.length, 1);
      assert.equal(linhasI[0].metadata.source, "field_dispatch_backfill");
      assert.equal(linhasI[0].metadata.dispatchId, fx.despachoSemAtribuicao);
      assert.equal(await c.eventos(fx.semAtribuicao, "work_order_assigned"), 1);
      // (ii) divergente: segue com B.
      assert.equal((await c.os(fx.divergente)).assigned_operator_id, c.perfilB);
      // (iii) coerente: intocada (1 linha, a do `assign`).
      assert.equal((await c.atribuicoes(fx.coerente)).length, 1);
      // (iv) dois despachos ativos sem atribuição: vence o MAIS RECENTE (C, sem perfil → user id).
      assert.equal((await c.os(fx.doisAtivos)).assigned_operator_id, c.tecnicoC);
      // (v) despacho cancelado e (vi) OS encerrada: nada.
      assert.equal((await c.os(fx.soCancelado)).assigned_operator_id, null);
      assert.equal((await c.os(fx.encerrada)).assigned_operator_id, null);

      const antes = await c.totais();
      const segunda = await c.rodarBackfillComoAdmin([c.tenantId]);
      assert.deepEqual(
        segunda,
        ["B-O6R-07c-b1 backfill: despachos ativos coerentes=3, a_preencher=0, divergentes=2 (nao tocados); OS preenchidas=0"],
      );
      assert.deepEqual(await c.totais(), antes, "a 2ª execução escreveu alguma coisa (não é idempotente)");
    });
  });

  test("[backfill P6 · FORCE RLS] o mesmo corpo, sob papel NOSUPERUSER sem BYPASSRLS, preenche (o GUC é setado por organização)", async () => {
    await comCenario(connection, async (c) => {
      const fx = await c.fixtureBackfill();
      const papel = await createEphemeralRole(c.client as never, connection);
      try {
        await papel.client.$executeRawUnsafe(backfillEscopado([c.tenantId]));
      } finally {
        await papel.drop();
      }
      assert.equal((await c.os(fx.semAtribuicao)).assigned_operator_id, c.perfilA, "sob FORCE RLS o backfill não enxergou a OS");
      assert.equal((await c.os(fx.doisAtivos)).assigned_operator_id, c.tecnicoC);
      assert.equal((await c.os(fx.divergente)).assigned_operator_id, c.perfilB);
    });
  });
}

async function montarCenario(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { resolvePermissionsForRoles }, workOrderModule, syncModule, { Client }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("pg"),
  ]);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `O6R07cb DB ${sufixo}`, slug: `o6r07cb-db-${sufixo}` } });
  const tenantId = tenant.id;
  const usuario = (nome: string) =>
    client.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `o6r07cb-db-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnicoA, tecnicoB, tecnicoC] = [await usuario("gestor"), await usuario("tecnico-a"), await usuario("tecnico-b"), await usuario("tecnico-c")];
  const perfilA = await client.operatorProfile.create({ data: { tenant_id: tenantId, user_id: tecnicoA.id, full_name: "Tecnico A" } });
  const perfilB = await client.operatorProfile.create({ data: { tenant_id: tenantId, user_id: tecnicoB.id, full_name: "Tecnico B" } });
  // tecnicoC fica SEM perfil de propósito.

  workOrderModule.resetWorkOrderRuntimeForTests();
  syncModule.resetMobileWorkOrderSyncRuntimeForTests();
  const ordens = await workOrderModule.createDefaultWorkOrderService();
  const atorDe = (userId: string, role: "manager" | "field_technician") => ({
    tenantId,
    userId,
    roles: [role],
    permissions: resolvePermissionsForRoles([role]),
    explicitPermissions: true,
  });
  const gestao = atorDe(gestor.id, "manager");
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => client.$queryRawUnsafe(texto, ...params);
  const criarOs = async (): Promise<string> => (await ordens.create(gestao as never, { title: "OS 07c-b1 no banco" })).id;
  const despacho = async (workOrderId: string, operatorUserId: string, status: string, createdAt: Date): Promise<string> =>
    (
      await client.fieldDispatch.create({
        data: { tenant_id: tenantId, work_order_id: workOrderId, operator_user_id: operatorUserId, status, metadata: {}, created_at: createdAt },
      })
    ).id;

  return {
    client,
    tenantId,
    ordens,
    gestao,
    tecnicoA: tecnicoA.id,
    tecnicoB: tecnicoB.id,
    tecnicoC: tecnicoC.id,
    perfilA: perfilA.id,
    perfilB: perfilB.id,
    campo: (userId: string) => atorDe(userId, "field_technician"),
    sql,
    criarOs,
    async os(workOrderId: string): Promise<Record<string, any>> {
      const [linha] = await sql(
        "SELECT status, assigned_operator_id::text, assigned_user_id::text, mileage_start FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, workOrderId],
      );
      return linha;
    },
    async atribuicoes(workOrderId: string): Promise<Array<Record<string, any>>> {
      return sql(
        "SELECT operator_id::text, user_id::text, metadata FROM work_order_assignments WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid ORDER BY assigned_at",
        [tenantId, workOrderId],
      );
    },
    async eventos(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3",
        [tenantId, workOrderId, tipo],
      );
      return n;
    },
    async totais(): Promise<Record<string, number>> {
      const [linha] = await sql(
        `SELECT (SELECT count(*)::int FROM work_order_assignments WHERE tenant_id = $1::uuid) AS atribuicoes,
                (SELECT count(*)::int FROM work_order_events WHERE tenant_id = $1::uuid) AS eventos,
                (SELECT count(*)::int FROM work_orders WHERE tenant_id = $1::uuid AND assigned_operator_id IS NOT NULL) AS atribuidas`,
        [tenantId],
      );
      return linha;
    },
    async km(userId: string, workOrderId: string, valor: number) {
      const clientActionId = randomUUID();
      const r = await syncModule.syncMobileWorkOrderActions(atorDe(userId, "field_technician") as never, {
        client_batch_id: randomUUID(),
        actions: [{ client_action_id: clientActionId, type: "work_order.mileage", payload: { work_order_id: workOrderId, mileage_start: valor } }],
      });
      const todas = [...r.accepted, ...r.rejected, ...r.conflicts, ...r.already_applied] as Array<Record<string, any>>;
      const acao = todas.find((a) => a.client_action_id === clientActionId);
      return { status: acao?.status as string | undefined, reason: acao?.error?.reason as string | undefined, conflictType: acao?.conflict?.conflict_type as string | undefined };
    },
    // As seis formas do P6, numa organização só. O relógio do `created_at` é explícito: "o mais recente" é dado.
    async fixtureBackfill() {
      const t0 = new Date(Date.now() - 60_000);
      const t1 = new Date(Date.now() - 30_000);
      const semAtribuicao = await criarOs();
      const despachoSemAtribuicao = await despacho(semAtribuicao, tecnicoA.id, "accepted", t0);
      const divergente = await criarOs();
      await ordens.assign(gestao as never, divergente, { operatorId: perfilB.id });
      await despacho(divergente, tecnicoA.id, "on_route", t0);
      const coerente = await criarOs();
      await ordens.assign(gestao as never, coerente, { operatorId: perfilA.id });
      await despacho(coerente, tecnicoA.id, "assigned", t0);
      const doisAtivos = await criarOs();
      await despacho(doisAtivos, tecnicoA.id, "assigned", t0);
      await despacho(doisAtivos, tecnicoC.id, "reassigned", t1);
      const soCancelado = await criarOs();
      await despacho(soCancelado, tecnicoA.id, "cancelled", t0);
      const encerrada = await criarOs();
      await despacho(encerrada, tecnicoA.id, "in_service", t0);
      await sql("UPDATE work_orders SET status = 'rejected' WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, encerrada]);
      return { semAtribuicao, despachoSemAtribuicao, divergente, coerente, doisAtivos, soCancelado, encerrada };
    },
    async rodarBackfillComoAdmin(tenantIds: readonly string[]): Promise<string[]> {
      const pg = new Client({ connectionString: connection });
      const avisos: string[] = [];
      pg.on("notice", (aviso: { message?: string }) => {
        if (aviso.message?.startsWith("B-O6R-07c-b1 backfill")) avisos.push(aviso.message);
      });
      await pg.connect();
      try {
        await pg.query(backfillEscopado(tenantIds));
      } finally {
        await pg.end();
      }
      return avisos;
    },
  };
}

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function comCenario(connection: string, callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(connection);
  try {
    await callback(c);
  } finally {
    await teardown(c.client, c.tenantId);
    await c.client.$disconnect();
  }
}

// Teardown ESCOPADO à organização descartável desta execução (o idioma de `o6r07c-subresource-scope-db.test.ts`):
// toda tabela com `tenant_id` uuid, pelo id que o caso semeou, com gatilhos de FK em modo réplica; depois, zero
// linha residual.
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
    const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`,
      tenantId,
    );
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
