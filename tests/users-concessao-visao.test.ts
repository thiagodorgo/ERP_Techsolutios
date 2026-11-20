import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { CoreSaasRegistry, Tenant, User } from "../src/core-saas.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-CONCESSAO-PAINEL (plano §2.3, §4 e §7.1; Emenda 2, E2-3) — a concessão ESTREITA da "Visão da organização" no
// caminho de MEMÓRIA (o do job `backend` da CI), pela rota real (`src/app.js`, cadastro em memória):
//   PUT / DELETE /api/v1/users/:userId/organization-view, com `users:grant_organization_view` (não `users.manage`).
// A regra sem escalada (§4.2): só quem tem a chave concede, inclusive a si; só o papel `organization_view`, constante do
// servidor (o corpo é ignorado); só na própria organização (a outra recebe o 404 do inexistente); idempotente; um
// `user.updated` por ato, com `change`, pela lista permitida. O PATCH/POST de usuários seguem `users.manage`.
// O caminho Prisma, sob papel NOSUPERUSER NOBYPASSRLS, vive em `tests/users-concessao-visao-db.test.ts`.
// T-OV-SEM-CHAVE, T-CATALOGO e T-PAPEL-AUTORIDADE (o catálogo) vivem em `tests/core-saas-role-authority.test.ts` (F1).
// -----------------------------------------------------------------------------------------------

const ORG_VIEW = "organization_view";
const SEM_A_CHAVE = [
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "technician",
  "field_dispatcher",
  "auditor",
  "support",
  "viewer",
] as const;

type Seed = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly managerA: User;
  readonly alvo: User; // support + field_technician, sem a visão
  readonly alvoB: User; // da organização B
  readonly porPapel: ReadonlyMap<string, User>;
};

async function withApi(
  callback: (context: { readonly baseUrl: string; readonly seed: Seed; readonly core: CoreSaasRegistry }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ app }, { coreSaasService }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
  ]);

  coreSaasService.reset();

  const tenantA = coreSaasService.createTenant({ name: "Organização A" });
  const tenantB = coreSaasService.createTenant({ name: "Organização B" });
  const novo = (tenant: Tenant, tag: string, roles: string[]) =>
    coreSaasService.createUser({ tenantId: tenant.id, name: `Usuário ${tag}`, email: `ov-${tag}@example.com`, roles });
  const adminA = novo(tenantA, "admin-a", ["tenant_admin"]);
  const managerA = novo(tenantA, "manager-a", ["manager"]);
  const alvo = novo(tenantA, "alvo", ["support", "field_technician"]);
  const alvoB = novo(tenantB, "alvo-b", ["field_technician"]);
  novo(tenantB, "admin-b", ["tenant_admin"]);
  const porPapel = new Map<string, User>();

  for (const role of SEM_A_CHAVE) {
    porPapel.set(role, novo(tenantA, `papel-${role}`, [role]));
  }

  const server = app.listen(0);

  try {
    const baseUrl = await getBaseUrl(server);

    await callback({ baseUrl, seed: { tenantA, tenantB, adminA, managerA, alvo, alvoB, porPapel }, core: coreSaasService });
  } finally {
    await closeServer(server);
  }
}

function como(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

const caminho = (userId: string) => `/api/v1/users/${userId}/organization-view`;

function papeisDe(core: CoreSaasRegistry, tenant: Tenant, userId: string): string[] {
  const user = core.listUsersForTenant(tenant.id).find((candidate) => candidate.id === userId);

  assert.ok(user, `o usuário ${userId} existe na organização`);

  return [...user.roles].sort();
}

function eventosDaVisao(core: CoreSaasRegistry, tenant: Tenant, userId: string) {
  return core
    .getAuditEventsForTenant(tenant.id)
    .filter(
      (event) =>
        event.action === "user.updated" &&
        (event.metadata as Record<string, unknown>)?.userId === userId &&
        typeof (event.metadata as Record<string, unknown>)?.change === "string",
    );
}

test("T-ADMIN-CONCEDE — tenant_admin: PUT → 200, roles com organization_view e os outros papéis iguais", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers: como(seed.tenantA, seed.adminA, "tenant_admin") });

    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual([...r.body.data.roles].sort(), ["field_technician", ORG_VIEW, "support"]);
    assert.deepEqual(papeisDe(core, seed.tenantA, seed.alvo.id), ["field_technician", ORG_VIEW, "support"]);
  });
});

test("T-GESTOR-CONCEDE — manager: PUT → 200 sem users.manage, só organization_view a mais", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers: como(seed.tenantA, seed.managerA, "manager") });

    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(papeisDe(core, seed.tenantA, seed.alvo.id), ["field_technician", ORG_VIEW, "support"]);
  });
});

test("T-SI-MESMO — manager e tenant_admin concedem a si mesmos (e retiram)", async (t) => {
  await withApi(async ({ baseUrl, seed, core }) => {
    for (const [nome, user, role] of [
      ["manager", seed.managerA, "manager"],
      ["tenant_admin", seed.adminA, "tenant_admin"],
    ] as const) {
      await t.test(`T-SI-MESMO[${nome}]`, async () => {
        const put = await requestJson(baseUrl, caminho(user.id), { method: "PUT", headers: como(seed.tenantA, user, role) });

        assert.equal(put.status, 200, JSON.stringify(put.body));
        assert.deepEqual(papeisDe(core, seed.tenantA, user.id), [role, ORG_VIEW].sort());

        const del = await requestJson(baseUrl, caminho(user.id), { method: "DELETE", headers: como(seed.tenantA, user, role) });

        assert.equal(del.status, 200, JSON.stringify(del.body));
        assert.deepEqual(papeisDe(core, seed.tenantA, user.id), [role]);
      });
    }
  });
});

test("T-SEM-CHAVE-403 — os 9 papéis sem a chave, num outro usuário e em si mesmos, PUT e DELETE → 403 permission_required", async (t) => {
  await withApi(async ({ baseUrl, seed, core }) => {
    // Um alvo que JÁ tem a visão, para o DELETE ter o que retirar se o portão falhar.
    const comVisao = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers: como(seed.tenantA, seed.adminA, "tenant_admin") });

    assert.equal(comVisao.status, 200);

    for (const role of SEM_A_CHAVE) {
      const ator = seed.porPapel.get(role)!;

      for (const [onde, alvoId, metodo] of [
        ["outro", seed.alvo.id, "DELETE"],
        ["outro-put", seed.porPapel.get(role === "viewer" ? "support" : "viewer")!.id, "PUT"],
        ["si", ator.id, "PUT"],
        ["si-delete", ator.id, "DELETE"],
      ] as const) {
        await t.test(`T-SEM-CHAVE-403[${role}·${onde}·${metodo}]`, async () => {
          const antes = papeisDe(core, seed.tenantA, alvoId);
          const r = await requestJson(baseUrl, caminho(alvoId), { method: metodo, headers: como(seed.tenantA, ator, role) });

          assert.equal(r.status, 403, `${role} ${metodo} ${onde}: ${JSON.stringify(r.body)}`);
          assert.equal(r.body.error?.reason, "permission_required");
          assert.deepEqual(papeisDe(core, seed.tenantA, alvoId), antes, "os papéis do alvo não mudam");
        });
      }
    }
  });
});

test("T-XT — usuário de outra organização: o MESMO 404 do inexistente (status, code e reason), no PUT e no DELETE", async (t) => {
  await withApi(async ({ baseUrl, seed, core }) => {
    for (const metodo of ["PUT", "DELETE"] as const) {
      await t.test(`T-XT[${metodo}]`, async () => {
        const headers = como(seed.tenantA, seed.adminA, "tenant_admin");
        const outra = await requestJson(baseUrl, caminho(seed.alvoB.id), { method: metodo, headers });
        const inexistente = await requestJson(baseUrl, caminho("usr_nao_existe"), { method: metodo, headers });

        assert.equal(outra.status, 404, JSON.stringify(outra.body));
        assert.deepEqual(
          [outra.status, outra.body.error?.code, outra.body.error?.reason],
          [inexistente.status, inexistente.body.error?.code, inexistente.body.error?.reason],
        );
        assert.equal(outra.body.error?.reason, "user_not_found");
        assert.deepEqual(papeisDe(core, seed.tenantB, seed.alvoB.id), ["field_technician"], "B inalterado");
      });
    }
  });
});

test("T-CORPO-IGNORADO — PUT com roles, name, status e tenantId no corpo: o alvo ganha só organization_view", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const antes = core.listUsersForTenant(seed.tenantA.id).find((u) => u.id === seed.alvo.id)!;
    const r = await requestJson(baseUrl, caminho(seed.alvo.id), {
      method: "PUT",
      headers: como(seed.tenantA, seed.managerA, "manager"),
      body: { roles: ["tenant_admin"], name: "Outro nome", status: "inactive", tenantId: seed.tenantB.id },
    });

    assert.equal(r.status, 200, JSON.stringify(r.body));

    const depois = core.listUsersForTenant(seed.tenantA.id).find((u) => u.id === seed.alvo.id)!;

    assert.deepEqual([...depois.roles].sort(), ["field_technician", ORG_VIEW, "support"]);
    assert.equal(depois.name, antes.name);
    assert.equal(depois.status, antes.status);
    assert.equal(depois.tenantId, seed.tenantA.id);
    assert.equal(depois.roles.includes("tenant_admin"), false, "nenhum papel vem do corpo");
  });
});

test("T-IDEMPOTENTE — 2× PUT → 200 e 200 com 1 evento granted; 2× DELETE → 200 e 200 com 1 evento revoked", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const headers = como(seed.tenantA, seed.managerA, "manager");

    for (let i = 0; i < 2; i += 1) {
      const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers });

      assert.equal(r.status, 200, JSON.stringify(r.body));
    }

    let eventos = eventosDaVisao(core, seed.tenantA, seed.alvo.id);

    assert.deepEqual(
      eventos.map((e) => (e.metadata as Record<string, unknown>).change),
      ["organization_view.granted"],
    );

    for (let i = 0; i < 2; i += 1) {
      const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "DELETE", headers });

      assert.equal(r.status, 200, JSON.stringify(r.body));
    }

    eventos = eventosDaVisao(core, seed.tenantA, seed.alvo.id);

    assert.deepEqual(
      eventos.map((e) => (e.metadata as Record<string, unknown>).change),
      ["organization_view.granted", "organization_view.revoked"],
    );
  });
});

test("T-RETIRA — DELETE → 200 e só organization_view sai", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const headers = como(seed.tenantA, seed.adminA, "tenant_admin");

    assert.equal((await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers })).status, 200);

    const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "DELETE", headers });

    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual([...r.body.data.roles].sort(), ["field_technician", "support"]);
    assert.deepEqual(papeisDe(core, seed.tenantA, seed.alvo.id), ["field_technician", "support"]);
  });
});

test("T-ULTIMO-PAPEL — alvo só com organization_view (atribuído pelo admin via PATCH): DELETE → 422 user_role_required e o papel fica", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const admin = como(seed.tenantA, seed.adminA, "tenant_admin");
    const patch = await requestJson(baseUrl, `/api/v1/users/${seed.alvo.id}`, { method: "PATCH", headers: admin, body: { roles: [ORG_VIEW] } });

    assert.equal(patch.status, 200, JSON.stringify(patch.body));

    const r = await requestJson(baseUrl, caminho(seed.alvo.id), { method: "DELETE", headers: como(seed.tenantA, seed.managerA, "manager") });

    assert.equal(r.status, 422, JSON.stringify(r.body));
    assert.equal(r.body.error?.reason, "user_role_required");
    assert.deepEqual(papeisDe(core, seed.tenantA, seed.alvo.id), [ORG_VIEW]);
  });
});

test("T-PATCH-SEGUE-403 — manager no PATCH (com organization_view nos papéis) e no POST de usuários → 403 permission_required", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const headers = como(seed.tenantA, seed.managerA, "manager");
    const patch = await requestJson(baseUrl, `/api/v1/users/${seed.alvo.id}`, {
      method: "PATCH",
      headers,
      body: { roles: ["support", "field_technician", ORG_VIEW] },
    });

    assert.equal(patch.status, 403, JSON.stringify(patch.body));
    assert.equal(patch.body.error?.reason, "permission_required");
    assert.deepEqual(papeisDe(core, seed.tenantA, seed.alvo.id), ["field_technician", "support"]);

    const post = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers,
      body: { name: "Novo", email: "ov-novo@example.com", roles: [ORG_VIEW] },
    });

    assert.equal(post.status, 403, JSON.stringify(post.body));
    assert.equal(post.body.error?.reason, "permission_required");
  });
});

test("T-AUDITA — o evento: ator = quem concedeu, alvo, antes/depois ordenados, change; sem email, tenant_id nem token em metadata", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const headers = como(seed.tenantA, seed.managerA, "manager");

    assert.equal((await requestJson(baseUrl, caminho(seed.alvo.id), { method: "PUT", headers })).status, 200);
    assert.equal((await requestJson(baseUrl, caminho(seed.alvo.id), { method: "DELETE", headers })).status, 200);

    const [concedeu, retirou] = eventosDaVisao(core, seed.tenantA, seed.alvo.id);

    for (const [evento, change, antes, depois] of [
      [concedeu, "organization_view.granted", ["field_technician", "support"], ["field_technician", ORG_VIEW, "support"]],
      [retirou, "organization_view.revoked", ["field_technician", ORG_VIEW, "support"], ["field_technician", "support"]],
    ] as const) {
      assert.ok(evento, `o evento ${change} existe`);
      assert.equal(evento.actor_user_id, seed.managerA.id);
      assert.equal(evento.tenant_id, seed.tenantA.id);

      const metadata = evento.metadata as Record<string, any>;

      assert.equal(metadata.userId, seed.alvo.id);
      assert.equal(metadata.change, change);
      assert.deepEqual(metadata.before.roles, [...antes]);
      assert.deepEqual(metadata.after.roles, [...depois]);

      const texto = JSON.stringify(metadata).toLowerCase();

      for (const proibido of ["email", "tenant_id", "tenantid", "token", "@example.com"]) {
        assert.equal(texto.includes(proibido), false, `metadata não carrega ${proibido}`);
      }
    }
  });
});

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return { status: response.status, body: await response.json() };
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
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

// B-USERS-CONCESSAO-PAINEL (F5b, conferência visual de 20/11) — F-ALCANCE-CATALOGO: a tela diz o que a "Visão da
// organização" abre a partir de uma tabela de chaves de leitura por papel (`frontend/src/modules/users/organization-view.reach.ts`).
// Ela tem de ser IGUAL ao catálogo do servidor, papel a papel, nas 4 chaves das 18 leituras de OS; senão a tela promete
// despacho a quem não o vê (o defeito que a conferência achou). Papel novo no catálogo sem linha na tabela também falha.
test("F-ALCANCE-CATALOGO — a tabela da tela (o que a visão abre por perfil) é igual ao catálogo do servidor", async () => {
  const { ROLE_PERMISSIONS, resolvePermissionsForRoles } = await import("../src/modules/core-saas/permissions/catalog.js");
  const { ORGANIZATION_VIEW_READ_KEYS, ORGANIZATION_VIEW_MODULE_KEY } = await import("../frontend/src/modules/users/organization-view.reach.js");
  const chaves = [...new Set(Object.values(ORGANIZATION_VIEW_MODULE_KEY))].sort();
  assert.deepEqual(chaves, ["checklist_runs:read", "dashboard:read", "field_dispatch:read", "work_orders:read"], "as 4 chaves das 18 leituras");
  assert.deepEqual(Object.keys(ORGANIZATION_VIEW_READ_KEYS).sort(), Object.keys(ROLE_PERMISSIONS).sort(), "uma linha por papel do catálogo");
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    const doCatalogo = new Set(resolvePermissionsForRoles([role] as never) as string[]);
    assert.deepEqual([...ORGANIZATION_VIEW_READ_KEYS[role]].sort(), chaves.filter((k) => doCatalogo.has(k)), `papel ${role}`);
  }
  assert.deepEqual(ORGANIZATION_VIEW_READ_KEYS.organization_view, [], "a visão não tem chave");
});
