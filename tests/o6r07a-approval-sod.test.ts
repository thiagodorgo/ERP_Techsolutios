import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-07a · D2 (§3.2 do plano) — SEGREGAÇÃO DE FUNÇÃO (SoD) NO `decide`.
//
// O achado Ω6R-SEC-002: `approval.service.ts` validava só tenant e estado. `requestedByUserId` já
// vivia no agregado e NUNCA era comparado ao ator — o mesmo gestor pedia e concedia a própria
// aprovação. Não é caso de borda: manager é o aprovador default (APPROVAL_LIMITS.md l.38-42) e é
// também quem conclui OS, então pedir-e-decidir é o caminho NORMAL, não o excepcional.
//
// VERMELHO-CONTROLE (§4, linha 2): no head-base a autoaprovação retorna 200. Registro em
// agent-orchestration/omega/juntas/votos/O6R-07a/dev-d1-d3-autorizacao.md.

test("D2 — quem pediu não decide: autoaprovação e autorrecusa são 403 APPROVAL_SELF_DECISION", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService }) => {
    const pendencia = async (requestedByUserId: string) => {
      const workOrderId = randomUUID();
      return approvalService.request({
        tenantId: seed.tenantA.id,
        entityType: "work_order",
        entityId: workOrderId,
        workOrderId,
        requestedByUserId,
        pendingReason: "OS concluida.",
      });
    };

    // Os dois atores têm o MESMO papel (manager) e a MESMA permissão. A única diferença é quem
    // pediu — que é exatamente a variável que o controle isola.
    const doSolicitante = await pendencia(seed.managerA.id);
    const autoAprova = await requestJson(baseUrl, `/api/v1/approvals/${doSolicitante.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { note: "Eu mesmo confiro." },
    });
    const autoRejeita = await requestJson(baseUrl, `/api/v1/approvals/${doSolicitante.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Eu mesmo recuso." },
    });

    assert.equal(autoAprova.status, 403);
    assert.equal(autoAprova.body.error.code, "APPROVAL_SELF_DECISION");
    assert.equal(autoAprova.body.error.reason, "self_decision");
    // REJECT também: recusar a própria pendência encerra o controle sem segundo par de olhos tanto
    // quanto aprová-la. Um SoD que só cobre o approve deixa metade da porta aberta.
    assert.equal(autoRejeita.status, 403);
    assert.equal(autoRejeita.body.error.code, "APPROVAL_SELF_DECISION");

    // A recusa não pode ter deixado efeito: a pendência segue viva e decidível por outro.
    const aposRecusa = await requestJson(baseUrl, `/api/v1/approvals/${doSolicitante.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerB, "manager"),
    });
    assert.equal(aposRecusa.body.data.status, "pending_approval");

    // ── O positivo: OUTRO decisor, mesmo papel, passa. Sem ele o teste acima seria satisfeito por
    // um serviço que recusa todo mundo.
    const aprovadoPorOutro = await requestJson(baseUrl, `/api/v1/approvals/${doSolicitante.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerB, "manager"),
      body: { note: "Conferido por segundo par de olhos." },
    });
    assert.equal(aprovadoPorOutro.status, 200);
    assert.equal(aprovadoPorOutro.body.data.status, "approved");

    const outraPendencia = await pendencia(seed.managerA.id);
    const rejeitadoPorOutro = await requestJson(baseUrl, `/api/v1/approvals/${outraPendencia.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerB, "manager"),
      body: { reason: "Foto obrigatoria ausente." },
    });
    assert.equal(rejeitadoPorOutro.status, 200);
    assert.equal(rejeitadoPorOutro.body.data.status, "rejected");
  });
});

test("D2 — o SoD vem ANTES do 409: o solicitante não descobre o estado pelo código de erro", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService }) => {
    const workOrderId = randomUUID();
    const pendencia = await approvalService.request({
      tenantId: seed.tenantA.id,
      entityType: "work_order",
      entityId: workOrderId,
      workOrderId,
      requestedByUserId: seed.managerA.id,
      pendingReason: "OS concluida.",
    });

    // Outro gestor decide de verdade — a pendência passa a `approved`.
    const decidida = await requestJson(baseUrl, `/api/v1/approvals/${pendencia.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerB, "manager"),
      body: { note: "Conferido." },
    });
    assert.equal(decidida.status, 200);

    // O solicitante volta. Se o 409 viesse antes do SoD, ele receberia 403 na pendência ABERTA e
    // 409 na já DECIDIDA — e a diferença dos códigos entregaria o estado a quem não pode decidir.
    // Com a ordem correta a resposta é a MESMA nos dois casos.
    const tentativa = await requestJson(baseUrl, `/api/v1/approvals/${pendencia.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { note: "E agora?" },
    });

    assert.equal(tentativa.status, 403);
    assert.equal(tentativa.body.error.code, "APPROVAL_SELF_DECISION");
    assert.notEqual(tentativa.body.error.code, "APPROVAL_ALREADY_DECIDED");
  });
});

test("D2 — a recusa deixa rastro auditável, e sem PII nova", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService, approvalModule }) => {
    const workOrderId = randomUUID();
    const pendencia = await approvalService.request({
      tenantId: seed.tenantA.id,
      entityType: "work_order",
      entityId: workOrderId,
      workOrderId,
      requestedByUserId: seed.managerA.id,
      pendingReason: "OS concluida.",
    });

    await requestJson(baseUrl, `/api/v1/approvals/${pendencia.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { note: "Tentativa." },
    });

    const eventos = approvalModule.getApprovalAuditEventsForTests();
    const recusas = eventos.filter((evento) => evento.action === "approval.self_decision_denied");

    // Recusa silenciosa é indistinguível de "ninguém tentou" — e o padrão que se quer detectar é a
    // REPETIÇÃO da tentativa.
    assert.equal(recusas.length, 1);
    assert.equal(recusas[0].outcome, "denied");
    assert.equal(recusas[0].actorId, seed.managerA.id);
    assert.equal(recusas[0].approvalId, pendencia.id);
    assert.equal(recusas[0].metadata.reason, "self_decision");
    assert.equal(recusas[0].metadata.decision, "approved");

    // §2.8 (allowlist) — o evento não pode ganhar campo sensível novo. A varredura é sobre o
    // SERIALIZADO, para pegar também o que estivesse aninhado.
    const serializado = JSON.stringify(recusas[0]);
    for (const proibido of ["token", "bearer", "authorization", "base64", "storage_key", "bucket", "local_path", "password", "email", "@example.com"]) {
      assert.equal(
        serializado.toLowerCase().includes(proibido.toLowerCase()),
        false,
        `auditoria da recusa vazou "${proibido}"`,
      );
    }
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
  readonly managerB: User;
};

type ApprovalModule = typeof import("../src/modules/work-orders/approval.service.js");

async function withApprovalApi(
  callback: (context: {
    readonly baseUrl: string;
    readonly seed: SeedData;
    readonly approvalService: Awaited<ReturnType<ApprovalModule["createDefaultApprovalService"]>>;
    readonly approvalModule: ApprovalModule;
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
  const tenantA = core.createTenant({ name: "O6R07a SoD", modules: ["work_orders"] });
  const seed: SeedData = {
    tenantA,
    managerA: core.createUser({ tenantId: tenantA.id, name: "Manager A", email: `o6r07a-sod-a-${randomUUID()}@example.com`, roles: ["manager"] }),
    managerB: core.createUser({ tenantId: tenantA.id, name: "Manager B", email: `o6r07a-sod-b-${randomUUID()}@example.com`, roles: ["manager"] }),
  };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
      approvalService: await approvalModule.createDefaultApprovalService(),
      approvalModule,
    });
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
