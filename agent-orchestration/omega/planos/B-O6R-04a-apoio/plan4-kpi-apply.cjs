// plan4: edicoes de KPI/achados como o plano v3 §8/§9 as especifica (K-01: aguardando_merge + findings.itens[].status; A-DAT: nota_criterio no DAT-003)
const fs = require("fs"); const K = process.argv[2]; const modo = process.argv[3] ?? "v3";
const DATA = "2026-09-20"; const POR = "B-O6R-04a (PR na autoria; nº e hash no backfill pós-merge — §C3.5)";
const jp = K + "/docs/revisoes/O6R/achados.jsonl";
fs.writeFileSync(jp, fs.readFileSync(jp, "utf8").split("\n").map((l) => {
  if (!l.trim()) return l; const o = JSON.parse(l);
  if (o.id === "Ω6R-DAT-002" || o.id === "Ω6R-DAT-003") {
    o.status = "fechado"; o.fechado_por = POR; o.fechado_em = DATA;
    o.evidencia_fechamento = o.id === "Ω6R-DAT-002" ? "Lock FOR UPDATE da linha do item antes de toda leitura que decide (V1-V5), token de tipo ItemWriteLock, indice unico parcial (tenant, reverses_movement_id); suites inventory-balance-lock-race-db (A1 20 saidas concorrentes -> saldo 0, 10 ok/10x409) e inventory-unique-backstops-db." : "Fechamento em unidades por item sob FOR UPDATE da sessao e do item, CAS aberta->fechando->concluida, um vencedor, nenhuma unidade aplicada duas vezes, retomada que conclui e total da sessao inteira no 200; indice unico parcial (tenant, cycle_count_id, item_id); suite inventory-cycle-count-close-units-db.";
    if (o.id === "Ω6R-DAT-003") o.nota_criterio = "Registro (§A2, emenda 2-h do B-O6R-04a): o campo `teste` acima (\"vencedor unico e rollback integral\") pressupoe transacao unica, que a emenda 2-h substituiu por unidades por item retomaveis — a transacao unica e impossivel acima de ~650 itens sob o timeout de 5 s do Prisma (medido pelo critico r1 e pelo planejador). O achado fecha contra: vencedor unico; nenhuma unidade aplicada duas vezes; retomada que conclui; total correto da sessao inteira. O texto original fica como esta.";
    return JSON.stringify(o);
  }
  return l; }).join("\n"));
const rp = K + "/docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md"; let reg = fs.readFileSync(rp, "utf8");
for (const id of ["Ω6R-DAT-002", "Ω6R-DAT-003"]) { const h = reg.indexOf("### [" + id + "]"); const nl = reg.indexOf("\n", h); reg = reg.slice(0, nl + 1) + `- Status: **fechado** em ${DATA} pelo \`B-O6R-04a\` (PR na autoria; nº e hash no backfill pós-merge — §C3.5).\n` + (id === "Ω6R-DAT-003" ? "- Nota de critério (§A2): o `teste` registrado pressupõe transação única; a emenda 2-h do bloco substituiu-a por unidades retomáveis — o achado fecha contra vencedor único, nenhuma unidade aplicada duas vezes, retomada que conclui e total correto da sessão inteira.\n" : "") + reg.slice(nl + 1); }
fs.writeFileSync(rp, reg);
const kp = K + "/Kpis/kpis-latest.json"; const L = JSON.parse(fs.readFileSync(kp, "utf8"));
for (const it of L.findings.itens) if (it.id === "Ω6R-DAT-002" || it.id === "Ω6R-DAT-003") it.status = "fechado";
const b = L.roadmap.blocos.find((x) => x.id === "B-O6R-04"); if (b) b.estado = "parcial";
if (modo === "v3") { L.production_readiness.aguardando_merge = [{ id: "Ω6R-DAT-002" }, { id: "Ω6R-DAT-003" }]; L.production_readiness.nota_aguardando = "Ω6R-DAT-002 e Ω6R-DAT-003 estao `fechado` no registro NA AUTORIA do B-O6R-04a (§C3.5: numero de PR e hash so existem pos-merge). Eles NAO entram em `p0_fechados` nem na lista `fechados` — o painel conta so o que esta na `main`, e e por isso que `p0_fechados` permanece 13. Texto anterior, preservado: " + L.production_readiness.nota_aguardando; }
fs.writeFileSync(kp, JSON.stringify(L, null, 2));
console.log("aplicado modo", modo, "p0_fechados=", L.production_readiness.p0_fechados, "aguardando=", JSON.stringify(L.production_readiness.aguardando_merge));
