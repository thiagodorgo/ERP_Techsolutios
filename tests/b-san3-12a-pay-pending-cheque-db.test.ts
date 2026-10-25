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
