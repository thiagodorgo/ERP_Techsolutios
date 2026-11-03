// conf-484-agy-opus — reexecução da bateria do K5: a LISTA LITERAL de docs/revisoes/SAN3/B-SAN3-03-bateria.txt,
// um arquivo por vez, `node --test --import tsx --test-reporter=tap <arquivo>`, somando `# tests/pass/fail/skipped`.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const root = "C:/Users/thiag/w-conf484";
const out = "C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484";
const txt = readFileSync(`${root}/docs/revisoes/SAN3/B-SAN3-03-bateria.txt`, "utf8").split(/\r?\n/);
const start = txt.findIndex((l) => l.startsWith("LISTA LITERAL"));
const list = [];
for (let i = start + 1; i < txt.length; i += 1) {
  const l = txt[i].trim();
  if (!l.startsWith("tests/")) break;
  list.push(l);
}
writeFileSync(`${out}/conf-bateria-lista.txt`, list.join("\n") + "\n");
writeFileSync(`${out}/conf-bateria.log`, "");
const tot = { tests: 0, pass: 0, fail: 0, skipped: 0 };
const per = [];
for (const f of list) {
  const r = spawnSync(process.execPath, ["--test", "--import", "tsx", "--test-reporter=tap", f], {
    cwd: root, env: process.env, encoding: "utf8", maxBuffer: 128 * 1024 * 1024,
  });
  const o = `${r.stdout}\n${r.stderr}`;
  appendFileSync(`${out}/conf-bateria.log`, `=== ${f} ===\n${o}\nEXIT=${r.status}\n`);
  const g = (k) => Number((o.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [0, 0])[1]);
  const row = { f, exit: r.status, tests: g("tests"), pass: g("pass"), fail: g("fail"), skipped: g("skipped") };
  for (const k of Object.keys(tot)) tot[k] += row[k];
  per.push(row);
  console.log(`${f} exit=${row.exit} tests=${row.tests} pass=${row.pass} fail=${row.fail} skipped=${row.skipped}`);
}
console.log(`ARQUIVOS=${list.length} TOTAL tests=${tot.tests} pass=${tot.pass} fail=${tot.fail} skipped=${tot.skipped}`);
writeFileSync(`${out}/conf-bateria-resumo.json`, JSON.stringify({ files: list.length, tot, per }, null, 1));
