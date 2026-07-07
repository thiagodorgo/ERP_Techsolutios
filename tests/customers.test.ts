import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("customers service cria, lista, busca, atualiza, desativa e isola tenants", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryCustomerService, resetCustomerRuntimeForTests } = await import("../src/modules/customers/index.js");
  const service = createMemoryCustomerService();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const managerA = actor(tenantA, randomUUID(), ["manager"], [
    "customers:read",
    "customers:create",
    "customers:update",
  ]);
  const managerB = actor(tenantB, randomUUID(), ["manager"], ["customers:read", "customers:create"]);

  try {
    const first = await service.create(managerA, {
      name: "Cliente Exemplo",
      document: "12345678901",
      phone: "+55 41 99999-9999",
      email: "cliente@example.com",
      city: "Curitiba",
      state: "PR",
    });
    const second = await service.create(managerA, { name: "Cliente Secundario" });

    assert.equal(first.isActive, true);
    assert.equal(first.tenantId, tenantA);
    assert.equal(first.createdBy, managerA.userId);

    const listA = await service.list(managerA, { limit: "20", offset: "0" });
    const listB = await service.list(managerB, { limit: "20", offset: "0" });
    assert.equal(listA.total, 2);
    assert.equal(listB.total, 0);

    const fetched = await service.get(managerA, first.id);
    assert.equal(fetched.id, first.id);

    const updated = await service.update(managerA, first.id, { phone: "1140040001" });
    assert.equal(updated.phone, "1140040001");
    assert.equal(updated.updatedBy, managerA.userId);

    const deactivated = await service.update(managerA, second.id, { isActive: false });
    assert.equal(deactivated.isActive, false);
    const inactive = await service.list(managerA, { isActive: false });
    assert.equal(inactive.total, 1);
    assert.equal(inactive.items[0].id, second.id);

    await assert.rejects(
      () => service.create(managerA, { name: "Duplicado", document: "12345678901" }),
      /already exists/,
    );

    const sameDocOtherTenant = await service.create(managerB, { name: "Cliente B", document: "12345678901" });
    assert.equal(sameDocOtherTenant.tenantId, tenantB);

    await assert.rejects(() => service.get(managerB, first.id), /Customer was not found/);
  } finally {
    resetCustomerRuntimeForTests();
  }
});

test("customers service valida payloads e filtros", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryCustomerService, resetCustomerRuntimeForTests } = await import("../src/modules/customers/index.js");
  const service = createMemoryCustomerService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["customers:create", "customers:read"]);

  try {
    await assert.rejects(() => service.create(manager, { name: "" }), /name is required/);
    await assert.rejects(() => service.create(manager, { name: "X", document: "123" }), /document must be between/);
    await assert.rejects(() => service.create(manager, { name: "X", phone: "12" }), /phone must be between/);
    await assert.rejects(() => service.create(manager, { name: "X", email: "notanemail" }), /email is invalid/);
    await assert.rejects(() => service.create(manager, { name: "X", state: "PRR" }), /2-letter code/);
    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
  } finally {
    resetCustomerRuntimeForTests();
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
