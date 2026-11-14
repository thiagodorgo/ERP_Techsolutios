import "dotenv/config";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectAllFulfilled,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-25 (item 50 do portão) — R-UM-TITULO (plano v2 §2.5, I-DINHEIRO): faturar a OS gera UM título, também com
// DUAS requisições idênticas ao mesmo tempo (no 1º faturamento e no COMPLEMENTAR) e no reenvio depois do sucesso.
// O servidor não muda: este arquivo prova o que ele já faz, e cada caso vale pela mutação literal da §4.3.
//
// Casos (o id abre o nome, para o aceite pelo log do job `backend`, §7.3):
//   · [A5o] 1º faturamento — uma 3ª conexão segura os itens com FOR UPDATE; duas chamadas REAIS e IDÊNTICAS ao
//     `WorkOrderInvoicingService.invoice(actor, workOrderId, {})` saem juntas e esperam ATRÁS DO PID DE QUEM SEGURA,
//     de forma transitiva (`WITH RECURSIVE … pg_blocking_pids`); solta; 1 fulfilled + 1 rejected 409 already_invoiced;
//     1 título ORIGINAL com todos os itens nele. M-A5a (sem o FOR UPDATE dos itens) NÃO o derruba: o índice único de
//     originais segura (declarado no plano).
//   · [A5c] complementar — o mesmo depois de um 1º faturamento e de um item novo: original + UM complementar, o item
//     novo no complementar do vencedor. É o caso sem índice único: M-A5a → `invoice_items_changed`; M-A5b (M-A5a + a
//     contagem fail-closed desligada) → as duas chamadas 201, ou seja, dois complementares.
//   · [A5r] reenvio — a mesma chamada depois do 201 → 409 already_invoiced, e a contagem de títulos não muda. M-A5c.
//   · [A5n] regressão (sem mutação dona) — 20 rodadas de `Promise.all` com duas chamadas idênticas, cada uma numa OS nova.
//
// POR QUE A ESPERA É PELO PID DE QUEM SEGURA (plano v2 [E-9], R6): a 1ª versão da sonda contava os bloqueados do
// `application_name` da suíte; o A5o, vermelho, deixou transação aberta, e o A5c contou os bloqueados do caso anterior
// e passou VERDE sob mutação. O pid de quem segura é único por caso, e a barreira se solta no `finally`.
//
// Arnês (o de `tests/work-order-invoicing-atomic-db.test.ts`): o serviço roda num papel efêmero NOSUPERUSER
// NOBYPASSRLS (`createEphemeralRole`); a semeadura, a conexão que segura e a limpeza usam a conexão administrativa;
// CORE_SAAS_PERSISTENCE=prisma é fixado ANTES de importar a aplicação e o modo é asserido; organização descartável
// por caso, limpeza escopada em ordem de FK (complementares antes dos originais).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-25-a5");

const FINANCE_PERMISSIONS = [
  "work_order_financials:read",
  "work_order_financials:create",
  "work_order_financials:update",
  "financial_titles:read",
  "financial_titles:create",
  "work_orders:read",
];

type Actor = { tenantId: string; userId: string; roles: string[]; permissions: string[] };
type Seed = { tenantId: string; userId: string; workOrderId: string; actor: Actor };

if (!connectionString) {
  test("B-SAN3-25 (um título sob duas requisições idênticas, Postgres real) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação: o modo e a tag da suíte (src/database/prisma.ts lê a URL no import).
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  before(async () => {
    await bootstrap(connection);
  });
  after(async () => {
    await harness?.close();
  });

  test("[A5o] 1º faturamento: duas chamadas idênticas ao mesmo tempo → 1 título ORIGINAL com todos os itens, a outra 409 already_invoiced", async () => {
    const t = await seed("a5o");
    await addItem(t, 100);
    await addItem(t, 30);
    const result = oneWinnerOne409(await twoIdenticalBehindHolder(t), "A5o");
    assert.equal(result.parentTitleId, undefined, "o vencedor criou o ORIGINAL");
    assert.equal(result.totalAmount, 130);
    assert.equal(result.invoicedItemCount, 2);
    assert.equal(await titleCount(t), 1, "UM título na organização");
    const items = await itemRows(t);
    assert.equal(items.length, 2);
    assert.ok(
      items.every((row) => row.title_id === result.title.id && row.invoiced_at !== null),
      `todos os itens no título do vencedor: ${JSON.stringify(items.map((row) => row.title_id))}`,
    );
  });

  test("[A5c] complementar: duas chamadas idênticas ao mesmo tempo → original + UM complementar, a outra 409 already_invoiced", async () => {
    const t = await seed("a5c");
    await addItem(t, 100);
    const first = await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const novo = await addItem(t, 35);
    const result = oneWinnerOne409(await twoIdenticalBehindHolder(t), "A5c");
    assert.equal(result.parentTitleId, first.title.id, "o vencedor criou o COMPLEMENTAR do original");
    assert.equal(result.totalAmount, 35);
    assert.equal(result.invoicedItemCount, 1);
    assert.equal(await titleCount(t), 2, "original + UM complementar");
    const complementares = (await titleRows(t)).filter((row) => row.parent_title_id !== null);
    assert.equal(complementares.length, 1, "UM complementar");
    assert.equal(complementares[0].id, result.title.id);
    const items = await itemRows(t);
    assert.equal(items.find((row) => row.id === novo)?.title_id, result.title.id, "o item novo está no complementar do vencedor");
  });

  test("[A5r] reenvio: a mesma chamada depois do 201 → 409 already_invoiced, e a contagem de títulos não muda", async () => {
    const t = await seed("a5r");
    await addItem(t, 50);
    await h.invoicing.invoice(t.actor, t.workOrderId, {});
    const antes = await titleCount(t);
    assert.equal(antes, 1);
    const again = await captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {}));
    assert.equal(again.status, "rejected", "o reenvio não pode criar título");
    const reason = (again as { reason?: { statusCode?: unknown; reason?: unknown } }).reason;
    assert.equal(reason?.statusCode, 409, `recusa: ${describe(again)}`);
    assert.equal(reason?.reason, "already_invoiced", `recusa: ${describe(again)}`);
    assert.equal(await titleCount(t), antes, "a contagem de títulos não muda");
  });

  test("[A5n] regressão: 20 rodadas de duas chamadas idênticas (Promise.all), cada uma numa OS nova → 1 título por rodada, a outra 409", async () => {
    for (let rodada = 0; rodada < 20; rodada += 1) {
      const t = await seed(`a5n${rodada}`);
      await addItem(t, 10);
      await addItem(t, 20);
      const outcomes = await Promise.all([
        captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {})),
        captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {})),
      ]);
      oneWinnerOne409(outcomes, `A5n rodada ${rodada}`);
      assert.equal(await titleCount(t), 1, `rodada ${rodada}: UM título`);
    }
  });
}

// ---------------------------------------------------------------- a corrida

/** Segura os itens faturáveis por uma 3ª conexão; dispara DUAS chamadas reais idênticas; solta quando as duas esperam atrás dela. */
async function twoIdenticalBehindHolder(t: Seed): Promise<Array<SettledOutcome<any>>> {
  const gate = barrierGate();
  let holderPid = 0;
  const holder = captureSettled(
    h.admin.$transaction(
      async (tx: any) => {
        await h.setTenantRlsContext(tx, t.tenantId);
        holderPid = Number(((await tx.$queryRawUnsafe("SELECT pg_backend_pid() AS pid")) as Array<{ pid: number }>)[0].pid);
        await lockInvoiceable(tx, t);
        gate.ready();
        await gate.mayGo;
      },
      { timeout: 30000, maxWait: 10000 },
    ),
  );
  await gate.isReady;
  try {
    assert.ok(holderPid > 0, "pid de quem segura os itens");
    const a = captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {}));
    const b = captureSettled(h.invoicing.invoice(t.actor, t.workOrderId, {}));
    const deadline = Date.now() + 15000;
    for (;;) {
      // Espera ESCOPADA pelo pid de quem segura, transitiva: quem espera atrás de quem espera atrás dele também conta.
      const rows = (await h.admin.$queryRawUnsafe(
        "WITH RECURSIVE chain(pid) AS (SELECT pid FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN chain c ON c.pid = ANY(pg_blocking_pids(a.pid))) SELECT count(*)::int AS n FROM chain",
        holderPid,
      )) as Array<{ n: number }>;
      const waiting = Number(rows[0].n);
      if (waiting >= 2) break;
      assert.ok(Date.now() < deadline, `as duas chamadas não ficaram esperando atrás da conexão que segura os itens (esperando=${waiting})`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    gate.go();
    expectAllFulfilled([await holder], "conexão que segura os itens");
    return [await a, await b];
  } finally {
    gate.go();
  }
}

function oneWinnerOne409(outcomes: Array<SettledOutcome<any>>, label: string) {
  const resumo = JSON.stringify(outcomes.map((outcome) => describe(outcome)));
  const won = outcomes.filter((outcome) => outcome.status === "fulfilled") as Array<{ status: "fulfilled"; value: any }>;
  const lost = outcomes.filter((outcome) => outcome.status === "rejected") as Array<{ status: "rejected"; reason: any }>;
  assert.equal(won.length, 1, `${label}: exatamente 1 chamada cria título: ${resumo}`);
  assert.equal(lost.length, 1, `${label}: a outra é recusada: ${resumo}`);
  assert.equal(lost[0].reason?.statusCode, 409, `${label}: recusa ${resumo}`);
  assert.equal(lost[0].reason?.reason, "already_invoiced", `${label}: recusa ${resumo}`);
  return won[0].value;
}

function describe(outcome: SettledOutcome<any>): string {
  if (outcome.status === "fulfilled") return `201 total=${String(outcome.value?.totalAmount)}`;
  const reason = outcome.reason as { statusCode?: unknown; reason?: unknown; message?: unknown } | undefined;
  return `${String(reason?.statusCode ?? "")} ${String(reason?.reason ?? reason?.message ?? reason)}`;
}

function barrierGate() {
  let ready!: () => void;
  let go!: () => void;
  const isReady = new Promise<void>((resolve) => (ready = resolve));
  const mayGo = new Promise<void>((resolve) => (go = resolve));
  return { ready, go, isReady, mayGo };
}

/** As peças do produto, na ordem do produto: o FOR UPDATE ordenado dos itens faturáveis. */
async function lockInvoiceable(tx: any, t: Seed): Promise<string[]> {
  const rows = (await tx.$queryRaw`
    SELECT id FROM work_order_financial_items
     WHERE tenant_id = ${t.tenantId}::uuid AND work_order_id = ${t.workOrderId}::uuid
       AND deleted_at IS NULL AND invoiced_at IS NULL
     ORDER BY created_at, id
       FOR UPDATE
  `) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

// ---------------------------------------------------------------- arnês

type Harness = Awaited<ReturnType<typeof bootstrap>>;
let harness: Harness | undefined;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    itemPrisma,
    financialService,
    uowPrisma,
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/work-order-financials/work-order-financial-prisma.repository.js"),
    import("../src/modules/work-order-financials/work-order-financial.service.js"),
    import("../src/modules/financial-uow/financial-uow-prisma.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "assert do modo: esta suíte só é prova no caminho prisma");

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(admin, applicationName);
  const role: EphemeralRole = await createEphemeralRole(admin as any, connection);
  const roleClient = role.client as any;

  const postura = (await roleClient.$queryRawUnsafe(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
  )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.equal(postura.length, 1, "papel do serviço não encontrado em pg_roles");
  assert.equal(postura[0].rolsuper, false, "o papel do serviço não pode ser superusuário");
  assert.equal(postura[0].rolbypassrls, false, "o papel do serviço não pode atravessar a RLS");

  const itemRepo = new itemPrisma.RlsPrismaWorkOrderFinancialItemRepository(roleClient);
  const roleUow = new uowPrisma.PrismaFinancialUnitOfWork(roleClient);
  const tenantIds: string[] = [];

  const built = {
    admin: admin as any,
    role,
    invoicing: new financialService.WorkOrderInvoicingService(itemRepo, async () => roleUow),
    setTenantRlsContext,
    withTenantRls,
    tenantIds,
    async close(): Promise<void> {
      try {
        for (const tenantId of tenantIds) {
          await admin.$executeRawUnsafe("DELETE FROM work_order_financial_items WHERE tenant_id = $1::uuid", tenantId);
          // Complementares antes dos originais (a FK do pai é RESTRICT).
          await admin.$executeRawUnsafe("DELETE FROM financial_titles WHERE tenant_id = $1::uuid AND parent_title_id IS NOT NULL", tenantId);
          for (const table of ["financial_entries", "financial_titles", "financial_period_closes", "audit_logs", "cloud_usage_events", "work_orders", "users"]) {
            await admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
          }
          await admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
        }
      } finally {
        await role.drop();
        await admin.$disconnect();
      }
    },
  };
  harness = built;
  return built;
}

function hx(): Harness {
  assert.ok(harness, "arnês não inicializado");
  return harness;
}

// Atalho dos testes e helpers: o arnês do arquivo, criado no `before`.
const h = new Proxy({} as Harness, { get: (_target, property) => (hx() as any)[property] });

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seed(tag: string): Promise<Seed> {
  const marca = `${tag}-${suffix()}`;
  const tenant = await h.admin.tenant.create({ data: { name: `Faturamento B-SAN3-25 ${marca}`, slug: `b-san3-25-a5-${marca}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.admin, tenant.id, (tx: any) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro faturamento", email: `b-san3-25-a5-${marca}@example.com` } }),
  );
  const workOrder = await h.admin.workOrder.create({
    data: { tenant_id: tenant.id, code: `WO-${marca}`, title: `OS ${marca}`, customer_name: "Cliente Alfa" },
  });
  return {
    tenantId: tenant.id,
    userId: user.id,
    workOrderId: workOrder.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance"], permissions: FINANCE_PERMISSIONS },
  };
}

async function addItem(t: Seed, amount: number): Promise<string> {
  const item = await h.admin.workOrderFinancialItem.create({
    data: {
      tenant_id: t.tenantId,
      work_order_id: t.workOrderId,
      description: `Item ${amount}`,
      quantity: 1,
      unit_amount: amount,
      total_amount: amount,
      currency: "BRL",
      source: "manual",
    },
  });
  return item.id as string;
}

async function titleCount(t: Seed): Promise<number> {
  return h.admin.financialTitle.count({ where: { tenant_id: t.tenantId } });
}

async function titleRows(t: Seed): Promise<any[]> {
  return h.admin.financialTitle.findMany({ where: { tenant_id: t.tenantId }, orderBy: [{ created_at: "asc" }] });
}

async function itemRows(t: Seed): Promise<any[]> {
  return h.admin.workOrderFinancialItem.findMany({ where: { tenant_id: t.tenantId }, orderBy: [{ created_at: "asc" }, { id: "asc" }] });
}
