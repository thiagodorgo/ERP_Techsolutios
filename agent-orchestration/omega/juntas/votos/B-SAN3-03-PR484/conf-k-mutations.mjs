// conf-484-agy-opus — mutações do conserto K (M57, M58, M59, M47-c′), aplicadas por âncora única,
// executadas e restauradas por `git checkout HEAD -- <arquivo>` com `git status --porcelain` publicado.
// Uso: cd C:/Users/thiag/w-conf484 && DATABASE_URL=... node <este arquivo>
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/thiag/w-conf484";
const ENGINE = "src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts";
const ROUTES = "src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts";

const mutations = [
  {
    id: "M57", file: ENGINE, expect: "T-TAG-14",
    tests: ["tests/san3-03-tenant-tag.test.ts", "tests/san3-03-system-org-db.test.ts"],
    anchor: /\r?\n[ \t]*\.replace\(\/\[\\p\{Default_Ignorable_Code_Point\}\\p\{Cf\}\]\/gu, ""\)/g,
    replace: "",
  },
  {
    id: "M58", file: ROUTES, expect: "T-SUM-9",
    tests: ["tests/cloud-cost-allocation-routes.test.ts", "tests/san3-03-summary.test.ts"],
    anchor: /\/\^\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)\$\/\.exec\(raw\)/g,
    replace: "/^(\\d{4}-\\d{2}-\\d{2})/.exec(raw)",
  },
  {
    id: "M59", file: ROUTES, expect: "T-SUM-10",
    tests: ["tests/cloud-cost-allocation-routes.test.ts", "tests/san3-03-summary.test.ts"],
    anchor: /\r?\n[ \t]*assertSummaryQueryKeys\(query\);/g,
    replace: "",
  },
  {
    id: "M47-c′", file: ROUTES, expect: "T-RUN-1",
    tests: ["tests/cloud-cost-allocation-routes.test.ts", "tests/san3-03-summary.test.ts"],
    anchor: /function parseRunFilters\(query: Record<string, unknown>\) \{/g,
    replace:
      "function parseRunFilters(query: Record<string, unknown>) {\n  if ((query.periodStart === undefined) !== (query.periodEnd === undefined)) {\n    throw new CloudCostAllocationError(400, \"CLOUD_COST_ALLOCATION_INVALID_PERIOD\", \"summary_period_incomplete\", \"M47-c prime\");\n  }",
  },
];

const status = () => execSync("git status --porcelain", { cwd: root }).toString().trim();
console.log(`HEAD=${execSync("git rev-parse HEAD", { cwd: root }).toString().trim()} status-inicial=[${status()}]`);

for (const m of mutations) {
  const path = `${root}/${m.file}`;
  const original = readFileSync(path, "utf8");
  const count = (original.match(m.anchor) ?? []).length;
  if (count !== 1) {
    console.log(`${m.id}|anchor_count=${count}|ABORTADA`);
    continue;
  }
  writeFileSync(path, original.replace(m.anchor, m.replace));
  const r = spawnSync(process.execPath, ["--test", "--import", "tsx", ...m.tests], {
    cwd: root, env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  writeFileSync(`C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/conf-mut-${m.id.replace("′", "p")}.log`, out);
  const notOk = [...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((x) => x[1].trim());
  const summary = ["tests", "pass", "fail"].map((k) => (out.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [])[1]).join("/");
  const assertion = /ERR_ASSERTION|AssertionError/.test(out);
  const syntax = /SyntaxError|TransformError/.test(out);
  const hitExpected = notOk.some((n) => n.includes(m.expect)) ||
    (m.expect === "T-RUN-1" && /T-RUN-1 · listagem continua aceitando somente uma ponta/.test(out));
  execSync(`git checkout HEAD -- ${m.file}`, { cwd: root });
  const restored = readFileSync(path, "utf8") === original;
  console.log(`${m.id}|anchor_count=1|exit=${r.status}|tests/pass/fail=${summary}|not_ok=${JSON.stringify(notOk)}|assertion=${assertion}|syntax=${syntax}|morde_${m.expect}=${hitExpected}|restored=${restored}|status=[${status()}]`);
}
console.log(`status-final=[${status()}]`);
