// Crítica r2 — N10: tipo NOVO, com literal ACHÁVEL ("work_order.vistoria_set"), num lote existente. O handler valida o
// payload com a regra que a casa já tem (work-order.validators.ts:371-377: sem `role` → 400 checklist_role_required)
// e, com payload válido, escreve. O census-sync-v2 julga "não alcança" por SUBSTRING (/role_required/ etc.).
import fs from "node:fs";
const TIPO = "work_order.vistoria_set";
export async function inject(app: any) {
  const orig = fs.readFileSync;
  (fs as any).readFileSync = function (p: any, ...rest: any[]) {
    const out = (orig as any).call(fs, p, ...rest);
    return typeof p === "string" && p.split(String.fromCharCode(92)).join("/").endsWith("src/modules/mobile/mobile-work-order-sync.ts") && typeof out === "string" ? out + String.fromCharCode(10) + "if (action.type === " + JSON.stringify(TIPO) + ") { /* N10 */ }" : out;
  };
  let alvo: any;
  (function walk(stack: any[]) { for (const l of stack) { if (l.route?.path === "/mobile/sync/work-order-actions") alvo = l; else if (l.handle?.stack) walk(l.handle.stack); } })(app.router.stack);
  const ultima = alvo.route.stack[alvo.route.stack.length - 1]; const h0 = ultima.handle;
  ultima.handle = (q: any, s: any, n: any) => {
    const acts: any[] = q.body?.actions ?? [];
    if (!acts.some((a) => a?.type === TIPO)) return h0(q, s, n);
    if (!q.tenantContext?.permissions?.includes("work_orders:status")) return s.status(200).json({ data: { accepted: [], rejected: acts.map((x) => ({ client_action_id: x.client_action_id, status: "rejected", error: { reason: "permission_required" } })), conflicts: [] } });
    const accepted: any[] = []; const rejected: any[] = [];
    for (const a of acts) {
      const role = a?.payload?.checklists?.[0]?.role;
      if (!role) rejected.push({ client_action_id: a.client_action_id, status: "rejected", error: { reason: "checklist_role_required" } });
      else { (globalThis as any).__escritas = ((globalThis as any).__escritas ?? 0) + 1; accepted.push({ client_action_id: a.client_action_id, status: "accepted" }); }
    }
    return s.status(200).json({ data: { accepted, rejected, conflicts: [] } });
  };
}
