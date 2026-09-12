// Modelo executável do FECHAMENTO do B-O6R-07c como o plano v5 o escreve (PLANO_SAN3.md:251 @ecc32712), sobre as
// rotas REAIS de ecc32712: rotas mutantes que o field_technician alcança nos 3 routers da fronteira, e quais delas o
// teste de encerramento do plano OBRIGA a ficar vermelho se o escopo por objeto for omitido.
import fs from "node:fs";
const S = process.argv[2];
const read = (f) => fs.readFileSync(`${S}/${f}`, "utf8");
const cat = read("catalog.ts");
const i0 = cat.indexOf("  field_technician: [");
const FT = new Set([...cat.slice(i0, cat.indexOf("],", i0)).matchAll(/"([a-z_.:]+)"/g)].map((m) => m[1]));
const woSrc = read("routes/src_modules_work-orders_work-order.routes.ts");
const woConst = woSrc.slice(woSrc.indexOf("export const WORK_ORDER_PERMISSIONS"), woSrc.indexOf("} as const", woSrc.indexOf("export const WORK_ORDER_PERMISSIONS")));
const consts = {
  WORK_ORDER_PERMISSIONS: Object.fromEntries([...woConst.matchAll(/^\s+(\w+): "([a-z_:]+)",/gm)].map((m) => [m[1], m[2]])),
  WORK_ORDER_COMMENT_PERMISSIONS: { read: "work_orders:read", comment: "work_orders:comment" },
  CHECKLIST_PERMISSIONS: Object.fromEntries([...read("checklist.permissions.ts").matchAll(/^\s+(\w+): "([a-z_:]+)",/gm)].map((m) => [m[1], m[2]])),
};
const files = ["routes/src_modules_work-orders_work-order.routes.ts", "routes/src_modules_work-order-comments_work-order-comment.routes.ts", "routes/src_modules_checklists_checklist.routes.ts"];
const routes = [];
for (const f of files) {
  for (const c of read(f).split(/\brouter\./).slice(1)) {
    const m = c.match(/^(get|post|put|patch|delete)\(\s*"([^"]+)"/);
    if (!m) continue;
    const perms = [...c.matchAll(/(WORK_ORDER_PERMISSIONS|WORK_ORDER_COMMENT_PERMISSIONS|CHECKLIST_PERMISSIONS)\.(\w+)/g)].map((x) => consts[x[1]][x[2]]);
    routes.push({ verb: m[1].toUpperCase(), path: m[2], perms });
  }
}
const mut = routes.filter((r) => r.verb !== "GET");
const reach = mut.filter((r) => r.perms.some((p) => FT.has(p)));
const GUARDED_07A = new Set(["PATCH /work-orders/:workOrderId", "PATCH /work-orders/:workOrderId/status"]); // service.update :852, changeStatus :1319
const TEST = new Set([
  "POST /work-orders/:workOrderId/attachments",                 // via 1 (piso)
  "DELETE /work-orders/:workOrderId/attachments/:attachmentId", // via 2 (piso)
  "PATCH /mobile/checklist-runs/:runId",                        // item 51 responder
  "POST /mobile/checklist-runs/:runId/complete",                // item 51 concluir
  "POST /mobile/checklist-runs/:runId/acknowledgement",         // item 51 ciência
]); // via 10 (piso) = sync work_order.mileage, fora destes routers
console.log(`field_technician: ${FT.size} permissões | rotas nos 3 routers: ${routes.length} | mutantes: ${mut.length} | mutantes que o técnico alcança: ${reach.length}`);
let open = 0;
for (const r of reach) {
  const k = `${r.verb} ${r.path}`;
  const inTest = TEST.has(k), g = GUARDED_07A.has(k);
  if (!inTest && !g) open++;
  console.log(`  ${k.padEnd(64)} [${r.perms.join("|")}] → ${g ? "guardada pelo 07a" : inTest ? "no piso do teste (vermelho se omitida)" : "FORA do teste: escopo omitido aqui = suíte VERDE"}`);
}
console.log(`\nrotas mutantes alcançáveis pelo técnico, fora do 07a e fora do piso do teste: ${open}`);
console.log(`fechamento do SEC-002 no plano = (toda via do censo de SYNC tem dono) ∧ (teste do piso verde) → VERDADEIRO com essas ${open} rotas sem escopo por objeto.`);
