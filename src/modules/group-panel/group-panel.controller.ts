import type { Request } from "express";

import { TenantRowsLeakError } from "../../database/rls.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import { MembershipOverlapError } from "../subscription-billing/economic-groups/membership.rules.js";
import { toGroupPanelScopeDto, toGroupPanelSummaryDto } from "./group-panel.dto.js";
import type { GroupPanelService } from "./group-panel.service.js";
import type { GroupPanelActor } from "./group-panel.types.js";

export type GroupPanelServiceResolver = () => Promise<GroupPanelService>;

// O ator é SEMPRE o do JWT (`request.actor`). Nada do pedido escolhe organização: nem query, nem cabeçalho, nem corpo
// (P-E). Cabeçalho legado sem JWT não abre o Painel.
function requireJwtActor(request: Request): GroupPanelActor {
  const actor = request.actor;
  if (!actor || actor.authType !== "jwt" || !actor.userId || !actor.tenantId) {
    throw new CoreSaasError(401, "UNAUTHORIZED", "authentication_required", "Authentication required.");
  }
  return actor;
}

export class GroupPanelController {
  constructor(private readonly resolveService: GroupPanelServiceResolver) {}

  async scope(request: Request) {
    const actor = requireJwtActor(request);
    const service = await this.resolveService();
    return { data: toGroupPanelScopeDto(await guarded(() => service.getScope(actor))) };
  }

  async summary(request: Request) {
    const actor = requireJwtActor(request);
    const service = await this.resolveService();
    return { data: toGroupPanelSummaryDto(await guarded(() => service.getSummary(actor))) };
  }
}

// Canário de RLS ou vínculo de grupo duplicado: 500 opaco, sem número nenhum e sem a mensagem interna (que nomeia a
// tabela). Sem isto, o tratador genérico devolveria 400 com o texto do erro.
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof TenantRowsLeakError || error instanceof MembershipOverlapError) {
      throw new CoreSaasError(500, "INTERNAL_SERVER_ERROR", "unknown_error", "Unexpected error.");
    }
    throw error;
  }
}
