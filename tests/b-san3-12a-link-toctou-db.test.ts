import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a · A27 (Emenda E1-bis) — toda escrita de cheque cuja GUARDA lê `title_id` leva o `title_id` LIDO no WHERE
// (`IS NOT DISTINCT FROM`): o 1º vínculo pelo PATCH, o `cancel` e o `delete`. Achado do crítico (2.2, D1-TOCTOU): sem
// isso, um Financeiro que leu o cheque sem título TROCAVA, cancelava ou excluía um vínculo feito no meio — a troca sem
// `cheques:unlink_title`, sem justificativa e sem auditoria Crítica.
// Barreira determinística (nunca relógio): o VENCEDOR vincula por SQL próprio numa transação ABERTA; o PERDEDOR é o
// serviço real, observado BLOQUEADO no row lock do cheque (`waitForOwnBlockedStatement`, escopado por application_name);
// `release()` decide. Sob READ COMMITTED o UPDATE que bloqueou reavalia o WHERE contra a tupla nova e casa 0 linhas.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-12a-link-toctou");

if (!connectionString) {
  test("B-SAN3-12a A27 (CAS do título lido) exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL e aplique as migrations." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  const scenarios = [
    { id: "A27-a", op: "patch", status: 409, reason: "cheque_write_conflict" },
    { id: "A27-b", op: "cancel", status: 409, reason: "transition_conflict" },
    { id: "A27-c", op: "delete", status: 409, reason: "cheque_write_conflict" },
  ] as const;

  for (const sc of scenarios) {
    test(`${sc.id} (db, barreira): o vínculo a T1 segurado numa transação aberta × ${sc.op} por finance que leu o cheque SEM título → ${sc.status} ${sc.reason}; FINAL vinculado a T1; pix em T1 → 422`, async () => {
      const h = await bootstrap(connection);
      try {
        const s = await seed(h, sc.id);
        const cheque = await h.chequeService.create(s.actor, chequeBody(s, undefined));
        const winner = await holdLink(h, s.tenantId, cheque.id, s.titleId);
        const loser = captureSettled(
          sc.op === "patch"
            ? h.chequeService.update(s.actor, cheque.id, { title_id: s.otherTitleId })
            : sc.op === "cancel"
              ? h.chequeService.cancel(s.actor, cheque.id)
              : h.chequeService.delete(s.actor, cheque.id),
        );
        await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: `${sc.op} perdedor no row lock do cheque` });
        winner.release();
        await winner.done;
        expectReason(await loser, sc.status, sc.reason, `${sc.op} perdedor`);
        const row = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
        assert.equal(row.title_id, s.titleId, "FINAL: o vínculo do vencedor");
        assert.equal(row.status, "registered");
        assert.equal(row.deleted_at, null);
        const swaps = await h.client.auditLog.count({ where: { tenant_id: s.tenantId, action: "cheque.title_unlinked" } });
        assert.equal(swaps, 0, "nenhuma troca registrada");
        expectReason(await captureSettled(h.entryService.payTitle(s.actor, s.titleId, pix(s))), 422, "title_has_pending_cheque", "pix em T1");
        if (sc.op === "patch") {
          expectReason(await captureSettled(h.chequeService.update(s.actor, cheque.id, { title_id: s.otherTitleId })), 403, "unlink_requires_privilege", "controle sequencial (D1)");
        }
      } finally {
        await teardown(h);
      }
    });
  }

  test("A27-d (db, controle): sem corrida o CAS não recusa o caminho normal — 1º vínculo 200; cancel/DELETE de cheque sem título como hoje; deposit de vinculado 200", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a27d");
      const a = await h.chequeService.create(s.actor, chequeBody(s, undefined));
      const linked = await h.chequeService.update(s.actor, a.id, { title_id: s.titleId });
      assert.equal(linked.titleId, s.titleId);
      assert.equal((await h.chequeService.deposit(s.actor, a.id)).status, "deposited", "deposit de vinculado segue sem CAS");
      const b = await h.chequeService.create(s.actor, chequeBody(s, undefined));
      assert.equal((await h.chequeService.cancel(s.actor, b.id)).status, "cancelled");
      const c = await h.chequeService.create(s.actor, chequeBody(s, undefined));
      assert.ok((await h.chequeService.delete(s.actor, c.id)).deletedAt);
    } finally {
      await teardown(h);
    }
  });

  test("A27-f (db, paridade sem barreira): dois 1º vínculos concorrentes (T1, T2) — exatamente um 200, nunca dois; o perdedor 409 (corrida) ou 403 (já viu o vínculo); FINAL = o título do 200", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a27f");
      const reasons: string[] = [];
      for (let round = 0; round < 5; round += 1) {
        const cheque = await h.chequeService.create(s.actor, chequeBody(s, undefined));
        const outcomes = await Promise.all([
          captureSettled(h.chequeService.update(s.actor, cheque.id, { title_id: s.titleId })),
          captureSettled(h.chequeService.update(s.actor, cheque.id, { title_id: s.otherTitleId })),
        ]);
        const ok = outcomes.filter((o) => o.status === "fulfilled") as Array<{ status: "fulfilled"; value: { titleId?: string } }>;
        assert.equal(ok.length, 1, `rodada ${round}: exatamente um 200`);
        const lost = outcomes.find((o) => o.status === "rejected") as { reason: { statusCode?: number; reason?: string } };
        assert.ok(["cheque_write_conflict", "unlink_requires_privilege"].includes(String(lost.reason.reason)), `rodada ${round}: ${lost.reason.reason}`);
        reasons.push(String(lost.reason.reason));
        const row = await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } });
        assert.equal(row.title_id, ok[0]!.value.titleId);
        await h.client.$executeRawUnsafe("update cheques set title_id = null, deleted_at = now() where id = $1::uuid", cheque.id);
      }
      console.log(`[A27-f] perdedores: ${reasons.join(", ")}`);
    } finally {
      await teardown(h);
    }
  });
}

// ------------------------------------------------------------------------------------------- arnês

/** O VENCEDOR: vincula o cheque a T1 por SQL próprio numa transação aberta, até `release()`. */
async function holdLink(h: Harness, tenantId: string, chequeId: string, titleId: string) {
  let release!: () => void;
  let ready!: () => void;
  const mayCommit = new Promise<void>((resolve) => (release = resolve));
  const isReady = new Promise<void>((resolve) => (ready = resolve));
  const done = captureSettled(
    h.client.$transaction(async (tx) => {
      await h.setTenantRlsContext(tx, tenantId);
      const n = await tx.$executeRawUnsafe("update cheques set title_id = $1::uuid where id = $2::uuid and title_id is null", titleId, chequeId);
      assert.equal(n, 1, "o vencedor vinculou");
      ready();
      await mayCommit;
    }, { timeout: 30000, maxWait: 10000 }),
  );
  await isReady;
  return {
    release,
    done: done.then((o) => assert.equal(o.status, "fulfilled", `vencedor: ${describe(o)}`)),
  };
}

function describe(outcome: SettledOutcome<unknown>): string {
  return outcome.status === "fulfilled" ? "fulfilled" : String((outcome.reason as { reason?: string; message?: string })?.reason ?? (outcome.reason as Error)?.message ?? outcome.reason);
}

function expectReason(outcome: SettledOutcome<unknown>, statusCode: number, reason: string, label: string): void {
  assert.equal(outcome.status, "rejected", `${label}: era para recusar e passou`);
  const error = (outcome as { reason: { statusCode?: number; reason?: string } }).reason;
  assert.equal(error?.statusCode, statusCode, `${label}: status (${describe(outcome)})`);
  assert.equal(error?.reason, reason, `${label}: motivo`);
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls, setTenantRlsContext }, cheques, entries, titles] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  return {
    client,
    withTenantRls,
    setTenantRlsContext,
    deriveCompetencia: titles.deriveCompetencia,
    chequeService: await cheques.createDefaultChequeService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    tenantIds: [] as string[],
  };
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toLowerCase();
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Fin 12a", email: `${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true } }));
  const titleData = (party: string) => ({
    tenant_id: tenant.id, direction: "receivable", party_type: "customer", party_name: party, amount: 100, currency: "BRL",
    issue_date: new Date(), due_date: new Date(), paid_amount: 0, status: "open", competencia: h.deriveCompetencia(new Date()),
  });
  const t1 = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: titleData(`T1 ${mark}`) }));
  const t2 = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: titleData(`T2 ${mark}`) }));
  return {
    tenantId: tenant.id,
    accountId: account.id,
    titleId: t1.id,
    otherTitleId: t2.id,
    actor: {
      tenantId: tenant.id, userId: user.id, roles: ["finance" as const],
      permissions: ["cheques:read" as const, "cheques:create" as const, "cheques:update" as const, "financial_entries:create" as const, "financial_entries:read" as const],
    },
  };
}

function chequeBody(s: Awaited<ReturnType<typeof seed>>, titleId: string | undefined) {
  return { account_id: s.accountId, title_id: titleId, direction: "received", cheque_number: `T27-${Math.random().toString(16).slice(2, 12)}`, bank: "Banco 12a", amount: 100 };
}

const pix = (s: Awaited<ReturnType<typeof seed>>) => ({ account_id: s.accountId, amount: 100, payment_method: "pix" });

async function teardown(h: Harness): Promise<void> {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from cheques where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_titles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally {
    await h.client.$disconnect();
  }
}
