import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectRejected,
  waitForOwnAdvisoryWaiters,
  waitForOwnBlockedStatement,
  dropHarnessObjects,
  runHarnessDdl,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// B-O6R-09 (item 7 do portão; plano v2 §3 e emenda 1 §4) — atomicidade do despacho no PostgreSQL REAL:
//   [P1 · create]   (T1)  o evento `field_dispatch_created` falha → 0 despacho, 0 evento, OS intacta; também sob papel
//                         efêmero NOSUPERUSER NOBYPASSRLS (prova que a transação-mãe carrega o GUC da organização);
//   [P1 · status]   (T2)  o evento da transição falha → status, carimbo e linha do tempo inalterados;
//   [P1 · reassign] (T3)  o evento `field_dispatch_reassigned` falha → despacho e OS com o técnico anterior;
//   [P4]            (T9)  a OS recusa a atribuição → criar: 0 despacho; ativar: draft; reatribuir: técnico, status e
//                         `operator_assigned_at` IDÊNTICOS aos de antes;
//   [P4 · janela]   (T14) (a) com a atribuição presa, o despacho NÃO é visível a outra conexão; (b) a atribuição presa e
//                         depois recusada não deixa nada; (c) a mesma chave em voo, com a 1ª recusada: a 2ª cria o seu
//                         despacho e responde 201.
//
// Falha injetada por gatilho TEMPORÁRIO escopado pela organização descartável (nome único, DROP no finally, catálogo
// limpo provado). Barreiras só pelo `pg-barrier.ts`, pelo `application_name` desta suíte (A7). Enquanto o teste segura
// uma transação presa, nenhuma leitura toca tabela onde suítes irmãs criam gatilho (R2-08): na janela, só
// `field_dispatches`/`work_orders`, por conexão própria com `lock_timeout`. Sequência comum de nome único, nunca TEMP
// (R2-05). Sem DATABASE_URL, o arquivo se declara pulado.

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-atomic");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSERT_DESPACHO = 'INSERT INTO "public"."field_dispatches"';

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

  test("[P1 · create] INSERT de field_dispatch_created falha → 0 despacho, 0 evento, OS intacta (open, sem técnico), 0 work_order_assigned", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      await c.comGatilho("field_dispatch_events", "NEW.event_type = 'field_dispatch_created'", "B_O6R_09_INJ_CRIADO", async () => {
        await assert.rejects(c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA }), injetado("B_O6R_09_INJ_CRIADO"));
      });
      await c.osIntacta(os);
      assert.equal(await c.contarDespachos(os), 0, "sobrou despacho sem o evento de criação");
      assert.equal(await c.contarEventosDeDespachoDaOs(os), 0);
    });
  });

  test("[P1 · create · NOBYPASSRLS] o mesmo caso sob papel efêmero NOSUPERUSER NOBYPASSRLS", async () => {
    await comCenario(connection, async (c) => {
      const papel = await createEphemeralRole(c.admin as never, connection);
      try {
        const despachos = await c.servicoSobPapel(papel.client);
        const os = await c.criarOs();
        await c.comGatilho("field_dispatch_events", "NEW.event_type = 'field_dispatch_created'", "B_O6R_09_INJ_CRIADO", async () => {
          await assert.rejects(despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA }), injetado("B_O6R_09_INJ_CRIADO"));
        });
        await c.osIntacta(os);
        assert.equal(await c.contarDespachos(os), 0, "sob NOBYPASSRLS sobrou despacho sem o evento");
        assert.equal(await c.contarEventosDeDespachoDaOs(os), 0);

        // Controle positivo: sem o gatilho, o mesmo papel cria (a transação-mãe tem o GUC; sem ele a política recusaria).
        const os2 = await c.criarOs();
        const criado = await despachos.create(c.gestao, { workOrderId: os2, operatorUserId: c.tecnicoA });
        assert.equal(await c.contarDespachos(os2), 1);
        assert.equal(await c.contarEventosDeDespacho(criado.id, "field_dispatch_created"), 1);
        assert.equal((await c.os(os2)).assigned_user_id, c.tecnicoA);
      } finally {
        await papel.drop();
      }
    });
  });

  for (const caso of [
    { nome: "assigned→accepted", status: "accepted", tipo: "field_dispatch_status_changed", carimbo: "accepted_at", corpo: {} },
    { nome: "assigned→cancelled", status: "cancelled", tipo: "field_dispatch_cancelled", carimbo: "cancelled_at", corpo: { reason: "Cliente desistiu." } },
  ] as const) {
    test(`[P1 · status] evento falha → status, carimbo e timeline inalterados (${caso.nome})`, async () => {
      await comCenario(connection, async (c) => {
        const os = await c.criarOs();
        const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
        const ator = caso.status === "accepted" ? c.campo(c.tecnicoA) : c.gestao;
        await c.comGatilho("field_dispatch_events", `NEW.event_type = '${caso.tipo}'`, "B_O6R_09_INJ_STATUS", async () => {
          await assert.rejects(c.despachos.changeStatus(ator, criado.id, { status: caso.status, ...caso.corpo }), injetado("B_O6R_09_INJ_STATUS"));
        });
        const linha = await c.despacho(criado.id);
        assert.equal(linha.status, "assigned", "o status mudou sem o evento");
        assert.equal(linha[caso.carimbo], null, `${caso.carimbo} foi gravado sem o evento`);
        assert.equal(await c.contarEventosDeDespacho(criado.id), 1, "a linha do tempo mudou (só o de criação pode existir)");
      });
    });
  }

  test("[P1 · reassign] evento field_dispatch_reassigned falha → despacho com A e status anterior, OS com A, 0 evento novo, 0 work_order_assigned novo", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA });
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), 1);
      await c.comGatilho("field_dispatch_events", "NEW.event_type = 'field_dispatch_reassigned'", "B_O6R_09_INJ_REATRIB", async () => {
        await assert.rejects(c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoC }), injetado("B_O6R_09_INJ_REATRIB"));
      });
      const linha = await c.despacho(criado.id);
      assert.deepEqual([linha.operator_user_id, linha.status], [c.tecnicoA, "assigned"], "o despacho mudou de técnico sem o evento");
      assert.equal((await c.os(os)).assigned_user_id, c.tecnicoA, "a OS mudou de técnico sem o evento do despacho");
      assert.equal(await c.contarEventosDeDespacho(criado.id), 1);
      assert.equal(await c.eventosDaOs(os, "work_order_assigned"), 1, "sobrou work_order_assigned do técnico C");
    });
  });

  test("[P4] atribuição recusa (gatilho em work_order_events) → create: 0 despacho, 0 evento; ativação: draft, 0 status_changed; reassign: op A, status anterior, operator_assigned_at IDÊNTICO ao de antes, 0 field_dispatch_reassigned", async () => {
    await comCenario(connection, async (c) => {
      const recusa = "NEW.event_type = 'work_order_assigned'";
      // create
      const os1 = await c.criarOs();
      await c.comGatilho("work_order_events", recusa, "B_O6R_09_INJ_OS", async () => {
        await assert.rejects(c.despachos.create(c.gestao, { workOrderId: os1, operatorUserId: c.tecnicoA }), injetado("B_O6R_09_INJ_OS"));
      });
      assert.equal(await c.contarDespachos(os1), 0, "create: sobrou despacho com a OS recusando");
      assert.equal(await c.contarEventosDeDespachoDaOs(os1), 0);
      await c.osIntacta(os1);

      // ativação do rascunho
      const os2 = await c.criarOs();
      const rascunho = await c.despachos.create(c.gestao, { workOrderId: os2, operatorUserId: c.tecnicoA, status: "draft" });
      await c.comGatilho("work_order_events", recusa, "B_O6R_09_INJ_OS", async () => {
        await assert.rejects(c.despachos.changeStatus(c.gestao, rascunho.id, { status: "assigned" }), injetado("B_O6R_09_INJ_OS"));
      });
      assert.equal((await c.despacho(rascunho.id)).status, "draft", "ativação: o rascunho saiu de draft com a OS recusando");
      assert.equal(await c.contarEventosDeDespacho(rascunho.id, "field_dispatch_status_changed"), 0);
      await c.osIntacta(os2);

      // reatribuição
      const os3 = await c.criarOs();
      const criado = await c.despachos.create(c.gestao, { workOrderId: os3, operatorUserId: c.tecnicoA });
      const antes = await c.despacho(criado.id);
      assert.ok(antes.operator_assigned_at, "o gatilho do operador não carimbou a criação");
      await c.comGatilho("work_order_events", recusa, "B_O6R_09_INJ_OS", async () => {
        await assert.rejects(c.despachos.reassign(c.gestao, criado.id, { operatorUserId: c.tecnicoC }), injetado("B_O6R_09_INJ_OS"));
      });
      const depois = await c.despacho(criado.id);
      assert.deepEqual([depois.operator_user_id, depois.status], [c.tecnicoA, "assigned"], "reassign: o despacho não ficou como estava");
      assert.equal(
        new Date(depois.operator_assigned_at).getTime(),
        new Date(antes.operator_assigned_at).getTime(),
        "reassign: operator_assigned_at mudou (a compensação reescreveu o técnico)",
      );
      assert.equal(await c.contarEventosDeDespacho(criado.id, "field_dispatch_reassigned"), 0);
      assert.equal((await c.os(os3)).assigned_user_id, c.tecnicoA);
    });
  });

  test("[P4 · janela (a)] com a atribuição presa, outra conexão vê 0 despacho; solta → 201 e 1 despacho", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const chave = `b-o6r-09-janela-a-${randomUUID()}`;
      await c.comTravaNaAtribuicao(chave, { recusa: false }, async (soltar) => {
        const pedido = captureSettled(c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA }));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "atribuição presa na janela (a)" });
        assert.equal(await c.contarDespachosNaJanela(os), 0, "o despacho ficou visível antes de a OS aceitar (janela da v1)");
        await soltar();
        const resultado = await pedido;
        assert.equal(resultado.status, "fulfilled", `o POST falhou: ${String((resultado as any).reason?.message ?? "")}`);
      });
      assert.equal(await c.contarDespachos(os), 1);
      assert.equal((await c.os(os)).assigned_user_id, c.tecnicoA);
    });
  });

  test("[P4 · janela (b)] a atribuição presa e depois recusada → 0 despacho e 0 evento no fim", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const chave = `b-o6r-09-janela-b-${randomUUID()}`;
      await c.comTravaNaAtribuicao(chave, { recusa: true }, async (soltar) => {
        const pedido = captureSettled(c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA }));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "atribuição presa na janela (b)" });
        assert.equal(await c.contarDespachosNaJanela(os), 0);
        await soltar();
        injetado("B_O6R_09_INJ_ATRIB")(expectRejected(await pedido, "janela (b)"));
      });
      assert.equal(await c.contarDespachos(os), 0);
      assert.equal(await c.contarEventosDeDespachoDaOs(os), 0);
      await c.osIntacta(os);
    });
  });

  test("[P4 · janela (c)] a mesma chave em voo com a 1ª recusada: a 2ª espera no índice, cria o seu e responde 201 com um id que existe no fim", async () => {
    await comCenario(connection, async (c) => {
      const os = await c.criarOs();
      const chave = `b-o6r-09-janela-c-${randomUUID()}`;
      const idempotencyKey = `b-o6r-09-${randomUUID()}`;
      const sequencia = `b_o6r_09_seq_${randomUUID().replace(/-/g, "")}`;
      await c.admin.$executeRawUnsafe(`CREATE SEQUENCE ${sequencia}`);
      try {
        // A 1ª fica presa DENTRO da transação-mãe (no evento de criação, depois de a chave entrar no índice); a atribuição
        // dela recusa só na 1ª vez (`nextval` = 1 não volta no rollback). A 2ª, com a mesma chave, espera no índice único.
        await c.comGatilho(
          "work_order_assignments",
          "true",
          "B_O6R_09_INJ_1A",
          async () => {
            await c.comTravaNoEventoDeCriacao(chave, async (soltar) => {
              const primeira = captureSettled(c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA, idempotencyKey }));
              await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa no evento de criação" });
              const segunda = captureSettled(c.despachos.create(c.gestao, { workOrderId: os, operatorUserId: c.tecnicoA, idempotencyKey }));
              await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: INSERT_DESPACHO, label: "2ª esperando no índice da chave" });
              await soltar();
              injetado("B_O6R_09_INJ_1A")(expectRejected(await primeira, "1ª recusada"));
              const resultado = await segunda;
              assert.equal(resultado.status, "fulfilled", `a 2ª falhou: ${String((resultado as any).reason?.message ?? "")}`);
              const despacho = (resultado as { value: { id: string } }).value;
              assert.equal(await c.contarDespachos(os), 1);
              assert.equal((await c.despacho(despacho.id)).id, despacho.id, "a 2ª devolveu um despacho que não existe no fim");
            });
          },
          `IF nextval('${sequencia}') = 1 THEN RAISE EXCEPTION 'B_O6R_09_INJ_1A'; END IF; RETURN NEW;`,
        );
        assert.equal((await c.atribuicoes(os)).length, 1);
      } finally {
        await c.admin.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS ${sequencia}`);
      }
      const [{ n }] = await c.sql("SELECT count(*)::int AS n FROM pg_class WHERE relname = $1", [sequencia]);
      assert.equal(n, 0, "a sequência sobrou no catálogo");
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------

function injetado(marca: string) {
  return (erro: unknown) => {
    const texto = String((erro as { message?: unknown })?.message ?? erro);
    assert.ok(texto.includes(marca), `a recusa não veio da falha injetada (${marca}): ${texto.slice(0, 300)}`);
    return true;
  };
}

async function montarCenario(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { resolvePermissionsForRoles }, wo, fd, woRepo, fdRepo, { Client }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
    import("../src/modules/work-orders/work-order-prisma.repository.js"),
    import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js"),
    import("pg"),
  ]);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connection, `${APP}-adm`) }) });
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 atomic ${sufixo}`, slug: `b-o6r-09-atomic-${sufixo}` } });
  const tenantId = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `b-o6r-09-atomic-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnicoA, tecnicoC] = [await usuario("gestor"), await usuario("tecnico-a"), await usuario("tecnico-c")];

  wo.resetWorkOrderRuntimeForTests();
  fd.resetFieldDispatchRuntimeForTests();
  const ordens = await wo.createDefaultWorkOrderService();
  const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
  const despachos = await fd.createDefaultFieldDispatchService(nucleo as never);
  const atorDe = (userId: string, role: "manager" | "field_technician") =>
    ({ tenantId, userId, roles: [role], permissions: resolvePermissionsForRoles([role]), explicitPermissions: true }) as never;
  const gestao = atorDe(gestor.id, "manager");
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);

  async function pgClient(nome: string) {
    const client = new Client({ connectionString: withApplicationName(connection, `${APP}-${nome}`) });
    await client.connect();
    return client;
  }

  async function comGatilho(
    tabela: "field_dispatch_events" | "work_order_events" | "work_order_assignments",
    quando: string,
    marca: string,
    corpo: () => Promise<void>,
    plpgsql = `RAISE EXCEPTION '${marca}';`,
  ): Promise<void> {
    assert.match(tenantId, UUID);
    const nome = `b_o6r_09_inj_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    // Emenda 4 (R-ARN-2/R-ARN-3) — todo DDL de gatilho pelo `runHarnessDdl` (nunca na fila na frente de outra suíte); um
    // esgotamento no DROP falha o caso e preserva o erro do corpo.
    await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN ${plpgsql} END $f$`);
    let erroDoCorpo: unknown;
    try {
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} BEFORE INSERT ON ${tabela} FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid AND (${quando})) EXECUTE FUNCTION ${nome}()`,
      );
      await corpo();
    } catch (error) {
      erroDoCorpo = error;
    } finally {
      await dropHarnessObjects(admin, erroDoCorpo, [`DROP TRIGGER IF EXISTS ${nome} ON ${tabela}`, `DROP FUNCTION IF EXISTS ${nome}()`]);
    }
    if (erroDoCorpo !== undefined) throw erroDoCorpo;
    const [{ gatilhos }] = await sql("SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = $1", [nome]);
    const [{ funcoes }] = await sql("SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = $1", [nome]);
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${nome} sobrou no catálogo`);
  }

  // Uma trava consultiva segura por uma conexão do TESTE, e um gatilho que a pede. Quem passa pelo gatilho fica preso
  // até `soltar()`. A espera é medida por `waitForOwnAdvisoryWaiters` (só conexões desta suíte).
  async function comTrava(
    tabela: "field_dispatch_events" | "work_order_assignments",
    quando: string,
    chave: string,
    depois: string,
    corpo: (soltar: () => Promise<void>) => Promise<void>,
  ): Promise<void> {
    const trava = await pgClient("trava");
    let solta = false;
    const soltar = async () => {
      if (solta) return;
      solta = true;
      await trava.query("SELECT pg_advisory_unlock(hashtext($1))", [chave]);
    };
    try {
      await trava.query("SELECT pg_advisory_lock(hashtext($1))", [chave]);
      // A trava é solta ANTES de o gatilho cair: um DROP TRIGGER com alguém preso dentro dele esperaria por quem está
      // preso, e quem está preso espera a trava — um ciclo que o Postgres não vê, porque passa pelo cliente JS.
      await comGatilho(
        tabela,
        quando,
        "B_O6R_09_INJ_ATRIB",
        async () => {
          try {
            await corpo(soltar);
          } finally {
            await soltar();
          }
        },
        `PERFORM pg_advisory_xact_lock(hashtext('${chave}')); ${depois}`,
      );
    } finally {
      await soltar().catch(() => undefined);
      await trava.end();
    }
  }

  return {
    admin,
    tenantId,
    ordens,
    despachos,
    gestao,
    tecnicoA: tecnicoA.id,
    tecnicoC: tecnicoC.id,
    campo: (userId: string) => atorDe(userId, "field_technician"),
    sql,
    comGatilho,
    comTravaNaAtribuicao: (chave: string, opcoes: { readonly recusa: boolean }, corpo: (soltar: () => Promise<void>) => Promise<void>) =>
      comTrava("work_order_assignments", "true", chave, opcoes.recusa ? "RAISE EXCEPTION 'B_O6R_09_INJ_ATRIB';" : "RETURN NEW;", corpo),
    comTravaNoEventoDeCriacao: (chave: string, corpo: (soltar: () => Promise<void>) => Promise<void>) =>
      comTrava("field_dispatch_events", "NEW.event_type = 'field_dispatch_created'", chave, "RETURN NEW;", corpo),
    async servicoSobPapel(cliente: unknown) {
      const ordensDoPapel = new wo.WorkOrderService(new woRepo.RlsPrismaWorkOrderRepository(cliente as never), (ordens as any).references);
      return new fd.FieldDispatchService(
        new fdRepo.RlsPrismaFieldDispatchRepository(cliente as never),
        ordensDoPapel,
        nucleo as never,
        async () => null,
        async () => {},
        async () => {},
        fd.buildWorkOrderChecklistSetPort(ordensDoPapel),
        async () => false,
      );
    },
    criarOs: async (): Promise<string> => (await ordens.create(gestao, { title: "OS B-O6R-09" })).id,
    async os(workOrderId: string): Promise<Record<string, any>> {
      const [linha] = await sql(
        "SELECT status, assigned_operator_id::text, assigned_user_id::text FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, workOrderId],
      );
      return linha;
    },
    async osIntacta(workOrderId: string): Promise<void> {
      const [linha] = await sql(
        "SELECT status, assigned_operator_id::text, assigned_user_id::text FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, workOrderId],
      );
      assert.deepEqual([linha.status, linha.assigned_operator_id, linha.assigned_user_id], ["open", null, null], "a OS foi atribuída");
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM work_order_assignments WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [tenantId, workOrderId]);
      assert.equal(n, 0, "sobrou linha de atribuição");
      const [{ e }] = await sql(
        "SELECT count(*)::int AS e FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_assigned'",
        [tenantId, workOrderId],
      );
      assert.equal(e, 0, "sobrou work_order_assigned");
    },
    async atribuicoes(workOrderId: string): Promise<any[]> {
      return sql("SELECT user_id::text, metadata FROM work_order_assignments WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [tenantId, workOrderId]);
    },
    async eventosDaOs(workOrderId: string, tipo: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = $3",
        [tenantId, workOrderId, tipo],
      );
      return n;
    },
    async despacho(dispatchId: string): Promise<Record<string, any>> {
      const [linha] = await sql(
        "SELECT id::text, status, operator_user_id::text, accepted_at, cancelled_at, operator_assigned_at FROM field_dispatches WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, dispatchId],
      );
      return linha;
    },
    async contarDespachos(workOrderId: string): Promise<number> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [tenantId, workOrderId]);
      return n;
    },
    // R2-08 — leitura NA JANELA: só `field_dispatches`, por conexão própria, com `lock_timeout`.
    async contarDespachosNaJanela(workOrderId: string): Promise<number> {
      const leitor = await pgClient("janela");
      try {
        await leitor.query("BEGIN");
        await leitor.query("SET LOCAL lock_timeout = '5s'");
        const { rows } = await leitor.query(
          "SELECT count(*)::int AS n FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid",
          [tenantId, workOrderId],
        );
        await leitor.query("COMMIT");
        return rows[0].n;
      } finally {
        await leitor.end();
      }
    },
    async contarEventosDeDespacho(dispatchId: string, tipo?: string): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM field_dispatch_events WHERE tenant_id = $1::uuid AND dispatch_id = $2::uuid AND ($3::text IS NULL OR event_type = $3::text)",
        [tenantId, dispatchId, tipo ?? null],
      );
      return n;
    },
    async contarEventosDeDespachoDaOs(workOrderId: string): Promise<number> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM field_dispatch_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [tenantId, workOrderId]);
      return n;
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

// Teardown ESCOPADO à organização descartável (o idioma de `o6r07c-b-scope-db.test.ts`): toda tabela com `tenant_id`
// uuid, pelo id que o caso semeou, com gatilhos de FK em modo réplica; depois, zero linha residual.
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
