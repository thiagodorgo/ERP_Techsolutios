import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryPoiService,
  resetPoiRuntimeForTests,
} from "../src/modules/pois/poi.service.js";
import { PoiError, type PoiActorContext } from "../src/modules/pois/poi.types.js";

function actor(tenantId = randomUUID()): PoiActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["pois:read", "pois:create", "pois:update"] };
}

function service() {
  resetPoiRuntimeForTests();
  return createMemoryPoiService();
}

test("cria POI com defaults (is_active true, coordenadas persistidas)", async () => {
  const svc = service();
  const poi = await svc.create(actor(), { name: "Base SP", latitude: -23.5505, longitude: -46.6333 });
  assert.equal(poi.name, "Base SP");
  assert.equal(poi.isActive, true);
  assert.equal(poi.latitude, -23.5505);
  assert.equal(poi.longitude, -46.6333);
  assert.equal(poi.category, undefined);
  assert.ok(poi.createdAt instanceof Date);
});

test("latitude emitida como número", async () => {
  const svc = service();
  const poi = await svc.create(actor(), { name: "Numérico", latitude: "-23.55", longitude: "-46.63" });
  assert.equal(typeof poi.latitude, "number");
  assert.equal(typeof poi.longitude, "number");
  assert.equal(poi.latitude, -23.55);
});

test("latitude ausente → 400 required", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Sem lat", longitude: -46.63 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "required_field",
  );
});

test("longitude ausente → 400 required", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Sem lng", latitude: -23.55 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "required_field",
  );
});

test("latitude fora de faixa (>90) → 400 invalid_coordinate", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Fora lat", latitude: 91, longitude: 10 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "invalid_coordinate",
  );
});

test("longitude fora de faixa (>180) → 400 invalid_coordinate", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Fora lng", latitude: 10, longitude: 181 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "invalid_coordinate",
  );
});

test("sentinela (0,0) → 400 invalid_coordinate", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Sentinela", latitude: 0, longitude: 0 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "invalid_coordinate",
  );
});

test("eixo isolado em 0 (lat 0, lng !=0) é legítimo", async () => {
  const svc = service();
  const poi = await svc.create(actor(), { name: "Equador", latitude: 0, longitude: -46.6 });
  assert.equal(poi.latitude, 0);
  assert.equal(poi.longitude, -46.6);
});

test("nome duplicado no mesmo tenant → 409", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Igual", latitude: 1, longitude: 1 });
  await assert.rejects(
    () => svc.create(ctx, { name: "Igual", latitude: 2, longitude: 2 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 409 && e.reason === "duplicate_name",
  );
});

test("mesmo nome em tenant diferente → OK", async () => {
  const svc = service();
  await svc.create(actor(), { name: "Compartilhado", latitude: 1, longitude: 1 });
  const other = await svc.create(actor(), { name: "Compartilhado", latitude: 2, longitude: 2 });
  assert.equal(other.name, "Compartilhado");
});

test("isolamento: get/update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const p = await svc.create(owner, { name: "Do dono", latitude: 1, longitude: 1 });
  const intruder = actor();
  await assert.rejects(() => svc.get(intruder, p.id), (e: unknown) => e instanceof PoiError && e.statusCode === 404);
  await assert.rejects(() => svc.update(intruder, p.id, { category: "x" }), (e: unknown) => e instanceof PoiError && e.statusCode === 404);
});

test("list filtra por is_active e search (nome/categoria/endereço)", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Pátio Norte", latitude: 1, longitude: 1, category: "patio", address: "Av. Central 100" });
  await svc.create(ctx, { name: "Oficina Sul", latitude: 2, longitude: 2, category: "oficina" });
  const byCategory = await svc.list(ctx, { search: "oficina" });
  assert.equal(byCategory.items.length, 1);
  assert.equal(byCategory.items[0]!.name, "Oficina Sul");
  const byAddress = await svc.list(ctx, { search: "central" });
  assert.equal(byAddress.items.length, 1);
  assert.equal(byAddress.items[0]!.name, "Pátio Norte");
});

test("desativação lógica via is_active=false", async () => {
  const svc = service();
  const ctx = actor();
  const p = await svc.create(ctx, { name: "Inativar", latitude: 1, longitude: 1 });
  const off = await svc.update(ctx, p.id, { is_active: false });
  assert.equal(off.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
});

test("update move o par de coordenadas", async () => {
  const svc = service();
  const ctx = actor();
  const p = await svc.create(ctx, { name: "Móvel", latitude: 1, longitude: 1 });
  const moved = await svc.update(ctx, p.id, { latitude: -23.5, longitude: -46.6 });
  assert.equal(moved.latitude, -23.5);
  assert.equal(moved.longitude, -46.6);
});

test("update com apenas um eixo da coordenada → 400", async () => {
  const svc = service();
  const ctx = actor();
  const p = await svc.create(ctx, { name: "Parcial", latitude: 1, longitude: 1 });
  await assert.rejects(
    () => svc.update(ctx, p.id, { latitude: 5 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "invalid_coordinate",
  );
});

test("update para sentinela (0,0) → 400 invalid_coordinate", async () => {
  const svc = service();
  const ctx = actor();
  const p = await svc.create(ctx, { name: "Trava", latitude: 1, longitude: 1 });
  await assert.rejects(
    () => svc.update(ctx, p.id, { latitude: 0, longitude: 0 }),
    (e: unknown) => e instanceof PoiError && e.statusCode === 400 && e.reason === "invalid_coordinate",
  );
});
