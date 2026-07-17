import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService, type WorkOrderReferenceResolvers } from "../src/modules/work-orders/work-order.service.js";
import { toWorkOrderMapStartPointsDto } from "../src/modules/work-orders/work-order.dto.js";
import { GeocoderUnavailableError, type Geocoder, type GeocodeResult } from "../src/modules/work-orders/geocoding/geocoder.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-8b (J-MAPAS-5) — contrato do geocode do DESTINO (espelho da origem) + read MINIMIZADO dos pontos
// de partida do mapa da OS (LGPD: só o técnico ATRIBUÍDO; §2.8: sem tenant_id/coordenada em log) + RBAC.

function stub(result: GeocodeResult | null): Geocoder {
  return { geocode: async () => result, isEnabled: () => true };
}

function actor(tenantId = randomUUID()): WorkOrderActorContext {
  return { tenantId, userId: randomUUID(), roles: ["tenant_admin"], permissions: ["work_orders:read", "work_orders:update", "work_orders:create", "work_orders:assign"] };
}

async function seedWithDestination(
  service: WorkOrderService,
  ctx: WorkOrderActorContext,
  body: Record<string, unknown> = {},
) {
  return service.create(ctx, {
    title: "Reboque",
    priority: "high",
    serviceAddress: "Rua Origem, 100",
    destinationAddress: "Rua Destino, 200",
    ...body,
  });
}

// ============================ geocode do DESTINO (E1–E8 espelhados) ============================

test("E1: geocode do destino persiste destination_* (coord + fonte + geocoded_at)", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub({ latitude: -25.42, longitude: -49.27, source: "stub" }));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx);

  const result = await service.geocodeDestinationById(ctx, wo.id);
  assert.equal(result.geocoded, true);
  assert.equal(result.workOrder?.destinationLatitude, -25.42);
  assert.equal(result.workOrder?.destinationLongitude, -49.27);
  assert.equal(result.workOrder?.destinationGeocodeSource, "stub");
  assert.ok(result.workOrder?.destinationGeocodedAt instanceof Date);
  // A ORIGEM não é tocada pelo geocode do destino.
  assert.equal(result.workOrder?.serviceLatitude, undefined);
});

test("E2: OS de outro tenant → 404 (nunca vaza existência)", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub({ latitude: -25.4, longitude: -49.2, source: "stub" }));
  const owner = actor();
  const wo = await seedWithDestination(service, owner);

  await assert.rejects(
    () => service.geocodeDestinationById(actor(), wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("E3: OS inexistente → 404", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub(null));
  await assert.rejects(
    () => service.geocodeDestinationById(actor(), randomUUID()),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("E4/E5: destino já geocodificado → 409 sem force; 200 com force sobrescreve", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub({ latitude: -10, longitude: -20, source: "stub" }));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx, { destinationLatitude: -25.42, destinationLongitude: -49.27 });

  await assert.rejects(
    () => service.geocodeDestinationById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 409,
  );

  const forced = await service.geocodeDestinationById(ctx, wo.id, true);
  assert.equal(forced.geocoded, true);
  assert.equal(forced.workOrder?.destinationLatitude, -10);
});

test("E6: OS sem endereço de destino → 422", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub({ latitude: -25.4, longitude: -49.2, source: "stub" }));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx, { destinationAddress: undefined });

  await assert.rejects(
    () => service.geocodeDestinationById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 422 && error.reason === "no_destination_address",
  );
});

test("E7: provedor sem match → 200 {geocoded:false} e nada persiste", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub(null));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx);

  const result = await service.geocodeDestinationById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  assert.ok(result.reason);
  const after = await service.get(ctx, wo.id);
  assert.equal(after.destinationLatitude, undefined);
});

test("E8: provedor indisponível (throw) → 502, nada persiste (fail-open)", async () => {
  const throwing: Geocoder = {
    geocode: async () => {
      throw new GeocoderUnavailableError();
    },
    isEnabled: () => true,
  };
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, throwing);
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx);

  await assert.rejects(
    () => service.geocodeDestinationById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 502,
  );
  const after = await service.get(ctx, wo.id);
  assert.equal(after.destinationLatitude, undefined);
});

test("R4: create NUNCA geocodifica o destino — OS criada mesmo com geocoder que lança", async () => {
  let geocodeCalls = 0;
  const throwing: Geocoder = {
    geocode: async () => {
      geocodeCalls += 1;
      throw new GeocoderUnavailableError();
    },
    isEnabled: () => true,
  };
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, throwing);
  const wo = await seedWithDestination(service, actor());
  assert.ok(wo.id);
  assert.equal(geocodeCalls, 0);
});

test("B8: geocoder desabilitado (Noop) → 200 {geocoded:false} com razão honesta, sem persistir", async () => {
  const disabled: Geocoder = { geocode: async () => null, isEnabled: () => false };
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, disabled);
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx);

  const result = await service.geocodeDestinationById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  assert.match(result.reason ?? "", /desabilitada/i);
});

test("E-sentinela: provedor devolve 0/0 → 200 {geocoded:false}, não persiste sentinela", async () => {
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {}, stub({ latitude: 0, longitude: 0, source: "stub" }));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx);

  const result = await service.geocodeDestinationById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  const after = await service.get(ctx, wo.id);
  assert.equal(after.destinationLatitude, undefined);
});

// ============================ read minimizado dos pontos de partida ============================

function mapResolvers(calls: string[]): WorkOrderReferenceResolvers {
  return {
    resolveAssignedOperatorLocation: async (_actor, operatorUserId) => {
      calls.push(operatorUserId);
      return { latitude: -23.4, longitude: -46.5, capturedAt: new Date("2026-07-16T10:00:00.000Z") };
    },
    listMapBases: async () => [{ id: "base-1", name: "Base Central", latitude: -23.6, longitude: -46.7 }],
  };
}

test("read minimizado: devolve origem/destino/bases e a posição SÓ do técnico ATRIBUÍDO (nunca a frota)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const calls: string[] = [];
  const service = new WorkOrderService(repo, mapResolvers(calls), stub(null));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx, {
    serviceLatitude: -23.55,
    serviceLongitude: -46.63,
    destinationLatitude: -25.42,
    destinationLongitude: -49.27,
  });
  const assignedUserId = randomUUID();
  await service.assign(ctx, wo.id, { operatorId: randomUUID(), userId: assignedUserId });

  const points = await service.listMapStartPoints(ctx, wo.id);

  assert.equal(points.origin?.latitude, -23.55);
  assert.equal(points.destination?.latitude, -25.42);
  assert.equal(points.bases.length, 1);
  assert.ok(points.technician);
  assert.ok(points.technician?.capturedAt instanceof Date); // carimbo de idade
  // LGPD/minimização: o resolver foi consultado UMA vez e APENAS com o userId do técnico atribuído.
  assert.deepEqual(calls, [assignedUserId]);
});

test("read minimizado: OS SEM técnico atribuído → technician null e o resolver NÃO é chamado (LGPD)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const calls: string[] = [];
  const service = new WorkOrderService(repo, mapResolvers(calls), stub(null));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx, { serviceLatitude: -23.55, serviceLongitude: -46.63 });

  const points = await service.listMapStartPoints(ctx, wo.id);
  assert.equal(points.technician, null);
  assert.equal(calls.length, 0); // nunca busca posição sem técnico atribuído (não vaza a frota)
});

test("read minimizado: OS de outro tenant → 404", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, mapResolvers([]), stub(null));
  const owner = actor();
  const wo = await seedWithDestination(service, owner, { serviceLatitude: -23.55, serviceLongitude: -46.63 });

  await assert.rejects(
    () => service.listMapStartPoints(actor(), wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("read minimizado: OS sem coordenada de origem/destino → origin/destination null (empty honesto, não quebra)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, mapResolvers([]), stub(null));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx); // sem lat/lng

  const points = await service.listMapStartPoints(ctx, wo.id);
  assert.equal(points.origin, null);
  assert.equal(points.destination, null);
});

test("§2.8: o DTO do read minimizado não expõe tenant_id nem id de operador/place_id/segredo", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, mapResolvers([]), stub(null));
  const ctx = actor();
  const wo = await seedWithDestination(service, ctx, {
    serviceLatitude: -23.55,
    serviceLongitude: -46.63,
    destinationLatitude: -25.42,
    destinationLongitude: -49.27,
  });
  await service.assign(ctx, wo.id, { operatorId: randomUUID(), userId: randomUUID() });

  const dto = toWorkOrderMapStartPointsDto(await service.listMapStartPoints(ctx, wo.id));
  const json = JSON.stringify(dto);
  assert.doesNotMatch(json, /tenant/i);
  assert.doesNotMatch(json, /operatorUserId|operator_id|assignedUserId|place_id|token|secret/i);
  // O técnico vem só com posição + carimbo de idade — sem identificar QUEM (minimização).
  assert.deepEqual(Object.keys(dto.technician ?? {}).sort(), ["capturedAt", "latitude", "longitude"]);
});

// ============================ RBAC (route-level) ============================

test("RBAC: GET /map-start-points exige work_orders:read (support sem a permissão → 403) e 200 para quem tem", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS mapa", serviceAddress: "Rua A, 1", priority: "high" },
    });
    const id = created.body.data.id;

    const forbidden = await requestJson(baseUrl, `/api/v1/work-orders/${id}/map-start-points`, {
      headers: authHeaders(seed.tenantA, seed.supportA, "support"),
    });
    const ok = await requestJson(baseUrl, `/api/v1/work-orders/${id}/map-start-points`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/work-orders/${id}/map-start-points`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(forbidden.status, 403);
    assert.equal(ok.status, 200);
    assert.ok("origin" in ok.body.data && "bases" in ok.body.data);
    assert.equal(crossTenant.status, 404);
  });
});

// --- harness mínima do app (memory) ---

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly supportA: User;
};

async function withApi(callback: (context: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { resetWorkOrderRuntimeForTests }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/work-orders/index.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  resetWorkOrderRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCore(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetWorkOrderRuntimeForTests();
  }
}

function seedCore(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Mapa Tenant A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Mapa Tenant B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "map-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "map-manager-b@example.com", roles: ["manager"] });
  const supportA = service.createUser({ tenantId: tenantA.id, name: "Support A", email: "map-support-a@example.com", roles: ["support"] });
  return { tenantA, tenantB, managerA, managerB, supportA };
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
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
