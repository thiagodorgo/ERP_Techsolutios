import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const root = "C:/Users/thiag/w-j484-c2";
const service = "src/modules/cloud-cost-allocation/cloud-cost-allocation.service.ts";
const routes = "src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts";
const files = [service, routes];
const originals = new Map(files.map((file) => [file, fs.readFileSync(`${root}/${file}`, "utf8")]));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function replace(file, before, after) {
  const path = `${root}/${file}`;
  const raw = fs.readFileSync(path, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = raw.replace(/\r\n/g, "\n");
  const count = normalized.split(before).length - 1;
  console.log(`${file}|anchor=${count}`);
  if (count !== 1) throw new Error(`${file}: anchor count ${count}`);
  fs.writeFileSync(path, normalized.replace(before, after).replace(/\n/g, eol));
}
function restore() {
  for (const [file, raw] of originals) fs.writeFileSync(`${root}/${file}`, raw);
}
function restored() {
  return [...originals].every(([file, raw]) => hash(fs.readFileSync(`${root}/${file}`, "utf8")) === hash(raw));
}
function run(id, mutate, tests) {
  restore();
  try {
    mutate();
    const result = spawnSync(process.execPath, ["--test", "--import", "tsx", ...tests], {
      cwd: root, encoding: "utf8", timeout: 180_000, env: process.env,
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const failures = output.split(/\r?\n/).filter((line) => /^not ok /.test(line));
    const assertions = output.split(/\r?\n/).filter((line) => /AssertionError|Missing expected rejection/.test(line));
    console.log(`${id}|exit=${result.status}|${failures.slice(0, 4).join(" ; ")}|assertions=${assertions.length}`);
    if (result.status !== 1 || failures.length === 0 || assertions.length === 0) {
      throw new Error(`${id}: mutation did not fail by assertion`);
    }
  } finally {
    restore();
    const st = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
    console.log(`${id}|restored=${restored()}|status=[${st}]`);
  }
}

const guard = `    if ((filters.periodStart === undefined) !== (filters.periodEnd === undefined)) {
      throw new CloudCostAllocationError(
        400,
        "CLOUD_COST_ALLOCATION_INVALID_PERIOD",
        "summary_period_incomplete",
        "Cloud cost allocation summary requires both periodStart and periodEnd.",
      );
    }
`;
const routeTests = ["tests/cloud-cost-allocation-routes.test.ts"];

run("M47", () => replace(service, guard, ""), ["tests/san3-03-summary.test.ts", ...routeTests]);
run("M47-b", () => replace(service,
  "    if ((filters.periodStart === undefined) !== (filters.periodEnd === undefined)) {",
  "    if (filters.periodStart !== undefined && filters.periodEnd === undefined) {"),
  ["tests/san3-03-summary.test.ts"]);
run("M47-c", () => {
  replace(service, guard, "");
  replace(routes,
`function parseRunFilters(query: Record<string, unknown>) {
  return {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    status: readQueryString(query.status) as CloudCostAllocationRun["status"] | undefined,
  };
}`,
`function parseRunFilters(query: Record<string, unknown>) {
  const filters = {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    status: readQueryString(query.status) as CloudCostAllocationRun["status"] | undefined,
  };
  if ((filters.periodStart === undefined) !== (filters.periodEnd === undefined)) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID_PERIOD", "summary_period_incomplete", "summary_period_incomplete");
  }
  return filters;
}`);
}, routeTests);
run("M54", () => replace(routes,
  "      const summary = await service.getAllocationSummary(parseSummaryFilters(request.query));",
  "      const summary = await service.getAllocationSummary(parseRunFilters(request.query));"), routeTests);
run("M54-b", () => replace(routes,
  "  const raw = query[field];\n  if (typeof raw !== \"string\") throwInvalidSummaryPeriod(field);",
  "  const raw = query[field];\n  if (raw === \"\") return undefined;\n  if (typeof raw !== \"string\") throwInvalidSummaryPeriod(field);"), routeTests);
run("M54-c", () => replace(routes,
  "  const raw = query[field];\n  if (typeof raw !== \"string\") throwInvalidSummaryPeriod(field);",
  "  const original = query[field];\n  const raw = Array.isArray(original) ? original[0] : original;\n  if (typeof raw !== \"string\") throwInvalidSummaryPeriod(field);"), routeTests);
function measure(id, mutate, tests) {
  restore();
  try {
    mutate();
    const result = spawnSync(process.execPath, ["--test", "--import", "tsx", ...tests], { cwd: root, encoding: "utf8", timeout: 180_000, env: process.env });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const failures = output.split(/\r?\n/).filter((line) => /^not ok /.test(line));
    const counts = output.split(/\r?\n/).filter((line) => /^# (pass|fail)/.test(line)).join(" ");
    console.log(`${id}|exit=${result.status}|${failures.slice(0, 4).join(" ; ")}|${counts}`);
  } finally {
    restore();
    const st = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
    console.log(`${id}|restored=${restored()}|status=[${st}]`);
  }
}

run("M56", () => replace(routes,
  "    strictDate.toISOString().slice(0, 10) !== calendarDate ||",
  "    false ||"), routeTests);

// Mutação própria da C2 (nova): o parser deixa de exigir que o prefixo AAAA-MM-DD termine o valor ou seja seguido de "T".
measure("M-C2-a", () => replace(routes,
  "  const match = /^(\\d{4}-\\d{2}-\\d{2})(?:$|T)/.exec(raw);",
  "  const match = /^(\\d{4}-\\d{2}-\\d{2})/.exec(raw);"),
  [...routeTests, "tests/san3-03-summary.test.ts"]);

restore();
