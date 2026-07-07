import assert from "node:assert/strict";
import test from "node:test";

test("vehicles adapter normaliza envelope de lista com paginacao", async () => {
  const { adaptVehiclesResponse } = await import("../src/modules/registry/vehicles/vehicles.adapter");

  const data = adaptVehiclesResponse({
    data: {
      items: [
        {
          id: "veh-1",
          plate: "RTA1B23",
          model: "Volkswagen Constellation",
          type: "Guincho pesado",
          year: 2020,
          status: "active",
          is_active: true,
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-02T10:00:00.000Z",
        },
        {
          id: "",
          plate: "SEM1D00",
          model: "Sem identificador",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1);
  assert.equal(data.source, "api");
  assert.equal(data.items[0].plate, "RTA1B23");
  assert.equal(data.items[0].model, "Volkswagen Constellation");
  assert.equal(data.items[0].type, "Guincho pesado");
  assert.equal(data.items[0].year, 2020);
  assert.equal(data.items[0].isActive, true);
  assert.equal(data.pagination.total, 1);
  assert.equal(data.pagination.limit, 20);
});

test("vehicles adapter normaliza recurso unico e tolera campos ausentes", async () => {
  const { adaptVehicleResponse } = await import("../src/modules/registry/vehicles/vehicles.adapter");

  const vehicle = adaptVehicleResponse({ data: { id: "veh-2", plate: "MIN2C34", model: "Viatura Mínima" } });

  assert.ok(vehicle);
  assert.equal(vehicle?.id, "veh-2");
  assert.equal(vehicle?.plate, "MIN2C34");
  assert.equal(vehicle?.model, "Viatura Mínima");
  assert.equal(vehicle?.type, null);
  assert.equal(vehicle?.year, null);
  assert.equal(vehicle?.notes, null);
  // status default "active" e isActive default true quando o backend nao envia.
  assert.equal(vehicle?.status, "active");
  assert.equal(vehicle?.isActive, true);
  assert.equal(typeof vehicle?.createdAt, "string");
});

test("vehicles adapter mapeia isActive=false, year string e camelCase", async () => {
  const { adaptVehicleResponse } = await import("../src/modules/registry/vehicles/vehicles.adapter");

  const vehicle = adaptVehicleResponse({
    data: { id: "veh-3", plate: "OFF3D45", model: "Viatura Inativa", isActive: false, year: "2018" },
  });

  assert.equal(vehicle?.isActive, false);
  assert.equal(vehicle?.year, 2018);
});

test("vehicles adapter retorna lista vazia quando nao ha itens", async () => {
  const { adaptVehiclesResponse } = await import("../src/modules/registry/vehicles/vehicles.adapter");

  const data = adaptVehiclesResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");

  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");
});

test("vehicles adapter valida obrigatorio, limites e filtra por situacao/busca", async () => {
  const { validateVehicle, filterVehicles } = await import("../src/modules/registry/vehicles/vehicles.adapter");

  const errors = validateVehicle({ plate: "", model: "", year: 1800 });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("plate"));
  assert.ok(fields.includes("model"));
  assert.ok(fields.includes("year"));

  assert.equal(validateVehicle({ plate: "RTA1B23", model: "Constellation", year: 2022 }).length, 0);

  const base = {
    type: null,
    year: null,
    status: "active",
    notes: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const items = [
    { ...base, id: "a", plate: "AAA1A11", model: "Constellation", type: "Guincho", isActive: true },
    { ...base, id: "b", plate: "BBB2B22", model: "Atego", type: "Prancha", isActive: false },
  ];

  assert.equal(filterVehicles(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterVehicles(items, { search: "atego", isActive: "all" })[0].id, "b");
  assert.equal(filterVehicles(items, { search: "aaa1a11", isActive: "inactive" }).length, 0);
});
