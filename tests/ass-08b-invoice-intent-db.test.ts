// B-ASS-08b · conserto da J-530 (plano `B-ASS-08b-conserto-530-v2.md` §5, com os 6 requisitos da crítica r2) — os
// TESTES-DONO da propriedade P-NOTA-SEM-RECEITA, no BANCO, sob o papel de runtime NOSUPERUSER NOBYPASSRLS (atributos
// conferidos no setup), com os repositórios Prisma reais e os falsos Asaas/Focus de `tests/helpers/fake-providers/`:
//   (D) a intenção de nota nasce na MESMA transação da baixa (T-INTX-1, 2, 5, 6, 8a, 9a/9b);
//   (B) toda nota VIVA no estorno total/chargeback ganha `invoice_cancel` na transação da reversão (T-INTX-3, 4, 6c, 7, 11a);
//   (C) o cancelamento ESPERA a nota pendente, sem gastar tentativa; passou do teto, RECONSULTA antes de ir a revisão
//       (T-INTX-11b..f; CRIT530R2-03);
//   (A) nenhuma emissão começa sem `paid`, e a nota pendente de órfã sobre demonstrativo que saiu de `paid` é decidida pela
//       reconsulta, também quando a leitura sem trava já vê o estorno (T-INTX-12a..d; CRIT530R2-01);
//   C2-A4: a cobrança reconsultada é do demonstrativo (T-WH-5b-db).
// No objeto `6e236f4e` as pontes `enqueueInvoiceIssue/Cancel` entram por um objeto espalhado, cópia LITERAL de
// `channel.runtime.ts:188-196` (inclusive o `if (!invoiceProvider) return;`); depois do conserto ninguém as lê (R-INTX-10).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startAsaasFake } from "./helpers/fake-providers/asaas.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import type { InvoiceProviderPort } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import type { PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { PrismaStatementRepository } from "../src/modules/subscription-billing/statements/statement.prisma-runtime.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { PrismaWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.prisma.js";
import { PrismaStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.prisma.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { PrismaStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.prisma.js";
import { PrismaStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.prisma.js";
import { PrismaProviderCustomerStore } from "../src/modules/subscription-billing/charges/provider-customer.prisma.js";
import { taxProfileFromSettings } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";
import { runBillingDispatch, runBillingReconcileEvent, runBillingPollPending, type ChannelDeps } from "../src/modules/subscription-billing/outbox/channel.jobs.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const MIN = 60_000;
const HOUR = 60 * MIN;

if (!connectionString) {
  test("B-ASS-08b · intenção de nota (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão de manutenção (base do cluster): CREATE/DROP DATABASE e pg_stat_activity
  let db: any; // conexão de DONO na BASE DO TESTE: semente, leituras de controle e o `H` do T-INTX-9b
  let role: EphemeralRole;
  let dbName: string;
  let targetUrl: string;
  let asaasFake: any;
  const focus: Record<"authorized" | "ok" | "rejected", any> = {} as never;

  after(async () => {
    await asaasFake?.close();
    for (const server of Object.values(focus)) await server?.close();
    await role?.drop();
    await db?.$disconnect();
    if (admin && dbName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function seed(slug: string): Promise<{ tenantId: string; statementId: string }> {
    const t = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, slug)) as Array<{ id: string }>;
    const tenantId = t[0]!.id;
    const s = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at)
       VALUES ($1::uuid,'2026-10','closed','pending','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,0,'{"latest":null,"history":[]}'::jsonb,'2026-11-10',now()) RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    const statementId = s[0]!.id;
    await db.$executeRawUnsafe(
      `INSERT INTO tenant_billing_profiles (tenant_id, legal_name, document, email, payment_method, asaas_customer_id) VALUES ($1::uuid,'Org intenção','11222333000181','f@x.com','pix','cus_intx')`,
      tenantId,
    );
    return { tenantId, statementId };
  }

  async function createCharge(statementId: string | undefined, value = 100): Promise<string> {
    const body: Record<string, unknown> = { customer: "cus_intx", billingType: "PIX", value, dueDate: "2026-11-10" };
    if (statementId !== undefined) body.externalReference = statementId;
    const r = await fetch(`${asaasFake.baseUrl}/v3/payments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return ((await r.json()) as { id: string }).id;
  }

  type FocusMode = keyof typeof focus;
  type WorldOptions = { invoiceOn?: boolean; focusMode?: FocusMode; invoicePort?: (real: InvoiceProviderPort) => InvoiceProviderPort; paymentPort?: (real: PaymentProviderPort) => PaymentProviderPort; issueTarget?: { provider: string; enabled: boolean }; enabledInvoiceProviders?: string[] };
  type World = { deps: ChannelDeps; statements: PrismaStatementRepository; service: StatementService; settlement: StatementSettlementService; outbox: PrismaOutboxRepository; invoices: PrismaStatementInvoiceRepository; focusServer: any; focusPort: InvoiceProviderPort };

  function world(tenantIds: string[], options: WorldOptions = {}): World {
    const invoiceOn = options.invoiceOn ?? true;
    const focusServer = focus[options.focusMode ?? "authorized"];
    const c = role.client;
    const asaasReal = new AsaasPaymentAdapter(
      new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${asaasFake.baseUrl}/v3` }),
      async (k) => (k === "api_token" ? "TOK" : "WHK"),
    );
    const focusReal = new FocusNfeInvoiceAdapter(
      new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${focusServer.baseUrl}/v2` }),
      async (k) => (k === "api_token" ? "TOK-f" : "WHK-f"),
    );
    const focusPort = options.invoicePort ? options.invoicePort(focusReal) : focusReal;
    const asaas = options.paymentPort ? options.paymentPort(asaasReal) : asaasReal;
    const statements = new PrismaStatementRepository(c);
    const service = new StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
    const outbox = new PrismaOutboxRepository(c, { tenantIds });
    const invoices = new PrismaStatementInvoiceRepository(c);
    const customers = new PrismaProviderCustomerStore(c);
    const intents = {
      issueTarget: options.issueTarget ?? { provider: "focusnfe", enabled: invoiceOn },
      enabledInvoiceProviders: options.enabledInvoiceProviders ?? (invoiceOn ? ["focusnfe"] : []),
    };
    // No objeto, o 3º argumento é ignorado em tempo de execução (o tsx não confere tipos).
    const settlement = new (StatementSettlementService as unknown as new (...args: unknown[]) => StatementSettlementService)(statements, service, intents);
    const invoiceProvider = invoiceOn ? "focusnfe" : null;
    // Cópia literal de channel.runtime.ts:188-196 no objeto 6e236f4e (as pontes fora da transação).
    const bridges = {
      enqueueInvoiceIssue: async ({ tenantId, statementId }: { tenantId: string; statementId: string }) => {
        if (!invoiceProvider) return;
        await outbox.enqueue({ tenantId, statementId, kind: "invoice_issue", provider: invoiceProvider, seq: 1, payload: { seq: 1 } }, new Date());
      },
      enqueueInvoiceCancel: async ({ tenantId, statementId }: { tenantId: string; statementId: string }) => {
        if (!invoiceProvider) return;
        await outbox.enqueue({ tenantId, statementId, kind: "invoice_cancel", provider: invoiceProvider, seq: 1, payload: { reason: "payment_reversed" } }, new Date());
      },
    };
    const deps: ChannelDeps = {
      ...bridges,
      outbox,
      events: new PrismaWebhookEventRepository(c),
      refs: new PrismaStatementRefRepository(c),
      charges: new PrismaStatementChargeRepository(c),
      ports: { asaas },
      resolveCustomer: async () => ({ ok: true, customerId: "cus_intx" }),
      settlement,
      statements,
      ...(invoiceOn ? { invoicePorts: { focusnfe: focusPort } } : { invoicePorts: {} }),
      invoices,
      resolveIssueContext: async ({ statement }) => ({
        environment: "sandbox",
        serie: 7,
        emitter: { cnpj: FISCAL.cnpj },
        borrower: { document: "99888777000166", name: "Tomadora", municipalityCode: "3550308" },
        taxProfile: taxProfileFromSettings(FISCAL),
        serviceDescription: `Assinatura — competência ${statement.period}`,
      }),
      resolveExpectedCustomerId: (tenantId, provider) => customers.get(tenantId, provider),
    };
    return { deps, statements, service, settlement, outbox, invoices, focusServer, focusPort };
  }

  const at = (ms: number) => () => new Date(Date.now() + ms);

  async function rowsOf(statementId: string) {
    const st = (await db.$queryRawUnsafe(`SELECT status, charge_status, invoice_status, paid_amount::text AS paid FROM subscription_statements WHERE id=$1::uuid`, statementId)) as any[];
    const pay = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM subscription_statement_payments WHERE statement_id=$1::uuid`, statementId)) as any[];
    const credits = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM subscription_credits WHERE origin_statement_id=$1::uuid`, statementId)) as any[];
    const outbox = (await db.$queryRawUnsafe(
      `SELECT kind, provider, status, skip_reason, attempts, last_error, idempotency_key, next_attempt_at, created_at FROM billing_outbox WHERE statement_id=$1::uuid ORDER BY created_at, kind`,
      statementId,
    )) as any[];
    const invoices = (await db.$queryRawUnsafe(`SELECT seq, provider, status, error, provider_invoice_id, numero_dps FROM subscription_statement_invoices WHERE statement_id=$1::uuid ORDER BY seq`, statementId)) as any[];
    return { st: st[0], payments: pay[0].n as number, credits: credits[0].n as number, outbox, invoices };
  }
  const ofKind = (rows: any[], kind: string) => rows.filter((row) => row.kind === kind);
  const callsTo = (server: any, method: string, statementId: string) =>
    server.recorded.filter((r: { method: string; path: string }) => r.method === method && decodeURIComponent(r.path).includes(statementId)).length;

  async function event(w: World, chargeId: string, statementId: string, id: string) {
    await w.deps.events.insertIfAbsent({ provider: "asaas", externalEventId: id, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: chargeId, externalReference: statementId }, new Date());
    return runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: id });
  }
  async function pay(w: World, tenantId: string, statementId: string, tag: string) {
    const chargeId = await createCharge(statementId);
    await w.deps.refs.put({ statementId, tenantId, provider: "asaas", externalChargeId: chargeId }, new Date());
    asaasFake.setPaymentStatus(chargeId, "CONFIRMED");
    const outcome = await event(w, chargeId, statementId, `${tag}_pay_${statementId}`);
    return { chargeId, outcome };
  }
  async function refund(w: World, statementId: string, chargeId: string, tag: string) {
    asaasFake.setPaymentStatus(chargeId, "REFUNDED");
    return event(w, chargeId, statementId, `${tag}_ref_${statementId}`);
  }
  /** Pago → emitido (nota `pending`) → reconsulta autoriza (nota `authorized`). */
  async function authorizedInvoice(w: World, tenantId: string, statementId: string, tag: string) {
    const { chargeId } = await pay(w, tenantId, statementId, tag);
    await runBillingDispatch(w.deps);
    await runBillingPollPending({ ...w.deps, now: at(2 * HOUR) });
    const r = await rowsOf(statementId);
    assert.equal(r.invoices[0]?.status, "authorized", `pré-condição: nota autorizada (${JSON.stringify(r.invoices)})`);
    return chargeId;
  }
  /** Queda DEPOIS do commit: o mesmo ponto existe no objeto e no conserto (a transação commita, e quem chamou recebe erro). */
  function crashAfterCommit(w: World) {
    const repo = w.statements as any;
    const orig = repo.transaction.bind(repo);
    const state = { armed: false, fired: 0 };
    repo.transaction = async (t: string, work: any) => {
      const value = await orig(t, work);
      if (state.armed) {
        state.armed = false;
        state.fired += 1;
        throw new Error("simulated_crash_after_commit");
      }
      return value;
    };
    return state;
  }
  /** Troca o `tx` entregue ao trabalho da transação (para injetar falha ou tirar as operações da intenção). */
  function wrapTx(w: World, wrap: (tx: any) => any) {
    const repo = w.statements as any;
    const orig = repo.transaction.bind(repo);
    repo.transaction = (t: string, work: any) => orig(t, (tx: any) => work(wrap(tx)));
  }
  /** Linha `invoice_issue` órfã: PROCESSING com `attempt_started_at` além do limite de órfã (10 min). */
  async function makeOrphan(statementId: string) {
    await db.$executeRawUnsafe(
      `UPDATE billing_outbox SET status = 'PROCESSING', attempts = 1, claimed_at = now() - interval '20 minutes', claimed_by = 'zumbi', attempt_started_at = now() - interval '20 minutes' WHERE statement_id = $1::uuid AND kind = 'invoice_issue'`,
      statementId,
    );
  }
  async function beginPending(w: World, tenantId: string, statementId: string) {
    return w.invoices.beginIssue({ tenantId, statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, new Date());
  }

  test("setup: base própria, migrate deploy e papel efêmero NOSUPERUSER NOBYPASSRLS; falsos Asaas/Focus", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    dbName = `intx530_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE template0`);
    const u = new URL(connectionString!);
    u.pathname = `/${dbName}`;
    targetUrl = u.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const posture = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as any[];
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }], "o papel de runtime é NOSUPERUSER NOBYPASSRLS");
    asaasFake = await startAsaasFake();
    // Os três falsos do Focus compartilham o mapa de notas do módulo (refs únicas por demonstrativo); muda só o roteiro.
    focus.authorized = await startFocusNfeFake("authorized");
    focus.ok = await startFocusNfeFake("ok");
    focus.rejected = await startFocusNfeFake("rejected");
  });

  // ============================================================== (D) a intenção nasce na transação da baixa
  test("T-INTX-1 (R-INTX-1, I1): queda DEPOIS do commit do 1º pagamento → a retentativa e o despacho deixam 1 invoice_issue, 1 nota e 1 POST /nfsen", async () => {
    const { tenantId, statementId } = await seed(`intx1-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const crash = crashAfterCommit(w);
    const chargeId = await createCharge(statementId);
    await w.deps.refs.put({ statementId, tenantId, provider: "asaas", externalChargeId: chargeId }, new Date());
    asaasFake.setPaymentStatus(chargeId, "CONFIRMED");
    crash.armed = true;
    const first = await event(w, chargeId, statementId, `intx1_${statementId}`).then((v) => v, (e: Error) => `rejected:${e.message}`);
    const retry = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `intx1_${statementId}` });
    await runBillingDispatch(w.deps);
    const r = await rowsOf(statementId);
    assert.equal(crash.fired, 1, `a queda aconteceu (${first}, ${retry})`);
    assert.equal(r.st.status, "paid");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1, `1 invoice_issue: ${JSON.stringify(r.outbox)}`);
    assert.equal(r.invoices.length, 1, "1 nota");
    assert.equal(callsTo(w.focusServer, "POST", statementId), 1, "1 POST /nfsen");
  });

  test("T-INTX-2 (R-INTX-2, I2): o mesmo no monotônico (60 → 100) com queda depois do commit → 1 invoice_issue", async () => {
    const { tenantId, statementId } = await seed(`intx2-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const base = { tenantId, statementId, source: "asaas" as const, externalChargeId: `ch_intx2_${statementId}`, method: null };
    await w.settlement.settle({ ...base, paidCents: 6000, now: new Date() });
    const crash = crashAfterCommit(w);
    crash.armed = true;
    const first = await w.settlement.settle({ ...base, paidCents: 10000, now: new Date() }).then((v) => v.kind, (e: Error) => `rejected:${e.message}`);
    const retry = await w.settlement.settle({ ...base, paidCents: 10000, now: new Date() });
    const r = await rowsOf(statementId);
    assert.equal(crash.fired, 1, `a queda aconteceu (${first}, ${retry.kind})`);
    assert.equal(r.st.status, "paid");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1, `1 invoice_issue: ${JSON.stringify(r.outbox)}`);
  });

  test("T-INTX-5 (R-INTX-5): falha ao gravar a intenção → NADA commita; a retentativa deixa 1 pagamento e 1 invoice_issue", async () => {
    const { tenantId, statementId } = await seed(`intx5-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    let fail = true;
    wrapTx(w, (tx) => ({
      ...tx,
      enqueueOutbox: async (...args: unknown[]) => {
        if (fail) {
          fail = false;
          throw new Error("injected_enqueue_failure");
        }
        return tx.enqueueOutbox(...args);
      },
    }));
    const input = { tenantId, statementId, source: "asaas" as const, externalChargeId: `ch_intx5_${statementId}`, paidCents: 10000, method: null };
    await assert.rejects(w.settlement.settle({ ...input, now: new Date() }), /injected_enqueue_failure/, "a falha da intenção derruba a baixa");
    const mid = await rowsOf(statementId);
    assert.equal(mid.payments, 0, "nenhum pagamento commitado");
    assert.equal(mid.st.status, "closed");
    assert.equal(mid.outbox.length, 0);
    await w.settlement.settle({ ...input, now: new Date() });
    const r = await rowsOf(statementId);
    assert.equal(r.payments, 1);
    assert.equal(r.st.status, "paid");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1);
  });

  test("T-INTX-8a (R-INTX-8a): com `invoiceIntents` e um `tx` sem as operações da intenção, a baixa LANÇA e desfaz", async () => {
    const { tenantId, statementId } = await seed(`intx8-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    wrapTx(w, (tx) => {
      const { enqueueOutbox: _e, findLiveInvoice: _f, ...rest } = tx;
      return rest;
    });
    await assert.rejects(
      w.settlement.settle({ tenantId, statementId, source: "asaas", externalChargeId: `ch_intx8_${statementId}`, paidCents: 10000, method: null, now: new Date() }),
      /invoice_intent_tx_unsupported/,
    );
    const r = await rowsOf(statementId);
    assert.equal(r.payments, 0, "nada commitou");
    assert.equal(r.st.status, "closed");
  });

  test("T-INTX-6a/6b (R-INTX-6, I6, I8): provedor de nota DESLIGADO → PENDING + provider_disabled logo depois da baixa; religar → 1 nota e skip_reason NULL", async () => {
    const { tenantId, statementId } = await seed(`intx6-${randomUUID().slice(0, 6)}`);
    const off = world([tenantId], { invoiceOn: false });
    // O índice global do demonstrativo existe desde o fechamento (é por ele que o claim acha a organização).
    await off.deps.refs.put({ statementId, tenantId, provider: "asaas", externalChargeId: `ch_intx6_${statementId}` }, new Date());
    await off.settlement.settle({ tenantId, statementId, source: "asaas", externalChargeId: `ch_intx6_${statementId}`, paidCents: 10000, method: null, now: new Date() });
    const a = await rowsOf(statementId);
    assert.deepEqual(
      a.outbox.map((row) => ({ kind: row.kind, provider: row.provider, status: row.status, skip_reason: row.skip_reason })),
      [{ kind: "invoice_issue", provider: "focusnfe", status: "PENDING", skip_reason: "provider_disabled" }],
      "6a: a intenção nasce visível como provedor desligado",
    );
    const on = world([tenantId]);
    await runBillingDispatch(on.deps);
    const b = await rowsOf(statementId);
    assert.equal(b.invoices.length, 1, `6b: 1 nota depois de religar (${JSON.stringify(b.outbox)})`);
    const issue = ofKind(b.outbox, "invoice_issue")[0];
    assert.equal(issue?.status, "SENT");
    assert.equal(issue?.skip_reason, null, "6b: o claim limpa o skip_reason ao retomar");
  });

  test("T-INTX-9a (atomicidade): duas baixas concorrentes de cobranças distintas do mesmo demonstrativo → 1 invoice_issue, sem 40P01", async () => {
    const { tenantId, statementId } = await seed(`intx9a-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let locked!: () => void;
    const isLocked = new Promise<void>((r) => (locked = r));
    const hold = db.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, statementId);
      locked();
      await gate;
    }, { timeout: 60_000, maxWait: 5_000 });
    await isLocked;
    const errs: string[] = [];
    const run = (charge: string) =>
      w.settlement
        .settle({ tenantId, statementId, source: "asaas", externalChargeId: charge, paidCents: 10000, method: null, now: new Date() })
        .catch((e: any) => errs.push(`${e?.meta?.code ?? e?.code ?? ""}:${String(e?.message).slice(-120)}`));
    const a = run(`ch_intx9a_A_${statementId}`);
    const b = run(`ch_intx9a_B_${statementId}`);
    for (let i = 0; i < 200; i += 1) {
      const waiting = (await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock'`, dbName)) as any[];
      if (waiting[0].n >= 2) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    release();
    await hold;
    await Promise.all([a, b]);
    const r = await rowsOf(statementId);
    assert.deepEqual(errs, []);
    assert.equal(r.payments, 2);
    assert.equal(r.credits, 1, "o 2º pagamento sobre demonstrativo pago vira crédito");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1);
  });

  test("T-INTX-9b (R-INTX-9, CRIT530-04, CRIT530R2-05): quem espera o demonstrativo não segura a fila; outra transação com a MESMA chave não fecha ciclo (sem 40P01)", async () => {
    const { tenantId, statementId } = await seed(`intx9b-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    let go!: () => void;
    const insertGate = new Promise<void>((r) => (go = r));
    let lockedH!: (pid: number) => void;
    const hLocked = new Promise<number>((r) => (lockedH = r));
    const hInsert: { ms?: number; error?: string } = {};
    // (1) H, conexão de DONO na base do teste, segura o demonstrativo no modo do beginIssue.
    const hold = db
      .$transaction(
        async (tx: any) => {
          await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR NO KEY UPDATE`, statementId);
          const pid = (await tx.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid`)) as Array<{ pid: number }>;
          lockedH(Number(pid[0]!.pid));
          await insertGate;
          // (5) a MESMA chave da intenção do settle, com teto de 5 s, e depois desfaz.
          await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '5s'`);
          const t0 = Date.now();
          try {
            await tx.$executeRawUnsafe(
              `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at)
               VALUES ($1::uuid, $2::uuid, 'invoice_issue', 'focusnfe', 'invoice_issue:' || $2 || ':1', gen_random_uuid(), '{"seq":1}'::jsonb, now(), now(), now())
               ON CONFLICT (idempotency_key) DO NOTHING`,
              tenantId,
              statementId,
            );
          } catch (error: any) {
            hInsert.error = `${error?.meta?.code ?? error?.code ?? ""}:${String(error?.message).slice(-100)}`;
          }
          hInsert.ms = Date.now() - t0;
          throw new Error("rollback_H");
        },
        { timeout: 60_000, maxWait: 5_000 },
      )
      .catch((error: Error) => (error.message === "rollback_H" ? "rolled_back" : `H:${error.message}`));
    const hPid = await hLocked;
    // (2) o settle real, com a intenção, sob o papel.
    const errs: string[] = [];
    const settling = w.settlement
      .settle({ tenantId, statementId, source: "asaas", externalChargeId: `ch_intx9b_${statementId}`, paidCents: 10000, method: null, now: new Date() })
      .catch((e: any) => {
        errs.push(`${e?.meta?.code ?? e?.code ?? ""}:${String(e?.message).slice(-160)}`);
        return null;
      });
    // (3) barreira: o backend do settle espera trava (pg_stat_activity é do cluster; filtra pela base do teste).
    let settlePid = 0;
    for (let i = 0; i < 500 && !settlePid; i += 1) {
      const waiting = (await admin.$queryRawUnsafe(`SELECT pid FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND pid <> $2`, dbName, hPid)) as Array<{ pid: number }>;
      if (waiting[0]) settlePid = Number(waiting[0].pid);
      else await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(settlePid > 0, "barreira: o settle chegou a esperar a trava do demonstrativo");
    // (4) a asserção de espera, na conexão da BASE DO TESTE (pg_class é por base; pela base de manutenção daria 0 sempre),
    //     com controle positivo: a mesma consulta vê a trava de H no demonstrativo.
    const locksOf = async (pid: number, relname: string) =>
      Number(((await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE l.pid = $1 AND c.relname = $2`, pid, relname)) as any[])[0].n);
    assert.ok((await locksOf(hPid, "subscription_statements")) >= 1, "controle positivo: a consulta vê a trava de H no demonstrativo");
    assert.equal(await locksOf(settlePid, "billing_outbox"), 0, "quem espera o demonstrativo não segura nada em billing_outbox");
    go();
    const hResult = await hold;
    await settling;
    const r = await rowsOf(statementId);
    assert.equal(hResult, "rolled_back");
    assert.equal(hInsert.error, undefined, `o INSERT de H não espera nem falha (${hInsert.error})`);
    assert.deepEqual(errs, [], "nenhum 40P01, P2028 ou 57014 no settle");
    assert.equal(r.payments, 1);
    assert.equal(r.st.status, "paid");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1, "1 invoice_issue");
  });

  // ============================================================== (B) a nota viva ganha o cancelamento na transação da reversão
  test("T-INTX-3 (R-INTX-3, I3): estorno total com nota authorized e queda depois do commit → 1 invoice_cancel; o despacho cancela", async () => {
    const { tenantId, statementId } = await seed(`intx3-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const chargeId = await authorizedInvoice(w, tenantId, statementId, "intx3");
    const crash = crashAfterCommit(w);
    asaasFake.setPaymentStatus(chargeId, "REFUNDED");
    crash.armed = true;
    const first = await event(w, chargeId, statementId, `intx3_ref_${statementId}`).then((v) => v, (e: Error) => `rejected:${e.message}`);
    const retry = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `intx3_ref_${statementId}` });
    const mid = await rowsOf(statementId);
    assert.equal(crash.fired, 1, `a queda aconteceu (${first}, ${retry})`);
    const cancels = ofKind(mid.outbox, "invoice_cancel");
    assert.equal(cancels.length, 1, `1 invoice_cancel: ${JSON.stringify(mid.outbox)}`);
    assert.equal(cancels[0].idempotency_key, `invoice_cancel:${statementId}:1`);
    await runBillingDispatch(w.deps);
    const r = await rowsOf(statementId);
    assert.ok(["cancel_pending", "cancelled"].includes(r.invoices[0]?.status), `a nota vai ao cancelamento: ${JSON.stringify(r.invoices)}`);
    assert.equal(callsTo(w.focusServer, "DELETE", statementId), 1);
  });

  test("T-INTX-4a (R-INTX-4, I4): chargeback pela reconsulta, com queda depois do commit → 1 invoice_cancel", async () => {
    const { tenantId, statementId } = await seed(`intx4a-${randomUUID().slice(0, 6)}`);
    const chargedBack = new Set<string>();
    const w = world([tenantId], {
      paymentPort: (real) =>
        new Proxy(real, {
          get(target, prop, receiver) {
            if (prop === "getCharge") {
              return async (id: string) => {
                const lookup = await target.getCharge(id);
                return chargedBack.has(id) ? { ...lookup, status: "charged_back" } : lookup;
              };
            }
            const value = Reflect.get(target, prop, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          },
        }),
    });
    const chargeId = await authorizedInvoice(w, tenantId, statementId, "intx4a");
    chargedBack.add(chargeId);
    const crash = crashAfterCommit(w);
    crash.armed = true;
    const first = await event(w, chargeId, statementId, `intx4a_cb_${statementId}`).then((v) => v, (e: Error) => `rejected:${e.message}`);
    const retry = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `intx4a_cb_${statementId}` });
    const r = await rowsOf(statementId);
    assert.equal(crash.fired, 1, `a queda aconteceu (${first}, ${retry})`);
    assert.equal(r.st.charge_status, "charged_back");
    assert.equal(ofKind(r.outbox, "invoice_cancel").length, 1, `1 invoice_cancel: ${JSON.stringify(r.outbox)}`);
  });

  test("T-INTX-4b (R-INTX-4, I5): resolveChargeback({ outcome: lost }) com nota authorized → 1 invoice_cancel (sem queda nenhuma)", async () => {
    const { tenantId, statementId } = await seed(`intx4b-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const chargeId = await authorizedInvoice(w, tenantId, statementId, "intx4b");
    await w.settlement.resolveChargeback({ tenantId, statementId, externalChargeId: chargeId, outcome: "lost", now: new Date() });
    const r = await rowsOf(statementId);
    assert.equal(r.st.charge_status, "charged_back");
    assert.equal(ofKind(r.outbox, "invoice_cancel").length, 1, `1 invoice_cancel: ${JSON.stringify(r.outbox)}`);
  });

  test("T-INTX-6c (R-INTX-6): provedor de nota DESLIGADO no estorno → o invoice_cancel nasce PENDING + provider_disabled", async () => {
    const { tenantId, statementId } = await seed(`intx6c-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const chargeId = await authorizedInvoice(w, tenantId, statementId, "intx6c");
    const off = world([tenantId], { invoiceOn: false });
    await off.settlement.applyReversal({ tenantId, statementId, externalChargeId: chargeId, reversedCents: 10000, kind: "refund", now: new Date() });
    const r = await rowsOf(statementId);
    const cancels = ofKind(r.outbox, "invoice_cancel").map((row) => ({ provider: row.provider, status: row.status, skip_reason: row.skip_reason }));
    assert.deepEqual(cancels, [{ provider: "focusnfe", status: "PENDING", skip_reason: "provider_disabled" }]);
  });

  test("T-INTX-7 (R-INTX-7, I7, CRIT530-06): o invoice_cancel vai ao provedor e ao seq da NOTA VIVA (seq 2), não ao alvo da rodada nem ao seq 1", async () => {
    const { tenantId, statementId } = await seed(`intx7-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId], { issueTarget: { provider: "nfeio", enabled: false }, enabledInvoiceProviders: ["focusnfe"] });
    const charge = `ch_intx7_${statementId}`;
    await w.settlement.settle({ tenantId, statementId, source: "asaas", externalChargeId: charge, paidCents: 10000, method: null, now: new Date() });
    const one = await w.invoices.beginIssue({ tenantId, statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, new Date());
    await w.invoices.markRejected(tenantId, one.invoice.id, "rejeitada", new Date());
    const two = await w.invoices.beginIssue({ tenantId, statementId, seq: 2, provider: "focusnfe", environment: "sandbox", serie: 7 }, new Date());
    await w.invoices.markAuthorized(tenantId, two.invoice.id, { pdfSource: "public_url" }, new Date());
    await w.settlement.applyReversal({ tenantId, statementId, externalChargeId: charge, reversedCents: 10000, kind: "refund", now: new Date() });
    const r = await rowsOf(statementId);
    const cancels = ofKind(r.outbox, "invoice_cancel").map((row) => ({ provider: row.provider, key: row.idempotency_key, skip_reason: row.skip_reason }));
    assert.deepEqual(cancels, [{ provider: "focusnfe", key: `invoice_cancel:${statementId}:2`, skip_reason: null }]);
  });

  // ============================================================== (C) o cancelamento espera a nota pendente
  test("T-INTX-11a..c (R-INTX-11, I10, I13, CRIT530-01): nota PENDENTE no estorno total → invoice_cancel na transação; o despacho ADIA sem gastar tentativa; a reconsulta autoriza e o despacho seguinte cancela", async (t) => {
    const { tenantId, statementId } = await seed(`intx11-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "intx11");
    await runBillingDispatch(w.deps);
    await refund(w, statementId, chargeId, "intx11");
    await t.test("T-INTX-11a: 1 invoice_cancel na MESMA transação do estorno, com a nota ainda pending", async () => {
      const r = await rowsOf(statementId);
      assert.equal(r.invoices[0]?.status, "pending", "pré-condição: a nota está pendente no estorno");
      assert.equal(ofKind(r.outbox, "invoice_cancel").length, 1, `1 invoice_cancel: ${JSON.stringify(r.outbox)}`);
    });
    await t.test("T-INTX-11b: o despacho antes da autorização ADIA (+15 min, attempts igual, last_error invoice_still_processing), sem cancelar", async () => {
      const before = ofKind((await rowsOf(statementId)).outbox, "invoice_cancel")[0];
      const t0 = Date.now();
      const d = await runBillingDispatch(w.deps);
      const after = ofKind((await rowsOf(statementId)).outbox, "invoice_cancel")[0];
      assert.equal(d.outcomes.retry, 1, `adiado: ${JSON.stringify(d.outcomes)}`);
      assert.equal(after.status, "PENDING");
      assert.equal(after.last_error, "invoice_still_processing");
      assert.equal(after.attempts, before.attempts, "a espera não gasta tentativa");
      const delta = new Date(after.next_attempt_at).getTime() - t0;
      assert.ok(delta > 14 * MIN && delta < 16 * MIN, `next_attempt_at ≈ +15 min (${delta} ms)`);
      assert.equal(callsTo(w.focusServer, "DELETE", statementId), 0, "nenhum cancelamento enviado");
    });
    await t.test("T-INTX-11c: a reconsulta (+2 h) autoriza; o despacho em +16 min cancela; 0 nota viva sobre refunded", async () => {
      await runBillingPollPending({ ...w.deps, now: at(2 * HOUR) });
      await runBillingDispatch({ ...w.deps, now: at(16 * MIN) });
      const r = await rowsOf(statementId);
      assert.equal(r.st.charge_status, "refunded");
      assert.ok(["cancel_pending", "cancelled"].includes(r.invoices[0]?.status), `nota: ${JSON.stringify(r.invoices)}`);
      assert.equal(ofKind(r.outbox, "invoice_cancel")[0]?.status, "SENT");
      assert.equal(callsTo(w.focusServer, "DELETE", statementId), 1);
    });
  });

  test("T-INTX-11d (R-INTX-11d): a reconsulta devolve REJEITADA → a linha de cancelamento fecha SENT, nota rejected, 0 cancelamento enviado", async () => {
    const { tenantId, statementId } = await seed(`intx11d-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId], { focusMode: "rejected" });
    const { chargeId } = await pay(w, tenantId, statementId, "intx11d");
    await runBillingDispatch(w.deps);
    await refund(w, statementId, chargeId, "intx11d");
    await runBillingDispatch(w.deps);
    await runBillingPollPending({ ...w.deps, now: at(2 * HOUR) });
    await runBillingDispatch({ ...w.deps, now: at(16 * MIN) });
    const r = await rowsOf(statementId);
    assert.equal(r.invoices[0]?.status, "rejected", `nota: ${JSON.stringify(r.invoices)}`);
    assert.equal(ofKind(r.outbox, "invoice_cancel")[0]?.status, "SENT", `cancelamento: ${JSON.stringify(r.outbox)}`);
    assert.equal(callsTo(w.focusServer, "DELETE", statementId), 0);
  });

  test("T-INTX-11e (R-INTX-11e): passou de 72 h e a RECONSULTA ainda diz processando → NEEDS_REVIEW invoice_stuck_processing, sem cancelar", async () => {
    const { tenantId, statementId } = await seed(`intx11e-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId], {
      invoicePort: (real) =>
        new Proxy(real, {
          get(target, prop, receiver) {
            if (prop === "getInvoice") return async () => ({ status: "processing" });
            const value = Reflect.get(target, prop, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          },
        }),
    });
    const { chargeId } = await pay(w, tenantId, statementId, "intx11e");
    await runBillingDispatch(w.deps);
    await refund(w, statementId, chargeId, "intx11e");
    await runBillingDispatch({ ...w.deps, now: at(73 * HOUR) });
    const r = await rowsOf(statementId);
    const cancel = ofKind(r.outbox, "invoice_cancel")[0];
    assert.equal(cancel?.status, "NEEDS_REVIEW", `cancelamento: ${JSON.stringify(r.outbox)}`);
    assert.equal(cancel?.last_error, "invoice_stuck_processing");
    assert.equal(callsTo(w.focusServer, "DELETE", statementId), 0);
  });

  test("T-INTX-11f (CRIT530R2-03): passou de 72 h com o provedor (ou os jobs) parado, e o provedor AUTORIZOU nesse tempo → o despacho reconsulta e CANCELA, em vez de ir a revisão", async () => {
    const { tenantId, statementId } = await seed(`intx11f-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "intx11f");
    await runBillingDispatch(w.deps);
    await refund(w, statementId, chargeId, "intx11f");
    await runBillingDispatch({ ...w.deps, now: at(73 * HOUR) });
    const r = await rowsOf(statementId);
    assert.ok(["cancel_pending", "cancelled"].includes(r.invoices[0]?.status), `nota: ${JSON.stringify(r.invoices)}`);
    assert.equal(ofKind(r.outbox, "invoice_cancel")[0]?.status, "SENT", `cancelamento: ${JSON.stringify(r.outbox)}`);
    assert.equal(callsTo(w.focusServer, "DELETE", statementId), 1);
  });

  // ============================================================== (A) nenhuma emissão sem `paid`
  test("T-INTX-12a (R-INTX-12a, I11, CRIT530-02): corrida — a leitura sem trava vê paid, o estorno total commita, o beginIssue recusa: 0 nota, 0 POST", async () => {
    const { tenantId, statementId } = await seed(`intx12a-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "intx12a");
    let fired = false;
    const realFind = w.statements.findStatement.bind(w.statements);
    const racing: ChannelDeps = {
      ...w.deps,
      statements: {
        findStatement: async (t: string, s: string) => {
          const value = await realFind(t, s);
          if (!fired && s === statementId) {
            fired = true;
            await refund(w, statementId, chargeId, "intx12a");
          }
          return value;
        },
      },
    };
    const d = await runBillingDispatch(racing);
    const r = await rowsOf(statementId);
    assert.ok(fired, "a barreira disparou");
    assert.equal(r.st.charge_status, "refunded");
    assert.equal(r.invoices.length, 0, `nenhuma nota aberta (o número da DPS não foi consumido): ${JSON.stringify(r.invoices)} ${JSON.stringify(d.outcomes)}`);
    assert.equal(callsTo(w.focusServer, "POST", statementId), 0);
    assert.equal(ofKind(r.outbox, "invoice_issue")[0]?.last_error, "statement_not_paid");
  });

  test("T-INTX-12b (R-INTX-12b, I12, CRIT530R2-01): órfã — nota pending sem id do provedor, estorno JÁ commitado antes da retomada, reconsulta desconhecida → 0 POST, nota rejected, e o cancelamento fecha", async () => {
    const { tenantId, statementId } = await seed(`intx12b-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "intx12b");
    const begun = await beginPending(w, tenantId, statementId);
    assert.equal(begun.invoice.status, "pending");
    await makeOrphan(statementId);
    await refund(w, statementId, chargeId, "intx12b");
    await runBillingDispatch(w.deps);
    await runBillingDispatch(w.deps);
    const r = await rowsOf(statementId);
    assert.equal(callsTo(w.focusServer, "POST", statementId), 0, "nunca reenviada ao provedor");
    assert.equal(r.invoices[0]?.status, "rejected", `a órfã é decidida: ${JSON.stringify(r.invoices)}`);
    assert.equal(r.invoices[0]?.error, "not_issued_payment_reversed");
    assert.equal(ofKind(r.outbox, "invoice_cancel")[0]?.status, "SENT", `o cancelamento fecha: ${JSON.stringify(r.outbox)}`);
  });

  test("T-INTX-12c (R-INTX-12c): a mesma órfã, com a reconsulta dizendo processando → recovered; a reconsulta autoriza e o cancelamento cancela", async () => {
    const { tenantId, statementId } = await seed(`intx12c-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId], { focusMode: "ok" });
    const { chargeId } = await pay(w, tenantId, statementId, "intx12c");
    const begun = await beginPending(w, tenantId, statementId);
    // A emissão chegou ao provedor e o trabalhador caiu antes de registrar (sem markIssued).
    await w.focusPort.issue({
      externalRef: begun.invoice.externalRef,
      dpsNumber: begun.invoice.numeroDps ?? 0,
      emitter: { cnpj: FISCAL.cnpj },
      borrower: { document: "99888777000166", name: "Tomadora", municipalityCode: "3550308" },
      serviceDescription: "Assinatura — competência 2026-10",
      amountCents: 10000,
      competenceDate: "2026-10-01",
      taxProfile: { ...taxProfileFromSettings(FISCAL), serieDps: 7 },
    });
    await makeOrphan(statementId);
    await refund(w, statementId, chargeId, "intx12c");
    await runBillingDispatch(w.deps);
    const mid = await rowsOf(statementId);
    assert.equal(ofKind(mid.outbox, "invoice_issue")[0]?.status, "SENT", `recovered: ${JSON.stringify(mid.outbox)}`);
    await runBillingPollPending({ ...w.deps, now: at(2 * HOUR) });
    await runBillingDispatch({ ...w.deps, now: at(16 * MIN) });
    const r = await rowsOf(statementId);
    assert.equal(callsTo(w.focusServer, "POST", statementId), 1, "só a emissão original");
    assert.ok(["cancel_pending", "cancelled"].includes(r.invoices[0]?.status), `nota: ${JSON.stringify(r.invoices)}`);
    assert.equal(ofKind(r.outbox, "invoice_cancel")[0]?.status, "SENT");
  });

  test("T-INTX-12d (CRIT530R2-01, o caminho do [INTX-12b]): órfã com a leitura sem trava ainda vendo paid e o estorno entrando antes do beginIssue → 0 POST, nota rejected", async () => {
    const { tenantId, statementId } = await seed(`intx12d-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "intx12d");
    await beginPending(w, tenantId, statementId);
    await makeOrphan(statementId);
    let fired = false;
    const realFind = w.statements.findStatement.bind(w.statements);
    const racing: ChannelDeps = {
      ...w.deps,
      statements: {
        findStatement: async (t: string, s: string) => {
          const value = await realFind(t, s);
          if (!fired && s === statementId) {
            fired = true;
            await refund(w, statementId, chargeId, "intx12d");
          }
          return value;
        },
      },
    };
    await runBillingDispatch(racing);
    const r = await rowsOf(statementId);
    assert.ok(fired, "a barreira disparou com a leitura ainda em paid");
    assert.equal(callsTo(w.focusServer, "POST", statementId), 0, "nunca reenviada ao provedor");
    assert.equal(r.invoices[0]?.status, "rejected", `a órfã é decidida sob a trava: ${JSON.stringify(r.invoices)}`);
  });

  // ============================================================== C2-A4: a cobrança reconsultada é do demonstrativo
  test("T-WH-5b-db (R-WH-5b, C2-A4): referência cruzada recusa; o legítimo (inclusive a cobrança antiga paga com atraso) passa; reconsulta sem referência recusa", async () => {
    const A = await seed(`wh5a-${randomUUID().slice(0, 6)}`);
    const B = await seed(`wh5b-${randomUUID().slice(0, 6)}`);
    await db.$executeRawUnsafe(`UPDATE tenant_billing_profiles SET asaas_customer_id = NULL WHERE tenant_id = $1::uuid`, B.tenantId);
    const C = await seed(`wh5c-${randomUUID().slice(0, 6)}`);
    const D = await seed(`wh5d-${randomUUID().slice(0, 6)}`);
    const w = world([A.tenantId, B.tenantId, C.tenantId, D.tenantId]);
    const payA = await createCharge(A.statementId);
    asaasFake.setPaymentStatus(payA, "CONFIRMED");
    await w.deps.refs.put({ statementId: A.statementId, tenantId: A.tenantId, provider: "asaas", externalChargeId: payA }, new Date());
    await w.deps.refs.put({ statementId: B.statementId, tenantId: B.tenantId }, new Date());
    const cross = await event(w, payA, B.statementId, `wh5x_${B.statementId}`);
    const mB = await rowsOf(B.statementId);
    const legit = await event(w, payA, A.statementId, `wh5l_${A.statementId}`);
    const oldC = await createCharge(C.statementId);
    const newC = await createCharge(C.statementId);
    await w.deps.refs.put({ statementId: C.statementId, tenantId: C.tenantId, provider: "asaas", externalChargeId: newC }, new Date());
    asaasFake.setPaymentStatus(oldC, "RECEIVED");
    const late = await event(w, oldC, C.statementId, `wh5o_${C.statementId}`);
    const noRef = await createCharge(undefined);
    asaasFake.setPaymentStatus(noRef, "CONFIRMED");
    await w.deps.refs.put({ statementId: D.statementId, tenantId: D.tenantId, provider: "asaas", externalChargeId: noRef }, new Date());
    const missing = await event(w, noRef, D.statementId, `wh5m_${D.statementId}`);
    assert.equal(cross, "rejected", "a baixa cruzada é recusada");
    assert.equal(mB.st.paid, "0.00");
    assert.equal(mB.payments, 0);
    assert.equal(legit, "settled");
    assert.equal((await rowsOf(A.statementId)).st.status, "paid");
    assert.equal(late, "settled");
    assert.equal((await rowsOf(C.statementId)).st.status, "paid");
    assert.equal(missing, "rejected");
    assert.equal((await rowsOf(D.statementId)).payments, 0);
  });
}
