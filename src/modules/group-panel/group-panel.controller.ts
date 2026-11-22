import type { Request } from "express";

import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
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
    return { data: toGroupPanelScopeDto(await service.getScope(actor)) };
  }

  async summary(request: Request) {
    const actor = requireJwtActor(request);
    const service = await this.resolveService();
    return { data: toGroupPanelSummaryDto(await service.getSummary(actor)) };
  }
}
