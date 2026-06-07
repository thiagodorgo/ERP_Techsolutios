import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  CoreSaasRegistry,
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  STANDARD_ROLES,
  type Tenant,
  type User,
} from "../src/core-saas.js";

const expectedPermissionCatalog = [
  "tenant.manage",
  "users.manage",
  "users.read",
  "roles.manage",
  "audit.read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
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
  assert.deepEqual(ROLE_PERMISSIONS.tenant_admin, PERMISSION_CATALOG);
  assert.equal(ROLE_PERMISSIONS.viewer.includes("users.manage"), false);
  assert.equal(ROLE_PERMISSIONS.technician.includes("finance.manage"), false);
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
