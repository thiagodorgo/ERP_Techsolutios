import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("vehicles service cria, lista, busca, atualiza, desativa e isola tenants", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryVehicleService, resetVehicleRuntimeForTests } = await import("../src/modules/vehicles/index.js");
  const service = createMemoryVehicleService();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const managerA = actor(tenantA, randomUUID(), ["manager"], [
    "vehicles:read",
    "vehicles:create",
    "vehicles:update",
  ]);
  const managerB = actor(tenantB, randomUUID(), ["manager"], ["vehicles:read", "vehicles:create"]);

  try {
    const first = await service.create(managerA, {
      plate: "ABC1D23",
      model: "Mercedes Atego 1719",
      type: "guincho",
      year: 2020,
    });
    const second = await service.create(managerA, { plate: "XYZ9K88", model: "Viatura Secundaria" });

    assert.equal(first.isActive, true);
    assert.equal(first.status, "active");
    assert.equal(first.tenantId, tenantA);
    assert.equal(first.createdBy, managerA.userId);

    const listA = await service.list(managerA, { limit: "20", offset: "0" });
    const listB = await service.list(managerB, { limit: "20", offset: "0" });
    assert.equal(listA.total, 2);
    assert.equal(listB.total, 0);

    const fetched = await service.get(managerA, first.id);
    assert.equal(fetched.id, first.id);

    const updated = await service.update(managerA, first.id, { status: "maintenance" });
    assert.equal(updated.status, "maintenance");
    assert.equal(updated.updatedBy, managerA.userId);

    const deactivated = await service.update(managerA, second.id, { isActive: false });
    assert.equal(deactivated.isActive, false);
    const inactive = await service.list(managerA, { isActive: false });
    assert.equal(inactive.total, 1);
    assert.equal(inactive.items[0].id, second.id);

    await assert.rejects(
      () => service.create(managerA, { plate: "ABC1D23", model: "Duplicada" }),
      /already exists/,
    );

    const samePlateOtherTenant = await service.create(managerB, { plate: "ABC1D23", model: "Viatura B" });
    assert.equal(samePlateOtherTenant.tenantId, tenantB);

    await assert.rejects(() => service.get(managerB, first.id), /Vehicle was not found/);
  } finally {
    resetVehicleRuntimeForTests();
  }
});

test("vehicles service valida payloads e filtros", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryVehicleService, resetVehicleRuntimeForTests } = await import("../src/modules/vehicles/index.js");
  const service = createMemoryVehicleService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["vehicles:create", "vehicles:read"]);

  try {
    await assert.rejects(() => service.create(manager, { plate: "ABC1D23", model: "" }), /model is required/);
    await assert.rejects(() => service.create(manager, { model: "Sem Placa" }), /plate is required/);
    await assert.rejects(() => service.create(manager, { plate: "A1", model: "X" }), /plate must be between/);
    await assert.rejects(() => service.create(manager, { plate: "ABC@123", model: "X" }), /plate contains invalid characters/);
    await assert.rejects(() => service.create(manager, { plate: "ABC1D23", model: "X", year: 1800 }), /year must be between 1900 and 2100/);
    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
  } finally {
    resetVehicleRuntimeForTests();
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
