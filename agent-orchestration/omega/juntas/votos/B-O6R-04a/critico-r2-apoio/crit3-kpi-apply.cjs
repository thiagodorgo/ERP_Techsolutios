const fs = require("fs"); const K = process.argv[2];
const jp = K + "/docs/revisoes/O6R/achados.jsonl";
const lines = fs.readFileSync(jp, "utf8").split("\n").map((l) => {
  if (!l.trim()) return l; const o = JSON.parse(l);
  if (o.id === "Ω6R-DAT-002" || o.id === "Ω6R-DAT-003") { o.status = "fechado"; o.fechado_por = "B-O6R-04a (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"; o.fechado_em = "2026-09-20"; o.evidencia_fechamento = "lock/CAS/unidades/indices + suites"; return JSON.stringify(o); }
  return l; });
fs.writeFileSync(jp, lines.join("\n"));
const rp = K + "/docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md"; let reg = fs.readFileSync(rp, "utf8");
for (const id of ["Ω6R-DAT-002", "Ω6R-DAT-003"]) { const h = reg.indexOf("### [" + id + "]"); const nl = reg.indexOf("\n", h); reg = reg.slice(0, nl + 1) + "- Status: **fechado** em 2026-09-20 pelo `B-O6R-04a` (PR na autoria; nº e hash no backfill pós-merge — §C3.5).\n" + reg.slice(nl + 1); }
fs.writeFileSync(rp, reg);
const kp = K + "/Kpis/kpis-latest.json"; const L = JSON.parse(fs.readFileSync(kp, "utf8"));
L.roadmap.blocos.find((b) => b.id === "B-O6R-04").estado = "parcial";
fs.writeFileSync(kp, JSON.stringify(L, null, 2));
console.log("aplicado; p0_fechados=", L.production_readiness.p0_fechados, "aguardando_merge=", JSON.stringify(L.production_readiness.aguardando_merge));
