import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("service-catalog service cria, lista, busca, atualiza, desativa e isola tenants", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryServiceCatalogService, resetServiceCatalogRuntimeForTests } = await import(
    "../src/modules/service-catalog/index.js"
  );
  const service = createMemoryServiceCatalogService();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const managerA = actor(tenantA, randomUUID(), ["manager"], [
    "service_catalog:read",
    "service_catalog:create",
    "service_catalog:update",
  ]);
  const managerB = actor(tenantB, randomUUID(), ["manager"], ["service_catalog:read", "service_catalog:create"]);

  try {
    const first = await service.create(managerA, {
      name: "Guincho de Veiculo Leve",
      description: "Remocao de veiculos ate 3.5t.",
      category: "guincho",
      estimated_duration_minutes: 90,
      base_price: 350.5,
    });
    const second = await service.create(managerA, { name: "Chaveiro Automotivo" });

    assert.equal(first.isActive, true);
    assert.equal(first.status, "active");
    assert.equal(first.tenantId, tenantA);
    assert.equal(first.createdBy, managerA.userId);
    assert.equal(first.basePrice, 350.5);
    assert.equal(typeof first.basePrice, "number");
    assert.equal(first.estimatedDurationMinutes, 90);
    assert.equal(second.basePrice, undefined);

    const listA = await service.list(managerA, { limit: "20", offset: "0" });
    const listB = await service.list(managerB, { limit: "20", offset: "0" });
    assert.equal(listA.total, 2);
    assert.equal(listB.total, 0);

    const fetched = await service.get(managerA, first.id);
    assert.equal(fetched.id, first.id);

    const updated = await service.update(managerA, first.id, { status: "inactive", base_price: 400 });
    assert.equal(updated.status, "inactive");
    assert.equal(updated.basePrice, 400);
    assert.equal(updated.updatedBy, managerA.userId);

    const deactivated = await service.update(managerA, second.id, { isActive: false });
    assert.equal(deactivated.isActive, false);
    const inactive = await service.list(managerA, { isActive: false });
    assert.equal(inactive.total, 1);
    assert.equal(inactive.items[0].id, second.id);

    await assert.rejects(
      () => service.create(managerA, { name: "Guincho de Veiculo Leve" }),
      /already exists/,
    );

    const sameNameOtherTenant = await service.create(managerB, { name: "Guincho de Veiculo Leve" });
    assert.equal(sameNameOtherTenant.tenantId, tenantB);

    await assert.rejects(() => service.get(managerB, first.id), /Service was not found/);
  } finally {
    resetServiceCatalogRuntimeForTests();
  }
});

test("service-catalog service valida payloads e filtros", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryServiceCatalogService, resetServiceCatalogRuntimeForTests } = await import(
    "../src/modules/service-catalog/index.js"
  );
  const service = createMemoryServiceCatalogService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["service_catalog:create", "service_catalog:read"]);

  try {
    await assert.rejects(() => service.create(manager, { name: "" }), /name is required/);
    await assert.rejects(() => service.create(manager, {}), /name is required/);
    await assert.rejects(
      () => service.create(manager, { name: "Preco Negativo", base_price: -1 }),
      /basePrice must be a number/,
    );
    await assert.rejects(
      () => service.create(manager, { name: "Duracao Invalida", estimated_duration_minutes: -5 }),
      /estimatedDurationMinutes must be an integer/,
    );
    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
  } finally {
    resetServiceCatalogRuntimeForTests();
  }
});

test("service-catalog service aceita base_price como string numerica e arredonda 2 casas", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryServiceCatalogService, resetServiceCatalogRuntimeForTests } = await import(
    "../src/modules/service-catalog/index.js"
  );
  const service = createMemoryServiceCatalogService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["service_catalog:create", "service_catalog:read"]);

  try {
    const created = await service.create(manager, { name: "Servico Precificado", base_price: "199.999" });
    assert.equal(created.basePrice, 200);
    assert.equal(typeof created.basePrice, "number");

    const zeroPriced = await service.create(manager, { name: "Servico Cortesia", base_price: 0 });
    assert.equal(zeroPriced.basePrice, 0);
  } finally {
    resetServiceCatalogRuntimeForTests();
  }
});

function actor(
  tenantId: string,
  userId: string,
  roles: readonly string[],
  permissions: readonly string[],
) {
  return {
    tenantId,
    userId,
    roles,
    permissions,
  } as never;
}
