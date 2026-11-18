// B-WO-LEITURA (Emenda 1 §2.2) — 3ª forma: uma LISTA sem parâmetro de caminho devolve a OS pelo id da QUERY
// (`?entityType=work_order&entityId=<id>`), sem `requirePermission` na rota (permissão no handler). Esperado: T-L1
// `NAO-CLASSIFICADA` e T-L2 com o canário (a variante `entityType/entityId` do T-L2).
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { moverParaAntesDo404 } from "../o6r07c-formas/antes-do-404.mts";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const req = createRequire(process.cwd() + "/package.json");
  const { Router } = req("express");
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { createDefaultWorkOrderService } = await imp("modules/work-orders/work-order.service.ts");
  const { toWorkOrderDto } = await imp("modules/work-orders/work-order.dto.ts");
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  r.get("/eco-lista", (q: any, s: any, n: any) => {
    (async () => {
      const ctx = q.tenantContext;
      if (!ctx?.permissions?.includes("work_orders:read")) return s.status(403).json({ error: { code: "FORBIDDEN", reason: "permission_required" } });
      if (q.query.entityType !== "work_order" || typeof q.query.entityId !== "string") return s.status(200).json({ data: [] });
      const svc = await createDefaultWorkOrderService();
      const wo = await svc.get({ tenantId: ctx.tenantId, userId: ctx.userId, roles: ctx.roles, permissions: ctx.permissions }, q.query.entityId);
      s.status(200).json({ data: [toWorkOrderDto(wo)] });
    })().catch((e: any) => (typeof e?.statusCode === "number" ? s.status(200).json({ data: [] }) : n(e)));
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = moverParaAntesDo404(st, before);
  console.log("[inject-query-vaza] camadas adicionadas antes do 404:", added.length);
}
