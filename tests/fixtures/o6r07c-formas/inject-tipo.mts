// Crítica r2 — N3: tipo NOVO num lote EXISTENTE (/mobile/sync/work-order-actions), escrito de 3 jeitos que um dev
// escreveria no handler. (1) Emula a FONTE: quem lê mobile-work-order-sync.ts por fs.readFileSync (o extrator do
// census-sync-v2) vê as 3 linhas abaixo apensadas. (2) Emula o COMPORTAMENTO: o handler REAL da rota (depois do RBAC
// dela) passa a aceitar os 3 tipos e "escrever"; qualquer outro tipo segue para o handler original.
import fs from "node:fs";
const NOVOS = new Set(["work_order.odometro", "work_order.reboque", "km_rapida"]);
const LINHAS = [
  "const WO_PREFIX = \"work_order.\";",
  "if (action.type === `${WO_PREFIX}odometro`) { /* N3a */ }",
  "const WO_FAM = \"work_order\";",
  "if (action.type === WO_FAM + \".reboque\") { /* N3b */ }",
  "if (action.type === \"km_rapida\") { /* N3c */ }",
].join(String.fromCharCode(10));
export async function inject(app: any) {
  const orig = fs.readFileSync;
  (fs as any).readFileSync = function (p: any, ...rest: any[]) {
    const out = (orig as any).call(fs, p, ...rest);
    return typeof p === "string" && p.split(String.fromCharCode(92)).join("/").endsWith("src/modules/mobile/mobile-work-order-sync.ts") && typeof out === "string" ? out + String.fromCharCode(10) + LINHAS : out;
  };
  let alvo: any;
  (function walk(stack: any[]) { for (const l of stack) { if (l.route?.path === "/mobile/sync/work-order-actions") alvo = l; else if (l.handle?.stack) walk(l.handle.stack); } })(app.router.stack);
  const ultima = alvo.route.stack[alvo.route.stack.length - 1]; const h0 = ultima.handle;
  ultima.handle = (q: any, s: any, n: any) => {
    const acts: any[] = q.body?.actions ?? [];
    if (!acts.some((a) => NOVOS.has(a?.type))) return h0(q, s, n);
    // espelha requireActionPermission do handler real (work_orders:status, permissão por AÇÃO)
    if (!q.tenantContext?.permissions?.includes("work_orders:status")) return s.status(200).json({ data: { accepted: [], rejected: acts.map((x) => ({ client_action_id: x.client_action_id, status: "rejected", error: { reason: "permission_required" } })), conflicts: [] } });
    (globalThis as any).__escritas = ((globalThis as any).__escritas ?? 0) + 1;
    return s.status(200).json({ data: { accepted: acts.map((a) => ({ client_action_id: a.client_action_id, status: "accepted" })), rejected: [], conflicts: [] } });
  };
  console.log("[inject-tipo] handler do lote envolvido; rota:", alvo.route.path, "| camadas da rota:", alvo.route.stack.length);
}
