import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";
import { GeocoderUnavailableError, type Geocoder, type GeocodeResult } from "../src/modules/work-orders/geocoding/geocoder.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";

// Contrato do geocodeById (junta Ω1b-2): 404 inexistente/cross-tenant · 409 já geocodificada ·
// 422 sem endereço · 502 provedor · 200 {geocoded:false} sem match · 200 sucesso persiste coord.

function stub(result: GeocodeResult | null): Geocoder {
  return { geocode: async () => result, isEnabled: () => true };
}

function actor(tenantId = randomUUID()): WorkOrderActorContext {
  return { tenantId, userId: randomUUID(), roles: ["tenant_admin"], permissions: ["work_orders:update", "work_orders:create"] };
}

async function seedWorkOrder(service: WorkOrderService, ctx: WorkOrderActorContext, body: Record<string, unknown> = {}) {
  return service.create(ctx, { title: "Chamado", priority: "high", serviceAddress: "Rua A, 100", ...body });
}

test("E1: geocode com sucesso persiste coordenada + fonte + geocoded_at", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub({ latitude: -23.5, longitude: -46.6, source: "stub" }));
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx);

  const result = await service.geocodeById(ctx, wo.id);
  assert.equal(result.geocoded, true);
  assert.equal(result.workOrder?.serviceLatitude, -23.5);
  assert.equal(result.workOrder?.serviceLongitude, -46.6);
  assert.equal(result.workOrder?.serviceGeocodeSource, "stub");
  assert.ok(result.workOrder?.serviceGeocodedAt instanceof Date);
});

test("E2: OS de outro tenant → 404 (nunca vaza existência)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub({ latitude: -23.5, longitude: -46.6, source: "stub" }));
  const owner = actor();
  const wo = await seedWorkOrder(service, owner);
  const intruder = actor();

  await assert.rejects(
    () => service.geocodeById(intruder, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("E3: OS inexistente → 404", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub(null));
  await assert.rejects(
    () => service.geocodeById(actor(), randomUUID()),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("E4/E5: já geocodificada → 409 sem force; 200 com force sobrescreve", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub({ latitude: -10, longitude: -20, source: "stub" }));
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx, { serviceLatitude: -23.5, serviceLongitude: -46.6 });

  await assert.rejects(
    () => service.geocodeById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 409,
  );

  const forced = await service.geocodeById(ctx, wo.id, true);
  assert.equal(forced.geocoded, true);
  assert.equal(forced.workOrder?.serviceLatitude, -10);
});

test("E6: OS sem endereço → 422", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub({ latitude: -23.5, longitude: -46.6, source: "stub" }));
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx, { serviceAddress: undefined });

  await assert.rejects(
    () => service.geocodeById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 422,
  );
});

test("E7: provedor sem match → 200 {geocoded:false} e nada persiste", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub(null));
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx);

  const result = await service.geocodeById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  assert.ok(result.reason);
  const after = await service.get(ctx, wo.id);
  assert.equal(after.serviceLatitude, undefined);
});

test("E8: provedor indisponível (throw) → 502, nada persiste (fail-open)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const throwing: Geocoder = {
    geocode: async () => {
      throw new GeocoderUnavailableError();
    },
    isEnabled: () => true,
  };
  const service = new WorkOrderService(repo, {}, throwing);
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx);

  await assert.rejects(
    () => service.geocodeById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 502,
  );
  const after = await service.get(ctx, wo.id);
  assert.equal(after.serviceLatitude, undefined);
});

test("R4: create NUNCA invoca o geocoder — OS é criada mesmo com geocoder que lança", async () => {
  const repo = new InMemoryWorkOrderRepository();
  let geocodeCalls = 0;
  const throwing: Geocoder = {
    geocode: async () => {
      geocodeCalls += 1;
      throw new GeocoderUnavailableError();
    },
    isEnabled: () => true,
  };
  const service = new WorkOrderService(repo, {}, throwing);
  const wo = await seedWorkOrder(service, actor());
  assert.ok(wo.id);
  assert.equal(geocodeCalls, 0); // create não geocodifica
});

test("R10: updateGeocode com RETURNING vazio (corrida) → 404, nunca 500", async () => {
  // OS existe (findById devolve), mas o update volta vazio (removida/cross-tenant entre leitura e escrita).
  const base = new InMemoryWorkOrderRepository();
  const service0 = new WorkOrderService(base, {}, stub({ latitude: -23.5, longitude: -46.6, source: "stub" }));
  const ctx = actor();
  const wo = await seedWorkOrder(service0, ctx);

  const racyRepo = {
    findById: async () => wo,
    updateGeocode: async () => undefined,
  } as unknown as InMemoryWorkOrderRepository;
  const service = new WorkOrderService(racyRepo, {}, stub({ latitude: -23.5, longitude: -46.6, source: "stub" }));

  await assert.rejects(
    () => service.geocodeById(ctx, wo.id),
    (error: unknown) => error instanceof WorkOrderError && error.statusCode === 404,
  );
});

test("B8: geocoder desabilitado (Noop) → 200 {geocoded:false} com razão honesta, sem persistir", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const disabled: Geocoder = { geocode: async () => null, isEnabled: () => false };
  const service = new WorkOrderService(repo, {}, disabled);
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx);

  const result = await service.geocodeById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  assert.match(result.reason ?? "", /desabilitada/i);
});

test("E-sentinela: provedor devolve 0/0 → 200 {geocoded:false}, não persiste sentinela (R2)", async () => {
  const repo = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repo, {}, stub({ latitude: 0, longitude: 0, source: "stub" }));
  const ctx = actor();
  const wo = await seedWorkOrder(service, ctx);

  const result = await service.geocodeById(ctx, wo.id);
  assert.equal(result.geocoded, false);
  const after = await service.get(ctx, wo.id);
  assert.equal(after.serviceLatitude, undefined);
});
