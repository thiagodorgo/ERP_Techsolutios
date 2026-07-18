import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  CoreSaasError,
  CoreSaasRegistry,
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  STANDARD_ROLES,
  type Tenant,
  type User,
} from "../src/core-saas.js";

const expectedPermissionCatalog = [
  "platform:cloud-charge-rules:read",
  "platform:cloud-charge-rules:write",
  "platform:cloud-charges:read",
  "platform:cloud-charges:calculate",
  "platform:cloud-cost-allocation:read",
  "platform:cloud-cost-allocation:run",
  "platform:cloud-costs:read",
  "platform:cloud-costs:import",
  "platform:cloud-usage:read",
  "platform:dashboard:read",
  "platform:tenants:read",
  "platform:audit:read",
  "tenant.manage",
  "users.manage",
  "users.read",
  "users:read",
  "roles.manage",
  "audit.read",
  "audit:read",
  "dashboard:read",
  "tenant_settings:read",
  "tenant_settings:update",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:assign",
  "work_orders:status",
  "work_orders:cancel",
  "work_orders:delete",
  "work_orders:comment",
  "work_orders:mileage_correct",
  "customers:read",
  "customers:create",
  "customers:update",
  "vehicles:read",
  "vehicles:create",
  "vehicles:update",
  "teams:read",
  "teams:create",
  "teams:update",
  "service_catalog:read",
  "price_tables:read",
  "branches:read",
  "suppliers:read",
  "operator_profiles:read",
  "tags:read",
  "pois:read",
  "tariffs:read",
  "service_quotes:read",
  "work_order_financials:read",
  "financial_accounts:read",
  "financial_titles:read",
  "financial_entries:read",
  "cheques:read",
  "service_catalog:create",
  "price_tables:create",
  "branches:create",
  "suppliers:create",
  "operator_profiles:create",
  "tags:create",
  "pois:create",
  "tariffs:create",
  "service_quotes:create",
  "work_order_financials:create",
  "financial_accounts:create",
  "financial_titles:create",
  "financial_entries:create",
  "cheques:create",
  "service_catalog:update",
  "price_tables:update",
  "branches:update",
  "suppliers:update",
  "operator_profiles:update",
  "tags:update",
  "pois:update",
  "tariffs:update",
  "service_quotes:update",
  "service_quotes:approve",
  "work_order_financials:update",
  "financial_accounts:update",
  "financial_titles:update",
  "financial_entries:update",
  "cheques:update",
  "financial_period:read",
  "financial_period:close",
  "financial_period:reopen",
  "fuel_logs:read",
  "fuel_logs:create",
  "fuel_logs:update",
  "maintenance_orders:read",
  "maintenance_orders:create",
  "maintenance_orders:update",
  "fines:read",
  "fines:create",
  "fines:update",
  "insurance_policies:read",
  "insurance_policies:create",
  "insurance_policies:update",
  "damages:read",
  "damages:create",
  "damages:update",
  "inventory_items:read",
  "inventory_items:create",
  "inventory_items:update",
  "stock_movements:read",
  "stock_movements:create",
  "cycle_counts:read",
  "cycle_counts:create",
  "field_location:read",
  "field_location:send",
  "field_location:history",
  "field_operator:read",
  "field_operator:action",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:update",
  "field_dispatch:cancel",
  "field_dispatch:reassign",
  "logistics:read",
  "logistics_routes:read",
  "billing:read",
  "invoices:read",
  "payments:read",
  "commissions:read",
  "commissions:read_own",
  "commissions:manage_policy",
  "commissions:calculate",
  "commissions:approve",
  "commissions:adjust",
  "commissions:settle",
  "commissions:audit",
  "expense_report:read",
  "expense_report:read_own",
  "expense_report:create",
  "expense_report:update",
  "expense_report:submit",
  "expense_report:approve_manager",
  "expense_report:approve_finance",
  "expense_report:return",
  "expense_report:reject",
  "expense_report:pay",
  "expense_policy:read",
  "expense_policy:manage",
  "expense_receipt:attach",
  "expense_sync:write",
  "expense_audit:read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
  "finance:read",
  "notifications:read",
  "notifications:update",
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
  "checklist_runs:create",
  "checklist_runs:update",
  "checklist_runs:complete",
  "checklist_runs:acknowledge",
] as const;

test("cria usuario vinculado a tenant ativo com papel validado", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({
    name: "Tech Guinchos",
    document: "12.345.678/0001-90",
    modules: ["operacao", "financeiro"],
  });

  const user = core.createUser({
    tenantId: tenant.id,
    name: "Ana Operacao",
    email: "Ana.Operacao@example.com",
    roles: ["tenant_admin"],
    branchIds: ["matriz", "matriz"],
  });

  assert.match(user.id, /^usr_/);
  assert.equal(user.tenantId, tenant.id);
  assert.equal(user.name, "Ana Operacao");
  assert.equal(user.email, "ana.operacao@example.com");
  assert.deepEqual(user.roles, ["tenant_admin"]);
  assert.deepEqual(user.branchIds, ["matriz"]);
  assert.equal(user.status, "active");
  assert.deepEqual(
    core.listUsersByTenant(tenant.id).map((tenantUser) => tenantUser.email),
    ["ana.operacao@example.com"],
  );
});

test("valida papeis oficiais e rejeita papel inexistente", () => {
  const core = new CoreSaasRegistry();

  assert.ok(DEFAULT_ROLES.includes("tenant_admin"));
  assert.equal(core.isValidRole("TENANT_ADMIN"), true);
  assert.equal(core.validateRole("Finance"), "finance");
  assert.throws(() => core.validateRole("owner"), /Invalid role: owner/);
});

test("mantem catalogo de permissoes integro", () => {
  assert.deepEqual(PERMISSION_CATALOG, expectedPermissionCatalog);
  assert.equal(new Set(PERMISSION_CATALOG).size, PERMISSION_CATALOG.length);
});

test("mantem roles padrao coerentes com o catalogo RBAC", () => {
  assert.deepEqual(STANDARD_ROLES, [
    "super_admin",
    "tenant_admin",
    "manager",
    "field_dispatcher",
    "technician",
    "viewer",
  ]);

  const permissionCatalog = new Set(PERMISSION_CATALOG);

  for (const role of DEFAULT_ROLES) {
    assert.ok(ROLE_PERMISSIONS[role].length > 0);

    for (const permission of ROLE_PERMISSIONS[role]) {
      assert.ok(permissionCatalog.has(permission));
    }
  }

  assert.deepEqual(ROLE_PERMISSIONS.super_admin, PERMISSION_CATALOG);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-charge-rules:read"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-charge-rules:write"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-charges:read"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-charges:calculate"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-cost-allocation:read"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-cost-allocation:run"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-costs:read"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-costs:import"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("platform:cloud-usage:read"), false);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("tenant.manage"), true);
  assert.equal(ROLE_PERMISSIONS.viewer.includes("users.manage"), false);
  assert.equal(ROLE_PERMISSIONS.technician.includes("finance.manage"), false);

  // Ω4-6 — fechamento de período: read amplo; close só tesouraria/admins; reopen SÓ admins (fora de finance,
  // separação de funções RN-FIN-009).
  assert.equal(ROLE_PERMISSIONS.finance.includes("financial_period:read"), true);
  assert.equal(ROLE_PERMISSIONS.finance.includes("financial_period:close"), true);
  assert.equal(ROLE_PERMISSIONS.finance.includes("financial_period:reopen"), false);
  assert.equal(ROLE_PERMISSIONS.manager.includes("financial_period:read"), true);
  assert.equal(ROLE_PERMISSIONS.manager.includes("financial_period:close"), false);
  assert.equal(ROLE_PERMISSIONS.auditor.includes("financial_period:read"), true);
  assert.equal(ROLE_PERMISSIONS.viewer.includes("financial_period:read"), true);
  assert.equal(ROLE_PERMISSIONS.tenant_admin.includes("financial_period:reopen"), true);
  assert.equal(ROLE_PERMISSIONS.operator.includes("financial_period:read"), false);
});

test("bloqueia criacao de usuario com papel invalido", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({
    name: "Tenant Operacional",
  });

  assert.throws(
    () =>
      core.createUser({
        tenantId: tenant.id,
        name: "Usuario Sem Papel",
        email: "usuario@example.com",
        roles: ["owner"],
      }),
    /Invalid role: owner/,
  );
});

test("lista tenants cadastrados e permite filtro por status", () => {
  const core = new CoreSaasRegistry();

  const activeTenant = core.createTenant({
    name: "Operacao Ativa",
    modules: ["operacao", "financeiro", "operacao"],
  });
  core.createTenant({
    name: "Operacao Inativa",
    status: "inactive",
    modules: ["auditoria"],
  });

  const allTenants = core.listTenants();
  const activeTenants = core.listTenants({ status: "active" });

  assert.deepEqual(
    allTenants.map((tenant) => tenant.name),
    ["Operacao Ativa", "Operacao Inativa"],
  );
  assert.deepEqual(activeTenant.modules, ["operacao", "financeiro"]);
  assert.deepEqual(
    activeTenants.map((tenant) => tenant.id),
    [activeTenant.id],
  );
});

test("permite acesso quando role possui permissao", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const users = await requestJson(baseUrl, "/api/v1/users", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const roles = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(users.status, 200);
    assert.deepEqual(
      users.body.data.map((user: User) => user.email),
      ["admin-a@example.com", "viewer-a@example.com"],
    );
    assert.equal(roles.status, 200);
    assert.ok(
      roles.body.data.some(
        (role: { role: string }) => role.role === "tenant_admin",
      ),
    );
  });
});

test("nega acesso sem tenant e sem role", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const withoutTenant = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const withoutRole = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        "x-tenant-id": seed.tenantA.id,
        "x-user-id": seed.adminA.id,
      },
    });

    assert.equal(withoutTenant.status, 403);
    assert.equal(withoutTenant.body.error.reason, "tenant_required");
    assert.equal(withoutRole.status, 403);
    assert.equal(withoutRole.body.error.reason, "role_required");
  });
});

test("mantem isolamento por tenant na listagem de usuarios e tenants", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const users = await requestJson(baseUrl, "/api/v1/users", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const tenants = await requestJson(baseUrl, "/api/v1/tenants", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(users.status, 200);
    assert.deepEqual(
      users.body.data.map((user: User) => user.tenantId),
      [seed.tenantA.id, seed.tenantA.id],
    );
    assert.equal(tenants.status, 200);
    assert.deepEqual(
      tenants.body.data.map((tenant: Tenant) => tenant.id),
      [seed.tenantA.id],
    );
  });
});

test("nega acesso quando permission claim nao cobre permissao exigida", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin", [
        "os.read",
      ]),
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.reason, "permission_required");
  });
});

test("nega role valida sem permissao suficiente", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {
        name: "Usuario Bloqueado",
        email: "bloqueado@example.com",
        roles: ["viewer"],
      },
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.reason, "permission_required");
  });
});

test("bloqueia acesso cruzado entre tenants", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.userB.id}`,
      {
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      },
    );

    assert.equal(response.status, 403);
    assert.equal(response.body.error.reason, "tenant_access_denied");
  });
});

test("registra auditoria minima em operacoes protegidas", async () => {
  await withApi(async ({ baseUrl, seed, service }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: {
        name: "Novo Usuario",
        email: "novo@example.com",
        roles: ["viewer"],
      },
    });

    const auditEvents = service.getAuditEventsForTenant(seed.tenantA.id);
    const lastEvent = auditEvents.at(-1);

    assert.equal(response.status, 201);
    assert.equal(lastEvent?.action, "user.created");
    assert.equal(lastEvent?.actor_user_id, seed.adminA.id);
    assert.equal(lastEvent?.tenant_id, seed.tenantA.id);
    assert.ok(lastEvent?.timestamp instanceof Date);
  });
});

test("ignora tenantId do body ao criar usuario tenant-scoped", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: {
        tenantId: seed.tenantB.id,
        name: "Usuario Tenant Seguro",
        email: "tenant-seguro@example.com",
        roles: ["viewer"],
      },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.tenantId, seed.tenantA.id);
  });
});

test("bloqueia supervisor e operador em RBAC avancado", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const supervisorRoles = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenantA, seed.viewerA, "manager"),
    });
    const operatorRoles = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenantA, seed.viewerA, "operator"),
    });
    const operatorCreateUser = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "operator"),
      body: {
        name: "Usuario Indevido",
        email: "indevido@example.com",
        roles: ["viewer"],
      },
    });

    assert.equal(supervisorRoles.status, 403);
    assert.equal(supervisorRoles.body.error.reason, "permission_required");
    assert.equal(operatorRoles.status, 403);
    assert.equal(operatorRoles.body.error.reason, "permission_required");
    assert.equal(operatorCreateUser.status, 403);
    assert.equal(operatorCreateUser.body.error.reason, "permission_required");
  });
});

test("updateUser atualiza papeis do usuario tenant-scoped", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({ name: "Tenant Update" });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Usuario Papel",
    email: "papel@example.com",
    roles: ["viewer"],
  });

  const updated = core.updateUser({
    userId: user.id,
    tenantId: tenant.id,
    roles: ["manager", "manager"],
  });

  assert.deepEqual(updated.roles, ["manager"]);
  assert.equal(updated.id, user.id);
  assert.equal(updated.email, "papel@example.com");
  assert.deepEqual(
    core.getUserForTenant(user.id, tenant.id).roles,
    ["manager"],
  );
});

test("updateUser desativa e reativa usuario (status logico reversivel)", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({ name: "Tenant Status" });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Usuario Status",
    email: "status@example.com",
    roles: ["viewer"],
  });

  const deactivated = core.updateUser({
    userId: user.id,
    tenantId: tenant.id,
    status: "inactive",
  });

  assert.equal(deactivated.status, "inactive");

  const reactivated = core.updateUser({
    userId: user.id,
    tenantId: tenant.id,
    status: "active",
  });

  assert.equal(reactivated.status, "active");
  assert.equal(core.getUserForTenant(user.id, tenant.id).status, "active");
});

test("updateUser rejeita papel invalido com invalid_role 400", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({ name: "Tenant Papel Invalido" });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Usuario",
    email: "invalido@example.com",
    roles: ["viewer"],
  });

  assert.throws(
    () =>
      core.updateUser({
        userId: user.id,
        tenantId: tenant.id,
        roles: ["owner"],
      }),
    (error: unknown) =>
      error instanceof CoreSaasError &&
      error.statusCode === 400 &&
      error.reason === "invalid_role",
  );
});

test("updateUser exige ao menos um campo", () => {
  const core = new CoreSaasRegistry();
  const tenant = core.createTenant({ name: "Tenant Vazio" });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Usuario",
    email: "vazio@example.com",
    roles: ["viewer"],
  });

  assert.throws(
    () => core.updateUser({ userId: user.id, tenantId: tenant.id }),
    (error: unknown) =>
      error instanceof CoreSaasError &&
      error.statusCode === 400 &&
      error.reason === "user_update_empty",
  );
});

test("updateUser trata userId de outro tenant como 404", () => {
  const core = new CoreSaasRegistry();
  const tenantA = core.createTenant({ name: "Tenant A" });
  const tenantB = core.createTenant({ name: "Tenant B" });
  const userB = core.createUser({
    tenantId: tenantB.id,
    name: "User B",
    email: "user-b@example.com",
    roles: ["viewer"],
  });

  assert.throws(
    () =>
      core.updateUser({
        userId: userB.id,
        tenantId: tenantA.id,
        status: "inactive",
      }),
    (error: unknown) =>
      error instanceof CoreSaasError &&
      error.statusCode === 404 &&
      error.reason === "user_not_found",
  );
});

test("PATCH /users/:id atualiza papeis e registra auditoria user.updated", async () => {
  await withApi(async ({ baseUrl, seed, service }) => {
    const response = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { roles: ["manager"] },
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.roles, ["manager"]);

    const detail = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      },
    );

    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.data.roles, ["manager"]);

    const list = await requestJson(baseUrl, "/api/v1/users", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const listed = list.body.data.find(
      (user: User) => user.id === seed.viewerA.id,
    );

    assert.deepEqual(listed.roles, ["manager"]);

    const auditEvents = service.getAuditEventsForTenant(seed.tenantA.id);
    const lastEvent = auditEvents.at(-1);

    assert.equal(lastEvent?.action, "user.updated");
    assert.equal(lastEvent?.actor_user_id, seed.adminA.id);
    assert.equal(lastEvent?.tenant_id, seed.tenantA.id);
  });
});

test("PATCH /users/:id desativa e reativa usuario", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const deactivate = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { status: "inactive" },
      },
    );

    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.body.data.status, "inactive");

    const reactivate = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { status: "active" },
      },
    );

    assert.equal(reactivate.status, 200);
    assert.equal(reactivate.body.data.status, "active");
  });
});

test("PATCH /users/:id rejeita papel invalido e corpo vazio", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const invalidRole = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { roles: ["owner"] },
      },
    );
    const emptyBody = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: {},
      },
    );

    assert.equal(invalidRole.status, 400);
    assert.equal(invalidRole.body.error.reason, "invalid_role");
    assert.equal(emptyBody.status, 400);
    assert.equal(emptyBody.body.error.reason, "user_update_empty");
  });
});

test("PATCH /users/:id de outro tenant retorna 404 not_found", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.userB.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { status: "inactive" },
      },
    );

    assert.equal(response.status, 404);
    assert.equal(response.body.error.reason, "user_not_found");
  });
});

test("PATCH /users/:id exige users.manage (viewer 403, admin 200)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const readOnly = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
        body: { status: "inactive" },
      },
    );
    const managed = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { status: "inactive" },
      },
    );

    assert.equal(readOnly.status, 403);
    assert.equal(readOnly.body.error.reason, "permission_required");
    assert.equal(managed.status, 200);
    assert.equal(managed.body.data.status, "inactive");
  });
});

test("PATCH /users/:id ignora tenantId do body", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(
      baseUrl,
      `/api/v1/users/${seed.viewerA.id}`,
      {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        body: { tenantId: seed.tenantB.id, roles: ["manager"] },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.tenantId, seed.tenantA.id);
    assert.deepEqual(response.body.data.roles, ["manager"]);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly viewerA: User;
  readonly userB: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly service: CoreSaasRegistry;
};

async function withApi(
  callback: (context: ApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ app }, { coreSaasService }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
  ]);

  coreSaasService.reset();
  const seed = seedCoreSaas(coreSaasService);
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
      service: coreSaasService,
    });
  } finally {
    await closeServer(server);
  }
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant A",
    modules: ["operacao", "financeiro"],
  });
  const tenantB = service.createTenant({
    name: "Tenant B",
    modules: ["operacao"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "viewer-a@example.com",
    roles: ["viewer"],
  });
  const userB = service.createUser({
    tenantId: tenantB.id,
    name: "User B",
    email: "user-b@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    viewerA,
    userB,
  };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role: string,
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
