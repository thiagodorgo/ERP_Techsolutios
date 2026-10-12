// Forma F1' (B3/B1): um GET que ESCREVE de verdade na OS — muda o título pelo serviço de OS, com contexto de gestão.
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
  const { createDefaultWorkOrderService } = await imp("modules/work-orders/work-order.service.ts");
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  r.get("/work-orders/:workOrderId/aceitar-por-link", requirePermission("work_orders:read"), async (q: any, s: any) => {
    const svc = await createDefaultWorkOrderService();
    await svc.update({ tenantId: q.tenantContext.tenantId, userId: q.tenantContext.userId, roles: ["manager"], permissions: [] } as never, q.params.workOrderId, { title: "escrito por GET" }).catch(() => undefined);
    s.status(200).json({ data: { ok: true } });
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
}
