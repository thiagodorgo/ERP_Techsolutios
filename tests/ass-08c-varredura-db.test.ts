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
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
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

  after(async () => {
    await focus?.close();
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

  type World = { deps: ChannelDeps; service: StatementService; statements: PrismaStatementRepository; intents: InvoiceIntents };
  type WorldOptions = { invoiceOn?: boolean; now?: () => Date; repository?: (real: PrismaStatementRepository) => StatementRepository };

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
      new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${focus.baseUrl}/v2` }),
      async (k) => (k === "api_token" ? "TOK-f" : "WHK-f"),
    );
    const deps: ChannelDeps = {
      outbox: new PrismaOutboxRepository(c, { tenantIds }),
      events: new PrismaWebhookEventRepository(c),
      refs: new PrismaStatementRefRepository(c),
      charges: new PrismaStatementChargeRepository(c),
      ports: {},
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
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    dbName = `${base}_c2_vr_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}" TEMPLATE template0`);
    const u = new URL(connectionString!);
    u.pathname = `/${dbName}`;
    const targetUrl = u.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const posture = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as any[];
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }], "o papel de runtime é NOSUPERUSER NOBYPASSRLS");
    focus = await startFocusNfeFake("ok");
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
}
