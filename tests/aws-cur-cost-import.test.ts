import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CloudCostService,
  InMemoryCloudCostRepository,
  createAwsCurImportCostFileJobHandler,
  getMemoryCloudCostRepositoryForTests,
  parseAwsCurCsv,
  resetCloudCostRuntimeForTests,
  sanitizeCloudCostMetadata,
} from "../src/modules/cloud-costs/index.js";

const fixturePath = new URL("./fixtures/aws-cur-sample.csv", import.meta.url);

test("parser le fixture CSV e mapeia tags AWS CUR", async () => {
  const csv = await readFile(fixturePath, "utf8");
  const lines = parseAwsCurCsv(csv);

  assert.equal(lines.length, 3);
  assert.equal(lines[0]?.serviceCode, "AmazonEC2");
  assert.equal(lines[0]?.project, "ERP");
  assert.equal(lines[0]?.environment, "prod");
  assert.equal(lines[0]?.tenantTag, "tenant-a");
  assert.equal(lines[0]?.moduleTag, "compute");
  assert.equal(lines[0]?.currency, "USD");
});

test("importer cria import completed, line items e total deduplicado", async () => {
  const csv = await readFile(fixturePath, "utf8");
  const repository = new InMemoryCloudCostRepository();
  const service = new CloudCostService(repository);

  const result = await service.importAwsCurCsv({
    csv,
    sourceType: "mock_fixture",
    sourceUri: "tests/fixtures/aws-cur-sample.csv",
    importedBy: "platform-admin",
    metadata: {
      Authorization: "Bearer secret",
      note: "safe",
    },
  });
  const lines = await service.listLineItems({ importId: result.id });

  assert.equal(result.status, "completed");
  assert.equal(result.rowCount, 2);
  assert.equal(result.totalUnblendedCost, 12.75);
  assert.equal(result.currency, "USD");
  assert.equal(result.metadata.Authorization, "[REDACTED]");
  assert.equal(result.metadata.note, "safe");
  assert.equal(result.metadata.duplicateRowsSkipped, 1);
  assert.equal(lines.length, 2);
  assert.equal(new Set(lines.map((line) => line.rawLineHash)).size, 2);
});

test("summary agrega custos por serviceCode", async () => {
  const csv = await readFile(fixturePath, "utf8");
  const service = new CloudCostService(new InMemoryCloudCostRepository());

  await service.importAwsCurCsv({ csv, sourceType: "mock_fixture" });
  const summary = await service.getSummary({
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
  });

  assert.equal(summary.totalUnblendedCost, 12.75);
  assert.deepEqual(
    summary.services.map((serviceCost) => [serviceCost.serviceCode, serviceCost.unblendedCost]),
    [
      ["AmazonEC2", 10.5],
      ["AmazonS3", 2.25],
    ],
  );
});

test("import failed registra erro sanitizado", async () => {
  const service = new CloudCostService(new InMemoryCloudCostRepository());
  const result = await service.importAwsCurCsv({
    csv: "bill/BillingPeriodStartDate,lineItem/ProductCode,lineItem/UnblendedCost,lineItem/CurrencyCode\n2026-06-01,AmazonEC2,Bearer secret,USD",
    metadata: {
      csvContent: "do-not-save",
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.errorMessage?.includes("Bearer secret"), false);
  assert.equal(result.metadata.csvContent, "[REDACTED]");
});

test("campos obrigatorios ausentes falham", () => {
  assert.throws(
    () =>
      parseAwsCurCsv(
        "bill/BillingPeriodStartDate,bill/BillingPeriodEndDate,lineItem/ProductCode,lineItem/CurrencyCode\n2026-06-01,2026-06-30,AmazonEC2,USD",
      ),
    (error: { reason?: string }) => error.reason === "required_field_missing",
  );
});

test("metadata sensivel e sanitizada", () => {
  assert.deepEqual(
    sanitizeCloudCostMetadata({
      secret: "value",
      AWS_CUR_S3_BUCKET: "private-bucket",
      nested: {
        path: "s3://private/key",
        safe: "ok",
      },
    }),
    {
      secret: "[REDACTED]",
      AWS_CUR_S3_BUCKET: "[REDACTED]",
      nested: {
        path: "[REDACTED]",
        safe: "ok",
      },
    },
  );
});

test("job aws-cur.import-cost-file importa CSV mockado sem AWS real", async () => {
  resetCloudCostRuntimeForTests();
  const csv = await readFile(fixturePath, "utf8");
  const handler = createAwsCurImportCostFileJobHandler();
  const repository = getMemoryCloudCostRepositoryForTests();

  await handler(
    {
      csv,
      sourceType: "mock_fixture",
      metadata: {
        token: "secret",
      },
    },
    {
      id: "job-aws-cur",
      name: "aws-cur.import-cost-file",
      payload: {},
      status: "processing",
      attempts: 0,
      maxAttempts: 1,
      backoffMs: 0,
      correlationId: "corr-aws-cur",
      runAfter: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  );

  const imports = await repository.listImports();

  assert.equal(imports.length, 1);
  assert.equal(imports[0]?.status, "completed");
  assert.equal(imports[0]?.metadata.token, "[REDACTED]");
  resetCloudCostRuntimeForTests();
});
