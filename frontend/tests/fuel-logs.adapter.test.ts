import assert from "node:assert/strict";
import test from "node:test";

import type { FuelLog } from "../src/modules/fleet/fuel/fuel-logs.types";

function makeLog(partial: Partial<FuelLog> & Pick<FuelLog, "id" | "vehicleId">): FuelLog {
  return {
    operatorId: null,
    workOrderId: null,
    fueledAt: "2026-06-01T10:00:00.000Z",
    fuelType: "diesel",
    liters: 10,
    totalValue: 60,
    odometer: 1000,
    station: null,
    notes: null,
    isActive: true,
    kmPerLiter: null,
    distanceKm: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

test("fuel-logs adapter normaliza envelope de lista, snake_case e derivados", async () => {
  const { adaptFuelLogsResponse } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const data = adaptFuelLogsResponse({
    data: {
      items: [
        {
          id: "fl-1",
          vehicle_id: "veh-1",
          operator_id: "op-1",
          fueled_at: "2026-06-02T08:30:00.000Z",
          fuel_type: "diesel_s10",
          liters: 58.5,
          total_value: 312.9,
          odometer: 120500,
          station: "Posto Central",
          is_active: true,
          km_per_liter: 9.8,
          distance_km: 573.3,
          created_at: "2026-06-02T08:30:00.000Z",
        },
        { id: "", vehicle_id: "veh-x", liters: 10 },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linha sem id é descartada
  assert.equal(data.source, "api");
  const log = data.items[0];
  assert.equal(log.vehicleId, "veh-1");
  assert.equal(log.operatorId, "op-1");
  assert.equal(log.fuelType, "diesel_s10");
  assert.equal(log.liters, 58.5);
  assert.equal(log.totalValue, 312.9);
  assert.equal(log.odometer, 120500);
  assert.equal(log.kmPerLiter, 9.8);
  assert.equal(log.distanceKm, 573.3);
  assert.equal(data.pagination.total, 1);
});

test("fuel-logs adapter: km/L derivado passa direto e baseline vira '—'", async () => {
  const { adaptFuelLogResponse, formatKmPerLiter } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const derived = adaptFuelLogResponse({ data: { id: "fl-2", vehicleId: "veh-1", kmPerLiter: 12.34, distanceKm: 123.4 } });
  assert.equal(derived?.kmPerLiter, 12.34);

  // Baseline (1º abastecimento): sem odômetro anterior → kmPerLiter null.
  const baseline = adaptFuelLogResponse({ data: { id: "fl-3", vehicleId: "veh-1" } });
  assert.equal(baseline?.kmPerLiter, null);
  assert.equal(baseline?.distanceKm, null);

  assert.equal(formatKmPerLiter(null), "—");
  assert.equal(formatKmPerLiter(undefined), "—");
  assert.match(formatKmPerLiter(9.8), /9,80/);
});

test("fuel-logs adapter: moeda/número pt-BR e totais agregados reais", async () => {
  const { formatBRL, formatLiters, parsePtBrNumber, parseIntStrict, computeFuelTotals } = await import(
    "../src/modules/fleet/fuel/fuel-logs.adapter"
  );

  assert.match(formatBRL(312.9), /R\$/);
  assert.match(formatLiters(58.5), /58,50 L/);

  assert.equal(parsePtBrNumber("1.234,56"), 1234.56);
  assert.equal(parsePtBrNumber("58,5"), 58.5);
  assert.equal(parsePtBrNumber(""), undefined);
  assert.equal(parseIntStrict("120500"), 120500);
  assert.equal(parseIntStrict("12,5"), undefined);

  const totals = computeFuelTotals([
    makeLog({ id: "a1", vehicleId: "A", liters: 10, totalValue: 60, distanceKm: 100, kmPerLiter: 10 }),
    makeLog({ id: "b1", vehicleId: "B", liters: 10, totalValue: 70, distanceKm: 120, kmPerLiter: 12 }),
    makeLog({ id: "b0", vehicleId: "B", liters: 20, totalValue: 130, distanceKm: null, kmPerLiter: null }), // baseline não conta na eficiência
  ]);
  assert.equal(totals.count, 3);
  assert.equal(totals.totalLiters, 40);
  assert.equal(totals.totalValue, 260);
  assert.equal(totals.vehiclesWithEfficiency, 2);
  assert.equal(totals.fleetKmPerL, 11); // média das médias por viatura: (10 + 12) / 2
});

test("fuel-logs adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptFuelLogsResponse } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const data = adaptFuelLogsResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta sem itens/paginação também degrada para lista vazia sem lançar.
  const bare = adaptFuelLogsResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("fuel-logs adapter: validação de obrigatórios e 422 odometer_regressive", async () => {
  const { validateFuelLog, interpretFuelLogSubmitError, ODOMETER_REGRESSIVE_MESSAGE } = await import(
    "../src/modules/fleet/fuel/fuel-logs.adapter"
  );

  const errors = validateFuelLog({ vehicleId: "", fueledAt: "", fuelType: "invalido", liters: 0, totalValue: -1, odometer: 1.5 });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("vehicleId"));
  assert.ok(fields.includes("fueledAt"));
  assert.ok(fields.includes("fuelType"));
  assert.ok(fields.includes("liters"));
  assert.ok(fields.includes("totalValue"));
  assert.ok(fields.includes("odometer"));

  assert.equal(
    validateFuelLog({ vehicleId: "veh-1", fueledAt: "2026-06-01T10:00:00.000Z", fuelType: "diesel", liters: 58.5, totalValue: 312.9, odometer: 120500 }).length,
    0,
  );

  // km/L nunca é campo de formulário — não existe no rascunho validado.
  const feedback = interpretFuelLogSubmitError({ status: 422, name: "ApiError", message: "Não foi possível concluir a operação." });
  assert.equal(feedback.field, "odometer");
  assert.equal(feedback.message, ODOMETER_REGRESSIVE_MESSAGE);

  const generic = interpretFuelLogSubmitError(new Error("Falha genérica"));
  assert.equal(generic.field, undefined);
  assert.equal(generic.message, "Falha genérica");
});

test("fuel-logs adapter: filtro por viatura, período, situação e busca", async () => {
  const { filterFuelLogs } = await import("../src/modules/fleet/fuel/fuel-logs.adapter");

  const items = [
    makeLog({ id: "1", vehicleId: "A", fueledAt: "2026-06-01T10:00:00.000Z", station: "Ipiranga", isActive: true }),
    makeLog({ id: "2", vehicleId: "B", fueledAt: "2026-06-15T10:00:00.000Z", station: "Shell", isActive: false }),
    makeLog({ id: "3", vehicleId: "A", fueledAt: "2026-07-01T10:00:00.000Z", station: "BR", isActive: true }),
  ];

  assert.deepEqual(filterFuelLogs(items, { search: "", isActive: "all", vehicleId: "A" }).map((l) => l.id), ["1", "3"]);
  assert.deepEqual(filterFuelLogs(items, { search: "", isActive: "inactive" }).map((l) => l.id), ["2"]);
  assert.deepEqual(
    filterFuelLogs(items, { search: "", isActive: "all", from: "2026-06-10", to: "2026-06-30" }).map((l) => l.id),
    ["2"],
  );
  assert.deepEqual(filterFuelLogs(items, { search: "shell", isActive: "all" }).map((l) => l.id), ["2"]);

  const resolveVehicleName = (id: string) => (id === "A" ? "RTA1B23 Constellation" : undefined);
  assert.deepEqual(filterFuelLogs(items, { search: "rta1b23", isActive: "all", resolveVehicleName }).map((l) => l.id), ["1", "3"]);
});
