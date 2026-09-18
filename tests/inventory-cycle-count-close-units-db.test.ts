import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a · T-B (Ω6R-DAT-003; S-01, S-02, T-01, T-03, N-OVL) — O FECHAMENTO DE CONTAGEM SOB CONCORRÊNCIA,
// contra o Postgres REAL.
//
// O ACHADO: o fechamento não era único — dois `close` da mesma sessão aplicavam o ajuste DUAS vezes; o
// status virava `concluida` sem condição; lançar contagem numa sessão que estava fechando gravava por cima
// do carimbo (TOCTOU); cancelar por cima de um fechamento aplicado deixava `cancelada` com o ajuste no razão;
// e dois `open` sobre o mesmo item aplicavam a variância duas vezes.
//
// O DESENHO PROVADO AQUI (plano v3 §3.3–§3.5): máquina `aberta → fechando → concluida` em UNIDADES POR ITEM
// (porta InventoryUnitOfWork), `abortClose` em toda falha (S-01: nenhum estado sem saída), total da sessão
// INTEIRA somado no banco sob o lock no CAS final (S-02), recontagem/cancelamento decididos sob o lock da
// sessão, e `open` serializado pela linha do tenant recusando item já em sessão não terminal (I9).
//
// CONTROLES VERMELHOS EMBUTIDOS: as emulações do desenho v2 (sem abortClose, total por chamada) e do v1
// (dois itens `FOR UPDATE` na mesma transação) vivem NESTE arquivo, em SQL cru, marcadas
// `// CONTROLE VERMELHO — não é o código do bloco`. Elas reproduzem o cenário do crítico e têm de exibir o
// defeito; o código real, no mesmo cenário, não.
//
// Serviços sob teste rodam nos clientes de DOIS papéis efêmeros NOSUPERUSER (RLS FORCE vale para eles); o
// admin só semeia, observa pg_stat_activity e faz teardown escopado por tenant_id, em ordem de FK.
// Barreira = statement bloqueado DA PRÓPRIA SUÍTE (application_name). `40P01` nunca é aceitável no código real.
// DB-gated: sem DATABASE_URL o arquivo DECLARA o pulo (conta no piso do runner). Sem DDL (D9).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const RACE_N = 10;

if (!connectionString) {
  test("B-O6R-04a T-B (fechamento de contagem sob concorrência) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const appAdmin = buildApplicationName("inv-close-admin");
  const appA = buildApplicationName("inv-close-a");
  const appB = buildApplicationName("inv-close-b");

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const inv = await import("../src/modules/inventory/inventory-prisma.repository.js");
    const cc = await import("../src/modules/inventory/cycle-count-prisma.repository.js");
    // A porta de unidade só existe depois do bloco: no head-base (vermelho-controle) o import falha e o
    // serviço antigo é construído sem ela — os casos então medem o código antigo, não uma falha de import.
    const uow = await import("../src/modules/inventory/inventory-uow-prisma.js").catch(() => undefined);
    const ccService = await import("../src/modules/inventory/cycle-count.service.js");
    const { CycleCountController } = await import("../src/modules/inventory/cycle-count.controller.js");
    const { InventoryService } = await import("../src/modules/inventory/inventory.service.js");
    const { withTenantRls } = await import("../src/database/rls.js");
    const { roundToDecimalPrecision } = await import("../src/modules/inventory/inventory.calculations.js");
    const { env } = await import("../src/config/env.js");

    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString!, appAdmin) }) });
    const roleA: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, appA));
    const roleB: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, appB));
    const tenants: string[] = [];

    const repoOf = (client: any) => new inv.RlsPrismaInventoryRepository(client);
    const cycleServiceOf = (client: any) =>
      new ccService.CycleCountService(
        new cc.RlsPrismaCycleCountRepository(client),
        repoOf(client),
        (uow ? new uow.PrismaInventoryUnitOfWork(client) : undefined) as any,
      );

    return {
      admin,
      roleA,
      roleB,
      tenants,
      env,
      ccService,
      withTenantRls,
      round: roundToDecimalPrecision as (value: number) => number,
      cycleServiceOf,
      controllerOf: (service: unknown) => new CycleCountController(async () => service as any),
      cycleA: cycleServiceOf(roleA.client),
      cycleB: cycleServiceOf(roleB.client),
      inventoryB: new InventoryService(repoOf(roleB.client)),
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await teardownTenants(h.admin, h.tenants);
    } finally {
      await h.roleA.drop();
      await h.roleB.drop();
      await h.admin.$disconnect();
      // O B14 atravessa o controller: a auditoria usa o cliente global da aplicação.
      await (await import("../src/database/prisma.js")).prisma.$disconnect().catch(() => undefined);
    }
  });

  // ------------------------------------------------------------------ semeadura e observação (admin, SQL cru)
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const actorOf = (tenantId: string) => ({ tenantId, userId: randomUUID(), roles: [], permissions: [] }) as any;

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `inv-close-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function newItem(h: Harness, tenantId: string, options: { id?: string; base?: number; avg?: number } = {}): Promise<string> {
    const id = options.id ?? randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, tenant_id, sku, name, unit, avg_cost) VALUES ($1::uuid, $2::uuid, $3, $3, 'un', $4::numeric)`,
      id,
      tenantId,
      `SKU-${id.slice(0, 13)}`,
      options.avg ?? 0,
    );
    if (options.base) await rawMovement(h, tenantId, id, "entrada", options.base, { unitCost: options.avg ?? 1 });
    return id;
  }

  /** N itens (ids ordenados = ordem das unidades), cada um com BASE `base` e custo médio `avg`. */
  async function newItems(h: Harness, tenantId: string, n: number, options: { base: number; avg: number }): Promise<string[]> {
    const ids = Array.from({ length: n }, () => randomUUID()).sort();
    for (const id of ids) await newItem(h, tenantId, { id, ...options });
    return ids;
  }

  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Guincho') RETURNING id`,
      tenantId,
      `CNT${Math.floor(Math.random() * 9000 + 1000)}`,
    );
    return rows[0]!.id;
  }

  /** Estoque 10 no total: BASE 4 + viatura 6 (o cenário STUCK do crítico). */
  async function splitIntoVehicle(h: Harness, tenantId: string, itemId: string): Promise<void> {
    const vehicle = await newVehicle(h, tenantId);
    const group = randomUUID();
    await rawMovement(h, tenantId, itemId, "link", -6, { group });
    await rawMovement(h, tenantId, itemId, "link", 6, { group, custody: "vehicle", vehicle });
  }

  async function rawMovement(
    h: Harness,
    tenantId: string,
    itemId: string,
    type: string,
    quantity: number,
    options: { unitCost?: number; custody?: string; vehicle?: string; group?: string; cycleCount?: string } = {},
  ): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type, custody_vehicle_id, transfer_group_id, cycle_count_id)
       VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5::numeric, $6, $7::uuid, $8::uuid, $9::uuid) RETURNING id`,
      tenantId,
      itemId,
      type,
      quantity,
      options.unitCost ?? null,
      options.custody ?? "base",
      options.vehicle ?? null,
      options.group ?? null,
      options.cycleCount ?? null,
    );
    return rows[0]!.id;
  }

  async function rawSession(
    h: Harness,
    tenantId: string,
    entries: readonly { item: string; system: number; counted?: number }[],
    status = "aberta",
  ): Promise<{ id: string; entries: string[] }> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO cycle_counts (tenant_id, status) VALUES ($1::uuid, $2) RETURNING id`,
      tenantId,
      status,
    );
    const id = rows[0]!.id;
    const ids: string[] = [];
    for (const entry of entries) {
      const inserted = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric) RETURNING id`,
        tenantId,
        id,
        entry.item,
        entry.system,
        entry.counted ?? null,
      );
      ids.push(inserted[0]!.id);
    }
    return { id, entries: ids };
  }

  /** Carimbo cru (estado de legado / crash no meio): ajuste gravado + entrada carimbada. */
  async function rawStamp(h: Harness, tenantId: string, sessionId: string, entryId: string, itemId: string, variance: number): Promise<string> {
    const movement = await rawMovement(h, tenantId, itemId, "ajuste", variance, { cycleCount: sessionId });
    await h.admin.$executeRawUnsafe(
      `UPDATE cycle_count_entries SET variance = $2::numeric, adjustment_movement_id = $3::uuid WHERE id = $1::uuid`,
      entryId,
      variance,
      movement,
    );
    return movement;
  }

  async function state(h: Harness, tenantId: string, sessionId: string) {
    const [session] = await h.admin.$queryRawUnsafe<Array<{ status: string; is_active: boolean }>>(
      `SELECT status, is_active FROM cycle_counts WHERE id = $1::uuid`,
      sessionId,
    );
    const [ledger] = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id = $1::uuid AND cycle_count_id = $2::uuid`,
      tenantId,
      sessionId,
    );
    const [entries] = await h.admin.$queryRawUnsafe<Array<{ total: number; stamped: number }>>(
      `SELECT count(*)::int AS total, count(adjustment_movement_id)::int AS stamped FROM cycle_count_entries WHERE cycle_count_id = $1::uuid`,
      sessionId,
    );
    const [dup] = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM (SELECT item_id FROM stock_movements WHERE cycle_count_id = $1::uuid GROUP BY item_id HAVING count(*) > 1) d`,
      sessionId,
    );
    return {
      status: session?.status,
      isActive: session?.is_active,
      ajustes: ledger!.n,
      entries: entries!.total,
      carimbadas: entries!.stamped,
      dup: dup!.n,
    };
  }

  async function entryOf(h: Harness, entryId: string): Promise<{ counted: number | null; variance: number | null; stamped: boolean }> {
    const [row] = await h.admin.$queryRawUnsafe<Array<{ counted: number | null; variance: number | null; stamped: boolean }>>(
      `SELECT counted_quantity::float8 AS counted, variance::float8 AS variance, adjustment_movement_id IS NOT NULL AS stamped
         FROM cycle_count_entries WHERE id = $1::uuid`,
      entryId,
    );
    return row!;
  }

  async function saldoBase(h: Harness, tenantId: string, itemId: string): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ s: number }>>(
      `SELECT COALESCE(SUM(quantidade_sinalizada), 0)::float8 AS s FROM stock_movements WHERE tenant_id = $1::uuid AND item_id = $2::uuid AND custody_type = 'base'`,
      tenantId,
      itemId,
    );
    return Number(rows[0]!.s);
  }

  async function blockedQueries(h: Harness, applicationName: string): Promise<string[]> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ q: string }>>(
      `SELECT query AS q FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock' AND state = 'active'`,
      applicationName,
    );
    return rows.map((row) => row.q);
  }

  /** Uma transação do admin que faz `work` e SEGURA os locks até `release()`. `locked` resolve depois do `work`. */
  function holdInAdminTx(h: Harness, work: (tx: any) => Promise<void>) {
    let release!: () => void;
    let markLocked!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const locked = new Promise<void>((resolve) => (markLocked = resolve));
    const done = h.admin.$transaction(
      async (tx: any) => {
        await work(tx);
        markLocked();
        await gate;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return { release, locked, done: captureSettled(done) };
  }

  function describe(outcome: SettledOutcome<unknown>): string {
    if (outcome.status === "fulfilled") return "ok";
    const reason = outcome.reason as any;
    if (reason?.statusCode) return `${reason.statusCode}|${reason.reason}`;
    const causeCode = reason?.cause?.code ?? reason?.meta?.driverAdapterError?.cause?.code ?? reason?.meta?.code;
    return `${reason?.code ?? reason?.name ?? "erro"}${causeCode ? `/${causeCode}` : ""}`;
  }

  function assertNoDeadlockOrTimeout(outcomes: readonly SettledOutcome<unknown>[], label: string): void {
    const described = outcomes.map(describe);
    assert.equal(described.some((d) => d.includes("40P01")), false, `${label}: deadlock 40P01 — ${described.join(", ")}`);
    assert.equal(described.some((d) => d.includes("P2028") || d.startsWith("503")), false, `${label}: timeout/503 — ${described.join(", ")}`);
  }

  function totalOf(outcome: SettledOutcome<unknown>): number | undefined {
    return outcome.status === "fulfilled" ? (outcome.value as { totalVarianceValue: number }).totalVarianceValue : undefined;
  }

  /** Duas chamadas com largada comum. */
  async function raceTwo(a: () => Promise<unknown>, b: () => Promise<unknown>): Promise<SettledOutcome<unknown>[]> {
    let go!: () => void;
    const start = new Promise<void>((resolve) => (go = resolve));
    const both = [captureSettled(start.then(a)), captureSettled(start.then(b))];
    go();
    return Promise.all(both);
  }

  // ------------------------------------------------------------------ CONTROLE VERMELHO — não é o código do bloco
  // Emulação LITERAL do desenho v2 (rejeitado pelo crítico na r2), em SQL cru: unidades por item com CAS, mas
  // SEM `abortClose` (falha deixa `fechando` sem saída — S-01), total ACUMULADO POR CHAMADA com o avg_cost lido
  // na unidade (S-02), recontagem só em `aberta` e cancelamento só em `aberta`.
  const SESSION_FOR_UPDATE = `SELECT status FROM cycle_counts WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`;

  function v2Error(statusCode: number, reason: string): Error {
    return Object.assign(new Error(`controle v2: ${reason}`), { statusCode, reason });
  }

  async function closeV2(
    h: Harness,
    client: any,
    tenantId: string,
    sessionId: string,
    options: { afterUnit?: (applied: number) => Promise<void> } = {},
  ): Promise<{ totalVarianceValue: number }> {
    // CONTROLE VERMELHO — não é o código do bloco
    const begin = await h.withTenantRls(client, tenantId, async (tx: any) => {
      const [row] = await tx.$queryRawUnsafe(SESSION_FOR_UPDATE, tenantId, sessionId);
      if (row?.status === "aberta") {
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status = 'fechando' WHERE tenant_id = $1::uuid AND id = $2::uuid AND status = 'aberta'`, tenantId, sessionId);
      } else if (row?.status !== "fechando") {
        return { status: "not_open", current: row?.status };
      }
      const entries = await tx.$queryRawUnsafe(
        `SELECT id, item_id, system_quantity::float8 AS sys, counted_quantity::float8 AS cnt, adjustment_movement_id AS adj
           FROM cycle_count_entries WHERE tenant_id = $1::uuid AND cycle_count_id = $2::uuid ORDER BY item_id`,
        tenantId,
        sessionId,
      );
      return { status: "open", entries };
    });
    if (begin.status === "not_open") throw v2Error(422, "invalid_status_transition");

    let total = 0;
    let applied = 0;
    for (const entry of begin.entries as Array<{ id: string; item_id: string; sys: number; cnt: number | null; adj: string | null }>) {
      if (entry.cnt === null || entry.cnt === entry.sys || entry.adj) continue;
      const unit = await h.withTenantRls(client, tenantId, async (tx: any) => {
        const [row] = await tx.$queryRawUnsafe(SESSION_FOR_UPDATE, tenantId, sessionId);
        if (row?.status !== "fechando") throw v2Error(422, "invalid_status_transition");
        const [current] = await tx.$queryRawUnsafe(
          `SELECT counted_quantity::float8 AS cnt, system_quantity::float8 AS sys, adjustment_movement_id AS adj FROM cycle_count_entries WHERE id = $1::uuid`,
          entry.id,
        );
        if (current.adj) return { skip: true };
        const variance = h.round(current.cnt - current.sys);
        const [item] = await tx.$queryRawUnsafe(
          `SELECT avg_cost::float8 AS avg FROM inventory_items WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`,
          tenantId,
          entry.item_id,
        );
        const [balance] = await tx.$queryRawUnsafe(
          `SELECT COALESCE(SUM(quantidade_sinalizada), 0)::float8 AS s FROM stock_movements WHERE tenant_id = $1::uuid AND item_id = $2::uuid AND custody_type = 'base'`,
          tenantId,
          entry.item_id,
        );
        if (balance.s + variance < 0) throw v2Error(409, "insufficient_balance");
        const [movement] = await tx.$queryRawUnsafe(
          `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id)
           VALUES ($1::uuid, $2::uuid, 'ajuste', $3::numeric, 'base', $4::uuid) RETURNING id`,
          tenantId,
          entry.item_id,
          variance,
          sessionId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE cycle_count_entries SET variance = $2::numeric, adjustment_movement_id = $3::uuid WHERE id = $1::uuid`,
          entry.id,
          variance,
          movement.id,
        );
        return { skip: false, value: variance * item.avg };
      });
      if (!unit.skip) {
        applied += 1;
        total += unit.value;
        await options.afterUnit?.(applied);
      }
    }

    const finished = await h.withTenantRls(client, tenantId, async (tx: any) => {
      const [row] = await tx.$queryRawUnsafe(SESSION_FOR_UPDATE, tenantId, sessionId);
      if (row?.status !== "fechando") return false;
      await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status = 'concluida' WHERE tenant_id = $1::uuid AND id = $2::uuid AND status = 'fechando'`, tenantId, sessionId);
      return true;
    });
    if (!finished) throw v2Error(422, "invalid_status_transition");
    return { totalVarianceValue: h.round(total) };
  }

  /** CONTROLE VERMELHO — v2: recontagem só em `aberta`. */
  async function recordEntryV2(h: Harness, client: any, tenantId: string, sessionId: string, entryId: string, counted: number): Promise<string> {
    return h.withTenantRls(client, tenantId, async (tx: any) => {
      const [row] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE tenant_id = $1::uuid AND id = $2::uuid FOR SHARE`, tenantId, sessionId);
      if (row?.status !== "aberta") return `not_open:${row?.status}`;
      await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET counted_quantity = $2::numeric WHERE id = $1::uuid`, entryId, counted);
      return "ok";
    });
  }

  /** CONTROLE VERMELHO — v2: cancelamento só em `aberta`. */
  async function cancelV2(h: Harness, client: any, tenantId: string, sessionId: string): Promise<string> {
    return h.withTenantRls(client, tenantId, async (tx: any) => {
      const moved = await tx.$executeRawUnsafe(
        `UPDATE cycle_counts SET status = 'cancelada', is_active = false WHERE tenant_id = $1::uuid AND id = $2::uuid AND status = 'aberta'`,
        tenantId,
        sessionId,
      );
      if (moved === 1) return "ok";
      const [row] = await tx.$queryRawUnsafe(`SELECT status FROM cycle_counts WHERE id = $1::uuid`, sessionId);
      return `not_open:${row?.status}`;
    });
  }

  // ------------------------------------------------------------------ casos
  test("B0 · postura dos dois papéis (NOSUPERUSER, sem BYPASSRLS), tag propagada, READ COMMITTED, modo prisma", async () => {
    const h = await harness();
    assert.equal(h.env.CORE_SAAS_PERSISTENCE, "prisma", "a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma (rodar em memory é verde-cego)");
    for (const [role, app] of [
      [h.roleA, appA],
      [h.roleB, appB],
    ] as const) {
      const rows = await h.admin.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
        role.roleName,
      );
      assert.equal(rows[0]?.rolsuper, false, `${role.roleName} não pode ser superusuário`);
      assert.equal(rows[0]?.rolbypassrls, false, `${role.roleName} não pode bypassar RLS`);
      await assertApplicationNamePropagated(role.client as any, app);
    }
    await assertApplicationNamePropagated(h.admin as any, appAdmin);
    const t = await newTenant(h, "b0");
    const iso = await h.withTenantRls(h.roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting('transaction_isolation') AS iso`));
    assert.equal((iso as Array<{ iso: string }>)[0]!.iso, "read committed");
  });

  test("B1 [encerramento] · fechamento 2× concorrente da MESMA sessão × RACE_N → exatamente 1×200 + 1×422, UM ajuste, saldo 7", async () => {
    const h = await harness();
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "b1");
      const x = await newItem(h, t, { base: 10, avg: 2 });
      const session = await rawSession(h, t, [{ item: x, system: 10, counted: 7 }]);
      const outcomes = await raceTwo(
        () => h.cycleA.close(actorOf(t), session.id),
        () => h.cycleB.close(actorOf(t), session.id),
      );
      assertNoDeadlockOrTimeout(outcomes, `B1 it=${it}`);
      assert.deepEqual(outcomes.map(describe).sort(), ["422|invalid_status_transition", "ok"], `B1 it=${it}: um vencedor, um perdedor`);
      const st = await state(h, t, session.id);
      assert.equal(st.ajustes, 1, `B1 it=${it}: exatamente UM ajuste no razão`);
      assert.equal(st.dup, 0);
      assert.equal(st.status, "concluida");
      assert.equal(await saldoBase(h, t, x), 7, `B1 it=${it}: saldo 7`);
      assert.equal(outcomes.map(totalOf).find((total) => total !== undefined), -6, `B1 it=${it}: total do único 200`);
    }
  });

  test("B2 [retomável] · 20 itens, falha na unidade 8 → `fechando` com 7 aplicadas; cancel e recontagem da carimbada recusados; retomada conclui com o total da sessão inteira", async () => {
    const h = await harness();
    const t = await newTenant(h, "b2");
    const items = await newItems(h, t, 20, { base: 10, avg: 2 });
    const session = await rawSession(h, t, items.map((item) => ({ item, system: 10, counted: 7 })));
    const injected = new Error("B2: falha injetada na unidade 8 (dentro da transação, depois do carimbo)");

    const first = await captureSettled(
      h.cycleA.close(actorOf(t), session.id, {
        beforeUnitCommit: async ({ index }: { index: number }) => {
          if (index === 7) throw injected;
        },
      } as any),
    );
    assert.equal(first.status, "rejected", "o 1º close tinha de falhar na unidade 8");
    assert.equal((first as { reason: unknown }).reason, injected, "o erro ORIGINAL propaga");
    assert.deepEqual(await state(h, t, session.id), { status: "fechando", isActive: true, ajustes: 7, entries: 20, carimbadas: 7, dup: 0 });

    const cancel = await captureSettled(h.cycleB.cancel(actorOf(t), session.id));
    assert.equal(describe(cancel), "422|close_in_progress", "cancelar por cima de 7 ajustes aplicados é recusado");
    const [stampedEntry] = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM cycle_count_entries WHERE cycle_count_id = $1::uuid AND adjustment_movement_id IS NOT NULL LIMIT 1`,
      session.id,
    );
    const recount = await captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, stampedEntry!.id, { counted_quantity: 1 }));
    assert.equal(describe(recount), "422|entry_already_adjusted");

    const resumed = await captureSettled(h.cycleB.close(actorOf(t), session.id));
    assert.equal(describe(resumed), "ok", "a retomada conclui");
    assert.equal(totalOf(resumed), -120, "total da sessão INTEIRA (20 × −3 × 2), inclusive as 7 da 1ª chamada");
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 20, entries: 20, carimbadas: 20, dup: 0 });
  });

  test("B3 [recordEntry × fechamento] (T-01) · recontagem bloqueada atrás do fechamento decide SOB o lock da sessão: 422 e a entrada fica contado 7", async () => {
    const h = await harness();
    const t = await newTenant(h, "b3");
    const x = await newItem(h, t, { base: 10, avg: 2 });
    const session = await rawSession(h, t, [{ item: x, system: 10, counted: 7 }]);
    const entry = session.entries[0]!;
    // O fechamento inteiro, NÃO commitado: carimbo ANTES do B (arranjo especificado no plano).
    const holder = holdInAdminTx(h, async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE id = $1::uuid FOR UPDATE`, session.id);
      await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status = 'fechando' WHERE id = $1::uuid AND status = 'aberta'`, session.id);
      const [movement] = await tx.$queryRawUnsafe(
        `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id)
         VALUES ($1::uuid, $2::uuid, 'ajuste', -3, 'base', $3::uuid) RETURNING id`,
        t,
        x,
        session.id,
      );
      await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance = -3, adjustment_movement_id = $2::uuid WHERE id = $1::uuid`, entry, movement.id);
      await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status = 'concluida' WHERE id = $1::uuid AND status = 'fechando'`, session.id);
    });
    await holder.locked;
    const b = captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, entry, { counted_quantity: 5 }));
    // `tenant_id` casa nos DOIS mundos (head-base: UPDATE da entrada; bloco: SELECT … FOR SHARE da sessão).
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "tenant_id", label: "B3" });
    const blocked = await blockedQueries(h, appB);
    holder.release();
    assert.equal((await holder.done).status, "fulfilled");
    const outcome = await b;

    // 1ª asserção = a INVARIANTE (vermelha no head-base: B gravava contado 5 por cima do carimbo).
    assert.deepEqual(await entryOf(h, entry), { counted: 7, variance: -3, stamped: true }, "a entrada carimbada não é regravada");
    assert.equal(describe(outcome), "422|invalid_status_transition", "B relê `concluida` sob o lock e recusa");
    // 2ª asserção = o desenho: B esperou NO LOCK DA SESSÃO.
    assert.ok(blocked.some((query) => query.includes("cycle_counts")), `B bloqueado no lock da sessão — ${blocked.join(" | ")}`);
  });

  test("B4 [cancel × fechamento aplicado] · cancelar atrás de uma unidade aplicada → 422 close_in_progress; o fechamento conclui depois", async () => {
    const h = await harness();
    const t = await newTenant(h, "b4");
    const x = await newItem(h, t, { base: 10, avg: 2 });
    const session = await rawSession(h, t, [{ item: x, system: 10, counted: 7 }]);
    const entry = session.entries[0]!;
    // Uma unidade do fechamento aplicada e NÃO commitada (sessão `fechando`, ajuste + carimbo).
    const holder = holdInAdminTx(h, async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE id = $1::uuid FOR UPDATE`, session.id);
      await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status = 'fechando' WHERE id = $1::uuid AND status = 'aberta'`, session.id);
      const [movement] = await tx.$queryRawUnsafe(
        `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id)
         VALUES ($1::uuid, $2::uuid, 'ajuste', -3, 'base', $3::uuid) RETURNING id`,
        t,
        x,
        session.id,
      );
      await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance = -3, adjustment_movement_id = $2::uuid WHERE id = $1::uuid`, entry, movement.id);
    });
    await holder.locked;
    const b = captureSettled(h.cycleB.cancel(actorOf(t), session.id));
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "tenant_id", label: "B4" });
    const blocked = await blockedQueries(h, appB);
    holder.release();
    assert.equal((await holder.done).status, "fulfilled");
    const outcome = await b;

    // 1ª asserção = a INVARIANTE (vermelha no head-base: `cancelada` com o ajuste no razão).
    assert.equal(describe(outcome), "422|close_in_progress", "nunca cancelar por cima de ajuste aplicado");
    assert.deepEqual(await state(h, t, session.id), { status: "fechando", isActive: true, ajustes: 1, entries: 1, carimbadas: 1, dup: 0 });
    const closed = await captureSettled(h.cycleA.close(actorOf(t), session.id));
    assert.equal(describe(closed), "ok");
    assert.equal(totalOf(closed), -6);
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 1, entries: 1, carimbadas: 1, dup: 0 });
    assert.ok(blocked.some((query) => query.includes("cycle_counts")), `B bloqueado no lock da sessão — ${blocked.join(" | ")}`);
  });

  test("B5 [estado `fechando`] · recontagem da carimbada 422, cancel 422, `close` de OUTRA instância do serviço retoma e conclui", async () => {
    const h = await harness();
    const t = await newTenant(h, "b5");
    const [x, y] = await newItems(h, t, 2, { base: 10, avg: 2 });
    const session = await rawSession(h, t, [
      { item: x!, system: 10, counted: 7 },
      { item: y!, system: 10, counted: 7 },
    ], "fechando");
    await rawStamp(h, t, session.id, session.entries[0]!, x!, -3);

    assert.equal(describe(await captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, session.entries[0]!, { counted_quantity: 9 }))), "422|entry_already_adjusted");
    assert.equal(describe(await captureSettled(h.cycleB.cancel(actorOf(t), session.id))), "422|close_in_progress");
    const otherInstance = h.cycleServiceOf(h.roleB.client);
    const closed = await captureSettled(otherInstance.close(actorOf(t), session.id));
    assert.equal(describe(closed), "ok", "o `close` de outra instância retoma o `fechando`");
    assert.equal(totalOf(closed), -12, "total da sessão inteira (a carimbada antes + a aplicada agora)");
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 2, entries: 2, carimbadas: 2, dup: 0 });
  });

  test("B6 [cross-tenant] · close/cancel/recordEntry/get de T1 contra a sessão de T2 → 404; open de T1 ignora a sessão de T2; nada muda em T2", async () => {
    const h = await harness();
    const t1 = await newTenant(h, "b6-t1");
    const t2 = await newTenant(h, "b6-t2");
    const x1 = await newItem(h, t1, { base: 10 });
    const x2 = await newItem(h, t2, { base: 10 });
    const session2 = await rawSession(h, t2, [{ item: x2, system: 10, counted: 7 }]);
    const before = await state(h, t2, session2.id);

    for (const [label, call] of [
      ["close", () => h.cycleA.close(actorOf(t1), session2.id)],
      ["cancel", () => h.cycleA.cancel(actorOf(t1), session2.id)],
      ["recordEntry", () => h.cycleA.recordEntry(actorOf(t1), session2.id, session2.entries[0]!, { counted_quantity: 1 })],
      ["get", () => h.cycleA.get(actorOf(t1), session2.id)],
    ] as const) {
      const outcome = await captureSettled((call as () => Promise<unknown>)());
      assert.match(describe(outcome), /^404\|/, `${label} cross-tenant tem de ser 404 — ${describe(outcome)}`);
    }
    // I9 é da organização: a sessão aberta de T2 não recusa o open de T1, e o open de T1 não vê itens de T2.
    const opened = await h.cycleA.open(actorOf(t1), {});
    assert.deepEqual(opened.entries.map((entry: { itemId: string }) => entry.itemId), [x1]);
    assert.deepEqual(await state(h, t2, session2.id), before, "nada mudou em T2");
    assert.deepEqual(await entryOf(h, session2.entries[0]!), { counted: 7, variance: null, stamped: false });
    assert.equal(await saldoBase(h, t2, x2), 10);
  });

  test("B7 [legado P-021] · `aberta` com um ajuste da sessão gravado antes do bloco → reaproveita (1 ajuste) e o total o inclui", async () => {
    const h = await harness();
    const t = await newTenant(h, "b7");
    const x = await newItem(h, t, { base: 10, avg: 2 });
    const session = await rawSession(h, t, [{ item: x, system: 10, counted: 7 }]);
    const legacy = await rawMovement(h, t, x, "ajuste", -3, { cycleCount: session.id });

    const closed = await captureSettled(h.cycleA.close(actorOf(t), session.id));
    assert.equal(describe(closed), "ok");
    assert.equal(totalOf(closed), -6, "o total inclui o ajuste reaproveitado");
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 1, entries: 1, carimbadas: 1, dup: 0 });
    const [stamp] = await h.admin.$queryRawUnsafe<Array<{ adj: string }>>(
      `SELECT adjustment_movement_id::text AS adj FROM cycle_count_entries WHERE id = $1::uuid`,
      session.entries[0]!,
    );
    assert.equal(stamp!.adj, legacy, "a entrada carimba o ajuste de legado (não cria outro)");
    assert.equal(await saldoBase(h, t, x), 7);
  });

  test("B8 [I7] (T-03) · (i) CONTROLE: dois itens FOR UPDATE na mesma tx × open()/recalculateAbc() reais → 40P01; (ii) código real com o gancho DENTRO da tx → zero 40P01", async () => {
    const h = await harness();
    const setup = async (tag: string, withConsumption: boolean) => {
      const t = await newTenant(h, tag);
      const [low, high] = [randomUUID(), randomUUID()].sort();
      const x = await newItem(h, t, { id: low, base: 100, avg: 1 });
      await sleep(20); // Y criado depois: `listItems` (created_at desc) põe Y antes de X no INSERT das entradas do open
      const y = await newItem(h, t, { id: high, base: 100, avg: 1 });
      if (withConsumption) {
        // consumo Y 50 > X 1 → o recálculo ABC atualiza Y ANTES de X
        await rawMovement(h, t, x, "saida", -1, { unitCost: 1 });
        await rawMovement(h, t, y, "saida", -50, { unitCost: 1 });
      }
      return { t, x, y };
    };

    // (i) CONTROLE VERMELHO — não é o código do bloco: o desenho v1 (sessão + X + Y FOR UPDATE numa transação).
    // A sessão da emulação não tem entradas: o I9 do bloco não intercepta o open, que pede KEY SHARE em Y e X.
    for (const kind of ["open", "abc"] as const) {
      const { t, x, y } = await setup(`b8-v1-${kind}`, kind === "abc");
      const control = await rawSession(h, t, []);
      const a = captureSettled(
        h.withTenantRls(h.roleA.client, t, async (tx: any) => {
          await tx.$queryRawUnsafe(SESSION_FOR_UPDATE, t, control.id);
          await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, t, x);
          await sleep(1500);
          await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, t, y);
        }),
      );
      await sleep(300);
      const b = captureSettled(kind === "open" ? h.cycleB.open(actorOf(t), {}) : h.inventoryB.recalculateAbc(actorOf(t)));
      const [ra, rb] = await Promise.all([a, b]);
      const described = [describe(ra), describe(rb)];
      assert.ok(
        described.some((d) => d.includes("40P01")) || described.includes("503|cycle_count_busy") || described.includes("503|stock_busy"),
        `B8(i) ${kind}: o controle v1 tinha de reproduzir o impasse — ${described.join(", ")}`,
      );
      console.log(`[B8(i)] controle v1 × ${kind}: ${described.join(" / ")}`);
    }

    // (ii) código real: a unidade segura sessão + X DENTRO da transação (gancho beforeUnitCommit, 1,5 s).
    {
      const { t, x, y } = await setup("b8-v3-abc", true);
      const session = await rawSession(h, t, [
        { item: x, system: 99, counted: 98 },
        { item: y, system: 50, counted: 49 },
      ]);
      const a = captureSettled(
        h.cycleA.close(actorOf(t), session.id, { beforeUnitCommit: async ({ itemId }: { itemId: string }) => (itemId === x ? sleep(1500) : undefined) } as any),
      );
      await sleep(300);
      const b = captureSettled(h.inventoryB.recalculateAbc(actorOf(t)));
      await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "inventory_items", label: "B8(ii) abc" });
      const blocked = await blockedQueries(h, appB);
      const [ra, rb] = await Promise.all([a, b]);
      assertNoDeadlockOrTimeout([ra, rb], "B8(ii) abc");
      assert.deepEqual([describe(ra), describe(rb)], ["ok", "ok"]);
      assert.ok(blocked.some((query) => query.includes("abc_class")), `B bloqueado no UPDATE abc_class — ${blocked.join(" | ")}`);
      assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 2, entries: 2, carimbadas: 2, dup: 0 });
    }
    {
      // D-4 (ata do dev): com I9, o open que incluiria X é RECUSADO sob o lock do tenant — não pede KEY SHARE no
      // item travado pela unidade, logo não espera e não forma ciclo.
      const { t, x, y } = await setup("b8-v3-open", false);
      const session = await rawSession(h, t, [
        { item: x, system: 100, counted: 99 },
        { item: y, system: 100, counted: 99 },
      ]);
      const a = captureSettled(
        h.cycleA.close(actorOf(t), session.id, { beforeUnitCommit: async ({ itemId }: { itemId: string }) => (itemId === x ? sleep(1500) : undefined) } as any),
      );
      await sleep(300);
      const startedB = Date.now();
      const rb = await captureSettled(h.cycleB.open(actorOf(t), {}));
      const elapsedB = Date.now() - startedB;
      const ra = await a;
      assertNoDeadlockOrTimeout([ra, rb], "B8(ii) open");
      assert.equal(describe(ra), "ok");
      assert.equal(describe(rb), "409|items_in_open_session");
      assert.ok(elapsedB < 1200, `o open recusado não espera o lock da unidade (${elapsedB} ms)`);
    }
  });

  test("B9 [N-OVL] · dois open() reais concorrentes sobre o mesmo item × RACE_N → exatamente UMA sessão + 409; fechar → saldo = físico", async () => {
    const h = await harness();
    let last: { t: string; x: string } | undefined;
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "b9");
      const x = await newItem(h, t, { base: 100 });
      const outcomes = await raceTwo(
        () => h.cycleA.open(actorOf(t), {}),
        () => h.cycleB.open(actorOf(t), {}),
      );
      assertNoDeadlockOrTimeout(outcomes, `B9 it=${it}`);
      assert.deepEqual(outcomes.map(describe).sort(), ["409|items_in_open_session", "ok"], `B9 it=${it}`);
      const [count] = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM cycle_counts WHERE tenant_id = $1::uuid`, t);
      assert.equal(count!.n, 1, `B9 it=${it}: exatamente UMA sessão sobre o item`);
      last = { t, x };
    }
    const { t, x } = last!;
    const [session] = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM cycle_counts WHERE tenant_id = $1::uuid`, t);
    const [entry] = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM cycle_count_entries WHERE cycle_count_id = $1::uuid`, session!.id);
    await h.cycleA.recordEntry(actorOf(t), session!.id, entry!.id, { counted_quantity: 99 });
    await h.cycleA.close(actorOf(t), session!.id);
    assert.equal(await saldoBase(h, t, x), 99, "saldo = físico (99), nunca 98");
    const reopened = await captureSettled(h.cycleB.open(actorOf(t), {}));
    assert.equal(describe(reopened), "ok", "depois de `concluida`, o item pode ser contado de novo");
  });

  test("B9b [I7 — sessões cruzadas] · [X,Y] e [Y,X] semeadas por SQL cru, fechadas em paralelo com 300 ms por unidade → as duas concluem, zero 40P01, zero duplicata", async () => {
    const h = await harness();
    const t = await newTenant(h, "b9b");
    const [x, y] = await newItems(h, t, 2, { base: 100, avg: 1 });
    // Estado só alcançável FORA do módulo (o open recusa a sobreposição) — sem asserção de saldo.
    const s1 = await rawSession(h, t, [
      { item: x!, system: 100, counted: 99 },
      { item: y!, system: 100, counted: 99 },
    ]);
    const s2 = await rawSession(h, t, [
      { item: y!, system: 100, counted: 99 },
      { item: x!, system: 100, counted: 99 },
    ]);
    const hold = { beforeUnitCommit: () => sleep(300) } as any;
    const outcomes = await raceTwo(
      () => h.cycleA.close(actorOf(t), s1.id, hold),
      () => h.cycleB.close(actorOf(t), s2.id, hold),
    );
    assertNoDeadlockOrTimeout(outcomes, "B9b");
    assert.deepEqual(outcomes.map(describe), ["ok", "ok"]);
    for (const session of [s1, s2]) {
      assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 2, entries: 2, carimbadas: 2, dup: 0 });
    }
  });

  test("B10 [tamanho] · N=250 itens divergentes → `concluida`, 250 ajustes e carimbos, total exato; duração e p95 por unidade publicados", async () => {
    const h = await harness();
    const t = await newTenant(h, "b10");
    const N = 250;
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (tenant_id, sku, name, unit, avg_cost) SELECT $1::uuid, 'SKU-B10-' || g, 'Item ' || g, 'un', 2 FROM generate_series(1, $2::int) g`,
      t,
      N,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type) SELECT tenant_id, id, 'entrada', 10, 2, 'base' FROM inventory_items WHERE tenant_id = $1::uuid`,
      t,
    );
    const [session] = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) SELECT tenant_id, $2::uuid, id, 10, 7 FROM inventory_items WHERE tenant_id = $1::uuid`,
      t,
      session!.id,
    );
    const stamps: number[] = [];
    const startedAt = Date.now();
    const closed = await captureSettled(
      h.cycleA.close(actorOf(t), session!.id, { beforeUnitCommit: async () => void stamps.push(Date.now()) } as any),
    );
    const elapsed = Date.now() - startedAt;
    assert.equal(describe(closed), "ok");
    assert.equal(totalOf(closed), -3 * 2 * N, "total = −3 × avg 2 × N");
    assert.deepEqual(await state(h, t, session!.id), { status: "concluida", isActive: true, ajustes: N, entries: N, carimbadas: N, dup: 0 });
    const units = stamps.map((stamp, index) => stamp - (index === 0 ? startedAt : stamps[index - 1]!)).sort((left, right) => left - right);
    const p95 = units[Math.min(units.length - 1, Math.floor(0.95 * units.length))];
    const mean = Math.round((units.reduce((sum, value) => sum + value, 0) / Math.max(1, units.length)) * 10) / 10;
    console.log(`[B10] N=${N}: total ${elapsed} ms; unidade média ${mean} ms · p95 ${p95} ms · máx ${units[units.length - 1]} ms`);
    assert.ok((units[units.length - 1] ?? 0) < 5000, "toda unidade cabe no timeout de 5 s");
  });

  test("B11 [S-01 parcial] · X aplicado, Y 409 → `fechando` com 1 carimbo; recontar Y 200, recontar X 422, cancel 422, `close` conclui com −5", async () => {
    const h = await harness();

    // CONTROLE VERMELHO — não é o código do bloco: o v2 no mesmo cenário fica PRESO (recontagem recusada).
    {
      const t = await newTenant(h, "b11-v2");
      const [x, y] = await newItems(h, t, 2, { base: 10, avg: 1 });
      await splitIntoVehicle(h, t, y!);
      const session = await rawSession(h, t, [
        { item: x!, system: 10, counted: 7 },
        { item: y!, system: 10, counted: 2 },
      ]);
      const closed = await captureSettled(closeV2(h, h.roleA.client, t, session.id));
      assert.equal(describe(closed), "409|insufficient_balance");
      assert.equal(await recordEntryV2(h, h.roleB.client, t, session.id, session.entries[1]!, 8), "not_open:fechando", "controle v2: recontagem recusada em `fechando`");
      assert.equal(await cancelV2(h, h.roleB.client, t, session.id), "not_open:fechando", "controle v2: cancel recusado em `fechando`");
    }

    const t = await newTenant(h, "b11");
    const [x, y] = await newItems(h, t, 2, { base: 10, avg: 1 });
    await splitIntoVehicle(h, t, y!);
    const session = await rawSession(h, t, [
      { item: x!, system: 10, counted: 7 },
      { item: y!, system: 10, counted: 2 },
    ]);
    const [entryX, entryY] = session.entries;

    const first = await captureSettled(h.cycleA.close(actorOf(t), session.id));
    assert.equal(describe(first), "409|insufficient_balance", "o erro da unidade propaga com o status de hoje");
    assert.deepEqual(await state(h, t, session.id), { status: "fechando", isActive: true, ajustes: 1, entries: 2, carimbadas: 1, dup: 0 });

    const recountY = await captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, entryY!, { counted_quantity: 8 }));
    assert.equal(describe(recountY), "ok", "recontar a entrada NÃO carimbada é a saída do `fechando`");
    assert.equal(describe(await captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, entryX!, { counted_quantity: 9 }))), "422|entry_already_adjusted");
    assert.equal(describe(await captureSettled(h.cycleB.cancel(actorOf(t), session.id))), "422|close_in_progress");

    const resumed = await captureSettled(h.cycleB.close(actorOf(t), session.id));
    assert.equal(describe(resumed), "ok");
    assert.equal(totalOf(resumed), -5, "total da sessão inteira: X −3 + Y −2");
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 2, entries: 2, carimbadas: 2, dup: 0 });
    assert.deepEqual(await entryOf(h, entryX!), { counted: 7, variance: -3, stamped: true });
    assert.deepEqual(await entryOf(h, entryY!), { counted: 8, variance: -2, stamped: true });
  });

  test("B12 [listagem · memória] · `?status=fechando` é aceito e lista a sessão em fechamento", async () => {
    const h = await harness();
    const memory = h.ccService.createMemoryCycleCountService({} as any);
    const repository = h.ccService.getMemoryCycleCountRepositoryForTests() as any;
    const tenantId = randomUUID();
    const opened = await repository.createSession({ tenantId, entries: [] });
    await repository.beginClose(tenantId, opened.id);
    const listed = await memory.list(actorOf(tenantId), { status: "fechando" });
    assert.deepEqual(
      listed.items.map((item: { id: string; status: string }) => [item.id, item.status]),
      [[opened.id, "fechando"]],
    );
  });

  test("B12 [listagem · Prisma] · `?status=fechando` é aceito e lista a sessão em fechamento", async () => {
    const h = await harness();
    const t = await newTenant(h, "b12");
    const x = await newItem(h, t, { base: 10 });
    const closing = await rawSession(h, t, [{ item: x, system: 10, counted: 7 }], "fechando");
    await rawSession(h, t, [], "aberta");
    const listed = await h.cycleA.list(actorOf(t), { status: "fechando" });
    assert.deepEqual(
      listed.items.map((item: { id: string; status: string }) => [item.id, item.status]),
      [[closing.id, "fechando"]],
    );
  });

  test("B13 [S-01 — STUCK do crítico] · BASE 4 + viatura 6, open real, contado 2 → 409 e a sessão VOLTA a `aberta`: recontagem e cancel aceitos; recontar 8 e fechar → −2", async () => {
    const h = await harness();

    // CONTROLE VERMELHO — não é o código do bloco: o v2 no mesmo cenário fica PRESO em `fechando`.
    {
      const t = await newTenant(h, "b13-v2");
      const x = await newItem(h, t, { base: 10, avg: 1 });
      await splitIntoVehicle(h, t, x);
      const opened = await h.cycleA.open(actorOf(t), {});
      await h.cycleA.recordEntry(actorOf(t), opened.id, opened.entries[0].id, { counted_quantity: 2 });
      assert.equal(describe(await captureSettled(closeV2(h, h.roleA.client, t, opened.id))), "409|insufficient_balance");
      assert.equal(await recordEntryV2(h, h.roleB.client, t, opened.id, opened.entries[0].id, 4), "not_open:fechando");
      assert.equal(await cancelV2(h, h.roleB.client, t, opened.id), "not_open:fechando");
      assert.equal(describe(await captureSettled(closeV2(h, h.roleA.client, t, opened.id))), "409|insufficient_balance", "controle v2: a retomada falha de novo — beco sem saída");
      assert.equal((await state(h, t, opened.id)).status, "fechando");
    }

    const t = await newTenant(h, "b13");
    const x = await newItem(h, t, { base: 10, avg: 1 });
    await splitIntoVehicle(h, t, x);
    const opened = await h.cycleA.open(actorOf(t), {});
    assert.equal(opened.entries[0].systemQuantity, 10, "o open fotografa o saldo total (BASE 4 + viatura 6)");
    await h.cycleA.recordEntry(actorOf(t), opened.id, opened.entries[0].id, { counted_quantity: 2 });

    const closed = await captureSettled(h.cycleA.close(actorOf(t), opened.id));
    assert.equal(describe(closed), "409|insufficient_balance");
    assert.deepEqual(await state(h, t, opened.id), { status: "aberta", isActive: true, ajustes: 0, entries: 1, carimbadas: 0, dup: 0 }, "sem ajuste aplicado, a sessão volta a `aberta`");
    assert.equal(describe(await captureSettled(h.cycleB.recordEntry(actorOf(t), opened.id, opened.entries[0].id, { counted_quantity: 4 }))), "ok");
    assert.equal(describe(await captureSettled(h.cycleB.cancel(actorOf(t), opened.id))), "ok");

    const second = await h.cycleA.open(actorOf(t), {});
    await h.cycleA.recordEntry(actorOf(t), second.id, second.entries[0].id, { counted_quantity: 8 });
    const done = await captureSettled(h.cycleA.close(actorOf(t), second.id));
    assert.equal(describe(done), "ok");
    assert.equal(totalOf(done), -2);
    assert.equal((await state(h, t, second.id)).status, "concluida");
    assert.equal(await saldoBase(h, t, x), 2, "saldo BASE 4 − 2");
  });

  test("B14 [S-02 — TVV_resume] · 5 itens avg 2, 3º falha, entrada +9, retomada → 200 e auditoria `cycle_count.closed` com −30 (a sessão inteira)", async () => {
    const h = await harness();
    const scenario = async (tag: string) => {
      const t = await newTenant(h, tag);
      const items = await newItems(h, t, 5, { base: 10, avg: 2 });
      const session = await rawSession(h, t, items.map((item) => ({ item, system: 10, counted: 7 })));
      await rawMovement(h, t, items[2]!, "saida", -9); // 3º item com BASE 1 → o ajuste −3 estoura
      return { t, items, session };
    };

    // CONTROLE VERMELHO — não é o código do bloco: o v2 soma só as unidades DESTA chamada (−18).
    {
      const { t, items, session } = await scenario("b14-v2");
      assert.equal(describe(await captureSettled(closeV2(h, h.roleA.client, t, session.id))), "409|insufficient_balance");
      await rawMovement(h, t, items[2]!, "entrada", 9, { unitCost: 2 });
      const resumed = await captureSettled(closeV2(h, h.roleA.client, t, session.id));
      assert.equal(totalOf(resumed), -18, "controle v2: total por chamada (errado)");
    }

    const { t, items, session } = await scenario("b14");
    assert.equal(describe(await captureSettled(h.cycleA.close(actorOf(t), session.id))), "409|insufficient_balance");
    assert.deepEqual(await state(h, t, session.id), { status: "fechando", isActive: true, ajustes: 2, entries: 5, carimbadas: 2, dup: 0 });
    await rawMovement(h, t, items[2]!, "entrada", 9, { unitCost: 2 });

    // Pelo controller (a auditoria grava o mesmo `totalVarianceValue` do 200).
    const request = {
      tenantContext: { tenantId: t, roles: [], permissions: [] },
      params: { cycleCountId: session.id },
      header: () => undefined,
    } as any;
    const response = await h.controllerOf(h.cycleA).close(request);
    assert.equal(response.data.totalVarianceValue ?? response.data.total_variance_value, -30, `200 com o total da sessão inteira — ${JSON.stringify(response.data).slice(0, 200)}`);
    const audits = await h.admin.$queryRawUnsafe<Array<{ metadata: Record<string, unknown> }>>(
      `SELECT metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'cycle_count.closed' AND entity_id = $2`,
      t,
      session.id,
    );
    assert.equal(audits.length, 1, "uma auditoria `cycle_count.closed`");
    assert.equal(Number(JSON.stringify(audits[0]!.metadata).match(/"totalVarianceValue":(-?[\d.]+)/)?.[1]), -30, `auditoria com −30 — ${JSON.stringify(audits[0]!.metadata)}`);
    assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 5, entries: 5, carimbadas: 5, dup: 0 });
  });

  test("B15 [S-02 — TVV_concorrente] · 10 itens avg 2, dois `close` intercalados × RACE_N → o único 200 traz −60, 10 ajustes, zero duplicata", async () => {
    const h = await harness();
    const scenario = async (tag: string) => {
      const t = await newTenant(h, tag);
      const items = await newItems(h, t, 10, { base: 10, avg: 2 });
      const session = await rawSession(h, t, items.map((item) => ({ item, system: 10, counted: 7 })));
      return { t, session };
    };

    // CONTROLE VERMELHO — não é o código do bloco: v2 intercalado de forma determinística — A aplica 5 e para; B
    // retoma, aplica as outras 5 e conclui com o total SÓ das suas (−30).
    {
      const { t, session } = await scenario("b15-v2");
      let resumeA!: () => void;
      let pausedA!: () => void;
      const gate = new Promise<void>((resolve) => (resumeA = resolve));
      const paused = new Promise<void>((resolve) => (pausedA = resolve));
      const a = captureSettled(
        closeV2(h, h.roleA.client, t, session.id, {
          afterUnit: async (applied) => {
            if (applied === 5) {
              pausedA();
              await gate;
            }
          },
        }),
      );
      await paused;
      const b = await captureSettled(closeV2(h, h.roleB.client, t, session.id));
      resumeA();
      const ra = await a;
      assert.equal(totalOf(b), -30, "controle v2: o vencedor soma só as próprias unidades");
      assert.equal(describe(ra), "422|invalid_status_transition");
    }

    for (let it = 0; it < RACE_N; it += 1) {
      const { t, session } = await scenario("b15");
      const hold = { beforeUnitCommit: () => sleep(25) } as any;
      const outcomes = await raceTwo(
        () => h.cycleA.close(actorOf(t), session.id, hold),
        () => sleep(15).then(() => h.cycleB.close(actorOf(t), session.id, hold)),
      );
      assertNoDeadlockOrTimeout(outcomes, `B15 it=${it}`);
      assert.deepEqual(outcomes.map(describe).sort(), ["422|invalid_status_transition", "ok"], `B15 it=${it}`);
      assert.equal(outcomes.map(totalOf).find((total) => total !== undefined), -60, `B15 it=${it}: o único 200 traz a sessão inteira`);
      assert.deepEqual(await state(h, t, session.id), { status: "concluida", isActive: true, ajustes: 10, entries: 10, carimbadas: 10, dup: 0 });
    }
  });

  test("B16 [recontagem em `fechando` × unidade] · recontar Y enquanto a unidade de X segura a sessão → bloqueia no FOR SHARE, 200, e a unidade de Y aplica o contado FINAL", async () => {
    const h = await harness();
    const t = await newTenant(h, "b16");
    const [x, y] = await newItems(h, t, 2, { base: 10, avg: 2 });
    const session = await rawSession(h, t, [
      { item: x!, system: 10, counted: 7 },
      { item: y!, system: 10, counted: 7 },
    ]);
    const a = captureSettled(
      h.cycleA.close(actorOf(t), session.id, { beforeUnitCommit: async ({ itemId }: { itemId: string }) => (itemId === x ? sleep(1500) : undefined) } as any),
    );
    await sleep(300);
    const b = captureSettled(h.cycleB.recordEntry(actorOf(t), session.id, session.entries[1]!, { counted_quantity: 5 }));
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "cycle_counts", label: "B16" });
    const blocked = await blockedQueries(h, appB);
    const [ra, rb] = await Promise.all([a, b]);
    assertNoDeadlockOrTimeout([ra, rb], "B16");
    assert.equal(describe(rb), "ok", "a entrada ainda não carimbada aceita a recontagem");
    assert.equal(describe(ra), "ok");
    assert.equal(totalOf(ra), (-3 + -5) * 2, "o total usa o contado FINAL de Y");
    const rows = await h.admin.$queryRawUnsafe<Array<{ counted: number; system: number; variance: number }>>(
      `SELECT counted_quantity::float8 AS counted, system_quantity::float8 AS system, variance::float8 AS variance FROM cycle_count_entries WHERE cycle_count_id = $1::uuid ORDER BY item_id`,
      session.id,
    );
    assert.deepEqual(rows.map((row) => [row.counted, row.variance]), [[7, -3], [5, -5]]);
    assert.ok(rows.every((row) => row.variance === row.counted - row.system), "variance = contado − sistema em toda entrada");
    assert.ok(blocked.some((query) => /FOR SHARE/i.test(query)), `B bloqueado no FOR SHARE da sessão — ${blocked.join(" | ")}`);
  });

  test("B17 [cancel em `fechando` sem carimbos] · crash antes da 1ª unidade → cancel 200; com 1 carimbo → 422 close_in_progress", async () => {
    const h = await harness();
    const t = await newTenant(h, "b17");
    const [x, y] = await newItems(h, t, 2, { base: 10, avg: 2 });
    const bare = await rawSession(h, t, [{ item: x!, system: 10, counted: 7 }], "fechando");
    const cancelled = await captureSettled(h.cycleA.cancel(actorOf(t), bare.id));
    assert.equal(describe(cancelled), "ok", "fechando sem ajuste aplicado sai por cancel");
    assert.deepEqual(await state(h, t, bare.id), { status: "cancelada", isActive: false, ajustes: 0, entries: 1, carimbadas: 0, dup: 0 });

    const stamped = await rawSession(h, t, [{ item: y!, system: 10, counted: 7 }], "fechando");
    await rawStamp(h, t, stamped.id, stamped.entries[0]!, y!, -3);
    assert.equal(describe(await captureSettled(h.cycleA.cancel(actorOf(t), stamped.id))), "422|close_in_progress");
    assert.equal((await state(h, t, stamped.id)).status, "fechando");
  });
}

/** Teardown ESCOPADO por tenant_id do próprio arquivo, em ordem de FK — nunca wildcard (lição do PR-05 Ω5P). */
async function teardownTenants(admin: any, tenants: readonly string[]): Promise<void> {
  if (tenants.length === 0) return;
  const ids = [...tenants];
  await admin.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM cycle_count_entries WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM cycle_counts WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM inventory_items WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM vehicles WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
}
