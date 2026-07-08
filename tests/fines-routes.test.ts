import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const DATA_INFRACAO = "2026-06-01T10:00:00.000Z";
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

test("POST /fines cria multa e retorna 201 com objeto completo", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ABC1D23");

    const created = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        driver_id: seed.driverA.id,
        numero_auto: "AI-0001",
        data_infracao: DATA_INFRACAO,
        orgao: "DETRAN-SP",
        descricao: "Excesso de velocidade.",
        valor: 195.23,
        pontos: 5,
        prazo_pagamento: "2026-07-20T00:00:00.000Z",
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.vehicleId, vehicleId);
    assert.equal(created.body.data.driverId, seed.driverA.id);
    assert.equal(created.body.data.numeroAuto, "AI-0001");
    assert.equal(created.body.data.orgao, "DETRAN-SP");
    assert.equal(created.body.data.valor, 195.23);
    assert.equal(created.body.data.pontos, 5);
    assert.equal(created.body.data.status, "recebida");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /fines filtra por viatura, condutor e status", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleV = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleW = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "BBB2B22");

    await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, numero_auto: "F-V1", driver_id: seed.driverA.id });
    await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, numero_auto: "F-V2" });
    await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleW, numero_auto: "F-W1" });

    const byVehicle = await requestJson(baseUrl, `/api/v1/fines?vehicle_id=${vehicleV}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byDriver = await requestJson(baseUrl, `/api/v1/fines?driver_id=${seed.driverA.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byStatus = await requestJson(baseUrl, "/api/v1/fines?status=recebida", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(byVehicle.body.pagination.total, 2);
    assert.ok(byVehicle.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleV));
    assert.equal(byDriver.body.pagination.total, 1);
    assert.equal(byDriver.body.items[0].numeroAuto, "F-V1");
    assert.equal(byStatus.body.pagination.total, 3);
  });
});

test("GET /fines/:id retorna a multa; busca cross-tenant retorna 404", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "CCC3C33");
    const created = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "F-DET", orgao: "PRF" });

    const detailed = await requestJson(baseUrl, `/api/v1/fines/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/fines/${created.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.id);
    assert.equal(detailed.body.data.orgao, "PRF");
    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("PATCH /fines/:id atualiza campos e desativa logicamente", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "DDD4D44");
    const created = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "F-UP", orgao: "DETRAN" });

    const updated = await requestJson(baseUrl, `/api/v1/fines/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { orgao: "DER", descricao: "Revisada.", valor: 500 },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/fines/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/fines?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/fines?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.orgao, "DER");
    assert.equal(updated.body.data.valor, 500);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[R3.1] fluxo valido recebida -> em_recurso -> indeferida -> paga", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "FFF6F66");
    const created = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "F-FSM" });

    const recurso = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "em_recurso" });
    const indeferida = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "indeferida" });
    const paga = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "paga" });

    assert.equal(recurso.body.data.status, "em_recurso");
    assert.equal(indeferida.body.data.status, "indeferida");
    assert.equal(paga.body.data.status, "paga");
  });
});

test("[R3.1] cada transicao invalida retorna 422 invalid_status_transition", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "GGG7G77");

    // recebida -> deferida (pula em_recurso) inválido.
    const o1 = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "I-1" });
    const skipDeferida = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o1.id, { status: "deferida" });

    // recebida -> indeferida inválido.
    const o2 = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "I-2" });
    const skipIndeferida = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o2.id, { status: "indeferida" });

    // em_recurso -> paga inválido (precisa deferir/indeferir antes).
    const o3 = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "I-3" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o3.id, { status: "em_recurso" });
    const recursoToPaga = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o3.id, { status: "paga" });

    // deferida -> paga inválido (deferida só cancela).
    const o4 = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "I-4" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o4.id, { status: "em_recurso" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o4.id, { status: "deferida" });
    const deferidaToPaga = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o4.id, { status: "paga" });

    // paga é terminal.
    const o5 = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "I-5" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o5.id, { status: "paga" });
    const fromPaga = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", o5.id, { status: "em_recurso" });

    for (const response of [skipDeferida, skipIndeferida, recursoToPaga, deferidaToPaga, fromPaga]) {
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "invalid_status_transition");
      assert.equal(response.body.error.code, "FINE_INVALID");
    }
  });
});

test("[cancelamento] cancelar exige admin: manager 403; tenant_admin ok", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "HHH8H88");

    const forManager = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "C-1" });
    const byManager = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", forManager.id, { status: "cancelada" });

    const forAdmin = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "C-2" });
    const byAdmin = await patchStatus(baseUrl, seed.tenantA, seed.adminA, "tenant_admin", forAdmin.id, { status: "cancelada" });

    assert.equal(byManager.status, 403, JSON.stringify(byManager.body));
    assert.equal(byManager.body.error.reason, "cancel_requires_admin");
    assert.equal(byAdmin.status, 200, JSON.stringify(byAdmin.body));
    assert.equal(byAdmin.body.data.status, "cancelada");
  });
});

test("[R3.3] numero_auto duplicado no mesmo tenant retorna 409; mesmo numero em outro tenant retorna 201 (P6)", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA9A99");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB9B99");

    const first = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({ vehicle_id: vehicleA, numero_auto: "DUP-001" }),
    });
    const duplicate = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({ vehicle_id: vehicleA, numero_auto: "DUP-001" }),
    });
    const otherTenant = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: fineBody({ vehicle_id: vehicleB, numero_auto: "DUP-001" }),
    });

    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.error.reason, "duplicate_numero_auto");
    assert.equal(otherTenant.status, 201, JSON.stringify(otherTenant.body));
  });
});

test("[driver] driver_id de outra organizacao retorna 400 invalid_driver_reference", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "III1I11");

    const crossDriver = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "DRV-X", driver_id: seed.driverB.id }),
    });

    assert.equal(crossDriver.status, 400, JSON.stringify(crossDriver.body));
    assert.equal(crossDriver.body.error.reason, "invalid_driver_reference");
  });
});

test("[isolamento] lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1B11");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB1C22");
    await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, numero_auto: "ISO-A1" });
    await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, numero_auto: "ISO-A2" });
    await createFine(baseUrl, seed.tenantB, seed.managerB, { vehicle_id: vehicleB, numero_auto: "ISO-B1" });

    const listA = await requestJson(baseUrl, "/api/v1/fines", { headers: authHeaders(seed.tenantA, seed.managerA, "manager") });
    const listB = await requestJson(baseUrl, "/api/v1/fines", { headers: authHeaders(seed.tenantB, seed.managerB, "manager") });

    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleB));
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; registro pertence ao claim", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "MMM1M11");
    const created = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({
        vehicle_id: vehicleId,
        numero_auto: "FORGE-1",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      }),
    });

    const fromClaim = await requestJson(baseUrl, `/api/v1/fines/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForged = await requestJson(baseUrl, `/api/v1/fines/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaim.status, 200);
    assert.equal(fromForged.status, 404);
  });
});

test("[isolamento] vehicle_id de outra organizacao retorna 400 invalid_vehicle_reference", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "NNN1N11");

    const crossVehicle = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({ vehicle_id: vehicleB, numero_auto: "XV-1" }),
    });

    assert.equal(crossVehicle.status, 400);
    assert.equal(crossVehicle.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[rbac] manager e finance criam (201); operator e auditor 403; viewer/anonimo 403", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "OOO1O11");

    const asManager = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-M" }),
    });
    const asFinance = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-F" }),
    });
    const asOperator = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-O" }),
    });
    const asAuditor = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-AUD" }),
    });
    const asViewer = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-V" }),
    });
    const anonymous = await requestJson(baseUrl, "/api/v1/fines", { method: "POST", body: fineBody({ vehicle_id: vehicleId, numero_auto: "RBAC-AN" }) });

    // operator and auditor CAN read (RBAC read set).
    const operatorRead = await requestJson(baseUrl, "/api/v1/fines", {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const auditorRead = await requestJson(baseUrl, "/api/v1/fines", {
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

test("[validacao] numero_auto/orgao/valor ausentes e status invalido retornam 400", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "PPP1P11");
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");

    const missingNumero = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, data_infracao: DATA_INFRACAO, orgao: "DETRAN", valor: 10 },
    });
    const missingOrgao = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, numero_auto: "V-NO-ORGAO", data_infracao: DATA_INFRACAO, valor: 10 },
    });
    const missingValor = await requestJson(baseUrl, "/api/v1/fines", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, numero_auto: "V-NO-VALOR", data_infracao: DATA_INFRACAO, orgao: "DETRAN" },
    });
    const created = await createFine(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, numero_auto: "V-ENUM" });
    const badStatus = await patchStatus(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "arquivada" });

    assert.equal(missingNumero.status, 400);
    assert.equal(missingNumero.body.error.reason, "required_field");
    assert.equal(missingOrgao.status, 400);
    assert.equal(missingOrgao.body.error.reason, "required_field");
    assert.equal(missingValor.status, 400);
    assert.equal(missingValor.body.error.reason, "required_field");
    assert.equal(badStatus.status, 400);
    assert.equal(badStatus.body.error.reason, "invalid_status");
  });
});

test("[R3.2] filtro due_within_days retorna apenas multas a vencer na janela", async () => {
  await withFinesApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "QQQ1Q11");
    const soon = new Date(Date.now() + 3 * MILLIS_PER_DAY).toISOString();
    const far = new Date(Date.now() + 60 * MILLIS_PER_DAY).toISOString();

    const dueSoon = await createFine(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_auto: "DUE-SOON",
      prazo_pagamento: soon,
    });
    await createFine(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      numero_auto: "DUE-FAR",
      prazo_pagamento: far,
    });

    const dueWithin7 = await requestJson(baseUrl, "/api/v1/fines?due_within_days=7", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(dueWithin7.body.pagination.total, 1, JSON.stringify(dueWithin7.body));
    assert.equal(dueWithin7.body.items[0].id, dueSoon.id);
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
  readonly driverA: User;
  readonly driverB: User;
};

type FinesApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFinesApi(callback: (context: FinesApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFineRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/fines/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFineRuntimeForTests();
  resetVehicleRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetFineRuntimeForTests();
    resetVehicleRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Fines A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Fines B", modules: ["dashboard", "work_orders"] });
  const adminA = service.createUser({ tenantId: tenantA.id, name: "Admin A", email: "fine-admin-a@example.com", roles: ["tenant_admin"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "fine-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "fine-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "fine-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "fine-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "fine-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "fine-viewer-a@example.com", roles: ["viewer"] });
  const driverA = service.createUser({ tenantId: tenantA.id, name: "Driver A", email: "fine-driver-a@example.com", roles: ["field_technician"] });
  const driverB = service.createUser({ tenantId: tenantB.id, name: "Driver B", email: "fine-driver-b@example.com", roles: ["field_technician"] });

  return { tenantA, tenantB, adminA, managerA, managerB, operatorA, financeA, auditorA, viewerA, driverA, driverB };
}

function fineBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    numero_auto: "AI-DEFAULT",
    data_infracao: DATA_INFRACAO,
    orgao: "DETRAN",
    valor: 100,
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

async function createFine(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/fines", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: fineBody(body),
  });

  assert.equal(created.status, 201, `fine creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function patchStatus(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/fines/${id}`, {
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
