// B-ASS-08c2 (item 60) · a nota da BAIXA MANUAL (plano de abertura §4.2, §5.1; Emenda 1 §5.1): a baixa manual que quita grava 1
// `invoice_issue` NA MESMA transação, com o `seq` seguinte, e o índice do demonstrativo nasce com ela (`provider` nulo, a
// organização do demonstrativo travado). Com a nota desligada a linha nasce `provider_disabled`, visível; religada, sai.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup), com o app real no modo `prisma` sobre o papel (a composição de PRODUÇÃO do serviço: o `[NOTA-INTENTS]`), o canal ligado
// por env, o cofre com chave de teste e a configuração do Focus NFe `enabled`. O despacho e o webhook usam os repositórios Prisma
// sobre o papel e o falso Focus NFe de `tests/helpers/fake-providers/` em 127.0.0.1:0. O NM1-mem roda a composição de MEMÓRIA
// (`[NOTA-INTENTS-MEM]`) no mesmo processo, com o modo trocado e restaurado.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { holdNextIssue, startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const FISCAL = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const spDayPlus = (days: number) => SP_DAY.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
const HOUR = 60 * 60 * 1000;

type Json = Record<string, any>;
type Fixture = { readonly tenantId: string; readonly statementId: string };

if (!connectionString) {
  test("B-ASS-08c2 · a nota da baixa manual (-db) exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  const H: { admin: any; db: any; role: EphemeralRole; databaseName: string; server?: Server; baseUrl: string; focus: any; env: any; m: Record<string, any> } = {
    admin: undefined,
    db: undefined,
    role: undefined as unknown as EphemeralRole,
    databaseName: "",
    baseUrl: "",
    focus: undefined,
    env: undefined,
    m: {},
  };

  after(async () => {
    if (H.server) await new Promise<void>((resolve) => H.server!.close(() => resolve()));
    await H.focus?.close();
    await H.role?.drop();
    await H.db?.$disconnect();
    if (H.admin && H.databaseName) await H.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${H.databaseName}" WITH (FORCE)`);
    await H.admin?.$disconnect();
  });

  const q = (sql: string, ...args: unknown[]) => H.db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
    const response = await fetch(H.baseUrl + route, { method, headers: { "content-type": "application/json", ...PLATFORM }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: (await response.json()) as Json };
  }

  /** Organização SEM índice prévio + demonstrativo `closed` de R$ 100,00, sem pagamento, sem cobrança e sem nota. */
  async function seedClosed(tag: string): Promise<Fixture> {
    const slug = `c2-nm-${tag}-${randomUUID().slice(0, 8)}`;
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

  const pay = (f: Fixture, amount = "100.00") => api("POST", `/api/v1/platform/billing/statements/${f.statementId}/payments`, { tenantId: f.tenantId, amount, method: "pix" });
  const lines = (statementId: string) => q(`SELECT kind, status, skip_reason, idempotency_key, occurred_at, provider FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`, statementId);
  const refsOf = (statementId: string) => q(`SELECT tenant_id, provider, external_charge_id FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId);
  const statementRow = async (statementId: string) => (await q(`SELECT status, paid_at, paid_amount::text AS paid, invoice_status FROM subscription_statements WHERE id = $1::uuid`, statementId))[0];
  const invoicesOf = (statementId: string) => q(`SELECT seq, status, external_ref FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq`, statementId);
  const postsFor = (statementId: string) => H.focus.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v2/nfsen") && decodeURIComponent(r.path).includes(statementId)).length;
  const focusCalls = () => H.focus.recorded.length;

  async function setInvoiceEnabled(enabled: boolean): Promise<void> {
    await H.db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = $1, enabled_environment = CASE WHEN $1 THEN 'sandbox' ELSE NULL END, updated_at = now() WHERE provider = 'focusnfe'`, enabled);
  }

  function focusPort() {
    return new H.m.focusAdapter.FocusNfeInvoiceAdapter(
      new H.m.http.BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${H.focus.baseUrl}/v2` }),
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
  async function dispatch(tenantId: string, now: () => Date = () => new Date()) {
    const c = H.role.client;
    return H.m.dispatcher.runDispatchOutbox({
      repo: new H.m.outboxPrisma.PrismaOutboxRepository(c, { tenantIds: [tenantId] }),
      ports: {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_nm" }),
      invoices: new H.m.invoiceDispatch.InvoiceOutboxHandler({ ports: { focusnfe: focusPort() }, invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c), statements: new H.m.runtime.PrismaStatementRepository(c), resolveIssueContext: issueContext }),
      now,
    });
  }

  /** O webhook da nota (`ref = <id>:<seq>`) pelo reconcile real; devolve o desfecho e a linha do evento. */
  async function invoiceWebhook(statementId: string, seq: number): Promise<{ outcome: string; event: { status: string; error: string | null } }> {
    const c = H.role.client;
    const events = new H.m.webhookEvents.PrismaWebhookEventRepository(c);
    const externalEventId = `nm-wh-${randomUUID()}`;
    await events.insertIfAbsent({ provider: "focusnfe", externalEventId, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: null, externalReference: `${statementId}:${seq}` }, new Date());
    const outcome = await H.m.reconcile.reconcileWebhookEvent(
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
    return { outcome, event };
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, o app real no modo prisma, o canal e a nota ligados, o falso Focus", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { createPgAdapter } = await import("../src/database/pg-connection.js");
    H.admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    H.databaseName = `${base}_c2_nm_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory, vaultFactory, vaultKeys, dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, channelRuntime, reconcile, webhookEvents, statementRefs, settlement, statementService, channelJobs, chargesPrisma] =
      await Promise.all([
        import("../src/config/env.js"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
        import("../src/modules/core-saas/services/core-saas.service.js"),
        import("../src/modules/core-saas/store/core-saas.store.js"),
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
        import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
        import("../src/modules/subscription-billing/webhooks/reconcile.service.js"),
        import("../src/modules/subscription-billing/webhooks/webhook-events.prisma.js"),
        import("../src/modules/subscription-billing/webhooks/statement-refs.prisma.js"),
        import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
        import("../src/modules/subscription-billing/statements/statement.service.js"),
        import("../src/modules/subscription-billing/outbox/channel.jobs.js"),
        import("../src/modules/subscription-billing/charges/charges.prisma.js"),
      ]);
    H.m = { statementFactory, vaultFactory, vaultKeys, dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, channelRuntime, reconcile, webhookEvents, statementRefs, settlement, statementService, channelJobs, chargesPrisma };
    H.env = envModule.env;
    H.env.CORE_SAAS_PERSISTENCE = "prisma";
    H.env.BILLING_PROVIDERS_ENABLED = true;
    statementFactory.resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new vaultKeys.EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    H.server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => H.server!.once("listening", resolve));
    H.baseUrl = `http://127.0.0.1:${(H.server.address() as AddressInfo).port}`;
    // O roteiro `authorized`: a reconsulta da nota diz `autorizado` (o webhook e o poll a concluem).
    H.focus = await startFocusNfeFake("authorized");
  });

  const nm1: { fixture?: Fixture } = {};

  test("NM1: organização SEM índice prévio, nota ligada — a baixa manual que quita grava 1 invoice_issue PENDING NA transação (occurred_at = paid_at, seq 1) e 1 índice com provider nulo; o despacho faz 1 POST /nfsen", async () => {
    const f = await seedClosed("nm1");
    assert.deepEqual(await refsOf(f.statementId), [], "pré-condição: a organização não tem índice");
    const paid = await pay(f);
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    // Lido ANTES de qualquer despacho: a linha nasceu na transação da baixa.
    const rows = await lines(f.statementId);
    const issue = rows.filter((row) => row.kind === "invoice_issue");
    assert.equal(issue.length, 1, `1 invoice_issue (${JSON.stringify(rows)})`);
    assert.equal(issue[0].status, "PENDING");
    assert.equal(issue[0].skip_reason, null, "a nota está ligada: sem provider_disabled");
    assert.equal(issue[0].provider, "focusnfe");
    assert.equal(issue[0].idempotency_key, `invoice_issue:${f.statementId}:1`, "seq 1");
    const st = await statementRow(f.statementId);
    assert.equal(st.status, "paid");
    assert.equal(new Date(issue[0].occurred_at).getTime(), new Date(st.paid_at).getTime(), "occurred_at = paid_at (o MESMO instante, A9b)");
    assert.deepEqual(await refsOf(f.statementId), [{ tenant_id: f.tenantId, provider: null, external_charge_id: null }], "o índice nasce com a organização do demonstrativo e provider nulo");

    const before = postsFor(f.statementId);
    await dispatch(f.tenantId);
    assert.equal(postsFor(f.statementId) - before, 1, "1 POST /nfsen");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "pending"]], "nota pending");
    nm1.fixture = f;
  });

  test("NM-WH: depois do NM1, o webhook da nota dessa organização (ref = <id>:1) → evento processed e nota autorizada pela reconsulta; nunca ignored unresolved_reference", async () => {
    const f = nm1.fixture;
    assert.ok(f, "depende do NM1");
    const c = H.role.client;
    const events = new H.m.webhookEvents.PrismaWebhookEventRepository(c);
    const statements = new H.m.runtime.PrismaStatementRepository(c);
    const externalEventId = `nm-wh-${randomUUID()}`;
    await events.insertIfAbsent({ provider: "focusnfe", externalEventId, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: null, externalReference: `${f!.statementId}:1` }, new Date());
    const outcome = await H.m.reconcile.reconcileWebhookEvent(
      {
        events,
        refs: new H.m.statementRefs.PrismaStatementRefRepository(c),
        ports: {},
        settlement: new H.m.settlement.StatementSettlementService(statements, undefined as never),
        invoicePorts: { focusnfe: focusPort() },
        invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c),
      },
      { provider: "focusnfe", externalEventId },
    );
    const [event] = await q(`SELECT status, error FROM billing_webhook_events WHERE external_event_id = $1`, externalEventId);
    assert.notEqual(event.error, "unresolved_reference", `o índice resolve a organização (outcome ${outcome}, ${JSON.stringify(event)})`);
    assert.equal(event.status, "processed", JSON.stringify(event));
    assert.deepEqual((await invoicesOf(f!.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "a reconsulta autorizou");
  });

  test("NM2: a queda depois do commit não perde a intenção — a baixa commita, quem chamou recebe erro, e um runtime NOVO acha a linha", async () => {
    const f = await seedClosed("nm2");
    const rt = await H.m.runtime.createPrismaStatementRuntime();
    const repo = rt.repository as any;
    const orig = repo.transaction.bind(repo);
    repo.transaction = async (tenantId: string, work: any) => {
      const value = await orig(tenantId, work);
      throw Object.assign(new Error("simulated_crash_after_commit"), { value });
    };
    await assert.rejects(rt.service.recordManualPayment({ tenantId: f.tenantId, statementId: f.statementId, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() }), /simulated_crash_after_commit/);
    const fresh = new H.m.outboxPrisma.PrismaOutboxRepository(H.role.client, { tenantIds: [f.tenantId] });
    const found = (await fresh.listByStatement(f.tenantId, f.statementId)).filter((row: { kind: string }) => row.kind === "invoice_issue");
    assert.equal(found.length, 1, "a linha commitou com a baixa");
    assert.equal((await statementRow(f.statementId)).status, "paid");
  });

  test("NM2b: falha injetada no INSERT da fila → a baixa falha inteira: 0 pagamento, demonstrativo closed, 0 índice novo", async () => {
    const f = await seedClosed("nm2b");
    await H.db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION c2_fail_outbox_nm2b() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF NEW.tenant_id = '${f.tenantId}'::uuid AND NEW.kind = 'invoice_issue' THEN RAISE EXCEPTION 'c2_injected_outbox_failure'; END IF; RETURN NEW; END $f$`);
    await H.db.$executeRawUnsafe(`CREATE TRIGGER c2_fail_outbox_nm2b BEFORE INSERT ON billing_outbox FOR EACH ROW EXECUTE FUNCTION c2_fail_outbox_nm2b()`);
    try {
      const paid = await pay(f);
      assert.notEqual(paid.status, 201, JSON.stringify(paid.body));
      assert.equal((await q(`SELECT count(*)::int AS n FROM subscription_statement_payments WHERE statement_id = $1::uuid`, f.statementId))[0].n, 0, "0 pagamento");
      assert.equal((await statementRow(f.statementId)).status, "closed");
      assert.deepEqual(await refsOf(f.statementId), [], "0 índice novo");
      assert.deepEqual(await lines(f.statementId), [], "0 linha");
    } finally {
      await H.db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS c2_fail_outbox_nm2b ON billing_outbox`);
      await H.db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS c2_fail_outbox_nm2b()`);
    }
  });

  test("NM3: nota DESLIGADA → a linha nasce provider_disabled, 0 conexão; religar (env + cofre + enabled) → o despacho faz 1 POST", async () => {
    const f = await seedClosed("nm3");
    await setInvoiceEnabled(false);
    try {
      const calls = focusCalls();
      const paid = await pay(f);
      assert.equal(paid.status, 201, JSON.stringify(paid.body));
      const issue = (await lines(f.statementId)).filter((row) => row.kind === "invoice_issue");
      assert.deepEqual(issue.map((row) => [row.status, row.skip_reason, row.provider]), [["PENDING", "provider_disabled", "focusnfe"]], "visível como provider_disabled");
      assert.equal(focusCalls(), calls, "0 conexão ao provedor de nota");
    } finally {
      await setInvoiceEnabled(true);
    }
    const before = postsFor(f.statementId);
    await dispatch(f.tenantId);
    assert.equal(postsFor(f.statementId) - before, 1, "religada, 1 POST /nfsen");
    const issue = (await lines(f.statementId)).filter((row) => row.kind === "invoice_issue");
    assert.equal(issue[0].skip_reason, null, "o claim limpou o provider_disabled");
  });

  const mem: { lines?: number } = {};

  test("NM1-mem: o mesmo pela composição de MEMÓRIA (createDefaultStatementRuntime + createChannelRuntime): a baixa que quita grava 1 invoice_issue e o índice; o despacho faz 1 POST", async () => {
    const { statementFactory, channelRuntime } = H.m;
    const saved = { persistence: H.env.CORE_SAAS_PERSISTENCE };
    H.env.CORE_SAAS_PERSISTENCE = "memory";
    statementFactory.resetStatementRuntimeForTests();
    channelRuntime.resetChannelRuntimeForTests();
    try {
      const { service, repository } = await statementFactory.createDefaultStatementRuntime();
      const tenantId = `mem-${randomUUID()}`;
      const statement = await repository.transaction(tenantId, async (tx: any) => {
        const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-10" });
        return tx.saveStatement({ ...fresh, status: "closed", totalCents: 10_000, dueDate: spDayPlus(20), closedAt: new Date() });
      });
      const result = await service.recordManualPayment({ tenantId, statementId: statement.id, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
      assert.equal(result.statement.status, "paid");
      const deps = await channelRuntime.createChannelRuntime();
      const issue = (await deps.outbox.listByStatement(tenantId, statement.id)).filter((row: { kind: string }) => row.kind === "invoice_issue");
      mem.lines = issue.length;
      assert.equal(issue.length, 1, "1 invoice_issue na composição de memória");
      assert.equal(issue[0].idempotencyKey, `invoice_issue:${statement.id}:1`);
      assert.equal(issue[0].occurredAt.getTime(), result.statement.paidAt!.getTime(), "occurred_at = paid_at");
      assert.equal((await deps.refs.resolve(statement.id))?.tenantId, tenantId, "o índice nasce");
      const before = postsFor(statement.id);
      await H.m.dispatcher.runDispatchOutbox({
        repo: deps.outbox,
        ports: {},
        resolveCustomer: async () => ({ ok: true as const, customerId: "cus_nm" }),
        invoices: new H.m.invoiceDispatch.InvoiceOutboxHandler({ ports: { focusnfe: focusPort() }, invoices: deps.invoices, statements: deps.statements, resolveIssueContext: issueContext }),
      });
      assert.equal(postsFor(statement.id) - before, 1, "1 POST /nfsen");
    } finally {
      H.env.CORE_SAAS_PERSISTENCE = saved.persistence;
      statementFactory.resetStatementRuntimeForTests();
      channelRuntime.resetChannelRuntimeForTests();
    }
  });

  test("GI1: as DUAS composições passam o invoiceIntents (por comportamento: a baixa grava a linha no modo prisma, pela rota, e no modo memória)", async () => {
    assert.ok(nm1.fixture, "o NM1 (rota, modo prisma) gravou a linha");
    assert.equal(mem.lines, 1, "o NM1-mem (composição de memória) gravou a linha");
    // E a rota de novo, num demonstrativo novo, com o runtime refeito do zero (a composição de produção, não um resto do NM1).
    H.m.statementFactory.resetStatementRuntimeForTests();
    const f = await seedClosed("gi1");
    assert.equal((await pay(f)).status, 201);
    assert.equal((await lines(f.statementId)).filter((row) => row.kind === "invoice_issue").length, 1);
  });

  test("NM-WH-ORDER (N = 10): o webhook da nota chega ENTRE o POST gravado no provedor e a resposta síncrona → nota authorized, o espelho invoice_status authorized, a linha SENT, 0 nota pending", async () => {
    for (let round = 0; round < 10; round += 1) {
      const f = await seedClosed(`nmwho${round}`);
      assert.equal((await pay(f)).status, 201);
      const gate = holdNextIssue();
      const running = dispatch(f.tenantId);
      await gate.reached; // a nota já está gravada no falso, e a resposta do POST está presa
      const { event } = await invoiceWebhook(f.statementId, 1);
      assert.equal(event.status, "processed", `rodada ${round}: ${JSON.stringify(event)}`);
      gate.release();
      await running;
      assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], `rodada ${round}: a resposta atrasada não regride a nota`);
      assert.equal((await statementRow(f.statementId)).invoice_status, "authorized", `rodada ${round}: o espelho continua authorized`);
      assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "invoice_issue").map((row) => row.status), ["SENT"], `rodada ${round}`);
      assert.equal((await q(`SELECT count(*)::int AS n FROM subscription_statement_invoices WHERE statement_id = $1::uuid AND status = 'pending'`, f.statementId))[0].n, 0);
    }
  });

  // ============================================================== F5 · o seq seguinte no caminho do PROVEDOR e a linha única em voo
  /** O settlement do PROVEDOR sobre os repositórios Prisma do papel, com as intenções de nota dadas (o molde do T-INTX). */
  function providerSettlement(enabled = true) {
    const statements = new H.m.runtime.PrismaStatementRepository(H.role.client);
    const service = new H.m.statementService.StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
    return new H.m.settlement.StatementSettlementService(statements, service, { issueTarget: { provider: "focusnfe", enabled }, enabledInvoiceProviders: enabled ? ["focusnfe"] : [] });
  }
  const providerPay = (settlement: any, f: Fixture, charge: string) =>
    settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: charge, paidCents: 10_000, method: null, now: new Date() });
  const providerRefund = (settlement: any, f: Fixture, charge: string) =>
    settlement.applyReversal({ tenantId: f.tenantId, statementId: f.statementId, externalChargeId: charge, reversedCents: 10_000, kind: "refund", now: new Date() });
  /** O demonstrativo do caminho do PROVEDOR: o índice já nasceu com a cobrança do Asaas (o fechamento com o canal ligado). */
  async function seedProvider(tag: string): Promise<Fixture> {
    const f = await seedClosed(tag);
    await q(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider, external_charge_id, created_at) VALUES ($1::uuid, $2::uuid, 'asaas', $3, now())`, f.statementId, f.tenantId, `pay_${tag}a_${f.statementId}`);
    return f;
  }
  const issueLines = async (statementId: string) => (await lines(statementId)).filter((row) => row.kind === "invoice_issue");
  const postsWithRef = (ref: string) =>
    H.focus.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v2/nfsen") && decodeURIComponent(r.path).includes(`ref=${ref}`)).length;
  const locksOf = async (pid: number, relname: string) =>
    Number((await q(`SELECT count(*)::int AS n FROM pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE l.pid = $1 AND c.relname = $2`, pid, relname))[0].n);

  test("RE1: o provedor paga (seq 1, nota autorizada), estorno total (nota cancelada), repagamento por OUTRA cobrança → 1 invoice_issue seq 2 VIVA, gravada depois da trava (barreira) → despacho → 1 POST com ref = <id>:2", async () => {
    const f = await seedProvider("re1");
    const settlement = providerSettlement();
    await providerPay(settlement, f, `pay_re1a_${f.statementId}`);
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.idempotency_key), [`invoice_issue:${f.statementId}:1`], "a 1ª época: seq 1");
    await dispatch(f.tenantId);
    assert.equal((await invoiceWebhook(f.statementId, 1)).event.status, "processed");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "nota 1 autorizada");
    // Estorno TOTAL pelo provedor: o `[INTX-03]` grava o `invoice_cancel`; o despacho cancela e o webhook conclui.
    await providerRefund(settlement, f, `pay_re1a_${f.statementId}`);
    assert.equal((await statementRow(f.statementId)).status, "closed");
    await dispatch(f.tenantId);
    await invoiceWebhook(f.statementId, 1);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "cancelled"]], "nota 1 cancelada");

    // O repagamento por OUTRA cobrança, com o demonstrativo travado por H (o molde do T-INTX-9b): quem espera a trava não segura
    // nada em billing_outbox (a linha nasce DEPOIS da trava).
    let go!: () => void;
    const gate = new Promise<void>((resolve) => (go = resolve));
    let lockedH!: (pid: number) => void;
    const hLocked = new Promise<number>((resolve) => (lockedH = resolve));
    const hold = H.db.$transaction(
      async (tx: any) => {
        await tx.$queryRawUnsafe(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, f.statementId);
        lockedH(Number(((await tx.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid`)) as Array<{ pid: number }>)[0]!.pid));
        await gate;
      },
      { timeout: 60_000, maxWait: 5_000 },
    );
    const hPid = await hLocked;
    const errs: string[] = [];
    const repaying = providerPay(settlement, f, `pay_re1b_${f.statementId}`).catch((error: any) => errs.push(`${error?.code ?? ""}:${String(error?.message).slice(-160)}`));
    let payPid = 0;
    for (let i = 0; i < 500 && !payPid; i += 1) {
      const waiting = await H.admin.$queryRawUnsafe(`SELECT pid FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND pid <> $2`, H.databaseName, hPid);
      if (waiting[0]) payPid = Number(waiting[0].pid);
      else await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(payPid > 0, "barreira: o repagamento chegou a esperar a trava do demonstrativo");
    assert.ok((await locksOf(hPid, "subscription_statements")) >= 1, "controle positivo: a consulta vê a trava de H");
    assert.equal(await locksOf(payPid, "billing_outbox"), 0, "quem espera o demonstrativo não segura nada em billing_outbox");
    go();
    await hold;
    await repaying;
    assert.deepEqual(errs, [], "sem 40P01, P2028 ou 57014");
    assert.equal((await statementRow(f.statementId)).status, "paid");
    const issue = await issueLines(f.statementId);
    assert.deepEqual(
      issue.map((row) => [row.idempotency_key, row.status, row.skip_reason]),
      [
        [`invoice_issue:${f.statementId}:1`, "SENT", null],
        [`invoice_issue:${f.statementId}:2`, "PENDING", null],
      ],
      "1 invoice_issue seq 2 VIVA, ao lado da seq 1 terminal",
    );
    const before = postsWithRef(`${f.statementId}:2`);
    await dispatch(f.tenantId);
    assert.equal(postsWithRef(`${f.statementId}:2`) - before, 1, "1 POST com ref = <id>:2");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "cancelled"], [2, "pending"]], "a nota da 2ª época");
  });

  test("RE2: com a invoice_issue seq 1 ainda PENDING (nota desligada), estorno e repagamento → continua 1 linha (a linha em voo de antes emite); religar → 1 POST com ref = <id>:1", async () => {
    const f = await seedProvider("re2");
    const off = providerSettlement(false);
    await providerPay(off, f, `pay_re2a_${f.statementId}`);
    assert.deepEqual((await issueLines(f.statementId)).map((row) => [row.idempotency_key, row.status, row.skip_reason]), [[`invoice_issue:${f.statementId}:1`, "PENDING", "provider_disabled"]]);
    await providerRefund(off, f, `pay_re2a_${f.statementId}`);
    assert.equal((await statementRow(f.statementId)).status, "closed");
    await providerPay(off, f, `pay_re2b_${f.statementId}`);
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.idempotency_key), [`invoice_issue:${f.statementId}:1`], "continua 1 linha: a PENDING de antes emite para o pago de agora");
    // Religar: o despacho com a porta de nota ligada limpa o provider_disabled e emite a linha de sempre.
    const before = postsWithRef(`${f.statementId}:1`);
    await dispatch(f.tenantId);
    assert.equal(postsWithRef(`${f.statementId}:1`) - before, 1, "1 POST com ref = <id>:1");
    assert.equal(postsFor(f.statementId), 1, "e nenhum outro POST para o demonstrativo");
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.status), ["SENT"]);
  });

  // ============================================================== F9a · o seq seguinte no caminho MANUAL (Emenda 3, item 3)
  test("RE1-man: baixa manual que quita (seq 1, nota autorizada), estorno manual TOTAL com confirmação (nota cancelada), nova baixa manual → 1 invoice_issue seq 2 VIVA → despacho → 1 POST com ref = <id>:2", async () => {
    const f = await seedClosed("re1man");
    const manual = async () => (await H.m.runtime.createPrismaStatementRuntime()).service;
    const first = await (await manual()).recordManualPayment({ tenantId: f.tenantId, statementId: f.statementId, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.idempotency_key), [`invoice_issue:${f.statementId}:1`], "a 1ª época: seq 1");
    await dispatch(f.tenantId);
    assert.equal((await invoiceWebhook(f.statementId, 1)).event.status, "processed");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "nota 1 autorizada");
    // Estorno manual TOTAL, com a confirmação do cuidado 1: a linha NOTA-ESTORNO do serviço grava o `invoice_cancel`; o despacho cancela e o
    // webhook conclui.
    const reversed = await (await manual()).reverseManualPayment({ tenantId: f.tenantId, paymentId: first.payment.id, reason: "lançado errado", actorId: "usr_platform", now: new Date(), confirmInvoiceCancel: true });
    assert.equal((await statementRow(f.statementId)).status, "closed");
    await dispatch(f.tenantId);
    await invoiceWebhook(f.statementId, 1);
    // A nova baixa manual que quita: a época nova, o seq seguinte.
    await (await manual()).recordManualPayment({ tenantId: f.tenantId, statementId: f.statementId, amountCents: 10_000, method: "pix", note: null, actorId: "usr_platform", now: new Date() });
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual(
      (await issueLines(f.statementId)).map((row) => [row.idempotency_key, row.status, row.skip_reason]),
      [
        [`invoice_issue:${f.statementId}:1`, "SENT", null],
        [`invoice_issue:${f.statementId}:2`, "PENDING", null],
      ],
      "1 invoice_issue seq 2 VIVA, ao lado da seq 1 terminal",
    );
    const before = postsWithRef(`${f.statementId}:2`);
    await dispatch(f.tenantId);
    assert.equal(postsWithRef(`${f.statementId}:2`) - before, 1, "1 POST com ref = <id>:2");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "cancelled"], [2, "pending"]], "a nota da 2ª época (a 1ª cancelada)");
    assert.equal(reversed.invoice, "cancel_requested");
  });

  // ============================================================== F8 · o poll da nota POR ORGANIZAÇÃO
  /** As dependências dos polls sobre os repositórios Prisma do papel, recortadas às organizações do caso. */
  function pollDeps(tenantIds: readonly string[], now: Date) {
    const c = H.role.client;
    const statements = new H.m.runtime.PrismaStatementRepository(c);
    return {
      outbox: new H.m.outboxPrisma.PrismaOutboxRepository(c, { tenantIds }),
      events: new H.m.webhookEvents.PrismaWebhookEventRepository(c),
      refs: new H.m.statementRefs.PrismaStatementRefRepository(c),
      charges: new H.m.chargesPrisma.PrismaStatementChargeRepository(c),
      ports: {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_nm" }),
      settlement: new H.m.settlement.StatementSettlementService(statements, undefined as never),
      statements,
      invoicePorts: { focusnfe: focusPort() },
      invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c),
      resolveIssueContext: issueContext,
      listTenantIds: async () => tenantIds,
      invoiceRecovery: { recoverInvoiceIntents: async () => ({ inserted: 0 }) },
      now: () => now,
    };
  }
  /** Baixa manual que quita + 1 despacho: a nota da organização sem cobrança fica `pending` (sem webhook). */
  async function pendingInvoice(tag: string): Promise<Fixture> {
    const f = await seedClosed(tag);
    assert.equal((await pay(f)).status, 201);
    await dispatch(f.tenantId);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["pending"]);
    return f;
  }
  const later = () => new Date(Date.now() + 31 * 60 * 1000); // além dos 30 min de "parada" (POLL_PENDING_STALE_MS)

  test("NM-POLL: a nota pending da organização SEM cobrança, sem webhook, há mais de 30 min → o poll-pending a reconsulta e autoriza; invoices = 1", async () => {
    const f = await pendingInvoice("nmpoll");
    assert.deepEqual((await refsOf(f.statementId)).map((row) => row.external_charge_id), [null], "pré-condição: o índice não tem cobrança");
    const result = await H.m.channelJobs.runBillingPollPending(pollDeps([f.tenantId], later()));
    assert.equal(result.invoices, 1, JSON.stringify(result));
    assert.deepEqual(result.failures, []);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["authorized"]);
  });

  test("NM-POLL-b: a nota cancel_pending da organização SEM cobrança → o poll-settled conclui o cancelamento; invoices = 1", async () => {
    const f = await pendingInvoice("nmpollb");
    assert.equal((await invoiceWebhook(f.statementId, 1)).event.status, "processed");
    const [nota] = await q(`SELECT id, external_ref, status FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, f.statementId);
    assert.equal(nota.status, "authorized");
    // O cancelamento já pedido ao provedor (o DELETE e o `markCancelPending` que o despacho faria), sem webhook de volta.
    await fetch(`${H.focus.baseUrl}/v2/nfsen/${encodeURIComponent(nota.external_ref)}`, { method: "DELETE" });
    await new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(H.role.client).markCancelPending(f.tenantId, nota.id, { reason: "payment_reversed", code: H.m.invoiceDispatch.INVOICE_CANCEL_CODE_OTHERS }, new Date());
    const result = await H.m.channelJobs.runBillingPollSettled(pollDeps([f.tenantId], new Date()));
    assert.equal(result.invoices, 1, JSON.stringify(result));
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["cancelled"]);
  });

  test("NM-POLL-c: a nota emitida 50 dias depois do índice (fora da janela de 45 d) → o poll a reconsulta", async () => {
    const f = await seedClosed("nmpollc");
    await q(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider, external_charge_id, created_at) VALUES ($1::uuid, $2::uuid, 'asaas', $3, now() - interval '50 days')`, f.statementId, f.tenantId, `pay_old_${f.statementId}`);
    assert.equal((await pay(f)).status, 201);
    await dispatch(f.tenantId);
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["pending"]);
    const [ref] = await q(`SELECT created_at FROM billing_statement_refs WHERE statement_id = $1::uuid`, f.statementId);
    assert.ok(Date.now() - new Date(ref.created_at).getTime() > 45 * 24 * HOUR, "o índice continua com 50 dias");
    const result = await H.m.channelJobs.runBillingPollPending(pollDeps([f.tenantId], later()));
    assert.equal(result.invoices, 1, JSON.stringify(result));
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => row.status), ["authorized"]);
  });

  test("NM-X: duas organizações — a leitura da nota de cada uma roda sob a RLS dela: a da B não aparece na da A (controle positivo e negativo, papel NOBYPASSRLS, GUC trocado); o poll reconsulta as duas", async () => {
    const a = await pendingInvoice("nmxa");
    const b = await pendingInvoice("nmxb");
    const repo = new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(H.role.client);
    assert.deepEqual((await repo.listLiveForTenant(a.tenantId, "pending")).map((row: { statementId: string }) => row.statementId), [a.statementId], "a A só vê a sua");
    assert.deepEqual((await repo.listLiveForTenant(b.tenantId, "pending")).map((row: { statementId: string }) => row.statementId), [b.statementId], "a B só vê a sua");
    const { withTenantRls } = await import("../src/database/rls.js");
    const seen = (guc: string, statementId: string) =>
      withTenantRls(H.role.client, guc, async (tx: any) => Number(((await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, statementId)) as any[])[0].n));
    assert.equal(await seen(b.tenantId, b.statementId), 1, "controle positivo: com o GUC da B, a nota da B aparece");
    assert.equal(await seen(a.tenantId, b.statementId), 0, "controle negativo: com o GUC da A, a nota da B NÃO aparece (RLS)");
    const result = await H.m.channelJobs.runBillingPollPending(pollDeps([a.tenantId, b.tenantId], later()));
    assert.equal(result.invoices, 2, JSON.stringify(result));
    assert.deepEqual([...(await invoicesOf(a.statementId)), ...(await invoicesOf(b.statementId))].map((row) => row.status), ["authorized", "authorized"]);
  });
}
