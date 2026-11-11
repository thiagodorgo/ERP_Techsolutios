import assert from "node:assert/strict";
import test from "node:test";

// Ω3F-2b — form de OS dirigido pelo tipo do serviço (#23/#24): o adapter do catálogo carrega o
// discriminador (service_type/requires_destination), o validador espelha o 422 destination_required
// (backend é a autoridade) e buildServiceDetails monta o objeto plano só com valores preenchidos.

test("adapter do catálogo carrega serviceType/requiresDestination (snake e camel); legado degrada p/ null/false", async () => {
  const { adaptServiceItemResponse } = await import("../src/modules/registry/service-catalog/service-catalog.adapter");

  const snake = adaptServiceItemResponse({ data: { id: "svc-1", name: "Reboque", service_type: "reboque", requires_destination: true } });
  assert.ok(snake);
  assert.equal(snake.serviceType, "reboque");
  assert.equal(snake.requiresDestination, true);

  const camel = adaptServiceItemResponse({ data: { id: "svc-2", name: "Socorro", serviceType: "socorro", requiresDestination: false } });
  assert.ok(camel);
  assert.equal(camel.serviceType, "socorro");
  assert.equal(camel.requiresDestination, false);

  // Catálogo legado (sem discriminador): nunca exige destino.
  const legacy = adaptServiceItemResponse({ data: { id: "svc-3", name: "Antigo" } });
  assert.ok(legacy);
  assert.equal(legacy.serviceType, null);
  assert.equal(legacy.requiresDestination, false);
});

test("validateWorkOrderForm: tipo que exige destino sem destino → erro; com endereço OU pin válido → ok", async () => {
  const { validateWorkOrderForm } = await import("../src/modules/work-orders/work-orders.adapter");
  const base = { title: "Reboque", priority: "medium" };

  const missing = validateWorkOrderForm({ ...base, requiresDestination: true });
  assert.ok(missing.some((error) => error.includes("destino")));

  const withAddress = validateWorkOrderForm({ ...base, requiresDestination: true, destinationAddress: "Rua Destino, 1" });
  assert.equal(withAddress.length, 0);

  const withPin = validateWorkOrderForm({ ...base, requiresDestination: true, destinationLatitude: "-25.5", destinationLongitude: "-49.2" });
  assert.equal(withPin.length, 0);
});

test("validateWorkOrderForm: pin 0/0 (sentinela) NÃO satisfaz o destino; coordenada de destino inválida acusa", async () => {
  const { validateWorkOrderForm } = await import("../src/modules/work-orders/work-orders.adapter");
  const base = { title: "Reboque", priority: "medium" };

  const nullIsland = validateWorkOrderForm({ ...base, requiresDestination: true, destinationLatitude: "0", destinationLongitude: "0" });
  assert.ok(nullIsland.some((error) => error.includes("destino")));

  const badLat = validateWorkOrderForm({ ...base, destinationLatitude: "999", destinationLongitude: "-49.2" });
  assert.ok(badLat.some((error) => error.includes("Latitude do destino")));
});

test("validateWorkOrderForm: tipo sem exigência de destino não acusa nada (retrocompat)", async () => {
  const { validateWorkOrderForm } = await import("../src/modules/work-orders/work-orders.adapter");
  const errors = validateWorkOrderForm({ title: "Socorro", priority: "high", requiresDestination: false });
  assert.equal(errors.length, 0);
});

test("buildServiceDetails: só valores preenchidos entram; tudo vazio → undefined", async () => {
  const { buildServiceDetails } = await import("../src/modules/work-orders/work-orders.adapter");

  const socorro = buildServiceDetails({ plate: " ABC1D23 ", vehicle: "VW Gol", color: "" });
  assert.deepEqual(socorro, { plate: "ABC1D23", vehicle: "VW Gol" });

  const residencial = buildServiceDetails({ access_code: "1234", object: "Fechadura", description: "  " });
  assert.deepEqual(residencial, { access_code: "1234", object: "Fechadura" });

  assert.equal(buildServiceDetails({ plate: "", vehicle: " " }), undefined);
  assert.equal(buildServiceDetails({}), undefined);
});

// B-SAN3-26 (item 53; decisão B do dono e emenda E-04) — a placa do veículo atendido na criação, para todo tipo que
// atende veículo (o guincheiro confirma os 2 últimos dígitos no "No local"); só o residencial não tem o campo.
test("B-SAN3-26: o campo de placa aparece para reboque, outro, sem tipo e sem serviço; o residencial não tem", async () => {
  const { showsVehiclePlateField } = await import("../src/modules/work-orders/components/WorkOrderForm");
  for (const tipo of ["reboque", "outro", "socorro", "", null]) {
    assert.equal(showsVehiclePlateField(tipo), true, JSON.stringify(tipo));
  }
  assert.equal(showsVehiclePlateField("residencial"), false);
});

test("B-SAN3-26: a placa vai em service_details.plate no POST de reboque, outro, sem tipo e sem serviço", async () => {
  const { serviceDetailsInputFor } = await import("../src/modules/work-orders/components/WorkOrderForm");
  const { buildServiceDetails } = await import("../src/modules/work-orders/work-orders.adapter");
  const campos = {
    detailPlate: "ABC1D23",
    detailVehicle: "Gol",
    detailColor: "Prata",
    detailAccessCode: "1234",
    detailObject: "Porta",
    detailDescription: "Trancada",
  };
  for (const tipo of ["reboque", "outro", "", null]) {
    assert.deepEqual(buildServiceDetails(serviceDetailsInputFor(tipo, campos)), { plate: "ABC1D23" }, JSON.stringify(tipo));
  }
  assert.deepEqual(buildServiceDetails(serviceDetailsInputFor("socorro", campos)), { plate: "ABC1D23", vehicle: "Gol", color: "Prata" });
  // O residencial segue com os campos dele, sem placa.
  assert.deepEqual(buildServiceDetails(serviceDetailsInputFor("residencial", campos)), { access_code: "1234", object: "Porta", description: "Trancada" });
  // Sem placa digitada, nada vai (o servidor trata a OS como sem placa: a base registra a chegada).
  assert.equal(buildServiceDetails(serviceDetailsInputFor("reboque", { ...campos, detailPlate: "" })), undefined);
});
