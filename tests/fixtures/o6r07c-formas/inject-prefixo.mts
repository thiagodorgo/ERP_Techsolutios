// Forma F6 (A3, "despacho por prefixo"): um lote de sync que aceita QUALQUER tipo `checklist.*` — nenhum literal
// de tipo novo existe na fonte, então só a sonda de tipo inexistente por família o denuncia.
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { Router } = createRequire(process.cwd() + "/package.json")("express");
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  r.post("/mobile/sync/prefixo-actions", requirePermission("work_orders:status"), (q: any, s: any) => {
    const accepted: any[] = []; const rejected: any[] = [];
    for (const a of q.body?.actions ?? []) {
      if (String(a.type).startsWith("checklist.")) accepted.push({ client_action_id: a.client_action_id, status: "accepted" });
      else rejected.push({ client_action_id: a.client_action_id, status: "rejected", error: { reason: "unsupported_action_type" } });
    }
    s.status(200).json({ data: { accepted, rejected } });
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
}
