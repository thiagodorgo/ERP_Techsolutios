import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  createGate,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a · T-A (Ω6R-DAT-002 + P-020) — SALDO NUNCA NEGATIVO SOB CONCORRÊNCIA, contra o Postgres REAL.
//
// O ACHADO: a saída lia o saldo (aggregate), decidia e escrevia SEM lock nem CAS: 20 saídas de 1 sobre
// saldo 10, disparadas juntas por duas conexões, eram TODAS aceitas — saldo −10. A mesma classe em toda
// via que chega a `insertMovement`/`avg_cost` (V1–V5): transferência, estorno duplo, estorno duplo de
// baixa, custo médio calculado sobre saldo lido sem lock, e o `catch` de P2002 DENTRO da transação (25P02).
//
// O QUE ESTA SUÍTE PROVA (nunca em memória — memória não é evidência de atomicidade):
//   A0        postura dos dois papéis (NOSUPERUSER, sem BYPASSRLS), tag propagada, READ COMMITTED
//   A1  [enc] 20 saídas concorrentes (10 por A + 10 por B, largada comum) × RACE_N → exatamente 10 ok, saldo 0
//   A2  [bar] saída bloqueada no FOR UPDATE do item decide sob o lock (1ª asserção = a invariante)
//   A3–A6     link, ajuste, saída de custódia de viatura, baixa por fonte — 20 concorrentes sobre saldo 10
//   A7/A7b    estorno duplo concorrente → UMA compensação (duas para o par), perdedor 409
//   A8        estorno duplo de baixa → UMA compensação, perdedor no-op
//   A9        custo médio sobre saldo serializado (2,333333, não 2,0)
//   A10       baixa dupla da MESMA fonte → mesmo id, zero 25P02
//   A11       item de outro tenant → undefined, nada escrito
//   A12       I7: unidade do fechamento segurando sessão + item × open()/recalculateAbc() reais — zero 40P01
//   A13       forma do contrato (saída simples; acima do saldo → 409 com o saldo)
//   A14       contenção > timeout → 503 stock_busy, nada gravado; o mapeamento nas três formas medidas
//
// Serviços sob teste rodam nos clientes de DOIS papéis efêmeros NOSUPERUSER (RLS FORCE vale para eles); o
// admin só semeia, observa pg_stat_activity e faz teardown escopado por tenant_id, em ordem de FK.
// Barreira = statement bloqueado DA PRÓPRIA SUÍTE (application_name). `40P01` nunca é aceitável.
// DB-gated: sem DATABASE_URL o arquivo DECLARA o pulo (conta no piso do runner).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const RACE_N = 10;

if (!connectionString) {
  test("B-O6R-04a T-A (saldo sob concorrência) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const appAdmin = buildApplicationName("inv-lock-admin");
  const appA = buildApplicationName("inv-lock-a");
  const appB = buildApplicationName("inv-lock-b");

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const inv = await import("../src/modules/inventory/inventory-prisma.repository.js");
    const cc = await import("../src/modules/inventory/cycle-count-prisma.repository.js");
    // A porta de unidade só existe depois do bloco: no head-base (vermelho-controle) o import falha e o serviço
    // antigo é construído sem ela — os casos então medem o código antigo, não uma falha de import.
    const uow = await import("../src/modules/inventory/inventory-uow-prisma.js").catch(() => undefined);
    const { CycleCountService } = await import("../src/modules/inventory/cycle-count.service.js");
    const { InventoryService } = await import("../src/modules/inventory/inventory.service.js");
    const { withTenantRls } = await import("../src/database/rls.js");
    const { env } = await import("../src/config/env.js");

    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString!, appAdmin) }) });
    const roleA: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, appA));
    const roleB: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, appB));
    const tenants: string[] = [];

    const repoOf = (client: any) => new inv.RlsPrismaInventoryRepository(client);
    const inventoryServiceOf = (client: any) => new InventoryService(repoOf(client));
    const cycleServiceOf = (client: any) =>
      new CycleCountService(
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
      inv,
      withTenantRls,
      repoA: repoOf(roleA.client),
      repoB: repoOf(roleB.client),
      inventoryA: inventoryServiceOf(roleA.client),
      inventoryB: inventoryServiceOf(roleB.client),
      cycleA: cycleServiceOf(roleA.client),
      cycleB: cycleServiceOf(roleB.client),
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
    }
  });

  // ------------------------------------------------------------------ semeadura (admin, SQL cru)
  /**
   * ESTÍMULO DO A14 — a única espera fixa desta suíte, ISENTA POR NOME na catraca de higiene do T-D
   * (isenção anônima seria o mesmo buraco com outra roupa).
   *
   * MEDIDO NESTA BANCADA, e contradiz "basta esperar o desfecho de B": com o refém segurando, B NÃO
   * liquida sozinho — ficou bloqueado **60.042 ms**, até o refém morrer de velho na própria janela
   * de 60 s. A causa tem duas metades, as duas verificadas: (i) o produto não define `lock_timeout`
   * (`grep -rn lock_timeout src/` devolve ZERO), logo o statement espera indefinidamente no
   * Postgres; (ii) o timeout da transação interativa do Prisma NÃO interrompe um statement que está
   * esperando LOCK no banco — ele só é notado quando o controle volta ao cliente.
   *
   * Logo a duração é a VARIÁVEL INDEPENDENTE deste caso, não um encontro por relógio: o que produz o
   * 503 é a contenção durar MAIS que o orçamento da transação; esperar menos devolveria 201. A
   * margem é para CIMA (carga só faz esperar mais, nunca menos) e o teto de 60 s do refém dá 10x de
   * folga — é por isto que este caso é FEIO, não frágil. O orçamento em si é IMPLÍCITO em
   * `src/database/rls.ts`, que abre `$transaction` sem opções: enquanto não for nomeado lá
   * (pendência `P-RLS-TX-TIMEOUT-IMPLICITO`), nenhum teste pode LER o número — só reproduzi-lo.
   */
  const A14_CONTENTION_MS = 5_500;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const actorOf = (tenantId: string) => ({ tenantId, userId: randomUUID(), roles: [], permissions: [] }) as any;

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `inv-lock-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  /**
   * Carimbos EXPLÍCITOS de `created_at`, em ordem de criação (o último é o mais NOVO). A ordem que
   * `listItems` devolve (`orderBy: created_at desc`, `inventory-prisma.repository.ts`) passa a ser DADO
   * DO FIXTURE em vez de corrida de relógio: some a dependência da resolução do `now()` entre dois
   * INSERTs — e com ela o `sleep(20)` que existia só para separá-los.
   */
  function createdAtSeries(n: number): string[] {
    const base = Date.now() - n * 1000;
    return Array.from({ length: n }, (_, index) => new Date(base + index * 1000).toISOString());
  }

  async function newItem(
    h: Harness,
    tenantId: string,
    options: { id?: string; base?: number; avg?: number; createdAt?: string } = {},
  ): Promise<string> {
    const id = options.id ?? randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, tenant_id, sku, name, unit, avg_cost, created_at)
       VALUES ($1::uuid, $2::uuid, $3, $3, 'un', $4::numeric, COALESCE($5::timestamptz, now()))`,
      id,
      tenantId,
      `SKU-${id.slice(0, 13)}`,
      options.avg ?? 0,
      options.createdAt ?? null,
    );
    if (options.base) await rawMovement(h, tenantId, id, "entrada", options.base, { unitCost: options.avg ?? 1 });
    return id;
  }

  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Guincho') RETURNING id`,
      tenantId,
      `INV${Math.floor(Math.random() * 9000 + 1000)}`,
    );
    return rows[0]!.id;
  }

  async function rawMovement(
    h: Harness,
    tenantId: string,
    itemId: string,
    type: string,
    quantity: number,
    options: { unitCost?: number; custody?: string; vehicle?: string; group?: string; reverses?: string; sourceType?: string; sourceId?: string } = {},
  ): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type, custody_vehicle_id, transfer_group_id, reverses_movement_id, source_type, source_id)
       VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5::numeric, $6, $7::uuid, $8::uuid, $9::uuid, $10, $11::uuid) RETURNING id`,
      tenantId,
      itemId,
      type,
      quantity,
      options.unitCost ?? null,
      options.custody ?? "base",
      options.vehicle ?? null,
      options.group ?? null,
      options.reverses ?? null,
      options.sourceType ?? null,
      options.sourceId ?? null,
    );
    return rows[0]!.id;
  }

  async function saldo(h: Harness, tenantId: string, itemId: string, custody: { type: string; vehicle?: string } = { type: "base" }): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ s: number }>>(
      `SELECT COALESCE(SUM(quantidade_sinalizada), 0)::float8 AS s FROM stock_movements
        WHERE tenant_id = $1::uuid AND item_id = $2::uuid AND custody_type = $3 AND custody_vehicle_id IS NOT DISTINCT FROM $4::uuid`,
      tenantId,
      itemId,
      custody.type,
      custody.vehicle ?? null,
    );
    return Number(rows[0]!.s);
  }

  async function compensationsOf(h: Harness, movementIds: readonly string[]): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM stock_movements WHERE reverses_movement_id = ANY($1::uuid[])`,
      [...movementIds],
    );
    return rows[0]!.n;
  }

  async function blockedQueries(h: Harness, applicationName: string): Promise<string[]> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ q: string }>>(
      `SELECT query AS q FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock' AND state = 'active'`,
      applicationName,
    );
    return rows.map((row) => row.q);
  }

  /** Uma transação do admin que toma o lock pedido e o SEGURA até `release()`. `locked` resolve quando o lock foi tomado. */
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

  /** 20 operações concorrentes (10 por A, 10 por B), largada comum. */
  async function race20(h: Harness, op: (repo: any, index: number) => Promise<unknown>): Promise<SettledOutcome<unknown>[]> {
    let go!: () => void;
    const start = new Promise<void>((resolve) => (go = resolve));
    const all = Array.from({ length: 20 }, (_, index) =>
      captureSettled(start.then(() => op(index % 2 === 0 ? h.repoA : h.repoB, index))),
    );
    go();
    return Promise.all(all);
  }

  function assertTenOkTenInsufficient(outcomes: readonly SettledOutcome<unknown>[], label: string): void {
    assertNoDeadlockOrTimeout(outcomes, label);
    const described = outcomes.map(describe);
    assert.equal(described.filter((d) => d === "ok").length, 10, `${label}: exatamente 10 aceitas — ${described.join(", ")}`);
    assert.deepEqual(
      [...new Set(described.filter((d) => d !== "ok"))],
      ["409|insufficient_balance"],
      `${label}: as 10 recusadas são 409 insufficient_balance`,
    );
  }

  // ------------------------------------------------------------------ casos
  test("A0 · postura dos dois papéis (NOSUPERUSER, sem BYPASSRLS), tag propagada, READ COMMITTED, modo prisma", async () => {
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
    const t = await newTenant(h, "a0");
    const iso = await h.withTenantRls(h.roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting('transaction_isolation') AS iso`));
    assert.equal((iso as Array<{ iso: string }>)[0]!.iso, "read committed");
  });

  test("A1 [encerramento] · 20 saídas concorrentes de 1 sobre saldo 10 (duas conexões, largada comum) × RACE_N → exatamente 10, saldo 0", async () => {
    const h = await harness();
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "a1");
      const item = await newItem(h, t, { base: 10 });
      const startedAt = Date.now();
      const outcomes = await race20(h, (repo) =>
        repo.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1 }),
      );
      const elapsed = Date.now() - startedAt;
      assertTenOkTenInsufficient(outcomes, `A1 it=${it}`);
      const final = await saldo(h, t, item);
      assert.ok(final >= 0, `A1 it=${it}: saldo negativo (${final})`);
      assert.equal(final, 0, `A1 it=${it}: saldo final`);
      console.log(`[A1] it=${it} 20 saídas em ${elapsed} ms`);
    }
  });

  test("A2 [barreira] · saída bloqueada no FOR UPDATE do item decide SOB o lock: 409 e saldo 0 (não −1)", async () => {
    const h = await harness();
    const t = await newTenant(h, "a2");
    const item = await newItem(h, t, { base: 10 });
    const holder = holdInAdminTx(h, async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, t, item);
      await tx.$executeRawUnsafe(
        `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type) VALUES ($1::uuid, $2::uuid, 'saida', -10, 'base')`,
        t,
        item,
      );
    });
    await holder.locked;
    const b = captureSettled(h.repoB.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1 }));
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "tenant_id", label: "A2" });
    const blocked = await blockedQueries(h, appB);
    holder.release();
    assert.equal((await holder.done).status, "fulfilled");
    const outcome = await b;

    // 1ª asserção = a INVARIANTE (vermelha no head-base: B commitava e o saldo ia a −1).
    assert.equal(describe(outcome), "409|insufficient_balance", "B decide sobre o saldo NOVO (0)");
    assert.equal(await saldo(h, t, item), 0, "saldo final 0, nunca −1");
    // 2ª asserção = o desenho: B esperou NO LOCK DO ITEM.
    assert.ok(blocked.some((query) => query.includes("inventory_items")), `B bloqueado no lock do item — ${blocked.join(" | ")}`);
  });

  test("A3 · link (BASE→viatura) ×20 concorrentes sobre BASE 10 → 10 aceitos, BASE 0, viatura 10", async () => {
    const h = await harness();
    const t = await newTenant(h, "a3");
    const vehicle = await newVehicle(h, t);
    const item = await newItem(h, t, { base: 10 });
    const outcomes = await race20(h, (repo) =>
      repo.createTransfer({ tenantId: t, itemId: item, type: "link", quantity: 1, custody: { custodyType: "vehicle", custodyVehicleId: vehicle } }),
    );
    assertTenOkTenInsufficient(outcomes, "A3");
    assert.equal(await saldo(h, t, item), 0);
    assert.equal(await saldo(h, t, item, { type: "vehicle", vehicle }), 10);
  });

  test("A4 · ajuste −1 ×20 concorrentes sobre saldo 10 → 10 aceitos, saldo 0", async () => {
    const h = await harness();
    const t = await newTenant(h, "a4");
    const item = await newItem(h, t, { base: 10 });
    const outcomes = await race20(h, (repo) => repo.createMovement({ tenantId: t, itemId: item, type: "ajuste", quantidadeSinalizada: -1 }));
    assertTenOkTenInsufficient(outcomes, "A4");
    assert.equal(await saldo(h, t, item), 0);
  });

  test("A5 · saída da custódia de VIATURA ×20 concorrentes sobre custódia 10 → 10 aceitas, custódia 0", async () => {
    const h = await harness();
    const t = await newTenant(h, "a5");
    const vehicle = await newVehicle(h, t);
    const item = await newItem(h, t, { base: 10 });
    const group = randomUUID();
    await rawMovement(h, t, item, "link", -10, { group });
    await rawMovement(h, t, item, "link", 10, { group, custody: "vehicle", vehicle });
    const outcomes = await race20(h, (repo) =>
      repo.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1, custody: { custodyType: "vehicle", custodyVehicleId: vehicle } }),
    );
    assertTenOkTenInsufficient(outcomes, "A5");
    assert.equal(await saldo(h, t, item, { type: "vehicle", vehicle }), 0);
  });

  test("A6 · baixa por fonte (createExitForSource) ×20 fontes distintas sobre BASE 10 → 10 aceitas, BASE 0", async () => {
    const h = await harness();
    const t = await newTenant(h, "a6");
    const item = await newItem(h, t, { base: 10 });
    const outcomes = await race20(h, (repo) =>
      repo.createExitForSource({ tenantId: t, itemId: item, sourceType: "maintenance_item", sourceId: randomUUID(), quantity: 1, reason: "baixa A6" }),
    );
    assertTenOkTenInsufficient(outcomes, "A6");
    assert.equal(await saldo(h, t, item), 0);
  });

  test("A7 · estorno duplo concorrente do MESMO movimento × RACE_N → UMA compensação, perdedor 409 movement_already_reversed", async () => {
    const h = await harness();
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "a7");
      const item = await newItem(h, t, { base: 10 });
      const original = await rawMovement(h, t, item, "saida", -3);
      const actor = actorOf(t);
      let go!: () => void;
      const start = new Promise<void>((resolve) => (go = resolve));
      const pair = [h.inventoryA, h.inventoryB].map((service) => captureSettled(start.then(() => service.reverseMovement(actor, original, {}))));
      go();
      const outcomes = await Promise.all(pair);
      assertNoDeadlockOrTimeout(outcomes, `A7 it=${it}`);
      assert.deepEqual(outcomes.map(describe).sort(), ["409|movement_already_reversed", "ok"], `A7 it=${it}`);
      assert.equal(await compensationsOf(h, [original]), 1, `A7 it=${it}: exatamente uma compensação`);
    }
  });

  test("A7b · estorno duplo concorrente de um LINK (par) → duas compensações (uma por perna), perdedor 409", async () => {
    const h = await harness();
    const t = await newTenant(h, "a7b");
    const vehicle = await newVehicle(h, t);
    const item = await newItem(h, t, { base: 10 });
    const group = randomUUID();
    const legBase = await rawMovement(h, t, item, "link", -3, { group });
    const legVehicle = await rawMovement(h, t, item, "link", 3, { group, custody: "vehicle", vehicle });
    const actor = actorOf(t);
    let go!: () => void;
    const start = new Promise<void>((resolve) => (go = resolve));
    const pair = [h.inventoryA, h.inventoryB].map((service) => captureSettled(start.then(() => service.reverseMovement(actor, legBase, {}))));
    go();
    const outcomes = await Promise.all(pair);
    assertNoDeadlockOrTimeout(outcomes, "A7b");
    assert.deepEqual(outcomes.map(describe).sort(), ["409|movement_already_reversed", "ok"]);
    assert.equal(await compensationsOf(h, [legBase, legVehicle]), 2, "uma compensação por perna do par");
    assert.equal(await saldo(h, t, item), 10);
    assert.equal(await saldo(h, t, item, { type: "vehicle", vehicle }), 0);
  });

  test("A8 · estorno duplo concorrente da baixa de uma fonte × RACE_N → UMA compensação, perdedor no-op (undefined)", async () => {
    const h = await harness();
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "a8");
      const item = await newItem(h, t, { base: 10 });
      const sourceId = randomUUID();
      const exit = await rawMovement(h, t, item, "saida", -3, { sourceType: "fuel_log", sourceId });
      let go!: () => void;
      const start = new Promise<void>((resolve) => (go = resolve));
      const pair = [h.repoA, h.repoB].map((repo) =>
        captureSettled(start.then(() => repo.removeExitForSource({ tenantId: t, sourceType: "fuel_log", sourceId }))),
      );
      go();
      const outcomes = await Promise.all(pair);
      assertNoDeadlockOrTimeout(outcomes, `A8 it=${it}`);
      const values = outcomes.map((outcome) => (outcome.status === "fulfilled" ? (outcome.value === undefined ? "undefined" : "compensou") : describe(outcome)));
      assert.deepEqual(values.sort(), ["compensou", "undefined"], `A8 it=${it}`);
      assert.equal(await compensationsOf(h, [exit]), 1, `A8 it=${it}: exatamente uma compensação`);
    }
  });

  test("A9 · duas entradas 10@3 concorrentes sobre 10@1 → custo médio 2,333333 (saldo serializado), não 2,0", async () => {
    const h = await harness();
    const t = await newTenant(h, "a9");
    const item = await newItem(h, t, { base: 10, avg: 1 });
    let go!: () => void;
    const start = new Promise<void>((resolve) => (go = resolve));
    const pair = [h.repoA, h.repoB].map((repo) =>
      captureSettled(start.then(() => repo.createMovement({ tenantId: t, itemId: item, type: "entrada", quantidadeSinalizada: 10, unitCost: 3 }))),
    );
    go();
    const outcomes = await Promise.all(pair);
    assertNoDeadlockOrTimeout(outcomes, "A9");
    assert.deepEqual(outcomes.map(describe), ["ok", "ok"]);
    const rows = await h.admin.$queryRawUnsafe<Array<{ avg: number }>>(`SELECT avg_cost::float8 AS avg FROM inventory_items WHERE id = $1::uuid`, item);
    assert.equal(Number(rows[0]!.avg), 2.333333, "custo médio (10×1 + 10×3 + 10×3)/30 com arredondamento de 6 casas");
  });

  test("A10 · baixa dupla concorrente da MESMA fonte × RACE_N → mesmo id, uma linha, zero 25P02", async () => {
    const h = await harness();
    for (let it = 0; it < RACE_N; it += 1) {
      const t = await newTenant(h, "a10");
      const item = await newItem(h, t, { base: 10 });
      const sourceId = randomUUID();
      let go!: () => void;
      const start = new Promise<void>((resolve) => (go = resolve));
      const pair = [h.repoA, h.repoB].map((repo) =>
        captureSettled(
          start.then(() => repo.createExitForSource({ tenantId: t, itemId: item, sourceType: "fuel_log", sourceId, quantity: 2, reason: "baixa A10" })),
        ),
      );
      go();
      const outcomes = await Promise.all(pair);
      const described = outcomes.map(describe);
      assert.equal(described.some((d) => d.includes("25P02")), false, `A10 it=${it}: 25P02 vazou — ${described.join(", ")}`);
      assertNoDeadlockOrTimeout(outcomes, `A10 it=${it}`);
      assert.deepEqual(described, ["ok", "ok"], `A10 it=${it}`);
      const ids = outcomes.map((outcome) => (outcome as { value: { id: string } }).value.id);
      assert.equal(ids[0], ids[1], `A10 it=${it}: o perdedor devolve o EXIT vencedor`);
      const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
        `SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id = $1::uuid AND source_id = $2::uuid`,
        t,
        sourceId,
      );
      assert.equal(rows[0]!.n, 1);
      assert.equal(await saldo(h, t, item), 8);
    }
  });

  test("A11 · saída no item de T2 sob o contexto de T1 → undefined (400 no serviço), nada escrito em T2", async () => {
    const h = await harness();
    const t1 = await newTenant(h, "a11-t1");
    const t2 = await newTenant(h, "a11-t2");
    const itemOfT2 = await newItem(h, t2, { base: 10 });
    const result = await h.repoA.createMovement({ tenantId: t1, itemId: itemOfT2, type: "saida", quantidadeSinalizada: -1 });
    assert.equal(result, undefined);
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM stock_movements WHERE item_id = $1::uuid`, itemOfT2);
    assert.equal(rows[0]!.n, 1, "só a entrada semeada");
    await assert.rejects(
      h.inventoryA.createMovement(actorOf(t1), { item_id: itemOfT2, type: "saida", quantidade: 1 }),
      (error: any) => error?.statusCode === 400,
    );
  });

  test("A12 [I7] · unidade do fechamento segurando sessão + item DENTRO da tx × recalculateAbc() e open() reais → zero 40P01", async () => {
    const h = await harness();
    // Rodada abc: B bloqueia no UPDATE abc_class do item travado e conclui depois do commit da unidade.
    {
      const t = await newTenant(h, "a12-abc");
      const [low, high] = [randomUUID(), randomUUID()].sort();
      // Y DEPOIS de X por carimbo explícito (`listItems` ordena por created_at desc): a ordem é dado do
      // fixture, não corrida de relógio — o `sleep(20)` que vivia aqui só separava dois INSERTs.
      const [olderX, newerY] = createdAtSeries(2);
      const x = await newItem(h, t, { id: low, base: 100, avg: 1, createdAt: olderX });
      const y = await newItem(h, t, { id: high, base: 100, avg: 1, createdAt: newerY });
      await rawMovement(h, t, x, "saida", -1, { unitCost: 1 });
      await rawMovement(h, t, y, "saida", -50, { unitCost: 1 });
      const session = await rawSession(h, t, [
        { item: x, system: 99, counted: 98 },
        { item: y, system: 50, counted: 49 },
      ]);
      const gate = createGate({ label: "A12 abc" });
      const a = captureSettled(h.cycleA.close(actorOf(t), session.id, { beforeUnitCommit: gate.hookFor({ itemId: x }) }));
      // A largada de B é CAUSADA pela chegada de A ao lock. Antes era `sleep(300)` torcendo para que
      // A já tivesse chegado: se A se atrasasse mais que isso, os papéis se invertiam.
      await gate.arrived;
      const b = captureSettled(h.inventoryB.recalculateAbc(actorOf(t)));
      await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "abc_class", label: "A12 abc" });
      // B está PROVADAMENTE bloqueado ⇒ o refém já cumpriu o papel e sai no ato. Ele dura o mínimo
      // necessário, em vez de 1.500 ms fixos dentro do orçamento de 5 s da transação da unidade.
      gate.release();
      const [ra, rb] = await Promise.all([a, b]);
      assertNoDeadlockOrTimeout([ra, rb], "A12 abc");
      assert.deepEqual([describe(ra), describe(rb)], ["ok", "ok"]);
    }
    // Rodada open: com I9, o open de itens que estão numa sessão `fechando` é RECUSADO (409) sem esperar o lock —
    // nenhum KEY SHARE é pedido, nenhum ciclo é possível (ver a divergência D-4 na ata do dev).
    {
      const t = await newTenant(h, "a12-open");
      const [low, high] = [randomUUID(), randomUUID()].sort();
      // Idem: Y é o mais novo por carimbo, não por espera.
      const [olderX, newerY] = createdAtSeries(2);
      const x = await newItem(h, t, { id: low, base: 100, createdAt: olderX });
      const y = await newItem(h, t, { id: high, base: 100, createdAt: newerY });
      const session = await rawSession(h, t, [
        { item: x, system: 100, counted: 99 },
        { item: y, system: 100, counted: 99 },
      ]);
      const gate = createGate({ label: "A12 open" });
      const a = captureSettled(h.cycleA.close(actorOf(t), session.id, { beforeUnitCommit: gate.hookFor({ itemId: x }) }));
      // `aSettled` é o espelho literal do `loserSettled === false` de financial-pay-title-atomic-db.
      let aSettled = false;
      void a.then(() => void (aSettled = true));
      await gate.arrived;
      const startedB = Date.now();
      const rb = await captureSettled(h.cycleB.open(actorOf(t), {}));
      const elapsedB = Date.now() - startedB;
      // ASSERÇÃO DE ORDEM, não de duração. A propriedade é "o open recusado NÃO espera o lock da
      // unidade", e ela se lê assim: no instante em que B liquidou, A AINDA segurava (`aSettled`
      // falso, porque o refém só sai no `release()` abaixo). O `elapsedB < 1200` que vivia aqui media
      // relógio de parede e ficava vermelho por vizinhança, sem dizer nada sobre o produto.
      assert.equal(aSettled, false, `o open esperou o fechamento terminar em vez de ser recusado sob o lock (${elapsedB} ms)`);
      console.log(`[A12 open] B recusado em ${elapsedB} ms com A ainda segurando a unidade`);
      gate.release();
      const ra = await a;
      assertNoDeadlockOrTimeout([ra, rb], "A12 open");
      assert.equal(describe(ra), "ok");
      assert.equal(describe(rb), "409|items_in_open_session");
    }
  });

  test("A13 · forma do contrato: saída simples devolve o movimento; acima do saldo → 409 com o saldo atual", async () => {
    const h = await harness();
    const t = await newTenant(h, "a13");
    const item = await newItem(h, t, { base: 5 });
    const movement = await h.repoA.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -2 });
    assert.equal(movement.quantidadeSinalizada, -2);
    assert.equal(movement.itemId, item);
    await assert.rejects(
      h.repoA.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -4 }),
      (error: any) => error?.statusCode === 409 && error?.reason === "insufficient_balance" && /3/.test(error.message),
    );
  });

  test("A14 · contenção acima do timeout → 503 stock_busy, nada gravado; o mapeamento nas três formas medidas", async () => {
    const h = await harness();
    const t = await newTenant(h, "a14");
    const item = await newItem(h, t, { base: 10 });
    const holder = holdInAdminTx(h, async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM inventory_items WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, t, item);
    });
    await holder.locked;
    const startedB = Date.now();
    const b = captureSettled(h.repoB.createMovement({ tenantId: t, itemId: item, type: "saida", quantidadeSinalizada: -1 }));
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "tenant_id", label: "A14" });
    // A contenção é o ESTÍMULO (ver `A14_CONTENTION_MS`): é ela que tem de durar mais que o orçamento
    // da transação para o produto traduzir em 503. Medida a partir do instante em que B está
    // PROVADAMENTE bloqueado, não do início do caso.
    const blockedAt = Date.now();
    await sleep(A14_CONTENTION_MS);
    const contendedMs = Date.now() - blockedAt;
    holder.release();
    const outcome = await b;
    const elapsedB = Date.now() - startedB;
    // ASSERÇÃO DE ORDEM — e ela PODE falhar, que é o que a torna prova: o refém segura numa transação
    // de janela 60 s. Se B tivesse demorado mais do que ela, a transação do refém teria morrido e
    // `holder.done` chegaria REJEITADA. É assim que "B liquidou DENTRO da janela do refém, pelo
    // timeout do produto" vira asserção em vez de comentário.
    const holderOutcome = await holder.done;
    assert.equal(
      holderOutcome.status,
      "fulfilled",
      `o refém não sobreviveu à espera de B (${elapsedB} ms): não dá para afirmar que foi o orçamento do produto que encerrou B`,
    );
    console.log(`[A14] contenção de ${contendedMs} ms (estímulo ${A14_CONTENTION_MS} ms); B liquidou em ${elapsedB} ms, dentro da janela de 60000 ms do refém`);
    assert.equal(describe(outcome), "503|stock_busy", "contenção acima do timeout vira 503 de domínio, nunca o erro cru");
    assert.equal((outcome as any).reason?.code, "STOCK_UNAVAILABLE");
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM stock_movements WHERE item_id = $1::uuid`, item);
    assert.equal(rows[0]!.n, 1, "nada gravado (só a entrada semeada)");

    // As três formas medidas no Prisma 7 + adapter-pg (ata do dev) + controles negativos (determinístico passa intacto).
    const { mapTransientDbFailure } = h.inv;
    const busy = () => Object.assign(new Error("busy"), { statusCode: 503 });
    for (const shape of [
      { code: "P2028", meta: { operation: "commit" } },
      { name: "DriverAdapterError", cause: { code: "40P01", originalCode: "40P01", kind: "postgres" } },
      { code: "P2010", meta: { driverAdapterError: { cause: { code: "40P01", originalCode: "40P01" } } } },
      { code: "P2034" },
      { code: "P2024" },
      { cause: { code: "40001" } },
      { cause: { code: "55P03" } },
    ]) {
      assert.equal((mapTransientDbFailure(shape, busy) as any).statusCode, 503, `transitório não mapeado: ${JSON.stringify(shape)}`);
    }
    for (const shape of [{ code: "P2002" }, { cause: { code: "23505" } }, { code: "P2010", meta: { driverAdapterError: { cause: { code: "23503" } } } }, new Error("x")]) {
      assert.equal(mapTransientDbFailure(shape, busy), shape, `determinístico engolido: ${JSON.stringify(shape)}`);
    }
  });

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
        `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity, counted_quantity) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric) RETURNING id`,
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
}

/** Teardown ESCOPADO por tenant_id do próprio arquivo, em ordem de FK — nunca wildcard (lição do PR-05 Ω5P). */
async function teardownTenants(admin: any, tenants: readonly string[]): Promise<void> {
  if (tenants.length === 0) return;
  const ids = [...tenants];
  await admin.$executeRawUnsafe(`DELETE FROM cycle_count_entries WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM cycle_counts WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM inventory_items WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM vehicles WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
}
