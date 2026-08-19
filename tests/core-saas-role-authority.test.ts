import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { signAccessToken } from "../src/modules/auth/index.js";
import {
  DEFAULT_ROLES,
  LEGACY_ROLES,
  PLATFORM_ROLES,
  ROLE_AUTHORITY,
  ROLE_PERMISSIONS,
  STANDARD_ROLES,
  TENANT_ASSIGNABLE_ROLES,
  RoleNotAssignableError,
  assertAssignableRole,
  isPlatformRole,
} from "../src/modules/core-saas/permissions/catalog.js";
import { requirePlatformPermission } from "../src/modules/platform/platform-permissions.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { PrismaCoreSaasStore } from "../src/modules/core-saas/store/prisma-core-saas.store.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { CoreSaasError } from "../src/modules/core-saas/types/core-saas.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (Ω6R-SEC-001, §4 do plano) — a allowlist fechada por construção. O defeito que este
// arquivo mata: `users.manage` numa organização atribuía super_admin/platform_admin, e o portador
// passava a operar /api/v1/platform/* contra TODAS as organizações (platform-permissions.ts
// concede plataforma pela presença do papel). Cada teste nomeia o vetor que fecha.
// -----------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------
// Ciclo 2 (R-B-O6R-01-ciclo1, B-2/B-3 + adendo) — o que cada camada PROVA, sem afirmar mais:
//   · compile-time: o `satisfies Record<Role, …>` do ROLE_AUTHORITY reprova papel sem
//     classificação (fixtures em src/modules/core-saas/permissions/catalog.type-check.ts;
//     provado por mutação no drill 2 do ciclo 2).
//   · runtime: os conjuntos derivam por INCLUSÃO do mapa — os testes abaixo os comparam com
//     LITERAIS INDEPENDENTES (aqui e no snapshot), nunca com a própria origem da derivação
//     (a tautologia que o adendo ao B-2 reprovou).
// -----------------------------------------------------------------------------------------------

test("partição em runtime: PLATFORM ∪ TENANT_ASSIGNABLE == DEFAULT_ROLES, sem interseção", () => {
  // Com a derivação por INCLUSÃO, este teste ganhou um estado capaz de reprovar: um papel que
  // escapasse do `satisfies` sem classificação cai FORA dos dois conjuntos e a união fica menor
  // que o catálogo — vermelho aqui. (Na derivação por exclusão do ciclo 1 isso era impossível.)
  const union = new Set<string>([...PLATFORM_ROLES, ...TENANT_ASSIGNABLE_ROLES]);

  assert.deepEqual([...union].sort(), [...DEFAULT_ROLES].sort());
  assert.equal(PLATFORM_ROLES.length + TENANT_ASSIGNABLE_ROLES.length, DEFAULT_ROLES.length);

  for (const role of PLATFORM_ROLES) {
    assert.equal(
      (TENANT_ASSIGNABLE_ROLES as readonly string[]).includes(role),
      false,
      `papel de plataforma ${role} não pode ser atribuível por tenant`,
    );
  }
});

// Literais INDEPENDENTES do catálogo: é contra ELES (não contra a derivação) que a classificação
// é comparada. Mudou a classificação de um papel no ROLE_AUTHORITY? Este teste fica vermelho e a
// mudança precisa ser deliberada — aqui e no snapshot.
const PAPEIS_DE_PLATAFORMA_ESPERADOS: readonly string[] = ["super_admin", "platform_admin"];

test("classificação pinada a literais independentes: autoridade E comportamento por papel", () => {
  assert.equal(DEFAULT_ROLES.length, 13, "o catálogo tem 13 papéis; papel novo exige decisão explícita aqui");

  for (const role of DEFAULT_ROLES) {
    const esperadoPlataforma = PAPEIS_DE_PLATAFORMA_ESPERADOS.includes(role);

    assert.equal(
      ROLE_AUTHORITY[role],
      esperadoPlataforma ? "platform" : "tenant",
      `classificação de ${role} divergiu do literal esperado`,
    );

    if (esperadoPlataforma) {
      assert.throws(() => assertAssignableRole(role), RoleNotAssignableError);
    } else {
      assert.equal(assertAssignableRole(role), role);
    }
  }
});

test("contrato do consumidor de deploy: snapshot dos valores exportados (conteúdo E ordem)", () => {
  // Baseline capturada da árvore INTOCADA (ff26ac1), antes da refatoração do ciclo 2 — a
  // derivação por inclusão tem que reproduzir byte a byte o que seed/provision-rbac já liam.
  const snapshot = JSON.parse(
    readFileSync(new URL("./fixtures/role-catalog-contract.snapshot.json", import.meta.url), "utf8"),
  ) as {
    STANDARD_ROLES: string[];
    LEGACY_ROLES: string[];
    DEFAULT_ROLES: string[];
    PLATFORM_ROLES: string[];
    TENANT_ASSIGNABLE_ROLES: string[];
    ROLE_PERMISSIONS_KEY_ORDER: string[];
    ROLE_PERMISSIONS: Record<string, string[]>;
  };

  // deepEqual de array é sensível à ORDEM — é isso que pina "mesmo conteúdo e mesma ordem".
  assert.deepEqual([...STANDARD_ROLES], snapshot.STANDARD_ROLES);
  assert.deepEqual([...LEGACY_ROLES], snapshot.LEGACY_ROLES);
  assert.deepEqual([...DEFAULT_ROLES], snapshot.DEFAULT_ROLES);
  assert.deepEqual([...PLATFORM_ROLES], snapshot.PLATFORM_ROLES);
  assert.deepEqual([...TENANT_ASSIGNABLE_ROLES], snapshot.TENANT_ASSIGNABLE_ROLES);
  assert.deepEqual(Object.keys(ROLE_PERMISSIONS), snapshot.ROLE_PERMISSIONS_KEY_ORDER);
  assert.deepEqual(JSON.parse(JSON.stringify(ROLE_PERMISSIONS)), snapshot.ROLE_PERMISSIONS);
});

test("concordância middleware × catálogo: a decisão de plataforma é a MESMA para os 13 papéis", () => {
  // A superfície REAL do middleware (requirePlatformPermission), papel a papel, contra o
  // catálogo. Se alguém reintroduzir um literal independente em platform-permissions.ts que
  // DIVIRJA do ROLE_AUTHORITY, é aqui que fica vermelho (drill 3 do ciclo 2 prova por mutação).
  for (const role of DEFAULT_ROLES) {
    const middlewareConcede = middlewareGrantsPlatformAccess(role);
    const catalogoDiz = isPlatformRole(role);

    assert.equal(
      middlewareConcede,
      catalogoDiz,
      `divergência para ${role}: middleware=${middlewareConcede}, catálogo=${catalogoDiz}`,
    );
    assert.equal(catalogoDiz, ROLE_AUTHORITY[role] === "platform");
    assert.equal(middlewareConcede, PAPEIS_DE_PLATAFORMA_ESPERADOS.includes(role));
  }
});

test("guard 10a — zero literais de papel de plataforma em src/modules/platform/**", () => {
  // Tripwire TEXTUAL contra a volta da autoridade duplicada (B-3): nenhum arquivo do módulo de
  // plataforma pode conter papel de plataforma entre aspas (simples ou duplas). A lista de
  // literais proibidos deriva de PLATFORM_ROLES — papel de plataforma novo entra sozinho no
  // guard. A prova COMPORTAMENTAL é a concordância acima; este guard pega inclusive a duplicata
  // byte-idêntica, que a concordância (por ser idêntica) nunca veria.
  const platformDir = fileURLToPath(new URL("../src/modules/platform/", import.meta.url));
  const offenders: string[] = [];

  for (const entry of readdirSync(platformDir, { recursive: true, encoding: "utf8" })) {
    if (!entry.endsWith(".ts")) {
      continue;
    }

    const source = readFileSync(join(platformDir, entry), "utf8");

    for (const role of PLATFORM_ROLES) {
      for (const literal of [`"${role}"`, `'${role}'`]) {
        if (source.includes(literal)) {
          offenders.push(`${entry}: ${literal}`);
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "decisão de plataforma por literal fora do catálogo — a fonte única é ROLE_AUTHORITY (importar PLATFORM_ROLES)",
  );
});

test("guard 10b — o `as const satisfies Record<Role, …>` do ROLE_AUTHORITY não pode sumir", () => {
  // É o `satisfies` que transforma "papel novo sem classificação" em erro de COMPILAÇÃO. Sem
  // ele, o mapa continua compilando e o fail-closed degrada para as camadas de runtime. Este
  // guard reprova a remoção silenciosa.
  const source = readFileSync(
    new URL("../src/modules/core-saas/permissions/catalog.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /export const ROLE_AUTHORITY = \{[\s\S]+?\} as const satisfies Record<Role, "platform" \| "tenant">;/,
    "ROLE_AUTHORITY perdeu o `as const satisfies Record<Role, \"platform\" | \"tenant\">`",
  );
});

function middlewareGrantsPlatformAccess(role: string): boolean {
  const handler = requirePlatformPermission("platform:tenants:read");
  let granted = false;
  let statusCode = 0;

  const request = {
    actor: {
      userId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      email: "concordancia@example.com",
      roles: [role],
      authType: "jwt",
    },
  } as unknown as Parameters<typeof handler>[0];

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Parameters<typeof handler>[1];

  handler(request, response, () => {
    granted = true;
  });

  assert.ok(
    granted || statusCode === 403,
    `o middleware nem concedeu nem negou para ${role} — o harness não exerceu a decisão`,
  );

  return granted;
}

test("allowlist não gananciosa: todo papel NÃO-plataforma segue atribuível", () => {
  for (const role of TENANT_ASSIGNABLE_ROLES) {
    assert.equal(assertAssignableRole(role), role);
  }

  for (const role of PLATFORM_ROLES) {
    assert.throws(() => assertAssignableRole(role), RoleNotAssignableError);
  }
});

test("escalada no CREATE (memória): roles [platform] → 403 role_not_assignable; nada é criado", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org SEC-001" });

  for (const role of PLATFORM_ROLES) {
    assert.throws(
      () => {
        service.createUser({
          tenantId: tenant.id,
          name: "Escalador",
          email: `escalador-${role}@example.com`,
          roles: [role],
        });
      },
      (error: unknown) => {
        assert.ok(error instanceof RoleNotAssignableError);
        assert.equal(error.statusCode, 403);
        assert.equal(error.reason, "role_not_assignable");

        return true;
      },
    );
  }

  assert.deepEqual(
    service.listUsersForTenant(tenant.id).map((user) => user.email),
    [],
    "a tentativa de escalada não pode deixar usuário parcial para trás",
  );
});

test("escalada no UPDATE/self (memória): PATCH dos próprios papéis para plataforma → 403; papéis intactos", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org SEC-001 self" });
  const admin = service.createUser({
    tenantId: tenant.id,
    name: "Admin",
    email: "admin-sec001@example.com",
    roles: ["tenant_admin"],
  });

  assert.throws(
    () => {
      service.updateUser(
        { userId: admin.id, tenantId: tenant.id, roles: ["super_admin"] },
        { tenantId: tenant.id, userId: admin.id, roles: ["tenant_admin"], permissions: [], explicitPermissions: false },
      );
    },
    (error: unknown) => error instanceof RoleNotAssignableError,
  );

  assert.deepEqual(service.getUserForTenant(admin.id, tenant.id).roles, ["tenant_admin"]);
});

test("papel INVÁLIDO segue 400 invalid_role (500→400 de carona), nunca 403", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org papel inválido" });

  assert.throws(
    () => {
      service.createUser({
        tenantId: tenant.id,
        name: "Bogus",
        email: "bogus@example.com",
        roles: ["nao_existe"],
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof CoreSaasError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.reason, "invalid_role");

      return true;
    },
  );
});

test("o escritor SEM ROTA (store.assignRoleToUser, caminho prisma) recusa papel de plataforma antes de tocar o banco", async () => {
  // O assert roda ANTES de qualquer conexão: a recusa é provável sem DATABASE_URL — exatamente
  // o ponto (nenhum caminho de código atribui plataforma por fluxo de tenant, com ou sem rota).
  const store = new PrismaCoreSaasStore();

  await assert.rejects(
    store.assignRoleToUser({
      tenantId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      role: "platform_admin",
    }),
    RoleNotAssignableError,
  );
});

test("ponta a ponta HTTP: tenant_admin tenta criar/promover platform_admin → 403; a rota de plataforma segue 403 para ele", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = registry.createTenant({ name: "Org ponta-a-ponta" });
  const admin = registry.createUser({
    tenantId: tenant.id,
    name: "Admin E2E",
    email: "admin-e2e-sec001@example.com",
    roles: ["tenant_admin"],
  });
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await signAccessToken({
      user_id: admin.id,
      tenant_id: tenant.id,
      email: admin.email,
      roles: ["tenant_admin"],
    });

    // CREATE com papel de plataforma → 403 role_not_assignable.
    const createResponse = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {
        name: "Escalador HTTP",
        email: "escalador-http@example.com",
        roles: ["platform_admin"],
      },
    });

    assert.equal(createResponse.status, 403);
    assert.equal(createResponse.body.error.reason, "role_not_assignable");

    // PATCH self com papel de plataforma → 403; papéis intactos.
    const patchResponse = await requestJson(baseUrl, `/api/v1/users/${admin.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: { roles: ["super_admin"] },
    });

    assert.equal(patchResponse.status, 403);
    assert.equal(patchResponse.body.error.reason, "role_not_assignable");
    assert.deepEqual(registry.getUserForTenant(admin.id, tenant.id).roles, ["tenant_admin"]);

    // Pós-403: o MESMO token não alcança a rota de plataforma (o papel nunca chegou ao ator).
    const platformResponse = await requestJson(baseUrl, "/api/v1/platform/tenants", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(platformResponse.status, 403);
    assert.equal(platformResponse.body.error.reason, "platform_permission_required");
  } finally {
    await closeServer(server);
  }
});

async function requestJson(
  baseUrl: string,
  pathName: string,
  init: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
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
