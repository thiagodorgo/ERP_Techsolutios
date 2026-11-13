// B-ASS-08c0 (item 60 do portão) · TESTE-DONO da `P-CONF530-01-TESTE-DONO-LEITURA-NA-TRAVA` (plano
// `B-ASS-08c-v2` §2.1 P20 e §3.1 CA-0a). É a sonda CONF-P1 do verificador conf-530-cl, que vivia FORA do repositório,
// trazida para cá SEM MUDAR NENHUMA ASSERÇÃO: daqui para baixo, este cabeçalho à parte, o arquivo é byte a byte a sonda
// (os comentários dela, inclusive os que citam o objeto `6e236f4e` do #530, ficam como estavam).
// O que ela prova: a leitura do `status` do demonstrativo é feita na MESMA instrução que espera a trava
// (`lockStatement` em `invoices.prisma.ts`, a âncora `SELECT id, status … FOR NO KEY UPDATE`). Uma leitura sem trava
// antes dela (a CONF-2, mutação M22) emite nota sobre receita já estornada, e a CONF-P1 fica vermelha; nenhum outro
// teste do repositório a pegava (T-INTX-12 verde sob a M22, medido na crítica `crit-08c-cl`).
// Roda no BANCO, numa base própria, sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no setup).
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
    dbName = `conf530p_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
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

  // ============================================================== SONDAS PRÓPRIAS do verificador conf-530-cl (fora do repo)
  /** Pausa a PRÓXIMA transação do demonstrativo DEPOIS do trabalho e ANTES do commit (a trava segue de pé). */
  function pauseNextTx(w: World) {
    const repo = w.statements as any;
    const orig = repo.transaction.bind(repo);
    let armed = true;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let paused!: () => void;
    const isPaused = new Promise<void>((r) => (paused = r));
    repo.transaction = (t: string, work: any) =>
      orig(t, async (tx: any) => {
        const value = await work(tx);
        if (armed) {
          armed = false;
          paused();
          await gate;
        }
        return value;
      });
    return { isPaused, release };
  }
  async function waitLockWaiter(timeoutMs = 3500): Promise<number> {
    const t0 = Date.now();
    for (;;) {
      const rows = (await admin.$queryRawUnsafe(`SELECT pid, left(query, 80) AS q FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock'`, dbName)) as Array<{ pid: number; q: string }>;
      if (rows[0]) return Number(rows[0].pid);
      if (Date.now() - t0 > timeoutMs) return 0;
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  test("CONF-P1 (CRIT530-02, linearização): o estorno total EM VOO segura o demonstrativo; o despacho lê paid sem trava e o beginIssue espera a trava → ao soltar, recusa: 0 nota, 0 POST, sem 40P01", async () => {
    const { tenantId, statementId } = await seed(`cp1-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const { chargeId } = await pay(w, tenantId, statementId, "cp1");
    const before = await rowsOf(statementId);
    assert.equal(before.st.status, "paid");
    assert.equal(ofKind(before.outbox, "invoice_issue").length, 1, "pré-condição: invoice_issue PENDING");
    const pause = pauseNextTx(w);
    const reversing = refund(w, statementId, chargeId, "cp1").then((v) => JSON.stringify(v), (e: any) => `rej:${e?.meta?.code ?? e?.code ?? ""}:${String(e?.message).slice(-120)}`);
    await pause.isPaused;
    // controle: a reversão (não commitada) segura a trava do demonstrativo
    const nowait = await db
      .$transaction(async (tx: any) => tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE NOWAIT`, statementId))
      .then(() => "livre", (e: any) => `${e?.meta?.code ?? e?.code ?? ""}:${/could not obtain lock|55P03/.test(String(e?.message) + String(e?.meta?.code)) ? "55P03" : String(e?.message).slice(-80)}`);
    const committed = ((await db.$queryRawUnsafe(`SELECT status FROM subscription_statements WHERE id=$1::uuid`, statementId)) as any[])[0].status;
    const errs: string[] = [];
    const dispatching = runBillingDispatch(w.deps).catch((e: any) => {
      errs.push(`${e?.meta?.code ?? e?.code ?? ""}:${String(e?.message).slice(-160)}`);
      return null;
    });
    const waiter = await waitLockWaiter();
    pause.release();
    const revResult = await reversing;
    const d = await dispatching;
    const r = await rowsOf(statementId);
    console.log("CONF-P1", JSON.stringify({ nowait, committed, waiter, revResult, outcomes: d?.outcomes, errs, r: { st: r.st, outbox: r.outbox.map((o: any) => [o.kind, o.status, o.last_error]), invoices: r.invoices } }));
    assert.match(nowait, /55P03/, "controle: a reversão em voo segura o demonstrativo");
    assert.equal(committed, "paid", "controle: a leitura sem trava ainda vê paid");
    assert.ok(waiter > 0, "barreira: o beginIssue esperou a trava do demonstrativo");
    assert.deepEqual(errs, [], "sem 40P01/P2028 no despacho");
    assert.equal(r.st.charge_status, "refunded");
    assert.equal(r.invoices.length, 0, `nenhuma nota aberta sobre receita estornada: ${JSON.stringify(r.invoices)}`);
    assert.equal(callsTo(w.focusServer, "POST", statementId), 0, "0 POST /nfsen");
    assert.equal(ofKind(r.outbox, "invoice_issue")[0]?.last_error, "statement_not_paid");
  });

  test("CONF-P2 (desvio (b), isolamento da chave nova do T13): findLiveInvoice sob a transação da organização A não vê a nota viva do demonstrativo de B; controle: sob B vê", async () => {
    const A = await seed(`cp2a-${randomUUID().slice(0, 6)}`);
    const B = await seed(`cp2b-${randomUUID().slice(0, 6)}`);
    const w = world([A.tenantId, B.tenantId]);
    await pay(w, B.tenantId, B.statementId, "cp2b");
    await beginPending(w, B.tenantId, B.statementId);
    const asA = await w.statements.transaction(A.tenantId, async (tx: any) => tx.findLiveInvoice(B.statementId));
    const asB = await w.statements.transaction(B.tenantId, async (tx: any) => tx.findLiveInvoice(B.statementId));
    console.log("CONF-P2", JSON.stringify({ asA, asB }));
    assert.equal(asA, undefined, "a organização A não lê a nota de B");
    assert.deepEqual(asB, { provider: "focusnfe", seq: 1, status: "pending" }, "controle: B lê a própria nota viva");
  });

  test("CONF-C1-1c′ (a C1-1c adaptada ao desenho: queda DEPOIS do commit da baixa, não da ponte): retentativa + poll-pending + despacho → 1 invoice_issue e a nota EXISTE", async () => {
    const { tenantId, statementId } = await seed(`cc1c-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const repo = w.statements as any;
    const orig = repo.transaction.bind(repo);
    let fail = true;
    repo.transaction = async (t: string, work: any) => {
      const v = await orig(t, work);
      if (fail) {
        fail = false;
        throw new Error("simulated_crash_after_settle");
      }
      return v;
    };
    const chargeId = await createCharge(statementId);
    await w.deps.refs.put({ statementId, tenantId, provider: "asaas", externalChargeId: chargeId }, new Date());
    asaasFake.setPaymentStatus(chargeId, "CONFIRMED");
    await w.deps.events.insertIfAbsent({ provider: "asaas", externalEventId: `cc1c_${statementId}`, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: chargeId, externalReference: statementId }, new Date());
    const first = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `cc1c_${statementId}` }).then((v) => JSON.stringify(v), (e) => `rejected:${e.message}`);
    const retry = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `cc1c_${statementId}` }).then((v) => JSON.stringify(v), (e) => `rejected:${e.message}`);
    await runBillingDispatch(w.deps);
    await runBillingPollPending({ ...w.deps, now: at(2 * HOUR) });
    const r = await rowsOf(statementId);
    console.log("CONF-C1-1c'", JSON.stringify({ first, retry, r: { st: r.st, payments: r.payments, outbox: r.outbox.map((o: any) => [o.kind, o.status]), invoices: r.invoices } }));
    assert.match(first, /simulated_crash_after_settle/, "a queda aconteceu depois do commit");
    assert.equal(r.st.status, "paid");
    assert.equal(r.payments, 1, "1 pagamento (sem dobro)");
    assert.equal(ofKind(r.outbox, "invoice_issue").length, 1, "1 invoice_issue durável");
    assert.equal(r.invoices.length, 1, "a nota existe");
    assert.equal(callsTo(w.focusServer, "POST", statementId), 1, "1 POST /nfsen");
  });

  test("CONF-C1-1d′ (a C1-1d adaptada: estorno total com nota AUTORIZADA e queda DEPOIS do commit da reversão) → retentativa; 1 invoice_cancel e o despacho cancela", async () => {
    const { tenantId, statementId } = await seed(`cc1d-${randomUUID().slice(0, 6)}`);
    const w = world([tenantId]);
    const chargeId = await authorizedInvoice(w, tenantId, statementId, "cc1d");
    const repo = w.statements as any;
    const orig = repo.transaction.bind(repo);
    let fail = true;
    repo.transaction = async (t: string, work: any) => {
      const v = await orig(t, work);
      if (fail) {
        fail = false;
        throw new Error("simulated_crash_after_reversal");
      }
      return v;
    };
    asaasFake.setPaymentStatus(chargeId, "REFUNDED");
    await w.deps.events.insertIfAbsent({ provider: "asaas", externalEventId: `cc1d_${statementId}`, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: chargeId, externalReference: statementId }, new Date());
    const first = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `cc1d_${statementId}` }).then((v) => JSON.stringify(v), (e) => `rejected:${e.message}`);
    const retry = await runBillingReconcileEvent(w.deps, { provider: "asaas", externalEventId: `cc1d_${statementId}` }).then((v) => JSON.stringify(v), (e) => `rejected:${e.message}`);
    await runBillingDispatch({ ...w.deps, now: at(1 * MIN) });
    const r = await rowsOf(statementId);
    console.log("CONF-C1-1d'", JSON.stringify({ first, retry, r: { st: r.st, outbox: r.outbox.map((o: any) => [o.kind, o.status, o.last_error]), invoices: r.invoices } }));
    assert.match(first, /simulated_crash_after_reversal/);
    assert.equal(r.st.charge_status, "refunded");
    assert.equal(ofKind(r.outbox, "invoice_cancel").length, 1, "1 invoice_cancel durável");
    assert.ok(["cancel_pending", "cancelled"].includes(r.invoices[0]?.status), `nota não fica viva/autorizada: ${JSON.stringify(r.invoices)}`);
  });
}
