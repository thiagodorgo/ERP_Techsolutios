import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const VIGENCIA_INICIO = "2026-01-01T00:00:00.000Z";
const VIGENCIA_FIM = "2027-01-01T00:00:00.000Z"; // future => derived "vigente"

test("POST /insurance-policies cria apolice e retorna 201 com status derivado vigente", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ABC1D23");

    const created = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        seguradora: "Porto Seguro",
        numero_apolice: "AP-0001",
        vigencia_inicio: VIGENCIA_INICIO,
        vigencia_fim: VIGENCIA_FIM,
        valor: 1234.56,
        cobertura: "Compreensiva",
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.vehicleId, vehicleId);
    assert.equal(created.body.data.seguradora, "Porto Seguro");
    assert.equal(created.body.data.numeroApolice, "AP-0001");
    assert.equal(created.body.data.valor, 1234.56);
    assert.equal(created.body.data.cobertura, "Compreensiva");
    assert.equal(created.body.data.status, "vigente");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /insurance-policies filtra por viatura e status derivado", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleV = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleW = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "BBB2B22");

    await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, numero_apolice: "P-V1" });
    await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, numero_apolice: "P-V2" });
    await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleW, numero_apolice: "P-W1" });

    const byVehicle = await requestJson(baseUrl, `/api/v1/insurance-policies?vehicle_id=${vehicleV}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byStatus = await requestJson(baseUrl, "/api/v1/insurance-policies?status=vigente", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(byVehicle.body.pagination.total, 2);
    assert.ok(byVehicle.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleV));
    assert.equal(byStatus.body.pagination.total, 3);
    assert.ok(byStatus.body.items.every((item: { status: string }) => item.status === "vigente"));
  });
});

test("GET /insurance-policies/:id retorna a apolice; busca cross-tenant retorna 404", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "CCC3C33");
    const created = await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_apolice: "P-DET", seguradora: "Allianz" });

    const detailed = await requestJson(baseUrl, `/api/v1/insurance-policies/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/insurance-policies/${created.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.id);
    assert.equal(detailed.body.data.seguradora, "Allianz");
    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("PATCH /insurance-policies/:id atualiza campos e desativa logicamente", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "DDD4D44");
    const created = await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_apolice: "P-UP" });

    const updated = await requestJson(baseUrl, `/api/v1/insurance-policies/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { seguradora: "HDI", cobertura: "Total", valor: 999 },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/insurance-policies/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/insurance-policies?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/insurance-policies?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.seguradora, "HDI");
    assert.equal(updated.body.data.valor, 999);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[R4.1] PATCH status=vencida retorna 422 cannot_set_derived_status", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "EEE5E55");
    const created = await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_apolice: "P-DERIV" });

    const attempt = await requestJson(baseUrl, `/api/v1/insurance-policies/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "vencida" },
    });

    assert.equal(attempt.status, 422, JSON.stringify(attempt.body));
    assert.equal(attempt.body.error.code, "INSURANCE_INVALID");
    assert.equal(attempt.body.error.reason, "cannot_set_derived_status");
  });
});

test("[R4.1] cancelar e reativar: vigente -> cancelada -> vigente", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "FFF6F66");
    const created = await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_apolice: "P-CANCEL" });

    const cancelled = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "cancelada" });
    const reactivated = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "vigente" });

    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.data.status, "cancelada");
    assert.equal(reactivated.status, 200, JSON.stringify(reactivated.body));
    assert.equal(reactivated.body.data.status, "vigente");
  });
});

test("[P6] numero_apolice duplicado no mesmo tenant retorna 409; mesmo numero em outro tenant retorna 201", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA9A99");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB9B99");

    const first = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({ vehicle_id: vehicleA, numero_apolice: "DUP-001" }),
    });
    const duplicate = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({ vehicle_id: vehicleA, numero_apolice: "DUP-001" }),
    });
    const otherTenant = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: policyBody({ vehicle_id: vehicleB, numero_apolice: "DUP-001" }),
    });

    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.error.reason, "duplicate_numero_apolice");
    assert.equal(otherTenant.status, 201, JSON.stringify(otherTenant.body));
  });
});

test("[validacao] vigencia_fim <= vigencia_inicio retorna 400 invalid_vigencia", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "GGG7G77");

    const invalid = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({
        vehicle_id: vehicleId,
        numero_apolice: "P-BADRANGE",
        vigencia_inicio: "2027-01-01T00:00:00.000Z",
        vigencia_fim: "2026-01-01T00:00:00.000Z",
      }),
    });

    assert.equal(invalid.status, 400, JSON.stringify(invalid.body));
    assert.equal(invalid.body.error.reason, "invalid_vigencia");
  });
});

test("[isolamento] lista de B nunca contem itens de A; tenant_id forjado ignorado; vehicle cross-tenant 400", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1B11");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB1C22");
    await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, numero_apolice: "ISO-A1" });
    await createPolicy(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, numero_apolice: "ISO-A2" });
    await createPolicy(baseUrl, seed.tenantB, seed.managerB, { vehicle_id: vehicleB, numero_apolice: "ISO-B1" });

    // POST forjando tenant_id no corpo -> pertence ao claim, some da org B.
    const forged = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({ vehicle_id: vehicleA, numero_apolice: "FORGE-1", tenant_id: seed.tenantB.id, tenantId: seed.tenantB.id }),
    });
    const fromForged = await requestJson(baseUrl, `/api/v1/insurance-policies/${forged.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    // Viatura de outra organizacao -> 400 invalid_vehicle_reference.
    const crossVehicle = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({ vehicle_id: vehicleB, numero_apolice: "XV-1" }),
    });

    const listA = await requestJson(baseUrl, "/api/v1/insurance-policies", { headers: authHeaders(seed.tenantA, seed.managerA, "manager") });
    const listB = await requestJson(baseUrl, "/api/v1/insurance-policies", { headers: authHeaders(seed.tenantB, seed.managerB, "manager") });

    assert.equal(listA.body.pagination.total, 3, JSON.stringify(listA.body)); // ISO-A1 + ISO-A2 + FORGE-1
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleB));
    assert.equal(forged.status, 201);
    assert.equal(fromForged.status, 404);
    assert.equal(crossVehicle.status, 400);
    assert.equal(crossVehicle.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[rbac] manager e finance criam (201); operator e auditor 403 mas leem 200; viewer/anonimo 403", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "OOO1O11");

    const asManager = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-M" }),
    });
    const asFinance = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-F" }),
    });
    const asOperator = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-O" }),
    });
    const asAuditor = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-AUD" }),
    });
    const asViewer = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-V" }),
    });
    const anonymous = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      body: policyBody({ vehicle_id: vehicleId, numero_apolice: "RBAC-AN" }),
    });

    const operatorRead = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const auditorRead = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
    });

    assert.equal(asManager.status, 201, JSON.stringify(asManager.body));
    assert.equal(asFinance.status, 201, JSON.stringify(asFinance.body));
    assert.equal(asOperator.status, 403);
    assert.equal(asAuditor.status, 403);
    assert.equal(asViewer.status, 403);
    assert.equal(anonymous.status, 403);
    assert.equal(operatorRead.status, 200);
    assert.equal(auditorRead.status, 200);
  });
});

test("[R4.1] filtro status=vencida retorna apolices vencidas (derivado); status=vigente exclui", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "PPP1P11");

    // Stored vigente, vigencia no passado => derivado "vencida".
    const expired = await createPolicy(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_apolice: "P-EXPIRED",
      vigencia_inicio: "2020-01-01T00:00:00.000Z",
      vigencia_fim: "2020-12-31T00:00:00.000Z",
    });
    // Stored vigente, vigencia no futuro => derivado "vigente".
    const active = await createPolicy(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_apolice: "P-ACTIVE",
      vigencia_inicio: VIGENCIA_INICIO,
      vigencia_fim: VIGENCIA_FIM,
    });

    const vencidas = await requestJson(baseUrl, "/api/v1/insurance-policies?status=vencida", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const vigentes = await requestJson(baseUrl, "/api/v1/insurance-policies?status=vigente", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(vencidas.body.pagination.total, 1, JSON.stringify(vencidas.body));
    assert.equal(vencidas.body.items[0].id, expired.id);
    assert.equal(vencidas.body.items[0].status, "vencida");
    assert.equal(vigentes.body.pagination.total, 1, JSON.stringify(vigentes.body));
    assert.equal(vigentes.body.items[0].id, active.id);
    assert.equal(vigentes.body.items[0].status, "vigente");
  });
});

test("[filtro] expiring_within_days retorna apenas apolices a vencer na janela", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "QQQ1Q11");
    const soon = new Date(Date.now() + 20 * MILLIS_PER_DAY).toISOString();
    const far = new Date(Date.now() + 200 * MILLIS_PER_DAY).toISOString();

    const dueSoon = await createPolicy(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_apolice: "P-SOON",
      vigencia_fim: soon,
    });
    await createPolicy(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_apolice: "P-FAR",
      vigencia_fim: far,
    });

    const within30 = await requestJson(baseUrl, "/api/v1/insurance-policies?expiring_within_days=30", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(within30.body.pagination.total, 1, JSON.stringify(within30.body));
    assert.equal(within30.body.items[0].id, dueSoon.id);
  });
});

test("[validacao] seguradora/numero_apolice/valor ausentes retornam 400 required_field", async () => {
  await withInsuranceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "RRR1R11");
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");

    const missingSeguradora = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, numero_apolice: "V1", vigencia_inicio: VIGENCIA_INICIO, vigencia_fim: VIGENCIA_FIM, valor: 10 },
    });
    const missingNumero = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, seguradora: "Porto", vigencia_inicio: VIGENCIA_INICIO, vigencia_fim: VIGENCIA_FIM, valor: 10 },
    });
    const missingValor = await requestJson(baseUrl, "/api/v1/insurance-policies", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, seguradora: "Porto", numero_apolice: "V3", vigencia_inicio: VIGENCIA_INICIO, vigencia_fim: VIGENCIA_FIM },
    });

    assert.equal(missingSeguradora.status, 400);
    assert.equal(missingSeguradora.body.error.reason, "required_field");
    assert.equal(missingNumero.status, 400);
    assert.equal(missingNumero.body.error.reason, "required_field");
    assert.equal(missingValor.status, 400);
    assert.equal(missingValor.body.error.reason, "required_field");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly financeA: User;
  readonly auditorA: User;
  readonly viewerA: User;
};

type InsuranceApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withInsuranceApi(callback: (context: InsuranceApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetInsurancePolicyRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetScheduledNotificationRuntimeForTests },
    { resetNotificationRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/insurance-policies/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/notifications/scheduled-notification.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  // Ω4C PR-07 — criar/editar apólice agora emite um efeito de domínio (ScheduledNotification de vencimento). Resetar
  // os runtimes de notificação entre casos evita vazamento nos singletons de memória compartilhados.
  resetInsurancePolicyRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetScheduledNotificationRuntimeForTests();
  resetNotificationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetInsurancePolicyRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetScheduledNotificationRuntimeForTests();
    resetNotificationRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Seguros A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Seguros B", modules: ["dashboard", "work_orders"] });
  const adminA = service.createUser({ tenantId: tenantA.id, name: "Admin A", email: "ins-admin-a@example.com", roles: ["tenant_admin"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "ins-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "ins-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "ins-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "ins-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "ins-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "ins-viewer-a@example.com", roles: ["viewer"] });

  return { tenantA, tenantB, adminA, managerA, managerB, operatorA, financeA, auditorA, viewerA };
}

function policyBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    seguradora: "Porto Seguro",
    numero_apolice: "AP-DEFAULT",
    vigencia_inicio: VIGENCIA_INICIO,
    vigencia_fim: VIGENCIA_FIM,
    valor: 1200,
    ...overrides,
  };
}

async function createVehicle(baseUrl: string, tenant: Tenant, user: User, plate: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { plate, model: "Caminhao Guincho" },
  });

  assert.equal(created.status, 201, `vehicle creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

async function createPolicy(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/insurance-policies", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: policyBody(body),
  });

  assert.equal(created.status, 201, `policy creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function patch(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/insurance-policies/${id}`, {
    method: "PATCH",
    headers: authHeaders(tenant, user, role),
    body,
  });
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
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
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
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
