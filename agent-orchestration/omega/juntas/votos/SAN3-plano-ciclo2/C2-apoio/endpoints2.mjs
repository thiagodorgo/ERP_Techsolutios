import fs from "node:fs";
import { loadRegistry, flatten } from "./load.mjs";
const S = process.argv[2];
const reg = flatten(loadRegistry(`${S}/registry.ts`));
const norm = (s) => s.replace(/:[A-Za-z_]+/g, ":p").replace(/\/+$/, "");
const mapped = new Map();
for (const e of reg) for (const ep of e.relatedEndpoints ?? []) { const [m, p] = ep.split(/\s+/); mapped.set(`${m.toUpperCase()} ${norm(p)}`, e); }
const files = fs.readdirSync(`${S}/routes`);
const byFile = {};
let total = 0;
for (const f of files) {
  const src = fs.readFileSync(`${S}/routes/${f}`, "utf8");
  const eps = [...src.matchAll(/router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => `${m[1].toUpperCase()} ${norm("/api/v1" + m[2])}`);
  byFile[f] = eps; total += eps.length;
}
console.log("endpoints extraidos (literal):", total, "| mapeados por relatedEndpoints (pares distintos no registro):", mapped.size);
const groups = {
  patios: ["yard","impound","auction","release","jurisdiction","charging","patios-dashboard","vehicle-identities","authority-credential","tariffs","price-tables"],
  telemetria: ["telemetry"],
  frota: ["vehicles","fuel-logs","maintenance-orders","fines","insurance-policies","damages","professional-statements"],
};
for (const [g, mods] of Object.entries(groups)) {
  let n = 0, un = 0; const list = [];
  for (const [f, eps] of Object.entries(byFile)) {
    if (!mods.some((m) => f.startsWith(`src_modules_${m}_`))) continue;
    for (const ep of eps) { n++; if (!mapped.has(ep)) { un++; list.push(`${f.replace(/^src_modules_/,"")}: ${ep}`); } }
  }
  console.log(`\n[${g}] endpoints: ${n} | SEM mapeamento no registro: ${un}`);
  for (const l of list.slice(0, 60)) console.log("   ", l);
}
