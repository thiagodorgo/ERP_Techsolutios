import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-2a — origem/destino + campos dinâmicos por tipo. Cobre: 422 destination_required no create/update
// (lendo o tipo do catálogo), persistência conjunta de origem+destino, service_details por tipo, tipos que
// NÃO exigem destino, e a garantia §2.8 (service_details/access_code nunca no metadata de evento).

type TypeInfo = { readonly serviceType: string | null; readonly requiresDestination: boolean };

async function makeService() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");

  const reboqueId = randomUUID();
  const socorroId = randomUUID();
  const residencialId = randomUUID();
  const catalog: Record<string, TypeInfo> = {
    [reboqueId]: { serviceType: "reboque", requiresDestination: true },
    [socorroId]: { serviceType: "socorro", requiresDestination: false },
    [residencialId]: { serviceType: "residencial", requiresDestination: false },
  };

  const repository = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repository, {
    resolveServiceCatalog: async (_actor, id) => id in catalog,
    resolveServiceCatalogTypeInfo: async (_actor, id) => catalog[id] ?? null,
  });

  return { service, repository, reboqueId, socorroId, residencialId };
}

function actor(tenantId: string = randomUUID()) {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
}

function expect422DestinationRequired(error: unknown): true {
  const err = error as { statusCode?: number; reason?: string };
  assert.equal(err.statusCode, 422);
  assert.equal(err.reason, "destination_required");
  return true;
}

test("Ω3F-2a: CREATE de tipo que exige destino (reboque) sem destino → 422 destination_required", async () => {
  const { service, reboqueId } = await makeService();
  const manager = actor();

  await assert.rejects(
    () => service.create(manager, { title: "Reboque sem destino", serviceCatalogId: reboqueId }),
    expect422DestinationRequired,
  );
});

test("Ω3F-2a: CREATE persiste origem (service_*) e destino (destination_*) juntos", async () => {
  const { service, reboqueId } = await makeService();
  const manager = actor();

  const reboque = await service.create(manager, {
    title: "Reboque com destino",
    serviceCatalogId: reboqueId,
    serviceAddress: "Rua Origem, 100",
    serviceCity: "Curitiba",
    serviceLatitude: -25.4284,
    serviceLongitude: -49.2733,
    destinationAddress: "Rua Destino, 200",
    destinationCity: "Sao Jose dos Pinhais",
    destinationLatitude: -25.5,
    destinationLongitude: -49.2,
  });

  assert.equal(reboque.serviceAddress, "Rua Origem, 100");
  assert.equal(reboque.serviceCity, "Curitiba");
  assert.equal(reboque.serviceLatitude, -25.4284);
  assert.equal(reboque.destinationAddress, "Rua Destino, 200");
  assert.equal(reboque.destinationCity, "Sao Jose dos Pinhais");
  assert.equal(reboque.destinationLatitude, -25.5);
  assert.equal(reboque.destinationLongitude, -49.2);
});

test("Ω3F-2a: CREATE persiste service_details por tipo (socorro {plate,vehicle,color})", async () => {
  const { service, socorroId } = await makeService();
  const manager = actor();

  const socorro = await service.create(manager, {
    title: "Socorro mecanico",
    serviceCatalogId: socorroId,
    service_details: { plate: "ABC1D23", vehicle: "VW Gol", color: "Prata" },
  });

  assert.deepEqual(socorro.serviceDetails, { plate: "ABC1D23", vehicle: "VW Gol", color: "Prata" });
});

test("Ω3F-2a: tipo com requires_destination=false (socorro/residencial) NÃO dispara 422 sem destino", async () => {
  const { service, socorroId, residencialId } = await makeService();
  const manager = actor();

  const socorro = await service.create(manager, { title: "Socorro", serviceCatalogId: socorroId });
  const residencial = await service.create(manager, {
    title: "Chaveiro residencial",
    serviceCatalogId: residencialId,
    service_details: { access_code: "1234", object: "Fechadura", description: "Porta emperrada" },
  });

  assert.equal(socorro.status, "open");
  assert.equal(residencial.status, "open");
  assert.equal(socorro.destinationAddress, undefined);
});

test("Ω3F-2a: service_details inválido (não-objeto/array) → 422 invalid_service_details", async () => {
  const { service, socorroId } = await makeService();
  const manager = actor();

  await assert.rejects(
    () => service.create(manager, { title: "Socorro", serviceCatalogId: socorroId, service_details: "senha=1234" }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_service_details");
      return true;
    },
  );
  await assert.rejects(
    () => service.create(manager, { title: "Socorro", serviceCatalogId: socorroId, service_details: ["a", "b"] }),
    /service_details/,
  );
});

test("Ω3F-2a: UPDATE lê o tipo PERSISTIDO — apagar destino de OS que exige → 422; update parcial não dispara", async () => {
  const { service, reboqueId } = await makeService();
  const manager = actor();

  const reboque = await service.create(manager, {
    title: "Reboque",
    serviceCatalogId: reboqueId,
    destinationAddress: "Rua Destino, 1",
  });

  // Apagar o destino (corpo menciona destino, mas vazio) → 422, lendo o service_catalog_id persistido.
  await assert.rejects(
    () => service.update(manager, reboque.id, { destinationAddress: "" }),
    expect422DestinationRequired,
  );

  // Update parcial que não toca em destino não dispara a regra (destino persistido continua válido).
  const updated = await service.update(manager, reboque.id, { title: "Reboque atualizado" });
  assert.equal(updated.title, "Reboque atualizado");
  assert.equal(updated.destinationAddress, "Rua Destino, 1");
});

test("Ω3F-2a §2.8: service_details/access_code NUNCA aparecem no metadata dos eventos", async () => {
  const { service, repository, residencialId } = await makeService();
  const manager = actor();
  const secret = "SENHA-PORTARIA-9999";

  const os = await service.create(manager, {
    title: "Chamado residencial",
    serviceCatalogId: residencialId,
    service_details: { access_code: secret, object: "Portao eletronico", description: "Travado" },
  });
  // service_details volta no domínio (payload funcional que o operador vê).
  assert.deepEqual(os.serviceDetails, { access_code: secret, object: "Portao eletronico", description: "Travado" });

  await service.update(manager, os.id, { service_details: { access_code: secret, note: "reforcar" } });

  const timeline = await repository.listTimeline(manager.tenantId, os.id);
  const created = timeline.find((event) => event.eventType === "work_order_created");
  const updated = timeline.find((event) => event.eventType === "work_order_updated");
  assert.ok(created);
  assert.ok(updated);

  // Metadata do create é exatamente {code, priority} — nada de service_details/access_code.
  assert.deepEqual(created.metadata, { code: os.code, priority: os.priority });
  // O segredo (senha de acesso) nunca aparece no JSON de nenhum metadata de evento.
  assert.equal(JSON.stringify(created.metadata).includes(secret), false);
  assert.equal(JSON.stringify(updated.metadata).includes(secret), false);
  assert.equal(JSON.stringify(created.metadata).includes("access_code"), false);
});

test("Ω3F-2a (furo #2): apagar só o endereço de OS reboque com destino por PIN NÃO dispara 422 (pin intacto)", async () => {
  const { service, reboqueId } = await makeService();
  const manager = actor();

  // destino só por coordenada (pin) — hasDestination aceita coordenada válida.
  const os = await service.create(manager, {
    title: "Reboque com pin",
    serviceCatalogId: reboqueId,
    destinationLatitude: -25.5,
    destinationLongitude: -49.2,
  });

  // limpa só o endereço (que nunca existiu); o corpo NÃO toca lat/long → o pin persistido continua
  // valendo no merge por-campo → sem 422 e sem perder o pin.
  const updated = await service.update(manager, os.id, { destinationAddress: "", destinationCity: "" });
  assert.equal(updated.destinationLatitude, -25.5);
  assert.equal(updated.destinationLongitude, -49.2);
});

test("Ω3F-2a (furo #2b): OS legada sem destino em catálogo que passa a exigir — edição que NÃO toca destino não trava", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");

  const svcId = randomUUID();
  const flag = { requiresDestination: false };
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {
    resolveServiceCatalog: async (_actor, id) => id === svcId,
    resolveServiceCatalogTypeInfo: async (_actor, id) =>
      id === svcId ? { serviceType: "reboque", requiresDestination: flag.requiresDestination } : null,
  });
  const manager = actor();

  // criada quando o catálogo NÃO exigia destino (legado)
  const os = await service.create(manager, { title: "Legada sem destino", serviceCatalogId: svcId });
  // o dono liga requires_destination no catálogo depois
  flag.requiresDestination = true;

  // editar o título (não toca destino) NÃO deve 422 — senão a OS legada fica congelada
  const updated = await service.update(manager, os.id, { title: "Corrige typo" });
  assert.equal(updated.title, "Corrige typo");
  assert.equal(updated.destinationAddress, undefined);
});

test("Ω3F-2a (obs 1): destino 'lixo' (só cidade, sem endereço nem coordenada) NÃO satisfaz o 422 do reboque", async () => {
  const { service, reboqueId } = await makeService();
  const manager = actor();

  await assert.rejects(
    () => service.create(manager, { title: "Reboque", serviceCatalogId: reboqueId, destinationCity: "Curitiba" }),
    expect422DestinationRequired,
  );
});

test("Ω3F-2a: wiring padrão (createDefaultReferenceResolvers) lê requires_destination do catálogo em memória", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const woMod = await import("../src/modules/work-orders/index.js");
  const scMod = await import("../src/modules/service-catalog/index.js");
  woMod.resetWorkOrderRuntimeForTests();
  scMod.resetServiceCatalogRuntimeForTests();

  const catalogService = scMod.createMemoryServiceCatalogService();
  const workOrders = woMod.createMemoryWorkOrderService();
  const manager = actor();

  try {
    const reboque = await catalogService.create(manager, {
      name: `Reboque ${randomUUID()}`,
      service_type: "reboque",
      requires_destination: true,
    });

    // O resolver padrão lê o catálogo (mesmo singleton de memória) e aplica o 422.
    await assert.rejects(
      () => workOrders.create(manager, { title: "OS reboque", serviceCatalogId: reboque.id }),
      expect422DestinationRequired,
    );

    const ok = await workOrders.create(manager, {
      title: "OS reboque ok",
      serviceCatalogId: reboque.id,
      destinationAddress: "Rua Destino real, 1",
    });
    assert.equal(ok.destinationAddress, "Rua Destino real, 1");
    assert.equal(ok.serviceCatalogId, reboque.id);
  } finally {
    woMod.resetWorkOrderRuntimeForTests();
    scMod.resetServiceCatalogRuntimeForTests();
  }
});
