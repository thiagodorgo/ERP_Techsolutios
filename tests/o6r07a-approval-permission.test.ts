import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-07a · D1 (§3.1 do plano) — PERMISSÃO DEDICADA DE DECISÃO DE APROVAÇÃO.
//
// O achado Ω6R-SEC-002 (P0, votado 5×0 na J-6R): `POST /approvals/:id/approve|reject` exigia
// `work_orders:update` — a MESMA guarda do `PATCH /work-orders/:id` — e technician/field_technician
// têm `work_orders:update` no catálogo. O técnico de campo decidia aprovação tenant-wide.
//
// VERMELHO-CONTROLE (§4, linha 1): no head-base, `technician` recebe 200 neste approve. O registro
// da execução vermelha está em
// agent-orchestration/omega/juntas/votos/O6R-07a/dev-d1-d3-autorizacao.md.
//
// Obrigação de aceite da emenda J-CHK-04C, item (iii): teste NEGATIVO de papel em approve E reject.

test("D1 — decidir aprovação exige work_orders:approve: gestão passa, campo e leitura não", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService }) => {
    // Um solicitante DEDICADO, distinto de todos os decisores: sem isso a recusa de D1 (403 por
    // permissão) se confundiria com a recusa de D2 (403 por autodecisão) e o teste provaria a coisa
    // errada. Os dois controles são independentes e cada um tem o seu arquivo.
    const requesterId = seed.requesterA.id;

    const novaPendencia = async () => {
      const workOrderId = randomUUID();
      return approvalService.request({
        tenantId: seed.tenantA.id,
        entityType: "work_order",
        entityId: workOrderId,
        workOrderId,
        requestedByUserId: requesterId,
        pendingReason: "OS concluida.",
      });
    };

    // ── NEGATIVOS ─────────────────────────────────────────────────────────────────────────────
    // Uma recusa não consome a pendência, então os quatro papéis recusados atacam a MESMA — e o
    // fato de ela seguir `pending_approval` ao final é a prova de que nenhum deles a decidiu.
    const alvoRecusado = await novaPendencia();

    const negados: Record<string, { status: number; body: { error?: { reason?: string } } }> = {};
    for (const role of ["technician", "field_technician", "operator", "auditor"]) {
      negados[`${role}:approve`] = await requestJson(baseUrl, `/api/v1/approvals/${alvoRecusado.id}/approve`, {
        method: "POST",
        headers: authHeaders(seed.tenantA, seed.decisorA, role),
        body: { note: "Tentativa." },
      });
      negados[`${role}:reject`] = await requestJson(baseUrl, `/api/v1/approvals/${alvoRecusado.id}/reject`, {
        method: "POST",
        headers: authHeaders(seed.tenantA, seed.decisorA, role),
        body: { reason: "Tentativa." },
      });
    }

    for (const [caso, resposta] of Object.entries(negados)) {
      assert.equal(resposta.status, 403, `${caso} deveria ser 403 e veio ${resposta.status}`);
      assert.equal(resposta.body.error?.reason, "permission_required", `${caso}: reason inesperado`);
    }

    const aindaPendente = await requestJson(baseUrl, `/api/v1/approvals/${alvoRecusado.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(aindaPendente.body.data.status, "pending_approval");

    // ── POSITIVOS ─────────────────────────────────────────────────────────────────────────────
    // manager: concessão EXPLÍCITA no catálogo. tenant_admin: por HERANÇA
    // (TENANT_ADMIN_PERMISSIONS = catálogo sem `platform:`) — é assim que ele recebe todos os
    // demais `work_orders:*`, e o positivo aqui prova que a herança de fato alcança a chave nova.
    const alvoManager = await novaPendencia();
    const aprovadoPorManager = await requestJson(baseUrl, `/api/v1/approvals/${alvoManager.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { note: "Conferido." },
    });

    const alvoAdmin = await novaPendencia();
    const rejeitadoPorAdmin = await requestJson(baseUrl, `/api/v1/approvals/${alvoAdmin.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: { reason: "Evidencia ausente." },
    });

    assert.equal(aprovadoPorManager.status, 200);
    assert.equal(aprovadoPorManager.body.data.status, "approved");
    assert.equal(rejeitadoPorAdmin.status, 200);
    assert.equal(rejeitadoPorAdmin.body.data.status, "rejected");
  });
});

test("D1 — LER a fila não decide: pending/detail seguem em work_orders:read para o campo", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService }) => {
    const workOrderId = randomUUID();
    const pendencia = await approvalService.request({
      tenantId: seed.tenantA.id,
      entityType: "work_order",
      entityId: workOrderId,
      workOrderId,
      requestedByUserId: seed.requesterA.id,
      pendingReason: "OS concluida.",
    });

    // O contraste é o ponto: o MESMO ator que recebe 403 para decidir continua vendo a fila. Se o
    // bloco tivesse fechado a leitura junto, o app de campo perderia a lista de pendências — e o
    // teste acima ficaria verde sem ninguém perceber a regressão.
    const headers = authHeaders(seed.tenantA, seed.decisorA, "field_technician");
    const lista = await requestJson(baseUrl, `/api/v1/approvals/pending?work_order_id=${workOrderId}`, { headers });
    const detalhe = await requestJson(baseUrl, `/api/v1/approvals/${pendencia.id}`, { headers });

    assert.equal(lista.status, 200);
    assert.equal(lista.body.data.length, 1);
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.body.data.status, "pending_approval");
  });
});

test("D1 — a chave nova está no catálogo e a distribuição é a mínima do plano", async () => {
  const { PERMISSION_CATALOG, ROLE_PERMISSIONS } = await import(
    "../src/modules/core-saas/permissions/catalog.js"
  );
  const { WORK_ORDER_PERMISSIONS } = await import("../src/modules/work-orders/work-order.routes.js");

  assert.equal(WORK_ORDER_PERMISSIONS.approve, "work_orders:approve");
  assert.ok(PERMISSION_CATALOG.includes("work_orders:approve"));

  // Guard de DISTRIBUIÇÃO, não de rota: a rota pode continuar certa enquanto uma concessão futura
  // devolve a chave ao campo por descuido. Aqui a lista é fechada e nomeada.
  const comAprovacao = (Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]).filter(
    (role) => (ROLE_PERMISSIONS[role] as readonly string[]).includes("work_orders:approve"),
  );

  assert.deepEqual(
    [...comAprovacao].sort(),
    ["manager", "platform_admin", "super_admin", "tenant_admin"],
    "distribuição de work_orders:approve fora do plano §3.1 (concessão mínima: manager + herança dos admins)",
  );

  // finance/inventory ficam de fora ENQUANTO não houver política de valor ancorada — o agregado de
  // aprovação não tem campo monetário (approval.types.ts). Pendência P-O6R-B07-APPROVAL-BY-POLICY.
  for (const role of ["finance", "inventory", "technician", "field_technician", "operator", "field_dispatcher", "auditor", "support", "viewer"] as const) {
    assert.equal(
      (ROLE_PERMISSIONS[role] as readonly string[]).includes("work_orders:approve"),
      false,
      `${role} não pode ter work_orders:approve neste bloco`,
    );
  }
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
  readonly adminA: User;
  readonly decisorA: User;
  readonly requesterA: User;
};

async function withApprovalApi(
  callback: (context: {
    readonly baseUrl: string;
    readonly seed: SeedData;
    readonly approvalService: Awaited<
      ReturnType<typeof import("../src/modules/work-orders/approval.service.js")["createDefaultApprovalService"]>
    >;
  }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    approvalModule,
    notificationModule,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  approvalModule.resetApprovalRuntimeForTests();
  notificationModule.resetNotificationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "O6R07a Perm", modules: ["work_orders"] });
  const seed: SeedData = {
    tenantA,
    managerA: core.createUser({ tenantId: tenantA.id, name: "Manager", email: `o6r07a-perm-mgr-${randomUUID()}@example.com`, roles: ["manager"] }),
    adminA: core.createUser({ tenantId: tenantA.id, name: "Admin", email: `o6r07a-perm-adm-${randomUUID()}@example.com`, roles: ["tenant_admin"] }),
    decisorA: core.createUser({ tenantId: tenantA.id, name: "Campo", email: `o6r07a-perm-fld-${randomUUID()}@example.com`, roles: ["field_technician"] }),
    requesterA: core.createUser({ tenantId: tenantA.id, name: "Solicitante", email: `o6r07a-perm-req-${randomUUID()}@example.com`, roles: ["operator"] }),
  };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed, approvalService: await approvalModule.createDefaultApprovalService() });
  } finally {
    await closeServer(server);
    approvalModule.resetApprovalRuntimeForTests();
    notificationModule.resetNotificationRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

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
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
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
