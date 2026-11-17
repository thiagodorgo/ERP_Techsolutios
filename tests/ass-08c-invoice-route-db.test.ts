// B-ASS-08c2 (item 60) · P16 (plano §4.9, §5.4): o operador pede a nota (`POST …/statements/:statementId/invoice`) e lê o backlog
// da nota (`GET …/invoices/backlog?tenantId=`). O pedido trava o demonstrativo PRIMEIRO (o id de outra organização dá 404 pela
// RLS, e nada é gravado) e decide pela MESMA regra da baixa, no modo `operator`: a linha em conferência barra; a época, não. O
// backlog é calculado pelo ESTADO (a regra pura `backlogCategory`), uma categoria por demonstrativo, na ordem de precedência.
//
// Roda no BANCO, numa base própria (template0 + `migrate deploy`), sob papel efêmero NOSUPERUSER NOBYPASSRLS (conferido no
// setup). As rotas são as do app real em 127.0.0.1:0 (plataforma, `super_admin`), com a composição de PRODUÇÃO do serviço
// (`[NOTA-INTENTS]`) sobre o papel; a nota ligada por env e pela configuração do Focus NFe `enabled`. O despacho e o webhook usam
// os repositórios Prisma sobre o papel e os falsos Focus NFe de `tests/helpers/fake-providers/` (o roteiro `authorized` e o
// `rejected`).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
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
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const BASE = "/api/v1/platform/billing";
/** O corte da nota retroativa (`INVOICE_BACKFILL_CUTOFF`); o teste o lê do módulo e confere que é este instante. */
const CUTOFF_ISO = "2026-11-11T09:43:45.000Z";

type Fixture = { readonly tenantId: string; readonly statementId: string };

if (!connectionString) {
  test("B-ASS-08c2 · /invoice e o backlog da nota (-db) exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  const H: { admin: any; db: any; role: EphemeralRole; databaseName: string; server?: Server; baseUrl: string; focus: any; focusRejected: any; env: any; m: Record<string, any> } = {
    admin: undefined,
    db: undefined,
    role: undefined as unknown as EphemeralRole,
    databaseName: "",
    baseUrl: "",
    focus: undefined,
    focusRejected: undefined,
    env: undefined,
    m: {},
  };

  after(async () => {
    if (H.server) await new Promise<void>((resolve) => H.server!.close(() => resolve()));
    await H.focus?.close();
    await H.focusRejected?.close();
    await H.role?.drop();
    await H.db?.$disconnect();
    if (H.admin && H.databaseName) await H.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${H.databaseName}" WITH (FORCE)`);
    await H.admin?.$disconnect();
  });

  const q = (sql: string, ...args: unknown[]) => H.db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Record<string, any> }> {
    const response = await fetch(H.baseUrl + route, { method, headers: { "content-type": "application/json", ...PLATFORM }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  }

  const requestInvoice = (f: Fixture, tenantId: string = f.tenantId) => api("POST", `${BASE}/statements/${f.statementId}/invoice`, { tenantId });
  const backlog = (tenantId: string) => api("GET", `${BASE}/invoices/backlog?tenantId=${tenantId}`);

  async function newTenant(tag: string): Promise<string> {
    const slug = `c2-iv-${tag}-${randomUUID().slice(0, 8)}`;
    return (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
  }

  /** Demonstrativo de R$ 100,00 no período dado: `closed` sem pagamento, ou já `paid` (o pago de antes do 08c2, sem intenção, com
   * o `paid_at` dado). Sem cobrança, sem nota, sem linha na fila e sem índice. */
  async function seedStatement(tenantId: string, period: string, paidAt?: Date): Promise<Fixture> {
    const statementId = (await q(
      `INSERT INTO subscription_statements (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
         storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount, users_extra_amount, storage_extra_amount,
         tracking_amount, adjustments_amount, credits_applied_amount, total_amount, paid_amount, snapshot, due_date, closed_at, paid_at)
       VALUES ($1::uuid,$2,$3,'none','[]'::jsonb,0,0,0,0,0,0,0,31,31,0,0,100,0,0,0,0,0,100,$4,'{"latest":null,"history":[]}'::jsonb,$5::date,now(),$6) RETURNING id`,
      tenantId,
      period,
      paidAt ? "paid" : "closed",
      paidAt ? 100 : 0,
      spDayPlus(20),
      paidAt ?? null,
    ))[0].id as string;
    return { tenantId, statementId };
  }

  const issueLines = (statementId: string) =>
    q(`SELECT status, skip_reason, idempotency_key, last_error FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'invoice_issue' ORDER BY created_at, idempotency_key`, statementId);
  const queueCount = async (statementId: string) => Number((await q(`SELECT count(*)::int AS n FROM billing_outbox WHERE statement_id = $1::uuid`, statementId))[0].n);
  const refsOf = (statementId: string) => q(`SELECT tenant_id, provider FROM billing_statement_refs WHERE statement_id = $1::uuid ORDER BY tenant_id`, statementId);
  const statementRow = async (statementId: string) => (await q(`SELECT status, paid_amount::text AS paid FROM subscription_statements WHERE id = $1::uuid`, statementId))[0];
  const invoicesOf = (statementId: string) => q(`SELECT seq, status FROM subscription_statement_invoices WHERE statement_id = $1::uuid ORDER BY seq`, statementId);
  const postsWithRef = (server: any, ref: string) =>
    server.recorded.filter((r: { method: string; path: string }) => r.method === "POST" && r.path.startsWith("/v2/nfsen") && decodeURIComponent(r.path).includes(`ref=${ref}`)).length;

  function focusPort(server: any) {
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

  /** Uma rodada do despacho real, recortada à organização do caso, com o falso Focus dado como a porta de nota ligada. */
  async function dispatch(tenantId: string, server: any = H.focus) {
    const c = H.role.client;
    return H.m.dispatcher.runDispatchOutbox({
      repo: new H.m.outboxPrisma.PrismaOutboxRepository(c, { tenantIds: [tenantId] }),
      ports: {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_iv" }),
      invoices: new H.m.invoiceDispatch.InvoiceOutboxHandler({ ports: { focusnfe: focusPort(server) }, invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c), statements: new H.m.runtime.PrismaStatementRepository(c), resolveIssueContext: issueContext }),
    });
  }

  async function setInvoiceEnabled(enabled: boolean): Promise<void> {
    await H.db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = $1, enabled_environment = CASE WHEN $1 THEN 'sandbox' ELSE NULL END, updated_at = now() WHERE provider = 'focusnfe'`, enabled);
  }

  /** O webhook da nota (`ref = <id>:<seq>`) pelo reconcile real (a reconsulta no falso dado); devolve a linha do evento. */
  async function invoiceWebhook(statementId: string, seq: number, server: any = H.focus): Promise<{ status: string; error: string | null }> {
    const c = H.role.client;
    const events = new H.m.webhookEvents.PrismaWebhookEventRepository(c);
    const externalEventId = `iv-wh-${randomUUID()}`;
    await events.insertIfAbsent({ provider: "focusnfe", externalEventId, bodyDigest: "0".repeat(64), signatureOk: true, externalResourceId: null, externalReference: `${statementId}:${seq}` }, new Date());
    await H.m.reconcile.reconcileWebhookEvent(
      {
        events,
        refs: new H.m.statementRefs.PrismaStatementRefRepository(c),
        ports: {},
        settlement: new H.m.settlement.StatementSettlementService(new H.m.runtime.PrismaStatementRepository(c), undefined as never),
        invoicePorts: { focusnfe: focusPort(server) },
        invoices: new H.m.invoicesPrisma.PrismaStatementInvoiceRepository(c),
      },
      { provider: "focusnfe", externalEventId },
    );
    const [event] = await q(`SELECT status, error FROM billing_webhook_events WHERE external_event_id = $1`, externalEventId);
    return event;
  }

  /** A baixa manual pela rota (a composição de produção, com a intenção de nota). */
  async function payRoute(f: Fixture, amount: string): Promise<string> {
    const paid = await api("POST", `${BASE}/statements/${f.statementId}/payments`, { tenantId: f.tenantId, amount, method: "pix" });
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    return String(paid.body.data.payment.id);
  }

  /** Pago à mão (R$ 100,00), emitido e REJEITADO pela prefeitura (o webhook reconsulta o falso `rejected`): a nota 1 `rejected`, a
   * linha `invoice_issue:…:1` SENT (nada em voo, nada vivo). */
  async function paidWithRejectedInvoice(f: Fixture): Promise<void> {
    await payRoute(f, "100.00");
    await dispatch(f.tenantId, H.focusRejected);
    assert.equal(postsWithRef(H.focusRejected, `${f.statementId}:1`), 1, "pré-condição: a nota 1 foi ao provedor");
    assert.equal((await invoiceWebhook(f.statementId, 1, H.focusRejected)).status, "processed");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "rejected"]], "pré-condição: nota 1 rejeitada");
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.status), ["SENT"], "pré-condição: a linha da nota 1 SENT");
  }

  /** Pago à mão (R$ 100,00), emitido e AUTORIZADO: a nota 1 viva. */
  async function paidWithAuthorizedInvoice(f: Fixture, amounts: readonly string[] = ["100.00"]): Promise<string[]> {
    const ids: string[] = [];
    for (const amount of amounts) ids.push(await payRoute(f, amount));
    await dispatch(f.tenantId);
    assert.equal((await invoiceWebhook(f.statementId, 1)).status, "processed");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "authorized"]], "pré-condição: nota 1 autorizada");
    return ids;
  }

  /** O que uma resposta pública NÃO pode carregar (§2.8): chave de organização, id da nota no provedor, referência externa, URL,
   * segredo; e nenhum valor de texto com forma de URL. Devolve os caminhos achados (vazio = limpo). */
  function forbiddenPaths(value: unknown, at = ""): string[] {
    const hits: string[] = [];
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value)) hits.push(`${at} (url)`);
      return hits;
    }
    if (!value || typeof value !== "object") return hits;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const here = at ? `${at}.${key}` : key;
      if (/tenant|provider_?invoice|external_?ref|url|token|secret|password|api_?key|payload/i.test(key)) hits.push(here);
      hits.push(...forbiddenPaths(child, here));
    }
    return hits;
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, o app real, a nota ligada, os falsos Focus", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { createPgAdapter } = await import("../src/database/pg-connection.js");
    H.admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    H.databaseName = `${base}_c2_iv_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory, vaultFactory, vaultKeys, dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, reconcile, webhookEvents, statementRefs, settlement, rules] =
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
        import("../src/modules/subscription-billing/webhooks/reconcile.service.js"),
        import("../src/modules/subscription-billing/webhooks/webhook-events.prisma.js"),
        import("../src/modules/subscription-billing/webhooks/statement-refs.prisma.js"),
        import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
        import("../src/modules/subscription-billing/invoices/invoice-intent-rules.js"),
      ]);
    H.m = { statementFactory, dispatcher, outboxPrisma, invoicesPrisma, runtime, http, focusAdapter, invoiceDispatch, reconcile, webhookEvents, statementRefs, settlement, rules };
    assert.equal(rules.INVOICE_BACKFILL_CUTOFF.toISOString(), CUTOFF_ISO, "o corte que o teste usa é o do código");
    H.env = envModule.env;
    H.env.CORE_SAAS_PERSISTENCE = "prisma";
    H.env.BILLING_PROVIDERS_ENABLED = true;
    statementFactory.resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new vaultKeys.EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    // Dois falsos: o `authorized` (a reconsulta diz `autorizado`) e o `rejected` (a prefeitura rejeita a emissão).
    H.focus = await startFocusNfeFake("authorized");
    H.focusRejected = await startFocusNfeFake("rejected");
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    H.server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => H.server!.once("listening", resolve));
    H.baseUrl = `http://127.0.0.1:${(H.server.address() as AddressInfo).port}`;
  });

  test("IN1: pago, nota 1 rejeitada pela prefeitura, a linha SENT → POST …/invoice → 200 { seq 2, providerDisabled false }, invoice_issue :2 PENDING, o índice da organização; despacho → 1 POST com ref=<id>:2", async () => {
    const f = await seedStatement(await newTenant("in1"), "2026-10");
    await paidWithRejectedInvoice(f);
    const response = await requestInvoice(f);
    // O efeito antes do código devolvido: a linha nova e o índice.
    assert.deepEqual(
      (await issueLines(f.statementId)).map((row) => [row.idempotency_key, row.status, row.skip_reason]),
      [[`invoice_issue:${f.statementId}:1`, "SENT", null], [`invoice_issue:${f.statementId}:2`, "PENDING", null]],
      "a reemissão: invoice_issue seq 2 PENDING",
    );
    assert.deepEqual((await refsOf(f.statementId)).map((row) => [row.tenant_id, row.provider]), [[f.tenantId, null]], "o índice da organização da linha travada");
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.data, { statementId: f.statementId, seq: 2, providerDisabled: false });
    await dispatch(f.tenantId);
    assert.equal(postsWithRef(H.focus, `${f.statementId}:2`), 1, "1 POST com ref=<id>:2");
    assert.equal(postsWithRef(H.focus, `${f.statementId}:1`) + postsWithRef(H.focusRejected, `${f.statementId}:1`), 1, "a nota 1 não foi de novo");
    assert.deepEqual((await invoicesOf(f.statementId)).map((row) => [row.seq, row.status]), [[1, "rejected"], [2, "pending"]]);
  });

  test("IN2: não pago (closed) → 422 statement_not_paid, nada gravado (fila e índice)", async () => {
    const f = await seedStatement(await newTenant("in2"), "2026-10");
    const response = await requestInvoice(f);
    assert.equal(await queueCount(f.statementId), 0, "0 linha na fila");
    assert.deepEqual(await refsOf(f.statementId), [], "0 índice");
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "statement_not_paid", JSON.stringify(response.body));
  });

  test("IN3: nota viva (autorizada) → 422 invoice_already_live, nada gravado", async () => {
    const f = await seedStatement(await newTenant("in3"), "2026-10");
    await paidWithAuthorizedInvoice(f);
    const before = await queueCount(f.statementId);
    const response = await requestInvoice(f);
    assert.equal(await queueCount(f.statementId), before, "0 linha nova");
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "invoice_already_live", JSON.stringify(response.body));
  });

  test("IN4: invoice_issue em voo (PENDING, antes do despacho) → 422 invoice_issue_pending; em NEEDS_REVIEW → 422 invoice_issue_pending; resolvida pela rota (/resolve → FAILED) → 200 seq 2", async () => {
    const f = await seedStatement(await newTenant("in4"), "2026-10");
    await payRoute(f, "100.00");
    const inFlight = await requestInvoice(f);
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.status), ["PENDING"], "0 linha nova com a linha em voo");
    assert.equal(inFlight.status, 422, JSON.stringify(inFlight.body));
    assert.equal(inFlight.body.error?.reason, "invoice_issue_pending", JSON.stringify(inFlight.body));

    // A linha em conferência (o desfecho que a revisão humana segura): fixture pelo dono, como o NP1.
    await H.db.$executeRawUnsafe(`UPDATE billing_outbox SET status = 'NEEDS_REVIEW', last_error = 'invoice_issue_error' WHERE statement_id = $1::uuid AND kind = 'invoice_issue'`, f.statementId);
    const inReview = await requestInvoice(f);
    assert.deepEqual((await issueLines(f.statementId)).map((row) => row.status), ["NEEDS_REVIEW"], "0 linha nova com a linha em conferência");
    assert.equal(inReview.status, 422, JSON.stringify(inReview.body));
    assert.equal(inReview.body.error?.reason, "invoice_issue_pending", JSON.stringify(inReview.body));

    const [{ id: lineId }] = await q(`SELECT id FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'invoice_issue'`, f.statementId);
    const resolved = await api("POST", `${BASE}/outbox/${lineId}/resolve`, { tenantId: f.tenantId, reason: "conferido com o contador" });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.data.status, "FAILED");
    const again = await requestInvoice(f);
    assert.deepEqual((await issueLines(f.statementId)).map((row) => [row.idempotency_key, row.status]), [[`invoice_issue:${f.statementId}:1`, "FAILED"], [`invoice_issue:${f.statementId}:2`, "PENDING"]]);
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.data.seq, 2);
  });

  test("IV-X: POST …/statements/<id da B>/invoice com o tenantId da A → 404 statement_not_found e 0 linha nova no índice e na fila (nem da A nem da B)", async () => {
    const a = await newTenant("ivx-a");
    const fb = await seedStatement(await newTenant("ivx-b"), "2026-10", new Date());
    const refsBefore = Number((await q(`SELECT count(*)::int AS n FROM billing_statement_refs`))[0].n);
    const response = await requestInvoice(fb, a);
    assert.deepEqual(await refsOf(fb.statementId), [], "0 índice apontando o demonstrativo da B");
    assert.equal(Number((await q(`SELECT count(*)::int AS n FROM billing_statement_refs`))[0].n), refsBefore, "0 índice novo em lugar nenhum");
    assert.equal(await queueCount(fb.statementId), 0, "0 linha na fila");
    assert.equal(response.status, 404, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "statement_not_found", JSON.stringify(response.body));
    // Controle positivo: com o tenantId CERTO o mesmo demonstrativo (pago desde o corte, sem intenção) ganha a intenção.
    const own = await requestInvoice(fb);
    assert.equal(own.status, 200, JSON.stringify(own.body));
    assert.deepEqual((await refsOf(fb.statementId)).map((row) => row.tenant_id), [fb.tenantId]);
  });

  test("BL1: um demonstrativo de cada categoria (e dois que não aparecem) → o backlog devolve as 5 categorias, uma por linha, na ordem de precedência do §4.9", async () => {
    const t = await newTenant("bl1");
    // no_intent: pago desde o corte, sem intenção da época.
    const noIntent = await seedStatement(t, "2026-01", new Date());
    // before_cutoff: pago 1 dia antes do corte, sem intenção.
    const beforeCutoff = await seedStatement(t, "2026-02", new Date(new Date(CUTOFF_ISO).getTime() - 24 * 60 * 60 * 1000));
    // needs_review: pago à mão, nota 1 rejeitada pela prefeitura (a nota da época).
    const rejected = await seedStatement(t, "2026-03");
    await paidWithRejectedInvoice(rejected);
    // live_on_unpaid: 60 + 40, nota autorizada, o estorno do de 60 deixa a nota viva sobre o não pago.
    const liveOnUnpaid = await seedStatement(t, "2026-04");
    const [p60] = await paidWithAuthorizedInvoice(liveOnUnpaid, ["60.00", "40.00"]);
    const reversed = await api("POST", `${BASE}/statements/${liveOnUnpaid.statementId}/payments/${p60}/reverse`, { tenantId: t, reason: "lançado errado" });
    assert.equal(reversed.status, 200, JSON.stringify(reversed.body));
    assert.equal(reversed.body.data.invoice, "kept_partial_reversal");
    // NÃO aparece: pago com a nota autorizada.
    const authorized = await seedStatement(t, "2026-05");
    await paidWithAuthorizedInvoice(authorized);
    // NÃO aparece: pago com a intenção em voo (PENDING, nota ligada, ainda não despachada).
    const inFlight = await seedStatement(t, "2026-06");
    await payRoute(inFlight, "100.00");
    // awaiting_provider: nota desligada na baixa → a intenção nasce PENDING provider_disabled. Por último (sem despacho depois).
    const awaiting = await seedStatement(t, "2026-07");
    await setInvoiceEnabled(false);
    try {
      await payRoute(awaiting, "100.00");
    } finally {
      await setInvoiceEnabled(true);
    }
    assert.deepEqual((await issueLines(awaiting.statementId)).map((row) => [row.status, row.skip_reason]), [["PENDING", "provider_disabled"]], "pré-condição: provider_disabled");

    const response = await backlog(t);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const rows = response.body.data as Array<Record<string, unknown>>;
    assert.deepEqual(
      rows.map((row) => [row.category, row.statementId]),
      [
        ["live_on_unpaid", liveOnUnpaid.statementId],
        ["before_cutoff", beforeCutoff.statementId],
        ["awaiting_provider", awaiting.statementId],
        ["needs_review", rejected.statementId],
        ["no_intent", noIntent.statementId],
      ],
      "as 5 categorias, uma por linha, na ordem de precedência; a autorizada e a em voo não aparecem",
    );
    const by = new Map(rows.map((row) => [row.statementId, row]));
    assert.deepEqual(by.get(liveOnUnpaid.statementId), { statementId: liveOnUnpaid.statementId, period: "2026-04", status: "closed", category: "live_on_unpaid", invoiceStatus: "authorized", lastLineStatus: "SENT", lastLineError: null, totalAmount: "100.00" });
    assert.deepEqual(by.get(awaiting.statementId), { statementId: awaiting.statementId, period: "2026-07", status: "paid", category: "awaiting_provider", invoiceStatus: "none", lastLineStatus: "PENDING", lastLineError: null, totalAmount: "100.00" });
    assert.deepEqual(by.get(rejected.statementId), { statementId: rejected.statementId, period: "2026-03", status: "paid", category: "needs_review", invoiceStatus: "rejected", lastLineStatus: "SENT", lastLineError: null, totalAmount: "100.00" });
    assert.deepEqual(by.get(noIntent.statementId), { statementId: noIntent.statementId, period: "2026-01", status: "paid", category: "no_intent", invoiceStatus: "none", lastLineStatus: null, lastLineError: null, totalAmount: "100.00" });
    assert.equal((await statementRow(liveOnUnpaid.statementId)).paid, "40.00");
  });

  test("BL-X: o backlog com o tenantId da A não mostra demonstrativo da B (e o da B mostra o dela)", async () => {
    const a = await newTenant("blx-a");
    const fa = await seedStatement(a, "2026-10", new Date());
    const fb = await seedStatement(await newTenant("blx-b"), "2026-10", new Date());
    const ofA = await backlog(a);
    assert.equal(ofA.status, 200, JSON.stringify(ofA.body));
    assert.deepEqual((ofA.body.data as Array<Record<string, unknown>>).map((row) => row.statementId), [fa.statementId], "só o da A");
    const ofB = await backlog(fb.tenantId);
    assert.deepEqual((ofB.body.data as Array<Record<string, unknown>>).map((row) => row.statementId), [fb.statementId], "controle positivo: o da B aparece para a B");
  });

  test("IN-F / BL-F: a forma — deep scan sem organização, id da nota no provedor, referência externa, URL nem segredo; dinheiro só no totalAmount do backlog", async () => {
    const { findMoneyKeys } = await import("../src/modules/subscription-billing/charges/charge-view.js");
    const f = await seedStatement(await newTenant("form"), "2026-10");
    await paidWithRejectedInvoice(f);
    const requested = await requestInvoice(f);
    assert.equal(requested.status, 200, JSON.stringify(requested.body));
    assert.deepEqual(forbiddenPaths(requested.body), [], "IN-F: nada proibido na resposta do /invoice");
    assert.deepEqual(findMoneyKeys(requested.body), [], "IN-F: nenhuma chave de dinheiro");
    assert.deepEqual(Object.keys(requested.body.data).sort(), ["providerDisabled", "seq", "statementId"]);
    // A nota viva com URL de PDF e id no provedor (a autorizada) entra no backlog como live_on_unpaid: o DTO não os carrega.
    const g = await seedStatement(f.tenantId, "2026-09");
    const [p60] = await paidWithAuthorizedInvoice(g, ["60.00", "40.00"]);
    const [{ provider_invoice_id: providerInvoiceId }] = await q(`SELECT provider_invoice_id FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, g.statementId);
    assert.ok(providerInvoiceId, "controle: a nota tem id no provedor");
    const reversed = await api("POST", `${BASE}/statements/${g.statementId}/payments/${p60}/reverse`, { tenantId: f.tenantId, reason: "lançado errado" });
    assert.equal(reversed.status, 200, JSON.stringify(reversed.body));
    const list = await backlog(f.tenantId);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    const rows = list.body.data as Array<Record<string, unknown>>;
    assert.ok(rows.some((row) => row.statementId === g.statementId && row.category === "live_on_unpaid"), JSON.stringify(rows));
    assert.deepEqual(forbiddenPaths(list.body), [], "BL-F: nada proibido na resposta do backlog");
    assert.equal(JSON.stringify(list.body).includes(String(providerInvoiceId)), false, "BL-F: o id da nota no provedor não aparece em lugar nenhum");
    assert.deepEqual(findMoneyKeys(list.body), rows.map((_, index) => `data.${index}.totalAmount`), "BL-F: dinheiro só no totalAmount de cada linha");
    for (const row of rows) assert.deepEqual(Object.keys(row).sort(), ["category", "invoiceStatus", "lastLineError", "lastLineStatus", "period", "statementId", "status", "totalAmount"]);
  });
}
