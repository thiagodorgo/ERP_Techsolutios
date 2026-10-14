import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectRejected,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-03a (Ω6R-DIN-009) — T-A: o sync de despesas sob PostgreSQL REAL, com o serviço rodando em papéis
// efêmeros SEM superusuário e SEM BYPASSRLS (o único arranjo em que o RLS existe), duas conexões e barreira
// causal escopada por `application_name` (nunca sleep para ordenar transações).
//
// O que se prova (plano v2 §3 + emenda v3 + D-03a-MESMA-CHAVE-OUTRO-ATOR = A):
//   · claim como primeira escrita, efeito + recibo + eventos no MESMO commit, para os três tipos (A1–A2c, A5, A6);
//   · a mesma ação é UMA só, por organização + id, e pertence a quem a enviou primeiro (A3′, A3c, A11b′, A12′);
//   · replay só é aceito com prova do MESMO ator no agregado ORIGINAL (A4, A4b, A12b, A13);
//   · recibo legado (chave crua, sem prova de payload) nunca produz efeito novo, nas 4 formas de id (A11, A11c, A11d);
//   · UUID canônico aceito e FK de work order → 404 sem mascarar outras FKs (A7, A7b);
//   · isolamento entre organizações, 503 para transitórios, 400 antes de qualquer transação (A8, A9, A10);
//   · a chave interna é determinística: reconhecida por OUTRO processo, depois de um reinício (A15).
//
// Disciplina: organização descartável por teste, asserções ESCOPADAS ao tenant do teste, teardown escopado em
// ordem de FK, papéis efêmeros pelo arnês compartilhado (o único escritor de catálogo, dentro do lock dele).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("expense-sync-atomic");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SYNC = "expense_report.synced_from_mobile";
const TECH = ["expense_report:read_own", "expense_report:create", "expense_report:update", "expense_report:submit", "expense_sync:write"];
const MANAGER = ["expense_report:read", ...TECH];

type Actor = { tenantId: string; userId: string; roles: never[]; permissions: string[] };
type SyncAction = { clientActionId: string; type: string; payload: Record<string, unknown>; [extra: string]: unknown };
type SyncResult = { clientActionId: string; type: string; status: string; resultRef?: string; replayed: boolean; errorCode: string | null };
type Hook = {
  readonly method: string;
  readonly when: "before" | "after";
  readonly applies?: (args: unknown[]) => boolean;
  readonly run: (args: unknown[]) => Promise<void> | void;
};

if (!connectionString) {
  test("B-O6R-03a T-A exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  let h: Harness;

  before(async () => {
    h = await bootstrap(connection);
    harnessRef.current = h;
  });

  after(async () => {
    await h?.close();
  });

  test("A0 · arnês: o serviço roda em papéis sem superusuário nem BYPASSRLS, a tag da suíte chega e o RLS esconde a outra organização", async () => {
    for (const client of [h.serviceClientA, h.serviceClientB]) {
      const rows = (await client.$queryRaw`
        SELECT r.rolsuper AS "super", r.rolbypassrls AS "bypass" FROM pg_roles r WHERE r.rolname = current_user
      `) as Array<{ super: boolean; bypass: boolean }>;
      assert.deepEqual(rows[0], { super: false, bypass: false }, "postura do papel que executa o serviço: sem superusuário e sem BYPASSRLS");
      await assertApplicationNamePropagated(client, applicationName);
    }

    const t1 = await seedTenant("a0-1");
    const t2 = await seedTenant("a0-2");
    const first = await sync(h.serviceA, t1.tech1, [createAction("a0-x")]);
    assert.equal(first[0]?.status, "processed");

    const visibleUnder = async (gucTenant: string) =>
      h.serviceClientA.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${gucTenant}, true)`;
        const rows = (await tx.$queryRaw`SELECT count(*)::int AS n FROM mobile_action_receipts WHERE tenant_id = ${t1.tenantId}::uuid`) as Array<{ n: number }>;
        return rows[0]?.n;
      });
    assert.equal(await visibleUnder(t1.tenantId), 1, "controle: sob a própria organização o recibo aparece");
    assert.equal(await visibleUnder(t2.tenantId), 0, "sob o contexto de OUTRA organização o recibo some (RLS FORCE efetivo no papel)");
  });

  test("A1 · mesma ação, mesmo ator, concorrente: B bloqueia na PK, A confirma; um efeito, um replay com o mesmo resultado, sem 25P02/40P01", async () => {
    const t = await seedTenant("a1");
    const gate = pauseAfterClaim();
    const faulty = h.faultyService(h.serviceClientA, [gate.hook]);
    const action = createAction(randomUUID());

    const a = captureSettled(sync(faulty, t.tech1, [action]));
    await reachedClaim(gate.claimed, a, "A");
    let bSettled = false;
    const b = captureSettled(sync(h.serviceB, t.tech1, [action])).then((outcome) => {
      bSettled = true;
      return outcome;
    });
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "mobile_action_receipts", label: "B bloqueado na PK do claim de A" });
    assert.equal(bSettled, false, "B tem de estar BLOQUEADO na PK enquanto A não confirma");
    gate.release();

    const [ra, rb] = [await a, await b];
    assert.equal(ra.status, "fulfilled", `A: ${String((ra as any).reason?.message)}`);
    assert.equal(rb.status, "fulfilled", `B (perdedor relê FORA da transação abortada — sem 25P02): ${String((rb as any).reason?.message)}`);
    const results = [(ra as any).value[0], (rb as any).value[0]] as SyncResult[];
    assert.deepEqual(results.map((r) => r.replayed).sort(), [false, true], "exatamente um não-replay e um replay");
    assert.equal(results[0].resultRef, results[1].resultRef, "o mesmo resultado");
    assert.deepEqual(results.map((r) => [r.status, r.errorCode]), [["processed", null], ["processed", null]]);
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts, c.k2t, c.sync_events], [1, 1, 1, 1], "um efeito, um recibo K2t, um evento de prova");
  });

  test("A2 · falha DEPOIS do efeito e antes de completar o recibo — create, item e submit: nada persiste; o retry executa uma vez", async () => {
    for (const kind of ["create", "item", "submit"] as const) {
      await crashScenario(kind, { method: "completeMobileActionReceipt", when: "before", run: () => fail(`A2 ${kind}`) });
    }
  });

  test("A2b · falha no evento de prova (antes do INSERT e, em variante, depois dele) — os três tipos: nenhum evento nem efeito persiste", async () => {
    const isSyncEvent = (args: unknown[]) => (args[0] as { eventType?: string })?.eventType === SYNC;
    for (const kind of ["create", "item", "submit"] as const) {
      await crashScenario(kind, { method: "createEvent", when: "before", applies: isSyncEvent, run: () => fail(`A2b-antes ${kind}`) });
      await crashScenario(kind, { method: "createEvent", when: "after", applies: isSyncEvent, run: () => fail(`A2b-depois ${kind}`) });
    }
  });

  test("A2c · falha logo depois do claim, antes do efeito — os três tipos: nenhum recibo persiste", async () => {
    for (const kind of ["create", "item", "submit"] as const) {
      await crashScenario(kind, { method: "claimMobileActionReceipt", when: "after", run: () => fail(`A2c ${kind}`) });
    }
  });

  test("A3′ · (v3) a ação de u1 reenviada por u2 — gestor ou técnico — é CONFLITO action_owned_by_other_actor, sem resultado de u1 e sem lançamento", async () => {
    const t = await seedTenant("a3");
    const action = createAction(randomUUID(), { employeeUserId: t.u1 });
    const original = await sync(h.serviceA, t.tech1, [action]);
    assert.equal(original[0]?.status, "processed");
    const before = await counts(t.tenantId);

    for (const other of [t.mgr2, t.tech3]) {
      const resent = await sync(h.serviceB, other, [action]);
      assert.deepEqual(pick(resent[0]), {
        clientActionId: action.clientActionId,
        status: "conflict",
        errorCode: "action_owned_by_other_actor",
        resultRef: undefined,
        replayed: true,
      });
    }
    assert.deepEqual(await counts(t.tenantId), before, "nenhum relatório, recibo ou evento a mais");
    const owner = await sync(h.serviceA, t.tech1, [action]);
    assert.deepEqual([owner[0]?.status, owner[0]?.replayed, owner[0]?.resultRef], ["processed", true, original[0]?.resultRef], "o dono segue reconhecido");
  });

  test("A3c · (v3) dois atores, a mesma ação, concorrentes com barreira na PK: um efeito; o perdedor recebe conflito", async () => {
    const t = await seedTenant("a3c");
    const gate = pauseAfterClaim();
    const action = createAction(randomUUID());
    const u1 = captureSettled(sync(h.faultyService(h.serviceClientA, [gate.hook]), t.tech1, [action]));
    await reachedClaim(gate.claimed, u1, "u1");
    const u2 = captureSettled(sync(h.serviceB, t.mgr2, [action]));
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "mobile_action_receipts", label: "u2 bloqueado na PK do claim de u1" });
    gate.release();

    const [r1, r2] = [await u1, await u2];
    assert.equal(r1.status, "fulfilled");
    assert.equal(r2.status, "fulfilled", `u2: ${String((r2 as any).reason?.message)}`);
    assert.deepEqual(pick((r1 as any).value[0]).status, "processed");
    assert.deepEqual([(r2 as any).value[0].status, (r2 as any).value[0].errorCode, (r2 as any).value[0].resultRef], ["conflict", "action_owned_by_other_actor", undefined]);
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts], [1, 1], "um único efeito");
  });

  test("A4 · divergência de valor, período, reportId ou tipo na mesma ação → payload_mismatch, resultado original próprio, dinheiro intacto", async () => {
    const t = await seedTenant("a4");
    const createX = createAction(randomUUID(), { advanceAmount: 100 });
    const reportId = (await sync(h.serviceA, t.tech1, [createX]))[0].resultRef!;
    const otherReport = (await sync(h.serviceA, t.tech1, [createAction(randomUUID())]))[0].resultRef!;
    const itemX = itemAction(randomUUID(), reportId, { amount: 10 });
    const itemRef = (await sync(h.serviceA, t.tech1, [itemX]))[0].resultRef!;
    const before = await counts(t.tenantId);

    const divergent: Array<[SyncAction, string]> = [
      [{ ...createX, payload: { ...createX.payload, advanceAmount: 999 } }, reportId],
      [{ ...createX, payload: { ...createX.payload, periodEnd: "2026-07-31" } }, reportId],
      [{ clientActionId: createX.clientActionId, type: "expense_report.submit", payload: { reportId } }, reportId],
      [{ ...itemX, payload: { ...itemX.payload, amount: 11 } }, itemRef],
      [{ ...itemX, payload: { ...itemX.payload, reportId: otherReport } }, itemRef],
    ];
    for (const [action, ref] of divergent) {
      const [result] = await sync(h.serviceA, t.tech1, [action]);
      assert.deepEqual(pick(result), { clientActionId: action.clientActionId, status: "conflict", errorCode: "payload_mismatch", resultRef: ref, replayed: true });
    }
    assert.deepEqual(await counts(t.tenantId), before, "nenhuma escrita: contagens, total e adiantamento iguais");
  });

  test("A4b · replay semanticamente igual (aliases snake_case, datas equivalentes, ordem, defaults explícitos, envelope) é processed/replayed", async () => {
    const t = await seedTenant("a4b");
    const id = randomUUID();
    const original = (await sync(h.serviceA, t.tech1, [{ clientActionId: id, type: "expense_report.create", payload: { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field" } }]))[0];
    const equivalent: SyncAction = {
      client_action_id: id,
      clientActionId: id,
      type: "expense_report.create",
      tenantId: randomUUID(),
      retryCount: 3,
      payload: { currency: "BRL", advance_amount: 0, origin: "field", period_end: "2026-06-30T00:00:00.000Z", period_start: "2026-06-01T00:00:00Z", tenantId: randomUUID(), local_id: "PC-1" },
    };
    const [replayed] = await sync(h.serviceB, t.tech1, [equivalent]);
    assert.deepEqual(pick(replayed), { clientActionId: id, status: "processed", errorCode: null, resultRef: original.resultRef, replayed: true });

    const itemId = randomUUID();
    await sync(h.serviceA, t.tech1, [itemAction(itemId, original.resultRef!, { spentAt: "2026-06-11T10:00:00.000Z" })]);
    const [itemReplay] = await sync(h.serviceA, t.tech1, [
      { clientActionId: itemId, type: "expense_item.create", payload: { amount: 10, spent_at: "2026-06-11T07:00:00-03:00", category_key: "fuel", report_id: original.resultRef, currency: "BRL", policy_flags: {} } },
    ]);
    assert.deepEqual([itemReplay.status, itemReplay.replayed, itemReplay.errorCode], ["processed", true, null]);
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.items, c.receipts], [1, 1, 2]);
  });

  test("A5 · a falha do primeiro libera o concorrente: B bloqueado, A rola para trás, B vence com um único efeito", async () => {
    const t = await seedTenant("a5");
    let release!: () => void;
    const mayFail = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signal!: () => void;
    const claimed = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const action = createAction(randomUUID());
    const a = captureSettled(
      sync(
        h.faultyService(h.serviceClientA, [
          {
            method: "claimMobileActionReceipt",
            when: "after",
            run: async () => {
              signal();
              await mayFail;
              fail("A5");
            },
          },
        ]),
        t.tech1,
        [action],
      ),
    );
    await reachedClaim(claimed, a, "A");
    const b = captureSettled(sync(h.serviceB, t.tech1, [action]));
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "mobile_action_receipts", label: "B bloqueado atrás do claim que vai falhar" });
    release();

    assert.match(String((expectRejected(await a, "A") as Error).message), /falha injetada A5/);
    const rb = await b;
    assert.equal(rb.status, "fulfilled", `B: ${String((rb as any).reason?.message)}`);
    assert.deepEqual([(rb as any).value[0].status, (rb as any).value[0].replayed], ["processed", false], "B vence como ação NOVA");
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts, c.sync_events], [1, 1, 1]);
  });

  test("A6 · estresse: 10 reenvios concorrentes × 5 rodadas — exatamente um não-replay por ação e um efeito", async () => {
    const t = await seedTenant("a6");
    for (let round = 1; round <= 5; round++) {
      const action = createAction(randomUUID(), { advanceAmount: round });
      const outcomes = await Promise.all(
        Array.from({ length: 10 }, (_, index) => captureSettled(sync(index % 2 === 0 ? h.serviceA : h.serviceB, t.tech1, [action]))),
      );
      const rejected = outcomes.filter((o) => o.status === "rejected").map((o) => String((o as any).reason?.message));
      assert.deepEqual(rejected, [], `rodada ${round}: ninguém pode falhar`);
      const results = outcomes.map((o) => (o as any).value[0] as SyncResult);
      assert.equal(results.filter((r) => !r.replayed).length, 1, `rodada ${round}: exatamente um não-replay`);
      assert.equal(new Set(results.map((r) => r.resultRef)).size, 1, `rodada ${round}: todos com o mesmo resultado`);
      assert.equal((await counts(t.tenantId)).reports, round, `rodada ${round}: um efeito por ação`);
    }
  });

  test("A7 · os três tipos funcionam e fazem replay; total recalculado; o evento de prova do item aponta o RELATÓRIO; submit repetido não refaz a transição", async () => {
    const t = await seedTenant("a7");
    const create = createAction(randomUUID(), { advanceAmount: 50 });
    const reportId = (await sync(h.serviceA, t.tech1, [create]))[0].resultRef!;
    const item = itemAction(randomUUID(), reportId, { amount: 120 });
    const submit: SyncAction = { clientActionId: randomUUID(), type: "expense_report.submit", payload: { reportId } };
    const results = await sync(h.serviceA, t.tech1, [item, submit]);
    assert.deepEqual(results.map((r) => [r.status, r.replayed]), [["processed", false], ["processed", false]], "item com reportId canônico e submit");

    const report = await h.admin.expenseReport.findFirst({ where: { tenant_id: t.tenantId, id: reportId } });
    assert.equal(Number(report?.total_amount), 120, "total recalculado na mesma transação");
    assert.equal(report?.status, "submitted");
    const proofs = (await h.admin.$queryRaw`
      SELECT aggregate_id::text AS aggregate FROM expense_events WHERE tenant_id = ${t.tenantId}::uuid AND event_type = ${SYNC}
    `) as Array<{ aggregate: string }>;
    assert.deepEqual(proofs.map((p) => p.aggregate), [reportId, reportId, reportId], "os três eventos de prova apontam o relatório (FK), inclusive o do item");

    const replay = await sync(h.serviceB, t.tech1, [create, item, submit]);
    assert.deepEqual(replay.map((r) => [r.status, r.replayed, r.errorCode]), [["processed", true, null], ["processed", true, null], ["processed", true, null]], "submit já submetido: replay, não 409");
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.items, c.receipts, c.sync_events], [1, 1, 3, 3]);
  });

  test("A7b · work order inexistente ou de outra organização → 404 work_order_not_found no create/update REST e no sync, nada alterado; outra FK não é mascarada", async () => {
    const t = await seedTenant("a7b");
    const other = await seedTenant("a7b-outra");
    const foreign = await h.admin.workOrder.create({ data: { tenant_id: other.tenantId, code: `WO-${suffix()}`, title: "OS de outra organização" } });
    const own = await h.admin.workOrder.create({ data: { tenant_id: t.tenantId, code: `WO-${suffix()}`, title: "OS própria" } });
    const isWorkOrder404 = (error: unknown) => isDomainError(error, 404, "work_order_not_found");

    for (const workOrderId of [randomUUID(), foreign.id]) {
      await assert.rejects(h.serviceA.createReport(t.tech1, { ...createPayload(), workOrderId }), isWorkOrder404);
      await assert.rejects(sync(h.serviceA, t.tech1, [createAction(randomUUID(), { workOrderId })]), isWorkOrder404);
    }
    const report = await h.serviceA.createReport(t.tech1, createPayload());
    for (const workOrderId of [randomUUID(), foreign.id]) {
      await assert.rejects(h.serviceA.updateReport(t.tech1, report.id, { workOrderId }), isWorkOrder404);
    }
    const unchanged = await h.admin.expenseReport.findFirst({ where: { tenant_id: t.tenantId, id: report.id } });
    assert.equal(unchanged?.work_order_id, null, "o update recusado não alterou nada");
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts], [1, 0], "nenhum relatório nem recibo dos 404");

    const linked = await h.serviceA.updateReport(t.tech1, report.id, { workOrderId: own.id });
    assert.equal(linked.workOrderId, own.id, "controle: a OS da própria organização vincula");

    await assert.rejects(
      h.serviceA.createReport(t.mgr2, { ...createPayload(), employeeUserId: randomUUID() }),
      (error: unknown) => !isWorkOrder404(error) && /employee_user_id_fkey|P2003/.test(JSON.stringify(error, Object.getOwnPropertyNames(error))),
      "FK do empregado NÃO vira 404 de work order",
    );
  });

  test("A8 · isolamento: a mesma ação em três organizações são três ações; RLS esconde recibo e evento alheios; tenant do payload ignorado", async () => {
    const [t1, t2, t3] = [await seedTenant("a8-1"), await seedTenant("a8-2"), await seedTenant("a8-3")];
    const id = randomUUID();
    const r1 = (await sync(h.serviceA, t1.tech1, [createAction(id, { tenantId: t2.tenantId })]))[0];
    const r2 = (await sync(h.serviceB, t2.tech1, [createAction(id)]))[0];
    assert.deepEqual([r1.status, r1.replayed, r2.status, r2.replayed], ["processed", false, "processed", false]);
    assert.notEqual(r1.resultRef, r2.resultRef);
    assert.deepEqual([(await counts(t1.tenantId)).reports, (await counts(t2.tenantId)).reports, (await counts(t3.tenantId)).reports], [1, 1, 0]);

    const lookup = await h.repositoryA.withSyncTransaction(t3.tenantId, (repo: any) => repo.findSyncActionReceipts({ tenantId: t3.tenantId, clientActionId: id }));
    assert.deepEqual(lookup, { legacy: undefined, current: undefined }, "sob a terceira organização, nada da ação");
    const leaked = await h.serviceClientA.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${t3.tenantId}, true)`;
      return tx.$queryRaw`SELECT
        (SELECT count(*)::int FROM mobile_action_receipts WHERE tenant_id IN (${t1.tenantId}::uuid, ${t2.tenantId}::uuid)) AS receipts,
        (SELECT count(*)::int FROM expense_events WHERE tenant_id IN (${t1.tenantId}::uuid, ${t2.tenantId}::uuid)) AS events,
        (SELECT count(*)::int FROM expense_reports WHERE tenant_id IN (${t1.tenantId}::uuid, ${t2.tenantId}::uuid)) AS reports`;
    });
    assert.deepEqual((leaked as any)[0], { receipts: 0, events: 0, reports: 0 }, "RLS: recibo, evento e relatório alheios invisíveis");

    const report1 = await h.admin.expenseReport.findFirst({ where: { id: r1.resultRef } });
    assert.equal(report1?.tenant_id, t1.tenantId, "o tenantId do payload é ignorado: o efeito fica na organização da sessão");
    assert.deepEqual([(await sync(h.serviceA, t1.tech1, [createAction(id)]))[0].replayed, (await sync(h.serviceA, t2.tech1, [createAction(id)]))[0].replayed], [true, true]);
    const r3 = (await sync(h.serviceA, t3.tech1, [createAction(id)]))[0];
    assert.deepEqual([r3.status, r3.replayed], ["processed", false], "na terceira organização é uma ação nova");
  });

  test("A9 · contenção expirada vira 503 sync_busy sem efeito parcial; códigos transitórios mapeados; erro determinístico passa intacto", async () => {
    const t = await seedTenant("a9");
    const id = randomUUID();
    let releaseHolder!: () => void;
    const holderMayEnd = new Promise<void>((resolve) => {
      releaseHolder = resolve;
    });
    let holderReady!: () => void;
    const holding = new Promise<void>((resolve) => {
      holderReady = resolve;
    });
    const holder = captureSettled(
      h.admin.$transaction(
        async (tx: any) => {
          await tx.mobileActionReceipt.create({
            data: { tenant_id: t.tenantId, client_action_id: h.sync.buildSyncReceiptKey(id), actor_user_id: t.u1, action_type: "expense_report.create", status: "processed" },
          });
          holderReady();
          await holderMayEnd;
          throw new Error("rollback do segurador");
        },
        { timeout: 60_000, maxWait: 10_000 },
      ),
    );
    await holding;
    const started = Date.now();
    const victim = captureSettled(sync(h.serviceA, t.tech1, [createAction(id)]));
    await waitForOwnBlockedStatement(h.admin, { applicationName, fragment: "mobile_action_receipts", label: "serviço bloqueado na PK segurada" });
    // A espera aqui NÃO ordena transações: ela é o próprio objeto do teste — passar do prazo da transação interativa.
    await new Promise((resolve) => setTimeout(resolve, 5_600));
    releaseHolder();
    await holder;

    assert.equal(isDomainError(expectRejected(await victim, "vítima da contenção"), 503, "sync_busy"), true, "503 EXPENSE_SYNC_UNAVAILABLE/sync_busy");
    assert.ok(Date.now() - started >= 5_000, "a contenção durou além do prazo da transação");
    let c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts, c.events], [0, 0, 0], "nenhum efeito parcial");
    const retry = (await sync(h.serviceA, t.tech1, [createAction(id)]))[0];
    assert.deepEqual([retry.status, retry.replayed], ["processed", false], "o reenvio é seguro: executa uma vez");
    c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts], [1, 1]);

    const transient: Array<[string, unknown]> = [
      ["P2028", Object.assign(new Error("expirada"), { code: "P2028" })],
      ["P2034", Object.assign(new Error("conflito"), { code: "P2034" })],
      ["P2024", Object.assign(new Error("pool"), { code: "P2024" })],
      ["40P01 via DriverAdapterError", Object.assign(new Error("deadlock"), { name: "DriverAdapterError", cause: { originalCode: "40P01" } })],
      ["40001 via P2010", Object.assign(new Error("serialização"), { code: "P2010", meta: { driverAdapterError: { cause: { code: "40001" } } } })],
      ["55P03 via meta.code", Object.assign(new Error("lock"), { meta: { code: "55P03" } })],
    ];
    for (const [label, error] of transient) {
      const service = h.faultyService(h.serviceClientA, [{ method: "claimMobileActionReceipt", when: "before", run: () => { throw error; } }]);
      await assert.rejects(sync(service, t.tech1, [createAction(randomUUID())]), (e: unknown) => isDomainError(e, 503, "sync_busy"), label);
    }
    const deterministic = Object.assign(new Error("determinístico"), { code: "P2003" });
    const service = h.faultyService(h.serviceClientA, [{ method: "claimMobileActionReceipt", when: "before", run: () => { throw deterministic; } }]);
    await assert.rejects(sync(service, t.tech1, [createAction(randomUUID())]), (e: unknown) => e === deterministic, "erro determinístico NÃO vira 503");
    assert.equal((await counts(t.tenantId)).reports, 1);
  });

  test("A10 · tipo não suportado (expense_receipt.attach) e payload inválido → 400 com ZERO transações de sync e zero escrita", async () => {
    const t = await seedTenant("a10");
    let transactions = 0;
    const repository = new h.RlsRepository(h.serviceClientA);
    const original = repository.withSyncTransaction.bind(repository);
    repository.withSyncTransaction = (tenantId: string, work: any) => {
      transactions += 1;
      return original(tenantId, work);
    };
    const service = new h.Service(repository);
    const invalid: Array<[unknown, string]> = [
      [{ clientActionId: "a10-1", type: "expense_receipt.attach", payload: { itemId: randomUUID() } }, "unsupported_action"],
      [{ clientActionId: "a10-2", type: "expense_report.create", payload: { periodEnd: "2026-06-30", origin: "field" } }, "required_field"],
      [{ clientActionId: "a10-3", type: "expense_item.create", payload: { report_local_id: "PC-1", category_id: "fuel", amount: 10 } }, "required_field"],
      [{ clientActionId: "a10-4", type: "expense_report.submit", payload: { reportId: "nao-uuid" } }, "invalid_uuid"],
      [{ clientActionId: "a10-5", type: "expense_report.create", payload: { periodStart: "2026-06-30", periodEnd: "2026-06-01", origin: "field" } }, "invalid_period"],
    ];
    for (const [action, reason] of invalid) {
      await assert.rejects(service.syncExpenseActions(t.tech1, { actions: [action] }), (e: unknown) => isDomainError(e, 400, reason), reason);
    }
    assert.equal(transactions, 0, "erro sintático sai ANTES de withSyncTransaction/claim (rollback sozinho não bastaria)");
    const c = await counts(t.tenantId);
    assert.deepEqual([c.reports, c.receipts, c.events], [0, 0, 0]);
  });

  test("A11 · recibo LEGADO do próprio ator, nas 4 formas de id (UUID v4, local:42, 160 sem ':', <uuid>:x): conflito, zero efeito, zero K2t, zero evento", async () => {
    const forms = (u2: string): Array<[string, string]> => [
      ["uuid v4 do app", randomUUID()],
      ["local:42", "local:42"],
      ["160 sem ':'", "z".repeat(160)],
      ["<uuid>:x", `${u2}:x`],
    ];
    const probe = await seedTenant("a11-ids");
    const failures: string[] = [];
    for (const [label, legacyId] of forms(probe.u2)) {
      const t = await seedTenant("a11");
      const legacyReport = await seedLegacy(t, legacyId, t.u1);
      const before = await counts(t.tenantId);
      assert.equal(before.k2t, 0);
      const base = createAction(legacyId, { advanceAmount: 10 });
      for (const [action, code] of [
        [base, "legacy_payload_unverifiable"],
        [base, "legacy_payload_unverifiable"],
        [{ ...base, payload: { ...base.payload, advanceAmount: 999 } }, "legacy_payload_unverifiable"],
        [{ clientActionId: legacyId, type: "expense_report.submit", payload: { reportId: legacyReport } }, "payload_mismatch"],
      ] as Array<[SyncAction, string]>) {
        const [result] = await sync(h.serviceA, t.tech1, [action]);
        const got = pick(result);
        const want = { clientActionId: legacyId, status: "conflict", errorCode: code, resultRef: legacyReport, replayed: true };
        if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${label}: ${got.status}/${got.errorCode} (esperado conflict/${code})`);
      }
      const after = await counts(t.tenantId);
      if (JSON.stringify(after) !== JSON.stringify(before)) failures.push(`${label}: escrita — ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    }
    // Todas as formas rodam antes do veredito: o vermelho nomeia CADA forma que falhou (M11′ e M11″ separam as formas).
    assert.deepEqual(failures, [], "recibo legado: conflito e zero escrita em toda forma de id");
  });

  test("A11b′ · (v3) recibo legado de u1 sob u2 (gestor e técnico): conflito action_owned_by_other_actor, ZERO efeito; o legado de u1 segue conflito", async () => {
    const t = await seedTenant("a11b");
    const id = randomUUID();
    const legacyReport = await seedLegacy(t, id, t.u1);
    const before = await counts(t.tenantId);
    for (const other of [t.mgr2, t.tech3]) {
      const [result] = await sync(h.serviceB, other, [createAction(id, { advanceAmount: 10 })]);
      assert.deepEqual(pick(result), { clientActionId: id, status: "conflict", errorCode: "action_owned_by_other_actor", resultRef: undefined, replayed: true });
    }
    const [own] = await sync(h.serviceA, t.tech1, [createAction(id, { advanceAmount: 10 })]);
    assert.deepEqual([own.status, own.errorCode, own.resultRef], ["conflict", "legacy_payload_unverifiable", legacyReport]);
    assert.deepEqual(await counts(t.tenantId), before, "nenhum efeito, recibo ou evento");
  });

  test("A11c · espaços de chave não colidem: legados com ':' e com o começo do prefixo não capturam a ação nova; a K2t nunca é id cru", async () => {
    const t = await seedTenant("a11c");
    // O prefixo da fixture é LITERAL, não lido da constante de produção: se a produção encurtar o prefixo (M12), a
    // fixture continua sendo id legado válido e é a ação nova que colide — o vermelho é de negócio, não de semeadura.
    const P = "expense-sync-v2/" + "~".repeat(145);
    const legacyIds = [`${t.u2}:x`, P.slice(0, 16) + JSON.stringify(["x"]), P.slice(0, 120) + JSON.stringify(["x"]), P.slice(0, 160), "z".repeat(160)];
    for (const legacyId of legacyIds) {
      assert.ok(legacyId.length <= 160, "fixture: todo id legado cabe no limite antigo");
      await seedLegacy(t, legacyId, t.u1);
    }
    const before = await counts(t.tenantId);

    const [fresh] = await sync(h.serviceB, t.mgr2, [createAction("x")]);
    assert.deepEqual([fresh.status, fresh.replayed, fresh.errorCode], ["processed", false, null], "a ação 'x' de u2 é NOVA: nenhum legado a captura");
    const after = await counts(t.tenantId);
    assert.deepEqual([after.reports - before.reports, after.k2t - before.k2t], [1, 1]);
    const k2t = (await h.admin.$queryRaw`
      SELECT client_action_id AS key FROM mobile_action_receipts WHERE tenant_id = ${t.tenantId}::uuid AND length(client_action_id) > 160
    `) as Array<{ key: string }>;
    assert.equal(k2t.length, 1);
    assert.equal(legacyIds.includes(k2t[0].key), false, "a K2t não coincide com nenhum id cru");
    assert.equal(h.sync.decodeSyncReceiptKey(k2t[0].key), "x", "ida e volta exata");

    for (const legacyId of legacyIds) {
      const [own] = await sync(h.serviceA, t.tech1, [createAction(legacyId, { advanceAmount: 10 })]);
      assert.equal(own.errorCode, "legacy_payload_unverifiable", `o legado ${JSON.stringify(legacyId.slice(0, 30))} segue legado`);
    }
  });

  test("A11d · estado inconsistente falha fechado: ambíguo, incompleto, failed/conflict, sem prova, resultado inexistente, dono alheio — zero escrita", async () => {
    const t = await seedTenant("a11d");
    const K = (id: string) => h.sync.buildSyncReceiptKey(id);
    // relatório criado pelo REST: sem evento de prova de sync nenhum — "sem prova" é sem prova mesmo
    const report = (await h.serviceA.createReport(t.tech1, createPayload())).id as string;
    const receipt = (key: string, fields: Record<string, unknown> = {}) =>
      h.admin.mobileActionReceipt.create({
        data: { tenant_id: t.tenantId, client_action_id: key, actor_user_id: t.u1, action_type: "expense_report.create", status: "processed", result_ref: report, processed_at: new Date(), ...fields },
      });
    const cases: Array<[string, () => Promise<unknown>, string]> = [
      ["d-amb", async () => { await receipt("d-amb"); await receipt(K("d-amb")); }, "receipt_ambiguous"],
      ["d-null", () => receipt(K("d-null"), { result_ref: null }), "receipt_unverifiable"],
      ["d-failed", () => receipt(K("d-failed"), { status: "failed" }), "receipt_unverifiable"],
      ["d-conflict", () => receipt(K("d-conflict"), { status: "conflict" }), "receipt_unverifiable"],
      ["d-noproof", () => receipt(K("d-noproof")), "receipt_unverifiable"],
      ["d-ghost", () => receipt(K("d-ghost"), { result_ref: randomUUID() }), "receipt_unverifiable"],
      ["d-legacy-failed", () => receipt("d-legacy-failed", { status: "failed" }), "receipt_unverifiable"],
      ["d-legacy-null", () => receipt("d-legacy-null", { result_ref: null }), "receipt_unverifiable"],
      ["d-alien", () => receipt(K("d-alien"), { actor_user_id: t.u2 }), "action_owned_by_other_actor"],
    ];
    for (const [, seed] of cases) await seed();
    const before = await counts(t.tenantId);
    for (const [id, , code] of cases) {
      const [result] = await sync(h.serviceA, t.tech1, [createAction(id)]);
      assert.deepEqual([result.status, result.errorCode, result.resultRef], ["conflict", code, undefined], id);
    }
    assert.deepEqual(await counts(t.tenantId), before, "nenhum estado inconsistente vira ação nova nem promove o hash do replay");
  });

  test("A12′ · (v3) o mesmo item da fila reenviado sob u2 com o comando deep-equal ao de u1 → conflito, sem resultado de u1, total 10", async () => {
    process.env.EXPENSE_SYNC_FIXTURES_ONLY = "1";
    const { A12_ITEM_ACTION_FIXTURE } = await import("./expense-sync-fingerprint.test.js");
    const t = await seedTenant("a12");
    const reportId = (await sync(h.serviceA, t.tech1, [createAction(randomUUID())]))[0].resultRef!;
    const id = randomUUID();
    const [fromU1] = await sync(h.serviceA, t.tech1, [{ clientActionId: id, type: "expense_item.create", payload: { ...A12_ITEM_ACTION_FIXTURE.fromU1, reportId } }]);
    assert.equal(fromU1.status, "processed");
    const [fromU2] = await sync(h.serviceB, t.mgr2, [{ clientActionId: id, type: "expense_item.create", payload: { ...A12_ITEM_ACTION_FIXTURE.fromU2, reportId } }]);
    assert.deepEqual(pick(fromU2), { clientActionId: id, status: "conflict", errorCode: "action_owned_by_other_actor", resultRef: undefined, replayed: true });
    const report = await h.admin.expenseReport.findFirst({ where: { tenant_id: t.tenantId, id: reportId } });
    assert.equal(Number(report?.total_amount), 10, "um único item de 10");
    assert.equal((await counts(t.tenantId)).items, 1);
  });

  test("A12b · o ator do evento é condição INDEPENDENTE do hash: evento de prova movido para outro ator ou NULL não autentica; restaurado, autentica", async () => {
    const t = await seedTenant("a12b");
    const reportId = (await sync(h.serviceA, t.tech1, [createAction(randomUUID())]))[0].resultRef!;
    const action = itemAction(randomUUID(), reportId, { amount: 20 });
    const [original] = await sync(h.serviceB, t.mgr2, [action]);
    assert.equal(original.status, "processed");
    const proof = (await h.admin.$queryRaw`
      SELECT id::text AS id FROM expense_events
      WHERE tenant_id = ${t.tenantId}::uuid AND event_type = ${SYNC} AND actor_user_id = ${t.u2}::uuid
    `) as Array<{ id: string }>;
    assert.equal(proof.length, 1);
    const moveProof = (actorUserId: string | null) =>
      h.admin.$executeRaw`UPDATE expense_events SET actor_user_id = ${actorUserId}::uuid WHERE id = ${proof[0].id}::uuid`;

    await moveProof(t.u1);
    const [underU1] = await sync(h.serviceB, t.mgr2, [action]);
    assert.deepEqual([underU1.status, underU1.errorCode], ["conflict", "receipt_unverifiable"], "prova sob outro ator não serve, mesmo com o hash certo");
    await moveProof(null);
    const [underNull] = await sync(h.serviceB, t.mgr2, [action]);
    assert.deepEqual([underNull.status, underNull.errorCode], ["conflict", "receipt_unverifiable"], "prova sem ator não serve");
    await moveProof(t.u2);
    const [restored] = await sync(h.serviceB, t.mgr2, [action]);
    assert.deepEqual([restored.status, restored.replayed, restored.resultRef], ["processed", true, original.resultRef], "controle: com o dono certo, o replay fiel autentica");
    const c = await counts(t.tenantId);
    assert.deepEqual([c.items, Number(c.total)], [1, 20]);
  });

  test("A13 · o recibo aponta o agregado ORIGINAL: replay do item com outro reportId não autentica, nem com evento plantado no outro relatório", async () => {
    const t = await seedTenant("a13");
    const r1 = (await sync(h.serviceA, t.tech1, [createAction(randomUUID())]))[0].resultRef!;
    const r2 = (await sync(h.serviceA, t.tech1, [createAction(randomUUID())]))[0].resultRef!;
    const action = itemAction(randomUUID(), r1, { amount: 10 });
    const [original] = await sync(h.serviceA, t.tech1, [action]);
    const moved: SyncAction = { ...action, payload: { ...action.payload, reportId: r2 } };
    const planted = h.sync.prepareSyncAction(t.tech1, moved).fingerprint;
    await h.admin.expenseEvent.create({ data: { tenant_id: t.tenantId, aggregate_id: r2, event_type: SYNC, payload_hash: planted, actor_user_id: t.u1 } });
    const before = await counts(t.tenantId);

    const [divergent] = await sync(h.serviceA, t.tech1, [moved]);
    assert.deepEqual(pick(divergent), { clientActionId: action.clientActionId, status: "conflict", errorCode: "payload_mismatch", resultRef: original.resultRef, replayed: true });
    const [faithful] = await sync(h.serviceA, t.tech1, [action]);
    assert.deepEqual([faithful.status, faithful.replayed, faithful.resultRef], ["processed", true, original.resultRef], "o item original resolve o relatório certo");
    assert.deepEqual(await counts(t.tenantId), before);
  });

  test("A15 · (v3) a K2t é determinística: OUTRO processo, depois de um reinício, reconhece o replay e não lança de novo", async () => {
    const t = await seedTenant("a15");
    const action = createAction(randomUUID(), { advanceAmount: 15 });
    const [first] = await sync(h.serviceA, t.tech1, [action]);
    assert.equal(first.replayed, false);

    const child = await runRestartedProcess({ actor: t.tech1, actions: [action] });
    assert.equal(child.code, 0, `o processo reiniciado terminou com ${child.code}: ${child.stderr.slice(-800)}`);
    const results = JSON.parse(child.stdout.trim().split("\n").pop() ?? "{}").results as SyncResult[];
    assert.deepEqual([results[0].status, results[0].replayed, results[0].resultRef], ["processed", true, first.resultRef]);
    assert.equal((await counts(t.tenantId)).reports, 1, "o reinício não lança de novo");
  });

  // ---------- cenários de falha injetada (A2/A2b/A2c) ----------

  async function crashScenario(kind: "create" | "item" | "submit", hook: Hook): Promise<void> {
    const t = await seedTenant(`crash-${kind}`);
    let action: SyncAction;
    if (kind === "create") {
      action = createAction(randomUUID(), { advanceAmount: 33 });
    } else {
      const reportId = (await sync(h.serviceA, t.tech1, [createAction(randomUUID(), { advanceAmount: 5 })]))[0].resultRef!;
      if (kind === "item") {
        action = itemAction(randomUUID(), reportId, { amount: 7 });
      } else {
        await sync(h.serviceA, t.tech1, [itemAction(randomUUID(), reportId, { amount: 7 })]);
        action = { clientActionId: randomUUID(), type: "expense_report.submit", payload: { reportId } };
      }
    }
    const before = await counts(t.tenantId);

    await assert.rejects(sync(h.faultyService(h.serviceClientA, [hook]), t.tech1, [action]), /falha injetada/, `${kind}: a falha sobe`);
    assert.deepEqual(await counts(t.tenantId), before, `${kind} / ${hook.method} ${hook.when}: rollback REAL — contagens, total, status e recibo intactos`);

    const [retry] = await sync(h.serviceA, t.tech1, [action]);
    assert.deepEqual([retry.status, retry.replayed], ["processed", false], `${kind}: o retry executa`);
    const after = await counts(t.tenantId);
    assert.deepEqual([after.receipts - before.receipts, after.sync_events - before.sync_events], [1, 1], `${kind}: um recibo e uma prova`);
    if (kind === "create") assert.equal(after.reports - before.reports, 1);
    if (kind === "item") assert.deepEqual([after.items - before.items, Number(after.total) - Number(before.total)], [1, 7]);
    if (kind === "submit") assert.equal(after.submitted - before.submitted, 1);
    const [again] = await sync(h.serviceA, t.tech1, [action]);
    assert.equal(again.replayed, true, `${kind}: e uma vez só`);
  }
}

// ---------- arnês ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, syncModule, prismaRepositoryModule, serviceModule, repositoryModule] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/expense-management/expense-sync.js"),
    import("../src/modules/expense-management/expense-management-prisma.repository.js"),
    import("../src/modules/expense-management/expense-management.service.js"),
    import("../src/modules/expense-management/expense-management.repository.js"),
  ]);
  const RlsRepository = prismaRepositoryModule.RlsPrismaExpenseManagementRepository;
  const Service = serviceModule.ExpenseManagementService;

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(admin, applicationName);
  const roles: EphemeralRole[] = [];
  roles.push(await createEphemeralRole(admin, connection));
  roles.push(await createEphemeralRole(admin, connection));
  // Os clientes que executam o SERVIÇO são os dos papéis efêmeros; o `admin` só semeia, observa e limpa.
  const serviceClientA = roles[0].client as any;
  const serviceClientB = roles[1].client as any;

  class FaultyRepository extends RlsRepository {
    constructor(client: any, private readonly hooks: readonly Hook[]) {
      super(client);
    }

    override withSyncTransaction<T>(tenantId: string, work: (repository: any) => Promise<T>): Promise<T> {
      return super.withSyncTransaction(tenantId, (repository) => work(instrument(repository, this.hooks)));
    }
  }

  const repositoryA = new RlsRepository(serviceClientA);
  const tenantIds: string[] = [];

  return {
    admin: admin as any,
    serviceClientA,
    serviceClientB,
    repositoryA,
    serviceA: new Service(repositoryA),
    serviceB: new Service(new RlsRepository(serviceClientB)),
    faultyService: (client: any, hooks: readonly Hook[]) => new Service(new FaultyRepository(client, hooks)),
    RlsRepository: RlsRepository as any,
    Service: Service as any,
    sync: syncModule,
    hashExpensePayload: repositoryModule.hashExpensePayload,
    tenantIds,
    async close(): Promise<void> {
      try {
        for (const tenantId of tenantIds) {
          for (const table of ["expense_events", "mobile_action_receipts", "expense_items", "expense_reports", "expense_policies", "work_orders", "users"]) {
            await admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
          }
          await admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
        }
      } finally {
        for (const role of roles) await role.drop();
        await admin.$disconnect();
      }
    },
  };
}

/** Proxy sobre o repositório LIGADO à transação: ganchos antes/depois de métodos chamados pelo serviço. */
function instrument<T extends object>(target: T, hooks: readonly Hook[]): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      const value = Reflect.get(object, property, receiver);
      if (typeof value !== "function") return value;

      return async (...args: unknown[]) => {
        for (const hook of hooks) {
          if (hook.method === property && hook.when === "before" && (hook.applies?.(args) ?? true)) await hook.run(args);
        }
        const result = await value.apply(object, args);
        for (const hook of hooks) {
          if (hook.method === property && hook.when === "after" && (hook.applies?.(args) ?? true)) await hook.run(args);
        }
        return result;
      };
    },
  });
}

function pauseAfterClaim() {
  let release!: () => void;
  const mayCommit = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signal!: () => void;
  const claimed = new Promise<void>((resolve) => {
    signal = resolve;
  });
  const hook: Hook = {
    method: "claimMobileActionReceipt",
    when: "after",
    run: async () => {
      signal();
      await mayCommit;
    },
  };

  return { hook, claimed, release };
}

/** Espera o claim de quem segura a PK; se ele terminar antes de chegar lá, falha com a razão dele (nunca pendura). */
async function reachedClaim(claimed: Promise<void>, outcome: Promise<unknown>, label: string): Promise<void> {
  const first = await Promise.race([claimed.then(() => "claim" as const), outcome.then((settled) => settled)]);
  if (first !== "claim") {
    assert.fail(`${label} terminou ANTES de chegar ao claim: ${JSON.stringify(first, (_key, value) => (value instanceof Error ? value.message : value))}`);
  }
}

function fail(label: string): never {
  throw new Error(`falha injetada ${label}`);
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function actorOf(tenantId: string, userId: string, permissions: string[]): Actor {
  return { tenantId, userId, roles: [], permissions: [...permissions] };
}

async function seedTenant(tag: string) {
  const marca = `${tag}-${suffix()}`;
  const tenant = await h_().admin.tenant.create({ data: { name: `Despesa sync ${marca}`, slug: `exp-sync-${marca}` } });
  h_().tenantIds.push(tenant.id);
  const user = (name: string) => h_().admin.user.create({ data: { tenant_id: tenant.id, name, email: `${name}-${marca}@example.invalid` } });
  const u1 = await user("u1");
  const u2 = await user("u2");
  const u3 = await user("u3");

  return {
    tenantId: tenant.id as string,
    u1: u1.id as string,
    u2: u2.id as string,
    u3: u3.id as string,
    tech1: actorOf(tenant.id, u1.id, TECH),
    mgr2: actorOf(tenant.id, u2.id, MANAGER),
    tech3: actorOf(tenant.id, u3.id, TECH),
  };
}

type Seed = Awaited<ReturnType<typeof seedTenant>>;

/** O que o binário ANTIGO gravava: relatório + recibo na chave CRUA + evento com o hash legado `{type, clientActionId}`. */
async function seedLegacy(t: Seed, rawId: string, actorUserId: string): Promise<string> {
  return h_().admin.$transaction(async (tx: any) => {
    const report = await tx.expenseReport.create({
      data: { tenant_id: t.tenantId, employee_user_id: actorUserId, period_start: new Date("2026-06-01"), period_end: new Date("2026-06-30"), origin: "field", advance_amount: 10, reimbursement_amount: 10, created_by: actorUserId },
    });
    await tx.mobileActionReceipt.create({
      data: { tenant_id: t.tenantId, client_action_id: rawId, actor_user_id: actorUserId, action_type: "expense_report.create", status: "processed", result_ref: report.id, processed_at: new Date() },
    });
    await tx.expenseEvent.create({
      data: { tenant_id: t.tenantId, aggregate_id: report.id, event_type: SYNC, payload_hash: h_().hashExpensePayload({ type: "expense_report.create", clientActionId: rawId }), actor_user_id: actorUserId },
    });
    return report.id as string;
  });
}

async function counts(tenantId: string) {
  const rows = (await h_().admin.$queryRaw`
    SELECT
      (SELECT count(*)::int FROM expense_reports WHERE tenant_id = ${tenantId}::uuid) AS reports,
      (SELECT count(*)::int FROM expense_reports WHERE tenant_id = ${tenantId}::uuid AND status = 'submitted') AS submitted,
      (SELECT count(*)::int FROM expense_items WHERE tenant_id = ${tenantId}::uuid) AS items,
      (SELECT count(*)::int FROM mobile_action_receipts WHERE tenant_id = ${tenantId}::uuid) AS receipts,
      (SELECT count(*)::int FROM mobile_action_receipts WHERE tenant_id = ${tenantId}::uuid AND length(client_action_id) > 160) AS k2t,
      (SELECT count(*)::int FROM mobile_action_receipts WHERE tenant_id = ${tenantId}::uuid AND result_ref IS NULL) AS pending,
      (SELECT count(*)::int FROM expense_events WHERE tenant_id = ${tenantId}::uuid) AS events,
      (SELECT count(*)::int FROM expense_events WHERE tenant_id = ${tenantId}::uuid AND event_type = ${SYNC}) AS sync_events,
      (SELECT coalesce(sum(total_amount), 0)::text FROM expense_reports WHERE tenant_id = ${tenantId}::uuid) AS total,
      (SELECT coalesce(sum(advance_amount), 0)::text FROM expense_reports WHERE tenant_id = ${tenantId}::uuid) AS advance
  `) as Array<Record<string, number | string>>;
  return rows[0] as {
    reports: number;
    submitted: number;
    items: number;
    receipts: number;
    k2t: number;
    pending: number;
    events: number;
    sync_events: number;
    total: string;
    advance: string;
  };
}

function createPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", advanceAmount: 100, ...overrides };
}

function createAction(clientActionId: string, overrides: Record<string, unknown> = {}): SyncAction {
  return { clientActionId, type: "expense_report.create", payload: createPayload(overrides) };
}

function itemAction(clientActionId: string, reportId: string, overrides: Record<string, unknown> = {}): SyncAction {
  return { clientActionId, type: "expense_item.create", payload: { reportId, categoryKey: "fuel", spentAt: "2026-06-11T10:00:00.000Z", amount: 10, ...overrides } };
}

async function sync(service: any, actor: Actor, actions: unknown[]): Promise<SyncResult[]> {
  return (await service.syncExpenseActions(actor, { actions })).results as SyncResult[];
}

function pick(result: SyncResult | undefined) {
  return {
    clientActionId: result?.clientActionId,
    status: result?.status,
    errorCode: result?.errorCode,
    resultRef: result?.resultRef,
    replayed: result?.replayed,
  };
}

function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

/**
 * A15 — o "reinício" é um processo Node NOVO: módulos, constantes e cliente Prisma nascem de novo. Ele só recebe
 * a URL do banco, o ator e o lote, monta o serviço real e devolve o resultado em uma linha JSON. Usa a conexão do
 * arnês (a propriedade medida aqui é o determinismo da chave entre processos, não o RLS, que o A0/A8 provam).
 */
function runRestartedProcess(input: { actor: Actor; actions: unknown[] }): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const script = [
    "const { PrismaPg } = await import('@prisma/adapter-pg');",
    "const { PrismaClient } = await import('@prisma/client');",
    "const root = process.env.A15_ROOT;",
    "const url = (p) => new URL('file:///' + root.replace(/\\\\/g, '/') + '/' + p).href;",
    "const { RlsPrismaExpenseManagementRepository } = await import(url('src/modules/expense-management/expense-management-prisma.repository.ts'));",
    "const { ExpenseManagementService } = await import(url('src/modules/expense-management/expense-management.service.ts'));",
    "const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.A15_DATABASE_URL }) });",
    "try {",
    "  const service = new ExpenseManagementService(new RlsPrismaExpenseManagementRepository(client));",
    "  const result = await service.syncExpenseActions(JSON.parse(process.env.A15_ACTOR), { actions: JSON.parse(process.env.A15_ACTIONS) });",
    "  console.log(JSON.stringify(result));",
    "} finally { await client.$disconnect(); }",
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        A15_ROOT: REPO_ROOT,
        A15_DATABASE_URL: withApplicationName(connectionString!, `${applicationName}-a15`),
        A15_ACTOR: JSON.stringify(input.actor),
        A15_ACTIONS: JSON.stringify(input.actions),
        EXPENSE_SYNC_FIXTURES_ONLY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    const timer = setTimeout(() => child.kill(), 90_000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function h_(): Harness {
  return harnessRef.current!;
}

const harnessRef: { current?: Harness } = {};
