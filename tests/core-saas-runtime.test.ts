import assert from "node:assert/strict";
import test from "node:test";

import {
  CoreSaasRegistry,
  InMemoryCoreSaasStore,
  MemoryCoreSaasAdapter,
  createCoreSaasService,
  coreSaasService,
} from "../src/modules/core-saas/index.js";
import type { ICoreSaasService } from "../src/modules/core-saas/services/core-saas-service.interface.js";

test("CORE_SAAS_PERSISTENCE defaults to memory when unset", () => {
  assert.equal(process.env.CORE_SAAS_PERSISTENCE ?? "memory", "memory");
});

test("createCoreSaasService returns ICoreSaasService in memory mode", async () => {
  const service = await createCoreSaasService();

  assert.ok(typeof service.createTenant === "function");
  assert.ok(typeof service.listTenantsForTenant === "function");
  assert.ok(typeof service.getTenantForActor === "function");
  assert.ok(typeof service.createUser === "function");
  assert.ok(typeof service.listUsersForTenant === "function");
  assert.ok(typeof service.getUserForTenant === "function");
  assert.ok(typeof service.listRoles === "function");
  assert.ok(typeof service.getRoleDefinition === "function");
  assert.ok(typeof service.getAuditEventsForTenant === "function");
});

test("createCoreSaasService in memory mode does not require DATABASE_URL", async () => {
  const saved = process.env.DATABASE_URL;

  try {
    delete process.env.DATABASE_URL;
    const service = await createCoreSaasService();

    assert.ok(service instanceof MemoryCoreSaasAdapter);
  } finally {
    if (saved !== undefined) {
      process.env.DATABASE_URL = saved;
    }
  }
});

test("createCoreSaasService memory mode returns adapter wrapping the shared singleton", async () => {
  const service = await createCoreSaasService();

  assert.ok(service instanceof MemoryCoreSaasAdapter);
});

test("MemoryCoreSaasAdapter delegates listRoles to CoreSaasRegistry", async () => {
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const adapter = new MemoryCoreSaasAdapter(registry);
  const roles = await adapter.listRoles();

  assert.ok(Array.isArray(roles));
  assert.ok(roles.length > 0);
  assert.ok(roles.every((r) => typeof r.role === "string" && Array.isArray(r.permissions)));
});

test("MemoryCoreSaasAdapter delegates createTenant through coreSaasService singleton", async () => {
  const service: ICoreSaasService = new MemoryCoreSaasAdapter(coreSaasService);
  const tenant = await service.createTenant({ name: "Runtime Test Tenant" });

  assert.match(tenant.id, /^ten_/);
  assert.equal(tenant.name, "Runtime Test Tenant");
  assert.equal(tenant.status, "active");
});

test("MemoryCoreSaasAdapter returns Promises for all ICoreSaasService methods", async () => {
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const adapter = new MemoryCoreSaasAdapter(registry);

  const tenantPromise = adapter.createTenant({ name: "Promise Test" });

  assert.ok(tenantPromise instanceof Promise);

  const tenant = await tenantPromise;
  const listTenantsPromise = adapter.listTenantsForTenant(tenant.id);

  assert.ok(listTenantsPromise instanceof Promise);

  const rolesPromise = adapter.listRoles();

  assert.ok(rolesPromise instanceof Promise);
});
