import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import test, { after } from "node:test";

import { closeServer, createEphemeralRole, getBaseUrl, requestJson, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-15a (plano `plano-B-SAN3-15-v2.md` §3.1 linha "P1 (banco)" + Emenda 1, N-04) — O ESTOQUE DO TÉCNICO NO
// POSTGRES REAL, sob um papel efêmero NOSUPERUSER NOBYPASSRLS (o RLS FORCE vale para ele; o admin só semeia e limpa).
//
//   T-DB1   o técnico vê só a própria custódia profissional ([X: 5]), sob o papel sem bypass.
//   T-DB1b  (F1g, Pergunta 5 (a)) o gerente sem cadastro vê exatamente a BASE ([Z: 10], kind base); o mesmo ator na
//           org B não vê nada da org A.
//   T-DB2   RLS: no contexto da org B, a leitura que PEDE a custódia da org A volta vazia (com controle positivo no
//           contexto da org A, para o vazio não ser cego).
//   T-DB2b  o app REAL (JWT + RBAC persistente, o mesmo papel efêmero como cliente do app): o tecA, com o token da org A
//           e `X-Tenant-Id` da org B, nunca lê a org B e nunca vê item fora da própria custódia. Forma MEDIDA: 200 com a
//           custódia do próprio tecA (o cabeçalho é ignorado sob JWT); o plano a marcou como HIPÓTESE "403" (diário).
//   T-DB3   soma decimal: LINK 2,5 e LINK 0,5 → `available` 3.
//
// Semeadura em SQL cru pelo admin; teardown ESCOPADO por tenant_id, em ordem de FK (nunca wildcard em base viva).
// DB-gated: sem DATABASE_URL o arquivo DECLARA o pulo.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-15a (estoque do técnico no Postgres) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);

    // O cliente GLOBAL do app (`src/database/prisma.ts` lê `globalThis.prisma` antes de criar o seu) passa a ser o do
    // papel efêmero: a rota real roda sem bypass de RLS, como o papel de runtime de produção (B-SAN3-05).
    (globalThis as { prisma?: unknown }).prisma = role.client;

    const [inv, profiles, service, rls] = await Promise.all([
      import("../src/modules/inventory/inventory-prisma.repository.js"),
      import("../src/modules/operator-profiles/operator-profile-prisma.repository.js"),
      import("../src/modules/inventory/inventory.service.js"),
      import("../src/database/rls.js"),
    ]);
    const { OperatorProfileService } = await import("../src/modules/operator-profiles/operator-profile.service.js");

    const stockService = new service.InventoryService(new inv.RlsPrismaInventoryRepository(role.client), {
      resolveActorOperatorProfile: service.createActorOperatorProfileResolver(
        async () => new OperatorProfileService(new profiles.RlsPrismaOperatorProfileRepository(role.client)),
      ),
    });

    return { admin, role, inv, rls, stockService, tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await teardownTenants(h.admin, h.tenants);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  // ------------------------------------------------------------------ semeadura (admin, SQL cru)

  type Scenario = {
    readonly tenantA: string;
    readonly tenantB: string;
    readonly tecA: string;
    readonly tecB: string;
    readonly manager: string;
    readonly profileA: string;
    readonly profileB: string;
    readonly x: { id: string; sku: string };
    readonly y: { id: string; sku: string };
    readonly z: { id: string; sku: string };
    readonly w: { id: string; sku: string };
  };

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `bsan315-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function newUser(h: Harness, tenantId: string, tag: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id`,
      tenantId,
      `Usuário ${tag}`,
      `bsan315-${tag}-${randomUUID().slice(0, 8)}@example.com`,
    );
    return rows[0]!.id;
  }

  async function newProfile(h: Harness, tenantId: string, userId: string, fullName: string, active = true): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO operator_profiles (tenant_id, user_id, full_name, is_active) VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING id`,
      tenantId,
      userId,
      fullName,
      active,
    );
    return rows[0]!.id;
  }

  async function newItem(h: Harness, tenantId: string, tag: string): Promise<{ id: string; sku: string }> {
    const sku = `BSAN-${tag}-${randomUUID().slice(0, 6)}`.toUpperCase();
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO inventory_items (tenant_id, sku, name, unit, avg_cost) VALUES ($1::uuid, $2, $3, 'un', 2) RETURNING id`,
      tenantId,
      sku,
      `Item ${tag}`,
    );
    return { id: rows[0]!.id, sku };
  }

  async function newVehicle(h: Harness, tenantId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'Guincho') RETURNING id`,
      tenantId,
      `BSN${Math.floor(Math.random() * 9000 + 1000)}`,
    );
    return rows[0]!.id;
  }

  async function ledger(
    h: Harness,
    tenantId: string,
    itemId: string,
    type: string,
    quantity: number,
    custody: { readonly type: string; readonly profile?: string; readonly vehicle?: string; readonly group?: string } = { type: "base" },
  ): Promise<void> {
    await h.admin.$executeRawUnsafe(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, unit_cost, custody_type, custody_operator_profile_id, custody_vehicle_id, transfer_group_id)
       VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5::numeric, $6, $7::uuid, $8::uuid, $9::uuid)`,
      tenantId,
      itemId,
      type,
      quantity,
      type === "entrada" ? 2 : null,
      custody.type,
      custody.profile ?? null,
      custody.vehicle ?? null,
      custody.group ?? null,
    );
  }

  /** O par irmão de uma transferência BASE → custódia (a mesma forma que `createTransfer` grava). */
  async function link(h: Harness, tenantId: string, itemId: string, quantity: number, to: { readonly profile?: string; readonly vehicle?: string }) {
    const group = randomUUID();
    await ledger(h, tenantId, itemId, "link", -quantity, { type: "base", group });
    await ledger(h, tenantId, itemId, "link", quantity, { type: to.profile ? "professional" : "vehicle", ...to, group });
  }

  async function scenario(h: Harness, tag: string): Promise<Scenario> {
    const tenantA = await newTenant(h, `${tag}-a`);
    const tenantB = await newTenant(h, `${tag}-b`);
    const tecA = await newUser(h, tenantA, `${tag}-teca`);
    const tecB = await newUser(h, tenantA, `${tag}-tecb`);
    const manager = await newUser(h, tenantA, `${tag}-gerente`);
    const profileA = await newProfile(h, tenantA, tecA, "Técnico A");
    const profileB = await newProfile(h, tenantA, tecB, "Técnico B");
    const vehicle = await newVehicle(h, tenantA);

    const x = await newItem(h, tenantA, "x");
    const y = await newItem(h, tenantA, "y");
    const z = await newItem(h, tenantA, "z");
    const w = await newItem(h, tenantA, "w");
    await ledger(h, tenantA, x.id, "entrada", 5);
    await link(h, tenantA, x.id, 5, { profile: profileA });
    await ledger(h, tenantA, y.id, "entrada", 3);
    await link(h, tenantA, y.id, 3, { profile: profileB });
    await ledger(h, tenantA, z.id, "entrada", 10);
    await ledger(h, tenantA, w.id, "entrada", 2);
    await link(h, tenantA, w.id, 2, { vehicle });

    return { tenantA, tenantB, tecA, tecB, manager, profileA, profileB, x, y, z, w };
  }

  const actor = (tenantId: string, userId: string, roles: readonly string[]) =>
    ({ tenantId, userId, roles, permissions: [] }) as never;

  const summarize = (items: ReadonlyArray<{ readonly sku: string; readonly available: number }>) =>
    items.map((item) => `${item.sku}:${item.available}`).sort();

  // ------------------------------------------------------------------ casos

  test("[T-DB0] postura: o papel do serviço é NOSUPERUSER e sem BYPASSRLS; stock_movements e operator_profiles com RLS FORCE", async () => {
    const h = await harness();
    const posture = await h.role.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);
    const forced = await h.admin.$queryRawUnsafe<Array<{ relname: string; relforcerowsecurity: boolean }>>(
      `SELECT relname, relforcerowsecurity FROM pg_class WHERE relname IN ('stock_movements', 'operator_profiles', 'inventory_items') ORDER BY relname`,
    );
    assert.deepEqual(
      forced.map((row) => `${row.relname}:${row.relforcerowsecurity}`),
      ["inventory_items:true", "operator_profiles:true", "stock_movements:true"],
    );
  });

  test("[T-DB1] o técnico vê só a própria custódia profissional, sob o papel sem bypass de RLS", async () => {
    const h = await harness();
    const s = await scenario(h, "db1");

    const stock = await h.stockService.technicianStock(actor(s.tenantA, s.tecA, ["field_technician"]), {});

    assert.deepEqual({ type: stock.custody?.custodyType, label: stock.custody?.label }, { type: "professional", label: "Técnico A" });
    assert.deepEqual(summarize(stock.items), [`${s.x.sku}:5`]);

    // O tecB, na mesma organização, vê só a dele — e nunca o X do tecA.
    const other = await h.stockService.technicianStock(actor(s.tenantA, s.tecB, ["field_technician"]), {});
    assert.deepEqual(summarize(other.items), [`${s.y.sku}:3`]);

    // Técnico de campo sem cadastro: vazio honesto (o papel `assigned_only` não cai na BASE).
    const noProfile = await h.stockService.technicianStock(actor(s.tenantA, s.manager, ["field_technician"]), {});
    assert.equal(noProfile.custody, null);
    assert.deepEqual(noProfile.items, []);
  });

  test("[T-DB1b] o gerente sem cadastro vê exatamente a BASE ([Z: 10], kind base); na org B não vê nada da org A", async () => {
    const h = await harness();
    const s = await scenario(h, "db1b");

    const manager = await h.stockService.technicianStock(actor(s.tenantA, s.manager, ["manager"]), {});
    assert.equal(manager.custody?.custodyType, "base");
    assert.equal(manager.custody?.label, "Base da organização");
    assert.deepEqual(summarize(manager.items), [`${s.z.sku}:10`]);

    const otherOrg = await h.stockService.technicianStock(actor(s.tenantB, s.manager, ["manager"]), {});
    assert.equal(otherOrg.custody?.custodyType, "base");
    assert.deepEqual(otherOrg.items, [], "a BASE da org B está vazia: nada da org A aparece");
  });

  test("[T-DB2] RLS: no contexto da org B, pedir a custódia da org A volta vazio (controle: no contexto da org A, [X: 5])", async () => {
    const h = await harness();
    const s = await scenario(h, "db2");
    const custodyA = { custodyType: "professional" as const, custodyOperatorProfileId: s.profileA };

    const control = await h.rls.withTenantRls(h.role.client, s.tenantA, (tx) =>
      new h.inv.PrismaInventoryRepository(tx).listCustodyBalances(s.tenantA, custodyA),
    );
    assert.deepEqual(
      control.map((row) => `${row.item?.sku}:${row.available}`),
      [`${s.x.sku}:5`],
      "controle positivo: a leitura enxerga a custódia no contexto certo",
    );

    for (const custody of [custodyA, { custodyType: "base" as const }]) {
      const leaked = await h.rls.withTenantRls(h.role.client, s.tenantB, (tx) =>
        new h.inv.PrismaInventoryRepository(tx).listCustodyBalances(s.tenantA, custody),
      );
      assert.deepEqual(leaked, [], `contexto da org B, custódia ${custody.custodyType} da org A: nada`);
    }
  });

  test("[T-DB2b] app real (JWT + RBAC persistente, papel efêmero): o token da org A com X-Tenant-Id da org B nunca lê a org B nem custódia alheia", async () => {
    const h = await harness();
    const s = await scenario(h, "db2b");
    const tenantBItem = await newItem(h, s.tenantB, "b");
    await ledger(h, s.tenantB, tenantBItem.id, "entrada", 7);
    await grantRole(h, s.tenantA, s.tecA, "field_technician", ["inventory.read"]);

    const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repos, { signAccessToken }] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/modules/auth/index.js"),
    ]);
    const client = h.role.client;
    const core = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new repos.TenantRepository(client),
        new repos.UserRepository(client),
        new repos.RoleRepository(client),
        new repos.UserRoleRepository(client),
        new repos.AuditLogRepository(client),
      ),
    );
    const server: Server = createApp(core).listen(0);
    try {
      const baseUrl = await getBaseUrl(server);
      const token = await signAccessToken({ user_id: s.tecA, tenant_id: s.tenantA, email: "bsan315-teca@example.com", roles: ["field_technician"] });

      const own = await requestJson(baseUrl, "/api/v1/mobile/technician/stock", { headers: { authorization: `Bearer ${token}` } });
      assert.equal(own.status, 200, `controle: ${JSON.stringify(own.body)}`);
      assert.deepEqual(summarize(own.body.data.items), [`${s.x.sku}:5`]);

      const crossed = await requestJson(baseUrl, "/api/v1/mobile/technician/stock", {
        headers: { authorization: `Bearer ${token}`, "x-tenant-id": s.tenantB },
      });
      console.log(`[T-DB2b] forma medida com X-Tenant-Id da org B: status ${crossed.status} · ${JSON.stringify(crossed.body)}`);
      const raw = JSON.stringify(crossed.body);
      assert.equal(raw.includes(tenantBItem.id) || raw.includes(tenantBItem.sku), false, "nada da org B");
      for (const alien of [s.y, s.z, s.w]) {
        assert.equal(raw.includes(alien.id), false, `nenhum item fora da custódia do tecA (${alien.sku})`);
      }
      // Forma MEDIDA na F1db (11/11, diário): 200 com a custódia do PRÓPRIO tecA na org do token — o `X-Tenant-Id`
      // é ignorado sob JWT (`authenticated-actor.middleware.ts`), como no T-B3 (ii-b) em memória. O plano previa 403
      // (HIPÓTESE) ou 200 vazio; a diferença está declarada no diário para emenda escrita.
      assert.equal(crossed.status, 200, raw);
      assert.deepEqual(crossed.body.data.custody, { kind: "professional", label: "Técnico A" });
      assert.deepEqual(summarize(crossed.body.data.items), [`${s.x.sku}:5`], "o cabeçalho é ignorado e vale o token");
    } finally {
      await closeServer(server);
      const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
      await drainCloudUsageBestEffortForTests();
    }
  });

  test("[T-DB3] soma decimal: LINK 2,5 e LINK 0,5 → available 3", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "db3");
    const user = await newUser(h, tenantId, "db3-tec");
    const profile = await newProfile(h, tenantId, user, "Técnico decimal");
    const cable = await newItem(h, tenantId, "cabo");
    await ledger(h, tenantId, cable.id, "entrada", 3);
    await link(h, tenantId, cable.id, 2.5, { profile });
    await link(h, tenantId, cable.id, 0.5, { profile });

    const stock = await h.stockService.technicianStock(actor(tenantId, user, ["field_technician"]), {});

    assert.equal(stock.items.length, 1);
    assert.strictEqual(stock.items[0]!.available, 3);
  });

  // ------------------------------------------------------------------ RBAC persistente e teardown

  async function grantRole(h: Harness, tenantId: string, userId: string, key: string, permissions: readonly string[]): Promise<void> {
    const roles = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO roles (tenant_id, key, name, scope) VALUES ($1::uuid, $2, $3, 'tenant') RETURNING id`,
      tenantId,
      key,
      `Papel ${key} ${randomUUID().slice(0, 6)}`,
    );
    for (const permission of permissions) {
      const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO permissions (key, description) VALUES ($1, $1) ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING id`,
        permission,
      );
      await h.admin.$executeRawUnsafe(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid, $2::uuid)`,
        roles[0]!.id,
        rows[0]!.id,
      );
    }
    await h.admin.$executeRawUnsafe(
      `INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      tenantId,
      userId,
      roles[0]!.id,
    );
  }

  async function teardownTenants(admin: Harness["admin"], tenants: readonly string[]): Promise<void> {
    for (const tenantId of tenants) {
      for (const sql of [
        "DELETE FROM stock_movements WHERE tenant_id = $1::uuid",
        "DELETE FROM inventory_items WHERE tenant_id = $1::uuid",
        "DELETE FROM operator_profiles WHERE tenant_id = $1::uuid",
        "DELETE FROM vehicles WHERE tenant_id = $1::uuid",
        "DELETE FROM audit_logs WHERE tenant_id = $1::uuid",
        "DELETE FROM cloud_usage_events WHERE tenant_id = $1::uuid",
        "DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE tenant_id = $1::uuid)",
        "DELETE FROM user_role_assignments WHERE tenant_id = $1::uuid",
        "DELETE FROM roles WHERE tenant_id = $1::uuid",
        "DELETE FROM users WHERE tenant_id = $1::uuid",
        "DELETE FROM tenants WHERE id = $1::uuid",
      ]) {
        await admin.$executeRawUnsafe(sql, tenantId);
      }
    }
  }
}
