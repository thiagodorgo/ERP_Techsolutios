// B-ASS-08 · F11 — repositórios Prisma sob o papel de runtime NOSUPERUSER NOBYPASSRLS (nunca superusuário, senão o RLS
// seria bypassado e o isolamento não seria provado). T-OBX-db-1 (SKIP LOCKED), T-WH-db-1 (UNIQUE do evento), RLS das
// tabelas FORCE com VERMELHO-CONTROLE (sem o contexto de organização a linha é invisível).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { clauseTables, lockClauses, oneLine, recordingClient } from "./helpers/lock-order-recorder.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { chargeCreateClaimVerdict, runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import type { ClaimResult } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { PrismaWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.prisma.js";
import { PrismaStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.prisma.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { nextDpsNumber, nextDpsNumberInTx } from "../src/modules/subscription-billing/invoice-sequence.service.js";
import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { PrismaChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.prisma.js";
import { StatementError } from "../src/modules/subscription-billing/statements/statement.types.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!connectionString) {
  test("B-ASS-08 · -db do canal exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any; // conexão na BASE: CREATE/DROP DATABASE
  let db: any; // conexão no banco ALVO: seeding e criação dos papéis efêmeros
  let databaseName: string;
  let targetUrl: string;

  /** Demonstrativo `closed` (R$ 100, fechado agora): é o estado em que uma `charge_create` É elegível — o claim relê o
   * demonstrativo (R-OBX-5) e só libera `closed` sem cobrança viva. Os testes de R-OBX-5 mudam o estado DEPOIS, como
   * arnês admin. 2º conserto: `period` (há UNIQUE `(tenant_id, period)`) e `refs: false` (o pedido grava o índice). */
  async function seedStatement(tenantSlug: string, options: { readonly period?: string; readonly refs?: boolean } = {}): Promise<{ tenantId: string; statementId: string }> {
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, tenantSlug)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const statementId = await seedStatementFor(tenantId, options);
    return { tenantId, statementId };
  }

  async function seedStatementFor(tenantId: string, options: { readonly period?: string; readonly refs?: boolean } = {}): Promise<string> {
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, $2, 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', now(), '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      options.period ?? "2026-10",
    )) as Array<{ id: string }>;
    const statementId = statements[0]!.id;
    if (options.refs !== false) {
      await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    }
    return statementId;
  }

  // ---------------------------------------------------------------- arnês do 2º conserto (barreiras sem gancho no código)
  // A trava do arnês vive numa conexão `pg` PRÓPRIA (administrador do cluster descartável), aberta com BEGIN e segurada até
  // o teste decidir. As barreiras olham só a base DESTA suíte (`datname`) e só os papéis efêmeros do teste (`usename`):
  // um backend de outra suíte nunca as satisfaz.
  type Holder = { readonly pid: number; query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; commit(): Promise<void>; rollback(): Promise<void> };
  async function openHolder(): Promise<Holder> {
    const { Client } = (await import("pg")) as any;
    const client = new Client({ connectionString: targetUrl });
    await client.connect();
    await client.query("BEGIN");
    const pid = Number((await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
    let open = true;
    const finish = async (verb: string): Promise<void> => {
      if (!open) return;
      open = false;
      try {
        await client.query(verb);
      } finally {
        await client.end();
      }
    };
    return { pid, query: (sql, params) => client.query(sql, params), commit: () => finish("COMMIT"), rollback: () => finish("ROLLBACK") };
  }

  type Waiter = { readonly pid: number; readonly usename: string; readonly wait_event: string | null; readonly blockers: number[] };
  async function lockWaiters(roleNames: readonly string[]): Promise<Waiter[]> {
    return (await db.$queryRawUnsafe(
      `SELECT pid, usename, wait_event, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity
        WHERE datname = current_database() AND usename = ANY($1::text[]) AND wait_event_type = 'Lock'`,
      [...roleNames],
    )) as Waiter[];
  }

  async function waitUntil(label: string, predicate: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.fail(`barreira não cumprida em ${timeoutMs} ms: ${label}`);
  }

  /** Settle com o instante em que cada promessa terminou (para medir "≤ X ms depois do COMMIT"). */
  function settled<T>(promise: Promise<T>): Promise<{ readonly ok: boolean; readonly value?: T; readonly error?: unknown; readonly at: number }> {
    return promise.then(
      (value) => ({ ok: true, value, at: Date.now() }),
      (error: unknown) => ({ ok: false, error, at: Date.now() }),
    );
  }

  function isPrismaTransactionTimeout(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "P2028");
  }

  async function seedOutboxRow(tenantId: string, statementId: string, seq: number, provider = "asaas"): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, occurred_at)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $4, $3, gen_random_uuid(), now()) RETURNING id`,
      tenantId,
      statementId,
      `charge_create:${statementId}:${seq}`,
      provider,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  /** Provedor ÚNICO por teste: o claim só enxerga `enabledProviders`, então cada teste vê só as PRÓPRIAS linhas, mesmo com
   * as linhas dos outros testes desta base ainda PENDING (`billing_outbox.provider` é TEXT sem CHECK). */
  const uniqueProvider = (slug: string): string => `asaas-${slug}-${randomUUID().slice(0, 8)}`;

  const claimParamsFor = (provider: string, claimedBy: string) =>
    ({ enabledProviders: [provider], now: new Date(), claimedBy, orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict }) as const;

  type OutboxDbRow = { id: string; status: string; attempts: number; last_error: string | null; claimed_at: Date | null; statement_id: string };
  async function outboxRows(ids: readonly string[]): Promise<Map<string, OutboxDbRow>> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT id, status, attempts, last_error, claimed_at, statement_id FROM billing_outbox WHERE id = ANY($1::uuid[])`,
      [...ids],
    )) as OutboxDbRow[];
    return new Map(rows.map((row) => [row.id, row]));
  }

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("setup: base própria + migrate deploy", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08_db_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
  });

  test("T-WH-db-1: UNIQUE (provider, external_event_id) — insertIfAbsent dedupe, 1 linha", async () => {
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaWebhookEventRepository(role.client);
      const now = new Date();
      const first = await repo.insertIfAbsent({ provider: "asaas", externalEventId: "evt_db_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: "stmt_1" }, now);
      const second = await repo.insertIfAbsent({ provider: "asaas", externalEventId: "evt_db_1", bodyDigest: "d2", signatureOk: true, externalResourceId: "pay_1", externalReference: "stmt_1" }, now);
      assert.equal(first.created, true);
      assert.equal(second.created, false, "replay do mesmo evento não cria 2ª linha");
      assert.equal((await repo.listByProvider("asaas")).length, 1);
    } finally {
      await role.drop();
    }
  });

  // 2º conserto do #522 (E10, critério 4): o T-OBX-db-1 prova SÓ o que o nome diz — duas linhas de demonstrativos
  // DIFERENTES, duas sessões que chegam juntas ao UPDATE (barreira), linhas distintas. O par do MESMO demonstrativo (que
  // este teste exigia como "claimed × claimed" — o par que cobra em dobro) virou o T-OBX-db-4, com a expectativa invertida.
  test("T-OBX-db-1 (E10): dois workers com SKIP LOCKED, em demonstrativos DIFERENTES da mesma organização, chegam juntos ao UPDATE e reclamam linhas DISTINTAS, as duas PROCESSING (papel sem bypass)", async () => {
    const provider = uniqueProvider("obx1");
    const { tenantId, statementId: first } = await seedStatement(`ass08-obx-${randomUUID().slice(0, 8)}`, { period: "2026-10" });
    const second = await seedStatementFor(tenantId, { period: "2026-09" });
    const ids = [await seedOutboxRow(tenantId, first, 1, provider), await seedOutboxRow(tenantId, second, 1, provider)];
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    const holder = await openHolder();
    const inflight: Promise<unknown>[] = [];
    try {
      // Barreira determinística: com a relação travada em SHARE ROW EXCLUSIVE, o pick (ROW SHARE) passa e o UPDATE
      // (ROW EXCLUSIVE) espera — as duas sessões chegam ao UPDATE antes de qualquer COMMIT.
      await holder.query(`LOCK TABLE billing_outbox IN SHARE ROW EXCLUSIVE MODE`);
      const a = settled(new PrismaOutboxRepository(w1.client).claimNext(claimParamsFor(provider, "w1")));
      const b = settled(new PrismaOutboxRepository(w2.client).claimNext(claimParamsFor(provider, "w2")));
      inflight.push(a, b);
      await waitUntil("as duas sessões no UPDATE, esperando a relação travada pelo arnês", async () => {
        const waiters = await lockWaiters([w1.roleName, w2.roleName]);
        return waiters.length === 2 && waiters.every((waiter) => waiter.wait_event === "relation" && waiter.blockers.includes(holder.pid));
      });
      await holder.commit();
      const [ra, rb] = await Promise.all([a, b]);
      assert.ok(ra.ok && rb.ok, `os dois claims terminam (vieram: ${[ra, rb].map((o) => (o.ok ? "ok" : describeError(o.error))).join(" + ")})`);
      const ca = ra.value as ClaimResult | null;
      const cb = rb.value as ClaimResult | null;
      assert.equal(ca?.kind, "claimed", "demonstrativo closed sem cobrança viva → elegível");
      assert.equal(cb?.kind, "claimed");
      assert.notEqual(ca!.row.id, cb!.row.id, "SKIP LOCKED: linhas distintas, nunca a mesma");
      assert.notEqual(ca!.row.statementId, cb!.row.statementId, "uma linha por demonstrativo");
      const persisted = await outboxRows(ids);
      assert.deepEqual(ids.map((id) => persisted.get(id)?.status), ["PROCESSING", "PROCESSING"]);
    } finally {
      await holder.rollback();
      await Promise.all(inflight);
      await w1.drop();
      await w2.drop();
    }
  });

  test("T-OBX-db-3 (R-OBX-5): o claim RELÊ o demonstrativo na MESMA transação, sob papel sem bypass — pago → SKIPPED statement_paid (attempts 0); refechado → statement_reopened; cobrança viva → NEEDS_REVIEW charge_already_exists; nenhuma volta a ser reclamada", async () => {
    // Três demonstrativos `closed` com uma `charge_create` PENDING cada; o ARNÊS ADMIN muda o demonstrativo DEPOIS de
    // enfileirada — exatamente o que a baixa manual, o refechamento e a criação de cobrança fazem (conserto J-522, C2-01).
    const paid = await seedStatement(`ass08-obx5a-${randomUUID().slice(0, 8)}`);
    const paidRow = await seedOutboxRow(paid.tenantId, paid.statementId, 1);
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, paid.statementId);

    const reclosed = await seedStatement(`ass08-obx5b-${randomUUID().slice(0, 8)}`);
    const reclosedRow = await seedOutboxRow(reclosed.tenantId, reclosed.statementId, 1);
    // Refechado DEPOIS de enfileirada: `reopened_at` (preservado pelo fechamento) é posterior ao `occurred_at` da linha.
    await db.$executeRawUnsafe(
      `UPDATE subscription_statements s SET status = 'closed', reopened_at = o.occurred_at + interval '1 second'
         FROM billing_outbox o WHERE o.id = $1::uuid AND s.id = o.statement_id`,
      reclosedRow,
    );

    const live = await seedStatement(`ass08-obx5c-${randomUUID().slice(0, 8)}`);
    const liveRow = await seedOutboxRow(live.tenantId, live.statementId, 1);
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status)
         VALUES ($1::uuid, $2::uuid, 'asaas', $3, 'pending')`,
      live.tenantId,
      live.statementId,
      `pay_live_${randomUUID().slice(0, 8)}`,
    );

    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaOutboxRepository(role.client);
      const params = { enabledProviders: ["asaas"], now: new Date(), claimedBy: "w-obx5", orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict } as const;
      // O claim é por organização (ordem de `billing_statement_refs`) e devolve UMA linha por chamada; esgotamos a fila e
      // indexamos por linha — linhas de outros testes desta base (se elegíveis) são ignoradas.
      const drain = async (): Promise<Map<string, ClaimResult>> => {
        const seen = new Map<string, ClaimResult>();
        for (let i = 0; i < 50; i += 1) {
          const result = await repo.claimNext(params);
          if (!result) break;
          seen.set(result.row.id, result);
        }
        return seen;
      };
      const first = await drain();

      const paidClaim = first.get(paidRow);
      assert.equal(paidClaim?.kind, "skipped", "demonstrativo pago depois de enfileirada → a linha é pulada, não reclamada");
      assert.equal(paidClaim?.kind === "skipped" ? paidClaim.skipReason : null, "statement_paid");
      const paidDb = (await db.$queryRawUnsafe(`SELECT status, skip_reason, attempts, claimed_at FROM billing_outbox WHERE id = $1::uuid`, paidRow)) as Array<{ status: string; skip_reason: string | null; attempts: number; claimed_at: Date | null }>;
      assert.deepEqual(paidDb[0], { status: "SKIPPED", skip_reason: "statement_paid", attempts: 0, claimed_at: null }, "SKIPPED sem tentativa e sem claim");

      const reclosedClaim = first.get(reclosedRow);
      assert.equal(reclosedClaim?.kind, "skipped");
      assert.equal(reclosedClaim?.kind === "skipped" ? reclosedClaim.skipReason : null, "statement_reopened", "refechado depois de enfileirada → payload velho nunca sai");

      const liveClaim = first.get(liveRow);
      assert.equal(liveClaim?.kind, "needs_review", "cobrança viva já existente → revisão, nunca 2ª cobrança");
      assert.equal(liveClaim?.kind === "needs_review" ? liveClaim.code : null, "charge_already_exists");
      const liveDb = (await db.$queryRawUnsafe(`SELECT status, last_error, skip_reason FROM billing_outbox WHERE id = $1::uuid`, liveRow)) as Array<{ status: string; last_error: string | null; skip_reason: string | null }>;
      assert.deepEqual(liveDb[0], { status: "NEEDS_REVIEW", last_error: "charge_already_exists", skip_reason: null }, "sem skip_reason novo: a lista da M5 é fechada");

      // 2ª passada: nenhuma das três volta a ser reclamada (SKIPPED/NEEDS_REVIEW são terminais para o claim).
      const second = await drain();
      for (const id of [paidRow, reclosedRow, liveRow]) assert.equal(second.has(id), false, `linha ${id} não é reclamada de novo`);
    } finally {
      await role.drop();
    }
  });

  test("RLS: outbox é invisível sem o contexto de organização (vermelho-controle) e findById respeita o tenant", async () => {
    const a = await seedStatement(`ass08-rlsa-${randomUUID().slice(0, 8)}`);
    const b = await seedStatement(`ass08-rlsb-${randomUUID().slice(0, 8)}`);
    const idA = await seedOutboxRow(a.tenantId, a.statementId, 1);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      // VERMELHO-CONTROLE: sem GUC, o papel sem bypass vê ZERO (se o repo NÃO usasse withTenantRls, o claim/find falhariam).
      const semGuc = (await role.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM billing_outbox`)) as Array<{ n: number }>;
      assert.equal(semGuc[0]!.n, 0, "sem contexto de organização, a tabela FORCE devolve zero");

      const repo = new PrismaOutboxRepository(role.client);
      const viaA = await repo.findById(a.tenantId, idA);
      assert.equal(viaA?.id, idA, "sob o contexto de A, a linha de A é visível");
      const viaB = await repo.findById(b.tenantId, idA);
      assert.equal(viaB, undefined, "sob o contexto de B, a linha de A é inexistente (RLS)");
    } finally {
      await role.drop();
    }
  });

  test("RLS: charges — contexto de A vê a cobrança de A, nunca a de B", async () => {
    const a = await seedStatement(`ass08-cha-${randomUUID().slice(0, 8)}`);
    const b = await seedStatement(`ass08-chb-${randomUUID().slice(0, 8)}`);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const repo = new PrismaStatementChargeRepository(role.client);
      await repo.insert({ tenantId: a.tenantId, statementId: a.statementId, provider: "asaas", externalChargeId: `pay_${randomUUID().slice(0, 8)}`, status: "pending", payUrl: "https://pay/x", dueDate: "2026-12-10" }, new Date());
      const listA = await repo.listByStatement(a.tenantId, a.statementId);
      assert.equal(listA.length, 1);
      assert.equal(listA[0]?.payUrl, "https://pay/x");
      const listB = await repo.listByStatement(b.tenantId, a.statementId);
      assert.equal(listB.length, 0, "B nunca vê a cobrança de A");
    } finally {
      await role.drop();
    }
  });

  test("T-NF-db-1: numeração da DPS com FOR UPDATE — concorrentes recebem números DISTINTOS e CONSECUTIVOS", async () => {
    const serie = 1 + Math.floor(Math.random() * 100000);
    const key = { provider: "focusnfe", environment: "sandbox" as const, serie };
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    try {
      const [a, b] = await Promise.all([nextDpsNumber(w1.client, key), nextDpsNumber(w2.client, key)]);
      assert.deepEqual([a, b].sort((x, y) => x - y), [1, 2], "dois concorrentes → 1 e 2, nunca repetido");
    } finally {
      await w1.drop();
      await w2.drop();
    }
  });

  test("T-NF-db-1: rollback da transação NÃO consome número", async () => {
    const serie = 1 + Math.floor(Math.random() * 100000);
    const key = { provider: "focusnfe", environment: "sandbox" as const, serie };
    // Reserva dentro de uma transação que FALHA: o número não deve ser consumido.
    await assert.rejects(
      db.$transaction(async (tx: any) => {
        const n = await nextDpsNumberInTx(tx, key);
        assert.equal(n, 1);
        throw new Error("rollback proposital");
      }),
    );
    // A próxima reserva (commitada) ainda recebe 1.
    assert.equal(await nextDpsNumber(db, key), 1, "o rollback devolveu o número");
  });

  // =====================================================================================================================
  // 2º conserto do #522 (plano `B-ASS-08-conserto-c2.md`). Os testes abaixo usam o arnês do topo (trava numa conexão
  // própria, barreira por `pg_stat_activity` escopada à base e aos papéis do teste) e nunca um gancho no código.
  // =====================================================================================================================

  function describeError(error: unknown): string {
    if (error instanceof StatementError) return `StatementError ${error.statusCode} ${error.reason}`;
    if (error && typeof error === "object") {
      const candidate = error as { code?: unknown; name?: unknown; message?: unknown };
      return `${String(candidate.code ?? candidate.name)}: ${String(candidate.message ?? "").slice(0, 160)}`;
    }
    return String(error);
  }

  test("T-CHG-db-1 (E8, critério 1): dois pedidos concorrentes com o demonstrativo travado pelo arnês → um ok e um 422 charge_already_exists, 1 viva, 1 índice, nenhum P2028, os dois ≤ 1 s depois do COMMIT", async () => {
    const { tenantId, statementId } = await seedStatement(`ass08-chg1-${randomUUID().slice(0, 8)}`, { refs: false });
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    const holder = await openHolder();
    try {
      await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [statementId]);
      const now = new Date();
      const input = { tenantId, statementId, provider: "asaas", payload: { customerId: "cus_do_payload", amountCents: 10000, dueDate: "2026-11-10", method: "pix" }, now };
      const deps = (client: any) => ({ intents: new PrismaChargeIntentRepository(client) });
      const p1 = settled(requestChargeCreate(deps(w1.client), input));
      const p2 = settled(requestChargeCreate(deps(w2.client), input));
      // Barreira: as duas sessões dos pedidos esperando trava (a 2ª pode esperar a 1ª na fila da tupla), com ao menos uma
      // bloqueada pelo arnês (lição medida no S3 da síntese).
      await waitUntil("os dois pedidos esperando trava, ao menos um pelo arnês", async () => {
        const waiters = await lockWaiters([w1.roleName, w2.roleName]);
        return waiters.length === 2 && waiters.some((waiter) => waiter.blockers.includes(holder.pid));
      });
      const committedAt = Date.now();
      await holder.commit();
      const outcomes = await Promise.all([p1, p2]);
      const described = outcomes.map((o) => (o.ok ? "ok" : describeError(o.error)));
      assert.equal(outcomes.filter((o) => !o.ok && isPrismaTransactionTimeout(o.error)).length, 0, `nenhum P2028 (vieram: ${described.join(" + ")})`);
      assert.equal(outcomes.filter((o) => o.ok).length, 1, `exatamente um pedido ok (vieram: ${described.join(" + ")})`);
      const rejected = outcomes.find((o) => !o.ok)!;
      assert.ok(
        rejected.error instanceof StatementError && rejected.error.statusCode === 422 && rejected.error.reason === "charge_already_exists",
        `o outro sai 422 charge_already_exists (veio: ${describeError(rejected.error)})`,
      );
      for (const o of outcomes) assert.ok(o.at - committedAt <= 1_000, `terminou ${o.at - committedAt} ms depois do COMMIT (teto 1 000)`);
      const live = (await db.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'charge_create' AND status IN ('PENDING','PROCESSING','SENT','NEEDS_REVIEW')`,
        statementId,
      )) as Array<{ n: number }>;
      assert.equal(live[0]!.n, 1, "1 charge_create viva");
      const refs = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId)) as Array<{ n: number }>;
      assert.equal(refs[0]!.n, 1, "1 linha no índice de ids");
    } finally {
      await holder.rollback();
      await w1.drop();
      await w2.drop();
    }
  });

  test("T-CHG-db-2 (E8): pedido isolado → ok em < 1 s, 1 PENDING sem customerId no payload, índice gravado; demonstrativo travado além do lock_timeout → 409 statement_busy e nada gravado", async () => {
    const { tenantId, statementId } = await seedStatement(`ass08-chg2-${randomUUID().slice(0, 8)}`, { refs: false });
    const busy = await seedStatement(`ass08-chg2b-${randomUUID().slice(0, 8)}`, { refs: false });
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const intents = new PrismaChargeIntentRepository(role.client);
      const payload = { customerId: "cus_do_payload", amountCents: 10000, dueDate: "2026-11-10", method: "pix" };
      const started = Date.now();
      const row = await requestChargeCreate({ intents }, { tenantId, statementId, provider: "asaas", payload, now: new Date() });
      const elapsed = Date.now() - started;
      assert.ok(elapsed < 1_000, `pedido isolado em ${elapsed} ms (< 1 000)`);
      assert.equal(row.status, "PENDING");
      assert.equal(row.idempotencyKey, `charge_create:${statementId}:1`);
      const persisted = (await db.$queryRawUnsafe(`SELECT status, payload FROM billing_outbox WHERE statement_id = $1::uuid`, statementId)) as Array<{ status: string; payload: Record<string, unknown> }>;
      assert.equal(persisted.length, 1);
      assert.equal(persisted[0]!.status, "PENDING");
      assert.equal("customerId" in persisted[0]!.payload, false, "R-PRF-1: o payload gravado não tem customerId");
      assert.equal(persisted[0]!.payload.amountCents, 10000);
      const refs = (await db.$queryRawUnsafe(`SELECT tenant_id, provider FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId)) as Array<{ tenant_id: string; provider: string }>;
      assert.deepEqual(refs, [{ tenant_id: tenantId, provider: "asaas" }], "o índice de ids nasce na mesma transação");

      // 55P03 → 409 statement_busy: o arnês segura o demonstrativo além do `lock_timeout` (5 s) do pedido.
      const holder = await openHolder();
      try {
        await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [busy.statementId]);
        const busyStarted = Date.now();
        await assert.rejects(
          requestChargeCreate({ intents }, { tenantId: busy.tenantId, statementId: busy.statementId, provider: "asaas", payload, now: new Date() }),
          (error: unknown) => error instanceof StatementError && error.statusCode === 409 && error.reason === "statement_busy",
          "lock_timeout vira 409 statement_busy (repetível), nunca P2028",
        );
        assert.ok(Date.now() - busyStarted < 15_000, "o lock_timeout dispara antes do timeout da transação");
      } finally {
        await holder.rollback();
      }
      const nothing = (await db.$queryRawUnsafe(
        `SELECT (SELECT count(*)::int FROM billing_outbox WHERE statement_id = $1::uuid) AS lines, (SELECT count(*)::int FROM billing_statement_refs WHERE statement_id = $1::uuid) AS refs`,
        busy.statementId,
      )) as Array<{ lines: number; refs: number }>;
      assert.deepEqual(nothing[0], { lines: 0, refs: 0 }, "rollback limpo: nada gravado no pedido recusado");
    } finally {
      await role.drop();
    }
  });

  test("T-LOCK-1a (E8): o pedido é UMA transação numa conexão — as 3 primeiras instruções são os set_config e a 4ª é o FOR UPDATE do demonstrativo; nada fora da transação", async () => {
    const { tenantId, statementId } = await seedStatement(`ass08-lk1a-${randomUUID().slice(0, 8)}`, { refs: false });
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const recording = recordingClient(role.client);
      await requestChargeCreate(
        { intents: new PrismaChargeIntentRepository(recording.client) },
        { tenantId, statementId, provider: "asaas", payload: { amountCents: 10000, dueDate: "2026-11-10", method: "pix" }, now: new Date() },
      );
      assert.equal(recording.transactions.length, 1, "uma transação só");
      assert.deepEqual(recording.outside, [], "nenhuma instrução fora da transação (outra conexão)");
      const events = recording.transactions[0]!.events;
      assert.ok(events.every((event) => event.kind === "raw"), "o pedido só emite SQL cru");
      const sql = events.map((event) => (event.kind === "raw" ? oneLine(event.sql) : ""));
      for (const index of [0, 1, 2]) assert.match(sql[index]!, /^SELECT set_config\(/, `instrução ${index + 1} = set_config`);
      assert.match(sql[3]!, /^SELECT id, status FROM subscription_statements WHERE id = \$1::uuid AND tenant_id = \$2::uuid FOR UPDATE$/, "a 4ª instrução é a trava do demonstrativo");
      assert.ok(sql.slice(4).every((text) => !/\bsubscription_statements\b/.test(text)), "depois da trava, ninguém mais lê o demonstrativo");
      assert.equal(sql.length, 8, `8 instruções (veio: ${sql.length})`);
    } finally {
      await role.drop();
    }
  });

  // ---------------------------------------------------------------- F4: o claim (E4 + E5″) no Postgres real

  /** Porta de pagamento que só grava (o equivalente ao `recorded[]` do servidor falso, sem rede). */
  function recordingPort(provider: string) {
    const created: unknown[] = [];
    return {
      created,
      async ensureCustomer() { return { customerId: "cus_db" }; },
      async createCharge(input: unknown) { created.push(input); return { chargeId: `pay_db_${created.length}`, status: "pending" as const, payUrl: "https://pay.example/db" }; },
      async getCharge() { return { status: "pending" as const, raw: {} }; },
      async listChargesByExternalReference() { return []; },
      async cancelCharge(chargeId: string) { return { chargeId, status: "cancelled" as const }; },
      async refund(chargeId: string) { return { chargeId, status: "refunded" as const }; },
      async registerWebhook() { return { externalId: "hook_db" }; },
      async verifyWebhook() { return { ok: false }; },
      supportedMethods() { return ["pix"] as const; },
      describe() { return { provider, supportedMethods: ["pix"] as const, pendingHomologation: [], webhookRegistration: "api" as const }; },
    };
  }

  test("T-OBX-db-4 (E4, critério 2): o par PROIBIDO — duas charge_create PENDING do MESMO demonstrativo; dois workers → nenhuma reclamada, as duas NEEDS_REVIEW charge_already_exists com attempts 0; dois despachos naturais → 0 createCharge", async () => {
    // (a) barreira determinística
    const provider = uniqueProvider("obx4a");
    const { tenantId, statementId } = await seedStatement(`ass08-obx4a-${randomUUID().slice(0, 8)}`);
    const ids = [await seedOutboxRow(tenantId, statementId, 1, provider), await seedOutboxRow(tenantId, statementId, 2, provider)];
    const w1 = await createEphemeralRole(db, targetUrl);
    const w2 = await createEphemeralRole(db, targetUrl);
    const holder = await openHolder();
    const inflight: Promise<unknown>[] = [];
    try {
      await holder.query(`LOCK TABLE billing_outbox IN SHARE ROW EXCLUSIVE MODE`);
      const results: Array<{ ok: boolean; value?: unknown; error?: unknown } | undefined> = [undefined, undefined];
      const a = settled(new PrismaOutboxRepository(w1.client).claimNext(claimParamsFor(provider, "w1"))).then((r) => void (results[0] = r));
      const b = settled(new PrismaOutboxRepository(w2.client).claimNext(claimParamsFor(provider, "w2"))).then((r) => void (results[1] = r));
      inflight.push(a, b);
      // As duas no UPDATE esperando a relação, OU uma esperando e a outra já resolvida (a que encontrou o demonstrativo
      // travado pela 1ª pula as duas linhas dele e volta sem candidata).
      await waitUntil("as duas no UPDATE esperando a relação, ou uma esperando e a outra resolvida", async () => {
        const waiting = (await lockWaiters([w1.roleName, w2.roleName])).filter((waiter) => waiter.wait_event === "relation");
        const done = results.filter(Boolean).length;
        return waiting.length === 2 || (waiting.length === 1 && done === 1);
      });
      await holder.commit();
      await Promise.all([a, b]);
      for (const r of results) assert.ok(r?.ok, `claim terminou sem erro (veio: ${r?.ok ? "ok" : describeError(r?.error)})`);
      const claims = results.map((r) => r!.value as ClaimResult | null).filter((c): c is ClaimResult => Boolean(c));
      assert.equal(claims.filter((c) => c.kind === "claimed").length, 0, "nenhuma das duas é reclamada: duas vivas do mesmo demonstrativo nunca saem");
      // dreno sequencial: a outra linha também vai a revisão
      const repo = new PrismaOutboxRepository(w1.client);
      for (let i = 0; i < 5; i += 1) {
        const next = await repo.claimNext(claimParamsFor(provider, "drain"));
        if (!next) break;
        assert.notEqual(next.kind, "claimed", "o dreno também não reclama");
      }
      const persisted = await outboxRows(ids);
      for (const id of ids) {
        const row = persisted.get(id);
        assert.deepEqual({ status: row?.status, last_error: row?.last_error, attempts: row?.attempts }, { status: "NEEDS_REVIEW", last_error: "charge_already_exists", attempts: 0 }, `linha ${id}: revisão, sem tentativa`);
      }
    } finally {
      await holder.rollback();
      await Promise.all(inflight);
      await w1.drop();
      await w2.drop();
    }

    // (b) natural: dois despachos em Promise.all, dois papéis, a mesma porta
    const naturalProvider = uniqueProvider("obx4b");
    const natural = await seedStatement(`ass08-obx4b-${randomUUID().slice(0, 8)}`);
    const naturalIds = [
      await seedOutboxRow(natural.tenantId, natural.statementId, 1, naturalProvider),
      await seedOutboxRow(natural.tenantId, natural.statementId, 2, naturalProvider),
    ];
    const d1 = await createEphemeralRole(db, targetUrl);
    const d2 = await createEphemeralRole(db, targetUrl);
    try {
      const port = recordingPort(naturalProvider);
      const run = (client: any) =>
        runDispatchOutbox({ repo: new PrismaOutboxRepository(client), ports: { [naturalProvider]: port as any }, resolveCustomer: async () => ({ ok: true, customerId: "cus_db" }), now: () => new Date() });
      await Promise.all([run(d1.client), run(d2.client)]);
      assert.equal(port.created.length, 0, "dois despachantes, duas vivas do mesmo demonstrativo: 0 POST /payments");
      const persisted = await outboxRows(naturalIds);
      assert.deepEqual(naturalIds.map((id) => persisted.get(id)?.status), ["NEEDS_REVIEW", "NEEDS_REVIEW"]);
    } finally {
      await d1.drop();
      await d2.drop();
    }
  });

  test("T-OBX-db-5 (E5″, critério 5): com o demonstrativo travado pelo arnês (uma baixa em voo), claimNext devolve null em < 1 s e a linha fica intocada; depois de pagar e COMMIT, o claim dá skipped statement_paid", async () => {
    const provider = uniqueProvider("obx5");
    const { tenantId, statementId } = await seedStatement(`ass08-obx5x-${randomUUID().slice(0, 8)}`);
    const rowId = await seedOutboxRow(tenantId, statementId, 1, provider);
    const role = await createEphemeralRole(db, targetUrl);
    const holder = await openHolder();
    try {
      await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [statementId]);
      const repo = new PrismaOutboxRepository(role.client);
      const started = Date.now();
      let first: ClaimResult | null | "erro" = "erro";
      let firstError: unknown;
      try {
        first = await repo.claimNext(claimParamsFor(provider, "w-obx5"));
      } catch (error) {
        firstError = error;
      }
      const elapsed = Date.now() - started;
      assert.equal(first, null, `demonstrativo ocupado: a linha é adiada, nunca reclamada sob a baixa em voo (veio: ${first === "erro" ? describeError(firstError) : first?.kind})`);
      assert.ok(elapsed < 1_000, `o claim não esperou a trava (${elapsed} ms < 1 000)`);
      const intact = (await outboxRows([rowId])).get(rowId);
      assert.deepEqual({ status: intact?.status, attempts: intact?.attempts, claimed_at: intact?.claimed_at }, { status: "PENDING", attempts: 0, claimed_at: null }, "a linha adiada fica intocada");
      await holder.query(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, [statementId]);
      await holder.commit();
      const second = await repo.claimNext(claimParamsFor(provider, "w-obx5"));
      assert.equal(second?.kind, "skipped", "depois da baixa, a linha é pulada");
      assert.equal(second?.kind === "skipped" ? second.skipReason : null, "statement_paid");
      assert.equal(second?.row.id, rowId);
    } finally {
      await holder.rollback();
      await role.drop();
    }
  });

  test("T-LOCK-1b (E5″): toda cláusula de trava do claim sobre subscription_statements tem SKIP LOCKED, e na pick conjunta a cláusula do demonstrativo vem ANTES da cláusula da linha da fila", async () => {
    const provider = uniqueProvider("lk1b");
    const { tenantId, statementId } = await seedStatement(`ass08-lk1b-${randomUUID().slice(0, 8)}`);
    const rowId = await seedOutboxRow(tenantId, statementId, 1, provider);
    const role = await createEphemeralRole(db, targetUrl);
    try {
      const recording = recordingClient(role.client);
      const result = await new PrismaOutboxRepository(recording.client).claimNext(claimParamsFor(provider, "w-lk1b"));
      assert.equal(result?.kind, "claimed", "o cenário exercita a pick conjunta (charge_create PENDING elegível)");
      assert.equal(result?.row.id, rowId);
      const sqls = recording.transactions.flatMap((transaction) => transaction.events.flatMap((event) => (event.kind === "raw" ? [event.sql] : [])));
      const onStatements = sqls.flatMap((sql) => lockClauses(sql).filter((clause) => clauseTables(sql, clause).includes("subscription_statements")).map((clause) => ({ sql, clause })));
      assert.ok(onStatements.length >= 1, "o claim trava o demonstrativo (a pick conjunta existe)");
      for (const { sql, clause } of onStatements) assert.equal(clause.waitPolicy, "skip locked", `trava do demonstrativo sem SKIP LOCKED: ${oneLine(sql).slice(-160)}`);
      const joint = sqls.filter((sql) => {
        const clauses = lockClauses(sql);
        return clauses.some((c) => clauseTables(sql, c).includes("subscription_statements")) && clauses.some((c) => clauseTables(sql, c).includes("billing_outbox"));
      });
      assert.ok(joint.length >= 1, "a pick conjunta trava o demonstrativo E a linha numa instrução só");
      for (const sql of joint) {
        const clauses = lockClauses(sql);
        const statementClause = clauses.findIndex((c) => clauseTables(sql, c).includes("subscription_statements"));
        const queueClause = clauses.findIndex((c) => clauseTables(sql, c).includes("billing_outbox"));
        assert.ok(statementClause < queueClause, `a cláusula do demonstrativo vem antes da cláusula da fila: ${oneLine(sql).slice(-160)}`);
      }
    } finally {
      await role.drop();
    }
  });

  // ---------------------------------------------------------------- F5b: a adoção por fato que não se apaga, no Postgres

  /** Porta roteirizada (sem rede): `stored` é o que existe no provedor, na ordem da listagem; `createScript` ("lost" cria e
   * PERDE a resposta) e `lookupScript` ("5xx" falha a reconsulta). */
  type ScriptedPort = ReturnType<typeof scriptedPort>;
  function scriptedPort(provider: string) {
    const failure = (code: string) => Object.assign(new Error(code), { code });
    const port = {
      created: [] as Array<{ readonly externalReference: string; readonly amountCents: number }>,
      lookups: [] as string[],
      stored: [] as Array<{ readonly chargeId: string; readonly ref: string; readonly amountCents: number; readonly status: "pending" }>,
      createScript: [] as Array<"ok" | "lost">,
      lookupScript: [] as Array<"ok" | "5xx">,
      async ensureCustomer() { return { customerId: "cus_db" }; },
      async createCharge(input: { readonly externalReference: string; readonly amountCents: number }) {
        port.created.push(input);
        const step = port.createScript.shift() ?? "ok";
        const chargeId = `pay_db_${port.stored.length + 1}`;
        port.stored.push({ chargeId, ref: input.externalReference, amountCents: input.amountCents, status: "pending" });
        if (step === "lost") throw failure("provider_timeout");
        return { chargeId, status: "pending" as const, payUrl: "https://pay.example/db" };
      },
      async getCharge() { return { status: "pending" as const, raw: {} }; },
      async findChargeByExternalReference(ref: string) {
        port.lookups.push(ref);
        if (port.lookupScript.shift() === "5xx") throw failure("provider_unavailable");
        const found = port.stored.find((charge) => charge.ref === ref);
        return found ? { chargeId: found.chargeId, status: found.status } : null;
      },
      async cancelCharge(chargeId: string) { return { chargeId, status: "cancelled" as const }; },
      async refund(chargeId: string) { return { chargeId, status: "refunded" as const }; },
      async registerWebhook() { return { externalId: "hook_db" }; },
      async verifyWebhook() { return { ok: false }; },
      supportedMethods() { return ["pix"] as const; },
      describe() { return { provider, supportedMethods: ["pix"] as const, pendingHomologation: [], webhookRegistration: "api" as const }; },
    };
    return port;
  }

  const minutesAfter = (base: Date, n: number) => new Date(base.getTime() + n * 60_000);
  const afterOrphanCutoff = (base: Date) => new Date(base.getTime() + OUTBOX_ORPHAN_MS + 60_000);

  function dispatchDb(client: any, provider: string, port: ScriptedPort, at: Date) {
    return runDispatchOutbox({ repo: new PrismaOutboxRepository(client), ports: { [provider]: port as any }, resolveCustomer: async () => ({ ok: true, customerId: "cus_db" }), now: () => at });
  }

  async function claimAndDieDb(client: any, provider: string, at: Date) {
    const claimed = await new PrismaOutboxRepository(client).claimNext({ ...claimParamsFor(provider, "dead-worker"), now: at });
    assert.equal(claimed?.kind, "claimed", "o worker reclamou a linha antes de morrer");
    return claimed!.row;
  }

  async function finalRow(id: string) {
    const rows = (await db.$queryRawUnsafe(`SELECT status, last_error, external_id FROM billing_outbox WHERE id = $1::uuid`, id)) as Array<{ status: string; last_error: string | null; external_id: string | null }>;
    return rows[0];
  }

  /** As fotos de evidência APAGADA do crítico (L1/L2/L3): R0 `SKIPPED` com attempts 0 e last_error nulo, a fantasma no
   * provedor; o demonstrativo reaberto DEPOIS de R0 e refechado com R$ 150; R1 nasce pelo pedido real (seq 2). */
  async function erasedEvidenceDb(client: any, slug: string, phantomCents: number) {
    const provider = uniqueProvider(slug);
    const { tenantId, statementId } = await seedStatement(`ass08-${slug}-${randomUUID().slice(0, 8)}`);
    const t0 = new Date();
    await db.$executeRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, skip_reason, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $3, $4, gen_random_uuid(), '{"amountCents":10000,"dueDate":"2026-11-10","method":"pix"}'::jsonb, $5, 'SKIPPED', 'statement_reopened', 0, NULL)`,
      tenantId,
      statementId,
      provider,
      `charge_create:${statementId}:1`,
      t0,
    );
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'closed', reopened_at = $2, total_amount = 150 WHERE id = $1::uuid`, statementId, minutesAfter(t0, 1));
    const t1 = minutesAfter(t0, 3);
    const r1 = await requestChargeCreate({ intents: new PrismaChargeIntentRepository(client) }, { tenantId, statementId, provider, payload: { amountCents: 15000, dueDate: "2026-11-10", method: "pix" }, now: t1 });
    assert.equal(r1.idempotencyKey, `charge_create:${statementId}:2`);
    const port = scriptedPort(provider);
    port.stored.push({ chargeId: `pay_phantom_${slug}`, ref: statementId, amountCents: phantomCents, status: "pending" });
    return { provider, r1, t1, port };
  }

  test("T-OBX-db-7 (E6′/E7′, §13.1.4): as fotos de evidência apagada L1, L2 e L3 com o repositório Prisma real e papel sem bypass — a fantasma nunca é adotada, 0 createCharge", async () => {
    const role = await createEphemeralRole(db, targetUrl);
    try {
      // L1: retentativa com 5xx na 1ª reconsulta, fantasma de R$ 100
      const l1 = await erasedEvidenceDb(role.client, "db7l1", 10000);
      l1.port.lookupScript.push("5xx");
      await dispatchDb(role.client, l1.provider, l1.port, l1.t1);
      await dispatchDb(role.client, l1.provider, l1.port, minutesAfter(l1.t1, 2));
      assert.equal(l1.port.created.length, 0, "L1: 0 createCharge");
      assert.deepEqual(await finalRow(l1.r1.id), { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent", external_id: null }, "L1");
      // L2: a órfã R1 × a mesma fantasma
      const l2 = await erasedEvidenceDb(role.client, "db7l2", 10000);
      await claimAndDieDb(role.client, l2.provider, l2.t1);
      await dispatchDb(role.client, l2.provider, l2.port, afterOrphanCutoff(l2.t1));
      assert.equal(l2.port.created.length, 0, "L2: 0 createCharge");
      assert.deepEqual(await finalRow(l2.r1.id), { status: "NEEDS_REVIEW", last_error: "orphan_found_previous_intent", external_id: null }, "L2");
      // L3: fantasma de MESMO valor (R$ 150) — U pega mesmo quando o valor bate
      const l3 = await erasedEvidenceDb(role.client, "db7l3", 15000);
      l3.port.lookupScript.push("5xx");
      await dispatchDb(role.client, l3.provider, l3.port, l3.t1);
      await dispatchDb(role.client, l3.provider, l3.port, minutesAfter(l3.t1, 2));
      assert.equal(l3.port.created.length, 0, "L3: 0 createCharge");
      assert.deepEqual(await finalRow(l3.r1.id), { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent", external_id: null }, "L3");
    } finally {
      await role.drop();
    }
  });

  test("T-OBX-db-8 (E7′, §13.1.4): L5 — a órfã de linha ÚNICA com o demonstrativo reaberto DEPOIS dela e refechado com outro total → orphan_found_stale_closing; Sa — a órfã coerente adota a PRÓPRIA (R-OBX-1)", async () => {
    const role = await createEphemeralRole(db, targetUrl);
    try {
      for (const variant of ["L5", "Sa"] as const) {
        const provider = uniqueProvider(`db8${variant.toLowerCase()}`);
        const { tenantId, statementId } = await seedStatement(`ass08-db8${variant.toLowerCase()}-${randomUUID().slice(0, 8)}`);
        const t0 = new Date();
        const row = await requestChargeCreate({ intents: new PrismaChargeIntentRepository(role.client) }, { tenantId, statementId, provider, payload: { amountCents: 10000, dueDate: "2026-11-10", method: "pix" }, now: t0 });
        await claimAndDieDb(role.client, provider, t0);
        const port = scriptedPort(provider);
        port.stored.push({ chargeId: `pay_own_${variant}`, ref: statementId, amountCents: 10000, status: "pending" }); // o POST do worker que morreu
        if (variant === "L5") {
          await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'closed', reopened_at = $2, total_amount = 150 WHERE id = $1::uuid`, statementId, minutesAfter(t0, 1));
        }
        await dispatchDb(role.client, provider, port, afterOrphanCutoff(t0));
        const expected = variant === "L5"
          ? { status: "NEEDS_REVIEW", last_error: "orphan_found_stale_closing", external_id: null }
          : { status: "SENT", last_error: null, external_id: `pay_own_${variant}` };
        assert.deepEqual(await finalRow(row.id), expected, variant);
        assert.equal(port.created.length, 0, `${variant}: a órfã nunca cria`);
      }
    } finally {
      await role.drop();
    }
  });

  async function seedFailedRow(tenantId: string, statementId: string, seq: number, provider = "asaas"): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $4, $3, gen_random_uuid(), '{"amountCents":10000,"dueDate":"2026-11-10","method":"pix"}'::jsonb, now(), 'FAILED', 8, 'provider_timeout') RETURNING id`,
      tenantId,
      statementId,
      `charge_create:${statementId}:${seq}`,
      provider,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  async function liveChargeCreates(statementId: string): Promise<number> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM billing_outbox WHERE statement_id = $1::uuid AND kind = 'charge_create' AND status IN ('PENDING','PROCESSING','SENT','NEEDS_REVIEW')`,
      statementId,
    )) as Array<{ n: number }>;
    return rows[0]!.n;
  }

  const isUnprocessable = (reason: string) => (error: unknown) => error instanceof StatementError && error.statusCode === 422 && error.reason === reason;

  test("T-CHG-db-3 (E8 × E9, critério 1): pedido × retry guardado nas duas ordens fixadas pelo arnês → sempre 1 charge_create viva", async (t) => {
    const payload = { amountCents: 10000, dueDate: "2026-11-10", method: "pix" };
    // As duas ordens são SUBTESTES: uma falha na (i) não impede a (ii) de rodar (cada mutação mostra o próprio vermelho).

    // (i) RETRY PRIMEIRO: o arnês segura o demonstrativo; o retry fica esperando; só então o pedido entra. COMMIT → o retry
    //     reabre a FAILED e o pedido lê a linha reaberta (viva) → 422.
    await t.test("(i) retry primeiro", async () => {
      const { tenantId, statementId } = await seedStatement(`ass08-chg3i-${randomUUID().slice(0, 8)}`, { refs: false });
      const failedId = await seedFailedRow(tenantId, statementId, 1);
      const wRetry = await createEphemeralRole(db, targetUrl);
      const wRequest = await createEphemeralRole(db, targetUrl);
      const holder = await openHolder();
      const inflight: Promise<unknown>[] = [];
      try {
        await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [statementId]);
        const retry = settled(new PrismaOutboxRepository(wRetry.client).retry(tenantId, failedId, new Date()));
        inflight.push(retry);
        await waitUntil("(i) o retry esperando o demonstrativo do arnês", async () => (await lockWaiters([wRetry.roleName])).some((w) => w.blockers.includes(holder.pid)));
        const request = settled(requestChargeCreate({ intents: new PrismaChargeIntentRepository(wRequest.client) }, { tenantId, statementId, provider: "asaas", payload, now: new Date() }));
        inflight.push(request);
        await waitUntil("(i) retry e pedido esperando", async () => (await lockWaiters([wRetry.roleName, wRequest.roleName])).length === 2);
        await holder.commit();
        const [r, p] = await Promise.all([retry, request]);
        assert.equal(await liveChargeCreates(statementId), 1, "(i) 1 viva");
        assert.ok(r.ok && (r.value as { status?: string } | undefined)?.status === "PENDING", `(i) o retry reabre (veio: ${r.ok ? "ok" : describeError(r.error)})`);
        assert.ok(!p.ok && isUnprocessable("charge_already_exists")(p.error), `(i) o pedido sai 422 charge_already_exists (veio: ${p.ok ? "ok" : describeError(p.error)})`);
      } finally {
        await holder.rollback();
        await Promise.all(inflight);
        await wRetry.drop();
        await wRequest.drop();
      }
    });

    // (ii) PEDIDO PRIMEIRO: o arnês segura a linha do índice (`billing_statement_refs`), e o pedido fica preso no upsert
    //      DEPOIS de travar o demonstrativo e ler as linhas; então o retry, que espera o demonstrativo. COMMIT → o pedido
    //      grava seq 2 e o retry, ao conseguir o demonstrativo, vê a viva nova → 422.
    await t.test("(ii) pedido primeiro", async () => {
      const { tenantId, statementId } = await seedStatement(`ass08-chg3ii-${randomUUID().slice(0, 8)}`);
      const failedId = await seedFailedRow(tenantId, statementId, 1);
      const wRetry = await createEphemeralRole(db, targetUrl);
      const wRequest = await createEphemeralRole(db, targetUrl);
      const holder = await openHolder();
      const inflight: Promise<unknown>[] = [];
      try {
        await holder.query(`SELECT statement_id FROM billing_statement_refs WHERE statement_id = $1::uuid FOR UPDATE`, [statementId]);
        const request = settled(requestChargeCreate({ intents: new PrismaChargeIntentRepository(wRequest.client) }, { tenantId, statementId, provider: "asaas", payload, now: new Date() }));
        inflight.push(request);
        await waitUntil("(ii) o pedido preso no upsert do índice (depois de travar o demonstrativo)", async () => (await lockWaiters([wRequest.roleName])).some((w) => w.blockers.includes(holder.pid)));
        let retrySettled = false;
        const retry = settled(new PrismaOutboxRepository(wRetry.client).retry(tenantId, failedId, new Date())).then((r) => ((retrySettled = true), r));
        inflight.push(retry);
        let retryWaited = false;
        // O retry ESPERA o demonstrativo do pedido (o normal) — ou, sob mutação, já terminou sem esperar: a barreira aceita
        // os dois para que o vermelho seja o fato medido (2 vivas), e não o prazo da barreira.
        await waitUntil("(ii) o retry esperando o demonstrativo travado pelo pedido (ou já resolvido)", async () => {
          if ((await lockWaiters([wRetry.roleName])).length === 1) retryWaited = true;
          return retryWaited || retrySettled;
        });
        await holder.commit();
        const [p, r] = await Promise.all([request, retry]);
        assert.equal(await liveChargeCreates(statementId), 1, "(ii) 1 viva");
        assert.ok(p.ok, `(ii) o pedido sai ok (veio: ${p.ok ? "ok" : describeError(p.error)})`);
        assert.equal((p.value as { idempotencyKey?: string }).idempotencyKey, `charge_create:${statementId}:2`, "(ii) o pedido grava seq 2");
        assert.ok(!r.ok && isUnprocessable("charge_already_exists")(r.error), `(ii) o retry sai 422 charge_already_exists (veio: ${r.ok ? "ok" : describeError(r.error)})`);
        assert.ok(retryWaited, "(ii) o retry esperou o demonstrativo");
        const failed = (await outboxRows([failedId])).get(failedId);
        assert.equal(failed?.status, "FAILED", "(ii) a FAILED não foi reaberta");
      } finally {
        await holder.rollback();
        await Promise.all(inflight);
        await wRetry.drop();
        await wRequest.drop();
      }
    });
  });

  test("T-OBX-db-6 (E6′/E7′/E9, critério 3): ATK-2d e ATK-8 com o repositório Prisma real e papel sem bypass — a cobrança-fantasma do fechamento desfeito nunca é adotada", async () => {
    const role = await createEphemeralRole(db, targetUrl);
    try {
      for (const attack of ["ATK-2d", "ATK-8"] as const) {
        const provider = uniqueProvider(attack === "ATK-2d" ? "db6a" : "db6b");
        const { tenantId, statementId } = await seedStatement(`ass08-db6-${randomUUID().slice(0, 8)}`);
        const intents = new PrismaChargeIntentRepository(role.client);
        const repo = new PrismaOutboxRepository(role.client);
        const port = scriptedPort(provider);
        const t0 = new Date();
        // R0 cria e PERDE a resposta: a fantasma de R$ 100 fica no provedor.
        const r0 = await requestChargeCreate({ intents }, { tenantId, statementId, provider, payload: { amountCents: 10000, dueDate: "2026-11-10", method: "pix" }, now: t0 });
        port.createScript.push("lost");
        await dispatchDb(role.client, provider, port, t0);
        assert.equal(port.stored.length, 1);
        if (attack === "ATK-2d") {
          // … vai a FAILED e o operador dá retry (E9: last_error mantido)
          await repo.markFailed(tenantId, r0.id, "provider_timeout", minutesAfter(t0, 1));
          assert.equal((await repo.retry(tenantId, r0.id, minutesAfter(t0, 1)))?.status, "PENDING");
        }
        // reaberto: o claim relê e pula R0
        await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'reopened', reopened_at = $2 WHERE id = $1::uuid`, statementId, minutesAfter(t0, 2));
        await dispatchDb(role.client, provider, port, minutesAfter(t0, 3));
        assert.equal((await finalRow(r0.id))?.status, "SKIPPED");
        // refechado com R$ 150 → R1
        await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'closed', total_amount = 150 WHERE id = $1::uuid`, statementId);
        const t1 = minutesAfter(t0, 5);
        const r1 = await requestChargeCreate({ intents }, { tenantId, statementId, provider, payload: { amountCents: 15000, dueDate: "2026-11-10", method: "pix" }, now: t1 });
        if (attack === "ATK-2d") {
          port.lookupScript.push("5xx"); // a 1ª reconsulta de R1 falha
          await dispatchDb(role.client, provider, port, t1);
          await dispatchDb(role.client, provider, port, minutesAfter(t1, 2));
          assert.deepEqual(await finalRow(r1.id), { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent", external_id: null }, attack);
        } else {
          await claimAndDieDb(role.client, provider, t1); // o worker de R1 morre depois do claim
          await dispatchDb(role.client, provider, port, afterOrphanCutoff(t1));
          assert.deepEqual(await finalRow(r1.id), { status: "NEEDS_REVIEW", last_error: "orphan_found_previous_intent", external_id: null }, attack);
        }
        assert.equal(port.created.length, 1, `${attack}: só o POST de R0, nunca um 2º`);
      }
    } finally {
      await role.drop();
    }
  });

  test("T-OBX-db-9 (R-CLAIM-CAUDA, §14.4): com N ∈ {26, 20 000} demonstrativos da organização travados e estatística VELHA, UM claimNext alcança a cauda em ≤ 2 000 ms sem esperar trava; as N travadas ficam intactas; depois do COMMIT, o claim pega a mais antiga", async () => {
    // Estatística velha de propósito: ANALYZE com 50 organizações de 2 demonstrativos (uma linha da fila cada) ANTES; a
    // organização grande nasce depois, sem ANALYZE. As 50 não entram em `billing_statement_refs`: o claim não as visita.
    const statsProvider = uniqueProvider("db9stats");
    await db.$executeRawUnsafe(
      `WITH t AS (INSERT INTO tenants (name, slug) SELECT 'ass08-db9-stats-' || g || '-' || $1, 'ass08-db9-stats-' || g || '-' || $1 FROM generate_series(1, 50) g RETURNING id),
            s AS (INSERT INTO subscription_statements
                    (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
                     storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount,
                     users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount, credits_applied_amount, total_amount,
                     due_date, closed_at, snapshot)
                  SELECT t.id, p.period, 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', now(), '{"latest":null,"history":[]}'::jsonb
                    FROM t CROSS JOIN (VALUES ('2026-08'), ('2026-09')) AS p(period)
                  RETURNING id, tenant_id)
       INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status)
       SELECT s.tenant_id, s.id, 'charge_create', $2, 'charge_create:' || s.id::text || ':1', gen_random_uuid(), '{}'::jsonb, now(), 'SENT' FROM s`,
      randomUUID().slice(0, 8),
      statsProvider,
    );
    await db.$executeRawUnsafe(`ANALYZE subscription_statements`);
    await db.$executeRawUnsafe(`ANALYZE billing_outbox`);
    // A estatística velha tem de FICAR velha: sem isto o autovacuum pode reanalisar as tabelas no meio do teste (o
    // `autoanalyze` dispara depois da semeadura grande) e o vermelho da M5h vira sorteio (medido: verde 1× em 3). Base
    // própria deste arquivo, descartada no `after`.
    await db.$executeRawUnsafe(`ALTER TABLE subscription_statements SET (autovacuum_enabled = off)`);
    await db.$executeRawUnsafe(`ALTER TABLE billing_outbox SET (autovacuum_enabled = off)`);

    for (const N of [26, 20_000]) {
      const provider = uniqueProvider(`db9n${N}`);
      const { tenantId } = await seedStatement(`ass08-db9-${N}-${randomUUID().slice(0, 8)}`, { period: "1700-01" }); // âncora da organização (com refs)
      // N + 1 demonstrativos por conjunto; uma charge_create PENDING em cada, `occurred_at` crescente pela ordem do período.
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_statements
           (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
            storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount,
            users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount, credits_applied_amount, total_amount,
            due_date, closed_at, snapshot)
         SELECT $1::uuid, to_char(date '1800-01-01' + (g - 1) * interval '1 month', 'YYYY-MM'), 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0,
                31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', now(), '{"latest":null,"history":[]}'::jsonb
           FROM generate_series(1, $2::int) AS g`,
        tenantId,
        N + 1,
      );
      await db.$executeRawUnsafe(
        `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at, status, attempts)
         SELECT s.tenant_id, s.id, 'charge_create', $2, 'charge_create:' || s.id::text || ':1', gen_random_uuid(),
                '{"amountCents":10000,"dueDate":"2026-11-10","method":"pix"}'::jsonb,
                timestamp '2026-01-01' + row_number() OVER (ORDER BY s.period) * interval '1 millisecond', now(), now(), 'PENDING', 0
           FROM subscription_statements s WHERE s.tenant_id = $1::uuid AND s.period <> '1700-01'`,
        tenantId,
        provider,
      );
      const ordered = ((await db.$queryRawUnsafe(
        `SELECT o.id AS row_id, o.statement_id FROM billing_outbox o WHERE o.tenant_id = $1::uuid AND o.provider = $2 ORDER BY o.occurred_at, o.id`,
        tenantId,
        provider,
      )) as Array<{ row_id: string; statement_id: string }>);
      assert.equal(ordered.length, N + 1);
      const locked = ordered.slice(0, N);
      const tail = ordered[N]!;

      const role = await createEphemeralRole(db, targetUrl);
      const holder = await openHolder();
      try {
        const attrs = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
        assert.deepEqual(attrs[0], { rolsuper: false, rolbypassrls: false }, "o claim roda em papel sem superusuário e sem bypass de RLS");
        await holder.query(`SELECT id FROM subscription_statements WHERE id = ANY($1::uuid[]) FOR UPDATE`, [locked.map((row) => row.statement_id)]);
        const repo = new PrismaOutboxRepository(role.client);
        // amostrador paralelo: as sessões do papel do claim esperando trava, até o claim voltar
        let running = true;
        let samples = 0;
        let waitingSamples = 0;
        const sampler = (async () => {
          while (running) {
            const rows = (await db.$queryRawUnsafe(
              `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND usename = $1 AND wait_event_type = 'Lock'`,
              role.roleName,
            )) as Array<{ n: number }>;
            samples += 1;
            if (rows[0]!.n > 0) waitingSamples += 1;
          }
        })();
        const started = Date.now();
        let outcome: { ok: boolean; value?: ClaimResult | null; error?: unknown };
        try {
          outcome = { ok: true, value: await repo.claimNext(claimParamsFor(provider, `w-db9-${N}`)) };
        } catch (error) {
          outcome = { ok: false, error };
        }
        const elapsed = Date.now() - started;
        running = false;
        await sampler;
        assert.ok(outcome.ok, `N = ${N}: o claim terminou sem erro (veio: ${outcome.ok ? "ok" : describeError(outcome.error)} em ${elapsed} ms)`);
        assert.equal(outcome.value?.kind, "claimed", `N = ${N}: UM claim reclama a linha livre da cauda`);
        assert.equal(outcome.value?.row.id, tail.row_id, `N = ${N}: a candidata livre mais antiga é a da cauda`);
        assert.ok(elapsed <= 2_000, `N = ${N}: o claim alcançou a cauda em ${elapsed} ms (teto 2 000)`);
        assert.ok(samples > 0, "o amostrador mediu");
        assert.equal(waitingSamples, 0, `N = ${N}: ${waitingSamples} de ${samples} amostras com o claim esperando trava`);
        const intact = (await db.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM billing_outbox WHERE id = ANY($1::uuid[]) AND status = 'PENDING' AND attempts = 0 AND claimed_at IS NULL`,
          locked.map((row) => row.row_id),
        )) as Array<{ n: number }>;
        assert.equal(intact[0]!.n, N, `N = ${N}: as ${N} travadas ficam intactas`);
        await holder.commit();
        const afterCommit = await repo.claimNext(claimParamsFor(provider, `w-db9-${N}-after`));
        assert.equal(afterCommit?.kind, "claimed");
        assert.equal(afterCommit?.row.id, locked[0]!.row_id, `N = ${N}: depois do COMMIT o claim pega a mais antiga`);
      } finally {
        await holder.rollback();
        await role.drop();
      }
    }
  });
}
