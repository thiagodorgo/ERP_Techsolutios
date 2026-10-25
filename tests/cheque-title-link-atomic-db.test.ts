import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import { assertApplicationNamePropagated, buildApplicationName, waitForOwnBlockedStatement, withApplicationName } from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("cheque-title-link");

if (!connectionString) {
  test("vínculo cheque × título exige DATABASE_URL e banco migrado", {
    skip: "Defina DATABASE_URL e aplique as migrations.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("K1-db: FK composta recusa título de outra organização e aceita título apagado logicamente", async () => {
    const h = await bootstrap(connection);
    try {
      const a = await seed(h, "fk-a");
      const b = await seed(h, "fk-b");
      await assert.rejects(
        h.client.$executeRawUnsafe(
          "insert into cheques (tenant_id,account_id,title_id,direction,cheque_number,bank,amount,currency,status) values ($1::uuid,$2::uuid,$3::uuid,'received',$4,'Banco SAN320',100,'BRL','registered')",
          a.tenantId,
          a.accountId,
          b.titleId,
          `RAW-${Math.random().toString(16).slice(2, 12)}`,
        ),
        (error: unknown) => sqlState(error) === "23503",
      );
      await h.client.financialTitle.update({ where: { id: a.titleId }, data: { deleted_at: new Date() } });
      const legacy = await h.client.cheque.create({ data: chequeData(a, a.titleId) });
      assert.equal(legacy.title_id, a.titleId);
    } finally {
      await teardown(h);
    }
  });

  test("K2-db: clear vinculado liquida título e grava uma única ponta no razão", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "clear");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      const cleared = await h.chequeService.clear(s.actor, cheque.id);
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
      assert.equal(cleared.status, "cleared");
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 100);
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.title_id, s.titleId);
      assert.equal(entries[0]?.payment_method, "check");
      assert.equal(entries[0]?.category, "cheque_clearing");
    } finally {
      await teardown(h);
    }
  });

  // B-SAN3-12a (Emenda E1.F1, "Só cheque do valor exato") — o cheque menor que o saldo não vincula; pix 200 deriva
  // partially_paid; o cheque do saldo exato compensa e leva a paid/300.
  test("K2-db: cheque menor que o saldo não vincula (422 cheque_amount_mismatch); pix 200 → partially_paid; cheque do saldo → paid/300", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "partial", "receivable", 300);
      await assert.rejects(() => h.chequeService.create(s.actor, body(s, s.titleId)), (e) => domain(e, 422, "cheque_amount_mismatch"));
      await h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 200, payment_method: "pix" });
      const partial = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(partial.status, "partially_paid");
      assert.equal(Number(partial.paid_amount), 200);
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      await h.chequeService.clear(s.actor, cheque.id);
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 300);
    } finally {
      await teardown(h);
    }
  });

  // B-SAN3-12a (E1.F1 + A28) — a baixa por pix com cheque pendente é recusada na origem; e o título pago por SQL próprio
  // (commitado; o estado legado) faz o clear falhar fechado sem segundo lançamento.
  test("K2-db: pix com cheque deposited vinculado → 422 title_has_pending_cheque e 0 lançamento; título pago por fora → o clear aborta sem segundo lançamento (A28)", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "paid-first");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      await assert.rejects(
        () => h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 100, payment_method: "pix" }),
        (e) => domain(e, 422, "title_has_pending_cheque"),
      );
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0);
      const before = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(before.status, "deposited");
      assert.equal(before.cleared_entry_id, null);

      const winner = await holdWinner(h, s, "pay-pix", { chequeId: cheque.id });
      winner.release();
      await winner.done;
      await assert.rejects(() => h.chequeService.clear(s.actor, cheque.id), (e) => domain(e, 422, "title_already_paid"));
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.status, "deposited");
      assert.equal(persisted.cleared_entry_id, null);
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 1, "só o lançamento do vencedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
    } finally {
      await teardown(h);
    }
  });

  test("K2-db: título apagado depois do vínculo fecha o clear sem efeito parcial", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "deleted");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      await h.client.financialTitle.update({ where: { id: s.titleId }, data: { deleted_at: new Date() } });
      await assert.rejects(() => h.chequeService.clear(s.actor, cheque.id), (e) => domain(e, 404, "title_not_found"));
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.status, "deposited");
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0);
    } finally {
      await teardown(h);
    }
  });

  test("K3-db: bounce restaura título e deixa saldo líquido zero", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "bounce");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      await h.chequeService.clear(s.actor, cheque.id);
      const bounced = await h.chequeService.bounce(s.actor, cheque.id, { reason: "sem fundos" });
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId }, orderBy: { created_at: "asc" } });
      assert.equal(bounced.status, "bounced");
      assert.equal(title.status, "open");
      assert.equal(Number(title.paid_amount), 0);
      assert.equal(entries.length, 2);
      assert.equal(entries.filter((entry) => entry.title_id === s.titleId).length, 1);
      const net = entries.reduce((sum, entry) => sum + (entry.direction === "in" ? 1 : -1) * Number(entry.amount), 0);
      assert.equal(net, 0);
    } finally {
      await teardown(h);
    }
  });

  test("K6-db: delete e reverse da compensação vinculada recusam pelo dono cheque", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "immutable");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      const cleared = await h.chequeService.clear(s.actor, cheque.id);
      assert.ok(cleared.clearedEntryId);
      await assert.rejects(() => h.entryService.delete(s.actor, cleared.clearedEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
      await assert.rejects(() => h.entryService.reverse(s.actor, cleared.clearedEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
    } finally {
      await teardown(h);
    }
  });
  // ---------------------------------------------------------------------------------------------
  // B-SAN3-20 — retomada (Claude Opus cobrindo o Codex): as barreiras do §2.5. Vencedor = as PEÇAS DO PRODUTO
  // na ORDEM DO PRODUTO em transação própria SEGURADA até `release()` (molde `holdWinningClear`, G6); perdedor =
  // o serviço REAL, observado BLOQUEADO em `pg_stat_activity` (escopo `application_name`) antes de liberar.
  // ---------------------------------------------------------------------------------------------

  test("K2-db (T-K2d, barreira): payTitle(pix) segurado × clear do cheque vinculado — o clear bloqueia no CAS do título e sai 422 title_already_paid; 1 lançamento; cheque deposited", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "k2d");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      const winner = await holdWinner(h, s, "pay-pix", { chequeId: cheque.id });
      const loser = settle(h.chequeService.clear(s.actor, cheque.id));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "clear perdedor no CAS do título (H3: o INSERT com FK não bloqueia)" });
      assert.equal(loser.settled(), false, "o clear perdedor TEM de estar bloqueado no row lock do título");
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "title_already_paid", "clear perdedor");
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.status, "deposited");
      assert.equal(persisted.cleared_entry_id, null);
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
      assert.equal(entries.length, 1, "exatamente o lançamento do pix");
      assert.equal(entries[0]?.payment_method, "pix");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 100);
    } finally {
      await teardown(h);
    }
  });

  test("K2-db (T-K2e, barreira): clear × clear do mesmo cheque vinculado — perdedor 409; paid_amount = 100 uma vez; 1 lançamento", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "k2e");
      const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      const winner = await holdWinner(h, s, "linked-clear", { chequeId: cheque.id });
      const loser = settle(h.chequeService.clear(s.actor, cheque.id));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "clear perdedor na transição CAS do cheque" });
      assert.equal(loser.settled(), false);
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 409, "transition_conflict", "clear perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(title.paid_amount), 100);
      assert.equal(title.status, "paid");
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.title_id, s.titleId);
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.cleared_entry_id, entries[0]?.id);
    } finally {
      await teardown(h);
    }
  });

  for (const direction of ["receivable", "payable"] as const) {
    test(`K5-db (T-K5): ${direction} — pagar primeiro e compensar primeiro pela porta nova dão ±100, 1 lançamento, título pago`, async () => {
      const h = await bootstrap(connection);
      try {
        for (const order of ["pay-clear", "clear-pay"] as const) {
          const s = await seed(h, `k5-${direction}-${order}`, direction);
          const cheque = await h.chequeService.create(s.actor, body(s, s.titleId));
          await h.chequeService.deposit(s.actor, cheque.id);
          const pay = () => settle(h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 100, payment_method: "check" })).outcome;
          let payOutcome: SettledOutcome;
          if (order === "pay-clear") {
            payOutcome = await pay();
            await h.chequeService.clear(s.actor, cheque.id);
          } else {
            await h.chequeService.clear(s.actor, cheque.id);
            payOutcome = await pay();
          }
          expectRefusedOutcome(payOutcome, 422, order === "pay-clear" ? "cheque_required" : "title_already_paid", `${direction}/${order}: /pay(check)`);
          const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
          assert.equal(Number(title.paid_amount), 100, `${direction}/${order}: paid_amount`);
          assert.equal(title.status, "paid");
          const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
          assert.equal(entries.length, 1, `${direction}/${order}: 1 lançamento`);
          assert.equal(entries[0]?.title_id, s.titleId);
          const balance = await h.entryService.balance(s.actor, s.accountId);
          assert.equal(balance.balance, direction === "receivable" ? 100 : -100, `${direction}/${order}: saldo`);
        }
      } finally {
        await teardown(h);
      }
    });
  }

  test("K10-db (T-K10a, barreira — a sonda r1 refeita): PATCH title_id leu 'registered'; deposit+clear commitam; o PATCH sai 422 e o cheque fica cleared SEM title_id", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "k10a");
      const cheque = await h.chequeService.create(s.actor, { ...body(s, s.titleId), title_id: undefined });
      const winner = await holdWinner(h, s, "deposit-and-clear-unlinked", { chequeId: cheque.id });
      const loser = settle(h.chequeService.update(s.actor, cheque.id, { title_id: s.titleId }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "PATCH perdedor no UPDATE condicional do cheque" });
      assert.equal(loser.settled(), false);
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "cheque_not_editable", "PATCH perdedor");
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.status, "cleared");
      assert.equal(persisted.title_id, null, "nunca o vínculo póstumo de F23");
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.title_id, null);
      assert.equal(Number((await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } })).paid_amount), 0);
    } finally {
      await teardown(h);
    }
  });

  test("K10-db (T-K10b, barreira): PATCH title_id × deposit — deposit vence → PATCH 422; PATCH vence → o deposit re-avalia 'registered' e passa (resultado sequencial)", async () => {
    const h = await bootstrap(connection);
    try {
      const a = await seed(h, "k10b-deposit-first");
      const first = await h.chequeService.create(a.actor, { ...body(a, a.titleId), title_id: undefined });
      const depositWinner = await holdWinner(h, a, "deposit", { chequeId: first.id });
      const patchLoser = settle(h.chequeService.update(a.actor, first.id, { title_id: a.titleId }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "PATCH perdedor atrás do deposit" });
      assert.equal(patchLoser.settled(), false);
      depositWinner.release();
      await depositWinner.done;
      expectRefusedOutcome(await patchLoser.outcome, 422, "cheque_not_editable", "PATCH perdedor");
      const afterDeposit = await h.client.cheque.findUniqueOrThrow({ where: { id: first.id } });
      assert.equal(afterDeposit.status, "deposited");
      assert.equal(afterDeposit.title_id, null);

      const b = await seed(h, "k10b-patch-first");
      const second = await h.chequeService.create(b.actor, { ...body(b, b.titleId), title_id: undefined });
      const patchWinner = await holdWinner(h, b, "patch-link", { chequeId: second.id });
      const depositAfter = settle(h.chequeService.deposit(b.actor, second.id));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "deposit atrás do PATCH" });
      assert.equal(depositAfter.settled(), false);
      patchWinner.release();
      await patchWinner.done;
      const outcome = await depositAfter.outcome;
      assert.equal(outcome.rejected, false, `o PATCH não muda o status: o deposit re-avalia 'registered' e passa (${JSON.stringify(outcome.error)})`);
      const afterPatch = await h.client.cheque.findUniqueOrThrow({ where: { id: second.id } });
      assert.equal(afterPatch.status, "deposited");
      assert.equal(afterPatch.title_id, b.titleId, "o vínculo foi gravado em 'registered' e segue no depósito");
    } finally {
      await teardown(h);
    }
  });

  test("K10-db (T-K10c, barreira): DELETE × clear — o DELETE sai 422 e o cheque fica vivo e cleared", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "k10c");
      const cheque = await h.chequeService.create(s.actor, { ...body(s, s.titleId), title_id: undefined });
      const winner = await holdWinner(h, s, "deposit-and-clear-unlinked", { chequeId: cheque.id });
      const loser = settle(h.chequeService.delete(s.actor, cheque.id));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "DELETE perdedor no UPDATE condicional do cheque" });
      assert.equal(loser.settled(), false);
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "cheque_not_editable", "DELETE perdedor");
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.status, "cleared");
      assert.equal(persisted.deleted_at, null);
    } finally {
      await teardown(h);
    }
  });

  test("K10-db (T-K10e — a sonda r1 sequencial): depois de deposit+clear, o UPDATE/softDelete do repositório casa 0 linhas e o serviço responde 422", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "k10e");
      const cheque = await h.chequeService.create(s.actor, { ...body(s, s.titleId), title_id: undefined });
      await h.chequeService.deposit(s.actor, cheque.id);
      await h.chequeService.clear(s.actor, cheque.id);
      const rows = await h.withTenantRls(h.client, s.tenantId, async (tx) => ({
        update: await new h.PrismaChequeRepository(tx).update({ tenantId: s.tenantId, chequeId: cheque.id, titleId: s.titleId }),
        softDelete: await new h.PrismaChequeRepository(tx).softDelete(s.tenantId, cheque.id),
      }));
      assert.equal(rows.update, undefined, "UPDATE … AND status='registered' → 0 linhas");
      assert.equal(rows.softDelete, undefined);
      await assert.rejects(() => h.chequeService.update(s.actor, cheque.id, { title_id: s.titleId }), (e) => domain(e, 422, "cheque_not_editable"));
      const persisted = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
      assert.equal(persisted.title_id, null);
      assert.equal(persisted.deleted_at, null);
    } finally {
      await teardown(h);
    }
  });
}

// ------------------------------------- arnês das barreiras -------------------------------------

type SettledOutcome = { readonly rejected: boolean; readonly error: unknown };

/** Captura liquidada ANTES do primeiro await: o desfecho nunca vira unhandledRejection e o teste lê `settled()`. */
function settle(promise: Promise<unknown>) {
  let done = false;
  const outcome: Promise<SettledOutcome> = promise.then(
    () => ({ rejected: false, error: undefined }),
    (error: unknown) => ({ rejected: true, error }),
  ).finally(() => {
    done = true;
  });
  return { outcome, settled: () => done };
}

function expectRefusedOutcome(outcome: SettledOutcome, statusCode: number, reason: string, what: string): void {
  assert.ok(outcome.rejected, `${what}: tinha de RECUSAR e aceitou`);
  assert.ok(
    domain(outcome.error, statusCode, reason),
    `${what}: motivo errado — esperava ${statusCode}/${reason}, veio ${JSON.stringify({
      statusCode: (outcome.error as { statusCode?: unknown })?.statusCode,
      reason: (outcome.error as { reason?: unknown })?.reason,
      message: (outcome.error as Error)?.message,
    })}`,
  );
}

type WinnerKind = "pay-pix" | "linked-clear" | "deposit" | "deposit-and-clear-unlinked" | "patch-link";

/**
 * O VENCEDOR segurado: peças do produto na ordem do produto, numa transação aberta até `release()`. Enquanto ela não
 * commita, o efeito é invisível (READ COMMITTED) — o perdedor real passa o pré-check e bloqueia no row lock.
 */
async function holdWinner(h: Harness, s: Awaited<ReturnType<typeof seed>>, kind: WinnerKind, refs: { readonly chequeId: string }) {
  const occurredAt = new Date();
  const period = h.deriveCompetencia(occurredAt);
  const direction = s.direction === "receivable" ? "in" : "out";
  let release!: () => void;
  const mayCommit = new Promise<void>((resolve) => {
    release = resolve;
  });
  let ready!: () => void;
  const isReady = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const tx = h.client.$transaction(
    async (txClient) => {
      await h.setTenantRlsContext(txClient, s.tenantId);
      const cheques = new h.PrismaChequeRepository(txClient);
      const entries = new h.PrismaFinancialEntryRepository(txClient);
      const titles = new h.PrismaFinancialTitleRepository(txClient);
      if (kind === "pay-pix") {
        await h.acquirePeriodLockShared(txClient, s.tenantId, period);
        await entries.create({
          tenantId: s.tenantId, accountId: s.accountId, titleId: s.titleId, direction, amount: 100, currency: "BRL",
          paymentMethod: "pix", occurredAt, competencia: period, createdBy: s.userId, updatedBy: s.userId,
        });
        assert.ok(await titles.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 100, updatedBy: s.userId }), "o pix vencedor passa o CAS do título");
      } else if (kind === "linked-clear") {
        await h.acquirePeriodLockShared(txClient, s.tenantId, period);
        const reserved = await cheques.transition({ tenantId: s.tenantId, chequeId: refs.chequeId, fromStatus: "deposited", toStatus: "cleared", clearedEntryId: null, updatedBy: s.userId });
        assert.ok(reserved?.titleId, "o vencedor vê o vínculo na tupla travada");
        const entry = await entries.create({
          tenantId: s.tenantId, accountId: s.accountId, titleId: reserved.titleId, direction, amount: 100, currency: "BRL",
          paymentMethod: "check", category: "cheque_clearing", occurredAt, competencia: period, createdBy: s.userId, updatedBy: s.userId,
        });
        assert.ok(await titles.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: reserved.titleId, amount: 100, updatedBy: s.userId }), "o clear vencedor passa o CAS do título");
        assert.ok(await cheques.attachClearingEntry(s.tenantId, refs.chequeId, entry.id, s.userId));
      } else if (kind === "deposit") {
        assert.ok(await cheques.transition({ tenantId: s.tenantId, chequeId: refs.chequeId, fromStatus: "registered", toStatus: "deposited", updatedBy: s.userId }));
      } else if (kind === "deposit-and-clear-unlinked") {
        assert.ok(await cheques.transition({ tenantId: s.tenantId, chequeId: refs.chequeId, fromStatus: "registered", toStatus: "deposited", updatedBy: s.userId }));
        await h.acquirePeriodLockShared(txClient, s.tenantId, period);
        assert.ok(await cheques.transition({ tenantId: s.tenantId, chequeId: refs.chequeId, fromStatus: "deposited", toStatus: "cleared", clearedEntryId: null, updatedBy: s.userId }));
        const entry = await entries.create({
          tenantId: s.tenantId, accountId: s.accountId, direction, amount: 100, currency: "BRL",
          paymentMethod: "check", category: "cheque_clearing", occurredAt, competencia: period, createdBy: s.userId, updatedBy: s.userId,
        });
        assert.ok(await cheques.attachClearingEntry(s.tenantId, refs.chequeId, entry.id, s.userId));
      } else {
        assert.ok(await cheques.update({ tenantId: s.tenantId, chequeId: refs.chequeId, titleId: s.titleId, updatedBy: s.userId }), "o PATCH vencedor grava em 'registered'");
      }
      ready();
      await mayCommit;
    },
    { timeout: 30000, maxWait: 10000 },
  );
  const settled = settle(tx);
  let holding = false;
  await Promise.race([
    isReady.then(() => {
      holding = true;
    }),
    settled.outcome.then((o) => {
      if (!holding) assert.fail(`o vencedor morreu antes de segurar: ${String((o.error as Error)?.message ?? o.error)}`);
    }),
  ]);
  return {
    release,
    done: settled.outcome.then((o) => {
      assert.equal(o.rejected, false, `transação do vencedor: ${String((o.error as Error)?.message ?? o.error)}`);
    }),
  };
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    { acquirePeriodLockShared },
    cheques,
    entries,
    titles,
    { PrismaChequeRepository },
    { PrismaFinancialEntryRepository },
    { PrismaFinancialTitleRepository },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/cheques/cheque-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  return {
    client,
    withTenantRls,
    setTenantRlsContext,
    acquirePeriodLockShared,
    PrismaChequeRepository,
    PrismaFinancialEntryRepository,
    PrismaFinancialTitleRepository,
    deriveCompetencia: titles.deriveCompetencia,
    chequeService: await cheques.createDefaultChequeService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    tenantIds: [] as string[],
  };
}

async function seed(h: Harness, tag: string, direction: "receivable" | "payable" = "receivable", amount = 100) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN320 ${mark}`, slug: `san320-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: {
    tenant_id: tenant.id, name: "Financeiro SAN320", email: `${mark}@example.com`,
  } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: {
    tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true,
  } }));
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: {
    tenant_id: tenant.id,
    direction,
    party_type: direction === "receivable" ? "customer" : "supplier",
    party_name: `Parte ${mark}`,
    amount,
    currency: "BRL",
    issue_date: new Date(),
    due_date: new Date(),
    paid_amount: 0,
    status: "open",
    competencia: h.deriveCompetencia(new Date()),
  } }));
  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    titleId: title.id,
    direction,
    actor: {
      tenantId: tenant.id,
      userId: user.id,
      roles: ["finance" as const],
      permissions: ["cheques:read" as const, "cheques:create" as const, "cheques:update" as const, "financial_entries:create" as const],
    },
  };
}

function body(seed: Awaited<ReturnType<typeof seed>>, titleId: string) {
  return {
    account_id: seed.accountId,
    title_id: titleId,
    direction: seed.direction === "receivable" ? "received" : "issued",
    cheque_number: `S320-${Math.random().toString(16).slice(2, 12)}`,
    bank: "Banco SAN320",
    amount: 100,
  };
}

function chequeData(seed: Awaited<ReturnType<typeof seed>>, titleId: string) {
  return {
    tenant_id: seed.tenantId,
    account_id: seed.accountId,
    title_id: titleId,
    direction: seed.direction === "receivable" ? "received" : "issued",
    cheque_number: `RAW-${Math.random().toString(16).slice(2, 12)}`,
    bank: "Banco SAN320",
    amount: 100,
    currency: "BRL",
    status: "registered",
  };
}

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: string; meta?: { code?: string }; cause?: { code?: string } };
  return candidate.meta?.code ?? candidate.cause?.code ?? String(error).match(/\b23503\b/)?.[0] ?? candidate.code;
}

async function teardown(h: Harness): Promise<void> {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from cheques where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_titles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally {
    await h.client.$disconnect();
  }
}
