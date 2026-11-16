// B-ASS-08c2 (item 60) · o ESTORNO MANUAL com nota (Emenda 1 §2.2, o §4.7 novo; §2.3, o §5.3): a nota viva é decidida só pelo
// que SOBROU pago depois do estorno, sem guard de status do demonstrativo. Devolveu tudo → a intenção de cancelar a nota no MESMO
// `tx` do estorno, com a confirmação do cuidado 1 (sem ela, 422 e o estorno desfaz); devolveu só uma parte → nenhuma intenção, a
// nota fica, e o backlog a mostra como `live_on_unpaid`.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup). O serviço é o da composição de PRODUÇÃO (`createPrismaStatementRuntime`, com o `[NOTA-INTENTS]`) sobre o papel, a nota
// ligada por env e pela configuração do Focus NFe `enabled`. O despacho e o webhook usam os repositórios Prisma sobre o papel e o
// falso Focus NFe de `tests/helpers/fake-providers/` em 127.0.0.1:0. A rota `reverse` (o `confirmInvoiceCancel` do corpo e o
// `data.invoice`) é da F10: aqui o `invoice` é o que o serviço devolve.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const spDayPlus = (days: number) => SP_DAY.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
const ACTOR = "usr_platform";

type Fixture = { readonly tenantId: string; readonly statementId: string };

if (!connectionString) {
  test("B-ASS-08c2 · o estorno manual com nota (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  const H: { admin: any; db: any; role: EphemeralRole; databaseName: string; focus: any; env: any; m: Record<string, any> } = {
    admin: undefined,
    db: undefined,
    role: undefined as unknown as EphemeralRole,
    databaseName: "",
    focus: undefined,
    env: undefined,
    m: {},
  };

  after(async () => {
    await H.focus?.close();
    await H.role?.drop();
    await H.db?.$disconnect();
    if (H.admin && H.databaseName) await H.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${H.databaseName}" WITH (FORCE)`);
    await H.admin?.$disconnect();
  });

  const q = (sql: string, ...args: unknown[]) => H.db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  /** Organização SEM índice prévio + demonstrativo `closed` de R$ 100,00, sem pagamento, sem cobrança e sem nota. */
  async function seedClosed(tag: string): Promise<Fixture> {
    const slug = `c2-em-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
    const statementId = (await q(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at)
       VALUES ($1::uuid,'2026-10','closed','none','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,0,'{"latest":null,"history":[]}'::jsonb,$2::date,now()) RETURNING id`,
      tenantId,
      spDayPlus(20),
    ))[0].id as string;
    return { tenantId, statementId };
  }

  const lines = (statementId: string) => q(`SELECT kind, status, skip_reason, idempotency_key, last_error FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`, statementId);
  const cancelLines = async (statementId: string) => (await lines(statementId)).filter((row) => row.kind === "invoice_cancel");
  const refsOf = (statementId: string) => q(`SELECT tenant_id, provider FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId);
  const statementRow = async (statementId: string) => (await q(`SELECT status, paid_at, paid_amount::text AS paid, total_amount::text AS total FROM subscription_statements WHERE id = $1::uuid`, statementId))[0];
  const paymentRow = async (paymentId: string) => (await q(`SELECT reversed_amount::text AS reversed, reversed_at FROM subscription_statement_payments WHERE id = $1::uuid`, paymentId))[0];
  const invoicesOf = (statementId: string) => q(`SELECT seq, status FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq`, statementId);
  const reversalTrails = (statementId: string) => q(`SELECT metadata FROM audit_logs WHERE action = 'subscription_statement.payment_reversed' AND entity_id = $1 ORDER BY created_at`, statementId);
  const callsOn = (method: string, statementId: string) =>
    H.focus.recorded.filter((r: { method: string; path: string }) => r.method === method && decodeURIComponent(r.path).includes(statementId)).length;

  /** O backlog do §4.9 pela regra pura (`backlogCategory`) sobre o ESTADO lido do banco; a rota do backlog é da F11. */
  async function backlogOf(statementId: string): Promise<string | null> {
    const st = await statementRow(statementId);
    const [{ n }] = await q(`SELECT count(*)::int AS n FROM subscription_statement_invoices i WHERE i.statement_id = $1::uuid AND i.${H.m.invoicesPrisma.LIVE_SQL}`, statementId);
    return H.m.rules.backlogCategory({
      statement: { status: st.status, totalCents: Math.round(Number(st.total) * 100), paidAt: st.paid_at },
      live: n > 0,
      cutoff: H.m.rules.INVOICE_BACKFILL_CUTOFF,
    });
  }

  function focusPort(server: any = H.focus) {
    return new H.m.focusAdapter.FocusNfeInvoiceAdapter(
      new H.m.http.BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v2` }),
      async (kind: string) => (kind === "api_token" ? "TOK-f" : "WHK-f"),
    );
  }
  const issueContext = async ({ statement }: { statement: { period: string } }) => ({
    environment: "sandbox",
    serie: 7,
    emitter: { cnpj: FISCAL.cnpj },
    borrower: { document: "99888777000166", name: "Tomadora", municipalityCode: "3550308" },
    taxProfile: H.m.invoiceDispatch.taxProfileFromSettings(FISCAL),
    serviceDescription: `Assinatura — competência ${statement.period}`,
  });

  /** Uma rodada do despacho real, recortada à organização do caso, com o falso Focus como a porta de nota ligada. */
  async function dispatch(tenantId: string, server: any = H.focus) {
    const c = H.role.client;
    return H.m.dispatcher.runDispatchOutbox({
      repo: new H.m.outboxPrisma.PrismaOutboxRepository(c, { tenantIds: [tenantId] }),
      ports: {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_em" }),
      invoices: new H.m.invoiceDispatch.InvoiceOutboxHandler({ ports: { focusnfe: focusPort(server) }, invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c), statements: new H.m.runtime.PrismaStatementRepository(c), resolveIssueContext: issueContext }),
    });
  }

  async function setInvoiceEnabled(enabled: boolean): Promise<void> {
    await H.db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = $1, enabled_environment = CASE WHEN $1 THEN 'sandbox' ELSE NULL END, updated_at = now() WHERE provider = 'focusnfe'`, enabled);
  }

  /** O webhook da nota (`ref = <id>:<seq>`) pelo reconcile real; devolve a linha do evento. */
  async function invoiceWebhook(statementId: string, seq: number): Promise<{ status: string; error: string | null }> {
    const c = H.role.client;
    const events = new H.m.webhookEvents.PrismaWebhookEventRepository(c);
    const externalEventId = `em-wh-${randomUUID()}`;
    await events.insertIfAbsent({ provider: "focusnfe", externalEventId, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: null, externalReference: `${statementId}:${seq}` }, new Date());
    await H.m.reconcile.reconcileWebhookEvent(
      {
        events,
        refs: new H.m.statementRefs.PrismaStatementRefRepository(c),
        ports: {},
        settlement: new H.m.settlement.StatementSettlementService(new H.m.runtime.PrismaStatementRepository(c), undefined as never),
        invoicePorts: { focusnfe: focusPort() },
        invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c),
      },
      { provider: "focusnfe", externalEventId },
    );
    const [event] = await q(`SELECT status, error FROM billing_webhook_events WHERE external_event_id = $1`, externalEventId);
    return event;
  }

  /** O serviço da composição de PRODUÇÃO (`[NOTA-INTENTS]`), refeito a cada chamada como uma requisição nova. */
  const service = async () => (await H.m.runtime.createPrismaStatementRuntime()).service;
  const payManual = async (f: Fixture, amountCents: number) =>
    (await service()).recordManualPayment({ tenantId: f.tenantId, statementId: f.statementId, amountCents, method: "pix", note: null, actorId: ACTOR, now: new Date() });
  const reverse = async (paymentId: string, f: Fixture, confirmInvoiceCancel?: boolean) =>
    (await service()).reverseManualPayment({ tenantId: f.tenantId, paymentId, reason: "lançado errado", actorId: ACTOR, now: new Date(), ...(confirmInvoiceCancel === undefined ? {} : { confirmInvoiceCancel }) });

  /** Paga (os valores dados, em centavos), emite a nota 1 e a autoriza pelo webhook; devolve os ids dos pagamentos. */
  async function paidWithAuthorizedInvoice(f: Fixture, amounts: readonly number[]): Promise<string[]> {
    const ids: string[] = [];
    for (const cents of amounts) ids.push((await payManual(f, cents)).payment.id);
    assert.equal((await statementRow(f.statementId)).status, "paid");
    await dispatch(f.tenantId);
    assert.equal((await invoiceWebhook(f.statementId, 1)).status, "processed");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "pré-condição: nota 1 autorizada");
    return ids;
  }

  /** Despacha o `invoice_cancel` e conclui pelo webhook: 1 DELETE no Focus falso e a nota `cancelled`. */
  async function dispatchCancel(f: Fixture): Promise<void> {
    const before = callsOn("DELETE", f.statementId);
    await dispatch(f.tenantId);
    assert.equal(callsOn("DELETE", f.statementId) - before, 1, "1 DELETE no Focus falso");
    await invoiceWebhook(f.statementId, 1);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "cancelled"]], "nota cancelada");
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, a composição de produção do serviço, a nota ligada, o falso Focus", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { createPgAdapter } = await import("../src/database/pg-connection.js");
    H.admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    H.databaseName = `${base}_c2_em_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await H.admin.$executeRawUnsafe(`CREATE DATABASE "${H.databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${H.databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    H.db = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
    H.role = await createEphemeralRole(H.db, targetUrl);
    const [posture] = (await H.db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, H.role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel de runtime é NOSUPERUSER NOBYPASSRLS");
    await H.db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind, environment, enabled, enabled_environment) VALUES ('focusnfe', 'invoice', 'sandbox', true, 'sandbox')`);
    (globalThis as { prisma?: unknown }).prisma = H.role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    const [envModule, statementFactory, vaultFactory, vaultKeys, dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, reconcile, webhookEvents, statementRefs, settlement, rules] =
      await Promise.all([
        import("../src/config/env.js"),
        import("../src/modules/subscription-billing/statements/statement.factory.js"),
        import("../src/modules/subscription-billing/vault/vault.factory.js"),
        import("../src/modules/subscription-billing/vault/vault-keys.js"),
        import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
        import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
        import("../src/modules/subscription-billing/invoices/invoices.prisma.js"),
        import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
        import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
        import("../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js"),
        import("../src/modules/subscription-billing/outbox/invoice.dispatch.js"),
        import("../src/modules/subscription-billing/webhooks/reconcile.service.js"),
        import("../src/modules/subscription-billing/webhooks/webhook-events.prisma.js"),
        import("../src/modules/subscription-billing/webhooks/statement-refs.prisma.js"),
        import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
        import("../src/modules/subscription-billing/invoices/invoice-intent-rules.js"),
      ]);
    H.m = { dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, reconcile, webhookEvents, statementRefs, settlement, rules };
    H.env = envModule.env;
    H.env.CORE_SAAS_PERSISTENCE = "prisma";
    H.env.BILLING_PROVIDERS_ENABLED = true;
    statementFactory.resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new vaultKeys.EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    // O roteiro `authorized`: a reconsulta da nota diz `autorizado`; a do cancelamento, `cancelado`.
    H.focus = await startFocusNfeFake("authorized");
  });

  test("EM1: baixa manual que quita, nota autorizada, estorno manual TOTAL com confirmInvoiceCancel → 1 invoice_cancel no tx do estorno (o seq da nota), invoice = cancel_requested, a trilha leva o invoice; despacho → 1 DELETE, nota cancelled", async () => {
    const f = await seedClosed("em1");
    const [paymentId] = await paidWithAuthorizedInvoice(f, [10_000]);
    const result = await reverse(paymentId!, f, true);
    assert.equal(result.statement.paidCents, 0);
    // Lido ANTES de qualquer despacho: a linha nasceu na transação do estorno. O efeito antes do código devolvido.
    assert.deepEqual(
      (await cancelLines(f.statementId)).map((row) => [row.idempotency_key, row.status, row.skip_reason]),
      [[`invoice_cancel:${f.statementId}:1`, "PENDING", null]],
      "1 invoice_cancel com o seq da nota",
    );
    assert.equal(result.invoice, "cancel_requested");
    assert.equal((await paymentRow(paymentId!)).reversed, "100.00", "o estorno gravou");
    assert.equal((await statementRow(f.statementId)).status, "closed");
    assert.deepEqual((await reversalTrails(f.statementId)).map((row) => row.metadata.invoice), ["cancel_requested"], "a trilha payment_reversed leva o invoice");
    await dispatchCancel(f);
  });

  test("EM2: dois pagamentos manuais (60 + 40), nota autorizada — o estorno do de 60 deixa a nota (kept_partial_reversal, live_on_unpaid); o do de 40 sem confirmação → 422 e nada gravado; com confirmação → 1 invoice_cancel, cancel_requested; despacho → DELETE, cancelled, fora do backlog", async () => {
    const f = await seedClosed("em2");
    const [p60, p40] = await paidWithAuthorizedInvoice(f, [6_000, 4_000]);
    const first = await reverse(p60!, f);
    assert.equal(first.statement.paidCents, 4_000);
    assert.deepEqual(await cancelLines(f.statementId), [], "0 invoice_cancel no 1º estorno");
    assert.equal(await backlogOf(f.statementId), "live_on_unpaid", "o backlog mostra a nota viva sobre o não pago");
    assert.equal(first.invoice, "kept_partial_reversal", "devolveu só uma parte: a nota fica");

    const linesBefore = (await lines(f.statementId)).length;
    await assert.rejects(reverse(p40!, f), (error: any) => error?.statusCode === 422 && error?.reason === "invoice_cancel_confirmation_required");
    assert.equal((await paymentRow(p40!)).reversed, "0.00", "sem confirmação, o pagamento de 40 continua não estornado");
    assert.equal((await statementRow(f.statementId)).paid, "40.00");
    assert.equal((await lines(f.statementId)).length, linesBefore, "0 linha nova");
    assert.equal((await reversalTrails(f.statementId)).length, 1, "0 trilha nova (só a do 1º estorno)");

    const second = await reverse(p40!, f, true);
    assert.deepEqual((await cancelLines(f.statementId)).map((row) => row.idempotency_key), [`invoice_cancel:${f.statementId}:1`], "o 2º estorno chega com o demonstrativo closed e devolve tudo: cancela");
    assert.equal(second.invoice, "cancel_requested");
    assert.deepEqual((await reversalTrails(f.statementId)).map((row) => row.metadata.invoice), ["kept_partial_reversal", "cancel_requested"]);
    await dispatchCancel(f);
    assert.equal(await backlogOf(f.statementId), null, "o backlog não lista mais o demonstrativo");
  });

  test("EM2-inv: a ordem inversa — o estorno do de 40 primeiro (kept_partial_reversal), depois o de 60 com confirmação → 1 invoice_cancel, cancel_requested", async () => {
    const f = await seedClosed("em2inv");
    const [p60, p40] = await paidWithAuthorizedInvoice(f, [6_000, 4_000]);
    const first = await reverse(p40!, f);
    assert.deepEqual(await cancelLines(f.statementId), []);
    assert.equal(first.invoice, "kept_partial_reversal");
    const second = await reverse(p60!, f, true);
    assert.equal(second.statement.paidCents, 0);
    assert.deepEqual((await cancelLines(f.statementId)).map((row) => row.idempotency_key), [`invoice_cancel:${f.statementId}:1`]);
    assert.equal(second.invoice, "cancel_requested");
    await dispatchCancel(f);
  });

  test("EM8 (guarda): um pagamento de só uma parte (60; nunca pago, sem nota) → o estorno passa SEM confirmação: paidCents 0, invoice = none, 0 invoice_cancel, 0 linha nova, 0 índice novo", async () => {
    const f = await seedClosed("em8");
    const { payment } = await payManual(f, 6_000);
    assert.equal((await statementRow(f.statementId)).status, "closed", "pré-condição: nunca ficou pago");
    const linesBefore = await lines(f.statementId);
    const refsBefore = await refsOf(f.statementId);
    const result = await reverse(payment.id, f);
    assert.equal(result.statement.paidCents, 0);
    assert.deepEqual(await cancelLines(f.statementId), [], "0 invoice_cancel");
    assert.deepEqual(await lines(f.statementId), linesBefore, "0 linha nova na fila");
    assert.deepEqual(await refsOf(f.statementId), refsBefore, "0 índice novo");
    assert.deepEqual(await invoicesOf(f.statementId), []);
    assert.equal(result.invoice, "none");
  });

  // ============================================================== F9b · a recusa do cancelamento, a confirmação, o cancelamento em curso, a nota desligada
  test("EM3: o Focus falso RECUSA o cancelamento (erro_cancelamento) → o estorno continua gravado, a linha vai a NEEDS_REVIEW invoice_cancel_error, a nota volta a authorized, o backlog mostra live_on_unpaid", async () => {
    const f = await seedClosed("em3");
    const [paymentId] = await paidWithAuthorizedInvoice(f, [10_000]);
    const result = await reverse(paymentId!, f, true);
    assert.deepEqual((await cancelLines(f.statementId)).map((row) => row.status), ["PENDING"]);
    assert.equal(result.invoice, "cancel_requested");
    // O despacho do cancelamento contra um Focus falso que responde `erro_cancelamento` em 200 (o cuidado 2).
    const refusing = await startFocusNfeFake("cancel_error_in_200");
    try {
      await dispatch(f.tenantId, refusing);
      assert.equal(refusing.recorded.filter((r: { method: string }) => r.method === "DELETE").length, 1, "o DELETE foi tentado");
    } finally {
      await refusing.close();
    }
    assert.equal((await paymentRow(paymentId!)).reversed, "100.00", "o estorno continua gravado");
    assert.equal((await statementRow(f.statementId)).status, "closed");
    assert.deepEqual((await cancelLines(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "invoice_cancel_error"]]);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "a nota volta a authorized");
    assert.equal(await backlogOf(f.statementId), "live_on_unpaid");
  });

  test("EM5: nota viva e estorno TOTAL SEM confirmInvoiceCancel → 422 invoice_cancel_confirmation_required, NADA gravado (o pagamento continua não estornado, 0 linha nova, 0 trilha)", async () => {
    const f = await seedClosed("em5");
    const [paymentId] = await paidWithAuthorizedInvoice(f, [10_000]);
    const linesBefore = await lines(f.statementId);
    await assert.rejects(reverse(paymentId!, f), (error: any) => error?.statusCode === 422 && error?.reason === "invoice_cancel_confirmation_required");
    await assert.rejects(reverse(paymentId!, f, false), (error: any) => error?.statusCode === 422 && error?.reason === "invoice_cancel_confirmation_required", "false também não confirma");
    assert.equal((await paymentRow(paymentId!)).reversed, "0.00", "o pagamento continua não estornado");
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual(await lines(f.statementId), linesBefore, "0 linha nova");
    assert.deepEqual(await reversalTrails(f.statementId), [], "0 trilha");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]]);
  });

  test("EM6: nota cancel_pending → o estorno total passa SEM confirmação, 0 invoice_cancel novo, invoice = cancel_in_progress", async () => {
    const f = await seedClosed("em6");
    const [paymentId] = await paidWithAuthorizedInvoice(f, [10_000]);
    const [nota] = await q(`SELECT id FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, f.statementId);
    await new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(H.role.client).markCancelPending(f.tenantId, nota.id, { reason: "payment_reversed", code: H.m.invoiceDispatch.INVOICE_CANCEL_CODE_OTHERS }, new Date());
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["cancel_pending"], "pré-condição: o cancelamento já está em curso");
    const result = await reverse(paymentId!, f);
    assert.equal((await paymentRow(paymentId!)).reversed, "100.00", "o estorno passou");
    assert.deepEqual(await cancelLines(f.statementId), [], "0 invoice_cancel novo");
    assert.equal(result.invoice, "cancel_in_progress");
  });

  test("EM7 (guarda): nota DESLIGADA — a intenção nasce PENDING provider_disabled; o estorno total → 0 invoice_cancel (não há nota viva), invoice = none, a linha fica; religar → o despacho a manda a NEEDS_REVIEW statement_not_paid", async () => {
    const f = await seedClosed("em7");
    await setInvoiceEnabled(false);
    try {
      const paymentId = (await payManual(f, 10_000)).payment.id;
      assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "invoice_issue").map((row) => [row.status, row.skip_reason]), [["PENDING", "provider_disabled"]]);
      const result = await reverse(paymentId, f);
      assert.deepEqual(await cancelLines(f.statementId), [], "0 invoice_cancel");
      assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "invoice_issue").map((row) => [row.status, row.skip_reason]), [["PENDING", "provider_disabled"]], "a linha fica");
      assert.equal(result.invoice, "none");
    } finally {
      await setInvoiceEnabled(true);
    }
    const posts = callsOn("POST", f.statementId);
    await dispatch(f.tenantId);
    assert.equal(callsOn("POST", f.statementId), posts, "0 POST: o demonstrativo não está pago");
    assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "invoice_issue").map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "statement_not_paid"]], "o comportamento da 08b no caminho do provedor, declarado");
    assert.deepEqual(await invoicesOf(f.statementId), []);
  });
}
