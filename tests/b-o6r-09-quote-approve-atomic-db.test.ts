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

// B-O6R-09 · fatia 6 (item fundido pelo dono, `D-PORTAO-3-RECOMENDACOES-1111` Q1 (c); emenda 1 §3 e emenda 1.1) —
// aprovar o orçamento reserva o orçamento, cria a OS com o evento `work_order_created` (e as vistorias) e grava o
// vínculo `created_work_order_id` numa TRANSAÇÃO SÓ, no PostgreSQL real:
//   [Q2 · evento]   (T19)  o evento falha → a chamada REJEITA, 0 OS, orçamento draft; sem o gatilho → 1 OS (+ NOBYPASSRLS);
//   [Q2 · vínculo]  (T20)  o UPDATE do vínculo falha → rejeita, 0 OS, draft; a nova aprovação → 1 OS;
//   [Q2 · OS/código/vistorias] (T20b) a OS, a colisão de código entre orçamentos diferentes e a vistoria → rejeita, 0 OS;
//   [Q1 · corrida]  (T21)  2 aprovações do mesmo orçamento → 1 OS; a 2ª → 409 quote_already_approved com o id da OS;
//                         variante de rollback: a 1ª falha e a 2ª reserva e cria;
//   [Q3]            (T22/T22b) a repetição (mesmo corpo ou outro destino) → 409 com `details.workOrderId`; a OS não muda;
//   [Q4]            (T23)  orçamento de outra organização → 404, nada escrito; sob NOBYPASSRLS, o próprio → 200.
// EM1-04: todo caso com falha injetada afirma que a chamada REJEITA antes de contar o banco, e todo id de OS devolvido
// tem de existir (`assertReturnedWorkOrderExists`). Arnês: o do v2 §3 (gatilho escopado, barreira pelo
// `application_name`, sequência comum de nome único, catálogo limpo provado).

const baseConnection = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-quote");
if (baseConnection) process.env.DATABASE_URL = withApplicationName(baseConnection, APP);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DESTINO_X = { destinationAddress: "Oficina Central, 200", destinationCity: "Curitiba", destinationState: "PR" };
const DESTINO_Y = { destinationAddress: "Pátio Norte, 9", destinationCity: "Curitiba", destinationState: "PR" };

if (!baseConnection) {
  test("o B-O6R-09 (orçamento) no Postgres exige DATABASE_URL", {
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

  test("[Q2 · evento] INSERT de work_order_created falha → rejeita, 0 OS, 0 evento, orçamento draft e created_work_order_id nulo; sem o gatilho, a nova aprovação → 1 OS no total", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      await c.comGatilho("work_orders_events_insert", "work_order_events", "BEFORE INSERT", "NEW.event_type = 'work_order_created'", "B_O6R_09_Q_EVENTO", async () => {
        await assert.rejects(() => c.svc.approve(c.ator, quote, DESTINO_X), injetado("B_O6R_09_Q_EVENTO"));
      });
      assert.equal(await c.contarOs(), 0, "sobrou OS depois da falha no evento");
      assert.deepEqual(await c.orcamento(quote), { status: "draft", created_work_order_id: null });
      const { workOrderId } = await c.svc.approve(c.ator, quote, DESTINO_X);
      await c.assertReturnedWorkOrderExists(workOrderId);
      assert.equal(await c.contarOs(), 1, "a nova aprovação deixou mais de uma OS");
      assert.equal((await c.os(workOrderId)).destination_address, DESTINO_X.destinationAddress);
    });
  });

  test("[Q2 · evento · NOBYPASSRLS] o mesmo caso sob papel efêmero NOSUPERUSER NOBYPASSRLS", async () => {
    await comCenario(connection, async (c) => {
      const papel = await createEphemeralRole(c.admin as never, connection);
      try {
        const svc = await c.servicoSobPapel(papel.client);
        const quote = await c.criarOrcamento(c.catalogoComDestino);
        await c.comGatilho("work_orders_events_insert", "work_order_events", "BEFORE INSERT", "NEW.event_type = 'work_order_created'", "B_O6R_09_Q_EVENTO", async () => {
          await assert.rejects(() => svc.approve(c.ator, quote, DESTINO_X), injetado("B_O6R_09_Q_EVENTO"));
        });
        assert.equal(await c.contarOs(), 0);
        assert.deepEqual(await c.orcamento(quote), { status: "draft", created_work_order_id: null });
        const { workOrderId } = await svc.approve(c.ator, quote, DESTINO_X);
        await c.assertReturnedWorkOrderExists(workOrderId);
        assert.equal(await c.contarOs(), 1);
      } finally {
        await papel.drop();
      }
    });
  });

  test("[Q2 · vínculo] UPDATE de created_work_order_id falha → rejeita, 0 OS, orçamento draft; a nova aprovação → 1 OS", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      await c.comGatilho("service_quotes_link", "service_quotes", "BEFORE UPDATE", "NEW.created_work_order_id IS NOT NULL", "B_O6R_09_Q_VINCULO", async () => {
        await assert.rejects(() => c.svc.approve(c.ator, quote, DESTINO_X), injetado("B_O6R_09_Q_VINCULO"));
      });
      assert.equal(await c.contarOs(), 0, "OS órfã: a OS ficou e o vínculo não");
      assert.deepEqual(await c.orcamento(quote), { status: "draft", created_work_order_id: null });
      const { workOrderId } = await c.svc.approve(c.ator, quote, DESTINO_X);
      await c.assertReturnedWorkOrderExists(workOrderId);
      assert.equal(await c.contarOs(), 1);
    });
  });

  test("[Q2 · OS] INSERT em work_orders falha (gatilho) → rejeita, 0 OS, draft", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      await c.comGatilho("work_orders_insert", "work_orders", "BEFORE INSERT", "true", "B_O6R_09_Q_OS", async () => {
        await assert.rejects(() => c.svc.approve(c.ator, quote, DESTINO_X), injetado("B_O6R_09_Q_OS"));
      });
      assert.equal(await c.contarOs(), 0);
      assert.deepEqual(await c.orcamento(quote), { status: "draft", created_work_order_id: null });
    });
  });

  test("[Q2 · código] colisão de (tenant_id, code) entre duas aprovações de orçamentos diferentes → o perdedor rejeita e faz rollback limpo: 0 OS dele, o orçamento dele em draft, nenhum approved sem OS", async () => {
    await comCenario(connection, async (c) => {
      const qa = await c.criarOrcamento(c.catalogoComDestino);
      const qb = await c.criarOrcamento(c.catalogoComDestino);
      const chave = `b-o6r-09-codigo-${randomUUID()}`;
      await c.comTrava("work_order_events", "NEW.event_type = 'work_order_created'", chave, async (soltar) => {
        const a = captureSettled(c.svc.approve(c.ator, qa, DESTINO_X));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa no evento, com a OS gravada" });
        const b = captureSettled(c.svc.approve(c.ator, qb, DESTINO_X));
        await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: 'INSERT INTO "public"."work_orders"', label: "2ª esperando no índice (tenant_id, code)" });
        await soltar();
        const ra = await a;
        assert.equal(ra.status, "fulfilled", `a 1ª falhou: ${String((ra as any).reason?.message ?? "")}`);
        await c.assertReturnedWorkOrderExists((ra as any).value.workOrderId);
        expectRejected(await b, "o perdedor do código");
      });
      assert.equal(await c.contarOs(), 1, "o perdedor deixou OS");
      assert.deepEqual(await c.orcamento(qb), { status: "draft", created_work_order_id: null }, "o orçamento do perdedor não voltou a draft");
      const [{ n }] = await c.sql("SELECT count(*)::int AS n FROM service_quotes WHERE tenant_id = $1::uuid AND status = 'approved' AND created_work_order_id IS NULL", [c.tenantId]);
      assert.equal(n, 0, "sobrou orçamento approved sem OS");
    });
  });

  test("[Q2 · vistorias] INSERT em work_order_checklists falha (gatilho) → rejeita, 0 OS, draft; sem o gatilho, a OS nasce com a vistoria", async () => {
    await comCenario(connection, async (c) => {
      const restaurar = await c.ligarVistoriaAplicavel(c.catalogoComDestino);
      try {
        const quote = await c.criarOrcamento(c.catalogoComDestino);
        await c.comGatilho("work_order_checklists_insert", "work_order_checklists", "BEFORE INSERT", "true", "B_O6R_09_Q_VISTORIA", async () => {
          await assert.rejects(() => c.svc.approve(c.ator, quote, DESTINO_X), injetado("B_O6R_09_Q_VISTORIA"));
        });
        assert.equal(await c.contarOs(), 0);
        assert.deepEqual(await c.orcamento(quote), { status: "draft", created_work_order_id: null });
        const { workOrderId } = await c.svc.approve(c.ator, quote, DESTINO_X);
        await c.assertReturnedWorkOrderExists(workOrderId);
        const [{ n }] = await c.sql("SELECT count(*)::int AS n FROM work_order_checklists WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid", [c.tenantId, workOrderId]);
        assert.equal(n, 1, "controle: a OS do orçamento não gravou a vistoria aplicável");
      } finally {
        restaurar();
      }
    });
  });

  test("[Q1 · corrida] 2 aprovações do mesmo orçamento; a 1ª presa num gatilho de work_order_events, a 2ª bloqueada no UPDATE de service_quotes → 1 OS; a 1ª 200 e a 2ª 409 quote_already_approved com o MESMO workOrderId", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      const chave = `b-o6r-09-corrida-${randomUUID()}`;
      await c.comTrava("work_order_events", "NEW.event_type = 'work_order_created'", chave, async (soltar) => {
        const primeira = captureSettled(c.svc.approve(c.ator, quote, DESTINO_X));
        await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa no evento da OS" });
        const segunda = captureSettled(c.svc.approve(c.ator, quote, DESTINO_X));
        await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: 'UPDATE "public"."service_quotes"', label: "2ª esperando a linha do orçamento" });
        await soltar();
        const r1 = await primeira;
        assert.equal(r1.status, "fulfilled", `a 1ª falhou: ${String((r1 as any).reason?.message ?? "")}`);
        const workOrderId = (r1 as any).value.workOrderId as string;
        await c.assertReturnedWorkOrderExists(workOrderId);
        const erro = expectRejected(await segunda, "o perdedor da corrida") as any;
        assert.equal(erro.statusCode, 409, String(erro.message));
        assert.equal(erro.reason, "quote_already_approved");
        assert.equal(erro.details?.workOrderId, workOrderId, "o perdedor não recebeu o id da OS do vencedor");
      });
      assert.equal(await c.contarOs(), 1);
    });
  });

  test("[Q1 · corrida · rollback] a 1ª falha (sequência comum, só na 1ª vez) enquanto a 2ª espera → a 2ª reserva e cria; 1 OS no total", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      const chave = `b-o6r-09-corrida-rb-${randomUUID()}`;
      const sequencia = `b_o6r_09_seq_${randomUUID().replace(/-/g, "")}`;
      await c.admin.$executeRawUnsafe(`CREATE SEQUENCE ${sequencia}`);
      try {
        await c.comTrava(
          "work_order_events",
          "NEW.event_type = 'work_order_created'",
          chave,
          async (soltar) => {
            const primeira = captureSettled(c.svc.approve(c.ator, quote, DESTINO_X));
            await waitForOwnAdvisoryWaiters(c.admin, { applicationName: APP, lockKey: chave, minWaiters: 1, label: "1ª presa no evento da OS" });
            const segunda = captureSettled(c.svc.approve(c.ator, quote, DESTINO_X));
            await waitForOwnBlockedStatement(c.admin, { applicationName: APP, fragment: 'UPDATE "public"."service_quotes"', label: "2ª esperando a linha do orçamento" });
            await soltar();
            injetado("B_O6R_09_Q_1A")(expectRejected(await primeira, "a 1ª, com a falha injetada"));
            const r2 = await segunda;
            assert.equal(r2.status, "fulfilled", `a 2ª falhou: ${String((r2 as any).reason?.message ?? "")}`);
            await c.assertReturnedWorkOrderExists((r2 as any).value.workOrderId);
          },
          `IF nextval('${sequencia}') = 1 THEN RAISE EXCEPTION 'B_O6R_09_Q_1A'; END IF;`,
        );
      } finally {
        await c.admin.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS ${sequencia}`);
      }
      const [{ n }] = await c.sql("SELECT count(*)::int AS n FROM pg_class WHERE relname = $1", [sequencia]);
      assert.equal(n, 0, "a sequência sobrou no catálogo");
      assert.equal(await c.contarOs(), 1);
    });
  });

  test("[Q3] aprovar 2× → 1 OS; a 2ª → 409 quote_already_approved com details.workOrderId = o da 1ª", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      const { workOrderId } = await c.svc.approve(c.ator, quote, DESTINO_X);
      await c.assertReturnedWorkOrderExists(workOrderId);
      await assert.rejects(
        () => c.svc.approve(c.ator, quote, DESTINO_X),
        (e: any) => e.statusCode === 409 && e.reason === "quote_already_approved" && e.details?.workOrderId === workOrderId,
      );
      assert.equal(await c.contarOs(), 1);
    });
  });

  test("[Q3 · corpo diferente] aprova com destino X; repete com destino Y → 409 quote_already_approved, details.workOrderId = o da 1ª; a OS continua com o destino X; 1 OS", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoComDestino);
      const { workOrderId } = await c.svc.approve(c.ator, quote, DESTINO_X);
      await assert.rejects(
        () => c.svc.approve(c.ator, quote, DESTINO_Y),
        (e: any) => e.statusCode === 409 && e.reason === "quote_already_approved" && e.details?.workOrderId === workOrderId,
      );
      assert.equal((await c.os(workOrderId)).destination_address, DESTINO_X.destinationAddress, "a repetição mudou o destino da OS");
      assert.equal(await c.contarOs(), 1);
    });
  });

  test("[Q2 · sem destino] serviço sem destino obrigatório: aprovar sem destino → 1 OS sem destino", async () => {
    await comCenario(connection, async (c) => {
      const quote = await c.criarOrcamento(c.catalogoSemDestino);
      const { workOrderId } = await c.svc.approve(c.ator, quote, {});
      await c.assertReturnedWorkOrderExists(workOrderId);
      assert.equal((await c.os(workOrderId)).destination_address, null);
      assert.deepEqual(await c.orcamento(quote), { status: "approved", created_work_order_id: workOrderId });
    });
  });

  test("[Q4] ator da org A aprova orçamento da org B → 404; 0 OS em A e em B; orçamento de B intacto (superusuário e NOBYPASSRLS); sob NOBYPASSRLS, aprovar o próprio → 200, 1 OS", async () => {
    await comCenario(connection, async (a) => {
      await comCenario(connection, async (b) => {
        const quoteB = await b.criarOrcamento(b.catalogoComDestino);
        await assert.rejects(() => a.svc.approve(a.ator, quoteB, DESTINO_X), (e: any) => e.statusCode === 404);
        const papel = await createEphemeralRole(a.admin as never, connection);
        try {
          const svcPapel = await a.servicoSobPapel(papel.client);
          await assert.rejects(() => svcPapel.approve(a.ator, quoteB, DESTINO_X), (e: any) => e.statusCode === 404);
          assert.equal(await a.contarOs(), 0);
          assert.equal(await b.contarOs(), 0);
          assert.deepEqual(await b.orcamento(quoteB), { status: "draft", created_work_order_id: null });
          const quoteA = await a.criarOrcamento(a.catalogoComDestino);
          const { workOrderId } = await svcPapel.approve(a.ator, quoteA, DESTINO_X);
          await a.assertReturnedWorkOrderExists(workOrderId);
          assert.equal(await a.contarOs(), 1);
        } finally {
          await papel.drop();
        }
      });
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
  const [{ PrismaPg }, { PrismaClient }, { resolvePermissionsForRoles }, wo, sq, sqRepo, { Client }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/service-quotes/service-quote.service.js"),
    import("../src/modules/service-quotes/service-quote-prisma.repository.js"),
    import("pg"),
  ]);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connection, `${APP}-adm`) }) });
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `B-O6R-09 quote ${sufixo}`, slug: `b-o6r-09-quote-${sufixo}` } });
  const tenantId = tenant.id;
  assert.match(tenantId, UUID);
  const gestor = await admin.user.create({ data: { tenant_id: tenantId, name: `Gestor ${sufixo}`, email: `b-o6r-09-quote-${sufixo}@example.com` } });
  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);
  const catalogo = async (nome: string, requiresDestination: boolean): Promise<string> =>
    (await sql("INSERT INTO service_catalog (tenant_id, name, requires_destination) VALUES ($1::uuid, $2, $3) RETURNING id::text", [tenantId, nome, requiresDestination]))[0].id;
  const catalogoComDestino = await catalogo(`Reboque ${sufixo}`, true);
  const catalogoSemDestino = await catalogo(`Chaveiro ${sufixo}`, false);

  wo.resetWorkOrderRuntimeForTests();
  sq.resetServiceQuoteRuntimeForTests();
  const svc = await sq.createDefaultServiceQuoteService();
  const ator = { tenantId, userId: gestor.id, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]) } as never;

  async function comGatilho(
    rotulo: string,
    tabela: string,
    momento: "BEFORE INSERT" | "BEFORE UPDATE",
    quando: string,
    marca: string,
    corpo: () => Promise<void>,
    plpgsql = `RAISE EXCEPTION '${marca}';`,
  ): Promise<void> {
    const nome = `b_o6r_09_q_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    // Emenda 4 (R-ARN-2/R-ARN-3) — todo DDL de gatilho pelo `runHarnessDdl`; um esgotamento no DROP falha o caso e
    // preserva o erro do corpo.
    await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN ${plpgsql} RETURN NEW; END $f$`);
    let erroDoCorpo: unknown;
    try {
      await runHarnessDdl(
        admin,
        `CREATE TRIGGER ${nome} ${momento} ON ${tabela} FOR EACH ROW WHEN (NEW.tenant_id = '${tenantId}'::uuid AND (${quando})) EXECUTE FUNCTION ${nome}()`,
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
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o gatilho ${rotulo} sobrou no catálogo`);
  }

  // A trava consultiva é solta ANTES de o gatilho cair (um DROP com alguém preso no gatilho esperaria por ele).
  async function comTrava(
    tabela: string,
    quando: string,
    chave: string,
    corpo: (soltar: () => Promise<void>) => Promise<void>,
    depois = "",
  ): Promise<void> {
    const trava = new Client({ connectionString: withApplicationName(connection, `${APP}-trava`) });
    await trava.connect();
    let solta = false;
    const soltar = async () => {
      if (solta) return;
      solta = true;
      await trava.query("SELECT pg_advisory_unlock(hashtext($1))", [chave]);
    };
    try {
      await trava.query("SELECT pg_advisory_lock(hashtext($1))", [chave]);
      await comGatilho(
        `trava ${tabela}`,
        tabela,
        "BEFORE INSERT",
        quando,
        "B_O6R_09_Q_TRAVA",
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
    svc,
    ator,
    catalogoComDestino,
    catalogoSemDestino,
    sql,
    comGatilho,
    comTrava,
    async criarOrcamento(serviceCatalogId: string): Promise<string> {
      return (
        await sql(
          `INSERT INTO service_quotes (tenant_id, service_catalog_id, frozen_unit_price, frozen_total, quantity, price_source, status)
           VALUES ($1::uuid, $2::uuid, 100, 100, 1, 'manual', 'draft') RETURNING id::text`,
          [tenantId, serviceCatalogId],
        )
      )[0].id;
    },
    async servicoSobPapel(cliente: unknown) {
      return new sq.ServiceQuoteService(new sqRepo.RlsPrismaServiceQuoteRepository(cliente as never), await sq.createApplicableTariffResolver());
    },
    // A composição padrão NÃO monta `resolveApplicableChecklists` (medido: work-order.service.ts, "entre o 04c-A e o
    // 04c-B não existe rota nem permissão que crie uma regra"). Para a OS do orçamento gravar uma vistoria, o caso liga o
    // porto no serviço de OS padrão (o mesmo singleton que a aprovação usa) e o desliga no fim.
    async ligarVistoriaAplicavel(serviceCatalogId: string): Promise<() => void> {
      const template = await admin.checklistTemplate.create({ data: { tenant_id: tenantId, name: `Vistoria ${sufixo}`, type: "towing_collection", status: "published", schema: {} } });
      const regra = await admin.checklistApplicabilityRule.create({ data: { tenant_id: tenantId, template_id: template.id, service_catalog_id: serviceCatalogId, role: "collection" } });
      const ordens = (await wo.createDefaultWorkOrderService()) as any;
      const anterior = ordens.references.resolveApplicableChecklists;
      ordens.references.resolveApplicableChecklists = async () => [{ role: "collection", templateId: template.id, ruleId: regra.id }];
      return () => {
        ordens.references.resolveApplicableChecklists = anterior;
      };
    },
    async contarOs(): Promise<number> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid", [tenantId]);
      return n;
    },
    async os(workOrderId: string): Promise<Record<string, any>> {
      const [linha] = await sql("SELECT destination_address FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, workOrderId]);
      return linha;
    },
    async orcamento(quoteId: string): Promise<{ status: string; created_work_order_id: string | null }> {
      const [linha] = await sql("SELECT status, created_work_order_id::text FROM service_quotes WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, quoteId]);
      return { status: linha.status, created_work_order_id: linha.created_work_order_id };
    },
    // EM1-04 — nenhum id de OS devolvido pode ser de uma OS desfeita (OS fantasma).
    async assertReturnedWorkOrderExists(workOrderId: string): Promise<void> {
      const [{ n }] = await sql("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, workOrderId]);
      assert.equal(n, 1, `o workOrderId devolvido (${workOrderId}) não existe em work_orders (OS fantasma)`);
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
