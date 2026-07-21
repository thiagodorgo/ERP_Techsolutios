import { Router, type Request, type Response } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireAnyPermission, requirePermission, requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialTitleDto } from "./financial-title.dto.js";
import { createDefaultFinancialTitleService, type FinancialTitleService } from "./financial-title.service.js";
import type { FinancialTitle, FinancialTitleActorContext } from "./financial-title.types.js";
import {
  parseAmount,
  parseCurrency,
  parseDueDate,
  parseIssueDate,
  parseOptionalDescription,
  parseOptionalUuid,
  parsePartyName,
  parsePartyType,
} from "./financial-title.validators.js";

// Ω4C PR-02 (D-Ω4C-FIN-SOURCE-REST) — ROUTE-FACTORY per-módulo do "Contas a Pagar por origem". Montada
// DENTRO do router do módulo-fonte (fuel-logs/maintenance-orders/insurance-policies), então herda o
// tenantContext + RBAC persistente já aplicados lá. Cada módulo injeta seu `sourceType` (hardcoded) e um
// `resolveOwnership` que chama o `service.get()` do PRÓPRIO módulo — provando a posse da fonte (404
// cross-tenant NATIVO) ANTES de tocar qualquer título. Direção da dependência: módulo-fonte → financial-
// titles (NUNCA o inverso), evitando ciclo/import reverso.

// Prova a posse tenant-scoped da entidade-fonte. Deve lançar o 404 do módulo-fonte quando a fonte não
// existe / é de outro tenant (o get() do módulo já faz isso). Não retorna nada — é só o gate de posse.
export type PayableSourceOwnershipResolver = (
  actor: FinancialTitleActorContext,
  sourceId: string,
) => Promise<void>;

export type CreatePayableSourceRoutesOptions = {
  readonly sourceType: string;
  readonly resolveOwnership: PayableSourceOwnershipResolver;
  // Injetável nos testes; default = serviço financeiro padrão (memory/prisma conforme env).
  readonly resolveService?: () => Promise<FinancialTitleService>;
};

const PAYABLE_PERMISSIONS = {
  read: "financial_titles:read",
  create: "financial_titles:create",
  update: "financial_titles:update",
} as const;

export function createPayableSourceRoutes(options: CreatePayableSourceRoutesOptions): Router {
  const { sourceType, resolveOwnership } = options;
  const resolveService = options.resolveService ?? createDefaultFinancialTitleService;
  // mergeParams: o :id da fonte é um param do router-pai (montado em "/:module") — sem isso o factory não
  // enxerga request.params.id.
  const router = Router({ mergeParams: true });

  // POST /:id/payable — LANÇA a conta a pagar por origem. 201 com o título. 409 source_already_launched se
  // já houver título ATIVO da fonte (relançar exige retirar antes); 422 period_closed pelo chokepoint.
  router.post(
    "/:id/payable",
    requirePermission(PAYABLE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      const [service, actor, sourceId] = await resolveContext(request, resolveService, resolveOwnership);
      const body = (request.body ?? {}) as Record<string, unknown>;

      const title = await service.createForSource(actor, {
        sourceType,
        sourceId,
        direction: "payable",
        partyType: parsePartyType(body.party_type ?? body.partyType),
        partyName: parsePartyName(body.party_name ?? body.partyName),
        partyId: parseOptionalUuid(body.party_id ?? body.partyId, "partyId"),
        amount: parseAmount(body.amount),
        currency: parseCurrency(body.currency),
        issueDate: parseIssueDate(body.issue_date ?? body.issueDate),
        dueDate: parseDueDate(body.due_date ?? body.dueDate),
        description: parseOptionalDescription(body.description),
      });

      await audit(request, "financial_title.source_launched", title, sourceType);
      response.status(201).json({ data: toFinancialTitleDto(title) });
    }),
  );

  // DELETE /:id/payable — RETIRA (soft-delete reversível) a conta a pagar da fonte. 200 com o título já
  // com deleted_at (active=false). 404 se não houver título ATIVO; 422 period_closed pelo chokepoint.
  router.delete(
    "/:id/payable",
    requirePermission(PAYABLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      const [service, actor, sourceId] = await resolveContext(request, resolveService, resolveOwnership);
      const title = await service.removeForSource(actor, sourceType, sourceId);
      await audit(request, "financial_title.source_retracted", title, sourceType);
      response.json({ data: toFinancialTitleDto(title) });
    }),
  );

  // GET /:id/payable — badge DERIVADO: retorna o título ATIVO da fonte, ou { data: null } se não houver.
  // Leitura → permite quem tem :read OU :update (a tela de edição da fonte, que tem :update, precisa
  // renderizar o badge mesmo sem grant separado de :read).
  router.get(
    "/:id/payable",
    requireAnyPermission([PAYABLE_PERMISSIONS.read, PAYABLE_PERMISSIONS.update]),
    handleAsyncRoute(async (request, response) => {
      const [service, actor, sourceId] = await resolveContext(request, resolveService, resolveOwnership);
      const title = await service.findActiveBySource(actor, sourceType, sourceId, "payable");
      response.json({ data: title ? toFinancialTitleDto(title) : null });
    }),
  );

  return router;
}

// Resolve serviço + ator + sourceId e PROVA a posse (404 do módulo-fonte) antes de qualquer operação de título.
async function resolveContext(
  request: Request,
  resolveService: () => Promise<FinancialTitleService>,
  resolveOwnership: PayableSourceOwnershipResolver,
): Promise<[FinancialTitleService, FinancialTitleActorContext, string]> {
  const service = await resolveService();
  const actor = requireTenantContext(request) as FinancialTitleActorContext;
  const sourceId = readRouteParam(request.params.id);
  await resolveOwnership(actor, sourceId);
  return [service, actor, sourceId];
}

// §2.8 — metadados SEM tenant_id nem valores sensíveis. Só a "forma": {direction, status, party_type} +
// source_type (enum-app de negócio, do próprio tenant). source_id NÃO entra na trilha (id de entidade cru).
async function audit(request: Request, action: string, title: FinancialTitle, sourceType: string): Promise<void> {
  await recordRequestAuditBestEffort(request, {
    action,
    resourceType: "financial_title",
    resourceId: title.id,
    outcome: "success",
    severity: "info",
    metadata: { direction: title.direction, status: title.status, party_type: title.partyType, source_type: sourceType },
  });
}
