import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseSyncCommand } from "../src/modules/expense-management/expense-sync.js";

const repositorySource = readFileSync(
  new URL("../mobile/flutter_app/lib/features/expenses/data/expense_repository.dart", import.meta.url),
  "utf8",
);

const actor = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  userId: "field-user",
  roles: ["field_technician"],
  permissions: [
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_sync:write",
  ],
};

test("RB4b · os três payloads literais do Dart são aceitos pelo parser real do backend", () => {
  const createKeys = payloadKeysBetween("Future<ExpenseMutationResult> createReport", "Future<ExpenseMutationResult> addItem");
  const itemKeys = payloadKeysBetween("Future<ExpenseMutationResult> addItem", "Future<ExpenseMutationResult> submitReport");
  const submitKeys = payloadKeysBetween("Future<ExpenseMutationResult> submitReport", "Future<SyncAction?> attachReceiptPlaceholder");

  assertKeys(createKeys, ["employeeUserId", "periodStart", "periodEnd", "origin", "advanceAmount"]);
  assertKeys(itemKeys, ["report_id", "category_key", "spent_at", "amount"]);
  assertKeys(submitKeys, ["report_id"]);

  assert.equal(parseSyncCommand(actor, "expense_report.create", sample(createKeys)).type, "expense_report.create");
  assert.equal(parseSyncCommand(actor, "expense_item.create", sample(itemKeys)).type, "expense_item.create");
  assert.equal(parseSyncCommand(actor, "expense_report.submit", sample(submitKeys)).type, "expense_report.submit");
});

function payloadKeysBetween(start: string, end: string): Set<string> {
  const startIndex = repositorySource.indexOf(start);
  const endIndex = repositorySource.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `trecho Dart não encontrado: ${start}`);
  const method = repositorySource.slice(startIndex, endIndex);
  const payload = /payload:\s*\{([\s\S]*?)\n\s*\},/.exec(method)?.[1];
  assert.ok(payload, `payload literal não encontrado em ${start}`);
  return new Set([...payload.matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]));
}

function assertKeys(actual: Set<string>, required: string[]): void {
  for (const key of required) assert.ok(actual.has(key), `payload Dart não contém '${key}'`);
}

function sample(keys: Set<string>): Record<string, unknown> {
  const values: Record<string, unknown> = {
    local_id: "rdv-local",
    report_local_id: "rdv-local",
    report_id: "22222222-2222-4222-8222-222222222222",
    employeeUserId: "field-user",
    periodStart: "2026-11-01T10:00:00.000Z",
    periodEnd: "2026-11-09T10:00:00.000Z",
    origin: "mobile",
    advanceAmount: 0,
    category_key: "fuel",
    spent_at: "2026-11-09T10:00:00.000Z",
    amount: 42,
  };
  return Object.fromEntries([...keys].map((key) => [key, values[key]]));
}
