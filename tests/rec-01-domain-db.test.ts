import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-PATIO-REC-01 F4 — o BANCO da cobrança on-line da taxa de pátio (plano v3 §4.1, §4.2, §4.8, §7 M-REC-1/M-REC-2; emenda §3.1
// F4, §6.2.2, §8.2.5, §10.1). Ambiente [DB]: Postgres descartável migrado. Semeadura e limpeza pela conexão administrativa
// (superusuário, como no CI), escopadas pelas organizações desta rodada; as leituras de RLS sob o papel efêmero do arnês
// (NOSUPERUSER NOBYPASSRLS). Sem DATABASE_URL a suíte se declara pulada (no job `backend-postgres` isso derruba o job).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

function errorFacts(error: unknown): { sqlState?: string; constraint?: string } {
  const states: string[] = [];
  let constraint: string | undefined;
  const walk = (value: unknown, depth: number) => {
    if (depth > 6 || typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    for (const key of ["originalCode", "code"]) {
      const code = record[key];
      if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) && !code.startsWith("P")) states.push(code);
    }
    if (typeof record.constraint === "string") constraint ??= record.constraint;
    for (const key of ["cause", "meta", "driverAdapterError"]) walk(record[key], depth + 1);
  };
  walk(error, 0);
  const text = error instanceof Error ? error.message : String(error);
  constraint ??= /constraint "([^"]+)"/.exec(text)?.[1] ?? /constraint: Some\("?([a-z_]+)"?\)/.exec(text)?.[1];
  const fields = (error as { meta?: { target?: unknown; constraint?: unknown } })?.meta;
  if (!constraint && typeof fields?.constraint === "string") constraint = fields.constraint;
  return { sqlState: states[0] ?? /\b(2[0-9A-Z]{4})\b/.exec(text)?.[1], constraint };
}

async function expectViolation(promise: Promise<unknown>, sqlState: string, constraint: string, label: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const facts = errorFacts(error);
    assert.equal(facts.sqlState, sqlState, `${label}: SQLSTATE (${error instanceof Error ? error.message.slice(0, 300) : String(error)})`);
    assert.equal(facts.constraint, constraint, `${label}: restrição`);
    return;
  }
  assert.fail(`${label}: expected ${sqlState} ${constraint}, got insert ok`);
}

if (!connectionString) {
  test("B-PATIO-REC-01 rec-01-domain-db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, rls, prismaRepo, service] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/impound-payments/impound-payment-prisma.repository.js"),
      import("../src/modules/impound-payments/impound-payment.service.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, rls, prismaRepo, service, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      const ids = [...h.tenants];
      if (ids.length > 0) {
        for (const table of ["impound_payment_refs", "impound_payment_intents", "impound_processes", "jurisdiction_profiles"]) {
          await h.admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, ids);
        }
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // ---------------------------------------------------------------- semeadura (conexão administrativa)
  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `rec01-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function newProcess(h: Harness, tenantId: string): Promise<string> {
    return h.rls.withTenantRls(h.admin, tenantId, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, ${`Perfil ${randomUUID().slice(0, 8)}`}, 'PUBLIC_AGREEMENT') RETURNING id
      `;
      const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${tenantId}::uuid, ${profile!.id}::uuid, 'Autoridade', true, 'Placa ilegível', 'RELEASE_IN_PROGRESS', now() - interval '3 days', now(), 0, NULL)
        RETURNING id
      `;
      return proc!.id;
    });
  }

  type IntentRow = {
    status?: string;
    cancel_reason?: string | null;
    amount?: string;
    paid?: string;
    applied?: string;
    held?: string;
    held_reason?: string | null;
    refunded?: string;
    payment_connection_id?: string | null;
    payment_group_id?: string | null;
    payment_group_connection_id?: string | null;
  };

  function insertIntent(client: PrismaClient | Prisma.TransactionClient, tenantId: string, processId: string, row: IntentRow = {}): Promise<Array<{ id: string; account_scope: string }>> {
    const hasAccount = "payment_connection_id" in row || "payment_group_id" in row || "payment_group_connection_id" in row;
    return client.$queryRawUnsafe<Array<{ id: string; account_scope: string }>>(
      `INSERT INTO impound_payment_intents
         (tenant_id, process_id, status, cancel_reason, amount, paid_amount, applied_amount, held_amount, held_reason, refunded_amount,
          methods, payer_name, payer_document, provider, payment_connection_id, payment_group_id, payment_group_connection_id, expires_at, settled_charge_ids)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric, $9, $10::numeric,
          ARRAY['pix','credit_card','debit_card']::text[], 'Maria', '52998224725', 'asaas', $11::uuid, $12::uuid, $13::uuid, now() + interval '1 day', '{}'::uuid[])
       RETURNING id, account_scope`,
      tenantId,
      processId,
      row.status ?? "pending",
      row.cancel_reason ?? null,
      row.amount ?? "350.00",
      row.paid ?? "0",
      row.applied ?? "0",
      row.held ?? "0",
      row.held_reason ?? null,
      row.refunded ?? "0",
      hasAccount ? (row.payment_connection_id ?? null) : randomUUID(),
      row.payment_group_id ?? null,
      row.payment_group_connection_id ?? null,
    );
  }

  function insertRef(client: PrismaClient, tenantId: string, columns: { connection?: string | null; group?: string | null; groupConnection?: string | null }) {
    return client.$executeRawUnsafe(
      `INSERT INTO impound_payment_refs (intent_id, tenant_id, provider, payment_connection_id, payment_group_id, payment_group_connection_id)
       VALUES ($1::uuid, $2::uuid, 'asaas', $3::uuid, $4::uuid, $5::uuid)`,
      randomUUID(),
      tenantId,
      columns.connection ?? null,
      columns.group ?? null,
      columns.groupConnection ?? null,
    );
  }

  test("T-DOM-db-1 · UNIQUE do link aberto: 2 criações concorrentes no mesmo processo → uma dá 23505; cancel_requested também segura", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db1");
    const processId = await newProcess(h, tenantId);
    const results = await Promise.allSettled([insertIntent(h.admin, tenantId, processId), insertIntent(h.admin, tenantId, processId)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1, "exatamente uma criação concorrente vence");
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    assert.deepEqual(errorFacts(rejected.reason), { sqlState: "23505", constraint: "impound_payment_intents_live_link_key" });

    const other = await newProcess(h, tenantId);
    await insertIntent(h.admin, tenantId, other, { status: "cancel_requested", cancel_reason: "cancel" });
    await expectViolation(insertIntent(h.admin, tenantId, other), "23505", "impound_payment_intents_live_link_key", "pending com irmã em cancel_requested");
  });

  test("T-DOM-db-6 · F-1: com a irmã pending, a anterior vai de cancelled a funds_held e de settled a disputed (commit, sem 23505)", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db6");
    const processId = await newProcess(h, tenantId);
    const [cancelled] = await insertIntent(h.admin, tenantId, processId, { status: "cancelled", cancel_reason: "cancel" });
    const [settled] = await insertIntent(h.admin, tenantId, processId, { status: "settled", paid: "350.00", applied: "350.00" });
    await insertIntent(h.admin, tenantId, processId, { status: "pending" });

    const toHeld = await h.admin.$executeRawUnsafe(
      `UPDATE impound_payment_intents SET status = 'funds_held', paid_amount = 350.00, held_amount = 350.00, held_reason = 'paid_after_cancel'
        WHERE tenant_id = $1::uuid AND id = $2::uuid`,
      tenantId,
      cancelled!.id,
    );
    assert.equal(toHeld, 1, "expected commit, got 23505 (cancelled → funds_held)");
    const toDisputed = await h.admin.$executeRawUnsafe(
      `UPDATE impound_payment_intents SET status = 'disputed', applied_amount = 0, held_amount = 350.00, held_reason = 'chargeback_disputed'
        WHERE tenant_id = $1::uuid AND id = $2::uuid`,
      tenantId,
      settled!.id,
    );
    assert.equal(toDisputed, 1, "expected commit, got 23505 (settled → disputed)");
  });

  test("T-DOM-db-2 · RLS ENABLE + FORCE: sob o papel sem bypass, outra organização vê 0 linha e recebe 404", async () => {
    const h = await harness();
    const [catalog] = await h.admin.$queryRawUnsafe<Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean; policies: number }>>(
      `SELECT c.relrowsecurity, c.relforcerowsecurity,
              (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = 'impound_payment_intents' AND p.policyname = 'impound_payment_intents_tenant_isolation') AS policies
         FROM pg_class c WHERE c.oid = 'public.impound_payment_intents'::regclass`,
    );
    assert.deepEqual(catalog, { relrowsecurity: true, relforcerowsecurity: true, policies: 1 });

    const tenantA = await newTenant(h, "db2a");
    const tenantB = await newTenant(h, "db2b");
    const processA = await newProcess(h, tenantA);
    const [intentA] = await insertIntent(h.admin, tenantA, processA);
    const roleClient = h.role.client as PrismaClient;

    const seenByB = await h.rls.withTenantRls(roleClient, tenantB, (tx) =>
      tx.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM impound_payment_intents WHERE id = $1::uuid`, intentA!.id),
    );
    assert.equal(seenByB[0]!.n, 0, "a política deixou B ver a cobrança de A");
    const seenByA = await h.rls.withTenantRls(roleClient, tenantA, (tx) =>
      tx.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM impound_payment_intents WHERE id = $1::uuid`, intentA!.id),
    );
    assert.equal(seenByA[0]!.n, 1, "controle: A vê a própria cobrança sob o papel sem bypass");

    const service = new h.service.ImpoundPaymentService(new h.prismaRepo.RlsPrismaImpoundPaymentRepository(roleClient));
    await assert.rejects(service.list({ tenantId: tenantB }, processA), (error: unknown) => (error as { statusCode?: number }).statusCode === 404);
    // A política recusa a escrita com 42501 (new row violates row-level security policy).
    let writeOutcome = "insert ok";
    try {
      await h.rls.withTenantRls(roleClient, tenantB, (tx) => insertIntent(tx, tenantA, processA, { status: "cancelled", cancel_reason: "cancel" }));
    } catch (error) {
      writeOutcome = errorFacts(error).sqlState ?? "erro sem SQLSTATE";
    }
    assert.equal(writeOutcome, "42501", "B gravou linha com o tenant_id de A");
  });

  test("T-DOM-db-5 · CHECKs de dinheiro: identidade, estado × dinheiro e motivo do retido → 23514", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db5");
    const processId = await newProcess(h, tenantId);
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { status: "funds_held", paid: "200.00", held: "100.00", held_reason: "amount_short" }),
      "23514",
      "impound_payment_intents_money_identity_chk",
      "paid ≠ applied + held + refunded",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { status: "cancelled", cancel_reason: "cancel", paid: "10.00", held: "10.00", held_reason: "overpayment" }),
      "23514",
      "impound_payment_intents_open_states_money_chk",
      "cancelled com dinheiro retido",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { status: "funds_held", paid: "100.00", held: "100.00" }),
      "23514",
      "impound_payment_intents_held_reason_pair_chk",
      "retido sem motivo",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { status: "settled", paid: "400.00", applied: "350.00", held: "50.00", held_reason: "amount_short" }),
      "23514",
      "impound_payment_intents_settled_money_chk",
      "settled com motivo que não é excedente nem dobro",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { status: "reversed", cancel_reason: null }),
      "23514",
      "impound_payment_intents_reversed_money_chk",
      "reversed sem dinheiro devolvido",
    );
    const [ok] = await insertIntent(h.admin, tenantId, processId, { status: "funds_held", paid: "200.00", held: "200.00", held_reason: "amount_short" });
    assert.ok(ok?.id, "controle positivo: linha coerente entra");
  });

  test("T-DOM-db-7 · conta: exatamente uma conexão (própria XOR do grupo), grupo junto da conexão de grupo; o mesmo na referência", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db7");
    const processId = await newProcess(h, tenantId);
    const statuses = { status: "cancelled", cancel_reason: "cancel" };
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { ...statuses, payment_connection_id: null, payment_group_id: null, payment_group_connection_id: null }),
      "23514",
      "impound_payment_intents_one_connection_chk",
      "as duas conexões nulas",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { ...statuses, payment_connection_id: randomUUID(), payment_group_id: randomUUID(), payment_group_connection_id: randomUUID() }),
      "23514",
      "impound_payment_intents_one_connection_chk",
      "as duas conexões preenchidas",
    );
    await expectViolation(
      insertIntent(h.admin, tenantId, processId, { ...statuses, payment_connection_id: randomUUID(), payment_group_id: randomUUID() }),
      "23514",
      "impound_payment_intents_group_pair_chk",
      "grupo sem conexão de grupo",
    );
    const [own] = await insertIntent(h.admin, tenantId, processId, { ...statuses, payment_connection_id: randomUUID() });
    const [group] = await insertIntent(h.admin, tenantId, processId, { ...statuses, payment_group_id: randomUUID(), payment_group_connection_id: randomUUID() });
    assert.equal(own?.account_scope, "organization");
    assert.equal(group?.account_scope, "group");

    await expectViolation(insertRef(h.admin, tenantId, {}), "23514", "impound_payment_refs_one_connection_chk", "referência sem conexão");
    await expectViolation(
      insertRef(h.admin, tenantId, { connection: randomUUID(), group: randomUUID(), groupConnection: randomUUID() }),
      "23514",
      "impound_payment_refs_one_connection_chk",
      "referência com as duas conexões",
    );
    await expectViolation(
      insertRef(h.admin, tenantId, { connection: randomUUID(), group: randomUUID() }),
      "23514",
      "impound_payment_refs_group_pair_chk",
      "referência com grupo e sem conexão de grupo",
    );
    assert.equal(await insertRef(h.admin, tenantId, { group: randomUUID(), groupConnection: randomUUID() }), 1, "controle positivo da referência");
  });

  test("T-DOM-db-8 · emenda §11.1: reais no banco ↔ centavos na app — 123.45 ida e volta exata pelo repositório", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db8");
    const processId = await newProcess(h, tenantId);
    const [read] = await insertIntent(h.admin, tenantId, processId, { status: "funds_held", amount: "350.00", paid: "123.45", held: "123.45", held_reason: "amount_short" });
    const repository = new h.prismaRepo.RlsPrismaImpoundPaymentRepository(h.admin);
    const found = await repository.findById(tenantId, read!.id);
    assert.equal(found?.paidCents, 12_345, `expected 12345, got ${found?.paidCents}`);
    assert.equal(found?.heldCents, 12_345);
    assert.equal(found?.amountCents, 35_000);

    const other = await newProcess(h, tenantId);
    const written = await h.rls.withTenantRls(h.admin, tenantId, (tx) =>
      new h.prismaRepo.PrismaImpoundPaymentRepository(tx).insertIntent({
        tenantId,
        processId: other,
        amountCents: 12_345,
        currency: "BRL",
        methods: ["pix", "credit_card", "debit_card"],
        payerName: "Maria",
        payerDocument: "52998224725",
        provider: "asaas",
        account: { scope: "organization", connectionId: randomUUID() },
        expiresAt: new Date(Date.now() + 86_400_000),
        occurredAt: new Date(),
      }),
    );
    const [stored] = await h.admin.$queryRawUnsafe<Array<{ amount: string }>>(
      `SELECT amount::text AS amount FROM impound_payment_intents WHERE tenant_id = $1::uuid AND id = $2::uuid`,
      tenantId,
      written.id,
    );
    assert.equal(stored?.amount, "123.45", "centavos gravados como reais");
    assert.equal(written.amountCents, 12_345);
  });

  test("T-ISO-db-1 · R-ISO como SUPERUSUÁRIO (a RLS não age): processo de B pelo ator de A → 404; a lista e a busca só trazem A", async () => {
    const h = await harness();
    const [who] = await h.admin.$queryRawUnsafe<Array<{ privileged: boolean }>>(
      `SELECT (rolsuper OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user`,
    );
    assert.equal(who?.privileged, true, "o T-ISO-db-1 tem de rodar com a RLS ignorada, senão prova a RLS e não a aplicação");

    const tenantA = await newTenant(h, "isoa");
    const tenantB = await newTenant(h, "isob");
    const processA = await newProcess(h, tenantA);
    const processB = await newProcess(h, tenantB);
    const [intentA] = await insertIntent(h.admin, tenantA, processA, { status: "cancelled", cancel_reason: "cancel" });
    const [intentB] = await insertIntent(h.admin, tenantB, processB, { status: "cancelled", cancel_reason: "cancel" });

    const repository = new h.prismaRepo.RlsPrismaImpoundPaymentRepository(h.admin);
    const service = new h.service.ImpoundPaymentService(repository);
    await assert.rejects(service.list({ tenantId: tenantA }, processB), (error: unknown) => (error as { statusCode?: number }).statusCode === 404, "expected 404, got 200");
    assert.deepEqual(await repository.listByProcess(tenantA, processB), [], "listByProcess trouxe a cobrança de B para A");
    assert.equal(await repository.findById(tenantA, intentB!.id), undefined, "findById trouxe a cobrança de B para A");
    assert.equal(await repository.findLiveByProcess(tenantA, processB), undefined);
    const own = await service.list({ tenantId: tenantA }, processA);
    assert.deepEqual(own.map((intent) => [intent.id, intent.tenantId]), [[intentA!.id, tenantA]]);
  });
}
