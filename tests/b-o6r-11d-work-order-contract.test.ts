import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-11d (P1, P2) — a METADE SERVIDOR do contrato da OS entre o app e o backend.
//
// A fixture `mobile/flutter_app/test/features/work_orders/bo6r11d_work_order_contract.json` é lida pelos dois lados.
// Os testes Flutter (`bo6r11d_*`) leem as respostas e comparam por IGUALDADE o que o app manda com as seções
// `rest_status_outbound`, `rest_assign_request` e `sync_assign_payload`. Aqui, as mesmas seções são confrontadas
// com o backend real em memória: as chaves das respostas são as do `toWorkOrderDto`, os status que o app manda
// existem no backend, e os corpos que o app manda fazem o que o app espera (CL11D-06). Estes testes nascem
// VERDES na F0 (CR2-11D-03): o vermelho do lado app é do T8 e do T9; as mutações daqui são da fixture
// (M11, M11b, M12, M7f).

const FIXTURE = JSON.parse(
  readFileSync(
    new URL("../mobile/flutter_app/test/features/work_orders/bo6r11d_work_order_contract.json", import.meta.url),
    "utf8",
  ),
) as {
  readonly backend_statuses: readonly string[];
  readonly detail_response: { readonly data: Record<string, unknown> };
  readonly status_response: { readonly data: Record<string, unknown> };
  readonly assign_response: { readonly data: Record<string, unknown> };
  readonly rest_status_outbound: Record<string, string>;
  readonly rest_status_sem_equivalente: readonly string[];
  readonly rest_assign_request: Record<string, unknown>;
  readonly sync_assign_payload: Record<string, unknown>;
};

// As duas chaves que o servidor valida dentro da organização e por isso são TROCADAS pelas reais do cenário
// (CR2-11D-08): a OS e a viatura. Todo o resto vai como está na fixture.
const CHAVES_DO_CENARIO = ["work_order_id", "vehicle_id"] as const;

function amostraCompleta() {
  const id = randomUUID();
  return {
    id,
    tenantId: randomUUID(),
    code: "OS-000001",
    title: "Amostra",
    description: "d",
    customerName: "c",
    customerDocument: "doc",
    customerPhone: "+55",
    serviceAddress: "Rua",
    serviceCity: "Cidade",
    serviceState: "PR",
    serviceZipCode: "80000-000",
    serviceLatitude: 1,
    serviceLongitude: 2,
    serviceGeocodedAt: new Date(),
    serviceGeocodeSource: "manual",
    destinationAddress: "Destino",
    destinationCity: "Cidade",
    destinationState: "PR",
    destinationZipCode: "80000-000",
    destinationLatitude: 3,
    destinationLongitude: 4,
    destinationGeocodedAt: new Date(),
    destinationGeocodeSource: "manual",
    serviceDetails: {},
    priority: "urgent",
    status: "in_progress",
    assignedOperatorId: randomUUID(),
    assignedUserId: randomUUID(),
    checklistId: randomUUID(),
    checklistSnapshot: null,
    customerId: randomUUID(),
    vehicleId: randomUUID(),
    teamId: randomUUID(),
    serviceCatalogId: randomUUID(),
    scheduledFor: new Date(),
    slaDueAt: new Date(),
    startedAt: new Date(),
    arrivedAt: new Date(),
    completedAt: new Date(),
    cancelledAt: new Date(),
    cancellationReason: "r",
    financialCancellationDecision: "keep",
    mileageStart: 1,
    mileageEnd: 2,
    mileageSource: "app",
    mileageCorrectedAt: new Date(),
    createdBy: randomUUID(),
    updatedBy: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("[B-O6R-11d N3] as chaves de detail/status/assign_response.data são as do toWorkOrderDto; status e prioridade existem no backend", async () => {
  const { toWorkOrderDto, WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } = await import("../src/modules/work-orders/index.js");
  const amostra = amostraCompleta() as never;
  const chavesDto = Object.keys(toWorkOrderDto(amostra)).sort();
  // O detalhe (`GET /:id`) passa links e o conjunto de vistorias (work-order.controller.ts).
  const chavesDetalhe = Object.keys(
    toWorkOrderDto(amostra, { customer: null, vehicle: null, team: null, serviceCatalog: null }, []),
  ).sort();

  assert.deepEqual(Object.keys(FIXTURE.detail_response.data).sort(), chavesDetalhe, "detail_response.data");
  assert.deepEqual(Object.keys(FIXTURE.status_response.data).sort(), chavesDto, "status_response.data");
  assert.deepEqual(Object.keys(FIXTURE.assign_response.data).sort(), chavesDto, "assign_response.data");

  for (const [nome, secao] of [
    ["detail_response", FIXTURE.detail_response],
    ["status_response", FIXTURE.status_response],
    ["assign_response", FIXTURE.assign_response],
  ] as const) {
    assert.ok((WORK_ORDER_STATUSES as readonly unknown[]).includes(secao.data.status), `${nome}.status`);
    assert.ok((WORK_ORDER_PRIORITIES as readonly unknown[]).includes(secao.data.priority), `${nome}.priority`);
    assert.equal(typeof secao.data.id, "string", `${nome}.id`);
    // §2.8 — a resposta pública não traz organização.
    assert.equal("tenantId" in secao.data, false, `${nome} com tenantId`);
    assert.equal("tenant_id" in secao.data, false, `${nome} com tenant_id`);
  }
  // Cada resposta tem o SEU cliente: o teste Flutter lê as três e sabe de qual método veio a OS.
  assert.deepEqual(
    [FIXTURE.detail_response.data.customerName, FIXTURE.status_response.data.customerName, FIXTURE.assign_response.data.customerName],
    ["Cliente Detalhe", "Cliente Status", "Cliente Atribuicao"],
  );
});

test("[B-O6R-11d N4] todo status que o app manda pelo REST existe no backend", async () => {
  const { WORK_ORDER_STATUSES } = await import("../src/modules/work-orders/index.js");
  const valores = Object.values(FIXTURE.rest_status_outbound);
  assert.equal(valores.length, 8);
  for (const valor of valores) {
    assert.ok((WORK_ORDER_STATUSES as readonly string[]).includes(valor), `"${valor}" não é status do backend`);
  }
  // O que o app NÃO manda pelo REST (CL11D-03/09) não aparece como valor de saída.
  for (const nome of FIXTURE.rest_status_sem_equivalente) {
    assert.equal(nome in FIXTURE.rest_status_outbound, false, `${nome} está nas duas seções`);
  }
});

test("[B-O6R-11d N10] backend_statuses da fixture É a lista WORK_ORDER_STATUSES do backend (CR2-11D-07)", async () => {
  const { WORK_ORDER_STATUSES } = await import("../src/modules/work-orders/index.js");
  assert.deepEqual([...FIXTURE.backend_statuses], [...WORK_ORDER_STATUSES]);
});

test("[B-O6R-11d N1] rest_assign_request aplicado ao WorkOrderService em memória grava o usuário e a mensagem", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  resetWorkOrderRuntimeForTests();
  const service = createMemoryWorkOrderService();
  const gestor = {
    tenantId: randomUUID(),
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:create", "work_orders:assign", "work_orders:status"],
  } as never;

  try {
    const os = await service.create(gestor, { title: "OS do N1" });
    const atribuida = await service.assign(gestor, os.id, { ...FIXTURE.rest_assign_request });

    assert.equal(atribuida.status, "assigned");
    assert.equal(atribuida.assignedUserId, FIXTURE.rest_assign_request.userId);
    const eventos = await service.timeline(gestor, os.id);
    const atribuicao = eventos.find((evento) => evento.eventType === "work_order_assigned");
    assert.ok(atribuicao, "sem evento de atribuição");
    assert.equal(atribuicao.message, FIXTURE.rest_assign_request.message);
  } finally {
    resetWorkOrderRuntimeForTests();
  }
});

test("[B-O6R-11d N2] sync_assign_payload pelo lote, com a OS atribuída a U, é aceito e grava assignedUserId = U", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const h = authHeaders(seed.tenantA, seed.managerA, "manager");
    const tecnicoU = FIXTURE.sync_assign_payload.operator_id as string;
    const viatura = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: h,
      body: { plate: "QWE1R23", model: "Guincho" },
    });
    assert.equal(viatura.status, 201, JSON.stringify(viatura.body));
    const os = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: h,
      body: { title: "OS do N2" },
    });
    const osId = os.body.data.id as string;
    const semente = await requestJson(baseUrl, `/api/v1/work-orders/${osId}/assign`, {
      method: "POST",
      headers: h,
      body: { operatorId: tecnicoU, userId: tecnicoU },
    });
    assert.equal(semente.status, 200, JSON.stringify(semente.body));

    const payload = { ...FIXTURE.sync_assign_payload, work_order_id: osId, vehicle_id: viatura.body.data.id };
    for (const chave of Object.keys(FIXTURE.sync_assign_payload)) {
      if ((CHAVES_DO_CENARIO as readonly string[]).includes(chave)) continue;
      assert.deepEqual(payload[chave as keyof typeof payload], FIXTURE.sync_assign_payload[chave], chave);
    }
    const lote = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: h,
      body: {
        client_batch_id: "b-o6r-11d-n2",
        actions: [{ client_action_id: "n2-assign", type: "work_order.assign", payload }],
      },
    });

    assert.equal(lote.status, 200, JSON.stringify(lote.body));
    assert.equal(lote.body.data.summary.accepted, 1, JSON.stringify(lote.body.data));
    const estado = lote.body.data.accepted[0].server_state;
    assert.equal(estado.assignedUserId, tecnicoU);
    assert.equal(estado.assignedOperatorId, tecnicoU);
    assert.equal(estado.vehicleId, viatura.body.data.id);
    const detalhe = await requestJson(baseUrl, `/api/v1/work-orders/${osId}`, { headers: h });
    assert.equal(detalhe.body.data.assignedUserId, tecnicoU);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withApi(callback: (context: ApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetTeamRuntimeForTests },
    { resetMobileWorkOrderSyncRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/teams/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWorkOrderRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetTeamRuntimeForTests();
    resetMobileWorkOrderSyncRuntimeForTests();
  };

  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Organização 11d", modules: ["dashboard", "mobile", "work_orders"] });
  const managerA = core.createUser({
    tenantId: tenantA.id,
    name: "Gestor 11d",
    email: "gestor-11d-contrato@example.com",
    roles: ["manager"],
  });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, managerA } });
  } finally {
    await closeServer(server);
    resetAll();
  }
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
