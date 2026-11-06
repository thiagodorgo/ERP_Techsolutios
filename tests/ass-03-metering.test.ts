// B-ASS-03 · F1 — medidor com dublê em memória e SQL injetável. T-MED-5..11, T-MED-14, T-MED-15.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

import { InMemoryMeteringSqlExecutor } from "../src/modules/subscription-billing/metering/metering.memory.js";
import { assertMeasureDailyPayload } from "../src/modules/subscription-billing/metering/metering.payload.js";
import {
  TenantContextMissingError,
  TenantUsageMeter,
  toUsageDto,
} from "../src/modules/subscription-billing/metering/index.js";
import { InMemoryTenantUsageDailyRepository } from "../src/modules/subscription-billing/metering/tenant-usage.repository.js";

const DAY = { date: "2026-11-06", start: new Date("2026-11-06T00:00:00.000Z"), end: new Date("2026-11-06T23:59:59.999Z") };

function newMeter(tables: readonly string[] = ["audit_logs", "users"]) {
  const sql = new InMemoryMeteringSqlExecutor();
  const repository = new InMemoryTenantUsageDailyRepository();
  const meter = new TenantUsageMeter(sql, repository, tables);
  return { sql, repository, meter };
}

test("T-MED-5 · nenhuma consulta do medidor filtra `tenant_id =` literalmente (só o GUC filtra)", () => {
  const files = sourceFiles("src/modules/subscription-billing/metering");
  const offenders: string[] = [];
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    if (/tenant_id\s*=/.test(source)) offenders.push(path);
  }
  assert.deepEqual(offenders, [], "consulta do medidor com `tenant_id =` literal (o isolamento é do GUC)");
});

test("T-MED-6 · rodar 2× no mesmo dia guarda 1 linha com o MAIOR número de usuários e `measured_at` avança", async () => {
  const { sql, repository, meter } = newMeter();
  sql.currentTenantId = "ten-a";
  sql.seedUsers([...Array.from({ length: 7 }, () => ({ tenantId: "ten-a", status: "active" }))]);
  const first = await meter.measureTenant("ten-a", DAY);
  assert.equal(first.activeUsers, 7);

  sql.users.length = 0;
  sql.seedUsers([...Array.from({ length: 5 }, () => ({ tenantId: "ten-a", status: "active" }))]);
  await new Promise((resolve) => setTimeout(resolve, 2));
  const second = await meter.measureTenant("ten-a", DAY);

  assert.equal(repository.list().length, 1);
  assert.equal(second.activeUsers, 7);
  assert.ok(second.measuredAt.getTime() > first.measuredAt.getTime(), "measured_at avança na 2ª medição");
});

test("T-MED-8 · payload com `date` é recusado (400 unknown_field); dia sem amostra fica sem linha", async () => {
  assert.throws(() => assertMeasureDailyPayload({ date: "2026-11-06" }), (error: unknown) => {
    const err = error as { statusCode?: number; code?: string };
    return err.statusCode === 400 && err.code === "unknown_field";
  });
  assert.doesNotThrow(() => assertMeasureDailyPayload({}));
  assert.doesNotThrow(() => assertMeasureDailyPayload(undefined));

  const { repository, meter } = newMeter();
  assert.equal(repository.list().length, 0);
  await meter.measureDaily([], DAY);
  assert.equal(repository.list().length, 0);
});

test("T-MED-9 · binding de veículo fechado ONTEM não conta hoje", async () => {
  const { sql, meter } = newMeter();
  sql.currentTenantId = "ten-a";
  sql.seedUsers([{ tenantId: "ten-a", status: "active" }]);
  sql.seedBindings([
    { tenantId: "ten-a", vehicleId: "v1", validFrom: new Date("2026-11-01T00:00:00.000Z"), validTo: new Date("2026-11-05T23:59:59.999Z") },
  ]);
  const row = await meter.measureTenant("ten-a", DAY);
  assert.equal(row.trackedVehicles, 0);
});

test("T-MED-10 · binding de veículo aberto conta", async () => {
  const { sql, meter } = newMeter();
  sql.currentTenantId = "ten-a";
  sql.seedUsers([{ tenantId: "ten-a", status: "active" }]);
  sql.seedBindings([
    { tenantId: "ten-a", vehicleId: "v1", validFrom: new Date("2026-11-01T00:00:00.000Z") },
  ]);
  const row = await meter.measureTenant("ten-a", DAY);
  assert.equal(row.trackedVehicles, 1);
});

test("T-MED-11 · 2 bindings do MESMO veículo contam 1 (distinct)", async () => {
  const { sql, meter } = newMeter();
  sql.currentTenantId = "ten-a";
  sql.seedUsers([{ tenantId: "ten-a", status: "active" }]);
  sql.seedBindings([
    { tenantId: "ten-a", vehicleId: "v1", validFrom: new Date("2026-11-01T00:00:00.000Z") },
    { tenantId: "ten-a", vehicleId: "v1", validFrom: new Date("2026-11-03T00:00:00.000Z") },
    { tenantId: "ten-a", vehicleId: "v2", validFrom: new Date("2026-11-04T00:00:00.000Z") },
  ]);
  const row = await meter.measureTenant("ten-a", DAY);
  assert.equal(row.trackedVehicles, 2);
});

test("T-MED-14 · a organização de sistema (slug platform) não recebe linha", async () => {
  const { sql, repository, meter } = newMeter();
  sql.currentTenantId = "ten-a";
  sql.seedUsers([{ tenantId: "ten-a", status: "active" }]);
  const rows = await meter.measureDaily(
    [
      { id: "ten-platform", slug: "platform" },
      { id: "ten-a", slug: "client-a" },
    ],
    DAY,
  );
  assert.deepEqual(rows.map((row) => row.tenantId), ["ten-a"]);
  assert.equal(repository.get("ten-platform", DAY.date), undefined);
});

test("T-MED-4b · sem GUC (contexto ausente) o medidor LANÇA antes de gravar (fail-closed)", async () => {
  const { sql, repository, meter } = newMeter();
  sql.currentTenantId = null;
  await assert.rejects(() => meter.measureTenant("ten-a", DAY), TenantContextMissingError);
  assert.equal(repository.list().length, 0, "nada é gravado sem GUC");
});

test("T-MED-15 · `toUsageDto` serializa BigInt como string e `JSON.stringify` não lança", () => {
  const dto = toUsageDto({
    tenantId: "ten-a",
    date: DAY.date,
    activeUsers: 3,
    dbBytesEstimated: 9007199254740993n,
    filesBytes: 42n,
    filesWithoutSize: 1,
    trackedVehicles: 2,
    methodVersion: 2,
    measuredAt: new Date("2026-11-06T12:00:00.000Z"),
    metadata: { tablesTimedOut: [] },
  });
  assert.equal(dto.dbBytesEstimated, "9007199254740993");
  assert.equal(dto.filesBytes, "42");
  assert.doesNotThrow(() => JSON.stringify(dto));
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}
