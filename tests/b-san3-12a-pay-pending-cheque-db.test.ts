import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — A1 / A2 / A3 / A8 / A19 / A20 / A21 do plano v3 contra o PostgreSQL REAL (repositórios Prisma, RLS,
// unidade de trabalho real): a baixa manual com cheque vinculado pendente é recusada pelo servidor, o vínculo só do
// valor exato, cancelar/excluir cheque vinculado é troca, e o título com cheque pendente não muda o valor nem some.
// A memória prova a ordem das checagens (tests/b-san3-12a-pay-pending-cheque.test.ts); aqui é o banco que responde.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-12a recusa da baixa (db) exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL e aplique as migrations." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  test("A1/A3/A8 (db): pendente → 422 title_has_pending_cheque com details e nada gravado; vence period_closed; depois do unlink a baixa passa", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a1");
      const cheque = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      const refused = await settle(h.entryService.payTitle(s.actor, s.titleId, pix(s)));
      assert.equal(refused.reason?.reason, "title_has_pending_cheque");
      assert.deepEqual(refused.reason?.details?.chequeIds, [cheque.id]);
      assert.equal(refused.reason?.details?.pendingAmount, 100);
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0);

      await h.withTenantRls(h.client, s.tenantId, (tx) => tx.financialPeriodClose.create({ data: { tenant_id: s.tenantId, period: h.deriveCompetencia(new Date()), status: "closed" } as never }));
      const precedence = await settle(h.entryService.payTitle(s.actor, s.titleId, pix(s)));
      assert.equal(precedence.reason?.reason, "title_has_pending_cheque", "o cheque pendente vence o período fechado");
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", s.tenantId);

      await h.chequeService.unlinkTitle(s.admin, cheque.id, { justification: "pagou por pix no balcão" });
      const paid = await h.entryService.payTitle(s.actor, s.titleId, pix(s));
      assert.equal(paid.titleId, s.titleId);
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
    } finally {
      await teardown(h);
    }
  });

  test("A2 (db): cheque deposited→bounced (com motivo) vinculado não bloqueia a baixa", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a2");
      const cheque = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      await h.chequeService.deposit(s.actor, cheque.id);
      const noReason = await settle(h.chequeService.bounce(s.actor, cheque.id, {}));
      assert.equal(noReason.reason?.reason, "bounce_reason_required");
      await h.chequeService.bounce(s.actor, cheque.id, { reason: "sem fundos" });
      const paid = await h.entryService.payTitle(s.actor, s.titleId, pix(s));
      assert.equal(paid.titleId, s.titleId);
    } finally {
      await teardown(h);
    }
  });

  test("A19/A20/A21 (db): valor exato no vínculo; cancel/DELETE de vinculado → cheque_linked_unlink_first; PATCH amount/DELETE do título → title_has_pending_cheque", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a19");
      const partial = await settle(h.chequeService.create(s.actor, { ...chequeBody(s, s.titleId), amount: 40 }));
      assert.equal(partial.reason?.reason, "cheque_amount_mismatch");
      assert.deepEqual(partial.reason?.details, { chequeAmount: 40, openBalance: 100 });
      assert.equal(await h.client.cheque.count({ where: { tenant_id: s.tenantId } }), 0, "o vínculo recusado não gravou nada");
      const linked = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      for (const who of [s.actor, s.admin]) {
        assert.equal((await settle(h.chequeService.cancel(who, linked.id))).reason?.reason, "cheque_linked_unlink_first");
        assert.equal((await settle(h.chequeService.delete(who, linked.id))).reason?.reason, "cheque_linked_unlink_first");
      }
      assert.equal((await settle(h.titleService.update(s.actor, s.titleId, { amount: 150 }))).reason?.reason, "title_has_pending_cheque");
      assert.equal((await settle(h.titleService.delete(s.actor, s.titleId))).reason?.reason, "title_has_pending_cheque");
      const row = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(row.amount), 100);
      assert.equal(row.deleted_at, null);
      const described = await h.titleService.update(s.actor, s.titleId, { description: "só texto" });
      assert.equal(described.description, "só texto");
    } finally {
      await teardown(h);
    }
  });

  test("A7 (db): o unlink-title pelo controller grava a auditoria CRÍTICA cheque.title_unlinked com título anterior e justificativa — sem tenant nos metadados", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a7");
      const cheque = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      const { ChequeController } = await import("../src/modules/cheques/cheque.controller.js");
      const controller = new ChequeController(async () => h.chequeService);
      const request = {
        params: { chequeId: cheque.id },
        body: { justification: "cliente pagou por pix no balcão" },
        tenantContext: s.admin,
        header: () => undefined,
        ip: "127.0.0.1",
      } as never;
      const result = (await controller.unlinkTitle(request)) as { body: { data: { titleId: string | null } } };
      assert.equal(result.body.data.titleId, null);
      const rows = await h.withTenantRls(h.client, s.tenantId, (tx) => tx.auditLog.findMany({ where: { tenant_id: s.tenantId, action: "cheque.title_unlinked" } }));
      assert.equal(rows.length, 1, "uma entrada de auditoria do desvínculo");
      const metadata = rows[0]!.metadata as Record<string, unknown>;
      assert.equal(metadata.severity, "critical");
      assert.equal(metadata.previousTitleId, s.titleId);
      assert.equal(metadata.justification, "cliente pagou por pix no balcão");
      assert.equal(rows[0]!.entity_id, cheque.id);
      assert.ok(!JSON.stringify(metadata).includes(s.tenantId), "metadados sem o tenant");
    } finally {
      await teardown(h);
    }
  });
}

// B-SAN3-12a, ciclo 2 — A30-c: a PROPRIEDADE do rastro. Toda justificativa que o validador ACEITA grava a auditoria Crítica
// verbatim; toda que ele RECUSA não desvincula nada. Antes (C2-01) NUL e surrogate isolado passavam no validador, o desvínculo
// commitava e o jsonb recusava a auditoria (engolida pelo best-effort): ato privilegiado sem rastro.
if (connectionString) {
  test("A30-c (db): justificativa recusada (NUL, surrogate alto/baixo isolado, ESC) → 400 pelo controller, title_id intacto e 0 auditoria; aceita adversarial (emoji, NFD, HTML, 500) → 200, title_id nulo e 1 auditoria Crítica com a justificativa IGUAL à enviada", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a30c");
      const { ChequeController } = await import("../src/modules/cheques/cheque.controller.js");
      const controller = new ChequeController(async () => h.chequeService);
      const unlink = (chequeId: string, justification: string) => controller.unlinkTitle({
        params: { chequeId }, body: { justification }, tenantContext: s.admin, header: () => undefined, ip: "127.0.0.1",
      } as never);
      const audits = (chequeId: string) => h.withTenantRls(h.client, s.tenantId, (tx) => tx.auditLog.findMany({ where: { tenant_id: s.tenantId, action: "cheque.title_unlinked", entity_id: chequeId } }));
      const ch = (code: number) => String.fromCharCode(code);

      const rejected: ReadonlyArray<readonly [string, string]> = [
        ["NUL", `cliente pagou ${ch(0x0000)} por pix`],
        ["surrogate alto isolado", `cliente pagou ${ch(0xd800)} por pix`],
        ["surrogate baixo isolado", `cliente pagou ${ch(0xdc00)} por pix`],
        ["ESC", `cliente pagou ${ch(0x001b)}[2J por pix`],
      ];
      const linked = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      for (const [label, justification] of rejected) {
        const outcome = await settle(unlink(linked.id, justification));
        assert.equal(outcome.ok, false, `${label}: era para recusar`);
        assert.equal((outcome.reason as { statusCode?: number }).statusCode, 400, label);
        assert.equal(outcome.reason?.reason, "invalid_justification", label);
        const row = await h.client.cheque.findUniqueOrThrow({ where: { id: linked.id } });
        assert.equal(row.title_id, s.titleId, `${label}: o vínculo ficou`);
        assert.equal((await audits(linked.id)).length, 0, `${label}: nenhuma auditoria`);
      }
      await h.chequeService.unlinkTitle(s.admin, linked.id, { justification: "limpeza do arranjo do teste" });

      const accepted: ReadonlyArray<readonly [string, string]> = [
        ["emoji", `cliente pagou ${String.fromCodePoint(0x1f600)} por pix`],
        ["NFD", `cliente pagou o cafe${ch(0x0301)} por pix`],
        ["HTML", "<script>alert(1)</script> pagou por pix"],
        ["500 caracteres", "á".repeat(500)],
      ];
      for (const [label, justification] of accepted) {
        const cheque = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
        const result = (await unlink(cheque.id, justification)) as { body: { data: { titleId: string | null } } };
        assert.equal(result.body.data.titleId, null, `${label}: desvinculou`);
        const row = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
        assert.equal(row.title_id, null, label);
        const rows = await audits(cheque.id);
        assert.equal(rows.length, 1, `${label}: exatamente uma auditoria`);
        const metadata = rows[0]!.metadata as Record<string, unknown>;
        assert.equal(metadata.severity, "critical", label);
        assert.equal(metadata.justification, justification, `${label}: gravada VERBATIM`);
      }
    } finally {
      await teardown(h);
    }
  });
}

// B-SAN3-12a (Emenda E1.F4(c)) — paridade memória × Prisma de `cheques.linkedPending*`: o MESMO arranjo (1 cheque pendente com
// título + 1 sem) nos dois repositórios do resumo dá o mesmo bloco `cheques`.
if (connectionString) {
  test("A16 (db, paridade): cheques.linkedPending* é o mesmo no resumo em memória e no Prisma para o mesmo arranjo", async () => {
    const h = await bootstrap();
    try {
      const s = await seed(h, "a16");
      await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      await h.chequeService.create(s.actor, { ...chequeBody(s, undefined), amount: 40 });
      const summary = await import("../src/modules/financial-summary/index.js");
      const fromDb = await (await summary.createDefaultFinancialSummaryService()).getSummary(s.actor);

      const accounts = await import("../src/modules/financial-accounts/financial-account.service.js");
      const titles = await import("../src/modules/financial-titles/index.js");
      const cheques = await import("../src/modules/cheques/index.js");
      const memActor = { ...s.actor, permissions: [...s.actor.permissions, "financial_accounts:create" as const, "financial_titles:create" as const] };
      const account = await accounts.createMemoryFinancialAccountService().create(memActor, { name: "Conta memória" });
      const title = await titles.createMemoryFinancialTitleService().create(memActor, {
        direction: "receivable", party_type: "customer", party_name: "Parte", amount: 100, issue_date: "2026-10-10", due_date: "2026-12-10",
      });
      // Fixture direta no repositório de memória (o serviço de cheques resolve o título pelo modo do processo, aqui Prisma):
      // o que está sob prova é a PROJEÇÃO do resumo, não o vínculo.
      const memRepo = cheques.getMemoryChequeRepositoryForTests();
      const base = { tenantId: s.tenantId, accountId: account.id, direction: "received", bank: "B", currency: "BRL" };
      await memRepo.create({ ...base, titleId: title.id, chequeNumber: "M1", amount: 100 });
      await memRepo.create({ ...base, chequeNumber: "M2", amount: 40 });
      const fromMemory = await new summary.InMemoryFinancialSummaryRepository().getSummary({ tenantId: s.tenantId, now: new Date() });

      assert.equal(fromDb.cheques.linkedPendingCount, 1);
      assert.equal(fromDb.cheques.linkedPendingAmount, 100);
      assert.deepEqual(fromMemory.cheques, fromDb.cheques, "o bloco cheques é o mesmo nos dois repositórios");
    } finally {
      await teardown(h);
    }
  });
}

type Outcome = { readonly ok: boolean; readonly reason?: { readonly reason?: string; readonly details?: Record<string, unknown> } };

async function settle(promise: Promise<unknown>): Promise<Outcome> {
  try {
    await promise;
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error as Outcome["reason"] };
  }
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap() {
  const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls }, cheques, entries, titles] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  return {
    client,
    withTenantRls,
    deriveCompetencia: titles.deriveCompetencia,
    chequeService: await cheques.createDefaultChequeService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    titleService: await titles.createDefaultFinancialTitleService(),
    tenantIds: [] as string[],
  };
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Fin 12a", email: `${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true } }));
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: {
    tenant_id: tenant.id, direction: "receivable", party_type: "customer", party_name: `Parte ${mark}`, amount: 100, currency: "BRL",
    issue_date: new Date(), due_date: new Date(), paid_amount: 0, status: "open", competencia: h.deriveCompetencia(new Date()),
  } }));
  const base = ["cheques:read", "cheques:create", "cheques:update", "financial_entries:create", "financial_entries:read", "financial_titles:update"] as const;
  return {
    tenantId: tenant.id,
    accountId: account.id,
    titleId: title.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: [...base] },
    admin: { tenantId: tenant.id, userId: user.id, roles: ["tenant_admin" as const], permissions: [...base, "cheques:unlink_title" as const] },
  };
}

function chequeBody(s: Awaited<ReturnType<typeof seed>>, titleId: string | undefined) {
  return { account_id: s.accountId, title_id: titleId, direction: "received", cheque_number: `P12A-${randomUUID().slice(0, 10)}`, bank: "Banco 12a", amount: 100 };
}

const pix = (s: Awaited<ReturnType<typeof seed>>) => ({ account_id: s.accountId, amount: 100, payment_method: "pix" });

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
