import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// B-MATERIAL-REENVIO — RC3: o material usa o razão PostgreSQL real como autoridade de idempotência.
// O serviço roda por dois papéis efêmeros NOSUPERUSER/NOBYPASSRLS; o admin só semeia, observa e limpa.
// Sem DATABASE_URL a suíte declara o pulo sem usar o prefixo [RC3(, para o aceite do TAP contar só casos reais.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-MATERIAL-REENVIO RC3 exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  type Actor = {
    readonly tenantId: string;
    readonly userId: string;
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
  };

  type Scenario = {
    readonly tenantId: string;
    readonly userId: string;
    readonly profileId: string;
    readonly itemId: string;
    readonly sku: string;
    readonly workOrderId: string;
    readonly actor: Actor;
  };

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }, inventoryRepository, inventoryModule, workOrderRepository, workOrderModule, syncModule] =
      await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("../src/modules/inventory/inventory-prisma.repository.js"),
        import("../src/modules/inventory/inventory.service.js"),
        import("../src/modules/work-orders/work-order-prisma.repository.js"),
        import("../src/modules/work-orders/work-order.service.js"),
        import("../src/modules/mobile/mobile-inventory-sync.js"),
      ]);

    const admin = new PrismaClient({
      adapter: new PrismaPg({ connectionString: withApplicationName(connectionString!, buildApplicationName("bmat-admin")) }),
    });
    const roleA: EphemeralRole = await createEphemeralRole(
      admin,
      withApplicationName(connectionString!, buildApplicationName("bmat-a")),
    );
    const roleB: EphemeralRole = await createEphemeralRole(
      admin,
      withApplicationName(connectionString!, buildApplicationName("bmat-b")),
    );
    const profileByActor = new Map<string, string>();

    const servicesFor = (role: EphemeralRole) => {
      const inventory = new inventoryModule.InventoryService(
        new inventoryRepository.RlsPrismaInventoryRepository(role.client),
        {
          resolveActorOperatorProfile: async (actor: Actor) => {
            const id = profileByActor.get(`${actor.tenantId}:${actor.userId}`);
            return id ? { id, isActive: true, label: "Técnico RC3" } : undefined;
          },
        },
      );
      const workOrders = new workOrderModule.WorkOrderService(
        new workOrderRepository.RlsPrismaWorkOrderRepository(role.client),
        { resolveActorOperatorProfileId: async () => undefined },
      );
      return { inventory, workOrders, workOrdersModuleEnabled: async () => true };
    };

    return {
      admin,
      roleA,
      roleB,
      profileByActor,
      servicesFor,
      sync: syncModule.syncMobileInventoryActions,
      resetSync: syncModule.resetMobileInventoryRuntimeForTests,
      tenants: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await teardown(h);
    } finally {
      await h.roleA.drop();
      await h.roleB.drop();
      await h.admin.$disconnect();
    }
  });

  async function assertRuntimeRole(role: EphemeralRole): Promise<void> {
    const rows = await role.client.$queryRaw<Array<{ super: boolean; bypass: boolean }>>`
      SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user
    `;
    assert.deepEqual(rows[0], { super: false, bypass: false });
  }

  async function scenario(h: Harness, tag: string, stock = 20): Promise<Scenario> {
    const tenantId = randomUUID();
    const userId = randomUUID();
    const profileId = randomUUID();
    const itemId = randomUUID();
    const workOrderId = randomUUID();
    const slug = `bmat-${tag}-${randomUUID().slice(0, 8)}`;
    const sku = `RC3-${tag}-${randomUUID().slice(0, 8)}`.toUpperCase();

    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenants (id, name, slug, modules) VALUES ($1::uuid, $2, $2, ARRAY['inventory','work_orders']::text[])`,
      tenantId,
      slug,
    );
    h.tenants.push(tenantId);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO users (id, tenant_id, name, email) VALUES ($1::uuid, $2::uuid, $3, $4)`,
      userId,
      tenantId,
      `Técnico ${tag}`,
      `${slug}@example.test`,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO operator_profiles (id, tenant_id, user_id, full_name, is_active)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, true)`,
      profileId,
      tenantId,
      userId,
      `Técnico ${tag}`,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, tenant_id, sku, name, unit)
       VALUES ($1::uuid, $2::uuid, $3, $3, 'un')`,
      itemId,
      tenantId,
      sku,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO stock_movements
         (tenant_id, item_id, type, quantidade_sinalizada, custody_type, custody_operator_profile_id, created_by)
       VALUES ($1::uuid, $2::uuid, 'entrada', $3::numeric, 'professional', $4::uuid, $5::uuid)`,
      tenantId,
      itemId,
      stock,
      profileId,
      userId,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO work_orders
         (id, tenant_id, code, title, assigned_operator_id, assigned_user_id, created_by, updated_by)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $5::uuid, $5::uuid, $5::uuid)`,
      workOrderId,
      tenantId,
      `RC3-${randomUUID().slice(0, 8)}`,
      `OS ${tag}`,
      userId,
    );
    h.profileByActor.set(`${tenantId}:${userId}`, profileId);

    return {
      tenantId,
      userId,
      profileId,
      itemId,
      sku,
      workOrderId,
      actor: {
        tenantId,
        userId,
        roles: ["field_technician"],
        permissions: ["work_orders:update"],
      },
    };
  }

  function addAction(
    s: Scenario,
    clientActionId: string,
    quantity = 2,
    target: { readonly workOrderId?: string; readonly sku?: string } = {},
  ) {
    const workOrderId = target.workOrderId ?? s.workOrderId;
    return {
      client_action_id: clientActionId,
      type: "work_order_material.add",
      local_created_at: "2026-11-13T00:00:00.000Z",
      payload: {
        work_order_id: workOrderId,
        work_order_local_id: `local-${workOrderId}`,
        material_local_id: `material-${s.itemId}`,
        sku: target.sku ?? s.sku,
        quantity,
      },
    };
  }

  /** Outra OS da mesma organização, atribuída ao mesmo técnico do cenário. */
  async function extraWorkOrder(h: Harness, s: Scenario): Promise<string> {
    const workOrderId = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO work_orders
         (id, tenant_id, code, title, assigned_operator_id, assigned_user_id, created_by, updated_by)
       VALUES ($1::uuid, $2::uuid, $3, 'OS extra', $4::uuid, $4::uuid, $4::uuid, $4::uuid)`,
      workOrderId,
      s.tenantId,
      `RC3-${randomUUID().slice(0, 8)}`,
      s.userId,
    );
    return workOrderId;
  }

  /** Outra peça da mesma organização (sem saldo: a comparação do PC3 acontece antes da custódia). */
  async function extraItemSku(h: Harness, s: Scenario): Promise<string> {
    const sku = `RC3-X-${randomUUID().slice(0, 8)}`.toUpperCase();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, tenant_id, sku, name, unit) VALUES ($1::uuid, $2::uuid, $3, $3, 'un')`,
      randomUUID(),
      s.tenantId,
      sku,
    );
    return sku;
  }

  function removeAction(s: Scenario, sourceId: string) {
    return {
      client_action_id: randomUUID(),
      type: "work_order_material.remove",
      local_created_at: "2026-11-13T00:01:00.000Z",
      payload: {
        work_order_id: s.workOrderId,
        source_client_action_id: sourceId,
        material_local_id: `material-${s.itemId}`,
      },
    };
  }

  async function run(h: Harness, role: EphemeralRole, s: Scenario, action: ReturnType<typeof addAction> | ReturnType<typeof removeAction>) {
    return h.sync(s.actor as never, { client_batch_id: randomUUID(), actions: [action] }, h.servicesFor(role));
  }

  async function sourceRows(h: Harness, tenantId: string, sourceId: string) {
    return h.admin.$queryRawUnsafe<
      Array<{
        id: string;
        quantity: string;
        sourceType: string;
        sourceId: string;
        workOrderId: string | null;
        custodyType: string;
        custodyOperatorProfileId: string | null;
        createdBy: string | null;
      }>
    >(
      `SELECT id::text,
              quantidade_sinalizada::text AS quantity,
              source_type AS "sourceType",
              source_id::text AS "sourceId",
              work_order_id::text AS "workOrderId",
              custody_type AS "custodyType",
              custody_operator_profile_id::text AS "custodyOperatorProfileId",
              created_by::text AS "createdBy"
         FROM stock_movements
        WHERE tenant_id = $1::uuid AND source_type = 'work_order_material' AND source_id = $2::uuid`,
      tenantId,
      sourceId,
    );
  }

  async function replaceStocks(h: Harness, s: Scenario, professional: number, base: number): Promise<void> {
    await h.admin.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = $1::uuid AND item_id = $2::uuid`, s.tenantId, s.itemId);
    if (professional > 0) {
      await h.admin.$executeRawUnsafe(
        `INSERT INTO stock_movements
           (tenant_id, item_id, type, quantidade_sinalizada, custody_type, custody_operator_profile_id, created_by)
         VALUES ($1::uuid, $2::uuid, 'entrada', $3::numeric, 'professional', $4::uuid, $5::uuid)`,
        s.tenantId,
        s.itemId,
        professional,
        s.profileId,
        s.userId,
      );
    }
    if (base > 0) {
      await h.admin.$executeRawUnsafe(
        `INSERT INTO stock_movements
           (tenant_id, item_id, type, quantidade_sinalizada, custody_type, created_by)
         VALUES ($1::uuid, $2::uuid, 'entrada', $3::numeric, 'base', $4::uuid)`,
        s.tenantId,
        s.itemId,
        base,
        s.userId,
      );
    }
  }

  async function custodyBalance(h: Harness, s: Scenario, custody: "base" | "professional"): Promise<number> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ balance: string }>>(
      `SELECT COALESCE(sum(quantidade_sinalizada), 0)::text AS balance
         FROM stock_movements
        WHERE tenant_id = $1::uuid
          AND item_id = $2::uuid
          AND custody_type = $3
          AND ($3 = 'base' OR custody_operator_profile_id = $4::uuid)`,
      s.tenantId,
      s.itemId,
      custody,
      s.profileId,
    );
    return Number(rows[0]?.balance ?? 0);
  }

  async function teardown(h: Harness): Promise<void> {
    for (const tenantId of [...h.tenants].reverse()) {
      await h.admin.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_order_assignments WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_order_events WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM operator_profiles WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM inventory_items WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
      await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
    }
  }

  test("[RC3(1)] baixa aceita persiste origem, OS, ator e custódia profissional sob RLS real", async () => {
    const h = await harness();
    await Promise.all([assertRuntimeRole(h.roleA), assertRuntimeRole(h.roleB)]);
    const s = await scenario(h, "r1");
    const sourceId = randomUUID();

    const response = await run(h, h.roleA, s, addAction(s, sourceId));
    assert.equal(response.accepted.length, 1);
    assert.equal(response.accepted[0]?.status, "accepted");
    const rows = await sourceRows(h, s.tenantId, sourceId);
    assert.equal(rows.length, 1);
    assert.deepEqual(
      {
        quantity: rows[0]?.quantity,
        sourceType: rows[0]?.sourceType,
        sourceId: rows[0]?.sourceId,
        workOrderId: rows[0]?.workOrderId,
        custodyType: rows[0]?.custodyType,
        custodyOperatorProfileId: rows[0]?.custodyOperatorProfileId,
        createdBy: rows[0]?.createdBy,
      },
      {
        quantity: "-2.000000",
        sourceType: "work_order_material",
        sourceId,
        workOrderId: s.workOrderId,
        custodyType: "professional",
        custodyOperatorProfileId: s.profileId,
        createdBy: s.userId,
      },
    );
  });

  test("[RC3(2)] nova instância reconhece o replay no razão após reinício", async () => {
    const h = await harness();
    const s = await scenario(h, "r2");
    const sourceId = randomUUID();
    assert.equal((await run(h, h.roleA, s, addAction(s, sourceId))).accepted.length, 1);

    h.resetSync();
    const replay = await run(h, h.roleA, s, addAction(s, sourceId));
    assert.equal(replay.already_applied.length, 1);
    assert.equal(replay.already_applied[0]?.status, "already_applied");
    assert.equal((await sourceRows(h, s.tenantId, sourceId)).length, 1);
  });

  test("[RC3(3)] corrida com payloads diferentes grava uma baixa e devolve um conflito", async () => {
    const h = await harness();
    const s = await scenario(h, "r3");
    const sourceId = randomUUID();
    const [left, right] = await Promise.all([
      run(h, h.roleA, s, addAction(s, sourceId, 2)),
      run(h, h.roleB, s, addAction(s, sourceId, 3)),
    ]);
    const outcomes = [left, right];
    assert.equal(outcomes.reduce((n, result) => n + result.accepted.length, 0), 1);
    assert.equal(outcomes.reduce((n, result) => n + result.conflicts.length, 0), 1);
    assert.equal(outcomes.flatMap((result) => result.conflicts)[0]?.conflict?.conflict_type, "idempotency_payload_mismatch");
    assert.equal((await sourceRows(h, s.tenantId, sourceId)).length, 1);
  });

  test("[RC3(4)] a mesma origem em outra organização produz uma baixa própria", async () => {
    const h = await harness();
    const a = await scenario(h, "r4a");
    const b = await scenario(h, "r4b");
    const sourceId = randomUUID();
    const [ra, rb] = await Promise.all([
      run(h, h.roleA, a, addAction(a, sourceId)),
      run(h, h.roleB, b, addAction(b, sourceId)),
    ]);
    assert.equal(ra.accepted.length, 1);
    assert.equal(rb.accepted.length, 1);
    assert.equal((await sourceRows(h, a.tenantId, sourceId)).length, 1);
    assert.equal((await sourceRows(h, b.tenantId, sourceId)).length, 1);
  });

  test("[RC3(5)] remove estorna uma vez e o add posterior vê stock_baixa_reversed", async () => {
    const h = await harness();
    const s = await scenario(h, "r5");
    const sourceId = randomUUID();
    const first = await run(h, h.roleA, s, addAction(s, sourceId));
    const exitId = first.accepted[0]?.result_ref;
    assert.ok(exitId);

    const removed = await run(h, h.roleA, s, removeAction(s, sourceId));
    assert.equal(removed.accepted.length, 1);
    const reversals = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id = $1::uuid AND reverses_movement_id = $2::uuid`,
      s.tenantId,
      exitId,
    );
    assert.equal(reversals[0]?.n, 1);

    const replay = await run(h, h.roleB, s, addAction(s, sourceId));
    assert.equal(replay.conflicts.length, 1);
    assert.equal(replay.conflicts[0]?.conflict?.conflict_type ?? replay.conflicts[0]?.error?.reason, "stock_baixa_reversed");
    assert.equal((await sourceRows(h, s.tenantId, sourceId)).length, 1);
  });

  test("[RC3(6)] custódia profissional, falta nela e fallback BASE do gerente persistem no razão", async () => {
    const h = await harness();

    const professional = await scenario(h, "r6-prof", 5);
    await replaceStocks(h, professional, 5, 0);
    const professionalSource = randomUUID();
    assert.equal((await run(h, h.roleA, professional, addAction(professional, professionalSource))).accepted.length, 1);
    const professionalRows = await sourceRows(h, professional.tenantId, professionalSource);
    assert.equal(professionalRows[0]?.custodyType, "professional");
    assert.equal(professionalRows[0]?.custodyOperatorProfileId, professional.profileId);
    assert.equal(await custodyBalance(h, professional, "professional"), 3);

    const baseOnly = await scenario(h, "r6-base-only");
    await replaceStocks(h, baseOnly, 0, 10);
    const denied = await run(h, h.roleA, baseOnly, addAction(baseOnly, randomUUID(), 1));
    assert.equal(denied.conflicts.length, 1);
    assert.equal(denied.conflicts[0]?.conflict?.conflict_type, "insufficient_balance");
    assert.equal(await custodyBalance(h, baseOnly, "base"), 10);

    const managerScenario = await scenario(h, "r6-manager");
    await replaceStocks(h, managerScenario, 0, 10);
    h.profileByActor.delete(`${managerScenario.tenantId}:${managerScenario.userId}`);
    const manager: Scenario = {
      ...managerScenario,
      actor: { ...managerScenario.actor, roles: ["manager"] },
    };
    const managerSource = randomUUID();
    const accepted = await run(h, h.roleB, manager, addAction(manager, managerSource));
    assert.equal(accepted.accepted.length, 1);
    const managerRows = await sourceRows(h, manager.tenantId, managerSource);
    assert.equal(managerRows[0]?.custodyType, "base");
    assert.equal(managerRows[0]?.custodyOperatorProfileId, null);
    assert.equal(await custodyBalance(h, manager, "base"), 8);
    assert.equal((await run(h, h.roleB, manager, removeAction(manager, managerSource))).accepted.length, 1);
    assert.equal(await custodyBalance(h, manager, "base"), 10);
  });

  test("[RC3(7)] duas baixas concorrentes não deixam a custódia profissional negativa", async () => {
    const h = await harness();
    const s = await scenario(h, "r7", 5);
    await replaceStocks(h, s, 5, 0);
    const [left, right] = await Promise.all([
      run(h, h.roleA, s, addAction(s, randomUUID(), 3)),
      run(h, h.roleB, s, addAction(s, randomUUID(), 3)),
    ]);
    const outcomes = [left, right];
    assert.equal(outcomes.reduce((n, result) => n + result.accepted.length, 0), 1);
    assert.equal(outcomes.reduce((n, result) => n + result.conflicts.length, 0), 1);
    assert.equal(outcomes.flatMap((result) => result.conflicts)[0]?.conflict?.conflict_type, "insufficient_balance");
    assert.equal(await custodyBalance(h, s, "professional"), 2);
  });

  test("[RC3(8)] gerente com cadastro baixa e estorna na própria custódia sem tocar a BASE", async () => {
    const h = await harness();
    const managerScenario = await scenario(h, "r8", 4);
    await replaceStocks(h, managerScenario, 4, 10);
    const manager: Scenario = {
      ...managerScenario,
      actor: { ...managerScenario.actor, roles: ["manager"] },
    };
    const sourceId = randomUUID();
    const added = await run(h, h.roleA, manager, addAction(manager, sourceId));
    const exitId = added.accepted[0]?.result_ref;
    assert.ok(exitId);
    const exitRows = await sourceRows(h, manager.tenantId, sourceId);
    assert.equal(exitRows[0]?.custodyType, "professional");
    assert.equal(exitRows[0]?.custodyOperatorProfileId, manager.profileId);
    assert.equal(await custodyBalance(h, manager, "professional"), 2);
    assert.equal(await custodyBalance(h, manager, "base"), 10);

    assert.equal((await run(h, h.roleB, manager, removeAction(manager, sourceId))).accepted.length, 1);
    const reversals = await h.admin.$queryRawUnsafe<Array<{ custodyType: string; profileId: string | null }>>(
      `SELECT custody_type AS "custodyType", custody_operator_profile_id::text AS "profileId"
         FROM stock_movements
        WHERE tenant_id = $1::uuid AND reverses_movement_id = $2::uuid`,
      manager.tenantId,
      exitId,
    );
    assert.deepEqual(reversals, [{ custodyType: "professional", profileId: manager.profileId }]);
    assert.equal(await custodyBalance(h, manager, "professional"), 4);
    assert.equal(await custodyBalance(h, manager, "base"), 10);
  });

  // C1-03 da J-551: o PC3 compara (item, qtd, OS) também no razão real. M-C1-NOVA (tirar a OS do `samePayload`)
  // deixa o (9) vermelho; M-C1-NOVA-b (tirar o item) deixa o (10) vermelho.
  test("[RC3(9)] mesmo id citando outra OS do mesmo técnico conflita e o razão fica com uma linha, na OS original", async () => {
    const h = await harness();
    const s = await scenario(h, "r9");
    const sourceId = randomUUID();
    assert.equal((await run(h, h.roleA, s, addAction(s, sourceId))).accepted.length, 1);
    const otherWorkOrder = await extraWorkOrder(h, s);

    h.resetSync();
    const replay = await run(h, h.roleB, s, addAction(s, sourceId, 2, { workOrderId: otherWorkOrder }));
    assert.equal(replay.already_applied.length, 0);
    assert.equal(replay.conflicts[0]?.conflict?.conflict_type, "idempotency_payload_mismatch");
    const rows = await sourceRows(h, s.tenantId, sourceId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.workOrderId, s.workOrderId);
  });

  test("[RC3(10)] mesmo id com outra peça conflita e o razão fica com uma linha", async () => {
    const h = await harness();
    const s = await scenario(h, "r10");
    const sourceId = randomUUID();
    assert.equal((await run(h, h.roleA, s, addAction(s, sourceId))).accepted.length, 1);
    const otherSku = await extraItemSku(h, s);

    h.resetSync();
    const replay = await run(h, h.roleB, s, addAction(s, sourceId, 2, { sku: otherSku }));
    assert.equal(replay.already_applied.length, 0);
    assert.equal(replay.conflicts[0]?.conflict?.conflict_type, "idempotency_payload_mismatch");
    assert.equal((await sourceRows(h, s.tenantId, sourceId)).length, 1);
    assert.equal(await custodyBalance(h, s, "professional"), 18);
  });

  // C1-02 da J-551, no razão real: a falha depois do COMMIT da baixa responde 500 fixo, nunca recusa; o reenvio
  // acha a baixa pelo índice de origem e volta already_applied, com uma linha só.
  test("[RC3(11)] commit ambíguo: falha depois da baixa gravada dá 500, e o reenvio é already_applied com uma linha", async () => {
    const h = await harness();
    const s = await scenario(h, "r11");
    const sourceId = randomUUID();
    const action = addAction(s, sourceId);
    const services = h.servicesFor(h.roleA);
    const realCreateExit = services.inventory.createExitForSource.bind(services.inventory);
    services.inventory.createExitForSource = async (...args: Parameters<typeof realCreateExit>) => {
      await realCreateExit(...args);
      throw new Error("connection reset after commit at db-interno.exemplo:5432");
    };

    const failure = await h.sync(s.actor as never, { client_batch_id: randomUUID(), actions: [action] }, services)
      .then(() => assert.fail("o lote tinha de falhar com 500"), (error: unknown) => error);
    assert.deepEqual(failure, {
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      reason: "unexpected_error",
      message: "Unexpected error.",
    });
    const rows = await sourceRows(h, s.tenantId, sourceId);
    assert.equal(rows.length, 1, "a baixa foi gravada antes da falha");

    h.resetSync();
    const retry = await run(h, h.roleB, s, action);
    assert.equal(retry.rejected.length, 0);
    assert.equal(retry.conflicts.length, 0);
    assert.equal(retry.already_applied.length, 1);
    assert.equal(retry.already_applied[0]?.result_ref, rows[0]?.id);
    assert.equal((await sourceRows(h, s.tenantId, sourceId)).length, 1);
    assert.equal(await custodyBalance(h, s, "professional"), 18);
  });
}
