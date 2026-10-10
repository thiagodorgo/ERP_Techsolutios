// Injeta 5 FORMAS NOVAS de via mutante sobre a OS no app REAL, antes do 404 de /api/v1 (crítico 07c, r1).
// Cada handler "escreve" (responde 200) depois de passar o RBAC com work_orders:status — permissão que o técnico tem.
import { pathToFileURL } from "node:url";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { createRequire } = await import("node:module"); const { Router } = createRequire(process.cwd() + "/package.json")("express");
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const perm = requirePermission("work_orders:status");
  const ok = (_q: any, s: any) => s.status(200).json({ data: { escreveu: true } });
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  // F1 — GET que escreve (aceitar por link)
  r.get("/work-orders/:workOrderId/aceitar-por-link", perm, ok);
  // F2 — router.all
  r.all("/work-orders/:workOrderId/via-all", perm, ok);
  // F3 — sub-router montado com parâmetro no caminho de montagem
  const n = Router({ mergeParams: true }); n.post("/", perm, ok);
  r.use("/work-orders/:workOrderId/notas", n);
  // F4 — mesmo recurso, parâmetro com outro nome
  r.post("/work-orders/:id/fechar", perm, ok);
  // F5 — endpoint de lote de sync num sub-router "/mobile" (forma de montagem que o census-sync não percorre)
  const m = Router(); m.post("/sync/novidade-actions", perm, ok);
  r.use("/mobile", m);
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added); // antes do 404 route_not_found
  console.log("[inject] camadas adicionadas antes do 404:", added.length);
}
// Emula o literal "/mobile" que um dev escreveria em src/** ao montar o sub-router F5 (o census lê os literais
// de montagem por `git grep` DEPOIS do createApp). Só acrescenta o literal à saída do git grep do census.
export async function emulateMountLiteral(lit: string) {
  const { createRequire, syncBuiltinESMExports } = await import("node:module");
  const cp = createRequire(process.cwd() + "/package.json")("child_process");
  const orig = cp.execFileSync;
  cp.execFileSync = (...a: any[]) => { const out = orig(...a); return (a[0] === "git" && a[1]?.[0] === "grep" && a[1]?.includes("-o")) ? out + `"${lit}"\n` : out; };
  syncBuiltinESMExports();
}
