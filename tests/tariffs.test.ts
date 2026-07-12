import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryTariffService,
  resetTariffRuntimeForTests,
} from "../src/modules/tariffs/tariff.service.js";
import { TariffError, type TariffActorContext } from "../src/modules/tariffs/tariff.types.js";

function actor(tenantId = randomUUID()): TariffActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["tariffs:read", "tariffs:create", "tariffs:update"],
  };
}

function service() {
  resetTariffRuntimeForTests();
  return createMemoryTariffService();
}

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    price_table_id: randomUUID(),
    unit_price: 150.5,
    origin: "manual",
    ...overrides,
  };
}

test("cria Tarifa com defaults (currency BRL, status active, isActive true)", async () => {
  const svc = service();
  const priceTableId = randomUUID();
  const tariff = await svc.create(actor(), { price_table_id: priceTableId, unit_price: 99.9, origin: "catalogo" });
  assert.equal(tariff.currency, "BRL");
  assert.equal(tariff.status, "active");
  assert.equal(tariff.isActive, true);
  assert.equal(tariff.unitPrice, 99.9);
  assert.equal(tariff.origin, "catalogo");
  assert.equal(tariff.priceTableId, priceTableId);
});

test("normaliza currency informada (usd → USD)", async () => {
  const svc = service();
  const tariff = await svc.create(actor(), baseBody({ currency: "usd", name: "Guincho leve" }));
  assert.equal(tariff.currency, "USD");
  assert.equal(tariff.name, "Guincho leve");
});

test("unit_price ausente → 400", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { price_table_id: randomUUID(), origin: "manual" }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 400,
  );
});

test("unit_price negativo → 400", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), baseBody({ unit_price: -5 })),
    (e: unknown) => e instanceof TariffError && e.statusCode === 400 && e.reason === "invalid_unit_price",
  );
});

test("origin ausente → 400", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { price_table_id: randomUUID(), unit_price: 10 }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 400,
  );
});

test("price_table_id ausente/ inválido → 400", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { unit_price: 10, origin: "manual" }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 400,
  );
  await assert.rejects(
    () => svc.create(actor(), { price_table_id: "nope", unit_price: 10, origin: "manual" }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 400 && e.reason === "invalid_uuid",
  );
});

test("duplicidade natural-key (mesmos 4 campos não-nulos) → 409 duplicate_tariff", async () => {
  const svc = service();
  const ctx = actor();
  const priceTableId = randomUUID();
  const serviceCatalogId = randomUUID();
  const customerId = randomUUID();
  await svc.create(ctx, {
    price_table_id: priceTableId,
    service_catalog_id: serviceCatalogId,
    customer_id: customerId,
    unit_price: 100,
    origin: "manual",
  });
  await assert.rejects(
    () =>
      svc.create(ctx, {
        price_table_id: priceTableId,
        service_catalog_id: serviceCatalogId,
        customer_id: customerId,
        unit_price: 200,
        origin: "manual",
      }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 409 && e.reason === "duplicate_tariff",
  );
});

test("A1: tarifa padrão (customer NULL) e por-cliente coexistem para o mesmo serviço", async () => {
  const svc = service();
  const ctx = actor();
  const priceTableId = randomUUID();
  const serviceCatalogId = randomUUID();
  const padrao = await svc.create(ctx, {
    price_table_id: priceTableId,
    service_catalog_id: serviceCatalogId,
    unit_price: 100,
    origin: "manual",
  });
  const porCliente = await svc.create(ctx, {
    price_table_id: priceTableId,
    service_catalog_id: serviceCatalogId,
    customer_id: randomUUID(),
    unit_price: 90,
    origin: "manual",
  });
  assert.ok(padrao.id !== porCliente.id);
  assert.equal(padrao.customerId, undefined);
  assert.ok(porCliente.customerId);
});

test("A1: dois clientes distintos para o mesmo serviço não colidem", async () => {
  const svc = service();
  const ctx = actor();
  const priceTableId = randomUUID();
  const serviceCatalogId = randomUUID();
  await svc.create(ctx, {
    price_table_id: priceTableId,
    service_catalog_id: serviceCatalogId,
    customer_id: randomUUID(),
    unit_price: 80,
    origin: "manual",
  });
  const other = await svc.create(ctx, {
    price_table_id: priceTableId,
    service_catalog_id: serviceCatalogId,
    customer_id: randomUUID(),
    unit_price: 70,
    origin: "manual",
  });
  assert.ok(other.id);
});

test("A1: dois defaults (customer/service NULL) na mesma tabela não colidem (NULLs distintos)", async () => {
  const svc = service();
  const ctx = actor();
  const priceTableId = randomUUID();
  await svc.create(ctx, { price_table_id: priceTableId, unit_price: 50, origin: "manual" });
  const second = await svc.create(ctx, { price_table_id: priceTableId, unit_price: 60, origin: "manual" });
  assert.ok(second.id);
});

test("isolamento: get de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, baseBody());
  await assert.rejects(
    () => svc.get(actor(), created.id),
    (e: unknown) => e instanceof TariffError && e.statusCode === 404,
  );
});

test("isolamento: update de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, baseBody());
  await assert.rejects(
    () => svc.update(actor(), created.id, { unit_price: 5 }),
    (e: unknown) => e instanceof TariffError && e.statusCode === 404,
  );
});

test("list filtra por price_table_id", async () => {
  const svc = service();
  const ctx = actor();
  const priceTableId = randomUUID();
  await svc.create(ctx, { price_table_id: priceTableId, unit_price: 10, origin: "manual" });
  await svc.create(ctx, { price_table_id: randomUUID(), unit_price: 20, origin: "manual" });
  const filtered = await svc.list(ctx, { price_table_id: priceTableId });
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0]!.priceTableId, priceTableId);
});

test("list filtra por is_active e faz soft-delete via is_active=false", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, baseBody());
  const off = await svc.update(ctx, created.id, { is_active: false });
  assert.equal(off.isActive, false);
  const actives = await svc.list(ctx, { is_active: true });
  assert.equal(actives.items.length, 0);
  const inactives = await svc.list(ctx, { is_active: false });
  assert.equal(inactives.items.length, 1);
});

test("list search por name e por origin", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, baseBody({ name: "Guincho pesado", origin: "manual" }));
  await svc.create(ctx, baseBody({ name: "Prancha", origin: "importacao" }));
  const byName = await svc.list(ctx, { search: "guincho" });
  assert.equal(byName.items.length, 1);
  assert.equal(byName.items[0]!.name, "Guincho pesado");
  const byOrigin = await svc.list(ctx, { search: "importacao" });
  assert.equal(byOrigin.items.length, 1);
  assert.equal(byOrigin.items[0]!.origin, "importacao");
});

test("update de campos (unit_price, origin, rule, status)", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, baseBody({ unit_price: 100 }));
  const updated = await svc.update(ctx, created.id, {
    unit_price: 250,
    origin: "revisao",
    rule: "vigencia sazonal",
    status: "review",
  });
  assert.equal(updated.unitPrice, 250);
  assert.equal(updated.origin, "revisao");
  assert.equal(updated.rule, "vigencia sazonal");
  assert.equal(updated.status, "review");
});

test("get retorna a tarifa criada no mesmo tenant", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, baseBody());
  const fetched = await svc.get(ctx, created.id);
  assert.equal(fetched.id, created.id);
});

// Veto junta Ω2-a.2 (B1) — a coluna Vigência da lista consome validFrom/validTo do LIST DTO;
// sem eles toda linha exibia "Sem vigência definida" mesmo com vigência gravada.
test("list DTO emite validFrom/validTo (coluna Vigência)", async () => {
  const { toTariffListDto } = await import("../src/modules/tariffs/tariff.dto.js");
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, baseBody({ valid_from: "2026-07-01T00:00:00Z", valid_to: "2026-12-31T00:00:00Z" }));
  const result = await svc.list(ctx, {});
  const dto = toTariffListDto(result);
  assert.equal(dto.items.length, 1);
  assert.equal(dto.items[0]!.validFrom, "2026-07-01T00:00:00.000Z");
  assert.equal(dto.items[0]!.validTo, "2026-12-31T00:00:00.000Z");
});

test("list DTO emite validFrom/validTo null quando sem vigência", async () => {
  const { toTariffListDto } = await import("../src/modules/tariffs/tariff.dto.js");
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, baseBody());
  const dto = toTariffListDto(await svc.list(ctx, {}));
  assert.equal(dto.items[0]!.validFrom, null);
  assert.equal(dto.items[0]!.validTo, null);
});
