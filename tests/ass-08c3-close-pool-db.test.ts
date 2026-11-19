import assert from "node:assert/strict";
import test from "node:test";

import { daysInPeriod } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, type StatementInputs } from "../src/modules/subscription-billing/statements/statement.service.js";
import { source } from "./helpers/ass-08c3-test-kit.js";

const WHEN = new Date("2026-11-02T12:00:00Z");
function ready(): StatementInputs {
  const days = daysInPeriod("2026-10");
  return { kind: "ready", subscriptionId: "sub", planVersionId: "plan-v1", addonPlanVersionId: null, computation: { daysInMonth: days, segments: [{ subscriptionId: "sub", planVersionId: "plan-v1", fromDay: 1, toDay: days, monthlyPriceCents: 10_000 }], terms: { includedUsers: 0, includedStorageMilliGb: 0, extraUserPriceCents: 0, extraGbPriceCents: 0 }, measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 0 }, perVehiclePriceCents: null }, daysMeasured: days, gaps: [], dueDays: 10 };
}
function world() {
  const repository = new InMemoryStatementRepository(() => WHEN);
  const pins: unknown[] = [];
  const service = new StatementService(repository, { async resolve(_tenant, _period, options) { pins.push(options.pin); return ready(); } }, { async record() {} });
  return { repository, service, pins };
}

test("CP1: dez fechamentos concorrentes terminam em um closed e nove already_closed", async () => {
  for (let round = 0; round < 3; round += 1) {
    const w = world();
    const results = await Promise.all(Array.from({ length: 10 }, () => w.service.close({ tenantId: `tenant-${round}`, period: "2026-10", now: WHEN, actorId: "usr", source: "manual" })));
    assert.equal(results.filter((x) => x.kind === "closed").length, 1);
    assert.equal(results.filter((x) => x.kind === "already_closed").length, 9);
    assert.equal((await w.repository.listStatements(`tenant-${round}`)).length, 1);
  }
});

test("CP2: close resolve fora da transação recebe o pin do demonstrativo reaberto", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  const close = text.slice(text.indexOf("async close("), text.indexOf("async reopen(", text.indexOf("async close(")));
  const resolve = close.indexOf("[CLOSE-RESOLVE-OUT]");
  const transaction = close.indexOf("this.repository.transaction");
  assert.ok(resolve > 0 && resolve < transaction);
  assert.match(close.slice(resolve - 300, resolve + 200), /prePin/);
});

test("CP2b: mudança do pin entre leitura e trava falha com statement_busy antes de salvar", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  const guard = text.indexOf("[CLOSE-PIN-CHECK]");
  const save = text.indexOf("tx.saveStatement", guard);
  assert.ok(guard > 0 && save > guard);
  assert.match(text.slice(guard - 250, guard + 180), /statement_busy/);
});

test("M-CP1/M-CP2: as duas âncoras são únicas", () => {
  const text = source("src/modules/subscription-billing/statements/statement.service.ts");
  assert.equal(text.split("[CLOSE-RESOLVE-OUT]").length - 1, 1);
  assert.equal(text.split("[CLOSE-PIN-CHECK]").length - 1, 1);
});

