// B-ASS-08c1a · CA-1 e CA-2 (plano v2 §3.4; Emenda 1, R2-13): a posse (lease) em TODA escrita do despacho, provada no
// Postgres 16 sob papel efêmero NOSUPERUSER NOBYPASSRLS e pelo despacho real — não pela forma do código.
//   L1  (PROBE-L1) o worker atrasado não tira a linha de NEEDS_REVIEW nem de SKIPPED. Vermelho-controle: M1
//       (`[LEASE-01]` volta a `where: { id }`) → NEEDS_REVIEW vira SENT.
//   L1b dois workers com `claimedBy` distintos e o mesmo `attempt_started_at` forjado: o atrasado não escreve; e dois
//       PROCESSOS têm `claimedBy` padrão distintos. Vermelho-controle: M-A8 (`claimedBy` fixo).
//   L1c (R2-13) o instante da posse só nasce do `now` do claim (JS, milissegundo): nenhum escritor de `src/**` grava
//       `attempt_started_at` pelo relógio do SQL (microssegundo), que deixaria o registro preso — o caso preso é medido aqui.
//   L2  escrita com 0 linhas não lança: o despacho devolve `lease_lost` e grava a trilha.
//   L3  posse tomada antes do `createCharge` → 0 POST. Vermelho-controle: M2 (apagar a linha `[LEASE-02]`) → 1 POST.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { chargeCreateClaimVerdict, runDispatchOutbox, type DispatchAuditEvent } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { leaseOf } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import type { PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T0 = new Date("2026-11-13T12:00:00.123Z");
const PROVIDER = "asaas";

/** Todo `.ts` de `src/**`, para o censo do L1c. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Porta de pagamento falsa, com ganchos por método; nenhum host real. */
function fakePort(hooks: Partial<Pick<PaymentProviderPort, "createCharge" | "listChargesByExternalReference">> = {}): PaymentProviderPort & { readonly calls: { create: number } } {
  const calls = { create: 0 };
  return {
    calls,
    ensureCustomer: async () => ({ customerId: "customer-fake" }),
    createCharge: async (input) => {
      calls.create += 1;
      return hooks.createCharge ? hooks.createCharge(input) : { chargeId: `charge-fake-${calls.create}`, status: "pending" };
    },
    listChargesByExternalReference: async (ref) => (hooks.listChargesByExternalReference ? hooks.listChargesByExternalReference(ref) : []),
    getCharge: async () => ({ status: "pending", raw: {} }),
    cancelCharge: async (chargeId) => ({ chargeId, status: "cancelled" }),
    refund: async (chargeId) => ({ chargeId, status: "refunded" }),
    registerWebhook: async () => ({ manual: true }),
    verifyWebhook: async () => ({ ok: false }),
    supportedMethods: () => ["pix"],
    describe: () => ({ provider: PROVIDER, supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "manual" }),
  };
}

test("L1b (processos): dois processos do despacho nascem com `claimedBy` padrão distintos [CLAIMED-BY]", () => {
  // Cada filho é um processo Node novo: o `claimedBy` padrão sai do módulo do despacho, sem injeção. O repositório em
  // memória basta aqui (a propriedade é do despacho, não do banco).
  const child = `
    const { pathToFileURL } = await import("node:url");
    const root = process.env.L1B_ROOT;
    const d = await import(pathToFileURL(root + "/src/modules/subscription-billing/outbox/outbox.dispatcher.ts").href);
    const r = await import(pathToFileURL(root + "/src/modules/subscription-billing/outbox/outbox.repository.ts").href);
    const repo = new r.InMemoryOutboxRepository({ readStatement: async () => ({ status: "closed", reopenedAt: null, hasLiveCharge: false, totalCents: 100 }) });
    const { row } = await repo.enqueue({ tenantId: "t", statementId: "s", kind: "charge_create", provider: "fake", seq: 1, payload: { amountCents: 100 } }, new Date());
    let seen = null;
    const port = {
      ensureCustomer: async () => ({ customerId: "c" }),
      listChargesByExternalReference: async () => { seen = (await repo.findById("t", row.id)).claimedBy; return []; },
      createCharge: async () => ({ chargeId: "c1", status: "pending" }),
      getCharge: async () => ({ status: "pending", raw: {} }),
    };
    await d.runDispatchOutbox({ repo, ports: { fake: port }, resolveCustomer: async () => ({ ok: true, customerId: "c" }) });
    process.stdout.write(String(seen));
  `;
  const run = () => execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", child], { cwd: ROOT, env: { ...process.env, L1B_ROOT: ROOT }, encoding: "utf8" }).trim();
  const first = run();
  const second = run();
  assert.match(first, /^dispatch-outbox:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.match(second, /^dispatch-outbox:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(first, second, "dois processos nunca compartilham a mesma posse nominal");
});

test("L1c (censo): nenhum escritor de `src/**` grava `attempt_started_at` pelo relógio do SQL", () => {
  const offenders: string[] = [];
  let sqlWriters = 0;
  for (const file of sourceFiles(path.join(ROOT, "src"))) {
    const text = readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    // SQL: `attempt_started_at = <rhs>` (escrita no SET ou igualdade no WHERE) — só parâmetro JS (`$n`) ou NULL.
    for (const match of text.matchAll(/attempt_started_at\s*=\s*([^\s,)]+)/g)) {
      sqlWriters += 1;
      if (!/^(\$\d+(::[a-z]+)?|NULL)$/i.test(match[1]!)) offenders.push(`${rel}: attempt_started_at = ${match[1]}`);
    }
    // Prisma: `attempt_started_at: <rhs>` — só `null` (a soltura) ou a posse apresentada (`lease.attemptStartedAt`).
    for (const match of text.matchAll(/attempt_started_at:\s*([^,}\n]+)/g)) {
      const rhs = match[1]!.trim();
      if (/^[A-Z]\w*(\s*\|\s*null)?;$/.test(rhs)) continue; // anotação de tipo da linha crua (`Date | null;`), não escrita
      if (rhs !== "null" && rhs !== "lease.attemptStartedAt") offenders.push(`${rel}: attempt_started_at: ${rhs}`);
    }
  }
  assert.ok(sqlWriters >= 1, "o censo alcançou o claim (o escritor que existe)");
  assert.deepEqual(offenders, []);
});

if (!connectionString) {
  test("B-ASS-08c1a · lease no banco exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";

  type Seeded = { tenantId: string; statementId: string; outboxId: string };

  async function seedPending(tag: string): Promise<Seeded> {
    const slug = `ass08c-lease-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`, `Organização fictícia ${tag}`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra,
          storage_included_gb, storage_peak_gb, storage_extra_gb, tracked_vehicles,
          days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount,
          users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 30,30, 0,0,
               123.45,0,0,0,0,0,123.45, '2026-11-20', $2, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      T0,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(
      `INSERT INTO billing_statement_refs (statement_id, tenant_id, provider, created_at) VALUES ($1::uuid, $2::uuid, $3, $4)`,
      statementId,
      tenantId,
      PROVIDER,
      T0,
    );
    const outboxId = ((await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox
         (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key,
          payload, status, attempts, occurred_at, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $3, $4, gen_random_uuid(),
               '{"amountCents":12345,"dueDate":"2026-11-20","method":"pix"}'::jsonb, 'PENDING', 0, $5, $5, $5)
       RETURNING id`,
      tenantId,
      statementId,
      PROVIDER,
      `charge_create:${statementId}:1`,
      T0,
    )) as Array<{ id: string }>)[0]!.id;
    return { tenantId, statementId, outboxId };
  }

  async function stored(id: string): Promise<{ status: string; claimed_by: string | null; last_error: string | null; skip_reason: string | null; external_id: string | null }> {
    const rows = (await db.$queryRawUnsafe(`SELECT status, claimed_by, last_error, skip_reason, external_id FROM billing_outbox WHERE id = $1::uuid`, id)) as any[];
    return rows[0];
  }

  async function steal(id: string): Promise<void> {
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET claimed_by = 'dispatch-outbox:ladrao' WHERE id = $1::uuid`, id);
  }

  function claimParams(now: Date, claimedBy: string) {
    return { enabledProviders: [PROVIDER], now, claimedBy, orphanMs: OUTBOX_ORPHAN_MS, verdict: chargeCreateClaimVerdict } as const;
  }

  after(async () => {
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("setup: base própria migrada e papel NOSUPERUSER NOBYPASSRLS", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08c_lease_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });
  });

  test("L1 (PROBE-L1): o worker atrasado não tira a linha de NEEDS_REVIEW nem de SKIPPED [LEASE-01]", async () => {
    for (const terminal of ["NEEDS_REVIEW", "SKIPPED"] as const) {
      const seeded = await seedPending(`l1-${terminal.toLowerCase()}`);
      const repo = new PrismaOutboxRepository(role.client, { tenantIds: [seeded.tenantId] });
      // A reclama e dorme; passa o limite de órfã; B reclama a órfã e a leva ao estado terminal.
      const a = await repo.claimNext(claimParams(T0, "dispatch-outbox:A"));
      assert.equal(a?.kind, "claimed");
      const b = await repo.claimNext(claimParams(new Date(T0.getTime() + OUTBOX_ORPHAN_MS + 1), "dispatch-outbox:B"));
      assert.equal(b?.kind === "claimed" && b.wasOrphan, true, "B reclamou a órfã de A");
      const leaseA = leaseOf(a!.row);
      const leaseB = leaseOf(b!.row);
      const later = new Date(T0.getTime() + OUTBOX_ORPHAN_MS + 2);
      if (terminal === "NEEDS_REVIEW") assert.equal(await repo.markNeedsReview(seeded.tenantId, seeded.outboxId, "orphan_recovery_not_found", later, leaseB), true);
      else assert.equal(await repo.markSkipped(seeded.tenantId, seeded.outboxId, "statement_paid", later, leaseB), true);
      const before = await stored(seeded.outboxId);
      // A acorda e tenta todas as escritas do despacho com a posse velha: nenhuma escreve, nenhuma lança.
      assert.equal(await repo.markSent(seeded.tenantId, seeded.outboxId, "charge-fake-atrasada", later, leaseA), false);
      assert.equal(await repo.reschedule(seeded.tenantId, seeded.outboxId, later, "provider_timeout", later, leaseA), false);
      assert.equal(await repo.markFailed(seeded.tenantId, seeded.outboxId, "provider_timeout", later, leaseA), false);
      assert.equal(await repo.markNeedsReview(seeded.tenantId, seeded.outboxId, "atrasada", later, leaseA), false);
      assert.equal(await repo.markSkipped(seeded.tenantId, seeded.outboxId, "statement_cancelled", later, leaseA), false);
      assert.deepEqual(await stored(seeded.outboxId), before, `${terminal}: a linha não mudou`);
      assert.equal(before.status, terminal);
      assert.equal(before.external_id, null);
    }
  });

  test("L1b (banco): `claimedBy` distinto com o mesmo `attempt_started_at` forjado não escreve", async () => {
    const seeded = await seedPending("l1b");
    const repo = new PrismaOutboxRepository(role.client, { tenantIds: [seeded.tenantId] });
    const b = await repo.claimNext(claimParams(T0, "dispatch-outbox:B"));
    assert.equal(b?.kind, "claimed");
    const forged = { claimedBy: "dispatch-outbox:A", attemptStartedAt: leaseOf(b!.row).attemptStartedAt };
    assert.equal(await repo.markSent(seeded.tenantId, seeded.outboxId, "charge-fake-forjada", T0, forged), false);
    assert.equal(await repo.confirmLease(seeded.tenantId, seeded.outboxId, forged), false);
    assert.deepEqual(await stored(seeded.outboxId), { status: "PROCESSING", claimed_by: "dispatch-outbox:B", last_error: null, skip_reason: null, external_id: null });
    assert.equal(await repo.markSent(seeded.tenantId, seeded.outboxId, "charge-fake-b", T0, leaseOf(b!.row)), true, "a posse verdadeira escreve");
  });

  test("L1c (banco): a posse do claim volta igual do banco; o relógio do SQL (µs) deixaria o registro preso", async () => {
    const seeded = await seedPending("l1c");
    const repo = new PrismaOutboxRepository(role.client, { tenantIds: [seeded.tenantId] });
    const claimed = await repo.claimNext(claimParams(T0, "dispatch-outbox:C"));
    assert.equal(claimed?.kind, "claimed");
    const reread = await repo.findById(seeded.tenantId, seeded.outboxId);
    assert.equal(reread?.attemptStartedAt?.getTime(), T0.getTime(), "o milissegundo do now do claim volta intacto");
    assert.equal(await repo.confirmLease(seeded.tenantId, seeded.outboxId, leaseOf(reread!)), true);
    // O caso que o censo impede: um escritor com o relógio do SQL grava microssegundos que o `Date` do JS não carrega.
    await db.$executeRawUnsafe(`UPDATE billing_outbox SET attempt_started_at = '2026-11-13 12:00:00.123456+00' WHERE id = $1::uuid`, seeded.outboxId);
    const micro = await repo.findById(seeded.tenantId, seeded.outboxId);
    assert.equal(await repo.markSent(seeded.tenantId, seeded.outboxId, "charge-fake-presa", T0, leaseOf(micro!)), false, "com µs a posse relida não casa");
  });

  test("L2: escrita com 0 linhas não lança; o despacho devolve lease_lost e grava a trilha", async () => {
    const seeded = await seedPending("l2");
    const audits: DispatchAuditEvent[] = [];
    const port = fakePort();
    const run = await runDispatchOutbox({
      repo: new PrismaOutboxRepository(role.client, { tenantIds: [seeded.tenantId] }),
      ports: { [PROVIDER]: port },
      // O perfil incompleto manda a linha à revisão; antes disso outro worker tomou a posse.
      resolveCustomer: async () => {
        await steal(seeded.outboxId);
        return { ok: false as const, missing: ["document"] };
      },
      now: () => T0,
      onAudit: async (event) => void audits.push(event),
    });
    assert.equal(run.outcomes.lease_lost, 1, JSON.stringify(run));
    assert.deepEqual(audits.map((event) => `${event.action}:${event.code}`), ["billing_outbox.lease_lost:lease_lost"]);
    assert.deepEqual(await stored(seeded.outboxId), { status: "PROCESSING", claimed_by: "dispatch-outbox:ladrao", last_error: null, skip_reason: null, external_id: null });
    assert.equal(port.calls.create, 0);
  });

  test("L3: posse tomada antes do createCharge → 0 POST [LEASE-02]", async () => {
    const seeded = await seedPending("l3");
    const audits: DispatchAuditEvent[] = [];
    const port = fakePort({
      // A reconsulta (sempre antes de criar) não acha nada; enquanto isso, outro worker tomou a posse.
      listChargesByExternalReference: async () => {
        await steal(seeded.outboxId);
        return [];
      },
    });
    const run = await runDispatchOutbox({
      repo: new PrismaOutboxRepository(role.client, { tenantIds: [seeded.tenantId] }),
      ports: { [PROVIDER]: port },
      resolveCustomer: async () => ({ ok: true as const, customerId: "customer-fake" }),
      now: () => T0,
      onAudit: async (event) => void audits.push(event),
    });
    assert.equal(port.calls.create, 0, "nenhum POST /payments com a posse perdida");
    assert.equal(run.outcomes.lease_lost, 1, JSON.stringify(run));
    assert.deepEqual(audits.map((event) => event.action), ["billing_outbox.lease_lost"]);
    const after = await stored(seeded.outboxId);
    assert.deepEqual([after.status, after.claimed_by, after.external_id], ["PROCESSING", "dispatch-outbox:ladrao", null]);
  });
}
