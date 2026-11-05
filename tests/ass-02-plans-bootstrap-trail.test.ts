import assert from "node:assert/strict";
import test from "node:test";

import { RecordingPlatformAuditWriter } from "../src/modules/subscription-billing/plans/platform-audit.js";
import { PlansService } from "../src/modules/subscription-billing/plans/plans.service.js";
import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";

const CODES = ["starter", "professional", "business", "enterprise", "tracking_basic", "tracking_plus"];

async function seedMigrationPlans(repo: InMemoryPlansRepository): Promise<void> {
  for (const code of CODES) {
    await repo.createPlan({
      code,
      kind: code.startsWith("tracking_") ? "addon_tracking" : "base",
      name: code,
      description: "",
      active: true,
      createdBy: null,
    });
  }
}

test("T-PL-AUDIT-1: 1ª leitura do catálogo grava plans.bootstrapped_by_migration uma única vez", async () => {
  const repo = new InMemoryPlansRepository();
  await seedMigrationPlans(repo);
  const audit = new RecordingPlatformAuditWriter();
  const service = new PlansService(repo, undefined, undefined, audit);

  await service.listPlans();
  await service.listPlans();

  assert.equal(audit.list().length, 1);
  const entry = audit.list()[0]!;
  assert.equal(entry.action, "plans.bootstrapped_by_migration");
  assert.equal(entry.entity, "subscription_plan");
  assert.deepEqual((entry.metadata as { codes: string[] }).codes, [...CODES].sort());
  assert.equal((entry.metadata as { count: number }).count, CODES.length);
});

test("T-PL-AUDIT-2: catálogo sem plano criado por migração não grava trilha", async () => {
  const repo = new InMemoryPlansRepository();
  await repo.createPlan({
    code: "starter",
    kind: "base",
    name: "Starter",
    description: "",
    active: true,
    createdBy: "user-1",
  });
  const audit = new RecordingPlatformAuditWriter();
  const service = new PlansService(repo, undefined, undefined, audit);

  await service.listPlans();

  assert.equal(audit.list().length, 0);
});

test("T-PL-AUDIT-3: só planos com created_by NULL entram na trilha", async () => {
  const repo = new InMemoryPlansRepository();
  await repo.createPlan({
    code: "starter",
    kind: "base",
    name: "Starter",
    description: "",
    active: true,
    createdBy: null,
  });
  await repo.createPlan({
    code: "business",
    kind: "base",
    name: "Business",
    description: "",
    active: true,
    createdBy: "user-2",
  });
  const audit = new RecordingPlatformAuditWriter();
  const service = new PlansService(repo, undefined, undefined, audit);

  await service.listPlans();

  assert.equal(audit.list().length, 1);
  assert.deepEqual((audit.list()[0]!.metadata as { codes: string[] }).codes, ["starter"]);
});
