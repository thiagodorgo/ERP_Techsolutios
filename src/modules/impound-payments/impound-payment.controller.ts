import type { Request } from "express";

import { TenantRowsLeakError } from "../../database/rls.js";
import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toImpoundPaymentIntentDto } from "./impound-payment.dto.js";
import type { ImpoundPaymentService } from "./impound-payment.service.js";
import { ImpoundPaymentError } from "./impound-payment.types.js";

export type ImpoundPaymentServiceResolver = () => Promise<ImpoundPaymentService>;

// B-PATIO-REC-01 (v3 §6.1) — a organização vem SÓ do ator autenticado (`requireTenantContext`), nunca do corpo, da query nem
// de cabeçalho cru (R-ISO, emenda §10.1). O canário de organização vira 500 GENÉRICO, sem dado (nunca a linha alheia).
export class ImpoundPaymentController {
  constructor(private readonly resolveService: ImpoundPaymentServiceResolver) {}

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const intent = await guarded(() => service.create(actor, readRouteParam(request.params.processId), request.body ?? {}));
    // §2.8: só id, estado e escopo da conta na trilha — nunca o pagador, o documento, o valor ou os ids de conexão.
    await recordRequestAuditBestEffort(request, {
      action: "impound_payment.created",
      resourceType: "impound_payment_intent",
      resourceId: intent.id,
      outcome: "success",
      severity: "info",
      metadata: { status: intent.status, accountScope: intent.account.scope },
    });
    return { status: 202, body: { intent: toImpoundPaymentIntentDto(intent) } };
  }

  async getLive(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const intent = await guarded(() => service.getLive(actor, readRouteParam(request.params.processId)));
    return { body: { data: { intent: intent ? toImpoundPaymentIntentDto(intent) : null } } };
  }

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const intents = await guarded(() => service.list(actor, readRouteParam(request.params.processId)));
    return { body: { data: intents.map(toImpoundPaymentIntentDto) } };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof TenantRowsLeakError) {
      throw new ImpoundPaymentError(500, "INTERNAL_SERVER_ERROR", "unknown_error", "Unexpected error.");
    }
    throw error;
  }
}
