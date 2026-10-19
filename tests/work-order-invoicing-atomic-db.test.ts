import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectAllFulfilled,
  expectRejected,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-02 — faturamento ATÔMICO e título COMPLEMENTAR sob PostgreSQL REAL.
//
// O que se prova (plano v2 §7 + emenda v2.1):
//   · K1 — título e carimbo na MESMA transação: falha injetada no carimbo → nada persiste (T-A2); dois
//     faturamentos concorrentes se serializam na trava dos itens e o 2º cobra só o delta (T-A4); um 2º ORIGINAL
//     dentro da unidade bate no índice novo e vira 409 already_invoiced com rollback (T-A4b, H2);
//   · K2 — o item apagado/editado/zerado durante o faturamento: quem vence a trava decide, e o carimbado nunca
//     é tocado (T-R1, T-R2, T-R2b, T-R4, T-Z1, T-Z2), e a ordem total (created_at, id) do `zero` remove o ciclo
//     fatura × zero (T-Z3, B3);
//   · K3/K4 — o delta vira COMPLEMENTAR (T-C1d, T-C6, T-C9d), o banco recusa o 2º original (T-C5-db) e o carimbo
//     não se sobrescreve (T-K4b);
//   · T-RLS — o serviço roda num papel efêmero SEM superusuário e SEM BYPASSRLS: o FOR UPDATE funciona sob FORCE
//     RLS (H3) e a outra organização não vê nada;
//   · T-C8d — a auditoria `work_order.invoiced` diz `complementary` e não vaza valor, parte nem organização.
//
// Arnês: VENCEDOR de corrida = conexão crua com as PEÇAS DO PRODUTO na ORDEM DO PRODUTO (contexto RLS → advisory
// SHARED → `SELECT … FOR UPDATE ORDER BY created_at, id` → …), transação aberta até a barreira e liberada logo
// depois; PERDEDOR = o serviço real, sobre o papel efêmero. Barreira escopada por `application_name`. A suíte FIXA
// CORE_SAAS_PERSISTENCE=prisma antes de importar a aplicação e ASSERTA o modo. Organização descartável por teste,
// teardown escopado em ordem de FK, papel efêmero pelo arnês compartilhado.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("invoice-atomic");

const FINANCE_PERMISSIONS = [
  "work_order_financials:read",
  "work_order_financials:create",
  "work_order_financials:update",
  "financial_titles:read",
  "financial_titles:create",
  "financial_titles:update",
  "financial_titles:delete",
  "work_orders:read",
];

type Actor = { tenantId: string; userId: string; roles: string[]; permissions: string[] };
type Seed = { tenantId: string; userId: string; workOrderId: string; actor: Actor };

if (!connectionString) {
  test("B-SAN3-02 (faturamento atômico sob Postgres) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação: o modo e a tag da suíte (src/database/prisma.ts lê a URL no import).
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  before(async () => {
    await bootstrap(connection);
  });
  after(async () => {
    await harness?.close();
  });

  // ---------------------------------------------------------------- K1

  test("[T-A2] falha injetada no carimbo sob Postgres → nenhum título, nenhum carimbo, nenhum órfão", async () => {
    const t = await seed("a2");
    await addItem(t, 100);
    await addItem(t, 20);
    const invoicing = h.invoicingWith(
      h.wrapUow((ctx) => ({
        ...ctx,
        workOrderItems: override(ctx.workOrderItems, {
          markInvoiced: async () => {
            throw new Error("falha injetada no carimbo");
          },
        }),
      })),
    );
    await assert.rejects(() => invoicing.invoice(t.actor, t.workOrderId, {}), /falha injetada no carimbo/);
    assert.equal(await titleCount(t), 0, "nenhum título do tenant");
    assert.deepEqual(await stampState(t), { stamped: 0, withTitle: 0, active: 2 });
  });

  test("[T-A4] dois faturamentos concorrentes da mesma OS: o 1º cria o ORIGINAL, o 2º espera a trava e cobra SÓ o delta como COMPLEMENTAR", async () => {
    const t = await seed("a4");
    const i1 = await addItem(t, 100);
    const period = h.deriveCompetencia(new Date());
    const gate = barrierGate();
    let i2: string | undefined;
    let t1: string | undefined;
    const winner = captureSettled(
      h.admin.$transaction(
        async (tx: any) => {
          await h.setTenantRlsContext(tx, t.tenantId);
          await h.acquirePeriodLockShared(tx, t.tenantId, period);
          await lockInvoiceable(tx, t);
          gate.ready();
          await gate.mayGo;
          const title = await new h.PrismaFinancialTitleRepository(tx).create(titleInput(t, 100, period));
          t1 = title.id;
          const stamped = await new h.PrismaWorkOrderFinancialItemRepository(tx).markInvoiced({
            tenantId: t.tenantId,
            workOrderId: t.workOrderId,
            itemIds: [i1],
            titleId: title.id,
            invoicedAt: new Date(),
          });
          assert.equal(stamped, 1);
        },
        { timeout: 30000, maxWait: 10000 },
      ),
    );
    await gate.isReady;
    // 3ª conexão: o item NOVO entra (autocommit) enquanto o vencedor segura i1.
    i2 = await addItem(t, 35);
    let loserSettled = false;
    const loser = captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {})).then((outcome) => {
      loserSettled = true;
      return outcome;
    });
    await waitForOwnBlockedStatement(h.admin, {
      applicationName,
      fragment: "work_order_financial_items",
      label: "perdedor bloqueado no FOR UPDATE dos itens",
    });
    assert.equal(loserSettled, false, "o perdedor TEM de estar bloqueado na trava dos itens");
    gate.go();
    expectAllFulfilled([await winner], "transação do vencedor");
    const outcome = await loser;
    assert.equal(outcome.status, "fulfilled", `perdedor: ${String((outcome as any).reason?.message ?? "")} ${String((outcome as any).reason?.reason ?? "")}`);
    const result = (outcome as any).value;
    assert.equal(result.parentTitleId, t1, "o 2º é COMPLEMENTAR do original que o 1º acabou de commitar");
    assert.equal(result.title.parentTitleId, t1);
    assert.equal(result.invoicedItemCount, 1);
    assert.equal(result.totalAmount, 35);
    const items = await itemRows(t);
    assert.equal(items.find((r) => r.id === i1)?.title_id, t1);
    assert.equal(items.find((r) => r.id === i2)?.title_id, result.title.id);
    assert.equal(await titleCount(t), 2);
    const original = await titleRow(t1!);
    assert.equal(Number(original.amount), 100, "o original não muda");
  });

  test("[T-A4b] decisão podre na unidade (2º ORIGINAL tentado) → P2002 do índice novo → 409 already_invoiced e NADA persiste (H2)", async () => {
    const t = await seed("a4b");
    await addItem(t, 100);
    const first = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const i2 = await addItem(t, 7);
    const invoicing = h.invoicingWith(
      h.wrapUow((ctx) => ({
        ...ctx,
        titles: override(ctx.titles, { findActiveByWorkOrder: async () => undefined }),
      })),
    );
    await assert.rejects(() => invoicing.invoice(t.actor, t.workOrderId, {}), hasReason(409, "already_invoiced"));
    assert.equal(await titleCount(t), 1);
    const items = await itemRows(t);
    assert.equal(items.find((r) => r.id === i2)?.invoiced_at, null, "o item do delta segue sem carimbo");
    assert.equal((await titleRow(first.title.id)).id, first.title.id);
  });

  // ---------------------------------------------------------------- K2

  test("[T-R1] faturamento vence a trava: o DELETE concorrente do item sai 422 item_invoiced e o item fica carimbado", async () => {
    const t = await seed("r1");
    const i1 = await addItem(t, 50);
    const outcome = await raceAgainstInvoiceWinner(t, [i1], 50, () => h.financials.delete(t.actor, t.workOrderId, i1));
    assert.equal(isDomainError(expectRejected(outcome, "DELETE perdedor"), 422, "item_invoiced"), true);
    const row = (await itemRows(t)).find((r) => r.id === i1)!;
    assert.equal(row.deleted_at, null, "o item carimbado NÃO foi apagado");
    assert.notEqual(row.invoiced_at, null);
    const titles = await titleRows(t);
    assert.equal(titles.length, 1);
    assert.equal(Number(titles[0].amount), 50, "o título bate com o lastro");
  });

  test("[T-R2] DELETE vence: o faturamento espera a trava e cobra Σ SEM o item apagado (n−1)", async () => {
    const t = await seed("r2");
    const i1 = await addItem(t, 40);
    const i2 = await addItem(t, 60);
    const outcome = await raceAgainstDeleteWinner(t, i1, () => h.invoicing.invoice(t.actor, t.workOrderId, {}));
    assert.equal(outcome.status, "fulfilled", `faturamento: ${describe(outcome)}`);
    const result = (outcome as any).value;
    assert.equal(result.totalAmount, 60);
    assert.equal(result.invoicedItemCount, 1);
    assert.equal(Number((await titleRow(result.title.id)).amount), 60);
    const items = await itemRows(t);
    assert.equal(items.find((r) => r.id === i1)?.invoiced_at, null, "o apagado ficou sem carimbo");
    assert.equal(items.find((r) => r.id === i2)?.title_id, result.title.id);
  });

  test("[T-R2b] DELETE do ÚNICO item vence: o faturamento sai 422 nothing_to_invoice e nenhum título nasce", async () => {
    const t = await seed("r2b");
    const i1 = await addItem(t, 40);
    const outcome = await raceAgainstDeleteWinner(t, i1, () => h.invoicing.invoice(t.actor, t.workOrderId, {}));
    assert.equal(isDomainError(expectRejected(outcome, "faturamento perdedor"), 422, "nothing_to_invoice"), true, describe(outcome));
    assert.equal(await titleCount(t), 0);
  });

  test("[T-R4] faturamento vence a trava: o PATCH concorrente sai 422 item_invoiced e o total do item não muda", async () => {
    const t = await seed("r4");
    const i1 = await addItem(t, 50);
    const outcome = await raceAgainstInvoiceWinner(t, [i1], 50, () => h.financials.update(t.actor, t.workOrderId, i1, { quantity: 3 }));
    assert.equal(isDomainError(expectRejected(outcome, "PATCH perdedor"), 422, "item_invoiced"), true, describe(outcome));
    const row = (await itemRows(t)).find((r) => r.id === i1)!;
    assert.equal(Number(row.total_amount), 50);
    assert.equal(Number(row.quantity), 1);
    assert.equal(Number((await titleRows(t))[0].amount), 50);
  });

  test("[T-Z1] faturamento vence; cancel(zero) espera na MESMA ordem de travas e apaga 0 (os carimbados ficam); sem 40P01", async () => {
    const t = await seed("z1");
    const i1 = await addItem(t, 10);
    const i2 = await addItem(t, 20);
    const outcome = await raceAgainstInvoiceWinner(t, [i1, i2], 30, () => h.financials.zeroActiveItems(t.actor, t.workOrderId));
    assert.equal(outcome.status, "fulfilled", `zero: ${describe(outcome)}`);
    assert.equal((outcome as any).value, 0, "o zero re-avaliou: carimbados ficam fora");
    for (const row of await itemRows(t)) {
      assert.equal(row.deleted_at, null);
      assert.notEqual(row.invoiced_at, null);
    }
  });

  test("[T-Z2] cancel(zero) vence; o faturamento espera e sai 422 nothing_to_invoice; sem 40P01", async () => {
    const t = await seed("z2");
    await addItem(t, 10);
    await addItem(t, 20);
    const gate = barrierGate();
    const winner = captureSettled(
      h.admin.$transaction(
        async (tx: any) => {
          await h.setTenantRlsContext(tx, t.tenantId);
          const ids = await lockInvoiceable(tx, t);
          gate.ready();
          await gate.mayGo;
          await tx.$executeRaw`UPDATE work_order_financial_items SET deleted_at = now() WHERE id = ANY(${ids}::uuid[])`;
        },
        { timeout: 30000, maxWait: 10000 },
      ),
    );
    await gate.isReady;
    const loser = captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {}));
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "work_order_financial_items", label: "faturamento bloqueado atrás do zero" });
    gate.go();
    expectAllFulfilled([await winner], "zero vencedor");
    const outcome = await loser;
    assert.equal(isDomainError(expectRejected(outcome, "faturamento perdedor"), 422, "nothing_to_invoice"), true, describe(outcome));
    assert.equal(await titleCount(t), 0);
  });

  test("[T-Z3] ordem total do zero: com i1 movido para o fim do heap, o vencedor trava só i1; o zero espera em i1 (não em i2); sem 40P01/503", async () => {
    const t = await seed("z3");
    const i1 = await addItem(t, 10);
    const i2 = await addItem(t, 20);
    // PATCH em i1: a versão viva vai para o FIM do heap (premissa (b) do B3 — uma varredura sem ordem visita i2 antes).
    await h.admin.$executeRaw`UPDATE work_order_financial_items SET notes = 'move-para-o-fim' WHERE id = ${i1}::uuid`;
    const period = h.deriveCompetencia(new Date());
    const gate = barrierGate();
    const winner = captureSettled(
      h.admin.$transaction(
        async (tx: any) => {
          await h.setTenantRlsContext(tx, t.tenantId);
          await h.acquirePeriodLockShared(tx, t.tenantId, period);
          await tx.$queryRaw`SELECT id FROM work_order_financial_items WHERE id = ${i1}::uuid FOR UPDATE`;
          gate.ready();
          await gate.mayGo;
          await tx.$queryRaw`SELECT id FROM work_order_financial_items WHERE id = ${i2}::uuid FOR UPDATE`;
          const title = await new h.PrismaFinancialTitleRepository(tx).create(titleInput(t, 30, period));
          await new h.PrismaWorkOrderFinancialItemRepository(tx).markInvoiced({
            tenantId: t.tenantId,
            workOrderId: t.workOrderId,
            itemIds: [i1, i2],
            titleId: title.id,
            invoicedAt: new Date(),
          });
        },
        { timeout: 30000, maxWait: 10000 },
      ),
    );
    await gate.isReady;
    const loser = captureSettled(h.financials.zeroActiveItems(t.actor, t.workOrderId));
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "work_order_financial_items", label: "zero bloqueado na 1ª linha da ordem total" });
    gate.go();
    const [w, l] = [await winner, await loser];
    const codes = [w, l].filter((o) => o.status === "rejected").map((o) => describe(o));
    assert.deepEqual(codes, [], "nenhum 40P01/P2034/503 em nenhuma conexão (a ordem total remove o ciclo)");
    assert.equal((l as any).value, 0, "o zero re-avaliou: os dois carimbados ficam fora");
    for (const row of await itemRows(t)) {
      assert.equal(row.deleted_at, null);
      assert.notEqual(row.invoiced_at, null);
    }
  });

  // ---------------------------------------------------------------- K3 / K4

  test("[T-C1d] o delta sob Postgres: 201 COMPLEMENTAR com parent_title_id = original; o original intacto", async () => {
    const t = await seed("c1d");
    await addItem(t, 300);
    const first = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const before = await titleRow(first.title.id);
    const i2 = await addItem(t, 45.5);
    const second = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    assert.equal(second.parentTitleId, first.title.id);
    const row = await titleRow(second.title.id);
    assert.equal(row.parent_title_id, first.title.id);
    assert.equal(Number(row.amount), 45.5);
    const after = await titleRow(first.title.id);
    assert.equal(Number(after.amount), Number(before.amount));
    assert.equal(after.status, before.status);
    assert.equal(Number(after.paid_amount), Number(before.paid_amount));
    assert.equal(after.updated_at.getTime(), before.updated_at.getTime(), "o original não foi tocado");
    assert.equal((await itemRows(t)).find((r) => r.id === i2)?.title_id, second.title.id);
  });

  test("[T-C6] dois complementares ativos convivem com o original (sem 23505)", async () => {
    const t = await seed("c6");
    await addItem(t, 10);
    const t1 = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    await addItem(t, 20);
    await h.invoicing.invoice(t.actor, t.workOrderId, {});
    await addItem(t, 30);
    const t3 = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    assert.equal(t3.parentTitleId, t1.title.id);
    const rows = (await titleRows(t)).filter((r) => r.deleted_at === null);
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.parent_title_id === t1.title.id).length, 2);
  });

  test("[T-C5-db] backstop do banco: INSERT cru de um 2º ORIGINAL ativo da mesma OS → 23505 no índice de originais", async () => {
    const t = await seed("c5db");
    await addItem(t, 10);
    await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const error = await rawInsertTitle(t, null).then(
      () => undefined,
      (e: unknown) => e,
    );
    assert.ok(error, "o 2º original tinha de ser recusado pelo banco");
    const text = flatten(error);
    assert.match(text, /23505|P2010|unique/i, `esperado unique_violation: ${text.slice(0, 300)}`);
    assert.match(text, /financial_titles_wo_direction_original_active_key|tenant_id.*work_order_id.*direction/i, text.slice(0, 400));
  });

  test("[T-C9d] original removido COM complementar ativo + item novo → nasce ORIGINAL e a linha cai sob o predicado do índice", async () => {
    const t = await seed("c9d");
    await addItem(t, 40);
    const t1 = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    await addItem(t, 10);
    const t2 = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    await h.titleService.delete(t.actor, t1.title.id);
    await addItem(t, 7);
    const t3 = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    assert.equal(t3.parentTitleId, undefined);
    assert.equal((await titleRow(t3.title.id)).parent_title_id, null);
    const rows = (await h.admin.$queryRaw`
      SELECT count(*)::int AS n FROM financial_titles
       WHERE tenant_id = ${t.tenantId}::uuid AND work_order_id = ${t.workOrderId}::uuid
         AND deleted_at IS NULL AND parent_title_id IS NULL
    `) as Array<{ n: number }>;
    assert.equal(rows[0]?.n, 1, "exatamente um original ativo");
    assert.equal((await titleRow(t2.title.id)).parent_title_id, t1.title.id, "T2 segue apontando o T1 removido");
  });

  test("[T-K4b] o carimbo não se sobrescreve: markInvoiced num item já carimbado por outro título devolve 0 e mantém o title_id", async () => {
    const t = await seed("k4b");
    const i1 = await addItem(t, 10);
    const first = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const other = await rawInsertTitle(t, first.title.id);
    const count = await h.itemRepo.markInvoiced({
      tenantId: t.tenantId,
      workOrderId: t.workOrderId,
      itemIds: [i1],
      titleId: other,
      invoicedAt: new Date(),
    });
    assert.equal(count, 0);
    assert.equal((await itemRows(t)).find((r) => r.id === i1)?.title_id, first.title.id);
  });

  // ---------------------------------------------------------------- transversais

  test("[T-RLS] o serviço roda num papel SEM superusuário/BYPASSRLS; o FOR UPDATE funciona sob FORCE RLS; a outra organização não vê nada", async () => {
    const rows = (await h.role.client.$queryRaw`
      SELECT r.rolsuper AS "super", r.rolbypassrls AS "bypass" FROM pg_roles r WHERE r.rolname = current_user
    `) as Array<{ super: boolean; bypass: boolean }>;
    assert.deepEqual(rows[0], { super: false, bypass: false }, "postura do papel que executa a unidade de faturamento");
    await assertApplicationNamePropagated(h.role.client, applicationName);

    const a = await seed("rls-a");
    const b = await seed("rls-b");
    await addItem(a, 10);
    await h.invoicing.invoice(a.actor, a.workOrderId, {});
    await addItem(a, 5);
    const comp = await h.invoicing.invoice(a.actor, a.workOrderId, {});
    assert.ok(comp.parentTitleId, "H3: o FOR UPDATE sob o papel sem bypass travou e faturou o delta");
    await addItem(a, 3);

    // OS de A faturada pelo ator de B → 404, e nada tocado.
    const beforeA = JSON.stringify(await itemRows(a));
    await assert.rejects(() => h.invoicing.invoice(b.actor, a.workOrderId, {}), hasReason(404, "work_order_not_found"));
    assert.equal(JSON.stringify(await itemRows(a)), beforeA);
    assert.equal(await titleCount(b), 0);
    assert.equal(await titleCount(a), 2);

    // Sob o contexto RLS de B, o original/complementar e os itens de A somem (FORCE RLS efetivo no papel).
    const seen = await h.roleUow.run(b.tenantId, async (ctx: any) => ({
      original: await ctx.titles.findActiveByWorkOrder(a.tenantId, a.workOrderId, "receivable"),
      complementary: await ctx.titles.findById(a.tenantId, comp.title.id),
      locked: await ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate(a.tenantId, a.workOrderId),
    }));
    assert.deepEqual(seen, { original: undefined, complementary: undefined, locked: [] });
    const control = await h.roleUow.run(a.tenantId, async (ctx: any) => ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate(a.tenantId, a.workOrderId));
    assert.equal(control.length, 1, "controle: sob a própria organização o item a faturar aparece (e trava)");
  });

  test("[T-C8d] auditoria work_order.invoiced do complementar: complementary=true e SEM amount/party_name/tenant", async () => {
    const t = await seed("c8d");
    await addItem(t, 10);
    await h.invoicing.invoice(t.actor, t.workOrderId, {});
    await addItem(t, 4);
    const controller = new h.WorkOrderFinancialController(async () => h.financials, async () => h.invoicing);
    const request: any = {
      params: { workOrderId: t.workOrderId },
      body: {},
      headers: {},
      tenantContext: { tenantId: t.tenantId, userId: t.userId, roles: ["finance"], permissions: FINANCE_PERMISSIONS },
      get: () => undefined,
      header: () => undefined,
      ip: "127.0.0.1",
      log: { warn: () => undefined },
    };
    const response = await controller.invoice(request);
    assert.equal(response.status, 201);
    const logs = (await h.admin.$queryRaw`
      SELECT action, metadata FROM audit_logs WHERE tenant_id = ${t.tenantId}::uuid AND action = 'work_order.invoiced'
    `) as Array<{ action: string; metadata: Record<string, unknown> }>;
    assert.equal(logs.length, 1, "uma auditoria do faturamento complementar");
    const text = JSON.stringify(logs[0].metadata);
    assert.match(text, /"complementary":true/, text);
    for (const forbidden of ["amount", "party_name", "partyName", "tenant", "invoicedTotal", "totalAmount"]) {
      assert.equal(text.includes(forbidden), false, `a auditoria não pode carregar ${forbidden}: ${text}`);
    }
  });
}

// ---------------------------------------------------------------- arnês

type Harness = Awaited<ReturnType<typeof bootstrap>>;
let harness: Harness | undefined;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    { acquirePeriodLockShared },
    titles,
    titlePrisma,
    itemPrisma,
    financialService,
    uowPrisma,
    { createDefaultWorkOrderService },
    { createPrismaApplicableTariffResolver },
    { WorkOrderFinancialController },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/work-order-financials/work-order-financial-prisma.repository.js"),
    import("../src/modules/work-order-financials/work-order-financial.service.js"),
    import("../src/modules/financial-uow/financial-uow-prisma.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/service-quotes/service-quote.service.js"),
    import("../src/modules/work-order-financials/work-order-financial.controller.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "assert do modo: esta suíte só é prova no caminho prisma");

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(admin, applicationName);
  const role: EphemeralRole = await createEphemeralRole(admin as any, connection);
  const roleClient = role.client as any;

  const itemRepo = new itemPrisma.RlsPrismaWorkOrderFinancialItemRepository(roleClient);
  const roleUow = new uowPrisma.PrismaFinancialUnitOfWork(roleClient);
  const workOrderService = await createDefaultWorkOrderService();
  const invoicingWith = (resolveUow: () => Promise<any>) => new financialService.WorkOrderInvoicingService(itemRepo, resolveUow);
  const tenantIds: string[] = [];

  const built = {
    admin: admin as any,
    role,
    roleUow,
    itemRepo,
    invoicing: invoicingWith(async () => roleUow),
    invoicingWith,
    wrapUow: (mutate: (ctx: any) => any) => async () => ({
      run: (tenantId: string, work: (ctx: any) => Promise<unknown>) => roleUow.run(tenantId, (ctx: any) => work(mutate(ctx))),
    }),
    financials: new financialService.WorkOrderFinancialService(itemRepo, workOrderService, await createPrismaApplicableTariffResolver()),
    titleService: await titles.createDefaultFinancialTitleService(),
    deriveCompetencia: titles.deriveCompetencia as (date: Date) => string,
    setTenantRlsContext,
    withTenantRls,
    acquirePeriodLockShared,
    PrismaFinancialTitleRepository: titlePrisma.PrismaFinancialTitleRepository,
    PrismaWorkOrderFinancialItemRepository: itemPrisma.PrismaWorkOrderFinancialItemRepository,
    WorkOrderFinancialController,
    tenantIds,
    async close(): Promise<void> {
      try {
        for (const tenantId of tenantIds) {
          await admin.$executeRawUnsafe("DELETE FROM work_order_financial_items WHERE tenant_id = $1::uuid", tenantId);
          // Complementares antes dos originais (a FK do pai é RESTRICT).
          await admin.$executeRawUnsafe("DELETE FROM financial_titles WHERE tenant_id = $1::uuid AND parent_title_id IS NOT NULL", tenantId);
          for (const table of ["financial_entries", "financial_titles", "financial_period_closes", "audit_logs", "cloud_usage_events", "work_orders", "users"]) {
            await admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
          }
          await admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
        }
      } finally {
        await role.drop();
        await admin.$disconnect();
      }
    },
  };
  harness = built;
  return built;
}

function hx(): Harness {
  assert.ok(harness, "arnês não inicializado");
  return harness;
}

// Atalho dos testes e helpers: o arnês do arquivo, criado no `before`.
const h = new Proxy({} as Harness, { get: (_target, property) => (hx() as any)[property] });

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seed(tag: string): Promise<Seed> {
  const marca = `${tag}-${suffix()}`;
  const tenant = await h.admin.tenant.create({ data: { name: `Faturamento ${marca}`, slug: `invoice-${marca}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.admin, tenant.id, (tx: any) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro faturamento", email: `invoice-${marca}@example.com` } }),
  );
  const workOrder = await h.admin.workOrder.create({
    data: { tenant_id: tenant.id, code: `WO-${marca}`, title: `OS ${marca}`, customer_name: "Cliente Alfa" },
  });
  return {
    tenantId: tenant.id,
    userId: user.id,
    workOrderId: workOrder.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance"], permissions: FINANCE_PERMISSIONS },
  };
}

async function addItem(t: Seed, amount: number): Promise<string> {
  const item = await h.admin.workOrderFinancialItem.create({
    data: {
      tenant_id: t.tenantId,
      work_order_id: t.workOrderId,
      description: `Item ${amount}`,
      quantity: 1,
      unit_amount: amount,
      total_amount: amount,
      currency: "BRL",
      source: "manual",
    },
  });
  return item.id as string;
}

function titleInput(t: Seed, amount: number, period: string) {
  const now = new Date();
  return {
    tenantId: t.tenantId,
    direction: "receivable",
    partyType: "customer",
    partyName: "Cliente Alfa",
    amount,
    currency: "BRL",
    issueDate: now,
    dueDate: now,
    status: "open",
    competencia: period,
    workOrderId: t.workOrderId,
  };
}

/** As peças do produto, na ordem do produto: o FOR UPDATE ordenado dos itens faturáveis. */
async function lockInvoiceable(tx: any, t: Seed): Promise<string[]> {
  const rows = (await tx.$queryRaw`
    SELECT id FROM work_order_financial_items
     WHERE tenant_id = ${t.tenantId}::uuid AND work_order_id = ${t.workOrderId}::uuid
       AND deleted_at IS NULL AND invoiced_at IS NULL
     ORDER BY created_at, id
       FOR UPDATE
  `) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

/** Vencedor = faturamento cru (advisory → FOR UPDATE → título → carimbo) segurado na barreira; perdedor = `loser()`. */
async function raceAgainstInvoiceWinner(t: Seed, itemIds: string[], amount: number, loser: () => Promise<unknown>) {
  const period = h.deriveCompetencia(new Date());
  const gate = barrierGate();
  const winner = captureSettled(
    h.admin.$transaction(
      async (tx: any) => {
        await h.setTenantRlsContext(tx, t.tenantId);
        await h.acquirePeriodLockShared(tx, t.tenantId, period);
        const locked = await lockInvoiceable(tx, t);
        assert.deepEqual([...locked].sort(), [...itemIds].sort());
        const title = await new h.PrismaFinancialTitleRepository(tx).create(titleInput(t, amount, period));
        const stamped = await new h.PrismaWorkOrderFinancialItemRepository(tx).markInvoiced({
          tenantId: t.tenantId,
          workOrderId: t.workOrderId,
          itemIds,
          titleId: title.id,
          invoicedAt: new Date(),
        });
        assert.equal(stamped, itemIds.length);
        gate.ready();
        await gate.mayGo;
      },
      { timeout: 30000, maxWait: 10000 },
    ),
  );
  await gate.isReady;
  let settled = false;
  const outcome = captureSettled(loser()).then((o) => {
    settled = true;
    return o;
  });
  await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "work_order_financial_items", label: "perdedor bloqueado atrás do faturamento" });
  assert.equal(settled, false, "o perdedor TEM de estar bloqueado na linha travada pelo faturamento");
  gate.go();
  expectAllFulfilled([await winner], "faturamento vencedor");
  return outcome;
}

/** Vencedor = DELETE lógico cru do item, segurado na barreira; perdedor = `loser()` (o faturamento real). */
async function raceAgainstDeleteWinner(t: Seed, itemId: string, loser: () => Promise<unknown>) {
  const gate = barrierGate();
  const winner = captureSettled(
    h.admin.$transaction(
      async (tx: any) => {
        await h.setTenantRlsContext(tx, t.tenantId);
        await tx.$executeRaw`UPDATE work_order_financial_items SET deleted_at = now() WHERE id = ${itemId}::uuid AND deleted_at IS NULL AND invoiced_at IS NULL`;
        gate.ready();
        await gate.mayGo;
      },
      { timeout: 30000, maxWait: 10000 },
    ),
  );
  await gate.isReady;
  let settled = false;
  const outcome = captureSettled(loser()).then((o) => {
    settled = true;
    return o;
  });
  await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "work_order_financial_items", label: "faturamento bloqueado atrás do DELETE" });
  assert.equal(settled, false, "o faturamento TEM de estar bloqueado atrás do DELETE");
  gate.go();
  expectAllFulfilled([await winner], "DELETE vencedor");
  return outcome;
}

function barrierGate() {
  let ready!: () => void;
  let go!: () => void;
  const isReady = new Promise<void>((resolve) => (ready = resolve));
  const mayGo = new Promise<void>((resolve) => (go = resolve));
  return { ready, go, isReady, mayGo };
}

async function rawInsertTitle(t: Seed, parentTitleId: string | null): Promise<string> {
  const period = h.deriveCompetencia(new Date());
  const rows = (await h.admin.$queryRaw`
    INSERT INTO financial_titles (tenant_id, direction, party_type, party_name, amount, currency, issue_date, due_date,
                                  paid_amount, status, competencia, work_order_id, parent_title_id)
    VALUES (${t.tenantId}::uuid, 'receivable', 'customer', 'Cru', 1, 'BRL', now(), now(), 0, 'open', ${period},
            ${t.workOrderId}::uuid, ${parentTitleId}::uuid)
    RETURNING id
  `) as Array<{ id: string }>;
  return rows[0]!.id;
}

async function titleCount(t: Seed): Promise<number> {
  return h.admin.financialTitle.count({ where: { tenant_id: t.tenantId } });
}

async function titleRows(t: Seed): Promise<any[]> {
  return h.admin.financialTitle.findMany({ where: { tenant_id: t.tenantId }, orderBy: [{ created_at: "asc" }] });
}

async function titleRow(id: string): Promise<any> {
  const row = await h.admin.financialTitle.findUnique({ where: { id } });
  assert.ok(row, `título ${id} não encontrado`);
  return row;
}

async function itemRows(t: Seed): Promise<any[]> {
  return h.admin.workOrderFinancialItem.findMany({ where: { tenant_id: t.tenantId }, orderBy: [{ created_at: "asc" }, { id: "asc" }] });
}

async function stampState(t: Seed) {
  const rows = await itemRows(t);
  return {
    stamped: rows.filter((r) => r.invoiced_at !== null).length,
    withTitle: rows.filter((r) => r.title_id !== null).length,
    active: rows.filter((r) => r.deleted_at === null).length,
  };
}

function override<T extends object>(target: T, members: Record<string, (...args: never[]) => unknown>): T {
  return new Proxy(target, {
    get(obj, property, receiver) {
      if (typeof property === "string" && property in members) return members[property];
      const member = Reflect.get(obj, property, receiver);
      return typeof member === "function" ? member.bind(obj) : member;
    },
  });
}

function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

function hasReason(statusCode: number, reason: string) {
  return (error: unknown) => isDomainError(error, statusCode, reason);
}

function flatten(error: unknown): string {
  try {
    return `${String((error as Error)?.message ?? "")} ${JSON.stringify(error, Object.getOwnPropertyNames(error as object))}`;
  } catch {
    return String(error);
  }
}

function describe(outcome: { status: string; reason?: unknown }): string {
  if (outcome.status !== "rejected") return "fulfilled";
  const reason = outcome.reason as { statusCode?: unknown; reason?: unknown; code?: unknown; message?: unknown };
  return `${String(reason?.statusCode ?? "")}/${String(reason?.reason ?? "")}/${String(reason?.code ?? "")}: ${flatten(reason).slice(0, 300)}`;
}
