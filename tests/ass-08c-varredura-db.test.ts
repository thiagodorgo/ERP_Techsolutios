// B-ASS-08c2 (item 60) · a VARREDURA de recuperação da nota (plano de abertura §4.4, §4.5, §5.2; Emenda 1 §3): no despacho,
// ANTES do claim e só com provedor de nota ligado, cada organização ganha as intenções de nota que faltam — o demonstrativo
// `paid` desde o corte do dono (`INVOICE_BACKFILL_CUTOFF`), sem nota viva, sem `invoice_issue` em voo e sem `invoice_issue` da
// época. A consulta ENCONTRA; a regra DECIDE, sob a trava do demonstrativo; o INSERT na fila vem depois da trava.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup), com os repositórios Prisma reais sobre o papel, o despacho de PRODUÇÃO (`runBillingDispatch`, que monta a varredura)
// e o falso Focus NFe de `tests/helpers/fake-providers/` em 127.0.0.1:0. Cada caso usa organizações próprias, e o despacho e a
// varredura só enxergam as organizações do caso (`{ tenantIds }` e `listTenantIds`; GS-ISO): o job do CI roda os arquivos em
// paralelo numa base só.
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
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.js";
import type { PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { PrismaChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.prisma.js";
import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InvoiceOutboxHandler } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";
import { runDispatchOutbox, type DispatchAuditEvent } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { runInvoiceRecoverySweep } from "../src/modules/subscription-billing/outbox/invoice-sweep.js";
import { INVOICE_DEFER_MS, OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { reconcileWebhookEvent } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";
import { PrismaStatementRepository } from "../src/modules/subscription-billing/statements/statement.prisma-runtime.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService, type InvoiceIntents } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { PrismaWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.prisma.js";
import { PrismaStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.prisma.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { PrismaStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.prisma.js";
import { PrismaStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.prisma.js";
import { INVOICE_BACKFILL_CUTOFF } from "../src/modules/subscription-billing/invoices/invoice-intent-rules.js";
import { taxProfileFromSettings } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";
import { runBillingDispatch, type ChannelDeps } from "../src/modules/subscription-billing/outbox/channel.jobs.js";
import type { StatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const INPUTS = { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) };
const AUDIT = { record: async () => {} };

type Fixture = { readonly tenantId: string; readonly statementId: string };

if (!connectionString) {
  test("B-ASS-08c2 · a varredura da nota (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão de manutenção (base do cluster): CREATE/DROP DATABASE e pg_stat_activity
  let db: any; // conexão de DONO na base do teste: semente, leituras de controle e a trava de H
  let role: EphemeralRole;
  let dbName = "";
  let focus: any;
  let focusRejected: any;
  let asaasFake: any;

  after(async () => {
    await focus?.close();
    await focusRejected?.close();
    await asaasFake?.close();
    await role?.drop();
    await db?.$disconnect();
    if (admin && dbName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  const q = (sql: string, ...args: unknown[]) => db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  async function seedTenant(tag: string): Promise<string> {
    const slug = `c2-vr-${tag}-${randomUUID().slice(0, 8)}`;
    return (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
  }

  /** Demonstrativo de R$ 100,00 no estado dado, SEM linha na fila, sem índice e sem nota (a baixa de antes do 08c2). */
  async function seedStatement(tenantId: string, status: "paid" | "closed", paidAt: Date | null, period = "2026-10"): Promise<string> {
    return (await q(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at)
       VALUES ($1::uuid,$2,$3,'none','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,$4,'{"latest":null,"history":[]}'::jsonb,'2026-11-10',now(),$5) RETURNING id`,
      tenantId,
      period,
      status,
      status === "paid" ? 100 : 0,
      paidAt,
    ))[0].id as string;
  }

  async function paidLegacy(tag: string, paidAt = new Date(Date.now() - HOUR)): Promise<Fixture> {
    const tenantId = await seedTenant(tag);
    return { tenantId, statementId: await seedStatement(tenantId, "paid", paidAt) };
  }

  const issueLines = (statementId: string) =>
    q(`SELECT status, skip_reason, idempotency_key, occurred_at FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'invoice_issue' ORDER BY idempotency_key`, statementId);
  const refsOf = (statementId: string) => q(`SELECT tenant_id, provider, external_charge_id FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId);
  const postsFor = (statementId: string) =>
    focus.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v2/nfsen") && decodeURIComponent(r.path).includes(statementId)).length;
  const locksOf = async (pid: number, relname: string) =>
    Number((await q(`SELECT count(*)::int AS n FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE l.pid = $1 AND c.relname = $2`, pid, relname))[0].n);

  function asaasPort(): PaymentProviderPort {
    return new AsaasPaymentAdapter(
      new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${asaasFake.baseUrl}/v3` }),
      async (k) => (k === "api_token" ? "TOK" : "WHK"),
    );
  }

  type World = { deps: ChannelDeps; service: StatementService; statements: PrismaStatementRepository; intents: InvoiceIntents };
  type WorldOptions = { invoiceOn?: boolean; now?: () => Date; repository?: (real: PrismaStatementRepository) => StatementRepository; focusServer?: any; payments?: boolean };

  /** O mundo de UM caso: só as organizações dele no claim e na varredura (GS-ISO). A varredura usa o serviço do demonstrativo
   * com a intenção de nota no canal (o `[NOTA-INTENTS]` da composição é provado no NM1); o despacho é o de produção. */
  function world(tenantIds: string[], options: WorldOptions = {}): World {
    const invoiceOn = options.invoiceOn ?? true;
    const c = role.client;
    const statements = new PrismaStatementRepository(c);
    const intents: InvoiceIntents = { issueTarget: { provider: "focusnfe", enabled: invoiceOn }, enabledInvoiceProviders: invoiceOn ? ["focusnfe"] : [] };
    const repository = options.repository ? options.repository(statements) : statements;
    const service = new StatementService(repository, INPUTS, AUDIT, { invoiceIntents: { resolve: async () => intents } });
    const focusPort = new FocusNfeInvoiceAdapter(
      new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${(options.focusServer ?? focus).baseUrl}/v2` }),
      async (k) => (k === "api_token" ? "TOK-f" : "WHK-f"),
    );
    const deps: ChannelDeps = {
      outbox: new PrismaOutboxRepository(c, { tenantIds }),
      events: new PrismaWebhookEventRepository(c),
      refs: new PrismaStatementRefRepository(c),
      charges: new PrismaStatementChargeRepository(c),
      ports: options.payments ? { asaas: asaasPort() } : {},
      resolveCustomer: async () => ({ ok: true, customerId: "cus_vr" }),
      settlement: new StatementSettlementService(statements, service, intents),
      statements,
      invoicePorts: invoiceOn ? { focusnfe: focusPort } : {},
      invoices: new PrismaStatementInvoiceRepository(c),
      resolveIssueContext: async ({ statement }) => ({
        environment: "sandbox",
        serie: 7,
        emitter: { cnpj: FISCAL.cnpj },
        borrower: { document: "99888777000166", name: "Tomadora", municipalityCode: "3550308" },
        taxProfile: taxProfileFromSettings(FISCAL),
        serviceDescription: `Assinatura — competência ${statement.period}`,
      }),
      listTenantIds: async () => tenantIds,
      invoiceRecovery: service,
      ...(options.now ? { now: options.now } : {}),
    };
    return { deps, service, statements, intents };
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, o falso Focus", async () => {
    const [{ createPgAdapter }, { PrismaClient }] = await Promise.all([import("../src/database/pg-connection.js"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    dbName = `${base}_c2_vr_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE template0`);
    const u = new URL(connectionString!);
    u.pathname = `/${dbName}`;
    const targetUrl = u.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const posture = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as any[];
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }], "o papel de runtime é NOSUPERUSER NOBYPASSRLS");
    focus = await startFocusNfeFake("ok");
    focusRejected = await startFocusNfeFake("rejected");
    asaasFake = await startAsaasFake();
  });

  test("VR1: a baixa manual que quitou ANTES do 08c2 (sem intenção, paga depois do corte), numa organização sem índice; ligada a nota, 1 rodada de despacho → 1 intenção, 1 índice e 1 POST /nfsen", async () => {
    const f = await paidLegacy("vr1");
    assert.deepEqual(await issueLines(f.statementId), [], "pré-condição: sem intenção");
    assert.deepEqual(await refsOf(f.statementId), [], "pré-condição: sem índice");
    const w = world([f.tenantId]);
    const result = await runBillingDispatch(w.deps);
    assert.equal(result.invoiceSweep?.ok, true, JSON.stringify(result.invoiceSweep));
    assert.equal(result.invoiceSweep?.inserted, 1);
    const lines = await issueLines(f.statementId);
    assert.deepEqual(lines.map((row) => [row.idempotency_key, row.skip_reason]), [[`invoice_issue:${f.statementId}:1`, null]], "1 intenção, com a nota ligada");
    assert.deepEqual(await refsOf(f.statementId), [{ tenant_id: f.tenantId, provider: null, external_charge_id: null }], "1 índice, com a organização do demonstrativo travado");
    assert.equal(postsFor(f.statementId), 1, "1 POST /nfsen na MESMA rodada");
  });

  test("VR2: pagamento PARCIAL do provedor e depois a quitação manual → 1 intenção (a da baixa manual); a varredura não cria outra", async () => {
    const tenantId = await seedTenant("vr2");
    const statementId = await seedStatement(tenantId, "closed", null);
    const w = world([tenantId]);
    await w.deps.settlement.settle({ tenantId, statementId, source: "asaas", externalChargeId: `pay_vr2_${statementId}`, paidCents: 6_000, method: null, now: new Date() });
    assert.deepEqual(await issueLines(statementId), [], "o parcial não gera nota");
    const paid = await w.service.recordManualPayment({ tenantId, statementId, amountCents: 4_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
    assert.equal(paid.statement.status, "paid");
    assert.equal((await issueLines(statementId)).length, 1, "a baixa manual que quitou gravou a intenção");
    const result = await runBillingDispatch(w.deps);
    assert.equal(result.invoiceSweep?.inserted, 0, "a varredura não criou outra");
    assert.equal((await issueLines(statementId)).length, 1);
    assert.equal(postsFor(statementId), 1, "1 POST /nfsen");
  });

  test("VR3: 2 rodadas seguidas → continua 1 intenção e 1 POST", async () => {
    const f = await paidLegacy("vr3");
    const w = world([f.tenantId]);
    await runBillingDispatch(w.deps);
    const second = await runBillingDispatch(w.deps);
    assert.equal(second.invoiceSweep?.inserted, 0);
    assert.equal((await issueLines(f.statementId)).length, 1);
    assert.equal(postsFor(f.statementId), 1);
  });

  test("VR3b: a baixa manual de um candidato COMMITA entre a consulta dos candidatos e a trava da varredura → 1 intenção (a regra, sob a trava, vê a linha da baixa)", async () => {
    const tenantId = await seedTenant("vr3b");
    const statementId = await seedStatement(tenantId, "closed", null);
    // O pago de antes do 08c2: a baixa manual por um serviço SEM a intenção de nota (o código de antes).
    const legacy = new StatementService(new PrismaStatementRepository(role.client), INPUTS, AUDIT);
    const first = await legacy.recordManualPayment({ tenantId, statementId, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date(Date.now() - HOUR) });
    assert.equal(first.statement.status, "paid");
    assert.deepEqual(await issueLines(statementId), [], "pré-condição: pago, sem intenção (candidato)");
    // A barreira: a consulta dos candidatos acha o demonstrativo; ANTES de a varredura travá-lo, o operador estorna e baixa de
    // novo (a baixa de agora grava a intenção da época nova, `[NOTA-01]`) e commita.
    let fired = false;
    const w = world([tenantId], {
      repository: (real) =>
        Object.assign(Object.create(real), {
          listInvoiceIntentCandidates: async (t: string, cutoff: Date) => {
            const found = await real.listInvoiceIntentCandidates(t, cutoff);
            if (!fired && found.includes(statementId)) {
              fired = true;
              await w.service.reverseManualPayment({ tenantId, paymentId: first.payment.id, reason: "estorno de teste", actorId: "usr_platform", now: new Date() });
              const again = await w.service.recordManualPayment({ tenantId, statementId, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
              assert.equal(again.statement.status, "paid");
            }
            return found;
          },
        }),
    });
    const result = await runBillingDispatch(w.deps);
    assert.ok(fired, "a barreira disparou entre a consulta e a trava");
    assert.equal(result.invoiceSweep?.ok, true, JSON.stringify(result.invoiceSweep));
    assert.equal(result.invoiceSweep?.inserted, 0, "sob a trava, a regra viu a intenção da baixa");
    assert.equal((await issueLines(statementId)).length, 1, "1 intenção");
  });

  test("VR4-linha: pago 1 s ANTES do corte → 0 intenção; pago NO corte e 1 s depois → 1 intenção cada e 1 POST cada", async () => {
    const tenantId = await seedTenant("vr4");
    const before = await seedStatement(tenantId, "paid", new Date(INVOICE_BACKFILL_CUTOFF.getTime() - SECOND), "2026-08");
    const at = await seedStatement(tenantId, "paid", new Date(INVOICE_BACKFILL_CUTOFF.getTime()), "2026-09");
    const afterCut = await seedStatement(tenantId, "paid", new Date(INVOICE_BACKFILL_CUTOFF.getTime() + SECOND), "2026-10");
    const w = world([tenantId]);
    const result = await runBillingDispatch(w.deps);
    assert.equal(result.invoiceSweep?.inserted, 2, JSON.stringify(result.invoiceSweep));
    assert.equal((await issueLines(before)).length, 0, "1 s antes do corte: sem nota automática");
    assert.equal((await issueLines(at)).length, 1, "no corte: 1 intenção");
    assert.equal((await issueLines(afterCut)).length, 1, "1 s depois: 1 intenção");
    assert.deepEqual([postsFor(before), postsFor(at), postsFor(afterCut)], [0, 1, 1], "1 POST para cada um desde o corte");
  });

  test("VR5: o INSERT só depois da trava — com o demonstrativo travado por H, a varredura espera Lock em subscription_statements, sem nada em billing_outbox, e não dá 40P01", async () => {
    const f = await paidLegacy("vr5");
    const w = world([f.tenantId]);
    let go!: () => void;
    const gate = new Promise<void>((resolve) => (go = resolve));
    let lockedH!: (pid: number) => void;
    const hLocked = new Promise<number>((resolve) => (lockedH = resolve));
    // H, conexão de DONO, segura o demonstrativo no modo de todo movimento (o do estorno: `FOR UPDATE`).
    const hold = db.$transaction(
      async (tx: any) => {
        await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, f.statementId);
        lockedH(Number(((await tx.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid`)) as Array<{ pid: number }>)[0]!.pid));
        await gate;
      },
      { timeout: 60_000, maxWait: 5_000 },
    );
    const hPid = await hLocked;
    const running = runBillingDispatch(w.deps);
    let sweepPid = 0;
    for (let i = 0; i < 500 && !sweepPid; i += 1) {
      const waiting = (await admin.$queryRawUnsafe(`SELECT pid FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND pid <> $2`, dbName, hPid)) as Array<{ pid: number }>;
      if (waiting[0]) sweepPid = Number(waiting[0].pid);
      else await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(sweepPid > 0, "barreira: a varredura chegou a esperar a trava do demonstrativo");
    assert.ok((await locksOf(hPid, "subscription_statements")) >= 1, "controle positivo: a consulta vê a trava de H");
    assert.equal(await locksOf(sweepPid, "billing_outbox"), 0, "quem espera o demonstrativo não segura nada em billing_outbox");
    go();
    await hold;
    const result = await running;
    assert.equal(result.invoiceSweep?.ok, true, `sem 40P01 nem outra falha: ${JSON.stringify(result.invoiceSweep)}`);
    assert.equal((await issueLines(f.statementId)).length, 1, "1 intenção, gravada depois da trava");
  });

  // ============================================================== F7b · a falha, a época, a consulta, o desligado e o custo
  const SPDAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const dueIn = (days: number) => SPDAY.format(new Date(Date.now() + days * 24 * HOUR));
  const allLines = (statementId: string) =>
    q(`SELECT kind, status, skip_reason, attempts, last_error, next_attempt_at, idempotency_key FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`, statementId);
  const invoicesOf = (statementId: string) => q(`SELECT id, seq, status, external_ref FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq`, statementId);
  const nfsePosts = (server: any) => server.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v2/nfsen")).length;
  const callsOn = (server: any, method: string, statementId: string) =>
    server.recorded.filter((r: { method: string; path: string }) => r.method === method && decodeURIComponent(r.path).includes(statementId)).length;
  const paymentPosts = () => asaasFake.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v3/payments")).length;

  /** A falha injetada na varredura de UMA organização: o INSERT dela na fila levanta (o molde do EG6/NM2b). */
  async function failOutboxInsertFor(tenantId: string, tag: string): Promise<() => Promise<void>> {
    const fn = `c2_vr_fail_${tag}`;
    await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF NEW.tenant_id = '${tenantId}'::uuid THEN RAISE EXCEPTION 'c2_injected_sweep_failure'; END IF; RETURN NEW; END $f$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER ${fn} BEFORE INSERT ON billing_outbox FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
    return async () => {
      await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${fn} ON billing_outbox`);
      await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${fn}()`);
    };
  }

  /** O webhook da nota (`ref = <id>:<seq>`) pelo reconcile real; o roteiro do falso decide o estado. */
  async function invoiceWebhook(w: World, statementId: string, seq: number, server: any): Promise<string> {
    const c = role.client;
    const events = new PrismaWebhookEventRepository(c);
    const externalEventId = `vr-wh-${randomUUID()}`;
    await events.insertIfAbsent({ provider: "focusnfe", externalEventId, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: null, externalReference: `${statementId}:${seq}` }, new Date());
    const port = new FocusNfeInvoiceAdapter(
      new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v2` }),
      async (k) => (k === "api_token" ? "TOK-f" : "WHK-f"),
    );
    await reconcileWebhookEvent(
      { events, refs: new PrismaStatementRefRepository(c), ports: {}, settlement: w.deps.settlement, invoicePorts: { focusnfe: port }, invoices: new PrismaStatementInvoiceRepository(c) },
      { provider: "focusnfe", externalEventId },
    );
    return (await q(`SELECT status FROM billing_webhook_events WHERE external_event_id = $1`, externalEventId))[0].status as string;
  }

  test("VR6: a varredura de UMA organização (A) falha → nesta rodada 0 POST /nfsen para TODAS; a cobrança da B sai (1 POST /payments); a invoice_issue da B fica PENDING com o mesmo attempts, sem provider_disabled, last_error = invoice_sweep_failed e +15 min; invoiceSweep.ok = false; a trilha com a A e o código", async () => {
    const a = await paidLegacy("vr6a");
    const tenantB = await seedTenant("vr6b");
    const chargeSt = await seedStatement(tenantB, "closed", null, "2026-09");
    const issueSt = await seedStatement(tenantB, "closed", null, "2026-10");
    await requestChargeCreate({ intents: new PrismaChargeIntentRepository(role.client) }, { tenantId: tenantB, statementId: chargeSt, provider: "asaas", payload: { amountCents: 10_000, dueDate: dueIn(20), method: "pix" }, now: new Date() });
    const w0 = world([tenantB]);
    assert.equal((await w0.service.recordManualPayment({ tenantId: tenantB, statementId: issueSt, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() })).statement.status, "paid");
    const [before] = await issueLines(issueSt);
    assert.equal(before.status, "PENDING");
    const attemptsBefore = Number((await allLines(issueSt)).find((row) => row.kind === "invoice_issue")!.attempts);
    const clockAt = new Date(Date.now() + 60_000);
    const drop = await failOutboxInsertFor(a.tenantId, "vr6");
    try {
      const nfse0 = nfsePosts(focus);
      const pay0 = paymentPosts();
      const w = world([a.tenantId, tenantB], { payments: true, now: () => clockAt });
      const result = await runBillingDispatch(w.deps);
      assert.equal(result.invoiceSweep?.ok, false, JSON.stringify(result.invoiceSweep));
      assert.deepEqual(result.invoiceSweep?.failures.map((f) => f.tenantId), [a.tenantId], "a falha é só da A");
      const code = result.invoiceSweep!.failures[0]!.code;
      assert.ok(code && !code.includes("c2_injected"), `só o código, nunca a mensagem (${code})`);
      assert.equal(nfsePosts(focus) - nfse0, 0, "0 POST /nfsen nesta rodada, para TODAS");
      assert.equal(paymentPosts() - pay0, 1, "a cobrança da B foi despachada");
      const issue = (await allLines(issueSt)).find((row) => row.kind === "invoice_issue")!;
      assert.equal(issue.status, "PENDING");
      assert.equal(issue.skip_reason, null, "sem provider_disabled falso");
      assert.equal(Number(issue.attempts), attemptsBefore, "a tentativa foi devolvida");
      assert.equal(issue.last_error, "invoice_sweep_failed");
      assert.equal(new Date(issue.next_attempt_at).getTime(), clockAt.getTime() + INVOICE_DEFER_MS, "+15 min do relógio injetado");
      assert.deepEqual(await issueLines(a.statementId), [], "nada nasceu para a A");
      // A trilha (o `onAudit` do despacho; em produção ela vai ao log pelo `runBillingDispatch`): a A e o código.
      const audits: DispatchAuditEvent[] = [];
      await runDispatchOutbox({
        repo: w.deps.outbox,
        ports: {},
        resolveCustomer: w.deps.resolveCustomer,
        invoices: new InvoiceOutboxHandler({ ports: w.deps.invoicePorts!, invoices: w.deps.invoices!, statements: w.deps.statements, resolveIssueContext: w.deps.resolveIssueContext! }),
        invoiceSweep: (now) => runInvoiceRecoverySweep({ listTenantIds: w.deps.listTenantIds, sweepTenant: (t, at) => w.deps.invoiceRecovery.recoverInvoiceIntents(t, at), now }),
        onAudit: async (event) => void audits.push(event),
        now: () => clockAt,
      });
      assert.deepEqual(audits.filter((e) => e.action === "billing_outbox.invoice_sweep_failed").map((e) => [e.tenantId, e.code]), [[a.tenantId, code]]);
    } finally {
      await drop();
    }
  });

  test("VR6b: com a varredura da A vermelha, o invoice_cancel PENDING da B (nota autorizada, estorno TOTAL do provedor) SAI nesta rodada: 1 DELETE, a linha SENT, a nota cancel_pending; e 0 POST /nfsen", async () => {
    const a = await paidLegacy("vr6ba");
    const tenantB = await seedTenant("vr6bb");
    const st = await seedStatement(tenantB, "closed", null);
    const wb = world([tenantB]);
    await wb.deps.settlement.settle({ tenantId: tenantB, statementId: st, source: "asaas", externalChargeId: `pay_vr6b_${st}`, paidCents: 10_000, method: null, now: new Date() });
    await runBillingDispatch(wb.deps);
    const [nota] = await invoicesOf(st);
    assert.equal(nota.status, "pending");
    await new PrismaStatementInvoiceRepository(role.client).markAuthorized(tenantB, nota.id, { pdfSource: "public_url" }, new Date());
    await wb.deps.settlement.applyReversal({ tenantId: tenantB, statementId: st, externalChargeId: `pay_vr6b_${st}`, reversedCents: 10_000, kind: "refund", now: new Date() });
    assert.deepEqual((await allLines(st)).filter((row) => row.kind === "invoice_cancel").map((row) => row.status), ["PENDING"], "o [INTX-03] gravou o cancelamento");
    const drop = await failOutboxInsertFor(a.tenantId, "vr6b");
    try {
      const nfse0 = nfsePosts(focus);
      const result = await runBillingDispatch(world([a.tenantId, tenantB]).deps);
      assert.equal(result.invoiceSweep?.ok, false);
      assert.equal(callsOn(focus, "DELETE", st), 1, "1 DELETE da nota da B");
      assert.deepEqual((await allLines(st)).filter((row) => row.kind === "invoice_cancel").map((row) => row.status), ["SENT"]);
      assert.ok(["cancel_pending", "cancelled"].includes((await invoicesOf(st))[0].status));
      assert.equal(nfsePosts(focus) - nfse0, 0, "0 POST /nfsen");
    } finally {
      await drop();
    }
  });

  test("VR6c: com a varredura vermelha, a invoice_issue ÓRFÃ (PROCESSING com a posse vencida, a nota pending do beginIssue e existente no falso) RECONSULTA: 1 GET /nfsen/<ref>, 0 POST, a linha SENT (recovered)", async () => {
    const a = await paidLegacy("vr6ca");
    const tenantB = await seedTenant("vr6cb");
    const st = await seedStatement(tenantB, "closed", null);
    const wb = world([tenantB]);
    await wb.service.recordManualPayment({ tenantId: tenantB, statementId: st, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
    await new PrismaStatementInvoiceRepository(role.client).beginIssue({ tenantId: tenantB, statementId: st, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, new Date());
    // A nota que o POST perdido criou no provedor (o falso a guarda pela ref).
    await fetch(`${focus.baseUrl}/v2/nfsen?ref=${encodeURIComponent(`${st}:1`)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serie_dps: 7, numero_dps: 990_000 + Math.floor(Math.random() * 9_000) }) });
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET status = 'PROCESSING', attempts = 1, claimed_at = now(), claimed_by = 'zumbi', attempt_started_at = now() WHERE statement_id = $1::uuid AND kind = 'invoice_issue'`, st);
    const drop = await failOutboxInsertFor(a.tenantId, "vr6c");
    try {
      const posts0 = callsOn(focus, "POST", st);
      const gets0 = callsOn(focus, "GET", st);
      const clockAt = new Date(Date.now() + OUTBOX_ORPHAN_MS + 60_000); // a órfã nasce pelo relógio INJETADO, não por espera
      const result = await runBillingDispatch(world([a.tenantId, tenantB], { now: () => clockAt }).deps);
      assert.equal(result.invoiceSweep?.ok, false);
      assert.equal(callsOn(focus, "GET", st) - gets0, 1, "1 GET de reconsulta");
      assert.equal(callsOn(focus, "POST", st) - posts0, 0, "0 POST");
      assert.deepEqual((await issueLines(st)).map((row) => row.status), ["SENT"], "recovered");
    } finally {
      await drop();
    }
  });

  test("VR-P12: (a) baixa manual com o relógio 1 dia À FRENTE; o despacho emite e a prefeitura REJEITA (nota rejected, nada em voo, nada vivo); nova rodada → continua 1 intenção. (b) a época decidida SOB A TRAVA: a intenção da época nova nasce e termina entre a consulta e a trava → a varredura não cria a 2ª", async () => {
    // (a) o A9b: a linha da baixa nasce no MESMO instante injetado do paid_at.
    const tenantId = await seedTenant("vrp12");
    const st = await seedStatement(tenantId, "closed", null);
    const ahead = new Date(Date.now() + 24 * HOUR);
    const w = world([tenantId], { focusServer: focusRejected, now: () => new Date(ahead.getTime() + 60_000) });
    assert.equal((await w.service.recordManualPayment({ tenantId, statementId: st, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: ahead })).statement.status, "paid");
    await runBillingDispatch(w.deps);
    assert.equal(await invoiceWebhook(w, st, 1, focusRejected), "processed");
    assert.deepEqual((await invoicesOf(st)).map((row) => row.status), ["rejected"], "a prefeitura rejeitou");
    assert.deepEqual((await issueLines(st)).map((row) => row.status), ["SENT"], "nenhuma linha em voo");
    const again = await runBillingDispatch(w.deps);
    assert.equal(again.invoiceSweep?.inserted, 0, JSON.stringify(again.invoiceSweep));
    assert.equal((await issueLines(st)).length, 1, "continua 1 intenção (a reemissão da época é do operador)");

    // (b) a época sob a trava: o pago de antes do 08c2 é candidato; entre a consulta e a trava, o operador estorna e baixa de novo,
    // a intenção da época nova é emitida e a prefeitura a rejeita (terminal, nada vivo, nada em voo). Só a regra da época, sob a
    // trava, impede a 2ª intenção (a consulta já tinha listado o candidato).
    const tenant2 = await seedTenant("vrp12b");
    const st2 = await seedStatement(tenant2, "closed", null);
    const legacy = new StatementService(new PrismaStatementRepository(role.client), INPUTS, AUDIT);
    const first = await legacy.recordManualPayment({ tenantId: tenant2, statementId: st2, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date(Date.now() - HOUR) });
    let fired = false;
    const w2: World = world([tenant2], {
      focusServer: focusRejected,
      repository: (real) =>
        Object.assign(Object.create(real), {
          listInvoiceIntentCandidates: async (t: string, cutoff: Date) => {
            const found = await real.listInvoiceIntentCandidates(t, cutoff);
            if (!fired && found.includes(st2)) {
              fired = true;
              await w2.service.reverseManualPayment({ tenantId: tenant2, paymentId: first.payment.id, reason: "estorno de teste", actorId: "usr_platform", now: new Date() });
              await w2.service.recordManualPayment({ tenantId: tenant2, statementId: st2, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
              await runDispatchOutbox({
                repo: w2.deps.outbox,
                ports: {},
                resolveCustomer: w2.deps.resolveCustomer,
                invoices: new InvoiceOutboxHandler({ ports: w2.deps.invoicePorts!, invoices: w2.deps.invoices!, statements: w2.deps.statements, resolveIssueContext: w2.deps.resolveIssueContext! }),
              });
              assert.equal(await invoiceWebhook(w2, st2, 1, focusRejected), "processed");
              assert.deepEqual((await invoicesOf(st2)).map((row) => row.status), ["rejected"], "a nota da época nova foi rejeitada antes da trava");
            }
            return found;
          },
        }),
    });
    const result = await runBillingDispatch(w2.deps);
    assert.ok(fired, "a barreira disparou entre a consulta e a trava");
    assert.equal(result.invoiceSweep?.inserted, 0, JSON.stringify(result.invoiceSweep));
    assert.equal((await issueLines(st2)).length, 1, "a época já tinha a sua intenção: nenhuma 2ª");
  });

  test("VR-SQL: listInvoiceIntentCandidates devolve EXATAMENTE os pagos desde o corte sem nota viva, sem linha em voo e sem linha da época, numa fixture com um de cada", async () => {
    const tenantId = await seedTenant("vrsql");
    const t0 = new Date(Date.now() - 10 * HOUR);
    const mk = (period: string, status: "paid" | "closed", paidAt: Date | null) => seedStatement(tenantId, status, paidAt, period);
    const ok1 = await mk("2026-01", "paid", t0);
    const beforeCut = await mk("2026-02", "paid", new Date(INVOICE_BACKFILL_CUTOFF.getTime() - SECOND));
    const live = await mk("2026-03", "paid", new Date(t0.getTime() + 1 * HOUR));
    const inFlight = await mk("2026-04", "paid", new Date(t0.getTime() + 2 * HOUR));
    const epoch = await mk("2026-05", "paid", new Date(t0.getTime() + 3 * HOUR));
    const notPaid = await mk("2026-06", "closed", null);
    const zero = await mk("2026-07", "paid", new Date(t0.getTime() + 4 * HOUR));
    const oldEpoch = await mk("2026-08", "paid", new Date(t0.getTime() + 5 * HOUR));
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET total_amount = 0, paid_amount = 0 WHERE id = $1::uuid`, zero);
    await db.$executeRawUnsafe(`INSERT INTO subscription_statement_invoices (tenant_id, statement_id, seq, provider, external_ref, status) VALUES ($1::uuid, $2::uuid, 1, 'focusnfe', $2 || ':1', 'authorized')`, tenantId, live);
    const line = (statementId: string, status: string, occurredAt: Date) =>
      db.$executeRawUnsafe(
        `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, status, occurred_at)
         VALUES ($1::uuid, $2::uuid, 'invoice_issue', 'focusnfe', 'invoice_issue:' || $2 || ':1', gen_random_uuid(), '{"seq":1}'::jsonb, $3, $4)`,
        tenantId,
        statementId,
        status,
        occurredAt,
      );
    await line(inFlight, "PENDING", new Date(t0.getTime() - 24 * HOUR)); // em voo, de OUTRA época: barra
    await line(epoch, "SENT", new Date(t0.getTime() + 3 * HOUR)); // da época (occurred_at = paid_at), terminal: barra
    await line(oldEpoch, "SENT", new Date(t0.getTime() - 24 * HOUR)); // de época ANTERIOR, terminal: não barra
    const found = await new PrismaStatementRepository(role.client).listInvoiceIntentCandidates(tenantId, INVOICE_BACKFILL_CUTOFF);
    const name = new Map([[ok1, "ok"], [beforeCut, "antes-do-corte"], [live, "nota-viva"], [inFlight, "em-voo"], [epoch, "da-epoca"], [notPaid, "nao-pago"], [zero, "total-zero"], [oldEpoch, "epoca-anterior"]]);
    assert.deepEqual(found.map((id) => name.get(id)), ["ok", "epoca-anterior"], "exatamente os dois, em ordem de paid_at");
  });

  test("VR-OFF: sem provedor de nota ligado, a varredura não roda (0 consulta de candidatos, pelo espião na porta)", async () => {
    const f = await paidLegacy("vroff");
    let calls = 0;
    const spy = (real: PrismaStatementRepository) =>
      Object.assign(Object.create(real), {
        listInvoiceIntentCandidates: async (t: string, cutoff: Date) => {
          calls += 1;
          return real.listInvoiceIntentCandidates(t, cutoff);
        },
      });
    const off = world([f.tenantId], { invoiceOn: false, repository: spy });
    const result = await runBillingDispatch(off.deps);
    assert.equal(result.invoiceSweep, undefined, "nenhuma varredura nesta rodada");
    const { invoicePorts: _ports, ...withoutLeg } = off.deps;
    await runBillingDispatch(withoutLeg as ChannelDeps);
    assert.equal(calls, 0, "0 consulta de candidatos");
    assert.deepEqual(await issueLines(f.statementId), []);
  });

  test("VR-PERF (diário): 1 000 organizações × 1 demonstrativo pago COM intenção → 0 intenção nova e as 1 000 enumeradas; o tempo vai ao diário, sem asserção de teto", async (t) => {
    const tag = randomUUID().slice(0, 8);
    const tenants = (await q(`INSERT INTO tenants (name, slug) SELECT 'c2-vrperf-' || g || '-${tag}', 'c2-vrperf-' || g || '-${tag}' FROM generate_series(1, 1000) g RETURNING id`)).map((row) => row.id as string);
    await db.$executeRawUnsafe(
      `WITH s AS (
         INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
           storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
           tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at)
         SELECT id, '2026-10', 'paid', 'none', '[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,100,'{"latest":null,"history":[]}'::jsonb,'2026-11-10',now(),now() - interval '1 hour'
           FROM unnest($1::uuid[]) AS id
         RETURNING id, tenant_id, paid_at)
       INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, status, occurred_at)
       SELECT tenant_id, id, 'invoice_issue', 'focusnfe', 'invoice_issue:' || id || ':1', gen_random_uuid(), '{"seq":1}'::jsonb, 'SENT', paid_at FROM s`,
      tenants,
    );
    let enumerated = 0;
    const w = world(tenants);
    const counting: ChannelDeps = { ...w.deps, invoiceRecovery: { recoverInvoiceIntents: async (tenantId, now) => { enumerated += 1; return w.service.recoverInvoiceIntents(tenantId, now); } } };
    const started = Date.now();
    const result = await runBillingDispatch(counting);
    const elapsed = Date.now() - started;
    t.diagnostic(`VR-PERF: ${tenants.length} organizações, rodada de despacho com a varredura em ${elapsed} ms (inserted ${result.invoiceSweep?.inserted})`);
    assert.equal(result.invoiceSweep?.ok, true);
    assert.equal(result.invoiceSweep?.inserted, 0, "0 intenção nova");
    assert.equal(enumerated, 1000, "as 1 000 organizações enumeradas");
  });

  test("VR-X: a varredura da organização A não grava linha nem índice para um demonstrativo da B (RLS; papel NOBYPASSRLS), com controle positivo na própria B", async () => {
    const a = await paidLegacy("vrxa");
    const b = await paidLegacy("vrxb");
    const statements = new PrismaStatementRepository(role.client);
    assert.deepEqual(await statements.listInvoiceIntentCandidates(a.tenantId, INVOICE_BACKFILL_CUTOFF), [a.statementId], "a consulta da A só acha o da A");
    assert.deepEqual(await statements.listInvoiceIntentCandidates(b.tenantId, INVOICE_BACKFILL_CUTOFF), [b.statementId], "controle positivo: a da B acha o da B");
    const w = world([a.tenantId]);
    assert.deepEqual(await w.service.recoverInvoiceIntents(a.tenantId, new Date()), { inserted: 1 });
    assert.equal((await issueLines(a.statementId)).length, 1, "a A ganhou a sua");
    assert.deepEqual(await issueLines(b.statementId), [], "0 linha para o demonstrativo da B");
    assert.deepEqual(await refsOf(b.statementId), [], "0 índice para o demonstrativo da B");
  });
}
