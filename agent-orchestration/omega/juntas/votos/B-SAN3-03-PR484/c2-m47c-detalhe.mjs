// C2: qual asserção a M47-c derruba? E a variante só-listagem (recusa acrescentada em parseRunFilters, serviço intacto).
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const root = "C:/Users/thiag/w-j484-c2";
const service = "src/modules/cloud-cost-allocation/cloud-cost-allocation.service.ts";
const routes = "src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts";
const orig = new Map([service, routes].map((f) => [f, fs.readFileSync(`${root}/${f}`, "utf8")]));
const restore = () => { for (const [f, r] of orig) fs.writeFileSync(`${root}/${f}`, r); };
function replace(file, before, after) {
  const raw = fs.readFileSync(`${root}/${file}`, "utf8"); const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const n = raw.replace(/\r\n/g, "\n"); const c = n.split(before).length - 1; console.log(`${file}|anchor=${c}`);
  if (c !== 1) throw new Error("anchor"); fs.writeFileSync(`${root}/${file}`, n.replace(before, after).replace(/\n/g, eol));
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
const prf = `function parseRunFilters(query: Record<string, unknown>) {
  return {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    status: readQueryString(query.status) as CloudCostAllocationRun["status"] | undefined,
  };
}`;
const prfMut = `function parseRunFilters(query: Record<string, unknown>) {
  const filters = {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    status: readQueryString(query.status) as CloudCostAllocationRun["status"] | undefined,
  };
  if ((filters.periodStart === undefined) !== (filters.periodEnd === undefined)) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID_PERIOD", "summary_period_incomplete", "summary_period_incomplete");
  }
  return filters;
}`;
function go(id, mut) {
  restore();
  try {
    mut();
    const r = spawnSync(process.execPath, ["--test", "--import", "tsx", "tests/cloud-cost-allocation-routes.test.ts"], { cwd: root, encoding: "utf8", timeout: 180000 });
    const out = `${r.stdout}\n${r.stderr}`;
    const lines = out.split(/\r?\n/);
    const notok = lines.filter((l) => /^not ok/.test(l));
    const msg = lines.filter((l) => /T-RUN-1|^\s+(actual|expected):|AssertionError|message:/.test(l)).slice(0, 6).map((l) => l.trim());
    console.log(`${id}|exit=${r.status}|${notok.join(" ; ")}|${msg.join(" ¦ ")}`);
  } finally {
    restore();
    const st = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
    console.log(`${id}|status=[${st}]`);
  }
}
go("M47-c(literal do dev)", () => { replace(service, guard, ""); replace(routes, prf, prfMut); });
go("M47-c'(só listagem, serviço intacto)", () => { replace(routes, prf, prfMut); });
