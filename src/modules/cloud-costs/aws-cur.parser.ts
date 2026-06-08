import { createHash } from "node:crypto";

import { CloudCostError, type ParsedAwsCurLineItem } from "./aws-cur.types.js";

const fields = {
  billingPeriodStart: "bill/BillingPeriodStartDate",
  billingPeriodEnd: "bill/BillingPeriodEndDate",
  usageStart: "lineItem/UsageStartDate",
  usageEnd: "lineItem/UsageEndDate",
  serviceCode: "lineItem/ProductCode",
  usageType: "lineItem/UsageType",
  operation: "lineItem/Operation",
  region: "product/region",
  resourceId: "lineItem/ResourceId",
  usageAmount: "lineItem/UsageAmount",
  usageUnit: "lineItem/UsageUnit",
  unblendedCost: "lineItem/UnblendedCost",
  currency: "lineItem/CurrencyCode",
  project: "resourceTags/user:Project",
  environment: "resourceTags/user:Environment",
  tenantTag: "resourceTags/user:Tenant",
  moduleTag: "resourceTags/user:Module",
} as const;

export function parseAwsCurCsv(csv: string): readonly ParsedAwsCurLineItem[] {
  const rows = parseCsv(csv);

  if (rows.length < 2) {
    throw new CloudCostError(400, "AWS_CUR_INVALID", "csv_empty", "AWS CUR CSV must contain headers and at least one data row.");
  }

  const headers = rows[0] ?? [];
  const lines: ParsedAwsCurLineItem[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every((cell) => !cell.trim())) continue;
    const record = toRecord(headers, row);
    lines.push(mapRecord(record, index + 2));
  }

  if (lines.length === 0) {
    throw new CloudCostError(400, "AWS_CUR_INVALID", "csv_empty", "AWS CUR CSV has no data rows.");
  }

  return lines;
}

function mapRecord(record: Record<string, string>, rowNumber: number): ParsedAwsCurLineItem {
  const billingPeriodStart = readRequiredDate(record, fields.billingPeriodStart, rowNumber);
  const billingPeriodEnd = readRequiredDate(record, fields.billingPeriodEnd, rowNumber);
  const serviceCode = readRequiredString(record, fields.serviceCode, rowNumber);
  const unblendedCost = readRequiredNumber(record, fields.unblendedCost, rowNumber);
  const currency = readRequiredString(record, fields.currency, rowNumber);
  const line: ParsedAwsCurLineItem = {
    provider: "aws",
    billingPeriodStart,
    billingPeriodEnd,
    usageStart: readOptionalDate(record[fields.usageStart]),
    usageEnd: readOptionalDate(record[fields.usageEnd]),
    serviceCode,
    usageType: readOptionalString(record[fields.usageType]),
    operation: readOptionalString(record[fields.operation]),
    region: readOptionalString(record[fields.region]),
    resourceId: readOptionalString(record[fields.resourceId]),
    costCategory: undefined,
    environment: readOptionalString(record[fields.environment]),
    project: readOptionalString(record[fields.project]),
    tenantTag: readOptionalString(record[fields.tenantTag]),
    moduleTag: readOptionalString(record[fields.moduleTag]),
    usageAmount: readOptionalNumber(record[fields.usageAmount]),
    usageUnit: readOptionalString(record[fields.usageUnit]),
    unblendedCost,
    amortizedCost: undefined,
    currency,
    rawLineHash: "",
    metadata: {
      parser: "aws-cur-simplified-csv",
      rowNumber,
    },
  };

  return {
    ...line,
    rawLineHash: hashLine(line),
  };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;
  const input = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  rows.push(row);

  return rows.filter((item) => item.some((cell) => cell.trim()));
}

function toRecord(headers: readonly string[], row: readonly string[]): Record<string, string> {
  const record: Record<string, string> = {};

  headers.forEach((header, index) => {
    record[header.trim()] = row[index]?.trim() ?? "";
  });

  return record;
}

function readRequiredString(record: Record<string, string>, key: string, rowNumber: number): string {
  const value = readOptionalString(record[key]);
  if (!value) {
    throw new CloudCostError(400, "AWS_CUR_INVALID", "required_field_missing", `Required field ${key} is missing at row ${rowNumber}.`);
  }
  return value;
}

function readRequiredDate(record: Record<string, string>, key: string, rowNumber: number): Date {
  const value = readOptionalDate(record[key]);
  if (!value) {
    throw new CloudCostError(400, "AWS_CUR_INVALID", "required_field_missing", `Required date ${key} is missing or invalid at row ${rowNumber}.`);
  }
  return value;
}

function readRequiredNumber(record: Record<string, string>, key: string, rowNumber: number): number {
  const value = readOptionalNumber(record[key]);
  if (value === undefined) {
    throw new CloudCostError(400, "AWS_CUR_INVALID", "required_field_missing", `Required number ${key} is missing or invalid at row ${rowNumber}.`);
  }
  return value;
}

function readOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";
  return normalized || undefined;
}

function readOptionalDate(value: string | undefined): Date | undefined {
  const normalized = readOptionalString(value);
  if (!normalized) return undefined;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readOptionalNumber(value: string | undefined): number | undefined {
  const normalized = readOptionalString(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hashLine(line: Omit<ParsedAwsCurLineItem, "rawLineHash">): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: line.provider,
        billingPeriodStart: line.billingPeriodStart.toISOString(),
        billingPeriodEnd: line.billingPeriodEnd.toISOString(),
        usageStart: line.usageStart?.toISOString() ?? null,
        usageEnd: line.usageEnd?.toISOString() ?? null,
        serviceCode: line.serviceCode,
        usageType: line.usageType ?? null,
        operation: line.operation ?? null,
        region: line.region ?? null,
        resourceId: line.resourceId ?? null,
        usageAmount: line.usageAmount ?? null,
        usageUnit: line.usageUnit ?? null,
        unblendedCost: line.unblendedCost,
        currency: line.currency,
        project: line.project ?? null,
        environment: line.environment ?? null,
        tenantTag: line.tenantTag ?? null,
        moduleTag: line.moduleTag ?? null,
      }),
    )
    .digest("hex");
}
