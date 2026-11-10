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
import { oneLine, recordingClient } from "./helpers/lock-order-recorder.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { chargeCreateClaimVerdict } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
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
}
