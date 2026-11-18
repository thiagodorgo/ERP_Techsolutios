// B-WO-LEITURA (plano §5.3; Emenda 1 §2.2) — 2ª forma: a OS sai por um caminho SEM `work-orders` no nome
// (`/tags-eco/:workOrderId`), sem `requirePermission` na rota (permissão no handler). É a prova de que o guard não
// reconhece forma de caminho. Esperado: T-L1 `NAO-CLASSIFICADA` e T-L2 com o canário.
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
  r.get("/tags-eco/:workOrderId", (q: any, s: any, n: any) => {
    (async () => {
      const ctx = q.tenantContext;
      if (!ctx?.permissions?.includes("work_orders:read")) return s.status(403).json({ error: { code: "FORBIDDEN", reason: "permission_required" } });
      const svc = await createDefaultWorkOrderService();
      const wo = await svc.get({ tenantId: ctx.tenantId, userId: ctx.userId, roles: ctx.roles, permissions: ctx.permissions }, q.params.workOrderId);
      s.status(200).json({ data: { eco: toWorkOrderDto(wo) } });
    })().catch((e: any) => (typeof e?.statusCode === "number" ? s.status(e.statusCode).json({ error: { code: e.code, reason: e.reason, message: e.message } }) : n(e)));
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = moverParaAntesDo404(st, before);
  console.log("[inject-referencia-vaza] camadas adicionadas antes do 404:", added.length);
}
