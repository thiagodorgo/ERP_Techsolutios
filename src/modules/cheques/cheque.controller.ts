import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toChequeDto, toChequeListDto } from "./cheque.dto.js";
import { ChequeError, type Cheque } from "./cheque.types.js";
import type { ChequeService } from "./cheque.service.js";

export type ChequeServiceResolver = () => Promise<ChequeService>;

export class ChequeController {
  constructor(private readonly resolveService: ChequeServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toChequeListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await withErrorDetails(() => service.create(actor, request.body ?? {}));
    if (typeof item === "object" && "error" in item) return item.error;
    await this.audit(request, "cheque.registered", item);
    return { status: 201, data: toChequeDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.chequeId));
    return { data: toChequeDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await withErrorDetails(() =>
      service.update(actor, readRouteParam(request.params.chequeId), (request.body ?? {}) as Record<string, unknown>),
    );
    if (typeof item === "object" && "error" in item) return item.error;
    await this.audit(request, "cheque.updated", item);
    return { data: toChequeDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.delete(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.deleted", item);
    return { data: toChequeDto(item) };
  }

  async deposit(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.deposit(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.deposited", item);
    return { data: toChequeDto(item) };
  }

  async clear(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.clear(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.cleared", item);
    return { data: toChequeDto(item) };
  }

  async bounce(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const previous = await service.get(actor, readRouteParam(request.params.chequeId));
    const item = await service.bounce(actor, readRouteParam(request.params.chequeId), (request.body ?? {}) as Record<string, unknown>);
    if (previous.titleId !== undefined && previous.status === "deposited") {
      // R-res-2 do plano v3 — devolver cheque VINCULADO ainda pendente tira-o do conjunto pendente do título: a trilha
      // diz QUAL título, com severidade `warning` (o motivo é obrigatório nesse caso, no serviço).
      await recordRequestAuditBestEffort(request, {
        action: "cheque.bounced",
        resourceType: "cheque",
        resourceId: item.id,
        outcome: "success",
        severity: "warning",
        metadata: { direction: item.direction, status: item.status, titleId: previous.titleId },
      });
    } else {
      await this.audit(request, "cheque.bounced", item);
    }
    return { data: toChequeDto(item) };
  }

  // B-SAN3-12a (§4.3) — TROCAR A VINCULAÇÃO. Auditoria CRÍTICA (`D-AUDIT-REGRAS-CRITICO`, regra 1, por analogia
  // declarada: desfazer vínculo financeiro) com {chequeId, previousTitleId, justification}; os metadados passam por
  // `sanitizeAuditMetadata` no serviço de auditoria e nunca levam tenant_id, token nem valor.
  async unlinkTitle(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.unlinkTitle(actor, readRouteParam(request.params.chequeId), (request.body ?? {}) as Record<string, unknown>);
    await recordRequestAuditBestEffort(request, buildChequeTitleUnlinkedAudit(result.cheque.id, result.previousTitleId, result.justification));
    return { body: { data: toChequeDto(result.cheque), ...(result.warning ? { warning: result.warning } : {}) } };
  }

  async cancel(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.cancel(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.cancelled", item);
    return { data: toChequeDto(item) };
  }

  // §2.8 — metadados SEM tenant_id nem valores sensíveis (nada de amount/cheque_number/bank). Só a "forma"
  // do instrumento: {direction, status}.
  private async audit(request: Request, action: string, item: Cheque): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "cheque",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { direction: item.direction, status: item.status },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

/** B-SAN3-12a (§4.3, A7) — a entrada de auditoria do desvínculo, pura (o teste a confere sem banco). */
export function buildChequeTitleUnlinkedAudit(chequeId: string, previousTitleId: string, justification: string) {
  return {
    action: "cheque.title_unlinked",
    resourceType: "cheque",
    resourceId: chequeId,
    outcome: "success" as const,
    severity: "critical" as const,
    metadata: { chequeId, previousTitleId, justification },
  };
}

type DetailedErrorResult = { readonly error: { readonly status: number; readonly body: unknown } };

/**
 * B-SAN3-12a — o envelope comum de erro (`core-saas/routes/http.ts`) carrega só code/reason/message. Os erros deste
 * módulo que trazem `details` (ex.: 422 `cheque_amount_mismatch` com o valor do cheque e o saldo aberto) saem com o
 * MESMO envelope mais `details`; qualquer outro erro segue para o tratador comum, sem mudança.
 */
async function withErrorDetails<T>(work: () => Promise<T>): Promise<T | DetailedErrorResult> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ChequeError && error.details !== undefined) {
      return {
        error: {
          status: error.statusCode,
          body: { error: { code: error.code, reason: error.reason, message: error.message, details: error.details } },
        },
      };
    }
    throw error;
  }
}
