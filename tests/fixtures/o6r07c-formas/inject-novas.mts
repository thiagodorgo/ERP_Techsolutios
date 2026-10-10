// Crítica r2 do 07c — 3 FORMAS NOVAS de via mutante sobre a OS, no app REAL, antes do 404 de /api/v1.
// Todas passam o RBAC com work_orders:status (o técnico tem) e respondem 200 ("escreveu").
//   N1 — handler montado como MIDDLEWARE com caminho: r.use("/work-orders/:workOrderId/via-use", fn)
//   N2 — sub-APP Express (express()) montado no /api/v1 com uma rota POST de OS
//   N9 — controle: caminho em ARRAY (deve cair em "camada sem caminho de texto", T3)
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const req = createRequire(process.cwd() + "/package.json");
  const express = req("express"); const { Router } = express;
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const perm = requirePermission("work_orders:status");
  const ok = (_q: any, s: any) => s.status(200).json({ data: { escreveu: true } });
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  // N1 — handler como middleware com caminho (sem Route): o método é testado dentro dele
  r.use("/work-orders/:workOrderId/via-use", (q: any, s: any, n: any) => (q.method === "POST" ? perm(q, s, () => ok(q, s)) : n()));
  // N9 — controle: caminho em array
  r.post(["/work-orders/:workOrderId/via-array"], perm, ok);
  const sub = express();
  sub.use(tenantContextMiddleware); sub.use(createPersistentRbacContextMiddleware());
  // N2 — sub-app Express
  sub.post("/work-orders/:workOrderId/via-subapp", perm, ok);
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  app.use("/api/v1", attachAuthenticatedActor(), sub);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
  console.log("[inject-novas] camadas adicionadas antes do 404:", added.length);
}
