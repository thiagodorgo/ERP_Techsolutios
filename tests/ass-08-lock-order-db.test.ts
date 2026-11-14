// B-ASS-08 — 2º conserto do #522 (plano `B-ASS-08-conserto-c2.md` §13.3 e §14.4): T-LOCK-2, a ORDEM DE TRAVAS EXECUTADA.
//
// O que prova: toda transação que o módulo de cobrança abre, executada de verdade no Postgres 16 sob papel efêmero
// NOSUPERUSER NOBYPASSRLS, segue a regra do §2.1 — quem trava o demonstrativo trava-o PRIMEIRO; o claim trava o
// demonstrativo e a linha da fila numa instrução só, as duas com SKIP LOCKED; nenhuma transação segura uma linha da fila e
// espera o demonstrativo. Três peças (`tests/helpers/lock-order-recorder.ts`):
//   1. o GRAVADOR: Proxy no `PrismaClient` do papel, que grava o SQL REAL de cada transação e a pilha de quem a abriu;
//   2. o CLASSIFICADOR fail-closed: cada evento vira travas (tabela, forte/fraca, pode esperar); SQL sobre as tabelas do mapa
//      que ele não sabe ler é UNK (vermelho). Regras: ORD-0 (nada de trava fraca no demonstrativo antes da forte que
//      espera — o upgrade KEY SHARE → FOR UPDATE), ORD-1 (nenhuma trava no demonstrativo que espera depois da 1ª linha da
//      fila ou da cobrança, salvo forte já tomada antes), ORD-2 (no claim, toda trava explícita SKIP LOCKED ou NOWAIT);
//   3. o CENSO das aberturas (compilador TypeScript sobre `src/modules/subscription-billing/**`) contra a tabela CONGELADA
//      abaixo: chave nova sem classe, classe sem chave, isenção que viola a própria condição e cenário sem cobertura
//      (nenhuma transação gravada cuja pilha de abertura contenha a linha da chamada) são vermelhos.
// A 08b ESTENDE este arquivo (obrigação 5 da `P-ASS08-OBX5-EAGER-E-CANCEL`): cada abertura nova entra classificada, com
// cenário gravado para o fechamento que enfileira, o refechamento, a marcação eager, o `charge/cancel`, o `/resolve` e a
// rota de `retry`.
// B-ASS-08b (esta extensão): as 13 aberturas novas da 08b entram classificadas — as 10 do repositório da nota
// (`invoices/invoices.prisma.ts`, todas com o DEMONSTRATIVO PRIMEIRO, com cenário gravado abaixo), o espelho do dublê da nota
// (dublê-em-memória) e as 2 do armazém do cliente no provedor (`charges/provider-customer.prisma.ts`, só
// `tenant_billing_profiles`: sem-tabela-do-mapa). O fechamento que enfileira, o refechamento, a marcação eager, o
// `charge/cancel`, o `/resolve` e a rota de `retry` NÃO existem na 08b (passaram ao B-ASS-08c, decisão do orquestrador de
// 10/11): os cenários deles nascem com eles. Mutação literal da 08b: M-08b-LK (a emissão grava a nota ANTES de travar o
// demonstrativo) → ORD-0.
// B-ASS-08c1a (esta extensão): 2 aberturas novas, com cenário gravado — `confirmLease` (a posse antes do POST) e
// `recordChargeOutcome` (o registro transacional: demonstrativo PRIMEIRO, depois a linha da fila, a cobrança e o ref); e o
// cenário do `#mutate` passa a apresentar a posse. Mutações: M-REGa (o registro trava a linha da fila antes do
// demonstrativo) → ORD-1; M14 (apagar o cenário do registro) → cobertura.
// Mutações literais: M7a (retry com o UPDATE da fila antes da trava do demonstrativo) → ORD-1; M7b (≡ M5g: claim sem
// SKIP LOCKED no demonstrativo) → ORD-2; M7c (abertura nova em charges.prisma.ts) → censo; M7d (cenário do retry apagado)
// → cobertura; M7e (`WITH x AS (UPDATE …)`) → UNK.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  effectsOf,
  lockOrderViolations,
  modelTablesFromSchema,
  recordingClient,
  stackFrames,
  transactionOpenings,
  type ClassifierContext,
  type RecordedTransaction,
  type Recording,
} from "./helpers/lock-order-recorder.js";
import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { requestChargeCancel } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { requestUnknownChargeCancel } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { PrismaChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.prisma.js";
import { PrismaStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.prisma.js";
import { chargeCreateClaimVerdict } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { PrismaStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.prisma.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "src/modules/subscription-billing/";

/** A tabela CONGELADA: toda abertura de transação do módulo, numa classe. `cenario:<nome>` exige uma transação gravada com
 * a linha da chamada na pilha de abertura; `sem-tabela-do-mapa` vale só se o ARQUIVO não cita as tabelas do mapa, os
 * delegates, `StatementTx` nem `.transaction(`; `dublê-em-memória` só dentro de classe `InMemory*`. */
const FROZEN: Readonly<Record<string, string>> = {
  "src/modules/subscription-billing/charges/charge-intent.prisma.ts#PrismaChargeIntentRepository.transaction#withTenantRlsBudget": "cenario:charge-intent.prisma.transaction",
  "src/modules/subscription-billing/charges/charge-intent.repository.ts#InMemoryChargeIntentRepository.transaction#.transaction": "dublê-em-memória",
  "src/modules/subscription-billing/charges/charge-request.service.ts#requestChargeCreate#.transaction": "cenario:charge-request.service.requestChargeCreate",
  "src/modules/subscription-billing/charges/charge-request.service.ts#requestChargeCancel#.transaction": "cenario:chargeIntent.cancel",
  "src/modules/subscription-billing/charges/charge-request.service.ts#requestUnknownChargeCancel#.transaction": "cenario:chargeIntent.cancelUnknown",
  "src/modules/subscription-billing/charges/charges.prisma.ts#PrismaStatementChargeRepository.cancel#withTenantRls": "cenario:charges.cancel",
  "src/modules/subscription-billing/charges/charges.prisma.ts#PrismaStatementChargeRepository.findLive#withTenantRls": "cenario:charges.findLive",
  "src/modules/subscription-billing/charges/charges.prisma.ts#PrismaStatementChargeRepository.insert#withTenantRls": "cenario:charges.insert",
  "src/modules/subscription-billing/charges/charges.prisma.ts#PrismaStatementChargeRepository.listByStatement#withTenantRls": "cenario:charges.listByStatement",
  "src/modules/subscription-billing/charges/charges.prisma.ts#PrismaStatementChargeRepository.setStatus#withTenantRls": "cenario:charges.setStatus",
  "src/modules/subscription-billing/charges/provider-customer.prisma.ts#PrismaProviderCustomerStore.get#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/charges/provider-customer.prisma.ts#PrismaProviderCustomerStore.set#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/invoice-sequence.service.ts#nextDpsNumber#.$transaction": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.beginIssue#withTenantRls": "cenario:invoices.beginIssue",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.findByRef#withTenantRls": "cenario:invoices.findByRef",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.findLive#withTenantRls": "cenario:invoices.findLive",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.listByStatement#withTenantRls": "cenario:invoices.listByStatement",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markAuthorized#withTenantRls": "cenario:invoices.markAuthorized",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markCancelFailed#withTenantRls": "cenario:invoices.markCancelFailed",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markCancelPending#withTenantRls": "cenario:invoices.markCancelPending",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markCancelled#withTenantRls": "cenario:invoices.markCancelled",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markIssued#withTenantRls": "cenario:invoices.markIssued",
  "src/modules/subscription-billing/invoices/invoices.prisma.ts#PrismaStatementInvoiceRepository.markRejected#withTenantRls": "cenario:invoices.markRejected",
  "src/modules/subscription-billing/invoices/invoices.repository.ts#InMemoryStatementInvoiceRepository.#mirror#.transaction": "dublê-em-memória",
  "src/modules/subscription-billing/metering/usage-query-prisma.repository.ts#PrismaTenantUsageDailyQuery.list#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.#mutate#withTenantRlsBudget": "cenario:outbox.#mutate",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.adoptionFacts#withTenantRls": "cenario:outbox.adoptionFacts",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.claimNext#withTenantRlsBudget": "cenario:outbox.claimNext",
  // B-ASS-08c1a: a confirmação da posse antes do POST ([LEASE-02]) e o registro transacional ([REG-TX]).
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.confirmLease#withTenantRlsBudget": "cenario:outbox.confirmLease",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.enqueue#withTenantRls": "cenario:outbox.enqueue",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.findById#withTenantRls": "cenario:outbox.findById",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.listByStatement#withTenantRls": "cenario:outbox.listByStatement",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.listByStatus#forEachTenantRls": "cenario:outbox.listByStatus",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.markDisabledProvidersVisible#forEachTenantRls": "cenario:outbox.markDisabledProvidersVisible",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.recordChargeOutcome#withTenantRlsBudget": "cenario:outbox.recordChargeOutcome",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.retry#withTenantRlsBudget": "cenario:outbox.retry",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.listForTenant#withTenantRls": "cenario:outbox.listForTenant",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.resolve#withTenantRlsBudget": "cenario:outbox.resolve",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.retryByOperator#withTenantRlsBudget": "cenario:outbox.retryByOperator",
  "src/modules/subscription-billing/outbox/outbox.prisma.ts#PrismaOutboxRepository.recordChargeCancelOutcome#withTenantRlsBudget": "cenario:outbox.recordChargeCancelOutcome",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.closeAddon#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.closeSubscription#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.createAddon#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.createSubscription#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.getActiveSubscription#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.listActiveAddons#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.listActiveSubscriptions#forEachTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.listAddons#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/plans/subscriptions-prisma.repository.ts#PrismaSubscriptionsRepository.listSubscriptions#withTenantRls": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/statements/statement-settlement.service.ts#StatementSettlementService.applyReversal#.transaction": "cenario:settlement.applyReversal",
  "src/modules/subscription-billing/statements/statement-settlement.service.ts#StatementSettlementService.markChargebackDisputed#.transaction": "cenario:settlement.markChargebackDisputed",
  "src/modules/subscription-billing/statements/statement-settlement.service.ts#StatementSettlementService.resolveChargeback#.transaction": "cenario:settlement.resolveChargeback",
  "src/modules/subscription-billing/statements/statement-settlement.service.ts#StatementSettlementService.settle#.transaction": "cenario:settlement.settle",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaBillingProfileRepository.find#withTenantRls": "cenario:runtime.billingprofile.find",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaBillingProfileRepository.upsert#withTenantRls": "cenario:runtime.billingprofile.upsert",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaBindingsSource.listVehicleBindings#withTenantRls": "cenario:runtime.bindings.listVehicleBindings",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementAuditSink.record#withTenantRls": "cenario:runtime.statementaudit.record",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementRepository.findStatement#withTenantRls": "cenario:runtime.findStatement",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementRepository.listCredits#withTenantRls": "cenario:runtime.listCredits",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementRepository.listPayments#withTenantRls": "cenario:runtime.listPayments",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementRepository.listStatements#withTenantRls": "cenario:runtime.listStatements",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaStatementRepository.transaction#withTenantRls": "cenario:runtime.transaction",
  "src/modules/subscription-billing/statements/statement.prisma-runtime.ts#PrismaUsageSource.listUsageDays#withTenantRls": "cenario:runtime.usage.listUsageDays",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.adjust#.transaction": "cenario:service.adjust",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.applyCredit#.transaction": "cenario:service.applyCredit",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.cancel#.transaction": "cenario:service.cancel",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.close#.transaction": "cenario:service.close",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.recordManualPayment#.transaction": "cenario:service.recordManualPayment",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.recordProviderPayment#.transaction": "cenario:service.recordProviderPayment",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.reopen#.transaction": "cenario:service.reopen",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.reverseManualPayment#.transaction": "cenario:service.reverseManualPayment",
  "src/modules/subscription-billing/statements/statement.service.ts#StatementService.writeOffCredit#.transaction": "cenario:service.writeOffCredit",
  "src/modules/subscription-billing/subscription-billing.jobs.ts#runSubscriptionMeasureDaily#withTenantRlsBudget": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/vault/vault.prisma-runtime.ts#PrismaCredentialRepository.replaceActive#.$transaction": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/vault/vault.prisma-runtime.ts#PrismaCredentialRepository.revokeActive#.$transaction": "sem-tabela-do-mapa",
  "src/modules/subscription-billing/vault/vault.prisma-runtime.ts#PrismaCredentialRepository.rotateRow#.$transaction": "sem-tabela-do-mapa",
};

/** O que tira um arquivo da isenção `sem-tabela-do-mapa` (checado por texto). */
const MAP_MENTION = /\b(billing_outbox|subscription_statements|subscription_statement_charges|billingOutbox|subscriptionStatement|subscriptionStatementCharge|StatementTx)\b|\.transaction\(/;

if (!connectionString) {
  test("B-ASS-08 · T-LOCK-2 exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão na BASE: CREATE/DROP DATABASE
  let db: any; // conexão no banco ALVO: semeadura (administrador do cluster descartável)
  let databaseName: string;
  let targetUrl: string;
  let role: EphemeralRole;
  let recording: Recording<any>;
  let context: ClassifierContext;

  type ScenarioRun = { readonly name: string; readonly transactions: RecordedTransaction[]; readonly error: string | null };
  const runs: ScenarioRun[] = [];

  after(async () => {
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("setup: base própria + migrate deploy + papel efêmero gravado + contexto do classificador (schema e catálogo)", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08_lk2_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const attrs = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(attrs[0], { rolsuper: false, rolbypassrls: false }, "o código roda em papel sem superusuário e sem bypass de RLS");
    recording = recordingClient(role.client);
    // as filhas de subscription_statements vêm do CATÁLOGO (pg_constraint), não de literal
    const children = (await db.$queryRawUnsafe(
      `SELECT DISTINCT conrelid::regclass::text AS child FROM pg_constraint WHERE contype = 'f' AND confrelid = 'subscription_statements'::regclass`,
    )) as Array<{ child: string }>;
    context = {
      modelTable: modelTablesFromSchema(readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8")),
      statementChildren: new Set(children.map((row) => row.child.replace(/"/g, ""))),
    };
    assert.ok(context.statementChildren.has("billing_outbox") && context.statementChildren.has("subscription_statement_charges"), "o catálogo devolve as filhas do demonstrativo");
    assert.equal(context.modelTable.get("billingOutbox"), "billing_outbox");
  });

  async function seedStatement(tag: string, options: { readonly refs?: boolean } = {}): Promise<{ tenantId: string; statementId: string }> {
    const slug = `lk2-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', now(), '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>)[0]!.id;
    if (options.refs !== false) {
      await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    }
    return { tenantId, statementId };
  }

  async function seedRow(tenantId: string, statementId: string, provider: string, status = "PENDING", extra: { readonly attempts?: number; readonly lastError?: string } = {}): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error, attempt_started_at)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $3, $4, gen_random_uuid(), '{"amountCents":10000}'::jsonb, now(), $5, $6, $7, CASE WHEN $5 = 'PROCESSING' THEN now() ELSE NULL END) RETURNING id`,
      tenantId,
      statementId,
      provider,
      `charge_create:${statementId}:1`,
      status,
      extra.attempts ?? 0,
      extra.lastError ?? null,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  /** A posse de uma linha semeada em PROCESSING, gravada com o `now` do JS (milissegundo, como o claim — R2-13). */
  async function seedLease(outboxId: string, at: Date): Promise<{ readonly claimedBy: string; readonly attemptStartedAt: Date }> {
    const lease = { claimedBy: `dispatch-outbox:lk2-${randomUUID().slice(0, 8)}`, attemptStartedAt: at };
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET claimed_by = $2, attempt_started_at = $3 WHERE id = $1::uuid`, outboxId, lease.claimedBy, lease.attemptStartedAt);
    return lease;
  }

  async function openHolder() {
    const { Client } = (await import("pg")) as any;
    const client = new Client({ connectionString: targetUrl });
    await client.connect();
    await client.query("BEGIN");
    return { query: (sql: string, params?: unknown[]) => client.query(sql, params), rollback: async () => { await client.query("ROLLBACK"); await client.end(); } };
  }

  /** Roda `fn` sobre o cliente gravado e guarda as transações abertas durante ele. O erro é registrado (a ordem das travas
   * do que rodou é o que se julga); os cenários desta suíte são caminhos de sucesso e o teste do fim confere isso. */
  async function scenario(name: string, fn: () => Promise<unknown>): Promise<void> {
    const before = recording.transactions.length;
    let error: string | null = null;
    try {
      await fn();
    } catch (caught) {
      error = caught instanceof Error ? caught.message.slice(0, 160) : String(caught);
    }
    runs.push({ name, transactions: recording.transactions.slice(before), error });
  }

  test("T-LOCK-2 (F6b): outbox/, charges/ e o pedido executados sobre o cliente gravado", async () => {
    const now = new Date();
    const outbox = new PrismaOutboxRepository(recording.client);
    const charges = new PrismaStatementChargeRepository(recording.client);
    const provider = `asaas-lk2-${randomUUID().slice(0, 8)}`;
    const params = { enabledProviders: [provider], now, claimedBy: "lk2", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict } as const;

    const a = await seedStatement("a");
    await scenario("outbox.enqueue", () => outbox.enqueue({ tenantId: a.tenantId, statementId: a.statementId, kind: "invoice_issue", provider, seq: 1, payload: {} }, now));
    const b = await seedStatement("b");
    await seedRow(b.tenantId, b.statementId, provider);
    await scenario("outbox.claimNext (demonstrativo livre)", () => outbox.claimNext(params));
    const c = await seedStatement("c");
    await seedRow(c.tenantId, c.statementId, provider);
    const holder = await openHolder();
    await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [c.statementId]);
    await scenario("outbox.claimNext (demonstrativo travado: pula sem esperar)", () => outbox.claimNext(params));
    await holder.rollback();
    const d = await seedStatement("d");
    const processing = await seedRow(d.tenantId, d.statementId, provider, "PROCESSING");
    // B-ASS-08c1a: toda escrita do despacho apresenta a posse ([LEASE-01]); a semeadura grava uma posse em milissegundo.
    const leaseD = await seedLease(processing, now);
    await scenario("outbox.#mutate (markSent)", () => outbox.markSent(d.tenantId, processing, "pay_lk2", now, leaseD));
    const h = await seedStatement("h");
    const leasedH = await seedRow(h.tenantId, h.statementId, provider, "PROCESSING");
    const leaseH = await seedLease(leasedH, now);
    await scenario("outbox.confirmLease", () => outbox.confirmLease(h.tenantId, leasedH, leaseH));
    const rowH = (await outbox.findById(h.tenantId, leasedH))!;
    await scenario("outbox.recordChargeOutcome", () =>
      outbox.recordChargeOutcome(h.tenantId, rowH, leaseH, { kind: "created", result: { chargeId: `pay_lk2_reg_${randomUUID().slice(0, 8)}`, status: "pending" } }, now),
    );
    await scenario("outbox.markDisabledProvidersVisible", () => outbox.markDisabledProvidersVisible([provider], now));
    const e = await seedStatement("e");
    const failed = await seedRow(e.tenantId, e.statementId, provider, "FAILED", { attempts: 8, lastError: "provider_timeout" });
    await scenario("outbox.retry", () => outbox.retry(e.tenantId, failed, now));
    await scenario("outbox.findById", () => outbox.findById(e.tenantId, failed));
    await scenario("outbox.listByStatus", () => outbox.listByStatus("PENDING", provider));
    await scenario("outbox.listByStatement", () => outbox.listByStatement(e.tenantId, e.statementId));
    await scenario("outbox.adoptionFacts", () => outbox.adoptionFacts(e.tenantId, e.statementId, failed));
    // B-ASS-08c1b (F5): a revisão da fila — a listagem da organização (só leitura), o `/resolve` (o demonstrativo PRIMEIRO,
    // [RESOLVE-LOCK]) e o `retryByOperator` (o mesmo núcleo do `retry`, o demonstrativo primeiro).
    await scenario("outbox.listForTenant", () => outbox.listForTenant(e.tenantId, { status: "PENDING" }));
    const n = await seedStatement("n");
    const review = await seedRow(n.tenantId, n.statementId, provider, "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    await scenario("outbox.resolve", () => outbox.resolve(n.tenantId, review, { reason: "cenário lk2 do resolve", actorId: null, now }));
    // A semeadura não tem `dueDate` no payload (vencimento "passado"): o operador informa a data nova, que é regravada no MESMO UPDATE.
    const newDue = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000));
    await scenario("outbox.retryByOperator", () => outbox.retryByOperator(n.tenantId, review, now, { dueDate: newDue }));
    // B-ASS-08c1b (F6): o registro do cancelamento — o demonstrativo PRIMEIRO, depois a linha `charge_cancel` (com a posse), a
    // cobrança da tabela e a `charge_create` alvo.
    const q = await seedStatement("q");
    const createQ = await seedRow(q.tenantId, q.statementId, provider, "SENT");
    const chargeQ = `pay_lk2_rc_${randomUUID().slice(0, 8)}`;
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET external_id = $2 WHERE id = $1::uuid`, createQ, chargeQ);
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, due_date, created_at) VALUES ($1::uuid, $2::uuid, $3, $4, 'pending', '2026-11-20', now())`,
      q.tenantId,
      q.statementId,
      provider,
      chargeQ,
    );
    const cancelQ = ((await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, attempt_started_at)
       VALUES ($1::uuid, $2::uuid, 'charge_cancel', $3, $4, gen_random_uuid(), $5::jsonb, now(), 'PROCESSING', 1, now()) RETURNING id`,
      q.tenantId,
      q.statementId,
      provider,
      `charge_cancel:${q.statementId}:1`,
      JSON.stringify({ chargeId: chargeQ, chargeCreateId: createQ }),
    )) as Array<{ id: string }>)[0]!.id;
    const leaseQ = await seedLease(cancelQ, now);
    const rowQ = (await outbox.findById(q.tenantId, cancelQ))!;
    await scenario("outbox.recordChargeCancelOutcome", () => outbox.recordChargeCancelOutcome(q.tenantId, rowQ, leaseQ, chargeQ, now));

    const f = await seedStatement("f");
    await scenario("charges.insert", () => charges.insert({ tenantId: f.tenantId, statementId: f.statementId, provider, externalChargeId: `pay_lk2_${randomUUID().slice(0, 8)}`, status: "pending", payUrl: null, dueDate: "2026-11-20" }, now));
    await scenario("charges.listByStatement", () => charges.listByStatement(f.tenantId, f.statementId));
    let liveId = "";
    await scenario("charges.findLive", async () => {
      liveId = (await charges.findLive(f.tenantId, f.statementId))!.id;
    });
    await scenario("charges.setStatus", () => charges.setStatus(f.tenantId, liveId, "confirmed", now));
    await scenario("charges.cancel", () => charges.cancel(f.tenantId, liveId, now));

    const g = await seedStatement("g", { refs: false });
    await scenario("pedido (requestChargeCreate + PrismaChargeIntentRepository.transaction)", () =>
      requestChargeCreate({ intents: new PrismaChargeIntentRepository(recording.client) }, { tenantId: g.tenantId, statementId: g.statementId, provider, payload: { amountCents: 10000 }, now }),
    );

    // B-ASS-08c1b (F3): o `charge/cancel` do operador — o demonstrativo PRIMEIRO ([CANCEL-LOCK]), depois as linhas da fila, as
    // cobranças e a escrita. Regra 4 (SENT com cobrança `pending` na tabela → enfileira `charge_cancel`) e regra 3 (PENDING →
    // SKIPPED, o UPDATE da linha depois da trava).
    const k = await seedStatement("k");
    const sentK = await seedRow(k.tenantId, k.statementId, provider, "SENT");
    const chargeK = `pay_lk2_cc_${randomUUID().slice(0, 8)}`;
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET external_id = $2 WHERE id = $1::uuid`, sentK, chargeK);
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, due_date, created_at) VALUES ($1::uuid, $2::uuid, $3, $4, 'pending', '2026-11-20', now())`,
      k.tenantId,
      k.statementId,
      provider,
      chargeK,
    );
    await scenario("chargeIntent.cancel (SENT → charge_cancel)", () =>
      requestChargeCancel({ intents: new PrismaChargeIntentRepository(recording.client) }, { tenantId: k.tenantId, statementId: k.statementId, reason: "cancelamento do cenário lk2", actorId: null, now }),
    );
    const m = await seedStatement("m");
    await seedRow(m.tenantId, m.statementId, provider, "PENDING");
    await scenario("chargeIntent.cancel (PENDING → SKIPPED)", () =>
      requestChargeCancel({ intents: new PrismaChargeIntentRepository(recording.client) }, { tenantId: m.tenantId, statementId: m.statementId, reason: "cancelamento do cenário lk2", actorId: null, now }),
    );
    // B-ASS-08c1b (F7): o `cancel-unknown` — o demonstrativo PRIMEIRO, depois as linhas, as cobranças e o INSERT do `charge_cancel`.
    const u = await seedStatement("u");
    await seedRow(u.tenantId, u.statementId, provider, "SENT");
    await scenario("chargeIntent.cancelUnknown (desconhecida → charge_cancel)", () =>
      requestUnknownChargeCancel(
        { intents: new PrismaChargeIntentRepository(recording.client) },
        { tenantId: u.tenantId, statementId: u.statementId, chargeId: `pay_lk2_uc_${randomUUID().slice(0, 8)}`, reason: "cancelamento do cenário lk2", actorId: null, now },
      ),
    );
  });
  // ------------------------------------------------------------------ F6c: cenários de statements/ (código REAL)
  const NOW = new Date("2026-11-02T12:00:00-03:00");
  const PERIOD = "2026-10";
  const OCT_1 = new Date("2026-10-01T00:00:00-03:00");
  const ACTOR = "lk2-operador"; // ator sem UUID: as colunas de autoria ficam null (como no ass-04)

  /** A organização com plano e assinatura (o `close` resolve as entradas pela assinatura real), como o seedTenant do ass-04. */
  async function seedSubscribedTenant(tag: string): Promise<string> {
    const slug = `lk2-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const code = `lk2_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const planId = ((await db.$queryRawUnsafe(`INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`, code)) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
      planId,
      OCT_1,
    );
    await db.$executeRawUnsafe(`INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`, tenantId, planId, OCT_1);
    return tenantId;
  }

  async function statementRuntime(client: any) {
    const [runtime, plansRepo, subsRepo, lookup, inputsModule, serviceModule, settlementModule] = await Promise.all([
      import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/tenant-lookup.prisma.js"),
      import("../src/modules/subscription-billing/statements/statement.inputs-provider.js"),
      import("../src/modules/subscription-billing/statements/statement.service.js"),
      import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
    ]);
    const repository = new runtime.PrismaStatementRepository(client);
    const usage = new runtime.PrismaUsageSource(client);
    const bindings = new runtime.PrismaBindingsSource(client);
    const inputs = new inputsModule.RepositoryStatementInputsProvider(
      new subsRepo.PrismaSubscriptionsRepository(client),
      new plansRepo.PrismaPlansRepository(client),
      new lookup.PrismaTenantLookup(client),
      usage,
      bindings,
    );
    const audit = new runtime.PrismaStatementAuditSink(client);
    const service = new serviceModule.StatementService(repository, inputs, audit);
    const settlement = new settlementModule.StatementSettlementService(repository, service);
    // Conserto da J-530 (plano v2 §3.5(a)): a mesma baixa COM a intenção de nota, para os cenários que EXECUTAM o INSERT dela.
    const settlementWithIntents = new (settlementModule.StatementSettlementService as unknown as new (...args: unknown[]) => InstanceType<typeof settlementModule.StatementSettlementService>)(
      repository,
      service,
      { issueTarget: { provider: "focusnfe", enabled: true }, enabledInvoiceProviders: ["focusnfe"] },
    );
    return { repository, audit, service, settlement, settlementWithIntents, profiles: new runtime.PrismaBillingProfileRepository(client) };
  }

  async function openCredit(tenantId: string, statementId: string, cents: number): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_credits (tenant_id, origin_statement_id, amount, reason) VALUES ($1::uuid, $2::uuid, $3, 'overpayment') RETURNING id`,
      tenantId,
      statementId,
      (cents / 100).toFixed(2),
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  test("T-LOCK-2 (F6c): statements/ — o serviço (9), a baixa (4) e o runtime (10), executados de verdade", async () => {
    const rt = await statementRuntime(recording.client);
    // T1: fechar → baixa manual → estorno → baixa do provedor com excedente → 2ª baixa maior (o ramo de transação do settle)
    //     → disputa → resolução `won` → estorno parcial do provedor
    const t1 = await seedSubscribedTenant("t1");
    let s1 = "";
    await scenario("service.close", async () => {
      const closed = await rt.service.close({ tenantId: t1, period: PERIOD, now: NOW, actorId: null, source: "job" });
      s1 = (closed as { statement: { id: string } }).statement.id;
    });
    let p1 = "";
    await scenario("service.recordManualPayment", async () => {
      const { payment } = await rt.service.recordManualPayment({ tenantId: t1, statementId: s1, amountCents: 1_000, method: "pix", note: null, actorId: ACTOR, now: NOW });
      p1 = payment.id;
    });
    await scenario("service.reverseManualPayment", () => rt.service.reverseManualPayment({ tenantId: t1, paymentId: p1, reason: "lançado errado", actorId: ACTOR, now: NOW }));
    await scenario("service.recordProviderPayment", () => rt.service.recordProviderPayment({ tenantId: t1, statementId: s1, source: "asaas", externalChargeId: "pay_lk2_1", amountCents: 12_000, method: "pix", now: NOW }));
    await scenario("settlement.settle", () => rt.settlement.settle({ tenantId: t1, statementId: s1, source: "asaas", externalChargeId: "pay_lk2_1", paidCents: 13_000, method: "pix", now: NOW }));
    await scenario("settlement.markChargebackDisputed", () => rt.settlement.markChargebackDisputed({ tenantId: t1, statementId: s1, now: NOW }));
    await scenario("settlement.resolveChargeback", () => rt.settlement.resolveChargeback({ tenantId: t1, statementId: s1, externalChargeId: "pay_lk2_1", outcome: "won", now: NOW }));
    await scenario("settlement.applyReversal", () => rt.settlement.applyReversal({ tenantId: t1, statementId: s1, externalChargeId: "pay_lk2_1", reversedCents: 500, kind: "refund", now: NOW }));
    // T2: fechar → cancelar
    const t2 = await seedSubscribedTenant("t2");
    const s2 = ((await rt.service.close({ tenantId: t2, period: PERIOD, now: NOW, actorId: null, source: "job" })) as { statement: { id: string } }).statement.id;
    await scenario("service.cancel", () => rt.service.cancel({ tenantId: t2, statementId: s2, reason: "cliente encerrou", actorId: ACTOR, now: NOW }));
    // T3: fechar → reabrir → ajustar → aplicar crédito → baixar outro crédito
    const t3 = await seedSubscribedTenant("t3");
    const s3 = ((await rt.service.close({ tenantId: t3, period: PERIOD, now: NOW, actorId: null, source: "job" })) as { statement: { id: string } }).statement.id;
    await scenario("service.reopen", () => rt.service.reopen({ tenantId: t3, statementId: s3, reason: "medição corrigida", actorId: ACTOR, now: NOW }));
    await scenario("service.adjust", () => rt.service.adjust({ tenantId: t3, statementId: s3, deltaCents: 100, note: "ajuste de teste", actorId: ACTOR, now: NOW }));
    const c1 = await openCredit(t3, s3, 300);
    const c2 = await openCredit(t3, s3, 200);
    await scenario("service.applyCredit", () => rt.service.applyCredit({ tenantId: t3, creditId: c1, statementId: s3, actorId: ACTOR, now: NOW }));
    await scenario("service.writeOffCredit", () => rt.service.writeOffCredit({ tenantId: t3, creditId: c2, note: "perda", actorId: ACTOR }));
    // T4 (conserto da J-530, plano v2 §3.5(a)): os 3 cenários que EXECUTAM o INSERT da intenção de nota dentro da transação
    //     do demonstrativo — o 1º pagamento que quita, o monotônico que quita e o estorno total com nota viva.
    const t4a = await seedSubscribedTenant("t4a");
    const s4a = ((await rt.service.close({ tenantId: t4a, period: PERIOD, now: NOW, actorId: null, source: "job" })) as { statement: { id: string } }).statement.id;
    await scenario("settlementWithIntents.settle-first-paid", () => rt.settlementWithIntents.settle({ tenantId: t4a, statementId: s4a, source: "asaas", externalChargeId: "pay_lk2_4a", paidCents: 1_000_000, method: "pix", now: NOW }));
    const t4b = await seedSubscribedTenant("t4b");
    const s4b = ((await rt.service.close({ tenantId: t4b, period: PERIOD, now: NOW, actorId: null, source: "job" })) as { statement: { id: string } }).statement.id;
    await rt.settlementWithIntents.settle({ tenantId: t4b, statementId: s4b, source: "asaas", externalChargeId: "pay_lk2_4b", paidCents: 100, method: "pix", now: NOW });
    await scenario("settlementWithIntents.settle-monotonic-paid", () => rt.settlementWithIntents.settle({ tenantId: t4b, statementId: s4b, source: "asaas", externalChargeId: "pay_lk2_4b", paidCents: 1_000_000, method: "pix", now: NOW }));
    const t4c = await seedSubscribedTenant("t4c");
    const s4c = ((await rt.service.close({ tenantId: t4c, period: PERIOD, now: NOW, actorId: null, source: "job" })) as { statement: { id: string } }).statement.id;
    await rt.settlementWithIntents.settle({ tenantId: t4c, statementId: s4c, source: "asaas", externalChargeId: "pay_lk2_4c", paidCents: 1_000_000, method: "pix", now: NOW });
    // a nota VIVA gravada por SQL de semente, fora do gravador
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_invoices (tenant_id, statement_id, seq, provider, external_ref, serie_dps, numero_dps, status, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, 1, 'focusnfe', $4, $3, 1, 'authorized', now(), now())`,
      t4c,
      s4c,
      1 + Math.floor(Math.random() * 100000),
      `${s4c}:1`,
    );
    await scenario("settlementWithIntents.applyReversal-live-invoice", () => rt.settlementWithIntents.applyReversal({ tenantId: t4c, statementId: s4c, externalChargeId: "pay_lk2_4c", reversedCents: 1_000_000, kind: "refund", now: NOW }));
    const intents = (await db.$queryRawUnsafe(
      `SELECT kind, count(*)::int AS n FROM billing_outbox WHERE statement_id = ANY($1::uuid[]) AND kind IN ('invoice_issue', 'invoice_cancel') GROUP BY kind ORDER BY kind`,
      [s4a, s4b, s4c],
    )) as Array<{ kind: string; n: number }>;
    assert.deepEqual(intents, [{ kind: "invoice_cancel", n: 1 }, { kind: "invoice_issue", n: 3 }], "os 3 cenários gravaram as intenções DENTRO das transações gravadas");
    // o runtime: leituras, perfil e a trilha direta
    await scenario("runtime.listStatements", () => rt.repository.listStatements(t1));
    await scenario("runtime.findStatement", () => rt.repository.findStatement(t1, s1));
    await scenario("runtime.listPayments", () => rt.repository.listPayments(t1, s1));
    await scenario("runtime.listCredits", () => rt.repository.listCredits(t1));
    await scenario("runtime.profile.upsert", () => rt.profiles.upsert(t1, { legalName: "Org LK2", document: "11222333000181", email: "f@x.com", address: { postalCode: "01001000", street: "R", number: "1", district: "C", city: "SP", cityIbge: "3550308", state: "SP" }, paymentMethod: "pix" }));
    await scenario("runtime.profile.find", () => rt.profiles.find(t1));
    await scenario("runtime.audit.record", () => rt.audit.record({ tenantId: t1, actorId: null, action: "subscription_statement.closed", entityId: s1, metadata: { period: PERIOD } }));
    // os desfechos esperados dos cenários (um erro de cenário NÃO é aceito aqui: todos são caminhos de sucesso)
    const failed = runs.filter((run) => run.error !== null).map((run) => `${run.name}: ${run.error}`);
    assert.deepEqual(failed, [], "os cenários de statements/ rodam os caminhos de sucesso");
  });

  test("T-LOCK-2 (08b): invoices/ — as 10 transações da nota, executadas, com o demonstrativo primeiro", async () => {
    const now = new Date();
    const invoices = new PrismaStatementInvoiceRepository(recording.client);
    const provider = "focusnfe";
    const serie = 1 + Math.floor(Math.random() * 100000);
    // A: emite → consulta → emitida → autorizada → pede o cancelamento → o provedor recusa → pede de novo → cancelada
    const a = await seedStatement("nota-a");
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, a.statementId);
    let invoiceA = "";
    let refA = "";
    await scenario("invoices.beginIssue", async () => {
      const { invoice } = await invoices.beginIssue({ tenantId: a.tenantId, statementId: a.statementId, seq: 1, provider, environment: "sandbox", serie }, now);
      invoiceA = invoice.id;
      refA = invoice.externalRef;
    });
    await scenario("invoices.findByRef", () => invoices.findByRef(a.tenantId, provider, refA));
    await scenario("invoices.findLive", () => invoices.findLive(a.tenantId, a.statementId));
    await scenario("invoices.listByStatement", () => invoices.listByStatement(a.tenantId, a.statementId));
    await scenario("invoices.markIssued", () => invoices.markIssued(a.tenantId, invoiceA, "nfse_lk2_1", now));
    await scenario("invoices.markAuthorized", () => invoices.markAuthorized(a.tenantId, invoiceA, { number: "NFSE-LK2", verificationCode: "V", pdfUrl: "https://documentos.invalid/lk2.pdf", pdfSource: "public_url" }, now));
    await scenario("invoices.markCancelPending", () => invoices.markCancelPending(a.tenantId, invoiceA, { reason: "Pagamento estornado", code: "9" }, now));
    await scenario("invoices.markCancelFailed", () => invoices.markCancelFailed(a.tenantId, invoiceA, "provider_cancel_error", now));
    await invoices.markCancelPending(a.tenantId, invoiceA, { reason: "Pagamento estornado", code: "9" }, now);
    await scenario("invoices.markCancelled", () => invoices.markCancelled(a.tenantId, invoiceA, now));
    // B: emite → rejeitada
    const b = await seedStatement("nota-b");
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, b.statementId);
    const { invoice: invoiceB } = await invoices.beginIssue({ tenantId: b.tenantId, statementId: b.statementId, seq: 1, provider, environment: "sandbox", serie }, now);
    await scenario("invoices.markRejected", () => invoices.markRejected(b.tenantId, invoiceB.id, "rejeição simulada", now));

    const states = (await db.$queryRawUnsafe(
      `SELECT s.invoice_status AS statement, i.status AS invoice FROM subscription_statements s JOIN subscription_statement_invoices i ON i.statement_id = s.id WHERE s.id = ANY($1::uuid[]) ORDER BY s.id = $2::uuid DESC`,
      [a.statementId, b.statementId],
      a.statementId,
    )) as Array<{ statement: string; invoice: string }>;
    assert.deepEqual(states, [{ statement: "cancelled", invoice: "cancelled" }, { statement: "rejected", invoice: "rejected" }], "as transações da nota fizeram o que dizem, sob o papel sem bypass");
    const failed = runs.filter((run) => run.name.startsWith("invoices.") && run.error !== null).map((run) => `${run.name}: ${run.error}`);
    assert.deepEqual(failed, [], "os cenários da nota rodam os caminhos de sucesso");
    // a 1ª trava de TODA transação da nota é o demonstrativo (forte), antes de qualquer filha: a regra do §2.1, além do ORD-0/1
    for (const run of runs.filter((r) => r.name.startsWith("invoices.mark") || r.name === "invoices.beginIssue")) {
      for (const transaction of run.transactions) {
        const first = transaction.events.map((event) => effectsOf(event, context)).find((effects) => effects !== "unknown" && effects.length > 0);
        assert.ok(first !== undefined && first !== "unknown" && first[0]!.table === "subscription_statements" && first[0]!.strong, `${run.name}: a 1ª trava não é a do demonstrativo`);
      }
    }
  });

  test("T-LOCK-2: o classificador lê escrita escondida num SELECT/CTE como UNK (M7e) e a pick conjunta como duas travas sem espera", () => {
    const hidden = effectsOf({ kind: "raw", method: "$queryRawUnsafe", sql: "WITH x AS (UPDATE billing_outbox SET status = status RETURNING id) SELECT * FROM x" }, context);
    assert.equal(hidden, "unknown", "escrita escondida numa CTE sobre a tabela do mapa é UNK (fail-closed)");
    const joint = effectsOf(
      {
        kind: "raw",
        method: "$queryRawUnsafe",
        sql: "SELECT o.* FROM subscription_statements s JOIN billing_outbox o ON o.statement_id = s.id WHERE o.status = 'PENDING' ORDER BY o.occurred_at FOR NO KEY UPDATE OF s SKIP LOCKED FOR UPDATE OF o SKIP LOCKED LIMIT 1",
      },
      context,
    );
    assert.deepEqual(joint, [
      { table: "subscription_statements", strong: true, wait: false, explicit: true },
      { table: "billing_outbox", strong: true, wait: false, explicit: true },
    ]);
  });

  test("T-LOCK-2: o censo das aberturas bate com a tabela congelada, as isenções valem e todo cenário tem cobertura", () => {
    const openings = transactionOpenings(ts, ROOT, PREFIX);
    const census = new Map(openings.map((opening) => [opening.key, opening]));
    assert.deepEqual([...census.keys()].filter((key) => !(key in FROZEN)), [], "abertura nova sem classe na tabela congelada (classifique-a: cenario:<nome>, sem-tabela-do-mapa ou dublê-em-memória)");
    assert.deepEqual(Object.keys(FROZEN).filter((key) => !census.has(key)), [], "classe sem abertura correspondente no código (a tabela congelada está velha)");
    const frames = new Set(recording.transactions.flatMap((transaction) => stackFrames(transaction.openerStack)));
    for (const [key, klass] of Object.entries(FROZEN)) {
      const opening = census.get(key)!;
      if (klass === "sem-tabela-do-mapa") {
        assert.ok(!MAP_MENTION.test(readFileSync(path.join(ROOT, opening.file), "utf8")), `${key}: isenção 'sem-tabela-do-mapa' num arquivo que cita o mapa`);
      } else if (klass === "dublê-em-memória") {
        assert.match(key.slice(opening.file.length + 1), /^InMemory/, `${key}: isenção 'dublê-em-memória' fora de classe InMemory*`);
      } else {
        assert.match(klass, /^cenario:/, `${key}: classe desconhecida ${klass}`);
        assert.ok(frames.has(`${opening.file}:${opening.line}`), `${key} (${klass}): nenhuma transação gravada abriu por ${opening.file}:${opening.line} (sem cobertura)`);
      }
    }
  });

  test("T-LOCK-2: nenhuma transação gravada viola ORD-0, ORD-1, ORD-2 (no claim) nem é UNK", () => {
    const claimOpening = transactionOpenings(ts, ROOT, PREFIX).find((opening) => opening.key.endsWith("#PrismaOutboxRepository.claimNext#withTenantRlsBudget"));
    assert.ok(claimOpening, "o censo acha a abertura do claim");
    const claimFrame = `${claimOpening!.file}:${claimOpening!.line}`;
    assert.ok(runs.length > 0 && runs.every((run) => run.transactions.length > 0), `todo cenário grava ao menos uma transação (vazios: ${runs.filter((run) => run.transactions.length === 0).map((run) => run.name).join(", ")})`);
    const report = runs.flatMap((run) =>
      run.transactions.flatMap((transaction) =>
        lockOrderViolations(transaction, context, { claim: stackFrames(transaction.openerStack).includes(claimFrame) }).map((v) => `${run.name}: ${v.rule}@${v.at} ${v.detail}`),
      ),
    );
    assert.deepEqual(report, []);
    const claimTransactions = runs.flatMap((run) => run.transactions).filter((transaction) => stackFrames(transaction.openerStack).includes(claimFrame));
    assert.ok(claimTransactions.length > 0, "a ORD-2 foi aplicada a transações do claim de verdade");
  });
}
