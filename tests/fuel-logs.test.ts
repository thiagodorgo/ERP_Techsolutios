import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { computeEfficiency } from "../src/modules/fuel-logs/fuel-log.efficiency.js";
import { InMemoryFuelLogRepository } from "../src/modules/fuel-logs/fuel-log.repository.js";
import {
  FuelLogService,
  type FuelLogReferenceResolvers,
} from "../src/modules/fuel-logs/fuel-log.service.js";
import type { FuelLog, FuelLogActorContext } from "../src/modules/fuel-logs/fuel-log.types.js";
import {
  parseFuelType,
  parseLiters,
  parseOdometer,
  parseStationType,
} from "../src/modules/fuel-logs/fuel-log.validators.js";

const TENANT = randomUUID();
const USER = randomUUID();
const VEHICLE_V = randomUUID();
const VEHICLE_W = randomUUID();
const SUPPLIER_S = randomUUID();

const actor: FuelLogActorContext = {
  tenantId: TENANT,
  userId: USER,
  roles: [],
  permissions: [],
};

function makeLog(overrides: Partial<FuelLog> & Pick<FuelLog, "id" | "vehicleId" | "fueledAt" | "odometer" | "liters">): FuelLog {
  return {
    tenantId: TENANT,
    operatorId: undefined,
    workOrderId: undefined,
    fuelType: "gasolina",
    totalValue: 0,
    station: undefined,
    stationType: "external",
    supplierId: undefined,
    notes: undefined,
    isActive: true,
    createdBy: undefined,
    updatedBy: undefined,
    createdAt: overrides.fueledAt,
    updatedAt: overrides.fueledAt,
    ...overrides,
  };
}

test("[R1.1] computeEfficiency: baseline (primeiro) sem eficiencia, derivada nos seguintes", () => {
  const first = makeLog({ id: "a", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-01T00:00:00Z"), odometer: 1000, liters: 40 });
  const second = makeLog({ id: "b", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-05T00:00:00Z"), odometer: 1400, liters: 40 });
  const history = [first, second];

  assert.deepEqual(computeEfficiency(first, history), { kmPerLiter: null, distanceKm: null });
  assert.deepEqual(computeEfficiency(second, history), { kmPerLiter: 10, distanceKm: 400 });
});

test("[R1.1] computeEfficiency: eficiencia isolada por viatura", () => {
  const v1 = makeLog({ id: "v1", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-01T00:00:00Z"), odometer: 100, liters: 10 });
  const v2 = makeLog({ id: "v2", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-02T00:00:00Z"), odometer: 250, liters: 10 });
  const w1 = makeLog({ id: "w1", vehicleId: VEHICLE_W, fueledAt: new Date("2026-07-01T00:00:00Z"), odometer: 9000, liters: 20 });

  // Only same-vehicle history anchors the distance; w1 must not affect v2.
  assert.deepEqual(computeEfficiency(v2, [v1, v2]), { kmPerLiter: 15, distanceKm: 150 });
  assert.deepEqual(computeEfficiency(w1, [w1]), { kmPerLiter: null, distanceKm: null });
});

test("[R1.1] computeEfficiency: predecessor inativo (fora do conjunto filtrado) ainda ancora a distancia", () => {
  const previous = makeLog({ id: "p", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-01T00:00:00Z"), odometer: 500, liters: 10, isActive: false });
  const target = makeLog({ id: "t", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-03T00:00:00Z"), odometer: 800, liters: 10 });

  // Full history (active + inactive) yields the true previous odometer.
  assert.deepEqual(computeEfficiency(target, [previous, target]), { kmPerLiter: 30, distanceKm: 300 });
});

test("[RN-ABA-04] computeEfficiency: Delta<=0 devolve '—' (null), nunca KM/L negativo/fabricado", () => {
  const first = makeLog({ id: "a", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-01T00:00:00Z"), odometer: 1400, liters: 40 });
  // Odometro REGREDIU (Delta < 0, ex.: correcao via "desconsiderar ultimo KM"): honesto null/null.
  const regressed = makeLog({ id: "b", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-05T00:00:00Z"), odometer: 1000, liters: 40 });
  // Odometro IGUAL (Delta = 0): tambem sem consumo derivavel.
  const flat = makeLog({ id: "c", vehicleId: VEHICLE_V, fueledAt: new Date("2026-07-10T00:00:00Z"), odometer: 1400, liters: 40 });

  assert.deepEqual(computeEfficiency(regressed, [first, regressed]), { kmPerLiter: null, distanceKm: null });
  assert.deepEqual(computeEfficiency(flat, [first, flat]), { kmPerLiter: null, distanceKm: null });
});

test("[validacao] parseStationType normaliza caixa, default external e rejeita invalido", () => {
  assert.equal(parseStationType(undefined, "external"), "external");
  assert.equal(parseStationType("INTERNAL", "external"), "internal");
  assert.equal(parseStationType("external", undefined), "external");
  assert.throws(() => parseStationType("posto", "external"), /station_type must be one of/);
  assert.throws(() => parseStationType(undefined, undefined), /station_type is required/);
});

test("[RN-ABA-01] EXTERNO explicito sem fornecedor retorna 422 supplier_required_for_external", async () => {
  const service = buildService();

  await assert.rejects(
    () => service.create(actor, { vehicle_id: VEHICLE_V, station_type: "external", liters: 40, total_value: 200, odometer: 100 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "supplier_required_for_external");
      return true;
    },
  );
});

test("[RN-ABA-01] INTERNO com fornecedor retorna 422 supplier_not_allowed_for_internal", async () => {
  const service = buildService();

  await assert.rejects(
    () =>
      service.create(actor, {
        vehicle_id: VEHICLE_V,
        station_type: "internal",
        supplier_id: SUPPLIER_S,
        liters: 40,
        total_value: 200,
        odometer: 100,
      }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "supplier_not_allowed_for_internal");
      return true;
    },
  );
});

test("[RN-ABA-02] EXTERNO com fornecedor de outro tenant retorna 400 invalid_supplier_reference", async () => {
  const service = buildService();

  await assert.rejects(
    () =>
      service.create(actor, {
        vehicle_id: VEHICLE_V,
        station_type: "external",
        supplier_id: randomUUID(),
        liters: 40,
        total_value: 200,
        odometer: 100,
      }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_supplier_reference");
      return true;
    },
  );
});

test("[RN-ABA-01/02] EXTERNO com fornecedor valido cria e expoe supplierId + supplierName (label)", async () => {
  const service = buildService();
  const entry = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "external",
    supplier_id: SUPPLIER_S,
    liters: 40,
    total_value: 200,
    odometer: 100,
  });

  assert.equal(entry.fuelLog.stationType, "external");
  assert.equal(entry.fuelLog.supplierId, SUPPLIER_S);
  assert.equal(entry.supplierName, "Posto Rede S");
});

test("[RN-ABA-01] INTERNO cria sem fornecedor e apenas marca o log (sem movimento de estoque)", async () => {
  const service = buildService();
  const entry = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    liters: 40,
    total_value: 200,
    odometer: 100,
  });

  assert.equal(entry.fuelLog.stationType, "internal");
  assert.equal(entry.fuelLog.supplierId, undefined);
  assert.equal(entry.supplierName, undefined);
});

test("[compat] sem station_type no corpo cai em external e NAO exige fornecedor", async () => {
  const service = buildService();
  const entry = await service.create(actor, { vehicle_id: VEHICLE_V, liters: 40, total_value: 200, odometer: 100 });

  assert.equal(entry.fuelLog.stationType, "external");
  assert.equal(entry.fuelLog.supplierId, undefined);
});

test("[RN-ABA-05] ignore_previous_odometer bypassa o guard monotonico; KM/L fica honesto '—' se Delta<=0", async () => {
  const service = buildService();
  await service.create(actor, { vehicle_id: VEHICLE_V, fueled_at: "2026-07-01T00:00:00Z", liters: 40, total_value: 200, odometer: 1400 });

  // Sem a flag, odometro regressivo -> 422 (comportamento preservado).
  await assert.rejects(
    () => service.create(actor, { vehicle_id: VEHICLE_V, liters: 40, total_value: 200, odometer: 1000 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "odometer_regressive");
      return true;
    },
  );

  // Com a flag, cria; e o KM/L nao e fabricado (Delta = 1000-1400 <= 0 -> null).
  const bypassed = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    fueled_at: "2026-07-05T00:00:00Z",
    ignore_previous_odometer: true,
    liters: 40,
    total_value: 200,
    odometer: 1000,
  });

  assert.equal(bypassed.fuelLog.odometer, 1000);
  assert.equal(bypassed.kmPerLiter, null);
  assert.equal(bypassed.distanceKm, null);
});

test("[validacao] parseFuelType default gasolina, normaliza caixa e rejeita invalido", () => {
  assert.equal(parseFuelType(undefined, "gasolina"), "gasolina");
  assert.equal(parseFuelType("DIESEL_S10", "gasolina"), "diesel_s10");
  assert.throws(() => parseFuelType("querosene", "gasolina"), /fuel_type must be one of/);
});

test("[validacao] parseLiters rejeita <= 0 e parseOdometer rejeita nao-inteiro/negativo", () => {
  assert.equal(parseLiters(42.5), 42.5);
  assert.throws(() => parseLiters(0), /liters must be greater than zero/);
  assert.throws(() => parseLiters(-1), /liters must be greater than zero/);
  assert.equal(parseOdometer(1200), 1200);
  assert.throws(() => parseOdometer(12.5), /odometer must be a non-negative integer/);
  assert.throws(() => parseOdometer(-1), /odometer must be a non-negative integer/);
});

test("[R1.2] service.create bloqueia odometro regressivo com 422 odometer_regressive", async () => {
  const service = buildService();
  await service.create(actor, { vehicle_id: VEHICLE_V, liters: 40, total_value: 200, odometer: 1400 });

  await assert.rejects(
    () => service.create(actor, { vehicle_id: VEHICLE_V, liters: 40, total_value: 200, odometer: 1200 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "odometer_regressive");
      return true;
    },
  );
});

test("service.create rejeita vehicle_id que o resolver nao reconhece (400 invalid_vehicle_reference)", async () => {
  const service = buildService();

  await assert.rejects(
    () => service.create(actor, { vehicle_id: randomUUID(), liters: 40, total_value: 200, odometer: 100 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_vehicle_reference");
      return true;
    },
  );
});

test("service.list deriva km/L por viatura a partir do conjunto ordenado", async () => {
  const service = buildService();
  await service.create(actor, { vehicle_id: VEHICLE_V, fueled_at: "2026-07-01T00:00:00Z", liters: 40, total_value: 200, odometer: 1000 });
  await service.create(actor, { vehicle_id: VEHICLE_V, fueled_at: "2026-07-05T00:00:00Z", liters: 40, total_value: 200, odometer: 1400 });
  await service.create(actor, { vehicle_id: VEHICLE_W, fueled_at: "2026-07-02T00:00:00Z", liters: 20, total_value: 100, odometer: 300 });

  const result = await service.list(actor, {});
  const byId = new Map(result.items.map((entry) => [entry.fuelLog.odometer, entry]));

  assert.equal(result.total, 3);
  assert.equal(byId.get(1000)?.kmPerLiter, null);
  assert.equal(byId.get(1400)?.kmPerLiter, 10);
  assert.equal(byId.get(1400)?.distanceKm, 400);
  // Vehicle W's first log stays baseline regardless of vehicle V history.
  assert.equal(byId.get(300)?.kmPerLiter, null);
});

function buildService(): FuelLogService {
  const repository = new InMemoryFuelLogRepository();
  const references: FuelLogReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
    resolveSupplier: async (_actor, id) => (id === SUPPLIER_S ? { id, name: "Posto Rede S" } : null),
  };

  return new FuelLogService(repository, references);
}
