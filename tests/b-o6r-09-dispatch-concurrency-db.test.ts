import "dotenv/config";

import assert from "node:assert/strict";
import test, { after } from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  countBlockedStatements,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// B-O6R-09 (item 7 do portão; plano v2 §3, crítica r1 A1/A3, crítica r2 R2-03) — o VENCEDOR CONDICIONAL no Postgres:
// toda transição só se aplica se o despacho ainda tiver o `status` E o `operator_user_id` em que foi validada.
//   [P2 · status]   (T4)  accepted ∥ cancelled a partir de assigned → 1 vence, 1 recebe 409; 1 evento from_status=assigned;
//   [P2 · reassign] (T5)  a partir de reassigned/B: reatribuir para C ∥ para D → 1 vence, 1 recebe 409;
//   [A1]            (T13) a partir de reassigned/C: reatribuir C→A ∥ C aceita, com a reatribuição NA FRENTE da fila →
//                         o aceite recebe 409 e o despacho fica reassigned/A, sem accepted_at;
//   [A3]            (T16) accepted→accepted ∥ accepted→accepted: 0 escrita; (T16b) com observação → 422.
//
// A BARREIRA: uma conexão do teste segura `SELECT … FOR UPDATE` na linha do despacho; os pedidos entram e ficam
// bloqueados no UPDATE condicional; a contagem de bloqueados é a da PRÓPRIA suíte (`application_name`, A7), com tempo
// limite e mensagem que nomeia a espera (R2-08). Só então a trava é solta. Na janela não se lê tabela nenhuma: as
// contagens de estado final vêm depois de soltar. A fila do lock de tupla do Postgres atende na ordem de chegada
// (HIPÓTESE do plano, medida 3× na bateria); o T13 CONFERE a ordem e falha com "ordem não forçada" se ela não valeu.

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-concurrency");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const UPDATE_DESPACHO = 'UPDATE "public"."field_dispatches"';

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

  test("[P2 · status] accepted ∥ cancelled a partir de assigned → 1 vence, 1 recebe 409 FIELD_DISPATCH_STATUS_CONFLICT; 1 evento from_status=assigned", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      const [aceite, cancela] = await c.emFila(criado.id, [
        () => c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" }),
        () => c.despachos.changeStatus(c.gestao, criado.id, { status: "cancelled", reason: "Cliente desistiu." }),
      ]);
      const resultados = [aceite, cancela];
      assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1, "venceram dois (ou nenhum)");
      const perdedor = resultados.find((r) => r.status === "rejected") as { reason: any };
      assert.equal(perdedor.reason?.statusCode, 409, String(perdedor.reason?.message));
      assert.equal(perdedor.reason?.code, "FIELD_DISPATCH_STATUS_CONFLICT");
      assert.equal(await c.eventosDoDespacho(criado.id, { fromStatus: "assigned" }), 1, "a linha do tempo tem dois eventos partindo de assigned");
    });
  });

  test("[P2 · reassign] a partir de reassigned/op B: reatribuir para C ∥ para D → 1 vence, 1 recebe 409; OS com o vencedor; 1 work_order_assigned novo", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      await c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoB });
      assert.deepEqual(await c.estado(criado.id), { status: "reassigned", operator_user_id: c.tecnicoB });
      const atribuicoesAntes = await c.eventosDaOs(os, "work_order_assigned");

      const resultados = await c.emFila(criado.id, [
        () => c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoC }),
        () => c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoD }),
      ]);
      assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1, "venceram duas reatribuições");
      const perdedor = resultados.find((r) => r.status === "rejected") as { reason: any };
      assert.equal(perdedor.reason?.statusCode, 409, String(perdedor.reason?.message));
      const vencedor = (resultados.find((r) => r.status === "fulfilled") as { value: { operatorUserId: string } }).value.operatorUserId;
      assert.equal((await c.estado(criado.id)).operator_user_id, vencedor);
      assert.equal((await c.os(os)).assigned_user_id, vencedor, "a OS não ficou com o vencedor");
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), atribuicoesAntes + 1, "o perdedor também atribuiu a OS");
    });
  });

  test("[A1] a partir de reassigned/op C: reatribuir C→A ∥ C aceita, com a reatribuição na frente da fila → aceite 409; despacho reassigned/op A, accepted_at nulo, 0 status_changed de C", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      await c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoC });
      assert.deepEqual(await c.estado(criado.id), { status: "reassigned", operator_user_id: c.tecnicoC });

      const [reatribui, aceite] = await c.emFila(criado.id, [
        () => c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoA }),
        () => c.despachos.changeStatus(c.campo(c.tecnicoC), criado.id, { status: "accepted" }),
      ]);
      if (reatribui.status === "rejected") {
        assert.fail(`ordem não forçada: a reatribuição não foi a atendida primeiro (${String((reatribui as any).reason?.message)})`);
      }
      assert.equal(aceite.status, "rejected", "o técnico C aceitou um despacho que acabou de ser passado ao técnico A");
      assert.equal((aceite as any).reason?.statusCode, 409, String((aceite as any).reason?.message));
      assert.equal((aceite as any).reason?.code, "FIELD_DISPATCH_STATUS_CONFLICT");
      const linha = await c.linha(criado.id);
      assert.deepEqual([linha.status, linha.operator_user_id, linha.accepted_at], ["reassigned", c.tecnicoA, null]);
      assert.equal(await c.eventosDoDespacho(criado.id, { type: "field_dispatch_status_changed", actor: c.tecnicoC }), 0);
    });
  });

  test("[A3] accepted→accepted ∥ accepted→accepted: 200, 0 escrita (nem evento, nem carimbo, nem updated_at)", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      await c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" });
      const antes = await c.linha(criado.id);
      const eventosAntes = await c.eventosDoDespacho(criado.id, {});

      const resultados = await Promise.all([
        captureSettled(c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" })),
        captureSettled(c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" })),
      ]);
      assert.deepEqual(resultados.map((r) => r.status), ["fulfilled", "fulfilled"]);
      const depois = await c.linha(criado.id);
      assert.equal(new Date(depois.accepted_at).getTime(), new Date(antes.accepted_at).getTime(), "accepted_at foi reescrito");
      assert.equal(new Date(depois.updated_at).getTime(), new Date(antes.updated_at).getTime(), "houve UPDATE na linha");
      assert.equal(await c.eventosDoDespacho(criado.id, {}), eventosAntes, "accepted→accepted gravou evento");
    });
  });

  test("[R2-03] accepted→accepted com observação → 422 FIELD_DISPATCH_STATUS_UNCHANGED, 0 evento, observação não gravada", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      await c.despachos.changeStatus(c.campo(c.tecnicoA), criado.id, { status: "accepted" });
      const eventosAntes = await c.eventosDoDespacho(criado.id, {});
      await assert.rejects(
        c.despachos.changeStatus(c.gestao, criado.id, { status: "accepted", observation: "Status atualizado pela operação." }),
        (error: any) => error.statusCode === 422 && error.code === "FIELD_DISPATCH_STATUS_UNCHANGED",
      );
      assert.equal(await c.eventosDoDespacho(criado.id, {}), eventosAntes);
      assert.equal((await c.linha(criado.id)).observation, null, "o 422 gravou a observação");
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------

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
  const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 conc ${sufixo}`, slug: `b-o6r-09-conc-${sufixo}` } });
  const tenantId = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-o6r-09-conc-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnicoA, tecnicoB, tecnicoC, tecnicoD] = [
    await usuario("gestor"),
    await usuario("tecnico-a"),
    await usuario("tecnico-b"),
    await usuario("tecnico-c"),
    await usuario("tecnico-d"),
  ];

  wo.resetWorkOrderRuntimeForTests();
  fd.resetFieldDispatchRuntimeForTests();
  const ordens = await wo.createDefaultWorkOrderService();
  const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
  const despachos = await fd.createDefaultFieldDispatchService(nucleo as never);
  const atorDe = (userId: string, role: "manager" | "field_technician") =>
    ({ tenantId, userId, roles: [role], permissions: resolvePermissionsForRoles([role]), explicitPermissions: true }) as never;
  const gestao = atorDe(gestor.id, "manager");
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);

  // A FILA: segura a linha, dispara os pedidos UM A UM (o próximo só depois de o anterior estar bloqueado na fila da
  // própria suíte), solta, e devolve os desfechos na ordem de disparo.
  async function emFila(dispatchId: string, pedidos: ReadonlyArray<() => Promise<unknown>>) {
    const trava = new Client({ connectionString: withApplicationName(connection, `${APP}-trava`) });
    await trava.connect();
    const desfechos: Array<Promise<{ status: "fulfilled"; value: any } | { status: "rejected"; reason: unknown }>> = [];
    let aberta = false;
    try {
      await trava.query("BEGIN");
      aberta = true;
      const { rowCount } = await trava.query("SELECT id FROM field_dispatches WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE", [tenantId, dispatchId]);
      assert.equal(rowCount, 1, "a trava não achou o despacho");
      for (const [indice, pedido] of pedidos.entries()) {
        desfechos.push(captureSettled(pedido()) as never);
        await esperarBloqueados(admin, indice + 1, `pedido ${indice + 1} de ${pedidos.length} na fila do despacho`);
      }
      await trava.query("COMMIT");
      aberta = false;
    } finally {
      if (aberta) await trava.query("ROLLBACK").catch(() => undefined);
      await trava.end();
    }
    return Promise.all(desfechos);
  }

  return {
    admin,
    tenantId,
    despachos,
    gestao,
    tecnicoA: tecnicoA.id,
    tecnicoB: tecnicoB.id,
    tecnicoC: tecnicoC.id,
    tecnicoD: tecnicoD.id,
    campo: (userId: string) => atorDe(userId, "field_technician"),
    emFila,
    criarOs: async (): Promise<string> => (await ordens.create(gestao, { title: "OS B-O6R-09 concorrência" })).id,
    async os(workOrderId: string): Promise<Record<string, any>> {
      const [linha] = await sql("SELECT status, assigned_user_id::text FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, workOrderId]);
      return linha;
    },
    async eventosDaOs(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3",
        [tenantId, workOrderId, tipo],
      );
      return n;
    },
    async estado(dispatchId: string): Promise<{ status: string; operator_user_id: string }> {
      const [linha] = await sql("SELECT status, operator_user_id::text FROM field_dispatches WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, dispatchId]);
      return { status: linha.status, operator_user_id: linha.operator_user_id };
    },
    async linha(dispatchId: string): Promise<Record<string, any>> {
      const [linha] = await sql(
        "SELECT status, operator_user_id::text, accepted_at, updated_at, observation FROM field_dispatches WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, dispatchId],
      );
      return linha;
    },
    async eventosDoDespacho(dispatchId: string, filtro: { fromStatus?: string; type?: string; actor?: string }): Promise<number> {
      const [{ n }] = await sql(
        `SELECT count(*)::int AS n FROM field_dispatch_events
          WHERE tenant_id = $1::uuid AND dispatch_id = $2::uuid
            AND ($3::text IS NULL OR from_status = $3::text)
            AND ($4::text IS NULL OR event_type = $4::text)
            AND ($5::uuid IS NULL OR actor_user_id = $5::uuid)`,
        [tenantId, dispatchId, filtro.fromStatus ?? null, filtro.type ?? null, filtro.actor ?? null],
      );
      return n;
    },
  };
}

// Barreira com tempo limite: N pedidos da PRÓPRIA suíte bloqueados no UPDATE do despacho. A mensagem nomeia a espera.
async function esperarBloqueados(client: { $queryRaw: any }, minimo: number, rotulo: string, limiteMs = 15_000): Promise<void> {
  const inicio = Date.now();
  for (;;) {
    const proprios = await countBlockedStatements(client, { fragment: UPDATE_DESPACHO, applicationName: APP });
    if (proprios >= minimo) return;
    if (Date.now() - inicio > limiteMs) {
      const noCluster = await countBlockedStatements(client, { fragment: UPDATE_DESPACHO });
      assert.fail(`barreira: esperando ${minimo} statement(s) ${UPDATE_DESPACHO} da suíte ${APP} há ${Date.now() - inicio} ms — ${rotulo} (vistos: ${proprios}; no cluster: ${noCluster})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
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
