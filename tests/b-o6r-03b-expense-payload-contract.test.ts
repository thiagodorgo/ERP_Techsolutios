import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseSyncCommand, syncBusyError } from "../src/modules/expense-management/expense-sync.js";
import { ExpenseManagementError } from "../src/modules/expense-management/expense-management.types.js";
import { sendRouteError } from "../src/modules/core-saas/routes/http.js";

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

type ExpenseErrorEnvelope = { status: number; body: { error: { code: string; reason?: string; message: string } } };

const expenseErrorEnvelopes = JSON.parse(
  readFileSync(new URL("../mobile/flutter_app/test/core/sync/bo6r03b_expense_error_envelopes.json", import.meta.url), "utf8"),
) as Record<string, ExpenseErrorEnvelope>;

const expenseServiceSource = readFileSync(
  new URL("../src/modules/expense-management/expense-management.service.ts", import.meta.url),
  "utf8",
);
const expenseValidatorsSource = readFileSync(
  new URL("../src/modules/expense-management/expense-management.validators.ts", import.meta.url),
  "utf8",
);
const authenticatedActorSource = readFileSync(
  new URL("../src/modules/auth/middleware/authenticated-actor.middleware.ts", import.meta.url),
  "utf8",
);

function sendEnvelope(error: unknown): { status: number; body: unknown } {
  let statusCode = 0;
  let body: unknown;
  const response = {
    status: (status: number) => {
      statusCode = status;
      return response;
    },
    json: (payload: unknown) => {
      body = payload;
      return response;
    },
  };
  sendRouteError(response as unknown as Parameters<typeof sendRouteError>[0], error);
  return { status: statusCode, body };
}

test("RB4c · os envelopes de erro que o app testa são os que o backend produz", () => {
  assert.deepEqual(sendEnvelope(syncBusyError()), expenseErrorEnvelopes["503_sync_busy"]);
  assert.deepEqual(sendEnvelope({}), expenseErrorEnvelopes["500_unknown_error"]);

  assert.deepEqual(
    sendEnvelope(new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable", "Only draft or returned reports can receive new items.")),
    expenseErrorEnvelopes["409_status_not_editable"],
  );
  assert.deepEqual(
    sendEnvelope(new ExpenseManagementError(422, "EXPENSE_REPORT_INVALID", "empty_report", "At least one expense item is required before submit.")),
    expenseErrorEnvelopes["422_empty_report"],
  );
  assert.deepEqual(
    sendEnvelope(new ExpenseManagementError(400, "EXPENSE_INVALID", "required_field", "reportId is required.")),
    expenseErrorEnvelopes["400_required_field"],
  );

  assert.ok(expenseServiceSource.includes('new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable"'));
  assert.ok(expenseServiceSource.includes('new ExpenseManagementError(422, "EXPENSE_REPORT_INVALID", "empty_report"'));
  assert.ok(expenseValidatorsSource.includes('new ExpenseManagementError(400, "EXPENSE_INVALID", "required_field"'));

  assert.ok(authenticatedActorSource.includes("INVALID_TOKEN"));
  assert.ok(authenticatedActorSource.includes("Invalid or expired access token."));
});
