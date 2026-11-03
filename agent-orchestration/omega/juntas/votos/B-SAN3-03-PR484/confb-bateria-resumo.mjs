// conf-484b-opus — resume confb-bateria.log por arquivo e compara com a tabela do B-SAN3-03-bateria.txt do objeto.
import fs from "node:fs";
const s = fs.readFileSync(new URL("./confb-bateria.log", import.meta.url), "utf8");
const parts = s.split(/^=== (tests\/\S+) ===$/m).slice(1);
const T = { tests: 0, pass: 0, fail: 0, skipped: 0 }; const rows = [];
for (let i = 0; i < parts.length; i += 2) {
  const f = parts[i], o = parts[i + 1];
  const g = (k) => { const m = [...o.matchAll(new RegExp(`^# ${k} ([0-9]+)`, "gm"))]; return m.length ? Number(m.at(-1)[1]) : NaN; };
  const r = { f, ex: (o.match(/^EXIT=([0-9]+)/m) || [])[1], tests: g("tests"), pass: g("pass"), fail: g("fail"), skipped: g("skipped") };
  for (const k in T) T[k] += r[k]; rows.push(r);
  if (r.ex !== "0") console.log("exit!=0", JSON.stringify(r), "| not ok:", [...o.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map((x) => x[1]).join(" | "), "| 'setsid: ausente':", (o.match(/setsid: ausente/g) || []).length);
}
console.log("arquivos", rows.length, JSON.stringify(T));
const k5 = fs.readFileSync(process.argv[2], "utf8").replace(/\r/g, "");
let n = 0, d = 0;
for (const m of k5.matchAll(/^(tests\/\S+) \| exit=(\d+) \| # tests (\d+) \| # pass (\d+) \| # fail (\d+) \| # skipped (\d+)/gm)) {
  n++; const r = rows.find((x) => x.f === m[1]);
  if (!(r && r.ex === m[2] && r.tests == m[3] && r.pass == m[4] && r.fail == m[5] && r.skipped == m[6])) { d++; console.log("DIF", m[0], JSON.stringify(r)); }
}
console.log("linhas da tabela K5", n, "divergentes", d);
