import assert from "node:assert/strict";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, paymentPort, source } from "./helpers/ass-08c3-test-kit.js";

test("TD1: NEEDS_REVIEW chega ao sink com tenant, statement, kind e code allowlisted", async () => {
  const repo = memoryOutbox();
  await enqueue(repo, { payload: { amountCents: 10_000, dueDate: "2000-01-01" } });
  const events: unknown[] = [];
  const { port } = paymentPort();
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => NOW, onAudit: async (event) => { events.push(event); } });
  assert.deepEqual(events, [{ tenantId: TENANT_A, statementId: "10000000-0000-4000-8000-000000000001", kind: "charge_create", action: "billing_outbox.needs_review", code: "due_date_past" }]);
});

test("TD2: failed, lease_lost, record_failed e orphan_recheck_failed pertencem ao contrato do evento", () => {
  const text = source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts");
  for (const action of ["billing_outbox.failed", "billing_outbox.lease_lost", "billing_outbox.record_failed", "billing_outbox.orphan_recheck_failed"]) assert.match(text, new RegExp(action.replaceAll(".", "\\.")));
});

test("TD3: invoice_sweep_failed é limitado por tenant+code durante uma hora", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  assert.equal(text.split("[TRILHA-THROTTLE]").length - 1, 1);
  assert.match(text, /event\.tenantId \?\? "platform"/);
  assert.match(text, /now - last < HOUR_MS/);
});

test("TD4: falha de persistência é capturada e apenas registrada no logger", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  assert.match(text, /try \{[\s\S]*\} catch \{[\s\S]*logger\.warn/);
});

test("TD-X: metadata persistida é allowlist e não contém payload/external_id/url/resposta", () => {
  const text = source("src/modules/subscription-billing/outbox/dispatch-audit.ts");
  const metadata = [...text.matchAll(/metadata:\s*\{([^}]*)\}/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(metadata, /payload|external|url|response|token|secret/i);
  assert.match(metadata, /statementId|kind|code/);
});

test("M-TD1/M-TD3/M-TD4: repasse, throttle e catch têm âncoras verificáveis", () => {
  const jobs = source("src/modules/subscription-billing/outbox/channel.jobs.ts");
  assert.equal(jobs.split("[TRILHA-01]").length - 1, 1);
  assert.match(jobs, /onAudit:\s*deps\.onAudit,\s*\/\/ \[TRILHA-01\]/);
  assert.equal(source("src/modules/subscription-billing/outbox/dispatch-audit.ts").split("[TRILHA-THROTTLE]").length - 1, 1);
  assert.match(source("src/modules/subscription-billing/outbox/dispatch-audit.ts"), /catch \{/);
});


// Conserto da junta do #608 (fix-608c-cl, C2-N8): o throttle marca a chave SÓ depois de gravar. Uma gravação que falha não
// silencia a mesma (organização, código) por 1 h: a 2ª ocorrência, logo depois, grava. E depois de gravar, a 3ª fica retida.
test("TD3-FALHA (C2-N8): gravação que falha não marca o throttle; a seguinte grava, e só então a chave fica retida", async () => {
  const { createPersistedDispatchAuditSink } = await import("../src/modules/subscription-billing/outbox/dispatch-audit.js");
  let attempts = 0;
  const written: unknown[] = [];
  const prisma = {
    platformAuditLog: {
      async create(input: unknown) {
        attempts += 1;
        if (attempts === 1) throw new Error("banco fora");
        written.push(input);
        return input;
      },
    },
  };
  const sink = createPersistedDispatchAuditSink(prisma as never, { throttle: new Map() });
  const event = { tenantId: null, action: "billing_outbox.invoice_sweep_failed", code: "sweep_failed" } as never;
  await sink(event);
  assert.equal(written.length, 0, "a 1ª gravação falhou (só log)");
  await sink(event);
  assert.equal(written.length, 1, "a falha não silenciou a chave: a 2ª grava");
  await sink(event);
  assert.equal(written.length, 1, "depois de gravar, a chave fica retida por 1 h");
  assert.equal(attempts, 2);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl), A-8 (plano §4.6, "1 linha por (organização, código) por hora, por processo"): o estado
// do `[TRILHA-THROTTLE]` sobrevive ao sink novo que cada rodada do job monta (`createChannelRuntime` a cada tick). No PRISMA.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
const PNOW = new Date("2026-11-20T12:00:00.000Z");
if (!connectionString) {
  test("TD-A8 exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let Repo: any;
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_td");
    Repo = (await import("../src/modules/subscription-billing/outbox/outbox.prisma.js")).PrismaOutboxRepository;
  });

  test("TD-A8 (A-8): dois sinks (dois ticks) com a mesma falha da varredura gravam 1 linha por (organização, código)", async () => {
    const { createPersistedDispatchAuditSink } = await import("../src/modules/subscription-billing/outbox/dispatch-audit.js");
    const f = await kit.seedTenant("tda8");
    const code = `sweep_${f.tenantId.slice(0, 8)}`;
    for (let tick = 0; tick < 2; tick += 1) {
      const sink = createPersistedDispatchAuditSink(kit.role.client as never);
      for (let i = 0; i < 3; i += 1) await sink({ tenantId: f.tenantId, action: "billing_outbox.invoice_sweep_failed", code } as never);
    }
    const n = await kit.one(`SELECT count(*)::int AS n FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'billing_outbox.invoice_sweep_failed'`, f.tenantId);
    assert.equal(n.n, 1, "o throttle não zera a cada rodada");
  });
}
