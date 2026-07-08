import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import test, { after, before } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const storagePath = path.join(os.tmpdir(), `erp-damage-attachments-${process.pid}`);
const DATA = "2026-06-01T00:00:00.000Z";
const tinyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

before(removeStoragePath);
after(async () => {
  await removeStoragePath({ throwOnFailure: false });
});

test("POST /damages cria dano (201) sem vazar tenant; GET /:id inclui galeria vazia", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ABC1D23");

    const created = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        data: DATA,
        gravidade: "moderada",
        descricao: "Risco na lateral direita",
        custo_estimado: 500.5,
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.vehicleId, vehicleId);
    assert.equal(created.body.data.gravidade, "moderada");
    assert.equal(created.body.data.descricao, "Risco na lateral direita");
    assert.equal(created.body.data.status, "registrado");
    assert.equal(created.body.data.custoEstimado, 500.5);
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);

    const detail = await requestJson(baseUrl, `/api/v1/damages/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.data.attachments, []);
  });
});

test("GET /damages filtra por viatura, status e gravidade", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleV = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleW = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "BBB2B22");

    await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, gravidade: "leve" });
    await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, gravidade: "grave" });
    await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleW, gravidade: "leve" });

    const byVehicle = await requestJson(baseUrl, `/api/v1/damages?vehicle_id=${vehicleV}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byGravidade = await requestJson(baseUrl, "/api/v1/damages?gravidade=leve", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byStatus = await requestJson(baseUrl, "/api/v1/damages?status=registrado", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(byVehicle.body.pagination.total, 2);
    assert.ok(byVehicle.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleV));
    assert.equal(byGravidade.body.pagination.total, 2);
    assert.ok(byGravidade.body.items.every((item: { gravidade: string }) => item.gravidade === "leve"));
    assert.equal(byStatus.body.pagination.total, 3);
  });
});

test("PATCH /damages atualiza campos e desativa logicamente", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "DDD4D44");
    const created = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const updated = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, {
      descricao: "Amassado no capô",
      gravidade: "grave",
      custo_real: 1300,
    });
    const deactivated = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { is_active: false });
    const inactiveList = await requestJson(baseUrl, "/api/v1/damages?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.descricao, "Amassado no capô");
    assert.equal(updated.body.data.gravidade, "grave");
    assert.equal(updated.body.data.custoReal, 1300);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.id);
  });
});

test("[R5.1] máquina de estados: registrado->em_tratativa->resolvido; transição inválida = 422", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "EEE5E55");
    const created = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const skip = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "resolvido" });
    const step1 = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "em_tratativa" });
    const step2 = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "resolvido" });
    const backwards = await patch(baseUrl, seed.tenantA, seed.managerA, "manager", created.id, { status: "registrado" });

    assert.equal(skip.status, 422, JSON.stringify(skip.body));
    assert.equal(skip.body.error.code, "DAMAGE_INVALID");
    assert.equal(skip.body.error.reason, "invalid_status_transition");
    assert.equal(step1.status, 200, JSON.stringify(step1.body));
    assert.equal(step1.body.data.status, "em_tratativa");
    assert.equal(step2.status, 200, JSON.stringify(step2.body));
    assert.equal(step2.body.data.status, "resolvido");
    assert.equal(backwards.status, 422);
    assert.equal(backwards.body.error.reason, "invalid_status_transition");
  });
});

test("work_order_id: válido no mesmo tenant é aceito; cross-tenant retorna 400", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA9A99");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB9B99");
    const workOrderA = await createWorkOrder(baseUrl, seed.tenantA, seed.managerA);
    const workOrderB = await createWorkOrder(baseUrl, seed.tenantB, seed.managerB);

    const withValidWo = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: damageBody({ vehicle_id: vehicleA, work_order_id: workOrderA }),
    });
    const crossTenantWo = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: damageBody({ vehicle_id: vehicleA, work_order_id: workOrderB }),
    });
    const crossTenantVehicle = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: damageBody({ vehicle_id: vehicleB }),
    });

    assert.equal(withValidWo.status, 201, JSON.stringify(withValidWo.body));
    assert.equal(withValidWo.body.data.workOrderId, workOrderA);
    assert.equal(crossTenantWo.status, 400, JSON.stringify(crossTenantWo.body));
    assert.equal(crossTenantWo.body.error.reason, "invalid_work_order_reference");
    assert.equal(crossTenantVehicle.status, 400);
    assert.equal(crossTenantVehicle.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[validação] gravidade/descricao/vehicle_id ausentes retornam 400", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "RRR1R11");
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");

    const missingVehicle = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers,
      body: { data: DATA, gravidade: "leve", descricao: "x" },
    });
    const missingGravidade = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, data: DATA, descricao: "x" },
    });
    const missingDescricao = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers,
      body: { vehicle_id: vehicleId, data: DATA, gravidade: "leve" },
    });

    assert.equal(missingVehicle.status, 400);
    assert.equal(missingGravidade.status, 400);
    assert.equal(missingGravidade.body.error.reason, "required_field");
    assert.equal(missingDescricao.status, 400);
    assert.equal(missingDescricao.body.error.reason, "required_field");
  });
});

test("anexo: upload (DTO seguro, sem vazar storage) + lista + download bytes + delete", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "PPP1P11");
    const damage = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const upload = await requestMultipart(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      fileName: "../../evidence photo.png",
      mimeType: "image/png",
      content: tinyPng,
      marker: { x: "0.5", y: "0.25", description: "risco" },
    });

    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    assert.equal(upload.body.data.fileName, "evidence_photo.png");
    assert.equal(upload.body.data.mimeType, "image/png");
    assert.equal(upload.body.data.sizeBytes, tinyPng.length);
    assert.deepEqual(upload.body.data.marker, { x: 0.5, y: 0.25, description: "risco" });
    assert.equal(
      upload.body.data.downloadPath,
      `/api/v1/damages/${damage.id}/attachments/${upload.body.data.id}/download`,
    );

    // No storage internals leaked anywhere in the payload.
    const serialized = JSON.stringify(upload.body.data);
    assert.equal(upload.body.data.fileUrl, undefined);
    assert.equal(upload.body.data.storageKey, undefined);
    assert.equal(upload.body.data.storageProvider, undefined);
    assert.equal(serialized.includes("storageKey"), false);
    assert.equal(serialized.includes("local://checklist-attachments"), false);
    assert.equal(serialized.includes(storagePath), false);

    const list = await requestJson(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].id, upload.body.data.id);

    // Detail endpoint surfaces the same gallery.
    const detail = await requestJson(baseUrl, `/api/v1/damages/${damage.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.attachments.length, 1);

    const download = await fetch(
      `${baseUrl}/api/v1/damages/${damage.id}/attachments/${upload.body.data.id}/download`,
      { headers: authHeaders(seed.tenantA, seed.managerA, "manager") },
    );
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), tinyPng);

    const removed = await requestRaw(baseUrl, `/api/v1/damages/${damage.id}/attachments/${upload.body.data.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(removed.status, 204);
    const afterDelete = await requestJson(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(afterDelete.body.items.length, 0);
  });
});

test("anexo: mime não permitido retorna 415; excesso de tamanho retorna 413", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "MMM1M11");
    const damage = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const badMime = await requestMultipart(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      fileName: "notes.txt",
      mimeType: "text/plain",
      content: Buffer.from("plain text not allowed"),
    });
    const tooLarge = await requestMultipart(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      fileName: "large.png",
      mimeType: "image/png",
      content: Buffer.alloc(4096, 1),
    });

    assert.equal(badMime.status, 415, JSON.stringify(badMime.body));
    assert.equal(badMime.body.error.reason, "unsupported_media_type");
    assert.equal(tooLarge.status, 413, JSON.stringify(tooLarge.body));
    assert.equal(tooLarge.body.error.reason, "file_too_large");
  });
});

test("anexo: isolamento — dano de outro tenant retorna 404; download cross-tenant 404", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1B11");
    const damageA = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA });
    const upload = await requestMultipart(baseUrl, `/api/v1/damages/${damageA.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      fileName: "a.png",
      mimeType: "image/png",
      content: tinyPng,
    });
    assert.equal(upload.status, 201);

    const crossTenantUpload = await requestMultipart(baseUrl, `/api/v1/damages/${damageA.id}/attachments`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      fileName: "b.png",
      mimeType: "image/png",
      content: tinyPng,
    });
    const crossTenantDownload = await requestRaw(
      baseUrl,
      `/api/v1/damages/${damageA.id}/attachments/${upload.body.data.id}/download`,
      { headers: authHeaders(seed.tenantB, seed.managerB, "manager") },
    );

    assert.equal(crossTenantUpload.status, 404, JSON.stringify(crossTenantUpload.body));
    assert.equal(crossTenantDownload.status, 404);
  });
});

test("[isolamento] lista de B nunca contém itens de A; tenant_id forjado é ignorado; cross-tenant GET 404", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA2B22");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB2C33");
    await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA });
    await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA });
    await createDamage(baseUrl, seed.tenantB, seed.managerB, { vehicle_id: vehicleB });

    const forged = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: damageBody({ vehicle_id: vehicleA, tenant_id: seed.tenantB.id, tenantId: seed.tenantB.id }),
    });
    const fromForged = await requestJson(baseUrl, `/api/v1/damages/${forged.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    const listA = await requestJson(baseUrl, "/api/v1/damages", { headers: authHeaders(seed.tenantA, seed.managerA, "manager") });
    const listB = await requestJson(baseUrl, "/api/v1/damages", { headers: authHeaders(seed.tenantB, seed.managerB, "manager") });

    assert.equal(listA.body.pagination.total, 3, JSON.stringify(listA.body)); // 2 + forged (stays in A)
    assert.equal(listB.body.pagination.total, 1);
    assert.equal(forged.status, 201);
    assert.equal(fromForged.status, 404);
  });
});

test("[rbac] operator e field_technician registram (201); operator update 403; auditor cria 403; viewer/anon 403", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "OOO1O11");
    const existing = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const asOperator = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: damageBody({ vehicle_id: vehicleId }),
    });
    const asTech = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.techA, "field_technician"),
      body: damageBody({ vehicle_id: vehicleId }),
    });
    const operatorUpdate = await patch(baseUrl, seed.tenantA, seed.operatorA, "operator", existing.id, { status: "em_tratativa" });
    const auditorCreate = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
      body: damageBody({ vehicle_id: vehicleId }),
    });
    const viewerCreate = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: damageBody({ vehicle_id: vehicleId }),
    });
    const anonCreate = await requestJson(baseUrl, "/api/v1/damages", {
      method: "POST",
      body: damageBody({ vehicle_id: vehicleId }),
    });
    const operatorRead = await requestJson(baseUrl, "/api/v1/damages", {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const auditorRead = await requestJson(baseUrl, "/api/v1/damages", {
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
    });

    assert.equal(asOperator.status, 201, JSON.stringify(asOperator.body));
    assert.equal(asTech.status, 201, JSON.stringify(asTech.body));
    assert.equal(operatorUpdate.status, 403, JSON.stringify(operatorUpdate.body));
    assert.equal(auditorCreate.status, 403);
    assert.equal(viewerCreate.status, 403);
    assert.equal(anonCreate.status, 403);
    assert.equal(operatorRead.status, 200);
    assert.equal(auditorRead.status, 200);
  });
});

test("[rbac] upload permitido para registrante (operator); negado para leitura pura (auditor)", async () => {
  await withDamageApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "UUU1U11");
    const damage = await createDamage(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId });

    const operatorUpload = await requestMultipart(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      fileName: "op.png",
      mimeType: "image/png",
      content: tinyPng,
    });
    const auditorUpload = await requestMultipart(baseUrl, `/api/v1/damages/${damage.id}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
      fileName: "aud.png",
      mimeType: "image/png",
      content: tinyPng,
    });

    assert.equal(operatorUpload.status, 201, JSON.stringify(operatorUpload.body));
    assert.equal(auditorUpload.status, 403, JSON.stringify(auditorUpload.body));
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly financeA: User;
  readonly auditorA: User;
  readonly viewerA: User;
  readonly techA: User;
};

type DamageApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withDamageApi(callback: (context: DamageApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.CHECKLIST_STORAGE_PROVIDER = "local";
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = storagePath;
  process.env.CHECKLIST_STORAGE_MAX_FILE_SIZE_MB = "0.001";
  process.env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

  const [
    { createApp },
    { resetDamageRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { resetChecklistStorageProviderForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/damages/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetDamageRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetChecklistStorageProviderForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetDamageRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetChecklistStorageProviderForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Danos A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Danos B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "dmg-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "dmg-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "dmg-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "dmg-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "dmg-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "dmg-viewer-a@example.com", roles: ["viewer"] });
  const techA = service.createUser({ tenantId: tenantA.id, name: "Tech A", email: "dmg-tech-a@example.com", roles: ["field_technician"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, financeA, auditorA, viewerA, techA };
}

function damageBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    data: DATA,
    gravidade: "moderada",
    descricao: "Dano de teste",
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

async function createWorkOrder(baseUrl: string, tenant: Tenant, user: User): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: {
      title: "Atendimento de guincho",
      customerName: "Cliente Exemplo",
      serviceAddress: "Rua Exemplo, 123",
    },
  });

  assert.equal(created.status, 201, `work order creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

async function createDamage(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/damages", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: damageBody(body),
  });

  assert.equal(created.status, 201, `damage creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function patch(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/damages/${id}`, {
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

async function requestMultipart(
  baseUrl: string,
  routePath: string,
  options: {
    readonly headers: Record<string, string>;
    readonly fileName: string;
    readonly mimeType: string;
    readonly content: Buffer;
    readonly marker?: { readonly x: string; readonly y: string; readonly description?: string };
  },
) {
  const form = new FormData();
  if (options.marker) {
    form.set("x", options.marker.x);
    form.set("y", options.marker.y);
    if (options.marker.description) {
      form.set("description", options.marker.description);
    }
  }
  form.set("file", new Blob([options.content], { type: options.mimeType }), options.fileName);

  return requestRaw(baseUrl, routePath, {
    method: "POST",
    headers: options.headers,
    body: form,
  });
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  return requestRaw(baseUrl, routePath, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function requestRaw(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: BodyInit;
  } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    headers: response.headers,
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

async function removeStoragePath(options: { readonly throwOnFailure?: boolean } = {}): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await rm(storagePath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 10 || !["ENOTEMPTY", "EPERM", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        if (options.throwOnFailure === false) {
          return;
        }

        throw error;
      }

      await delay(100);
    }
  }
}
