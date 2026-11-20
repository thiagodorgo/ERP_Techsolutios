// B-ASS-08c3, Emenda 2 e Emenda 2.1 (a Q1 do dono = (b), "a nota fica, com aviso para o contador, até todo o dinheiro ser
// devolvido"): o estorno do provedor com dinheiro manual restante, no PRISMA, sob papel efêmero NOSUPERUSER NOBYPASSRLS.
//
//   EP1 — estorno TOTAL do pagamento do provedor, com 50,00 ainda pagos à mão e a nota `authorized` → 0 `invoice_cancel`, a nota
//         segue `authorized`, 1 linha `subscription_statement.invoice_kept_partial_reversal` em `audit_logs` da organização, com
//         as chaves da allowlist da Emenda 2.2 (igualdade de conjunto). Dono de M-EP1, M-EP2, M-EP3 e M-EP4 (E2.1-3).
//   EP2 — regressão: o estorno do provedor que ZERA o dinheiro pago → 1 `invoice_cancel`, 0 trilha; e, depois do EP1, o estorno
//         manual dos 50,00 restantes → 1 `invoice_cancel`.
//   EP3 — E2.1-1: a intenção de cancelar nasce com `paidCents = 0`; DEPOIS entra um pagamento manual; o handler do despacho
//         (`InvoiceOutboxHandler.cancel`) relê o demonstrativo sob a trava, no TOPO de `cancel()` (E2.2-1) → 0 chamada ao provedor
//         fiscal, a nota fica, 1 trilha (`code: paid_after_cancel_intent`), a linha encerra SKIPPED `statement_paid` (E2.2-2).
//         Dono de M-EP5.
//
// Este arquivo substitui o EP0, que fixava a (a); a troca da asserção `doesNotMatch(/\[EP-PARCIAL\]/)` é a exceção nominal da
// Emenda 2 §2 item 3.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";
import { source } from "./helpers/ass-08c3-test-kit.js";

// A allowlist FECHADA da Emenda 2.2 (E2.2-3, a positiva da §4.6 do plano), mais o envelope que o serviço de auditoria acrescenta
// a TODA linha de `audit_logs` (não é metadado do chamador; igual em toda trilha da casa).
const ALLOWED = ["code", "count", "kind", "reason", "statementId"];
const AUDIT_ENVELOPE = ["actorType", "correlationId", "outcome", "resourceId", "resourceType", "severity"];

test("EP-MARK: [EP-PARCIAL] existe uma vez, na condição do cancelamento da nota no estorno do provedor", () => {
  const text = source("src/modules/subscription-billing/statements/statement-settlement.service.ts");
  assert.match(text, /\[EP-PARCIAL\]/);
  assert.equal(text.split("[EP-PARCIAL]").length - 1, 1);
  assert.equal(text.split("&& savedStatement.paidCents === 0").length - 1, 1, "âncora literal da M-EP1 (E2.1-3)");
});

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  test("EP1/EP2/EP3 exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let settlement: any;
  let statementService: any;
  let outbox: any;
  let invoiceHandler: any;
  let fiscalCancelCalls = 0;
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS, serviços de produção sobre o papel", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_ep");
    const { PrismaStatementRepository } = await import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js");
    const { StatementService } = await import("../src/modules/subscription-billing/statements/statement.service.js");
    const { StatementSettlementService } = await import("../src/modules/subscription-billing/statements/statement-settlement.service.js");
    const { PrismaOutboxRepository } = await import("../src/modules/subscription-billing/outbox/outbox.prisma.js");
    const { PrismaStatementInvoiceRepository } = await import("../src/modules/subscription-billing/invoices/invoices.prisma.js");
    const { InvoiceOutboxHandler } = await import("../src/modules/subscription-billing/outbox/invoice.dispatch.js");
    const repository = new PrismaStatementRepository(kit.role.client);
    const target = { issueTarget: { provider: "focusnfe", enabled: true }, enabledInvoiceProviders: ["focusnfe"] };
    statementService = new StatementService(repository, { resolve: async () => ({ kind: "skip", reason: "no_subscription" }) } as any, { record: async () => undefined }, { invoiceIntents: { resolve: async () => target } } as any);
    settlement = new StatementSettlementService(repository, statementService, target as any);
    outbox = new PrismaOutboxRepository(kit.role.client, { tenantIds: [] });
    invoiceHandler = new InvoiceOutboxHandler({
      ports: {
        focusnfe: {
          cancel: async () => {
            fiscalCancelCalls += 1;
            return { status: "cancelled" };
          },
        } as any,
      },
      invoices: new PrismaStatementInvoiceRepository(kit.role.client),
      statements: repository,
      resolveIssueContext: async () => ({ reason: "not_used" }),
    });
  });

  async function seed(tag: string, manualCents: number, providerCents: number) {
    const totalCents = manualCents + providerCents;
    const slug = `c08c3-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (await kit.one(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)).id as string;
    const statementId = (await kit.one(
      `INSERT INTO subscription_statements (
         tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra,
         storage_included_gb, storage_peak_gb, storage_extra_gb, tracked_vehicles, days_in_month, days_measured,
         extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at
       ) VALUES ($1::uuid, '2026-10', 'paid', 'confirmed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, $2::numeric/100, 0,0, 0,0,0,
                 $2::numeric/100, $2::numeric/100, '{"latest":null,"history":[]}'::jsonb, '2099-11-10', now(), now()) RETURNING id`,
      tenantId,
      totalCents,
    )).id as string;
    if (manualCents > 0) {
      await kit.owner.$executeRawUnsafe(
        `INSERT INTO subscription_statement_payments (tenant_id, statement_id, source, amount, applied_amount, paid_at) VALUES ($1::uuid, $2::uuid, 'manual', $3::numeric/100, $3::numeric/100, now())`,
        tenantId,
        statementId,
        manualCents,
      );
    }
    const chargeId = `pay_${tag}_${randomUUID().slice(0, 8)}`;
    await kit.owner.$executeRawUnsafe(
      `INSERT INTO subscription_statement_payments (tenant_id, statement_id, source, external_charge_id, amount, applied_amount, paid_at) VALUES ($1::uuid, $2::uuid, 'asaas', $3, $4::numeric/100, $4::numeric/100, now())`,
      tenantId,
      statementId,
      chargeId,
      providerCents,
    );
    await kit.owner.$executeRawUnsafe(
      `INSERT INTO subscription_statement_invoices (tenant_id, statement_id, seq, provider, external_ref, status) VALUES ($1::uuid, $2::uuid, 1, 'focusnfe', $2 || ':1', 'authorized')`,
      tenantId,
      statementId,
    );
    return { tenantId, statementId, chargeId, providerCents };
  }
  const cancels = async (statementId: string) => Number((await kit.one(`SELECT count(*)::int AS n FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'invoice_cancel'`, statementId)).n);
  const kept = (statementId: string) =>
    kit.rows(`SELECT tenant_id, entity_id, metadata FROM audit_logs WHERE entity_id = $1 AND action = 'subscription_statement.invoice_kept_partial_reversal' ORDER BY created_at`, statementId);
  const invoiceStatus = async (statementId: string) => (await kit.one(`SELECT status FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, statementId)).status as string;
  const reverseProvider = (f: Awaited<ReturnType<typeof seed>>) =>
    settlement.applyReversal({ tenantId: f.tenantId, statementId: f.statementId, externalChargeId: f.chargeId, reversedCents: f.providerCents, kind: "refund", now: new Date() });

  function assertAllowlisted(row: { tenant_id: string; metadata: Record<string, unknown> }, f: { tenantId: string; statementId: string }, expected: Record<string, unknown>) {
    assert.equal(row.tenant_id, f.tenantId, "a trilha é da organização do demonstrativo");
    assert.deepEqual(Object.keys(row.metadata).sort(), [...ALLOWED, ...AUDIT_ENVELOPE].sort(), "as chaves da linha = a allowlist da Emenda 2.2 + o envelope da auditoria");
    for (const [key, value] of Object.entries(expected)) assert.equal(row.metadata[key], value, key);
    assert.doesNotMatch(JSON.stringify(row.metadata), /tenant_?id|token|secret|pay_|focusnfe|external/i);
  }

  test("EP1: estorno do provedor com dinheiro manual restante → a nota fica, 0 invoice_cancel, 1 trilha com a allowlist", async () => {
    const f = await seed("ep1", 5_000, 5_000);
    const result = await reverseProvider(f);
    assert.equal(result.statement.paidCents, 5_000);
    assert.equal(result.shouldCancelInvoice, false);
    assert.equal(await cancels(f.statementId), 0, "a nota NÃO é cancelada enquanto sobra dinheiro pago");
    assert.equal(await invoiceStatus(f.statementId), "authorized");
    const trails = await kept(f.statementId);
    assert.equal(trails.length, 1, "1 trilha para o contador");
    assertAllowlisted(trails[0], f, { statementId: f.statementId, kind: "invoice_kept", code: "partial_reversal", count: 5_000, reason: "q1_b_dono" });
  });

  test("EP2: o estorno do provedor que zera o dinheiro pago cancela a nota (1 invoice_cancel, 0 trilha); e o manual que zera depois do EP1 também", async () => {
    const f = await seed("ep2", 0, 5_000);
    const result = await reverseProvider(f);
    assert.equal(result.statement.paidCents, 0);
    assert.equal(await cancels(f.statementId), 1);
    assert.equal((await kept(f.statementId)).length, 0);

    const g = await seed("ep2b", 5_000, 5_000);
    await reverseProvider(g);
    assert.equal(await cancels(g.statementId), 0);
    const manual = await kit.one(`SELECT id FROM subscription_statement_payments WHERE statement_id = $1::uuid AND source = 'manual'`, g.statementId);
    await statementService.reverseManualPayment({ tenantId: g.tenantId, paymentId: manual.id, reason: "devolução do saldo manual", actorId: null, now: new Date(), confirmInvoiceCancel: true });
    assert.equal(Number((await kit.one(`SELECT paid_amount::text AS paid FROM subscription_statements WHERE id = $1::uuid`, g.statementId)).paid), 0);
    assert.equal(await cancels(g.statementId), 1);
  });

  test("EP3 (E2.1-1): pagamento manual depois da intenção → o handler relê sob a trava, 0 chamada fiscal, a nota fica, 1 trilha", async () => {
    const f = await seed("ep3", 0, 5_000);
    await reverseProvider(f);
    assert.equal(await cancels(f.statementId), 1, "a intenção nasce com paidCents = 0");
    await statementService.recordManualPayment({ tenantId: f.tenantId, statementId: f.statementId, amountCents: 5_000, method: "pix", note: null, actorId: null, now: new Date() });
    assert.equal(Number((await kit.one(`SELECT paid_amount::text AS paid FROM subscription_statements WHERE id = $1::uuid`, f.statementId)).paid), 50);
    const row = (await outbox.listByStatement(f.tenantId, f.statementId)).find((item: { kind: string }) => item.kind === "invoice_cancel");
    assert.ok(row);
    const before = fiscalCancelCalls;
    const result = await invoiceHandler.cancel(row, new Date());
    assert.deepEqual(result, { kind: "skipped", reason: "statement_paid" });
    assert.equal(fiscalCancelCalls - before, 0, "0 chamada ao provedor fiscal");
    assert.equal(await invoiceStatus(f.statementId), "authorized", "a nota fica");
    const trails = await kept(f.statementId);
    assert.equal(trails.length, 1);
    assertAllowlisted(trails[0], f, { statementId: f.statementId, kind: "invoice_kept", code: "paid_after_cancel_intent", count: 5_000, reason: "q1_b_dono" });
  });

  test("EP3-controle: sem dinheiro pago na hora do despacho, o handler cancela a nota (1 chamada fiscal)", async () => {
    const f = await seed("ep3c", 0, 5_000);
    await reverseProvider(f);
    const row = (await outbox.listByStatement(f.tenantId, f.statementId)).find((item: { kind: string }) => item.kind === "invoice_cancel");
    const before = fiscalCancelCalls;
    const result = await invoiceHandler.cancel(row, new Date());
    assert.equal(result.kind, "sent");
    assert.equal(fiscalCancelCalls - before, 1);
    assert.equal(await invoiceStatus(f.statementId), "cancelled");
    assert.equal((await kept(f.statementId)).length, 0);
  });
}
