// B-WO-LEITURA (Emenda 2, B1) — 4ª forma: handler montado como MIDDLEWARE com caminho (`r.use`), sem
// `requirePermission`, que responde GET com a OS inteira sem porta de leitura. Fica FORA de `c3.rotas` (não é Route)
// e aparece em `c3.contagem` como `MIDDLEWARE /api/v1/via-use/:workOrderId · (anônima)`. Esperado: T-L1, T-L2 e T-L8.
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
  r.use("/via-use/:workOrderId", (q: any, s: any, n: any) => {
    if (q.method !== "GET") return n();
    (async () => {
      const svc = await createDefaultWorkOrderService();
      const actor = { tenantId: q.tenantContext?.tenantId ?? q.actor?.tenantId, userId: q.actor?.userId, roles: q.actor?.roles ?? [] };
      const wo = await svc.get(actor, q.params.workOrderId);
      s.status(200).json({ data: toWorkOrderDto(wo) });
    })().catch((e: any) => (typeof e?.statusCode === "number" ? s.status(e.statusCode).json({ error: { code: e.code, reason: e.reason, message: e.message } }) : n(e)));
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = moverParaAntesDo404(st, before);
  console.log("[inject-via-use] camadas adicionadas antes do 404:", added.length);
}
